const { app, BrowserWindow } = require('electron')
const path = require('path')
const {spawn} = require('child_process')
function createWindow () {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
		}
	})

	win.loadURL('http://localhost:4696')
}

function createServer(){
	var child = spawn('node', ['server.js'])
}

app.whenReady().then(() => {
	createServer()
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
