import { useState } from 'react'
import SudokuGrid from './SudokuGrid'

export default function App() {
  // For now, hard-code a room and prompt for a name
  const [userName, setUserName] = useState(null)
  
  const urlParams = new URLSearchParams(window.location.search)
  const defaultRoom = urlParams.get('room') || ''
  const [roomId, setRoomId] = useState(defaultRoom)
  
 

  const [joined, setJoined] = useState(false)
  // const [initialGrid, setInitialGrid] = useState(null)
  const [showLb, setShowLb]   = useState(false)
  const [scores, setScores]   = useState([])
  const [showOthers, setShowOthers] = useState(true)
  const [difficulty, setDifficulty] = useState('easy');




  // When the user clicks “Join”, we’ll render the grid
  async function joinRoom() {
    if (!userName || !roomId) return
  
    // // 1. Fetch a puzzle (hardcode 'easy' for now)
    // const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/puzzle/${difficulty}`)
    // const { grid } = await resp.json()
  
    // // 2. Convert the 81-char string into a 9×9 array of '' or '1'–'9'
    // const flat = grid.split('').map(c => (c === '0' ? '' : c))
    // const twoD = Array.from({ length: 9 }, (_, r) =>
    //   flat.slice(r * 9, r * 9 + 9)
    // )
  
    // setInitialGrid(twoD)
  
    // // 3. Now we can show the grid
    setJoined(true)
  }


  async function loadLeaderboard() {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leaderboard?roomId=${roomId}`)
      const data = await resp.json()
      setScores(data)
      setShowLb(true)
    } catch (err) {
      console.error('Error loading leaderboard:', err)
      alert('Failed to load leaderboard.')
    }
  }
  

  
  
  

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <input
          className="px-3 py-2 border rounded"
          placeholder="Your name"
          value={userName}
          onChange={e => setUserName(e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded"
          placeholder="Room ID (e.g. abc123)"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
        />




        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showOthers}
            onChange={e => setShowOthers(e.target.checked)}
          />
          Allow players to see each other’s answers
        </label>


        <select
          className="px-3 py-2 border rounded"
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>



        <button
          onClick={joinRoom}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Join Room
        </button>
      </div>
    )
  }


  function DebugValidateButton() {
    const [result, setResult] = useState(null)
  
    async function handleValidate() {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/validate-puzzles`)
      const data = await res.json()
      setResult(data)
    }
  
    return (
      <div className="mt-4">
        <button
          onClick={handleValidate}
          className="px-3 py-2 bg-yellow-400 rounded hover:bg-yellow-500 text-black font-medium"
        >
          🛠 Validate Puzzles
        </button>
  
        {result && (
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded max-h-60 overflow-y-scroll">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    )
  }
  

  // <-- This is where you render the grid once joined:
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 p-4 space-y-4">
      <h2 className="text-xl font-semibold">
        Current room is: {roomId} — You are: {userName}
      </h2>
      <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)
            alert('Link copied!')
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white rounded border shadow-sm hover:bg-gray-100"
        >
          <span>📋 Copy Room Link</span>
        </button>



      <button
        onClick={loadLeaderboard}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View Leaderboard
      </button>

      {showLb && Array.isArray(scores) && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-bold mb-4">Top Times</h3>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {scores
                .sort((a, b) => {
                  const ta = typeof a.time === 'number' ? a.time : Infinity
                  const tb = typeof b.time === 'number' ? b.time : Infinity
                  return ta - tb
                })
                .map((r, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{i + 1}. {r.userName}</span>
                    <span>
                      {r.time === null || r.time === 'forfeit'
                        ? 'Forfeit'
                        : `${r.time}s`}
                    </span>
                  </li>
                ))}
            </ul>
            <button
              onClick={() => setShowLb(false)}
              className="mt-4 w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <SudokuGrid
        roomId={roomId}
        userName={userName}
        // initialGrid={initialGrid}
        difficulty={difficulty} 
        showOthers={showOthers} 
      />
    </div>
  )
}
