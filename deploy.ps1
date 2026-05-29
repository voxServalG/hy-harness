# hy-harness · 一键部署 code/doc lint + MCP

Write-Host ""
Write-Host "  hy-harness · 一键部署 code/doc lint + MCP"
Write-Host "  ─────────────────────────────────────────"
Write-Host ""

if (Test-Path codelint.json) {
  Write-Host "  ⏭  codelint.json 已存在，跳过 codelint deploy"
} else {
  Write-Host "  ── codelint ──"
  npx github:voxServalG/codelint deploy
}

Write-Host ""

if (Test-Path doclint.json) {
  Write-Host "  ⏭  doclint.json 已存在，跳过 doclint deploy"
} else {
  Write-Host "  ── doclint ──"
  npx github:voxServalG/doclint deploy
}

Write-Host ""

if (Test-Path docs-gardener.json) {
  Write-Host "  ⏭  docs-gardener.json 已存在，跳过 docs-gardener deploy"
} else {
  Write-Host "  ── pre-filling shared config from doclint.json ──"
  node -e "
    const fs = require('fs');
    if (!fs.existsSync('doclint.json')) {
      console.log('  ⚠ doclint.json not found, using defaults');
      process.exit(0);
    }
    const dl = JSON.parse(fs.readFileSync('doclint.json','utf8'));
    const gardener = {docsDir:dl.docsDir, codeDirs:dl.codeDirs, codeExt:dl.codeExt, baseBranch:dl.baseBranch, catalogs:{}};
    fs.writeFileSync('docs-gardener.json', JSON.stringify(gardener,null,2));
    console.log('  ✓ docs-gardener.json pre-filled');
  "
  Write-Host ""
  Write-Host "  ── docs-gardener ──"
  npx github:voxServalG/docs-gardener deploy
}

Write-Host ""
Write-Host "  ── 完成 ──"
if (Test-Path codelint.json)       { Write-Host "  ✓ codelint.json" }
if (Test-Path doclint.json)        { Write-Host "  ✓ doclint.json" }
if (Test-Path docs-gardener.json)  { Write-Host "  ✓ docs-gardener.json" }
if (Test-Path .github/workflows/code-quality.yml) { Write-Host "  ✓ .github/workflows/code-quality.yml" }
if (Test-Path .github/workflows/docs-check.yml)   { Write-Host "  ✓ .github/workflows/docs-check.yml" }
Write-Host ""
