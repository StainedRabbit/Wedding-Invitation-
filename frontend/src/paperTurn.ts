const duration = 680
const stripCount = 32

function copyPage(source: HTMLElement) {
  const copy = source.cloneNode(true) as HTMLElement
  copy.querySelector('.page-edges')?.remove()
  copy.classList.add('turn-print')
  copy.removeAttribute('aria-labelledby')
  copy.removeAttribute('data-active')
  copy.removeAttribute('data-turn-source')
  copy.inert = true
  copy.setAttribute('aria-hidden', 'true')
  for (const element of copy.querySelectorAll('[id], [name], [for], [form], [autofocus]')) {
    for (const attribute of ['id', 'name', 'for', 'form', 'autofocus']) {
      element.removeAttribute(attribute)
    }
  }

  const fields = copy.querySelectorAll('input')
  source.querySelectorAll('input').forEach((input, index) => {
    fields[index].value = input.value
    fields[index].checked = input.checked
  })
  return copy
}

export function animatePaperTurn(
  layer: HTMLElement,
  source: HTMLElement,
  scrollTop: number,
  direction: 1 | -1,
  onFinish: () => void,
) {
  const { clientWidth: width, clientHeight: height } = layer
  if (!width || !height) {
    onFinish()
    return
  }

  const stripWidth = width / stripCount
  const bendWidth = Math.min(width * .39, 360)
  const template = copyPage(source)
  template.style.width = width + 'px'
  template.style.setProperty('--turn-scroll', -scrollTop + 'px')

  const shadow = document.createElement('div')
  shadow.className = 'turn-shadow'
  const sheet = document.createElement('div')
  sheet.className = 'turn-sheet'
  const strips = Array.from({ length: stripCount }, (_, index) => {
    const strip = document.createElement('div')
    strip.className = 'turn-strip'
    // A fractional overlap keeps antialiasing from exposing gaps at the joins.
    strip.style.width = stripWidth + (index === stripCount - 1 ? 0 : .55) + 'px'
    strip.style.setProperty('--paper-offset', index * stripWidth + 'px')
    const front = document.createElement('div')
    front.className = 'turn-front'
    const print = template.cloneNode(true) as HTMLElement
    print.style.left = -index * stripWidth + 'px'
    front.append(print)
    strip.append(front)
    sheet.append(strip)
    return strip
  })
  layer.append(shadow, sheet)

  function paint(progress: number) {
    const fold = width - progress * (width + bendWidth)
    function angleAt(offset: number) {
      const bend = Math.max(0, Math.min(1, (offset - fold) / bendWidth))
      return Math.PI * bend * bend * (3 - 2 * bend)
    }
    let x = 0
    let depth = 0
    let shadowEdge = 0
    let lift = 0
    let startAngle = angleAt(0)
    for (const [index, strip] of strips.entries()) {
      const angle = angleAt((index + .5) * stripWidth)
      const endAngle = angleAt((index + 1) * stripWidth)
      const dx = stripWidth * Math.cos(angle)
      const dz = stripWidth * Math.sin(angle)
      // The lifted edge drifts down slightly, tracing a curve along the top of the sheet.
      const drop = depth * .16
      const slope = Math.atan2(dz * .16, stripWidth)
      strip.style.transform = `translate3d(${x}px, ${drop}px, ${depth}px) rotateY(${-angle}rad) skewY(${slope}rad)`
      strip.style.setProperty('--shade-start', String(Math.sin(startAngle) * .23))
      strip.style.setProperty('--shade-end', String(Math.sin(endAngle) * .23))
      startAngle = endAngle
      x += dx
      depth += dz
      shadowEdge = Math.max(shadowEdge, x)
      lift = Math.max(lift, depth)
    }
    const shadowWidth = 12 + lift * .6
    shadow.style.width = shadowWidth + 'px'
    shadow.style.transform = `translateX(${shadowEdge - shadowWidth * .32}px) skewX(${-lift / height * .18}rad)`
    shadow.style.opacity = String(Math.sin(Math.PI * progress) * .65)
  }

  paint(direction === 1 ? 0 : 1)
  let frame = 0
  let started: number | undefined
  let finished = false
  function finish() {
    if (finished) return
    finished = true
    onFinish()
  }
  function tick(time: number) {
    if (finished) return
    started ??= time
    const elapsed = Math.min(1, (time - started) / duration)
    const eased = (1 - Math.cos(Math.PI * elapsed)) / 2
    paint(direction === 1 ? eased : 1 - eased)
    if (elapsed === 1) finish()
    else frame = requestAnimationFrame(tick)
  }
  const observer = new ResizeObserver(() => {
    if (layer.clientWidth !== width || layer.clientHeight !== height) finish()
  })
  observer.observe(layer)
  frame = requestAnimationFrame(tick)
  const fallback = window.setTimeout(finish, duration + 200)

  return () => {
    finished = true
    cancelAnimationFrame(frame)
    window.clearTimeout(fallback)
    observer.disconnect()
    layer.replaceChildren()
  }
}
