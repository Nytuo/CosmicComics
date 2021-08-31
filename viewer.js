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
//#region Variables
const { dialog, shell } = require("electron");
const fs = require("fs");
const patha = require("path");
const ValidatedExtension = [
  "cbr",
  "cbz",
  "pdf",
  "zip",
  "7z",
  "cb7",
  "rar",
  "tar",
  "cbt",
];
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
const app = remote.app;
var CosmicComicsData = app.getPath("userData") + "/CosmicComics_data";
var CosmicComicsTemp = app.getPath("temp") + "/CosmicComics";
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
if (fs.existsSync(parentfolder3+"/portable.txt")){
  CosmicComicsData = parentfolder3+"/AppData"
  CosmicComicsTemp = parentfolder3+"/TMP"
}
var CosmicComicsTempI = CosmicComicsTemp + "/current_book/";
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
var DPageTotal = GetListOfImg(CosmicComicsTempI).length;
var DPageActu = 1;
var DoublePageMode = false;
var BlankFirstPage = false;
var DPMNoH = false;
var wasDPM = false;
var PPwasDPM = false;
var mangaMode = false;
var language = GetLANGINFO();

//toolTips
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
//#endregion

//get language reference for the selected language
function lang(langg) {
  var file = fs.readFileSync(__dirname + "/languages/" + langg + ".json");
  var JSONRes = JSON.parse(file);
  return JSONRes;
}

//get element from config.json
function GetElFromInforPath(search, info) {
  for (var i in info[0]) {
    if (i == search) {
      return info[0][i];
    }
  }
  return null;
}

//get lang from config.json
function GetLANGINFO() {
  var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(configFile);
  var configlang = GetElFromInforPath("language", parsedJSON);
  return lang(configlang);
}

//setting discord activity
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

//getting the ID of the book
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

//Send Notification to User
function Toastifycation(message, BGColor = "#333", FrontColor = "#ffffff") {
  var x = document.getElementById("snackbar");

  x.className = "show";
  x.innerHTML = message;
  x.style.backgroundColor = BGColor;
  x.style.color = FrontColor;

  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 3000);
}

