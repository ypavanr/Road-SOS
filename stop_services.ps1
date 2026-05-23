# stop_services.ps1
# Finds and stops all processes listening on ports 8000-8007.
$Ports = @(8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007)

Write-Host "Stopping Road-SOS Backend Services..." -ForegroundColor Cyan

foreach ($Port in $Ports) {
    $Conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($Conn) {
        $Pids = $Conn.OwningProcess | Select-Object -Unique
        foreach ($Pid in $Pids) {
            Write-Host "Stopping process ID $Pid listening on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $Pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Stopped all services on ports 8000-8007." -ForegroundColor Green
