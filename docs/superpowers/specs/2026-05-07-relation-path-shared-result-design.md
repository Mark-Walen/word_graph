# Relation-Path Shared Result, Stable Layout, and Viewport Rendering Design

Date: 2026-05-07

## Overview

Refine `relation-path` page behavior around single-path and multi-path modes:

1. **Shared result model**: A query produces one complete path result set used by both modes.
2. **Stable spatial continuity**: Single-path and multi-path views reuse the same node layout.
3. **Single-path visibility control**: Default behavior hides non-active paths; an internal switch can later dim them instead.
4. **Viewport-first rendering**: Keep the full graph result in memory, but only render the current visible window with a `1.2x` buffer.
5. **Unified graph interaction**: Empty canvas drags the viewport; tapping a node still opens detail.

This design is intentionally focused on the existing client-side `relation-path` page and does not require a new server contract.

---

## 1. Goals

### 1.1 User Problems To Solve

- In single-path mode, one-finger panning currently does not work as expected.
- Switching between single-path and multi-path mode feels like switching between different graphs instead of different views of the same graph.
- Users lose spatial context because single-path traversal can regenerate a different view rather than reveal or hide paths inside one shared result.

### 1.2 Desired Experience

- A single query computes the complete path set once.
- Single-path mode shows one chosen path from that complete set.
- Multi-path mode reveals the rest of the already-computed paths.
- Node positions remain stable across mode switches and path browsing.
- Large graphs stay responsive by rendering only the viewport plus a safety buffer.

---

## 2. Recommended Approach

### 2.1 Chosen Option

Use a **shared-result + stable-layout + viewport-rendering** model.

- Compute `allPaths` once for the current query.
- Build one `fullSubgraph` from that path set.
- Generate one `stableLayout` for all nodes in `fullSubgraph`.
- Derive the actual chart payload from:
  - current mode (`single` or `multi`)
  - current path index
  - viewport rectangle
  - single-path visibility policy (`hide` or `dim`)

### 2.2 Why This Option

- Best matches the intended UX: "show one path, hide others, then reveal them again."
- Preserves spatial memory because node coordinates do not jump when switching modes.
- Gives a clean place to fix touch behavior because both modes share the same graph interaction layer.
- Scales better than unconditional full rendering because viewport clipping limits chart payload size.

### 2.3 Alternatives Considered

#### Option A: Shared paths, separate graph generation

- Reuse `allPaths`, but rebuild chart data separately for single and multi modes.
- Better than current behavior, but still risks layout drift and duplicated logic.

#### Option B: Cache current implementation with minimal structural change

- Keep separate single/multi render flows and add caching to reduce recomputation.
- Lowest implementation cost, but does not fully solve continuity or touch divergence.

Option A is the selected design.

---

## 3. Architecture

### 3.1 Core Result Model

Introduce a page-level result object that becomes the only source of truth for the current query:

```typescript
type SinglePathVisibilityMode = "hide" | "dim"

interface SharedGraphResult {
  sourceWord: string
  targetWord: string
  pathMode: PathMode
  filterKey: FilterKey
  maxDepth: number
  allPaths: PathCandidate[]
  fullSubgraph: WordGraph
  stableLayout: Record<string, { x: number; y: number }>
}
```

Responsibilities:

- `allPaths`: all path candidates for browsing and overlay
- `fullSubgraph`: complete graph induced by `allPaths`
- `stableLayout`: fixed coordinates reused by all modes and path switches

### 3.2 Derived Render Model

The chart should not consume `SharedGraphResult` directly. Instead derive:

```typescript
interface ViewportState {
  centerX: number
  centerY: number
  zoom: number
  width: number
  height: number
}

interface RenderGraphPayload {
  nodes: any[]
  edges: any[]
  visiblePathCount: number
  activePath: PathCandidate | null
}
```

`RenderGraphPayload` is recalculated from:

- `sharedGraphResult`
- `showAllPaths`
- `currentPathIdx`
- `singlePathVisibilityMode`
- `viewportState`

### 3.3 Data Flow