//UnZip the archive
function UnZip(zipPath, ExtractDir, name, ext) {
  var n = 0;
  if (fs.existsSync(CosmicComicsTempI)) {
    fs.rmSync(CosmicComicsTempI, {
      recursive: true,
    });
    fs.mkdirSync(CosmicComicsTempI);
  } else {
    fs.mkdirSync(CosmicComicsTempI);
  }
  fs.writeFileSync(CosmicComicsTempI + "/path.txt", zipPath);

  if (ext == "pdf") {
    alert(language[0]["pdf"]);
    openWindow(zipPath);
    window.location.href = "index.html";
  }

  if (
    ext == "zip" ||
    ext == "cbz" ||
    ext == "7z" ||
    ext == "cb7" ||
    ext == "tar" ||
    ext == "cbt"
  ) {
    var fromfile = "";

    const Stream = Seven.extract(zipPath, ExtractDir, {
      recursive: true,
      $bin: Path27Zip,
    });
    Stream.on("end", () => {
      Toastifycation(language[0]["extraction_completed"], "#00C33C");

      var listofImg = GetListOfImg(CosmicComicsTempI);
      var filepage = GetFilePage();
      preloadImage(listofImg);
      console.log(filepage);

      if (filepage != false) {
        var lastpage = filepage;
        document.getElementById("overlay").style.display = "none";
        setTimeout(() => {
          Reader(listofImg, lastpage);
        }, 1000);
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
        setTimeout(() => {
          Reader(listofImg, lastpage);
        }, 1000);
      }
    });
    Stream.on("error", (err) => {
      console.log("An error occured" + err);
    });
  }

  if (ext == "rar" || ext == "cbr") {
    if (process.platform == "win32") {
      var archive = new Unrar({
        path: zipPath,
        bin: CosmicComicsData + "/unrar_bin/UnRAR.exe",
      });
    } else if (process.platform == "darwin") {
      var archive = new Unrar({
        path: zipPath,
        bin: CosmicComicsData + "/unrar_bin/unrar",
      });
    } else if (process.platform == "linux") {
      var archive = new Unrar({
        path: zipPath,
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
            if (!fs.existsSync(CosmicComicsTempI)) {
              fs.mkdirSync(CosmicComicsTempI);
            }
            stream.pipe(
              fs.createWriteStream(CosmicComicsTempI + name + ".jpg")
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
function openWindow(pathaa) {
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
  });

  win.loadURL(pathaa);
}

//same as the one in the "end" listener of the ZIP but for RAR archive
function postunrar() {
  Toastifycation(language[0]["extraction_completed"], "#00C33C");

  var listofImg = GetListOfImg(CosmicComicsTempI);
  var filepage = GetFilePage();
  preloadImage(listofImg);
  console.log(filepage);
  if (filepage != false) {
    var lastpage = filepage;
    document.getElementById("overlay").style.display = "none";
    setTimeout(() => {
      Reader(listofImg, lastpage);
    }, 1000);
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

    setTimeout(() => {
      Reader(listofImg, lastpage);
    }, 1000);
  }
}

//Getting the File path from the URL Parameters
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

//Getting the page by HTML URL Parameters
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

//Main Fonction, executed onload
function Viewer() {
  Toastifycation(language[0]["extracting"], "#292929");
  document.getElementById("overlay").style.display = "block";
  loadParameters();
  var path = GetFilePath();
  var named = patha.basename(path);
  named = named.split(".");
  var ext = named.pop();
  //If the folder doesn't exist then create it and unzip in it
  //Else we check for the path.txt and if it doesn't exist we unzip
  //Else we check if the path.txt is equal to the path if he is not then we unzip
  //Else, the folder is creted, as well as the path.txt and already contains the images
  if (fs.statSync(path).isDirectory()) {
    CosmicComicsTempI = path + "/";
  }
  if (!fs.existsSync(CosmicComicsTempI)) {
    UnZip(path, CosmicComicsTempI, "00000", ext);
  } else {
    if (fs.statSync(path).isDirectory()) {
      Toastifycation(language[0]["loading_cache"], "#292929");
      var listofImg = GetListOfImg(CosmicComicsTempI);
      if (listofImg == false) {
        alert(
          language[0]["directory_error"] +
            ValidatedExtensionV.toString().toUpperCase() +
            language[0]["directory_error2"]
        );
        window.location.href = "index.html";
      }
      var filepage = GetFilePage();
      preloadImage(listofImg);
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
      Toastifycation(language[0]["loaded_local"], "#00C33C");
    } else {
      if (fs.existsSync(CosmicComicsTempI + "/path.txt")) {
        if (
          fs.readFileSync(CosmicComicsTempI + "/path.txt", "utf-8") != path ||
          path.includes(".pdf")
        ) {
          UnZip(path, CosmicComicsTempI, "00000", ext);
        } else {
          Toastifycation(language[0]["loading_cache"], "#292929");
          var listofImg = GetListOfImg(CosmicComicsTempI);
          var filepage = GetFilePage();
          preloadImage(listofImg);
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
          Toastifycation(language["loaded_cache"], "#00C33C");
        }
      } else {
        UnZip(path, CosmicComicsTempI, "00000", ext);
      }
    }
  }
}

//Loading image to render
function Reader(listOfImg, page) {
  //document.getElementById("imgViewer_0").classList.add("animate-CtL")
  LoadBMI(page);
  document.getElementById("imgViewer_0").style.display = "";
  document.getElementById("imgViewer_1").style.display = "";
  document.getElementById("sps").value = page + 1;
  document.getElementById("sps").min = 1;
  document.getElementById("sps").max = listOfImg.length;
  document.getElementById("imgViewer_0").style.display = "none";
  document.getElementById("imgViewer_1").style.display = "none";

  if (RZPV == true) {
    if (
      document.getElementById("imgViewer_0").style.width ==
        window.innerWidth - 5 + "px" ||
      document.getElementById("imgViewer_0").style.width ==
        window.innerWidth - 205 + "px"
    ) {
      FixWidth();
    } else {
      FixHeight();
    }
  }
  document.getElementById("inputonwhat").innerHTML = " / " + listOfImg.length;
  document.getElementById("input_text").value = page + 1;
  try {
    for (var i = 0; i < listOfImg.length; i++) {
      document.getElementById("id_img_" + i).className = "";
    }
    document.getElementById("id_img_" + page).className = "SideBar_current";
    document.getElementById("SideBar").scrollTop =
      document.getElementById("id_img_" + page).offsetTop - 100;
  } catch (e) {
    console.log(e);
  }

  var manganb = Math.abs(listOfImg.length - page);
  if (AlwaysRotateB == false) {
    document.getElementById("imgViewer_0").style.transform =
      "rotate(" + 0 + "deg)";
    document.getElementById("imgViewer_1").style.rotate =
      "rotate(" + 0 + "deg)";
  } else {
    document.getElementById("imgViewer_0").style.transform =
      "rotate(" + AlwaysRotateV + "deg)";
    document.getElementById("imgViewer_1").style.rotate =
      "rotate(" + AlwaysRotateV + "deg)";
  }

  if (DoublePageMode == true && BlankFirstPage == false) {
    document.getElementById("imgViewer_0").style.display = "";
    document.getElementById("imgViewer_1").style.display = "";
    document.getElementById("imgViewer_0").src =
      CosmicComicsTempI + listOfImg[page];
    document.getElementById("imgViewer_1").src =
      CosmicComicsTempI + listOfImg[page + 1];
    if (mangaMode == true) {
      document.getElementById("currentpage").innerHTML =
        manganb - 1 + " / " + listOfImg.length;
    } else {
      document.getElementById("currentpage").innerHTML =
        page + 2 + " / " + listOfImg.length;
    }

    DPageActu = page + 1;
  } else if (DoublePageMode == true && BlankFirstPage == true) {
    if (page == 0 || page == -1 || manganb == 2 || manganb == 1) {
      document.getElementById("imgViewer_0").style.display = "";
      document.getElementById("imgViewer_1").style.display = "none";
      if (manganb == 2) {
        document.getElementById("imgViewer_0").src =
          CosmicComicsTempI + listOfImg[page + 1];
        if (mangaMode == true) {
          document.getElementById("currentpage").innerHTML =
            manganb - 2 + " / " + listOfImg.length;
        } else {
          document.getElementById("currentpage").innerHTML =
            page + 1 + " / " + listOfImg.length;
        }
      } else {
        document.getElementById("imgViewer_0").src =
          CosmicComicsTempI + listOfImg[page];
        if (mangaMode == true) {
          document.getElementById("currentpage").innerHTML =
            manganb + " / " + listOfImg.length;
        } else {
          document.getElementById("currentpage").innerHTML =
            page + 1 + " / " + listOfImg.length;
        }
      }

      DPageActu = page + 1;
    } else {
      document.getElementById("imgViewer_0").style.display = "";
      document.getElementById("imgViewer_1").style.display = "";

      document.getElementById("imgViewer_0").src =
        CosmicComicsTempI + listOfImg[page];
      document.getElementById("imgViewer_1").src =
        CosmicComicsTempI + listOfImg[page + 1];
      if (mangaMode == true) {
        document.getElementById("currentpage").innerHTML =
          manganb - 1 + " / " + listOfImg.length;
      } else {
        document.getElementById("currentpage").innerHTML =
          page + 2 + " / " + listOfImg.length;
      }
      DPageActu = page + 1;
    }
  } else {
    document.getElementById("imgViewer_0").style.display = "";
    document.getElementById("imgViewer_1").style.display = "none";

    document.getElementById("imgViewer_0").src =
      CosmicComicsTempI + listOfImg[page];
    if (mangaMode == true) {
      document.getElementById("currentpage").innerHTML =
        manganb + " / " + listOfImg.length;
    } else {
      document.getElementById("currentpage").innerHTML =
        page + 1 + " / " + listOfImg.length;
    }

    DPageActu = page + 1;
  }
  if (wasDPM == true) {
    DoublePageMode = true;
  }
  setTimeout(() => {
    if (toogleBGC == true) {
      var pathBG = CosmicComicsTempI + listOfImg[page];
      var BGColor = GettheBGColor(pathBG);
      document.getElementsByTagName("html")[0].style.backgroundColor =
        "rgb(" + BGColor[0] + "," + BGColor[1] + "," + BGColor[2] + ")";
    }
  }, 50);
}

//Getting the list of images
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
  if (mangaMode == true) {
    return invertList(listOfImage);
  } else {
    if (listOfImage.length == 0) {
      return false;
    } else {
      return listOfImage;
    }
  }
  return listOfImage;
}

//Getting the current page
function GetCurrentPage() {
  if (mangaMode == true) {
    var listofImg = GetListOfImg(CosmicComicsTempI);
    var CurrentPage = Math.abs(
      listofImg.length -
        document.getElementById("currentpage").innerHTML.split(" ")[0]
    );
    console.log(CurrentPage);
    return CurrentPage;
  } else {
    var CurrentPage =
      document.getElementById("currentpage").innerHTML.split(" ")[0] - 1;
    return CurrentPage;
  }
}
var scrollindex_next = 1;

//Going to the next page
function NextPage() {
  if (VIV_On == true) {
    var CurrentPage = GetCurrentPage();
    console.log(scrollindex_next);
    if (
      document.getElementById("imgViewer_" + CurrentPage).style.width ==
      window.innerWidth - 5 + "px"
    ) {
      if (scrollindex_next > 2) {
        window.scrollTo(
          0,
          document.getElementById("imgViewer_" + (CurrentPage + 1)).offsetTop -
            document.getElementsByTagName("header")[0].offsetHeight
        );
      } else {
        if (scrollindex_next == 1) {
          document
            .getElementById("div_imgViewer_" + CurrentPage)
            .scrollIntoView({
              block: "center",
            });
        } else if (scrollindex_next == 2) {
          document
            .getElementById("div_imgViewer_" + CurrentPage)
            .scrollIntoView({
              block: "end",
            });
        }
      }

      if (scrollindex_next > 2) {
        scrollindex_next = 1;
      } else {
        scrollindex_next += 1;
      }
    } else {
      window.scrollTo(
        0,
        document.getElementById("imgViewer_" + (CurrentPage + 1)).offsetTop -
          document.getElementsByTagName("header")[0].offsetHeight
      );
    }
  } else {
    window.scrollTo(0, 0);

    var CurrentPage = GetCurrentPage();
    var listofImg = GetListOfImg(CosmicComicsTempI);
    if (DPMNoH == true) {
      var NW = preloadedImages[CurrentPage + 1].naturalWidth;
      var NH = preloadedImages[CurrentPage + 1].naturalHeight;
      var NW2 = preloadedImages[CurrentPage + 2].naturalWidth;
      var NH2 = preloadedImages[CurrentPage + 2].naturalHeight;
      if (NW > NH || NW2 > NH2) {
        DoublePageMode = false;
      }
    }
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
}

//Going to the previous page
function PreviousPage() {
  if (VIV_On == true) {
    var CurrentPage = GetCurrentPage();
    if (scrollindex_next == 2 || scrollindex_next == 3) {
      window.scrollTo(
        0,
        document.getElementById("imgViewer_" + CurrentPage).offsetTop -
          document.getElementsByTagName("header")[0].offsetHeight
      );
      scrollindex_next = 1;
    } else {
      window.scrollTo(
        0,
        document.getElementById("imgViewer_" + (CurrentPage - 1)).offsetTop -
          document.getElementsByTagName("header")[0].offsetHeight
      );
      scrollindex_next = 1;
    }
  } else {
    window.scrollTo(0, 0);
    var CurrentPage = GetCurrentPage();
    var listofImg = GetListOfImg(CosmicComicsTempI);

    if (DoublePageMode == true && BlankFirstPage == false && DPMNoH == false) {
      if (CurrentPage > 2) {
        CurrentPage -= 3;
        Reader(listofImg, CurrentPage);
      } else {
        if (CurrentPage - 1 != -1) {
          CurrentPage -= 1;
          Reader(listofImg, CurrentPage);
        }
      }
    } else if (
      DoublePageMode == true &&
      BlankFirstPage == false &&
      DPMNoH == true
    ) {
      if (CurrentPage > 2) {
        var NW = preloadedImages[CurrentPage - 1].naturalWidth;
        var NH = preloadedImages[CurrentPage - 1].naturalHeight;
        var NW2 = preloadedImages[CurrentPage - 2].naturalWidth;
        var NH2 = preloadedImages[CurrentPage - 2].naturalHeight;
        if (NW > NH || NW2 > NH2) {
          DoublePageMode = false;
          CurrentPage -= 1;
          Reader(listofImg, CurrentPage);
        } else {
          CurrentPage -= 3;
          Reader(listofImg, CurrentPage);
        }
      } else {
        if (CurrentPage - 2 != -1) {
          CurrentPage -= 2;
          Reader(listofImg, CurrentPage);
        }
      }
    } else if (
      DoublePageMode == true &&
      BlankFirstPage == true &&
      DPMNoH == false
    ) {
      if (CurrentPage != 0 && CurrentPage - 3 != -1) {
        CurrentPage -= 3;
        Reader(listofImg, CurrentPage);
      } else if (CurrentPage - 3 == -1) {
        CurrentPage -= 2;
        Reader(listofImg, CurrentPage);
      }
    } else if (
      DoublePageMode == true &&
      BlankFirstPage == true &&
      DPMNoH == true
    ) {
      if (CurrentPage != 0 && CurrentPage - 3 != -1) {
        var NW = preloadedImages[CurrentPage - 2].naturalWidth;
        var NH = preloadedImages[CurrentPage - 2].naturalHeight;
        var NW2 = preloadedImages[CurrentPage - 3].naturalWidth;
        var NH2 = preloadedImages[CurrentPage - 3].naturalHeight;
        if (NW > NH || NW2 > NH2) {
          DoublePageMode = false;

          CurrentPage -= 2;
          Reader(listofImg, CurrentPage);
        } else {
          CurrentPage -= 2;
          Reader(listofImg, CurrentPage);
        }
      } else if (CurrentPage - 3 == -1) {
        var NW = preloadedImages[CurrentPage - 1].naturalWidth;
        var NH = preloadedImages[CurrentPage - 1].naturalHeight;
        var NW2 = preloadedImages[CurrentPage - 2].naturalWidth;
        var NH2 = preloadedImages[CurrentPage - 2].naturalHeight;
        if (NW > NH || NW2 > NH2) {
          DoublePageMode = false;

          CurrentPage -= 1;
          Reader(listofImg, CurrentPage);
        } else {
          CurrentPage -= 2;
          Reader(listofImg, CurrentPage);
        }
      }
    } else {
      if (CurrentPage != 0) {
        CurrentPage -= 1;
        Reader(listofImg, CurrentPage);
      }
    }
  }
}

//Display by Height
function FixHeight() {
  var height =
    window.innerHeight - document.getElementsByTagName("nav")[0].offsetHeight;
  document.getElementById("imgViewer_0").style.height = height + "px";
  document.getElementById("imgViewer_0").style.width = "auto";
  document.getElementById("imgViewer_1").style.height = height + "px";
  document.getElementById("imgViewer_1").style.width = "auto";
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.height = height + "px";
      document.getElementById("imgViewer_" + i).style.width = "auto";
    }
  }
}

//GO to the beginning
function Start() {
  var listofImg = GetListOfImg(CosmicComicsTempI);

  if (mangaMode == true) {
    Reader(listofImg, 1);
  } else {
    Reader(listofImg, 0);
  }
}

//Go to the end
function End() {
  var listofImg = GetListOfImg(CosmicComicsTempI);
  if (DoublePageMode == true) {
    var max = listofImg.length - 2;
  } else {
    var max = listofImg.length - 1;
  }
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

//Modify the JSON
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

//add element to the JSON
function SaveInfoToJSON(obj, json) {
  //check si obj exist pour remplacer valeur
  var configFile = fs.readFileSync(json);
  var config = JSON.parse(configFile);
  config.push(obj);
  var configJSON = JSON.stringify(config, null, 2);
  fs.writeFileSync(json, configJSON);
}

//get the object by JSON
function GetInfoFromJSON(json, name) {
  var data = fs.readFileSync(json);
  var info = JSON.parse(data);
  console.log(info);
  var Info = GetInfo("name", info, name);
  console.log(Info);
  return Info;
}

//Search in the object getted and for the book ID
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

//Search in the object getted
function GetElFromInfo(search, info) {
  for (var i in info) {
    if (i == search) {
      return info[i];
    }
  }
  return null;
}

//mark as read
function markasread() {
  Toastifycation(language[0]["marked_as_read"], "#00C33C");

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

//Mark as unread
function markasunread() {
  Toastifycation(language[0]["marked_as_unread"], "#00C33C");

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

//mark as reading
function markasreading() {
  Toastifycation(language[0]["marked_as_reading"], "#00C33C");

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

//Toggle the favorite status
function ToogleFav() {
  var info = GetInfoFromJSON(
    CosmicComicsData + "/ListOfComics.json",
    shortname
  );
  var res = GetElFromInfo("favorite", info);
  console.log(res);
  if (res == true) {
    Toastifycation(language[0]["remove_fav"], "#00C33C");
    document.getElementById("favoicon").innerHTML = "favorite_border";
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "favorite",
      false,
      shortname
    );
  } else if (res == false) {
    Toastifycation(language[0]["add_fav"], "#00C33C");

    document.getElementById("favoicon").innerHTML = "favorite";
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "favorite",
      true,
      shortname
    );
  } else {
    Toastifycation(language[0]["error"], "#ff0000");
    console.log("FAV : Error");
  }
}

//keyboard Shortcuts
window.addEventListener("keydown", (e) => {
  if ((e.code == "Equal" || e.code == "NumpadAdd") && e.ctrlKey == true) {
    ZoomIn();
  } else if (
    (e.code == "Digit6" || e.code == "NumpadSubtract") &&
    e.ctrlKey == true
  ) {
    ZoomOut();
  } else if (e.code == "ArrowLeft" && e.ctrlKey == false) {
    PreviousPage();
  } else if (e.code == "ArrowRight" && e.ctrlKey == false) {
    NextPage();
  } else if (e.code == "ArrowUp" && e.ctrlKey == false) {
    PreviousPage();
  } else if (e.code == "ArrowDown" && e.ctrlKey == false) {
    NextPage();
  } else if (e.code == "ArrowLeft" && e.ctrlKey == true) {
    Start();
  } else if (e.code == "ArrowRight" && e.ctrlKey == true) {
    End();
  } else if (e.code == "ArrowUp" && e.ctrlKey == true) {
    Start();
  } else if (e.code == "ArrowDown" && e.ctrlKey == true) {
    End();
  } else if (e.ctrlKey == true) {
    ctrlisDown = true;
  } else if (e.code == "KeyF") {
    fullscreen();
  } else if (e.code == "8") {
    window.location.href = "index.html";
  } else if (e.code == "KeyH") {
    FixHeight();
  } else if (e.code == "KeyW") {
    FixWidth();
  } else if (e.code == "KeyB") {
    TBM();
  } else if (e.code == "KeyR" && e.shiftKey == false) {
    rotate(90);
  } else if (e.code == "KeyR" && e.shiftKey == true) {
    rotate(-90);
  } else if (e.code == "KeyO") {
    markasread();
  } else if (e.code == "KeyI") {
    markasreading();
  } else if (e.code == "KeyU") {
    markasunread();
  } else if (e.code == "KeyP") {
    ToogleFav();
  }
});

//Modify the JSON for config.json
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

//Change the Zoom Level when Zooming
var ZoomLVL = 20;
function changeZoomLVL() {
  var val = document.getElementById("zlvls").value;
  ZoomLVL = parseInt(val);
  document.getElementById("zlvll").innerHTML =
    language[0]["zoomlvl"]+" (" + ZoomLVL + "px):";
  ModifyJSONFileForPath(CosmicComicsData + "/config.json", "ZoomLVL", ZoomLVL);
}

//Zoom in
function ZoomIn() {
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.height =
        parseInt(document.getElementById("imgViewer_" + i).style.height) +
        ZoomLVL +
        "px";
    }
  } else {
    document.getElementById("imgViewer_0").style.height =
      parseInt(document.getElementById("imgViewer_0").style.height) +
      ZoomLVL +
      "px";
    if (DoublePageMode == true) {
      document.getElementById("imgViewer_1").style.height =
        parseInt(document.getElementById("imgViewer_1").style.height) +
        ZoomLVL +
        "px";
    }
  }
}

//To Zoom Out
function ZoomOut() {
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.height =
        parseInt(document.getElementById("imgViewer_" + i).style.height) -
        ZoomLVL +
        "px";
    }
  } else {
    document.getElementById("imgViewer_0").style.height =
      parseInt(document.getElementById("imgViewer_0").style.height) -
      ZoomLVL +
      "px";
    if (DoublePageMode == true) {
      document.getElementById("imgViewer_1").style.height =
        parseInt(document.getElementById("imgViewer_1").style.height) -
        ZoomLVL +
        "px";
    }
  }
}

