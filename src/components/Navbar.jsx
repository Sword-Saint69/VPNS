import { Activity, Github, Radio } from 'lucide-react'

const REPO_URL = 'https://github.com/Sword-Saint69/VPNS'

/**
 * Sticky navbar. Freshness pill turns amber when data is older than
 * 2.5 hours (hourly workflow + buffer).
 */
export default function Navbar({ generatedAt }) {
  const ageMs = generatedAt ? Date.now() - new Date(generatedAt).getTime() : NaN
  const fresh = Number.isFinite(ageMs) && ageMs < 2.5 * 3600 * 1000

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-bold tracking-tight text-slate-900">
              PulseGate
            </div>
            <div className="truncate text-xs text-slate-400">sword-saint69</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className={`pill border ${
              fresh
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <Radio className="h-3 w-3" />
            {fresh ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            ) : null}
            <span className="hidden sm:inline">
              {fresh ? 'hourly · live' : 'stale'}
            </span>
            <span className="sm:hidden">{fresh ? 'live' : 'stale'}</span>
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost !px-3"
            aria-label="Repository"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">Repo</span>
          </a>
        </div>
      </div>
    </header>
  )
}
