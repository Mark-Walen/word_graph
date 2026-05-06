import { View, Text, Picker, Input } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import * as relation from "./relation";
import "./index.scss";
import { WordDetailPanel, EChart, FloatingPanel } from "@/components";
import { fetchSubgraph, convertApiSubgraphToWordGraph } from "./graph-api";

const RELATION_LABELS: Record<string, string> = {
  all: "全部关系",
  semantic: "语义关系",
  formal: "形式关系",
  morphological: "形态关系",
  associative: "联想与用法关系",
};

const DISPLAY_MODE_KEYS = ["all", "semantic", "formal", "morphological"] as const;
const DISPLAY_MODE_LABELS: Record<string, string> = {
  all: "显示所有",
  semantic: "仅语义",
  formal: "仅形式",
  morphological: "仅形态",
};

interface WordInfo {
  word: string;
  phonetic: string;
  starred: boolean;
  partOfSpeech: string;
  level: string;
  definition: string;
  examples: string[];
  relations: Array<{ word: string; type: string; strength: number }>;
  isCenter: boolean;
}

function emptyWordInfo(): WordInfo {
  return {
    word: "", phonetic: "", starred: false, partOfSpeech: "", level: "",
    definition: "", examples: [], relations: [], isCenter: false,
  };
}

interface EdgeInfo {
  type: string; word: string; targetWord: string; examples: string[]; strength: number;
}

function emptyEdgeInfo(): EdgeInfo {
  return { type: "", word: "", targetWord: "", examples: [], strength: 0 };
}

function resolveRouteWord(): { word: string; mode: string } {
  try {
    const instance = Taro.getCurrentInstance();
    const params = (instance?.router?.params || {}) as any;
    return {
      word: decodeURIComponent(String(params.word || "happy")),
      mode: params.mode || "singleRelation",
    };
  } catch { return { word: "happy", mode: "singleRelation" }; }
}

function buildEChartsOption(
  wordData: Record<string, any>,
  centerWord: string,
  visibleTypes: Set<string>,
  filterKey: string,
  removedNodeIds: Set<string>
): { option: any; availableGroupKeys: string[] } | null {
  const entry = wordData[centerWord];
  if (!entry) return null;

  const allRels = entry.relations || [];
  const filteredRels = allRels.filter((r: any) =>
    visibleTypes.has(r.type) && !removedNodeIds.has(r.word)
  );

  const nodes: any[] = [{
    id: centerWord, name: centerWord, symbolSize: 48,
    itemStyle: { color: "#ffffff", borderColor: "#6366f1", borderWidth: 3 },
    label: { show: true, fontSize: 13, fontWeight: "bold" as const, color: "#1e293b" },
    category: 0,
  }];

  const edges: any[] = [];
  const GROUP_COLORS: Record<string, string> = {
    semantic: "#4CAF50", formal: "#2196F3", morphological: "#9C27B0", associative: "#FF9800",
  };
  const categories: any[] = [{ name: "中心词", itemStyle: { color: "#6366f1" } }];
  const catMap = new Map<string, number>();

  filteredRels.forEach((rel: any) => {
    if (!wordData[rel.word]) return;
    const group = relation.getRelationGroup(rel.type) || "other";
    const color = relation.getRelationColor(rel.type);
    if (!catMap.has(group) && group !== "other") {
      catMap.set(group, categories.length);
      categories.push({ name: relation.getRelationGroupLabel(group), itemStyle: { color: GROUP_COLORS[group] || color } });
    }
    const catIdx = catMap.get(group) ?? 1;
    nodes.push({
      id: rel.word, name: rel.word, symbolSize: 40,
      itemStyle: { color: "#ffffff", borderColor: color, borderWidth: 2.5 },
      category: catIdx,
      label: { show: true, fontSize: 12, color: "#1e293b" },
    });
    edges.push({
      source: centerWord, target: rel.word,
      symbol: ["diamond", "arrow"],
      symbolSize: [8, 8],
      label: { show: true, formatter: relation.getRelationLabel(rel.type), fontSize: 10, color: "#64748b" },
      lineStyle: { width: 2 + rel.strength * 1.5, color, opacity: 0.7 },
    });
  });

  const availableGroupKeys = new Set<string>();
  allRels.forEach((rel: any) => {
    const g = relation.getRelationGroup(rel.type);
    if (g && g !== "other") availableGroupKeys.add(g);
  });

  const legendNames = categories.map((c) => c.name);
  const filterLabel = (RELATION_LABELS as Record<string, string>)[filterKey] || "";
  const selectedMap: Record<string, boolean> = {};
  categories.forEach((c) => {
    selectedMap[c.name] = filterKey === "all" ? true : c.name === filterLabel;
  });
  selectedMap["中心词"] = true;

  return {
    availableGroupKeys: Array.from(availableGroupKeys),
    option: {
      legend: {
        show: true, top: 8, left: "center",
        itemWidth: 10, itemHeight: 10,
        textStyle: { fontSize: 10, color: "#64748b" },
        data: legendNames, selected: selectedMap,
      },
      series: [{
        type: "graph", layout: "force", roam: true, draggable: true,
        categories, nodes, edges, zoom: 0.9,
        force: { initIterations: 200, repulsion: 800, edgeLength: [80, 200], gravity: 0.06, friction: 0.5 },
        emphasis: { focus: "adjacency" as const, lineStyle: { width: 6 }, itemStyle: { borderWidth: 4 } },
        scaleLimit: { min: 0.2, max: 5 },
      }],
    },
  };
}

