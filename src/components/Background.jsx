/**
 * Ambient background — drifting aurora blobs + faint grid + vignette.
 * Fixed layer, pointer-events none.
 */
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-teal-500/10 blur-[120px] animate-blob" />
      <div className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-500/10 blur-[120px] animate-blob animation-delay-2" />
      <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-cyan-400/5 blur-[120px] animate-blob animation-delay-4" />

      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(102,252,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(102,252,241,0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(11,12,16,0)_0%,rgba(11,12,16,0.85)_75%)]" />
    </div>
  )
}
