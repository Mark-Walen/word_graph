import { View, Text } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { Star, StarOutlined, VolumeOutlined } from "@taroify/icons";
import { useState } from "react";
import "./index.scss";

interface WordDetailData {
  word: string
  type: string
  phonetic?: string
  meaning: string
  examples?: string[]
  starred?: boolean
}

export default function WordDetailPage() {
  const [data, setData] = useState<WordDetailData>({
    word: "benevolent",
    type: "adj.",
    phonetic: "/bəˈnevələnt/",
    meaning: "well meaning and kindly; charitable in disposition and conduct",
    examples: [
      "She had a benevolent smile that put everyone at ease.",
      "A benevolent organization donated supplies to the village.",
    ],
    starred: true,
  })

  useLoad((query) => {
    const word = query.word as string | undefined
    if (word) {
      // TODO: fetch real data by word; using placeholder for now
      setData((prev) => ({ ...prev, word }))
      Taro.setNavigationBarTitle({ title: word })
    }
  })

  const toggleStar = () => setData(prev => ({ ...prev, starred: !prev.starred }))

  const playAudio = () => {
    // TODO: integrate TTS/audio source if available in your backend
    Taro.showToast({ title: "播放发音", icon: "none" })
  }

  return (
    <View className="word-detail-page">
      <View className="card">
        <View className="header">
          <Text className="word">{data.word}</Text>
          <Text className="type">{data.type}</Text>
        </View>
        {data.phonetic && (
          <View className="phonetic">
            <Text>{data.phonetic}</Text>
            <Text style={{ marginLeft: 8 }} onClick={playAudio}>
              <VolumeOutlined />
            </Text>
          </View>
        )}
        <View className="meaning">{data.meaning}</View>
        <View style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }} onClick={toggleStar}>
          {data.starred ? <Star className="starred" /> : <StarOutlined />}
        </View>
      </View>

      {data.examples && data.examples.length > 0 && (
        <View className="section">
          <View className="section-title">例句</View>
          {data.examples.map((ex, idx) => (
            <View key={idx} className="example" style={{ marginTop: idx === 0 ? 0 : 8 }}>{ex}</View>
          ))}
        </View>
      )}
    </View>
  )
}


