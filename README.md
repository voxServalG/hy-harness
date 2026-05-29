# hy-harness

一键部署 [codelint](https://github.com/voxServalG/codelint)、[doclint](https://github.com/voxServalG/doclint)、[docs-gardener](https://github.com/voxServalG/docs-gardener) 到新项目。

零安装、零下载——`npx` 透明处理，已存在的配置不会覆盖。

## 用法

在项目根目录执行：

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/voxServalG/hy-harness/main/deploy | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/voxServalG/hy-harness/main/deploy.ps1 | iex
```

## 做了什么

| 阶段 | 工具 | 输出 | 如已存在 |
|------|------|------|----------|
| 1 | codelint | `codelint.json` + `code-quality.yml` | 跳过 |
| 2 | doclint | `doclint.json` + `docs-check.yml` | 跳过 |
| 3 | docs-gardener | `docs-gardener.json` + MCP 提示 | 跳过 |

阶段 2 完成后，docs-gardener 共享配置（docsDir / codeDirs / codeExt / baseBranch）自动从 `doclint.json` 传递，避免重复输入。

## 要求

- Node.js >= 18（npx 自带）
- Python >= 3.10（codelint 需要）
- 项目是 git 仓库（optional）
