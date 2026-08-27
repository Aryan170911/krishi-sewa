# Setup Claude Code with official Anthropic API
# 1. Get a key from https://console.anthropic.com/settings/keys
# 2. Open this file in Notepad, replace YOUR_KEY_HERE on line 4
# 3. Run: powershell -ExecutionPolicy Bypass -File setup-anthropic.ps1
# 4. Open a NEW PowerShell window and run: claude

$apiKey = "YOUR_KEY_HERE"  # <-- REPLACE with your sk-ant-api03-... key

# Validate
if ($apiKey -eq "YOUR_KEY_HERE" -or -not $apiKey.StartsWith("sk-ant-")) {
  Write-Host "ERROR: Edit this file and set your real Anthropic API key" -ForegroundColor Red
  Write-Host "Get one from: https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
  exit 1
}

# Set user-level env vars (no ANTHROPIC_BASE_URL - use Anthropic's default)
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $apiKey, "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929", "User")

# Make sure no rogue base URL is set
$existingBase = [System.Environment]::GetEnvironmentVariable("ANTHROPIC_BASE_URL", "User")
if ($existingBase) {
  [System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", $null, "User")
  Write-Host "Removed old ANTHROPIC_BASE_URL=$existingBase" -ForegroundColor Yellow
}

Write-Host "Done!" -ForegroundColor Green
Write-Host "  ANTHROPIC_API_KEY = $($apiKey.Substring(0,15))..."
Write-Host "  ANTHROPIC_MODEL   = claude-sonnet-4-5-20250929"
Write-Host "  (Using Anthropic official API, not a third-party proxy)"
Write-Host ""
Write-Host "Open a NEW PowerShell window and run:" -ForegroundColor Yellow
Write-Host "  cd 'C:\Users\Toshi\Desktop\krishi sewa'"
Write-Host "  claude"
