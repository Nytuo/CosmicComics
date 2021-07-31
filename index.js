const { dialog, shell, remote } = require("electron");
const { Menu, MenuItem } = remote;
const fs = require("fs");
const patha = require("path");
const ValidatedExtension = ["cbr", "cbz", "pdf", "zip"];
const SevenBin = require("7zip-bin");
const Seven = require("node-7z");
const Path27Zip = SevenBin.path7za;
var Unrar = require("unrar");
const { electron } = require("process");
const { get } = require("https");
var imagelink = "null";
var nabc = 0;
var dirnamew = __dirname.replaceAll("\\", "/");
var listOfImages = [];
var wichname = "";
var folderRootPath = [];
var favonly = false;
var readonly = false;
var unreadonly = false;
var readingonly = false;
var popper = require("@popperjs/core");
var bootstrap = require("bootstrap");
var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
var CosmicComicsData = parentfolder3 + "/CosmicComics_data";
if (process.platform == "win32"){
  CosmicComicsData = parentfolder3 + "/CosmicComics_data";
}else if (process.platform == "linux") {
  CosmicComicsData = remote.app.getPath("documents")+ "/CosmicComics_data"
}
var GetAllIMG = false;
const DRPC = require("discord-rpc");
const { error } = require("console");
const ClientID = "870352308062539796";
const rpc = new DRPC.Client({ transport: "ipc" });
const startTimestamp = new Date();
function lang(langg) {
  var file = fs.readFileSync(__dirname + "/languages/" + langg + ".json");
  var JSONRes = JSON.parse(file);
  return JSONRes[0];
}
function GetLANGINFO() {
  var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(configFile);
  var configlang = GetElFromInforPath("language", parsedJSON);
  return lang(configlang);
}
var language = GetLANGINFO();

function setActivity() {
  rpc.setActivity({
    details: language["in_menu"],
    state: language["navinfolder"],
    startTimestamp,
    largeImageKey: "logo",
    largeImageText: "   ",
    smallImageKey: "   ",
    smallImageText: "   ",
    instance: false,
  });
}
rpc.on("ready", () => {
  setActivity();
  setInterval(setActivity(), 15e3);
});
rpc.login({ clientId: ClientID }).catch(console.error);
document.getElementById("version").innerHTML =
  language["version"] + ": " + remote.app.getVersion();
var getFolderJSON = getfolderfromJSON(CosmicComicsData + "/config.json");
if (getFolderJSON != null && getFolderJSON != "") {
  document.getElementById("overlaymsg").innerHTML =
    language["overlaymsg_refolder"];
  setTimeout(() => {
    document.getElementById("overlaymsg").innerHTML =
      language["overlaymsg_piracy"];
  }, 5000);
  var listfolder = [];
  listfolder.push(getFolderJSON);
  folderRootPath.push(listfolder[0]);
  openFolderRoutine(listfolder);
}

