$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw '需要 Node.js 24 LTS。' }
if (-not (Test-Path -LiteralPath 'node_modules')) { throw '尚未准备依赖，请先运行 npm ci。' }
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
& npm run db:setup
if ($LASTEXITCODE -ne 0) { throw '数据库初始化失败。' }
if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) {
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw '构建失败。' }
}
Write-Host 'StudyFlow: http://localhost:3000'
& npm start
