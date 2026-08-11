<#
.SYNOPSIS
    Uploads a folder to the TUFLOW docs web server, preserving relative
    structure, creating any missing intermediate folders, and fixing
    permissions on everything this call created.

.DESCRIPTION
    Windows OpenSSH's scp client sends an explicit 0700 mode when creating
    directories, which bypasses the server-side umask/ACL setup entirely
    (the kernel can only remove bits from a requested mode, never add
    them). This script:

      1. Creates the remote parent path with mkdir -p (if it doesn't
         already exist), applies chmod 2775 to each newly-relevant path
         segment along the way, and removes any existing content at the
         target path so the upload is a clean replace rather than a
         merge (scp -r on its own merges into an existing directory,
         leaving stale files behind from anything removed locally).
      2. Uploads the local folder via scp -r into that parent, so it
         lands at the correct depth.
      3. Renames the uploaded folder on the remote side if the local
         folder's name differs from the intended remote name.
      4. Recursively fixes the uploaded content: directories to 2775
         (rwxrwsr-x, setgid preserved) and files to 664.

    No sudo is required. chmod only succeeds on paths owned by the
    calling user, so any pre-existing parent directory owned by someone
    else (e.g. classic-hpc/ owned by a colleague) is silently left alone
    (errors suppressed) rather than failing the whole operation - group
    write access to those already comes from the ACL set up on the
    document root, not from ownership.

    Every ssh/scp call runs with a hard timeout (default 30s) and with
    stdin explicitly closed. ssh, run non-interactively against a
    command that produces no output, can otherwise hang waiting on the
    inherited console stdin handle to signal EOF, which never happens on
    its own - this was the cause of intermittent hangs seen during
    development. -n plus an explicitly closed, redirected stdin covers
    this both at the ssh flag level and at the process level.

    Remote destination path:
      - If -RemotePath is given, it is used as-is (relative to RemoteBase).
      - Otherwise, if -Path is a relative local path, that same relative
        path is used as the remote path (backslashes converted to /).
      - If -Path is absolute and -RemotePath is omitted, the script
        throws, since an absolute local path has no meaningful implied
        remote structure.

.PARAMETER Path
    Local path to the folder to upload. Relative or absolute.

.PARAMETER RemotePath
    Path, relative to RemoteBase, the folder should be uploaded to.
    Optional if Path is itself relative. Any missing intermediate
    folders are created. If the last segment differs from the local
    folder's name, the folder is renamed after upload.

.PARAMETER Server
    SSH host to upload to. Defaults to bmt-az-tuflowdocs.

.PARAMETER RemoteBase
    Remote base directory to upload into. Defaults to /var/www/tuflowdocs.

.PARAMETER TimeoutSec
    Seconds to wait for each ssh/scp call before killing it and throwing.
    Defaults to 30.

.EXAMPLE
    .\tuflowdocs-upload.ps1 classic-hpc\manual
    # Uploads .\classic-hpc\manual to /var/www/tuflowdocs/classic-hpc/manual

.EXAMPLE
    .\tuflowdocs-upload.ps1 C:\build\classic-hpc\manual classic-hpc/manual
    # Uploads C:\build\classic-hpc\manual to /var/www/tuflowdocs/classic-hpc/manual

.EXAMPLE
    .\tuflowdocs-upload.ps1 one\two\three\four
    # Creates one/, one/two/, one/two/three/ remotely if missing, and
    # uploads to /var/www/tuflowdocs/one/two/three/four

.EXAMPLE
    .\tuflowdocs-upload.ps1 catch-manual\docs catch/manual
    # Uploads the local folder catch-manual\docs, landing it remotely at
    # /var/www/tuflowdocs/catch/manual (renamed from 'docs' to 'manual').
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateScript({
        if (-not (Test-Path -LiteralPath $_ -PathType Container)) {
            throw "Path '$_' does not exist or is not a folder."
        }
        $true
    })]
    [string]$Path,

    [Parameter(Position = 1)]
    [string]$RemotePath,

    [Parameter()]
    [string]$Server = 'bmt-az-tuflowdocs',

    [Parameter()]
    [string]$RemoteBase = '/var/www/tuflowdocs',

    [Parameter()]
    [int]$TimeoutSec = 30
)

# Runs an external command with a hard timeout and closed stdin. Kills
# the process and throws if it doesn't finish in time, instead of
# hanging forever. See .DESCRIPTION above for why stdin is closed.
function Invoke-WithTimeout {
    param(
        [Parameter(Mandatory)] [string]$FilePath,
        [Parameter(Mandatory)] [string[]]$ArgumentList,
        [int]$TimeoutSec = 30
    )
    $psi = [System.Diagnostics.ProcessStartInfo]::new($FilePath)
    foreach ($a in $ArgumentList) { $psi.ArgumentList.Add($a) }
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true

    $proc = [System.Diagnostics.Process]::Start($psi)
    $proc.StandardInput.Close()
    if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
        Write-Host "Timed out after ${TimeoutSec}s - killing process $($proc.Id)." -ForegroundColor Red
        try { $proc.Kill($true) } catch { }
        throw "Command timed out after ${TimeoutSec}s: $displayCmd"
    }
    return $proc.ExitCode
}

