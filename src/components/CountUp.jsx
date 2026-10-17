import { useEffect, useRef, useState } from 'react'

/**
 * Animated number counter — rAF + easeOutCubic.
 * Continues from wherever it was when `value` changes.
 * Safety timeout snaps to the target if rAF is throttled (hidden tab).
 */
export default function CountUp({
  value = 0,
  duration = 1.1,
  format = (n) => Math.round(n).toLocaleString(),
  className = '',
}) {
  const [display, setDisplay] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    const from = shown.current
    const to = Number(value) || 0
    if (from === to) {
      setDisplay(to)
      return
    }
    let raf
    let done = false
    const finish = () => {
      done = true
      shown.current = to
      setDisplay(to)
    }
    const t0 = performance.now()
    const tick = (t) => {
      if (done) return
      const p = Math.min((t - t0) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (to - from) * eased
      shown.current = v
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else finish()
    }
    raf = requestAnimationFrame(tick)
    const safety = setTimeout(() => {
      if (!done) {
        cancelAnimationFrame(raf)
        finish()
      }
    }, duration * 1000 + 500)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(safety)
    }
  }, [value, duration])

  return <span className={`tnum ${className}`}>{format(display)}</span>
}
