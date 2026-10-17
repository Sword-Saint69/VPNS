import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import CountUp from './CountUp'

/**
 * Alive-count trend across the last N hourly checks.
 * SVG sparkline with drawn stroke + gradient area fill.
 * history: [{ t, alive, dead, total, rate }, ...] oldest → newest.
 */
export default function TrendCard({ history }) {
  const pts = Array.isArray(history) ? history.filter((h) => h && Number.isFinite(h.alive)) : []

  const W = 640
  const H = 150
  const PAD = 10

  const values = pts.map((p) => p.alive)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i) => PAD + (i * (W - PAD * 2)) / Math.max(pts.length - 1, 1)
  const y = (v) => H - PAD - ((v - min) * (H - PAD * 2)) / span

  const linePath = pts.length
    ? `M ${pts.map((p, i) => `${x(i).toFixed(1)} ${y(p.alive).toFixed(1)}`).join(' L ')}`
    : ''
  const area = pts.length
    ? `M ${x(0).toFixed(1)} ${H - PAD} L ${pts
        .map((p, i) => `${x(i).toFixed(1)} ${y(p.alive).toFixed(1)}`)
        .join(' L ')} L ${x(pts.length - 1).toFixed(1)} ${H - PAD} Z`
    : ''

  const latest = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const delta = latest && prev ? latest.alive - prev.alive : 0
  const deltaRate = latest && prev ? latest.rate - prev.rate : 0

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaTone =
    delta > 0 ? 'text-teal-300' : delta < 0 ? 'text-rose-400' : 'text-slate-500'

  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Alive trend · last {pts.length} check{pts.length === 1 ? '' : 's'}
          </div>
          {latest ? (
            <div className="mt-1 flex items-baseline gap-3">
              <CountUp
                value={latest.alive}
                className="text-2xl font-bold text-white"
              />
              {prev ? (
                <span className={`flex items-center gap-1 text-xs font-medium ${deltaTone}`}>
                  <DeltaIcon className="h-3.5 w-3.5" />
                  {delta > 0 ? '+' : ''}
                  {delta.toLocaleString()} alive
                  <span className="text-slate-600">
                    ({deltaRate > 0 ? '+' : ''}
                    {deltaRate.toFixed(2)}% rate)
                  </span>
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">
              No history yet — first snapshot lands after the next hourly run.
            </div>
          )}
        </div>
        <div className="font-mono text-[10px] text-slate-600">
          {pts.length > 1 && latest
            ? `${new Date(pts[0].t).toLocaleString()} → ${new Date(latest.t).toLocaleString()}`
            : ''}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#66fcf1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#66fcf1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trend-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#45a29e" />
            <stop offset="100%" stopColor="#66fcf1" />
          </linearGradient>
        </defs>

        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + f * (H - PAD * 2)}
            y2={PAD + f * (H - PAD * 2)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {pts.length > 1 ? (
          <>
            <motion.path
              d={area}
              fill="url(#trend-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.35 }}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke="url(#trend-stroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            <motion.circle
              cx={x(pts.length - 1)}
              cy={y(latest.alive)}
              r="4"
              fill="#66fcf1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.1, type: 'spring', stiffness: 300 }}
            />
          </>
        ) : (
          <motion.circle
            cx={W / 2}
            cy={H / 2}
            r="5"
            fill="#66fcf1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </svg>

      {pts.length > 1 ? (
        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-600">
          <span>min {min.toLocaleString()}</span>
          <span>max {max.toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  )
}
