import { motion } from 'framer-motion'
import { Clock, Database, Globe, Percent, Server, Skull } from 'lucide-react'
import CountUp from './CountUp'

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

function timeAgo(iso) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function RateRing({ rate }) {
  const size = 132
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(Number(rate) || 0, 100))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={pct}
          format={(n) => n.toFixed(2)}
          className="text-2xl font-bold text-slate-900"
        />
        <span className="text-[10px] uppercase tracking-widest text-slate-400">
          alive rate
        </span>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone = 'text-slate-900', sub }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4 }}
      className="glass-card p-4 transition-shadow hover:shadow-lg sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className={`text-2xl font-bold sm:text-3xl ${tone}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-400">{sub}</div> : null}
    </motion.div>
  )
}

export default function StatsGrid({
  total,
  alive,
  dead,
  rate,
  fetched,
  given,
  countries = 0,
  updated,
  updatedIso,
}) {
  const rel = updatedIso ? timeAgo(updatedIso) : null

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-card relative overflow-hidden p-6 sm:p-8 md:p-10"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-200/50 blur-[90px]" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-teal-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              alive proxies right now
            </div>
            <CountUp
              value={alive}
              className="block text-5xl font-bold leading-none tracking-tight text-slate-900 sm:text-6xl md:text-7xl"
            />
            <div className="mt-4 text-sm text-slate-500">
              of{' '}
              <span className="font-medium text-slate-700">
                {total.toLocaleString()}
              </span>{' '}
              unique proxies checked after remark dedup
            </div>
          </div>
          <RateRing rate={rate} />
        </div>
      </motion.div>

      {/* Bento metrics */}
      <motion.div
        variants={list}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
      >
        <Metric
          icon={Server}
          label="Total checked"
          value={<CountUp value={total} />}
          sub="deduped server:port + credentials"
        />
        <Metric
          icon={Skull}
          label="Dead"
          value={<CountUp value={dead} />}
          tone="text-rose-500"
          sub="failed TCP connect within 3s"
        />
        <Metric
          icon={Percent}
          label="Alive rate"
          value={<CountUp value={rate} format={(n) => n.toFixed(2) + '%'} />}
          tone="text-teal-600"
        />
        <Metric
          icon={Database}
          label="Links fetched OK"
          value={<CountUp value={fetched} />}
          sub={countries ? `${countries} countries in results` : undefined}
        />
        <Metric icon={Globe} label="Links given" value={<CountUp value={given} />} />
        <Metric
          icon={Clock}
          label="Last updated"
          value={
            <span className="text-base font-semibold text-slate-800 sm:text-lg">
              {updated}
            </span>
          }
          sub={rel ? `${rel} · hourly via GitHub Actions` : 'hourly via GitHub Actions'}
        />
      </motion.div>
    </div>
  )
}
