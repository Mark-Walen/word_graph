import { View } from "@tarojs/components";
import { useState, useCallback, useRef } from "react";
import Taro from "@tarojs/taro";
import "./index.scss";

function resolveSize(raw: number | string): number {
  if (typeof raw === "number") return raw;
  switch (raw) {
    case "sm": return 20;
    case "md": return 28;
    case "lg": return 36;
    default: return 28;
  }
}

interface IosSliderProps {
  value: number;
  value2?: number;
  min?: number;
  max?: number;
  step?: number;
  size?: number | string;
  range?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  orientation?: "horizontal" | "vertical";
  onValueChange: (value: number) => void;
  onValueChange2?: (value: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
}

export default function IosSlider({
  value,
  value2,
  min = 0,
  max = 100,
  step = 1,
  size = 28,
  range = false,
  disabled = false,
  readonly = false,
  orientation = "horizontal",
  onValueChange,
  onValueChange2,
  onDragStateChange,
  className = "",
  trackClassName = "",
  thumbClassName = "",
}: IosSliderProps) {
  const [dragging, setDragging] = useState(false);
  const dragTargetRef = useRef<1 | 2>(1);

  const thumbPx = resolveSize(size);
  const trackPad = Math.max(12, thumbPx * 0.5);
  const isVertical = orientation === "vertical";

  const computeValue = useCallback(
    (clientX: number, clientY: number) => {
      const sel = ".ios-slider-track";
      const query = Taro.createSelectorQuery();
      query.select(sel).boundingClientRect((rect: any) => {
        if (!rect || (!rect.width && !rect.height)) return;
        const rangeVal = max - min;

        let ratio: number;
        if (isVertical) {
          ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        } else {
          ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        }

        const raw = min + ratio * rangeVal;
        const snapped = Math.round(raw / step) * step;
        const clamped = Math.max(min, Math.min(max, snapped));

        if (range && dragTargetRef.current === 2) {
          const lo = Math.min(clamped, value);
          onValueChange(lo);
          onValueChange2?.(Math.max(clamped, value));
        } else {
          onValueChange(clamped);
        }
      }).exec();
    },
    [min, max, step, range, value, isVertical, onValueChange, onValueChange2]
  );

  const handleTouchStart = useCallback(
    (e: any) => {
      if (disabled || readonly) return;
      setDragging(true);
      onDragStateChange?.(true);

      const touch = e.touches?.[0];
      if (!touch) return;

      if (range && value2 !== undefined && onValueChange2) {
        const v1 = value;
        const v2 = value2;
        const rangeVal = max - min;
        const p1 = ((v1 - min) / rangeVal) * 100;
        const p2 = ((v2 - min) / rangeVal) * 100;

        const query = Taro.createSelectorQuery();
        query.select(".ios-slider-track").boundingClientRect((rect: any) => {
          if (!rect) return;
          let touchRatio: number;
          if (isVertical) {
            touchRatio = 1 - ((touch.clientY - rect.top) / rect.height);
          } else {
            touchRatio = (touch.clientX - rect.left) / rect.width;
          }
          const touchPct = touchRatio * 100;
          const dist1 = Math.abs(touchPct - p1);
          const dist2 = Math.abs(touchPct - p2);
          dragTargetRef.current = dist1 <= dist2 ? 1 : 2;
          computeValue(touch.clientX, touch.clientY);
        }).exec();
      } else {
        dragTargetRef.current = 1;
        computeValue(touch.clientX, touch.clientY);
      }
    },
    [disabled, readonly, range, value2, value, min, max, isVertical, onValueChange2, onDragStateChange, computeValue]
  );

  const handleTouchMove = useCallback(
    (e: any) => {
      if (!dragging || disabled || readonly) return;
      const touch = e.touches?.[0];
      if (touch) computeValue(touch.clientX, touch.clientY);
      e.stopPropagation?.();
    },
    [dragging, disabled, readonly, computeValue]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    onDragStateChange?.(false);
  }, [onDragStateChange]);

  const percent1 = ((value - min) / (max - min)) * 100;
  const percent2 = value2 !== undefined ? ((value2 - min) / (max - min)) * 100 : 100;
  const fillStart = range && value2 !== undefined ? percent1 : 0;
  const fillEnd = range && value2 !== undefined ? percent2 : percent1;

  const sliderClasses = [
    "ios-slider",
    isVertical ? "ios-slider--vertical" : "ios-slider--horizontal",
    disabled ? "ios-slider--disabled" : "",
    readonly ? "ios-slider--readonly" : "",
    className,
  ].filter(Boolean).join(" ");

  const trackClasses = ["ios-slider-track", trackClassName].filter(Boolean).join(" ");

  const thumb1Classes = [
    "ios-slider-thumb",
    dragging ? "ios-slider-thumb--active" : "",
    thumbClassName,
  ].filter(Boolean).join(" ");

  const thumb2Classes = [
    "ios-slider-thumb",
    dragging ? "ios-slider-thumb--active" : "",
    thumbClassName,
  ].filter(Boolean).join(" ");

  return (
    <View
      className={sliderClasses}
      style={{
        "--ios-thumb-px": `${thumbPx}px`,
        "--ios-track-pad": `${trackPad}px`,
      } as React.CSSProperties}
    >
      <View
        className={trackClasses}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <View className="ios-slider-rail" />
        {range && value2 !== undefined ? (
          <View
            className="ios-slider-fill"
            style={
              isVertical
                ? { top: `${100 - fillEnd}%`, height: `${fillEnd - fillStart}%` }
                : { left: `${fillStart}%`, width: `${fillEnd - fillStart}%` }
            }
          />
        ) : (
          <View
            className="ios-slider-fill"
            style={isVertical ? { height: `${percent1}%` } : { width: `${percent1}%` }}
          />
        )}
        <View
          className={thumb1Classes}
          style={isVertical ? { bottom: `${percent1}%` } : { left: `${percent1}%` }}
        />
        {range && value2 !== undefined && (
          <View
            className={thumb2Classes}
            style={isVertical ? { bottom: `${percent2}%` } : { left: `${percent2}%` }}
          />
        )}
      </View>
    </View>
  );
}
