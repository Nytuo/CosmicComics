const {app, BrowserWindow} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('path');
const fs = require("fs");
let path2Data;
const isPortable = fs.existsSync(path.join(__dirname, 'portable.txt')) && fs.readFileSync(path.join(__dirname, 'portable.txt'), 'utf8') === 'electron';
if (isPortable) {
	path2Data = path.join(path.dirname(app.getAppPath()), 'CosmicData');
} else {
	path2Data = path.join(app.getPath('appData'), 'CosmicComics/CosmicData');
}
fs.mkdirSync(path2Data, {recursive: true});
let serverConfig = path2Data + '/serverconfig.json';
if (!fs.existsSync(serverConfig)) {
	fs.writeFileSync(serverConfig, JSON.stringify({"Token": {}, "port": 4696}));
}
const serverConfigPort = JSON.parse(fs.readFileSync(serverConfig))["port"];


require('@electron/remote/main').initialize();

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
		}
	});
	win.removeMenu();
	require('@electron/remote/main').enable(win.webContents)
	win.loadURL('http://localhost:' + serverConfigPort);
}

function createServer() {
	app.server = require(__dirname + '/server.js');
}

autoUpdater.checkForUpdatesAndNotify();
let url = "https://github.com/Nytuo/CosmicComics";
let branch = "master";
let gitOptions = {
	repo: url,
	branch: branch,
	baseDir: __dirname,

}
let git = require("simple-git")(gitOptions);
app.whenReady().then(() => {

	if (fs.existsSync(path.join(__dirname, '.git'))) {
		updateAndLaunch();
	} else {
		console.log("No git repository found, initializing...");
		git.init(false,{},function (err, init) {
			console.log(err);
			git.addRemote('origin', url+ '.git', function (err) {
				console.log(err);
				updateAndLaunch();
			});
		});


	}
});

function updateAndLaunch() {
	git.fetch("origin", branch,[], function (err, fetchResult) {
		console.log(err);
		git.reset(['--hard'], function (err, update) {
			console.log(err);
			git.pull("origin", branch, ["--force"],function (err, pull) {
				console.log(err);
				git.checkout(['origin/' + branch,'--force'], function (err, update) {
					console.log(err);
					if (err){
						app.quit();
					}else{
						createServer();
						createWindow();
						app.on('activate', () => {
							if (BrowserWindow.getAllWindows().length === 0) {
								createWindow();
							}
						});
					}

				});
			})
		});
	});
}
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
