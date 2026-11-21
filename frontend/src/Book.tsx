import { useEffect, useRef, useState } from 'react'
import { art, Layer, ornaments, ribbonLayers } from './art'

export type LoadState = 'pending' | 'ready' | 'failed'

const openingArtwork = [
  'ribbon-resting', 'paper-ivory', 'floral-top-right', 'floral-bottom-left',
]

export function Cover({ load, onLoad }: { load: LoadState; onLoad: (state: LoadState) => void }) {
  const rig = useRef<HTMLDivElement>(null)
  const [mountLayers, setMountLayers] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMountLayers(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!mountLayers) return
    let active = true
    const images = Array.from(rig.current!.querySelectorAll<HTMLImageElement>('img:not(.composite)'))
    for (const name of openingArtwork) {
      const image = new Image()
      image.src = art(name)
      images.push(image)
    }
    Promise.all(images.map(image => image.decode())).then(
      () => { if (active) onLoad('ready') },
      () => { if (active) onLoad('failed') },
    )
    return () => { active = false }
  }, [mountLayers, onLoad])

  const layersReady = mountLayers && load === 'ready'
  return <div className="cover-rig" ref={rig} data-ready={layersReady}>
    {mountLayers && <>
      <div className="base"><Layer name="book-back-board" /><Layer name="page-edge-stack" /></div>
      <div className="spine"><Layer name="cover-exterior" /></div>
    </>}
    <div className="board">
      <div className="front">
        {mountLayers && <>
          <Layer name="cover-exterior" />
          {ornaments.map(name => <Layer key={name} name={name} />)}
        </>}
        {!layersReady && <img className="composite" src={art('cover-exterior')} alt="" fetchPriority="high" />}
        <h1 className="cover-title">Our Next<br />Chapter</h1>
        <div className="cover-name bride">Angelyn B.<br />Sayno</div>
        <div className="cover-name groom">Kevin-Ezer F.<br />Tanierla</div>
        {mountLayers && <div className="ribbon-window"><div className="satin">
          {ribbonLayers.map(name => <Layer key={name} name={name} />)}
        </div></div>}
      </div>
      {mountLayers && <div className="reverse"><img src={art('cover-inner-face')} alt="" /></div>}
    </div>
  </div>
}
