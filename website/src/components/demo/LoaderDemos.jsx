import { motion } from 'framer-motion'
import { Loader2, RefreshCw, Activity, Bot } from 'lucide-react'

const loaders = [
  {
    name: 'Kinetic Text Loader',
    lib: 'Vengeance UI',
    icon: Loader2,
    color: 'from-brand-400 to-blue-500',
    desc: 'Particle text that disperses and reassembles.',
  },
  {
    name: 'Thinking Orb',
    lib: 'SpaceUI · Forge UI',
    icon: Bot,
    color: 'from-purple-400 to-fuchsia-500',
    desc: 'Procedural Canvas 3D particle loader.',
  },
  {
    name: 'Loading Orb',
    lib: 'SpaceUI',
    icon: Activity,
    color: 'from-emerald-400 to-teal-500',
    desc: 'Matrix pixel grid with spring motion.',
  },
  {
    name: 'Refresh Pulse',
    lib: 'Unlumen · UIARC',
    icon: RefreshCw,
    color: 'from-orange-400 to-rose-500',
    desc: 'Circular stroke progress with ease-in-out.',
  },
]

export default function LoaderDemos() {
  return (
    <section id="loaders" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title">Loaders & Progress</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Loading states from Vengeance UI, SpaceUI, Forge UI, and Unlumen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {loaders.map((l) => (
            <motion.div
              key={l.name}
              whileHover={{ scale: 1.02 }}
              className="glass p-8 rounded-2xl flex flex-col items-center gap-4"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-2"
                style={{ background: l.color }}
              >
                <l.icon className="w-7 h-7 animate-spin-slow" />
              </div>
              <h3 className="text-base font-bold text-white">{l.name}</h3>
              <span className="text-xs font-mono text-brand-400">{l.lib}</span>
              <p className="text-[10px] text-slate-500 text-center">{l.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
