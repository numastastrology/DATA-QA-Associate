# Data QA Associate Pro - Startup Script
# Find an open port starting at 58300
$port = 58300
while ($true) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $conn) {
        break
    }
    $port++
}

Write-Host "Starting Data QA Associate Pro on port $port..." -ForegroundColor Cyan

# Determine correct local Desktop path (avoid OneDrive)
$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    "C:\Users\kanna\Desktop",
    "$env:USERPROFILE\Desktop"
)

$desktopPath = $null
foreach ($dp in $desktopPaths) {
    if ((Test-Path $dp) -and ($dp -notlike '*OneDrive*')) {
        $desktopPath = $dp
        break
    }
}

# Fallback: if all paths are OneDrive, use the first available
if (-not $desktopPath) {
    foreach ($dp in $desktopPaths) {
        if (Test-Path $dp) {
            $desktopPath = $dp
            break
        }
    }
}

if ($desktopPath) {
    $urlShortcutPath = Join-Path $desktopPath "Data QA Associate Pro.url"
    if (Test-Path $urlShortcutPath) {
        Remove-Item -Path $urlShortcutPath -Force
    }

    $shortcutPath = Join-Path $desktopPath "Data QA Associate Pro.lnk"
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = "powershell.exe"
    
    # Get the directory where the script is located
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $scriptPath = Join-Path $scriptDir "start.ps1"
    
    $Shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -File `"$scriptPath`""
    $Shortcut.WorkingDirectory = $scriptDir
    $Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,14"
    $Shortcut.Save()
    Write-Host "Desktop shortcut created at: $shortcutPath" -ForegroundColor Green
}

# Start the server in the background sharing the console
$serverProcess = Start-Process python -ArgumentList "-m http.server $port" -NoNewWindow -PassThru

try {
    # Open default browser after a short delay to allow Python server to start listening
    Start-Sleep -Milliseconds 800
    Start-Process "http://localhost:$port"
    
    # Host application and keep PowerShell window open
    Write-Host "Server running at http://localhost:$port" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
    $serverProcess | Wait-Process
}
finally {
    # Clean up the Python process if it is still running when script exits
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
