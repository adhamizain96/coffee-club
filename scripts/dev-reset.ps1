# Resets local Prisma 7 dev state when EBUSY errors block `npx prisma dev` startup.
#
# Symptom this fixes:
#   ERROR  EBUSY: resource busy or locked, unlink
#     '...\prisma-dev-nodejs\Data\durable-streams\default\durable-streams.sqlite-shm'
#
# What it does (surgical, never blanket-kills node.exe):
#   1. Stops only node processes whose CommandLine references THIS project
#      or the Prisma dev server entrypoint.
#   2. Removes the stale durable-streams\default folder so Prisma can recreate it.
#   3. Prints the three-terminal restart sequence.
#
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File scripts\dev-reset.ps1
# Run from project root: .\scripts\dev-reset.ps1

$ErrorActionPreference = 'Stop'

$projectRoot   = (Resolve-Path "$PSScriptRoot\..").Path
$prismaDataDir = Join-Path $env:LOCALAPPDATA 'prisma-dev-nodejs\Data\durable-streams\default'

Write-Host "Project root: $projectRoot"
Write-Host ""

# 1. Surgical process kill — only project-tied node.exe and the Prisma dev server
Write-Host "[1/3] Scanning for project-tied node processes..."
$escapedRoot = [regex]::Escape($projectRoot)
$targets = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object {
        $_.CommandLine -and (
            $_.CommandLine -match $escapedRoot -or
            $_.CommandLine -match 'prisma[\\/]build[\\/]index' -or
            $_.CommandLine -match 'prisma[\\/]bin\.js.*\bdev\b' -or
            $_.CommandLine -match '\bprisma\s+dev\b'
        )
    }

if ($targets) {
    foreach ($t in $targets) {
        $cmd = if ($t.CommandLine.Length -gt 120) { $t.CommandLine.Substring(0, 120) + '...' } else { $t.CommandLine }
        Write-Host "  killing PID $($t.ProcessId)  $cmd"
        Stop-Process -Id $t.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "  none found"
}

# 2. Remove the stale durable-streams folder
Write-Host ""
Write-Host "[2/3] Removing stale durable-streams\default..."
if (Test-Path $prismaDataDir) {
    try {
        Remove-Item $prismaDataDir -Recurse -Force
        Write-Host "  removed: $prismaDataDir"
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  A process is still holding the file. Re-run the script or reboot." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  already gone"
}

# 3. Next-step instructions for the three-terminal flow
Write-Host ""
Write-Host "[3/3] Reset complete. Restart in three terminals:" -ForegroundColor Green
Write-Host "  Terminal 1:  npx prisma dev"
Write-Host "  Terminal 2:  npx prisma db push  ;  npm run db:seed"
Write-Host "  Terminal 3:  npm run dev"
