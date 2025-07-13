# PowerShell script to upload environment variables to GitHub secrets
# This script reads your .env file and uploads each variable as a GitHub secret

param(
    [string]$RepoName = "",
    [string]$Owner = ""
)

Write-Host "GitHub Environment Variables Uploader" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found in current directory" -ForegroundColor Red
    exit 1
}

# Check if GitHub CLI is installed
$ghInstalled = $false
try {
    $null = Get-Command gh -ErrorAction Stop
    $ghInstalled = $true
    Write-Host "GitHub CLI found" -ForegroundColor Green
} catch {
    Write-Host "GitHub CLI not found. Will provide manual instructions." -ForegroundColor Yellow
}

# Read .env file
Write-Host "Reading .env file..." -ForegroundColor Cyan
$envContent = Get-Content ".env"

# Parse environment variables
$envVars = @{}
foreach ($line in $envContent) {
    if ($line -and $line -notmatch "^#" -and $line -match "=") {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars[$key] = $value
        }
    }
}

Write-Host "Found $($envVars.Count) environment variables:" -ForegroundColor Cyan
foreach ($key in $envVars.Keys) {
    Write-Host "   - $key" -ForegroundColor White
}

if ($ghInstalled) {
    Write-Host "\nUploading to GitHub secrets..." -ForegroundColor Green
    
    # Get repository info if not provided
    if (-not $RepoName -or -not $Owner) {
        try {
            $remoteUrl = git remote get-url origin
            if ($remoteUrl -match "github\.com") {
                $urlParts = $remoteUrl -split "/"
                $Owner = $urlParts[-2]
                $RepoName = $urlParts[-1] -replace "\.git$", ""
            } else {
                throw "Could not parse repository URL"
            }
        } catch {
            Write-Host "Error: Could not determine repository. Please provide -RepoName and -Owner parameters." -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "Repository: $Owner/$RepoName" -ForegroundColor Cyan
    
    # Upload each variable
    $successCount = 0
    foreach ($key in $envVars.Keys) {
        $value = $envVars[$key]
        try {
            Write-Host "   Uploading $key..." -ForegroundColor White -NoNewline
            gh secret set $key --repo "$Owner/$RepoName" --body "$value" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host " OK" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host " FAIL" -ForegroundColor Red
            }
        } catch {
            Write-Host " FAIL" -ForegroundColor Red
        }
    }
    
    Write-Host "\nSuccessfully uploaded $successCount/$($envVars.Count) secrets!" -ForegroundColor Green
    
} else {
    Write-Host "\nManual Upload Instructions:" -ForegroundColor Yellow
    Write-Host "=============================" -ForegroundColor Yellow
    
    Write-Host "1. Go to your GitHub repository" -ForegroundColor White
    Write-Host "2. Click Settings > Secrets and variables > Actions" -ForegroundColor White
    Write-Host "3. Click 'New repository secret' for each variable below:" -ForegroundColor White
    Write-Host ""
    
    foreach ($key in $envVars.Keys) {
        $value = $envVars[$key]
        Write-Host "   Name: $key" -ForegroundColor Cyan
        Write-Host "   Value: $value" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "Tip: Install GitHub CLI for automatic upload:" -ForegroundColor Yellow
    Write-Host "   winget install GitHub.cli" -ForegroundColor White
    Write-Host "   or visit: https://cli.github.com/" -ForegroundColor White
}

Write-Host "\nDone!" -ForegroundColor Green 