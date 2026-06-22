# CODE Colaborator

CODE Colaborator is a real-time collaborative coding room built with React, CodeMirror 6, Yjs, and a Node WebSocket sync server. It is a learning-focused project for understanding WebSocket architecture, Yjs awareness/presence, and CRDT-based synchronization.

Yjs represents shared edits as CRDT updates, so multiple clients can type at the same time and still converge on the same document state. The `y-websocket` server relays document updates and awareness messages, while Postgres stores the encoded Yjs document state so rooms can recover after a server restart.

## Current App State

The app currently supports two room types:

- **HTML/CSS/JS**: separate collaborative tabs for HTML, CSS, and JavaScript, with a live browser preview.
- **JavaScript**: one collaborative JavaScript editor with console-style output captured from a sandboxed browser iframe.

The create-room flow asks only for:

- Username.
- Language.

The editor includes:

- Route-based rooms at `/room/:roomId`.
- Copyable room ID and share URL.
- Connection status indicator.
- Yjs awareness presence with user avatars and colored collaborative cursors.
- A visible local CodeMirror cursor tuned for the dark editor theme.
- Browser-side output preview. There is no server-side code execution.

New HTML/CSS/JS rooms seed the HTML tab with a basic HTML document skeleton. CSS and JavaScript tabs start empty.

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
    api/
      client.js
    components/
      CreateRoomModal.jsx
      Editor.jsx
      OutputPanel.jsx
      RoomLanding.jsx
      UserPresence.jsx
    hooks/
      useYjsDoc.js
    lib/
      languages.js
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

Set the backend env:

```sh
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/collab_editor
```

Set the frontend env. The API and WebSocket server share the same backend port:

```sh
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Start the backend in one terminal:

```sh
cd server
npm start
```

Start the frontend in another terminal:

```sh
cd client
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Test Locally

1. Open the Vite app.
2. Click **Create New Room**.
3. Enter your username and choose **HTML/CSS/JS** or **JavaScript**.
4. Open the same room URL in a second tab.
5. Type in either tab and confirm the other tab updates in real time.

For HTML/CSS/JS rooms, edit each tab and confirm the output panel updates. For JavaScript rooms, use `console.log()` and confirm the output appears in the console-style preview.

## Verification

These checks should pass before committing or deploying:

```sh
cd client
npm run lint
npm run build

cd ../server
node --check index.js
node --check db.js
```

Optional backend smoke test:

```sh
curl http://localhost:3001/health
```

Expected response:

```json
{"ok":true}
```

## Railway Backend Deployment

Deploy the backend as a Railway service with the service **Root Directory** set to:

```txt
server
```

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

Railway provides `PORT` automatically. Do not set `WS_PORT`; the Express API and Yjs WebSocket server share one HTTP server and one port.

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

- Server-side code execution.
- User authentication.
- Permissions or private rooms.
- Production scaling beyond a single WebSocket server.
