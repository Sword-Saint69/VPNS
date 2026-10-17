import { Swords, Github, Radio } from 'lucide-react'

const REPO_URL = 'https://github.com/Sword-Saint69/VPNS'

/**
 * Sticky glass navbar. Freshness pill turns amber when data is older than
 * 2.5 hours (hourly workflow + buffer).
 */
export default function Navbar({ generatedAt }) {
  const ageMs = generatedAt ? Date.now() - new Date(generatedAt).getTime() : NaN
  const fresh = Number.isFinite(ageMs) && ageMs < 2.5 * 3600 * 1000

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 text-ink-950">
            <Swords className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-white">
              VPN Auto Check
            </div>
            <div className="text-xs text-slate-500">sword-saint69</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`pill border ${
              fresh
                ? 'border-teal-400/30 bg-teal-400/10 text-teal-300'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            }`}
          >
            <Radio className="h-3 w-3" />
            {fresh ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
              </span>
            ) : null}
            {fresh ? 'hourly · live' : 'stale'}
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
