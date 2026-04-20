Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\兑换码领取工具.lnk")
oShellLink.TargetPath = "C:\Users\xbjt\.qianfan\workspace\7fddd38d44834035a06daf7aa403b4df\code-tool"
oShellLink.Save
