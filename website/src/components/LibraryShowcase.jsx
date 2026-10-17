import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Code, ShieldCheck, Terminal, Zap, Activity, Palette } from 'lucide-react'

const libs = [
  {
    name: 'Componentry',
    tag: 'Animated Primitives',
    desc: 'Animated React primitives with motion, liquid glass, and spectral effects.',
    url: 'https://componentry.dev/docs',
    icon: Sparkles,
    color: 'from-brand-400 to-cyan-500',
  },
  {
    name: 'SpaceUI',
    tag: 'Tailwind Components',
    desc: 'Complex React components, animations & layouts styled with Tailwind CSS.',
    url: 'https://www.spaceui.one/components',
    icon: Code,
    color: 'from-indigo-400 to-purple-500',
  },
  {
    name: 'Skecher-UI',
    tag: 'Shader & Interface',
    desc: 'Shader-based components, liquid glass social, morphing action docks.',
    url: 'https://skecher-ui.com/docs',
    icon: ShieldCheck,
    color: 'from-emerald-400 to-teal-500',
  },
  {
    name: 'UsePlanes',
    tag: '142 Animated React',
    desc: '142 animated React components across AI, WebGL, Media, Physics, Text.',
    url: 'https://useplanes.com/components?tier=free',
    icon: Terminal,
    color: 'from-rose-400 to-pink-500',
  },
  {
    name: 'UIARC (Arc)',
    tag: 'shadcn + motion',
    desc: '121 shadcn-style components built with motion, installable via CLI.',
    url: 'https://uiarc.dev/components/',
    icon: Code,
    color: 'from-blue-400 to-cyan-500',
  },
  {
    name: 'Unlumen',
    tag: 'Careful Motion',
    desc: '~57 animated components with Free/Pro tiers, 3D effects and restraint.',
    url: 'https://ui.unlumen.com/components',
    icon: ShieldCheck,
    color: 'from-violet-400 to-fuchsia-500',
  },
  {
    name: 'lukacho/ui',
    tag: 'React + Tailwind',
    desc: '23 smooth React components — animated charts, cursors, grids.',
    url: 'https://ui.lukacho.com/components',
    icon: Code,
    color: 'from-amber-400 to-orange-500',
  },
  {
    name: 'Vengeance UI',
    tag: 'Bold & Interactive',
    desc: '~78 components — bento grids, carousels, liquid text, mega menus.',
    url: 'https://www.vengenceui.com/components/',
    icon: Zap,
    color: 'from-red-400 to-orange-500',
  },
  {
    name: 'torph',
    tag: 'TextMorph',
    desc: 'Single focused component — smooth text continuity for the web.',
    url: 'https://torph.lochie.me/',
    icon: Terminal,
    color: 'from-slate-400 to-slate-500',
  },
  {
    name: 'Forge UI',
    tag: 'Animated Forms',
    desc: 'Animated forms, OTP, auth clusters, vault locks by Aman Shakya.',
    url: 'https://forgeui.in/components/animated-form',
    icon: ShieldCheck,
    color: 'from-indigo-400 to-blue-500',
  },
  {
    name: 'Fluid Functionalism',
    tag: 'Motion is Info',
    desc: '28 refined components — fluid hover, spring physics, thinking steps.',
    url: 'https://www.fluidfunctionalism.com/',
    icon: Activity,
    color: 'from-cyan-400 to-emerald-500',
  },
  {
    name: 'toggle.supply',
    tag: 'CSS-first',
    desc: 'Hand-coded CSS components — scroll reveals, circle masks, lightboxes.',
    url: 'https://www.toggle.supply/',
    icon: Terminal,
    color: 'from-fuchsia-400 to-pink-500',
  },
  {
    name: 'dqnamo',
    tag: 'Interface Studies',
    desc: '15 kitchen experiments — tactile buttons, cassette players, iridescent foil.',
    url: 'https://www.dqnamo.com/kitchen',
    icon: Palette,
    color: 'from-orange-400 to-red-500',
  },
  {
    name: 'Watermelon UI',
    tag: 'Open React Platform',
    desc: 'Animated components, blocks, dashboards, templates — built in public.',
    url: 'https://ui.watermelon.sh/home',
    icon: Zap,
    color: 'from-emerald-400 to-lime-500',
  },
]

export default function LibraryShowcase() {
  return (
    <section id="libraries" className="py-24 bg-dark-950/50 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-title">Component Libraries</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            A living showcase of components pulled from {libs.length} public
            UI libraries. Each section links back to its source.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {libs.map((lib) => (
            <motion.div
              key={lib.name}
              whileHover={{ y: -4 }}
              className="lib-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{
                    background: lib.color,
                  }}
                >
                  <lib.icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-white">{lib.name}</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">{lib.desc}</p>
              <div className="flex items-center gap-2 text-xs font-mono text-brand-400 mb-4">
                <span>{lib.tag}</span>
              </div>
              <a
                href={lib.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors"
              >
                Visit library <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
