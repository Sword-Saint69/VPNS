import { FileJson, HeartPulse, Skull } from 'lucide-react'

const REPO = 'https://github.com/Sword-Saint69/VPNS'

export default function Footer({ base }) {
  const links = [
    { href: `${base}tagged/alive_sword-saint69.txt`, label: 'alive list', icon: HeartPulse },
    { href: `${base}tagged/dead_sword-saint69.txt`, label: 'dead list', icon: Skull },
    { href: `${base}tagged/summary_sword-saint69.json`, label: 'summary json', icon: FileJson },
  ]
  return (
    <footer className="mt-16 border-t border-white/5 pt-8 pb-4">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs">
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </a>
          ))}
        </div>
        <p className="max-w-md text-center text-xs leading-relaxed text-slate-600 md:text-right">
          Data: <span className="font-mono">tagged/</span> files regenerated hourly
          by GitHub Actions &middot; remarks renamed to{' '}
          <span className="font-mono text-slate-500">#Sword-saint69</span> &middot;{' '}
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-300">
            repo
          </a>
        </p>
      </div>
    </footer>
  )
}
