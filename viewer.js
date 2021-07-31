const { dialog, shell } = require("electron");
const { remote } = require("electron");
const fs = require("fs");
const patha = require("path");
const ValidatedExtension = ["cbr", "cbz", "pdf", "zip"];
const ValidatedExtensionV = ["png", "jpg", "jpeg", "bmp"];
const SevenBin = require("7zip-bin");
const Seven = require("node-7z");
const Path27Zip = SevenBin.path7za;
var Unrar = require("unrar");
var imagelink = "null";
var nabc = 0;
var dirnamew = __dirname.replaceAll("\\", "/");
var name1 = patha.basename(GetFilePath());
var realname1 = name1.split(".");
realname1 = realname1[0];
var shortname = GetTheName(realname1);
var toogleBGC = false;
var ColorThief = require("color-thief-browser");
var colorThief = new ColorThief();
var popper = require("@popperjs/core");
var bootstrap = require("bootstrap");
var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});
var popoverTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="popover"]')
);
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl);
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
var rarlength = 0;
const DRPC = require("discord-rpc");
const { error } = require("console");
const ClientID = "870352308062539796";
const rpc = new DRPC.Client({ transport: "ipc" });
const startTimestamp = new Date();
var Dpath = GetFilePath();
var Dnamed = patha.basename(Dpath);
Dnamed = Dnamed.split(".");
var BookName = Dnamed;
var DPageTotal = GetListOfImg(CosmicComicsData + "/comic_tmp").length;
var DPageActu = 1;

