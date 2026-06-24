/**
 * Aceternity UI Lamp Effect — top-down ambient light glow
 * Creates a soft lighting effect from above.
 */
export default function LampEffect({ className = '', color = 'rgba(99,102,241,0.12)' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[250px]"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${color} 0%, transparent 60%)`,
        }}
      />
    </div>
  );
}
