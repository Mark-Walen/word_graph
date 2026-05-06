# Word Graph API Server 设计规范

**日期**: 2026-05-04
**状态**: 已确认
**平台**: 跨平台 (weapp, h5 等 Taro 支持的所有平台)

---

## 概述

为 WordGraph 项目添加一个基于 Express 的 API 服务器，将当前硬编码在 frontend 中的 word-relation-data.json 数据通过 HTTP API 暴露出来，供搜索页、词详情页、关系图页和关系路径页使用。

---

## 架构决策

### 方案：轻量 Express 服务器 + 跨平台 URL 策略

**Server 端：**
- Express + cors，端口 25051，读取 `word-relation-data.json`（~122KB, ~944 entries）到内存
- 仅 GET 端点，无状态，无认证
- 运行方式：`tsx server/index.ts`

**Client 端：**
- 新建 `src/utils/api.ts` 统一 API URL 构建
- 通过 `TARO_APP_API_BASE_URL` 环境变量配置 base URL（`.env.development`）
- 所有 Taro 平台（weapp, h5 等）共用同一环境变量
- H5 可选使用 devServer proxy 转发 `/api` 路径

---

## 文件结构

```
word-graph/
├── server/
│   ├── package.json          # { "dependencies": { "express": "^4.x", "cors": "^2.x" } }
│   ├── tsconfig.json         # TypeScript 配置
│   └── index.ts              # Express 入口
├── src/
│   └── utils/
│       └── api.ts            # 跨平台 API helper
├── config/
│   └── dev.ts                # H5 devServer proxy 配置
├── .env.development          # 环境变量
├── types/
│   └── global.d.ts           # ProcessEnv 类型声明补充
└── package.json              # 新增 server/dev 脚本
```

---

## API 端点设计

| Method | Path | 用途 | 消费页面 |
|--------|------|------|----------|
| `GET` | `/api/words/search?q=xxx` | 前缀匹配搜索（大小写不敏感），返回最多 20 条 | Search 页 |
| `GET` | `/api/words/:word` | 返回完整词条（phonetic, definition, examples, relations） | Word-detail 页 |
| `GET` | `/api/words/:word/relations` | 仅返回 relations 数组 | MiniGraph 组件 |
| `GET` | `/api/graph` | 返回完整 WordGraph (`Record<string, WordNode>`) | Relation 页, Relation-path 页 |

### `/api/words/search?q=xxx` 响应格式

```json
[
  { "word": "happy", "type": "adj.", "meaning": "feeling or showing pleasure", "starred": false },
  ...
]
```

### `/api/words/:word` 响应格式

```json
{
  "word": "happy",
  "phonetic": "/ˈhæpi/",
  "partOfSpeech": "形容词",
  "level": "A1",
  "definition": "感到或表现出愉悦或满足的...",
  "examples": ["I'm happy to see you.", "..."],
  "relations": [
    { "word": "joyful", "type": "synonym", "strength": 0.9 },
    ...
  ]
}
```

### `/api/words/:word/relations` 响应格式

```json
{
  "relations": [
    { "word": "joyful", "type": "synonym", "strength": 0.9 },
    ...
  ]
}
```

### `/api/graph` 响应格式

与 `word-relation-data.json` 完全一致：`Record<string, WordNode>`。

---

## 错误处理

| 情况 | HTTP Status | 响应 |
|------|-------------|------|
| 词不存在 | 404 | `{ "error": "Word not found" }` |
| 缺少搜索参数 | 400 | `{ "error": "Query parameter 'q' is required" }` |

---

## Client 端变更

### 新建 `src/utils/api.ts`

```ts
export const API_BASE = process.env.TARO_APP_API_BASE_URL || 'http://localhost:25051'

export function apiUrl(path: string): string {
  return `${API_BASE}/api${path}`
}
```

### 各页面改动

**`search/index.tsx`：**
- 移除 `wordDatabase` 硬编码数组
- 输入时 fetch `apiUrl('/words/search?q=...')` 填充搜索建议

**`word-detail/index.tsx`：**
- `useLoad` 中 fetch `apiUrl(`/words/${word}`)` 替代硬编码数据
- 移除 `// TODO: fetch real data by word`

**`relation/index.tsx` / `relation/relation-path.tsx`：**
- 移除 `import wordData from "./word-relation-data"`
- `useDidShow` / mount 时 fetch `apiUrl('/graph')` 获取完整图谱
- `lexipath.ts` 函数签名不变，仅数据来源由 import 改为 fetch

### 关系数据组件

MiniGraph（`word-detail-panel/mini-graph.tsx`）如需要独立获取关系数据，可调用 `apiUrl(`/words/${word}/relations`)`。

---

## 环境变量

**.env.development：**
```
TARO_APP_API_BASE_URL=http://localhost:25051
```

**types/global.d.ts 补充：**
```ts
TARO_APP_API_BASE_URL: string
```

---

## DevServer 代理 (仅 H5)

`config/dev.ts` 中 h5 配置新增 devServer proxy，作为备用方案（当 `TARO_APP_API_BASE_URL` 为空字符串时可用）：

```ts
h5: {
  devServer: {
    port: 10086,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_SERVER_PORT || 25051}`,
        changeOrigin: true,
      },
    },
  },
}
```

---

## npm 脚本

`package.json` 新增：

```json
"server": "tsx server/index.ts",
"dev": "concurrently -n api,web \"npm run server\" \"npm run dev:h5\""
```

手动启动（两个终端）：
```bash
npm run server        # Terminal 1: API server on :25051
npm run dev:weapp     # Terminal 2: Taro weapp dev
```

---

## 各平台 Dev 环境工作方式

| 平台 | API 请求 URL | 前提条件 |
|------|-------------|----------|
| H5（直接） | `http://localhost:25051/api/...` | Express CORS 已启用 |
| H5（代理） | `/api/...`（devServer proxy 转发） | `TARO_APP_API_BASE_URL=""` |
| Weapp | `http://localhost:25051/api/...` | 微信开发者工具 → 详情 → 不校验合法域名 |
| 其他小程序 | `http://localhost:25051/api/...` | 对应 IDE 中开启域名校验豁免 |

---

## 非目标

- 不引入 PostgreSQL（当前阶段不需要）
- 不添加认证/授权
- 不添加 POST/PUT/DELETE 端点
- 不修改 `lexipath.ts` 的算法逻辑
