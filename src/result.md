# src overview

- app.ts — Taro root component; logs on launch and renders children.
- app.config.ts — App routes and window theme configuration.
- app.scss — Global styles.
- index.html — Base HTML template for H5 build.
- 关系图.html — Standalone relation-graph HTML page.
- assets/icon — SVG icon set (camera, search, qr-code, user-circle, etc.).
- assets/img — Background and placeholder images.
- components/index.ts — Barrel exports for components.
- components/ec-canvas — ECharts wrapper for Taro (bundled echarts, wx canvas shim, React component, styles).
- components/echarts/index.tsx — ECharts component bridge.
- components/navigation-bar/index.tsx — Custom navigation bar component.
- pages/index — Home page config, styles, and React page.
- pages/learn — Learning page config, styles, and React page.
- pages/relation — Relation graph page (config, styles, main React page, graph logic in `relation.ts`, sample data `word-relation-data.json`).
- pages/search — Search page (React page plus styles).
- pages/user — User account screens (`account-safe`, `edit-profile`), user index barrel, profile popup component and styles.
- pages/word-detail — Word detail page config, styles, and React page.
