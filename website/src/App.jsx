import { useState } from 'react'
import { Menu, X, Home, Code2, Palette, Layers, Zap, Activity, GitBranch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Hero from './components/Hero'
import LibraryShowcase from './components/LibraryShowcase'
import ButtonDemos from './components/demo/ButtonDemos'
import TextDemos from './components/demo/TextDemos'
import CardDemos from './components/demo/CardDemos'
import LoaderDemos from './components/demo/LoaderDemos'
import Footer from './components/Footer'

const sections = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'libraries', label: 'Libraries', icon: Layers },
  { id: 'buttons', label: 'Buttons', icon: Zap },
  { id: 'text', label: 'Text & Motion', icon: Activity },
  { id: 'cards', label: 'Cards', icon: Code2 },
  { id: 'loaders', label: 'Loaders', icon: GitBranch },
]

export default function App() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')

  const scrollTo = (id) => {
    setOpen(false)
    setActive(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen selection:bg-brand-500/30">
      {/* Background blobs */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] animate-blob"
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-900/50 rounded-full blur-[120px] animate-blob"
          style={{ animationDelay: '-2s' }}
        />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-dark-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => scrollTo('home')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-slate-600 rounded-lg flex items-center justify-center text-white font-bold">
                U
              </div>
              <span className="font-bold text-xl tracking-tight text-white">UI<span className="text-brand-500">Showcase</span></span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`text-sm font-medium transition-colors ${
                    active === s.id
                      ? 'text-brand-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => scrollTo('libraries')}
                className="glass px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Browse Libraries
              </button>
              <button
                className="md:hidden text-slate-400 hover:text-white"
                onClick={() => setOpen(!open)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-dark-950/95 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <div className="absolute top-4 right-4">
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-4 py-8 space-y-6">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="block text-lg font-medium text-slate-300 hover:text-brand-400 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        <Hero />
        <LibraryShowcase />
        <ButtonDemos />
        <TextDemos />
        <CardDemos />
        <LoaderDemos />
        <Footer />
      </main>
    </div>
  )
}
