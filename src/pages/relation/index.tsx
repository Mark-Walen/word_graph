import Taro from "@tarojs/taro";
import { Component } from "react";
import {
  Canvas,
  CanvasTouchEvent,
  Picker,
  View,
  Text,
  ScrollView,
} from "@tarojs/components";
import * as relation from "./relation";
import "./index.scss";
import wordData from "./word-relation-data.json";
import { Search, Star, StarOutlined } from "@taroify/icons";
import SearchPage from "../search";
import Tabs from "@taroify/core/tabs";
import { Collapse, FloatingPanel } from "@taroify/core";
import Button from "@taroify/core/button/button";

interface RelationBase {
  word: string;
  type: string;
  strength: number;
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
  isStarred?: boolean;
  color?: string;
}

type NodeNullable = Node | null

interface Edge {
  source: Node,
  target: Node,
  type: string,
  strength: number,
  original: boolean
}

type EdgeNullable = Edge | null

interface WordInfo {
  word: string;
  phonetic: string;
  starred: boolean;
  partOfSpeech: string;
  level: string;
  definition: string;
  examples: Array<string>;
  relations: Array<RelationBase>;
  isCenter: boolean
}

interface RelationInfo extends RelationBase {
  targetWord: string
  examples: Array<string>
}

interface WordRelationGraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: NodeNullable;
  selectedEdge: EdgeNullable;
  hoveredNode: NodeNullable;
  hoveredEdge: EdgeNullable;
  draggingNode: NodeNullable;
  draggingOffset: { x: number; y: number } | null;
  dragging: boolean;
  transform: { x: number; y: number; scale: number };
  animationFrameId: number | ReturnType<typeof setTimeout> | null;
  forceLayoutRunning: boolean;
  expandedNodes: Set<string>;
  expandedEdges: Map<string, Array<Edge>>;
  detailPanelDragging: boolean;
  relationPanelDragging: boolean;
  longPressTriggered: boolean;
  originalDetailPanelPosition: { x: number | string; y: number | string, transform: string };
  originalRelationPanelPosition: { x: number | string; y: number | string, transform: string };
}

interface ContextMenuState {
  show: boolean;
  type: 'edge' | 'node' | ''
  x: number;
  y: number;
  node: NodeNullable;
  edge: EdgeNullable;
}

interface RelationPageState {
  selectedRelation: string,
  relationRange: string[],
  selectedDisplayMode: string,
  displayModeRange: string[],
  loading: boolean,
  showSearchPage: boolean,
  contextMenu: ContextMenuState,
  selectedNodeInfo: WordInfo,
  selectedEdgeInfo: RelationInfo,
  showWordDetail: boolean,
  showRelationDetail: boolean,
  expanded: string[],
  groupedRelations: {}
}

export default class RelationPage extends Component {
  graphState: WordRelationGraphState = {
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedEdge: null,
    hoveredNode: null,
    hoveredEdge: null,
    draggingNode: null,
    draggingOffset: null,
    dragging: false,
    transform: { x: 0, y: 0, scale: 1 },
    animationFrameId: null,
    forceLayoutRunning: false,
    expandedNodes: new Set<string>(),
    expandedEdges: new Map<string, Array<Edge>>(),
    detailPanelDragging: false,
    relationPanelDragging: false,
    longPressTriggered: false,
    originalDetailPanelPosition: {x: "50%", y: 20, transform: 'translateX(-50%)'},
    originalRelationPanelPosition: {x: "50%", y: 20, transform: 'translateX(-50%)'},
  };

  _wordData = wordData;
  userData = {
    starredWords: new Set<string>(),
    customRelations: new Set<string>(),
    visibleRelations: new Set(Object.values(relation.RELATION_TYPES)),
  };

  longPressTimer: ReturnType<typeof setTimeout> | null = null;
  isDraggingNode = false;
  lastClickTime = 0;
  clickCount = 0;

  canvas: any = null;
  ctx: any = null;
  dpi: number = Taro.getSystemInfoSync().pixelRatio || 1;

  windowHeight = Taro.getWindowInfo().windowHeight;

  word_anchors = [
    0,
    Math.round(0.3 * this.windowHeight),
    Math.round(0.8 * this.windowHeight),
  ];

  relation_anchors = [
    0,
    Math.round(0.3 * this.windowHeight),
  ]

