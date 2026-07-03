param(
    [Parameter(Mandatory = $true)]
    [string]$ContentPath,

    [string]$CommitMessage = "",

    [string[]]$StagePath = @(),

    [switch]$Commit,

    [switch]$Push,

    [switch]$FullBuild,

    [switch]$SkipScreenshot,

    [switch]$SkipLiveWait,

    [int]$Port = 8791,

    [int]$LiveAttempts = 18,

    [int]$LiveDelaySeconds = 10,

    [int]$ScreenshotWaitMs = 7000
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Invoke-Git {
    param([string[]]$GitArgs)
    & git @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Invoke-Hugo {
    param([string[]]$HugoArgs)
    & hugo @HugoArgs
    if ($LASTEXITCODE -ne 0) {
        throw "hugo $($HugoArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Resolve-InRepoPath {
    param([string]$PathValue, [string]$RepoRoot)

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        $full = [System.IO.Path]::GetFullPath($PathValue)
    } else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $PathValue))
    }

    $rootWithSep = $RepoRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    if ($full -ne $RepoRoot -and -not $full.StartsWith($rootWithSep, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside repo: $PathValue"
    }

    return $full
}

function Convert-ToRepoRelative {
    param([string]$FullPath, [string]$RepoRoot)
    $root = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $full = [System.IO.Path]::GetFullPath($FullPath)
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside repo: $FullPath"
    }
    return ($full.Substring($root.Length) -replace '\\', '/')
}

function Get-FrontMatterValue {
    param([string]$FrontMatter, [string]$Key)

    $escaped = [regex]::Escape($Key)
    $match = [regex]::Match($FrontMatter, "(?m)^$escaped\s*:\s*(.+?)\s*$")
    if (-not $match.Success) {
        return ""
    }

    $value = $match.Groups[1].Value.Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    return $value
}

function Get-ArticleUrlPath {
    param(
        [string]$RelativePath,
        [string]$FrontMatter,
        [string]$RepoRoot
    )

    $explicitUrl = Get-FrontMatterValue $FrontMatter "url"
    if ($explicitUrl) {
        if (-not $explicitUrl.StartsWith("/")) {
            $explicitUrl = "/" + $explicitUrl
        }
        if (-not $explicitUrl.EndsWith("/")) {
            $explicitUrl = $explicitUrl + "/"
        }
        return $explicitUrl
    }

    $configPath = Join-Path $RepoRoot "hugo.toml"
    $config = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)
    if ([regex]::IsMatch($config, "(?m)^\s*\[permalinks\]")) {
        throw "hugo.toml has [permalinks]; add explicit front matter url before using this fast publish harness."
    }
    $defaultLang = "en"
    $defaultMatch = [regex]::Match($config, '(?m)^defaultContentLanguage\s*=\s*"([^"]+)"')
    if ($defaultMatch.Success) {
        $defaultLang = $defaultMatch.Groups[1].Value
    }
    $defaultInSubdir = [regex]::IsMatch($config, '(?m)^defaultContentLanguageInSubdir\s*=\s*true')

    $parts = $RelativePath -split '/'
    if ($parts.Length -lt 4 -or $parts[0] -ne "content") {
        throw "Expected content/<lang>/<section>/<file>.md path, got: $RelativePath"
    }

    $lang = $parts[1]
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($parts[$parts.Length - 1])
    $isBundleIndex = $stem -eq "index" -or $stem -eq "_index"
    $pathSegments = New-Object System.Collections.Generic.List[string]
    for ($i = 2; $i -lt ($parts.Length - 1); $i++) {
        $pathSegments.Add($parts[$i])
    }

    $slug = Get-FrontMatterValue $FrontMatter "slug"
    if ($slug) {
        $cleanSlug = $slug.Trim("/")
        if ($isBundleIndex -and $pathSegments.Count -gt 0) {
            $pathSegments[$pathSegments.Count - 1] = $cleanSlug
        } else {
            $pathSegments.Add($cleanSlug)
        }
    } elseif (-not $isBundleIndex) {
        $pathSegments.Add($stem)
    }

    $segments = New-Object System.Collections.Generic.List[string]
    if ($lang -ne $defaultLang -or $defaultInSubdir) {
        $segments.Add($lang)
    }
    foreach ($segment in $pathSegments) {
        $segments.Add($segment)
    }

    return "/" + (($segments | ForEach-Object { $_.Trim("/") }) -join "/") + "/"
}

function Test-HttpText {
    param([string]$Url, [string]$Needle)

    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 20
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Unexpected HTTP status $($response.StatusCode) for $Url"
    }
    $encodedNeedle = ""
    if ($Needle) {
        $encodedNeedle = [System.Net.WebUtility]::HtmlEncode($Needle)
    }
    if ($Needle -and -not $response.Content.Contains($Needle) -and -not $response.Content.Contains($encodedNeedle)) {
        throw "Rendered page did not contain expected title: $Needle"
    }
    return $response.StatusCode
}

