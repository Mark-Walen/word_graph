# Relation-Path Shared Result Implementation Plan

Date: 2026-05-07

## Goal

Implement the approved `relation-path` redesign in small, verifiable steps:

1. single-path and multi-path share one query result
2. switching modes changes visibility instead of regenerating graph data
3. single-path drag behavior works on mobile
4. large graphs render through viewport-window clipping with a `1.2x` buffer

---

## Current State Summary

The page already requests `multiPath: true`, but the render pipeline still forks too early:

- query result is stored in `pathResult`
- graph data is stored separately in `pathSubgraph`
- `currentPath` is derived from `pathCandidates`
- rendering branches between `buildMultiPathOption()` and `buildSinglePathOption()`
- single-path uses a different graph configuration from multi-path, including `layout: "none"` and `draggable: false`

This means the page already has most of the source data needed for a shared-result design, but still behaves as two different viewers.

---

## Phase 1: Shared Result Model

### Objective

Create one page-level result object that becomes the single source of truth for the current query.

### Tasks

1. Introduce `SharedGraphResult` in `relation-path.component.tsx` or a nearby helper module.
2. Replace separate `pathResult` and `pathSubgraph` usage with a single object containing:
   - query metadata
   - `allPaths`
   - `fullSubgraph`
   - `stableLayout`
3. Normalize fetch output immediately after `fetchPath()` resolves.
4. Keep `currentPathIdx`, `showAllPaths`, and other UI flags separate from fetched result state.
5. Reset browsing-only state when source/target/mode/depth changes.

### Exit Criteria

- one query writes one normalized shared result object
- single-path and multi-path both derive from the same stored result
- no extra path regeneration happens during mode toggle

---

## Phase 2: Visibility-Derived Render Pipeline

### Objective

Turn chart payload generation into a pure derivation step from shared data plus UI state.

### Tasks

1. Add a small render derivation layer:
   - resolve active path
   - resolve visible path set
   - resolve visible node ids
   - resolve visible edge ids
2. Add an internal variable such as:

```typescript
const SINGLE_PATH_VISIBILITY_MODE: "hide" | "dim" = "hide"
```

3. Default to `"hide"` behavior for this implementation.
4. Refactor `buildSinglePathOption()` and `buildMultiPathOption()` toward a shared option builder.
5. Keep only lightweight branching for:
   - single-path labels and breadcrumb controls
   - hidden vs dimmed styling

### Exit Criteria

- mode switch only changes visibility inputs
- current path index survives round-trip switching
- the graph no longer feels regenerated when switching modes

---

## Phase 3: Stable Layout

### Objective

Generate one reusable layout for the whole shared graph result.

### Tasks

1. Decide where layout coordinates are created:
   - inline in component for first pass, or
   - helper utility if extraction improves clarity
2. Build `stableLayout` from `fullSubgraph` before any viewport clipping.
3. Preserve source/target positional constraints consistently in both modes.
4. Ensure path browsing (`N -> N+1`) reuses the same coordinates.
5. Verify hidden paths do not affect coordinate reuse when later revealed.

### Exit Criteria

- switching mode does not relocate nodes
- browsing between paths changes visibility, not geometry

---

## Phase 4: Touch and Interaction Unification

### Objective

Fix single-path drag behavior by aligning touch interaction across both render modes.

### Tasks

1. Remove the behavior split that makes single-path non-draggable.
2. Move both modes onto one graph interaction model.
3. Keep these behaviors:
   - drag on empty canvas pans
   - tap node opens detail
   - tap edge opens relation detail
   - long-press menu only appears when it does not steal normal drag intent
4. Re-test collapse-node behavior if it remains in single-path mode.
5. Confirm no header or overlay layer blocks pointer/touch events above the canvas.

### Exit Criteria

- one-finger dragging works in single-path mode
- node tap and edge tap still work
- long-press menu does not introduce obvious mis-touch regressions

---

## Phase 5: Viewport Rendering

### Objective

Keep complete graph results in memory while limiting the rendered chart payload to the visible area plus buffer.

### Tasks

1. Introduce `viewportState`:
   - center
   - zoom
   - viewport width
   - viewport height
2. Define a render window equal to `viewport * 1.2`.
3. Include nodes whose stable coordinates fall inside that render window.
4. Always keep active-path nodes and edges rendered, even near or slightly beyond the edge.
5. Include non-path context only when it falls inside the render window.
6. Recompute render payload on drag and zoom with throttling.
7. Prefer incremental chart refresh if supported by the existing ECharts wrapper.

### Exit Criteria

- initial chart payload is smaller than full-graph payload on large results
- dragging and zooming load nearby graph content without visible path breakage
- active path remains continuous even when viewport clipping is applied

---

## Phase 6: Fallback and Hardening

### Objective

Reduce rollout risk if viewport clipping or unified rendering exposes instability.

### Tasks

1. Add a temporary guarded fallback path:
   - always render active path
   - viewport-clip only non-path context
2. Guard against empty render payloads caused by clipping edge cases.
3. Clamp `currentPathIdx` whenever path list changes.
4. Ensure relation filter changes recompute visible edge sets correctly.
5. Verify loading and empty states still work after state consolidation.

### Exit Criteria

- no blank chart from clipping edge cases
- mode/filter/path browsing state stays internally consistent

---

## Suggested File Changes

### `src/pages/relation/relation-path.component.tsx`

- add `SharedGraphResult`
- add `stableLayout`
- add `viewportState`
- consolidate chart derivation logic
- unify graph option builder path
- fix single-path drag interaction

### extracted helper module if needed

Candidate helpers:

- `buildSharedGraphResult()`
- `buildStableLayout()`
- `deriveVisibleGraph()`
- `isNodeInRenderWindow()`

Extraction is optional for the first pass. Prefer extraction only when it reduces component complexity materially.

### styles

- only adjust styles if interaction overlays or browse controls need to reflect the new semantics

---

## Verification Plan

### Manual

1. Open a result with multiple paths.
2. Browse path `1 -> 2 -> 3` in single-path mode and confirm node positions stay stable.
3. Switch to multi-path mode and confirm the same graph expands rather than regenerates.
4. Switch back to single-path mode and confirm the previously active path is still selected.
5. Drag with one finger on empty canvas in single-path mode.
6. Tap node detail and edge detail after drag support is enabled.
7. On a larger graph, drag and zoom across viewport boundaries and confirm nearby content loads without flicker or path loss.

### Focused Tests

Add helper-level tests only if helpers are extracted. Prioritize:

- active path selection
- visible node and edge derivation
- viewport inclusion logic
- `currentPathIdx` clamping

---

## Recommended Execution Order

1. consolidate result state
2. derive visibility from shared state
3. stabilize layout reuse
4. unify touch behavior
5. add viewport clipping
6. harden edge cases and test

This order reduces risk because each phase builds on a stable abstraction from the previous one.

---

## Risks

### Risk 1: Unified builder becomes too large

Mitigation:

- keep derivation helpers small and pure
- extract only the visibility and viewport math first

### Risk 2: Viewport clipping fights ECharts force behavior

Mitigation:

- compute stable coordinates before clipping
- fall back to clipping only contextual nodes if needed

### Risk 3: Touch events still conflict with long-press

Mitigation:

- keep long-press timer isolated from drag start conditions
- validate on real mobile interaction before polishing secondary UX

---

## Done Definition

This implementation is complete when:

- single-path and multi-path use the same stored result
- mode switching preserves spatial continuity
- single-path dragging works with one finger
- active path remains intact under viewport rendering
- no obvious regressions appear in detail panels, filtering, or path browsing
