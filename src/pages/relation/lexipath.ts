// ===== 类型定义 =====

import { getRelationDirection, getPairedType } from "./relation"

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
  synonym: 1.0,
  antonym: 0.8,
  to_noun: 0.95,
  to_adv: 0.95,
  comparative: 0.9,
  superlative: 0.9,
  related: 0.6,
  present_participle: 0.95,
  past_tense: 0.95,
};

function getEdgeWeight(rel: Relation): number {
  const raw = rel.strength * (TYPE_WEIGHT[rel.type] ?? 1.0)
  return Math.min(raw, 0.999)
}

// ===== 构建有向图 (原始) =====

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

// ===== 构建混合方向图 (按 RELATION_DIRECTION 规则) =====

export function buildSymmetricGraph(data: WordGraph): Record<string, Edge[]> {
  const graph: Record<string, Edge[]> = {};

  const ensureEdges = (word: string) => {
    if (!graph[word]) graph[word] = [];
  };

  Object.values(data).forEach((node) => {
    ensureEdges(node.word);
    node.relations.forEach((rel) => {
      graph[node.word].push({ to: rel.word, weight: getEdgeWeight(rel) });

      const dir = getRelationDirection(rel.type);
      if (dir === "bidirectional") {
        ensureEdges(rel.word);
        graph[rel.word].push({ to: node.word, weight: getEdgeWeight(rel) });
      } else if (dir === "paired") {
        const pairedType = getPairedType(rel.type);
        ensureEdges(rel.word);
        graph[rel.word].push({
          to: node.word,
          weight: getEdgeWeight({ ...rel, type: pairedType } as Relation),
        });
      }
    });
  });

  return graph;
}

const _symGraphCache = new WeakMap<WordGraph, Record<string, Edge[]>>();

function getSymGraph(data: WordGraph): Record<string, Edge[]> {
  let g = _symGraphCache.get(data);
  if (!g) {
    g = buildSymmetricGraph(data);
    _symGraphCache.set(data, g);
  }
  return g;
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

// ===== 子图提取 (仅路径节点) =====

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

// ===== 子图提取 (路径节点 + 直接邻居，用于可视化) =====

export function buildExpandedSubgraph(
  data: WordGraph,
  path: string[]
): WordGraph {
  const result: WordGraph = {};
  const pathSet = new Set(path);
  const included = new Set(path);

  path.forEach((word) => {
    const node = data[word];
    if (!node) return;
    node.relations.forEach((r) => included.add(r.word));
  });

  included.forEach((word) => {
    const node = data[word];
    if (node) {
      result[word] = {
        ...node,
        relations: node.relations.filter((r) => included.has(r.word)),
      }
    } else {
      result[word] = { word, relations: [] }
    }
  });

  return result;
}

// ===== BFS 最短路径 (最少步数) =====

export function findShortestPath(
  graph: Record<string, Edge[]>,
  start: string,
  target: string,
  maxDepth = 5
): { path: string[]; score: number } {
  const visited = new Set<string>();
  const prev: Record<string, string | null> = { [start]: null };
  const queue: string[] = [start];
  visited.add(start);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === target) break;

    const edges = graph[cur];
    if (!edges) continue;

    for (const edge of edges) {
      const next = edge.to;
      if (visited.has(next)) continue;

      // 计算当前深度 (边数 = 节点数 - 1)
      let depth = 0;
      let p: string | null = cur;
      while (p && prev[p] !== null) { depth++; p = prev[p]!; }

      if (depth >= maxDepth) continue;

      visited.add(next);
      prev[next] = cur;
      queue.push(next);
    }
  }

  if (!(target in prev)) {
    return { path: [], score: 0 };
  }

  const path: string[] = [];
  let cur: string | null = target;
  while (cur) {
    path.push(cur);
    cur = prev[cur] ?? null;
  }
  path.reverse();

  return { path, score: 1 / path.length };
}

// ===== 最终 API =====

export type PathMode = "shortest" | "strongest"

export function getAvailableHops(
  data: WordGraph,
  start: string,
  target: string,
  maxProbeDepth = 10
): number[] {
  const graph = getSymGraph(data)
  const hopSet = new Set<number>()
  for (let d = 2; d <= maxProbeDepth; d++) {
    const best = findBestPathWithDepth(graph, start, target, d)
    if (best.path.length > 0) hopSet.add(best.path.length - 1)
    const short = findShortestPath(graph, start, target, d)
    if (short.path.length > 0) hopSet.add(short.path.length - 1)
  }
  return Array.from(hopSet).sort((a, b) => a - b)
}

// ===== 多路径收集 =====

export function findAllPathsAtDepth(
  data: WordGraph,
  start: string,
  target: string,
  depth: number,
  maxResults = 50
): { path: string[]; score: number }[] {
  const graph = getSymGraph(data)
  const results: { path: string[]; score: number }[] = []
  const stack: { word: string; path: string[]; cost: number }[] = [
    { word: start, path: [start], cost: 0 },
  ]

  while (stack.length && results.length < maxResults) {
    const cur = stack.pop()!
    const { word, path, cost } = cur

    if (path.length - 1 > depth) continue

    if (word === target && path.length - 1 === depth) {
      const score = Math.exp(-cost)
      results.push({ path: [...path], score })
      continue
    }

    const edges = graph[word]
    if (!edges) continue

    for (const edge of edges) {
      if (path.includes(edge.to)) continue
      if (path.length - 1 >= depth) continue
      const weight = Math.max(edge.weight, 1e-6)
      stack.push({
        word: edge.to,
        path: [...path, edge.to],
        cost: cost - Math.log(weight),
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

export function findAllReachablePaths(
  data: WordGraph,
  start: string,
  target: string,
  maxDepth = 10,
  maxResults = 50
): { path: string[]; score: number; hops: number }[] {
  const graph = getSymGraph(data)
  const results: { path: string[]; score: number; hops: number }[] = []
  const visited = new Set<string>()

  const dfs = (
    word: string,
    path: string[],
    cost: number,
  ) => {
    if (results.length >= maxResults) return
    if (path.length - 1 > maxDepth) return

    if (word === target && path.length > 1) {
      const hops = path.length - 1
      results.push({ path: [...path], score: Math.exp(-cost), hops })
      return
    }

    const edges = graph[word]
    if (!edges) return

    for (const edge of edges) {
      if (path.includes(edge.to)) continue
      const weight = Math.max(edge.weight, 1e-6)
      dfs(edge.to, [...path, edge.to], cost - Math.log(weight))
    }
  }

  dfs(start, [start], 0)

  results.sort((a, b) => a.hops - b.hops || b.score - a.score)
  return results.filter((r, i, arr) => {
    const key = r.path.join("|")
    return arr.findIndex((x) => x.path.join("|") === key) === i
  })
}

export function getPathGraph(
  data: WordGraph,
  start: string,
  target: string,
  options?: { maxDepth?: number; mode?: PathMode }
) {
  const { maxDepth = 5, mode = "strongest" } = options || {}

  const graph = getSymGraph(data)

  const finder = mode === "shortest" ? findShortestPath : findBestPathWithDepth

  const { path, score } = finder(graph, start, target, maxDepth)

  const subgraph = buildExpandedSubgraph(data, path)

  return {
    path,
    score,
    hops: Math.max(0, path.length - 1),
    intermediates: Math.max(0, path.length - 2),
    nodes: subgraph,
  }
}