function Get-ChangedPaths {
    $tracked = @(& git diff --name-only HEAD)
    $untracked = @(& git ls-files --others --exclude-standard)
    return @($tracked + $untracked | Where-Object { $_ } | Select-Object -Unique)
}

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repoRoot) {
    throw "Not inside a git repository."
}
$repoRoot = [System.IO.Path]::GetFullPath($repoRoot)
Set-Location $repoRoot

$contentFullPath = Resolve-InRepoPath $ContentPath $repoRoot
if (-not (Test-Path -LiteralPath $contentFullPath -PathType Leaf)) {
    throw "Content file does not exist: $contentFullPath"
}
$contentRelative = Convert-ToRepoRelative $contentFullPath $repoRoot

$text = [System.IO.File]::ReadAllText($contentFullPath, [System.Text.Encoding]::UTF8)
$frontMatch = [regex]::Match($text, "\A---\r?\n(?<front>.*?)\r?\n---\r?\n", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $frontMatch.Success) {
    throw "Missing YAML front matter block: $contentRelative"
}
$frontMatter = $frontMatch.Groups["front"].Value
$body = $text.Substring($frontMatch.Length)
$title = Get-FrontMatterValue $frontMatter "title"
$date = Get-FrontMatterValue $frontMatter "date"
$draft = Get-FrontMatterValue $frontMatter "draft"
$dashPattern = "[{0}{1}]" -f [char]0x2014, [char]0x2013

if (-not $title) {
    throw "Missing front matter title: $contentRelative"
}
if (-not $date) {
    throw "Missing front matter date: $contentRelative"
}
if ($contentRelative -notmatch '/incomplete/' -and $draft -match '^(?i:true)$') {
    throw "Public article is still draft=true: $contentRelative"
}
if ($contentRelative.StartsWith("content/ko/") -and $contentRelative -notmatch '/incomplete/' -and [regex]::IsMatch($body, $dashPattern)) {
    throw "Korean public writing should not contain em/en dashes: $contentRelative"
}
if ($contentRelative -notmatch '/incomplete/' -and [regex]::IsMatch($body, "(?i)\b(TODO|FIXME)\b")) {
    throw "Draft marker remains in article: $contentRelative"
}

$urlPath = Get-ArticleUrlPath $contentRelative $frontMatter $repoRoot
Write-Host "article=$contentRelative"
Write-Host "urlPath=$urlPath"
Write-Host "title=$title"

$changed = Get-ChangedPaths
$shouldRunRtl = $false
foreach ($name in $changed) {
    if ($name -match '^(assets/|layouts/|content/ar/|hugo\.toml$)') {
        $shouldRunRtl = $true
    }
}
if ($shouldRunRtl -and (Test-Path -LiteralPath (Join-Path $repoRoot "tools/check-rtl-layout.cjs"))) {
    Write-Host "check=rtl-layout"
    & node tools/check-rtl-layout.cjs
    if ($LASTEXITCODE -ne 0) {
        throw "RTL layout harness failed."
    }
}

if (Test-Path -LiteralPath (Join-Path $repoRoot "tools/check-paragraph-rhythm.js")) {
    Write-Host "check=paragraph-rhythm"
    & node tools/check-paragraph-rhythm.js
    if ($LASTEXITCODE -ne 0) {
        throw "Paragraph rhythm check failed."
    }
}

if (Test-Path -LiteralPath (Join-Path $repoRoot "tools/audit-site-text.js")) {
    Write-Host "check=source-text-audit"
    & node tools/audit-site-text.js --source-only --fail-on-hard
    if ($LASTEXITCODE -ne 0) {
        throw "Source text audit failed."
    }
}

if ($FullBuild) {
    Write-Host "check=hugo-full-build"
    Invoke-Hugo @("--gc", "--minify")
} elseif ($SkipScreenshot) {
    Write-Host "check=hugo-fast-build"
    Invoke-Hugo @("--renderToMemory", "--quiet")
} else {
    Write-Host "check=hugo-server-build"
}

