import test from "node:test"
import assert from "node:assert/strict"

import {
  buildSharedGraphOption,
  deriveVisibleGraph,
  type PathCandidate,
  type SinglePathVisibilityMode,
  type WordGraph,
} from "../src/pages/relation/relation-path.shared"

function sampleGraph(): WordGraph {
  return {
    A: {
      word: "A",
      phonetic: "",
      starred: false,
      partOfSpeech: "",
      level: "",
      definition: "",
      examples: [],
      relations: [
        { word: "B", type: "synonym", strength: 0.9 },
        { word: "C", type: "related", strength: 0.7 },
      ],
    },
    B: {
      word: "B",
      phonetic: "",
      starred: false,
      partOfSpeech: "",
      level: "",
      definition: "",
      examples: [],
      relations: [
        { word: "A", type: "synonym", strength: 0.9 },
        { word: "D", type: "synonym", strength: 0.8 },
        { word: "E", type: "related", strength: 0.6 },
      ],
    },
    C: {
      word: "C",
      phonetic: "",
      starred: false,
      partOfSpeech: "",
      level: "",
      definition: "",
      examples: [],
      relations: [
        { word: "A", type: "related", strength: 0.7 },
        { word: "D", type: "antonym", strength: 0.6 },
      ],
    },
    D: {
      word: "D",
      phonetic: "",
      starred: false,
      partOfSpeech: "",
      level: "",
      definition: "",
      examples: [],
      relations: [
        { word: "B", type: "synonym", strength: 0.8 },
        { word: "C", type: "antonym", strength: 0.6 },
        { word: "E", type: "related", strength: 0.5 },
      ],
    },
    E: {
      word: "E",
      phonetic: "",
      starred: false,
      partOfSpeech: "",
      level: "",
      definition: "",
      examples: [],
      relations: [
        { word: "B", type: "related", strength: 0.6 },
        { word: "D", type: "related", strength: 0.5 },
      ],
    },
  }
}

function samplePaths(): PathCandidate[] {
  return [
    { path: ["A", "B", "D"], score: 0.9, hops: 2 },
    { path: ["A", "C", "D"], score: 0.8, hops: 2 },
    { path: ["A", "B", "E", "D"], score: 0.75, hops: 3 },
  ]
}

function stableLayout() {
  return {
    A: { x: 0, y: 0 },
    B: { x: 100, y: 0 },
    C: { x: 0, y: 100 },
    D: { x: 200, y: 0 },
    E: { x: 150, y: 60 },
  }
}

test("deriveVisibleGraph hides non-active paths in single mode", () => {
  const result = deriveVisibleGraph({
    pathGraph: sampleGraph(),
    sourceWord: "A",
    targetWord: "D",
    allPaths: samplePaths(),
    currentPathIdx: 0,
    showAllPaths: false,
    singlePathVisibilityMode: "hide",
    visibleTypes: new Set(["synonym", "antonym", "related"]),
    removedNodeIds: new Set(),
    stableLayout: stableLayout(),
    viewport: { left: -50, top: -50, right: 250, bottom: 150 },
  })

  assert.deepEqual(
    result.nodes.map((node) => node.id).sort(),
    ["A", "B", "D"],
  )
  assert.deepEqual(
    result.edges.map((edge) => `${edge.source}->${edge.target}`).sort(),
    ["A->B", "B->D"],
  )
})

test("deriveVisibleGraph reveals all paths in multi mode", () => {
  const result = deriveVisibleGraph({
    pathGraph: sampleGraph(),
    sourceWord: "A",
    targetWord: "D",
    allPaths: samplePaths(),
    currentPathIdx: 0,
    showAllPaths: true,
    singlePathVisibilityMode: "hide" as SinglePathVisibilityMode,
    visibleTypes: new Set(["synonym", "antonym", "related"]),
    removedNodeIds: new Set(),
    stableLayout: stableLayout(),
    viewport: { left: -50, top: -50, right: 250, bottom: 150 },
  })

  assert.deepEqual(
    result.nodes.map((node) => node.id).sort(),
    ["A", "B", "C", "D", "E"],
  )
  const edgeKeys = new Set(result.edges.map((edge) => `${edge.source}->${edge.target}`))
  assert.ok(edgeKeys.has("A->B") || edgeKeys.has("B->A"))
  assert.ok(edgeKeys.has("A->C") || edgeKeys.has("C->A"))
  assert.ok(edgeKeys.has("B->E") || edgeKeys.has("E->B"))
  assert.ok(edgeKeys.has("E->D") || edgeKeys.has("D->E"))
})

test("buildSharedGraphOption keeps single-path charts draggable", () => {
  const visibleGraph = deriveVisibleGraph({
    pathGraph: sampleGraph(),
    sourceWord: "A",
    targetWord: "D",
    allPaths: samplePaths(),
    currentPathIdx: 1,
    showAllPaths: false,
    singlePathVisibilityMode: "hide",
    visibleTypes: new Set(["synonym", "antonym", "related"]),
    removedNodeIds: new Set(),
    stableLayout: stableLayout(),
    viewport: { left: -50, top: -50, right: 250, bottom: 150 },
  })

  const option = buildSharedGraphOption({
    graph: visibleGraph,
    sourceWord: "A",
    targetWord: "D",
  })

  assert.equal(option.series[0].roam, true)
  assert.equal(option.series[0].draggable, true)
})

test("deriveVisibleGraph clips non-active overlay paths outside viewport", () => {
  const result = deriveVisibleGraph({
    pathGraph: sampleGraph(),
    sourceWord: "A",
    targetWord: "D",
    allPaths: samplePaths(),
    currentPathIdx: 0,
    showAllPaths: true,
    singlePathVisibilityMode: "hide",
    visibleTypes: new Set(["synonym", "antonym", "related"]),
    removedNodeIds: new Set(),
    stableLayout: stableLayout(),
    viewport: { left: -20, top: -20, right: 210, bottom: 20 },
  })

  assert.deepEqual(
    result.nodes.map((node) => node.id).sort(),
    ["A", "B", "D"],
  )
  const edgeKeys = new Set(result.edges.map((edge) => `${edge.source}->${edge.target}`))
  assert.ok(edgeKeys.has("A->B") || edgeKeys.has("B->A"))
  assert.ok(edgeKeys.has("B->D") || edgeKeys.has("D->B"))
  assert.equal(edgeKeys.has("A->C") || edgeKeys.has("C->A"), false)
  assert.equal(edgeKeys.has("B->E") || edgeKeys.has("E->B"), false)
})
