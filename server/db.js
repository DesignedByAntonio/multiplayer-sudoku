// server/db.js
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Helpers for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// JSON file path
const file = join(__dirname, 'data', 'results.json')
const adapter = new JSONFile(file)
// ← supply your default shape here
export const db = new Low(adapter, { results: [] })

// Now when you read, db.data will be { results: [] } if the file is empty
await db.read()
await db.write()   // writes the default if file didn’t exist
