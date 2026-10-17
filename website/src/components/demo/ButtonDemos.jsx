import { motion } from 'framer-motion'
import { ArrowRight, Play, Zap, Brain, Flame, Droplets } from 'lucide-react'

const demos = [
  {
    name: 'Animated Button',
    lib: 'Vengeance UI · Componentry',
    desc: 'Press-spring button with label morph and ripple feedback.',
    icon: Zap,
    color: 'from-brand-500 to-cyan-400',
  },
  {
    name: 'Liquid Switch',
    lib: 'SpaceUI · Fluid Functionalism',
    desc: 'Elastic toggle with velocity-based organic stretch.',
    icon: Flame,
    color: 'from-orange-400 to-rose-500',
  },
  {
    name: 'TextMorph',
    lib: 'torph · Skecher-UI',
    desc: 'Smooth text continuity — morphing between phrases.',
    icon: Brain,
    color: 'from-indigo-400 to-purple-500',
  },
  {
    name: 'Kinetic Loader',
    lib: 'Vengeance UI · UsePlanes',
    desc: 'Particle-text loader with spring reassembly.',
    icon: Droplets,
    color: 'from-emerald-400 to-teal-500',
  },
  {
    name: 'Mega Menu',
    lib: 'UIARC · Vengeance UI',
    desc: 'Morphing mega menu with spring motion.',
    icon: Play,
    color: 'from-fuchsia-400 to-pink-500',
  },
  {
    name: 'Cassette Player',
    lib: 'dqnamo · SpaceUI',
    desc: 'Tactile audio player with turning reels.',
    icon: ArrowRight,
    color: 'from-amber-400 to-orange-500',
  },
]

export default function ButtonDemos() {
  return (
    <section id="buttons" className="py-24 px-4 sm:px-6 lg:px-8 bg-dark-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title">Interactive Demos</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Component demos rebuilt with Framer Motion, inspired by the
            libraries above.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demos.map((d) => (
            <motion.div
              key={d.name}
              whileHover={{ y: -6 }}
              className="glass p-6 rounded-2xl group cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5"
                style={{ background: d.color }}
              >
                <d.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{d.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{d.desc}</p>
              <span className="text-xs font-mono text-brand-400">{d.lib}</span>
              <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href="#"
                  className="flex items-center gap-1 text-brand-400 text-sm font-medium hover:text-brand-300"
                >
                  Try it <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