//Detect where the wheel go
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

//Trigger Automatic background
function AutoBGC() {
  if (toogleBGC == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Automatic_Background_Color",
      false
    );
    toogleBGC = false;
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Automatic_Background_Color",
      true
    );
    toogleBGC = true;
  }
}

//Getting the Background Color by the dominant color of image
function GettheBGColor() {
  var img = document.getElementById("imgViewer_0");
  return colorThief.getColor(img);
}

//Fix the view to width
function FixWidth() {
  document.getElementById("imgViewer_0").style.width =
    window.innerWidth - 5 + "px";
  document.getElementById("imgViewer_0").style.height = "auto";
  if (DoublePageMode == true) {
    document.getElementById("imgViewer_0").style.width =
      (window.innerWidth - 5) / 2 + "px";
    document.getElementById("imgViewer_0").style.height = "auto";
    document.getElementById("imgViewer_1").style.width =
      (window.innerWidth - 5) / 2 + "px";
    document.getElementById("imgViewer_1").style.height = "auto";
  }
  if (SideBarOn == true) {
    document.getElementById("imgViewer_0").style.width =
      window.innerWidth - 205 + "px";
    document.getElementById("imgViewer_0").style.height = "auto";
    document.getElementById("imgViewer_1").style.width =
      window.innerWidth - 205 + "px";
    document.getElementById("imgViewer_1").style.height = "auto";
  }

  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      if (SideBarOn == true) {
        document.getElementById("imgViewer_" + i).style.width =
          window.innerWidth - 205 + "px";
        document.getElementById("imgViewer_" + i).style.height = "auto";
      } else {
        document.getElementById("imgViewer_" + i).style.width =
          window.innerWidth - 5 + "px";
        document.getElementById("imgViewer_" + i).style.height = "auto";
      }
    }
  }
}

