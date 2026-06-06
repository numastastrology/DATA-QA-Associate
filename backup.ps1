# Backup script for Data QA Associate
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$sourcePath = "C:\Users\kanna\DATA QA Associate"
$backupDir = "C:\Users\kanna\DATA QA Associate\backups"
$backupName = "DataQA_Backup_$timestamp"
$backupPath = Join-Path $backupDir $backupName

# Create backup directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Create backup folder
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Copy all files except the backups folder itself
Get-ChildItem -Path $sourcePath -Exclude "backups" | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination (Join-Path $backupPath $_.Name) -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $backupPath -Force
    }
}

Write-Host "Backup created successfully at: $backupPath" -ForegroundColor Green
Write-Host "Timestamp: $timestamp" -ForegroundColor Cyan
