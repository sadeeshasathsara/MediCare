<#
.SYNOPSIS
    Automated setup script for the MediCare microservices platform.
#>

param(
    [switch]$Reset,
    [switch]$SkipBuild,
    [switch]$BuildImages,
    [string]$EnvFile = ".env",
    [string]$Namespace = "default",
    [string]$Service,
    [switch]$NoRestart,
    [switch]$Auto,
    [string]$DiffRef,
    [switch]$PortForwardGateway
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSCommandPath
$OriginalLocation = Get-Location
Set-Location $ProjectRoot
$BinDir = Join-Path $ProjectRoot ".bin"

# 1. Admin Check
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Warning "Running without Administrator privileges. System path updates may fail."
}

Write-Host "--- Starting MediCare Platform Setup ---" -ForegroundColor Cyan

# If a specific service is targeted, default to building that service image
# (unless the caller explicitly asked to skip builds). This prevents reloading
# a stale local image and restarting a deployment without the latest code.
if (-not $SkipBuild -and -not $BuildImages -and -not $Auto -and -not [string]::IsNullOrWhiteSpace($Service)) {
    Write-Host "Service '$Service' specified without -BuildImages; defaulting to building the image." -ForegroundColor Gray
    $BuildImages = $true
}

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

function Read-DotEnvFile([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Env file not found: $path"
    }

    $vars = [ordered]@{}
    foreach ($rawLine in (Get-Content -LiteralPath $path)) {
        $line = ("" + $rawLine).Trim()
        if ($line.Length -eq 0) { continue }
        if ($line.StartsWith("#")) { continue }

        if ($line -match '^\s*export\s+') {
            $line = ($line -replace '^\s*export\s+', '')
        }

        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { continue }

        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            if ($value.Length -ge 2) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        if ($key.Length -eq 0) { continue }
        $vars[$key] = $value
    }
    return $vars
}

function Assert-RequiredEnv([hashtable]$vars, [string[]]$requiredKeys) {
    $missing = @()
    foreach ($k in $requiredKeys) {
        if (-not $vars.ContainsKey($k) -or [string]::IsNullOrWhiteSpace([string]$vars[$k])) {
            $missing += $k
        }
    }
    if ($missing.Count -gt 0) {
        throw ("Missing required env vars (empty or not set) in {0}: {1}" -f $EnvFile, ($missing -join ", "))
    }
}

function Assert-JwtSecretStrength([hashtable]$vars) {
    if (-not $vars.ContainsKey("JWT_SECRET")) { return }
    $secret = [string]$vars["JWT_SECRET"]
    if ([string]::IsNullOrWhiteSpace($secret)) { return }

    $byteCount = [System.Text.Encoding]::UTF8.GetByteCount($secret)
    if ($byteCount -lt 32) {
        throw ("JWT_SECRET is too short ({0} bytes). For HS256 it must be at least 32 bytes (256 bits). Update {1} and re-run this script." -f $byteCount, $EnvFile)
    }
}

function Ensure-Namespace([string]$ns) {
    & $KBT get namespace $ns *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Creating namespace '$ns'..." -ForegroundColor Gray
        & $KBT create namespace $ns | Out-Null
    }
}

function Has-DockerImage([string]$imageName) {
    $id = (docker images -q $imageName 2>$null | Select-Object -First 1)
    return -not [string]::IsNullOrWhiteSpace([string]$id)
}

function Test-MinikubeRunning() {
    try {
        $out = (& $MKB status 2>$null | Out-String)
        if ($LASTEXITCODE -ne 0) { return $false }
        return ($out -match "host:\s*Running")
    } catch {
        return $false
    }
}

function Resolve-ServicesToProcess([string]$serviceName) {
    $servicesRoot = Join-Path $ProjectRoot "services"
    if (-not (Test-Path -LiteralPath $servicesRoot)) {
        throw "services folder not found at: $servicesRoot"
    }

    $dirs = Get-ChildItem -Path $servicesRoot -Directory
    if ([string]::IsNullOrWhiteSpace($serviceName)) {
        return $dirs
    }

    $match = $dirs | Where-Object { $_.Name -eq $serviceName } | Select-Object -First 1
    if (-not $match) {
        $available = ($dirs | ForEach-Object { $_.Name }) -join ", "
        throw "Unknown service '$serviceName'. Available: $available"
    }
    return @($match)
}

function Rollout-RestartAndWait([string[]]$deploymentNames) {
    foreach ($dep in $deploymentNames) {
        if ([string]::IsNullOrWhiteSpace($dep)) { continue }
        Write-Host "   - restart $dep" -ForegroundColor Gray
        & $KBT rollout restart -n $Namespace "deployment/$dep" | Out-Null
    }
    foreach ($dep in $deploymentNames) {
        if ([string]::IsNullOrWhiteSpace($dep)) { continue }
        Write-Host "   - rollout $dep" -ForegroundColor Gray
        & $KBT rollout status -n $Namespace "deployment/$dep" --timeout=180s
    }
}

