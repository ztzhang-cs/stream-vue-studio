# Stream Vue Studio

一个基于 Vue 3、TypeScript、Vite、Pinia 和 Node.js 的 AI 流式写作工作台。

## 功能

- DeepSeek 流式输出
- Flash / Pro 模型切换
- Prompt 模板
- 会话管理
- 暂停、停止、重新生成
- 结果复制
- iOS 风格响应式界面
- 本地 Node 代理保护 API Key

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Node.js
- ReadableStream
- Server-Sent Events
- AbortController

## 本地运行

安装依赖：

```bash
pnpm install
```

创建 `.env`：

```bash
cp .env.example .env
```

在 `.env` 中填入 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

启动项目：

```bash
pnpm dev
```

前端地址：

```text
http://127.0.0.1:5173
```

本地代理地址：

```text
http://127.0.0.1:8787
```

## 构建

```bash
pnpm build
```

## 安全说明

`.env` 文件包含真实 API Key，已经加入 `.gitignore`，不要提交到 GitHub。
