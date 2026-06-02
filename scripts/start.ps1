# 启动 DBG 卡牌游戏本地开发服务器（Windows PowerShell / WSL 路径）
$ErrorActionPreference = "Stop"

function Get-LinuxProjectPath {
    param([string]$ScriptDir)

    if ($ScriptDir -match '\\\\wsl\$\\[^\\]+\\(.+)$') {
        return '/' + ($Matches[1] -replace '\\', '/')
    }

    $ProjectRoot = Split-Path -Parent $ScriptDir
    if ($ProjectRoot -match '\\\\wsl\$\\[^\\]+\\(.+)$') {
        return '/' + ($Matches[1] -replace '\\', '/')
    }

    return $null
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LinuxPath = Get-LinuxProjectPath -ScriptDir $ScriptDir

if ($LinuxPath) {
    Write-Host "检测到 WSL 项目路径，通过 WSL 启动..." -ForegroundColor Cyan
    Write-Host "本地地址: http://localhost:8080" -ForegroundColor Green
    Write-Host "按 Ctrl+C 停止" -ForegroundColor DarkGray

    $Cmd = "cd '$LinuxPath' && (test -d node_modules || npm install) && npm run start"
    wsl -d Ubuntu -- env PATH=/home/hermes/.n/bin:/home/hermes/.npm-global/bin:/usr/bin:/bin HOME=/home/hermes bash --noprofile --norc -c $Cmd
    exit $LASTEXITCODE
}

$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "首次运行，正在安装依赖..." -ForegroundColor Yellow
    npm install
}

Write-Host "启动本地服务器: http://localhost:8080" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止" -ForegroundColor DarkGray
npm run start
