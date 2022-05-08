$installoc = Get-Location


function CheckUpdate {
    param ()
    Write-Host "Checking for updates..." -ForegroundColor White    
    Write-Host "Downloading information..." -ForegroundColor White
    curl.exe -s https://raw.githubusercontent.com/Nytuo/CosmicComicsServer/main/package.json --output "$installoc/lastPackage.json"
    $jsonFile = Get-Content "$installoc/CosmicComicsServer/package.json"
    $jsonObj = $jsonFile | ConvertFrom-Json
    $versionPrefix = $jsonObj.version
    Write-Host "Current version : $versionPrefix" -ForegroundColor White
    $jsonFile = Get-Content "$installoc/lastPackage.json"
    $jsonObj = $jsonFile | ConvertFrom-Json
    $lastVersion = $jsonObj.version
    Write-Host "Last version : $lastVersion" -ForegroundColor White
    if ($versionPrefix -lt $lastVersion) {
        Write-Host -ForegroundColor Red "INFO : Update available!"
        Update
    }
    elseif ($versionPrefix -ge $lastVersion) {
        Write-Host -ForegroundColor Green "INFO : No updates available."
    }
    else {
        Write-Host -ForegroundColor Yellow "WARNING : Could not check for updates."
    }
    CleanUp
}
function Update {
    param ()
    Write-Host "Downloading update..." -ForegroundColor White
    <# Move-Item -Path $installoc/CosmicComicsServer/public -Destination $installoc/CCPublic.old #>
    <# Remove-Item -Path $installoc/CosmicComicsServer/ -Recurse -Force #>
    cd $installoc/CosmicComicsServer
    git pull
    <# Move-Item -Path $installoc/CCPublic.old -Destination $installoc/CosmicComicsServer/public -Force #>
    Write-Host "Update complete." -ForegroundColor White
    Write-Host "Installing dependencies..." -ForegroundColor White
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm install"
    }
    else {

        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm install"
    }
    <# Start process cmd #>
    cmd.exe /c $nodeins
}
function FirstInstall {
    param ()
    Write-Host -ForegroundColor Blue "INFO : Performing first installation..."
    git clone https://github.com/Nytuo/CosmicComicsServer
    if (Test-Path -Path $installoc/node) {
        Write-Host "INFO : Node already installed." -ForegroundColor Blue
    }
    else {
        Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
        DLNode
    }
    CleanUp
    cd $installoc\CosmicComicsServer
    Write-Host "INFO : Installing dependencies..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm install"
    }
    else {

        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm install"
    }
    cmd.exe /c $nodeins
}
function DLNode {
    param ()
    Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {
        
        curl.exe https://nodejs.org/dist/v16.14.2/node-v16.14.2-win-x64.zip --output node.zip
        Expand-Archive -Path node.zip -DestinationPath node -Verbose
    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits") {
        
        curl.exe https://nodejs.org/dist/v16.14.2/node-v16.14.2-win-x86.zip --output node.zip
        Expand-Archive -Path node.zip -DestinationPath node -Verbose
    }
    else {
        Write-Host "ERROR : Could not determine architecture." -ForegroundColor Red
    }
}
function CleanUp {
    param ()
    Write-Host -ForegroundColor Blue "INFO : Cleaning up..."
    <# Check if the file exist before deleting it #>
    if (Test-Path -Path $installoc/node.zip) {
        Remove-Item -Path $installoc/node.zip -Recurse -Force
    }
    if (Test-Path -Path $installoc/lastPackage.json) {
        Remove-Item -Path $installoc/lastPackage.json -Recurse -Force
    }
}

