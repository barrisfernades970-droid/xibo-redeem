@echo off
chcp 65001 >nul
echo ========================================
echo   兑换码领取工具 - 启动脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [完成] 依赖安装成功
    echo.
)

:: 启动服务
echo [启动] 正在启动服务...
echo.
node server.js

pause
