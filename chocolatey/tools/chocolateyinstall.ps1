$ErrorActionPreference = 'Stop' # stop on all errors
$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url        = 'https://download.nytuo.fr/CosmicComics/v2.1.1/Cosmic-Comics_2.1.1_win.exe' # download url, HTTPS preferred

$packageArgs = @{
  packageName   = $env:ChocolateyPackageName
  unzipLocation = $toolsDir
  fileType      = 'EXE' #only one of these: exe, msi, msu
  url           = $url
  softwareName  = 'cosmic-comics*' #part or all of the Display Name as you see it in Programs and Features. It should be enough to be unique
  checksum      = 'd625550d7d584657caaa6ea3b0808948d9a9cac7cbc064c2758b740e0a96e57f7d401c93de30cef2d2707fd08e10f225bf14b87430c949f9cc9b28228894b001'
  checksumType  = 'sha512' #default is md5, can also be sha1, sha256 or sha512
  silentArgs   = '/S'           # NSIS
  validExitCodes= @(0,1,2) #please insert other valid exit codes here
}

Install-ChocolateyPackage @packageArgs # https://docs.chocolatey.org/en-us/create/functions/install-chocolateypackage
#Install-ChocolateyZipPackage @packageArgs # https://docs.chocolatey.org/en-us/create/functions/install-chocolateyzippackage
## If you are making your own internal packages (organizations), you can embed the installer or
## put on internal file share and use the following instead (you'll need to add $file to the above)
#Install-ChocolateyInstallPackage @packageArgs # https://docs.chocolatey.org/en-us/create/functions/install-chocolateyinstallpackage
