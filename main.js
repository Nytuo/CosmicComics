const {app, BrowserWindow} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('path');
const {spawn} = require('child_process');
const server = require('./server.js')

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
}
autoUpdater.checkForUpdates()
autoUpdater.on('update-downloaded', (info) => {
// Wait 5 seconds, then quit and install
	// In your application, you don't need to wait for it.
	// You can call autoUpdater.quitAndInstall();
	setTimeout(function() {
		autoUpdater.quitAndInstall();
	}, 5000);

});
autoUpdater.on('update-available', (info) => {
	autoUpdater.downloadUpdate();
});
autoUpdater.on('update-not-available', (info) => {
	alert('No Update available.');
});
autoUpdater.on('error', (err) => {
	alert("Hum, the updater encountered an error. Please try again later.");
});
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
