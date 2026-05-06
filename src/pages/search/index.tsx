import NavigationBar from "@/components/navigation-bar";
import { View } from "@tarojs/components";
import { Popup } from "@taroify/core";
import { ArrowLeft, Star, StarOutlined } from "@taroify/icons";
import { useState, useCallback, useEffect, useRef } from "react";
import Taro from "@tarojs/taro";
import "./search.scss";
import WordGraphSearchBox, { QueryMode } from "@/components/word-graph-search-box";
import { fetchHistory, addHistory, toggleHistoryStar, clearHistory, fetchSearch } from "../relation/graph-api";

interface SearchProps {
  show: boolean;
  onClose?: () => void;
}

interface HistoryItem {
  id: string;
  word: string;
  word2?: string;
  type: string;
  meaning: string;
  starred: boolean;
}

export default function SearchPage({ show, onClose }: SearchProps) {
  const [query, setQuery] = useState("");
  const [queryMode, setQueryMode] = useState<QueryMode>("word");
  const [expanded, setExpanded] = useState(false);
  const [depth, setDepth] = useState(3);

  const [currentHistory, setCurrentHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetchHistory(queryMode).then(setCurrentHistory).catch(() => {});
  }, [queryMode]);

  const [searchResults, setSearchResults] = useState<HistoryItem[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (queryMode !== "word" || !query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const data = await fetchSearch(query.trim())
        setSearchResults(data.map((item: any, i: number) => ({
          id: `api-${item.word}-${i}`,
          word: item.word,
          type: item.type,
          meaning: item.meaning,
          starred: item.starred ?? false,
        })))
      } catch {
        setSearchResults([])
      }
    }, 300)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, queryMode]);

  const toggleStar = useCallback(async (mode: QueryMode, id: string) => {
    try {
      const updated = await toggleHistoryStar(id, mode)
      setCurrentHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, starred: updated.starred } : item))
      )
    } catch {}
  }, []);

  const setMode = useCallback((mode: QueryMode) => {
    setQueryMode(mode);
    setExpanded(false);
    setQuery("");
  }, []);

  const displayedHistory =
    queryMode === "word" && query.trim()
      ? searchResults
      : currentHistory.length > 10 && !expanded
      ? currentHistory.slice(0, 10)
      : currentHistory;

  const goToWordDetail = useCallback((word: string) => {
    Taro.navigateTo({
      url: `/pages/word-detail/index?word=${encodeURIComponent(word)}`,
    });
  }, []);

  const goToRelation = useCallback((word: string) => {
    Taro.navigateTo({
      url: `/pages/relation/index?word=${encodeURIComponent(word)}`,
    });
  }, []);

  const goToRelationPath = useCallback(
    (source: string, target: string, maxDepth: number) => {
      const payload = {
        source,
        target,
        maxDepth,
      };

      Taro.navigateTo({
        url: `/pages/relation/relation-path?words=${encodeURIComponent(
          JSON.stringify(payload)
        )}`,
      });
    },
    []
  );

  const onSubmitQuery = useCallback(async () => {
    const value = query.trim();
    if (!value) return;

    if (queryMode === "twoWordsRelation") {
      const parts = value.split(/\s+/).filter(Boolean);

      if (parts.length < 2) {
        Taro.showToast({ title: "请输入两个单词，空格分隔", icon: "none" });
        return;
      }

      const [source, target] = parts;
      addHistory({ mode: "twoWordsRelation", word: source, word2: target, type: "path", meaning: `${source} → ${target}` })
        .then((item) => setCurrentHistory((prev) => [item, ...prev].slice(0, 100)))
        .catch(() => {});

      goToRelationPath(source, target, depth);
      return;
    }

    addHistory({
      mode: queryMode === "word" ? "word" : "singleRelation",
      word: value,
      type: queryMode === "word" ? "query" : queryMode === "singleRelation" ? "rel" : "rel2",
      meaning: queryMode === "word" ? "最近查询" : queryMode === "singleRelation" ? "单词关系查询" : "两词关系查询",
    })
      .then((item) => setCurrentHistory((prev) => [item, ...prev].slice(0, 100)))
      .catch(() => {});

    if (queryMode === "word") {
      goToWordDetail(value);
    } else {
      goToRelation(value);
    }
  }, [query, queryMode, depth, goToWordDetail, goToRelation, goToRelationPath]);

  const onClickHistory = useCallback(
    (item: HistoryItem) => {
      if (queryMode === "twoWordsRelation" && item.word2) {
        goToRelationPath(item.word, item.word2, depth);
        return;
      }

      if (queryMode === "word") {
        goToWordDetail(item.word);
      } else {
        goToRelation(item.word);
      }
    },
    [queryMode, depth, goToWordDetail, goToRelation, goToRelationPath]
  );

  const handleClearHistory = useCallback(async () => {
    try {
      await clearHistory(queryMode)
      setCurrentHistory([])
    } catch {}
  }, [queryMode]);

  return (
    <Popup
      className="search-page"
      open={show}
      placement="bottom"
      onClose={onClose}
      style={{ height: "100%" }}
    >
      <NavigationBar>
        <Popup.Close placement="top-left">
          <ArrowLeft size={24} />
        </Popup.Close>
      </NavigationBar>

      <View className="history-list">
        {displayedHistory.map((item) => (
          <View key={item.id} className="history-item">
            <View className="history-text" onClick={() => onClickHistory(item)}>
              <View className="word-row">
                <View className="word">
                  {item.word2 ? `${item.word} → ${item.word2}` : item.word}
                </View>
                <View className="type">{item.type}</View>
              </View>
              <View className="meaning">{item.meaning}</View>
            </View>

            <View className="star" onClick={() => toggleStar(queryMode, item.id)}>
              {item.starred ? (
                <Star className="starred" size={24} />
              ) : (
                <StarOutlined size={24} />
              )}
            </View>
          </View>
        ))}

        {!query.trim() && currentHistory.length > 10 && (
          <View className="history-footer">
            <View className="show-more-btn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "收起" : "展开更多"}
            </View>
          </View>
        )}

        {!query.trim() && currentHistory.length > 0 && (
          <View className="history-footer">
            <View className="clear-btn" onClick={handleClearHistory}>
              清空历史
            </View>
          </View>
        )}

        {queryMode === "word" && query.trim() && searchResults.length === 0 && (
          <View className="history-footer">
            <View className="no-results">未找到相关单词</View>
          </View>
        )}

        {!query.trim() && currentHistory.length === 0 && (
          <View className="history-footer">
            <View className="empty-history">暂无历史记录</View>
          </View>
        )}
      </View>

      <WordGraphSearchBox
        depth={depth}
        onDepthChange={setDepth}
        query={query}
        onQueryChange={setQuery}
        queryMode={queryMode}
        onQueryModeChange={setMode}
        onSubmit={onSubmitQuery}
      />
    </Popup>
  );
}
