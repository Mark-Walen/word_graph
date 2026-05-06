# Relation-Path Multi-Mode & Multi-Path Design

Date: 2026-05-03

## Overview

Refactor `relation-path.tsx` and `lexipath.ts` to support:

1. **Mixed-direction graph**: Uses `relation.ts` `RELATION_DIRECTION` — 11 bidirectional, 23 directed, 4 paired (2 pairs). Reverse edges auto-generated per type's direction category.
2. **Three path modes**: Strongest, Shortest, Show All.
3. **Discrete hop set**: Picker shows only actually achievable hop counts.
4. **Universal multi-path toggle**: Single-path browse vs. all-path overlay.
5. **Fixed endpoints**: Source/target pinned in canvas for stable traversal UX.

---

## 1. Data Layer — lexipath.ts

### 1.1 Symmetric Graph Construction

```typescript
import { getRelationDirection, getPairedType } from "./relation"

function buildSymmetricGraph(data: WordGraph): Record<string, Edge[]> {
  // For each relation:
  //   - Always add forward edge
  //   - If direction === "bidirectional": add reverse edge (same type + strength)
  //   - If direction === "paired": add reverse edge (paired type + same strength)
  //   - If direction === "directed": no reverse edge
}
```

`buildGraph` (existing) remains as-is for backward compat. New functions use `buildSymmetricGraph`.

### 1.2 New Path-Finding Functions

**`findAllShortestPathsAtDepth(graph, start, target, depth)`**
- DFS + backtrack, collect all paths with exactly `depth` hops.
- Returns `{ path, score }[]` sorted by score descending.

**`findAllBestPathsAtDepth(graph, start, target, depth)`**
- DFS + backtrack, collect all reachable paths within `depth` hops.
- Returns `{ path, score }[]` sorted by hop asc then score desc.

**`findAllReachablePaths(graph, start, target, maxDepth = 10)`**
- Same as above but unbounded hop; collects all paths up to maxDepth.
- Returns `{ path, score }[]` sorted by hop asc then score desc.

### 1.3 Existing Functions Keep Working

`findBestPathWithDepth`, `findShortestPath`, `getAvailableHops`, `buildExpandedSubgraph` — all unchanged except using symmetric graph internally.

---

## 2. UI — relation-path.tsx

### 2.1 Header Pickers

```
[关系: 全部] [路径: 最强相关▾] [步数: 2▾] [☐ 多路径] [🔍]
```

| Picker | Values |
|--------|--------|
| 关系 | `全部`, semantic groups from graph |
| 路径 | `最强相关`, `最短路径`, `显示全部` |
| 步数 | `[2, 4, ..., 不限]` — discrete hops from `getAvailableHops` |
| 多路径 | checkbox toggle |

### 2.2 Hop Options: Discrete + "不限"

- `depthOptions = ["不限", ...getAvailableHops(...)]`
- "不限" → `maxDepth = 10` (safe upper bound)
- Never show hop values that don't exist in the graph.
- When source/target change, hop set recomputed. If current depth ∉ new set, snap to nearest valid.

### 2.3 Mode → Data Mapping

| Mode | Data Function (single path) | Data Function (multi-path) |
|------|---------------------------|--------------------------|
| 最强相关 | `findBestPathWithDepth` | `findAllBestPathsAtDepth` |
| 最短路径 | `findShortestPath` | `findAllShortestPathsAtDepth` |
| 显示全部 | `findAllReachablePaths` (first) | `findAllReachablePaths` |

### 2.4 Multi-Path Toggle ☐

**Unchecked (default) — Browse Mode:**
- Breadcrumb visible: `◀ pathLabel ▶` + `路径 1 / N`
- ECharts shows single path. Source + target are **fixed** at canvas edges.
- `◀ ▶` controls cycle through `multiplePaths[currentPathIdx]`.

**Checked — Overlay Mode:**
- Breadcrumb **hidden**.
- ECharts renders all paths' nodes + edges simultaneously.
- Path edges get distinct colors; non-path edges are light gray.

### 2.5 Fixed Endpoints

In `buildEChartsOption`:
- Source node: `x` fixed to left (or if canvas not measured, use `itemStyle` emphasis).
- Target node: `x` fixed to right.
- Other nodes: free force layout.

Implemented via ECharts `fixed: true` on source/target nodes with explicit initial `x, y`.

### 2.6 State Variables (additions)

```typescript
const [multiplePaths, setMultiplePaths] = useState<Array<{path, score}>>([])
const [currentPathIdx, setCurrentPathIdx] = useState(0)
const [showAllPaths, setShowAllPaths] = useState(false)
const [hopMode, setHopMode] = useState<"selected" | "unlimited">("selected")
```

---

## 3. Path Browsing UX

### Single-Path Browse (unchecked)

```
┌─────────────────────────────────────────────────────────┐
│ ◀  happy → happiness → sadness  (2 hops)  ▶    1 / 3   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│   ●(happy)  ──  ●(happiness)  ──  ●(sadness)          │
│   [fixed]                               [fixed]         │
└─────────────────────────────────────────────────────────┘
```

- Click ◀: go to previous path, source/target stay, middle updates.
- Click ▶: go to next path.

### All-Path Overlay (checked)

```
┌─────────────────────────────────────────────────────────┐
│   ●(happy)  ──  ●(happiness)  ──  ●(sadness)   path 1 │
│           ↘  ●(sad)  ↗                        path 2   │
│   [fixed]                     [fixed]                   │
└─────────────────────────────────────────────────────────┘
```

- Breadcrumb hidden.
- All path edges visible.

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `lexipath.ts` | Add `buildSymmetricGraph`, `SYMMETRIC_TYPES`, `findAllShortestPathsAtDepth`, `findAllBestPathsAtDepth`, `findAllReachablePaths`. Refactor existing functions to use symmetric graph. |
| `relation-path.tsx` | Replace pickers with new mode set. Add multi-path toggle. Add path browsing UI. Add fixed endpoints to `buildEChartsOption`. Add overlay rendering. |
| `index.scss` | Add styles for path browse bar, toggle, overlay legend. |

---

## 5. Edge Cases

1. **Single path**: ◀ ▶ buttons disabled, show "1 / 1".
2. **Zero paths**: Error toast + empty canvas overlay.
3. **"不限" hops + large graph**: Capped at maxDepth=10. Toast warning if >20 paths found ("showing first 20").
4. **Fixed endpoints on mobile**: Use proportional positioning (left: 8%, right: 92% of canvas).
5. **Symmetric graph caching**: Compute once per (data, symmetric types) pair, reused across functions.

---

## 6. Data Validation & relation.ts

### 6.1 `relation.ts` Additions

```typescript
type RelationDirection = "bidirectional" | "directed" | "paired"

RELATION_DIRECTION: Record<string, RelationDirection> // one per type
PAIRED_RELATION: Record<string, string>              // hypernym↔hyponym, holonym↔meronym
getRelationDirection(type: string): RelationDirection
getPairedType(type: string): string
```

### 6.2 word-relation-data.json Fix

`word-relation-data.json` fixed:
- Added 272 missing minimal entries (empty definition, empty examples).
- Added 9 missing reciprocal edges for symmetric types.
- Total: 362 entries, 0 missing symmetric edges.
