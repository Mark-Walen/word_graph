# Word Graph 服务端图计算设计规范

**日期**: 2026-05-04
**状态**: 已确认
**平台**: 跨平台 (weapp, h5 等)

---

## 概述

将 `lexipath.ts` 的图算法从客户端移到服务端，建立一个小型图数据库，前端通过 REST API 查询路径和子图结果，消除 `/api/graph` 全量传输（77KB）。

---

## 服务端文件结构

```
server/
├── package.json
├── tsconfig.json
├── index.ts          # Express 入口 + 路由
├── graph-db.ts       # 图数据库：索引 + 算法 (从 lexipath.ts 移植)
└── relation.ts       # 关系类型常量 (从 src/pages/relation/relation.ts 复制)
```

---

## graph-db.ts 设计

### 启动初始化

```
1. 读取 word-relation-data.json
2. 构建 wordIndex: Map<word, { phonetic, partOfSpeech, level, definition, examples, relations }>
3. 构建 adjList: Map<word, { to, type, strength }[]>（对称邻接表）
   - bidirectional: 双向边
   - paired: 用配对类型补充反向边
   - directed: 单向边
```

### 算法函数（从 lexipath.ts 移植）

- `buildSymmetricGraph(data)` → `adjList`
- `findBestPathWithDepth(adjList, start, target, maxDepth)` → `{ path, score }`
- `findShortestPath(adjList, start, target, maxDepth)` → `{ path, score }`
- `findAllPathsAtDepth(data, start, target, depth, maxResults)` → `{ path, score }[]`
- `findAllReachablePaths(data, start, target, maxDepth, maxResults)` → `{ path, score, hops }[]`
- `getAvailableHops(data, start, target, maxProbeDepth)` → `number[]`
- `buildExpandedSubgraph(data, path)` → `WordGraph`
- `getPathGraph(data, start, target, options)` → `{ path, score, hops, nodes }`

### 图索引缓存

- 邻接表在服务启动时构建一次，后续所有请求复用
- 单例 pattern，避免每次请求重建

---

## API 端点设计

