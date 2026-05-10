import * as relation from "./relation"

export type WordGraphNode = {
  word: string
  phonetic: string
  starred: boolean
  partOfSpeech: string
  level: string
  definition: string
  examples: string[]
  relations: Array<{ word: string; type: string; strength: number }>
  isCenter?: boolean
}

export type WordGraph = Record<string, WordGraphNode>

export interface PathCandidate {
  path: string[]
  score: number
  hops: number
}

export type SinglePathVisibilityMode = "hide" | "dim"

export interface StableLayoutPoint {
  x: number
  y: number
}

export type StableLayout = Record<string, StableLayoutPoint>

export interface ViewportBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface VisibleGraphNode {
  id: string
  name: string
  x: number
  y: number
  fixed: boolean
  category: number
  symbolSize: number
  label: {
    show: boolean
    fontSize: number
    fontWeight: "bold" | "normal"
    color: string
  }
  itemStyle: {
    color: string
    borderColor: string
    borderWidth: number
    opacity?: number
  }
}

export interface VisibleGraphEdge {
  source: string
  target: string
  symbol: [string, string]
  symbolSize: [number, number]
  label: {
    show: boolean
    formatter: string
    fontSize: number
    color: string
  }
  lineStyle: {
    width: number
    color: string
    opacity: number
    curveness?: number
  }
}

export interface VisibleGraph {
  nodes: VisibleGraphNode[]
  edges: VisibleGraphEdge[]
  activePath: PathCandidate | null
  availableGroupKeys: string[]
}

function buildPathEdgeKey(source: string, target: string) {
  return `${source}__${target}`
}

function buildPathCandidateSet(paths: PathCandidate[]): Set<string> {
  const words = new Set<string>()
  paths.forEach((item) => item.path.forEach((word) => words.add(word)))
  return words
}

function buildPathEdgeSet(paths: PathCandidate[]): Set<string> {
  const edgeKeys = new Set<string>()
  paths.forEach((item) => {
    for (let i = 0; i < item.path.length - 1; i++) {
      edgeKeys.add(buildPathEdgeKey(item.path[i], item.path[i + 1]))
      edgeKeys.add(buildPathEdgeKey(item.path[i + 1], item.path[i]))
    }
  })
  return edgeKeys
}

function isInsideViewport(point: StableLayoutPoint | undefined, viewport: ViewportBounds) {
  if (!point) return false
  return (
    point.x >= viewport.left &&
    point.x <= viewport.right &&
    point.y >= viewport.top &&
    point.y <= viewport.bottom
  )
}

export function createDefaultStableLayout(pathGraph: WordGraph, sourceWord: string, targetWord: string): StableLayout {
  const nodeIds = Object.keys(pathGraph)
  if (nodeIds.length === 0) return {}

  const centerIds = new Set([sourceWord, targetWord])
  const rest = nodeIds.filter((word) => !centerIds.has(word))
  const layout: StableLayout = {}

  layout[sourceWord] = { x: 48, y: 180 }
  layout[targetWord] = { x: 348, y: 180 }

  rest.forEach((word, index) => {
    const row = Math.floor(index / 3)
    const col = index % 3
    layout[word] = {
      x: 120 + col * 80,
      y: 80 + row * 70 + (col % 2 === 0 ? 0 : 24),
    }
  })

  return layout
}

export function buildViewportBounds(params: {
  layout: StableLayout
  width: number
  height: number
  zoom?: number
  centerX?: number
  centerY?: number
  bufferScale?: number
}): ViewportBounds {
  const {
    layout,
    width,
    height,
    zoom = 1,
    centerX,
    centerY,
    bufferScale = 1.2,
  } = params

  const points = Object.values(layout)
  if (!points.length) {
    return {
      left: 0,
      top: 0,
      right: width,
      bottom: height,
    }
  }

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))

  const effectiveCenterX = centerX ?? (minX + maxX) / 2
  const effectiveCenterY = centerY ?? (minY + maxY) / 2
  const halfWidth = (width / Math.max(zoom, 0.1)) * bufferScale * 0.5
  const halfHeight = (height / Math.max(zoom, 0.1)) * bufferScale * 0.5

  return {
    left: effectiveCenterX - halfWidth,
    right: effectiveCenterX + halfWidth,
    top: effectiveCenterY - halfHeight,
    bottom: effectiveCenterY + halfHeight,
  }
}

