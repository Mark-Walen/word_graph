import Taro from "@tarojs/taro";
import { Component } from "react";
import { Canvas, View } from "@tarojs/components";
import * as relation from "./relation";
import "./index.scss";
import wordData from "./word-relation-data.json";

interface WordRelationGraphState {
  nodes: any[];
  edges: any[];
  selectedNodeId: string | null;
  selectedEdge: string | null;
  hoveredNodeId: string | null;
  hoveredEdge: string | null;
  draggingNodeId: string | null;
  draggingOffset: { x: number; y: number } | null;
  dragging: boolean;
  transform: { x: number; y: number; scale: number };
  animationFrameId: number | ReturnType<typeof setTimeout> | null;
  forceLayoutRunning: boolean;
  expandedNodeIds: Set<string>;
  expandedEdgeIds: Set<string>;
  detailPanelDragging: boolean;
  relationPanelDragging: boolean;
  originalDetailPanelPosition: { x: number; y: number } | null;
  originalRelationPanelPosition: { x: number; y: number } | null;
}

interface Node {
  id: string;
  label: string;
  type?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius?: number;
  expanded?: boolean;
  isCenter?: boolean;
  color?: string;
}

export default class RelationPage extends Component {
  graphState: WordRelationGraphState = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdge: null,
    hoveredNodeId: null,
    hoveredEdge: null,
    draggingNodeId: null,
    draggingOffset: null,
    dragging: false,
    transform: { x: 0, y: 0, scale: 1 },
    animationFrameId: null,
    forceLayoutRunning: false,
    expandedNodeIds: new Set<string>(),
    expandedEdgeIds: new Set<string>(),
    detailPanelDragging: false,
    relationPanelDragging: false,
    originalDetailPanelPosition: null,
    originalRelationPanelPosition: null,
  };

  _wordData = wordData;
  userData = {
    starredWords: new Set<string>(),
    customRelations: new Set<string>(),
    visibleRelations: new Set(Object.values(relation.RELATION_TYPES)),
  };

  loading: boolean = false;

  canvas: any = null;
  ctx: any = null;
  dpi: number = Taro.getSystemInfoSync().pixelRatio || 1;

  componentDidMount() {
    const instance = Taro.getCurrentInstance();
    const params = (instance?.router?.params || {}) as any;
    const rawWord = decodeURIComponent(String(params.word || "happy"));
    const mode = params.mode || "singleRelation";
    this.init(() => {
      this.initGraph(rawWord);
    });
  }

  init(callback?) {
    setTimeout(() => {
      this.initByNewWay(callback);
    }, 30);
  }

  initByNewWay(callback?) {
    const query = Taro.createSelectorQuery();
    const canvasId = "relation-graph";
    query
      .select(`.ec-canvas.${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasNode = res[0].node;
        this.canvas = canvasNode;
        canvasNode.width = res[0].width * this.dpi;
        canvasNode.height = res[0].height * this.dpi;
        this.ctx = canvasNode.getContext("2d");
        this.ctx.scale(this.dpi, this.dpi)

        if (callback) callback();
      });
  }

  initGraph(centerWord: string) {
    // Initialize graph with nodes and edges
    if (!centerWord) return;
    if (!this._wordData[centerWord]) {
      Taro.showToast({
        title: "未找到该单词的关系数据",
        icon: "error",
      });
      return;
    }
    this.setState({
      loading: true,
    });
    const canvas = this.canvas;
    const graphState = this.graphState;

    graphState.nodes = [];
    graphState.edges = [];
    graphState.expandedEdgeIds.clear();
    graphState.expandedNodeIds.clear();

    const centerNode: Node = {
      id: centerWord,
      label: centerWord,
      type: "word",
      x: canvas.width / this.dpi / 2,
      y: canvas.height / this.dpi / 2,
      radius: 30,
      vx: 0,
      vy: 0,
      color: '#667eea',
      expanded: false,
      isCenter: true,
    };
    graphState.nodes.push(centerNode);

    const centerWordData = this._wordData[centerWord];
    centerWordData.relations.forEach((rel: any, index: number) => {
      if (!this.userData.visibleRelations.has(rel.type)) {
        return;
      }
      if (!this._wordData[rel.word]) return;
      const angle = (index / centerWordData.relations.length) * 2 * Math.PI;
      const distance = 150;
      const node: Node = {
        id: rel.word,
        label: rel.word,
        type: "word",
        x: centerNode.x + distance * Math.cos(angle),
        y: centerNode.y + distance * Math.sin(angle),
        radius: 25,
        vx: 0,
        vy: 0,
        color: relation.getRelationColor(rel.type),
        isCenter: false,
      };
      graphState.nodes.push(node);
      graphState.edges.push({
        source: centerNode,
        target: node,
        type: rel.type,
        strength: rel.strength,
        original: true,
      });
    });

    this.setState({ loading: false });
    this.startForceLayout();
    this.drawGraph();
  }

  startForceLayout() {
    // Start force-directed layout algorithm
    if (this.graphState.forceLayoutRunning && this.graphState.animationFrameId) {
      if (this.canvas && this.canvas.cancelAnimationFrame) {
        this.canvas.cancelAnimationFrame(this.graphState.animationFrameId as number);
      } else {
        clearTimeout(this.graphState.animationFrameId);
      }
    }
    this.graphState.forceLayoutRunning = true;
    this.simulateForceLayout();
  }

  simulateForceLayout = () => {
    const canvas = this.canvas;
    const graphState = this.graphState;

    const centerX = canvas.width / this.dpi / 2;
    const centerY = canvas.height / this.dpi / 2;
    const repulsionStrength = 10000;
    const attractionStrength = 0.1;
    const edgeLength = 150;

    // Repulsion
    for (let i = 0; i < graphState.nodes.length; i++) {
      for (let j = i + 1; j < graphState.nodes.length; j++) {
        const A = graphState.nodes[i];
        const B = graphState.nodes[j];
        const dx = A.x - B.x;
        const dy = A.y - B.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const force = repulsionStrength / (dist * dist);
          A.vx += (force * dx) / dist;
          A.vy += (force * dy) / dist;
          B.vx -= (force * dx) / dist;
          B.vy -= (force * dy) / dist;
        }
      }
    }

    // Attraction
    graphState.edges.forEach((edge) => {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const force = attractionStrength * (dist - edgeLength);
        edge.source.vx += (force * dx) / dist;
        edge.source.vy += (force * dy) / dist;
        edge.target.vx -= (force * dx) / dist;
        edge.target.vy -= (force * dy) / dist;
      }
    });

    // Attraction to center
    graphState.nodes.forEach((node) => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const force = 0.01 * dist;
        node.vx += (force * dx) / dist;
        node.vy += (force * dy) / dist;
      }
    });

    // Apply velocity
    graphState.nodes.forEach((node) => {
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > 10) {
        node.vx = (node.vx / speed) * 10;
        node.vy = (node.vy / speed) * 10;
      }

      node.x += node.vx;
      node.y += node.vy;

      node.x = Math.max(
        node.radius,
        Math.min(canvas.width - node.radius, node.x)
      );
      node.y = Math.max(
        node.radius,
        Math.min(canvas.height - node.radius, node.y)
      );

      node.vx *= 0.6;
      node.vy *= 0.6;
    });

    // Draw
    this.drawGraph();

    // Check energy
    let energy = 0;
    graphState.nodes.forEach((node) => {
      energy += Math.abs(node.vx) + Math.abs(node.vy);
    });

    if (energy > 0.1) {
      // ✅ Miniapp animation loop
      if (canvas && canvas.requestAnimationFrame) {
        this.graphState.animationFrameId = canvas.requestAnimationFrame(
          this.simulateForceLayout
        );
      } else {
        this.graphState.animationFrameId = setTimeout(this.simulateForceLayout, 16);
      }
    } else {
      this.graphState.forceLayoutRunning = false;
    }
  };

  drawGraph = () => {
    const ctx = this.ctx
    const canvas = this.canvas
    const { nodes, edges } = this.graphState

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // draw edges
    edges.forEach(edge => {
      if (!this.userData.visibleRelations.has(edge.type)) return
      this.drawEdge(edge)
    })

    // draw nodes
    nodes.forEach(node => {
      this.drawNode(node)
    })
  }

  drawNode = (node: Node) => {
    const ctx = this.ctx
    if (!ctx) return
    if (!node.radius) node.radius = 30

    // outer circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    ctx.fillStyle = node.color
    ctx.fill()

    // inner circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.radius - 3, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    // text settings
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const maxWidth = node.radius * 1.8
    let text = node.label
    let textWidth = ctx.measureText(text).width

    // word wrap
    if (textWidth > maxWidth) {
      let cut = Math.floor(text.length / 2)
      let split = cut

      // forward search
      for (let i = cut; i < text.length; i++) {
        if (text[i] === '-' || text[i] === ' ') { split = i + 1; break }
      }
      // backward search
      if (split === cut) {
        for (let i = cut; i >= 0; i--) {
          if (text[i] === '-' || text[i] === ' ') { split = i + 1; break }
        }
      }

      const l1 = text.substring(0, split)
      const l2 = text.substring(split)

      if (ctx.measureText(l1).width > maxWidth ||
          ctx.measureText(l2).width > maxWidth) {
        // fallback: ellipsis
        while (ctx.measureText(text + '...').width > maxWidth && text.length > 1)
          text = text.slice(0, -1)
        text += '...'
        ctx.fillText(text, node.x, node.y)
      } else {
        ctx.fillText(l1, node.x, node.y - 8)
        ctx.fillText(l2, node.x, node.y + 8)
      }
    } else {
      ctx.fillText(text, node.x, node.y)
    }

    // highlight
    if (this.graphState.selectedNodeId === node.id || this.graphState.hoveredNodeId === node.id) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2)
      ctx.strokeStyle = '#ff9800'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // expanded badge
    if (node.expanded) {
      ctx.beginPath()
      ctx.arc(node.x + node.radius - 5, node.y - node.radius + 5, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#ff9800'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(node.x + node.radius - 5, node.y - node.radius + 5, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
    }

    // favorite star
    if (this.userData.starredWords.has(node.label)) {
      ctx.fillStyle = 'gold'
      ctx.font = '12px Arial'
      ctx.fillText('★', node.x - node.radius + 5, node.y - node.radius + 5)
    }
  }

  drawEdge = (edge: any) => {
    const { ctx } = this; // this.ctx = Taro.createCanvasContext() 初始化的
    const source = edge.source;
    const target = edge.target;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / distance;
    const unitY = dy / distance;

    const startX = source.x + unitX * source.radius;
    const startY = source.y + unitY * source.radius;
    const endX = target.x - unitX * target.radius;
    const endY = target.y - unitY * target.radius;

    // 线条
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = relation.getRelationColor(edge.type);
    ctx.lineWidth = 2 + edge.strength * 3;
    ctx.stroke();

    // 箭头
    const arrowSize = 8;
    const arrowX = endX - unitX * arrowSize;
    const arrowY = endY - unitY * arrowSize;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * unitX - arrowSize * unitY,
      arrowY - arrowSize * unitY + arrowSize * unitX
    );
    ctx.lineTo(
      arrowX - arrowSize * unitX + arrowSize * unitY,
      arrowY - arrowSize * unitY - arrowSize * unitX
    );
    ctx.closePath();
    ctx.fillStyle = relation.getRelationColor(edge.type)
    ctx.fill();

    // 关系标签
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    ctx.fillStyle = relation.getRelationColor(edge.type)
    ctx.font = '12px Arial'; // ✅ 小程序不支持 ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(relation.getRelationLabel(edge.type), midX, midY - 15);

    // 高亮
    if (this.graphState.selectedEdge === edge || this.graphState.hoveredEdge === edge) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  render() {
    const instance = Taro.getCurrentInstance();
    const params = (instance?.router?.params || {}) as any;
    const rawWord = decodeURIComponent(String(params.word || ""));
    const mode = params.mode || "singleRelation";
    return (
      <View className="relation-page">
        <View className="header">
          <View className="title">关系图</View>
          <View className="subtitle">
            {mode === "twoWordsRelation" ? "两词关系" : "单词关系"} · {rawWord}
          </View>
        </View>
        <View className="canvas-holder">
          <Canvas
            type="2d"
            className="ec-canvas relation-graph"
            canvasId="relation-graph"
          />
          {this.loading && <View className="loading-indicator">加载中...</View>}
        </View>
      </View>
    );
  }
}
