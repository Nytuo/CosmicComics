$installoc = Get-Location


function CheckUpdate {
    param ()
    Write-Host "Checking for updates..." -ForegroundColor White    
    Write-Host "Downloading information..." -ForegroundColor White
    curl.exe -s https://raw.githubusercontent.com/Nytuo/CosmicComics/master/package.json --output "$installoc/lastPackage.json"
    $jsonFile = Get-Content "$installoc/CosmicComics/package.json"
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
    <# Move-Item -Path $installoc/CosmicComics/public -Destination $installoc/CCPublic.old #>
    <# Remove-Item -Path $installoc/CosmicComics/ -Recurse -Force #>
    cd $installoc/CosmicComics
    cmd.exe /c ""$installoc/Git/bin/git.exe"" pull
    <# Move-Item -Path $installoc/CCPublic.old -Destination $installoc/CosmicComics/public -Force #>
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
    $beta = Read-Host -Prompt "INPUT : Would you join the Beta ? (Stuff may break) [y/n]"
    $branch = "main"
    if ($beta -eq "y"){
    $branch = "develop"
    }

    cmd.exe /c ""$installoc/Git/bin/git.exe"" clone https://github.com/Nytuo/CosmicComics
    cd CosmicComics
    cmd.exe /c ""$installoc/Git/bin/git.exe"" checkout $branch
    cd ..
    if (Test-Path -Path $installoc/node) {
        Write-Host "INFO : Node already installed." -ForegroundColor Blue
    }
    else {
    if (Command-Test node){
        Write-Host "INFO : Node already installed." -ForegroundColor Blue

     }else{
     Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
        DLNode
     }

    }
    CleanUp
    $env:Path += ";$installoc/node/node-v16.14.2-win-x64"

    cd $installoc\CosmicComics
    Write-Host "INFO : Installing dependencies..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm install --production"
    }
    else {

        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm install --production"
    }
    cmd.exe /c $nodeins
}
function DLNode {
    param ()
    Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

        curl.exe https://nodejs.org/dist/v16.14.2/node-v16.14.2-win-x64.zip --output node.zip
        Expand-Archive -Path node.zip -DestinationPath node

    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits") {

        curl.exe https://nodejs.org/dist/v16.14.2/node-v16.14.2-win-x86.zip --output node.zip
        Expand-Archive -Path node.zip -DestinationPath node

    }
    else {
        Write-Host "ERROR : Could not determine architecture." -ForegroundColor Red
    }
}
function Command-Test{
Param($command)
$oldErr = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
try{
if (Get-Command $command){RETURN $true}
}Catch{RETURN $false}
Finally{$ErrorActionPreference=$oldErr}
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
    if (Test-Path -Path $installoc/git.7z.exe) {
        Remove-Item -Path $installoc/git.7z.exe -Recurse -Force
    }
}

function Uninstall {
    param ()
    CleanUp
    Write-Host -ForegroundColor Blue "INFO : Uninstalling..."
    Remove-Item -Path $installoc/CosmicComics -Recurse -Force
    Remove-Item -Path $installoc/node -Recurse -Force
    Remove-Item -Path $installoc/Git -Recurse -Force

    Write-Host -ForegroundColor Blue "INFO : Uninstallation complete."
    <#     rm $PSCommandPath
 #>
}
function LaunchServer {
    param ()
    cd $installoc/CosmicComics
    Write-Host "INFO : Launching server..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

        $nodepm = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm run serv"
    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits") {
        $nodepm = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm run serv"

    }
    start http://localhost:4696
    cmd.exe /c $nodepm

}
function GetGit {
    param()
    Write-Host -ForegroundColor Blue "INFO : A progress dialog will pop, DO NOT CLOSE IT."

    curl.exe -L https://github.com/git-for-windows/git/releases/download/v2.36.1.windows.1/PortableGit-2.36.1-64-bit.7z.exe --output git.7z.exe


    cmd.exe /c start /wait git.7z.exe -o $installoc/Git -y

}
if (Test-Path -Path $installoc/Git){
    Write-Host -ForegroundColor Blue "INFO : Git already downloaded."

}else{
if (Command-Test git){
    Write-Host -ForegroundColor Blue "INFO : Git already installed."

}else{
    Write-Host -ForegroundColor Blue "INFO : Git not found. Will be downloaded and installed"

GetGit
}

}

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
    if ((Test-Path -Path "$installoc/CosmicComics") -eq "True" -and (Test-Path -Path $installoc/node) -eq "True") {
        CheckUpdate
        cd $installoc\CosmicComics
    }
    else {
        FirstInstall
    }
    
    LaunchServer
}