function lang(langg) {
  var file = fs.readFileSync(__dirname + "/languages/" + langg + ".json");
  var JSONRes = JSON.parse(file);
  return JSONRes;
}
var language = lang("fr");
console.log(language[0]["salut"]);
function setActivity() {
  rpc.setActivity({
    details: language[0]["reading"],
    state: BookName[0],
    startTimestamp,
    partyMax: DPageTotal,
    partySize: DPageActu,
    partyId: "CCDRPCPrivate",
    largeImageKey: "logo",
    largeImageText: "   ",
    smallImageKey: "   ",
    smallImageText: "   ",
    instance: false,
  });
}
rpc.on("ready", () => {
  setActivity();
  setInterval(function () {
    setActivity();
  }, 30000);
});
rpc.login({ clientId: ClientID }).catch(console.error);
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
  console.log(s);
  s.forEach((el) => {
    console.log(parseInt(el));
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
  console.log(finalName);
  return finalName;
}
function UnZip(zipPath, ExtractDir, name, ext) {
  var n = 0;
  if (fs.existsSync(CosmicComicsData + "/comic_tmp")) {
    fs.rmSync(CosmicComicsData + "/comic_tmp", {
      recursive: true,
    });
    fs.mkdirSync(CosmicComicsData + "/comic_tmp");
  } else {
    fs.mkdirSync(CosmicComicsData + "/comic_tmp");
  }
  fs.writeFileSync(CosmicComicsData + "/comic_tmp/path.txt", zipPath);
  if (ext == "zip" || ext == "cbz") {
    var fromfile = "";

    const Stream = Seven.extract(zipPath, ExtractDir, {
      recursive: true,
      $bin: Path27Zip,
    });
    Stream.on("end", () => {
      var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
      var filepage = GetFilePage();
      console.log(filepage);

      if (filepage != false) {
        var lastpage = filepage;
        document.getElementById("overlay").style.display = "none";
        Reader(listofImg, lastpage);
      } else {
        var lastpage = 0;
        try {
          var info = GetInfoFromJSON(
            CosmicComicsData + "/ListOfComics.json",
            shortname
          );
          lastpage = GetElFromInfo("last_page", info);
        } catch (error) {
          console.log(error);
        }
        document.getElementById("overlay").style.display = "none";
        Reader(listofImg, lastpage);
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
      console.log(entries);
      //tri numérique
      entries.sort((a, b) => {
        let fa = a.name.toLowerCase(),
          fb = b.name.toLowerCase();
        if (fa < fb) {
          return -1;
        }
        if (fa > fb) {
          return 1;
        }
        return 0;
      });
      entries.forEach((file) => {
        for (var i in file) {
          if (i == "name") {
            var currentName = file[i];
            currentName = currentName.toString();
            var stream = archive.stream(currentName);
            stream.on("error", console.error);
            if (!fs.existsSync(CosmicComicsData + "/comic_tmp")) {
              fs.mkdirSync(CosmicComicsData + "/comic_tmp");
            }
            stream.pipe(
              fs.createWriteStream(
                CosmicComicsData + "/comic_tmp/" + name + ".jpg"
              )
            );
            n = parseInt(name) + 1;
            name = Array(5 - String(n).length + 1).join("0") + n;
          }
        }
      });
      postunrar();
    });
  }
}
function postunrar() {
  var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
  var filepage = GetFilePage();
  console.log(filepage);
  if (filepage != false) {
    var lastpage = filepage;
    document.getElementById("overlay").style.display = "none";

    Reader(listofImg, lastpage);
  } else {
    var lastpage = 0;
    try {
      var info = GetInfoFromJSON(
        CosmicComicsData + "/ListOfComics.json",
        shortname
      );
      lastpage = GetElFromInfo("last_page", info);
    } catch (error) {
      console.log(error);
    }
    document.getElementById("overlay").style.display = "none";

    Reader(listofImg, lastpage);
  }
}
function GetFilePath() {
  var HTMLParam = window.location.search;
  HTMLParam = HTMLParam.replace("?", "");
  HTMLParam = HTMLParam.replaceAll("%20", " ");
  HTMLParam = HTMLParam.split("&page=");
  console.log(HTMLParam);
  HTMLParam = HTMLParam[0];
  console.log(HTMLParam);
  return HTMLParam;
}
function GetFilePage() {
  var HTMLParam = window.location.search;
  HTMLParam = HTMLParam.replace("?", "");
  HTMLParam = HTMLParam.replaceAll("%20", " ");
  HTMLParam = HTMLParam.split("&page=");
  console.log(HTMLParam);
  HTMLParam = HTMLParam[1];
  var HN = hasNumbers(HTMLParam);
  if (HN == true) {
    HTMLParam = parseInt(HTMLParam);
    return HTMLParam;
  } else {
    return false;
  }
}
function Viewer() {
  document.getElementById("overlay").style.display = "block";
  var path = GetFilePath();
  var named = patha.basename(path);
  named = named.split(".");
  var ext = named.pop();
  //If the folder doesn't exist then create it and unzip in it
  //Else we check for the path.txt and if it doesn't exist we unzip
  //Else we check if the path.txt is equal to the path if he is not then we unzip
  //Else, the folder is creted, as well as the path.txt and already contains the images
  if (!fs.existsSync(CosmicComicsData + "/comic_tmp")) {
    UnZip(path, CosmicComicsData + "/comic_tmp", "00000", ext);
  } else {
    if (fs.existsSync(CosmicComicsData + "/comic_tmp/path.txt")) {
      if (
        fs.readFileSync(CosmicComicsData + "/comic_tmp/path.txt", "utf-8") !=
        path
      ) {
        UnZip(path, CosmicComicsData + "/comic_tmp", "00000", ext);
      } else {
        var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
        var filepage = GetFilePage();
        console.log(filepage);

        if (filepage != false) {
          var lastpage = filepage;
          document.getElementById("overlay").style.display = "none";

          Reader(listofImg, lastpage);
        } else {
          var lastpage = 0;
          try {
            var info = GetInfoFromJSON(
              CosmicComicsData + "/ListOfComics.json",
              shortname
            );
            lastpage = GetElFromInfo("last_page", info);
          } catch (error) {
            console.log(error);
          }
          document.getElementById("overlay").style.display = "none";

          Reader(listofImg, lastpage);
        }
      }
    } else {
      UnZip(path, CosmicComicsData + "/comic_tmp", "00000", ext);
    }
  }
}

function Reader(listOfImg, page) {
  //document.getElementById("imgViewer").classList.add("animate-CtL")
  LoadBMI(page);
  document.getElementById("imgViewer").src =
    CosmicComicsData + "/comic_tmp/" + listOfImg[page];

  document.getElementById("currentpage").innerHTML =
    language[0]["page"] +
    " " +
    (page + 1) +
    " " +
    language[0]["out_of"] +
    " " +
    listOfImg.length;
  DPageActu = page + 1;
  /*     document.getElementById("imgViewer").classList.add("animate-RtL")
    setTimeout(() => {
    document.getElementById("imgViewer").classList.remove("animate-RtL")
  document.getElementById("imgViewer").classList.remove("animate-CtL")

      
    }, 4000); */
  setTimeout(() => {
    if (toogleBGC == true) {
      var pathBG = CosmicComicsData + "/comic_tmp/" + listOfImg[page];
      var BGColor = GettheBGColor(pathBG);
      document.getElementsByTagName("html")[0].style.backgroundColor =
        "rgb(" + BGColor[0] + "," + BGColor[1] + "," + BGColor[2] + ")";
    }
  }, 50);
}
function GetListOfImg(dirPath) {
  var listoffiles = fs.readdirSync(dirPath);
  var listOfImage = [];
  listoffiles.forEach((file) => {
    var ext = file.split(".").pop();
    if (ValidatedExtensionV.includes(ext)) {
      listOfImage.push(file);
    } else {
      console.log(file + " has an no compatible Viewer Extension: " + ext);
    }
  });
  return listOfImage;
}
function GetCurrentPage() {
  var CurrentPage =
    document.getElementById("currentpage").innerHTML.split(" ")[1] - 1;
  return CurrentPage;
}
function NextPage() {
  window.scrollTo(0, 0);
  var CurrentPage = GetCurrentPage();
  var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
  var max = listofImg.length;
  if (CurrentPage < max - 1) {
    CurrentPage += 1;
    if (currentpage == max - 1) {
      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "reading",
        false,
        shortname
      );
      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "read",
        true,
        shortname
      );
    }
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "last_page",
      CurrentPage,
      shortname
    );
    Reader(listofImg, CurrentPage);
  }
}
function PreviousPage() {
  window.scrollTo(0, 0);

  var CurrentPage = GetCurrentPage();
  var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
  if (CurrentPage != 0) {
    CurrentPage -= 1;
    Reader(listofImg, CurrentPage);
  }
}
/*var lastScrollTop = 0;

// element should be replaced with the actual target element on which you have applied scroll, use window in case of no target element.
document.addEventListener(
  "scroll",
  function () {
    // or window.addEventListener("scroll"....
    var st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"
    if (st > lastScrollTop) {
      console.log("down")
    } else {
      console.log("up")
    }
    if (window.pageYOffset == 0){
      PreviousPage()
    }else if (window.pageYOffset == 2123){
      NextPage()
      
    }
    
    console.log("go n")
    lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
  },
  false
);*/

