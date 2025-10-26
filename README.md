# Word Graph

基于 Taro + React 的单词关系图项目。

## 项目简介

这是一个使用 Taro（v4.x）和 React 构建的多端（小程序 / H5 / RN 等）前端工程，主要用于展示和交互式浏览单词之间的关系图（Word Graph）。

## 技术栈

- 框架：Taro v4（`@tarojs/taro`、`@tarojs/react`）
- 视图库：React 18
- 样式：Sass
- 构建：Taro CLI + Vite
- 依赖管理：pnpm（仓库包含 `pnpm-lock.yaml`）

## 先决条件

- Node.js >= 16（建议使用 Node 18+）
- pnpm：全局安装 pnpm（可选）
- 若要编译小程序/特定平台，需安装对应平台的开发者工具（如微信开发者工具）

下面是针对 Windows 开发者的额外说明：

### 在 Windows 上通过 nvm-windows 安装 Node.js

nvm-windows 是一个用于在 Windows 上管理多个 Node.js 版本的工具（注意：与 Linux/macOS 的 nvm 不同，项目地址在 GitHub）。推荐使用 nvm-windows 来安装和切换 Node 版本：

1. 下载 nvm-windows 安装程序：

   - 访问 Releases 页面：https://github.com/coreybutler/nvm-windows/releases
   - 下载最新的 `nvm-setup.zip` 或 `nvm-setup.exe`，然后运行安装程序。

2. 安装完成后，打开一个新的 PowerShell 窗口（重要：安装后需要新开终端），验证 nvm 是否可用：

```powershell
nvm version
```

3. 安装并使用推荐的 Node 版本（示例：安装 22.12.0）：

```powershell
nvm install 18.16.0
nvm use 18.16.0
node -v
```

4. 全局安装 pnpm（如果尚未安装）：

```powershell
npm install -g pnpm
```

注意：在 Windows 上使用 nvm-windows 时，若出现权限/路径问题，请以管理员身份运行安装程序，或参考项目 README 来调整环境变量。

### 微信开发者工具（Windows）

如果你要构建并调试微信小程序，需要安装微信开发者工具（微信 DevTools）：

1. 下载地址（小程序开发者工具）：

   https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

2. 选择 Windows 版本下载安装。

3. 使用方法提示：

- 先运行小程序构建命令，例如：

```powershell
pnpm run build:weapp
```

- 在微信开发者工具中，选择 “导入项目” 或 “新建项目”，并将项目目录指向构建输出目录（通常为 `dist` 或 `dist/weapp`，取决于 Taro 配置）。
- 如果没有真实的 AppID，可以使用测试号或勾选 “不校验 AppID(仅用于调试)”（仅用于本地开发）。

4. 常见问题：

- 如果工具无法识别构建输出，确认构建命令已成功执行并且输出目录存在。
- 若出现 Node 相关报错，确认微信开发者工具是否配置了正确的 Node.js（有些版本的工具在设置中可指定 Node 路径）。

## 安装依赖

在仓库根目录下运行：

```powershell
pnpm install
```

（如果你更习惯 `npm` 或 `yarn`，也可用 `npm install` 或 `yarn`，但仓库保留了 `pnpm-lock.yaml`，建议使用 pnpm。）

## 常用脚本（从 `package.json` 提取）

项目提供了多平台的开发与构建脚本，常见命令如下：

- 本地开发（带 watch）
  - 微信小程序：

```powershell
pnpm run dev:weapp
# 或
npm run dev:weapp
```

  - H5：

```powershell
pnpm run dev:h5
```

- 构建（生产）
  - 构建 H5：

```powershell
pnpm run build:h5
```

  - 构建微信小程序：

```powershell
pnpm run build:weapp
```

完整脚本（非穷尽）：`dev:weapp`, `dev:swan`, `dev:alipay`, `dev:tt`, `dev:h5`, `build:weapp`, `build:h5`, 等（详见 `package.json`）。

## 开发流程建议

1. 安装依赖：`pnpm install`
2. 启动开发（例如 H5）：`pnpm run dev:h5`
3. 在浏览器或对应平台工具中打开并调试
4. 代码风格与提交钩子：项目包含 `husky`、`lint-staged`、`commitlint`，请按规则提交。

## 项目结构（仓库中主要文件/目录）

- `src/` - 源代码
  - `app.ts`、`app.config.ts` - Taro/应用入口配置
  - `pages/` - 页面目录（例如 `pages/index`, `pages/search`, `pages/word-detail`）
  - `components/` - 可复用组件（如 `navigation-bar`）
  - `assets/` - 静态资源
- `config/` - 环境配置（dev/prod 等）
- `ui/` - 设计稿 / figma（或 fig 文件）
- `package.json`, `tsconfig.json`, `vite.config.ts` - 构建/配置相关

(仓库中还有其他配置文件：`.eslintrc`、`.stylelintrc`、`commitlint.config.mjs` 等。）

## 常见问题与调试

- 如果构建时报错，先尝试删除 `node_modules` 与 lock 文件并重装：

```powershell
npm run -s rimraf node_modules pnpm-lock.yaml; pnpm install
```

（在 Windows PowerShell 环境上，若未安装 `rimraf`，可使用）

```powershell
Remove-Item -Recurse -Force node_modules
```

- 小程序构建后在对应平台（如微信开发者工具）中打开 `dist` 或 `output` 目录进行预览。

## 贡献

欢迎提交 issue 与 PR：

- 请先阅读并遵守 commit message 规范（仓库已配置 `commitlint`）
- 代码风格请遵循 ESLint/Stylelint 规则

## 许可

请在此处添加许可证信息（仓库当前未包含明确 LICENSE 文件）。

---

如果你希望我把 README 翻成英文、添加徽章、或把更详细的开发流程（例如调试 H5、屏幕截图、CI/CD 配置）补充进去，我可以继续完善。
