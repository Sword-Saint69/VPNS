import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, HeartPulse, RefreshCw } from 'lucide-react'
import Background from './components/Background'
import Navbar from './components/Navbar'
import LoaderOrb from './components/LoaderOrb'
import StatsGrid from './components/StatsGrid'
import ProtocolTable from './components/ProtocolTable'
import AliveList from './components/AliveList'
import TrendCard from './components/TrendCard'
import Footer from './components/Footer'

const BASE = import.meta.env.BASE_URL
const SUMMARY_URL = BASE + 'tagged/summary_sword-saint69.json'
const PULL_URL = BASE + 'tagged/pull_summary_sword-saint69.json'
const ALIVE_URL = BASE + 'tagged/alive_sword-saint69.txt'
const HISTORY_URL = BASE + 'tagged/history_sword-saint69.json'
const SAMPLE = 60

function SectionHeader({ icon: Icon, title, hint, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
          <Icon className="h-4 w-4 text-teal-600" />
          {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      {action}
    </div>
  )
}

export default function App() {
  const [summary, setSummary] = useState(null)
  const [pull, setPull] = useState(null)
  const [history, setHistory] = useState([])
  const [aliveLines, setAliveLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const stamp = '?t=' + Date.now()
      const [sRes, pRes, aRes, hRes] = await Promise.all([
        fetch(SUMMARY_URL + stamp, { cache: 'no-store' }),
        fetch(PULL_URL + stamp, { cache: 'no-store' }).catch(() => null),
        fetch(ALIVE_URL + stamp, { cache: 'no-store' }),
        fetch(HISTORY_URL + stamp, { cache: 'no-store' }).catch(() => null),
      ])
      if (!sRes.ok)
        throw new Error(`summary_sword-saint69.json not found (HTTP ${sRes.status})`)
      const s = await sRes.json()
      setSummary(s)
      setError(null)
      if (pRes && pRes.ok) {
        try {
          setPull(await pRes.json())
        } catch {
          setPull(null)
        }
      }
      if (hRes && hRes.ok) {
        try {
          const h = await hRes.json()
          setHistory(Array.isArray(h) ? h : [])
        } catch {
          setHistory([])
        }
      }
      if (aRes.ok) {
        const text = await aRes.text()
        setAliveLines(text.split('\n').filter(Boolean).slice(0, SAMPLE))
      }
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <>
        <Background />
        <Navbar />
        <LoaderOrb />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Background />
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card w-full p-8"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Data not available yet</div>
                <div className="text-xs text-slate-500">Error: {error}</div>
              </div>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              The dashboard reads{' '}
              <span className="font-mono text-teal-700">
                tagged/summary_sword-saint69.json
              </span>
              . Make sure GitHub Pages is enabled (Settings → Pages → Source:
              GitHub Actions) and the workflow has run at least once so the
              tagged files exist.
            </p>
            <button onClick={onRefresh} className="btn-primary">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </button>
          </motion.div>
        </div>
      </>
    )
  }

  const a = summary.alive ?? 0
  const d = summary.dead ?? 0
  const t = summary.total ?? 0
  const rate = summary.alive_rate ?? 0
  const updated = new Date(summary.generated_at || Date.now()).toLocaleString()

  return (
    <>
      <Background />
      <Navbar generatedAt={summary.generated_at} />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
              PulseGate{' '}
              <span className="font-medium text-slate-400">· sword-saint69</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Pulled, sorted, deduped and liveness-checked every hour via GitHub
              Actions.
            </p>
          </div>
          <button onClick={onRefresh} className="btn-ghost self-start sm:self-auto">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <StatsGrid
          total={t}
          alive={a}
          dead={d}
          rate={rate}
          fetched={pull?.fetched_ok ?? 0}
          given={pull?.links_given ?? 0}
          countries={pull?.by_country ? Object.keys(pull.by_country).length : 0}
          updated={updated}
          updatedIso={summary.generated_at}
        />

        <div className="mt-6">
          <TrendCard history={history} />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-12"
        >
          <SectionHeader
            icon={Activity}
            title="By protocol"
            hint="Bar length = volume · teal = alive · red = dead"
          />
          <ProtocolTable summary={summary} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-12"
        >
          <SectionHeader
            icon={HeartPulse}
            title="Alive sample"
            hint="First rows of alive_sword-saint69.txt — hover to copy a full proxy URI"
          />
          <AliveList lines={aliveLines} totalAlive={a} />
        </motion.section>

        <Footer base={BASE} />
      </main>
    </>
  )
}
