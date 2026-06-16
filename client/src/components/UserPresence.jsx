const initialsFor = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

function UserPresence({ users = [] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {users.slice(0, 6).map((user) => (
          <div
            key={user.clientId}
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-zinc-950 text-[11px] font-semibold text-zinc-950"
            style={{ backgroundColor: user.color }}
            title={`${user.name}${user.isLocal ? ' (you)' : ''}`}
          >
            {initialsFor(user.name)}
          </div>
        ))}
      </div>
      <div className="hidden min-w-0 text-sm text-zinc-300 sm:block">
        <span className="font-medium text-zinc-100">{users.length}</span>{' '}
        {users.length === 1 ? 'user' : 'users'}
      </div>
    </div>
  )
}

export default UserPresence
