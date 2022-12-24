<img style="width: 50%;margin-left:auto;margin-right:auto" src="https://nytuo.yo.fr/images/LogoStretch_cc.png">

# Cosmic Comics 

## Notice that CosmicComics has been reconstructed, some features may have been deleted or are not yet available.

[![cosmiccomics](https://snapcraft.io/cosmiccomics/badge.svg)](https://snapcraft.io/cosmiccomics)
[![cosmiccomics](https://snapcraft.io/cosmiccomics/trending.svg?name=0)](https://snapcraft.io/cosmiccomics)


<a href='//www.microsoft.com/store/apps/9NFN9CG8TGP7?cid=storebadge&ocid=badge'><img src='https://developer.microsoft.com/store/badges/images/English_get-it-from-MS.png' alt='English badge' style='width: 284px; height: auto;'/></a>


<a href="https://snapcraft.io/cosmiccomics">
  <img alt="Get it from the Snap Store" src="https://snapcraft.io/static/images/badges/en/snap-store-black.svg"  style='width: 284px; height: auto'/>
</a>

 Comics and Manga Collectionner & Reader

## Important changes
This new version of CosmicComics use a server to work, Running on the computer where the comics and mangas are stored.
For displaying you will need only a browser of your choice. (Chrome is recommanded)

The old versions of ComsicComics are not retro compatible with this version.

## Features:
### Please note that some features may not work
This is all you can do with this software and more:
- Read `CBR`, `CBZ`, `CB7`, `CBT`, `ZIP`, `RAR`, `7z`, `TAR`, `Folder` which contains `PNG`, `JPG`, `JPEG`, `BMP`.
- Display your books and navigate your folders with custom covers (automaticatly by extraction or manually set)
- Set your books as `Read`, `Unread`, `Reading` or `favorite` and `note` them.
- Many Customizable parameters
- Zoom, Auto Background Color, Double page Mode, Blank first page, No double page for Horizontal, Manga Mode, Webtoon Mode, fullscreen, rotations, Bookmarks, Slideshow, SideBar, Hide Menu Bar.
- Display information about Comics/ Manga
- Open a single or a whole folder (recommended)
- Open a file by drag&Drop, or open it via the file explorer (only if you have set Cosmic-Comics as default app for this extension)
- Continue reading where you stopped and more...

## Installation
When the 2.0.0 version will release you will also be able to install threw the [snapcraft store](https://snapcraft.io) and the [microsoft store](https://apps.microsoft.com/store/apps).

### Electron
*I’m just a simple man, trying to make my way in the universe.*

Installation difficulty : 😴

The Electron version is recommended for the most people.<br>
It is the same, but you got a dedicated view instead of your browser.
The server is attached to the program, so the server close when you close the window.
#### Steps to install the electron version :
1. Download the installer for your operating system and architecture under the 'Release' section of the GitHub.<br>
2. Install the application by opening the installer.<br>
3. Open the application like any other.<br>

### Script
*This is where the fun begins.*

Installing difficulty : 🙂

This is the better way of installing the app, but could afraid some people.
This will install only the server (and needed dependencies), you will need a browser.

#### Steps to install the script version (Windows):
1. Download the script from the GitHub repository. (script_win.ps1)<br>
2. Create a directory where you want to install the application.<br>
3. Put the script in the directory.<br>
Right-click on the script and select 'Run with PowerShell'. If you get a warning type 'y'<br>
Or, Open a PowerShell Terminal in this directory. (Right-click or SHIFT+Right-click > open PowerShell window here)<br>
Run the script.
`./script_win.ps1`
4. When prompted for the beta version, say 'yes' until the release of the 2.0.0.<br>
5. If you say 'yes' when asked for the portable version, the data of the application will be in the same directory as the script.<br>If not the server will create a directory under the user's appdata folder.<br>
6. The server launch automatically when all it's done<br>

Creating a shortcut is very recommended.

#### Steps to install the script version (Linux):
1. Update your package manager (apt-get update / pacman -Suy / equivalent).<br>
2. Download the script from the GitHub repository. (script_linux.sh)<br>
3. Create a directory where you want to install the application.<br>
4. Put the script in the directory.<br>
5. Open a Terminal in this directory.<br>
6. Run the script. You may need to allow the execution with `chmod a+x ./script_linux.sh`<br>
7. When prompted for the beta version, say 'yes' until the release of the 2.0.0.<br>
8. The server launch automatically when all it's done<br>
#### Creating a shortcut (Windows):
1. Where you want to create the shortcut, right-click and select 'New' > 'Shortcut'.<br>
2. In the popup, type `powershell.exe -noexit -ExecutionPolicy Bypass -File <location_to_script_win.ps1>` in the box. Where <location_to_script_win.ps1> is the location of the script (absolute path).<br>
3. Click 'Next', name the shortcut and click 'Finish'.<br>
4. You can change the icon, color of the terminal under 'Properties'.<br>
Note that you will need to launch the script each time you want to launch the server.
If you want to close the server press CTRL+C in the terminal or close the window.
### Cloning
*UNLIMITED POWER!!*

Installing difficulty : 😭

Wow, you must be a developer...<br/>
#### pre-requisite
- Git
- Node.js
- NPM (included in Node.js for Windows)
- Python (for compiling some Node.js modules)
- Visual Studio Build Tools (for compiling some Node.js modules) (for windows)
- make (for linux)
- Build-essential (for ubuntu)
- A terminal
- A browser
 
Assuming you have all the prerequisite installed, clone the repository in a new directory with Git :<br/>
`git clone https://github.com/Nytuo/Cosmic-Comics.git`

Then install the dependencies with 
`npm install --production`.<br/>
Then run the app with `node server.js`.<br/>
You will have access to all the features of the app, directly in your browser.


### Portable Edition
#### Electron
The executable installer cannot be used for a portable version.<br>
The ".zip" file provides a portable support.<br/>
Create a directory and another one in it and extract the ".zip" file in the last directory.<br/>
Go to `CosmicComics/resources/app/` and create a file called `portable.txt` with `electron` written inside.<br/>
The 'Data' folder will be created in the first directory you created.<br/>

### Script
The script asks you if you want to install in a portable way on Windows.<br/>
Linux's users cannot because the script requires to install apps in the system.
### Cloning
You cannot use this installation method for a portable version.
## Update
### Electron
The electron version have a built-in update system.
If an update is available, the application will download it and install it when you quit.
### Script
The script have a built-in update system.
The update proceed when the script is started.
### Cloning
Well, you just to ``git pull`` in the directory.
## Languages
Since CosmicComics use your own web browser to render, and the most modern browsers have a translation plugin, you will be able to translate to your language the application.

The default language of the application is english. Note that the translation may not be 100% accurate and depends on the browser / extensions.

The old JSON way will still being used.

## Keyboard and Mouse shortcuts

### Note that some shortcuts may not work during the rebuild of the app, some will changes or be deleted in the future.
Home page (index, where your files are):
- C : Continue reading
- F : Forget the actual folder
- R : Refresh the actual folder
- O : Open a single file
- D : Open a Directory

------------------------------

Viewer page (viewer, where you read the book):
- Ctrl + +(numPad or Digit) : Zoom In
- Ctrl + -(numPad or Digit) : Zoom Out
- Left Arrow || Up Arrow : Previous Page
- Right Arrow || Down Arrow : Next Page
- Ctrl + Left Arrow || Ctrl + Up Arrow : Go to the first page
- Ctrl + Right Arrow || Ctrl + Down Arrow : Go to the last page
- F : FullScreen
- H : Display by Height
- W : display by Width
- B : Toggle Bookmarks
- R : Rotate 90° (to the right)
- Shift + R : Rotate -90° (To the left)
- O : Mark as Read
- I : Mark as Reading
- U : Mark as Unread
- P : Toggle Favorite
- Mouse Left Click (not on the MenuBar or the SideBar) : Previous Page
- Mouse Right Click (Not on the MenuBar or the SideBar) : Next Page

## License
The Cosmic-Comics is licensed under the `GNU GPL v3` License, You can find info on it on the source code and on the internet.

## How to start Development?
Run the following on a command prompt (shell)
Note: Here I use `Yarn` but you can also use  `NPM`
```shell
git clone https://github.com/Nytuo/CosmicComics.git
cd CosmicComics
yarn install
yarn upgrade
yarn start
```

## Known Issues
Very much at this time...

## Mobile Version ?
Cosmic Comics now runs on a server, that means you can actually connect to any servers within your favorite web browser. No matter if you are on mobile, desktop or console.
That said, an android and android TV application is in plan to offer a better experience.

However, you will NEED A RUNNING SERVER on a supported platform (Linux, Windows or macos) in order to access it.
The application WILL NOT work standalone. The app use many libraries that not work on android like unrar and this will take me too much time to create a dedicated mobile application. Some for a standalone use I recommand you using TAKIOMI OR CDisplayEX android.


## Got an idea of something which could be added or enhanced ?
Then open an issue on GitHub or make a Pull Request if you have implemented it already.

## Got issues, have a feedback, want helps ?
Then Open an issue on GitHub.
