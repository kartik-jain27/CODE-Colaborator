import { useEffect, useMemo, useState } from 'react'
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { WebsocketProvider } from 'y-websocket'
import { yCollab } from 'y-codemirror.next'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const TAB_ID_STORAGE_KEY = 'code-colaborator-tab-id'

const COLORS = [
  { color: '#22d3ee', colorLight: '#22d3ee33' },
  { color: '#a3e635', colorLight: '#a3e63533' },
  { color: '#f59e0b', colorLight: '#f59e0b33' },
  { color: '#fb7185', colorLight: '#fb718533' },
  { color: '#c084fc', colorLight: '#c084fc33' },
  { color: '#34d399', colorLight: '#34d39933' },
  { color: '#f97316', colorLight: '#f9731633' },
  { color: '#60a5fa', colorLight: '#60a5fa33' },
]

const NAMES = [
  'Anonymous Fox',
  'Anonymous Wolf',
  'Anonymous Lynx',
  'Anonymous Owl',
  'Anonymous Bear',
  'Anonymous Hawk',
  'Anonymous Otter',
  'Anonymous Raven',
]

const randomItem = (items) => items[Math.floor(Math.random() * items.length)]

const getBrowserTabId = () => {
  const existingId = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY)

  if (existingId) {
    return existingId
  }

  const nextId =
    crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, nextId)
  return nextId
}

const createUser = (preferredName) => ({
  name: preferredName || `${randomItem(NAMES)} ${Math.floor(100 + Math.random() * 900)}`,
  tabId: getBrowserTabId(),
  ...randomItem(COLORS),
})

const pruneDuplicateTabStates = (awareness, localClientId, tabId) => {
  const duplicateClientIds = []

  awareness.getStates().forEach((state, clientId) => {
    if (clientId !== localClientId && state.user?.tabId === tabId) {
      duplicateClientIds.push(clientId)
    }
  })

  if (duplicateClientIds.length > 0) {
    awarenessProtocol.removeAwarenessStates(awareness, duplicateClientIds, 'duplicate-tab')
  }
}

const readAwarenessUsers = (awareness, localClientId) =>
  Array.from(awareness.getStates().entries())
    .filter(([, state]) => state.user)
    .map(([clientId, state]) => ({
      clientId,
      isLocal: clientId === localClientId,
      name: state.user.name || 'Anonymous User',
      color: state.user.color || '#22d3ee',
      colorLight: state.user.colorLight || '#22d3ee33',
    }))
    .sort((a, b) => Number(b.isLocal) - Number(a.isLocal) || a.name.localeCompare(b.name))

