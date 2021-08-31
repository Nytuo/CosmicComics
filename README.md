# CosmicComics
[![cosmiccomics](https://snapcraft.io/cosmiccomics/badge.svg)](https://snapcraft.io/cosmiccomics)
[![cosmiccomics](https://snapcraft.io/cosmiccomics/trending.svg?name=0)](https://snapcraft.io/cosmiccomics)
Open Source, Pure Javascript, NodeJS / Electron, Comics and Manga Viewer

## Introduction
I wanted a software easy to use and looking great in which I can display all my comics/mangas collection and read them with cool features.
### Why this project ?
I beginning reading comics and manga and found some softwares to do it but none of them correspond to me. So I decided to create my own software.

## Features:
This is all you can do with this software and more:
- Read CBR, CBZ, CB7, CBT, ZIP, RAR, 7z, TAR, Folder which contains PNG, JPG, JPEG, BMP.
- Display your books and navigate your folders with custom covers (automaticatly by extraction or manually set)
- Discord Rich Presence (RPC)
- Multi-lang Support (English(US) and French(FR) are officially supported but you can wrote your own, see more under the Languages section)
- Keyboard and mouse shortcuts (see more on the Keyboard and Mouse shortcuts section)
- Keep info of your books and app settings in a JSON under the AppData
- Set your books as Read, Unread, Reading or favorite and note them.
- Many Customizable parameters
- Zoom, Auto Background Color, Double page Mode, Blank first page, No double page for Horizontal, Manga Mode, Webtoon Mode, fullscreen, rotations, Bookmarks, Slideshow, SideBar, Hide Menu Bar.
- Display informations about Comics/ Manga
- Open a single or a whole folder (recommanded)
- Open a file by drag&Drop, or open it via the file explorer (only if you have set Cosmic-Comics as default app for this extension)
- Continue reading where you stopped and more...

## License
The Cosmic-Comics is licensed under the GNU GPL v3 License, You can find info on it on the source code and on the internet.

## Installation
### For Windows
- Directly on the Microsoft Windows Store
- As an exe file (OneClick NSIS Installer, installed in "Program Files")
- As a .zip file containing the app for portable edition (see more under the Portable section)

### Linux
- Directly on the SnapCraft Store
- As a Snap file (to manually install the same version as the snapcraft one)
- As a Deb file (for using in all Debian Based distribution)
- As a RPM file (for using with all Red Hat based distribution)
- As an AppImage (image normally running on all distribution)
- As a ZIP file (for portable version, see more on the portable edition)

### MacOS
Note: Since I am not familiar to MacOS, don't have a MacOS machine and don't really love Apple, this version of the software can have some issues that I will do my best to correct. (I use a Virtual Machine to build the soft on Windows to MacOS)
- As a DMG
- As a ZIP

### Portable Edition
This software will have a portable edition support that you can enable by following those steps:
1. Download the ZIP version for your OS.
2. Create where you want a folder (name of your choice) in which you will create 3 other folders, the app (name of your choice), the temporary (named TMP), and the AppData (named AppData).
3. Extract the archive in the app folder
4. Adding a text file nammed `portable` with the extension `TXT` in the main directory (where the other 3 folders are).
5. Run the cosmic-comics file in the app folder and select The ZIP version corresponding to your OS (if MAC select DevMode) as an update provider.

## Update
I implemented a custom updater (which do NOT support MacOS for the moment) it will let you know when an update is available.
If you are on a store version you will have to update through this store.
If you have selected DevMode you will have to download manually the new version on Github.
If you have selected a ZIP version you will have to update manually but the ZIP is downloaded and openned directly.
If you have selected AppImage you will have to delete the old one and replace it by the new one downloaded directly.
If you have selected other than thoses choices then you will deal with the normal installation.
Note : Remerber to close the app when the update is download / the installation process begin

## Languages
You can change the language of the app in the settings by clicking on the flags.
English (symbolized by the USA Flags) and French (symbolized by the French Flags) are made by me and officially supported (If you discover a traduction error, please tell me).
But you can add your languages too!
Dead simple, go the App folder (where the application is installed or launched), then open the "resources/app/languages" folder, on it you will see actual languages, duplicate(copy&paste) a JSON file (for example the english one), rename it with your country ID (for the flags (english = us.json to display the American flag)). Open the file and start translating the values. When you have finished, then start the application and you will see on the settings the flags and when you click on it the language you made.
Note: You can also open an issue if you want a language to be added or submit your own. In the last case, I will verified it, and add it to the project.

## Keyboard and Mouse shortcuts
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

## Mobile Version ?
Well, my software use Electron which is not possible to export to Android (and I don't talk about IOS), I try many way to convert my project to Android but still no success.
In the future I have the plan to make an android application.
If you have any tips on how to brings Electron / NodeJS to Android, let's me know in the issues section. And if you want make it and send it as a PR.

## Got an idea of something which could be added or enhanced ?
Then open an issue on GitHub or make a Pull Request if you have implemented it already.

## Got issues, have a feedback, want helps ?
Then Open an issue on Github.