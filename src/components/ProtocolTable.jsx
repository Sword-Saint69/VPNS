import { motion } from 'framer-motion'

/**
 * Protocol breakdown as spring-animated split bars (alive vs dead).
 * Motion is information: bar length = volume, color = health.
 */
export default function ProtocolTable({ summary }) {
  const aliveBy = summary.by_protocol_alive || {}
  const deadBy = summary.by_protocol_dead || {}
  const protos = new Set([...Object.keys(aliveBy), ...Object.keys(deadBy)])
  const rows = [...protos]
    .map((p) => ({
      proto: p,
      alive: aliveBy[p] || 0,
      dead: deadBy[p] || 0,
    }))
    .sort((x, y) => y.alive - x.alive || y.dead - x.dead)

  const max = Math.max(1, ...rows.map((r) => r.alive + r.dead))

  return (
    <div className="glass-card divide-y divide-white/5">
      {rows.map((r, i) => {
        const total = r.alive + r.dead
        const trackPct = (total / max) * 100
        const aliveShare = total ? (r.alive / total) * 100 : 0
        return (
          <div key={r.proto} className="px-5 py-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="pill border border-teal-400/20 bg-teal-400/10 font-mono text-teal-300">
                  {r.proto === '?' ? 'other' : r.proto}
                </span>
                <span className="text-xs text-slate-500">
                  {total.toLocaleString()} total
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs tnum">
                <span className="text-teal-300">
                  {r.alive.toLocaleString()}{' '}
                  <span className="text-slate-600">alive</span>
                </span>
                <span className={r.dead ? 'text-rose-400' : 'text-slate-600'}>
                  {r.dead.toLocaleString()}{' '}
                  <span className="text-slate-600">dead</span>
                </span>
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${trackPct}%` }}
                transition={{
                  duration: 0.9,
                  ease: 'easeOut',
                  delay: 0.08 * i,
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                  style={{ width: `${aliveShare}%` }}
                />
                <div
                  className="h-full bg-rose-500/50"
                  style={{ width: `${100 - aliveShare}%` }}
                />
              </motion.div>
            </div>
          </div>
        )
      })}
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-500">
          No protocol data yet — run the workflow once.
        </div>
      ) : null}
    </div>
  )
}
