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
//Variables declaration
//All required nodes modules
const { shell } = require("electron");
const fs = require("fs");
const patha = require("path");
const SevenBin = require("7zip-bin");
const Seven = require("node-7z");
var Unrar = require("unrar");
const { electron } = require("process");
const { get } = require("https");
var bootstrap = require("bootstrap");
var popper = require("@popperjs/core");
const DRPC = require("discord-rpc");
const unrarBin = require("unrar-binaries");
//All other variables and constants
const ValidatedExtension = [
  "cbr",
  "cbz",
  "pdf",
  "zip",
  "7z",
  "cb7",
  "tar",
  "cbt",
  "rar",
];
const Path27Zip = SevenBin.path7za;
var imagelink = "null";
var nabc = 0;
var dirnamew = __dirname.replaceAll("\\", "/");
var listOfImages = [];
var name_of_the_current_book = "";
var path_of_the_current_book = "";
var folderRootPath = [];
var favonly = false;
var readonly = false;
var unreadonly = false;
var readingonly = false;
const app = remote.app;
var CosmicComicsData = app.getPath("userData") + "/CosmicComics_data";
var CosmicComicsTemp = app.getPath("temp") + "/CosmicComics";
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
if (fs.existsSync(parentfolder3 + "/portable.txt")) {
  CosmicComicsData = parentfolder3 + "/AppData";
  CosmicComicsTemp = parentfolder3 + "/TMP";
}
try {
  fs.readdirSync(CosmicComicsData)
  fs.readdirSync(CosmicComicsTemp)
} catch (error) {
  console.log(error)
  CosmicComicsData = __dirname + "/AppData";
  CosmicComicsTemp = __dirname + "/TMP";
}
var CosmicComicsTempI = CosmicComicsTemp + "/current_book/";

var GetAllIMG = false;
const ClientID = "870352308062539796";
const rpc = new DRPC.Client({ transport: "ipc" });
const startTimestamp = new Date();

//ToolTips
var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

//set the Language
var language = Get_Lang();

//Get the Lang from the JSON
function Get_Lang() {
  var config_JSON = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(config_JSON);
  var config_lang = Get_From_Config("language", parsedJSON);
  return lang_from_JSON(config_lang);
}

//Get the language values from the language JSON
function lang_from_JSON(language) {
  var file = fs.readFileSync(__dirname + "/languages/" + language + ".json");
  var JSONRes = JSON.parse(file);
  return JSONRes[0];
}

//Set the activity on Discord
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

//Get the version and display it on the info
document.getElementById("version").innerHTML =
  language["version"] + ": " + remote.app.getVersion();

//Get the path of the comics folder from the config.JSON
var get_Folder_Path_JSON = get_folder_path_from_JSON(
  CosmicComicsData + "/config.json"
);

//if you have a folder used lasted time then it's loaded
if (get_Folder_Path_JSON != null && get_Folder_Path_JSON != "") {
  document.getElementById("overlaymsg").innerHTML =
    language["overlaymsg_refolder"];
  setTimeout(() => {
    document.getElementById("overlaymsg").innerHTML =
      language["overlaymsg_piracy"];
  }, 5000);
  var listfolder = [];
  listfolder.push(get_Folder_Path_JSON);
  folderRootPath.push(listfolder[0]);
  openFolder_logic(listfolder);
}

//Open the folder
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
    Modify_JSON_For_Config(
      CosmicComicsData + "/config.json",
      "path",
      result[0]
    );
    openFolder_logic(result);
  }
}

//Forget the current folder
function obliviate() {
  Modify_JSON_For_Config(CosmicComicsData + "/config.json", "path", "");
  window.location.reload();
}

//Changing the Update provider
function changeUpdateProvider() {
  Modify_JSON_For_Config(
    CosmicComicsData + "/config.json",
    "update_provider",
    ""
  );
  Toastifycation(language["next_time"], "#00C33C");
}

//Modify the JSON for config.json
function Modify_JSON_For_Config(json, tomodify, modification) {
  var config_JSON = fs.readFileSync(json);
  var config = JSON.parse(config_JSON);
  for (var i in config) {
    config[i][tomodify] = modification;
  }
  var config_JSON_Final = JSON.stringify(config, null, 2);
  fs.writeFileSync(json, config_JSON_Final);
}

//Get element from config.json
function Get_From_Config(what_you_want, data) {
  for (var i in data[0]) {
    if (i == what_you_want) {
      return data[0][i];
    }
  }
  return null;
}

//refresh the folder
function refreshFolder() {
  window.location.href = window.location.href;
}

//get the folder's path from config.json
function get_folder_path_from_JSON(json) {
  var configFile = fs.readFileSync(json);
  var parsedJSON = JSON.parse(configFile);
  return Get_From_Config("path", parsedJSON);
}

