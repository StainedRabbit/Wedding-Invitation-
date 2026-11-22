import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, TouchEvent } from 'react'
import { EdgeLight } from './EdgeLight'
import { animatePaperTurn } from './paperTurn'
import { Rsvp } from './Rsvp'

const chapters = ['invitation', 'story', 'details', 'family', 'guests', 'rsvp'] as const
type Chapter = typeof chapters[number]
const chapterThemes: Record<Chapter, 'moon' | 'sun'> = {
  invitation: 'moon', story: 'moon', details: 'sun', family: 'moon', guests: 'sun', rsvp: 'moon',
}
type Direction = -1 | 1
type Turn = { to: Chapter; direction: Direction; scrollTop: number }

const wheelPause = 180

function canScroll(page: HTMLElement, direction: Direction) {
  return direction < 0
    ? page.scrollTop > 1
    : page.scrollHeight - page.clientHeight - page.scrollTop > 1
}

export function Reader({ reducedMotion, entering, onClose }: {
  reducedMotion: boolean
  entering: boolean
  onClose: () => void
}) {
  const [current, setCurrent] = useState<Chapter>('invitation')
  const [turn, setTurn] = useState<Turn>()
  const reader = useRef<HTMLDivElement>(null)
  const activePage = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const pendingTurn = useRef<Turn | undefined>(undefined)
  const wheel = useRef<{ last: number; distance: number; direction?: Direction; action?: 'scroll' | 'turn' }>({
    last: -Infinity, distance: 0,
  })
  const swipe = useRef<{ x: number; y: number; previous: boolean; next: boolean } | null>(null)
  const index = chapters.indexOf(current)

  useLayoutEffect(() => {
    if (entering) return
    const page = activePage.current!
    page.scrollTop = 0
    page.querySelector('h2')?.focus({ preventScroll: true })
  }, [current, entering])

  useLayoutEffect(() => {
    if (!turn) return
    const layer = paper.current
    const source = reader.current?.querySelector<HTMLElement>('.leaf[data-turn-source]')
    function finishTurn() {
      if (!turn || pendingTurn.current !== turn) return
      pendingTurn.current = undefined
      setCurrent(turn.to)
      setTurn(undefined)
    }
    if (reducedMotion || !layer || !source) {
      finishTurn()
      return
    }
    // The destination's live view and the backward turn's print both start at its top.
    reader.current?.querySelector<HTMLElement>(`.leaf[data-chapter="${turn.to}"] .leaf-scroll`)?.scrollTo(0, 0)
    try {
      return animatePaperTurn(layer, source, turn.scrollTop, turn.direction, finishTurn)
    } catch {
      layer.replaceChildren()
      finishTurn()
    }
  }, [turn, reducedMotion])

  function goTo(chapter: Chapter) {
    if (entering || pendingTurn.current || chapter === current) return
    if (reducedMotion) {
      setCurrent(chapter)
      return
    }
    const direction = chapters.indexOf(chapter) > index ? 1 : -1
    const nextTurn: Turn = {
      to: chapter,
      direction,
      scrollTop: direction === 1 ? activePage.current!.scrollTop : 0,
    }
    pendingTurn.current = nextTurn
    reader.current?.focus({ preventScroll: true })
    setTurn(nextTurn)
  }

  function step(direction: Direction) {
    if (entering || pendingTurn.current) return
    const destination = index + direction
    if (destination < 0) onClose()
    else if (destination < chapters.length) goTo(chapters[destination])
  }

  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (entering) return
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const now = performance.now()
    const gesture = wheel.current
    const direction = event.deltaY > 0 ? 1 : -1
    if (now - gesture.last > wheelPause || gesture.direction !== direction) {
      gesture.distance = 0
      gesture.action = undefined
    }
    gesture.last = now
    gesture.direction = direction

    const page = activePage.current!
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page.clientHeight : 1
    if (pendingTurn.current || gesture.action === 'turn') {
      event.preventDefault()
      gesture.action = 'turn'
      return
    }
    if (canScroll(page, direction)) {
      gesture.action = 'scroll'
      gesture.distance = 0
      if (!page.contains(event.target as Node)) {
        event.preventDefault()
        page.scrollTop += event.deltaY * unit
      }
      return
    }
    event.preventDefault()
    gesture.distance += event.deltaY * unit
    // Require extra intent after a long page reaches its boundary, so scroll momentum
    // does not immediately turn the sheet. A fresh or reversed gesture turns sooner.
    const threshold = gesture.action === 'scroll' ? 120 : 35
    if (Math.abs(gesture.distance) >= threshold) {
      gesture.action = 'turn'
      step(gesture.distance > 0 ? 1 : -1)
    }
  })

  useEffect(() => {
    const element = reader.current!
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if ((event.target as Element).closest('input, select, textarea, [contenteditable]')) return
    event.preventDefault()
    if (!event.repeat) step(event.key === 'ArrowLeft' ? -1 : 1)
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    swipe.current = null
    if (pendingTurn.current || event.touches.length !== 1) return
    const { clientX, clientY } = event.touches[0]
    const page = activePage.current!
    swipe.current = { x: clientX, y: clientY, previous: !canScroll(page, -1), next: !canScroll(page, 1) }
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipe.current
    swipe.current = null
    if (!start || event.touches.length) return
    const { clientX, clientY } = event.changedTouches[0]
    const distance = start.y - clientY
    if (Math.abs(distance) < 48 || Math.abs(distance) < Math.abs(start.x - clientX) * 1.2) return
    if (distance > 0 && start.next) step(1)
    if (distance < 0 && start.previous) step(-1)
  }

  return <div
    className="reader"
    ref={reader}
    inert={entering}
    tabIndex={-1}
    data-turning={Boolean(turn) || undefined}
    onKeyDown={onKeyDown}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
    onTouchCancel={() => { swipe.current = null }}
  >
    <div className="leaves">
      {chapters.map(chapter => {
        const active = chapter === current
        const rendered = active || chapter === turn?.to
        const turnSource = turn && (turn.direction === 1 ? active : chapter === turn.to)
        return <section key={chapter} className="leaf" data-active={active} data-chapter={chapter}
          data-turn-source={turnSource || undefined} data-theme={chapterThemes[chapter]}
          aria-labelledby={chapter + '-title'} hidden={!rendered} inert={Boolean(turn) || !active}>
          <div className="leaf-scroll" ref={active ? activePage : undefined}>
            <div className="leaf-paper">
              <div className="leaf-content">
                <img className="page-emblem" src={chapterThemes[chapter] === 'moon' ? '/art/page-moon-emblem.webp' : '/art/sun-refined.webp'} alt="" aria-hidden="true" />
                {chapter === 'invitation' && <Invitation onJump={goTo} />}
                {chapter === 'story' && <Story />}
                {chapter === 'details' && <WeddingDetails onJump={goTo} />}
                {chapter === 'family' && <Family />}
                {chapter === 'guests' && <GuestInformation />}
                {chapter === 'rsvp' && <Rsvp onBack={() => goTo('invitation')} />}
              </div>
            </div>
            {active && !entering && !turn && <div className="page-edges">
              <button className="page-edge page-edge-left" type="button" onClick={() => step(-1)}
                aria-label={index === 0 ? 'Close book' : 'Previous page'}>
                <EdgeLight reducedMotion={reducedMotion} />
              </button>
              {index < chapters.length - 1 && <button className="page-edge page-edge-right" type="button"
                onClick={() => step(1)} aria-label="Next page">
                <EdgeLight reducedMotion={reducedMotion} />
              </button>}
            </div>}
          </div>
        </section>
      })}
      {turn && <div className="paper-turn" ref={paper} aria-hidden="true" inert />}
    </div>
  </div>
}

