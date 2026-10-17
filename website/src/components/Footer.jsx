import { motion } from 'framer-motion'
import { ArrowRight, Globe, Code2 } from 'lucide-react'

export default function Footer() {
  const libs = [
    'Componentry', 'SpaceUI', 'Skecher-UI', 'UsePlanes', 'UIARC (Arc)',
    'Unlumen', 'lukacho/ui', 'Vengeance UI', 'torph', 'Forge UI',
    'Fluid Functionalism', 'toggle.supply', 'dqnamo', 'Watermelon UI',
  ]

  return (
    <footer className="border-t border-white/5 bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-slate-600 rounded flex items-center justify-center text-white font-bold">
              U
            </div>
            <span className="font-bold text-lg text-white">UI<span className="text-brand-500">Showcase</span></span>
          </div>
          <p className="text-slate-500 text-sm">
            Components sourced from public UI libraries &mdash; each links back to its original home.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="text-white font-medium mb-4">Libraries</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {libs.map((lib) => (
                <li key={lib}>
                  <a
                    href={lib === 'Componentry' ? 'https://componentry.dev/docs' : lib === 'SpaceUI' ? 'https://www.spaceui.one/components' : lib === 'Skecher-UI' ? 'https://skecher-ui.com/docs' : lib === 'UsePlanes' ? 'https://useplanes.com/components?tier=free' : lib === 'UIARC (Arc)' ? 'https://uiarc.dev/components/' : lib === 'Unlumen' ? 'https://ui.unlumen.com/components' : lib === 'lukacho/ui' ? 'https://ui.lukacho.com/components' : lib === 'Vengeance UI' ? 'https://www.vengenceui.com/components/' : lib === 'torph' ? 'https://torph.lochie.me/' : lib === 'Forge UI' ? 'https://forgeui.in/components/animated-form' : lib === 'Fluid Functionalism' ? 'https://www.fluidfunctionalism.com/' : lib === 'toggle.supply' ? 'https://www.toggle.supply/' : lib === 'dqnamo' ? 'https://www.dqnamo.com/kitchen' : 'https://ui.watermelon.sh/home'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-400 transition-colors"
                  >
                    {lib}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Demo Sections</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#buttons" className="hover:text-brand-400 transition-colors">Buttons</a></li>
              <li><a href="#text" className="hover:text-brand-400 transition-colors">Text & Motion</a></li>
              <li><a href="#cards" className="hover:text-brand-400 transition-colors">Cards</a></li>
              <li><a href="#loaders" className="hover:text-brand-400 transition-colors">Loaders</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            Built with <span className="text-brand-500">React</span> +{' '}
            <span className="text-brand-500">Tailwind</span> +{' '}
            <span className="text-brand-500">Framer Motion</span>
          </p>
          <div className="flex gap-4">
            <a href="https://github.com/Sword-Saint69/VPNS" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
