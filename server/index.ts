import express from "express"
import cors from "cors"
import db from "./graph-db"

const app = express()
app.use(cors())
app.use(express.json())

interface HistoryItem {
  id: string
  word: string
  word2?: string
  type: string
  meaning: string
  starred: boolean
}

const history: Record<string, HistoryItem[]> = {
  word: [],
  singleRelation: [],
  twoWordsRelation: [],
}

let historyIdCounter = 0

app.get("/api/words/search", (req, res) => {
  const q = req.query.q as string | undefined
  if (!q || !q.trim()) {
    res.status(400).json({ error: "Query parameter 'q' is required" })
    return
  }
  res.json(db.searchWords(q.trim()))
})

app.get("/api/words/:word", (req, res) => {
  const entry = db.getWord(req.params.word)
  if (!entry) {
    res.status(404).json({ error: "Word not found" })
    return
  }
  res.json(entry)
})

app.get("/api/words/:word/relations", (req, res) => {
  const entry = db.getWord(req.params.word)
  if (!entry) {
    res.status(404).json({ error: "Word not found" })
    return
  }
  res.json({ relations: entry.relations })
})

app.get("/api/words/:word/subgraph", (req, res) => {
  const word = req.params.word as string
  const depth = parseInt(req.query.depth as string, 10) || 1
  const filter = (req.query.filter as string) || "all"

  const entry = db.getWord(word)
  if (!entry) {
    res.status(404).json({ error: "Word not found" })
    return
  }

  const result = db.getSubgraph(word, Math.min(depth, 5), filter)
  result.center = {
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: entry.partOfSpeech,
    level: entry.level,
    definition: entry.definition,
    examples: entry.examples,
    starred: entry.starred ?? false,
  }
  res.json(result)
})

app.get("/api/path", (req, res) => {
  const source = req.query.source as string
  const target = req.query.target as string
  const mode = (req.query.mode as string) || "strongest"
  const maxDepth = parseInt(req.query.maxDepth as string, 10) || 5
  const multiPath = req.query.multiPath === "true"
  const filter = (req.query.filter as string) || "all"

  if (!source || !target) {
    res.status(400).json({ error: "source and target are required" })
    return
  }

  if (maxDepth < 1 || maxDepth > 10) {
    res.status(400).json({ error: "maxDepth must be 1-10" })
    return
  }

  if (!["strongest", "shortest", "showAll"].includes(mode)) {
    res.status(400).json({ error: "mode must be strongest, shortest, or showAll" })
    return
  }

  const srcEntry = db.getWord(source)
  if (!srcEntry) {
    res.status(400).json({ error: `Word '${source}' not found` })
    return
  }

  const tgtEntry = db.getWord(target)
  if (!tgtEntry) {
    res.status(400).json({ error: `Word '${target}' not found` })
    return
  }

  const result = db.findPath(source, target, mode, maxDepth, multiPath, filter)
  res.json(result)
})

app.get("/api/graph", (_req, res) => {
  res.json({ deprecated: true, message: "Use /api/words/:word/subgraph or /api/path instead" })
})

app.get("/api/history", (req, res) => {
  const mode = (req.query.mode as string) || "word"
  if (!history[mode]) {
    res.status(400).json({ error: "Invalid mode" })
    return
  }
  res.json(history[mode])
})

app.post("/api/history", (req, res) => {
  const { mode, word, word2, type, meaning } = req.body
  if (!mode || !history[mode]) {
    res.status(400).json({ error: "Invalid mode" })
    return
  }
  if (!word) {
    res.status(400).json({ error: "word is required" })
    return
  }

  const item: HistoryItem = {
    id: String(++historyIdCounter),
    word,
    word2: word2 || undefined,
    type: type || "",
    meaning: meaning || "",
    starred: false,
  }

  history[mode].unshift(item)
  if (history[mode].length > 100) history[mode].pop()
  res.json(item)
})

app.patch("/api/history/:id/star", (req, res) => {
  const { mode } = req.body
  if (!mode || !history[mode]) {
    res.status(400).json({ error: "Invalid mode" })
    return
  }

  const item = history[mode].find((h) => h.id === req.params.id)
  if (!item) {
    res.status(404).json({ error: "History item not found" })
    return
  }

  item.starred = !item.starred
  res.json(item)
})

app.delete("/api/history", (req, res) => {
  const mode = (req.query.mode as string) || "word"
  if (!history[mode]) {
    res.status(400).json({ error: "Invalid mode" })
    return
  }
  history[mode] = []
  res.json({ ok: true })
})

const port = parseInt(process.env.API_SERVER_PORT || "25051", 10)
app.listen(port, "0.0.0.0", () => {
  console.log(`Word Graph API server running at http://localhost:${port}`)
})
