import { motion } from 'framer-motion'

/** Three-dot orbital thinking loader — shown while the dashboard syncs. */
export default function LoaderOrb() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full border border-slate-100" />
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-teal-500"
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-center">
        <div className="font-medium text-slate-800">
          Syncing with GitHub Actions…
        </div>
        <div className="mt-1 font-mono text-xs text-slate-400">
          fetching summary_sword-saint69.json
        </div>
      </div>
    </div>
  )
}
