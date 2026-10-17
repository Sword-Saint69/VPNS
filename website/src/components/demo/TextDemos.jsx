import { motion } from 'framer-motion'
import { Type, RotateCw, Scissors, Sparkles } from 'lucide-react'

export default function TextDemos() {
  const phrases = [
    'Motion is information, not decoration.',
    'Every animation serves a functional purpose.',
    'Fluid hover. Spring physics. Yours to theme.',
    'Text continuity for interfaces on the web.',
  ]

  return (
    <section id="text" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title">Text & Motion</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Typographic effects inspired by Skecher-UI, Fluid Functionalism,
            Vengeance UI and torph.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="glass p-8 rounded-2xl mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-brand-400 border border-brand-500/30 bg-brand-500/10">
                  <Type className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">TextMorph</h3>
              </div>
              <div className="relative h-20 flex items-center justify-center overflow-hidden">
                <motion.h1
                  className="text-4xl font-bold text-white"
                  animate={{ opacity: [0, 1, 0], y: [20, 0, -20] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {phrases[0]}
                </motion.h1>
                <p className="absolute bottom-0 text-xs text-slate-500 font-mono">
                  loop · 3s · ease-in-out
                </p>
              </div>
              <p className="mt-6 text-slate-400 text-sm">
                Inspired by <span className="text-brand-400 font-medium">torph</span> &{' '}
                <span className="text-brand-400 font-medium">Skecher-UI Morphing Text</span>
              </p>
            </div>

            <div className="glass p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-rose-400 border border-rose-500/30 bg-rose-500/10">
                  <RotateCw className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Flip Text</h3>
              </div>
              <div className="flex flex-col gap-2">
                {['Save', 'Saved', 'Saving...', 'Done ✓'].map((word, i) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.5 }}
                    className="text-2xl font-mono text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent"
                  >
                    {word}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                whileHover={{ x: 10 }}
                className="glass p-6 rounded-2xl group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white mb-0" style={{ background: 'linear-gradient(to right, #a855f7, #3b82f6)' }}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white">{`Morph Effect ${i}`}</h4>
                </div>
                <p className="text-sm text-slate-400">{phrases[i % phrases.length]}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-mono text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-3 h-3 bg-brand-400 rounded-full animate-pulse" />
                  Active
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
