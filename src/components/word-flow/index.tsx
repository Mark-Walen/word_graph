import { Canvas, View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useMemo, useRef, useState } from "react";

type Relation = {
  word: string;
  type: string;
  strength: number;
};

type WordEntry = {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  level?: string;
  definition?: string;
  examples?: string[];
  relations: Relation[];
};

type WordGraph = Record<string, WordEntry>;

type GraphNode = {
  id: string;
  label: string;
  word: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  expanded: boolean;
  isCenter: boolean;
  isStarred: boolean;
  color?: string;
  phonetic?: string;
  partOfSpeech?: string;
  level?: string;
  definition?: string;
  examples?: string[];
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
  strength: number;
};

type Props = {
  graphData: WordGraph;
  fullData: WordGraph;
  path?: string[];
  size?: number;
};

type Transform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const edgeKey = (a: string, b: string) => `${a}__${b}`;

export default function WordFlow({ graphData, fullData, path = [], size = 360 }: Props) {
  const ctxRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  const draggingNodeRef = useRef<GraphNode | null>(null);
  const gestureRef = useRef<{
    mode: "none" | "drag" | "pan" | "pinch";
    lastX: number;
    lastY: number;
    lastDistance: number;
    moved: boolean;
    startNodeId: string | null;
  }>({
    mode: "none",
    lastX: 0,
    lastY: 0,
    lastDistance: 0,
    moved: false,
    startNodeId: null,
  });

  const transformRef = useRef<Transform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pathNodeSet = useMemo(() => new Set(path), [path]);
  const pathEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      s.add(edgeKey(path[i], path[i + 1]));
    }
    return s;
  }, [path]);

  function buildInitialGraph(data: WordGraph) {
    const words = Object.keys(data);
    const count = Math.max(words.length, 1);
    const center = size / 2;

    nodesRef.current = words.map((word, index) => {
      const entry = data[word];
      const angle = (index / count) * Math.PI * 2;
      const radius = Math.min(size * 0.28, 70 + count * 2);
      const jitter = () => (Math.random() - 0.5) * 24;

      return {
        id: word,
        word,
        label: word,
        x: center + Math.cos(angle) * radius + jitter(),
        y: center + Math.sin(angle) * radius + jitter(),
        vx: 0,
        vy: 0,
        radius: 22,
        expanded: false,
        isCenter: index === 0,
        isStarred: false,
        color: undefined,
        phonetic: entry.phonetic,
        partOfSpeech: entry.partOfSpeech,
        level: entry.level,
        definition: entry.definition,
        examples: entry.examples,
      };
    });

    const seen = new Set<string>();
    edgesRef.current = [];

    Object.values(data).forEach((entry) => {
      entry.relations.forEach((rel) => {
        if (!data[rel.word]) return;
        const key = edgeKey(entry.word, rel.word);
        if (seen.has(key)) return;
        seen.add(key);

        edgesRef.current.push({
          source: entry.word,
          target: rel.word,
          type: rel.type,
          strength: rel.strength,
        });
      });
    });
  }

  function initFromWordGraph(data: WordGraph) {
    buildInitialGraph(data);
  }

  function graphToScreen(x: number, y: number) {
    const t = transformRef.current;
    return {
      x: x * t.scale + t.offsetX,
      y: y * t.scale + t.offsetY,
    };
  }

  function screenToGraph(x: number, y: number, tf = transformRef.current) {
    return {
      x: (x - tf.offsetX) / tf.scale,
      y: (y - tf.offsetY) / tf.scale,
    };
  }

  function getTouchPos(t: any) {
    const x = t.x ?? t.clientX ?? t.pageX ?? 0;
    const y = t.y ?? t.clientY ?? t.pageY ?? 0;
    return { x, y };
  }

  function getTouchesDistance(touches: any[]) {
    const a = getTouchPos(touches[0]);
    const b = getTouchPos(touches[1]);
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchesCenter(touches: any[]) {
    const a = getTouchPos(touches[0]);
    const b = getTouchPos(touches[1]);
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }

  function findNodeAt(graphX: number, graphY: number) {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      const dx = n.x - graphX;
      const dy = n.y - graphY;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 4) return n;
    }
    return null;
  }

  function expandNode(node: GraphNode) {
    const entry = fullData[node.id];
    if (!entry) return;

    const existingIds = new Set(nodesRef.current.map((n) => n.id));
    const existingEdges = new Set(
      edgesRef.current.map((e) => edgeKey(e.source, e.target))
    );

    const baseAngle = Math.random() * Math.PI * 2;
    const ringRadius = 90;

    entry.relations.forEach((rel, index) => {
      const neighborEntry = fullData[rel.word];
      if (!neighborEntry) return;

      const angle = baseAngle + (index / Math.max(entry.relations.length, 1)) * Math.PI * 2;
      const nx = node.x + Math.cos(angle) * ringRadius;
      const ny = node.y + Math.sin(angle) * ringRadius;

      if (!existingIds.has(rel.word)) {
        nodesRef.current.push({
          id: neighborEntry.word,
          word: neighborEntry.word,
          label: neighborEntry.word,
          x: nx,
          y: ny,
          vx: 0,
          vy: 0,
          radius: 20,
          expanded: false,
          isCenter: false,
          isStarred: false,
          phonetic: neighborEntry.phonetic,
          partOfSpeech: neighborEntry.partOfSpeech,
          level: neighborEntry.level,
          definition: neighborEntry.definition,
          examples: neighborEntry.examples,
        });
        existingIds.add(rel.word);
      }

      const key = edgeKey(node.id, rel.word);
      if (!existingEdges.has(key)) {
        edgesRef.current.push({
          source: node.id,
          target: rel.word,
          type: rel.type,
          strength: rel.strength,
        });
        existingEdges.add(key);
      }
    });

    node.expanded = true;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      return next;
    });
  }

  function openNodeCard(node: GraphNode) {
    setSelectedNode({ ...node });
  }

  function handleNodeTap(node: GraphNode) {
    if (!expandedIds.has(node.id)) {
      expandNode(node);
    }
    openNodeCard(node);
  }

  function step() {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    const sizeCenter = size / 2;
    const kRepel = 1400;
    const kSpring = 0.004;
    const damping = 0.86;
    const desiredLength = 72;
    const centerPull = 0.0016;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.5);
        const force = kRepel / (dist * dist);

        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;

        const minDist = a.radius + b.radius + 6;
        if (dist < minDist) {
          const push = (minDist - dist) * 0.03;
          const px = (push * dx) / dist;
          const py = (push * dy) / dist;
          a.vx -= px;
          a.vy -= py;
          b.vx += px;
          b.vy += py;
        }
      }
    }

    edges.forEach((e) => {
      const a = nodes.find((n) => n.id === e.source);
      const b = nodes.find((n) => n.id === e.target);
      if (!a || !b) return;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.5);
      const stretch = dist - desiredLength;
      const weight = clamp(e.strength, 0.2, 1.5);
      const force = stretch * kSpring * weight;

      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;

      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    });

    nodes.forEach((n) => {
      n.vx += (sizeCenter - n.x) * centerPull;
      n.vy += (sizeCenter - n.y) * centerPull;

      if (draggingNodeRef.current === n) return;

      n.vx *= damping;
      n.vy *= damping;

      n.x += n.vx;
      n.y += n.vy;

      n.x = clamp(n.x, 18, size - 18);
      n.y = clamp(n.y, 18, size - 18);
    });
  }

  function draw() {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    const { scale, offsetX, offsetY } = transformRef.current;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 边
    edgesRef.current.forEach((e) => {
      const a = nodesRef.current.find((n) => n.id === e.source);
      const b = nodesRef.current.find((n) => n.id === e.target);
      if (!a || !b) return;

      const isPath = pathEdgeSet.has(edgeKey(e.source, e.target));

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isPath ? "#ff4d4f" : "#c8cdd6";
      ctx.lineWidth = isPath ? 2.4 / scale : 1 / scale;
      ctx.stroke();

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      ctx.fillStyle = isPath ? "#ff4d4f" : "#7a8599";
      ctx.font = `${10 / scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(e.type, midX, midY - 6 / scale);
    });

    // 节点
    nodesRef.current.forEach((n) => {
      const isPathNode = pathNodeSet.has(n.id);
      const isSelected = selectedNode?.id === n.id;
      const isDragging = draggingNodeRef.current?.id === n.id;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = "#ff7875";
      } else if (isPathNode) {
        ctx.fillStyle = "#ffb020";
      } else if (n.isCenter) {
        ctx.fillStyle = "#1f8a70";
      } else {
        ctx.fillStyle = n.color || "#4a90e2";
      }

      ctx.fill();

      if (isPathNode || isSelected || isDragging) {
        ctx.lineWidth = 2.5 / scale;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = `${12 / scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, n.y + 1 / scale);
    });

    ctx.restore();
  }

  function loop() {
    step();
    draw();
    timerRef.current = setTimeout(loop, 16) as unknown as number;
  }

  function startLoop() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    loop();
  }

  useEffect(() => {
    const query = Taro.createSelectorQuery();
    query
      .select("#relation-graph")
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res?.[0]?.node;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const sys = Taro.getSystemInfoSync();
        const dpr = sys.pixelRatio || 1;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        ctxRef.current = ctx;

        initFromWordGraph(graphData);
        transformRef.current = {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        };

        startLoop();
      });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [graphData, size]);

  function handleTouchStart(e: any) {
    const touches = e.touches || [];
    gestureRef.current.moved = false;

    if (touches.length === 2) {
      gestureRef.current.mode = "pinch";
      gestureRef.current.lastDistance = getTouchesDistance(touches);
      gestureRef.current.startNodeId = null;
      draggingNodeRef.current = null;
      return;
    }

    if (touches.length !== 1) return;

    const t = getTouchPos(touches[0]);
    const graphPos = screenToGraph(t.x, t.y);

    const node = findNodeAt(graphPos.x, graphPos.y);
    if (node) {
      gestureRef.current.mode = "drag";
      gestureRef.current.startNodeId = node.id;
      draggingNodeRef.current = node;
    } else {
      gestureRef.current.mode = "pan";
      gestureRef.current.lastX = t.x;
      gestureRef.current.lastY = t.y;
      gestureRef.current.startNodeId = null;
      draggingNodeRef.current = null;
    }
  }

  function handleTouchMove(e: any) {
    const touches = e.touches || [];

    if (touches.length === 2) {
      const center = getTouchesCenter(touches);
      const newDistance = getTouchesDistance(touches);

      const tf = transformRef.current;
      const oldScale = tf.scale;
      const nextScale = clamp(oldScale * (newDistance / Math.max(gestureRef.current.lastDistance || newDistance, 0.001)), 0.5, 3);

      const graphPoint = screenToGraph(center.x, center.y, tf);

      tf.scale = nextScale;
      tf.offsetX = center.x - graphPoint.x * nextScale;
      tf.offsetY = center.y - graphPoint.y * nextScale;

      gestureRef.current.mode = "pinch";
      gestureRef.current.lastDistance = newDistance;
      gestureRef.current.moved = true;
      return;
    }

    if (touches.length !== 1) return;

    const t = getTouchPos(touches[0]);

    if (draggingNodeRef.current) {
      const graphPos = screenToGraph(t.x, t.y);
      draggingNodeRef.current.x = graphPos.x;
      draggingNodeRef.current.y = graphPos.y;
      draggingNodeRef.current.vx = 0;
      draggingNodeRef.current.vy = 0;
      gestureRef.current.moved = true;
      return;
    }

    if (gestureRef.current.mode === "pan") {
      const dx = t.x - gestureRef.current.lastX;
      const dy = t.y - gestureRef.current.lastY;

      transformRef.current.offsetX += dx;
      transformRef.current.offsetY += dy;

      gestureRef.current.lastX = t.x;
      gestureRef.current.lastY = t.y;
      gestureRef.current.moved = true;
    }
  }

  function handleTouchEnd() {
    const wasNodeTap =
      gestureRef.current.mode === "drag" &&
      draggingNodeRef.current &&
      !gestureRef.current.moved;

    const tappedNode = draggingNodeRef.current;

    draggingNodeRef.current = null;
    gestureRef.current.mode = "none";

    if (wasNodeTap && tappedNode) {
      handleNodeTap(tappedNode);
    }
  }

  const selectedInPath = selectedNode ? pathNodeSet.has(selectedNode.id) : false;

  return (
    <View className="word-flow-container" style={{ position: "relative", width: `${size}px`, height: `${size}px` }}>
      <Canvas
        type="2d"
        id="relation-graph"
        canvasId="relation-graph"
        style={{ width: `${size}px`, height: `${size}px` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {selectedNode && (
        <View
          className="word-flow-card"
          style={{
            position: "absolute",
            left: "12px",
            right: "12px",
            bottom: "12px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.96)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            padding: "14px",
            zIndex: 10,
          }}
        >
          <View style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <View>
              <View style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1.2 }}>
                {selectedNode.label}
              </View>
              <View style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                {selectedNode.phonetic || "—"} {selectedNode.partOfSpeech ? `· ${selectedNode.partOfSpeech}` : ""} {selectedNode.level ? `· ${selectedNode.level}` : ""}
              </View>
            </View>

            <View
              onClick={() => setSelectedNode(null)}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f2f3f5",
                color: "#333",
                fontSize: "16px",
              }}
            >
              ×
            </View>
          </View>

          {selectedNode.definition && (
            <View style={{ fontSize: "13px", color: "#222", lineHeight: 1.6, marginBottom: "10px" }}>
              {selectedNode.definition}
            </View>
          )}

          {selectedNode.examples && selectedNode.examples.length > 0 && (
            <View style={{ marginBottom: "10px" }}>
              <View style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "#555" }}>
                Examples
              </View>
              {selectedNode.examples.map((ex, idx) => (
                <View key={idx} style={{ fontSize: "12px", color: "#444", lineHeight: 1.5, marginBottom: "4px" }}>
                  • {ex}
                </View>
              ))}
            </View>
          )}

          <View style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ fontSize: "12px", color: selectedInPath ? "#d48806" : "#888" }}>
              {selectedInPath ? "路径节点" : "普通节点"}
            </View>

            <View
              onClick={() => {
                const current = nodesRef.current.find((n) => n.id === selectedNode.id);
                if (current) expandNode(current);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: expandedIds.has(selectedNode.id) ? "#e6f4ff" : "#1677ff",
                color: expandedIds.has(selectedNode.id) ? "#1677ff" : "#fff",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {expandedIds.has(selectedNode.id) ? "已展开" : "展开邻居"}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
