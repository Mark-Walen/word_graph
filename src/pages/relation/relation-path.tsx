import { View } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import { useState } from "react";
import { getPathGraph, WordGraph } from "./lexipath";
import rawData from "./word-relation-data.json";
import WordFlow from "@/components/word-flow";

type PathQuery = {
  source: string;
  target: string;
  maxDepth: number;
};

type PathResult = {
  path: string[];
  nodes: WordGraph;
};

export default function RelationPath() {
  const [result, setResult] = useState<PathResult | null>(null);

  const mockData = rawData as unknown as WordGraph;

  useLoad((options) => {
    const raw = options?.words;
    if (!raw) return;

    const query = JSON.parse(decodeURIComponent(raw)) as PathQuery;
    const { source, target, maxDepth } = query;

    const res = getPathGraph(mockData, source, target, {
      maxDepth,
    });

    console.log(res);

    setResult({
      path: res.path,
      nodes: res.nodes,
    });
  });

  return (
    <View className="relation-path-page">
      <View className="relation-path-page-container">
        {result && (
          <WordFlow
            graphData={result.nodes}
            fullData={mockData}
            path={result.path}
            size={360}
          />
        )}
      </View>
    </View>
  );
}