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
const serverConfigPort = JSON.parse(serverConfig)["port"];

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {}
	});
	win.removeMenu();
	win.loadURL('http://localhost:' + serverConfigPort);
}

function createServer() {
	app.server = require(__dirname + '/server.js');
}

autoUpdater.checkForUpdatesAndNotify();
app.whenReady().then(() => {
	createServer();
	createWindow();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