function Invitation({ onJump }: { onJump: (chapter: Chapter) => void }) {
  const [personal, setPersonal] = useState<{ guestName: string; personalMessage: string }>()
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('invite')
    if (token === null) return
    const controller = new AbortController()
    fetch('/api/rsvp/context/', { headers: { 'X-Invitation-Token': token }, signal: controller.signal })
      .then(response => response.ok && response.headers.get('content-type')?.includes('application/json') ? response.json() : null)
      .then(data => { if (data?.kind === 'personalized') setPersonal(data) })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return <>
    <h2 id="invitation-title" tabIndex={-1}>You’re invited</h2>
    {personal && <p>Dear {personal.guestName},</p>}
    {personal?.personalMessage && <p style={{ whiteSpace: 'pre-wrap' }}>{personal.personalMessage}</p>}
    <div className="couple">Angelyn B. Sayno <span>&amp;</span> Kevin-Ezer F. Tanierla</div>
    <p>Through moonlit nights and sunlit mornings, we’ve been writing our story together. We’d love for you to join us on our wedding day as we begin our next chapter.</p>
    <nav className="chapter-links" aria-label="Wedding invitation chapters">
      <button className="primary" type="button" onClick={() => onJump('rsvp')}>RSVP</button>
      <div>
        <button className="back" type="button" onClick={() => onJump('story')}>Our Story</button>
        <button className="back" type="button" onClick={() => onJump('details')}>Wedding Details</button>
      </div>
    </nav>
  </>
}

