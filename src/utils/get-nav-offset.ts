import Taro from "@tarojs/taro"

let cached: number | null = null

export function getNavOffset(): number {
  if (cached !== null) return cached
  const sys = Taro.getWindowInfo()
  const menu = Taro.getMenuButtonBoundingClientRect()
  const statusBarH = sys.statusBarHeight || 20
  const navBarH = menu ? (menu.top - statusBarH) * 2 + menu.height : 44
  cached = statusBarH + navBarH
  return cached
}