1. User changes source/target/filter/path mode/depth.
2. Page computes `allPaths` once.
3. Page builds `fullSubgraph` from the complete path set.
4. Page generates or reuses `stableLayout`.
5. Page computes viewport bounds and a `1.2x` buffered render window.
6. Page derives `RenderGraphPayload`.
7. ECharts renders only the derived payload.
8. Drag/zoom updates viewport state, then recomputes only the render payload.

---

## 4. UI Behavior

### 4.1 Single-Path Mode

- Show only the current path by default.
- Hide all non-active path nodes and edges from the chart payload.
- Keep the path browsing controls (`prev`, `next`, counter).
- Preserve the same coordinates used by multi-path mode.

Internal toggle for future experiments:

```typescript
const SINGLE_PATH_VISIBILITY_MODE: SinglePathVisibilityMode = "hide"
```

Later this can be changed to `"dim"` without redesigning the rest of the pipeline.

### 4.2 Multi-Path Mode

- Reveal all nodes and edges covered by `allPaths`.
- Do not recompute paths or rebuild layout from scratch.
- Keep the same global coordinate system as single-path mode.

### 4.3 Mode Switch Semantics

- Mode switch changes visibility only.
- `allPaths`, `fullSubgraph`, and `stableLayout` remain the same.
- If the user is browsing path `N` in single-path mode, that path remains the active reference after switching to multi-path mode.

### 4.4 Touch Behavior

- Empty canvas drag pans the graph.
- Node tap opens the node detail panel.
- Edge tap opens relation detail.
- Long-press context menu remains supported if it does not block normal pan behavior.

Implementation intent:

- Do not keep separate touch behavior for single-path and multi-path flows.
- Resolve the current mismatch by moving both modes onto one graph interaction model.

---

## 5. Viewport Rendering

### 5.1 Motivation

`fullSubgraph` can be meaningfully larger than the active screen. Keeping the full result in memory is useful for continuity, but sending all nodes and edges to ECharts at once can make first render and updates heavier than necessary.

### 5.2 Rule

Only render the current visible region plus a `1.2x` buffer.

Definitions:

- `viewport`: current visible chart window
- `renderWindow`: viewport expanded by `20%` in each direction

### 5.3 Render Selection

Nodes:

- Include any node whose `stableLayout` coordinates fall inside `renderWindow`.
- Always include nodes on the active path, even if they are slightly outside the current window.
- In multi-path mode, include nodes for visible paths if they fall inside `renderWindow`.

Edges:

- Include edges when both endpoints are included.
- Always include edges on the active path.
- For multi-path mode, include overlay edges whose endpoints are in the render set.

### 5.4 Dynamic Loading

When the user drags or zooms:

- update `viewportState`
- recompute `renderWindow`
- add nodes and edges entering the new window
- remove non-critical nodes and edges leaving the old window

To avoid noisy updates:

- throttle or debounce viewport recomputation
- prefer incremental chart refresh over rebuilding unrelated page state

### 5.5 Fallback

If viewport clipping proves unstable with the current ECharts/Taro integration:

- continue to keep `fullSubgraph` and `stableLayout`
- always render active-path nodes and edges
- viewport-clip only non-path contextual nodes first

This fallback preserves the main UX win while reducing risk.

---

## 6. Graph Layout

### 6.1 Stable Layout Requirement

`stableLayout` must be generated before viewport clipping and before single-vs-multi visibility filtering.

This guarantees:

- path switching does not move nodes around
- mode switching feels like reveal/hide, not regenerate
- viewport rendering can safely include and exclude items without changing coordinates

### 6.2 Practical Strategy

- Build layout from `fullSubgraph`
- Store coordinates by node id
- Reuse the same coordinates when creating chart nodes for all later renders

Source and target can still keep stronger positional constraints if needed, but those constraints must be applied consistently in both modes.

---

## 7. Implementation Scope

### 7.1 Main Files

