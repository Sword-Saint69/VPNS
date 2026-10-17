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

function RateRing({ rate }) {
  const size = 136
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(Number(rate) || 0, 100))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
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
            <stop offset="0%" stopColor="#66fcf1" />
            <stop offset="100%" stopColor="#45a29e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={pct}
          format={(n) => n.toFixed(2)}
          className="text-2xl font-bold text-white"
        />
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          alive rate
        </span>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone = 'text-white', sub }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4 }}
      className="glass-card p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
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
}) {
  return (
    <div className="space-y-6">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-card relative overflow-hidden p-8 md:p-10"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-500/10 blur-[90px]" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-teal-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
              </span>
              alive proxies right now
            </div>
            <CountUp
              value={alive}
              className="text-glow block text-6xl font-bold leading-none text-white md:text-7xl"
            />
            <div className="mt-4 text-sm text-slate-400">
              of{' '}
              <span className="font-medium text-slate-200">
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
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
          tone="text-rose-400"
          sub="failed TCP connect within 3s"
        />
        <Metric
          icon={Percent}
          label="Alive rate"
          value={<CountUp value={rate} format={(n) => n.toFixed(2) + '%'} />}
          tone="text-teal-300"
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
            <span className="text-lg font-semibold text-slate-200">{updated}</span>
          }
          sub="hourly via GitHub Actions"
        />
      </motion.div>
    </div>
  )
}
