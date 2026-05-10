import { View, Text, Input, Switch } from "@tarojs/components"
import Taro, { useDidShow } from "@tarojs/taro"
import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import * as relation from "./relation"
import "./index.scss"
import { WordDetailPanel, EChart, FloatingPanel } from "@/components"
import NavigationBar from "@/components/navigation-bar"
import { Select } from "@/components/select"
import { getNavOffset } from "@/utils/get-nav-offset"
import {
  fetchPath,
  convertApiSubgraphToWordGraph,
  type ApiPathResult,
  type ApiSubgraph,
} from "./graph-api"
import {
  buildSharedGraphOption,
  buildViewportBounds,
  createDefaultStableLayout,
  deriveVisibleGraph,
  type StableLayout as SharedStableLayout,
  type SinglePathVisibilityMode,
} from "./relation-path.shared"

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

const PATH_MODE_LABELS: Record<PathMode, string> = {
  strongest: "最强相关",
  shortest: "最短路径",
  showAll: "全部路径",
}

const SINGLE_PATH_VISIBILITY_MODE: SinglePathVisibilityMode = "hide"

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

function isCollapseNodeId(nodeId: string): boolean {
  return nodeId.startsWith(COLLAPSE_NODE_PREFIX)
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
  stableLayout: SharedStableLayout
  viewport: { left: number; top: number; right: number; bottom: number }
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
    stableLayout,
    viewport,
  } = params
  const visibleGraph = deriveVisibleGraph({
    pathGraph,
    sourceWord,
    targetWord,
    allPaths: showAllPaths ? overlayPaths : activePath ? [activePath] : [],
    currentPathIdx: 0,
    showAllPaths,
    singlePathVisibilityMode: SINGLE_PATH_VISIBILITY_MODE,
    visibleTypes,
    removedNodeIds,
    stableLayout,
    viewport,
  })
  if (!visibleGraph.nodes.length) return null
  return {
    availableGroupKeys: visibleGraph.availableGroupKeys,
    option: buildSharedGraphOption({ graph: visibleGraph, sourceWord, targetWord }),
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
  stableLayout: SharedStableLayout
  viewport: { left: number; top: number; right: number; bottom: number }
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
    stableLayout,
    viewport,
  } = params
  const collapsed = buildCollapsedPathView(pathWords, pathCollapseExpanded)
  void collapsed
  void graphDirection
  if (!pathWords.length) return null
  const visibleGraph = deriveVisibleGraph({
    pathGraph,
    sourceWord,
    targetWord,
    allPaths: [{ path: pathWords, score: 0, hops: Math.max(0, pathWords.length - 1) }],
    currentPathIdx: 0,
    showAllPaths: false,
    singlePathVisibilityMode: SINGLE_PATH_VISIBILITY_MODE,
    visibleTypes,
    removedNodeIds,
    stableLayout,
    viewport,
  })
  if (!visibleGraph.nodes.length) return null
  return {
    availableGroupKeys: visibleGraph.availableGroupKeys,
    collapseNodeId: collapsed.collapseNodeId,
    hiddenCount: collapsed.hiddenCount,
    option: buildSharedGraphOption({ graph: visibleGraph, sourceWord, targetWord }),
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
  const [stableLayout, setStableLayout] = useState<SharedStableLayout>({})
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
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [navOffset, setNavOffset] = useState("")
  const [canvasHodlerMarginTop, setCanvasHolderMarginTop] = useState("")

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
  const renderViewport = useMemo(() => buildViewportBounds({
    layout: stableLayout,
    width: Math.max(windowWidth, 360),
    height: Math.max(Math.floor(windowHeight * 0.58), 320),
  }), [stableLayout, windowHeight, windowWidth])

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
      const normalizedSubgraph = normalizeSubgraph(result.subgraph)

      setPathResult(result)
      setPathSubgraph(normalizedSubgraph)
      setStableLayout(createDefaultStableLayout(normalizedSubgraph, src, tgt))
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
          stableLayout,
          viewport: renderViewport,
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
          stableLayout,
          viewport: renderViewport,
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
    stableLayout,
    renderViewport,
  ])

  const relationFilterOptions = useMemo(
    () => [
      { label: "全部关系", value: "all" },
      ...availableGroupKeys.map((k) => ({ label: RELATION_LABELS[k] || k, value: k })),
    ],
    [availableGroupKeys],
  )

  const pathModeOptions = useMemo(
    () => [
      { label: PATH_MODE_LABELS.strongest, value: "strongest" },
      { label: PATH_MODE_LABELS.shortest, value: "shortest" },
      { label: PATH_MODE_LABELS.showAll, value: "showAll" },
    ],
    [],
  )

  const depthOptionsForSelect = useMemo(() => {
    if (pathMode === "showAll") {
      return showAllDepthOptions.map((label, idx) => ({ label, value: String(idx) }))
    }
    return depthOptions.map((d) => ({ label: `最大 ${d} 步`, value: String(d) }))
  }, [pathMode, showAllDepthOptions, depthOptions])

  const browseToPath = useCallback((idx: number) => {
    const next = filteredPaths[idx]
    if (!next) return
    setCurrentPathIdx(idx)
    setPathCollapseExpanded(false)
  }, [filteredPaths])

  useDidShow(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    setNavOffset(Taro.pxTransform(getNavOffset()-8))
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

    const elemquery = Taro.createSelectorQuery()
    elemquery.select('.rp-header').boundingClientRect()
    elemquery.exec((res) => {
      console.log(res)
      const height = res[0].height
      const marginTop = Taro.pxTransform(height + 8)
      setCanvasHolderMarginTop(marginTop)
    })

    sourceRef.current = query.source
    targetRef.current = query.target
    depthRef.current = query.maxDepth

    setSourceWord(query.source)
    setTargetWord(query.target)
    setMaxDepth(query.maxDepth)
    setStatus("loading")
    fetchPathResult(query.source, query.target, query.maxDepth, modeRef.current)
  })

  useEffect(() => {
    if (pathMode !== "showAll" && !depthOptions.includes(maxDepth)) {
      const nextDepth = depthOptions[0]
      setMaxDepth(nextDepth)
      depthRef.current = nextDepth
    }
  }, [depthOptions, maxDepth, pathMode])

  const onFilterChange = useCallback((value: string | string[]) => {
    const key = String(value)
    if (!key) return
    setFilterKey(key)
    filterRef.current = key
    if (sourceRef.current && targetRef.current) {
      fetchPathResult(sourceRef.current, targetRef.current, depthRef.current, modeRef.current, key)
    }
  }, [fetchPathResult])

  const onPathModeChange = useCallback((value: string | string[]) => {
    const mode = String(value) as PathMode
    setPathMode(mode)
    modeRef.current = mode
    if (sourceRef.current && targetRef.current) {
      fetchPathResult(sourceRef.current, targetRef.current, depthRef.current, mode, filterRef.current)
    }
  }, [fetchPathResult])

  const onDepthChange = useCallback((value: string | string[]) => {
    const val = String(value)
    if (pathMode === "showAll") {
      const idx = Number(val)
      setShowAllDepthIdx(idx)
      setCurrentPathIdx(0)
      return
    }

    const nextDepth = Number(val)
    if (!nextDepth) return
    setMaxDepth(nextDepth)
    depthRef.current = nextDepth
    if (sourceRef.current && targetRef.current) {
      fetchPathResult(sourceRef.current, targetRef.current, nextDepth, pathMode, filterRef.current)
    }
  }, [fetchPathResult, pathMode])

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
        <NavigationBar
          backgroundColor="#ffffff"
          border={true}
        >
          <View className="rp-nav-content">
            <View className="rp-nav-left">
              <View className="rp-back-btn" onClick={() => Taro.navigateBack()}>
                <View className="rp-back-btn-icon" />
              </View>
              <View
                className={`rp-filter-btn ${showFilterPanel ? "active" : ""}`}
                onClick={() => setShowFilterPanel((prev) => !prev)}
              >
                <View className="rp-filter-btn-icon" />
              </View>
            </View>
            <Text className="rp-nav-title">{sourceWord} → {targetWord}</Text>
          </View>
        </NavigationBar>

        <View className="rp-header" style={{ "top": `${navOffset}` }}>
          <View className="rp-header-search">
            <View className="rp-search-icon" />
            <Input
              className="rp-search-input"
              value={searchText}
              placeholder={`${sourceWord || "start"} → ${targetWord || "target"}  或 'A B'`}
              focus={showSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onInput={(e: any) => setSearchText(e.detail.value)}
              onConfirm={handleSearchSubmit}
            />
          </View>

          <View className={`rp-filter-panel ${showFilterPanel ? "expanded" : ""}`}>
            <View className="rp-controls-filters">
              <View className="rp-filter-col">
                <Text className="rp-filter-label">语义类型</Text>
                <Select
                  options={relationFilterOptions}
                  value={filterKey}
                  onChange={onFilterChange}
                />
              </View>
              <View className="rp-filter-col">
                <Text className="rp-filter-label">路径类型</Text>
                <Select
                  options={pathModeOptions}
                  value={pathMode}
                  onChange={onPathModeChange}
                />
              </View>
            </View>

            <View className="rp-controls-secondary">
              <View className="rp-hops-row">
                <Text className="rp-hops-label">Hops: {pathMode === "showAll" ? showAllDepthOptions[showAllDepthIdx] : (depthOptions[depthIndex] ?? maxDepth)}</Text>
                <Select
                  options={depthOptionsForSelect}
                  value={pathMode === "showAll" ? String(showAllDepthIdx) : String(depthOptions[depthIndex] ?? maxDepth)}
                  onChange={onDepthChange}
                />
              </View>
              <View className="rp-toggle-row">
                <Text className="rp-toggle-label">多路径</Text>
                <Switch color="#007AFF" checked={showAllPaths} onChange={(e: any) => setShowAllPaths(e.detail.value)} />
              </View>
            </View>
          </View>

          {status === "ready" && !showAllPaths && (
            <View className="rp-breadcrumb">
              <View
                className="rp-breadcrumb-nav"
                onClick={() => {
                  if (filteredPaths.length <= 1) return
                  const prev = (currentPathIdx - 1 + filteredPaths.length) % filteredPaths.length
                  browseToPath(prev)
                }}
              >
                <Text className={`rp-breadcrumb-arrow ${filteredPaths.length > 1 ? "" : "disabled"}`}>◀</Text>
              </View>
              <Text className="rp-breadcrumb-text">{pathLabel || "当前路径"}</Text>
              <Text className="rp-breadcrumb-stats">{hops} hop{hops === 1 ? "" : "s"}</Text>
              <Text className="rp-breadcrumb-counter">{currentPathIndexLabel}</Text>
              <View
                className="rp-breadcrumb-nav"
                onClick={() => {
                  if (filteredPaths.length <= 1) return
                  const next = (currentPathIdx + 1) % filteredPaths.length
                  browseToPath(next)
                }}
              >
                <Text className={`rp-breadcrumb-arrow ${filteredPaths.length > 1 ? "" : "disabled"}`}>▶</Text>
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
        </View>

        <View className="canvas-holder" style={{ "marginTop": `${canvasHodlerMarginTop}`}}>
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
