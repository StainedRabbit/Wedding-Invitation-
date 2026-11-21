import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

// A few of these positions remain visible with reduced motion.
const stars = [
  [21, 48, 8], [30, 32, 4], [38, 67, 7], [15, 13, 3], [17, 86, 3],
  [37, 40, 4], [13, 64, 3], [26, 77, 6],
]

export function EdgeLight({ reducedMotion }: { reducedMotion: boolean }) {
  const light = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reducedMotion) return
    const points = Array.from(light.current!.querySelectorAll<HTMLElement>('.edge-star'))
    const animations = new Map<HTMLElement, Animation>()

    function twinkle(star: HTMLElement, delay: number) {
      // Reposition only while invisible. Averaging two samples biases most glints toward the middle.
      const position = Math.random() < .3 ? Math.random() : (Math.random() + Math.random()) / 2
      const height = 4 + position * 92
      const centerStrength = 1 - Math.abs(position - .5) * 1.25
      const peak = (.72 + Math.random() * .28) * centerStrength
      star.style.setProperty('--glint-height', `${height}%`)
      star.style.setProperty('--glint-depth', `${10 + Math.random() * 40}%`)
      const animation = star.animate([
        { opacity: 0, offset: 0 },
        { opacity: peak, offset: .46 },
        { opacity: 0, offset: 1 },
      ], {
        delay,
        duration: 1600 + Math.random() * 1100,
        easing: 'ease-in-out',
      })
      animations.set(star, animation)
      animation.onfinish = () => twinkle(star, 500 + Math.random() * 1900)
    }

    function stop() {
      for (const animation of animations.values()) {
        animation.onfinish = null
        animation.cancel()
      }
      animations.clear()
    }

    points.forEach((star, index) => twinkle(star, index * 280 + Math.random() * 330))
    return stop
  }, [reducedMotion])

  return <span className="page-edge-light" data-motion={reducedMotion ? 'steady' : 'animated'} aria-hidden="true" ref={light}>
    {stars.map(([depth, height, size]) => (
      <span key={height} className={size >= 6 ? 'edge-star edge-star-rays' : 'edge-star'} style={{
        '--star-depth': `${depth}%`,
        '--star-height': `${height}%`,
        '--star-size': `${size}px`,
      } as CSSProperties} />
    ))}
  </span>
}
