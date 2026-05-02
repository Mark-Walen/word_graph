import { View, Input, Text, Image } from "@tarojs/components";
import { Search, Photo, Close, ArrowUp } from "@taroify/icons";
import { useState, useCallback, useRef, useMemo } from "react";
import "./index.scss";
import IosSlider from "@/components/ios-slider";

import typeIcon from "@/assets/icon/type.svg";
import gitMergeIcon from "@/assets/icon/git-merge.svg";
import routeIcon from "@/assets/icon/route.svg";

export type ThemeMode = "light" | "dark";
export type QueryMode = "word" | "singleRelation" | "twoWordsRelation";

function depthLabel(depth: number): string {
  if (depth <= 2) return `短 (${depth}层)`;
  if (depth === 3) return `推荐 (${depth}层)`;
  if (depth <= 5) return `深 (${depth}层)`;
  return `极深 (${depth}层)`;
}

const MODES: { label: string; value: QueryMode; icon: string }[] = [
  { label: "单词", value: "word", icon: typeIcon },
  { label: "关系", value: "singleRelation", icon: gitMergeIcon },
  { label: "路径", value: "twoWordsRelation", icon: routeIcon },
];

interface WordGraphSearchBoxProps {
  theme?: ThemeMode;
  depth: number;
  onDepthChange: (depth: number) => void;
  query: string;
  onQueryChange: (query: string) => void;
  queryMode: QueryMode;
  onQueryModeChange: (mode: QueryMode) => void;
  onSubmit: () => void;
}

export default function WordGraphSearchBox({
  theme = "light",
  depth,
  onDepthChange,
  query,
  onQueryChange,
  queryMode,
  onQueryModeChange,
  onSubmit,
}: WordGraphSearchBoxProps) {
  const [focused, setFocused] = useState(false);
  const [sliderDragging, setSliderDragging] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDepth = queryMode === "twoWordsRelation";
  const expanded = focused || query.length > 0;

  const placeholder = useMemo(() => {
    if (!expanded) return "开始搜索...";
    switch (queryMode) {
      case "word":
        return "输入单词...";
      case "singleRelation":
        return "输入一个单词查看关系...";
      case "twoWordsRelation":
        return "输入两个单词，空格分隔...";
    }
  }, [queryMode, expanded]);

  const collapseNow = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocused(false);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    if (sliderDragging) return;
    blurTimerRef.current = setTimeout(() => {
      setFocused(false);
    }, 200);
  }, [sliderDragging]);

  const handleClear = useCallback(() => {
    onQueryChange("");
  }, [onQueryChange]);

  const handleModeChange = useCallback(
    (mode: QueryMode) => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      setFocused(true);
      onQueryModeChange(mode);
    },
    [onQueryModeChange]
  );

  const handleSubmit = useCallback(() => {
    onSubmit();
    collapseNow();
  }, [onSubmit, collapseNow]);

  const handleBackdropTap = useCallback(() => {
    collapseNow();
  }, [collapseNow]);

  const capsuleClasses = [
    "wsb-capsule",
    `wsb-theme-${theme}`,
    expanded ? "wsb-expanded" : "wsb-collapsed",
  ].join(" ");

  return (
    <View>
      {expanded && (
        <View className="wsb-backdrop" onTouchStart={handleBackdropTap} />
      )}

      <View className={capsuleClasses}>
        <View
          className={`wsb-expand-area ${expanded ? "wsb-expand-area--visible" : ""}`}
        >
          <View className="wsb-segmented">
            <View
              className="wsb-segmented-bg"
              style={{
                transform: `translateX(${MODES.findIndex((m) => m.value === queryMode) * 100}%)`,
              }}
            />
            {MODES.map((mode) => (
              <View
                key={mode.value}
                className={`wsb-segment ${queryMode === mode.value ? "wsb-segment--active" : ""}`}
                onClick={() => handleModeChange(mode.value)}
              >
                <Image className="wsb-segment-icon" src={mode.icon} />
                <Text>{mode.label}</Text>
              </View>
            ))}
          </View>

          {showDepth && (
            <View className="wsb-depth-row">
              <View className="wsb-depth-header">
                <Text className="wsb-depth-title">探索深度</Text>
                <Text className="wsb-depth-badge">{depthLabel(depth)}</Text>
              </View>
              <IosSlider
                value={depth}
                min={1}
                max={10}
                step={1}
                onValueChange={onDepthChange}
                onDragStateChange={setSliderDragging}
                trackClassName="wsb-slider-track"
                thumbClassName="wsb-slider-thumb"
              />
            </View>
          )}
        </View>

        <View className="wsb-search-row">
          <View className="wsb-photo-btn">
            <Photo size={20} />
          </View>

          <View className="wsb-input-shell">
            <View className="wsb-search-icon-left">
              <Search size={18} />
            </View>
            <Input
              className="wsb-input"
              placeholder={placeholder}
              value={query}
              onInput={(e) => onQueryChange(e?.detail?.value || "")}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onConfirm={handleSubmit}
              confirmType="search"
            />
            {query.length > 0 && (
              <View className="wsb-clear-btn" onClick={handleClear}>
                <Close size={16} />
              </View>
            )}
            <View
              className={`wsb-submit-btn ${query.trim() ? "wsb-submit-btn--active" : ""}`}
              onClick={handleSubmit}
            >
              <ArrowUp size={20} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export { depthLabel };
