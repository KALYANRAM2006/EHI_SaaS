<#
.SYNOPSIS
  Push tested features from main → demo branch with a configurable expiry date.

.DESCRIPTION
  This script is the SINGLE CONTROL POINT for updating the demo environment.
  It cherry-picks or merges the latest production (main) into the demo branch,
  sets the expiry date in the commit message, and pushes to trigger deployment.

  The demo GitHub Actions workflow reads the expiry from the commit message tag
  [expiry:YYYY-MM-DD] and passes it as VITE_DEMO_EXPIRY at build time.

.PARAMETER ExpiryDate
  The date when the demo should expire. Format: YYYY-MM-DD.
  Default: 30 days from today.

.PARAMETER CommitRange
  Optional. A specific commit or range to cherry-pick (e.g. "abc1234" or "abc1234..def5678").
  If omitted, merges ALL of main into demo.

.PARAMETER Message
  Optional custom commit message. Default: auto-generated with timestamp and expiry.

.EXAMPLE
  # Merge all of main into demo, expires in 30 days
  .\push-to-demo.ps1

  # Merge all of main, expires on specific date
  .\push-to-demo.ps1 -ExpiryDate "2026-04-15"

  # Cherry-pick a specific commit
  .\push-to-demo.ps1 -CommitRange "abc1234" -ExpiryDate "2026-04-15"
#>

param(
    [string]$ExpiryDate = "",
    [string]$CommitRange = "",
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

# ─── Defaults ─────────────────────────────────────────────────────────────────
if (-not $ExpiryDate) {
    $ExpiryDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    Write-Host "No expiry specified. Defaulting to 30 days: $ExpiryDate" -ForegroundColor Yellow
}

# Validate date format
try {
    [datetime]::ParseExact($ExpiryDate, "yyyy-MM-dd", $null) | Out-Null
} catch {
    Write-Host "ERROR: Invalid date format. Use YYYY-MM-DD (e.g. 2026-04-15)" -ForegroundColor Red
    exit 1
}

$daysRemaining = ([datetime]::ParseExact($ExpiryDate, "yyyy-MM-dd", $null) - (Get-Date)).Days
if ($daysRemaining -le 0) {
    Write-Host "ERROR: Expiry date is in the past!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           PUSH TO DEMO ENVIRONMENT                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Expiry Date : $ExpiryDate ($daysRemaining days from now)" -ForegroundColor White
Write-Host "  Source      : main (production)" -ForegroundColor White
Write-Host "  Target      : demo" -ForegroundColor White
if ($CommitRange) {
    Write-Host "  Mode        : Cherry-pick ($CommitRange)" -ForegroundColor White
} else {
    Write-Host "  Mode        : Full merge from main" -ForegroundColor White
}
Write-Host ""

# ─── Safety checks ───────────────────────────────────────────────────────────
Write-Host "Checking for uncommitted changes..." -ForegroundColor Gray
$status = git status --porcelain
if ($status) {
    Write-Host "WARNING: You have uncommitted changes. Stashing..." -ForegroundColor Yellow
    git stash push -m "push-to-demo auto-stash"
    $stashed = $true
}

# Remember current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Gray

# ─── Ensure demo branch exists ───────────────────────────────────────────────
$demoBranchExists = git branch --list "demo" | Measure-Object -Line | Select-Object -ExpandProperty Lines
$remoteExists = git ls-remote --heads origin demo 2>$null | Measure-Object -Line | Select-Object -ExpandProperty Lines

if ($demoBranchExists -eq 0 -and $remoteExists -gt 0) {
    Write-Host "Checking out remote demo branch..." -ForegroundColor Gray
    git checkout -b demo origin/demo
} elseif ($demoBranchExists -eq 0) {
    Write-Host "Creating new demo branch from main..." -ForegroundColor Yellow
    git checkout -b demo main
} else {
    git checkout demo
    if ($remoteExists -gt 0) {
        Write-Host "Pulling latest demo branch..." -ForegroundColor Gray
        git pull origin demo --rebase 2>$null
    }
}

# ─── Merge or cherry-pick ────────────────────────────────────────────────────
if ($CommitRange) {
    Write-Host "Cherry-picking $CommitRange..." -ForegroundColor Cyan
    git cherry-pick $CommitRange
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Cherry-pick failed. Resolve conflicts and run again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Merging main into demo..." -ForegroundColor Cyan
    git merge main --no-edit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Merge failed. Resolve conflicts and run again." -ForegroundColor Red
        exit 1
    }
}

# ─── Create a tagged commit with expiry ──────────────────────────────────────
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
if (-not $Message) {
    $Message = "demo: update from main ($timestamp) [expiry:$ExpiryDate]"
} else {
    # Ensure the expiry tag is in the message
    if ($Message -notmatch "\[expiry:") {
        $Message = "$Message [expiry:$ExpiryDate]"
    }
}

# Create an empty commit with the expiry tag (if merge didn't create one)
git commit --allow-empty -m $Message

Write-Host ""
Write-Host "Pushing demo branch to origin..." -ForegroundColor Cyan
git push origin demo 2>&1

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           DEMO PUSH COMPLETE                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Demo expires: $ExpiryDate ($daysRemaining days)" -ForegroundColor White
Write-Host "  GitHub Actions will build & deploy automatically." -ForegroundColor White
Write-Host "  Check deployment at: https://github.com/KALYANRAM2006/EHI_SaaS/actions" -ForegroundColor Gray
Write-Host ""

# ─── Return to original branch ───────────────────────────────────────────────
git checkout $currentBranch

if ($stashed) {
    Write-Host "Restoring stashed changes..." -ForegroundColor Gray
    git stash pop
}

Write-Host "Done. You're back on '$currentBranch'." -ForegroundColor Green