# Resolve the remote relative path
if (-not $RemotePath) {
    if ([System.IO.Path]::IsPathRooted($Path)) {
        throw "Path is absolute; specify -RemotePath explicitly (e.g. 'classic-hpc/manual')."
    }
    $RemotePath = $Path
}

$RemotePath = $RemotePath.Trim('\', '/') -replace '\\', '/'
$segments = @($RemotePath -split '/' | Where-Object { $_ -ne '' })
if ($segments.Count -eq 0) {
    throw "RemotePath resolved to nothing usable."
}

$parentSegments = if ($segments.Count -gt 1) { $segments[0..($segments.Count - 2)] } else { @() }

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$remoteTarget = "$RemoteBase/$RemotePath"
$remoteParent = if ($parentSegments.Count -gt 0) { "$RemoteBase/$($parentSegments -join '/')" } else { $RemoteBase }

Write-Host "Local:  $resolvedPath" -ForegroundColor DarkGray
Write-Host "Remote: $remoteTarget" -ForegroundColor DarkGray

# Build chmod-per-segment list so any newly created intermediate folder
# gets 2775 too, not just the final leaf. Failures (e.g. a pre-existing
# folder owned by someone else) are swallowed - chmod requires
# ownership, and we don't want that to abort the upload.
$cumulative = $RemoteBase
$chmodLines = foreach ($seg in $parentSegments) {
    $cumulative = "$cumulative/$seg"
    "chmod 2775 '$cumulative' 2>/dev/null || true"
}

$prepCommand = "mkdir -p '$remoteParent' && rm -rf '$remoteTarget'"
if ($chmodLines.Count -gt 0) {
    $prepCommand += " ; " + ($chmodLines -join ' ; ')
}

$sshBaseArgs = @('-n', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10')
$scpBaseArgs = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10')

Write-Host "Ensuring remote parent exists: $remoteParent ..." -ForegroundColor Cyan
$exit = Invoke-WithTimeout -FilePath 'ssh' -ArgumentList ($sshBaseArgs + @($Server, $prepCommand)) -TimeoutSec $TimeoutSec
if ($exit -ne 0) {
    throw "ssh mkdir -p failed with exit code $exit. Aborting before upload."
}

Write-Host "Uploading '$resolvedPath' to ${Server}:${remoteParent} ..." -ForegroundColor Cyan
$exit = Invoke-WithTimeout -FilePath 'scp' -ArgumentList ($scpBaseArgs + @('-r', $resolvedPath, "${Server}:${remoteParent}")) -TimeoutSec $TimeoutSec
if ($exit -ne 0) {
    throw "scp failed with exit code $exit. Aborting before permission fix."
}

# scp names the new remote folder after the local leaf name - it has no
# rename-on-upload option. If the intended remote leaf (the last segment
# of RemotePath) differs from the local leaf, the upload lands under the
# wrong name and must be moved into place.
$localLeaf = Split-Path $resolvedPath -Leaf
$remoteLeaf = $segments[-1]
$uploadedAs = "$remoteParent/$localLeaf"
if ($localLeaf -ne $remoteLeaf -and $uploadedAs -ne $remoteTarget) {
    Write-Host "Renaming '$localLeaf' to '$remoteLeaf' on remote ..." -ForegroundColor Cyan
    # remoteTarget was already removed during the prep step, but rm -rf
    # here too in case anything raced or landed there in between.
    $renameCmd = "rm -rf '$remoteTarget' 2>/dev/null; mv '$uploadedAs' '$remoteTarget'"
    $exit = Invoke-WithTimeout -FilePath 'ssh' -ArgumentList ($sshBaseArgs + @($Server, $renameCmd)) -TimeoutSec $TimeoutSec
    if ($exit -ne 0) {
        throw "ssh rename failed with exit code $exit. Content may be sitting at $uploadedAs instead of $remoteTarget - check manually."
    }
}

Write-Host "Fixing permissions on $remoteTarget ..." -ForegroundColor Cyan
$fixCommand = "find '$remoteTarget' -type d -exec chmod 2775 {} +; " +
              "find '$remoteTarget' -type f -exec chmod 664 {} +"
$exit = Invoke-WithTimeout -FilePath 'ssh' -ArgumentList ($sshBaseArgs + @($Server, $fixCommand)) -TimeoutSec $TimeoutSec
if ($exit -ne 0) {
    throw "ssh permission fix failed with exit code $exit. Content is uploaded but permissions may be wrong - check manually with: getfacl $remoteTarget"
}

Write-Host "Done: $remoteTarget" -ForegroundColor Green