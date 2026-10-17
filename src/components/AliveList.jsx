import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Search, SlidersHorizontal } from 'lucide-react'

const PROTO_TONE = {
  vless: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  vmess: 'border-teal-200 bg-teal-50 text-teal-700',
  trojan: 'border-rose-200 bg-rose-50 text-rose-600',
  ss: 'border-amber-200 bg-amber-50 text-amber-700',
  ssr: 'border-amber-200 bg-amber-50 text-amber-700',
  hysteria2: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  hy2: 'border-cyan-200 bg-cyan-50 text-cyan-600',
  tuic: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600',
}

function parseLine(line) {
  const hash = line.indexOf('#')
  const base = hash >= 0 ? line.slice(0, hash) : line
  const proto = base.split('://')[0] || '?'
  const afterAt = base.includes('@') ? base.split('@')[1] : base.split('://')[1] || base
  const host = (afterAt || '').split(/[:/?]/)[0] || '—'
  return { proto, host }
}

export default function AliveList({ lines, totalAlive }) {
  const [copied, setCopied] = useState(null)
  const [query, setQuery] = useState('')
  const [proto, setProto] = useState('all')

  const protos = useMemo(() => {
    const counts = new Map()
    for (const line of lines) {
      const p = parseLine(line).proto
      counts.set(p, (counts.get(p) || 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => ({ proto: p, count: n }))
  }, [lines])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lines.filter((line) => {
      if (proto !== 'all' && parseLine(line).proto !== proto) return false
      if (!q) return true
      return line.toLowerCase().includes(q)
    })
  }, [lines, query, proto])

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400)
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search host / protocol / uuid…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-400/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-slate-400" />
          <button
            onClick={() => setProto('all')}
            className={`pill border transition-colors ${
              proto === 'all'
                ? 'border-teal-300 bg-teal-50 text-teal-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            all · {lines.length}
          </button>
          {protos.map((p) => (
            <button
              key={p.proto}
              onClick={() => setProto(p.proto === proto ? 'all' : p.proto)}
              className={`pill border font-mono transition-colors ${
                proto === p.proto
                  ? 'border-teal-300 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {p.proto} · {p.count}
            </button>
          ))}
        </div>
      </div>

      {/* rows */}
      <ul className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
        <AnimatePresence initial={false}>
          {filtered.map((line, i) => {
            const { proto: p, host } = parseLine(line)
            const tone = PROTO_TONE[p] || 'border-slate-200 bg-slate-50 text-slate-500'
            const key = line
            return (
              <motion.li
                key={key}
                layout="position"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                whileHover={{ x: 4 }}
                className="group flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-slate-50 sm:gap-3 sm:px-5 sm:py-3"
              >
                <span className="w-6 shrink-0 text-right font-mono text-[11px] text-slate-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`pill shrink-0 border font-mono ${tone}`}>{p}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500 group-hover:text-slate-800">
                  {host}
                </span>
                <span className="hidden shrink-0 font-mono text-[11px] text-slate-300 xl:inline">
                  #Sword-saint69
                </span>
                <button
                  onClick={() => copy(line, key)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all hover:border-teal-300 hover:text-teal-600 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  aria-label={`Copy proxy ${i + 1}`}
                >
                  {copied === key ? (
                    <Check className="h-3.5 w-3.5 text-teal-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
        {filtered.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-slate-500">
            No proxies match{' '}
            <span className="font-mono text-slate-600">
              {query ? `"${query}"` : `proto:${proto}`}
            </span>
          </li>
        ) : null}
      </ul>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
        showing <span className="text-slate-700">{filtered.length}</span> of{' '}
        {lines.length} sampled &middot;{' '}
        <span className="font-medium text-teal-700">
          {totalAlive.toLocaleString()}
        </span>{' '}
        alive total &middot; full file linked above
      </div>
    </div>
  )
}
