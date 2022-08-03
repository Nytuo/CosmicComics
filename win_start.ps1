$installoc = Get-Location


function CheckUpdate
{
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
    if ($versionPrefix -lt $lastVersion)
    {
        Write-Host -ForegroundColor Red "INFO : Update available!"
        Update
    }
    elseif ($versionPrefix -ge $lastVersion)
    {
        Write-Host -ForegroundColor Green "INFO : No updates available."
    }
    else
    {
        Write-Host -ForegroundColor Yellow "WARNING : Could not check for updates."
    }
    CleanUp
}
function Update
{
    param ()
    Write-Host "Downloading update..." -ForegroundColor White
    <# Move-Item -Path $installoc/CosmicComics/public -Destination $installoc/CCPublic.old #>
    <# Remove-Item -Path $installoc/CosmicComics/ -Recurse -Force #>
    cd $installoc/CosmicComics
    cmd.exe /c ""$installoc/Git/bin/git.exe"" pull
    <# Move-Item -Path $installoc/CCPublic.old -Destination $installoc/CosmicComics/public -Force #>
    Write-Host "Update complete." -ForegroundColor White
    Write-Host "Installing dependencies..." -ForegroundColor White
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits")
    {
        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm install --production"
    }
    else
    {
        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm install --production"
    }
    <# Start process cmd #>
    cmd.exe /c $nodeins
}
function FirstInstall
{
    param ()
    setNodePath
    Write-Host -ForegroundColor Blue "INFO : Performing first installation..."
    $beta = Read-Host -Prompt "INPUT : Would you join the Beta ? (Stuff may break) [y/n]"
    $branch = "main"
    if ($beta -eq "y")
    {
        $branch = "develop"
    }
    $portable = Read-Host -Prompt "INPUT : Would you like to install CosmicComics in portable mode (Data's folder will be alongside of the installer or in the AppData folder of the user) ? [y/n]"
    cmd.exe /c ""$installoc/Git/bin/git.exe"" clone https://github.com/Nytuo/CosmicComics
    cd CosmicComics
    cmd.exe /c ""$installoc/Git/bin/git.exe"" checkout $branch
    if ($portable -eq "y")
    {
        Out-File -Path $installoc/CosmicComics/portable.txt -Force -Encoding UTF8 -Contents "portable"
    }
    cd ..
    if (Test-Path -Path $installoc/node)
    {
        Write-Host "INFO : Node already installed." -ForegroundColor Blue
    }
    else
    {
        if (Command-Test node)
        {
            Write-Host "INFO : Node already installed." -ForegroundColor Blue

        }
        else
        {
            Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
            DLNode
        }

    }
    CleanUp

    cd $installoc\CosmicComics
    Write-Host "INFO : Installing dependencies..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits")
    {
        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm install --production"
    }
    else
    {
        $nodeins = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm install --production"
    }
    cmd.exe /c $nodeins
}
function DLNode
{
    param ()
    Write-Host "INFO : Downloading Node..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits")
    {

        curl.exe https://nodejs.org/dist/v16.14.2/node-v16.14.2-win-x64.zip --output node.zip
        Expand-Archive -Path node.zip -DestinationPath node

    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits")
    {

        curl.exe https://nodejs.org/dist/v16.14.2/node-v16.14.2-win-x86.zip --output node.zip
        Expand-Archive -Path node.zip -DestinationPath node

    }
    else
    {
        Write-Host "ERROR : Could not determine architecture." -ForegroundColor Red
    }
}
function Command-Test
{
    Param($command)
    $oldErr = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try
    {
        if (Get-Command $command)
        {
            RETURN $true
        }
    }
    Catch
    {
        RETURN $false
    }
    Finally
    {
        $ErrorActionPreference = $oldErr
    }
}
function CleanUp
{
    param ()
    Write-Host -ForegroundColor Blue "INFO : Cleaning up..."
    <# Check if the file exist before deleting it #>
    if (Test-Path -Path $installoc/node.zip)
    {
        Remove-Item -Path $installoc/node.zip -Recurse -Force
    }
    if (Test-Path -Path $installoc/lastPackage.json)
    {
        Remove-Item -Path $installoc/lastPackage.json -Recurse -Force
    }
    if (Test-Path -Path $installoc/git.7z.exe)
    {
        Remove-Item -Path $installoc/git.7z.exe -Recurse -Force
    }
}

