# Contributing
Since this repo relies on other repos in order to work, if you want to contribute, please contribute to the correct one.   
This repo only support the Electron port of the CosmicComics.

When contributing to this repository, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository before making a change.
Please note we have a [code of conduct](CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

## Development environment setup

To set up a development environment, please follow these steps:

### Prerequisite

- Git
- Node.js (18)
- NPM (included in Node.js for Windows)
- Python (for compiling some Node.js modules)
- Visual Studio Build Tools (for compiling some Node.js modules) (for windows)
- make (for Linux)
- Build-essential (for ubuntu)
- dev tools (for arch-based distros)
- A terminal
- A browser

### Steps

1. Clone the repo

   ```sh
   git clone https://github.com/Nytuo/CosmicComics
   ```
2. Install Node modules via NPM or YARN
   ```sh
   npm install
   ```
   or 
   ```sh
   yarn install
   ```
3. Launch the script to get the last version of the Back and Front End (BFE)
   ```sh
   npm run get-bfe
   ```
   or 
   ```sh
   yarn get-bfe
   ```
4. Relaunch the install of Node modules to get the Back-end ones
   ```sh
   npm install
   ```
   or 
   ```sh
   yarn install
   ```
5. a. Start electron with update the BFE at each launch
   ```sh
   npm run start
   ```
   or 
   ```sh
   yarn start
   ```
   b. Start electron without updating the BFE each time
   ```sh
   npm run no-update
   ```
   or 
   ```sh
   yarn no-update
   ```

6. The app will start the server and the interface in parallel.


## Issues and feature requests

You've found a bug in the source code, a mistake in the documentation or maybe you'd like a new feature?Take a look at [GitHub Discussions](https://github.com/Nytuo/CosmicComics/discussions) to see if it's already being discussed.  You can help us by [submitting an issue on GitHub](https://github.com/Nytuo/CosmicComicsNodeServer/issues). Before you create an issue, make sure to search the issue archive -- your issue may have already been addressed!

Please try to create bug reports that are:

- _Reproducible._ Include steps to reproduce the problem.
- _Specific._ Include as much detail as possible: which version, what environment, etc.
- _Unique._ Do not duplicate existing opened issues.
- _Scoped to a Single Bug._ One bug per report.

**Even better: Submit a pull request with a fix or new feature!**

### How to submit a Pull Request

1. Search our repository for open or closed
   [Pull Requests](https://github.com/Nytuo/CosmicComicsNodeServer/pulls)
   that relate to your submission. You don't want to duplicate effort.
2. Fork the project
3. Create your feature branch (`git checkout -b feat/amazing_feature`)
4. Commit your changes (`git commit -m 'feat: add amazing_feature'`) CosmicComics uses [conventional commits](https://www.conventionalcommits.org), so please follow the specification in your commit messages.
5. Push to the branch (`git push origin feat/amazing_feature`)
6. [Open a Pull Request](https://github.com/Nytuo/CosmicComicsNodeServer/compare?expand=1)
