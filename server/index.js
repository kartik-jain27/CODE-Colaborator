const http = require('node:http')
const path = require('node:path')
const cors = require('cors')
const express = require('express')
const awarenessProtocol = require('y-protocols/dist/awareness.cjs')
const { WebSocketServer } = require('ws')
const { getYDoc, setupWSConnection, setPersistence } = require('y-websocket/bin/utils')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const {
  createPostgresPersistence,
  createRoom,
  initDb,
  pool,
  roomExists,
} = require('./db')

const PORT = Number(process.env.PORT || 3001)
const WS_HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_INTERVAL_MS || 2000)
const SUPPORTED_LANGUAGES = new Set(['html', 'javascript'])

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/rooms', async (_req, res, next) => {
  try {
    const language = SUPPORTED_LANGUAGES.has(_req.body.language) ? _req.body.language : 'html'
    const room = await createRoom({ language })

    res.status(201).json({
      roomId: room.room_id,
      language: room.language,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/rooms/:id', async (req, res, next) => {
  try {
    const room = await roomExists(req.params.id)

    if (!room) {
      res.status(404).json({ roomId: req.params.id, exists: false })
      return
    }

    res.status(200).json({
      roomId: room.room_id,
      language: room.language,
      exists: true,
    })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
})

const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

const cleanupConnectionAwareness = (connection, doc) => {
  const controlledIds = doc.conns.get(connection)

  if (!controlledIds || controlledIds.size === 0) {
    return
  }

  awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null)
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((connection) => {
    if (!connection.isAlive) {
      if (connection.collabDoc) {
        cleanupConnectionAwareness(connection, connection.collabDoc)
      }

      connection.terminate()
      return
    }

    connection.isAlive = false
    connection.ping()
  })
}, WS_HEARTBEAT_INTERVAL_MS)

wss.on('connection', (connection, request) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host}`)
  const docName = decodeURIComponent(requestUrl.pathname.slice(1))

  if (!docName) {
    connection.close(1008, 'Missing room id')
    return
  }

  setupWSConnection(connection, request, { docName })
  const doc = getYDoc(docName)
  connection.collabDoc = doc
  connection.isAlive = true

  connection.on('pong', () => {
    connection.isAlive = true
  })

  connection.prependOnceListener('close', () => {
    cleanupConnectionAwareness(connection, doc)
  })
})

server.on('upgrade', (request, socket, head) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host}`)

  if (!requestUrl.pathname || requestUrl.pathname.startsWith('/api')) {
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (connection) => {
    wss.emit('connection', connection, request)
  })
})

const start = async () => {
  await initDb()
  setPersistence(createPostgresPersistence())

  server.listen(PORT, () => {
    console.log(`HTTP API listening on http://localhost:${PORT}`)
    console.log(`Yjs WebSocket server listening on ws://localhost:${PORT}`)
  })
}

const shutdown = () => {
  clearInterval(heartbeatInterval)
  wss.close()
  server.close()
  pool.end().finally(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})