export function deriveVisibleGraph(params: {
  pathGraph: WordGraph
  sourceWord: string
  targetWord: string
  allPaths: PathCandidate[]
  currentPathIdx: number
  showAllPaths: boolean
  singlePathVisibilityMode: SinglePathVisibilityMode
  visibleTypes: Set<string>
  removedNodeIds: Set<string>
  stableLayout: StableLayout
  viewport: ViewportBounds
}): VisibleGraph {
  const {
    pathGraph,
    sourceWord,
    targetWord,
    allPaths,
    currentPathIdx,
    showAllPaths,
    singlePathVisibilityMode,
    visibleTypes,
    removedNodeIds,
    stableLayout,
    viewport,
  } = params

  const activePath = allPaths[currentPathIdx] || allPaths[0] || null
  const visiblePaths = showAllPaths
    ? allPaths
    : activePath
      ? [activePath]
      : []

  const activePathWords = activePath ? new Set(activePath.path) : new Set<string>()
  const visiblePathWords = buildPathCandidateSet(visiblePaths)
  const activePathEdges = activePath ? buildPathEdgeSet([activePath]) : new Set<string>()
  const visiblePathEdges = buildPathEdgeSet(visiblePaths)

  const viewportWords = new Set<string>()
  Object.entries(stableLayout).forEach(([word, point]) => {
    if (removedNodeIds.has(word)) return
    if (isInsideViewport(point, viewport)) {
      viewportWords.add(word)
    }
  })

  const includedWords = new Set<string>([sourceWord, targetWord])
  activePathWords.forEach((word) => includedWords.add(word))

  if (showAllPaths || singlePathVisibilityMode === "dim") {
    visiblePathWords.forEach((word) => {
      if (includedWords.has(word)) return
      const point = stableLayout[word]
      if (isInsideViewport(point, viewport)) {
        includedWords.add(word)
      }
    })
    viewportWords.forEach((word) => {
      if (!includedWords.has(word)) {
        includedWords.add(word)
      }
    })
  }

  const nodes: VisibleGraphNode[] = []
  const edges: VisibleGraphEdge[] = []
  const availableGroupKeys = new Set<string>()
  const addedNodeIds = new Set<string>()
  const edgeSet = new Set<string>()

  Array.from(includedWords).forEach((word) => {
    if (removedNodeIds.has(word)) return
    const entry = pathGraph[word]
    const point = stableLayout[word]
    if (!entry || !point) return

    const isSource = word === sourceWord
    const isTarget = word === targetWord
    const isOnActivePath = activePathWords.has(word) && !isSource && !isTarget
    const isOnVisiblePath = visiblePathWords.has(word)
    const isDimmedContext = !showAllPaths &&
      singlePathVisibilityMode === "dim" &&
      !isSource &&
      !isTarget &&
      !isOnActivePath &&
      isOnVisiblePath
    const isContext = !isSource && !isTarget && !isOnVisiblePath

    nodes.push({
      id: word,
      name: word,
      x: point.x,
      y: point.y,
      fixed: true,
      category: isSource ? 0 : isTarget ? 1 : isOnVisiblePath ? 2 : 3,
      symbolSize: isSource || isTarget ? 46 : isOnActivePath ? 36 : 28,
      itemStyle: {
        color: "#FFFFFF",
        borderColor: isSource ? "#34C759" : isTarget ? "#FF2D55" : isOnVisiblePath ? "#007AFF" : "#CBD5E1",
        borderWidth: isSource || isTarget ? 3 : 2.2,
        opacity: isContext ? 0.45 : isDimmedContext ? 0.35 : 1,
      },
      label: {
        show: !isContext || isSource || isTarget,
        fontSize: isSource || isTarget ? 13 : 11,
        fontWeight: isSource || isTarget ? "bold" : "normal",
        color: isSource ? "#12805A" : isTarget ? "#C81E4A" : "#1F2937",
      },
    })

    addedNodeIds.add(word)
  })

  Object.entries(pathGraph).forEach(([word, entry]) => {
    if (!addedNodeIds.has(word)) return

    entry.relations.forEach((rel) => {
      if (!visibleTypes.has(rel.type)) return
      if (removedNodeIds.has(rel.word)) return
      if (!addedNodeIds.has(rel.word)) return

      const edgeKey = buildPathEdgeKey(word, rel.word)
      const reverseEdgeKey = buildPathEdgeKey(rel.word, word)
      if (edgeSet.has(edgeKey) || edgeSet.has(reverseEdgeKey)) return

      const isActiveEdge = activePathEdges.has(edgeKey) || activePathEdges.has(reverseEdgeKey)
      const isVisiblePathEdge = visiblePathEdges.has(edgeKey) || visiblePathEdges.has(reverseEdgeKey)

      if (!showAllPaths && singlePathVisibilityMode === "hide" && !isActiveEdge) {
        return
      }
      if (showAllPaths && !isVisiblePathEdge) {
        return
      }
      if (!showAllPaths && singlePathVisibilityMode === "dim" && !isVisiblePathEdge) {
        return
      }

      edgeSet.add(edgeKey)

      const group = relation.getRelationGroup(rel.type) || "other"
      if (group !== "other") {
        availableGroupKeys.add(group)
      }

      const color = relation.getRelationColor(rel.type)
      edges.push({
        source: word,
        target: rel.word,
        symbol: ["diamond", "arrow"],
        symbolSize: [8, 8],
        label: {
          show: isActiveEdge,
          formatter: relation.getRelationLabel(rel.type),
          fontSize: 10,
          color: "#64748B",
        },
        lineStyle: isActiveEdge
          ? { width: 4, color, opacity: 1 }
          : {
              width: 2.5,
              color,
              opacity: showAllPaths ? 0.85 : 0.35,
              curveness: 0.12,
            },
      })
    })
  })

  return {
    nodes,
    edges,
    activePath,
    availableGroupKeys: Array.from(availableGroupKeys),
  }
}

export function buildSharedGraphOption(params: {
  graph: VisibleGraph
  sourceWord: string
  targetWord: string
}) {
  const { graph, sourceWord, targetWord } = params

  return {
    backgroundColor: "transparent",
    animationDuration: 220,
    animationEasingUpdate: "quarticOut",
    legend: { show: false },
    series: [
      {
        type: "graph",
        layout: "none",
        roam: true,
        draggable: true,
        categories: [
          { name: "起点", itemStyle: { color: "#34C759" } },
          { name: "终点", itemStyle: { color: "#FF2D55" } },
          { name: "路径节点", itemStyle: { color: "#007AFF" } },
          { name: "上下文", itemStyle: { color: "#CBD5E1" } },
        ],
        nodes: graph.nodes.map((node) => ({
          ...node,
          fixed: node.id === sourceWord || node.id === targetWord ? true : node.fixed,
          emphasis: { scale: true },
        })),
        edges: graph.edges,
        emphasis: {
          focus: "adjacency" as const,
          lineStyle: { width: 6 },
          itemStyle: { borderWidth: 4 },
        },
        scaleLimit: { min: 0.24, max: 4.5 },
      },
    ],
  }
}
