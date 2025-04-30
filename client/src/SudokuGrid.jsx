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
  

export default function SudokuGrid({ roomId, userName, initialGrid }) {
     // 1. Initialize a 9×9 grid of zeros (empty)
     const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(''))
     const [grid, setGrid] = useState(
      initialGrid || emptyGrid
     )

     const [winner, setWinner] = useState(null)
     // Timer state: record when the game actually starts
     const [startTime, setStartTime] = useState(null)
     const [selectedCell, setSelectedCell] = useState(null)

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
        // Don’t run this until initialGrid is truthy (i.e. not null)
        if (initialGrid) {
          setGrid(initialGrid)
          setStartTime(Date.now())
        }
      }, [initialGrid])



  // win detection: when local player solves, emit to server AND record result
  useEffect(() => {
    if (isComplete(grid) && isValidSudoku(grid)) {
      socket.emit('game-won', { roomId, userName })

      // compute elapsed time in seconds
      const elapsedMs = startTime ? Date.now() - startTime : 0
      const elapsedSec = Math.floor(elapsedMs / 1000)

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
          
          


    // 2. Join the room on mount
    useEffect(() => {
        socket.connect()
        console.log('[SOCKET] connected:', socket.connected)
        socket.emit('join-room', roomId, userName)

    // 3. Listen for remote updates
    socket.on('cell-update', ({ row, col, value }) => {
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
    if (initialGrid && initialGrid[r][c] !== '') return;  // ignore attempts on clues
    const val = e.target.value.slice(-1).replace(/[^1-9]/g, '') // 1–9 only
    setGrid(g => {
      const next = g.map(r => [...r])
      next[r][c] = val
      return next
    })
    socket.emit('cell-update', { roomId, row: r, col: c, value: val })
  }

  // 5. Render the grid





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

    <div className="grid grid-cols-9 bg-gray-700 p-1 rounded-lg gap-0">

        {grid.map((row, r) =>
            row.map((val, c) => {
            // compute isClue inside a block arrow function
            const isClue = initialGrid && initialGrid[r][c] !== ''
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


            return (
                // <input
                //     key={`${r}-${c}`}
                //     type="text"
                //     maxLength="1"
                //     value={val}
                //     onChange={e => onChange(r, c, e)}
                //     onFocus={() => setSelectedCell({ row: r, col: c })}
                //     onBlur={() => setSelectedCell(null)}
                //     readOnly={isClue}
                //     disabled={disabled}
                //     className={`
                //         w-10 h-10 text-center
                //         ${isClue ? 'bg-gray-100 font-bold cursor-not-allowed' : 'bg-white focus:outline-none'}
                //         ${disabled && !isClue ? 'opacity-50 cursor-not-allowed' : ''}
                //         ${selectedCell && (selectedCell.row === r || selectedCell.col === c) ? 'bg-yellow-100' : ''}
                //         hover:bg-blue-100
                //         transition duration-150
                //         ${borderTop} ${borderBottom} ${borderLeft} ${borderRight}
                //       `}
                      
                //     />
                <input
                    key={`${r}-${c}`}
                    type="text"
                    maxLength="1"
                    value={val}
                    onChange={e => onChange(r, c, e)}
                    onFocus={() => setSelectedCell({ row: r, col: c })}
                    onBlur={() => setSelectedCell(null)}
                    readOnly={isClue}
                    disabled={disabled}
                    className={`
                        w-10 h-10 text-center
                        ${isClue ? 'bg-gray-100 font-bold cursor-not-allowed' : 'bg-white focus:outline-none'}
                        ${disabled && !isClue ? 'opacity-50 cursor-not-allowed' : ''}
                        ${selectedCell && (selectedCell.row === r || selectedCell.col === c) ? 'bg-yellow-100' : ''}
                        hover:bg-blue-100

                        /* Top border */
                        ${r === 0 ? 'border-t-4 border-gray-700' : r % 3 === 0 ? 'border-t-2 border-gray-700' : 'border-t border-gray-300'}

                        /* Bottom border */
                        ${r === 8 ? 'border-b-4 border-gray-700' : r % 3 === 2 ? 'border-b-2 border-gray-700' : 'border-b border-gray-300'}

                        /* Left border */
                        ${c === 0 ? 'border-l-4 border-gray-700' : c % 3 === 0 ? 'border-l-2 border-gray-700' : 'border-l border-gray-300'}

                        /* Right border */
                        ${c === 8 ? 'border-r-4 border-gray-700' : c % 3 === 2 ? 'border-r-2 border-gray-700' : 'border-r border-gray-300'}

                        /* Middle centers — extra tweak */
                        ${(r % 3 === 1 && c % 3 === 1) ? 'border border-gray-600' : ''}
                    `}
                    />


                    



              )
              
            })
        )}
        </div>
    </>

  )
}

















