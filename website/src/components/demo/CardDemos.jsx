import { motion } from 'framer-motion'
import { Layout, List, Clipboard, Layers } from 'lucide-react'

export default function CardDemos() {
  const cards = [
    {
      name: 'Bento Grid',
      lib: 'Vengeance UI · Unlumen',
      icon: Layout,
      color: 'from-brand-400 to-cyan-500',
      desc: 'Composable grid tiles with hover lift and spring physics.',
    },
    {
      name: 'Metric Card',
      lib: 'UIARC · SpaceUI',
      icon: List,
      color: 'from-indigo-400 to-purple-500',
      desc: 'KPI card with animated counter and sparkline.',
    },
    {
      name: 'Glow Border Card',
      lib: 'Vengeance UI',
      icon: Clipboard,
      color: 'from-fuchsia-400 to-pink-500',
      desc: 'Card with animated neon border glow.',
    },
    {
      name: 'Stats Band',
      lib: 'UIARC Blocks · UsePlanes',
      icon: Layers,
      color: 'from-emerald-400 to-teal-500',
      desc: 'Social-proof stats band with animated counters.',
    },
  ]

  return (
    <section id="cards" className="py-24 px-4 sm:px-6 lg:px-8 bg-dark-950/50 border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title">Cards & Layouts</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Layout patterns from Vengeance UI, UIARC blocks, and Unlumen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c) => (
            <motion.div
              key={c.name}
              whileHover={{ y: -8 }}
              className="glass p-6 rounded-2xl group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white mb-5"
                style={{ background: c.color }}
              >
                <c.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{c.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{c.desc}</p>
              <span className="text-xs font-mono text-brand-400">{c.lib}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
