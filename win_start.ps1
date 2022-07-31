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
    Move-Item -Path $installoc/CosmicComics/CosmicData -Destination $installoc/CCData.old
    Remove-Item -Path $installoc/CosmicComics/ -Recurse -Force
    DLCC
    Move-Item -Path $installoc/CCData.old -Destination $installoc/CosmicComics/CosmicData -Force
    Write-Host "Update complete." -ForegroundColor White
    CleanUp
}
function FirstInstall {
    param ()
    Write-Host -ForegroundColor Blue "INFO : Performing first installation..."
    if (Test-Path -Path $installoc/7z.exe) {
        Write-Host "INFO : 7z already downloaded." -ForegroundColor Blue
    }
    else {
        Write-Host "INFO : Downloading 7z..." -ForegroundColor Blue
DL7za
    }

    if (Test-Path -Path $installoc/node) {
        Write-Host "INFO : Node already installed." -ForegroundColor Blue
    }
    else {
        Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
        DLNode
    }
        Write-Host "INFO : Downloading CosmicComics..." -ForegroundColor Blue
    DLCC
    CleanUp
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
function DLCC{
        curl.exe -L https://github.com/Nytuo/CosmicComics/releases/latest/download/CosmicComics-win64.7z --output CosmicComics.7z
        <#curl.exe -L https://github.com/Nytuo/CosmicComics/releases/download/v2.0.0/CosmicComics-win64.7z --output CosmicComics.7z#>
        cmd.exe /C ""$installoc/7z.exe"" x CosmicComics.7z -o* -y
}
function DL7za{
        curl.exe https://www.7-zip.org/a/7zr.exe --output 7z.exe
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
      if (Test-Path -Path $installoc/CosmicComics.7z) {
        Remove-Item -Path $installoc/CosmicComics.7z -Recurse -Force
    }
}

function Uninstall {
    param ()
    CleanUp
    Write-Host -ForegroundColor Blue "INFO : Uninstalling..."
    Remove-Item -Path $installoc/CosmicComics -Recurse -Force
    Remove-Item -Path $installoc/node -Recurse -Force
    Write-Host -ForegroundColor Blue "INFO : Uninstallation complete."
    <#     rm $PSCommandPath
 #>    
}
function LaunchServer {
    param ()
    cd $installoc/CosmicComics
    Write-Host "INFO : Launching server..." -ForegroundColor Blue
    start http://localhost:4696
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits") {

    cmd.exe /c ""$installoc/node/node-v16.14.2-win-x64/npm"" run serv
    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits") {
    cmd.exe /c ""$installoc/node/node-v16.14.2-win-x86/npm"" run serv

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

