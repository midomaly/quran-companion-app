/**
 * Accounts + sync engine (phase 2).
 *
 * Mounts inside <AppStateProvider> (which sits under <ConvexAuthProvider>) and
 * keeps the device's reading state — settings, bookmarks, last-read position,
 * recent searches — reconciled with the user's cloud doc (src/convex/sync.ts).
 *
 * Protocol (one reconcile per render + a 1s tick; all decisions are pure
 * comparisons of fingerprints, see src/lib/sync-state.ts):
 *
 * - Signed out, or no Convex client (SSR tests): nothing runs.
 * - Fresh sign-in / account switch: local and cloud are merged (union of
 *   bookmarks, newest last-read, last-writer-wins settings/searches) and the
 *   merged result is applied locally and pushed.
 * - One side diverges: local edits are pushed once they've been stable for
 *   SETTLE_MS (coalesces slider drags); a remote edit is adopted wholesale
 *   while the device is idle, or merged with local changes when both moved.
 * - Failed pushes back off for RETRY_MS and retry automatically; Convex
 *   queues mutations while offline, so reconnects flush on their own.
 */

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  docToLocal,
  fingerprint,
  mergeLocalAndCloud,
  type LocalSyncState,
} from "@/lib/sync-state";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

export interface SyncBridge {
  /** Fresh snapshot of the device state — called at reconcile time. */
  snapshot: () => LocalSyncState;
  /** Apply state that came from the cloud (React state + localStorage). */
  apply: (state: LocalSyncState) => void;
}

const TICK_MS = 1000;
const SETTLE_MS = 700;
const RETRY_MS = 5000;

/**
 * Gate: outside a <ConvexProvider> (render tests, SSR) there is no client and
 * no sync. The engine's hooks live in a child component so they only run when
 * a client exists — no conditional hooks.
 */
export function CloudSync({ bridge }: { bridge: SyncBridge }) {
  const convex = useConvex();
  if (!convex) return null;
  return <CloudSyncEngine bridge={bridge} />;
}

function CloudSyncEngine({ bridge }: { bridge: SyncBridge }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const cloud = useQuery(api.sync.get);
  const pushSave = useMutation(api.sync.save);

  const bridgeRef = useRef(bridge);
  const syncedUserRef = useRef<string | null>(null);
  const syncedFpRef = useRef<string | null>(null);
  const lastCloudFpRef = useRef<string | null>(null);
  const pairRef = useRef<string | null>(null);
  const pairSinceRef = useRef(0);
  const inFlightRef = useRef(false);
  const nextAttemptRef = useRef(0);
  const reconcileRef = useRef<() => void>(() => {});

  const push = async (userId: string, state: LocalSyncState) => {
    const pushedFp = fingerprint(state);
    inFlightRef.current = true;
    try {
      const doc = await pushSave({
        settings: state.settings,
        settingsUpdatedAt: state.settingsUpdatedAt,
        bookmarks: state.bookmarks,
        lastRead: state.lastRead ?? undefined,
        recentSearches: state.recentSearches,
        searchesUpdatedAt: state.searchesUpdatedAt,
      });
      if (syncedUserRef.current !== userId) return; // signed out / switched mid-flight
      const returned = docToLocal(doc);
      const returnedFp = fingerprint(returned);
      syncedFpRef.current = returnedFp;
      // Adopt server-side merges (e.g. another device's fresher settings)
      // only when the device state hasn't moved on during the flight.
      if (fingerprint(bridgeRef.current.snapshot()) === pushedFp) {
        bridgeRef.current.apply(returned);
      }
      nextAttemptRef.current = 0;
    } catch (err) {
      console.error("[Noor Al-Islam] sync push failed:", err);
      if (syncedUserRef.current === userId) {
        nextAttemptRef.current = Date.now() + RETRY_MS;
      }
    } finally {
      inFlightRef.current = false;
    }
  };

  const reconcile = () => {
    if (isLoading || !isAuthenticated || !user) {
      syncedUserRef.current = null;
      syncedFpRef.current = null;
      lastCloudFpRef.current = null;
      pairRef.current = null;
      return;
    }
    if (cloud === undefined) return; // query still resolving
    // Never trust a doc that belongs to a different account — right after an
    // account switch the query can briefly still show the previous user's doc.
    if (cloud !== null && cloud.userId !== user._id) return;

    const userId = user._id as string;
    const cloudState = docToLocal(cloud);
    const cloudFp = fingerprint(cloudState);
    const local = bridgeRef.current.snapshot();
    const localFp = fingerprint(local);

    // Fresh sign-in or account switch: merge both sides once, then push.
    if (syncedUserRef.current !== userId) {
      const merged = mergeLocalAndCloud(local, cloud);
      const mergedFp = fingerprint(merged);
      syncedUserRef.current = userId;
      syncedFpRef.current = mergedFp;
      lastCloudFpRef.current = cloudFp;
      pairRef.current = null;
      if (localFp !== mergedFp) bridgeRef.current.apply(merged);
      if (cloudFp !== mergedFp && !inFlightRef.current) void push(userId, merged);
      return;
    }

    const syncedFp = syncedFpRef.current;
    if (syncedFp === null) return;

    const cloudChanged = cloudFp !== lastCloudFpRef.current;
    lastCloudFpRef.current = cloudFp;

    if (localFp === syncedFp && cloudFp === syncedFp) return; // fully converged

    if (cloudChanged) {
      pairRef.current = null; // stability window restarts on a remote change
      if (cloudFp !== syncedFp) {
        if (localFp === syncedFp) {
          // Another device pushed while this one was idle: adopt it wholesale
          // (authoritative — this is how removals propagate).
          bridgeRef.current.apply(cloudState);
          syncedFpRef.current = cloudFp;
          return;
        }
        // Both sides changed: merge, adopt the merge, push it back.
        const merged = mergeLocalAndCloud(local, cloud);
        const mergedFp = fingerprint(merged);
        bridgeRef.current.apply(merged);
        syncedFpRef.current = mergedFp;
        if (!inFlightRef.current && cloudFp !== mergedFp) void push(userId, merged);
        return;
      }
      // cloudFp === syncedFp: our own push landed — fall through so a local
      // change made during the flight gets pushed below.
    }

    if (inFlightRef.current) return;
    if (localFp === cloudFp) {
      syncedFpRef.current = localFp; // identical content — just converge
      return;
    }
    // Push local divergence once the (local, cloud) pair has been stable for a
    // moment — this coalesces slider drags — respecting the failure backoff.
    const pair = `${localFp}|${cloudFp}`;
    const now = Date.now();
    if (pair !== pairRef.current) {
      pairRef.current = pair;
      pairSinceRef.current = now;
      return;
    }
    if (now - pairSinceRef.current < SETTLE_MS || now < nextAttemptRef.current) return;
    void push(userId, local);
  };

  useEffect(() => {
    // Refs must be written in an effect, not during render: point them at
    // this render's values, then reconcile immediately (no deps — runs after
    // every state / auth / query change).
    bridgeRef.current = bridge;
    reconcileRef.current = reconcile;
    reconcile();
  });
  useEffect(() => {
    const id = setInterval(() => reconcileRef.current(), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
