import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, getRoom } from '../api/client'
import CreateRoomModal from './CreateRoomModal'
import { USER_NAME_STORAGE_KEY } from '../lib/languages'

const extractRoomId = (value) => {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    return parts.at(-1) || ''
  } catch {
    return trimmed.replace(/^\/?room\//, '')
  }
}

function RoomLanding() {
  const navigate = useNavigate()
  const [roomInput, setRoomInput] = useState('')
  const [userName, setUserName] = useState(() => localStorage.getItem(USER_NAME_STORAGE_KEY) || '')
  const [language, setLanguage] = useState('html')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const persistUserName = (name) => {
    const trimmedName = name.trim()

    if (trimmedName) {
      localStorage.setItem(USER_NAME_STORAGE_KEY, trimmedName)
    }

    return trimmedName
  }

  const handleCreateRoom = async (event) => {
    event.preventDefault()

    const trimmedUserName = persistUserName(userName)

    if (!trimmedUserName) {
      setError('Enter your name.')
      return
    }

    setError('')
    setIsCreating(true)

    try {
      const { roomId } = await createRoom({ language })
      navigate(`/room/${roomId}`)
    } catch (caughtError) {
      setError(caughtError.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (event) => {
    event.preventDefault()

    const roomId = extractRoomId(roomInput)
    const trimmedUserName = persistUserName(userName)

    if (!roomId) {
      setError('Enter a room ID to join.')
      return
    }

    if (!trimmedUserName) {
      setError('Enter your name.')
      return
    }

    setError('')
    setIsJoining(true)

    try {
      await getRoom(roomId)
      navigate(`/room/${roomId}`)
    } catch {
      setError('That room was not found.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-950 transition-colors dark:bg-neutral-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-5 py-10">
        <section className="grid gap-8 md:grid-cols-[1fr_360px] md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-700 dark:text-cyan-200">
              Yjs + WebSocket collaboration
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-zinc-950 dark:text-white sm:text-6xl">
                Collaborative text rooms that sync as you type.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
                Create a room, share the URL, and edit the same document from multiple tabs or devices.
              </p>
            </div>
            <button
              className="inline-flex h-12 items-center justify-center rounded bg-cyan-500 px-6 text-base font-semibold text-zinc-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreating}
              onClick={() => {
                setError('')
                setIsCreateModalOpen(true)
              }}
              type="button"
            >
              Create New Room
            </button>
          </div>

          <form
            className="rounded border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            onSubmit={handleJoinRoom}
          >
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200" htmlFor="room-id">
              Join existing room
            </label>
            <div className="mt-3 flex flex-col gap-3">
              <input
                className="h-11 rounded border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-neutral-950 dark:text-zinc-50"
                id="user-name"
                maxLength={40}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Your name"
                value={userName}
              />
              <input
                className="h-11 rounded border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-neutral-950 dark:text-zinc-50"
                id="room-id"
                onChange={(event) => setRoomInput(event.target.value)}
                placeholder="room-abc123 or 8-char ID"
                value={roomInput}
              />
              <button
                className="h-11 rounded bg-zinc-950 px-4 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                disabled={isJoining}
                type="submit"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
            {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
          </form>
        </section>
      </div>

      {isCreateModalOpen ? (
        <CreateRoomModal
          error={error}
          isCreating={isCreating}
          language={language}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateRoom}
          onLanguageChange={setLanguage}
          onUserNameChange={setUserName}
          userName={userName}
        />
      ) : null}
    </main>
  )
}

export default RoomLanding