$screenshotPath = ""
if (-not $SkipScreenshot) {
    $hugoCommand = (Get-Command hugo -ErrorAction Stop).Source
    $serverArgs = @(
        "server",
        "--renderToMemory",
        "--disableFastRender",
        "--bind", "127.0.0.1",
        "--baseURL", "http://127.0.0.1:$Port/",
        "--port", "$Port",
        "--quiet"
    )
    $server = $null
    try {
        Write-Host "check=local-render"
        $server = Start-Process -FilePath $hugoCommand -ArgumentList $serverArgs -WorkingDirectory $repoRoot -PassThru -WindowStyle Hidden
        $localUrl = "http://127.0.0.1:$Port$urlPath"
        $ready = $false
        for ($i = 1; $i -le 30; $i++) {
            try {
                Test-HttpText $localUrl $title | Out-Null
                $ready = $true
                break
            } catch {
                Start-Sleep -Milliseconds 500
            }
        }
        if (-not $ready) {
            throw "Local Hugo server did not serve expected page: $localUrl"
        }

        $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        if (Test-Path -LiteralPath $chrome) {
            $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
            $safeName = (($urlPath.Trim("/") -replace "[^A-Za-z0-9._-]+", "-").Trim("-"))
            $outDir = "C:\Users\Public\ogwork\article-publish-check"
            [System.IO.Directory]::CreateDirectory($outDir) | Out-Null
            $screenshotPath = Join-Path $outDir "$safeName-$stamp.png"
            $profilePath = Join-Path $outDir "chrome-profile-$safeName-$stamp"
            $stderrPath = Join-Path $outDir "chrome-$safeName-$stamp.err.log"
            $stdoutPath = Join-Path $outDir "chrome-$safeName-$stamp.out.log"
            $chromeArgs = @(
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                "--window-size=1200,900",
                "--virtual-time-budget=$ScreenshotWaitMs",
                "--user-data-dir=$profilePath",
                "--screenshot=$screenshotPath",
                $localUrl
            )
            $chromeProc = Start-Process -FilePath $chrome -ArgumentList $chromeArgs -Wait -PassThru -WindowStyle Hidden -RedirectStandardError $stderrPath -RedirectStandardOutput $stdoutPath
            if ($chromeProc.ExitCode -ne 0) {
                throw "Chrome screenshot failed with exit code $($chromeProc.ExitCode). See $stderrPath"
            }
            if (-not (Test-Path -LiteralPath $screenshotPath)) {
                throw "Chrome did not create screenshot: $screenshotPath"
            }
            Write-Host "screenshot=$screenshotPath"
            if (Test-Path -LiteralPath $profilePath) {
                Remove-Item -LiteralPath $profilePath -Recurse -Force
            }
            foreach ($logPath in @($stderrPath, $stdoutPath)) {
                if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -eq 0) {
                    Remove-Item -LiteralPath $logPath -Force
                }
            }
        } else {
            Write-Host "warning=chrome-not-found screenshot skipped"
        }
    } finally {
        if ($server -and -not $server.HasExited) {
            Stop-Process -Id $server.Id -Force
        }
    }
}

if ($Push) {
    $Commit = $true
}

if ($Commit) {
    $pathsToStage = New-Object System.Collections.Generic.List[string]
    $pathsToStage.Add($contentRelative)
    foreach ($pathValue in $StagePath) {
        $stageFull = Resolve-InRepoPath $pathValue $repoRoot
        $pathsToStage.Add((Convert-ToRepoRelative $stageFull $repoRoot))
    }
    $uniquePaths = $pathsToStage | Select-Object -Unique
    Write-Host "git=stage"
    Invoke-Git (@("add", "--") + $uniquePaths)

    & git diff --cached --quiet
    $hasStagedChanges = ($LASTEXITCODE -ne 0)
    if ($hasStagedChanges) {
        if (-not $CommitMessage) {
            $CommitMessage = "Publish article: $title"
        }
        Write-Host "git=commit"
        Invoke-Git @("commit", "-m", $CommitMessage)
    } else {
        Write-Host "git=no-staged-changes"
    }
}

if ($Push) {
    Write-Host "git=push"
    Invoke-Git @("push")

    if (-not $SkipLiveWait) {
        $configText = [System.IO.File]::ReadAllText((Join-Path $repoRoot "hugo.toml"), [System.Text.Encoding]::UTF8)
        $baseUrl = "https://seunghoonchoi.com/"
        $baseMatch = [regex]::Match($configText, '(?m)^baseURL\s*=\s*"([^"]+)"')
        if ($baseMatch.Success) {
            $baseUrl = $baseMatch.Groups[1].Value
        }
        $liveUrl = $baseUrl.TrimEnd("/") + $urlPath
        Write-Host "check=live $liveUrl"
        $liveOk = $false
        for ($i = 1; $i -le $LiveAttempts; $i++) {
            try {
                $cacheBust = "codex_check=" + [System.Uri]::EscapeDataString((Get-Date -Format "yyyyMMddHHmmss"))
                $separator = "?"
                if ($liveUrl.Contains("?")) {
                    $separator = "&"
                }
                Test-HttpText ($liveUrl + $separator + $cacheBust) $title | Out-Null
                Write-Host "live=ok attempt=$i"
                $liveOk = $true
                break
            } catch {
                Write-Host "live=waiting attempt=$i"
                Start-Sleep -Seconds $LiveDelaySeconds
            }
        }
        if (-not $liveOk) {
            throw "Live page did not update within wait window: $liveUrl"
        }
    }
}

Write-Host "done=publish-article"