function Uninstall
{
    param ()
    CleanUp
    Write-Host -ForegroundColor Blue "INFO : Uninstalling..."
    Remove-Item -Path $installoc/CosmicComics -Recurse -Force
    Remove-Item -Path $installoc/node -Recurse -Force
    Remove-Item -Path $installoc/Git -Recurse -Force

    Write-Host -ForegroundColor Blue "INFO : Uninstallation complete."
    <#     rm $PSCommandPath #>
}
function setNodePath
{
    param ()
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits")
    {
        $env:Path += ";$installoc/node/node-v16.14.2-win-x64"
    }
    else
    {
        $env:Path += ";$installoc/node/node-v16.14.2-win-x86"
    }
}
function LaunchServer
{
    param ()
    $port = 4696

    cd $installoc/CosmicComics
    if ((Test-Path -Path '$installoc/CosmicComics/portable.txt') -and (Test-Path -Path '$installoc/CosmicData/serverconfig.json'))
    {
        $jsonFile = Get-Content "$installoc/CosmicData/serverconfig.json"
        $jsonObj = $jsonFile | ConvertFrom-Json
        $port = $jsonObj.port
    }
    else
    {
        $loc = $env:APPDATA + '/CosmicComics/CosmicData/serverconfig.json'
        if (Test-Path -Path $loc)
        {
            $jsonFile = Get-Content $loc
            $jsonObj = $jsonFile | ConvertFrom-Json
            $port = $jsonObj.port
        }
    }


    Write-Host "INFO : Launching server..." -ForegroundColor Blue
    if (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "64 bits")
    {

        $nodepm = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x64/npm run serv"
    }
    elseif (((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32-bit" -or ((Get-CimInstance Win32_operatingsystem).OSArchitecture) -eq "32 bits")
    {
        $nodepm = Join-Path -Path $installoc -ChildPath "/node/node-v16.14.2-win-x86/npm run serv"

    }
    start http://localhost:$port
    cmd.exe /c $nodepm

}
function GetGit
{
    param()
    Write-Host -ForegroundColor Blue "INFO : A progress dialog will pop, DO NOT CLOSE IT."

    curl.exe -L https://github.com/git-for-windows/git/releases/download/v2.36.1.windows.1/PortableGit-2.36.1-64-bit.7z.exe --output git.7z.exe


    cmd.exe /c start /wait git.7z.exe -o $installoc/Git -y

}
if (Test-Path -Path $installoc/Git)
{
    Write-Host -ForegroundColor Blue "INFO : Git already downloaded."

}
else
{
    if (Command-Test git)
    {
        Write-Host -ForegroundColor Blue "INFO : Git already installed."

    }
    else
    {
        Write-Host -ForegroundColor Blue "INFO : Git not found. Will be downloaded and installed"

        GetGit
    }

}

if ($( $args[0] ) -eq "ForceUpdate")
{
    setNodePath
    Update
}
elseif ($( $args[0] ) -eq "IgnoreUpdate")
{
    setNodePath
    LaunchServer
}
elseif ($( $args[0] ) -eq "FirstInstall")
{
    FirstInstall
}
elseif ($( $args[0] ) -eq "Uninstall")
{
    Uninstall
}
else
{
    Write-Host -ForegroundColor Blue "INFO : No arguments given."
    if ((Test-Path -Path "$installoc/CosmicComics") -eq "True" -and (Test-Path -Path $installoc/node) -eq "True")
    {
        setNodePath
        CheckUpdate
        cd $installoc\CosmicComics
    }
    else
    {
        FirstInstall
    }

    LaunchServer
}

