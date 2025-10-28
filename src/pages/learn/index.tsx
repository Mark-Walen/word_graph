import { View, Text } from "@tarojs/components";
import NavigationBar from "@/components/navigation-bar";
import { ArrowLeft, Star, StarOutlined, Volume } from "@taroify/icons";
import { useLoad } from "@tarojs/taro";
import { useState } from 'react'
import "./index.scss";
import Taro from "@tarojs/taro";

const MOCK = {
  word: "spontaneous",
  isStarred: false,
  accent: 0,
  phonetic: "/spɒnˈteɪ.ni.əs/",
  meanings: [
    { pos: "adj.", definition: "瞬间的，即时的" },
    { pos: "adj.", definition: "同步的，同时存在的" },
    { pos: "adj.", definition: "(行为) 自发的；率性的；自然的" },
    { pos: "adj.", definition: "广阔的，宽广的" },
  ],
};

export default function LearnPage() {
  useLoad(() => {
    // page title for runtime / miniapp
    // no-op here; NavigationBar shows back button and page is self-contained
  });

  const [isStarred, setIsStarred] = useState<boolean>(MOCK.isStarred)

  const toggleStar = () => {
    setIsStarred(s => !s)
    console.log(`Toggled star: ${!isStarred}`)
  }

  const getAccent = (accent: number) => {
    switch(accent) {
      case 0:
        return '英'
      case 1:
        return '美'
      default:
        return '英'
    }
  }

  return (
    <View className="learn-page page-bg-image glass-bg">
      <NavigationBar>
        <ArrowLeft size={24} onClick={() => Taro.navigateTo({
          url: '/pages/index/index'
        })}/>
      </NavigationBar>

      <View className="content">
        <View className="word-header">
          <View className="word-wrap">
            <Text className="word">{MOCK.word}</Text>
            <View style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }} onClick={toggleStar}>
              {isStarred ? (
                <Star size={24} className="star-icon starred" />
              ) : (
                <StarOutlined size={24} className="star-icon" />
              )}
            </View>
          </View>
          <View className="audio">
            <View className="accent">
              <Text>{getAccent(MOCK.accent)}</Text>
              <Volume size={14} className="volume-icon" />
            </View>
            <Text className="phonetic">{MOCK.phonetic}</Text>
          </View>
        </View>

        <View className="meanings">
          {MOCK.meanings.map((m, i) => (
            <View className="meaning-card fury-glass" key={i}>
              <Text className="pos">{m.pos}</Text>
              <Text className="definition">{m.definition}</Text>
            </View>
          ))}
        </View>

        <View className="reveal">看答案</View>
      </View>
    </View>
  );
}