//Toogle mark as Bookmarks
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

//Loading the BookMark
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

//Languages for ToolTips and other things
new bootstrap.Tooltip(document.getElementById("goback_id"), {
  title: language[0]["go_back"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("magnifier_id"), {
  title: language[0]["magnifier_toggle"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_gostart"), {
  title: language[0]["go_start"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_bookmenu"), {
  title: language[0]["book_settings"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_goprevious"), {
  title: language[0]["go_previous"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("nextpage"), {
  title: language[0]["go_next"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_goend"), {
  title: language[0]["go_end"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_mkread"), {
  title: language[0]["mkread"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_mkreading"), {
  title: language[0]["mkreading"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_mkunread"), {
  title: language[0]["mkunread"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_togglefav"), {
  title: language[0]["toogle_fav"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_fixheight"), {
  title: language[0]["fix_height"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_fixwidth"), {
  title: language[0]["fix_width"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_autobgcolor"), {
  title: language[0]["auto_bg_color"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_zoomin"), {
  title: language[0]["zoom_in"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_zoomout"), {
  title: language[0]["zoom_out"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_toogleBookMark"), {
  title: language[0]["Bookmark"],
  placement: "bottom",
});
document.getElementById("id_magnifiermod").innerHTML = language[0]["magnifier_mod"],
document.getElementById("zoomlvl").innerHTML= language[0]["zoom"]

document.getElementById("widthlvl").innerHTML = language[0]["width"]
document.getElementById("heightlvl").innerHTML = language[0]["height"]

document.getElementById("Radiuslvl").innerHTML = language[0]["radius"]
new bootstrap.Tooltip(document.getElementById("magnifier_note"), {
  title: language[0]["magnifier_note"],
  placement: "bottom",
});
document.getElementById("id_spawnmagnifier").innerHTML = language[0]["spawn_magnifier"]
document.getElementById("id_destroymagnifier").innerHTML = language[0]["destroy_magnifier"]

//Hide the Double Pages
function HideDB() {
  document.getElementById("imgViewer_1").style.display = "none";
}

//Show the Double Page
function showDB() {
  document.getElementById("imgViewer_1").style.display = "";
}

//Disable some inputs by default
document.getElementById("BPABS").setAttribute("disabled", "");
document.getElementById("NDPFHS").setAttribute("disabled", "");
document.getElementById("MarginValue").setAttribute("disabled", "");

//Toggle active Double Page Mode
function TDPM() {
  if (DoublePageMode == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Double_Page_Mode",
      false
    );
    //TODO Desac et enlever les autres modes
    if (document.getElementById("BPABS").checked == true) {
      document.getElementById("BPABS").checked = false;
      BPAB();
    }
    if (document.getElementById("NDPFHS").checked == true) {
      document.getElementById("NDPFHS").checked = false;
      NDPFH();
    }

    document.getElementById("BPABS").setAttribute("disabled", "");
    document.getElementById("NDPFHS").setAttribute("disabled", "");
    document.getElementById("MarginValue").setAttribute("disabled", "");
    DoublePageMode = false;
    wasDPM = false;
    HideDB();
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Double_Page_Mode",
      true
    );
    //TODO Activate les autres modes
    document.getElementById("BPABS").removeAttribute("disabled");
    document.getElementById("MarginValue").removeAttribute("disabled");
    document.getElementById("NDPFHS").removeAttribute("disabled");

    DoublePageMode = true;
    wasDPM = true;
    var listofImg = GetListOfImg(CosmicComicsTempI);
    var currentPage = GetCurrentPage();
    if (currentPage % 2 == 0) {
      Reader(listofImg, currentPage - 1);
    } else {
      Reader(listofImg, currentPage);
    }
    showDB();
  }
}

//Change the margin
function MarginSlider() {
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.marginBottom =
        document.getElementById("MarginValue").value;
      document.getElementById("marginlvl").innerHTML =
        language[0]['margin']+" (" + document.getElementById("MarginValue").value + " px):";
      ModifyJSONFileForPath(
        CosmicComicsData + "/config.json",
        "Margin",
        document.getElementById("MarginValue").value
      );
    }
  } else {
    document.getElementById("imgViewer_1").style.marginLeft =
      document.getElementById("MarginValue").value;
    document.getElementById("marginlvl").innerHTML =
      language[0]["margin"]+" (" + document.getElementById("MarginValue").value + " px):";
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Margin",
      document.getElementById("MarginValue").value
    );
  }
}

//Not working apply a shadow btw the pages (when Double page mode is actived)
function showShadow() {
  if (
    document.getElementById("id_checkshadow").getAttribute("checked") != null
  ) {
    document.getElementById("imgViewer_1").classList.add("pageShadow");
  }
}

//Blank first page at begginning
function BPAB() {
  if (BlankFirstPage == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Blank_page_At_Begginning",
      false
    );
    BlankFirstPage = false;
    var listofImg = GetListOfImg(CosmicComicsTempI);
    var currentPage = GetCurrentPage();
    Reader(listofImg, currentPage);
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Blank_page_At_Begginning",
      true
    );
    BlankFirstPage = true;
    var listofImg = GetListOfImg(CosmicComicsTempI);
    var currentPage = GetCurrentPage();
    Reader(listofImg, currentPage);
  }
}

//Detect if the image is Horizontal or Vertical
function DetectHorizontal(page) {
  if (page.width > page.height) {
    return true;
  } else {
    return false;
  }
}

//Getting the orientation (Horizontal or Vertical) of the next image
function getTheHOfNextImage() {
  var CurrentPage = GetCurrentPage();
  var NextPage = CurrentPage + 1;
  var listofImg = GetListOfImg(CosmicComicsTempI);
  var image = new Image();
  image.src = CosmicComicsTempI + listofImg[NextPage];
  var H = DetectHorizontal(image);
  return H;
}

//Getting the orientation (Horizontal or Vertical) of the previous image
function GetTheHOfPreviousImage() {
  var CurrentPage = GetCurrentPage();
  var NextPage = CurrentPage - 2;
  var listofImg = GetListOfImg(CosmicComicsTempI);
  var image = new Image();
  image.src = CosmicComicsTempI + listofImg[NextPage];
  var H = DetectHorizontal(image);
  return H;
}

//No Double Page when Horizontal
function NDPFH() {
  if (DPMNoH == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "No_Double_Page_For_Horizontal",
      false
    );
    DPMNoH = false;
    var listofImg = GetListOfImg(CosmicComicsTempI);
    var currentPage = GetCurrentPage();
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "No_Double_Page_For_Horizontal",
      true
    );
    DPMNoH = true;
    var listofImg = GetListOfImg(CosmicComicsTempI);
    var currentPage = GetCurrentPage();
  }
}

//preloading images
var preloadedImages = [];
function preloadImage(listImages) {
  for (var i = 0; i < listImages.length; i++) {
    preloadedImages[i] = new Image();
    preloadedImages[i].src = CosmicComicsTempI + listImages[i];
  }
}

//Error When loading images
document.getElementById("imgViewer_0").onerror = function () {
  Toastifycation(language[0]["error"], "#ff0000");
};
document.getElementById("imgViewer_1").onerror = function () {
  Toastifycation(language[0]["error"], "#ff0000");
};

//Manga Mode
function MMT() {
  if (mangaMode == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Manga_Mode",
      false
    );
    mangaMode = false;
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Manga_Mode",
      true
    );
    mangaMode = true;
  }
}

//Invert the list passed in parameters
function invertList(list = []) {
  var newlist = [];
  for (let i = 0; i < list.length; i++) {
    newlist[i] = list[i];
  }
  newlist.reverse();
  return newlist;
}

//Rotation of an element
var degreesT = 0;
var AlwaysRotateB = false;
var AlwaysRotateV = 0;
function rotate(degrees = 0) {
  degreesT += degrees;
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.transform =
        "rotate(" + degreesT + "deg)";
    }
  } else {
    document.getElementById("imgViewer_0").style.transform =
      "rotate(" + degreesT + "deg)";
    document.getElementById("imgViewer_1").style.transform =
      "rotate(" + degreesT + "deg)";
  }
}

//Always rotate image
function AlwaysRotate() {
  var rotateval = document.getElementById("RotateValue").value;
  AlwaysRotateB = true;
  AlwaysRotateV = rotateval;
  if (rotateval == 0) {
    AlwaysRotateB = false;
    AlwaysRotateV = 0;
  }
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.transform =
        "rotate(" + AlwaysRotateV + "deg)";
    }
  } else {
    document.getElementById("imgViewer_0").style.transform =
      "rotate(" + AlwaysRotateV + "deg)";
    document.getElementById("imgViewer_1").style.transform =
      "rotate(" + AlwaysRotateV + "deg)";
    document.getElementById("rotlvl").innerHTML =
      language[0]["rotation"]+" (" + rotateval + " degrees):";
  }
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "Rotate_All",
    AlwaysRotateV
  );
}

//Slide Show
var TSSON = false;
function TSS() {
  if (TSSON == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "SlideShow",
      false
    );
    TSSON = false;
  } else {
    ModifyJSONFileForPath(CosmicComicsData + "/config.json", "SlideShow", true);
    TSSON = true;
    var intervalTime = document.getElementById("SSValue").value * 1000;

    var slideshowID = setInterval(() => {
      if (TSSON == false) {
        clearInterval(slideshowID);
      } else {
        NextPage();
      }
    }, intervalTime);
  }
}

//Text of the Slide Show slider
function ShowOnChangeSlideShow() {
  document.getElementById("sstxt").innerHTML =
    language[0]["slideshow_interval"]+" (" +
    document.getElementById("SSValue").value +
    " "+language[0]["secondes"]+"):";
}

//FullScreen
var fsOn = false;
function fullscreen() {
  if (fsOn == true) {
    fsOn = false;
    document.exitFullscreen();
    document.getElementById("fullscreen_i_id").innerHTML = "fullscreen";
  } else {
    fsOn = true;
    document.documentElement.requestFullscreen();
    document.getElementById("fullscreen_i_id").innerHTML = "fullscreen_exit";
  }
}

//No bar Mode
var BarOn = true;
function NoBAR() {
  if (BarOn == true) {
    document.getElementsByTagName("nav")[0].style.display = "none";
    ModifyJSONFileForPath(CosmicComicsData + "/config.json", "NoBar", true);
    BarOn = false;
    var newdiv = document.createElement("div");
    newdiv.id = "nobarr";
    newdiv.style.width = "100%";
    newdiv.style.height = "10px";
    newdiv.style.position = "fixed";
    newdiv.style.zIndex = "10000000";
    newdiv.addEventListener("mouseover", function () {
      NoBAR();
      document.getElementById("NBAR").checked = false;
    });
    document.body.insertBefore(newdiv, document.body.firstChild);
  } else {
    ModifyJSONFileForPath(CosmicComicsData + "/config.json", "NoBar", false);
    BarOn = true;
    document.getElementsByTagName("nav")[0].style.display = "block";
    document.body.removeChild(document.getElementById("nobarr"));
  }
}
var SideBarOn = false;

//Toggle SideBar
function TSB() {
  if (SideBarOn == true) {
    SideBarOn = false;
    ModifyJSONFileForPath(CosmicComicsData + "/config.json", "SideBar", false);
    document.getElementById("SideBar").style.display = "none";
    document.getElementById("viewport").style = "text-align: center;";
  } else {
    SideBarOn = true;
    ModifyJSONFileForPath(CosmicComicsData + "/config.json", "SideBar", true);
    document.getElementById("SideBar").style.display = "block";
    document.getElementById("viewport").style =
      "text-align: center;padding-left: 200px;";
    ConstructSideBar();
  }
}

//Construct the SideBar
function ConstructSideBar() {
  if (document.getElementById("SideBar").childElementCount == 0) {
    var listofImg = GetListOfImg(CosmicComicsTempI);
    console.log(listofImg);
    listofImg.forEach((image, index) => {
      var el = document.getElementById("SideBar");
      const divcontainer = document.createElement("div");
      const acontainer = document.createElement("a");
      const pel = document.createElement("p");
      const img = document.createElement("img");
      img.src = CosmicComicsTempI + image;
      img.height = "120";
      pel.innerHTML = index + 1;
      acontainer.appendChild(img);
      acontainer.appendChild(pel);
      divcontainer.id = "id_img_" + index;
      acontainer.style.color = "white";
      acontainer.style.width = "100%";
      divcontainer.style.cursor = "pointer";
      divcontainer.addEventListener("click", function (e) {
        e.preventDefault();
        if (VIV_On == true) {
          window.scrollTo(
            0,
            document.getElementById("imgViewer_" + index).offsetTop -
              document.getElementsByTagName("header")[0].offsetHeight
          );
        } else {
          Reader(listofImg, index);
        }
      });
      acontainer.href = "#";
      divcontainer.appendChild(acontainer);
      el.appendChild(divcontainer);
    });
  }
}

//Fix view by Height by default
FixHeight();

//Page Counter on/off
var DM_CurrentPage = true;
function ChangeDM_CurrentPage() {
  if (DM_CurrentPage == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Page_Counter",
      false
    );
    DM_CurrentPage = false;
    document.getElementById("currentpage").style.display = "none";
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Page_Counter",
      true
    );
    DM_CurrentPage = true;
    document.getElementById("currentpage").style.display = "block";
  }
}

