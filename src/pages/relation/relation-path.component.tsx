import { View, Text, Picker, Input } from "@tarojs/components"
import Taro, { useDidShow } from "@tarojs/taro"
import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import * as relation from "./relation"
import "./index.scss"
import { WordDetailPanel, EChart, FloatingPanel } from "@/components"
import {
  fetchPath,
  convertApiSubgraphToWordGraph,
  type ApiPathResult,
  type ApiSubgraph,
} from "./graph-api"

type WordGraphNode = {
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

type WordGraph = Record<string, WordGraphNode>

type PathMode = "strongest" | "shortest" | "showAll"
type GraphDirection = "auto" | "horizontal" | "vertical"

interface PathCandidate {
  path: string[]
  score: number
  hops: number
}

interface WordInfo {
  word: string
  phonetic: string
  starred: boolean
  partOfSpeech: string
  level: string
  definition: string
  examples: string[]
  relations: Array<{ word: string; type: string; strength: number }>
  isCenter: boolean
}

interface EdgeInfo {
  type: string
  word: string
  targetWord: string
  examples: string[]
  strength: number
}

interface RouteQuery {
  source: string
  target: string
  maxDepth: number
}

const RELATION_LABELS: Record<string, string> = {
  all: "全部关系",
  semantic: "语义关系",
  formal: "形式关系",
  morphological: "形态关系",
  associative: "联想与用法关系",
}

const PATH_MODE_RANGE = ["最强相关", "最短路径", "全部路径"]
const PATH_MODE_LABELS: Record<PathMode, string> = {
  strongest: "最强相关",
  shortest: "最短路径",
  showAll: "全部路径",
}

const GROUP_COLORS: Record<string, string> = {
  semantic: "#34C759",
  formal: "#007AFF",
  morphological: "#AF52DE",
  associative: "#FF9500",
}

// Debug-only layout knob. Keep "auto" for normal usage.
const DEBUG_GRAPH_DIRECTION: GraphDirection = "auto"

function emptyWordInfo(): WordInfo {
  return {
    word: "",
    phonetic: "",
    starred: false,
    partOfSpeech: "",
    level: "",
    definition: "",
    examples: [],
    relations: [],
    isCenter: false,
  }
}

function emptyEdgeInfo(): EdgeInfo {
  return { type: "", word: "", targetWord: "", examples: [], strength: 0 }
}

function resolveRouteQuery(): RouteQuery | null {
  try {
    const instance = Taro.getCurrentInstance()
    const params = (instance?.router?.params || {}) as any
    const raw = params.words
    if (!raw) return null
    return JSON.parse(decodeURIComponent(raw)) as RouteQuery
  } catch {
    return null
  }
}

function normalizeSubgraph(subgraph: ApiSubgraph): WordGraph {
  return convertApiSubgraphToWordGraph(subgraph) as WordGraph
}

function buildPathEdgeKey(source: string, target: string): string {
  return `${source}__${target}`
}

function isCollapseNodeId(nodeId: string): boolean {
  return nodeId.startsWith(COLLAPSE_NODE_PREFIX)
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

function buildMultiPathOption(params: {
  pathGraph: WordGraph
  sourceWord: string
  targetWord: string
  visibleTypes: Set<string>
  removedNodeIds: Set<string>
  activePath: PathCandidate | null
  overlayPaths: PathCandidate[]
  showAllPaths: boolean
}): { option: any; availableGroupKeys: string[] } | null {
  const {
    pathGraph,
    sourceWord,
    targetWord,
    visibleTypes,
    removedNodeIds,
    activePath,
    overlayPaths,
    showAllPaths,
  } = params

  const nodeIds = Object.keys(pathGraph)
  if (!nodeIds.length) return null

  const activePathWords = activePath ? new Set(activePath.path) : new Set<string>()
  const overlayPathWords = showAllPaths ? buildPathCandidateSet(overlayPaths) : activePathWords
  const activePathEdges = activePath ? buildPathEdgeSet([activePath]) : new Set<string>()
  const overlayPathEdges = showAllPaths ? buildPathEdgeSet(overlayPaths) : activePathEdges

  const categories: any[] = [
    { name: "起点", itemStyle: { color: "#34C759" } },
    { name: "终点", itemStyle: { color: "#FF2D55" } },
    { name: "路径节点", itemStyle: { color: "#007AFF" } },
    { name: "上下文", itemStyle: { color: "#CBD5E1" } },
  ]
  const catMap = new Map<string, number>([
    ["source", 0],
    ["target", 1],
    ["path", 2],
    ["context", 3],
  ])
  const availableGroupKeys = new Set<string>()

  const nodes: any[] = []
  const edges: any[] = []
  const addedNodeIds = new Set<string>()

  nodeIds.forEach((word) => {
    if (removedNodeIds.has(word)) return
    if (!pathGraph[word]) return

    addedNodeIds.add(word)
    const isSource = word === sourceWord
    const isTarget = word === targetWord
    const isOnPath = overlayPathWords.has(word) && !isSource && !isTarget
    const isContext = !isSource && !isTarget && !isOnPath

    nodes.push({
      id: word,
      name: word,
      x: isSource ? 48 : isTarget ? 348 : undefined,
      y: isSource || isTarget ? 180 : undefined,
      fixed: isSource || isTarget,
      symbolSize: isSource || isTarget ? 46 : isOnPath ? 36 : 26,
      category: isSource ? 0 : isTarget ? 1 : isOnPath ? 2 : 3,
      itemStyle: isContext
        ? {
            color: "#FFFFFF",
            borderColor: "#E2E8F0",
            borderWidth: 1.5,
            opacity: 0.55,
          }
        : {
            color: "#FFFFFF",
            borderColor: isSource ? "#34C759" : isTarget ? "#FF2D55" : "#007AFF",
            borderWidth: isSource || isTarget ? 3 : 2.2,
          },
      label: {
        show: !isContext || isSource || isTarget,
        fontSize: isSource || isTarget ? 13 : 11,
        fontWeight: (isSource || isTarget ? "bold" : "normal") as any,
        color: isSource ? "#12805A" : isTarget ? "#C81E4A" : "#1F2937",
      },
    })
  })

  const edgeSet = new Set<string>()
  nodeIds.forEach((word) => {
    if (removedNodeIds.has(word)) return
    const entry = pathGraph[word]
    if (!entry) return

    entry.relations.forEach((rel) => {
      if (!visibleTypes.has(rel.type)) return
      if (removedNodeIds.has(rel.word)) return
      if (!addedNodeIds.has(rel.word)) return

      const edgeKey = buildPathEdgeKey(word, rel.word)
      const reverseEdgeKey = buildPathEdgeKey(rel.word, word)
      if (edgeSet.has(edgeKey) || edgeSet.has(reverseEdgeKey)) return
      edgeSet.add(edgeKey)

      const color = relation.getRelationColor(rel.type)
      const group = relation.getRelationGroup(rel.type) || "other"
      if (group !== "other" && !catMap.has(group)) {
        catMap.set(group, categories.length)
        categories.push({
          name: relation.getRelationGroupLabel(group),
          itemStyle: { color: GROUP_COLORS[group] || color },
        })
        availableGroupKeys.add(group)
      }

      const isActiveEdge = activePathEdges.has(edgeKey) || activePathEdges.has(reverseEdgeKey)
      const isOverlayEdge = overlayPathEdges.has(edgeKey) || overlayPathEdges.has(reverseEdgeKey)

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
          : isOverlayEdge
            ? { width: 2.5, color, opacity: 0.85, curveness: 0.12 }
            : { width: 1, color: "#CBD5E1", opacity: 0.42, curveness: 0.15 },
      })
    })
  })

  return {
    availableGroupKeys: Array.from(availableGroupKeys),
    option: {
      backgroundColor: "transparent",
      animationDuration: 260,
      animationEasingUpdate: "quarticOut",
      legend: {
        show: false,
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          categories,
          nodes,
          edges,
          zoom: 0.92,
          force: {
            initIterations: 180,
            repulsion: 620,
            edgeLength: [72, 180],
            gravity: 0.06,
            friction: 0.5,
          },
          emphasis: {
            focus: "adjacency" as const,
            lineStyle: { width: 6 },
            itemStyle: { borderWidth: 4 },
          },
          scaleLimit: { min: 0.24, max: 4.5 },
        },
      ],
    },
  }
}