function openFolder() {
  let result = remote.dialog.showOpenDialogSync({
    properties: ["openDirectory"],
  });
  if (result) {
    document.getElementById("overlaymsg").innerHTML =
      language["overlaymsg_opening"];
    setTimeout(() => {
      document.getElementById("overlaymsg").innerHTML =
        language["overlaymsg_takecare"];
    }, 5000);
    folderRootPath.push(result[0]);
    ModifyJSONFileForPath(CosmicComicsData + "/config.json", "path", result[0]);
    openFolderRoutine(result);
  }
}
function obliviate() {
  ModifyJSONFileForPath(CosmicComicsData + "/config.json", "path", "");
  window.location.reload();
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
function GetElFromInforPath(search, info) {
  for (var i in info[0]) {
    if (i == search) {
      return info[0][i];
    }
  }
  return null;
}
function refreshFolder() {
  window.location.href = window.location.href;
}
function getfolderfromJSON(json) {
  var configFile = fs.readFileSync(json);
  var parsedJSON = JSON.parse(configFile);
  return GetElFromInforPath("path", parsedJSON);
}
function ContinueAfterExtrImg(
  FolderResults,
  result,
  favonly,
  readonly,
  unreadonly,
  readingonly
) {
  if (GetAllIMG == true) {
    loadContents(
      FolderResults,
      result[0],
      favonly,
      readonly,
      unreadonly,
      readingonly
    );
  } else if (GetAllIMG == null) {
    alert(language["err_img"]);
  } else {
    setTimeout(() => {
      ContinueAfterExtrImg(
        FolderResults,
        result,
        favonly,
        readonly,
        unreadonly,
        readingonly
      );
    }, 500);
  }
}
function openFolderRoutine(folder) {
  document.getElementById("opnfld").onclick = "";
  document.getElementById("opnfld").setAttribute("disabled", "");
  document.getElementById("overlay").style.display = "block";
  setTimeout(() => {
    var result = folder;
    if (result) {
      var FolderRes = DetectFilesAndFolders(result[0]);
      /*document.getElementById("p").innerHTML =
        "Location: " + result + " -- Total: " + FolderRes.length;*/
      //lancer le unzip des premiers de chaque
      var AllFolderRes = DetectAllFilesAndFolders(result[0]);
      AllFolderResults = CheckCorrectExt4File(AllFolderRes, ValidatedExtension);
      GetTheFirstImageOfComicsByFolder(AllFolderResults);
      FolderResults = CheckCorrectExt4File(FolderRes, ValidatedExtension);
      FolderResults.forEach((file) => {
        var stat = fs.statSync(file);
        var name = patha.basename(file);
        var realname = name.split(".");
        realname = realname[0];
        var shortname = GetTheName(realname);
        var Info = GetInfoFromJSON(
          CosmicComicsData + "/ListOfComics.json",
          shortname
        );
        if (
          GetElFromInfo("read", Info) == "undefined" ||
          GetElFromInfo("read", Info) == null
        ) {
          if (stat.isDirectory()) {
            var obj = {
              name: shortname,
              read: false,
              reading: false,
              unread: true,
              favorite: false,
              last_page: 0,
              folder: true,
            };

            SaveInfoToJSON(obj, CosmicComicsData + "/ListOfComics.json");
          } else {
            var obj = {
              name: shortname,
              read: false,
              reading: false,
              unread: true,
              favorite: false,
              last_page: 0,
              folder: false,
            };

            SaveInfoToJSON(obj, CosmicComicsData + "/ListOfComics.json");
          }
        }
      });
      ContinueAfterExtrImg(
        FolderResults,
        result,
        favonly,
        readonly,
        unreadonly,
        readingonly
      );
    } else {
      document
        .getElementById("opnfld")
        .setAttribute("onclick", "openFolderDialog()");
      document.getElementById("opnfld").removeAttribute("disabled");
      document.getElementById("overlay").style.display = "none";
    }
  }, 500);
}
function CheckCorrectExt4File(folderRes, validedextension) {
  FolderResults = [];
  folderRes.forEach((file) => {
    var stat = fs.statSync(file);
    var ext = "";
    if (!stat.isDirectory()) {
      ext = file.split(".").pop();
      ext = ext.toLowerCase();
    }
    if (validedextension.includes(ext)) {
      FolderResults.push(file);
    } else {
      if (stat.isDirectory()) {
        FolderResults.push(file);
      } else {
      }
    }
  });
  return FolderResults;
}

function ModifyJSONFile(json, tomod, mod, name) {
  //check si obj exist pour remplacer valeur
  var configFile = fs.readFileSync(json);
  var config = JSON.parse(configFile);
  for (var i in config) {
    for (var j in config[i]) {
      if (config[i][j] == name) {
        console.log(config);
        config[i][tomod] = mod;
        console.log(config);
      }
    }
  }
  var configJSON = JSON.stringify(config, null, 2);
  fs.writeFileSync(json, configJSON);
}
function SaveInfoToJSON(obj, json) {
  //check si obj exist pour remplacer valeur
  var configFile = fs.readFileSync(json);
  var config = JSON.parse(configFile);
  config.push(obj);
  var configJSON = JSON.stringify(config, null, 2);
  fs.writeFileSync(json, configJSON);
}
function GetInfoFromJSON(json, name) {
  var data = fs.readFileSync(json);
  var info = JSON.parse(data);
  var Info = GetInfo("name", info, name);
  return Info;
}
function GetInfo(search, info, name) {
  for (var i in info) {
    for (var j in info[i]) {
      if (j == search) {
        if (name == info[i][j]) {
          return info[i];
        }
      }
    }
  }
  return null;
}
function GetElFromInfo(search, info) {
  for (var i in info) {
    if (i == search) {
      return info[i];
    }
  }
  return null;
}
function RightClick(object = HTMLAnchorElement) {
  wichname = object.style.backgroundImage;
  wichname = wichname.split("/");
  wichname = wichname[wichname.length - 2];
  console.log(wichname);
}
function loadContents(
  FolderRes,
  root,
  favonly,
  readonly,
  unreadonly,
  readingonly
) {
  var n = 0;
  listOfImages = [];
  document.getElementById("overlay").style.display = "block";
  FolderResults.forEach((file) => {
    var stat = fs.statSync(file);
    var name = patha.basename(file);
    var realname = name.split(".");
    realname = realname[0];
    var shortname = GetTheName(realname);
    var Info = GetInfoFromJSON(
      CosmicComicsData + "/ListOfComics.json",
      shortname
    );
    if (
      GetElFromInfo("read", Info) == "undefined" ||
      GetElFromInfo("read", Info) == null
    ) {
      if (stat.isDirectory()) {
        var obj = {
          name: shortname,
          read: false,
          reading: false,
          unread: true,
          favorite: false,
          last_page: 0,
          folder: true,
        };

        SaveInfoToJSON(obj, CosmicComicsData + "/ListOfComics.json");
      } else {
        var obj = {
          name: shortname,
          read: false,
          reading: false,
          unread: true,
          favorite: false,
          last_page: 0,
          folder: false,
        };

        SaveInfoToJSON(obj, CosmicComicsData + "/ListOfComics.json");
      }
    }
  });
  FolderRes.forEach((path) => {
    var stat = fs.statSync(path);
    var name = patha.basename(path);
    var realname = name.split(".");
    realname = realname[0];
    var shortname = GetTheName(realname);
    var Info = GetInfoFromJSON(
      CosmicComicsData + "/ListOfComics.json",
      shortname
    );
    var readed = GetElFromInfo("read", Info);
    var reading = GetElFromInfo("reading", Info);
    var favorite = GetElFromInfo("favorite", Info);
    if (stat.isDirectory()) {
      var node = document.createTextNode(realname);
      invertedPath = path.replaceAll("\\", "/");
      if (fs.existsSync(invertedPath + "/folder.cmc")) {
        imagelink = invertedPath + "/folder.cmc";
        console.log(imagelink);
      } else {
        imagelink = "Images/folderDefault.png";
      }
    } else if (
      fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)
    ) {
      var node = document.createTextNode(realname);
      var FIOA = fs.readdirSync(
        CosmicComicsData + "/FirstImageOfAll/" + shortname
      );
      var CCDN = CosmicComicsData.replaceAll("\\", "/");
      imagelink = CCDN + "/FirstImageOfAll/" + shortname + "/" + FIOA[0];
    } else {
      console.log(shortname + "/" + shortname + ".jpg not found");
      var node = document.createTextNode(realname);
      imagelink = "Images/fileDefault.png";
    }
    const aContainer = document.createElement("a");
    const spanContainer = document.createElement("span");

    aContainer.href = "#";
    listOfImages.push(imagelink);
    spanContainer.style = "transform: translateZ(20px);color:white;";
    if (stat.isDirectory()) {
      const imgNode = document.createElement("img");
      imgNode.src = "";
      imgNode.style = "padding-top: 330px";
      aContainer.appendChild(imgNode);
      spanContainer.style =
        "padding-top: 20px;font-size: 30px;line-height: 30px;";
    } else if (readed) {
      const RibbonNode = document.createElement("img");
      RibbonNode.src = "Images/vertribbon.png";
      RibbonNode.style = "padding-left: 207px";
      aContainer.appendChild(RibbonNode);
    } else if (reading) {
      const RibbonNode = document.createElement("img");
      RibbonNode.src = "Images/orangeribbon.png";
      RibbonNode.style = "padding-left: 207px";
      aContainer.appendChild(RibbonNode);
    } else {
      const RibbonNode = document.createElement("img");
      RibbonNode.style = "padding-top: 87px";
      aContainer.appendChild(RibbonNode);
    }
    if (favorite) {
      const fav = document.createElement("img");
      fav.src = "Images/outline_favorite_black_24dp.png";
      fav.style =
        "padding-top:310px;padding-left:240px;display:flex;position: relative";
      aContainer.appendChild(fav);
    } else if (stat.isDirectory()) {
      const fav = document.createElement("img");
      fav.style = "padding-top:110px; display:flex";
      aContainer.appendChild(fav);
    } else {
      const fav = document.createElement("img");
      fav.style = "padding-top:360px; display:flex";
      aContainer.appendChild(fav);
    }
    aContainer.setAttribute("data-tilt", "");
    aContainer.className = "logo";

    aContainer.id = "id" + n;
    if (aContainer.addEventListener) {
      if (stat.isDirectory()) {
        aContainer.addEventListener("click", function () {
          console.log("tets");
          launchDetect(path, root);
        });
      } else {
        aContainer.addEventListener("click", function () {
          ModifyJSONFile(
            CosmicComicsData + "/ListOfComics.json",
            "reading",
            true,
            shortname
          );
          ModifyJSONFile(
            CosmicComicsData + "/ListOfComics.json",
            "unread",
            false,
            shortname
          );
          ModifyJSONFileForPath(
            CosmicComicsData + "/config.json",
            "last_opened",
            path
          );
          window.location.href = "viewer.html?" + path;
        });
        aContainer.addEventListener("contextmenu", function (e) {
          e.preventDefault;
          RightClick(this);
        });
      }
    }
    n++;
    spanContainer.appendChild(node);
    const element = document.getElementById("ContainerExplorer");
    aContainer.appendChild(spanContainer);
    /*aContainer.classList.add("animate__animated", "animate__fadeInDown", "animate____delay-2s")*/
    element.appendChild(aContainer);
  });
  preloadImage(listOfImages, n);
}
var preloadedImages = [];
function preloadImage(listImages, n) {
  for (var i = 0; i < listImages.length; i++) {
    preloadedImages[i] = new Image();
    preloadedImages[i].src = listImages[i];
  }
  setTimeout(() => {
    LoadImages(n);
    loadTiltScript();
  }, 500);
}
function LoadImages(numberOf) {
  for (let i = 0; i < numberOf; i++) {
    /* var elch = document.getElementById("id"+i).firstElementChild
    document.getElementById("id"+i).removeChild(elch) */
    document
      .getElementById("id" + i)
      .classList.add("animate__animated", "animate__fadeIn");
    try {
      document.getElementById("id" + i).style.backgroundImage =
        "url('" + listOfImages[i] + "')";
    } catch (error) {
      document.getElementById("id" + i).style.backgroundImage =
        "url('Images/fileDefault.png')";
    }
    document.getElementById("overlay").style.display = "none";
  }
}
function launchDetect(dir, root) {
  var parent = document.getElementById("ContainerExplorer");
  var parento = document.getElementById("controller");

  var child = parent.lastElementChild;
  while (child) {
    parent.removeChild(child);
    child = parent.lastElementChild;
  }

  if (dir != root) {
    const btn = document.getElementById("GotoRoot");
    if (btn.addEventListener) {
      btn.addEventListener("click", function () {
        /*btn.removeEventListener("click")*/
        launchDetect(root, root);
      });
    }
    const btnreturn = document.getElementById("gotoback");
    if (btnreturn.addEventListener) {
      btnreturn.addEventListener("click", function () {
        var adirname = patha.basename(dir);
        var backdir = dir.replace("/" + adirname, "");
        if (backdir == root) {
          /*btnreturn.removeEventListener("click",);*/
        }
        launchDetect(backdir, root);
      });
    }
  }

  var contents = DetectFilesAndFolders(dir);
  FolderResults = CheckCorrectExt4File(contents, ValidatedExtension);
  loadContents(FolderResults, root, favonly, readonly, unreadonly, readingonly);
}
//Detect files and folders in the current directory (not recursive)
function DetectFilesAndFolders(dir) {
  var result = [];
  fs.readdirSync(dir).forEach(function (file) {
    file = dir + "/" + file;
    var stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
      //result = result.concat(DetectFilesAndFolders(file))
      result = result.concat(file);
    } else {
      result.push(file);
    }
  });
  try {
    result.sort(SortingNumInStr);
  } catch (error) {
    console.log(error);
  }
  return result;
}
var SortingNumInStr = function (a, b) {
  return Number(a.match(/(\d+)/g)[0]) - Number(b.match(/(\d+)/g)[0]);
};

