/**
 * Beam spotlight — smooth gradient, no hard edges.
 * Diagonal linear gradient from left-middle toward bottom-right, soft fade.
 */
export default function Spotlight() {
  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 5 }}>
      {/* Single smooth gradient layer — no clipping, soft stops */}
      <div className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              140deg,
              rgba(129,140,248,0.16) 0%,
              rgba(99,102,241,0.1) 15%,
              rgba(99,102,241,0.05) 30%,
              rgba(99,102,241,0.02) 50%,
              transparent 70%
            )
          `,
        }}
      />
      {/* Subtle extra glow near source */}
      <div className="absolute left-0 top-[30%] w-[500px] h-[400px] -translate-y-1/2"
        style={{
          background: 'radial-gradient(ellipse at 0% 50%, rgba(165,180,252,0.08) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
