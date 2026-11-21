import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Cover, type LoadState } from './Book'
import { Layer } from './art'
import { Reader } from './Reader'
import './style.css'
import './motion.css'
import './reader.css'

type Phase = 'closed' | 'waiting' | 'opening' | 'approaching' | 'open' | 'retreating' | 'closing'
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')

function App() {
  const [phase, setPhase] = useState<Phase>('closed')
  const [load, setLoad] = useState<LoadState>('pending')
  const [reduceMotion, setReduceMotion] = useState(motionPreference.matches)
  const [motionOptIn, setMotionOptIn] = useState(false)
  const pageWell = useRef<HTMLDivElement>(null)
  const camera = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const open = phase === 'open'
  const approaching = phase === 'approaching'
  const closing = phase === 'retreating' || phase === 'closing'
  const animating = phase === 'opening' || approaching || closing
  const reduceSessionMotion = reduceMotion && !motionOptIn

  useEffect(() => {
    const update = () => {
      setReduceMotion(motionPreference.matches)
      setMotionOptIn(false)
    }
    motionPreference.addEventListener('change', update)
    return () => motionPreference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (phase === 'closed' || open) return
    if (reduceSessionMotion || load === 'failed') {
      if (closing) finishClosing()
      else setPhase('open')
      return
    }
    if (phase === 'waiting' && load === 'ready') {
      setPhase('opening')
      return
    }
    // A slow or stalled asset must never keep a guest on the closed cover.
    const timer = window.setTimeout(() => {
      if (phase === 'retreating') setPhase('closing')
      else if (phase === 'closing') finishClosing()
      else setPhase(phase === 'opening' ? 'approaching' : 'open')
    }, phase === 'waiting' ? 1600 : phase === 'opening' ? 2600 : phase === 'retreating' ? 1600 : phase === 'closing' ? 1700 : 1600)
    return () => clearTimeout(timer)
  }, [phase, open, load, reduceSessionMotion])

  useLayoutEffect(() => {
    if (!animating) return
    const scene = camera.current!
    const page = pageWell.current!
    const viewport = scene.parentElement!
    function framePage() {
      const { clientWidth: width, clientHeight: height } = viewport
      if (!width || !height) return
      const book = scene.querySelector<HTMLElement>('.book')!
      const bookWidth = book.offsetWidth
      if (!bookWidth) return
      scene.style.setProperty('--spread-scale', String(Math.min(1, width * .95 / (bookWidth * 1.85))))
      const sceneBounds = scene.getBoundingClientRect()
      const pageBounds = page.getBoundingClientRect()
      // Undo the camera's current scale when remeasuring during a resize.
      const cameraScale = sceneBounds.width / width
      // The spread itself can also be scaled down to fit a narrow screen.
      const bookScale = book.getBoundingClientRect().width / (bookWidth * cameraScale)
      const x = (pageBounds.left - sceneBounds.left) / cameraScale
      const y = (pageBounds.top - sceneBounds.top) / cameraScale
      const paperWidth = pageBounds.width / (cameraScale * bookScale)
      const paperHeight = pageBounds.height / (cameraScale * bookScale)
      const scale = Math.min(paperWidth / width, paperHeight / height)
      const overallScale = scale * bookScale
      if (!overallScale) return
      scene.style.setProperty('--reader-width', `${width}px`)
      scene.style.setProperty('--reader-height', `${height}px`)
      scene.style.setProperty('--paper-width', `${paperWidth / scale}px`)
      scene.style.setProperty('--paper-height', `${paperHeight / scale}px`)
      scene.style.setProperty('--page-scale', String(scale))
      scene.style.setProperty('--camera-target', `translate(${-x / overallScale}px, ${-y / overallScale}px) scale(${1 / overallScale})`)
    }
    framePage()
    // During the camera move the viewport-sized reader can become shorter
    // than the still-visible paper. Keep its decorated surface covering the
    // visible part of the physical page, without extending past the viewport.
    let frame = 0
    if (phase === 'approaching' || phase === 'retreating') {
      const fillVisiblePage = () => {
        const paperHeight = parseFloat(scene.style.getPropertyValue('--paper-height'))
        const paperBounds = page.getBoundingClientRect()
        const viewportBounds = viewport.getBoundingClientRect()
        if (paperHeight && paperBounds.height) {
          const visibleHeight = Math.min(paperBounds.height, Math.max(0, viewportBounds.bottom - paperBounds.top))
          scene.style.setProperty('--visible-page-height', `${visibleHeight * paperHeight / paperBounds.height}px`)
        }
        frame = requestAnimationFrame(fillVisiblePage)
      }
      fillVisiblePage()
    }
    const observer = new ResizeObserver(framePage)
    observer.observe(viewport)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      for (const property of ['--reader-width', '--reader-height', '--paper-width', '--paper-height', '--page-scale', '--camera-target', '--spread-scale', '--visible-page-height']) {
        scene.style.removeProperty(property)
      }
    }
  }, [animating, phase])

  useLayoutEffect(() => {
    if (phase === 'closed' && restoreFocus.current) {
      opener.current?.focus({ preventScroll: true })
      restoreFocus.current = false
    }
  }, [phase])

  function enter(playAnimation: boolean) {
    if (phase !== 'closed') return
    setMotionOptIn(playAnimation && reduceMotion)
    if (!playAnimation || load === 'failed') {
      setPhase('open')
      return
    }
    setPhase(load === 'ready' ? 'opening' : 'waiting')
  }
  function closeBook() {
    if (phase !== 'open') return
    restoreFocus.current = true
    if (reduceSessionMotion || load === 'failed') finishClosing()
    else setPhase('retreating')
  }
  function finishClosing() {
    setMotionOptIn(false)
    setPhase('closed')
  }

  return <main className={'stage ' + phase}>
    <div className="night-frame" aria-hidden="true" />
    <div className="book-camera" ref={camera} onAnimationEnd={event => {
      if (phase === 'opening' && event.animationName === 'swing-cover') {
        setPhase('approaching')
      } else if (approaching && event.target === event.currentTarget && event.animationName === 'enter-book') {
        setPhase('open')
      } else if (phase === 'retreating' && event.target === event.currentTarget && event.animationName === 'enter-book') {
        setPhase('closing')
      } else if (phase === 'closing' && event.animationName === 'swing-cover') {
        finishClosing()
      }
    }}>
      <div className="scene">
        <div className="book">
          {!open && <div className="book-glow" aria-hidden="true" />}
          <div className="open-book">
            {!open && <>
              <Layer name="book-back-board" />
              <Layer name="ribbon-resting" />
              <div className="book-hinge" aria-hidden="true" />
            </>}
            <div className="page-well" ref={pageWell}>
              {(animating || open) && <Reader reducedMotion={reduceSessionMotion} entering={!open} onClose={closeBook} />}
            </div>
            {animating && <div className="hinge-shadow" aria-hidden="true" />}
          </div>
          <Cover load={load} onLoad={setLoad} />
          {!open && <button type="button" className="book-opener" ref={opener}
            aria-label="Open the book" aria-disabled={phase !== 'closed'} onClick={() => enter(true)} />}
        </div>
        <span className="sr-only" role="status">{closing ? 'Closing invitation' : phase === 'waiting' || animating ? 'Opening invitation' : ''}</span>
      </div>
    </div>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)

