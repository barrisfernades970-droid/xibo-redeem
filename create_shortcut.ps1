$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "兑换码领取工具.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Users\xbjt\.qianfan\workspace\7fddd38d44834035a06daf7aa403b4df\code-tool"
$Shortcut.Save()
Write-Host "快捷方式已创建到桌面"
