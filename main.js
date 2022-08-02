const {app, BrowserWindow} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('path');

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {}
	});
	win.removeMenu();
	win.loadURL('http://localhost:4696');
}

function createServer() {
	app.server = require(__dirname + '/server.js');

}
autoUpdater.checkForUpdatesAndNotify()
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
