/**
 * Noor Al-Islam brand marks: a crescent-and-star emblem and a mosque
 * silhouette used on the splash screen. Pure SVG — no image assets needed.
 */

export function CrescentMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <mask id="noor-crescent">
        <rect width="100" height="100" fill="black" />
        <circle cx="48" cy="52" r="33" fill="white" />
        <circle cx="62" cy="43" r="26" fill="black" />
      </mask>
      <circle cx="48" cy="52" r="33" fill="currentColor" mask="url(#noor-crescent)" />
      <path
        d="M72 18 l4.4 11.8 11.8 4.4 -11.8 4.4 -4.4 11.8 -4.4 -11.8 -11.8 -4.4 11.8 -4.4 z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MosqueSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 170"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={className}
    >
      <g fill="currentColor">
        <rect x="0" y="146" width="600" height="24" />
        {/* Left minaret */}
        <rect x="74" y="66" width="20" height="80" rx="5" />
        <path d="M84 44 c10 8 14 16 14 22 h-28 c0-6 4-14 14-22 z" />
        <rect x="82.5" y="34" width="3" height="12" />
        <circle cx="84" cy="31" r="4" />
        {/* Right minaret */}
        <rect x="506" y="66" width="20" height="80" rx="5" />
        <path d="M516 44 c10 8 14 16 14 22 h-28 c0-6 4-14 14-22 z" />
        <rect x="514.5" y="34" width="3" height="12" />
        <circle cx="516" cy="31" r="4" />
        {/* Side domes */}
        <path d="M150 146 v-34 a34 34 0 0 1 68 0 v34 z" />
        <path d="M382 146 v-34 a34 34 0 0 1 68 0 v34 z" />
        {/* Main dome */}
        <path d="M234 146 v-40 a66 58 0 0 1 132 0 v40 z" />
        {/* Finials */}
        <rect x="298" y="32" width="4" height="18" />
        <circle cx="300" cy="28" r="6" />
        <rect x="182" y="94" width="4" height="14" />
        <circle cx="184" cy="91" r="5" />
        <rect x="414" y="94" width="4" height="14" />
        <circle cx="416" cy="91" r="5" />
        {/* Door */}
        <path d="M290 146 v-24 a10 10 0 0 1 20 0 v24 z" fill="rgba(0,0,0,0.25)" />
      </g>
    </svg>
  );
}
