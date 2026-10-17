/**
 * Ambient background — soft light aurora blobs + faint grid + vignette.
 * Fixed layer, pointer-events none.
 */
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-teal-200/50 blur-[120px] animate-blob" />
      <div className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-200/40 blur-[120px] animate-blob animation-delay-2" />
      <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-cyan-100/60 blur-[120px] animate-blob animation-delay-4" />

      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(248,250,252,0)_0%,rgba(248,250,252,0.9)_75%)]" />
    </div>
  )
}