//Vertical Image Viewer Mode
var VIV_On = false;
var VIV_Count = 0;
function VIVT() {
  if (VIV_On == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Vertical_Reader_Mode",
      false
    );
    window.location.reload();
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Vertical_Reader_Mode",
      true
    );
    VIV_On = true;
    CreateAllVIV();
    document.getElementById("BPABS").setAttribute("disabled", "");
    document.getElementById("NDPFHS").setAttribute("disabled", "");
    document.getElementById("TDPMS").setAttribute("disabled", "");
    document.getElementById("MMS").setAttribute("disabled", "");
    document.getElementById("MarginValue").removeAttribute("disabled");
  }
}

//Create all Vertical Image
function CreateAllVIV() {
  var el = document.getElementById("viewport");
  document.getElementById("imgViewer_0").remove();
  document.getElementById("imgViewer_1").remove();
  var listofImg = GetListOfImg(CosmicComicsTempI);
  VIV_Count = listofImg.length;
  for (let i = 0; i < listofImg.length; i++) {
    const imgel = document.createElement("img");
    const div = document.createElement("div");
    imgel.id = "imgViewer_" + i;
    imgel.src = CosmicComicsTempI + listofImg[i];
    div.appendChild(imgel);
    div.id = "div_imgViewer_" + i;
    el.appendChild(div);
    observer.observe(document.querySelector("#div_imgViewer_" + i));
  }
}

