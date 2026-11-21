import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

type Context = { kind: 'general' | 'personalized'; state: 'ready' | 'received' | 'closed'; csrfToken: string; guestName?: string; personalMessage?: string; allowsPlusOne?: boolean }

function newKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

function mediaCounts(files: File[]) {
  let photos = 0
  let videos = 0
  for (const file of files) {
    if (/\.(jpe?g|png|heic)$/i.test(file.name)) photos++
    else if (/\.(mp4|mov)$/i.test(file.name)) videos++
    else return null
  }
  return { photos, videos }
}

function fileTooLarge(files: File[]) {
  return files.some(file => file.size > (/\.(jpe?g|png|heic)$/i.test(file.name) ? 25 : 250) * 1024 * 1024)
}

export function Rsvp({ onBack }: { onBack: () => void }) {
  const token = new URLSearchParams(location.hash.slice(1)).get('invite')
  const key = useRef(sessionStorage.getItem('rsvp-attempt') || newKey())
  const [context, setContext] = useState<Context>()
  const [name, setName] = useState('')
  const [choice, setChoice] = useState('')
  const [plus, setPlus] = useState('')
  const [plusName, setPlusName] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const headers: Record<string, string> = { 'X-RSVP-Submission-Key': key.current }
    if (token !== null) headers['X-Invitation-Token'] = token
    setError('')
    fetch('/api/rsvp/context/', { headers }).then(async response => {
      if (!response.ok) throw new Error(response.status === 404 ? 'This invitation is unavailable. Please contact the couple.' : 'Could not load the RSVP. Please try again.')
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('The RSVP service is unavailable. Please try again shortly.')
      }
      setContext(await response.json() as Context)
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the RSVP. Please try again.'))
  }, [token, loadAttempt])

  useEffect(() => { if (done) heading.current?.focus() }, [done])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!context || busy) return
    const counts = mediaCounts(files)
    if (!counts) { setError('Choose JPEG, PNG, HEIC, MP4 or MOV files.'); return }
    if (counts.photos > 15 || counts.videos > 3) { setError('You can share up to 15 photos and 3 videos.'); return }
    if (fileTooLarge(files)) { setError('Photos must be 25 MB or smaller and videos 250 MB or smaller.'); return }
    if (context.kind === 'general' && !name.trim()) { setError('Please enter your name.'); return }
    if (!choice) { setError('Choose an attendance response.'); return }
    if (context.allowsPlusOne && choice === 'accepted' && (!plus || (plus === 'true' && !plusName.trim()))) {
      setError('Please tell us whether your guest will attend and enter their name if they will.'); return
    }
    setError('')
    setBusy(true)
    sessionStorage.setItem('rsvp-attempt', key.current)
    const data = new FormData()
    if (context.kind === 'general') data.set('guest_name', name.trim())
    data.set('attendance', choice)
    data.set('guest_message', message)
    files.forEach(file => data.append('attachments', file))
    if (context.allowsPlusOne && choice === 'accepted') {
      data.set('plus_one_attending', plus)
      if (plus === 'true') data.set('plus_one_name', plusName.trim())
    }
    const headers: Record<string, string> = { 'X-CSRFToken': context.csrfToken, 'X-RSVP-Submission-Key': key.current }
    if (token !== null) headers['X-Invitation-Token'] = token
    try {
      const response = await new Promise<{ status: number; result: { code?: string } }>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('POST', '/api/rsvp/responses/')
        Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value))
        request.upload.onprogress = event => {
          if (event.lengthComputable) setUploadProgress(Math.round(event.loaded * 100 / event.total))
        }
        request.onload = () => {
          try { resolve({ status: request.status, result: JSON.parse(request.responseText) }) }
          catch { reject(new Error('Unexpected response')) }
        }
        request.onerror = () => reject(new Error('Connection lost'))
        request.onabort = () => reject(new Error('Upload interrupted'))
        request.send(data)
      })
      if (response.status === 403) {
        setError('Your session could not be verified. Refresh the page and try again.')
        return
      }
      const result = response.result
      if ((response.status >= 200 && response.status < 300) || result.code === 'already_received') {
        sessionStorage.removeItem('rsvp-attempt')
        setDone(true)
      } else {
        setError(result.code === 'invalid_file' ? 'A photo or video could not be accepted. Remove it and try again.' : result.code === 'too_many_files' ? 'You can share up to 15 photos and 3 videos.' : result.code === 'file_too_large' ? 'Photos must be 25 MB or smaller and videos 250 MB or smaller.' : 'Your response could not be saved. Please check your details and try again.')
      }
    } catch {
      setError('We could not confirm your response. Please try again.')
    } finally {
      setBusy(false)
      setUploadProgress(null)
    }
  }

  const received = done || context?.state === 'received'
  return <div className="reply">
    {received && <img className="seal" src="/art/confirmation-stamp.svg" alt="" />}
    <h2 id="rsvp-title" tabIndex={-1} ref={heading}>{received ? 'Thank you' : 'RSVP'}</h2>
    {received ? <p className="confirmation">Your response has been received. Please contact us if your plans change.</p> :
      context?.state === 'closed' ? <p>Please contact the couple about your response.</p> :
      context && <form noValidate onSubmit={submit}>
        {context.kind === 'personalized' ? <p>For {context.guestName}</p> : <>
          <label className="field-label" htmlFor="guest">Guest name</label>
          <input className="guest-input" id="guest" value={name} required onChange={event => setName(event.target.value)} />
        </>}
        <fieldset><legend>Will you attend?</legend>
          {[['accepted', 'Joyfully accept'], ['declined', 'Regretfully decline']].map(([value, label]) =>
            <label className="choice" key={value}><input type="radio" name="attendance" value={value}
              checked={choice === value} onChange={() => setChoice(value)} />{label}</label>)}
        </fieldset>
        {context.allowsPlusOne && choice === 'accepted' && <fieldset><legend>Will your plus-one attend?</legend>
          {[['true', 'Yes'], ['false', 'No']].map(([value, label]) =>
            <label className="choice" key={value}><input type="radio" name="plus" checked={plus === value} onChange={() => setPlus(value)} />{label}</label>)}
          {plus === 'true' && <><label className="field-label" htmlFor="plus-name">Plus-one name</label><input className="guest-input" id="plus-name" value={plusName} onChange={event => setPlusName(event.target.value)} /></>}
        </fieldset>}
        <label className="field-label" htmlFor="guest-message">Message for the couple (optional)</label>
        <textarea className="guest-input" id="guest-message" value={message} onChange={event => setMessage(event.target.value)} />
        <label className="field-label" htmlFor="guest-files">Photos and videos (optional)</label>
        <p>Share up to 15 photos (25 MB each) and 3 videos (250 MB each). Photos: JPEG, PNG or HEIC. Videos: MP4 or MOV. Only the couple can see them.</p>
        <input id="guest-files" type="file" multiple accept=".jpg,.jpeg,.png,.heic,.mp4,.mov" onChange={event => {
          const selected = [...files, ...Array.from(event.target.files || [])]
          const counts = mediaCounts(selected)
          if (!counts) setError('Choose JPEG, PNG, HEIC, MP4 or MOV files.')
          else if (counts.photos > 15 || counts.videos > 3) setError('You can share up to 15 photos and 3 videos.')
          else if (fileTooLarge(selected)) setError('Photos must be 25 MB or smaller and videos 250 MB or smaller.')
          else { setFiles(selected); setError('') }
          event.target.value = ''
        }} />
        {files.length > 0 && <ul>{files.map((file, index) => <li key={index}>{file.name} <button type="button" onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>Remove</button></li>)}</ul>}
        {error && <p className="error" role="alert">{error}</p>}
        {busy && <p role="status">{uploadProgress === null ? 'Preparing your response…' : uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Saving your response…'}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Send response'}</button>
      </form>}
    {!context && error && <p className="error" role="alert">{error}</p>}
    {!context && error && <button className="primary" type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Try again</button>}
    <button className="back" type="button" onClick={onBack}>Back to invitation</button>
  </div>
}
