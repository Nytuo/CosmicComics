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
//Declaring variables
var OnlineVersion = "";
const os = require("os");
var osarch = os.arch();
const fs = require("fs");
const download = require("download");

const {shell, webContents} = require("electron");
const remote = require("@electron/remote");
const app = remote.app;
var debuging = false;
var CosmicComicsData = app.getPath("userData") + "/CosmicComics_data";
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
if (fs.existsSync(parentfolder3 + "/portable.txt")) {
    CosmicComicsData = parentfolder3 + "/AppData";
}
try {
    fs.readdirSync(CosmicComicsData);
} catch (error) {
    console.log(error);
    CosmicComicsData = __dirname + "/AppData";
}
var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
var parsedJSON = JSON.parse(configFile);
var updateProvider = GetElFromInforPath("update_provider", parsedJSON);
var forceupdate = GetElFromInforPath("force_update", parsedJSON);

//Get elements from the config.json
function GetElFromInforPath(search, info) {
    for (var i in info[0]) {
        if (i === search) {
            return info[0][i];
        }
    }
    return null;
}

//Opening a new window (the main one (index.html))
function openWindow() {
    const BrowserWindow = require("@electron/remote").BrowserWindow;
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
    remote.require("@electron/remote/main").enable(win.webContents);

    close();
}

//setting GitHub Content for ddownloading content of GitHub file
var githubContent = require("github-content");
var options = {
    owner: "Nytuo",
    repo: "CosmicComics",
    branch: "master",
};
var gc = new githubContent(options);

//Select the update provider corresponding to your OS and installed file extension
function selectOS() {
    var val = document.getElementById("selectOS").value;
    ModifyJSONFileForPath(
        CosmicComicsData + "/config.json",
        "update_provider",
        val
    );
    window.location.reload();
}

//set the Language
var language = Get_Lang();

//Get the Lang from the JSON
function Get_Lang() {
    var config_JSON = fs.readFileSync(CosmicComicsData + "/config.json");
    var parsedJSON = JSON.parse(config_JSON);
    var config_lang = Get_From_Config("language", parsedJSON);
    return lang_from_JSON(config_lang);
}

function Get_From_Config(what_you_want, data) {
    for (var i in data[0]) {
        if (i === what_you_want) {
            return data[0][i];
        }
    }
    return null;
}

//Get the language values from the language JSON
function lang_from_JSON(language) {
    var file = fs.readFileSync(__dirname + "/languages/" + language + ".json");
    var JSONRes = JSON.parse(file);
    return JSONRes[0];
}

function ModifyJSONFileForPath(json, tomod, mod) {
    //check si obj exist pour remplacer valeur
    var configFile = fs.readFileSync(json);
    var config = JSON.parse(configFile);
    for (var i in config) {
        config[i][tomod] = mod;
    }
    var configJSON = JSON.stringify(config, null, 2);
    fs.writeFileSync(json, configJSON);
}

//getting the version file from GitHub
gc.file("Version.txt", function (err, file) {
    if (err) return console.log(err);
    if (debuging === true) return 0;
    OnlineVersion = file.contents.toString();
    OnlineVersion = OnlineVersion.split("\n");
    OnlineVersion = OnlineVersion[0];
    var OnlineVersionNum = OnlineVersion.replaceAll(".", "");
    OnlineVersionNum = parseInt(OnlineVersionNum);
    var proverNum = app.getVersion().replaceAll(".", "").replace("v", "");
    proverNum = parseInt(proverNum);
    if (forceupdate === true) {
        proverNum = 0;
        ModifyJSONFileForPath(
            CosmicComicsData + "/config.json",
            "force_update",
            false
        );
    }

    //Choose what to do depending of your choice
    if (updateProvider === "") {
        sendMessage(language["provider_not_set"]);
        remote.getCurrentWindow().setSize(500, 250);
        document.getElementById("selectOS").style.display = "block";
    } else if (
        updateProvider === "appimage") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".AppImage", "linux");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "snapcraft") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_snapcraft"]);
            openWindow();
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            openWindow();
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            openWindow();
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "msstore") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_via_MSStore"]);
            openWindow();
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            openWindow();
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);

            openWindow();
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "rpm") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".rpm", "linux");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "nsis") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".exe", "win");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "wzip") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".zip", "win");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "lzip") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".zip", "linux");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "snap") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".snap", "linux");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "deb") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".deb", "linux");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "mac") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".dmg", "mac");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "mzip") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_available"]);
            DLUpdate(".zip", "mac");
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            setTimeout(() => {
                openWindow();
            }, 2000);
        } else {
            sendMessage(language["error_update"]);
        }
    } else if (updateProvider === "dev") {
        if (OnlineVersionNum > proverNum) {
            sendMessage(language["update_manual"]);
            openWindow();
        } else if (OnlineVersionNum < proverNum) {
            sendMessage(language["newer_version"]);
            openWindow();
        } else if (OnlineVersionNum === proverNum) {
            sendMessage(language["no_update"]);
            openWindow();
        } else {
            sendMessage(language["error_update"]);
        }
    } else {
        sendMessage(language["update_no_detect"]);
    }
});