//observer to know where you are on the page
var observer = new IntersectionObserver(
  function (entries) {
    if (entries[0].isIntersecting === true)
      document.getElementById("currentpage").innerHTML =
        parseInt(entries[0].target.id.split("div_imgViewer_")[1]) +
        1 +
        " / " +
        VIV_Count;
    try {
      for (var i = 0; i < VIV_Count; i++) {
        document.getElementById("id_img_" + i).className = "";
      }
      document.getElementById(
        "id_img_" +
          (parseInt(
            document.getElementById("currentpage").innerHTML.split(" ")[0]
          ) -
            1)
      ).className = "SideBar_current";
      document.getElementById("SideBar").scrollTop =
        document.getElementById(
          "id_img_" +
            (parseInt(
              document.getElementById("currentpage").innerHTML.split(" ")[0]
            ) -
              1)
        ).offsetTop - 200;
    } catch (e) {
      console.log(e);
    }
  },
  { threshold: [0.1] }
);

//Can move direclty to a page by using a slider
function pageslide() {
  var listofImg = GetListOfImg(CosmicComicsTempI);
  var pageto = document.getElementById("sps").value - 1;
  document.getElementById("lsps").innerHTML =
    language[0]["page_slider"]+" (" + document.getElementById("sps").value + "):";
  Reader(listofImg, pageto);
}