  relations = {
    all: "全部关系",
    semantic: "语义关系",
    formal: "形式关系",
    morphological: "形态关系",
    associative: "联想与用法关系",
  };
  displayMode = {
    all: "显示所有关系",
    semantic: "仅语义关系",
    formal: "仅形式关系",
  };
  state: RelationPageState = {
    selectedRelation: "all",
    relationRange: Object.keys(this.relations),
    selectedDisplayMode: "all",
    displayModeRange: Object.keys(this.displayMode),
    loading: false,
    showSearchPage: false,
    contextMenu: {
      show: false,
      type: '',
      x: 0,
      y: 0,
      node: null,
      edge: null,
    },
    groupedRelations: {},
    selectedNodeInfo: {
      word: "",
      phonetic: "",
      starred: false,
      partOfSpeech: "",
      level: "",
      definition: "",
      examples: [],
      relations: [],
      isCenter: false
    },
    selectedEdgeInfo: {
      examples: [],
      word: "",
      targetWord: "",
      type: "",
      strength: 0
    },
    showWordDetail: false,
    showRelationDetail: false,
    expanded: []
  };

  componentDidMount() {
    const instance = Taro.getCurrentInstance();
    const params = (instance?.router?.params || {}) as any;
    const rawWord = decodeURIComponent(String(params.word || "happy"));
    const mode = params.mode || "singleRelation";
    Taro.setNavigationBarTitle({
      title:
        (mode === "twoWordsRelation" ? "两词关系" : "单词关系") +
        " · " +
        rawWord,
    });
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
        this.ctx.scale(this.dpi, this.dpi);

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
    graphState.expandedEdges.clear();
    graphState.expandedNodes.clear();

    const centerNode: Node = {
      id: centerWord,
      label: centerWord,
      type: "word",
      x: canvas.width / this.dpi / 2,
      y: canvas.height / this.dpi / 2,
      radius: 30,
      vx: 0,
      vy: 0,
      color: "#667eea",
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
    if (
      this.graphState.forceLayoutRunning &&
      this.graphState.animationFrameId
    ) {
      if (this.canvas && this.canvas.cancelAnimationFrame) {
        this.canvas.cancelAnimationFrame(
          this.graphState.animationFrameId as number
        );
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
        this.graphState.animationFrameId = setTimeout(
          this.simulateForceLayout,
          16
        );
      }
    } else {
      this.graphState.forceLayoutRunning = false;
    }
  };

  drawGraph = () => {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const { nodes, edges } = this.graphState;

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw edges
    edges.forEach((edge) => {
      if (!this.userData.visibleRelations.has(edge.type)) return;
      this.drawEdge(edge);
    });

    // draw nodes
    nodes.forEach((node) => {
      this.drawNode(node);
    });
  };

  drawNode = (node: Node) => {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!node.radius) node.radius = 30;

    // outer circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    // inner circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius - 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    // text settings
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxWidth = node.radius * 1.8;
    let text = node.label;
    let textWidth = ctx.measureText(text).width;

    // word wrap
    if (textWidth > maxWidth) {
      let cut = Math.floor(text.length / 2);
      let split = cut;

      // forward search
      for (let i = cut; i < text.length; i++) {
        if (text[i] === "-" || text[i] === " ") {
          split = i + 1;
          break;
        }
      }
      // backward search
      if (split === cut) {
        for (let i = cut; i >= 0; i--) {
          if (text[i] === "-" || text[i] === " ") {
            split = i + 1;
            break;
          }
        }
      }

      const l1 = text.substring(0, split);
      const l2 = text.substring(split);

      if (
        ctx.measureText(l1).width > maxWidth ||
        ctx.measureText(l2).width > maxWidth
      ) {
        // fallback: ellipsis
        while (
          ctx.measureText(text + "...").width > maxWidth &&
          text.length > 1
        )
          text = text.slice(0, -1);
        text += "...";
        ctx.fillText(text, node.x, node.y);
      } else {
        ctx.fillText(l1, node.x, node.y - 8);
        ctx.fillText(l2, node.x, node.y + 8);
      }
    } else {
      ctx.fillText(text, node.x, node.y);
    }

    // highlight
    if (
      this.graphState.selectedNode?.id === node.id ||
      this.graphState.hoveredNode?.id === node.id
    ) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // expanded badge
    if (node.expanded) {
      ctx.beginPath();
      ctx.arc(
        node.x + node.radius - 5,
        node.y - node.radius + 5,
        6,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#ff9800";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        node.x + node.radius - 5,
        node.y - node.radius + 5,
        4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    // favorite star
    if (this.userData.starredWords.has(node.label)) {
      ctx.fillStyle = "gold";
      ctx.font = "12px Arial";
      ctx.fillText("★", node.x - node.radius + 5, node.y - node.radius + 5);
    }
  };

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
    ctx.fillStyle = relation.getRelationColor(edge.type);
    ctx.fill();

    // 关系标签
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    ctx.fillStyle = relation.getRelationColor(edge.type);
    ctx.font = "12px Arial"; // ✅ 小程序不支持 ctx.font = '12px Arial';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(relation.getRelationLabel(edge.type), midX, midY - 15);

    // 高亮
    if (
      this.graphState.selectedEdge === edge ||
      this.graphState.hoveredEdge === edge
    ) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  };

  findNodeAt = (x: number, y: number) => {
    for (let i = this.graphState.nodes.length - 1; i >= 0; i--) {
      const node: Node = this.graphState.nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (!node.radius) node.radius = 30;
      if (distance <= node.radius) {
        return node;
      }
    }

    return null;
  };

  findEdgeAt = (x: number, y: number) => {
    for (let i = 0; i < this.graphState.edges.length; i++) {
      const edge = this.graphState.edges[i];
      const source = edge.source;
      const target = edge.target;

      const A = x - source.x;
      const B = y - source.y;
      const C = target.x - source.x;
      const D = target.y - source.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) {
        param = dot / lenSq;
      }

      let xx, yy;
      if (param < 0) {
        xx = source.x;
        yy = source.y;
      } else if (param > 1) {
        xx = target.x;
        yy = target.y;
      } else {
        xx = source.x + param * C;
        yy = source.y + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 8) {
        return edge;
      }
    }

    return null;
  };

