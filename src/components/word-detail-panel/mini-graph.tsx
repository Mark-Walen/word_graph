import { useMemo, useRef, useEffect, useCallback } from "react"
import { View } from "@tarojs/components"
import EChart from "@/components/echarts"
import * as relation from "@/pages/relation/relation"
import wordDataJson from "@/pages/relation/word-relation-data"
import type { WordDetailData } from "./types"

interface MiniGraphProps {
  wordData: WordDetailData
}

const GROUP_COLORS: Record<string, string> = {
  semantic: "#4CAF50",
  formal: "#2196F3",
  morphological: "#9C27B0",
  associative: "#FF9800",
}

function buildMiniOption(data: WordDetailData) {
  const centerWord = data.word
  const rels = data.relations.filter(
    (r) => (wordDataJson as Record<string, any>)[r.word]
  )

  const nodes: any[] = [{
    id: centerWord,
    name: centerWord,
    symbolSize: 32,
    itemStyle: { color: "#ffffff", borderColor: "#6366f1", borderWidth: 3 },
    label: { show: true, fontSize: 10, fontWeight: "bold" as const, color: "#1e293b" },
    category: 0,
  }]

  const edges: any[] = []
  const catMap = new Map<string, number>()
  const categories: any[] = [{ name: "中心词", itemStyle: { color: "#6366f1" } }]

  rels.forEach((rel) => {
    const color = relation.getRelationColor(rel.type)
    const group = relation.getRelationGroup(rel.type) || "other"
    if (!catMap.has(group) && group !== "other") {
      catMap.set(group, categories.length)
      categories.push({
        name: relation.getRelationGroupLabel(group),
        itemStyle: { color: GROUP_COLORS[group] || color },
      })
    }
    const catIdx = catMap.get(group) ?? 1
    nodes.push({
      id: rel.word,
      name: rel.word,
      symbolSize: 22,
      itemStyle: { color: "#ffffff", borderColor: color, borderWidth: 2 },
      category: catIdx,
      label: { show: true, fontSize: 9, color: "#64748b" },
    })
    edges.push({
      source: centerWord,
      target: rel.word,
      lineStyle: { width: 1.5, color, opacity: 0.5 },
    })
  })

  return {
    tooltip: { show: false },
    animation: false,
    series: [{
      type: "graph",
      layout: "force",
      roam: true,
      draggable: true,
      categories,
      nodes,
      edges,
      zoom: 1,
      center: ["50%", "50%"],
      force: {
        initIterations: 100,
        repulsion: 200,
        edgeLength: [40, 80],
        gravity: 0.1,
        friction: 0.6,
      },
      scaleLimit: { min: 0.6, max: 2 },
    }],
  }
}

export default function MiniGraph({ wordData }: MiniGraphProps) {
  const chartRef = useRef<any>(null)
  const option = useMemo(() => buildMiniOption(wordData), [wordData])

  const refChart = useCallback((node: any) => { chartRef.current = node }, [])

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.refresh?.(option)
    }
  }, [option])

  return (
    <View className="wdp-mini-graph">
      <EChart
        ref={refChart}
        canvasId="mini-relation-graph"
      />
    </View>
  )
}