export const useYjsDoc = (
  roomId,
  editorParentRef,
  { activeDocument = 'codemirror', documentNames = ['codemirror'], userName } = {},
) => {
  const localUser = useMemo(() => createUser(userName), [userName])
  const documentNamesKey = documentNames.join('|')
  const [ydoc, setYdoc] = useState(null)
  const [provider, setProvider] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('Connecting')
  const [connectedUsers, setConnectedUsers] = useState([])
  const [documentText, setDocumentText] = useState('')
  const [documentTexts, setDocumentTexts] = useState({})

  useEffect(() => {
    if (!roomId) {
      return undefined
    }

    const doc = new Y.Doc()
    const websocketProvider = new WebsocketProvider(WS_URL, roomId, doc)
    let isDisposed = false

    websocketProvider.awareness.setLocalStateField('user', localUser)

    const leaveRoom = () => {
      websocketProvider.awareness.setLocalState(null)
    }

    let isPruningDuplicateStates = false

    const syncUsers = () => {
      if (!isPruningDuplicateStates) {
        isPruningDuplicateStates = true
        pruneDuplicateTabStates(websocketProvider.awareness, doc.clientID, localUser.tabId)
        isPruningDuplicateStates = false
      }

      setConnectedUsers(readAwarenessUsers(websocketProvider.awareness, doc.clientID))
    }

    const handleStatus = ({ status }) => {
      setConnectionStatus(
        status === 'connected'
          ? 'Connected'
          : status === 'connecting'
            ? 'Connecting'
            : 'Disconnected',
      )
    }

    websocketProvider.awareness.on('change', syncUsers)
    websocketProvider.on('status', handleStatus)
    window.addEventListener('pagehide', leaveRoom)
    window.addEventListener('beforeunload', leaveRoom)

    syncUsers()
    queueMicrotask(() => {
      if (!isDisposed) {
        setYdoc(doc)
        setProvider(websocketProvider)
      }
    })

    return () => {
      isDisposed = true
      websocketProvider.awareness.off('change', syncUsers)
      websocketProvider.off('status', handleStatus)
      window.removeEventListener('pagehide', leaveRoom)
      window.removeEventListener('beforeunload', leaveRoom)
      leaveRoom()
      websocketProvider.destroy()
      doc.destroy()
      setYdoc(null)
      setProvider(null)
      setConnectedUsers([])
      setDocumentText('')
      setDocumentTexts({})
      setConnectionStatus('Disconnected')
    }
  }, [localUser, roomId])

  useEffect(() => {
    if (!ydoc || !provider) {
      return undefined
    }

    const parentElement = editorParentRef.current

    if (!parentElement) {
      return undefined
    }

    const ytext = ydoc.getText(activeDocument)
    const undoManager = new Y.UndoManager(ytext)

    const editorState = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        yCollab(ytext, provider.awareness, { undoManager }),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#111113',
            color: '#f4f4f5',
            fontSize: '15px',
          },
          '.cm-scroller': {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            lineHeight: '1.65',
          },
          '.cm-content': {
            padding: '24px',
            caretColor: '#22d3ee',
          },
          '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: '#22d3ee !important',
            borderLeftWidth: '2px',
          },
          '&.cm-focused .cm-cursor': {
            borderLeftColor: '#22d3ee !important',
          },
          '.cm-gutters': {
            backgroundColor: '#18181b',
            color: '#71717a',
            borderRight: '1px solid #27272a',
          },
          '.cm-activeLine': {
            backgroundColor: '#1f293733',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#27272a',
          },
          '.cm-selectionBackground': {
            backgroundColor: '#0e749033 !important',
          },
          '.cm-ySelectionCaret': {
            borderLeftWidth: '2px',
            borderRightWidth: '0',
            minHeight: '1.35em',
            zIndex: '20',
          },
          '.cm-ySelectionCaretDot': {
            width: '.55em',
            height: '.55em',
            top: '-.3em',
            left: '-.28em',
          },
          '.cm-ySelectionInfo': {
            borderRadius: '4px',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: '11px',
            padding: '2px 5px',
          },
          '&.cm-focused': {
            outline: 'none',
          },
        }),
      ],
    })

    const editorView = new EditorView({
      state: editorState,
      parent: parentElement,
    })

    return () => {
      editorView.destroy()
      undoManager.destroy()
    }
  }, [activeDocument, editorParentRef, provider, ydoc])

  useEffect(() => {
    if (!ydoc) {
      return undefined
    }

    const names = documentNamesKey ? documentNamesKey.split('|') : ['codemirror']
    const ytexts = names.map((name) => ydoc.getText(name))

    const syncDocumentTexts = () => {
      const nextTexts = Object.fromEntries(names.map((name) => [name, ydoc.getText(name).toString()]))
      setDocumentTexts(nextTexts)
      setDocumentText(nextTexts[activeDocument] || '')
    }

    ytexts.forEach((ytext) => ytext.observe(syncDocumentTexts))
    syncDocumentTexts()

    return () => {
      ytexts.forEach((ytext) => ytext.unobserve(syncDocumentTexts))
    }
  }, [activeDocument, documentNamesKey, ydoc])

  return { ydoc, provider, connectionStatus, connectedUsers, documentText, documentTexts }
}