//Continue after extracting the image
function Continue_After_Extracting_Image(
  FolderResults,
  result,
  favonly,
  readonly,
  unreadonly,
  readingonly
) {
  if (GetAllIMG == true) {
    loadContent(
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
      Continue_After_Extracting_Image(
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

//Open folder logic
function openFolder_logic(folder) {
  document.getElementById("tutotxt").style.display = "none";
  document.getElementById("opnfld").onclick = "";
  document.getElementById("opnfld").setAttribute("disabled", "");
  document.getElementById("overlay").style.display = "block";
  setTimeout(() => {
    var result = folder;
    if (result) {
      var FolderRes = DetectFilesAndFolders(result[0]);
      var AllFolderRes = DetectAllFilesAndFolders(result[0]);
      AllFolderResults = Check_File_For_Validated_extension(
        AllFolderRes,
        ValidatedExtension
      );
      GetTheFirstImageOfComicsByFolder(AllFolderResults);
      FolderResults = Check_File_For_Validated_extension(
        FolderRes,
        ValidatedExtension
      );
      FolderResults.forEach((file) => {
        var stat = fs.statSync(file);
        var name = patha.basename(file);
        var realname = name.split(".");
        realname = realname[0];
        var shortname = get_the_ID_by_name(realname);
        var Info = Get_From_JSON(
          CosmicComicsData + "/ListOfComics.json",
          shortname
        );
        if (
          Get_element_from_data("read", Info) == "undefined" ||
          Get_element_from_data("read", Info) == null
        ) {
          if (stat.isDirectory()) {
            var obj = {
              fullname: realname,
              name: shortname,
              read: false,
              reading: false,
              unread: true,
              favorite: false,
              last_page: 0,
              folder: true,
              note: -1,
            };

            Add_To_JSON(obj, CosmicComicsData + "/ListOfComics.json");
          } else {
            var obj = {
              fullname: realname,
              name: shortname,
              read: false,
              reading: false,
              unread: true,
              favorite: false,
              last_page: 0,
              folder: false,
              note: -1,
            };

            Add_To_JSON(obj, CosmicComicsData + "/ListOfComics.json");
          }
        }
      });
      Continue_After_Extracting_Image(
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

//Checking if the file have a correct extension (validated)
function Check_File_For_Validated_extension(folderRes, validedextension) {
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

//Modify a JSON file
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

//Add information to JSON
function Add_To_JSON(obj, json) {
  var configFile = fs.readFileSync(json);
  var config = JSON.parse(configFile);
  config.push(obj);
  var configJSON = JSON.stringify(config, null, 2);
  fs.writeFileSync(json, configJSON);
}

//Get element from JSON
function Get_From_JSON(json, name) {
  var data = fs.readFileSync(json);
  var info = JSON.parse(data);
  var Info = GetInfo("name", info, name);
  return Info;
}

//Get information
function GetInfo(search, data, name) {
  for (var i in data) {
    for (var j in data[i]) {
      if (j == search) {
        if (name == data[i][j]) {
          return data[i];
        }
      }
    }
  }
  return null;
}

//Get element from data
function Get_element_from_data(search, data) {
  for (var i in data) {
    if (i == search) {
      return data[i];
    }
  }
  return null;
}

//On RightClick
function RightClick(object = HTMLAnchorElement, lepath) {
  var name = patha.basename(lepath);
  var realname = name.split(".")[0];
  var shortname = get_the_ID_by_name(realname);
  name_of_the_current_book = shortname;

  path_of_the_current_book = lepath;
}

//Loading the content
function loadContent(
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
    var shortname = get_the_ID_by_name(realname);
    var Info = Get_From_JSON(
      CosmicComicsData + "/ListOfComics.json",
      shortname
    );
    if (
      Get_element_from_data("read", Info) == "undefined" ||
      Get_element_from_data("read", Info) == null
    ) {
      if (stat.isDirectory()) {
        var obj = {
          fullname: realname,
          name: shortname,
          read: false,
          reading: false,
          unread: true,
          favorite: false,
          last_page: 0,
          folder: true,
          note: -1,
        };

        Add_To_JSON(obj, CosmicComicsData + "/ListOfComics.json");
      } else {
        var obj = {
          fullname: realname,
          name: shortname,
          read: false,
          reading: false,
          unread: true,
          favorite: false,
          last_page: 0,
          folder: false,
          note: -1,
        };

        Add_To_JSON(obj, CosmicComicsData + "/ListOfComics.json");
      }
    }
  });
  FolderRes.forEach((path, index) => {
    var stat = fs.statSync(path);
    var name = patha.basename(path);
    var realname = name.split(".");
    realname = realname[0];
    var shortname = get_the_ID_by_name(realname);
    var Info = Get_From_JSON(
      CosmicComicsData + "/ListOfComics.json",
      shortname
    );
    var readed = Get_element_from_data("read", Info);
    var reading = Get_element_from_data("reading", Info);
    var favorite_v = Get_element_from_data("favorite", Info);
    if (stat.isDirectory()) {
      var node = document.createTextNode(
        realname + "<br> " + language["folder_p"]
      );
      invertedPath = path.replaceAll("\\", "/");
      if (fs.existsSync(invertedPath + "/folder.cosmic")) {
        imagelink = invertedPath + "/folder.cosmic";
        console.log(imagelink);
      } else if (fs.existsSync(invertedPath + "/folder.cosmic.svg")) {
        imagelink = invertedPath + "/folder.cosmic.svg";
        console.log(imagelink);
      } else {
        imagelink = __dirname + "/Images/folderDefault.png";
      }
    } else if (
      fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)
    ) {
      var node = document.createTextNode(realname);
      var FIOA = fs.readdirSync(
        CosmicComicsData + "/FirstImageOfAll/" + shortname
      );
      var CCDN = CosmicComicsData.replaceAll("\\", "/");
      invertedPath = path.replaceAll("\\", "/");
      if (fs.existsSync(invertedPath + ".cosmic")) {
        imagelink = invertedPath + ".cosmic";
        console.log(imagelink);
      } else if (fs.existsSync(invertedPath + ".cosmic.svg")) {
        imagelink = invertedPath + ".cosmic.svg";
        console.log(imagelink);
      } else {
        if (FIOA.length == 0) {
          console.log(shortname + "/" + shortname + ".jpg not found");

          imagelink = "Images/fileDefault.png";
        } else {
          imagelink = CCDN + "/FirstImageOfAll/" + shortname + "/" + FIOA[0];
        }
      }
    } else {
      console.log(shortname + "/" + shortname + ".jpg not found");
      var node = document.createTextNode(realname);
      imagelink = "Images/fileDefault.png";
    }

    listOfImages.push(imagelink);
    //Setting Card Div
    const carddiv = document.createElement("div");
    if (stat.isDirectory()) {
      carddiv.style.cursor = "pointer";
    }
    carddiv.className = "card";
    carddiv.setAttribute("data-effect", "zoom");
    //button card_save
    const buttonfav = document.createElement("button");
    buttonfav.className = "card__save js-fav";
    buttonfav.type = "button";
    buttonfav.addEventListener("click", function () {
      favorite();
    });
    buttonfav.id = "btn_id_fav_" + shortname;
    new bootstrap.Tooltip(buttonfav, {
      title: language["toogle_fav"],
      placement: "bottom",
    });
    //icon
    const favicon = document.createElement("i");
    favicon.className = "material-icons";
    favicon.innerHTML = "favorite";
    buttonfav.appendChild(favicon);
    carddiv.appendChild(buttonfav);

    //button card__close
    const button_unread = document.createElement("button");
    button_unread.className = "card__close js-unread";
    button_unread.type = "button";
    button_unread.addEventListener("click", function () {
      markasunread();
    });
    button_unread.id = "btn_id_unread_" + shortname;
    new bootstrap.Tooltip(button_unread, {
      title: language["mkunread"],
      placement: "bottom",
    });
    //icon
    const unread_icon = document.createElement("i");
    unread_icon.className = "material-icons";
    unread_icon.innerHTML = "close";

    button_unread.appendChild(unread_icon);
    carddiv.appendChild(button_unread);
    //button card__reading
    const button_reading = document.createElement("button");
    button_reading.className = "card__reading js-reading";
    button_reading.type = "button";
    button_reading.addEventListener("click", function () {
      markasreading();
    });
    button_reading.id = "btn_id_reading_" + shortname;
    new bootstrap.Tooltip(button_reading, {
      title: language["mkreading"],
      placement: "bottom",
    });
    //icon
    const reading_icon = document.createElement("i");
    reading_icon.className = "material-icons";
    reading_icon.innerHTML = "auto_stories";

    button_reading.appendChild(reading_icon);
    carddiv.appendChild(button_reading);
    //button card__read
    const button_read = document.createElement("button");
    button_read.className = "card__read js-read";
    button_read.type = "button";

    button_read.addEventListener("click", function () {
      markasread();
    });
    button_read.id = "btn_id_read_" + shortname;
    new bootstrap.Tooltip(button_read, {
      title: language["mkread"],
      placement: "bottom",
    });
    //ico
    const read_ion = document.createElement("i");
    read_ion.className = "material-icons";
    read_ion.innerHTML = "done";

    button_read.appendChild(read_ion);
    carddiv.appendChild(button_read);
    //button card__info
    const button_info = document.createElement("button");
    button_info.className = "card__info";
    button_info.type = "button";
    button_info.addEventListener("click", function () {
      GetComicInfo();
    });
    new bootstrap.Tooltip(button_info, {
      title: language["info"],
      placement: "bottom",
    });
    //ico
    const info_icon = document.createElement("i");
    info_icon.className = "material-icons";
    info_icon.innerHTML = "info";
    button_info.appendChild(info_icon);
    carddiv.appendChild(button_info);
    //figure card__image
    const cardimage = document.createElement("div");
    cardimage.className = "card__image";
    const imgcard = document.createElement("img");
    imgcard.style.width = "100%";
    imgcard.id = "card_img_id_" + index;
    cardimage.appendChild(imgcard);
    carddiv.appendChild(cardimage);
    //card__body
    const bodycard = document.createElement("div");
    bodycard.className = "card__body";
    //button play
    const playbtn = document.createElement("button");

    playbtn.className = "card__play js-play";
    playbtn.type = "button";
    const playarr = document.createElement("i");
    playarr.className = "material-icons";
    playarr.innerHTML = "play_arrow";
    playbtn.appendChild(playarr);
    bodycard.appendChild(playbtn);
    new bootstrap.Tooltip(playbtn, {
      title: language["Play"],
      placement: "bottom",
    });
    const pcard_bio = document.createElement("p");
    pcard_bio.className = "card__bio";
    pcard_bio.style = "text-align: center;";
    pcard_bio.innerHTML = node.textContent;

    bodycard.appendChild(pcard_bio);
    carddiv.appendChild(bodycard);
    carddiv.id = "id" + n;

    //#region ratingCSS
    const ratingcss = document.createElement("div");

    ratingcss.className = "rating-css hover-effect card__rating";
    const ratinginput1 = document.createElement("input");
    ratinginput1.type = "radio";
    ratinginput1.value = "1";
    ratinginput1.id = "rating3-1_" + index;
    ratinginput1.name = "Rating_" + shortname;
    ratinginput1.addEventListener("click", function () {
      SetForRating1(shortname);
    });

    const label1 = document.createElement("label");
    label1.setAttribute("for", "rating3-1_" + index);
    label1.className = "mdi mdi-star";
    new bootstrap.Tooltip(label1, {
      title: language["star1"],
      placement: "right",
    });
    const ratinginput2 = document.createElement("input");
    ratinginput2.type = "radio";
    ratinginput2.value = "2";
    ratinginput2.id = "rating3-2_" + index;
    ratinginput2.name = "Rating_" + shortname;
    ratinginput2.addEventListener("click", function () {
      SetForRating2(shortname);
    });

    const label2 = document.createElement("label");
    label2.setAttribute("for", "rating3-2_" + index);
    label2.className = "mdi mdi-star";
    new bootstrap.Tooltip(label2, {
      title: language["star2"],
      placement: "right",
    });
    const ratinginput3 = document.createElement("input");
    ratinginput3.type = "radio";
    ratinginput3.value = "3";
    ratinginput3.id = "rating3-3_" + index;
    ratinginput3.name = "Rating_" + shortname;
    ratinginput3.addEventListener("click", function () {
      SetForRating3(shortname);
    });

    const label3 = document.createElement("label");
    label3.setAttribute("for", "rating3-3_" + index);
    label3.className = "mdi mdi-star";
    new bootstrap.Tooltip(label3, {
      title: language["star3"],
      placement: "right",
    });
    const ratinginput4 = document.createElement("input");
    ratinginput4.type = "radio";
    ratinginput4.value = "4";
    ratinginput4.id = "rating3-4_" + index;
    ratinginput4.name = "Rating_" + shortname;
    ratinginput4.addEventListener("click", function () {
      SetForRating4(shortname);
    });

    const label4 = document.createElement("label");
    label4.setAttribute("for", "rating3-4_" + index);
    label4.className = "mdi mdi-star";
    new bootstrap.Tooltip(label4, {
      title: language["star4"],
      placement: "right",
    });
    const ratinginput5 = document.createElement("input");
    ratinginput5.type = "radio";
    ratinginput5.value = "5";
    ratinginput5.id = "rating3-5_" + index;
    ratinginput5.name = "Rating_" + shortname;
    ratinginput5.addEventListener("click", function () {
      SetForRating5(shortname);
    });

    const label5 = document.createElement("label");
    label5.setAttribute("for", "rating3-5_" + index);
    label5.className = "mdi mdi-star";
    new bootstrap.Tooltip(label5, {
      title: language["star5"],
      placement: "right",
    });
    var rating = Get_element_from_data("note", Info);
    console.log(rating);
    if (rating == 1) {
      ratinginput1.checked = true;
    } else if (rating == 2) {
      ratinginput2.checked = true;
    } else if (rating == 3) {
      ratinginput3.checked = true;
    } else if (rating == 4) {
      ratinginput4.checked = true;
    } else if (rating == 5) {
      ratinginput5.checked = true;
    } else if (rating == -1) {
    } else {
      console.log("Error when loading Rating for " + shortname);
    }
    ratingcss.appendChild(ratinginput1);
    ratingcss.appendChild(label1);
    ratingcss.appendChild(ratinginput2);
    ratingcss.appendChild(label2);
    ratingcss.appendChild(ratinginput3);
    ratingcss.appendChild(label3);
    ratingcss.appendChild(ratinginput4);
    ratingcss.appendChild(label4);
    ratingcss.appendChild(ratinginput5);
    ratingcss.appendChild(label5);

    //#endregion

    if (playbtn.addEventListener) {
      if (stat.isDirectory()) {
        carddiv.addEventListener("click", function () {
          launchDetect(path, root);
        });
        playbtn.addEventListener("click", function () {
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
          Modify_JSON_For_Config(
            CosmicComicsData + "/config.json",
            "last_opened",
            path
          );
          window.location.href = "viewer.html?" + path;
        });
      } else {
        playbtn.addEventListener("click", function () {
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
          Modify_JSON_For_Config(
            CosmicComicsData + "/config.json",
            "last_opened",
            path
          );
          window.location.href = "viewer.html?" + path;
        });
      }
      carddiv.addEventListener("mouseover", function (e) {
        e.preventDefault;
        RightClick(this, path);
      });
    }
    n++;
    const element = document.getElementById("ContainerExplorer");
    const divrating = document.createElement("div");
    divrating.appendChild(ratingcss);
    carddiv.appendChild(divrating);
    element.appendChild(carddiv);

    if (stat.isDirectory()) {
      const imgNode = document.createElement("img");
      imgNode.src = "";
      imgNode.style = "padding-top: 330px";
      carddiv.appendChild(imgNode);
    } else if (readed) {
      //readed
      toggleActive(document.getElementById("btn_id_read_" + shortname));
    } else if (reading) {
      //reazading
      toggleActive(document.getElementById("btn_id_reading_" + shortname));
    } else {
      //rien
      toggleActive(document.getElementById("btn_id_unread_" + shortname));
    }

    if (favorite_v) {
      toggleActive(document.getElementById("btn_id_fav_" + shortname));

      //favorite
    } else if (stat.isDirectory()) {
      //fav folder
    } else {
      //pas fav
    }
  });
  preloadImage(listOfImages, n);
}

//preload the images
var preloadedImages = [];
function preloadImage(listImages, n) {
  for (var i = 0; i < listImages.length; i++) {
    preloadedImages[i] = new Image();
    preloadedImages[i].src = listImages[i];
  }
  setTimeout(() => {
    LoadImages(n);
  }, 500);
}

//Add and remove animate.style animations
const animateCSS = (element, animation, prefix = "animate__") =>
  // We create a Promise and return it
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = element;

    node.classList.add(`${prefix}animated`, animationName);

    // When the animation ends, we clean the classes and resolve the Promise
    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(`${prefix}animated`, animationName);
      resolve("Animation ended");
    }

    node.addEventListener("animationend", handleAnimationEnd, { once: true });
  });

//Load Images
function LoadImages(numberOf) {
  var coolanimations = [
    "zoomInDown",
    "rollIn",
    "zoomIn",
    "jackInTheBox",
    "fadeInUp",
    "fadeInDown",
    "fadeIn",
    "bounceInUp",
    "bounceInDown",
    "backInDown",
    "flip",
    "flipInY",
  ];
  var random =
    coolanimations[Math.floor(Math.random() * coolanimations.length)];
  if (numberOf == 0) {
    Toastifycation(language["empty_notSupported"], "#ff0000");
    document.getElementById("overlay").style.display = "none";
    document.getElementById("tutotxt").innerHTML =
      language["empty_notSupported2"] +
      ValidatedExtension +
      language["empty_notSupported3"];
    document.getElementById("tutotxt").style.display = "block";
    document.getElementById("tutotxt").style.fontSize = "24px";
  }
  for (let i = 0; i < numberOf; i++) {
    document.getElementById("tutotxt").style.display = "none";
    animateCSS(document.getElementById("id" + i), random).then((message) => {
      console.log(message);
    });
    try {
      document.getElementById("card_img_id_" + i).src = listOfImages[i];
    } catch (error) {
      document.getElementById("card_img_id_" + i).src =
        __dirname + "/Images/fileDefault.png";
    }
    document.getElementById("overlay").style.display = "none";
  }
}

//Navigate or launch the viewer
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
  FolderResults = Check_File_For_Validated_extension(
    contents,
    ValidatedExtension
  );
  loadContent(FolderResults, root, favonly, readonly, unreadonly, readingonly);
}

//Detect files and folders in the current directory (not recursive)
function DetectFilesAndFolders(dir) {
  var result = [];
  fs.readdirSync(dir).forEach(function (file) {
    file = dir + "/" + file;
    var stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
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

//Sorting number in a string
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

//Get the first image of book by folder to get the cover in the app
function GetTheFirstImageOfComicsByFolder(filesInFolder = [], i = 0) {
  document.getElementById("overlaymsg").innerHTML =
    language["extracting_thumb"] +
    " " +
    i +
    " " +
    language["out_of"] +
    " " +
    filesInFolder.length;
  if (i < filesInFolder.length) {
    CreateFIOAFolder();

    var name = patha.basename(filesInFolder[i]);
    ext = name.split(".").pop();
    name = name.split(".");
    name = name[0];
    var shortname = get_the_ID_by_name(name);

    CreateFolder(shortname, CosmicComicsData + "/FirstImageOfAll");
    if (fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)) {
      if (
        fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)
          .length == 0
      ) {
        unarchive_first(
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
            "*000.jpeg",
            "00.jpeg",
            "00-copie.jpeg",
            "*-00.jpeg",
            "*000.bmp",
            "00.bmp",
            "00-copie.bmp",
            "*-00.bmp",
            "*000.apng",
            "00.apng",
            "00-copie.apng",
            "*-00.apng",
            "*000.svg",
            "00.svg",
            "00-copie.svg",
            "*-00.svg",
            "*000.ico",
            "00.ico",
            "00-copie.ico",
            "*-00.ico",
            "*000.webp",
            "00.webp",
            "00-copie.webp",
            "*-00.webp",
            "*000.gif",
            "00.gif",
            "00-copie.gif",
            "*-00.gif",
          ],
          i,
          filesInFolder
        );
      } else {
        GetTheFirstImageOfComicsByFolder(filesInFolder, i + 1);
      }
    } else {
      unarchive_first(
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
          "*000.jpeg",
          "00.jpeg",
          "00-copie.jpeg",
          "*-00.jpeg",
          "*000.bmp",
          "00.bmp",
          "00-copie.bmp",
          "*-00.bmp",
          "*000.apng",
          "00.apng",
          "00-copie.apng",
          "*-00.apng",
          "*000.svg",
          "00.svg",
          "00-copie.svg",
          "*-00.svg",
          "*000.ico",
          "00.ico",
          "00-copie.ico",
          "*-00.ico",
          "*000.webp",
          "00.webp",
          "00-copie.webp",
          "*-00.webp",
          "*000.gif",
          "00.gif",
          "00-copie.gif",
          "*-00.gif",
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

//Check if the passed element contains numbers
function hasNumbers(t) {
  var regex = /\d/g;
  return regex.test(t);
}

//get the ID of the book by name
function get_the_ID_by_name(the_name = "") {
  the_name = the_name.replaceAll("-", " ");
  the_name = the_name.replaceAll(")", " ");
  the_name = the_name.replaceAll("(", " ");
  the_name = the_name.replaceAll("[", " ");
  the_name = the_name.replaceAll("]", " ");

  var s = the_name.split(" ");
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

//Create the first image of all folder
function CreateFIOAFolder() {
  if (!fs.existsSync(CosmicComicsData + "/FirstImageOfAll")) {
    fs.mkdirSync(CosmicComicsData + "/FirstImageOfAll");
  }
}

//Creating a folder
function CreateFolder(dirname, dirpath) {
  if (!fs.existsSync(dirpath + "/" + dirname)) {
    fs.mkdirSync(dirpath + "/" + dirname);
  }
}

//Unarchive the first element of each archive
function unarchive_first(
  zipPath,
  ExtractDir,
  name,
  ext,
  listofelements,
  indice,
  filesInFolder,
  recursion = 0
) {
  nn = 0;
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
      $cherryPick: listofelements,
      $bin: Path27Zip,
    });
    Stream.on("data", function (data) {
      fromfile = data.file;
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
      if (recursion != 0) {
        console.log("reached");
        if (Stream.info.get("Files") == "0") {
          Toastifycation(
            language["cover_not_compatible"] + " " + name,
            "#ff0000"
          );
          GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
        }
      } else {
        if (Stream.info.get("Files") == "0") {
          unarchive_first(
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
              "*001.gif",
              "01.gif",
              "01-copie.gif",
              "*-01.gif",
              "*001.jpeg",
              "01.jpeg",
              "01-copie.jpeg",
              "*-01.jpeg",
              "*001.bmp",
              "01.bmp",
              "01-copie.bmp",
              "*-01.bmp",
              "*001.apng",
              "01.apng",
              "01-copie.apng",
              "*-01.apng",
              "*001.svg",
              "01.svg",
              "01-copie.svg",
              "*-01.svg",
              "*001.ico",
              "01.ico",
              "01-copie.ico",
              "*-01.ico",
              "*001.webp",
              "01.webp",
              "01-copie.webp",
              "*-01.webp",
            ],
            indice,
            filesInFolder,
            1
          );
        }
      }
    });
    Stream.on("error", function (err) {
      console.log("Error: " + err);
    });
  }

  if (ext == "rar" || ext == "cbr") {
    var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
    var parsedJSON = JSON.parse(configFile);
    var provider = Get_From_Config("update_provider", parsedJSON)
    console.log(provider);
    if (provider == "msstore"){
      var archive = new Unrar({
        path: zipPath,
        bin: CosmicComicsData+ "/unrar_bin/UnRAR.exe",
      });
    }else{
      var archive = new Unrar({
        path: zipPath,
        bin: unrarBin,
      });
    }

    archive.list(function (err, entries) {
      if (err) {
        GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
        return;
      }
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
      for (var i = 0; i < entries.length; i++) {
        const file = entries[i]["name"];
        var currentName = file;
        currentName = currentName.toString();
        if (
          currentName.includes(".png") ||
          currentName.includes(".jpg") ||
          currentName.includes(".jpeg") ||
          currentName.includes(".gif") ||
          currentName.includes(".apng") ||
          currentName.includes(".svg") ||
          currentName.includes(".ico") ||
          currentName.includes(".webp") ||
          currentName.includes(".bmp")
        ) {
          var stream = archive.stream(currentName);
          stream.on("error", function (err) {
            alert("erreur RAR: " + err);
            GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
            return;
          });
          if (fs.existsSync(ExtractDir + "/0.jpg") == false) {
            var x = fs.createWriteStream(ExtractDir + "/0.jpg");
            stream.pipe(x);
            GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
            return;
          }
        }
        if (
          (currentName.includes(".png") ||
            currentName.includes(".jpg") ||
            currentName.includes(".jpeg") ||
            currentName.includes(".gif") ||
            currentName.includes(".apng") ||
            currentName.includes(".svg") ||
            currentName.includes(".ico") ||
            currentName.includes(".webp") ||
            currentName.includes(".bmp")) == false
        ) {
          GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
        }
      }
    });
  }
  if (ext == "pdf") {
    GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
  }
}

//mark book as read
function markasread() {
  if (name_of_the_current_book != "") {
    Toastifycation(language["marked_as_read"], "#00C33C");

    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "reading",
      false,
      name_of_the_current_book
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "unread",
      false,
      name_of_the_current_book
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "read",
      true,
      name_of_the_current_book
    );
    document
      .getElementById("btn_id_read_" + name_of_the_current_book)
      .classList.add("active");
    document
      .getElementById("btn_id_reading_" + name_of_the_current_book)
      .classList.remove("active");
    document
      .getElementById("btn_id_unread_" + name_of_the_current_book)
      .classList.remove("active");

    name_of_the_current_book = "";
  }
}

//mark book as unread
function markasunread() {
  if (name_of_the_current_book != "") {
    Toastifycation(language["marked_as_unread"], "#00C33C");

    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "reading",
      false,
      name_of_the_current_book
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "read",
      false,
      name_of_the_current_book
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "unread",
      true,
      name_of_the_current_book
    );
    document
      .getElementById("btn_id_unread_" + name_of_the_current_book)
      .classList.add("active");

    document
      .getElementById("btn_id_reading_" + name_of_the_current_book)
      .classList.remove("active");
    document
      .getElementById("btn_id_read_" + name_of_the_current_book)
      .classList.remove("active");
  }
}

//marked as reading
function markasreading() {
  if (name_of_the_current_book != "") {
    Toastifycation(language["marked_as_reading"], "#00C33C");

    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "reading",
      true,
      name_of_the_current_book
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "read",
      false,
      name_of_the_current_book
    );
    ModifyJSONFile(
      CosmicComicsData + "/ListOfComics.json",
      "unread",
      false,
      name_of_the_current_book
    );
    document
      .getElementById("btn_id_reading_" + name_of_the_current_book)
      .classList.add("active");

    document
      .getElementById("btn_id_unread_" + name_of_the_current_book)
      .classList.remove("active");
    document
      .getElementById("btn_id_read_" + name_of_the_current_book)
      .classList.remove("active");

    name_of_the_current_book = "";
  }
}

//Toogle Favorite
function favorite() {
  if (name_of_the_current_book != "") {
    var Info = Get_From_JSON(
      CosmicComicsData + "/ListOfComics.json",
      name_of_the_current_book
    );
    var favorite = Get_element_from_data("favorite", Info);
    if (favorite) {
      Toastifycation(language["remove_fav"], "#00C33C");

      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "favorite",
        false,
        name_of_the_current_book
      );
      toggleActive(
        document.getElementById("btn_id_fav_" + name_of_the_current_book)
      );
    } else {
      Toastifycation(language["add_fav"], "#00C33C");
      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "favorite",
        true,
        name_of_the_current_book
      );
      toggleActive(
        document.getElementById("btn_id_fav_" + name_of_the_current_book)
      );
    }
    name_of_the_current_book = "";
  }
}