### 已有端点（保留）

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/words/search?q=` | 搜索 (已有) |
| `GET` | `/api/words/:word` | 词详情 (已有) |
| `GET` | `/api/words/:word/relations` | 关系 (已有) |

### 新增端点

#### `GET /api/words/:word/subgraph`

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `depth` | number | 1 | 子图展开深度 (1=直接关系) |
| `filter` | string | `all` | `all`/`semantic`/`formal`/`morphological`/`associative` |

**响应**：
```json
{
  "center": { "word", "phonetic", "partOfSpeech", "level", "definition", "examples" },
  "nodes": { "happy": {...}, "joyful": {...}, ... },
  "edges": [
    { "source": "happy", "target": "joyful", "type": "synonym", "strength": 0.9, "label": "同义词" },
    ...
  ],
  "relationGroups": ["semantic", "morphological"]
}
```

#### `GET /api/path`

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `source` | string | 必填 | 起始词 |
| `target` | string | 必填 | 目标词 |
| `mode` | string | `strongest` | `strongest`/`shortest`/`showAll` |
| `maxDepth` | number | 5 | 1-10, showAll 默认 10 |
| `multiPath` | boolean | `false` | 是否返回多路径 |
| `filter` | string | `all` | `all`/`semantic`/`formal`/`morphological`/`associative` |

**单路径响应** (`multiPath=false`)：
```json
{
  "path": ["happy", "joyful", "ecstatic"],
  "hops": 2,
  "score": 0.85,
  "subgraph": {
    "nodes": { "happy": {...}, "joyful": {...}, "ecstatic": {...}, ... },
    "edges": [
      { "source": "happy", "target": "joyful", "type": "synonym", "strength": 0.9, "label": "同义词" },
      ...
    ]
  },
  "availableHops": [2, 3, 4],
  "relationGroups": ["semantic", "morphological", "formal"]
}
```

**多路径响应** (`multiPath=true`)：
```json
{
  "path": ["happy", "joyful", "ecstatic"],
  "hops": 2,
  "score": 0.85,
  "allPaths": [
    { "path": ["happy", "joyful", "ecstatic"], "hops": 2, "score": 0.85 },
    { "path": ["happy", "glad", "ecstatic"], "hops": 2, "score": 0.72 }
  ],
  "subgraph": { "nodes": {...}, "edges": [...] },
  "availableHops": [2, 3, 4],
  "relationGroups": ["semantic"]
}
```

### mode → 服务端函数映射

| mode | single | multiPath |
|------|--------|-----------|
| `strongest` | `findBestPathWithDepth()` | `findAllPathsAtDepth()` |
| `shortest` | `findShortestPath()` | `findAllPathsAtDepth()` |
| `showAll` | `findAllReachablePaths()[0]` | `findAllReachablePaths()` |

### 错误处理

| 情况 | HTTP Status | 响应 |
|------|-------------|------|
| 缺少 source/target | 400 | `{ "error": "source and target are required" }` |
| 词不存在 | 400 | `{ "error": "Word 'xxx' not found" }` |
| 无路径 | 200 | `{ "path": [], "hops": 0, "subgraph": {}, "availableHops": [] }` |
| 深度超限 | 400 | `{ "error": "maxDepth must be 1-10" }` |

---

## 前端变化

### 各页面消费方式

| 页面 | 之前 | 之后 | API |
|------|------|------|-----|
| **search** | `fetch(/api/words/search?q=)` | 不变 | `/api/words/search` |
| **word-detail** | `fetch(/api/words/:word)` | 不变 | `/api/words/:word` |
| **relation** | `fetch(/api/graph)` → 本地 `buildEChartsOption` | `fetch(/api/words/:word/subgraph)` | `/api/words/:word/subgraph` |
| **relation-path** | `fetch(/api/graph)` → 本地 `recomputeWithTiebreak` | `fetch(/api/path?...)` | `/api/path` |

### relation/index.tsx 改造

- 移除 `wordGraph` state（不再拉全量 graph）
- `useDidShow` 时调用 `fetch(/api/words/${word}/subgraph)`
- 得到 `{ center, nodes, edges, relationGroups }`，直接传给 ECharts
- filter/displayMode 切换：模式 1（不发请求，本地 filter edges）或模式 2（重新请求带 filter 参数）

### relation-path.tsx 改造

- 移除 `wordGraph` state、`recomputeWithTiebreak` 函数
- 调用 `fetch(/api/path?...params)` 获取路径结果
- 响应中的 `subgraph` 直接喂给 ECharts
- `availableHops` 直接用于 Picker option
- `allPaths` 直接用于多路径浏览
- filter 切换：同上，两种模式都支持

### `/api/graph` 端点

保留但不再被前端消费（可后续移除）。

---

## 非目标

- 不引入外部图数据库 (Neo4j 等)
- 不修改 `lexipath.ts` 算法逻辑本身
- 不引入 PostgreSQL
- 不做图数据更新 API (仍为只读)

---

## 搜索历史 (内存存储)

服务器内存中按 mode 存储搜索历史，停止即清。

### 数据模型

```
history: { word: [...], singleRelation: [...], twoWordsRelation: [...] }
每项: { id, word, word2?, type, meaning, starred }
```

### 端点

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/history?mode=word` | 获取某 mode 的历史列表 |
| `POST` | `/api/history` | 添加一条历史 `{ mode, word, word2?, type, meaning }` |
| `PATCH` | `/api/history/:id/star` | 切换收藏 `{ mode }` |
| `DELETE` | `/api/history?mode=word` | 清空某 mode 历史 |

### search/index.tsx 改造

- 移除 `historyByMode` local state
- 进入页面时 `GET /api/history?mode=word`
- `onSubmitQuery` 时 `POST /api/history`
- `toggleStar` 时 `PATCH /api/history/:id/star`
- `clearHistory` 时 `DELETE /api/history?mode=word`
