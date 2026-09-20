<h1 align="center">
  <a href="https://github.com/Nytuo/CosmicComics">
    <img src="src/public/Images/LogoBig.png" alt="Logo" width="auto" height="400">
  </a>
</h1>
<div align="center">
<h2>CosmicComics</h2>
Read Comics, Manga and Ebooks the easy way
  <br />
  <br />
  <a href="https://github.com/Nytuo/CosmicComics/issues/new?assignees=&labels=bug&template=01_BUG_REPORT.md&title=bug%3A+">Report a Bug</a>
  ·
  <a href="https://github.com/Nytuo/CosmicComics/issues/new?assignees=&labels=enhancement&template=02_FEATURE_REQUEST.md&title=feat%3A+">Request a Feature</a>
    · <a href="https://github.com/Nytuo/CosmicComics/discussions">Ask a Question</a>

</div>

<div align="center">
<br />

[![Project license](https://img.shields.io/github/license/Nytuo/CosmicComics.svg?style=flat-square)](LICENSE)

[![code with love by Nytuo](https://img.shields.io/badge/%3C%2F%3E%20with%20%E2%99%A5%20by-Nytuo-ff1414.svg?style=flat-square)](https://github.com/Nytuo)

[![cosmiccomics](https://snapcraft.io/cosmiccomics/badge.svg)](https://snapcraft.io/cosmiccomics)

[![cosmiccomics](https://snapcraft.io/cosmiccomics/trending.svg?name=0)](https://snapcraft.io/cosmiccomics)

</div>

<details open="open">
<summary>Table of Contents</summary>

- [About](#about)
- [What Cosmic Comics Can Do](#what-cosmic-comics-can-do)
- [Jellyfin](#jellyfin)
- [Mobile (Android & iOS)](#mobile-android--ios)
- [Technologies](#technologies)
- [MacOS Troubleshooting](#macos-troubleshooting)
  - [Guided Reading Mode](#guided-reading-mode)
  - [Launching on MacOS](#launching-on-macos)
- [Authors \& contributors](#authors--contributors)
- [License](#license)

</details>

---

## About

Cosmic Comics offers a user-friendly interface that makes it easy to browse the collection of comics, manga and ebooks. It supports different file formats, offers adaptive page layout, favorite page marking, advanced search and library management.

## What Cosmic Comics Can Do

- **Read a wide range of formats:**
  - Archives: `CBR`, `CBZ`, `CB7`, `CBT`, `ZIP`, `RAR`, `7z`, `TAR`
  - Documents: `PDF`, `EPUB`
  - Folders containing `PNG`, `JPG`, `JPEG`, `BMP`, and more

- **Browse your collection** with series and books navigation with api fetched / extracted / custom covers.

- **Track your reading progress** — mark books as `Read`, `Unread`, or `Reading`, add them to `Favorites`, and rate them

- **Powerful viewer options:**
  - Zoom, Auto Background Color
  - Double Page Mode, Blank First Page, No Double Page for Horizontal images
  - Manga Mode, Webtoon Mode
  - Fullscreen, Rotations, Bookmarks, Slideshow
  - Sidebar, Hide Menu Bar, Magnifier
  - Guided Reading Mode (Using local AI model)

- **Rich metadata** — display detailed information about your Comics, Manga, and Ebooks

- **Downloaders**
  Cosmic Comics provides some downloaders to get content through the app, you may need subscriptions and credentials to access them.
  - [Marvel Unlimited](https://www.marvel.com/comics/unlimited/home)
  - [MangaDex](https://mangadex.org/)
  - [DC Infinite](https://www.dcuniverseinfinite.com/)
  - [Viz](https://www.viz.com/)
  - [GetComics](https://getcomics.org/)

- **Library metadata provided by multiple APIs:**
  - [Marvel API](https://developer.marvel.com/) (API has shutdown)
  - [Google Books](https://developers.google.com/books)
  - [Anilist](https://anilist.co/)
  - [Metron](https://metron.cloud/)
  - [Open Library](https://openlibrary.org/)
  - Manual entry

- **Continue reading** right where you left off

- **Jellyfin:** sign in to your [Jellyfin](https://jellyfin.org/) server (password or Quick Connect), browse your *Books* libraries, and read them in the same viewer. Books are downloaded on demand (and cached), and your reading position is synced back to the server, so you can pick up where you stopped in another Jellyfin reader.

- **Statistics:** a dashboard (charts built with Recharts) of your library and reading — time and pages per day, streaks, finished books per month, reading by weekday and hour, formats, genres, authors, ratings and the most read series. Reading sessions are recorded in the local database; for Jellyfin, the library, read status and last-read dates come from the server itself. Filter by local files, all Jellyfin servers or one server. The history can be cleared from the page.

- **Android & iOS:** the app runs on phones and tablets with touch reading (swipe or tap the edges to turn pages) and supports `CBZ`, `CBR`, `CB7` and `CBT` from Jellyfin and from files imported on the device. the downloaders and the Smart Panel AI are desktop only. PDF and EPUB work everywhere.

## Jellyfin

1. Open **Jellyfin** in the sidebar and choose *Add a Jellyfin server*.
2. Enter the address (`https://jellyfin.example.com` or `192.168.1.10:8096`), then sign in with your username and password, or use **Quick Connect** (approve the code in another signed-in Jellyfin app). Tick *Trust a self-signed certificate* for a server with a private certificate.
3. Browse the *Books* libraries; open a book to read it. Only the access token is stored, never your password.

Reading position uses the same convention as other Jellyfin book readers (`PlaybackPositionTicks = page × 10 000`; the last page marks the book as read). Downloaded books are cached (the 8 most recent are kept) — *Clear downloaded books* frees the space.

## Mobile (Android & iOS)

Built with Tauri 2 mobile from the same code base. The local library is a folder inside the app: use **Import files** to pick comics from the device, they are copied in and grouped by series.

```bash
cd src
npm install
npx tauri android init && npx tauri android dev      # needs the Android SDK + NDK
npx tauri ios init && npx tauri ios dev "iPhone 17"  # needs Xcode and xcodegen
```

Notes:

- `CBR` uses the bundled `unrar` library and `CB7` a pure-Rust 7z decoder; archives are recognised by content, so a `.cbr` that is really a ZIP still opens.
- Not available on mobile: the Marvel/MangaDex/DC/Viz/GetComics downloaders (need a desktop browser), the Smart Panel AI and the auto-updater.
- Jellyfin book formats: CBZ, CBR, CB7, CBT, ZIP, RAR, 7z, TAR, PDF and EPUB. Others (MOBI, AZW3, ...) are reported as unsupported.
- See `.github/workflows/mobile.yml` for the CI build steps.

## Technologies
<div style="display: flex; align-items: center; gap: 10px;">
    <img src="https://img.shields.io/badge/Rust-black?style=for-the-badge&logo=rust"/>
  <img src="https://img.shields.io/badge/NPM-black?style=for-the-badge&logo=npm"/>
<img src="https://img.shields.io/badge/NodeJS-black?style=for-the-badge&logo=node.js"/>
<img src="https://img.shields.io/badge/React-black?style=for-the-badge&logo=React"/>
<img src="https://img.shields.io/badge/vite-black?style=for-the-badge&logo=vite"/>
  <img src="https://img.shields.io/badge/typeScript-black?style=for-the-badge&logo=typescript"/>
<img src="https://img.shields.io/badge/TAURI-black?style=for-the-badge&logo=tauri"/>
</div>

## Authors & contributors

The original setup of this repository is by [Arnaud BEUX](https://github.com/Nytuo).

For a full list of all authors and contributors, see [the contributors page](https://github.com/Nytuo/CosmicComics/contributors).

## License

CosmicComics is licensed under the **GNU General Public License v3**.
CosmicComics is provided **"as is"** without any **warranty**. Use at your own risk.
See [LICENSE](LICENSE) for more information.
