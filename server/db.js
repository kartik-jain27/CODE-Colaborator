const { randomUUID } = require('node:crypto')
const { Pool } = require('pg')
const Y = require('yjs')

const SAVE_DEBOUNCE_MS = 10_000

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (error) => {
  console.error('Unexpected Postgres client error', error)
})

const emptyDocumentState = () => {
  const ydoc = new Y.Doc()
  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc))
  ydoc.destroy()
  return state
}

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      room_id TEXT PRIMARY KEY,
      state BYTEA NOT NULL,
      updated_at TIMESTAMP DEFAULT now()
    );
  `)
}

const createRoomId = () => randomUUID().replace(/-/g, '').slice(0, 8)

const createRoom = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomId = createRoomId()
    const result = await pool.query(
      `
        INSERT INTO documents (room_id, state)
        VALUES ($1, $2)
        ON CONFLICT (room_id) DO NOTHING
        RETURNING room_id;
      `,
      [roomId, emptyDocumentState()],
    )

    if (result.rowCount === 1) {
      return roomId
    }
  }

  throw new Error('Unable to allocate a unique room id')
}

const roomExists = async (roomId) => {
  const result = await pool.query(
    'SELECT 1 FROM documents WHERE room_id = $1 LIMIT 1;',
    [roomId],
  )

  return result.rowCount > 0
}

const loadDocumentState = async (roomId) => {
  const result = await pool.query(
    'SELECT state FROM documents WHERE room_id = $1 LIMIT 1;',
    [roomId],
  )

  return result.rows[0]?.state ?? null
}

const saveDocumentState = async (roomId, state) => {
  await pool.query(
    `
      INSERT INTO documents (room_id, state, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (room_id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = now();
    `,
    [roomId, Buffer.from(state)],
  )
}

const createPostgresPersistence = ({ debounceMs = SAVE_DEBOUNCE_MS } = {}) => {
  const saveTimers = new Map()

  const flushDocument = async (roomId, ydoc) => {
    const timer = saveTimers.get(roomId)

    if (timer) {
      clearTimeout(timer)
      saveTimers.delete(roomId)
    }

    await saveDocumentState(roomId, Y.encodeStateAsUpdate(ydoc))
  }

  const scheduleSave = (roomId, ydoc) => {
    const existingTimer = saveTimers.get(roomId)

    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      saveTimers.delete(roomId)
      flushDocument(roomId, ydoc).catch((error) => {
        console.error(`Failed to persist Yjs document "${roomId}"`, error)
      })
    }, debounceMs)

    saveTimers.set(roomId, timer)
  }

  return {
    bindState: async (roomId, ydoc) => {
      const updateHandler = () => scheduleSave(roomId, ydoc)
      ydoc.on('update', updateHandler)
      ydoc.on('destroy', () => {
        ydoc.off('update', updateHandler)

        const timer = saveTimers.get(roomId)
        if (timer) {
          clearTimeout(timer)
          saveTimers.delete(roomId)
        }
      })

      const savedState = await loadDocumentState(roomId)

      if (savedState) {
        Y.applyUpdate(ydoc, new Uint8Array(savedState))
      } else {
        await saveDocumentState(roomId, Y.encodeStateAsUpdate(ydoc))
      }
    },
    writeState: async (roomId, ydoc) => {
      await flushDocument(roomId, ydoc)
    },
  }
}

module.exports = {
  createPostgresPersistence,
  createRoom,
  initDb,
  pool,
  roomExists,
}
