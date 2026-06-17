import { useEffect, useMemo, useState } from 'react'
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { WebsocketProvider } from 'y-websocket'
import { yCollab } from 'y-codemirror.next'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1234'
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

const createUser = () => ({
  name: `${randomItem(NAMES)} ${Math.floor(100 + Math.random() * 900)}`,
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

export const useYjsDoc = (roomId, editorParentRef) => {
  const localUser = useMemo(() => createUser(), [])
  const [ydoc, setYdoc] = useState(null)
  const [provider, setProvider] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('Connecting')
  const [connectedUsers, setConnectedUsers] = useState([])

  useEffect(() => {
    const parentElement = editorParentRef.current

    if (!roomId || !parentElement) {
      return undefined
    }

    const doc = new Y.Doc()
    const websocketProvider = new WebsocketProvider(WS_URL, roomId, doc)
    const ytext = doc.getText('codemirror')
    const undoManager = new Y.UndoManager(ytext)

    websocketProvider.awareness.setLocalStateField('user', localUser)

    const leaveRoom = () => {
      websocketProvider.awareness.setLocalState(null)
    }

    const editorState = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        yCollab(ytext, websocketProvider.awareness, { undoManager }),
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
    setYdoc(doc)
    setProvider(websocketProvider)

    return () => {
      websocketProvider.awareness.off('change', syncUsers)
      websocketProvider.off('status', handleStatus)
      window.removeEventListener('pagehide', leaveRoom)
      window.removeEventListener('beforeunload', leaveRoom)
      editorView.destroy()
      leaveRoom()
      websocketProvider.destroy()
      undoManager.destroy()
      doc.destroy()
      setYdoc(null)
      setProvider(null)
      setConnectedUsers([])
      setConnectionStatus('Disconnected')
    }
  }, [editorParentRef, localUser, roomId])

  return { ydoc, provider, connectionStatus, connectedUsers }
}