//(Not Working, old idea to make a navigation by filters)
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

//Continue the reading of the last opened book
function continuereading() {
  var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(configFile);
  var path = Get_From_Config("last_opened", parsedJSON);
  window.location.href = "viewer.html?" + path;
}

//Open a single file
function OpenFileOnce() {
  let result = remote.dialog.showOpenDialogSync({
    properties: ["openFile"],
  });
  window.location.href = "viewer.html?" + result[0];
}

//Open a book in the bookmarks
function openBOOKM(path) {
  window.location.href = "viewer.html?" + path;
}

//List of Bookmarked folder
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
        file["full_name"] +
        " " +
        language["page"] +
        " " +
        (parseInt(file["page"]) + 1);
      document.getElementById("bookmarkContainer").appendChild(btn);
    }
  });
  if (info.length == 0){
      var iblock = document.createElement("i")
  iblock.innerHTML = "block"
  iblock.className = "material-icons"
  document.getElementById("bookmarkContainer").appendChild(iblock)
  }

}

//the Bookmarked loading
listBM();

//Loading ToolTips and languages
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
new bootstrap.Tooltip(document.getElementById("id_tips-btn"), {
  title: language["Tips"],
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
document.getElementById("id_tips").innerHTML = language["Tips"];
document.getElementById("id_did_you_know").innerHTML = language["did_you_know"];
document.getElementById("id_tip_1").innerHTML = language["tips_1"];
document.getElementById("id_tip_2").innerHTML = language["tips_2"];
document.getElementById("id_tip_3").innerHTML = language["tips_3"];
document.getElementById("id_btn_update_provider").innerHTML =
  language["btn_update_provider"];
document.getElementById("id_btn_appdata").innerHTML = language["btn_appdata"];
document.getElementById("id_btn_ComicsFolder").innerHTML =
  language["btn_ComicsFolder"];
document.getElementById("id_btn_Temp").innerHTML = language["btn_Temp"];
document.getElementById("tutotxt").innerHTML = language["tuto_txt"];

//Get Available Languages
function getAvailableLanguages() {
  return fs.readdirSync(__dirname + "/languages");
}

//Get the flags by a cdn
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

//Insert the flags in the settings
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
    AContainer.id = "id_lang" + l;

    AContainer.addEventListener("click", () => {
      changeLang(l);
    });
    AContainer.style.margin = "10px";
    AContainer.appendChild(flagI);
    document.getElementById("lang_container").appendChild(AContainer);
    new bootstrap.Tooltip(document.getElementById("id_lang" + l), {
      title: l,
      placement: "bottom",
    });
  });
}

