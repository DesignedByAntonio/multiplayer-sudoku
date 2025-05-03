// client/src/SudokuGrid.jsx
import { useEffect, useState } from 'react'
import socket from './socket'

// client/src/SudokuGrid.jsx

// 1. Check no empties
function isComplete(grid) {
    return grid.every(row => row.every(cell => cell !== ''));
  }
  
  // 2. Check a row/col/block has exactly 9 unique 1–9 digits
  function isValidGroup(cells) {
    const nums = cells.filter(c => c !== '');
    return nums.length === 9 && new Set(nums).size === 9;
  }


  
  
  // 3. Full Sudoku validity
  function isValidSudoku(grid) {
    // rows
    for (const row of grid) {
      if (!isValidGroup(row)) return false;
    }
    // columns
    for (let c = 0; c < 9; c++) {
      const col = grid.map(r => r[c]);
      if (!isValidGroup(col)) return false;
    }
    // 3×3 blocks
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const block = [];
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            block.push(grid[3*br + dr][3*bc + dc]);
          }
        }
        if (!isValidGroup(block)) return false;
      }
    }
    return true;
  }


  

export default function SudokuGrid({ roomId, userName }) {
     // 1. Initialize a 9×9 grid of zeros (empty)
     const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(''))
     const [serverGrid, setServerGrid] = useState(null)
    //  const [grid, setGrid] = useState(
    //     serverGrid || emptyGrid
    //  )
    const [grid, setGrid] = useState(emptyGrid)

     const [winner, setWinner] = useState(null)
     // Timer state: record when the game actually starts
     const [startTime, setStartTime] = useState(null)
     const [selectedCell, setSelectedCell] = useState(null)

     
     const [players, setPlayers] = useState({})
     const [finalResults, setFinalResults] = useState(null)
     const [elapsed, setElapsed] = useState(0)
    const [timerRunning, setTimerRunning] = useState(true)
    const [timerId, setTimerId] = useState(null)

    const [showOthers, setShowOthers] = useState(true)

    const [noteMode, setNoteMode] = useState(false)
    const [notes, setNotes] = useState(
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
    )





     useEffect(() => {
        socket.on('connect', () => {
          console.log('[SOCKET] connected to server:', socket.id)
        })
      
        return () => socket.off('connect')
      }, [])
      
      // ───────────────────────────────────────────────────────────────────
 // Play a win sound when someone wins
    useEffect(() => {
    if (winner) {
        const audio = new Audio('/win-sound.mp3')
        audio.play().catch(err => {
        console.warn('Could not play win sound:', err)
        })
    }
    }, [winner])


    // Guarded effect:
    useEffect(() => {
        if (serverGrid) {
          setGrid(serverGrid)
          const now = Date.now()
          setStartTime(now)
      
          const id = setInterval(() => {
            setElapsed(prev => prev + 1)
          }, 1000)
      
          setTimerId(id)
          setTimerRunning(true)
      
          return () => clearInterval(id)
        }
      }, [serverGrid])
      
      

    
      useEffect(() => {
        socket.on('player-finished', ({ userName }) => {
          console.log(`${userName} has finished!`)
          // Optionally: flash a banner, update UI
        })
      
        return () => socket.off('player-finished')
      }, [])
      

  // win detection: when local player solves, emit to server AND record result
  useEffect(() => {
    if (isComplete(grid) && isValidSudoku(grid)) {
        const endTime = Date.now()
        socket.emit('player-finished', {
          roomId,
          userName,
          time: endTime
        })
      // compute elapsed time in seconds
      const elapsedMs = startTime ? Date.now() - startTime : 0
      const elapsedSec = Math.floor(elapsedMs / 1000)


      clearInterval(timerId)
    setTimerRunning(false)  


      // send to leaderboard API
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/puzzle/easy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userName,
          time: elapsedSec,
          mistakes: 0,                 // or hook up actual mistake count later
          date: new Date().toISOString()
        })
      })
    }
  }, [grid])




          
  useEffect(() => {
    socket.on('all-players-finished', (results) => {
        setFinalResults(results)
    })
    return () => socket.off('all-players-finished')
    }, [])
    


    // 2. Join the room on mount
    useEffect(() => {
        socket.connect()
        console.log('[SOCKET] connected:', socket.connected)
        socket.emit('join-room', { roomId, userName, showOthers })

        
        // 3. Listen for remote updates
        socket.on('cell-update', ({ row, col, value }) => {
            if (!showOthers) return  // 👈 don't reflect remote inputs

            setGrid(g => {
            const next = g.map(r => [...r])
            next[row][col] = value
            return next
      })
    })

    // cleanup
    return () => {
      socket.off('cell-update')
      socket.disconnect()
    }
  }, [roomId, userName])

  useEffect(() => {
    socket.on('room-data', ({ puzzle, players, showOthers  }) => {
        setShowOthers(showOthers)
        
        const flat = puzzle.split('').map(c => (c === '0' ? '' : c))
        const twoD = Array.from({ length: 9 }, (_, r) =>
          flat.slice(r * 9, r * 9 + 9)
        )
        setServerGrid(twoD)
        setPlayers(players)
      })
      
    
    return () => {
        socket.off('room-data')
    }
    }, [])

    // subscribe once on mount
    useEffect(() => {
        socket.on('game-won', ({ userName: winnerName }) => {
        setWinner(winnerName)
        })
        return () => {
        socket.off('game-won')
        }
    }, [])
  

  // 4. Handle local edits
  function onChange(r, c, e) {
    if (!timerRunning) return
    if (serverGrid && serverGrid[r][c] !== '') return
  
    const val = e.target.value.slice(-1).replace(/[^1-9]/g, '')
    setGrid(g => {
      const next = g.map(r => [...r])
      next[r][c] = val
      return next
    })
  
    socket.emit('cell-update', { roomId, row: r, col: c, value: val })
  }
  

  function handleNumberClick(num) {
    // console.log('Selected Cell:', selectedCell)
    if (!selectedCell) return;
    if (!timerRunning || !selectedCell) return
    
    const { row, col } = selectedCell;
  
    // Prevent changing a clue cell
    if (serverGrid && serverGrid[row][col] !== '') return;


    const isNote = noteMode
    const val = num === '⌫' ? '' : num;

    if (isNote) {
        // toggle note
        setNotes(prev => {
          const next = prev.map(row => row.map(cell => [...cell]))
          const notesInCell = next[row][col]
          if (grid[row][col] !== '') return prev // ignore if main number exists
    
          const index = notesInCell.indexOf(val)
          if (index > -1) {
            notesInCell.splice(index, 1)
          } else {
            notesInCell.push(val)
            notesInCell.sort()
          }
          return next
        })
      } else {
        
            setGrid(g => {
            const next = g.map(r => [...r]);
            next[row][col] = val;
            return next;
            });

            setNotes(prev => {
                const next = prev.map(row => row.map(cell => [...cell]))
                next[row][col] = [] // clear notes on main input
                return next
              })
        
            socket.emit('cell-update', {
            roomId,
            row,
            col,
            value: val
            });
            console.log('Click registered:', num, 'Cell:', selectedCell)
    }

  } 





  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }
  


  function handleForfeit() {
    socket.emit('player-finished', {
      roomId,
      userName,
      time: null
    })
    clearInterval(timerId)
    setTimerRunning(false)
  }
  


  // 5. Render the grid



  if (!Array.isArray(grid)) {
    return <div className="text-center mt-10 text-red-600">Loading puzzle...</div>
  }
  
  
  return (
    
    <>
        {winner && (
            <div className="fixed inset-0 z-20 flex items-center justify-center">
                {/* Dimmed backdrop */}
                <div className="absolute inset-0 bg-black opacity-50" />

                {/* Modal box */}
                <div className="relative bg-white rounded-lg shadow-lg p-8 max-w-sm text-center">
                <h2 className="text-2xl font-bold mb-4">
                    🎉 {winner} has solved the puzzle!
                </h2>
                <button
                    onClick={() => setWinner(null)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Close
                </button>
                </div>
            </div>
         )}



         <p className="text-xs text-gray-500 italic">
            {showOthers
                ? 'Players can see each other’s answers'
                : 'Answers are hidden from other players'}
            </p>


        {finalResults && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-50" />
            <div className="relative bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-bold mb-4 text-center">🎉 All players finished!</h3>
            <ul className="space-y-2 text-sm">
                {finalResults
                .sort((a, b) => {
                    const ta = typeof a.time === 'number' ? a.time : Infinity
                    const tb = typeof b.time === 'number' ? b.time : Infinity
                    return ta - tb
                  })
                  
                .map((r, i) => (
                    <li key={i} className="flex justify-between">
                    <span>{i + 1}. {r.userName}</span>
                    <span>{r.time === null ? 'Forfeit' : `${Math.floor(r.time / 1000)}s`}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={() => setFinalResults(null)}
                className="mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Close
            </button>
            </div>
        </div>
        )}



<div className="flex items-center gap-4 text-xl font-mono text-gray-800 mt-4">
  ⏱️ Time: {formatTime(elapsed)}
  <button
    onClick={() => {
      if (timerRunning) {
        clearInterval(timerId)
      } else {
        const id = setInterval(() => {
          setElapsed(prev => prev + 1)
        }, 1000)
        setTimerId(id)
      }
      setTimerRunning(!timerRunning)
    }}
    className="text-sm px-2 py-1 bg-white border rounded hover:bg-blue-100"
  >
    {timerRunning ? 'Pause' : 'Resume'}
  </button>
</div>





<div className="relative">
    {/* Blur layer */}
    {(!timerRunning && !winner && !finalResults) && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">⏸ Game is paused</div>
        </div>
    )}

        <div className="grid grid-cols-9 bg-gray-700 p-1 rounded-lg gap-0">

            {grid.map((row, r) =>
                row.map((val, c) => {
                // compute isClue inside a block arrow function
                const isClue = serverGrid && serverGrid[r][c] !== ''
                const disabled = isClue || Boolean(winner)

                const borderTop = r === 0
                ? 'border-t-4 border-gray-700'
                : r % 3 === 0
                    ? 'border-t-2 border-gray-700'
                    : 'border-t border-gray-300'

                const borderBottom = r === 8
                ? 'border-b-4 border-gray-700'
                : r % 3 === 2
                    ? 'border-b-2 border-gray-700'
                    : 'border-b border-gray-300'

                const borderLeft = c === 0
                ? 'border-l-4 border-gray-700'
                : c % 3 === 0
                    ? 'border-l-2 border-gray-700'
                    : 'border-l border-gray-300'

                const borderRight = c === 8
                ? 'border-r-4 border-gray-700'
                : c % 3 === 2
                    ? 'border-r-2 border-gray-700'
                    : 'border-r border-gray-300'

                const selectedValue =
                selectedCell && grid[selectedCell.row][selectedCell.col] !== ''
                ? grid[selectedCell.row][selectedCell.col]
                : null;
                  

                return (
                    
                    <div
                        key={`${r}-${c}`}
                        onClick={() => setSelectedCell({ row: r, col: c })}
                        className={`
                            w-10 h-10 relative flex items-center justify-center
                            text-center text-lg
                            ${isClue ? 'bg-gray-200 text-gray-600' : 'bg-white text-black'}
                            ${disabled && !isClue ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-100'}
                            ${selectedValue && val === selectedValue && !(r === selectedCell?.row && c === selectedCell?.col)
                                ? 'text-red-700 font-bold'
                                : ''}
                              
                            ${selectedCell?.row === r || selectedCell?.col === c ? 'bg-yellow-100' : ''}
                            ${selectedCell?.row === r && selectedCell?.col === c ? 'ring-2 ring-blue-300' : ''}


                            /* Grid borders for 3x3 layout */
                            ${r === 0 ? 'border-t-4 border-gray-700' : r % 3 === 0 ? 'border-t-2 border-gray-700' : 'border-t border-gray-300'}
                            ${r === 8 ? 'border-b-4 border-gray-700' : r % 3 === 2 ? 'border-b-2 border-gray-700' : 'border-b border-gray-300'}
                            ${c === 0 ? 'border-l-4 border-gray-700' : c % 3 === 0 ? 'border-l-2 border-gray-700' : 'border-l border-gray-300'}
                            ${c === 8 ? 'border-r-4 border-gray-700' : c % 3 === 2 ? 'border-r-2 border-gray-700' : 'border-r border-gray-300'}
                            ${(r % 3 === 1 && c % 3 === 1) ? 'border border-gray-600' : ''}
                        `}
                        >
                        {grid[r][c] !== '' ? (
                            <span>{grid[r][c]}</span>
                        ) : (
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 text-[10px] text-gray-500 pointer-events-none px-0.5 py-0.5">
                            {Array.from({ length: 9 }, (_, i) => (
                                <div key={i} className="flex items-center justify-center">
                                {notes[r][c].includes((i + 1).toString()) ? i + 1 : ''}
                                </div>
                            ))}
                            </div>
                        )}
                </div>




                )
                
                })
            )}
            </div>

        </div>

        <div className="mt-6 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                key={n}
                onClick={() => handleNumberClick(String(n))}
                className="bg-white border rounded text-lg w-10 h-10 hover:bg-blue-100"
                >
                {n}
                </button>
            ))}
            {[6, 7, 8, 9, '⌫'].map(n => (
                <button
                key={n}
                onClick={() =>
                    n === '⌫'
                    ? handleNumberClick('')
                    : handleNumberClick(String(n))
                }
                className="bg-white border rounded text-lg w-10 h-10 hover:bg-blue-100"
                >
                {n}
                </button>
            ))}
            </div>

            <button
                onClick={() => setNoteMode(prev => !prev)}
                className={`px-3 py-1 rounded ${noteMode ? 'bg-yellow-400' : 'bg-gray-200'} text-black font-medium`}
                >
                {noteMode ? 'Notes: ON' : 'Notes: OFF'}
                </button>





        <button
            onClick={handleForfeit}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
            Forfeit Match
        </button>

    </>

  )
}

















