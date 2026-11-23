Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & WshShell.CurrentDirectory & "\start-printer.bat""", 0, False
