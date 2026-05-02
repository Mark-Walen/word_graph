// ===== 类型定义 =====

export type RelationType =
  | "synonym"
  | "antonym"
  | "to_noun"
  | "to_adv"
  | "comparative"
  | "superlative"
  | "related"
  | "present_participle"
  | "past_tense";

export interface Relation {
  word: string;
  type: RelationType;
  strength: number;
}

export interface WordNode {
  word: string;
  relations: Relation[];
}

export type WordGraph = Record<string, WordNode>;

export type Edge = {
  to: string;
  weight: number;
};

// ===== 边类型加权 =====

const TYPE_WEIGHT: Record<RelationType, number> = {
  synonym: 1.2,
  antonym: 0.8,
  to_noun: 1.0,
  to_adv: 1.0,
  comparative: 0.9,
  superlative: 0.9,
  related: 0.6,
  present_participle: 1.0,
  past_tense: 1.0,
};

function getEdgeWeight(rel: Relation): number {
  return rel.strength * (TYPE_WEIGHT[rel.type] ?? 1.0);
}

// ===== 构建图 =====

export function buildGraph(data: WordGraph): Record<string, Edge[]> {
  const graph: Record<string, Edge[]> = {};

  Object.values(data).forEach((node) => {
    graph[node.word] = node.relations.map((rel) => ({
      to: rel.word,
      weight: getEdgeWeight(rel),
    }));
  });

  return graph;
}

// ===== 状态定义（核心）=====

type State = {
  word: string;
  cost: number;   // -log(prob)
  depth: number;
};

// ===== 状态级 Dijkstra =====

export function findBestPathWithDepth(
  graph: Record<string, Edge[]>,
  start: string,
  target: string,
  maxDepth = 5
): { path: string[]; score: number } {
  // dist[node][depth] = cost
  const dist: Record<string, Record<number, number>> = {};

  // prev[node][depth] = parent
  const prev: Record<string, Record<number, string | null>> = {};

  const pq: State[] = [];

  const push = (s: State) => {
    pq.push(s);
    pq.sort((a, b) => a.cost - b.cost);
  };

  push({ word: start, cost: 0, depth: 0 });

  dist[start] = { 0: 0 };
  prev[start] = { 0: null };

  let bestTargetCost = Infinity;
  let bestTargetDepth: number | null = null;

  while (pq.length) {
    const cur = pq.shift()!;
    const { word, cost, depth } = cur;

    // 已经有更优解就剪枝
    if (cost > bestTargetCost) continue;

    if (word === target) {
      if (cost < bestTargetCost) {
        bestTargetCost = cost;
        bestTargetDepth = depth;
      }
      continue; // ⚠️ 不能 break
    }

    if (!graph[word]) continue;

    for (const edge of graph[word]) {
      const next = edge.to;
      const nextDepth = depth + 1;

      if (nextDepth > maxDepth) continue;

      const weight = Math.max(edge.weight, 1e-6);
      const newCost = cost - Math.log(weight);

      if (!dist[next]) dist[next] = {};
      if (!prev[next]) prev[next] = {};

      if (
        dist[next][nextDepth] === undefined ||
        newCost < dist[next][nextDepth]
      ) {
        dist[next][nextDepth] = newCost;
        prev[next][nextDepth] = word;

        push({
          word: next,
          cost: newCost,
          depth: nextDepth,
        });
      }
    }
  }

  // ===== 回溯 =====

  if (bestTargetDepth === null) {
    return { path: [], score: 0 };
  }

  const path: string[] = [];

  let cur: string | null = target;
  let depth = bestTargetDepth;

  while (cur !== null) {
    path.push(cur);

    const parent = prev[cur]?.[depth];
    if (parent === undefined) break;

    cur = parent;
    depth -= 1;
  }

  path.reverse();

  // 概率 = exp(-cost)
  const score = Math.exp(-bestTargetCost);

  return { path, score };
}

// ===== 子图提取 =====

export function buildPathSubgraph(
  data: WordGraph,
  path: string[]
): WordGraph {
  const result: WordGraph = {};
  const set = new Set(path);

  path.forEach((word) => {
    const node = data[word];
    if (!node) return;

    result[word] = {
      ...node,
      relations: node.relations.filter((r) => set.has(r.word)),
    };
  });

  return result;
}

// ===== 最终 API =====

export function getPathGraph(
  data: WordGraph,
  start: string,
  target: string,
  options?: { maxDepth?: number }
) {
  const { maxDepth = 5 } = options || {};

  const graph = buildGraph(data);

  const { path, score } = findBestPathWithDepth(
    graph,
    start,
    target,
    maxDepth
  );

  const subgraph = buildPathSubgraph(data, path);

  return {
    path,
    score,
    nodes: subgraph,
  };
}
