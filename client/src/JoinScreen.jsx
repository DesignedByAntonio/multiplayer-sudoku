// client/src/JoinScreen.jsx
import { useState } from 'react'

export default function JoinScreen({ onJoin }) {
  const urlParams = new URLSearchParams(window.location.search)
  const roomIdFromUrl = urlParams.get('room') || ''

  const [roomId, setRoomId] = useState(roomIdFromUrl)
  const [userName, setUserName] = useState('')
  const [showOthers, setShowOthers] = useState(true)
  const [devPuzzle, setDevPuzzle] = useState('')



  async function validatePuzzle(puzzleString) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/validate-puzzle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle: puzzleString }),
    });
    const result = await res.json();
    alert(result.valid ? '✅ Puzzle is solvable' : '❌ Puzzle is invalid');
  }
  



  function handleSubmit(e) {
    e.preventDefault()
    if (roomId && userName) {
        onJoin({ userName, roomId, showOthers })
    }
  }



  async function validatePuzzle(puzzleString) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/validate-puzzle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle: puzzleString }),
    })
    const data = await res.json()
    alert(data.valid ? '✅ Puzzle is solvable' : '❌ Invalid or unsolvable puzzle')
  }

  



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-lg space-y-4 w-80">
        <h2 className="text-xl font-bold text-center">Join a Sudoku Room</h2>

        <input
          type="text"
          placeholder="Your Name"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          className="w-full p-2 border rounded"
        />



        <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
                type="checkbox"
                checked={showOthers}
                onChange={e => setShowOthers(e.target.checked)}
                className="accent-blue-600"
            />
            Show other players’ answers
        </label>

        <hr className="border-t my-2" />



        
        <h3 className="text-sm font-semibold text-gray-600">Dev Tools</h3>

        <input
        type="text"
        placeholder="Paste puzzle string (81 chars)"
        value={devPuzzle}
        onChange={e => setDevPuzzle(e.target.value)}
        className="w-full p-2 border rounded text-xs"
        />

        <button
        type="button"
        onClick={() => validatePuzzle(devPuzzle)}
        className="w-full mt-2 text-xs bg-gray-200 p-2 rounded hover:bg-gray-300"
        >
        Validate Puzzle
        </button>



        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Join Room
        </button>
      </form>
    </div>
  )
}
