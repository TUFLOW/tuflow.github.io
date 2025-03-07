# PowerShell script: upload the local `_site` to replace a remote `_site_target`
# Usage: ./docs_copy.ps1 "a commit message"
# 
# Note: before running, check that $docs_target has the name of the actual 
# documentation folder inside the remote repo that you want to replace. No backsies!

# setup

# ensure a commit message was passed or provided
param (
    [string]$commit_message
)
if (-not $commit_message) {
    $commit_message = Read-Host "A commit message is required by Git"
}

$docs_target = "catch/changelog"

$repo_url = "git@github.com:TUFLOW/tuflow.github.io.git"
$branch = "main"
$repo_folder = "./_site_repo"

# check that there is a built _site
if (Test-Path -Path "./_site" -PathType Container) {
    $docs_contents = Get-ChildItem -Path "./_site"
    if ($docs_contents.Count -eq 0) {
		Write-Host "The `_site` folder is empty."
		exit 1
    }
} else {
    Write-Host "A `_site` folder does not exist."
	exit 1
}

# start

Write-Host "Checking that repo folder does not exist, wiping otherwise..."
if (Test-Path -Path $repo_folder -PathType Container) {
    # .git folder exists, delete it
    Remove-Item -Path $repo_folder -Force -Recurse
}

Write-Host "(re)creating the repo folder..."
New-Item -Path $repo_folder -ItemType Directory -Force

Write-Host "Changing directory into the new repo folder..."
Set-Location -Path $repo_folder

Write-Host "Initialising repository..."
& git init

Write-Host "Adding remote repository..."
& git remote add origin $repo_url

Write-Host "Fetching latest commits from `"$branch`" branch..."
& git fetch --depth=1 origin $branch

Write-Host "Enabling sparse-checkout..."
& git sparse-checkout init --cone

Write-Host "Specifying to only update `"$docs_target`"..."
& git sparse-checkout set $docs_target

Write-Host "Checkout `"$branch`" branch..."
& git checkout $branch

Write-Host "Ensuring `"$docs_target`" folder exists..."
if (-not (Test-Path -Path $docs_target -PathType Container)) {
    # Folder doesn't exist, create it
    New-Item -Path $docs_target -ItemType Directory
}

Write-Host "Copying contents from _site to `"$docs_target`" in `"$repo_folder`"..."
Copy-Item -Path "../_site/*" -Destination $docs_target -Recurse

Write-Host "Adding, Commiting, and Pushing..."
& git add $docs_target
& git commit -m "$commit_message"
& git push origin $branch

# complete

Write-Host "Consider removing `"$repo_folder`" after inspection."
Set-Location -Path ..
Write-Host "Done."
