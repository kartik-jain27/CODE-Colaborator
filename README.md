# CODE Colaborator

CODE Colaborator is a real-time collaborative text editor built with React, CodeMirror 6, Yjs, and a Node WebSocket sync server. It is a learning-focused project for understanding WebSocket architecture, awareness/presence, and CRDT-based synchronization. It is not a code execution sandbox and intentionally does not include code execution, authentication, or user accounts.

Yjs represents shared document changes as CRDT updates, which means clients can apply edits in different orders and still converge on the same document state. The `y-websocket` server relays those updates and awareness messages between clients, while Postgres stores the encoded Yjs document state so rooms can recover after a server restart.

## Current App State

The MVP is implemented, committed to Git, and builds successfully for local development.

- Landing page at `/` for creating or joining rooms.
- Editor route at `/room/:roomId`.
- CodeMirror 6 editor bound to a shared `Y.Text`.
- `y-websocket` server using `setupWSConnection` from `y-websocket/bin/utils`.
- Room API with `POST /api/rooms`, `GET /api/rooms/:id`, and `/health`.
- Postgres persistence for encoded Yjs document state in a `documents` table.
- Debounced document saves after edits.
- Yjs awareness presence with generated anonymous names and colored avatars.
- Copyable room ID and share URL controls.

Known local requirement: the backend needs Postgres running and `DATABASE_URL` pointed at a valid database before `npm run dev` can start successfully.

Deployment status: deployed with the backend on Railway and the frontend on Vercel.

## Tech Stack

- Backend: Node.js, Express, `ws`, `y-websocket`, `yjs`, `pg`, CORS.
- Frontend: React 18, Vite, Tailwind CSS, CodeMirror 6, `y-codemirror.next`, `y-websocket`, `react-router-dom`.
- Database: Postgres storing Yjs document state as `BYTEA`.

## Project Structure

```txt
server/
  index.js
  db.js
  package.json
client/
  src/
    App.jsx
    components/
      Editor.jsx
      RoomLanding.jsx
      UserPresence.jsx
    hooks/
      useYjsDoc.js
    api/
      client.js
```

## Setup

Install dependencies:

```sh
cd server
npm install

cd ../client
npm install
```

Create the Postgres database:

```sh
createdb collab_editor
```

Copy the example env files:

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update `server/.env` if your Postgres username, password, host, port, or database name is different:

```sh
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/collab_editor
```

The default client env points HTTP and WebSocket traffic at the same backend port:

```sh
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Start the backend in one terminal:

```sh
cd server
npm run dev
```

Start the frontend in another terminal:

```sh
cd client
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Test Collaboration

Open the Vite URL in your browser, create a new room, then open the same room URL in a second tab. Type in either tab and the other tab should update in real time. The top bar shows connection status, the room ID, a share button, and connected users through Yjs awareness.

## Verification

These checks pass in the current codebase:

```sh
cd client
npm run build
npm run lint

cd ../server
node --check index.js
node --check db.js
```

Production smoke test:

```sh
curl https://code-colaborator-production.up.railway.app/health
```

Expected response:

```json
{"ok":true}
```

Then open the Vercel app, create a room, open the same room URL in another tab, and confirm edits sync both ways.

## Railway Backend Deployment

Deploy the backend as a Railway service with the service **Root Directory** set to:

```txt
server
```

With that root directory, Railway will build from `server/package.json` and run the backend app directly.

Use these commands if Railway asks for explicit commands:

```sh
npm ci --omit=dev
npm start
```

Set these Railway variables on the backend service:

```sh
DATABASE_URL=<your Railway or Neon Postgres connection string>
NODE_ENV=production
```

Railway provides `PORT` automatically. Do not set `WS_PORT`; the Express API and Yjs WebSocket server share the single Railway service port.

After deployment, use the generated Railway domain for both client variables:

```sh
VITE_API_URL=https://code-colaborator-production.up.railway.app
VITE_WS_URL=wss://code-colaborator-production.up.railway.app
```

## Vercel Frontend Deployment

Deploy the frontend as a Vercel project with the project **Root Directory** set to:

```txt
client
```

Use the Vite defaults:

```sh
npm run build
dist
```

Set these Vercel environment variables for Production and Preview:

```sh
VITE_API_URL=https://code-colaborator-production.up.railway.app
VITE_WS_URL=wss://code-colaborator-production.up.railway.app
```

The client includes `client/vercel.json` so direct visits and refreshes on room URLs like `/room/:roomId` rewrite to `index.html`.

## Out of Scope

- Code execution.
- Syntax highlighting beyond CodeMirror defaults.
- User authentication.
- Permissions or private rooms.
- Production scaling beyond a single WebSocket server.
