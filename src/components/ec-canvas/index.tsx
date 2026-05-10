import Taro from "@tarojs/taro";
import { Component } from "react";
import { Canvas } from "@tarojs/components";
import WxCanvas from "./wx-canvas";
import "./index.scss";
import * as echarts from './echarts';

function wrapTouch(event: any) {
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i];
    touch.offsetX = touch.x;
    touch.offsetY = touch.y;
    touch.clientX = touch.x;
    touch.clientY = touch.y;
    touch.pageX = touch.x;
    touch.pageY = touch.y;
  }
  if (event.changedTouches) {
    for (let i = 0; i < event.changedTouches.length; ++i) {
      const touch = event.changedTouches[i];
      touch.offsetX = touch.x;
      touch.offsetY = touch.y;
      touch.clientX = touch.x;
      touch.clientY = touch.y;
      touch.pageX = touch.x;
      touch.pageY = touch.y;
    }
  }
  return event;
}

function mouseEvt(x: number, y: number) {
  return {
    zrX: x,
    zrY: y,
    offsetX: x,
    offsetY: y,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    preventDefault: () => {},
    stopPropagation: () => {},
    stopImmediatePropagation: () => {},
  };
}

export interface EcCanvasState {}

export interface ECObj {
  onInit?(canvas, width, height, dpr): void;
  lazyLoad?: boolean;
}

export interface EcCanvasProps {
  canvasId: string;
  ec: ECObj;
}

class EcCanvasTaro extends Component<EcCanvasProps, EcCanvasState> {
  canvasNode: any;
  chart: any;
  lastPinchDist = 0;

  componentDidMount() {
    if (echarts && typeof echarts.registerPreprocessor === "function") {
      echarts.registerPreprocessor((option) => {
        if (option && option.series) {
          if (option.series.length > 0) {
            option.series.forEach((series) => {
              series.progressive = 0;
            });
          } else if (typeof option.series === "object") {
            option.series.progressive = 0;
          }
        }
      });
    }

    if (!this.props.ec) {
      console.warn(
        '组件需绑定 ec 变量，例：<ec-canvas id="mychart-dom-bar" ' +
          'canvas-id="mychart-bar" ec="{{ ec }}"></ec-canvas>'
      );
      return;
    }
    if (!this.props.ec.lazyLoad) {
      this.init();
    }
  }

  init(callback?) {
    setTimeout(() => {
      this.initByNewWay(callback);
    }, 30);
  }

  initByNewWay(callback?) {
    const query = Taro.createSelectorQuery();
    const { ec, canvasId } = this.props;
    query
      .select(`.ec-canvas.${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasNode = res[0].node;
        this.canvasNode = canvasNode;
        const canvasDpr = Taro.getWindowInfo().pixelRatio;
        const canvasWidth = res[0].width;
        const canvasHeight = res[0].height;
        const ctx = canvasNode.getContext("2d");
        const canvas = new WxCanvas(ctx, canvasId, true, canvasNode);
        echarts.setCanvasCreator(() => canvas);
        if (typeof callback === "function") {
          this.chart = callback(canvas, canvasWidth, canvasHeight, canvasDpr);
        } else if (typeof ec.onInit === "function") {
          this.chart = ec.onInit(canvas, canvasWidth, canvasHeight, canvasDpr);
        }
      });
  }

  canvasToTempFilePath(opt) {
    const query = Taro.createSelectorQuery().in(this);
    query
      .select(".ec-canvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasNode = res[0].node;
        opt.canvas = canvasNode;
        Taro.canvasToTempFilePath(opt);
      });
  }

  touchStart = (e) => {
    if (!this.chart) return;
    this.lastPinchDist = 0;
    const handler = this.chart.getZr().handler;
    const touch = e.touches[0];
    if (touch) {
      handler.dispatch("mousedown", mouseEvt(touch.x, touch.y));
      handler.dispatch("mousemove", mouseEvt(touch.x, touch.y));
    }
    handler.processGesture(wrapTouch(e), "start");
  };

  touchMove = (e) => {
    if (!this.chart) return;
    const handler = this.chart.getZr().handler;
    const touch = e.touches[0];
    if (touch) {
      handler.dispatch("mousemove", mouseEvt(touch.x, touch.y));
    }
    if (e.touches.length >= 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.x - t1.x, t0.y - t1.y);
      if (this.lastPinchDist > 0 && Math.abs(dist - this.lastPinchDist) < 2) return;
      this.lastPinchDist = dist;
    }
    handler.processGesture(wrapTouch(e), "change");
  };

  touchEnd = (e) => {
    if (!this.chart) return;
    this.lastPinchDist = 0;
    const handler = this.chart.getZr().handler;
    const touch = e.changedTouches?.[0];
    if (touch) {
      handler.dispatch("mouseup", mouseEvt(touch.x, touch.y));
      handler.dispatch("click", mouseEvt(touch.x, touch.y));
    }
    handler.processGesture(wrapTouch(e), "end");
  };

  render() {
    const { canvasId } = this.props;
    return (
      <Canvas
        type="2d"
        className={`ec-canvas ${canvasId}`}
        canvasId={canvasId}
        onTouchStart={this.touchStart}
        onTouchMove={this.touchMove}
        onTouchEnd={this.touchEnd}
      />
    );
  }
}

export default EcCanvasTaro;
