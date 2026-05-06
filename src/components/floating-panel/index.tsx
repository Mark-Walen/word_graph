import { useMemo, useState, useRef, useCallback } from "react"
import { View, ScrollView } from "@tarojs/components"
import { getWindowInfo } from "@tarojs/taro"
import "./index.scss"

const DAMP = 0.2

export interface FloatingPanelProps {
  className?: string
  anchors?: number[]
  height?: number
  duration?: number
  children?: React.ReactNode
  renderHeader?: React.ReactNode
  onClose?: () => void
}

function closestValue(arr: number[], target: number): number {
  return arr.reduce((pre, cur) =>
    Math.abs(pre - target) < Math.abs(cur - target) ? pre : cur,
  )
}

function useTouchDrag() {
  const dataRef = useRef({ startY: 0, deltaY: 0 })

  const start = useCallback((event: any) => {
    const touch = event.touches?.[0] ?? event.changedTouches?.[0]
    if (touch) {
      dataRef.current.startY = touch.clientY ?? touch.pageY ?? 0
      dataRef.current.deltaY = 0
    }
  }, [])

  const move = useCallback((event: any) => {
    const touch = event.touches?.[0] ?? event.changedTouches?.[0]
    if (touch) {
      const clientY = touch.clientY ?? touch.pageY ?? 0
      dataRef.current.deltaY = clientY - dataRef.current.startY
    }
  }, [])

  return { dataRef, start, move }
}

export default function FloatingPanel(props: FloatingPanelProps) {
  const {
    className = "",
    anchors: anchorsProp = [],
    height: heightProp = 0,
    duration = 0.3,
    children,
    renderHeader,
    onClose,
  } = props

  const startY = useRef(0)
  const [height, setHeight] = useState(heightProp)
  const [dragging, setDragging] = useState(false)
  const { dataRef: touchRef, start: touchStart, move: touchMove } = useTouchDrag()

  const windowHeight = useMemo(() => getWindowInfo().windowHeight, [])

  const boundary = useMemo(
    () => ({
      min: anchorsProp[0] ?? 100,
      max: anchorsProp[anchorsProp.length - 1] ?? Math.round(windowHeight * 0.6),
    }),
    [anchorsProp, windowHeight],
  )

  const anchors = useMemo(
    () => (anchorsProp.length >= 2 ? anchorsProp : [boundary.min, boundary.max]),
    [anchorsProp, boundary.min, boundary.max],
  )

  const ease = useCallback(
    (moveY: number) => {
      const absDistance = Math.abs(moveY)
      const { min, max } = boundary
      if (absDistance > max) {
        return -(max + (absDistance - max) * DAMP)
      }
      if (absDistance < min) {
        return -(min - (min - absDistance) * DAMP)
      }
      return moveY
    },
    [boundary],
  )

  const rootStyle = useMemo(
    () => ({
      height: `${boundary.max}px`,
      transform: `translateY(calc(100% + ${-height}px))`,
      transition: !dragging
        ? `transform ${duration}s cubic-bezier(0.18, 0.89, 0.32, 1.28)`
        : "none",
    }),
    [boundary.max, height, dragging, duration],
  )

  const onTouchStart = useCallback(
    (event: any) => {
      touchStart(event)
      setDragging(true)
      startY.current = -height
    },
    [height, touchStart],
  )

  const onTouchMove = useCallback(
    (event: any) => {
      touchMove(event)
      const moveY = touchRef.current.deltaY + startY.current
      setHeight(-ease(moveY))
    },
    [ease, touchMove, touchRef],
  )

  const onTouchEnd = useCallback(() => {
    setDragging(false)
    const snapped = closestValue(anchors, height)
    setHeight(snapped)

    if (snapped === anchors[0] && onClose) {
      onClose()
    }
  }, [anchors, height, onClose])

  return (
    <View className={`cfp-root ${className}`} style={rootStyle}>
      <View
        className="cfp-header"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        data-id="cfp-header"
      >
        <View className="cfp-drag-bar" />
        {renderHeader}
      </View>
      <ScrollView scrollY showScrollbar={false} className="cfp-body">
        {children}
      </ScrollView>
    </View>
  )
}