function Story() {
  return <>
    <h2 id="story-title" tabIndex={-1}>Our Story</h2>
    <p className="sample-label">Sample story</p>
    <ol className="milestones">
      <li><h3>How we met</h3><p>A quick coffee turned into a conversation that lasted until closing time.</p></li>
      <li><h3>Our first trip</h3><p>We got lost on a weekend drive and found a quiet spot to watch the sunrise.</p></li>
      <li><h3>The proposal</h3><p>Back at that same spot, a sunrise walk ended with a question and a very happy yes.</p></li>
    </ol>
  </>
}

function WeddingDetails({ onJump }: { onJump: (chapter: Chapter) => void }) {
  return <>
    <h2 id="details-title" tabIndex={-1}>Wedding Details</h2>
    <p className="sample-label">SAMPLE details - please replace before sharing</p>
    <dl className="event-details">
      <div><dt><img src="/art/icon-calendar.svg" alt="" /> Date</dt><dd>Saturday, 12 June 2027 (SAMPLE)</dd></div>
      <div><dt><img src="/art/icon-location.svg" alt="" /> Ceremony &amp; reception</dt><dd>Moonlight Garden (SAMPLE fictional venue)<br />123 Sample Lane, Tagaytay, Philippines (SAMPLE fictional address)<br /><a href="https://www.google.com/maps/search/?api=1&amp;query=Moonlight+Garden+Sample+Tagaytay" target="_blank" rel="noreferrer">Sample map search</a> - replace with the real venue link</dd></div>
      <div><dt>Schedule (SAMPLE)</dt><dd>3:30 PM guest arrival<br />4:00 PM ceremony<br />6:00 PM reception at the same venue</dd></div>
    </dl>
    <nav className="chapter-links" aria-label="More wedding information">
      <button className="back" type="button" onClick={() => onJump('family')}>Our Families &amp; Wedding Party</button>
      <button className="back" type="button" onClick={() => onJump('guests')}>Guest Information</button>
    </nav>
  </>
}

function Family() {
  return <>
    <h2 id="family-title" tabIndex={-1}>Our Families &amp; Wedding Party</h2>
    <p className="sample-label">SAMPLE names and roles - please replace before sharing</p>
    <p>With the love and blessing of our families, we are delighted to celebrate with you.</p>
    <dl className="event-details">
      <div><dt>Bride's parents</dt><dd>Mr. and Mrs. Sample Sayno</dd></div>
      <div><dt>Groom's parents</dt><dd>Mr. and Mrs. Sample Tanierla</dd></div>
      <div><dt>Principal sponsors</dt><dd>Ninong Sample One &amp; Ninang Sample One<br />Ninong Sample Two &amp; Ninang Sample Two</dd></div>
      <div><dt>Maid of honor &amp; best man</dt><dd>Sample Maid of Honor<br />Sample Best Man</dd></div>
      <div><dt>Bridesmaids &amp; groomsmen</dt><dd>Sample Bridesmaid One &amp; Sample Bridesmaid Two<br />Sample Groomsman One &amp; Sample Groomsman Two</dd></div>
      <div><dt>Secondary sponsors</dt><dd>Candle: Sample Candle Sponsors<br />Veil: Sample Veil Sponsors<br />Cord: Sample Cord Sponsors</dd></div>
      <div><dt>Little attendants</dt><dd>Flower girl: Sample Flower Girl<br />Ring bearer: Sample Ring Bearer<br />Bible bearer: Sample Bible Bearer</dd></div>
    </dl>
  </>
}

function GuestInformation() {
  return <>
    <h2 id="guests-title" tabIndex={-1}>For Our Guests</h2>
    <p className="sample-label">SAMPLE guidance - please replace before sharing</p>
    <dl className="event-details">
      <div><dt>RSVP</dt><dd>Please use the RSVP page by 12 May 2027 (SAMPLE deadline). Questions or changes: <a href="mailto:rsvp@example.com">rsvp@example.com</a> (SAMPLE contact).</dd></div>
      <div><dt>Plus-ones</dt><dd>Personalized invitations will show a plus-one question when one is included. General invitations are for one guest per response.</dd></div>
      <div><dt>Attire (SAMPLE)</dt><dd>Garden formal in soft blues, ivory, or warm neutrals. Please choose comfortable shoes for the garden.</dd></div>
      <div><dt>Arrival &amp; transport (SAMPLE)</dt><dd>Please arrive by 3:30 PM. Sample on-site parking is available; arrange your own transport to the fictional venue.</dd></div>
      <div><dt>Children (SAMPLE)</dt><dd>We hope you can enjoy an adults-only celebration. Please contact us if you have questions.</dd></div>
      <div><dt>Gifts (SAMPLE)</dt><dd>Your presence is our greatest gift; no gifts are required.</dd></div>
      <div><dt>A note of thanks</dt><dd>Thank you for being part of our story. We look forward to celebrating our next chapter with you.</dd></div>
    </dl>
  </>
}
