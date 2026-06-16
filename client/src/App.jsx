import { Navigate, Route, Routes } from 'react-router-dom'
import Editor from './components/Editor'
import RoomLanding from './components/RoomLanding'

function App() {
  return (
    <Routes>
      <Route element={<RoomLanding />} path="/" />
      <Route element={<Editor />} path="/room/:roomId" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}

export default App
