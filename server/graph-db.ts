import fs from "fs"
import path from "path"
import { getRelationDirection, getPairedType, getRelationLabel, getRelationGroup, RELATION_GROUPS } from "./relation"

interface RawRelation {
  word: string
  type: string
  strength: number
}

interface RawWordNode {
  word: string
  phonetic: string
  starred: boolean
  partOfSpeech: string
  level: string
  definition: string
  examples: string[]
  relations: RawRelation[]
}

type RawGraph = Record<string, RawWordNode>

export interface Edge {
  to: string
  weight: number
  type: string
  strength: number
}

export interface SubgraphEdge {
  source: string
  target: string
  type: string
  strength: number
  label: string
}

export interface WordDetail {
  word: string
  phonetic: string
  partOfSpeech: string
  level: string
  definition: string
  examples: string[]
  starred: boolean
}

export interface SubgraphResult {
  center: WordDetail | null
  nodes: Record<string, WordDetail>
  edges: SubgraphEdge[]
  relationGroups: string[]
}

export interface PathResult {
  path: string[]
  hops: number
  score: number
  subgraph: SubgraphResult
  availableHops: number[]
  relationGroups: string[]
  allPaths?: Array<{ path: string[]; hops: number; score: number }>
}

const DATA_PATH = path.resolve(__dirname, "..", "src", "pages", "relation", "word-relation-data.json")

class GraphDB {
  private rawGraph: RawGraph = {}
  private adjList: Record<string, Edge[]> = {}
  private wordIndex: Map<string, string> = new Map()
  private _initialized = false

  init(): void {
    if (this._initialized) return
    const raw = fs.readFileSync(DATA_PATH, "utf-8")
    this.rawGraph = JSON.parse(raw) as RawGraph
    this.buildAdjList()
    this.buildWordIndex()
    this._initialized = true
  }

  private buildAdjList(): void {
    const adj: Record<string, Edge[]> = {}

    const ensure = (w: string) => {
      if (!adj[w]) adj[w] = []
    }

    for (const node of Object.values(this.rawGraph)) {
      ensure(node.word)
      for (const rel of node.relations) {
        const weight = Math.min(rel.strength * this.typeWeight(rel.type), 0.999)
        adj[node.word].push({ to: rel.word, weight, type: rel.type, strength: rel.strength })

        const dir = getRelationDirection(rel.type)
        if (dir === "bidirectional") {
          ensure(rel.word)
          adj[rel.word].push({ to: node.word, weight, type: rel.type, strength: rel.strength })
        } else if (dir === "paired") {
          const pairedType = getPairedType(rel.type)
          const pw = Math.min(rel.strength * this.typeWeight(pairedType), 0.999)
          ensure(rel.word)
          adj[rel.word].push({ to: node.word, weight: pw, type: pairedType, strength: rel.strength })
        }
      }
    }

    this.adjList = adj
  }

  private buildWordIndex(): void {
    for (const key of Object.keys(this.rawGraph)) {
      this.wordIndex.set(key.toLowerCase(), key)
    }
  }

  private typeWeight(type: string): number {
    const weights: Record<string, number> = {
      synonym: 1.0, antonym: 0.8, to_noun: 0.95, to_adv: 0.95,
      comparative: 0.9, superlative: 0.9, related: 0.6,
      present_participle: 0.95, past_tense: 0.95,
    }
    return weights[type] ?? 1.0
  }

  getWord(word: string): RawWordNode | undefined {
    return this.rawGraph[word.toLowerCase()]
  }

  searchWords(q: string): Array<{ word: string; type: string; meaning: string; starred: boolean }> {
    const lower = q.toLowerCase()
    const matches: string[] = []
    this.wordIndex.forEach((original, lowerKey) => {
      if (lowerKey.startsWith(lower)) matches.push(original)
    })
    return matches.slice(0, 20).map((w) => {
      const node = this.rawGraph[w.toLowerCase()]
      return {
        word: node.word,
        type: node.partOfSpeech,
        meaning: node.definition,
        starred: node.starred ?? false,
      }
    })
  }