function FixHeight() {
  var height =
    window.innerHeight - document.getElementsByTagName("nav")[0].offsetHeight;
  document.getElementById("imgViewer").style =
    "height : " + height + "px; width:auto;";
  document.getElementById("imgViewer");
}
function Start() {
  var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
  Reader(listofImg, 0);
}
function End() {
  var listofImg = GetListOfImg(CosmicComicsData + "/comic_tmp");
  var max = listofImg.length - 1;
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "reading",
    false,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "read",
    true,
    shortname
  );
  Reader(listofImg, max);
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
  console.log(info);
  var Info = GetInfo("name", info, name);
  console.log(Info);
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
function markasread() {
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "reading",
    false,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "unread",
    false,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "read",
    true,
    shortname
  );
}
function markasunread() {
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "reading",
    false,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "read",
    false,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "unread",
    true,
    shortname
  );
}
function markasreading() {
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "reading",
    true,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "read",
    false,
    shortname
  );
  ModifyJSONFile(
    CosmicComicsData + "/ListOfComics.json",
    "unread",
    false,
    shortname
  );
}
function ToogleFav() {
  var info = GetInfoFromJSON(
    CosmicComicsData + "/ListOfComics.json",
    shortname
  );
  var res = GetElFromInfo("favorite", info);
  console.log(res);
  if (res == true) {
    document.getElementById("favoicon").innerHTML = "favorite_border";
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "favorite",
      false,
      shortname
    );
  } else if (res == false) {
    document.getElementById("favoicon").innerHTML = "favorite";
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "favorite",
      true,
      shortname
    );
  } else {
    console.log("FAV : Error");
  }
}
window.addEventListener("keydown", (e) => {
  if ((e.code == "Equal" || e.code == "NumpadAdd") && e.ctrlKey == true) {
    ZoomIn();
  } else if (
    (e.code == "Digit6" || e.code == "NumpadSubtract") &&
    e.ctrlKey == true
  ) {
    ZoomOut();
  } else if (e.code == "ArrowLeft") {
    PreviousPage();
  } else if (e.code == "ArrowRight") {
    NextPage();
  } else if (e.ctrlKey == true) {
    ctrlisDown = true;
  }
});
function ZoomIn() {
  document.getElementById("imgViewer").style =
    "height:" +
    (parseInt(document.getElementById("imgViewer").style.height) + 20) +
    "px";
}
function ZoomOut() {
  document.getElementById("imgViewer").style =
    "height:" +
    (parseInt(document.getElementById("imgViewer").style.height) - 20) +
    "px";
}
/*setInterval(() => {
  ctrlisDown = false;
}, 500);*/

function detectMouseWheelDirection(e) {
  var delta = null,
    direction = false;
  if (!e) {
    // if the event is not provided, we get it from the window object
    e = window.event;
  }
  if (e.wheelDelta) {
    // will work in most cases
    delta = e.wheelDelta / 60;
  } else if (e.detail) {
    // fallback for Firefox
    delta = -e.detail / 2;
  }
  if (delta !== null) {
    direction = delta > 0 ? "up" : "down";
  }

  return direction;
}

