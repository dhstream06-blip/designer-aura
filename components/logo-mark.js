export function LogoMark({ compact = false, center = false }) {
  return (
    <div className={`logo-mark ${compact ? 'compact' : ''} ${center ? 'center' : ''}`}>
      <span className="logo-mark__glyph" aria-hidden="true">
        <svg viewBox="0 0 72 72" role="img">
          <defs>
            <linearGradient id="aura-ring" x1="8" y1="8" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#99f0ff" />
              <stop offset="0.55" stopColor="#8fd2ff" />
              <stop offset="1" stopColor="#d6b6ff" />
            </linearGradient>
            <linearGradient id="aura-core" x1="18" y1="18" x2="54" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f7fbff" />
              <stop offset="0.5" stopColor="#b9e5ff" />
              <stop offset="1" stopColor="#7ff1cf" />
            </linearGradient>
          </defs>
          <circle cx="36" cy="36" r="28" fill="none" stroke="url(#aura-ring)" strokeWidth="2.5" opacity="0.7" />
          <circle cx="36" cy="36" r="18" fill="none" stroke="url(#aura-ring)" strokeWidth="1.5" opacity="0.9" />
          <path
            d="M36 16c8.5 0 15.5 6.8 15.5 15.2 0 5.1-2.5 9.3-6.7 13 5 2.1 8.7 6.9 8.7 12.6v1.7H18.5v-1.7c0-5.7 3.7-10.5 8.7-12.6-4.2-3.7-6.7-7.9-6.7-13C20.5 22.8 27.5 16 36 16Z"
            fill="url(#aura-core)"
          />
          <circle cx="36" cy="29" r="5.6" fill="#0a1220" opacity="0.22" />
        </svg>
      </span>
      <div className="logo-mark__text">
        <strong>Aura</strong>
        <span>Design</span>
      </div>
    </div>
  );
}
