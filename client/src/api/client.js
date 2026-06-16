const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const createRoom = async () => {
  const response = await fetch(`${API_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  return parseResponse(response)
}

export const getRoom = async (roomId) => {
  const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}`)

  return parseResponse(response)
}