  onRelationsChange = (e) => {
    const index: number = e.detail.value;
    const selectedRelation = this.state.relationRange[index];
    this.setState({
      selectedRelation: selectedRelation,
    });
    this.relationFilter();
  };

  onDisplayModeChange = (e) => {
    const index = e.detail.value;
    this.setState({
      selectedDisplayMode: this.displayMode[index],
    });

    this.relationFilter();
  };

  relationFilter = () => {
    // Update visibleRelations based on selection
    if (this.state.selectedRelation === "all") {
      this.userData.visibleRelations = new Set(
        Object.values(relation.RELATION_TYPES)
      );
    } else {
      this.userData.visibleRelations = new Set(
        Object.values(relation.RELATION_GROUPS[this.state.selectedRelation])
      );
    }

    if (this.state.selectedDisplayMode !== "all") {
      // Further filter by display mode
      const tempVisible = new Set<string>(this.userData.visibleRelations);
      this.userData.visibleRelations.clear();

      tempVisible.forEach((relType) => {
        if (
          relation.getRelationGroup(relType) === this.state.selectedDisplayMode
        ) {
          this.userData.visibleRelations.add(relType);
        }
      });
    }

    // Re-initialize graph to apply changes
    if (this.graphState.nodes.length > 0) {
      const centerNode = this.graphState.nodes.find((n) => n.isCenter);
      if (centerNode) {
        this.initGraph(centerNode.label);
      }
    }
  };

  showContextMenu = (x, y, node: NodeNullable, edge: EdgeNullable) => {
    let contextMenuType = ''
    if (node) {
      contextMenuType = 'node'
      node.isStarred = this.userData.starredWords.has(node.label)
      this.graphState.selectedNode = node
    } else if (edge) {
      contextMenuType = 'edge'
      this.graphState.selectedEdge = edge
    }

    this.setState({
      contextMenu: {
        x: x,
        y: y,
        show: true,
        type: contextMenuType,
        node: node,
        edge: edge,
      },
    });
  };

  hideContextMenu = () => {
    this.setState({
      contextMenu: {
        ...this.state.contextMenu,
        show: false
      }
    })
  }

