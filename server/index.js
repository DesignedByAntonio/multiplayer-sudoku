// server/index.js
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { db } from './db.js'


// ← NEW IMPORTS
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ← LOAD PUZZLES
const puzzles = {
  easy: JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'easy.json'), 'utf8')),
  medium: JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'medium.json'), 'utf8')),
  hard: JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'hard.json'), 'utf8')),
}

const app = express()
app.use(cors({
  origin: 'multiplayer-sudoku-client.vercel.app',  // ← use your actual deployed frontend URL
  methods: ['GET', 'POST'],
}))

// ← NEW ENDPOINT
app.get('/api/puzzle/:difficulty', (req, res) => {
  const level = req.params.difficulty
  const list  = puzzles[level] || puzzles.easy
  const choice = list[Math.floor(Math.random() * list.length)]
  res.json(choice)
})

// Record a finished game
app.post(
  '/api/result',
  express.json(),
  async (req, res) => {
    const { roomId, userName, time, mistakes, date } = req.body
    if (!roomId || !userName || time == null) {
      return res.status(400).json({ error: 'Missing fields' })
    }
    await db.read()
    db.data.results.push({ roomId, userName, time, mistakes, date })
    await db.write()
    res.sendStatus(204)
  }
)

// Fetch the leaderboard
app.get(
  '/api/leaderboard',
  async (req, res) => {
    const { roomId, limit = 10 } = req.query
    await db.read()
    let list = db.data.results
      .filter(r => !roomId || r.roomId === roomId)
      .sort((a, b) => a.time - b.time)
      .slice(0, Number(limit))
    res.json(list)
  }
)

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' }
})

io.on('connection', socket => {
  console.log('⚡️ New client connected:', socket.id)

  socket.on('join-room', (roomId, userName) => {
    socket.join(roomId)
    io.to(roomId).emit('user-joined', userName)
  })

  socket.on('cell-update', data => {
    // data: { roomId, row, col, value }
    socket.to(data.roomId).emit('cell-update', data)
  })
  // when the client sends “ping”
  socket.on('ping', (msg) => {
    console.log('🔔 Ping received:', msg);
    socket.emit('pong', `got your message: "${msg}"`);
  })

  // when a client declares victory, broadcast to the whole room
socket.on('game-won', ({ roomId, userName }) => {
  io.to(roomId).emit('game-won', { userName })
})



  socket.on('disconnect', () => {
    console.log('🛑 Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 4000
server.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
)
