<img style="width: 50%;margin-left:auto;margin-right:auto" src="https://nytuo.yo.fr/images/LogoStretch_cc.png">

# Cosmic Comics 

## Notice that CosmicComics is in active reconstruction, some features are not available yet or may not work. 

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
- Discord Rich Presence (RPC)
- Multi-lang Support (English(US) and French(FR) are officially supported but you can wrote your own, see more under the [Languages](https://github.com/Nytuo/CosmicComics/tree/master#languages) section)
- Keyboard and mouse shortcuts (see more on the [Keyboard and Mouse shortcuts](https://github.com/Nytuo/CosmicComics/tree/master#keyboard-and-mouse-shortcuts) section)
- Keep info of your books and app settings in a `JSON` under the `AppData` folder.
- Set your books as `Read`, `Unread`, `Reading` or `favorite` and `note` them.
- Many Customizable parameters
- Zoom, Auto Background Color, Double page Mode, Blank first page, No double page for Horizontal, Manga Mode, Webtoon Mode, fullscreen, rotations, Bookmarks, Slideshow, SideBar, Hide Menu Bar.
- Display informations about Comics/ Manga
- Open a single or a whole folder (recommanded)
- Open a file by drag&Drop, or open it via the file explorer (only if you have set Cosmic-Comics as default app for this extension)
- Continue reading where you stopped and more...

## Installation
To determinate...

As from now, you can only install the app by the scripts by they not work at 100% and need nodeJS installed on your computer or begin development.

### Portable Edition
CosmicComics is now fully portable !

The server is launched in a folder, and you use a browser to render.
Note that you may need some dependencies like nodeJS installed.

## Update
To determinate, for the moment this version do not have a working out-of-the-box updater and will depend on how I will handle the installation.

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
