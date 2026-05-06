import { View, Text } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { Star, StarOutlined, VolumeOutlined } from "@taroify/icons";
import { useState, useCallback } from "react";
import "./index.scss";
import { fetchWordDetail } from "../relation/graph-api";

interface WordDetailData {
  word: string
  type: string
  phonetic?: string
  meaning: string
  examples?: string[]
  starred?: boolean
}

export default function WordDetailPage() {
  const [data, setData] = useState<WordDetailData | null>(null)

  useLoad((query) => {
    const word = query.word as string | undefined
    if (word) {
      Taro.setNavigationBarTitle({ title: word })
      fetchWordDetail(word)
        .then((json) => {
          setData({
            word: json.word,
            type: json.partOfSpeech,
            phonetic: json.phonetic,
            meaning: json.definition,
            examples: json.examples,
            starred: json.starred ?? false,
          })
        })
        .catch(() => {})
    }
  })

  const toggleStar = useCallback(() => {
    setData((prev) => prev ? { ...prev, starred: !prev.starred } : null)
  }, [])

  const playAudio = () => {
    // TODO: integrate TTS/audio source if available in your backend
    Taro.showToast({ title: "播放发音", icon: "none" })
  }

  return (
    <View className="word-detail-page">
      {!data ? (
        <View className="card">
          <View className="header">
            <Text className="word">加载中...</Text>
          </View>
        </View>
      ) : (
        <>
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
        </>
      )}
    </View>
  )
}


