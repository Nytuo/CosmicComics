$ErrorActionPreference = 'Stop' # stop on all errors
$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url        = 'https://download.nytuo.fr/CosmicComics/v2.1.0/Cosmic-Comics_2.1.0_win.exe' # download url, HTTPS preferred

$packageArgs = @{
  packageName   = $env:ChocolateyPackageName
  unzipLocation = $toolsDir
  fileType      = 'EXE' #only one of these: exe, msi, msu
  url           = $url
  softwareName  = 'cosmic-comics*' #part or all of the Display Name as you see it in Programs and Features. It should be enough to be unique
  checksum      = '405618bc8c68b409202f84f75b7658786c2b5b1b3910006a79bebbe5b319cc0ca6384eb7ae6c1229e34ca0f3703a14a655b0b9312da6da598fbc5d25bb918792'
  checksumType  = 'sha512' #default is md5, can also be sha1, sha256 or sha512
  silentArgs   = '/S'           # NSIS
  validExitCodes= @(0,1,2) #please insert other valid exit codes here
}

Install-ChocolateyPackage @packageArgs # https://docs.chocolatey.org/en-us/create/functions/install-chocolateypackage
#Install-ChocolateyZipPackage @packageArgs # https://docs.chocolatey.org/en-us/create/functions/install-chocolateyzippackage
## If you are making your own internal packages (organizations), you can embed the installer or
## put on internal file share and use the following instead (you'll need to add $file to the above)
#Install-ChocolateyInstallPackage @packageArgs # https://docs.chocolatey.org/en-us/create/functions/install-chocolateyinstallpackage
