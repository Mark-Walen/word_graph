import Taro from '@tarojs/taro'
import { Component } from 'react'
import { Canvas, View } from '@tarojs/components'
import * as relation from './relation'
import './index.scss'

interface WordRelationGraphState {
  nodes: any[];
  edges: any[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  draggingNodeId: string | null;
  draggingOffset: { x: number; y: number } | null;
  dragging: boolean;
  transform: { x: number; y: number; scale: number };
  animationFrameId: number | null;
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
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expanded: boolean;
  isCenter?: boolean;
}

export default class RelationPage extends Component {
  graphState: WordRelationGraphState = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null,
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
  componentDidMount() {
    const instance = Taro.getCurrentInstance()
    const params = (instance?.router?.params || {}) as any
    const rawWord = decodeURIComponent(String(params.word || ''))
    const mode = params.mode || 'singleRelation'

    this.init()
  }

  init(callback?) {
    setTimeout(() => {
      this.initByNewWay(callback);
    }, 30);
  }

  initByNewWay(callback?) {
    const query = Taro.createSelectorQuery();
    const canvasId = 'relation-graph'
    query
      .select(`.ec-canvas.${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasNode = res[0].node;
        const canvasDpr = Taro.getSystemInfoSync().pixelRatio;
        canvasNode.width = res[0].width * canvasDpr;
        canvasNode.height = res[0].height * canvasDpr;
        const ctx = canvasNode.getContext('2d');
      });
  }

  render() {
    const instance = Taro.getCurrentInstance()
    const params = (instance?.router?.params || {}) as any
    const rawWord = decodeURIComponent(String(params.word || ''))
    const mode = params.mode || 'singleRelation'
    return (
      <View className='relation-page'>
        <View className='header'>
          <View className='title'>关系图</View>
          <View className='subtitle'>{mode === 'twoWordsRelation' ? '两词关系' : '单词关系'} · {rawWord}</View>
        </View>
        <View className='canvas-holder'>
          <Canvas
            type="2d"
            className="ec-canvas relation-graph"
            canvasId="relation-graph"
          />
          <View className='loading' id='loading-indicator'>加载中</View>
        </View>
      </View>
    )
  }
}