function computeVisibleTypes(filterKey: string, displayMode: string): Set<string> {
  let types: string[] = filterKey === "all"
    ? Object.values(relation.RELATION_TYPES)
    : (relation.RELATION_GROUPS[filterKey] || []);
  if (displayMode !== "all") {
    types = types.filter((t) => relation.getRelationGroup(t) === displayMode);
  }
  return new Set(types);
}

export default function RelationPage() {
  const route = useMemo(() => resolveRouteWord(), []);
  const paramsRef = useRef(route);
  const [centerWord, setCenterWord] = useState(route.word);

  const [wordGraph, setWordGraph] = useState<Record<string, any>>({});

  const [removedNodeIds, setRemovedNodeIds] = useState<Set<string>>(new Set());

  const [filterKey, setFilterKey] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<string>("all");
  const [starredWords, setStarredWords] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const visibleTypes = useMemo(() => computeVisibleTypes(filterKey, displayMode), [filterKey, displayMode]);

  const { availableGroupKeys, chartOption } = useMemo(() => {
    const result = buildEChartsOption(wordGraph, centerWord, visibleTypes, filterKey, removedNodeIds);
    if (!result) return { availableGroupKeys: [] as string[], chartOption: null as any };
    return { availableGroupKeys: result.availableGroupKeys, chartOption: result.option };
  }, [wordGraph, centerWord, visibleTypes, filterKey, removedNodeIds]);

  const relationPickerKeys = useMemo(() => ["all", ...availableGroupKeys] as string[], [availableGroupKeys]);
  const relationPickerRange = useMemo(() => ["全部关系", ...availableGroupKeys.map((k) => (RELATION_LABELS as any)[k] || k)], [availableGroupKeys]);
  const relationFilterIndex = useMemo(() => Math.max(0, relationPickerKeys.indexOf(filterKey)), [relationPickerKeys, filterKey]);
  const displayModeIndex = useMemo(() => Math.max(0, DISPLAY_MODE_KEYS.indexOf(displayMode as any)), [displayMode]);

  const [showDetail, setShowDetail] = useState(false);
  const [detailNode, setDetailNode] = useState<WordInfo>(emptyWordInfo());
  const [groupedRelations, setGroupedRelations] = useState<Record<string, Array<{ word: string; type: string; strength: number }>>>({});
  const [showEdgeDetail, setShowEdgeDetail] = useState(false);
  const [edgeDetail, setEdgeDetail] = useState<EdgeInfo>(emptyEdgeInfo());
  const chartRef = useRef<any>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    show: boolean; x: number; y: number; nodeId: string;
  }>({ show: false, x: 0, y: 0, nodeId: "" });

  const windowHeight = Taro.getWindowInfo().windowHeight;

  const wordAnchors = [0, Math.round(0.3 * windowHeight), Math.round(0.8 * windowHeight)];
  const relationAnchors = [0, Math.round(0.3 * windowHeight)];

  useDidShow(() => {
    const instance = Taro.getCurrentInstance();
    const params = (instance?.router?.params || {}) as any;
    const rawWord = decodeURIComponent(String(params.word || route.word));
    const mode = params.mode || "singleRelation";
    paramsRef.current = { word: rawWord, mode };
    Taro.setNavigationBarTitle({ title: `${mode === "twoWordsRelation" ? "两词关系" : "单词关系"} · ${rawWord}` });
    if (rawWord !== centerWord) setCenterWord(rawWord);

    fetchSubgraph(rawWord, 1)
      .then((data) => {
        setWordGraph(convertApiSubgraphToWordGraph(data))
      })
      .catch(() => {});
  });

  const onFilterChange = useCallback((e: any) => {
    const key = relationPickerKeys[e.detail.value];
    if (key) setFilterKey(key);
  }, [relationPickerKeys]);

  const onDisplayModeChange = useCallback((e: any) => {
    setDisplayMode(DISPLAY_MODE_KEYS[e.detail.value]);
  }, []);

  const showNodeDetail = useCallback((nodeId: string) => {
    const entry = wordGraph[nodeId];
    if (!entry) return;
    const grouped = entry.relations.reduce((acc: Record<string, any[]>, rel: any) => {
      const group = relation.getRelationGroup(rel.type);
      if (!group) return acc;
      (acc[group] ??= []).push(rel);
      return acc;
    }, {} as Record<string, any[]>);
    setDetailNode({ ...entry, isCenter: nodeId === centerWord, starred: starredWords.has(nodeId) });
    setGroupedRelations(grouped);
    setShowDetail(true);
    setShowEdgeDetail(false);
  }, [centerWord, starredWords, wordGraph]);

  const showEdgeRelationDetail = useCallback((source: string, target: string) => {
    const entry = wordGraph[source];
    if (!entry) return;
    const rel = entry.relations?.find?.((r: any) => r.word === target);
    setEdgeDetail({
      type: rel ? relation.getRelationLabel(rel.type) : "关系",
      word: source, targetWord: target, examples: [], strength: rel?.strength ?? 0,
    });
    setShowEdgeDetail(true);
    setShowDetail(false);
  }, [wordGraph]);

  const hideDetails = useCallback(() => {
    setShowDetail(false);
    setShowEdgeDetail(false);
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, nodeId: "" });
    chartRef.current?.downplay?.();
  }, []);

  const loadWordGraph = useCallback((word: string) => {
    setCenterWord(word);
    fetchSubgraph(word, 1)
      .then((data) => setWordGraph(convertApiSubgraphToWordGraph(data)))
      .catch(() => {});
  }, []);

  const handleNavigateToWord = useCallback((word: string) => {
    const entry = wordGraph[word];
    if (!entry || word === centerWord) return;
    loadWordGraph(word);
    hideDetails();
    Taro.setNavigationBarTitle({
      title: `${paramsRef.current.mode === "twoWordsRelation" ? "两词关系" : "单词关系"} · ${word}`,
    });
  }, [centerWord, hideDetails, wordGraph, loadWordGraph]);

  const handlePlayExample = useCallback(async (_text: string) => {
    // TODO: 对接自有后端 TTS API
    Taro.showToast({ title: "TTS 暂未接入", icon: "none" });
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const word = searchText.trim();
    if (!word) return;
    const entry = wordGraph[word];
    if (!entry) {
      Taro.showToast({ title: `未找到 "${word}"`, icon: "none" });
      return;
    }
    loadWordGraph(word);
    setShowSearch(false);
    setSearchText("");
    hideDetails();
    Taro.setNavigationBarTitle({
      title: `${paramsRef.current.mode === "twoWordsRelation" ? "两词关系" : "单词关系"} · ${word}`,
    });
  }, [searchText, hideDetails, wordGraph, loadWordGraph]);

  const handleContextMenuAction = useCallback((action: string) => {
    const nodeId = contextMenu.nodeId;
    hideContextMenu();
    if (action === "detail") {
      showNodeDetail(nodeId);
    } else if (action === "star") {
      setStarredWords((prev) => {
        const next = new Set(prev);
        next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
        return next;
      });
    } else if (action === "center") {
      const entry = wordGraph[nodeId];
      if (!entry || nodeId === centerWord) return;
      setCenterWord(nodeId);
      hideDetails();
      Taro.setNavigationBarTitle({ title: `${paramsRef.current.mode === "twoWordsRelation" ? "两词关系" : "单词关系"} · ${nodeId}` });
    } else if (action === "remove") {
      setRemovedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
    }
  }, [contextMenu.nodeId, centerWord, hideDetails, hideContextMenu, showNodeDetail, wordGraph]);

  const handleChartMousedown = useCallback((params: any) => {
    if (params.dataType !== "node") return;
    const nodeId = params.data.id ?? params.name;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ show: true, x: params.event?.offsetX ?? 0, y: params.event?.offsetY ?? 0, nodeId });
    }, 500);
  }, []);

  const handleChartMouseup = useCallback((params: any) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (params.dataType === "edge" && params.data) {
      showEdgeRelationDetail(params.data.source, params.data.target);
    }
  }, [showEdgeRelationDetail]);

  const handleChartClick = useCallback((params: any) => {
    if (contextMenu.show) return;
    if (params.dataType === "node") {
      showNodeDetail(params.data.id ?? params.name);
    } else if (params.dataType === "edge") {
      showEdgeRelationDetail(params.data.source, params.data.target);
    }
  }, [showNodeDetail, showEdgeRelationDetail, contextMenu.show]);

  const refChart = useCallback((node: any) => { chartRef.current = node; }, []);

  useEffect(() => {
    if (chartRef.current && chartOption) chartRef.current.refresh?.(chartOption);
  }, [chartOption]);

  return (
    <View className="relation-page">
      <View className="relation-page-container">
        <View className="header">
          <View className={`header-pickers ${showSearch ? "collapsed" : ""}`}>
            <Picker mode="selector" range={relationPickerRange} value={relationFilterIndex} onChange={onFilterChange}>
              <View className="picker">关系: {RELATION_LABELS[filterKey] ?? "全部关系"}</View>
            </Picker>
            <Picker mode="selector" range={DISPLAY_MODE_KEYS.map((k) => DISPLAY_MODE_LABELS[k])} value={displayModeIndex} onChange={onDisplayModeChange}>
              <View className="picker">显示: {DISPLAY_MODE_LABELS[displayMode] ?? "显示所有"}</View>
            </Picker>
          </View>

          <View className={`header-search ${showSearch ? "expanded" : ""}`}>
            <View className={`search-bar-pill ${searchFocused ? "focused" : ""}`}>
              <Input
                className="search-input"
                value={searchText}
                placeholder="输入单词搜索..."
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
              <View className="search-close" onClick={() => { setShowSearch(false); setSearchText(""); }}>
                <Text>✕</Text>
              </View>
            </View>
          </View>

          {!showSearch && (
            <View className="header-search-icon" onClick={() => setShowSearch(true)} />
          )}
        </View>

        <View className="canvas-holder">
          <EChart
            ref={refChart}
            canvasId="relation-graph"
            onClick={handleChartClick}
            onMousedown={handleChartMousedown}
            onMouseup={handleChartMouseup}
          />
          {contextMenu.show && (
            <View className="ctx-backdrop" onTouchStart={hideContextMenu} />
          )}
          {contextMenu.show && (
            <View className="ctx-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <View className="ctx-menu-item" onClick={() => handleContextMenuAction("detail")}>
                <Text className="ctx-menu-icon">📖</Text>
                <Text>查看详情</Text>
              </View>
              <View className="ctx-menu-item" onClick={() => handleContextMenuAction("star")}>
                <Text className="ctx-menu-icon">{starredWords.has(contextMenu.nodeId) ? "★" : "☆"}</Text>
                <Text>{starredWords.has(contextMenu.nodeId) ? "取消收藏" : "加入收藏"}</Text>
              </View>
              {contextMenu.nodeId !== centerWord && (
                <View className="ctx-menu-item" onClick={() => handleContextMenuAction("center")}>
                  <Text className="ctx-menu-icon">⊙</Text>
                  <Text>以此词为中心</Text>
                </View>
              )}
              {contextMenu.nodeId !== centerWord && (
                <View className="ctx-menu-item ctx-menu-item--danger" onClick={() => handleContextMenuAction("remove")}>
                  <Text className="ctx-menu-icon">✕</Text>
                  <Text>从图中移除</Text>
                </View>
              )}
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
                <Text className="relation-detail-arrow">↔</Text>
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
  );
}
