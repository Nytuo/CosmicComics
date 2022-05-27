#!/bin/bash
installoc=$PWD
declare -A osInfo;
osInfo[/etc/redhat-release]=yum
osInfo[/etc/arch-release]=pacman
osInfo[/etc/gentoo-release]=emerge
osInfo[/etc/SuSE-release]=zypp
osInfo[/etc/debian_version]=apt-get
osInfo[/etc/alpine-release]=apk

for f in ${!osInfo[@]}
do
    if [[ -f $f ]];then
packagesManager=${osInfo[$f]}
    fi
done


vercomp () {
    if [[ $1 == $2 ]]
    then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
    do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++))
    do
        if [[ -z ${ver2[i]} ]]
        then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]}))
        then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]}))
        then
            return 2
        fi
    done
    return 0
}
function LaunchServer (){
    cd $installoc/CosmicComics
    echo "INFO : Launching the server..."
    npm run serv


}

function FirstInstall (){
    git clone https://github.com/Nytuo/CosmicComics
     cd $installoc/CosmicComics
    git checkout develop
      npm install


}
function CleanUp(){
    echo "Cleaning Up ..."
    if [ -f $installoc/lastPackage.json ]
    then
    rm $installoc/lastPackage.json
    fi
}
function Uninstall(){
    CleanUp
    rm -Rf $installoc/CosmicComics
}
function CheckUpdate(){
    curl https://raw.githubusercontent.com/Nytuo/CosmicComics/main/package.json --output "$installoc/lastPackage.json"
    versionlocal=`sed 's/.*"version": "\(.*\)".*/\1/;t;d' $installoc/CosmicComics/package.json`
    versioninternet=`sed 's/.*"version": "\(.*\)".*/\1/;t;d' $installoc/lastPackage.json`
    vercomp $versionlocal $versioninternet
        case $? in
        0) op='=' echo "No update needed";;
        1) op='>' echo "Insider";;
        2) op='<' Update;;
    esac
    CleanUp

}
function Update(){
    cd $installoc/CosmicComics
    git pull
npm install

}


function PMInstall(){
if [ $packagesManager = "pacman" ]
then
sudo pacman -S $1
elif [ $packagesManager = "yum" ]
then
sudo yum install $1
elif [ $packagesManager = "apt" ]
then 
sudo apt-get install $1
fi
}
echo -e "Nytuo's CosmicComics\nLinux AIO script : Install / Uninstall / Update / Launch\n"
echo "Checking if you have Git and Node installed..."
if [ $(which git) ]
then
echo "Git is already installed"
else
echo "Installing Git..."
PMInstall git
fi
if [ $(which node) ]
then
echo "Node is already installed"
else
echo "Installing Node..."
PMInstall node
fi

if [ $# -eq 0 ]
then 
if [ -d $installoc/CosmicComics ]
then
CheckUpdate
else
FirstInstall
fi
LaunchServer
fi

while [ $# -gt 0 ]
do
  case "$1" in
    -u | --forceUpdate )
      Update
      exit 0
      shift 2
      ;;
    -d | --directLaunch )
      LaunchServer
      shift 2
      ;;
      -f | --firstInstall )
      FirstInstall
      LaunchServer
      shift 2
      ;;
      -s | --uninstall )
      Uninstall
      exit 0
      shift 2
      ;;
    -h | --help)
      echo -e "All in one script for CosmicComics Linux
-u | --forceUpdate : Update the app and quit
-d | --directLaunch : Launch the server without any version checking (still check for Git and Node)
-f | --firstInstall : Downloading a fresh version from source and launch the server
-s | --uninstall : Delete all files except this script
-h | --help : show this help message"
      exit 2
      ;;
    *)
      echo "Unexpected option: $1"
      exit 0
      ;;
  esac
done