function Uninstall {
    param ()
    CleanUp
    Write-Host -ForegroundColor Blue "INFO : Uninstalling..."
    Remove-Item -Path $installoc/CosmicComicsServer -Recurse -Force
    Remove-Item -Path $installoc/node -Recurse -Force
    Write-Host -ForegroundColor Blue "INFO : Uninstallation complete."
    <#     rm $PSCommandPath
 #>    
}
function LaunchServer {
    param ()
    cd $installoc/CosmicComicsServer
    Write-Host "INFO : Launching server..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

        $nodepm = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm run serv"
    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits") {
        $nodepm = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm run serv"

    }
    start http://localhost:8000
    cmd.exe /c $nodepm
    
}
function GetGit {
    param()
    <#$gitExePath = "C:\Program Files\Git\bin\git.exe"
    foreach ($asset in (Invoke-RestMethod https://api.github.com/repos/git-for-windows/git/releases/latest).assets)
        {
            if ($asset.name -match 'Git-\d*\.\d*\.\d*.\d*-64-bit\.exe')
            {
                $dlurl = $asset.browser_download_url
                $newver = $asset.name
            }
        }
    
        try
        {
            $ProgressPreference = 'SilentlyContinue'
    
            if (!(Test-Path $gitExePath))
            {
                Write-Host "`nDownloading latest stable git..." -ForegroundColor Yellow
                Remove-Item -Force $env:TEMP\git-stable.exe -ErrorAction SilentlyContinue
                Invoke-WebRequest -Uri $dlurl -OutFile $env:TEMP\git-stable.exe
    
                Write-Host "`nInstalling git..." -ForegroundColor Yellow
                Start-Process -Wait $env:TEMP\git-stable.exe -ArgumentList /silent
            }
            else
            {
                $updateneeded = $false
                Write-Host "`ngit is already installed. Check if possible update..." -ForegroundColor Yellow
                (git version) -match "(\d*\.\d*\.\d*)" | Out-Null
                $installedversion = $matches[0].split('.')
                $newver -match "(\d*\.\d*\.\d*)" | Out-Null
                $newversion = $matches[0].split('.')
    
                if (($newversion[0] -gt $installedversion[0]) -or ($newversion[0] -eq $installedversion[0] -and $newversion[1] -gt $installedversion[1]) -or ($newversion[0] -eq $installedversion[0] -and $newversion[1] -eq $installedversion[1] -and $newversion[2] -gt $installedversion[2]))
                {
                    $updateneeded = $true
                }
    
                if ($updateneeded)
                {
    
                    Write-Host "`nUpdate available. Downloading latest stable git..." -ForegroundColor Yellow
                    Remove-Item -Force $env:TEMP\git-stable.exe -ErrorAction SilentlyContinue
                    Invoke-WebRequest -Uri $dlurl -OutFile $env:TEMP\git-stable.exe
    
                    Write-Host "`nInstalling update..." -ForegroundColor Yellow
                    $sshagentrunning = get-process ssh-agent -ErrorAction SilentlyContinue
                    if ($sshagentrunning)
                    {
                        Write-Host "`nKilling ssh-agent..." -ForegroundColor Yellow
                        Stop-Process $sshagentrunning.Id
                    }
    
                    Start-Process -Wait $env:TEMP\git-stable.exe -ArgumentList /silent
                }
                else
                {
                    Write-Host "`nNo update available. Already running latest version..." -ForegroundColor Yellow
                }
    
            }
            Write-Host "`nInstallation complete!`n`n" -ForegroundColor Green
        }
        finally
        {
            $ProgressPreference = 'Continue'
        }#>
    $env:Path += ";C:\Program Files\Git\bin"
    
}
GetGit
if ($($args[0]) -eq "ForceUpdate") {
    Update
}
elseif ($($args[0]) -eq "IgnoreUpdate") {
    LaunchServer
}
elseif ($($args[0]) -eq "FirstInstall") {
    FirstInstall
}
elseif ($($args[0]) -eq "Uninstall") {
    Uninstall
}
else {
    Write-Host -ForegroundColor Blue "INFO : No arguments given."
    Write-Host -ForegroundColor Blue "INFO : Normal Script Startup"
    if ((Test-Path -Path "$installoc/CosmicComicsServer") -eq "True" -and (Test-Path -Path $installoc/node) -eq "True") {
        CheckUpdate
        cd $installoc\CosmicComicsServer
    }
    else {
        FirstInstall
    }
    
    LaunchServer
}