  getSubgraph(word: string, depth = 1, filter = "all"): SubgraphResult {
    const lower = word.toLowerCase()
    const centerNode = this.rawGraph[lower]
    if (!centerNode) return { center: null, nodes: {}, edges: [], relationGroups: [] }

    const included = new Set<string>([lower])
    const queue: Array<{ w: string; d: number }> = [{ w: lower, d: 0 }]

    while (queue.length > 0) {
      const cur = queue.shift()!
      if (cur.d >= depth) continue
      const node = this.rawGraph[cur.w]
      if (!node) continue
      for (const rel of node.relations) {
        const key = rel.word.toLowerCase()
        if (!included.has(key)) {
          included.add(key)
          queue.push({ w: key, d: cur.d + 1 })
        }
      }
    }

    return this.buildSubgraphOutput(included, filter)
  }

  findPath(
    source: string,
    target: string,
    mode: string,
    maxDepth: number,
    multiPath: boolean,
    filter: string,
  ): PathResult {
    const src = source.toLowerCase()
    const tgt = target.toLowerCase()
    if (!this.rawGraph[src]) return this.emptyResult()
    if (!this.rawGraph[tgt]) return this.emptyResult()

    const availableHops = this.getAvailableHops(src, tgt, 10)
    const effectiveDepth = mode === "showAll" ? 10 : Math.min(maxDepth, 10)

    let path: string[] = []
    let score = 0
    let allPaths: Array<{ path: string[]; hops: number; score: number }> = []

    if (mode === "showAll") {
      allPaths = this.findAllReachablePaths(src, tgt, effectiveDepth, 50)
      if (allPaths.length === 0) return this.emptyResult()
      path = allPaths[0].path
      score = allPaths[0].score
      if (!multiPath) allPaths = []
    } else if (mode === "shortest") {
      const result = this.findShortestPath(src, tgt, effectiveDepth)
      if (result.path.length === 0) return this.emptyResult()
      path = result.path
      score = result.score
      const minHops = path.length - 1
      if (multiPath) {
        allPaths = this.findAllReachablePaths(src, tgt, effectiveDepth, 50)
          .filter((p) => p.hops === minHops)
      }
    } else {
      const result = this.findBestPathWithDepth(src, tgt, effectiveDepth)
      if (result.path.length === 0) return this.emptyResult()
      path = result.path
      score = result.score
      if (multiPath) {
        allPaths = this.findAllReachablePaths(src, tgt, effectiveDepth, 50)
      }
    }

    if (filter !== "all" && allPaths.length > 0) {
      const filterGroup = this.filterGroupSet(filter)
      allPaths = allPaths.filter((p) =>
        this.pathHasFilterMatch(p.path, filterGroup)
      )
    }

    const pathSet = new Set(path)
    const included = new Set(path)
    if (allPaths.length > 0) {
      for (const p of allPaths) {
        for (const w of p.path) included.add(w)
      }
    }
    for (const w of included) {
      const node = this.rawGraph[w]
      if (!node) continue
      for (const rel of node.relations) {
        included.add(rel.word.toLowerCase())
      }
    }

    const subgraph = this.buildSubgraphOutput(included, filter)
    const hops = Math.max(0, path.length - 1)
    const relationGroups = subgraph.relationGroups

    const result: PathResult = {
      path,
      hops,
      score: Math.round(score * 100) / 100,
      subgraph,
      availableHops,
      relationGroups,
    }
    if (allPaths.length > 0) {
      result.allPaths = allPaths.map((p) => ({
        ...p,
        score: Math.round(p.score * 100) / 100,
      }))
    }
    return result
  }

