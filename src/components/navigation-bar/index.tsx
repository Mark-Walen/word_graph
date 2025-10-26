import { View, NativeSlot } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useEffect, useState } from "react"

interface Props {
  children?: React.ReactNode
  backgroundColor?: string
  border?: boolean
}

export default function NavigationBar({ children, backgroundColor = "#fff", border = true }: Props) {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [menuButtonInfo, setMenuButtonInfo] = useState<Taro.getMenuButtonBoundingClientRect.Rect>()

  useEffect(() => {
    const systemInfo = Taro.getSystemInfoSync()
    const menuButton = Taro.getMenuButtonBoundingClientRect()

    setStatusBarHeight(systemInfo.statusBarHeight || 20)
    setMenuButtonInfo(menuButton)
  }, [])

  const navBarHeight = Math.max(menuButtonInfo
    ? (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height
    : 44)

  return (
    <View
      className="nav-wrapper"
      style={{
        paddingTop: `${statusBarHeight}px`,
        backgroundColor,
        borderBottom: border ? "1px solid rgba(0,0,0,0.05)" : "none",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <View
        className="navigation"
        style={{
          height: `${navBarHeight}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16rpx",
        }}
      >
        {/* Slot or children */}
        {children || <NativeSlot />}
      </View>
    </View>
  )
}
