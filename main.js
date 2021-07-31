const { app, BrowserWindow,shell } = require("electron");
const { autoUpdater } = require("electron-updater");
var fs = require("fs");
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
var parentfolder3 = require("path").dirname(parentfolder2);
if (process.platform == "linux"){
  parentfolder3 = app.getPath("documents")
}else if (process.platform == "win32") {
}
function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 200,
    minHeight: 200,
    minWidth: 500,
    icon: __dirname + "/Images/Logo.png",
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
    frame: false,
  });

  win.loadFile("updater.html");
}
app.whenReady().then(() => {
  createWindow();
});
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
if (!fs.existsSync(parentfolder3 + "/CosmicComics_data")) {
  fs.mkdirSync(parentfolder3 + "/CosmicComics_data");
}
if (!fs.existsSync(parentfolder3+ "/CosmicComics_data/ListOfComics.json")){
  fs.writeFileSync(parentfolder3+ "/CosmicComics_data/ListOfComics.json",JSON.stringify([],null, 2));
}
if (!fs.existsSync(parentfolder3+ "/CosmicComics_data/config.json")){
  var obj = [{"path": "","last_opened": "","language":"us"}]
  fs.writeFileSync(parentfolder3+ "/CosmicComics_data/config.json",JSON.stringify(obj,null,2))
}
if (!fs.existsSync(parentfolder3+ "/CosmicComics_data/FirstImageOfAll")){
  fs.mkdirSync(parentfolder3+ "/CosmicComics_data/FirstImageOfAll")
}
if (!fs.existsSync(parentfolder3+ "/CosmicComics_data/bookmarks.json")){
  fs.writeFileSync(parentfolder3+"/CosmicComics_data/bookmarks.json",JSON.stringify([],null,2))
}
var checkexistingfile = fs.readdirSync(parentfolder3+ "/CosmicComics_data")
checkexistingfile.forEach((file)=>{
  if(file.includes(".exe")){
    fs.unlinkSync(parentfolder3+ "/CosmicComics_data/"+file)
  }
})