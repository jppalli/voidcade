interface IconProps {
  inner: string;
  color?: string;
  size?: number;
  className?: string;
}

/**
 * Renders neon line-art glyphs from raw SVG inner markup strings (defined
 * in engine/elements.ts). Same rendering convention as Bubble Shooter's
 * icons.js, ported to a React component.
 */
export default function Icon({ inner, color = '#8ab6ff', size = 22, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ filter: `drop-shadow(0 0 3px ${color}88)`, overflow: 'visible' }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

export function StarIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path
        d="M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.27 5.82 21.5 7 14.63l-5-4.87 6.91-1z"
        fill={filled ? '#ffd24d' : 'none'}
        stroke={filled ? '#ffd24d' : '#4a4a5c'}
        strokeWidth={filled ? 0 : 1.6}
      />
    </svg>
  );
}

export function HelpIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .9-1 1.6v.3" />
      <line x1="12" y1="17" x2="12" y2="17.01" strokeWidth={2.4} />
    </svg>
  );
}

export function HeartIcon({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path
        d="M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6Z"
        fill={filled ? '#ff5d6c' : 'none'}
        stroke={filled ? '#ff5d6c' : '#4a4a5c'}
        strokeWidth={filled ? 0 : 1.8}
        style={filled ? { filter: 'drop-shadow(0 0 4px #ff5d6c88)' } : undefined}
      />
    </svg>
  );
}

export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function XMarkGlyph({ size = 18, color = '#a3a3ba' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function BackIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function HomeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

export function SoundIcon({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 5V4L8 9H4Z" />
      {on ? (
        <path d="M17 8a5 5 0 010 8" strokeOpacity="0.8" />
      ) : (
        <>
          <line x1="16" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="16" y2="15" />
        </>
      )}
    </svg>
  );
}

export function LightbulbIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.7.8.7 1.3V16h5.6v-.8c0-.5.3-1 .7-1.3A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

export function RestartIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
