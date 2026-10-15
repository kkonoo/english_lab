# 로컬 미리보기 서버: powershell -File tools/serve.ps1  →  http://localhost:8767/
$port = if ($env:PORT) { $env:PORT } else { 8767 }
$root = Split-Path -Parent $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css'; '.js'='text/javascript; charset=utf-8';
  '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.svg'='image/svg+xml' }
$l = [System.Net.HttpListener]::new()
$l.Prefixes.Add("http://localhost:$port/")
$l.Start()
Write-Host "http://localhost:$port/"
while ($l.IsListening) {
  $c = $l.GetContext()
  $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
  if ($p -eq '') { $p = 'index.html' }
  $f = Join-Path $root $p
  $c.Response.Headers['Cache-Control'] = 'no-store'
  if (Test-Path $f -PathType Leaf) {
    $b = [IO.File]::ReadAllBytes($f)
    $ext = [IO.Path]::GetExtension($f)
    if ($types[$ext]) { $c.Response.ContentType = $types[$ext] }
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