//Detect all folders and files in a directory (recursive)
function DetectAllFilesAndFolders(dir) {
  var result = [];

  fs.readdirSync(dir).forEach(function (file) {
    file = dir + "/" + file;
    var stat = fs.statSync(file);

    if (stat.isDirectory()) {
      var Deeper = DetectAllFilesAndFolders(file);
      result = result.concat(Deeper);
    } else {
      result.push(file);
    }
  });

  return result;
}
function loadTiltScript() {
  var script = document.createElement("script");
  script.src = "js/vanilla-tilt.js";
  script.type = "text/javascript";
  document.getElementsByTagName("body")[0].appendChild(script);
}

function GetTheFirstImageOfComicsByFolder(filesInFolder = [], i = 0) {
  document.getElementById("overlaymsg").innerHTML =
    "Extracting thumbnails " + i + " out of " + filesInFolder.length;
  if (i < filesInFolder.length) {
    CreateFIOAFolder();

    var name = patha.basename(filesInFolder[i]);
    ext = name.split(".").pop();
    name = name.split(".");
    name = name[0];
    var shortname = GetTheName(name);
    CreateFolder(shortname, CosmicComicsData + "/FirstImageOfAll");
    if (fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)) {
      if (
        fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)
          .length == 0
      ) {
        UnZipFirst(
          filesInFolder[i],
          CosmicComicsData + "/FirstImageOfAll/" + shortname,
          shortname,
          ext,
          [
            "*000.jpg",
            "00.jpg",
            "00-copie.jpg",
            "*-00.jpg",
            "*000.png",
            "00.png",
            "00-copie.png",
            "*-00.png",
          ],
          i,
          filesInFolder
        );
      } else {
        GetTheFirstImageOfComicsByFolder(filesInFolder, i + 1);
      }
    } else {
      UnZipFirst(
        filesInFolder[i],
        CosmicComicsData + "/FirstImageOfAll/" + shortname,
        shortname,
        ext,
        [
          "*000.jpg",
          "00.jpg",
          "00-copie.jpg",
          "*-00.jpg",
          "*000.png",
          "00.png",
          "00-copie.png",
          "*-00.png",
        ],
        i,
        filesInFolder
      );
    }
  } else {
    GetAllIMG = true;
    document.getElementById("overlaymsg").innerHTML =
      language["overlaymsg_worst"];
  }
}
function hasNumbers(t) {
  var regex = /\d/g;
  return regex.test(t);
}
function GetTheName(CommonName = "") {
  CommonName = CommonName.replaceAll("-", " ");
  CommonName = CommonName.replaceAll(")", " ");
  CommonName = CommonName.replaceAll("(", " ");
  CommonName = CommonName.replaceAll("[", " ");
  CommonName = CommonName.replaceAll("]", " ");

  var s = CommonName.split(" ");
  var finalName = "";
  s.forEach((el) => {
    if (el != "") {
      if (hasNumbers(el)) {
        finalName += el;
      } else if (isNaN(parseInt(el))) {
        finalName += el[0];
      } else {
        finalName += el;
      }
    }
  });
  return finalName;
}
function CreateFIOAFolder() {
  if (!fs.existsSync(CosmicComicsData + "/FirstImageOfAll")) {
    fs.mkdirSync(CosmicComicsData + "/FirstImageOfAll");
  }
}
function CreateFolder(dirname, dirpath) {
  if (!fs.existsSync(dirpath + "/" + dirname)) {
    fs.mkdirSync(dirpath + "/" + dirname);
  }
}
function UnZipFirst(
  zipPath,
  ExtractDir,
  name,
  ext,
  listofelements,
  indice,
  filesInFolder
) {
  nn = 0;
  if (ext == "zip" || ext == "cbz") {
    var fromfile = "";
    const Stream = Seven.extract(zipPath, ExtractDir, {
      recursive: true,
      $cherryPick: listofelements,
      $bin: Path27Zip,
    });
    Stream.on("data", function (data) {
      fromfile = data.file;
      console.log("DATA FROM UNZIP : " + fromfile);
      GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);

      /*var instt = fs.createReadStream(ExtractDir + "/" + fromfile)
        var outstr = fs.createWriteStream(ExtractDir + "/" + name + "_0.jpg")
        instt.pipe(outstr)
        /*fs.renameSync(
          ExtractDir + "/" + fromfile,
          ExtractDir + "/" + name + "_0.jpg"
        );
        fs.unlinkSync(ExtractDir + "/" + fromfile);*/
    });
    Stream.on("end", function () {
      if (Stream.info.get("Files") == "0") {
        UnZipFirst(
          zipPath,
          ExtractDir,
          name,
          ext,
          [
            "*001.jpg",
            "01.jpg",
            "01-copie.jpg",
            "*-01.jpg",
            "*001.png",
            "01.png",
            "01-copie.png",
            "*-01.png",
          ],
          indice,
          filesInFolder
        );
      }
    });
  }

  if (ext == "rar" || ext == "cbr") {
    if (process.platform == "win32") {
      var archive = new Unrar({
        path: zipPath,
        bin: __dirname + "/UnRAR.exe",
      });
    } else if (process.platform == "linux") {
      var archive = new Unrar({
        path: zipPath,
        bin: __dirname + "/unrar_linux",
      });
    } else if (process.platform == "darwin") {
      var archive = new Unrar({
        path: zipPath,
        bin: __dirname + "/unrar",
      });
    }

    archive.list(function (err, entries) {
      entries.forEach((file) => {
        //if name contains 000.jpg or 001.jpg
        for (var i in file) {
          if (i == "name") {
            var currentName = file[i];
            currentName = currentName.toString();
            if (
              currentName.includes("000.jpg") ||
              currentName.includes("000a.jpg") ||
              currentName.includes("001.jpg") ||
              /*currentName.includes("01.jpg") ||
              currentName.includes("00.jpg") ||*/
              currentName.includes("acvr.jpg")
            ) {
              if (
                currentName.includes("000.jpg") ||
                currentName.includes("000a.jpg") ||
                currentName.includes("acvr.jpg")
              ) {
                nabc = 0;
              } else if (currentName.includes("001.jpg")) {
                nabc = 1;
              }
              var stream = archive.stream(currentName);
              stream.on("error", console.error);
              if (
                !fs.existsSync(ExtractDir + "/" + name + "_" + nabc + ".jpg")
              ) {
                stream.pipe(
                  fs.createWriteStream(
                    ExtractDir + "/" + name + "_" + nabc + ".jpg"
                  )
                );
                GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
              }
            }
          }
        }
      });
    });

    /*cbr(zipPath,ExtractDir+"/"+name, function (err,out){
      if (err) {
        console.log(err)
      }else{
        console.log(out)
      }
    })*/
  }
}
const menu = document.querySelector(".menu");
let menuVisible = false;

