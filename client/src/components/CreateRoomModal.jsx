import { LANGUAGES } from '../lib/languages'

function CreateRoomModal({
  error,
  isCreating,
  language,
  onClose,
  onCreate,
  onLanguageChange,
  onUserNameChange,
  userName,
}) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/70 px-4 py-8">
      <form
        className="w-full max-w-md rounded border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
        onSubmit={onCreate}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Create room</h2>
          <button
            className="rounded px-2 py-1 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Your name</span>
            <input
              className="mt-2 h-11 w-full rounded border border-zinc-700 bg-neutral-950 px-3 text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              maxLength={40}
              onChange={(event) => onUserNameChange(event.target.value)}
              placeholder="Your display name"
              value={userName}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Language</span>
            <select
              className="mt-2 h-11 w-full rounded border border-zinc-700 bg-neutral-950 px-3 text-zinc-50 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              onChange={(event) => onLanguageChange(event.target.value)}
              value={language}
            >
              {LANGUAGES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <button
          className="mt-5 h-11 w-full rounded bg-cyan-500 px-4 font-semibold text-zinc-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCreating}
          type="submit"
        >
          {isCreating ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}

export default CreateRoomModal
