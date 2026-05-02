import NavigationBar from "@/components/navigation-bar";
import { View } from "@tarojs/components";
import { Popup } from "@taroify/core";
import { ArrowLeft, Star, StarOutlined } from "@taroify/icons";
import { useState, useCallback, useMemo } from "react";
import Taro from "@tarojs/taro";
import "./search.scss";
import WordGraphSearchBox, { QueryMode } from "@/components/word-graph-search-box";

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

  const [historyByMode, setHistoryByMode] = useState<
    Record<QueryMode, HistoryItem[]>
  >({
    word: [
      {
        id: "1",
        word: "abandon",
        type: "v.",
        meaning: "to leave completely and finally",
        starred: false,
      },
      {
        id: "2",
        word: "benevolent",
        type: "adj.",
        meaning: "well meaning and kindly",
        starred: true,
      },
      {
        id: "3",
        word: "candid",
        type: "adj.",
        meaning: "truthful and straightforward",
        starred: false,
      },
      {
        id: "4",
        word: "diligent",
        type: "adj.",
        meaning: "showing care in work or duties",
        starred: false,
      },
      {
        id: "5",
        word: "eloquent",
        type: "adj.",
        meaning: "fluent or persuasive in speaking",
        starred: false,
      },
      {
        id: "6",
        word: "fathom",
        type: "v.",
        meaning: "understand after much thought",
        starred: false,
      },
      {
        id: "7",
        word: "galvanize",
        type: "v.",
        meaning: "shock into taking action",
        starred: false,
      },
      {
        id: "8",
        word: "harbinger",
        type: "n.",
        meaning: "a sign of something to come",
        starred: false,
      },
      {
        id: "9",
        word: "impeccable",
        type: "adj.",
        meaning: "in accordance with the highest standards",
        starred: false,
      },
      {
        id: "10",
        word: "juxtapose",
        type: "v.",
        meaning: "place side by side for contrast",
        starred: false,
      },
      {
        id: "11",
        word: "kinetic",
        type: "adj.",
        meaning: "relating to motion",
        starred: false,
      },
    ],
    singleRelation: [],
    twoWordsRelation: [],
  });

  const wordDatabase: HistoryItem[] = [
    {
      id: "db1",
      word: "abandon",
      type: "v.",
      meaning: "to leave completely and finally",
      starred: false,
    },
    {
      id: "db2",
      word: "abandoned",
      type: "adj.",
      meaning: "having been deserted or left",
      starred: false,
    },
    {
      id: "db3",
      word: "abandonment",
      type: "n.",
      meaning: "the action or fact of abandoning",
      starred: false,
    },
    {
      id: "db4",
      word: "benevolent",
      type: "adj.",
      meaning: "well meaning and kindly",
      starred: true,
    },
    {
      id: "db5",
      word: "benevolence",
      type: "n.",
      meaning: "the quality of being well meaning",
      starred: false,
    },
    {
      id: "db6",
      word: "candid",
      type: "adj.",
      meaning: "truthful and straightforward",
      starred: false,
    },
    {
      id: "db7",
      word: "candidly",
      type: "adv.",
      meaning: "in an honest and straightforward way",
      starred: false,
    },
    {
      id: "db8",
      word: "diligent",
      type: "adj.",
      meaning: "showing care in work or duties",
      starred: false,
    },
    {
      id: "db9",
      word: "diligence",
      type: "n.",
      meaning: "careful and persistent work",
      starred: false,
    },
    {
      id: "db10",
      word: "eloquent",
      type: "adj.",
      meaning: "fluent or persuasive in speaking",
      starred: false,
    },
    {
      id: "db11",
      word: "eloquence",
      type: "n.",
      meaning: "fluent or persuasive speaking",
      starred: false,
    },
    {
      id: "db12",
      word: "fathom",
      type: "v.",
      meaning: "understand after much thought",
      starred: false,
    },
    {
      id: "db13",
      word: "galvanize",
      type: "v.",
      meaning: "shock into taking action",
      starred: false,
    },
    {
      id: "db14",
      word: "harbinger",
      type: "n.",
      meaning: "a sign of something to come",
      starred: false,
    },
    {
      id: "db15",
      word: "impeccable",
      type: "adj.",
      meaning: "in accordance with the highest standards",
      starred: false,
    },
    {
      id: "db16",
      word: "juxtapose",
      type: "v.",
      meaning: "place side by side for contrast",
      starred: false,
    },
    {
      id: "db17",
      word: "kinetic",
      type: "adj.",
      meaning: "relating to motion",
      starred: false,
    },
    {
      id: "db18",
      word: "kinetic energy",
      type: "n.",
      meaning: "energy of motion",
      starred: false,
    },
  ];

  const currentHistory = historyByMode[queryMode] || [];

  const toggleStar = useCallback((mode: QueryMode, id: string) => {
    setHistoryByMode((prev) => ({
      ...prev,
      [mode]: prev[mode].map((item) =>
        item.id === id ? { ...item, starred: !item.starred } : item
      ),
    }));
  }, []);

  const setMode = useCallback((mode: QueryMode) => {
    setQueryMode(mode);
    setExpanded(false);
    setQuery("");
  }, []);

  const filteredWords = useMemo(() => {
    if (queryMode !== "word") return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return wordDatabase
      .filter(
        (item) =>
          item.word.toLowerCase().includes(q) ||
          item.meaning.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, queryMode]);

  const displayedHistory =
    queryMode === "word" && query.trim()
      ? filteredWords
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

  const onSubmitQuery = useCallback(() => {
    const value = query.trim();
    if (!value) return;

    if (queryMode === "twoWordsRelation") {
      const parts = value.split(/\s+/).filter(Boolean);

      if (parts.length < 2) {
        Taro.showToast({
          title: "请输入两个单词，空格分隔",
          icon: "none",
        });
        return;
      }

      const [source, target] = parts;
      const newItem: HistoryItem = {
        id: `${Date.now()}`,
        word: source,
        word2: target,
        type: "path",
        meaning: `${source} → ${target}`,
        starred: false,
      };

      setHistoryByMode((prev) => ({
        ...prev,
        twoWordsRelation: [newItem, ...prev.twoWordsRelation].slice(0, 100),
      }));

      goToRelationPath(source, target, depth);
      return;
    }

    const newItem: HistoryItem = {
      id: `${Date.now()}`,
      word: value,
      type:
        queryMode === "word"
          ? "query"
          : queryMode === "singleRelation"
          ? "rel"
          : "rel2",
      meaning:
        queryMode === "word"
          ? "最近查询"
          : queryMode === "singleRelation"
          ? "单词关系查询"
          : "两词关系查询",
      starred: false,
    };

    setHistoryByMode((prev) => ({
      ...prev,
      [queryMode]: [newItem, ...prev[queryMode]].slice(0, 100),
    }));

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

  const clearHistory = useCallback(() => {
    setHistoryByMode((prev) => ({ ...prev, [queryMode]: [] }));
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
            <View className="clear-btn" onClick={clearHistory}>
              清空历史
            </View>
          </View>
        )}

        {queryMode === "word" && query.trim() && filteredWords.length === 0 && (
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