  private buildSubgraphOutput(included: Set<string>, filter = "all"): SubgraphResult {
    const nodes: Record<string, WordDetail> = {}
    const edges: SubgraphEdge[] = []
    const edgeSet = new Set<string>()
    const groupSet = new Set<string>()

    for (const key of included) {
      const node = this.rawGraph[key]
      nodes[key] = {
        word: node?.word || key,
        phonetic: node?.phonetic || "",
        partOfSpeech: node?.partOfSpeech || "",
        level: node?.level || "",
        definition: node?.definition || "",
        examples: node?.examples || [],
        starred: node?.starred ?? false,
      }

      if (!node) continue

      for (const rel of node.relations) {
        const tgtKey = rel.word.toLowerCase()
        if (!included.has(tgtKey)) continue

        const relGroup = getRelationGroup(rel.type)
        if (filter !== "all" && relGroup !== filter) continue

        const edgeKey = [key, tgtKey, rel.type].sort().join("|")
        if (edgeSet.has(edgeKey)) continue
        edgeSet.add(edgeKey)
        groupSet.add(relGroup)

        const label = getRelationLabel(rel.type)
        edges.push({
          source: node.word,
          target: rel.word,
          type: rel.type,
          strength: rel.strength,
          label,
        })
      }
    }

    return {
      center: null,
      nodes,
      edges,
      relationGroups: Array.from(groupSet).sort(),
    }
  }

  private emptyResult(): PathResult {
    return { path: [], hops: 0, score: 0, subgraph: { center: null, nodes: {}, edges: [], relationGroups: [] }, availableHops: [], relationGroups: [] }
  }

  private filterGroupSet(filter: string): Set<string> {
    const s = new Set<string>()
    for (const [group, types] of Object.entries(RELATION_GROUPS)) {
      if (group === filter) {
        for (const t of types) s.add(t)
        break
      }
    }
    return s
  }