var ctrlisDown = false;
var maxHeight = 10000000;
var minHeight = 100;
window.addEventListener("mousewheel", function (e) {
  if (ctrlisDown) {
    console.log(ctrlisDown);
    ctrlisDown = false;
    var direc = detectMouseWheelDirection(e);
    console.log(direc);
    if (direc == "down") {
      if (
        parseInt(document.getElementById("imgViewer").style.height) - 100 >
        minHeight
      ) {
        ZoomOut();
      }
    } else if (direc == "up") {
      if (
        parseInt(document.getElementById("imgViewer").style.height) + 100 <
        maxHeight
      ) {
        ZoomIn();
      }
    }
  }
});

function AutoBGC() {
  if (toogleBGC == true) {
    toogleBGC = false;
  } else {
    toogleBGC = true;
  }
}
function GettheBGColor() {
  var img = document.getElementById("imgViewer");
  return colorThief.getColor(img);
}
function FixWidth() {
  document.getElementById("imgViewer").style =
    "width : " + (window.innerWidth - 5) + "px; height:auto;";
  document.getElementById("imgViewer");
}

function TBM() {
  //check if bookmark is already bookmarked
  var data = fs.readFileSync(CosmicComicsData + "/bookmarks.json");
  var info = JSON.parse(data);
  var thepage = GetCurrentPage();
  var newinfo = GetInfo("uid", info, shortname + thepage.toString());
  var path = GetElFromInfo("path", newinfo);
  var page = GetElFromInfo("page", newinfo);
  var bookmarked = GetElFromInfo("bookmarked", newinfo);
  if (path == GetFilePath() && page == GetCurrentPage() && bookmarked == true) {
    ModifyJSONFile(
      CosmicComicsData + "/bookmarks.json",
      "bookmarked",
      false,
      shortname + thepage.toString()
    );
    document.getElementById("BMI").innerHTML = "bookmark_border";
  } else if (
    (path == GetFilePath() || page == GetCurrentPage()) &&
    bookmarked == false
  ) {
    ModifyJSONFile(
      CosmicComicsData + "/bookmarks.json",
      "bookmarked",
      true,
      shortname + thepage.toString()
    );
    document.getElementById("BMI").innerHTML = "bookmark";
  } else if (path != GetFilePath() || page != GetCurrentPage()) {
    SaveInfoToJSON(
      {
        name: shortname,
        path: GetFilePath(),
        page: GetCurrentPage(),
        bookmarked: true,
        uid: shortname + thepage.toString(),
      },
      CosmicComicsData + "/bookmarks.json"
    );
  }
}
function LoadBMI(pagec = 0) {
  try {
    var data = fs.readFileSync(CosmicComicsData + "/bookmarks.json");
    var info = JSON.parse(data);
    var newinfo = GetInfo("uid", info, shortname + pagec.toString());
    var path = GetElFromInfo("path", newinfo);
    var page = GetElFromInfo("page", newinfo);
    var bookmarked = GetElFromInfo("bookmarked", newinfo);
    if (bookmarked == true) {
      document.getElementById("BMI").innerHTML = "bookmark";
    } else {
      document.getElementById("BMI").innerHTML = "bookmark_border";
    }
  } catch (error) {
    console.log(error);
  }
}
new bootstrap.Tooltip(document.getElementById("goback_id"),{
  title: language[0]["go_back"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("magnifier_id"),{
  title: language[0]["magnifier_toggle"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_gostart"),{
  title: language[0]["go_start"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_goprevious"),{
  title: language[0]["go_previous"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("nextpage"),{
  title: language[0]["go_next"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_goend"),{
  title: language[0]["go_end"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_mkread"),{
  title: language[0]["mkread"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_mkreading"),{
  title: language[0]["mkreading"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_mkunread"),{
  title: language[0]["mkunread"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_togglefav"),{
  title: language[0]["toogle_fav"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_fixheight"),{
  title: language[0]["fix_height"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_fixwidth"),{
  title: language[0]["fix_width"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_autobgcolor"),{
  title: language[0]["auto_bg_color"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_zoomin"),{
  title: language[0]["zoom_in"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_zoomout"),{
  title: language[0]["zoom_out"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_toogleBookMark"),{
  title: language[0]["Bookmark"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_magnifiermod"),{
  title: language[0]["magnifier_mod"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("zoomlvl"),{
  title: language[0]["zoom"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("widthlvl"),{
  title: language[0]["width"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("heightlvl"),{
  title: language[0]["height"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("Radiuslvl"),{
  title: language[0]["radius"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("magnifier_note"),{
  title: language[0]["magnifier_note"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_spawnmagnifier"),{
  title: language[0]["spawn_magnifier"],
  placement: "bottom"
})
new bootstrap.Tooltip(document.getElementById("id_destroymagnifier"),{
  title: language[0]["destroy_magnifier"],
  placement: "bottom"
})