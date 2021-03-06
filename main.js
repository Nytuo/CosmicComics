/*This file is part of Cosmic-comics.

Cosmic-Comics is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Cosmic-Comics is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Cosmic-Comics.  If not, see <https://www.gnu.org/licenses/>.*/
const { app, BrowserWindow } = require("electron");
var fs = require("fs");
const { platform } = require("os");
require("@electron/remote/main").initialize();
var AppDataDir = app.getPath("userData");
var TempDir = app.getPath("temp");
if (fs.existsSync(TempDir + "/CosmicComics") == false) {
  fs.mkdirSync(TempDir + "/CosmicComics");
}
if (fs.existsSync(TempDir + "/CosmicComics/current_book") == false) {
  fs.mkdirSync(TempDir + "/CosmicComics/current_book");
}
if (fs.existsSync(TempDir + "/CosmicComics/downloaded_book") == false) {
  fs.mkdirSync(TempDir + "/CosmicComics/downloaded_book");
}
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
if (fs.existsSync(parentfolder3 + "/portable.txt")) {
  AppDataDir = parentfolder3 + "/AppData";
  TempDir = parentfolder3 + "/TMP";
}
try {
  fs.readdirSync(AppDataDir);
  fs.readdirSync(TempDir);
} catch (error) {
  console.log(error);
  AppDataDir = __dirname + "/AppData";
  TempDir = __dirname + "/TMP";
}
if (fs.existsSync(AppDataDir) == false) {
  fs.mkdirSync(AppDataDir);
}
if (fs.existsSync(TempDir) == false) {
  fs.mkdirSync(TempDir);
}
function GetElFromInforPath(search, info) {
  for (var i in info[0]) {
    if (i == search) {
      return info[0][i];
    }
  }
  return null;
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
  require("@electron/remote/main").enable(win.webContents);
}

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
if (!fs.existsSync(AppDataDir + "/CosmicComics_data")) {
  fs.mkdirSync(AppDataDir + "/CosmicComics_data");
}
if (!fs.existsSync(AppDataDir + "/CosmicComics_data/ListOfComics.json")) {
  fs.writeFileSync(
    AppDataDir + "/CosmicComics_data/ListOfComics.json",
    JSON.stringify([], null, 2)
  );
}
if (!fs.existsSync(AppDataDir + "/CosmicComics_data/config.json")) {
  var obj = [
    {
      path: "",
      last_opened: "",
      language: "us",
      update_provider: "",
      ZoomLVL: 10,
      Scroll_bar_visible: true,
      Background_color: "rgb(33,33,33)",
      WebToonMode: false,
      Vertical_Reader_Mode: false,
      Page_Counter: true,
      SideBar: false,
      NoBar: false,
      SlideShow: false,
      SlideShow_Time: 1,
      Rotate_All: 0,
      Margin: 0,
      Manga_Mode: false,
      No_Double_Page_For_Horizontal: false,
      Blank_page_At_Begginning: false,
      Double_Page_Mode: false,
      Automatic_Background_Color: false,
      magnifier_zoom: 1,
      magnifier_Width: 100,
      magnifier_Height: 100,
      magnifier_Radius: 0,
      reset_zoom: false,
      force_update: false,
      skip: false,
      display_style: 0,
      theme: "default.json",
      theme_date: true,
    },
  ];
  fs.writeFileSync(
    AppDataDir + "/CosmicComics_data/config.json",
    JSON.stringify(obj, null, 2)
  );
}
if (!fs.existsSync(AppDataDir + "/CosmicComics_data/FirstImageOfAll")) {
  fs.mkdirSync(AppDataDir + "/CosmicComics_data/FirstImageOfAll");
}
if (!fs.existsSync(AppDataDir + "/CosmicComics_data/bookmarks.json")) {
  fs.writeFileSync(
    AppDataDir + "/CosmicComics_data/bookmarks.json",
    JSON.stringify([], null, 2)
  );
}
var checkexistingfile = fs.readdirSync(AppDataDir + "/CosmicComics_data");
checkexistingfile.forEach((file) => {
  if (file.includes(".exe") || file.includes(".msi")) {
    fs.unlinkSync(AppDataDir + "/CosmicComics_data/" + file);
  }
});
if (fs.existsSync(AppDataDir + "/CosmicComics_data/unrar_bin") == false) {
  fs.mkdirSync(AppDataDir + "/CosmicComics_data/unrar_bin");
}
if (
  fs.existsSync(AppDataDir + "/CosmicComics_data/unrar_bin/UnRAR.exe") ==
    false &&
  process.platform == "win32"
) {
  fs.copyFileSync(
    __dirname + "/node_modules/unrar-binaries/bin/win32/unrar.exe",
    AppDataDir + "/CosmicComics_data/unrar_bin/UnRAR.exe"
  );
}
function openWindow() {
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

  win.loadURL(__dirname + "/viewer.html?" + process.argv[1]);
}
var tdate = new Date().getMonth();
var themebydate = Get_From_Config(
  "theme_date",
  JSON.parse(fs.readFileSync(AppDataDir + "/CosmicComics_data/config.json"))
);
if (themebydate === true) {
  if (tdate === 09) {
    Modify_JSON_For_Config(
      AppDataDir + "/CosmicComics_data/config.json",
      "theme",
      "[EVENT] - Halloween.json"
    );
  }else if (tdate === 11) {
    Modify_JSON_For_Config(
      AppDataDir + "/CosmicComics_data/config.json",
      "theme",
      "[EVENT] - X-Mas.json"
    );
  } else {
    console.log("No theme correspond to this date");
  }
} else {
  console.log("Theme by Date disabled");
}

function Modify_JSON_For_Config(json, tomodify, modification) {
  var config_JSON = fs.readFileSync(json);
  var config = JSON.parse(config_JSON);
  for (var i in config) {
    config[i][tomodify] = modification;
  }
  var config_JSON_Final = JSON.stringify(config, null, 2);
  fs.writeFileSync(json, config_JSON_Final);
}
function Get_From_Config(what_you_want, data) {
  for (var i in data[0]) {
    if (i == what_you_want) {
      return data[0][i];
    }
  }
  return null;
}
app.whenReady().then(() => {
  try {
    if (
      process.argv[1].includes(".cbz") ||
      process.argv[1].includes(".cbr") ||
      process.argv[1].includes(".cbt") ||
      process.argv[1].includes(".cb7") ||
      process.argv[1].includes(".rar") ||
      process.argv[1].includes(".zip") ||
      process.argv[1].includes(".tar") ||
      process.argv[1].includes(".7z")
    ) {
      openWindow();
    } else {
      createWindow();
    }
  } catch (error) {
    console.log(error);
    createWindow();
  }
});
app.setAsDefaultProtocolClient("cosmic-comics", process.execPath);