//Change the language of the app
function changeLang(langues) {
  Modify_JSON_For_Config(
    CosmicComicsData + "/config.json",
    "language",
    langues
  );
  window.location.reload();
}

//Loading flags
insertFlags();

//Send Notification
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

//Launch the page to get the book informations
function GetComicInfo() {
  if (path_of_the_current_book != "") {
    window.location.href = "display.html?" + path_of_the_current_book;
  }
}

//Handle the drag and drop to open files in the app
document.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();

  for (const f of event.dataTransfer.files) {
    // Using the path attribute to get absolute file path
    console.log("File Path of dragged files: ", f.path);
    if (
      f.path.includes(".cbz") ||
      f.path.includes(".cbr") ||
      f.path.includes(".cbt") ||
      f.path.includes(".cb7") ||
      f.path.includes(".zip") ||
      f.path.includes(".rar") ||
      f.path.includes(".7z") ||
      f.path.includes(".tar")
    ) {
      window.location.href = "viewer.html?" + f.path;
    } else {
      Toastifycation(language["drag&drop_fail"], "#ff0000");
    }
  }
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener("dragenter", (event) => {
  console.log("File is in the Drop Space");
});

document.addEventListener("dragleave", (event) => {
  console.log("File has left the Drop Space");
});

//Modify the Comics JSON at the note element by the user's note
function SetForRating1(name_of_book) {
  var rated = document
    .getElementsByName("Rating_" + name_of_book)
    .forEach((rate) => {
      if (rate.checked) {
        ModifyJSONFile(
          CosmicComicsData + "/ListOfComics.json",
          "note",
          parseInt(rate.value),
          name_of_book
        );
      }
    });
}
function SetForRating2(name_of_book) {
  var rated = document
    .getElementsByName("Rating_" + name_of_book)
    .forEach((rate) => {
      if (rate.checked) {
        ModifyJSONFile(
          CosmicComicsData + "/ListOfComics.json",
          "note",
          parseInt(rate.value),
          name_of_book
        );
      }
    });
}
function SetForRating3(name_of_book) {
  document.getElementsByName("Rating_" + name_of_book).forEach((rate) => {
    if (rate.checked) {
      ModifyJSONFile(
        CosmicComicsData + "/ListOfComics.json",
        "note",
        parseInt(rate.value),
        name_of_book
      );
    }
  });
}
function SetForRating4(name_of_book) {
  var rated = document
    .getElementsByName("Rating_" + name_of_book)
    .forEach((rate) => {
      if (rate.checked) {
        ModifyJSONFile(
          CosmicComicsData + "/ListOfComics.json",
          "note",
          parseInt(rate.value),
          name_of_book
        );
      }
    });
}
function SetForRating5(name_of_book) {
  var rated = document

    .getElementsByName("Rating_" + name_of_book)
    .forEach((rate) => {
      if (rate.checked) {
        ModifyJSONFile(
          CosmicComicsData + "/ListOfComics.json",
          "note",
          parseInt(rate.value),
          name_of_book
        );
      }
    });
}

// Toggle "active" class
function toggleActive(object) {
  object.classList.toggle("active");
}

//Open the loaded comics folder
function OpenComicsFolder() {
  shell.showItemInFolder(get_Folder_Path_JSON);
}

//Open the Temporary folder
function OpenTempDirectory() {
  shell.showItemInFolder(CosmicComicsTempI);
}

//Open the Appdata folder
function OpenAppDataFolder() {
  shell.showItemInFolder(CosmicComicsData)
}

//Keyboard Shortcuts
window.addEventListener("keydown", (e) => {
  if (e.code == "KeyC") {
    continuereading();
  } else if (e.code == "KeyF") {
    obliviate();
  } else if (e.code == "KeyR") {
    refreshFolder();
  } else if (e.code == "KeyO") {
    OpenFileOnce();
  } else if (e.code == "KeyD") {
    openFolder();
  }
});
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

//set force update
function setFU(){
  Modify_JSON_For_Config(CosmicComicsData + "/config.json","force_update",true)
  Toastifycation(language["force_update_msg"])
  setTimeout(() => {
    app.relaunch()
    app.exit();
  }, 1000);
}
document.getElementById("id_btn_FU").innerHTML = language["FU"];