function Test-GitRepo {
    return (Test-Path -LiteralPath (Join-Path $ProjectRoot ".git")) -and ($null -ne (Get-Command git -ErrorAction SilentlyContinue))
}

function Get-ChangedPaths([string]$diffRef) {
    if (-not (Test-GitRepo)) {
        return @()
    }

    if (-not [string]::IsNullOrWhiteSpace($diffRef)) {
        $out = & git diff --name-only "$diffRef..HEAD" 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "git diff failed for ref '$diffRef'. Make sure it exists (example: origin/main) and that you've fetched it."
        }
        return @($out)
    }

    # Working tree + staged changes.
    $status = & git status --porcelain 2>$null
    if ($LASTEXITCODE -ne 0) {
        return @()
    }

    $paths = @()
    foreach ($line in $status) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $p = $line.Substring(3)
        if ($p -match " -> ") { $p = ($p -split " -> ")[-1] }
        $paths += $p.Trim()
    }
    return $paths
}

function Get-ChangedServices([string[]]$paths) {
    $services = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($p in $paths) {
        if ($p -match '^services/([^/]+)/') {
            [void]$services.Add($Matches[1])
        }
    }
    return @($services)
}

function Any-MatchPrefix([string[]]$paths, [string]$prefix) {
    foreach ($p in $paths) {
        if ($p -like "$prefix*") { return $true }
    }
    return $false
}

function Start-GatewayPortForward([string]$ns, [string]$kubectlPath) {
    $port = 8080

    # Best-effort check for a port conflict.
    $alreadyListening = $false
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conn) { $alreadyListening = $true }
    } catch {
        # Ignore if Get-NetTCPConnection isn't available.
    }

    if ($alreadyListening) {
        Write-Host "Port $port is already in use on this machine." -ForegroundColor Yellow
        Write-Host "If you already have a port-forward running, you can reuse it." -ForegroundColor Yellow
        return
    }

    $kubectlToUse = $kubectlPath
    if ([string]::IsNullOrWhiteSpace($kubectlToUse)) {
        $kubectlToUse = "kubectl"
    }

    Write-Host "Starting API Gateway port-forward on http://localhost:$port ..." -ForegroundColor Cyan
    Write-Host "A new PowerShell window will stay open for the tunnel." -ForegroundColor Gray

    $cmd = "& `"$kubectlToUse`" port-forward -n `"$ns`" svc/api-gateway ${port}:${port}"
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $cmd) | Out-Null
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
if (Test-MinikubeRunning) {
    Write-Host "Minikube is already running. Skipping start." -ForegroundColor Gray
} else {
    & $MKB start --driver=docker
}

Write-Host "Ensuring kubectl context is minikube..." -ForegroundColor Gray
& $KBT config use-context minikube | Out-Null

if ($Auto) {
    $ChangedPaths = Get-ChangedPaths $DiffRef
    $ChangedServices = Get-ChangedServices $ChangedPaths
    $EnvChanged = Any-MatchPrefix $ChangedPaths $EnvFile
    $K8sChanged = Any-MatchPrefix $ChangedPaths "k8s/"

    if ([string]::IsNullOrWhiteSpace($Service) -and $ChangedServices.Count -gt 0) {
        $Service = $ChangedServices[0]
        if ($ChangedServices.Count -gt 1) {
            Write-Host ("Auto mode detected multiple changed services: {0}." -f ($ChangedServices -join ", ")) -ForegroundColor Yellow
            Write-Host "Running full platform update instead. Use -Service <name> to target one." -ForegroundColor Yellow
            $Service = $null
        }
    }

    if ($EnvChanged) {
        Write-Host "Auto mode: detected .env change -> will update secret" -ForegroundColor Gray
    }
    if ($K8sChanged) {
        Write-Host "Auto mode: detected k8s/ change -> will re-apply manifests" -ForegroundColor Gray
    }
    if (-not [string]::IsNullOrWhiteSpace($Service)) {
        Write-Host "Auto mode: targeting service '$Service'" -ForegroundColor Gray
        if (-not $SkipBuild) {
            $BuildImages = $true
        }
    }
}

