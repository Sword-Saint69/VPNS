import { motion } from 'framer-motion'
import { Sparkles, Code2, Palette, Zap } from 'lucide-react'

export default function Hero() {
  return (
    <section id="home" className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400 border border-brand-500/20 mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          Live on GitHub Pages
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-300 to-brand-400 text-balance"
        >
          UI Component <br />
          <span className="text-brand-500">Showcase</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto text-balance"
        >
          A curated gallery of React components pulled from{' '}
          <span className="text-white font-medium">15 public UI libraries</span>{'&nbsp;·&nbsp;'}
          built with Tailwind CSS and Framer Motion.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#libraries"
            className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/25"
          >
            Browse Libraries
          </a>
          <a
            href="#buttons"
            className="w-full sm:w-auto px-8 py-4 glass text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
          >
            See Demos
          </a>
        </motion.div>
      </div>

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#16213e00_0%,#0b0c10_50%,#16213e00_100%)] pointer-events-none" />
    </section>
  )
}
