import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'

const PROTO_TONE = {
  vless: 'border-indigo-400/25 bg-indigo-400/10 text-indigo-300',
  vmess: 'border-teal-400/25 bg-teal-400/10 text-teal-300',
  trojan: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  ss: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  ssr: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  hysteria2: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
  hy2: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  tuic: 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300',
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

  const copy = async (text, i) => {
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
    setCopied(i)
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1400)
  }

  return (
    <div className="glass-card overflow-hidden">
      <ul className="divide-y divide-white/5">
        {lines.map((line, i) => {
          const { proto, host } = parseLine(line)
          const tone = PROTO_TONE[proto] || 'border-white/10 bg-white/5 text-slate-300'
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: 'easeOut' }}
              whileHover={{ x: 4 }}
              className="group flex items-center gap-3 px-5 py-3"
            >
              <span className="w-6 shrink-0 text-right font-mono text-[11px] text-slate-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`pill shrink-0 border font-mono ${tone}`}>
                {proto}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400 group-hover:text-slate-200">
                {host}
              </span>
              <span className="hidden shrink-0 font-mono text-[11px] text-slate-600 md:inline">
                #Sword-saint69
              </span>
              <button
                onClick={() => copy(line, i)}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 opacity-0 transition-all hover:text-teal-300 group-hover:opacity-100"
                aria-label={`Copy proxy ${i + 1}`}
              >
                {copied === i ? (
                  <Check className="h-3.5 w-3.5 text-teal-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </motion.li>
          )
        })}
        {lines.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            No alive proxies in the sample.
          </li>
        ) : null}
      </ul>
      <div className="border-t border-white/5 bg-white/[0.02] px-5 py-3 text-xs text-slate-500">
        <span className="text-teal-300">{totalAlive.toLocaleString()}</span>{' '}
        alive total &middot; showing first {lines.length} &middot; full file linked
        above
      </div>
    </div>
  )
}
