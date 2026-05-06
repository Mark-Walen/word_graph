# WordDetailPanel 重设计规范

**日期**: 2026-05-03
**状态**: 已确认
**平台**: 微信小程序 (Taro + React)

---

## 概述

对 `relation/index.tsx` 中 FloatingPanel 内的词详情面板进行重构，将面板 UI 抽取为独立组件 `WordDetailPanel`，并实现五个新功能：横向滑动关系卡片、Mini 力导向预览图、例句 TTS 朗读、手势联动、毛玻璃头部。

---

## 架构决策

### 组件提取策略

采用 **方案 B：提取独立组件**。在 `src/components/word-detail-panel/` 下新建组件，从 `relation/index.tsx` 中移除面板 JSX 和内联样式，替换为 `<WordDetailPanel ...props />`。

### 文件结构

```
src/components/word-detail-panel/
  ├── index.tsx          # 面板主体组件
  ├── index.scss         # 面板样式
  ├── mini-graph.tsx     # 迷你力导向图子组件
  └── types.ts           # 共享类型定义
```

### 组件树变化

**Before:**
```
relation/index.tsx
  └── FloatingPanel (.word-detail-panel) ← 内联 JSX + SCSS
      ├── Collapse
      └── 例句列表
```

**After:**
```
relation/index.tsx
  └── FloatingPanel (.word-detail-panel)
      └── WordDetailPanel (新组件)
          ├── Header (毛玻璃)
          ├── MiniGraph (150px ECharts)
          ├── Definition
          ├── RelationCards (横向 ScrollView)
          └── Examples (带 TTS 按钮)
```

---

## 组件接口

### WordDetailPanel Props

```ts
interface WordDetailPanelProps {
  wordData: WordInfo;                            // 当前词完整数据
  groupedRelations: Record<string, Relation[]>;  // 按分组聚合的关系
  centerWord: string;                            // 主图当前中心词
  onClose: () => void;                           // 关闭面板
  onNavigateToWord: (word: string) => void;      // 跳转到关系词
  onPlayExample: (text: string) => void;         // TTS 朗读
}
```

### 数据流

```
relation/index.tsx
  │
  ├─ wordData ──────────→ WordDetailPanel (展示)
  ├─ groupedRelations ──→ WordDetailPanel (展示)
  │
  ◄─ onNavigateToWord ── WordDetailPanel (点击关系词)
  │     → setCenterWord(word) + setShowDetail(false)
  │
  ◄─ onPlayExample ───── WordDetailPanel (点击朗读按钮)
  │     → ttsHook.play(text)
  │
  ◄─ onClose ─────────── WordDetailPanel (下拉/点背景)
        → setShowDetail(false)
```

---

## 功能详细设计

### 1. 横向滑动关系卡片

- **替换对象**: 现有 `Collapse` 组件及其内部的 `Collapse.Item` 列表
- **实现**: `<ScrollView scrollX>` 横向包裹卡片列表
- **卡片内部**: 简洁词列表，每行 `[关系类型] [目标词]`，带语义色左边框 (`border-left: 6rpx solid <color>`)
- **语义色映射**: 复用 `relation.ts` 中 `getRelationColor()` 和 `getRelationGroup()` 函数
- **卡片背景**: 每张卡片使用对应分组的淡语义色背景 (如 `rgba(76,175,80,0.08)`)
- **移除依赖**: 不再使用 `@taroify/core` 的 `Collapse`（`expanded` 状态也可移除）

### 2. Mini 力导向图 (MiniGraph)

- **位置**: 面板顶部，"释义"上方
- **高度**: 150px，宽度撑满
- **数据范围**: 仅选中词 + 其所有直接关系词（一级邻居）
- **实现**: 复用现有 EChart 组件，传入简化版 option（节点数 < 30，极简样式）
- **节点样式**: 中心词 32px，关系词 24px，不显示 label（或仅显示前 5 个）
- **交互**: 只读预览，不响应点击/拖拽
- **性能**: 使用 `layout: "force"` 但 `roam: false`，`animation: false` 减少开销
- **MiniGraph 子组件**: 封装在 `mini-graph.tsx`，接收 `wordData` prop，内部构建 chart option

### 3. 例句朗读按钮

- **UI**: 每条例句右侧添加小喇叭 icon（复用 `@taroify/icons` 的 `VolumeOutlined`）
- **点击行为**: 调用 `props.onPlayExample(exampleText)`
- **TTS slot**: `relation/index.tsx` 中留一个 `handlePlayExample` 函数作为 placeholder，内部：
  ```ts
  const handlePlayExample = useCallback(async (text: string) => {
    // TODO: 对接自有后端 TTS API
    // const audioUrl = await fetchTTS(text);
    // const audio = Taro.createInnerAudioContext();
    // audio.src = audioUrl;
    // audio.play();
    Taro.showToast({ title: "TTS 暂未接入", icon: "none" });
  }, []);
  ```

### 4. 手势联动

- **触发**: 点击关系卡片中的任意关系词
- **行为**: 
  1. 调用 `onNavigateToWord(targetWord)`
  2. `relation/index.tsx` 中执行 `setCenterWord(targetWord)` + `setShowDetail(false)`
- **注意**: 此逻辑与现有 `handleContextMenuAction("center")` 的核心一致，可复用同一段逻辑
- **边界**: 如果关系词不在 `wordData` 中存在，静默忽略

### 5. 毛玻璃头部

- **范围**: 仅 FloatingPanel 头部（含拖拽手柄 + 标题行）
- **问题**: 微信小程序不支持 `backdrop-filter: blur()`
- **降级方案 A（采用）**: 使用 `rgba(255,255,255,0.92)` 半透明白色 + 轻微 `box-shadow` 实现类毛玻璃效果
- **视觉效果**: 大标题（44rpx 粗体）+ 词性/等级标签 + 音标，iOS Maps 风格
- **CSS**: 
  ```scss
  .wdp-header--frosted {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px); // H5 降级可用
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 1px 0 rgba(0,0,0,0.05);
  }
  ```

---

## relation/index.tsx 改动清单

| 改动项 | 说明 |
|--------|------|
| 移除 Collapse import | 不再使用 |
| 移除 expanded 状态 | `const [expanded, setExpanded]` 删除 |
| 移除 Collapse 内 JSX | 替换为 `<WordDetailPanel>` |
| 新增 import | `import WordDetailPanel from "@/components/word-detail-panel"` |
| 新增 handleNavigateToWord | 封装 setCenterWord + setShowDetail(false) |
| 新增 handlePlayExample | placeholder slot |
| 简化 showNodeDetail | groupedRelations 构建逻辑可移至 WordDetailPanel 内部或保留 |
| SCSS 清理 | 移除 `.wdp-relations-scroll` / `.wdp-rel-list` / `.wdp-rel-item` 等卡片旧样式，新增面板新样式 |

---

## 兼容性 & 约束

- **Taro 4.x** + **React 18** — 已确认
- **微信小程序** — 不支持 backdrop-filter，使用降级方案
- **ECharts** — 通过 ec-canvas 桥接，MiniGraph 复用同一套 ECharts 封装
- **@taroify/core** — 仅保留 FloatingPanel，移除 Collapse 依赖
- **数据源** — 继续使用 `word-relation-data.json`，无后端改动

---

## 不在范围内

- 词详情独立页面 (`word-detail/index.tsx`) 不做改动
- 边关系详情面板 (`relation-detail-panel`) 不做改动
- TTS 后端 API 实现（留 placeholder）
- 词数据源从 JSON 切换为 API
