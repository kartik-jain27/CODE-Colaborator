import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRoom } from '../api/client'
import { useYjsDoc } from '../hooks/useYjsDoc'
import {
  getDocumentNamesForLanguage,
  getLanguageLabel,
  HTML_DOCUMENT_TABS,
  SINGLE_DOCUMENT_ID,
  USER_NAME_STORAGE_KEY,
} from '../lib/languages'
import OutputPanel from './OutputPanel'
import UserPresence from './UserPresence'

const statusClasses = {
  Connected: 'bg-emerald-400',
  Connecting: 'bg-amber-400',
  Disconnected: 'bg-rose-400',
}

function Editor() {
  const { roomId } = useParams()
  const editorParentRef = useRef(null)
  const [room, setRoom] = useState({ language: 'html' })
  const [activeDocument, setActiveDocument] = useState('html')
  const [userName] = useState(() => localStorage.getItem(USER_NAME_STORAGE_KEY) || '')
  const documentNames = getDocumentNamesForLanguage(room.language)
  const resolvedActiveDocument =
    room.language === 'html' && HTML_DOCUMENT_TABS.some((tab) => tab.id === activeDocument)
      ? activeDocument
      : SINGLE_DOCUMENT_ID
  const { connectionStatus, connectedUsers, documentText, documentTexts } = useYjsDoc(roomId, editorParentRef, {
    activeDocument: resolvedActiveDocument,
    documentNames,
    userName,
  })
  const [copyState, setCopyState] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadRoom = async () => {
      try {
        const roomData = await getRoom(roomId)
        if (isMounted) {
          setRoom({
            language: roomData.language || 'html',
          })
          setActiveDocument(roomData.language === 'html' ? 'html' : SINGLE_DOCUMENT_ID)
        }
      } catch {
        if (isMounted) {
          setRoom({ language: 'html' })
          setActiveDocument('html')
        }
      }
    }

    loadRoom()

    return () => {
      isMounted = false
    }
  }, [roomId])

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
          <span className="hidden text-sm text-zinc-500 sm:inline">{getLanguageLabel(room.language)}</span>
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

      <section className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(260px,40dvh)] lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:grid-rows-1">
        <div className="flex min-h-0 flex-col">
          {room.language === 'html' ? (
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-3">
              {HTML_DOCUMENT_TABS.map((tab) => (
                <button
                  className={`h-8 rounded px-3 text-sm font-medium transition ${
                    activeDocument === tab.id
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                  key={tab.id}
                  onClick={() => setActiveDocument(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="min-h-0 flex-1" ref={editorParentRef} />
        </div>
        <OutputPanel
          code={room.language === 'html' ? documentTexts.html || '' : documentTexts[SINGLE_DOCUMENT_ID] || documentText}
          files={documentTexts}
          language={room.language}
        />
      </section>
    </main>
  )
}

export default Editor