  handleTouchStart = (e: CanvasTouchEvent) => {
    const touch = e.touches[0];
    if (!touch) {
      return
    }
    const { x, y } = touch;

    const node = this.findNodeAt(x, y);
    const edge = this.findEdgeAt(x, y);

    this.graphState.draggingOffset = { x, y };
    this.longPressTimer = setTimeout(() => {
      if (node || edge) {
        this.graphState.longPressTriggered = true;
        this.showContextMenu(x, y, node, edge);
      }
      this.longPressTimer = null;
    }, 500);

    if (node) {
      this.graphState.dragging = true;
      this.graphState.draggingNode = node;
      this.isDraggingNode = false;
    }
  };

  handleTouchMove = (e: CanvasTouchEvent) => {
    const touch = e.touches[0];
    const { x, y } = touch;

    const prevHoverNode = this.graphState.hoveredNode;
    const prevHoverEdge = this.graphState.hoveredEdge;

    this.graphState.hoveredNode = this.findNodeAt(x, y);
    this.graphState.hoveredEdge = this.findEdgeAt(x, y);

    if (
      prevHoverNode !== this.graphState.hoveredNode ||
      prevHoverEdge !== this.graphState.hoveredEdge
    ) {
      this.drawGraph();
    }

    if (this.graphState.dragging && this.graphState.draggingNode) {
      if (this.graphState.draggingOffset === null)
        this.graphState.draggingOffset = { x: 0, y: 0 };
      const dx = x - this.graphState.draggingOffset.x;
      const dy = y - this.graphState.draggingOffset.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.isDraggingNode = true;
      }

      this.graphState.draggingNode.x = x;
      this.graphState.draggingNode.y = y;
      if (this.graphState.forceLayoutRunning) {
        this.canvas.cancelAnimation(this.graphState.animationFrameId);
        this.graphState.forceLayoutRunning = false;
      }
      this.drawGraph();
    }
  };

  handleTouchEnd = (e: CanvasTouchEvent) => {
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    
    if (!touch) return;
    const { x, y } = touch;

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.graphState.longPressTriggered) {
      this.graphState.longPressTriggered = false;
      this.graphState.dragging = false;
      this.graphState.draggingNode = null;
      this.isDraggingNode = false;
      return;
    }

    const node = this.findNodeAt(x, y);
    const edge = this.findEdgeAt(x, y);

    if (this.isDraggingNode) {
      this.graphState.dragging = false;
      this.graphState.draggingNode = null;
      this.isDraggingNode = false;

      if (!this.graphState.forceLayoutRunning) {
        this.startForceLayout();
      }
      return;
    }

    const currentTime = new Date().getTime();
    if (currentTime - this.lastClickTime < 300) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }
    this.lastClickTime = currentTime;

    if (this.clickCount === 1) {
      setTimeout(() => {
        if (this.clickCount !== 1) return;
        if (node) {
          if (
            this.graphState.selectedNode &&
            this.graphState.selectedNode.id === node.id
          ) {
            this.hideWordDetail()
          } else {
            this.graphState.selectedNode = node;
            this.showWordDetail(node);
            this.hideRelationDetail();
          }
        } else if (edge) {
          this.graphState.selectedEdge = edge;
          this.showRelationDetail(edge)
          this.hideWordDetail()
          this.graphState.originalRelationPanelPosition = {
            x: "50%",
            y: 20,
            transform: "50%"
          }
        } else {
          this.hideWordDetail()
          this.hideRelationDetail()
          if(this.state.contextMenu.show) {
            this.hideContextMenu()
          }
        }
        this.drawGraph();
      }, 200);
    } else if (this.clickCount === 2) {
      if (node) {
        if (node.expanded) {
          this.collapseNode(node)
        } else {
          this.expandNode(node)
        }
      } else if(this.state.contextMenu.show) {
        this.hideContextMenu()
      }
      this.clickCount = 0;
    }

    this.graphState.dragging = false;
    this.graphState.draggingNode = null;
    this.isDraggingNode = false;

    if (!this.graphState.forceLayoutRunning) {
      this.startForceLayout();
    }
  };

  handleTouchCancel = () => {
    this.graphState.dragging = false;
    this.graphState.draggingNode = null;
    this.graphState.hoveredNode = null;
    this.graphState.hoveredEdge = null;
    this.isDraggingNode = false;
    this.drawGraph();
  };

  hideWordDetail = () => {
    this.setState({
      showWordDetail: false,
      selectedNodeInfo: null
    })
    this.graphState.selectedNode = null
    this.drawGraph()
  }
  
  showWordDetail = (node: Node) => {
    const wordInfo = this._wordData[node.label]
    if(wordInfo) {
      const groupedRelations = wordInfo.relations.reduce((acc, rel) => {
        const group = relation.getRelationGroup(rel.type);
        if (!group) return acc;

        (acc[group] ??= []).push(rel);
        return acc;
      }, {})
      this.setState({
        showWordDetail: true,
        selectedNodeInfo: {
          ...wordInfo,
          isCenter: node.isCenter,
          starred: this.userData.starredWords.has(node.label)
        },
        groupedRelations
      })
    }
  };

  showRelationDetail = (edge: Edge) => {
    this.setState({
      selectedEdgeInfo: {
        type: relation.getRelationLabel(edge.type),
        word: edge.source.label,
        targetWord: edge.target.label,
        examples: [],
        strength: edge.strength
      }
    })
    this.setState({
      showRelationDetail: true
    })
  }

  hideRelationDetail = () => {
    this.setState({
      showRelationDetail: false,
      selectedEdgeInfo: null
    })
    this.graphState.selectedEdge = null
    this.drawGraph()
  }

  getPannelStyle = (style: {x: number | string, y: number | string, transform: string}) => {
    const left = typeof style.x == 'number' ? `${style.x}px` : style.x
    const bottom = typeof style.y == 'number' ? `${style.y}px` : style.y
    return {
      left,
      bottom,
      transform: style.transform,
      top: "auto"
    }
  }

  handleViewDetailsBtnClick = () => {
    const contextMenu = this.state.contextMenu
    if(contextMenu.node) {
      this.showWordDetail(contextMenu.node)
    } else if (contextMenu.edge) {
      this.showRelationDetail(contextMenu.edge)
    }
    this.hideContextMenu()
  };

  collapseNode = (node: Node) => {
    if (!node.expanded) return
    const expandedEdges: Set<Edge> = this.graphState.expandedEdges[node.id]
    const expandedNodes = new Set<string>()
    expandedEdges.forEach(edge => {
      expandedNodes.add(edge.target.id)
      if (edge.target.expanded) {
        this.collapseNode(edge.target)
      }
    });

    this.graphState.edges = this.graphState.edges.filter(edge => !expandedEdges.has(edge))
    this.graphState.nodes = this.graphState.nodes.filter(n => expandedNodes.has(n.id))
    this.graphState.expandedEdges.delete(node.id)
    this.graphState.expandedNodes.delete(node.id)
    node.expanded = false

    this.startForceLayout()
  }

  expandNode = (node: Node) => {
    if (!wordData[node.label] || node.expanded) return;
        const wordInfo = this._wordData[node.label];

        // 添加新节点和边
        const addedEdges: Array<Edge> = [];
        wordInfo.relations.forEach(relation => {
            // 检查关系类型是否在可见列表中
            if (!this.userData.visibleRelations.has(relation.type)) {
                return;
            }

            // 检查节点是否已存在
            const existingNode = this.graphState.nodes.find(n => n.id === relation.word);
            if (!existingNode && wordData[relation.word]) {
                // 添加新节点
                const angle = Math.random() * 2 * Math.PI;
                const distance = 150 + Math.random() * 50;

                const newNode: Node = {
                    id: relation.word,
                    label: relation.word,
                    x: node.x + Math.cos(angle) * distance,
                    y: node.y + Math.sin(angle) * distance,
                    radius: 25,
                    color: relation.getRelationColor(relation.type),
                    vx: 0,
                    vy: 0,
                    expanded: false,
                    isCenter: false
                };
                this.graphState.nodes.push(newNode);

                // 添加边
                const newEdge: Edge = {
                    source: node,
                    target: newNode,
                    type: relation.type,
                    strength: relation.strength,
                    original: true
                };
                this.graphState.edges.push(newEdge);
                addedEdges.push(newEdge);
            }
        });

        // 记录扩展的边
        this.graphState.expandedEdges.set(node.id, addedEdges);
        node.expanded = true;
        this.graphState.expandedNodes.add(node.id);

        // 重新开始力导向布局
        this.startForceLayout();
  }

  removeNodeFromGraph = () => {
    let removedNode: Node = {
      id: "",
      label: "",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    };

    this.graphState.nodes = this.graphState.nodes.filter(n => {
      if (n.label === this.state.selectedNodeInfo.word) {
        removedNode = n;
        return false; // remove this node
      }
      return true; // keep others
    });

    this.graphState.edges = this.graphState.edges.filter(edge =>
      edge.source !== removedNode && edge.target !== removedNode
    );
    if (removedNode && removedNode.expanded) {
      this.collapseNode(removedNode)
    }
    this.startForceLayout()
  }

  removeEdgeFromGraph = () => {
    this.graphState.edges = this.graphState.edges.filter(e => (e.source.label !== this.state.selectedEdgeInfo.word && e.target.label !== this.state.selectedEdgeInfo.targetWord));
    this.drawGraph();
  }

  render() {
    const instance = Taro.getCurrentInstance();
    const params = (instance?.router?.params || {}) as any;
    const rawWord = decodeURIComponent(String(params.word || ""));
    const mode = params.mode || "singleRelation";
    return (
      <View className="relation-page">
        <View className="relation-page-container">
          <View className="header">
            <View
              className="search-box-wrapper"
              onClick={() => {
                this.setState({ showSearchPage: true });
              }}
            >
              <View className="search-box-icon-wrapper">
                <Search className="search-box-icon" size={32} />
              </View>
              <View className="ai-search-box">输入单词或关系查询...</View>
            </View>
            <View className="pickers">
              <Picker
                mode="selector"
                range={Object.values(this.relations)}
                onChange={this.onRelationsChange}
              >
                <View className="picker">
                  关系: {this.relations[this.state.selectedRelation]}
                </View>
              </Picker>
              <Picker
                mode="selector"
                range={Object.values(this.displayMode)}
                onChange={this.onDisplayModeChange}
              >
                <View className="picker">
                  显示模式: {this.displayMode[this.state.selectedDisplayMode]}
                </View>
              </Picker>
            </View>
          </View>
          <View className="canvas-holder">
            <Canvas
              type="2d"
              className="ec-canvas relation-graph"
              canvasId="relation-graph"
              onTouchStart={this.handleTouchStart}
              onTouchMove={this.handleTouchMove}
              onTouchEnd={this.handleTouchEnd}
            />
            {this.state.loading && (
              <View className="loading-indicator">加载中...</View>
            )}
          </View>

          {this.state.showWordDetail && (
            <FloatingPanel anchors={this.word_anchors} className="word-detail-panel" height={this.word_anchors[1]}>
              <View className="word-detail-header">
                <View>
                  <Text className="word-detail__title">{this.state.selectedNodeInfo.word}</Text>
                  <Text className="word-detail__phonetic">
                    {this.state.selectedNodeInfo.phonetic}
                  </Text>
                  {this.state.selectedNodeInfo.starred ? (
                    <Star className="starred star" size={14} />
                  ) : (
                    <StarOutlined className="star" size={14} />
                  )}
                </View>
              </View>
              <Tabs defaultValue="definition" className="word-detail-panel__tabs">
                <Tabs.TabPane value="definition" title="释义" className="tabs-content__word_definition">
                  <View className="word-info">
                    <Text className="part-of-speech">{this.state.selectedNodeInfo.partOfSpeech}</Text>
                    <Text className="level">{this.state.selectedNodeInfo.level}</Text>
                  </View>
                  <View className="definition">{this.state.selectedNodeInfo.definition}</View>
                </Tabs.TabPane>
                <Tabs.TabPane value="relations" className="tabs-content__relation" title="关系">
                  <ScrollView scrollY>
                    <Collapse value={this.state.expanded} onChange={v => {
                      this.setState({
                        expanded: v
                      })
                    }}>
                      {
                        Object.keys(relation.RELATION_GROUPS).map((groupKey) => {
                          const list = this.state.groupedRelations[groupKey]
                          if (!list || list.length === 0) return null
                          const title = relation.getRelationGroupLabel(groupKey)

                          return (
                            <Collapse.Item
                              key={groupKey}
                              title={title}
                              className="relation-group">
                                <View>
                                  {list.map((rel, idx) => (
                                    <View
                                      key={idx}
                                      style={{'borderLeft': `6rpx solid ${relation.getRelationColor(rel.type)}`, 'background': '#f9f9f9', 'marginBottom': '16rpx', 'padding': '8rpx'}}>
                                        <View className="relation-text" style={{'fontSize': '40rpx', 'color': '#444'}}>{relation.getRelationLabel(rel.type)}: {rel.word}</View>
                                        <View className="strength-text" style={{'fontSize': '24rpx', 'color': '#5a5a5c'}}>关系强度: {rel.strength ?? '-'}</View>
                                      </View>
                                  ))}
                                </View>
                              </Collapse.Item>
                          )
                        })
                      }
                    </Collapse>
                  </ScrollView>
                </Tabs.TabPane>
                <Tabs.TabPane value="examples" title="例句" className="tabs-content__example">
                  <View className="examples order-list">
                    {this.state.selectedNodeInfo.examples.map((example, index) => (
                      <View key={index} className="word-example-item list-item">
                        <Text className="list-index">{index + 1}.</Text>
                        <Text className="list-text">{example}</Text>
                      </View>
                    ))}
                  </View>
                </Tabs.TabPane>
              </Tabs>
            </FloatingPanel>
          )}

          {this.state.showRelationDetail && (
            <FloatingPanel anchors={this.relation_anchors} className="relation-detail-panel" height={this.relation_anchors[1]}>
                <View className="detail-header">
                  <View className="relation-title">{this.state.selectedEdgeInfo.type}</View>
                </View>
                <View id="relationWords">{this.state.selectedEdgeInfo.word} ↔ {this.state.selectedEdgeInfo.targetWord}</View>
                <View className="relation-example">
                {this.state.selectedEdgeInfo.examples.map((example, index) => (
                  <View key={index} className="relation-example-item">
                    {example}
                  </View>
                ))}
                </View>

                <View className="relation-strength" id="relationStrength">
                    关系强度: {this.state.selectedEdgeInfo.strength}
                </View>
            </FloatingPanel>
          )}

          {this.state.contextMenu.show && (
            <View
              className="context-menu"
              style={{
                position: "absolute",
                left: `${this.state.contextMenu.x}px`,
                top: `${this.state.contextMenu.y}px`,
              }}
            >
              <View
                className="context-menu-item view-details"
                onClick={this.handleViewDetailsBtnClick}
              >
                <Text>📖</Text> 查看详情
              </View>
              {
                this.state.contextMenu.node && (
                  <>
                    { this.state.contextMenu.node.isStarred ? (
                      // starred = true → 显示“取消收藏”
                      <View
                        className="context-menu-item remove-from-favorites"
                        onClick={() => {
                          this.userData.starredWords.delete(this.state.selectedNodeInfo.word)
                          this.hideContextMenu()
                          this.drawGraph()
                        }}
                      >
                        <Text>⭐</Text> 取消收藏
                      </View>
                    ) : (
                      // starred = false → 显示“加入收藏”
                      <View
                        className="context-menu-item add-to-favorites"
                        onClick={() => {
                          this.userData.starredWords.add(this.state.selectedNodeInfo.word)
                          this.hideContextMenu()
                          this.drawGraph()
                        }}
                      >
                        <Text>✩</Text> 加入收藏
                      </View>
                    )}

                    <View
                      className="context-menu-item expand-relations"
                      onClick={() => {
                        const node = this.graphState.nodes.find(
                          n => n.label == this.state.selectedNodeInfo.word
                        )
                        if (node) {
                          this.expandNode(node)
                          this.hideContextMenu()
                        }
                      }}
                    >
                      <Text>🔍</Text> 扩展关系
                    </View>
                  </>
                )
              }

              {!this.state.contextMenu.node?.isCenter && (
                <View className="context-menu-item remove-from-graph" onClick={() => {
                  const contextMenu = this.state.contextMenu
                  if (!contextMenu.type) return
                  else if (contextMenu.type == 'node') {
                    this.hideContextMenu()
                    this.removeNodeFromGraph()
                  } else {
                    this.removeEdgeFromGraph()
                  }
                }}>
                  <Text>🗑️</Text> 从图中移除
                </View>
              )}
            </View>
          )}
        </View>

        {/* <SearchPage
          show={this.state.showSearchPage}
          onClose={() => {
            this.setState({ showSearchPage: false });
          }}
        /> */}
      </View>
    );
  }
}