const toggleMenu = (command) => {
  menu.style.display = command === "show" ? "block" : "none";
  menuVisible = !menuVisible;
};

const setPosition = ({ top, left }) => {
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  toggleMenu("show");
};

window.addEventListener("click", (e) => {
  if (menuVisible) toggleMenu("hide");
});
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const origin = {
    left: e.clientX,
    top: e.clientY,
  };
  setPosition(origin);
  return false;
});
function markasread() {
  if (wichname != "") {
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "reading",
      false,
      wichname
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "unread",
      false,
      wichname
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "read",
      true,
      wichname
    );
    wichname = "";
  }
}
function markasunread() {
  if (wichname != "") {
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "reading",
      false,
      wichname
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "read",
      false,
      wichname
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "unread",
      true,
      wichname
    );
    wichname = "";
  }
}
function markasreading() {
  if (wichname != "") {
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "reading",
      true,
      wichname
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "read",
      false,
      wichname
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "unread",
      false,
      wichname
    );
    wichname = "";
  }
}
function favorite() {
  if (wichname != "") {
    var Info = GetInfoFromJSON(
      CosmicComicsData + "/ListOfComics.json",
      wichname
    );
    var favorite = GetElFromInfo("favorite", Info);
    if (favorite) {
      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "favorite",
        false,
        wichname
      );
    } else {
      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "favorite",
        true,
        wichname
      );
    }
    wichname = "";
  }
}
function showOnlyFavT() {
  if (favonly == true) {
    favonly = false;
  } else {
    favonly = true;
  }
}
function showOnlyUnread() {
  unreadonly = true;
}
function showOnlyRead() {
  readonly = true;
}
function showOnlyReading() {
  readingonly = true;
}
function continuereading() {
  var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(configFile);
  var path = GetElFromInforPath("last_opened", parsedJSON);
  window.location.href = "viewer.html?" + path;
}
function OpenFileOnce() {
  let result = remote.dialog.showOpenDialogSync({
    properties: ["openFile"],
  });
  window.location.href = "viewer.html?" + result[0];
}
function openBOOKM(path) {
  window.location.href = "viewer.html?" + path;
}
function listBM() {
  var data = fs.readFileSync(CosmicComicsData + "/bookmarks.json");
  var info = JSON.parse(data);
  console.log(info);
  info.forEach((file) => {
    if (file["bookmarked"] == true) {
      const btn = document.createElement("button");
      console.log(
        "openBOOKM('" + file["path"] + "&page=" + file["page"] + "');"
      );
      btn.addEventListener("click", function () {
        openBOOKM(file["path"] + "&page=" + file["page"]);
      });

      btn.className = "btn btn-primary";
      btn.style = "margin:5px";
      btn.innerHTML =
        file["name"] +
        " " +
        language["page"] +
        " " +
        (parseInt(file["page"]) + 1);
      document.getElementById("bookmarkContainer").appendChild(btn);
    }
  });
}
listBM();
new bootstrap.Tooltip(document.getElementById("menuid"), {
  title: language["menu"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("GotoRoot"), {
  title: language["go_root"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("gotoback"), {
  title: language["go_to_back"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_continuereading"), {
  title: language["continue_reading"],
  placement: "bottom",
});
document.getElementById("id_nav").innerHTML = language["menu"];
new bootstrap.Tooltip(document.getElementById("opnfld"), {
  title: language["open_folder"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_bm"), {
  title: language["show_bookmarks"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_forgetfolder"), {
  title: language["forget_folder"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_settings"), {
  title: language["settings"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_refreshFolder"), {
  title: language["refresh_folder"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_opnfile"), {
  title: language["open_file"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_info"), {
  title: language["info"],
  placement: "bottom",
});
document.getElementById("id_about").innerHTML = language["about"];
document.getElementById("createdby").innerHTML = language["createdby"];
document.getElementById("usewhat").innerHTML = language["technology_used"];
document.getElementById("seewhere").innerHTML = language["github_promoted"];
document.getElementById("project").innerHTML = language["license"];
document.getElementById("translated").innerHTML = language["translation"];
document.getElementById("id_bmm").innerHTML = language["bookmark_modal"];
document.getElementById("close_nav").innerHTML = language["close"];
document.getElementById("close_bm").innerHTML = language["close"];
document.getElementById("close_about").innerHTML = language["close"];
document.getElementById("close_settings").innerHTML = language["close"];
document.getElementById("id_settingsmod").innerHTML = language["settings"];
document.getElementById("languages").innerHTML = language["languages"];
document.getElementById("beta_test").innerHTML =
  language["betatest"] + document.getElementById("beta_test").innerHTML;

function getAvailableLanguages() {
  return fs.readdirSync(__dirname + "/languages");
}
function getFlags() {
  var lang = getAvailableLanguages();
  var flagslist = [];
  lang.forEach((language) => {
    var l = language.split(".");
    l = l[0];
    flagslist.push("https://flagcdn.com/h24/" + l + ".png");
  });
  return flagslist;
}

function insertFlags() {
  var flagslist = getFlags();
  console.log(flagslist);
  flagslist.forEach((flag) => {
    const flagI = document.createElement("img");
    const AContainer = document.createElement("a");
    var l = flag.split("h24/");
    l = l[1];
    l = l.split(".png");
    l = l[0];
    flagI.src = flag;
    flagI.style.width = "40px";
    flagI.style.height = "auto";

    AContainer.href = "#";
    AContainer.id = "id_lang"+l;

    AContainer.addEventListener("click", () => {
      changeLang(l);
    });
    AContainer.style.margin = "10px";
    AContainer.appendChild(flagI);
    document.getElementById("lang_container").appendChild(AContainer);    
    new bootstrap.Tooltip(document.getElementById("id_lang"+l), {
      title: l,
      placement: "bottom",
    });
  });
}
function changeLang(langa) {
  ModifyJSONFileForPath(CosmicComicsData + "/config.json", "language", langa);
  window.location.reload();
}
insertFlags();
//save dans le config.json