# 8. Tag & Load Images
if (-not $SkipBuild) {
    Write-Host "Synchronizing Microservice Images..." -ForegroundColor Cyan
    $Services = Resolve-ServicesToProcess $Service
    foreach ($S in $Services) {
        $FullName = "ghcr.io/sadeeshasathsara/medicare/$($S.Name):latest"
        $ShortName = "$($S.Name):latest"
        $ProjName = "medicare-$($S.Name):latest"

        if ($BuildImages) {
            $dockerfile = Join-Path $S.FullName "Dockerfile"
            if (-not (Test-Path -LiteralPath $dockerfile)) {
                Write-Warning "No Dockerfile found for $($S.Name). Skipping build."
                continue
            }
            Write-Host "   - Building $($S.Name)..." -ForegroundColor Gray
            docker build -t $FullName $S.FullName | Out-Null
        } else {
            # Check if we have the image locally but under a different name
            if (-not (Has-DockerImage $FullName)) {
                if (Has-DockerImage $ShortName) {
                    docker tag $ShortName $FullName
                } elseif (Has-DockerImage $ProjName) {
                    docker tag $ProjName $FullName
                } else {
                    Write-Warning "Image for $($S.Name) not found locally. Skipping cache load."
                    continue
                }
            }
        }

        Write-Host "   - Loading $($S.Name)..." -ForegroundColor Gray
        & $MKB image load $FullName --overwrite=true
    }
}

# 9. Apply Manifests
Write-Host "Applying Kubernetes manifests..." -ForegroundColor Cyan
Ensure-Namespace $Namespace

$EnvVars = Read-DotEnvFile $EnvFile
$Required = @(
    "JWT_SECRET",
    "MONGO_URI_AUTH",
    "MONGO_URI_PATIENT",
    "MONGO_URI_DOCTOR",
    "MONGO_URI_APPOINTMENT",
    "MONGO_URI_TELEMEDICINE",
    "MONGO_URI_PAYMENT",
    "MONGO_URI_NOTIFICATION",
    "MONGO_URI_AI"
)
Assert-RequiredEnv $EnvVars $Required
Assert-JwtSecretStrength $EnvVars

$SecretArgs = @(
    "create", "secret", "generic", "medicare-secrets",
    "-n", $Namespace,
    "--dry-run=client", "-o", "yaml"
)
foreach ($kv in $EnvVars.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace([string]$kv.Value)) { continue }
    $SecretArgs += "--from-literal=$($kv.Key)=$($kv.Value)"
}
& $KBT @SecretArgs | & $KBT apply -f - | Out-Null

& $KBT apply -n $Namespace -f k8s/

# 10. Wait and Finish
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow

$AllDeployments = @(
    "auth-service",
    "patient-service",
    "doctor-service",
    "appointment-service",
    "telemedicine-service",
    "payment-service",
    "notification-service",
    "ai-symptom-service",
    "api-gateway"
)

$DeploymentsToTouch = if ([string]::IsNullOrWhiteSpace($Service)) {
    $AllDeployments
} else {
    # Deployments use the same name as the service folder in this repo.
    @($Service)
}

if (-not $NoRestart) {
    Rollout-RestartAndWait $DeploymentsToTouch
} else {
    foreach ($dep in $DeploymentsToTouch) {
        Write-Host "   - rollout $dep" -ForegroundColor Gray
        & $KBT rollout status -n $Namespace "deployment/$dep" --timeout=180s
    }
}

Write-Host "`n*** SETUP COMPLETE ***" -ForegroundColor Green

$Url = $null
try {
    $Url = & $MKB service -n $Namespace api-gateway --url 2>$null
} catch {
    $Url = $null
}

if (-not [string]::IsNullOrWhiteSpace([string]$Url)) {
    Write-Host "API Gateway is live at: $Url" -ForegroundColor Cyan
} else {
    # Fallback: NodePort is pinned to 30080 in the manifest.
    $mkIp = $null
    try { $mkIp = (& $MKB ip 2>$null).Trim() } catch { $mkIp = $null }
    if (-not [string]::IsNullOrWhiteSpace($mkIp)) {
        Write-Host ("API Gateway is live at: http://{0}:30080" -f $mkIp) -ForegroundColor Cyan
    } else {
        Write-Host "API Gateway URL: run 'minikube service -n $Namespace api-gateway --url'" -ForegroundColor Cyan
    }
}

Write-Host "`n--- Useful Kubernetes Commands ---" -ForegroundColor Yellow
Write-Host "View Pods Status:   kubectl get pods"
Write-Host "View Service Logs:  kubectl logs -f deployment/<service-name>"
Write-Host "Open Dashboard:     minikube dashboard"
Write-Host "Restart a Service:  kubectl rollout restart deployment/<service-name>"
Write-Host "API Gateway URL:    minikube service -n $Namespace api-gateway --url"
Write-Host "Gateway Port-Forward: kubectl port-forward -n $Namespace svc/api-gateway 8080:8080"
Write-Host "--------------------------------"

if ($PortForwardGateway) {
    Start-GatewayPortForward -ns $Namespace -kubectlPath $KBT
}

Set-Location $OriginalLocation
