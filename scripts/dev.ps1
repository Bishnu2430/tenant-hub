# Start full local dev stack:
# - Postgres + API via docker compose
# - Frontend via Next.js dev server

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path "$PSScriptRoot\..\").Path
Set-Location $root

Write-Host "[dev] Starting Postgres + API (docker compose)…"
docker compose up -d --build

$apiUrl = if ($env:API_URL) { $env:API_URL } else { "http://127.0.0.1:8080" }
$healthUrl = "$apiUrl/health"

Write-Host "[dev] Waiting for API health…"
for ($i = 0; $i -lt 60; $i++) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 $healthUrl
    if ($resp.StatusCode -eq 200) { break }
  } catch {
    Start-Sleep -Seconds 1
  }
}

Write-Host "[dev] API: $apiUrl"

Write-Host "[dev] Starting frontend (Next.js)…"
Set-Location "$root\frontend"

if (-not (Test-Path "node_modules")) {
  Write-Host "[dev] Installing frontend dependencies…"
  npm install
}

  $env:NEXT_PUBLIC_API_BASE_URL = $apiUrl
  $frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "8888" }
  Write-Host "[dev] Frontend: http://127.0.0.1:$frontendPort"

  npm run dev -- --port $frontendPort