| File | Planned changes |
|------|-----------------|
| `src/pages/relation/relation-path.component.tsx` | Introduce `SharedGraphResult`, derive render payload, unify single/multi chart option flow, add viewport state handling, fix touch interaction divergence |
| `src/pages/relation/relation-path.tsx` | Likely unchanged if it remains a re-export |
| related graph/path utilities | Add helpers for `fullSubgraph` assembly, stable layout generation, viewport clipping, and visibility derivation |
| related styles | Minor updates if the browsing bar or mode indicator needs to reflect the new semantics |

### 7.2 Existing Branch Points To Simplify

Current code branches between `buildMultiPathOption()` and `buildSinglePathOption()`.

Desired end state:

- one shared data pipeline
- one shared interaction model
- a smaller view-layer branch that only decides visibility and styling

---

## 8. Error Handling

- If no paths are found, keep the existing empty state behavior.
- If viewport calculation fails, fall back to rendering the active path only.
- If `stableLayout` cannot be generated, fall back once to a simpler full render and show no extra warning unless failure becomes user-visible.
- If dynamic viewport updates are too frequent, throttle before optimizing deeper.

---

## 9. Testing Strategy

### 9.1 Manual Checks

1. In single-path mode, dragging empty canvas pans the graph with one finger.
2. In single-path mode, tapping a node still opens detail.
3. Switching from single-path to multi-path preserves node positions.
4. Switching back to single-path restores the previously active path.
5. Browsing path `N -> N+1` does not regenerate an unrelated layout.
6. Dragging or zooming loads nearby nodes without obvious flicker.
7. Active path never breaks apart because of viewport clipping.

### 9.2 Focused Automated Coverage

Add helper-level tests only where they reduce regression risk:

- visibility derivation from `allPaths` and `currentPathIdx`
- viewport inclusion logic
- active-path preservation rules

Avoid UI tests that merely restate implementation details without catching real regressions.

---

## 10. Diagrams

### 10.1 Full Shared Result

```text
SharedGraphResult
┌──────────────────────────────────────────────────────────────┐
│ allPaths                                                    │
│  path 1: A -> B -> D                                        │
│  path 2: A -> C -> D                                        │
│  path 3: A -> B -> E -> D                                   │
│                                                              │
│ fullSubgraph                                                 │
│      B ----- E                                               │
│     / \     /                                                │
│    A   \   /   D                                             │
│     \   \ /   /                                              │
│      C-----------                                            │
│                                                              │
│ stableLayout                                                 │
│  A,B,C,D,E each have fixed coordinates reused by all modes   │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 Single-Path Mode

```text
Single-path mode, currentPathIdx = 0, visibility = "hide"

Visible to user:
┌────────────────────────────────────────────┐
│ A  --------  B  --------  D                │
└────────────────────────────────────────────┘

Still retained in memory but hidden:
  A -> C -> D
  A -> B -> E -> D
```

### 10.3 Switch To Multi-Path

```text
Before switch:
  only A -> B -> D is rendered

After switch:
┌────────────────────────────────────────────┐
│        B ----- E                           │
│       / \     /                            │
│      A   \   /   D                         │
│       \   \ /   /                          │
│        C-----------                        │
└────────────────────────────────────────────┘

Meaning:
  Same result set
  Same coordinates
  More visibility
  No path recomputation
```

### 10.4 Viewport Rendering

```text
Full layout space

┌──────────────────────────────────────────────────────────────┐
│                                                              │
│     [ renderWindow = viewport * 1.2 ]                        │
│      ┌──────────────────────────────────────┐                │
│      │          current viewport            │                │
│      │      ┌────────────────────────┐      │                │
│      │      │ only these nearby      │      │                │
│      │      │ nodes/edges render     │      │                │
│      │      └────────────────────────┘      │                │
│      └──────────────────────────────────────┘                │
│                                                              │
│ active path nodes may remain rendered even near the edge     │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. Open Implementation Notes

- The current single-path option appears to use a different graph configuration from multi-path and likely contributes to the missing drag behavior.
- The first implementation should prefer correctness and continuity over aggressive micro-optimization.
- The `dim` mode is explicitly out of scope for this change, but the variable hook should be added so the behavior can be toggled later without redesign.
