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
    <div className="glass-card divide-y divide-slate-100">
      {rows.map((r, i) => {
        const total = r.alive + r.dead
        const trackPct = (total / max) * 100
        const aliveShare = total ? (r.alive / total) * 100 : 0
        return (
          <div key={r.proto} className="px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="pill border border-teal-200 bg-teal-50 font-mono text-teal-700">
                  {r.proto === '?' ? 'other' : r.proto}
                </span>
                <span className="text-xs text-slate-400">
                  {total.toLocaleString()} total
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs tnum">
                <span className="text-teal-700">
                  {r.alive.toLocaleString()}{' '}
                  <span className="text-slate-400">alive</span>
                </span>
                <span className={r.dead ? 'text-rose-500' : 'text-slate-300'}>
                  {r.dead.toLocaleString()}{' '}
                  <span className="text-slate-400">dead</span>
                </span>
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
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
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  style={{ width: `${aliveShare}%` }}
                />
                <div
                  className="h-full bg-rose-300"
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
