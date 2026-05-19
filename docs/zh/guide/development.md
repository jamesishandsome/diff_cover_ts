# 开发维护

本仓库使用 Bun 运行测试和脚本，使用 Rolldown 打包 npm 输出，使用 VitePress 构建文档站。

## 初始化

```bash
bun install
```

## 验证

```bash
bun test
bun run lint
bun run format:check
bun run build
bun run docs:build
```

## 发布构建

构建 npm 包输出：

```bash
bun run build
```

构建独立二进制文件：

```bash
bun run build:binary
```

本地可以限定构建目标：

```bash
BINARY_TARGETS=bun-windows-x64 bun run build:binary
# PowerShell: $env:BINARY_TARGETS="bun-windows-x64"; bun run build:binary
```

二进制构建中任一目标失败都会让进程返回非零退出码，CI 可以捕获不完整发布。

## 文档站

本地启动文档站：

```bash
bun run docs:dev
```

预览生产构建：

```bash
bun run docs:preview
```

英文页面位于 `docs/`，中文页面位于 `docs/zh/`。
