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
	fs.writeFileSync(serverConfig, JSON.stringify({"Token":{},"port":4696}));
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
app.whenReady().then(() => {
	let url = "https://github.com/Nytuo/CosmicComics";
	let branch = "develop";
	let git = require("simple-git")();
	git.pull(url, branch, function (err, update) {
		if (update && update.summary.changes) {
			alert("Update downloaded, the app will restart.");
			app.relaunch();
			app.exit(0);
		} else {
			createServer();
			createWindow();
			app.on('activate', () => {
				if (BrowserWindow.getAllWindows().length === 0) {
					createWindow();
				}
			});
		}
	});
});
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