  private pathHasFilterMatch(pathNodes: string[], filterTypes: Set<string>): boolean {
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const a = pathNodes[i]
      const b = pathNodes[i + 1]
      const edges = this.adjList[a]
      if (!edges) return false
      const hasMatch = edges.some((e) => e.to === b && filterTypes.has(e.type))
      if (!hasMatch) return false
    }
    return true
  }

  getAvailableHops(src: string, tgt: string, maxProbe = 10): number[] {
    const allPaths = this.findAllReachablePaths(src, tgt, maxProbe, 100)
    const hopSet = new Set<number>()
    for (const p of allPaths) {
      hopSet.add(p.hops)
    }
    return Array.from(hopSet).sort((a, b) => a - b)
  }

  getAdjList(): Record<string, Edge[]> {
    return this.adjList
  }

  findBestPathWithDepth(
    start: string,
    target: string,
    maxDepth = 5,
  ): { path: string[]; score: number } {
    const graph = this.adjList
    const dist: Record<string, Record<number, number>> = {}
    const prev: Record<string, Record<number, string | null>> = {}

    type State = { word: string; cost: number; depth: number }
    const pq: State[] = []
    const push = (s: State) => {
      pq.push(s)
      pq.sort((a, b) => a.cost - b.cost)
    }

    push({ word: start, cost: 0, depth: 0 })
    dist[start] = { 0: 0 }
    prev[start] = { 0: null }

    let bestTargetCost = Infinity
    let bestTargetDepth: number | null = null

    while (pq.length) {
      const cur = pq.shift()!
      if (cur.cost > bestTargetCost) continue

      if (cur.word === target) {
        if (cur.cost < bestTargetCost) {
          bestTargetCost = cur.cost
          bestTargetDepth = cur.depth
        }
        continue
      }

      const edges = graph[cur.word]
      if (!edges) continue

      for (const edge of edges) {
        const nextDepth = cur.depth + 1
        if (nextDepth > maxDepth) continue

        const weight = Math.max(edge.weight, 1e-6)
        const newCost = cur.cost - Math.log(weight)

        if (!dist[edge.to]) dist[edge.to] = {}
        if (!prev[edge.to]) prev[edge.to] = {}

        if (dist[edge.to][nextDepth] === undefined || newCost < dist[edge.to][nextDepth]) {
          dist[edge.to][nextDepth] = newCost
          prev[edge.to][nextDepth] = cur.word
          push({ word: edge.to, cost: newCost, depth: nextDepth })
        }
      }
    }

    if (bestTargetDepth === null) return { path: [], score: 0 }

    const path: string[] = []
    let cur: string | null = target
    let depth = bestTargetDepth

    while (cur !== null) {
      path.push(cur)
      const parent = prev[cur]?.[depth]
      if (parent === undefined) break
      cur = parent
      depth -= 1
    }

    path.reverse()
    return { path, score: Math.exp(-bestTargetCost) }
  }

  findShortestPath(
    start: string,
    target: string,
    maxDepth = 5,
  ): { path: string[]; score: number } {
    const graph = this.adjList
    const visited = new Set<string>([start])
    const prev: Record<string, string | null> = { [start]: null }
    const queue: string[] = [start]

    while (queue.length) {
      const cur = queue.shift()!
      if (cur === target) break

      const edges = graph[cur]
      if (!edges) continue

      let depth = 0
      let p: string | null = cur
      while (p && prev[p] !== null) { depth++; p = prev[p]! }
      if (depth >= maxDepth) continue

      for (const edge of edges) {
        if (visited.has(edge.to)) continue
        visited.add(edge.to)
        prev[edge.to] = cur
        queue.push(edge.to)
      }
    }

    if (!(target in prev)) return { path: [], score: 0 }

    const path: string[] = []
    let cur: string | null = target
    while (cur) {
      path.push(cur)
      cur = prev[cur] ?? null
    }
    path.reverse()
    return { path, score: 1 / path.length }
  }

  findAllPathsAtDepth(
    start: string,
    target: string,
    depth: number,
    maxResults = 50,
  ): Array<{ path: string[]; score: number; hops: number }> {
    const graph = this.adjList
    const results: Array<{ path: string[]; score: number; hops: number }> = []
    const stack: Array<{ word: string; path: string[]; cost: number }> = [
      { word: start, path: [start], cost: 0 },
    ]

    while (stack.length && results.length < maxResults) {
      const cur = stack.pop()!
      if (cur.path.length - 1 > depth) continue

      if (cur.word === target && cur.path.length - 1 === depth) {
        results.push({ path: [...cur.path], score: Math.exp(-cur.cost), hops: depth })
        continue
      }

      const edges = graph[cur.word]
      if (!edges) continue

      for (const edge of edges) {
        if (cur.path.includes(edge.to)) continue
        if (cur.path.length - 1 >= depth) continue
        const weight = Math.max(edge.weight, 1e-6)
        stack.push({
          word: edge.to,
          path: [...cur.path, edge.to],
          cost: cur.cost - Math.log(weight),
        })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results
  }

  findAllReachablePaths(
    start: string,
    target: string,
    maxDepth = 10,
    maxResults = 50,
  ): Array<{ path: string[]; score: number; hops: number }> {
    const graph = this.adjList
    const results: Array<{ path: string[]; score: number; hops: number }> = []

    const dfs = (word: string, path: string[], cost: number) => {
      if (results.length >= maxResults) return
      if (path.length - 1 > maxDepth) return

      if (word === target && path.length > 1) {
        results.push({ path: [...path], score: Math.exp(-cost), hops: path.length - 1 })
        return
      }

      const edges = graph[word]
      if (!edges) return

      for (const edge of edges) {
        if (path.includes(edge.to)) continue
        const weight = Math.max(edge.weight, 1e-6)
        dfs(edge.to, [...path, edge.to], cost - Math.log(weight))
      }
    }

    dfs(start, [start], 0)
    results.sort((a, b) => a.hops - b.hops || b.score - a.score)

    return results.filter((r, i, arr) => {
      const key = r.path.join("|")
      return arr.findIndex((x) => x.path.join("|") === key) === i
    })
  }
}

const db = new GraphDB()
db.init()

export default db