const SINGLE_PATH_VISIBLE_HEAD = 2
const SINGLE_PATH_VISIBLE_TAIL = 2
const SINGLE_PATH_COLLAPSE_THRESHOLD = 7
const COLLAPSE_NODE_PREFIX = "__collapse__"

function buildCollapsedPathView(pathWords: string[], expanded: boolean): {
  displayPath: string[]
  collapseNodeId: string | null
  hiddenCount: number
} {
  if (expanded || pathWords.length <= SINGLE_PATH_COLLAPSE_THRESHOLD) {
    return { displayPath: pathWords, collapseNodeId: null, hiddenCount: 0 }
  }

  const hiddenCount = Math.max(
    0,
    pathWords.length - SINGLE_PATH_VISIBLE_HEAD - SINGLE_PATH_VISIBLE_TAIL,
  )

  return {
    displayPath: [
      ...pathWords.slice(0, SINGLE_PATH_VISIBLE_HEAD),
      `${COLLAPSE_NODE_PREFIX}${hiddenCount}`,
      ...pathWords.slice(pathWords.length - SINGLE_PATH_VISIBLE_TAIL),
    ],
    collapseNodeId: `${COLLAPSE_NODE_PREFIX}${hiddenCount}`,
    hiddenCount,
  }
}

function resolveGraphDirection(
  pathWords: string[],
  windowWidth: number,
  windowHeight: number,
): Exclude<GraphDirection, "auto"> {
  if (DEBUG_GRAPH_DIRECTION !== "auto") return DEBUG_GRAPH_DIRECTION
  if (pathWords.length <= 4) return "horizontal"
  return windowWidth >= windowHeight ? "horizontal" : "vertical"
}

