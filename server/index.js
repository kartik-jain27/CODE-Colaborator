require('dotenv').config()

const http = require('node:http')
const cors = require('cors')
const express = require('express')
const awarenessProtocol = require('y-protocols/dist/awareness.cjs')
const { WebSocketServer } = require('ws')
const { getYDoc, setupWSConnection, setPersistence } = require('y-websocket/bin/utils')
const {
  createPostgresPersistence,
  createRoom,
  initDb,
  pool,
  roomExists,
} = require('./db')

const API_PORT = Number(process.env.PORT || 3001)
const WS_PORT = Number(process.env.WS_PORT || 1234)
const WS_HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_INTERVAL_MS || 2000)

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/rooms', async (_req, res, next) => {
  try {
    const roomId = await createRoom()
    res.status(201).json({ roomId })
  } catch (error) {
    next(error)
  }
})

app.get('/api/rooms/:id', async (req, res, next) => {
  try {
    const exists = await roomExists(req.params.id)
    res.status(exists ? 200 : 404).json({ roomId: req.params.id, exists })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
})

const apiServer = http.createServer(app)
const websocketServer = http.createServer()
const wss = new WebSocketServer({ server: websocketServer })

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

const start = async () => {
  await initDb()
  setPersistence(createPostgresPersistence())

  apiServer.listen(API_PORT, () => {
    console.log(`HTTP API listening on http://localhost:${API_PORT}`)
  })

  websocketServer.listen(WS_PORT, () => {
    console.log(`Yjs WebSocket server listening on ws://localhost:${WS_PORT}`)
  })
}

const shutdown = () => {
  clearInterval(heartbeatInterval)
  apiServer.close()
  websocketServer.close()
  pool.end().finally(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})
