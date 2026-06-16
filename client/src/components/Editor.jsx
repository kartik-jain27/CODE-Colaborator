import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useYjsDoc } from '../hooks/useYjsDoc'
import UserPresence from './UserPresence'

const statusClasses = {
  Connected: 'bg-emerald-400',
  Connecting: 'bg-amber-400',
  Disconnected: 'bg-rose-400',
}

function Editor() {
  const { roomId } = useParams()
  const editorParentRef = useRef(null)
  const { connectionStatus, connectedUsers } = useYjsDoc(roomId, editorParentRef)
  const [copyState, setCopyState] = useState('')

  const copyText = async (text, label) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    setCopyState(label)
    window.setTimeout(() => setCopyState(''), 1400)
  }

  return (
    <main className="flex h-dvh flex-col bg-neutral-950 text-zinc-50">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="rounded border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            to="/"
          >
            Rooms
          </Link>
          <button
            className="min-w-0 rounded px-2 py-1 text-left font-mono text-sm text-zinc-100 transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            onClick={() => copyText(roomId, 'Room ID copied')}
            title="Copy room ID"
            type="button"
          >
            {roomId}
          </button>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <span className={`h-2.5 w-2.5 rounded-full ${statusClasses[connectionStatus]}`} />
            {connectionStatus}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserPresence users={connectedUsers} />
          <button
            className="h-10 rounded bg-cyan-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => copyText(window.location.href, 'Share URL copied')}
            type="button"
          >
            Share
          </button>
        </div>
      </header>

      {copyState ? (
        <div className="absolute right-4 top-20 z-10 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-lg">
          {copyState}
        </div>
      ) : null}

      <section className="min-h-0 flex-1">
        <div className="h-full" ref={editorParentRef} />
      </section>
    </main>
  )
}

export default Editor
