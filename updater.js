var OnlineVersion = "";
const fs = require("fs");
const download = require("download");
const { shell,remote } = require("electron");
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
var CosmicComicsData = parentfolder3 + "/CosmicComics_data";
if (process.platform == "win32"){
  CosmicComicsData = parentfolder3 + "/CosmicComics_data";
}else if (process.platform == "linux") {
  CosmicComicsData = remote.app.getPath("documents")+ "/CosmicComics_data"
}
function openWindow() {
  const BrowserWindow = require("electron").remote.BrowserWindow;
  const path = require("path");
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minHeight: 720,
    minWidth: 1280,
    icon: __dirname + "/Images/Logo.png",
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
    frame: false,
  });

  win.loadFile("index.html");
  close();
}
var githubContent = require("github-content");
var options = {
  owner: "Nytuo",
  repo: "CosmicComics",
  branch: "master",
};
var gc = new githubContent(options);

gc.file("Version.txt", function (err, file) {
  if (err) return console.log(err);
  console.log(file.path);
  OnlineVersion = file.contents.toString();
  OnlineVersion = OnlineVersion.split("\n");
  OnlineVersion = OnlineVersion[0];
});
var OnlineVersionNum = OnlineVersion.replaceAll(".","")
OnlineVersionNum = parseInt(OnlineVersionNum)
var proverNum = process.version.replaceAll(".","")
proverNum = parseInt(proverNum)
if (OnlineVersionNum > proverNum) {
  sendMessage("Update Available");
  DLUpdate();
} else if (OnlineVersionNum < proverNum) {
  sendMessage(
    "Do you came from the future, this is a future version of the app"
  );
  setTimeout(() => {
    openWindow();
  }, 2000);
} else if (OnlineVersionNum == proverNum) {
  sendMessage("No Update Available");
  setTimeout(() => {
    openWindow();
  }, 2000);
} else {
  sendMessage("Error when checking for updates");
}
function bytesToSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "n/a";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]})`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
function sendMessage(message) {
  document.getElementById("msgloading").innerHTML = message;
}
async function DLUpdate() {
  if (process.platform === "win32") {
    var starttime = new Date().getTime();
    await download(
      "https://github.com/Nytuo/CosmicComics/releases/download/v" +
        OnlineVersion +
        "/Cosmic-Comics-Setup-" +
        OnlineVersion +
        ".exe",
      CosmicComicsData
    )
      .on("downloadProgress", (data) => {
        document.getElementById("prgs").className = "determinate";

        document.getElementById("prgs").style.width = data.percent * 100 + "%";

        var end = new Date().getTime();
        var duration = (end - starttime) / 1000;
        var bps = data.transferred.toFixed() / duration;
        var time = (data.total - data.transferred) / bps;
        var seconds = time % 60;
        var minutes = time / 60;
        seconds = Math.floor(seconds);
        minutes = Math.floor(minutes);

        sendMessage(
          (data.percent * 100).toFixed() +
            "% -- " +
            bytesToSize(bps) +
            "/s -- " +
            bytesToSize(data.transferred) +
            " / " +
            bytesToSize(data.total)
        );
      })
      .then(() => {
        document.getElementById("prgs").className = "indeterminate";

        sendMessage("Installing...");
        shell.openPath(
          CosmicComicsData + "/Cosmic-Comics-Setup-" + OnlineVersion + ".exe"
        );
      });
  } else {
    sendMessage(
      "The Updater doesn't support this operating system for the moment"
    );
  }
}
