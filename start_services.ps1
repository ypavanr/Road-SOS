# start_services.ps1
# Starts all Road-SOS backend microservices in separate minimized PowerShell windows.
$Root = Get-Location

Write-Host "Starting Road-SOS Backend Services..." -ForegroundColor Cyan

# Define services: Name, Port, Path, Venv, Command
$Services = @(
    @{ Name="hospital-service"; Port=8001; Path="backend\services\hospital-service"; Venv=".venv"; Command="python main.py" },
    @{ Name="roadside-service"; Port=8002; Path="backend\services\roadside-service"; Venv=".venv"; Command="python main.py" },
    @{ Name="emergency-contacts-service"; Port=8003; Path="backend\services\emergency-contacts-service"; Venv=".venv"; Command="python main.py" },
    @{ Name="classifier-service"; Port=8004; Path="backend\services\classifier-service"; Venv="venv"; Command="uvicorn app.main:app --host 0.0.0.0 --port 8004" },
    @{ Name="route-service"; Port=8005; Path="backend\services\route-service"; Venv=".venv"; Command="uvicorn main:app --host 0.0.0.0 --port 8005" },
    @{ Name="speech-service"; Port=8006; Path="backend\services\speech-service"; Venv="venv"; Command="uvicorn app.main:app --host 0.0.0.0 --port 8006" },
    @{ Name="sos-service"; Port=8007; Path="backend\services\sos-service"; Venv=".venv"; Command="python main.py" },
    @{ Name="api-gateway"; Port=8000; Path="backend\api-gateway"; Venv="venv"; Command="uvicorn main:app --host 0.0.0.0 --port 8000" }
)

foreach ($Service in $Services) {
    Write-Host "Starting $($Service.Name) on port $($Service.Port)..." -ForegroundColor Yellow
    
    $VenvPath = Join-Path $Root $Service.Path
    $ActivateScript = Join-Path $VenvPath "$($Service.Venv)\Scripts\Activate.ps1"
    
    if (Test-Path $ActivateScript) {
        $CmdArgs = "-NoExit -Command `"cd '$VenvPath'; & '$ActivateScript'; $($Service.Command)`""
    } else {
        $CmdArgs = "-NoExit -Command `"cd '$VenvPath'; $($Service.Command)`""
    }
    
    Start-Process powershell -ArgumentList $CmdArgs -WindowStyle Minimized
    Start-Sleep -Seconds 1
}

Write-Host "All backend services launched in minimized windows!" -ForegroundColor Green