//Convert Bytes to size for downloading
function bytesToSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "n/a";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    if (i === 0) return `${bytes} ${sizes[i]})`;
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

//notification
function sendMessage(message) {
    document.getElementById("msgloading").innerHTML = message;
}

//downloading the update
async function DLUpdate(executable, endname = "") {
    var arch = osarch;
    if (process.platform === "win32" || process.platform === "linux") {
        var starttime = new Date().getTime();
        await download(
            "https://github.com/Nytuo/CosmicComics/releases/download/v" +
            OnlineVersion +
            "/Cosmic-Comics_" +
            OnlineVersion +
            "_" +
            endname +
            "_" +
            arch +
            executable,
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

                sendMessage(language["installing"]);
                shell.openPath(
                    CosmicComicsData +
                    "/Cosmic-Comics_" +
                    OnlineVersion +
                    "_" +
                    endname +
                    "_" +
                    arch +
                    executable
                );
            });
    } else {
        sendMessage(language["not_supported"]);
    }
}

var currenttheme = Get_From_Config(
    "theme",
    JSON.parse(fs.readFileSync(CosmicComicsData + "/config.json"))
);

function Themes() {
    if (currenttheme !== "default.json") {
        if (currenttheme === "Halloween.json") {
            document.getElementById("logo_id").src = "Images/Logo_h.png";
        } else if (currenttheme === "Xmas.json") {
            document.getElementById("logo_id").src = "Images/Logo_n.png";
        }
        var config_JSON = fs.readFileSync(__dirname + "/themes/" + currenttheme);
        var parsedJSON = JSON.parse(config_JSON);
        var linkBG = Get_From_Config("linkBG", parsedJSON);
        var theme_BG = Get_From_Config("BG", parsedJSON);
        var theme_FG = Get_From_Config("FG", parsedJSON);
        var theme_O2 = Get_From_Config("O2", parsedJSON);
        var theme_notifBG = Get_From_Config("notifBG", parsedJSON);
        var theme_button_card = Get_From_Config("button_card", parsedJSON);
        var theme_progress = Get_From_Config("progress", parsedJSON);
        var theme_hover_close = Get_From_Config("hover_close", parsedJSON);
        var theme_btn_FG = Get_From_Config("btn_FG", parsedJSON);
        var theme_btn_BG = Get_From_Config("btn_BG", parsedJSON);
        var theme_btn_border = theme_btn_BG;
        var theme_btn_hover = Get_From_Config("btn_hover", parsedJSON);
        var theme_btn_FG_s = Get_From_Config("btn_FG_s", parsedJSON);
        var theme_btn_BG_s = Get_From_Config("btn_BG_s", parsedJSON);
        var theme_btn_border_s = theme_btn_BG_s;
        var theme_btn_hover_s = Get_From_Config("btn_hover_s", parsedJSON);

        document.getElementById("prgs").style.backgroundColor = Get_From_Config(
            "progress_color",
            parsedJSON
        );
        var theme_hover_listview = Get_From_Config("hover_listview", parsedJSON);
        document.getElementById("progressbar").className = Get_From_Config(
            "progressbar_progresswhite_progressblack",
            parsedJSON
        );
      var  theme_BG_CI = Get_From_Config("BG_CI", parsedJSON);

        for (let i = 0; i < document.querySelectorAll("p").length; i++) {
            document.getElementsByTagName("p")[i].style.color = theme_FG;
        }

        if (theme_O2.includes("http")) {
            document.getElementsByTagName("html")[0].style.backgroundRepeat =
                "no-repeat";
            document.getElementsByTagName("html")[0].style.backgroundSize = "cover";
            document.getElementsByTagName("html")[0].style.backgroundImage =
                "url('" + theme_O2 + "')";
        } else {
            document.getElementsByTagName("html")[0].style.backgroundColor = theme_BG;
        }
    }
}

Themes();