function buildSinglePathOption(params: {
  pathGraph: WordGraph
  sourceWord: string
  targetWord: string
  visibleTypes: Set<string>
  removedNodeIds: Set<string>
  pathWords: string[]
  pathCollapseExpanded: boolean
  graphDirection: Exclude<GraphDirection, "auto">
}): { option: any; availableGroupKeys: string[]; collapseNodeId: string | null; hiddenCount: number } | null {
  const {
    pathGraph,
    sourceWord,
    targetWord,
    visibleTypes,
    removedNodeIds,
    pathWords,
    pathCollapseExpanded,
    graphDirection,
  } = params

  if (!pathWords.length) return null

  const collapsed = buildCollapsedPathView(pathWords, pathCollapseExpanded)
  const displayPath = collapsed.displayPath
  const displaySet = new Set(displayPath)
  const availableGroupKeys = new Set<string>()
  const nodes: any[] = []
  const edges: any[] = []
  const horizontal = graphDirection === "horizontal"
  const primaryStart = horizontal ? 82 : 70
  const primaryEnd = horizontal ? 520 : 302
  const crossAxis = horizontal ? 188 : 232
  const step = displayPath.length > 1 ? (primaryEnd - primaryStart) / (displayPath.length - 1) : 0

  displayPath.forEach((word, index) => {
    const primary = primaryStart + step * index
    const x = horizontal ? primary : crossAxis
    const y = horizontal ? crossAxis : primary
    if (word.startsWith(COLLAPSE_NODE_PREFIX)) {
      nodes.push({
        id: word,
        name: `+${collapsed.hiddenCount}`,
        x,
        y,
        fixed: true,
        symbolSize: 42,
        category: 2,
        itemStyle: {
          color: "#F5F3FF",
          borderColor: "#8B5CF6",
          borderWidth: 2.5,
          borderType: "dashed" as any,
        },
        label: {
          show: true,
          formatter: `+${collapsed.hiddenCount}`,
          fontSize: 13,
          fontWeight: "bold" as const,
          color: "#6D28D9",
        },
        tooltip: {
          show: true,
          formatter: `隐藏 ${collapsed.hiddenCount} 个中间 hop`,
        },
      })
      return
    }

    if (removedNodeIds.has(word)) return
    const entry = pathGraph[word]
    if (!entry) return

    const isSource = word === sourceWord
    const isTarget = word === targetWord
    nodes.push({
      id: word,
      name: word,
      x,
      y,
      fixed: true,
      symbolSize: isSource || isTarget ? 46 : 36,
      category: isSource ? 0 : isTarget ? 1 : 2,
      itemStyle: {
        color: "#FFFFFF",
        borderColor: isSource ? "#34C759" : isTarget ? "#FF2D55" : "#007AFF",
        borderWidth: isSource || isTarget ? 3 : 2.2,
      },
      label: {
        show: true,
        fontSize: isSource || isTarget ? 13 : 12,
        fontWeight: (isSource || isTarget ? "bold" : "normal") as any,
        color: isSource ? "#12805A" : isTarget ? "#C81E4A" : "#1F2937",
      },
      emphasis: { scale: true },
    })
  })

  const pathWordsSet = new Set(pathWords)
  const visiblePath = displayPath.filter((word) => !word.startsWith(COLLAPSE_NODE_PREFIX))
  visiblePath.forEach((word, index) => {
    const entry = pathGraph[word]
    if (!entry) return
    entry.relations.forEach((rel) => {
      if (!visibleTypes.has(rel.type)) return
      if (removedNodeIds.has(rel.word)) return
      if (!displaySet.has(rel.word) && !pathWordsSet.has(rel.word)) return
      const group = relation.getRelationGroup(rel.type) || "other"
      if (group !== "other") availableGroupKeys.add(group)
    })

    if (index >= visiblePath.length - 1) return
    const nextWord = visiblePath[index + 1]
    const rel = entry.relations.find((item) => item.word === nextWord)
    const color = rel ? relation.getRelationColor(rel.type) : "#007AFF"
    const label = rel ? relation.getRelationLabel(rel.type) : "路径"
    edges.push({
      source: word,
      target: nextWord,
      symbol: ["none", "arrow"],
      symbolSize: [0, 10],
      label: {
        show: true,
        formatter: label,
        fontSize: 10,
        color: "#64748B",
      },
      lineStyle: rel
        ? { width: 4, color, opacity: 1 }
        : { width: 2.5, color: "#007AFF", opacity: 0.85 },
    })
  })

  if (collapsed.collapseNodeId) {
    const collapseIndex = displayPath.indexOf(collapsed.collapseNodeId)
    const leftWord = displayPath[collapseIndex - 1]
    const rightWord = displayPath[collapseIndex + 1]
    if (leftWord && rightWord) {
      edges.push({
        source: leftWord,
        target: collapsed.collapseNodeId,
        symbol: ["none", "arrow"],
        symbolSize: [0, 10],
        label: {
          show: true,
          formatter: `隐藏 ${collapsed.hiddenCount} hop`,
          fontSize: 10,
          color: "#7C3AED",
        },
        lineStyle: {
          width: 2,
          color: "#8B5CF6",
          opacity: 0.9,
          type: "dashed" as any,
        },
      })
      edges.push({
        source: collapsed.collapseNodeId,
        target: rightWord,
        symbol: ["none", "arrow"],
        symbolSize: [0, 10],
        label: { show: false },
        lineStyle: {
          width: 2,
          color: "#8B5CF6",
          opacity: 0.9,
          type: "dashed" as any,
        },
      })
    }
  }

  return {
    availableGroupKeys: Array.from(availableGroupKeys),
    collapseNodeId: collapsed.collapseNodeId,
    hiddenCount: collapsed.hiddenCount,
    option: {
      backgroundColor: "transparent",
      animationDuration: 220,
      animationEasingUpdate: "quarticOut",
      legend: { show: false },
      series: [
        {
          type: "graph",
          layout: "none",
          roam: true,
          draggable: false,
          categories: [
            { name: "起点", itemStyle: { color: "#34C759" } },
            { name: "终点", itemStyle: { color: "#FF2D55" } },
            { name: "路径节点", itemStyle: { color: "#007AFF" } },
          ],
          nodes,
          edges,
          zoom: 1,
          force: {
            initIterations: 0,
            repulsion: 0,
            edgeLength: 0,
            gravity: 0,
            friction: 0,
          },
          emphasis: {
            focus: "adjacency" as const,
            lineStyle: { width: 6 },
            itemStyle: { borderWidth: 4 },
          },
          scaleLimit: { min: 0.7, max: 2.2 },
        },
      ],
    },
  }
}

