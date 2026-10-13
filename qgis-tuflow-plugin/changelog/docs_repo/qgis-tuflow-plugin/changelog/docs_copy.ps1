# PowerShell script: upload the local `docs` to replace a remote `docs_target`
# Usage: ./docs_copy.ps1 "a commit message" "<config file>"
# 
# Note: before running, check that $docs_target has the name of the actual 
# documentation folder inside the remote repo that you want to replace. No backsies!

# setup

# ensure a commit message and config file were passed or provided
param (
    [string]$commit_message,
    [string]$config_file
)

if (-not $config_file) {
    $config_file = "$env:COMPUTERNAME.cfg.json"
    if (-not (Test-Path -Path $config_file)) {
        $default_config = @{
            docs_target = "<product>/<document>/<version>"
            docs_source = "./docs"
            repo_url = "git@github.com:TUFLOW/tuflow.github.io.git"
            branch = "main"
            repo_folder = "./docs_repo"
        }
        $default_config | ConvertTo-Json | Set-Content -Path $config_file
        Write-Host "Configuration file created at $config_file.`nPlease edit it and pass it as an argument with ``--config_file`` when running the script."
        exit 1
    }
}

$config = Get-Content -Path $config_file | ConvertFrom-Json

$gitignorePath = ".\.gitignore"
if (Test-Path $gitignorePath) {
    # Read the .gitignore file and check if it contains the line
    $gitignoreContent = Get-Content $gitignorePath
    if (-not $gitignoreContent -contains "*.cfg.json") {
        Write-Output "The local .gitignore file does not contain '*.cfg.json'."
        exit 1
    }
} else {
    Write-Output "No .gitignore file in the current folder. Create one and add ``*.cfg.json`` to it."
    exit 1
}

if (-not $commit_message) {
    $commit_message = Read-Host "A commit message is required by Git"
}

# validate config values
$required_fields = @("docs_target", "docs_source", "repo_url", "branch", "repo_folder")
foreach ($field in $required_fields) {
    if (-not $config.$field) {
        Write-Host "The configuration requires ``$field``. Please check your configuration file."
        exit 1
    }
}
$docs_target = $config.docs_target
$docs_source = $config.docs_source
$repo_url = $config.repo_url
$branch = $config.branch
$repo_folder = $config.repo_folder

# check that there is a built docs
if (Test-Path -Path $docs_source -PathType Container) {
    $docs_contents = Get-ChildItem -Path $docs_source
    if ($docs_contents.Count -eq 0) {
        Write-Host "The ``docs_source`` (""$docs_source"") is empty."
        exit 1
    }
} else {
    Write-Host "The ``docs_source`` (""$docs_source"") does not exist."
    exit 1
}

# start

Write-Host "Checking for repo folder (``$repo_folder``)..."
if (Test-Path -Path $repo_folder -PathType Container) {
    Write-Host "Found existing repo folder, wiping it..."
    Remove-Item -Path $repo_folder -Force -Recurse
} else {
    Write-Host "Repo folder not found, continuing..."
}

Write-Host "(re)creating the repo folder..."
New-Item -Path $repo_folder -ItemType Directory -Force

Write-Host "Changing directory into the new repo folder..."
Set-Location -Path $repo_folder

Write-Host "Initialising repository..."
& git init --initial-branch=$branch

Write-Host "Adding remote repository..."
& git remote add origin $repo_url

Write-Host "Enabling sparse-checkout..."
& git sparse-checkout init --cone

Write-Host "Specifying to only update ``$docs_target``..."
& git sparse-checkout set $docs_target

Write-Host "Fetching latest commits from ``$branch`` branch..."
& git fetch --depth=1 origin $branch --filter=blob:none

Write-Host "Checkout ``$branch`` branch..."
& git checkout $branch

Write-Host "Ensuring ``$docs_target`` folder exists..."
if (-not (Test-Path -Path $docs_target -PathType Container)) {
    Write-Host "Creating ``$docs_target`` folder..."
    New-Item -Path $docs_target -ItemType Directory
} else {
    Write-Host "Found existing ``$docs_target`` folder..."
}

Write-Host "Updating ``$docs_target`` in ``$repo_folder`` to match ``$docs_source``..."
Remove-Item -Path $docs_target -Recurse
# using robocopy to avoid machine-specific issues with Copy-Item - perhaps revert to a safe Copy-Item solution later
robocopy "..\$docs_source" $docs_target /E

Write-Host "Adding, Commiting, and Pushing..."
& git add $docs_target
& git commit -m "$commit_message"
& git push origin $branch

# complete

Write-Host "Consider removing ``$repo_folder`` after inspection. Add it to your .gitignore if you plan to keep it."
Set-Location -Path ..
Write-Host "Done."