//Do not remember what this do, sorry
function pagechoose() {
  var listofImg = GetListOfImg(CosmicComicsTempI);
  var pageto = document.getElementById("input_text").value - 1;
  if (
    pageto >= document.getElementById("sps").min - 1 &&
    pageto <= document.getElementById("sps").max - 1
  ) {
    Reader(listofImg, pageto);
  } else {
    Toastifycation(language[0]["not_available"], "#ff0000");
  }
}

//Webtoon Mode
var WTMTV = false;
function WTMT() {
  if (WTMTV == true) {
    WTMTV = false;

    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "WebToonMode",
      false
    );
    window.location.reload();
  } else {
    WTMTV = true;

    VIV_On = true;
    CreateAllVIV();
    document.getElementById("BPABS").setAttribute("disabled", "");
    document.getElementById("NDPFHS").setAttribute("disabled", "");
    document.getElementById("TDPMS").setAttribute("disabled", "");
    document.getElementById("MMS").setAttribute("disabled", "");
    document.getElementById("MarginValue").removeAttribute("disabled");
    FixWidth();
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "WebToonMode",
      true
    );
  }
}

//Change Background Color by color picker
function changeBGColorByPicker() {
  var value = document.getElementById("exampleColorInput").value;
  document.getElementsByTagName("html")[0].style.backgroundColor = value;
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "Background_color",
    value
  );
}

//reset zoom for each page
var RZPV = false;
function RZP() {
  if (RZPV == true) {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "reset_zoom",
      false
    );
    RZPV = false;
  } else {
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "reset_zoom",
      true
    );
    RZPV = true;
  }
}

//Scroll bar visible
var scrollbarvisibiel = true;
function SBVT() {
  if (scrollbarvisibiel == true) {
    setNoScrollbar();
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Scroll_bar_visible",
      false
    );
    scrollbarvisibiel = false;
  } else {
    setScrollbar();
    ModifyJSONFileForPath(
      CosmicComicsData + "/config.json",
      "Scroll_bar_visible",
      true
    );
    scrollbarvisibiel = true;
  }
}

//Set no scrollbar
function setNoScrollbar() {
  var styleSheet = document.styleSheets[document.styleSheets.length - 3];
  styleSheet.insertRule("::-webkit-scrollbar {display: none;}");
}

//Set scrollbar
function setScrollbar() {
  var styleSheet = document.styleSheets[document.styleSheets.length - 3];
  styleSheet.removeRule("::-webkit-scrollbar {display: none;}");
}

//Load the parameters
function loadParameters() {
  var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(configFile);
  var configZoomLVL = GetElFromInforPath("ZoomLVL", parsedJSON);
  var configSBV = GetElFromInforPath("Scroll_bar_visible", parsedJSON);
  var configBGC = GetElFromInforPath("Background_color", parsedJSON);
  var configWTM = GetElFromInforPath("WebToonMode", parsedJSON);
  var configVRM = GetElFromInforPath("Vertical_Reader_Mode", parsedJSON);
  var configPC = GetElFromInforPath("Page_Counter", parsedJSON);
  var configSB = GetElFromInforPath("SideBar", parsedJSON);
  var configNB = GetElFromInforPath("NoBar", parsedJSON);
  var configSS = GetElFromInforPath("SlideShow", parsedJSON);
  var configSST = GetElFromInforPath("SlideShow_Time", parsedJSON);
  var configRA = GetElFromInforPath("Rotate_All", parsedJSON);
  var configM = GetElFromInforPath("Margin", parsedJSON);
  var configMM = GetElFromInforPath("Manga_Mode", parsedJSON);
  var configNDPFH = GetElFromInforPath(
    "No_Double_Page_For_Horizontal",
    parsedJSON
  );
  var configBPAB = GetElFromInforPath("Blank_page_At_Begginning", parsedJSON);
  var configDPM = GetElFromInforPath("Double_Page_Mode", parsedJSON);
  var configABC = GetElFromInforPath("Automatic_Background_Color", parsedJSON);
  var configMZ = GetElFromInforPath("magnifier_zoom", parsedJSON);
  var configMW = GetElFromInforPath("magnifier_Width", parsedJSON);
  var configMH = GetElFromInforPath("magnifier_Height", parsedJSON);
  var configMR = GetElFromInforPath("magnifier_Radius", parsedJSON);
  var configRZ = GetElFromInforPath("reset_zoom", parsedJSON);
  ZoomLVL = configZoomLVL;
  if (configSBV == false) {
    SBVT();
    document.getElementById("SBVS").checked = false;
  }
  if (configWTM == true) {
    WTMT();
    document.getElementById("WTM").checked = true;
  }
  var value = configBGC;
  document.getElementsByTagName("html")[0].style.backgroundColor = value;
  document.getElementById("exampleColorInput").value = value;
  if (configVRM == true) {
    VIVT();
    document.getElementById("VIV").checked = true;
  }
  if (configPC == false) {
    ChangeDM_CurrentPage();
    document.getElementById("PC").checked = false;
  }
  if (configSB == true) {
    TSB();
    document.getElementById("SSB").checked = true;
  }
  if (configNB == true) {
    NoBAR();
    document.getElementById("NBAR").checked = true;
  }
  if (configSS == true) {
    document.getElementById("SS").checked = true;

    if (TSSON == true) {
      TSSON = false;
    } else {
      TSSON = true;
      var intervalTime = configSST;
      var slideshowID = setInterval(() => {
        if (TSSON == false) {
          clearInterval(slideshowID);
        } else {
          NextPage();
        }
      }, intervalTime);
    }
  }
  document.getElementById("sstxt").innerHTML =
   language[0]["slideshow_interval"]+ " (" + configSST + " "+language[0]['secondes']+"):";
  document.getElementById("RotateValue").value = configRA;
  AlwaysRotate();
  if (VIV_On == true) {
    for (let i = 0; i < VIV_Count; i++) {
      document.getElementById("imgViewer_" + i).style.marginBottom = configM;
      document.getElementById("marginlvl").innerHTML =
        language[0]["margin"]+" (" + configM + " px):";
    }
  } else {
    document.getElementById("imgViewer_1").style.marginLeft = configM;
    document.getElementById("marginlvl").innerHTML =
      language[0]["margin"]+" (" + configM + " px):";
  }
  if (configMM == true) {
    MMT();
    document.getElementById("MMS").checked = true;
  }
  if (configNDPFH == true) {
    NDPFH();
    document.getElementById("NDPFHS").checked = true;
  }
  if (configBPAB == true) {
    BPAB();
    document.getElementById("BPABS").checked = true;
  }
  if (configDPM == true) {
    TDPM();
    document.getElementById("TDPMS").checked = true;
  }
  if (configABC == true) {
    AutoBGC();
  }
  document.getElementById("Heightvalue").value = configMH;
  document.getElementById("widthvalue").value = configMW;
  document.getElementById("zoomvalue").value = configMZ;
  document.getElementById("Radiusvalue").value = configMR;
  document.getElementById("SSValue").value = configSST;
  document.getElementById("MarginValue").value = configM;
  if (configRZ == true) {
    RZP();
    document.getElementById("RZPS").checked = true;
  }
}


