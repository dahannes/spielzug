/** Logo "Navy · Kreide": an S of two runs (marker arrows) meeting at the ball. Same shape as public/icon.svg. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <rect width="100" height="100" rx="22" fill="#0b1b3a" />
      <g fill="#fbfaf6" stroke="#fbfaf6" strokeLinejoin="round">
        <path
          d="M66.7 26.9A18.9 15.75 0 1 0 33.4 41.8M33.3 73.1A18.9 15.75 0 1 0 66.6 58.2"
          fill="none"
          strokeWidth="9.9"
          strokeLinecap="round"
        />
        <path d="M39.4 47.3L27.6 46.9L37.9 35.6ZM60.6 52.7L72.4 53.1L62.1 64.4Z" strokeWidth="1.8" />
        <circle cx="50" cy="50" r="5.85" stroke="none" />
      </g>
    </svg>
  )
}
