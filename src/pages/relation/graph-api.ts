import { apiUrl } from "@/utils/api"
import Taro from "@tarojs/taro"
import * as relation from "./relation"

async function request(method: string, path: string, body?: any): Promise<any> {
  const res = await Taro.request({
    url: apiUrl(path),
    method: method as any,
    data: body,
  })
  if (res.statusCode >= 400) throw new Error(`Request failed: ${res.statusCode}`)
  return res.data
}

export interface ApiSubgraph {
  center: {
    word: string
    phonetic: string
    partOfSpeech: string
    level: string
    definition: string
    examples: string[]
    starred: boolean
  } | null
  nodes: Record<string, {
    word: string
    phonetic: string
    partOfSpeech: string
    level: string
    definition: string
    examples: string[]
    starred: boolean
  }>
  edges: Array<{
    source: string
    target: string
    type: string
    strength: number
    label: string
  }>
  relationGroups: string[]
}

export interface ApiPathResult {
  path: string[]
  hops: number
  score: number
  subgraph: ApiSubgraph
  availableHops: number[]
  relationGroups: string[]
  allPaths?: Array<{ path: string[]; hops: number; score: number }>
}

export function convertApiSubgraphToWordGraph(subgraph: ApiSubgraph): Record<string, any> {
  const result: Record<string, any> = {}

  const adjacency: Record<string, Array<{ word: string; type: string; strength: number }>> = {}

  for (const edge of subgraph.edges) {
    if (!adjacency[edge.source]) adjacency[edge.source] = []
    adjacency[edge.source].push({ word: edge.target, type: edge.type, strength: edge.strength })

    const dir = relation.getRelationDirection(edge.type)
    if (dir === "directed") continue

    const reverseType = dir === "paired" ? relation.getPairedType(edge.type) : edge.type

    if (!adjacency[edge.target]) adjacency[edge.target] = []
    adjacency[edge.target].push({ word: edge.source, type: reverseType, strength: edge.strength })
  }

  for (const [key, node] of Object.entries(subgraph.nodes)) {
    result[key] = {
      word: node.word,
      phonetic: node.phonetic,
      partOfSpeech: node.partOfSpeech,
      level: node.level,
      definition: node.definition,
      examples: node.examples,
      starred: node.starred ?? false,
      relations: adjacency[key] || [],
    }
  }

  return result
}

export async function fetchSubgraph(word: string, depth = 1): Promise<ApiSubgraph> {
  return request("GET", `/words/${encodeURIComponent(word)}/subgraph?depth=${depth}`)
}

export async function fetchPath(params: {
  source: string
  target: string
  mode?: string
  maxDepth?: number
  multiPath?: boolean
  filter?: string
}): Promise<ApiPathResult> {
  const searchParams = new URLSearchParams()
  searchParams.set("source", params.source)
  searchParams.set("target", params.target)
  searchParams.set("mode", params.mode || "strongest")
  searchParams.set("maxDepth", String(params.maxDepth || 5))
  if (params.multiPath) searchParams.set("multiPath", "true")
  if (params.filter && params.filter !== "all") searchParams.set("filter", params.filter)

  return request("GET", `/path?${searchParams.toString()}`)
}

export interface ApiSearchResult {
  word: string
  type: string
  meaning: string
  starred: boolean
}

export async function fetchSearch(q: string): Promise<ApiSearchResult[]> {
  try {
    return await request("GET", `/words/search?q=${encodeURIComponent(q)}`)
  } catch {
    return []
  }
}

export interface ApiWordDetail {
  word: string
  phonetic: string
  partOfSpeech: string
  level: string
  definition: string
  examples: string[]
  relations: Array<{ word: string; type: string; strength: number }>
  starred: boolean
}

export async function fetchWordDetail(word: string): Promise<ApiWordDetail> {
  return request("GET", `/words/${encodeURIComponent(word)}`)
}

export interface HistoryItem {
  id: string
  word: string
  word2?: string
  type: string
  meaning: string
  starred: boolean
}

export async function fetchHistory(mode: string): Promise<HistoryItem[]> {
  try {
    return await request("GET", `/history?mode=${mode}`)
  } catch {
    return []
  }
}

export async function addHistory(item: {
  mode: string
  word: string
  word2?: string
  type: string
  meaning: string
}): Promise<HistoryItem> {
  return request("POST", "/history", item)
}

export async function toggleHistoryStar(id: string, mode: string): Promise<HistoryItem> {
  return request("PATCH", `/history/${id}/star`, { mode })
}

export async function clearHistory(mode: string): Promise<void> {
  await request("DELETE", `/history?mode=${mode}`)
}