document.getElementById("Heightvalue").onchange = function () {
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "magnifier_Height",
    parseInt(document.getElementById("Heightvalue").value)
  );
};
document.getElementById("widthvalue").onchange = function () {
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "magnifier_Width",
    parseInt(document.getElementById("widthvalue").value)
  );
};
document.getElementById("zoomvalue").onchange = function () {
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "magnifier_zoom",
    parseInt(document.getElementById("zoomvalue").value)
  );
};
document.getElementById("Radiusvalue").onchange = function () {
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "magnifier_Radius",
    parseInt(document.getElementById("Radiusvalue").value)
  );
};
document.getElementById("SSValue").onchange = function () {
  ShowOnChangeSlideShow();
  ModifyJSONFileForPath(
    CosmicComicsData + "/config.json",
    "SlideShow_Time",
    parseInt(document.getElementById("SSValue").value)
  );
};

//Detect if you are on the bottom or top
var Auth_Prev = false;
var Auth_next = false;
window.onscroll = function (ev) {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
    console.log("You're at the bottom");
    Auth_next = true;
  } else {
    Auth_next = false;
  }
  if (document.body.scrollTop == 0) {
    console.log("You're at the top");
    Auth_Prev = true;
  } else {
    Auth_Prev = false;
  }
};
var nb_of_next = 0;
var nb_of_prev = 0;

//Go to the next or previous page by scrolling 
window.addEventListener("wheel", function (e) {
  if (ctrlisDown) {
    console.log(ctrlisDown);
    ctrlisDown = false;
    var direc = detectMouseWheelDirection(e);
    console.log(direc);
    if (direc == "down") {
      if (
        parseInt(document.getElementById("imgViewer_0").style.height) - 100 >
        minHeight
      ) {
        ZoomOut();
      }
    } else if (direc == "up") {
      if (
        parseInt(document.getElementById("imgViewer_0").style.height) + 100 <
        maxHeight
      ) {
        ZoomIn();
      }
    }
  } else {
    if (Auth_next == true) {
      nb_of_next += 1;
      if (nb_of_next == 2) {
        nb_of_next = 0;
        nb_of_prev = 0;
        Auth_next == false;
        Auth_Prev == false;
        NextPage();
      }
    }
    if (Auth_Prev == true) {
      nb_of_prev += 1;
      if (nb_of_prev == 2) {
        nb_of_next = 0;
        Auth_next == false;
        nb_of_prev = 0;
        Auth_Prev == false;
        PreviousPage();
      }
    }
  }
});

//Click left do previous and click right do next
document.getElementById("viewport").addEventListener("click", function () {
  PreviousPage();
});
document
  .getElementById("viewport")
  .addEventListener("contextmenu", function () {
    NextPage();
  });

  //Wait before Image load up
document.getElementById("imgViewer_0").onload = function () {
  document.getElementById("imgViewer_0").style.display = "";
};
document.getElementById("imgViewer_1").onload = function () {
  document.getElementById("imgViewer_1").style.display = "";
};
document.getElementById("id_booksettings").innerHTML = language[0]["book_settings"]
document.getElementById("DPMTXT").innerHTML = language[0]["double_page_mode"]
document.getElementById("BPABTXT").innerHTML = language[0]["blank_at_beggining"]
document.getElementById("NDPFHTXT").innerHTML = language[0]["no_dpm_horizontal"]
document.getElementById("MMTXT").innerHTML = language[0]["manga_mode"]
document.getElementById("SSTXT").innerHTML = language[0]["Slideshow"]
document.getElementById("NBARTXT").innerHTML = language[0]["nobar"]
document.getElementById("SSBTXT").innerHTML = language[0]["sideBar"]
document.getElementById("PCTXT").innerHTML = language[0]["PageCount"]
document.getElementById("VIVTXT").innerHTML = language[0]["vertical_reader"]
document.getElementById("WTMTXT").innerHTML = language[0]["Webtoon_Mode"]
document.getElementById("RZPSTXT").innerHTML = language[0]["reset_zoom"]
document.getElementById("SBVSTXT").innerHTML = language[0]["scrollBar_visible"]
document.getElementById("marginlvl").innerHTML = language[0]["margin"]
document.getElementById("rotlvl").innerHTML = language[0]["rotation"]
document.getElementById("zlvll").innerHTML = language[0]["zoomlvl"]
document.getElementById("sstxt").innerHTML = language[0]["slideshow_interval"]
document.getElementById("lsps").innerHTML = language[0]["page_slider"]
document.getElementById("colorpicker_txt_id").innerHTML = language[0]["color_picker"]
document.getElementById("close_id_books").innerHTML = language[0]["close"]


new bootstrap.Tooltip(document.getElementById("id_rotateright"), {
  title: language[0]["rotate_right"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("id_rotateleft"), {
  title: language[0]["rotate_left"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("fullscreen_id"), {
  title: language[0]["full_screen"],
  placement: "bottom",
});
