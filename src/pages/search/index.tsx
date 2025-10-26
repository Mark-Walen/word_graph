import NavigationBar from "@/components/navigation-bar";
import { View, Input } from "@tarojs/components";
import { Popup } from '@taroify/core'
import { ArrowLeft, Star, StarOutlined, Close } from "@taroify/icons";
import { useState, useCallback } from "react";
import Taro from "@tarojs/taro";
import './search.scss'
import { Search } from "@taroify/icons";

interface SearchProps {
  show: boolean
  onClose?: () => void
}

export default function SearchPage({show, onClose}: SearchProps) {
  interface HistoryItem {
    id: string
    word: string
    type: string
    meaning: string
    starred: boolean
  }

  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', word: 'abandon', type: 'v.', meaning: 'to leave completely and finally', starred: false },
    { id: '2', word: 'benevolent', type: 'adj.', meaning: 'well meaning and kindly', starred: true },
    { id: '3', word: 'candid', type: 'adj.', meaning: 'truthful and straightforward', starred: false },
    { id: '4', word: 'diligent', type: 'adj.', meaning: 'showing care in work or duties', starred: false },
    { id: '5', word: 'eloquent', type: 'adj.', meaning: 'fluent or persuasive in speaking', starred: false },
    { id: '6', word: 'fathom', type: 'v.', meaning: 'understand after much thought', starred: false },
    { id: '7', word: 'galvanize', type: 'v.', meaning: 'shock into taking action', starred: false },
    { id: '8', word: 'harbinger', type: 'n.', meaning: 'a sign of something to come', starred: false },
    { id: '9', word: 'impeccable', type: 'adj.', meaning: 'in accordance with the highest standards', starred: false },
    { id: '10', word: 'juxtapose', type: 'v.', meaning: 'place side by side for contrast', starred: false },
    { id: '11', word: 'kinetic', type: 'adj.', meaning: 'relating to motion', starred: false },
  ])

  // Sample word database for search results
  const wordDatabase: HistoryItem[] = [
    { id: 'db1', word: 'abandon', type: 'v.', meaning: 'to leave completely and finally', starred: false },
    { id: 'db2', word: 'abandoned', type: 'adj.', meaning: 'having been deserted or left', starred: false },
    { id: 'db3', word: 'abandonment', type: 'n.', meaning: 'the action or fact of abandoning', starred: false },
    { id: 'db4', word: 'benevolent', type: 'adj.', meaning: 'well meaning and kindly', starred: true },
    { id: 'db5', word: 'benevolence', type: 'n.', meaning: 'the quality of being well meaning', starred: false },
    { id: 'db6', word: 'candid', type: 'adj.', meaning: 'truthful and straightforward', starred: false },
    { id: 'db7', word: 'candidly', type: 'adv.', meaning: 'in an honest and straightforward way', starred: false },
    { id: 'db8', word: 'diligent', type: 'adj.', meaning: 'showing care in work or duties', starred: false },
    { id: 'db9', word: 'diligence', type: 'n.', meaning: 'careful and persistent work', starred: false },
    { id: 'db10', word: 'eloquent', type: 'adj.', meaning: 'fluent or persuasive in speaking', starred: false },
    { id: 'db11', word: 'eloquence', type: 'n.', meaning: 'fluent or persuasive speaking', starred: false },
    { id: 'db12', word: 'fathom', type: 'v.', meaning: 'understand after much thought', starred: false },
    { id: 'db13', word: 'galvanize', type: 'v.', meaning: 'shock into taking action', starred: false },
    { id: 'db14', word: 'harbinger', type: 'n.', meaning: 'a sign of something to come', starred: false },
    { id: 'db15', word: 'impeccable', type: 'adj.', meaning: 'in accordance with the highest standards', starred: false },
    { id: 'db16', word: 'juxtapose', type: 'v.', meaning: 'place side by side for contrast', starred: false },
    { id: 'db17', word: 'kinetic', type: 'adj.', meaning: 'relating to motion', starred: false },
    { id: 'db18', word: 'kinetic energy', type: 'n.', meaning: 'energy of motion', starred: false },
  ]

  const toggleStar = useCallback((id: string) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, starred: !item.starred } : item))
  }, [])

  const [query, setQuery] = useState("")
  const onInputChange = useCallback((e: any) => {
    setQuery(e?.detail?.value || "")
  }, [])
  const clearQuery = useCallback(() => {
    setQuery("")
  }, [])

  const [expanded, setExpanded] = useState(false)

  // Filter words based on query
  const filteredWords = useCallback(() => {
    if (!query.trim()) return []
    const searchTerm = query.toLowerCase().trim()
    return wordDatabase.filter(item =>
      item.word.toLowerCase().includes(searchTerm) ||
      item.meaning.toLowerCase().includes(searchTerm)
    ).slice(0, 20) // Limit to 20 results
  }, [query])

  const displayedHistory = query.trim() ? filteredWords() : (history.length > 10 && !expanded ? history.slice(0, 10) : history)

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const goToWordDetail = useCallback((word: string) => {
    Taro.navigateTo({ url: `/pages/word-detail/index?word=${encodeURIComponent(word)}` })
  }, [])

  return (
    <Popup
      className="search-page"
      open={show}
      placement="bottom"
      onClose={onClose}
      style={{ height: '100%' }}
    >
      {/* NavigationBar */}
      <NavigationBar>
        <Popup.Close placement="top-left">
          <ArrowLeft size={24}/>
        </Popup.Close>
      </NavigationBar>

      {/* Search box area */}
      <View className="search-box-wrapper">
        <View className='search-box-icon-wrapper'>
          <Search className='search-box-icon' size={24}/>
        </View>
        <Input
          className='ai-search-box fury-glass'
          placeholder="输入单词或关系查询..."
          value={query}
          onInput={onInputChange}
        />
        {query.length > 0 && (
          <View className='search-clear-btn' onClick={clearQuery}>
            <Close size={18} />
          </View>
        )}
      </View>

      {/* Word search history list */}
      {/* List items: Word name, Word type, Word meaning, Star icon */}
      <View className='history-list'>
        {displayedHistory.map(item => (
          <View key={item.id} className='history-item'>
            <View className='history-text' onClick={() => goToWordDetail(item.word)}>
              <View className='word-row'>
                <View className='word'>{item.word}</View>
                <View className='type'>{item.type}</View>
              </View>
              <View className='meaning'>{item.meaning}</View>
            </View>
            <View className='star' onClick={() => toggleStar(item.id)}>
              {item.starred ? (
                <Star className='starred' size={24} />
              ) : (
                <StarOutlined size={24} />
              )}
            </View>
          </View>
        ))}

        {!query.trim() && history.length > 10 && (
          <View className='history-footer'>
            <View className='show-more-btn' onClick={() => setExpanded(v => !v)}>
              {expanded ? '收起' : '展开更多'}
            </View>
          </View>
        )}

        {!query.trim() && history.length > 0 && (
          <View className='history-footer'>
            <View className='clear-btn' onClick={clearHistory}>清空历史</View>
          </View>
        )}

        {query.trim() && filteredWords().length === 0 && (
          <View className='history-footer'>
            <View className='no-results'>未找到相关单词</View>
          </View>
        )}
      </View>

    </Popup>
  )
}
