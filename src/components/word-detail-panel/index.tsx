import { View, Text, ScrollView } from "@tarojs/components"
import { VolumeOutlined } from "@taroify/icons"
import * as relation from "@/pages/relation/relation"
import MiniGraph from "./mini-graph"
import type { WordDetailPanelProps, RelationItem } from "./types"
import "./index.scss"

const GROUP_CARD_BG: Record<string, string> = {
  semantic: "rgba(76, 175, 80, 0.08)",
  formal: "rgba(33, 150, 243, 0.08)",
  morphological: "rgba(156, 39, 176, 0.08)",
  associative: "rgba(255, 152, 0, 0.08)",
}

const GROUP_CARD_BORDER: Record<string, string> = {
  semantic: "#4CAF50",
  formal: "#2196F3",
  morphological: "#9C27B0",
  associative: "#FF9800",
}

function getGroupBorderColor(groupKey: string): string {
  return GROUP_CARD_BORDER[groupKey] || "#94a3b8"
}

function getGroupBgColor(groupKey: string): string {
  return GROUP_CARD_BG[groupKey] || "rgba(148, 163, 184, 0.06)"
}

export default function WordDetailPanel(props: WordDetailPanelProps) {
  const { wordData, groupedRelations, onNavigateToWord, onPlayExample } = props

  const groupKeys = Object.keys(relation.RELATION_GROUPS).filter(
    (key) => groupedRelations[key] && groupedRelations[key].length > 0
  )

  const handleRelationClick = (word: string) => {
    onNavigateToWord(word)
  }

  return (
    <View className="word-detail-panel">
      <MiniGraph wordData={wordData} />

      {wordData.definition ? (
        <>
          <View className="wdp-divider" />
          <View className="wdp-definition">{wordData.definition}</View>
        </>
      ) : null}

      {groupKeys.length > 0 && (
        <>
          <View className="wdp-divider" />
          <Text className="wdp-section-label">关系</Text>
          <ScrollView scrollX className="wdp-cards-scroll">
            <View className="wdp-cards-inner">
              {groupKeys.map((groupKey) => {
                const list = groupedRelations[groupKey] as RelationItem[]
                return (
                  <View
                    key={groupKey}
                    className="wdp-card"
                    style={{
                      background: getGroupBgColor(groupKey),
                      borderLeft: `6rpx solid ${getGroupBorderColor(groupKey)}`,
                    }}
                  >
                    <View className="wdp-card-header">
                      <Text className="wdp-card-group">
                        {relation.getRelationGroupLabel(groupKey)}
                      </Text>
                    </View>
                    <View className="wdp-card-list">
                      {list.map((rel, idx) => (
                        <View key={idx} className="wdp-card-item">
                          <Text className="wdp-card-rel-type">
                            {relation.getRelationLabel(rel.type)}
                          </Text>
                          <Text
                            className="wdp-card-rel-word"
                            onClick={() => handleRelationClick(rel.word)}
                          >
                            {rel.word}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </>
      )}

      {wordData.examples.length > 0 && (
        <>
          <View className="wdp-divider" />
          <Text className="wdp-section-label">例句</Text>
          {wordData.examples.map((example, index) => (
            <View key={index} className="wdp-example-item">
              <Text className="wdp-example-idx">{index + 1}.</Text>
              <Text className="wdp-example-text">{example}</Text>
              <View
                className="wdp-example-tts"
                onClick={() => onPlayExample(example)}
              >
                <VolumeOutlined />
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  )
}