function computeVisibleTypes(filterKey: string): Set<string> {
  const types = filterKey === "all"
    ? Object.values(relation.RELATION_TYPES)
    : relation.RELATION_GROUPS[filterKey] || []
  return new Set(types)
}

function toPathCandidates(result: ApiPathResult | null): PathCandidate[] {
  if (!result) return []
  const rawPaths = result.allPaths?.length
    ? result.allPaths
    : [{ path: result.path, score: result.score, hops: result.hops }]

  return rawPaths
    .filter((item) => item.path.length > 0)
    .map((item) => ({
      path: item.path,
      score: item.score,
      hops: item.hops ?? Math.max(0, item.path.length - 1),
    }))
}

function filterCandidatesByShowAllHop(
  candidates: PathCandidate[],
  availableHops: number[],
  showAllDepthIdx: number,
): PathCandidate[] {
  if (showAllDepthIdx === 0) return candidates
  const hop = availableHops[showAllDepthIdx - 1]
  if (hop == null) return candidates
  return candidates.filter((item) => item.hops === hop)
}

export default function RelationPathPage() {
  const route = useMemo(() => resolveRouteQuery(), [])
  const initializedRef = useRef(false)
  const filterRef = useRef("all")
  const sourceRef = useRef(route?.source || "")
  const targetRef = useRef(route?.target || "")
  const depthRef = useRef(route?.maxDepth || 5)
  const modeRef = useRef<PathMode>("strongest")

  const [pathSubgraph, setPathSubgraph] = useState<WordGraph>({})
  const [pathResult, setPathResult] = useState<ApiPathResult | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading")
  const [sourceWord, setSourceWord] = useState(route?.source || "")
  const [targetWord, setTargetWord] = useState(route?.target || "")
  const [pathMode, setPathMode] = useState<PathMode>("strongest")
  const [maxDepth, setMaxDepth] = useState(route?.maxDepth || 5)
  const [showAllPaths, setShowAllPaths] = useState(false)
  const [pathCollapseExpanded, setPathCollapseExpanded] = useState(false)
  const [showAllDepthIdx, setShowAllDepthIdx] = useState(0)
  const [currentPathIdx, setCurrentPathIdx] = useState(0)
  const [removedNodeIds, setRemovedNodeIds] = useState<Set<string>>(new Set())
  const [filterKey, setFilterKey] = useState<string>("all")
  const [starredWords, setStarredWords] = useState<Set<string>>(new Set())
  const [showSearch, setShowSearch] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)

  const [showDetail, setShowDetail] = useState(false)
  const [detailNode, setDetailNode] = useState<WordInfo>(emptyWordInfo())
  const [groupedRelations, setGroupedRelations] = useState<
    Record<string, Array<{ word: string; type: string; strength: number }>>
  >({})
  const [showEdgeDetail, setShowEdgeDetail] = useState(false)
  const [edgeDetail, setEdgeDetail] = useState<EdgeInfo>(emptyEdgeInfo())
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    nodeId: string
  }>({ show: false, x: 0, y: 0, nodeId: "" })

  const chartRef = useRef<any>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTypes = useMemo(() => computeVisibleTypes(filterKey), [filterKey])

  const pathCandidates = useMemo(() => {
    const base = toPathCandidates(pathResult)
    if (pathMode !== "showAll") return base
    return filterCandidatesByShowAllHop(base, pathResult?.availableHops || [], showAllDepthIdx)
  }, [pathResult, pathMode, showAllDepthIdx])

  const currentPath = useMemo(
    () => pathCandidates[currentPathIdx] || pathCandidates[0] || null,
    [pathCandidates, currentPathIdx],
  )

  const pathWords = currentPath?.path || []
  const hops = currentPath?.hops ?? Math.max(0, pathWords.length - 1)
  const pathLabel = useMemo(() => pathWords.join(" → "), [pathWords])

  const depthOptions = useMemo(() => {
    const hopsList = pathResult?.availableHops || []
    return hopsList.length > 0 ? hopsList : [maxDepth]
  }, [pathResult, maxDepth])

  const showAllDepthOptions = useMemo(() => {
    const hopsList = pathResult?.availableHops || []
    return ["不限", ...hopsList.map((d) => `${d}步`)]
  }, [pathResult])

  const pathModeIndex = useMemo(() => {
    if (pathMode === "shortest") return 1
    if (pathMode === "showAll") return 2
    return 0
  }, [pathMode])
  const depthIndex = useMemo(() => {
    const idx = depthOptions.indexOf(maxDepth)
    return idx >= 0 ? idx : 0
  }, [depthOptions, maxDepth])

  const windowInfo = Taro.getWindowInfo()
  const windowWidth = windowInfo.windowWidth
  const windowHeight = windowInfo.windowHeight
  const wordAnchors = [0, Math.round(0.3 * windowHeight), Math.round(0.8 * windowHeight)]
  const relationAnchors = [0, Math.round(0.3 * windowHeight)]
  const graphDirection = resolveGraphDirection(pathWords, windowWidth, windowHeight)

  const fetchPathResult = useCallback(async (
    src: string,
    tgt: string,
    depth: number,
    explicitMode?: PathMode,
    explicitFilter?: string,
  ) => {
    const mode = explicitMode || modeRef.current
    const filter = explicitFilter ?? filterRef.current
    setStatus("loading")

    try {
      const result = await fetchPath({
        source: src,
        target: tgt,
        mode,
        maxDepth: Math.max(1, depth),
        multiPath: true,
        filter,
      })

      if (result.path.length === 0) {
        setStatus("empty")
        Taro.showToast({
          title: `未找到 ${src} → ${tgt} 的路径`,
          icon: "error",
          duration: 3000,
        })
        return
      }

      sourceRef.current = src
      targetRef.current = tgt
      depthRef.current = depth
      modeRef.current = mode

      setSourceWord(src)
      setTargetWord(tgt)
      setMaxDepth(depth)
      setPathMode(mode)
      setPathResult(result)
      setPathSubgraph(normalizeSubgraph(result.subgraph))
      setCurrentPathIdx(0)
      setPathCollapseExpanded(false)
      setStatus("ready")
    } catch {
      setStatus("empty")
      Taro.showToast({
        title: "路径计算失败",
        icon: "error",
        duration: 2500,
      })
    }
  }, [])

  const filteredPaths = useMemo(() => pathCandidates, [pathCandidates])
  const overlayPaths = useMemo(
    () => (showAllPaths ? filteredPaths : currentPath ? [currentPath] : []),
    [showAllPaths, filteredPaths, currentPath],
  )

  useEffect(() => {
    if (filteredPaths.length === 0) {
      if (currentPathIdx !== 0) setCurrentPathIdx(0)
      return
    }
    if (currentPathIdx >= filteredPaths.length) {
      setCurrentPathIdx(0)
    }
  }, [filteredPaths, currentPathIdx])

  const { availableGroupKeys, chartOption } = useMemo(() => {
    const result = showAllPaths
      ? buildMultiPathOption({
          pathGraph: pathSubgraph,
          sourceWord,
          targetWord,
          visibleTypes,
          removedNodeIds,
          activePath: currentPath,
          overlayPaths,
          showAllPaths,
        })
      : buildSinglePathOption({
          pathGraph: pathSubgraph,
          sourceWord,
          targetWord,
          visibleTypes,
          removedNodeIds,
          pathWords,
          pathCollapseExpanded,
          graphDirection,
        })
    if (!result) {
      return { availableGroupKeys: [] as string[], chartOption: null as any }
    }
    return { availableGroupKeys: result.availableGroupKeys, chartOption: result.option }
  }, [
    pathSubgraph,
    sourceWord,
    targetWord,
    visibleTypes,
    filterKey,
    removedNodeIds,
    currentPath,
    overlayPaths,
    showAllPaths,
    pathWords,
    pathCollapseExpanded,
    graphDirection,
  ])

  const relationPickerKeysWithAll = useMemo(
    () => ["all", ...availableGroupKeys],
    [availableGroupKeys],
  )
  const relationPickerRangeWithAll = useMemo(
    () => ["全部关系", ...availableGroupKeys.map((k) => RELATION_LABELS[k] || k)],
    [availableGroupKeys],
  )
  const relationFilterIndexWithAll = useMemo(
    () => Math.max(0, relationPickerKeysWithAll.indexOf(filterKey)),
    [relationPickerKeysWithAll, filterKey],
  )

  const browseToPath = useCallback((idx: number) => {
    const next = filteredPaths[idx]
    if (!next) return
    setCurrentPathIdx(idx)
    setPathCollapseExpanded(false)
  }, [filteredPaths])

  useDidShow(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const instance = Taro.getCurrentInstance()
    const params = (instance?.router?.params || {}) as any
    const raw = params.words
    if (!raw) {
      setStatus("empty")
      return
    }

    let query: RouteQuery
    try {
      query = JSON.parse(decodeURIComponent(raw)) as RouteQuery
    } catch {
      setStatus("empty")
      return
    }

    sourceRef.current = query.source
    targetRef.current = query.target
    depthRef.current = query.maxDepth

    setSourceWord(query.source)
    setTargetWord(query.target)
    setMaxDepth(query.maxDepth)
    setStatus("loading")

    Taro.setNavigationBarTitle({ title: `${query.source} → ${query.target}` })
    fetchPathResult(query.source, query.target, query.maxDepth, modeRef.current)
  })

  useEffect(() => {
    if (pathMode !== "showAll" && !depthOptions.includes(maxDepth)) {
      const nextDepth = depthOptions[0]
      setMaxDepth(nextDepth)
      depthRef.current = nextDepth
    }
  }, [depthOptions, maxDepth, pathMode])

  const onFilterChange = useCallback((e: any) => {
    const key = relationPickerKeysWithAll[e.detail.value]
    if (!key) return
    setFilterKey(key)
    filterRef.current = key
    if (sourceRef.current && targetRef.current) {
      fetchPathResult(sourceRef.current, targetRef.current, depthRef.current, modeRef.current, key)
    }
  }, [fetchPathResult, relationPickerKeysWithAll])

  const onPathModeChange = useCallback((e: any) => {
    const rawValue = Number(e.detail.value)
    const mode: PathMode = rawValue === 0 ? "strongest" : rawValue === 1 ? "shortest" : "showAll"
    setPathMode(mode)
    modeRef.current = mode
    if (sourceRef.current && targetRef.current) {
      fetchPathResult(sourceRef.current, targetRef.current, depthRef.current, mode, filterRef.current)
    }
  }, [fetchPathResult])

  const onDepthChange = useCallback((e: any) => {
    const idx = Number(e.detail.value)
    if (pathMode === "showAll") {
      setShowAllDepthIdx(idx)
      setCurrentPathIdx(0)
      return
    }

    const nextDepth = depthOptions[idx]
    if (!nextDepth) return
    setMaxDepth(nextDepth)
    depthRef.current = nextDepth
    if (sourceRef.current && targetRef.current) {
      fetchPathResult(sourceRef.current, targetRef.current, nextDepth, pathMode, filterRef.current)
    }
  }, [depthOptions, fetchPathResult, pathMode])

  const showNodeDetail = useCallback((nodeId: string) => {
    const entry = pathSubgraph[nodeId]
    if (!entry) return
    const grouped = entry.relations.reduce((acc: Record<string, Array<{ word: string; type: string; strength: number }>>, rel) => {
      const group = relation.getRelationGroup(rel.type)
      if (!group) return acc
      ;(acc[group] ??= []).push(rel)
      return acc
    }, {})
    setDetailNode({
      ...entry,
      isCenter: nodeId === sourceWord,
      starred: starredWords.has(nodeId),
    })
    setGroupedRelations(grouped)
    setShowDetail(true)
    setShowEdgeDetail(false)
  }, [pathSubgraph, sourceWord, starredWords])

  const showEdgeRelationDetail = useCallback((source: string, target: string) => {
    const entry = pathSubgraph[source]
    if (!entry) return
    const rel = entry.relations.find((item) => item.word === target)
    setEdgeDetail({
      type: rel ? relation.getRelationLabel(rel.type) : "关系",
      word: source,
      targetWord: target,
      examples: [],
      strength: rel?.strength ?? 0,
    })
    setShowEdgeDetail(true)
    setShowDetail(false)
  }, [pathSubgraph])

  const hideDetails = useCallback(() => {
    setShowDetail(false)
    setShowEdgeDetail(false)
  }, [])

  const hideContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, nodeId: "" })
    chartRef.current?.downplay?.()
  }, [])

  const handleNavigateToWord = useCallback((word: string) => {
    if (!pathSubgraph[word]) return
    hideDetails()
    Taro.navigateTo({ url: `/pages/relation/index?word=${encodeURIComponent(word)}&mode=singleRelation` })
  }, [hideDetails, pathSubgraph])

  const handlePlayExample = useCallback(async () => {
    Taro.showToast({ title: "TTS 暂未接入", icon: "none" })
  }, [])

  const handleSearchSubmit = useCallback(() => {
    const raw = searchText.trim()
    if (!raw) return

    const parts = raw.split(/\s+/).filter(Boolean)
    let newSource = sourceRef.current
    let newTarget = ""

    if (parts.length >= 2) {
      newSource = parts[0]
      newTarget = parts[1]
    } else {
      newTarget = parts[0]
    }

    sourceRef.current = newSource
    targetRef.current = newTarget
    setShowSearch(false)
    setSearchText("")
    Taro.setNavigationBarTitle({ title: `${newSource} → ${newTarget}` })
    fetchPathResult(newSource, newTarget, depthRef.current, modeRef.current, filterRef.current)
  }, [fetchPathResult, searchText])

  const handleContextMenuAction = useCallback((action: string) => {
    const nodeId = contextMenu.nodeId
    hideContextMenu()

    if (action === "detail") {
      showNodeDetail(nodeId)
      return
    }

    if (action === "star") {
      setStarredWords((prev) => {
        const next = new Set(prev)
        next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
        return next
      })
      return
    }

    if (action === "center") {
      hideDetails()
      Taro.navigateTo({ url: `/pages/relation/index?word=${encodeURIComponent(nodeId)}&mode=singleRelation` })
      return
    }

    if (action === "remove") {
      setRemovedNodeIds((prev) => {
        const next = new Set(prev)
        next.add(nodeId)
        return next
      })
    }
  }, [contextMenu.nodeId, hideContextMenu, hideDetails, showNodeDetail])

  const handleChartMousedown = useCallback((params: any) => {
    if (params.dataType !== "node") return
    const nodeId = params.data.id ?? params.name
    if (isCollapseNodeId(nodeId)) return
    longPressTimer.current = setTimeout(() => {
      setContextMenu({
        show: true,
        x: params.event?.offsetX ?? 0,
        y: params.event?.offsetY ?? 0,
        nodeId,
      })
    }, 500)
  }, [])

  const handleChartMouseup = useCallback((params: any) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (params.dataType === "edge" && params.data) {
      if (isCollapseNodeId(params.data.source) || isCollapseNodeId(params.data.target)) return
      showEdgeRelationDetail(params.data.source, params.data.target)
    }
  }, [showEdgeRelationDetail])

  const handleChartClick = useCallback((params: any) => {
    if (contextMenu.show) return
    if (params.dataType === "node") {
      const nodeId = params.data.id ?? params.name
      if (isCollapseNodeId(nodeId)) {
        setPathCollapseExpanded((prev) => !prev)
        return
      }
      showNodeDetail(nodeId)
    } else if (params.dataType === "edge") {
      if (isCollapseNodeId(params.data.source) || isCollapseNodeId(params.data.target)) return
      showEdgeRelationDetail(params.data.source, params.data.target)
    }
  }, [contextMenu.show, showEdgeRelationDetail, showNodeDetail])

  const refChart = useCallback((node: any) => {
    chartRef.current = node
  }, [])

  useEffect(() => {
    if (chartRef.current && chartOption) {
      chartRef.current.refresh?.(chartOption)
    }
  }, [chartOption])

  const relationModeLabel = RELATION_LABELS[filterKey] ?? "全部关系"
  const currentPathCount = filteredPaths.length
  const currentPathIndexLabel = currentPathCount > 0 ? `${Math.min(currentPathIdx + 1, currentPathCount)}/${currentPathCount}` : "0/0"

  return (
    <View className="relation-page relation-path-page">
      <View className="relation-page-container relation-path-page-container">
        <View className="header">
          <View className="rp-header-top">
            <View className="rp-header-title">
              <Text className="rp-header-kicker">Relation Path</Text>
              <Text className="rp-header-main">{sourceWord} → {targetWord}</Text>
              <Text className="rp-header-sub">
                {showAllPaths
                  ? `${currentPathCount} 条路径`
                  : pathLabel || "单路径浏览"}
              </Text>
            </View>
            {!showSearch && (
              <View className="rp-header-actions">
                <View className="rp-header-icon" onClick={() => setShowSearch(true)} />
              </View>
            )}
          </View>

          <View className={`rp-header-controls ${showSearch ? "collapsed" : ""}`}>
            <Picker mode="selector" range={relationPickerRangeWithAll} value={relationFilterIndexWithAll} onChange={onFilterChange}>
              <View className="picker">关系: {relationModeLabel}</View>
            </Picker>
            <Picker mode="selector" range={PATH_MODE_RANGE} value={pathModeIndex} onChange={onPathModeChange}>
              <View className="picker">路径: {PATH_MODE_LABELS[pathMode]}</View>
            </Picker>
            {pathMode === "showAll" ? (
              <Picker mode="selector" range={showAllDepthOptions} value={showAllDepthIdx} onChange={onDepthChange}>
                <View className="picker">步数: {showAllDepthOptions[showAllDepthIdx]}</View>
              </Picker>
            ) : (
              <Picker mode="selector" range={depthOptions.map((d) => `最大 ${d} 步`)} value={depthIndex} onChange={onDepthChange}>
                <View className="picker">步数: {depthOptions[depthIndex] ?? maxDepth}</View>
              </Picker>
            )}
            <View className="multi-path-toggle" onClick={() => setShowAllPaths((prev) => !prev)}>
              <View className={`multi-path-check ${showAllPaths ? "checked" : ""}`}>
                {showAllPaths && <Text className="multi-path-check-icon">✓</Text>}
              </View>
              <Text className="multi-path-label">多路径</Text>
            </View>
            <View className="rp-header-actions">
              <View className="rp-header-icon" onClick={() => setShowSearch(true)} />
            </View>
          </View>

          <View className={`header-search ${showSearch ? "expanded" : ""}`}>
            <View className={`search-bar-pill ${searchFocused ? "focused" : ""}`}>
              <Input
                className="search-input"
                value={searchText}
                placeholder={`${sourceWord || "start"} → ${targetWord || "target"}  或 'A B'`}
                focus={showSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onInput={(e: any) => setSearchText(e.detail.value)}
                onConfirm={handleSearchSubmit}
              />
              {searchText.length > 0 && (
                <View className="search-submit" onClick={handleSearchSubmit}>
                  <Text>搜索</Text>
                </View>
              )}
              <View className="search-close" onClick={() => { setShowSearch(false); setSearchText("") }}>
                <Text>✕</Text>
              </View>
            </View>
          </View>
        </View>

        {status === "ready" && !showAllPaths && (
          <View className="rp-path-breadcrumb">
            <View
              className="rp-path-nav"
              onClick={() => {
                if (filteredPaths.length <= 1) return
                const prev = (currentPathIdx - 1 + filteredPaths.length) % filteredPaths.length
                browseToPath(prev)
              }}
            >
              <Text className={`rp-path-nav-arrow ${filteredPaths.length > 1 ? "" : "disabled"}`}>◀</Text>
            </View>
            <Text className="rp-path-text">{pathLabel || "当前路径"}</Text>
            <Text className="rp-path-stats">{hops} hop{hops === 1 ? "" : "s"}</Text>
            <Text className="rp-path-counter">{currentPathIndexLabel}</Text>
            <View
              className="rp-path-nav"
              onClick={() => {
                if (filteredPaths.length <= 1) return
                const next = (currentPathIdx + 1) % filteredPaths.length
                browseToPath(next)
              }}
            >
              <Text className={`rp-path-nav-arrow ${filteredPaths.length > 1 ? "" : "disabled"}`}>▶</Text>
            </View>
          </View>
        )}

        {status === "ready" && showAllPaths && (
          <View className="rp-path-breadcrumb">
            <Text className="rp-path-text">
              全部路径 ({currentPathCount} 条){pathMode === "showAll" && showAllDepthIdx > 0 ? ` · ${showAllDepthOptions[showAllDepthIdx]}` : ""}
            </Text>
          </View>
        )}

        <View className="canvas-holder">
          {status === "loading" && (
            <View className="rp-loading">
              <Text>计算路径中…</Text>
            </View>
          )}
          {status === "empty" && (
            <View className="rp-loading">
              <Text>未找到路径</Text>
              <Text className="rp-hint">尝试切换路径模式或增加步数</Text>
            </View>
          )}
          {status === "ready" && (
            <EChart
              ref={refChart}
              canvasId="relation-graph"
              onClick={handleChartClick}
              onMousedown={handleChartMousedown}
              onMouseup={handleChartMouseup}
            />
          )}
          {contextMenu.show && (
            <View className="ctx-backdrop" onTouchStart={hideContextMenu} />
          )}
          {contextMenu.show && (
            <View className="ctx-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <View className="ctx-menu-item" onClick={() => handleContextMenuAction("detail")}>
                <Text className="ctx-menu-icon">ℹ</Text>
                <Text>查看详情</Text>
              </View>
              <View className="ctx-menu-item" onClick={() => handleContextMenuAction("star")}>
                <Text className="ctx-menu-icon">{starredWords.has(contextMenu.nodeId) ? "★" : "☆"}</Text>
                <Text>{starredWords.has(contextMenu.nodeId) ? "取消收藏" : "加入收藏"}</Text>
              </View>
              <View className="ctx-menu-item" onClick={() => handleContextMenuAction("center")}>
                <Text className="ctx-menu-icon">◎</Text>
                <Text>打开单词关系图</Text>
              </View>
              <View className="ctx-menu-item ctx-menu-item--danger" onClick={() => handleContextMenuAction("remove")}>
                <Text className="ctx-menu-icon">✕</Text>
                <Text>从图中移除</Text>
              </View>
            </View>
          )}
        </View>

        {showDetail && <View className="fp-backdrop" onTouchStart={hideDetails} />}
        {showDetail && (
          <FloatingPanel
            key={`word-${detailNode.word}`}
            className="word-detail-panel"
            anchors={wordAnchors}
            height={wordAnchors[1]}
            onClose={hideDetails}
            renderHeader={
              <View className="cfp-header-content">
                <View className="cfp-title-row">
                  <Text className="cfp-word">{detailNode.word}</Text>
                  <View className="cfp-meta">
                    {detailNode.partOfSpeech ? (
                      <Text className="cfp-pos">{detailNode.partOfSpeech}</Text>
                    ) : null}
                    {detailNode.level ? (
                      <Text className="cfp-level">{detailNode.level}</Text>
                    ) : null}
                  </View>
                </View>
                {detailNode.phonetic ? (
                  <Text className="cfp-phonetic">{detailNode.phonetic}</Text>
                ) : null}
              </View>
            }
          >
            <WordDetailPanel
              wordData={{
                word: detailNode.word,
                phonetic: detailNode.phonetic,
                partOfSpeech: detailNode.partOfSpeech,
                level: detailNode.level,
                definition: detailNode.definition,
                examples: detailNode.examples,
                relations: detailNode.relations as any[],
                isCenter: detailNode.isCenter,
              }}
              groupedRelations={groupedRelations}
              onNavigateToWord={handleNavigateToWord}
              onPlayExample={handlePlayExample}
            />
          </FloatingPanel>
        )}

        {showEdgeDetail && <View className="fp-backdrop" onTouchStart={hideDetails} />}
        {showEdgeDetail && (
          <FloatingPanel
            key={`edge-${edgeDetail.word}-${edgeDetail.targetWord}`}
            className="relation-detail-panel"
            anchors={relationAnchors}
            height={relationAnchors[1]}
            onClose={hideDetails}
            renderHeader={
              <View className="cfp-header-content">
                <View className="relation-detail-header">
                  <Text className="relation-detail-title">{edgeDetail.type}</Text>
                </View>
              </View>
            }
          >
            <View className="rdp-content">
              <View className="relation-detail-words">
                <Text className="relation-detail-word">{edgeDetail.word}</Text>
                <Text className="relation-detail-arrow">→</Text>
                <Text className="relation-detail-word">{edgeDetail.targetWord}</Text>
              </View>
              {edgeDetail.examples.length > 0 && (
                <View className="relation-detail-examples">
                  {edgeDetail.examples.map((example, index) => (
                    <View key={index} className="relation-detail-example-item">
                      <Text className="list-index">{index + 1}.</Text>
                      <Text className="list-text">{example}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View className="relation-detail-strength">关系强度: {edgeDetail.strength}</View>
            </View>
          </FloatingPanel>
        )}
      </View>
    </View>
  )
}
