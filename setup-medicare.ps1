<#
.SYNOPSIS
    Automated setup script for the MediCare microservices platform.
#>

param(
    [switch]$Reset,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$BinDir = Join-Path $ProjectRoot ".bin"

# 1. Admin Check
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Warning "Running without Administrator privileges. System path updates may fail."
}

Write-Host "--- Starting MediCare Platform Setup ---" -ForegroundColor Cyan

# 2. Local Binaries Setup
if (-not (Test-Path $BinDir)) { 
    New-Item -ItemType Directory -Path $BinDir | Out-Null
}

# Move binaries from root to .bin for cleanliness (Safe-Move)
$ExistingBins = @("minikube.exe", "kubectl.exe")
foreach ($binFile in $ExistingBins) {
    if (Test-Path $binFile) {
        $dest = Join-Path $BinDir $binFile
        try {
            if (-not (Test-Path $dest)) {
                Move-Item $binFile $dest -Force -ErrorAction Stop
                Write-Host "Moved $binFile to .bin directory." -ForegroundColor Gray
            } else {
                Remove-Item $binFile -Force -ErrorAction Stop
            }
        } catch {
            Write-Host "Note: $binFile is currently in use. Using the copy in the root folder for now." -ForegroundColor Yellow
        }
    }
}

# 3. Permanent Path Update
Write-Host "Checking Environment Path..." -NoNewline
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$BinDir*") {
    Write-Host " [Updating User Path Permanent]" -ForegroundColor Yellow
    $UpdatedPath = $CurrentPath + ";" + $BinDir
    [Environment]::SetEnvironmentVariable("Path", $UpdatedPath, "User")
    $Env:Path += ";" + $BinDir
    Write-Host "Success! .bin added to User Path." -ForegroundColor Green
} else {
    Write-Host " [OK]" -ForegroundColor Green
}

# 4. Helper for Finding Binaries (with size check to avoid corrupted files)
function Get-ToolPath($name) {
    $rootPath = Join-Path $ProjectRoot "$name.exe"
    if (Test-Path $rootPath) {
        if ((Get-Item $rootPath).Length -gt 30MB) { return $rootPath }
    }

    $local = Join-Path $BinDir "$name.exe"
    if (Test-Path $local) {
        if ((Get-Item $local).Length -gt 30MB) { return $local }
    }

    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

# 5. Prerequisites Check
Write-Host "Checking Docker..." -NoNewline
if ($null -eq (Get-ToolPath "docker")) {
    Write-Error "Docker not found. Please install Docker Desktop."
}
try {
    docker info | Out-Null
    Write-Host " [OK]" -ForegroundColor Green
} catch {
    Write-Error "Docker daemon is not running. Please start Docker Desktop."
}

# 6. Ensure Binaries exist (Uses curl.exe for better progress and reliability)
function Download-Tool($name, $url) {
    $path = Get-ToolPath $name
    if ($null -eq $path) {
        $dest = Join-Path $BinDir "$name.exe"
        Write-Host "Downloading $name (approx. 130MB)... this may take a moment." -ForegroundColor Yellow
        # Remove potentially corrupted small file before download
        if (Test-Path $dest) { Remove-Item $dest -Force }
        
        # Using curl.exe for better reliability and progress display
        & curl.exe -L -o $dest $url
        
        # Verify download was successful and of reasonable size
        if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 30MB) {
            Write-Host "Done downloading $name." -ForegroundColor Green
            return $dest
        } else {
             Write-Error "Failed to download $name or file was corrupted. Please manually download from $url and place in .bin folder."
        }
    }
    return $path
}

$MKB = Download-Tool "minikube" "https://storage.googleapis.com/minikube/releases/latest/minikube-windows-amd64.exe"
$KBT = Download-Tool "kubectl" "https://dl.k8s.io/release/v1.30.0/bin/windows/amd64/kubectl.exe"

# 7. Cluster Init
if ($Reset) {
    Write-Host "Resetting Cluster..." -ForegroundColor Yellow
    & $MKB delete
}

Write-Host "Starting Minikube..." -ForegroundColor Cyan
& $MKB start --driver=docker

# 8. Tag & Load Images
if (-not $SkipBuild) {
    Write-Host "Synchronizing Microservice Images..." -ForegroundColor Cyan
    $Services = Get-ChildItem -Path "./services" -Directory
    foreach ($S in $Services) {
        $FullName = "ghcr.io/sadeeshasathsara/medicare/$($S.Name):latest"
        $ShortName = "$($S.Name):latest"
        $ProjName = "medicare-$($S.Name):latest"
        
        # Check if we have the image locally but under a different name
        if ($null -eq (docker images -q $FullName)) {
            if ($null -ne (docker images -q $ShortName)) {
                docker tag $ShortName $FullName
            } elseif ($null -ne (docker images -q $ProjName)) {
                docker tag $ProjName $FullName
            } else {
                Write-Warning "Image for $($S.Name) not found locally. Skipping cache load."
                continue
            }
        }

        Write-Host "   - Loading $($S.Name)..." -ForegroundColor Gray
        & $MKB image load $FullName
    }
}

# 9. Apply Manifests
Write-Host "Applying Kubernetes manifests..." -ForegroundColor Cyan
$EnvLines = Get-Content ".env" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" }
$SArgs = foreach ($L in $EnvLines) { "--from-literal=$L" }
& $KBT create secret generic medicare-secrets $SArgs --dry-run=client -o yaml | & $KBT apply -f - | Out-Null
& $KBT apply -f k8s/

# 10. Wait and Finish
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
& $KBT wait --for=condition=ready pod -l app=api-gateway --timeout=120s

Write-Host "`n*** SETUP COMPLETE ***" -ForegroundColor Green
$Url = & $MKB service api-gateway --url
Write-Host "API Gateway is live at: $Url" -ForegroundColor Cyan

Write-Host "`n--- Useful Kubernetes Commands ---" -ForegroundColor Yellow
Write-Host "View Pods Status:   kubectl get pods"
Write-Host "View Service Logs:  kubectl logs -f deployment/<service-name>"
Write-Host "Open Dashboard:     minikube dashboard"
Write-Host "Restart a Service:  kubectl rollout restart deployment/<service-name>"
Write-Host "API Gateway URL:    minikube service api-gateway --url"
Write-Host "--------------------------------"
