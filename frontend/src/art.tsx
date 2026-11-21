import type { CSSProperties } from 'react'
import portrait from './portrait.json'

export type LayerName = keyof typeof portrait
export const ribbonLayers: LayerName[] = [
  'ribbon-band', 'ribbon-upper-wrap', 'ribbon-left-tail', 'ribbon-right-tail',
  'ribbon-left-loop', 'ribbon-right-loop', 'ribbon-knot',
]
export const ornaments: LayerName[] = ['cover-crown-star', 'cover-flourish', 'moon-stars', 'sun']
export const art = (name: string) => '/art/' + name + '.webp'

export function Layer({ name }: { name: LayerName }) {
  const { x, y, w, h, canvasW, canvasH } = portrait[name]
  const style: CSSProperties = {
    left: (100 * x / canvasW) + '%', top: (100 * y / canvasH) + '%',
    width: (100 * w / canvasW) + '%', height: (100 * h / canvasH) + '%',
    transformOrigin: name === 'ribbon-band' ? 'left center' : ((842 - x) / w * 100) + '% ' + ((990 - y) / h * 100) + '%',
  }
  return <img className={'layer ' + name} style={style} src={art(name)} alt="" draggable={false} />
}
