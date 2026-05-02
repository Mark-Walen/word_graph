import { View } from "@tarojs/components";
import { useState, useCallback } from "react";
import Taro from "@tarojs/taro";
import "./index.scss";

interface IosSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
}

export default function IosSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onDragStateChange,
  className = "",
  trackClassName = "",
  thumbClassName = "",
}: IosSliderProps) {
  const [dragging, setDragging] = useState(false);

  const computeValue = useCallback(
    (clientX: number) => {
      const query = Taro.createSelectorQuery();
      query.select(".ios-slider-track").boundingClientRect((rect: any) => {
        if (!rect || !rect.width) return;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const range = max - min;
        const raw = min + ratio * range;
        const snapped = Math.round(raw / step) * step;
        onValueChange(Math.max(min, Math.min(max, snapped)));
      }).exec();
    },
    [min, max, step, onValueChange]
  );

  const handleTouchStart = useCallback(
    (e: any) => {
      setDragging(true);
      onDragStateChange?.(true);
      const touch = e.touches?.[0];
      if (touch) computeValue(touch.clientX);
    },
    [computeValue, onDragStateChange]
  );

  const handleTouchMove = useCallback(
    (e: any) => {
      if (!dragging) return;
      const touch = e.touches?.[0];
      if (touch) computeValue(touch.clientX);
      e.stopPropagation?.();
    },
    [dragging, computeValue]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    onDragStateChange?.(false);
  }, [onDragStateChange]);

  const percent = ((value - min) / (max - min)) * 100;

  const trackClasses = ["ios-slider-track", trackClassName].filter(Boolean).join(" ");
  const thumbClasses = [
    "ios-slider-thumb",
    dragging ? "ios-slider-thumb--active" : "",
    thumbClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View className={["ios-slider", className].filter(Boolean).join(" ")}>
      <View
        className={trackClasses}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <View className="ios-slider-rail" />
        <View
          className="ios-slider-fill"
          style={{ width: `${percent}%` }}
        />
        <View
          className={thumbClasses}
          style={{ left: `${percent}%` }}
        />
      </View>
    </View>
  );
}
