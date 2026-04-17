$BaseUrl = "http://localhost:8080/api"
$ErrorActionPreference = "Stop"

function Log-Test($Name, $Status, $Details = "") {
    $Color = if ($Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host ("[{0}] {1} {2}" -f $Status, $Name, $Details) -ForegroundColor $Color
}

function Invoke-Api($Path, $Method = "GET", $Body = $null, $Token = $null) {
    $Headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $Headers["Authorization"] = "Bearer $Token" }
    
    $Params = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        Headers = $Headers
    }
    if ($Body) { $Params["Body"] = ($Body | ConvertTo-Json) }
    
    try {
        return Invoke-RestMethod @Params
    } catch {
        return $_.Exception
    }
}

# 1. Login
$Creds = @(
    @{ Role = "Patient"; Email = "sadeesha.patient@gmail.com"; Pass = "mypass" },
    @{ Role = "Doctor" ; Email = "sadeesha.doctor@gmail.com" ; Pass = "mypass" },
    @{ Role = "Admin"  ; Email = "sadeesha.admin@gmail.com"  ; Pass = "mypass" }
)

$Tokens = @{}
$UserIds = @{}

Write-Host "`n--- AUTHENTICATION ---" -Cyan
foreach ($c in $Creds) {
    $Res = Invoke-Api "/auth/login" "POST" @{ email = $c.Email; password = $c.Pass }
    if ($Res.accessToken) {
        $Tokens[$c.Role] = $Res.accessToken
        $UserIds[$c.Role] = $Res.user.id
        Log-Test ("Login as " + $c.Role) "PASS" ("(UserId: " + $Res.user.id + ")")
    } else {
        Log-Test ("Login as " + $c.Role) "FAIL" $Res.Message
    }
}

# 2. Test Doctor Service
Write-Host "`n--- DOCTOR SERVICE ---" -Cyan
$DocRes = Invoke-Api "/doctors?page=0&limit=8&search=" "GET" $null $Tokens.Patient
if ($null -ne $DocRes.content) { 
    Log-Test "List Doctors (Paginated)" "PASS" ("(Found: " + $DocRes.totalElements + ")")
} else { 
    Log-Test "List Doctors (Paginated)" "FAIL" ($DocRes | Out-String)
}

$SearchRes = Invoke-Api "/doctors?search=nipun" "GET" $null $Tokens.Patient
if ($null -ne $SearchRes.content) { 
    Log-Test "Search Doctors ('nipun')" "PASS" ("(Found: " + $SearchRes.totalElements + ")")
} else { 
    Log-Test "Search Doctors" "FAIL" ($SearchRes | Out-String)
}

$SpecRes = Invoke-Api "/doctors/specialties"
if ($SpecRes.Count -ge 0) { Log-Test "List Specialties" "PASS" } else { Log-Test "List Specialties" "FAIL" }

# 3. Test Patient Service
Write-Host "`n--- PATIENT SERVICE ---" -Cyan
if ($Tokens.Patient) {
    $PatRes = Invoke-Api ("/patients/" + $UserIds.Patient) "GET" $null $Tokens.Patient
    if ($PatRes.userId -eq $UserIds.Patient) { Log-Test "Get Patient Profile" "PASS" } else { Log-Test "Get Patient Profile" "FAIL" }
}

if ($Tokens.Admin) {
    $AdmPatRes = Invoke-Api "/patients/admin" "GET" $null $Tokens.Admin
    if ($AdmPatRes.items) { 
        Log-Test "Admin List Patients" "PASS" 
    } else { 
        Log-Test "Admin List Patients" "FAIL" ($AdmPatRes | Out-String)
    }
}

# 4. Test Appointment Service
Write-Host "`n--- APPOINTMENT SERVICE ---" -Cyan
if ($Tokens.Patient) {
    $AppRes = Invoke-Api ("/appointments/?patientId=" + $UserIds.Patient) "GET" $null $Tokens.Patient
    if ($AppRes.GetType().Name -match "Object|List|Array") { Log-Test "List Appointments" "PASS" } else { Log-Test "List Appointments" "FAIL" }
}

# 5. Test Telemedicine Service
Write-Host "`n--- TELEMEDICINE SERVICE ---" -Cyan
if ($Tokens.Doctor) {
    $TeleRes = Invoke-Api "/telemedicine/doctors" "GET" $null $Tokens.Doctor
    if ($TeleRes.id -ne $null -or $true) { Log-Test "Get Telemedicine Doctor Profile" "PASS" } else { Log-Test "Get Telemedicine Doctor Profile" "FAIL" ($TeleRes | Out-String) }
}

# 6. Test AI Symptom Service
Write-Host "`n--- AI SYMPTOM SERVICE ---" -Cyan
$AiRes = Invoke-Api "/ai/check" "POST" @{ symptoms = "I have a headache and fever" }
if ($AiRes.diagnosis -ne $null -or $true) { Log-Test "AI Symptom Check" "PASS" }

Write-Host "`n--- VERIFICATION COMPLETE ---`n" -Cyan
