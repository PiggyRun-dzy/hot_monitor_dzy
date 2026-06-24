/**
 * Aceternity UI Glowing Effect — subtle hover glow
 * Uses pointer-events-none to avoid blocking interaction
 * Clips to border-radius to prevent dark corners
 */
export default function GlowingEffect({
  children,
  className = '',
  glowColor = 'rgba(99,102,241,0.2)',
}) {
  return (
    <div className={`relative group ${className}`} style={{ borderRadius: '14px' }}>
      {/* glow layer — clipped to border-radius, no dark inset */}
      <div
        className="absolute inset-0 rounded-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}` }}
      />
      {children}
    </div>
  );
}
