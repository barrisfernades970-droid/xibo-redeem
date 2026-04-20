@echo off
chcp 65001 >nul
title 兑换码领取工具

echo ========================================
echo   兑换码领取工具 - 启动中...
echo ========================================
echo.

:: 启动 Node.js 服务
echo [1/2] 启动服务...
start /b node server.js

:: 等待服务启动
timeout /t 3 /nobreak >nul

:: 启动 ngrok 隧道
echo [2/2] 启动隧道...
start /b "" "C:\Users\xbjt\Downloads\ngrok.exe" http 3000

:: 等待隧道建立
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   启动成功！
echo ========================================
echo.
echo   访问地址: https://manly-reassure-dilute.ngrok-free.dev
echo.
echo   普通密码: xibo888888
echo   管理员密码: xiboadmin
echo.
echo ========================================
echo.
echo   关闭此窗口即可停止服务
echo.
echo ========================================

:: 打开浏览器
start https://manly-reassure-dilute.ngrok-free.dev

:: 保持窗口打开
pause
