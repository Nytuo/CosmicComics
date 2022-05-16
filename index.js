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
//All other variables and constants
const ValidatedExtension = ["cbr", "cbz", "pdf", "zip", "7z", "cb7", "tar", "cbt", "rar",];
var imagelink = "null";
var nabc = 0;
var listOfImages = [];
var name_of_the_current_book = "";
var path_of_the_current_book = "";
var folderRootPath = [];
var favonly = false;
var readonly = false;
var unreadonly = false;
var readingonly = false;

var global_I_PRGS = 0;
const url = document.createElement("a");
url.setAttribute("href", window.location.href);
var domain = url.hostname;
var port = url.port;
var currentUser = ""
var connected = getCookie("selectedProfile");
console.log(connected);
if (connected == null){
    window.location.href = "login";
}else{
    fetch("http://" + domain + ":" + port + "/profile/logcheck/"+connected).then(function (response) {
        return response.text();
    }).then(function (data) {
        if (data === "false"){
            window.location.href = "login";
        }else{
            currentUser = data;
        }
    }).catch(function (error) {
        console.log(error);
    });
}
fetch("http://" + domain + ":" + port + "/config/getConfig/"+connected).then(function (response) {
    return response.text();
}).then(function (data) {
    d = GetElFromInforPath("display_style", JSON.parse(data))
    var cardMode = _01toBool(d);

}).catch(function (error) {
    console.log(error);
});
var cardMode = true;

function GetElFromInforPath(search, info) {
    for (var i in info) {
        console.log(i)
        if (i == search) {
            return info[i];
        }
    }
    return null;
}

var theme_BG = "#181818";
var theme_FG = "white";
var theme_BG_CI = "rgba(0,0,0,0.753)";
var currenttheme;

fetch("http://" + domain + ":" + port + "/config/getConfig/"+connected).then(function (response) {
    return response.text();
}).then(function (data) {
    currenttheme = GetElFromInforPath("theme", JSON.parse(data))
    console.log(currenttheme)
    Themes();

}).catch(function (error) {
    console.log(error);
});
var theme_O2 = "black";
var theme_notifBG = "rgb(143, 143, 143)";
var theme_button_card = "";
var theme_progress = "";
var theme_hover_listview = "#242424";
var theme_nohover_listview = "transparent";
var theme_hover_close;
var theme_btn_FG = "white";
var theme_btn_BG = "#0d6efd";
var theme_btn_FG_s = "white";
var theme_btn_BG_s = "#6c757d";
var theme_btn_border = theme_btn_BG;
var theme_btn_hover = "#0b5ed7";
var theme_btn_border_s = theme_btn_BG;
var theme_btn_hover_s = "#5c636a";
var linkBG = "";
document.getElementsByTagName("html")[0].className = "black";
document.getElementById("btn_close_icon_about").className = "btn-close btn-close-white";

function _01toBool(number) {
    return number === 0;
}

var CosmicComicsData = "C:/Users/Public/Cosmic-Comics/data";
var CosmicComicsTemp = "C:/Users/Public/Cosmic-Comics/data";
var CosmicComicsTempI = "C:/Users/Public/Cosmic-Comics/data";
fetch("http://" + domain + ":" + port + "/dirname").then(function (response) {
    return response.text();
}).then(function (data) {
    dirnameFE = data;
    CosmicComicsData = dirnameFE + "/CosmicComics_data";
    CosmicComicsTemp = dirnameFE + "/public/CosmicComics_local";
    CosmicComicsTempI = CosmicComicsTemp + "/current_book/";
    console.log(CosmicComicsTempI);

}).catch(function (error) {
    console.log(error);
});

function setTheme(theme) {
    document.head.getElementsByTagName("link")[5].href = "/themes/" + theme;
}

fetch("http://" + domain + ":" + port + "/config/getConfig/"+connected).then(function (response) {
    return response.text();
}).then(function (data) {
    let currenttheme = GetElFromInforPath(
        "theme",
        JSON.parse(data))
    console.log(currenttheme)
    setTheme(currenttheme);

}).catch(function (error) {
    console.log(error);
});
var GetAllIMG = false;

//ToolTips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

var language;
getResponse();
console.log(language)

async function getResponse() {
    console.log("begin Request")
    const response = await fetch("http://" + domain + ":" + port + "/config/getConfig/"+connected);
    console.log("Requested")

    const dataa = await response.json().then((data) => {
        console.log(data)
        var configFile = data;
        configFile = JSON.stringify(configFile);
        var parsedJSON = JSON.parse(configFile);
        var configlang = GetElFromInforPath("language", parsedJSON);
        console.log(configlang);
        fetch("http://" + domain + ":" + port + "/lang/" + configlang).then((response) => {
            response.json().then((datoo) => {
                console.log(datoo);
                language = datoo;
            });
        });
    });
}

//Get the version and display it on the info
fetch("http://" + domain + ":" + port + "/getVersion").then(function (response) {
    return response.text();
}).then(function (data) {
    document.getElementById("version").innerHTML = "Version : " + data;
}).catch(function (error) {
    console.log(error);
});


//Add and remove animate.style animations
const animateCSS = (element, animation, prefix = "animate__") => // We create a Promise and return it
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

        node.addEventListener("animationend", handleAnimationEnd, {once: true});
    });


async function getFromDB(dbname, request) {
    const option = {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
            "request": request
        }, null, 2)
    };
    return fetch('http://' + domain + ":" + port + '/DB/get/'+connected+"/" + dbname, option).then(function (response) {
        return response.text();
    }).then(function (data) {
        return data;
    }).catch(function (error) {
        console.log(error);
    });
}

async function InsertIntoDB(dbname, dbinfo, values) {
    const option = {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
            "into": dbinfo, "val": values
        }, null, 2)
    };
    return fetch('http://' + domain + ":" + port + '/DB/insert/'+connected+"/" + dbname, option);
}


async function deleteLib(elElement) {
    let confirmDelete = confirm("Would you like to delete " + elElement["NAME"] + " ?");
    if (confirmDelete) {
        await fetch('http://' + domain + ":" + port + '/DB/lib/delete/'+connected+"/" + elElement["ID_LIBRARY"]).then(() => {
            alert("The library has been deleted");
            location.reload();
        });

    }
}

function getCookie(cName) {
    const name = cName + "=";
    const cDecoded = decodeURIComponent(document.cookie); //to be careful
    const cArr = cDecoded .split('; ');
    let res;
    cArr.forEach(val => {
        if (val.indexOf(name) === 0) res = val.substring(name.length);
    })
    return res;
}


function modifyLib(elElement) {
    document.getElementById("id_lib").innerHTML = "Modify a library";

    document.getElementById("namelocation").value = elElement["NAME"];
    document.getElementById("locationa").value = elElement["PATH"];

    document.getElementById("opt" + elElement["API_ID"]).setAttribute("selected", "true");
    document.getElementById("opt" + elElement["API_ID"]).selected = true;
    document.getElementById("sendlib").innerHTML = "Modify library";
    document.getElementById("sendlib").onclick =
        function () {

            return updateLibrary({'form': [document.getElementById('namelocation'), document.getElementById('locationa'), document.getElementById('providerID')]}, elElement["ID_LIBRARY"]);
        };


}

function resetLibModal() {
    document.getElementById("id_lib").innerHTML = "Adding a library";
    document.getElementById("namelocation").removeAttribute('value');
    document.getElementById("locationa").removeAttribute("value");
    document.getElementById("namelocation").value = "";
    document.getElementById("locationa").value = "";


    document.getElementById("opt1").removeAttribute("selected");
    document.getElementById("opt2").removeAttribute("selected");
    document.getElementById("opt3").removeAttribute("selected");
    document.getElementById("opt0").setAttribute("selected", "true");
    document.getElementById("opt1").selected = false;
    document.getElementById("opt2").selected = false;
    document.getElementById("opt3").selected = false;
    document.getElementById("opt0").selected = true;
    document.getElementById("sendlib").onclick =
        function () {
            return addLibrary({'form': [document.getElementById('namelocation'), document.getElementById('locationa'), document.getElementById('providerID')]});
        };


}

function refreshMetadata(elElement) {
    alert(elElement);
}

function refreshLibrary(elElement) {
    alert(elElement);
}

function discoverFolders() {
    var listofFolder;
    getFromDB("Libraries", "* FROM Libraries").then((res) => {
        listofFolder = JSON.parse(res);
        console.log(listofFolder);
        listofFolder.forEach((el) => {
            const div = document.createElement("div");
            var btn = document.createElement("button");
            btn.id = el["NAME"];
            btn.addEventListener("click", function () {
                document.querySelectorAll(".selectLib").forEach((el) => {
                    el.classList.remove("selectLib");
                })
                btn.classList.add("selectLib");
                document.getElementById("ContainerExplorer").innerHTML = "";
                document.getElementById("overlay").style.display = "none"
                document.getElementById("overlay2").style.display = "none"
                document.getElementById("contentViewer").style.display = "none"
                document.getElementById("LibTitle").innerHTML = el["NAME"]
                openFolder_logic(el["PATH"], el["API_ID"]);
            });
            if (el["API_ID"] === 1) {
                const marvelogo = document.createElement("img");
                marvelogo.src = "./Images/marvel-logo-png-10.png";
                marvelogo.style.width = "25px";
                marvelogo.style.float = "left";
                marvelogo.style.lineHeight = "1"
                btn.appendChild(marvelogo);
            } else if (el["API_ID"] === 2) {
                const marvelogo = document.createElement("img");
                marvelogo.src = "./Images/android-chrome-512x512.png";
                marvelogo.style.width = "25px";
                marvelogo.style.float = "left";
                marvelogo.style.lineHeight = "1"
                btn.appendChild(marvelogo);
            }
            btn.appendChild(document.createTextNode(el["NAME"]));
            btn.className = "btn btns libbtn";
            div.style.display = "flex";
            btn.style.float = "left";
            const menu = document.createElement("button");
            menu.innerHTML = "<span class='material-icons'>more_vert</span>"
            menu.className = "btn libmenu"
            menu.style.float = "right";
            const ul = document.createElement("ul");
            const li = document.createElement("li");
            const li2 = document.createElement("li");
            const li3 = document.createElement("li");
            const li4 = document.createElement("li");
            li.innerHTML = "Delete";
            li2.innerHTML = "Modify";
            li2.setAttribute("data-bs-toggle", "modal");
            li2.setAttribute("data-bs-target", "#lib");
            li3.innerHTML = "Refresh metadata";
            li4.innerHTML = "Refresh library";
            li.addEventListener("click", function () {
                deleteLib(el);
            });
            li2.addEventListener("click", function () {
                modifyLib(el);
            });
            li3.addEventListener("click", function () {
                refreshMetadata(el);
            });
            li4.addEventListener("click", function () {
                refreshLibrary(el);
            });
            ul.appendChild(li);
            ul.appendChild(li2);
            ul.appendChild(li3);
            ul.appendChild(li4);
            ul.className = "contextMenu";
            ul.style.left = "15vw";
            ul.style.display = "none";


            document.body.appendChild(ul);
            menu.addEventListener("click", function () {
                ul.style.top = menu.offsetTop + 70 + "px";
                ul.style.display = "flex";
                ul.addEventListener("click", function () {
                    ul.style.display = "none";
                });
                document.addEventListener("click", function (e) {
                    if (e.target != menu && e.target != ul && e.target != li && e.target != li2 && e.target != li3 && e.target != li4 && e.target != btn && e.target != menu.children[0]) {
                        ul.style.display = "none";
                    }

                });
            });
            div.appendChild(btn);
            div.appendChild(menu);

            document.getElementById("folderExplorer").appendChild(div);
        });

    })
}

discoverFolders();

//Open the folder
function openFolder() {
    let result = remote.dialog.showOpenDialogSync({
        properties: ["openDirectory"],
    });
    if (result) {
        document.getElementById("overlaymsg").innerHTML = language["overlaymsg_opening"];
        setTimeout(() => {
            document.getElementById("overlaymsg").innerHTML = language["overlaymsg_takecare"];
        }, 5000);
        folderRootPath.push(result[0]);
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "path", result[0]);
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
    Modify_JSON_For_Config(CosmicComicsData + "/config.json", "update_provider", "");
    Toastifycation(language["next_time"], "#00C33C");
}

function modifyConfigJson(json, tomod, mod) {
    //check si obj exist pour remplacer valeur

    fetch("http://" + domain + ":" + port + "/config/getConfig/"+connected).then(function (response) {
        return response.text();
    }).then(function (data) {
        var configFile = data;
        var config = JSON.parse(configFile);
        for (var i in config) {
            config[tomod] = mod;
        }
        const option = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config, null, 2)
        };
        fetch('/config/writeConfig/'+connected, option);
    }).catch(function (error) {
        console.log(error);
    });

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
        if (i === what_you_want) {
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
function Continue_After_Extracting_Image(FolderResults, result, favonly, readonly, unreadonly, readingonly) {
    if (GetAllIMG === true) {
        loadContent(FolderResults, result[0], favonly, readonly, unreadonly, readingonly);
    } else if (GetAllIMG == null) {
        alert(language["err_img"]);
    } else {
        setTimeout(() => {
            Continue_After_Extracting_Image(FolderResults, result, favonly, readonly, unreadonly, readingonly);
        }, 500);
    }
}

async function DetectFolderInLibrary(result) {
    result = result.replaceAll("\\", "/");
    result = result.replaceAll("//", "/");
    result = result.replaceAll("/", "ù");
    return fetch("http://" + domain + ":" + port + "/getListOfFolder/" + result).then(function (response) {
        return response.text();
    }).then(function (data) {
        return data;
    }).catch(function (error) {
        console.log(error);
    });
}

//Open folder logic
function openFolder_logic(folder, provider = 3) {
    document.getElementById("home").style.display = "none";
    document.getElementById("overlay").style.display = "block";

    setTimeout(() => {
        var result = folder.toString();


        if (result) {
            console.log(result);

            /*
                        var FolderRes = DetectFilesAndFolders(result[0]);
            */
            DetectFolderInLibrary(result).then((data) => {
                console.log(data);
                if (data.length <= 0) throw new Error("Folder empty or not found");

                //Ajouter a la DB les dossiers trouvés en tant que Collection
                loadContent(provider, data, result);
            });
            /*var AllFolderRes = DetectAllFilesAndFolders(result[0]);
            var AllFolderResults = Check_File_For_Validated_extension(
                AllFolderRes,
                ValidatedExtension
            );
            AllFolderResults.sort((a, b) => {
                let fa = a.substring(a.lastIndexOf(".") + 1);
                let fb = b.substring(b.lastIndexOf(".") + 1);
                if (fa < fb) {
                    return 1;
                }
                if (fa > fb) {
                    return -1;
                }
                return 0;
            });
            /!*
                        GetTheFirstImageOfComicsByFolder(AllFolderResults);
            *!/

            /!*Set the books into the DB*!/
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
                    Get_element_from_data("read", Info) === "undefined" ||
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
            loadContent(
                FolderResults,
                result,
                favonly,
                readonly,
                unreadonly,
                readingonly
            );*/
        } else {
            document
                .getElementById("opnfld")
                .setAttribute("onclick", "openFolderDialog()");
            document.getElementById("opnfld").removeAttribute("disabled");
            animateCSS(document.getElementById("overlay"), "fadeOut").then((message) => {
                document.getElementById("overlay").style.display = "none";
                document.getElementById("ContainerExplorer").style.display = "flex";

            });
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
            if (config[i][j] === name) {
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
            if (j === search) {
                if (name === data[i][j]) {
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
        if (i === search) {
            return data[i];
        }
    }
    return null;
}

//On RightClick
function RightClick(object = HTMLAnchorElement, lepath, name) {

    var realname = name
    var shortname = get_the_ID_by_name(realname);
    name_of_the_current_book = shortname;

    path_of_the_current_book = lepath;
}

async function getAPIANILIST(name) {
    return fetch("http://" + domain + ":" + port + "/api/anilist/search/" + name).then(function (response) {
        return response.text();
    }).then(function (data) {
        data = JSON.parse(data);
        console.log(data);
        return data;

    }).catch(function (error) {
        console.log(error);
    });
}

function loadView(FolderRes, libraryPath, date = "", provider = 2) {
    var n = 0;
    var listOfImages = [];
    document.getElementById("overlay2").style.display = "none";
    /*FolderResults.forEach((file) => {
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
            Get_element_from_data("read", Info) === "undefined" ||
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
    });*/
    const divlist = document.createElement("div");
    divlist.className = "list-group";
    FolderRes = FolderRes.replaceAll("\\", "/");
    FolderRes = FolderRes.replaceAll("//", "/");
    FolderRes = FolderRes.replaceAll("/", "ù");
    fetch("http://" + domain + ":" + port + "/getListOfFilesAndFolders/" + FolderRes).then((response) => {
        return response.text();
    }).then(async (data) => {
        data = JSON.parse(data);
        for (let index = 0; index < data.length; index++) {

            const path = data[index];
            console.log(path);
            var name = path.replaceAll(libraryPath.replaceAll("\\", "/"), "").replace("/", "");
            var realname = /[^\\\/]+(?=\.[\w]+$)|[^\\\/]+$/.exec(name)[0];
            console.log(realname);
            var shortname = get_the_ID_by_name(realname);
            await getFromDB("Books", "* FROM Books WHERE PATH = '" + path + "'").then(async (resa) => {
                let bookList = JSON.parse(resa);
                let TheBook = bookList[0];
                console.log(TheBook);
                if (bookList.length === 0) {
                    if (provider == 1) {
                        await GETMARVELAPI_Comics(realname, date).then(async (cdata) => {
//set the default book  values
                            if (cdata == undefined) {
                                throw new Error("no data");
                            }
                            if (cdata["data"]["total"] > 0) {
                                cdata = cdata["data"]["results"][0];
                                await InsertIntoDB("Books", "", `(?,'${shortname}','${realname}',${0},${0},${1},${0},${0},${0},'${path}','${cdata["thumbnail"].path + "/detail." + cdata["thumbnail"].extension}','${cdata["issueNumber"]}','${cdata["description"].replaceAll("'", "''")}','${cdata["format"]}',${cdata["pageCount"]},'${JSON.stringify(cdata["urls"])}','${JSON.stringify(cdata["series"])}','${JSON.stringify(cdata["creators"])}','${JSON.stringify(cdata["characters"])}','${JSON.stringify(cdata["prices"])}','${JSON.stringify(cdata["dates"])}','${JSON.stringify(cdata["collectedIssues"])}','${JSON.stringify(cdata["collections"])}','${JSON.stringify(cdata["variants"])}')`).then(() => {

                                    console.log("inserted");

                                    TheBook = {
                                        ID_book: shortname,
                                        NOM: realname,
                                        read: 0,
                                        reading: 0,
                                        unread: 1,
                                        favorite: 0,
                                        last_page: 0,
                                        folder: 0,
                                        note: -1,
                                        PATH: path,
                                        URLCover: cdata["thumbnail"].path + "/detail." + cdata["thumbnail"].extension,
                                        issueNumber: cdata["issueNumber"],
                                        description: cdata["description"],
                                        format: cdata["format"],
                                        pageCount: cdata["pageCount"],
                                        URLs: cdata["urls"],
                                        series: cdata["series"],
                                        creators: cdata["creators"],
                                        characters: cdata["characters"],
                                        prices: cdata["prices"],
                                        dates: cdata["dates"],
                                        collectedIssues: cdata["collectedIssues"],
                                        collections: cdata["collections"],
                                        variants: cdata["variants"]
                                    }
                                });
                                await GETMARVELAPI_Creators(cdata["id"], "comics").then(async (ccdata) => {
                                    ccdata = ccdata["data"]["results"];
                                    for (let i = 0; i < ccdata.length; i++) {
                                        await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["fullName"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}',${null},'${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    }

                                })
                                await GETMARVELAPI_Characters(cdata["id"], "comics").then(async (ccdata) => {
                                    ccdata = ccdata["data"]["results"];
                                    for (let i = 0; i < ccdata.length; i++) {
                                        await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["name"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}','${ccdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    }

                                })
                            } else {
                                await InsertIntoDB("Books", "", `(?,'${shortname}','${realname}',${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}')`).then(() => {
                                    console.log("inserted");
                                    TheBook = {
                                        ID_book: shortname,
                                        NOM: realname,
                                        read: 0,
                                        reading: 0,
                                        unread: 1,
                                        favorite: 0,
                                        last_page: 0,
                                        folder: 0,
                                        note: -1,
                                        PATH: path,
                                        URLCover: null,
                                        issueNumber: null,
                                        description: null,
                                        format: null,
                                        pageCount: null,
                                        URLs: null,
                                        series: null,
                                        creators: null,
                                        characters: null,
                                        prices: null,
                                        dates: null,
                                        collectedIssues: null,
                                        collections: null,
                                        variants: null
                                    }
                                });
                            }

                        })

                    } else if (provider == 2) {
                        await InsertIntoDB("Books", "", `(?,'${shortname}','${realname}',${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}')`).then(() => {
                            console.log("inserted");
                            TheBook = {
                                ID_book: shortname,
                                NOM: realname,
                                read: 0,
                                reading: 0,
                                unread: 1,
                                favorite: 0,
                                last_page: 0,
                                folder: 0,
                                note: -1,
                                PATH: path,
                                URLCover: null,
                                issueNumber: null,
                                description: null,
                                format: null,
                                pageCount: null,
                                URLs: null,
                                series: null,
                                creators: null,
                                characters: null,
                                prices: null,
                                dates: null,
                                collectedIssues: null,
                                collections: null,
                                variants: null
                            }
                        });
                    }

                }

                /*        var Info = Get_From_JSON(
CosmicComicsData + "/ListOfComics.json",
shortname
);*/
                /*        var readed = Get_element_from_data("read", Info);
                        var reading = Get_element_from_data("reading", Info);
                        var favorite_v = Get_element_from_data("favorite", Info);*/
                /*if (
                    fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)
                ) {
                    var node = document.createTextNode(realname);
                    var FIOA = fs.readdirSync(
                        CosmicComicsData + "/FirstImageOfAll/" + shortname
                    );
                    var CCDN = CosmicComicsData.replaceAll("\\", "/");
                    invertedPath = path.replaceAll("\\", "/");
                    if (fs.existsSync(path_without_file + "/coverAll.cosmic")) {
                        imagelink = path_without_file + "/coverAll.cosmic";
                        console.log(imagelink);
                    } else if (fs.existsSync(invertedPath + ".cosmic")) {
                        imagelink = invertedPath + ".cosmic";
                        console.log(imagelink);
                    } else if (fs.existsSync(invertedPath + ".cosmic.svg")) {
                        imagelink = invertedPath + ".cosmic.svg";
                        console.log(imagelink);
                    } else {
                        if (FIOA.length === 0) {
                            console.log(shortname + "/" + shortname + ".jpg not found");
                            if (fs.existsSync(path_without_file + "/folder.cosmic")) {
                                imagelink = path_without_file + "/folder.cosmic";
                                console.log(imagelink);
                            } else {*/
                imagelink = TheBook["URLCover"];
                var node = document.createTextNode(TheBook["NOM"]);

                /*}
            } else {
                imagelink = CCDN + "/FirstImageOfAll/" + shortname + "/" + FIOA[0];
            }
            }
            }

        else
            {
                console.log(shortname + "/" + shortname + ".jpg not found");
                var node = document.createTextNode(realname);
                if (fs.existsSync(path_without_file + "/folder.cosmic")) {
                    imagelink = path_without_file + "/folder.cosmic";
                    console.log(imagelink);
                } else {
                    imagelink = "Images/fileDefault.png";
                }
            }*/

//Setting Card Div
                const carddiv = document.createElement("div");
                carddiv.style.cursor = "pointer";
                if (cardMode === true) {
                    const rib = document.createElement("div");
                    if (TheBook["unread"] == 1) {
                        rib.className = "ribbon-1";
                    }
                    carddiv.className = "cardcusto";
                    carddiv.setAttribute("data-effect", "zoom");
                    //button card_save
                    const buttonfav = document.createElement("button");
                    buttonfav.className = "card__save js-fav";
                    buttonfav.type = "button";
                    buttonfav.addEventListener("click", function () {
                        favorite();
                    });
                    buttonfav.id = "btn_id_fav_" + TheBook["ID_book"];

                    //icon
                    const favicon = document.createElement("i");
                    favicon.className = "material-icons";
                    favicon.innerHTML = "favorite";
                    if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;

                    buttonfav.appendChild(favicon);
                    carddiv.appendChild(buttonfav);

                    //button card__close
                    const button_unread = document.createElement("button");
                    button_unread.className = "card__close js-unread";

                    button_unread.type = "button";
                    button_unread.addEventListener("click", function () {
                        markasunread();
                    });
                    button_unread.id = "btn_id_unread_" + TheBook["ID_book"];

                    //icon
                    const unread_icon = document.createElement("i");
                    unread_icon.className = "material-icons";
                    unread_icon.innerHTML = "close";
                    if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;

                    button_unread.appendChild(unread_icon);
                    carddiv.appendChild(button_unread);
                    //button card__reading
                    const button_reading = document.createElement("button");
                    button_reading.className = "card__reading js-reading";
                    button_reading.type = "button";
                    button_reading.addEventListener("click", function () {
                        markasreading();
                    });
                    button_reading.id = "btn_id_reading_" + TheBook["ID_book"];

                    //icon
                    const reading_icon = document.createElement("i");
                    reading_icon.className = "material-icons";
                    reading_icon.innerHTML = "auto_stories";
                    if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;

                    button_reading.appendChild(reading_icon);
                    carddiv.appendChild(button_reading);
                    //button card__read
                    const button_read = document.createElement("button");
                    button_read.className = "card__read js-read";
                    button_read.type = "button";

                    button_read.addEventListener("click", function () {
                        markasread();
                    });
                    button_read.id = "btn_id_read_" + TheBook["ID_book"];

                    //ico
                    const read_ion = document.createElement("i");
                    read_ion.className = "material-icons";
                    read_ion.innerHTML = "done";
                    if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;

                    button_read.appendChild(read_ion);
                    carddiv.appendChild(button_read);
                    //figure card__image
                    const cardimage = document.createElement("div");
                    cardimage.className = "card__image";
                    cardimage.style.backgroundColor = theme_BG_CI;
                    const imgcard = document.createElement("img");
                    imgcard.style.width = "100%";
                    imgcard.id = "card_img_id_" + index;
                    imgcard.src = imagelink;


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
                    playarr.style.color = theme_button_card;
                    playbtn.appendChild(playarr);
                    bodycard.appendChild(playbtn);

                    const pcard_bio = document.createElement("p");
                    pcard_bio.className = "card__bio";
                    pcard_bio.style = "text-align: center;";
                    pcard_bio.style.color = theme_FG;
                    pcard_bio.innerHTML = node.textContent;

                    bodycard.appendChild(pcard_bio);
                    carddiv.appendChild(bodycard);
                    carddiv.id = "id_vol" + n;

                    if (playbtn.addEventListener) {

                        playbtn.addEventListener("click", function () {
                            /*            ModifyJSONFile(
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
                                        );*/
                            alert("ici4")
                            let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"))

                            window.location.href = "viewer.html?" + encoded;

                        });
                        carddiv.addEventListener("click", async function () {
                            if (provider == 1) {
                                console.log(TheBook)
                                document.getElementById("DLBOOK").addEventListener("click", function (e) {

                                    let path = TheBook.PATH;
                                    console.log(path);
                                    downloadBook(path);

                                })

                                //TODO FD

                                document.getElementById("relations").innerHTML = "";

                                document.getElementById("id").innerHTML = "This is a : " + TheBook.format + " and it have : " + TheBook.pageCount + " pages. <br/> This is part of the series : " + JSON.parse(TheBook.series).name;
                                document.getElementById("averageProgress").style.display = "none";
                                document.getElementById("ContentView").innerHTML = "";
                                document.getElementById("ColTitle").innerHTML = TheBook.NOM
                                document.getElementById("ImgColCover").src = TheBook.URLCover
                                document.getElementById("Status").innerHTML = "";
                                if (TheBook.description != null && TheBook.description != "null") {
                                    document.getElementById("description").innerHTML = TheBook.description;
                                } else {
                                    document.getElementById("description").innerHTML = "";
                                }
                                // TODO : add the character list

                                var NameToFetchList = [];
                                JSON.parse(TheBook.characters)["items"].forEach((el) => {
                                    NameToFetchList.push("'" + el.name + "'");
                                });
                                var NameToFetch = NameToFetchList.join(",");
                                var container = document.createElement("div");
                                await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                                    clres = JSON.parse(clres)
                                    console.log(clres)
                                    container.className = "item-list";
                                    clres.forEach((el) => {
                                        const divs = document.createElement("div");
                                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";

                                        divs.style.marginLeft = "10px";
                                        container.appendChild(divs);
                                    })
                                })

                                /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                                document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(TheBook.characters)["available"] + "<br/>";
                                document.getElementById("characters").appendChild(container);
                                //Genres

                                document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(TheBook.URLs)[0].url + ">" + JSON.parse(TheBook.URLs)[0].url + "</a>";
                                // TODO : add the relations
                                document.getElementById("OtherTitles").innerHTML = "Variants of this comic (for a complete view check the Marvel's website)" + " : ";

                                await getFromDB("variants", "* FROM variants WHERE series = '" + TheBook.ID_Series + "'").then((clres) => {
                                    clres = JSON.parse(clres)
                                    console.log(clres)
                                    const divlist = document.createElement("div");
                                    divlist.className = "cards-list2"
                                    clres.forEach((el) => {
                                        const reltxt = document.createElement("div");
                                        reltxt.innerHTML = el.name;
                                        reltxt.onclick = function () {
                                            window.open(JSON.parse(el.url)[0].url);
                                        }
                                        reltxt.className = "cardcusto";
                                        const imgcard = document.createElement("img");
                                        imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                                        imgcard.style.width = "100%";
                                        reltxt.appendChild(imgcard);
                                        divlist.appendChild(reltxt);
                                    })
                                    document.getElementById("OtherTitles").appendChild(divlist);
                                })


                                // TODO : add the staff list
                                var tmpstaff = "Number of people : " + JSON.parse(TheBook["creators"])["available"] + "<br/>";
                                var StaffToFetchList = [];
                                JSON.parse(TheBook.creators)["items"].forEach((el) => {
                                    StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                                });
                                var StaffToFetch = StaffToFetchList.join(",");
                                var container2 = document.createElement("div");

                                await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                                    clres = JSON.parse(clres)
                                    container2.className = "item-list";

                                    for (var i = 0; i < clres.length; i++) {
                                        var el = clres[i];
                                        const divs = document.createElement("div");
                                        for (var j = 0; j < clres.length; j++) {
                                            if (el.name == JSON.parse(TheBook["creators"])["items"][j].name) {
                                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(TheBook["creators"])["items"][j]["role"] + "</a>";
                                                divs.style.marginLeft = "10px";
                                                container2.appendChild(divs);
                                            }

                                        }
                                    }

                                })

                                for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {

                                    document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
                                }
                                for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {

                                    document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
                                }


                                document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                                document.getElementById("Staff").appendChild(container2);
                                document.getElementById("chapters").innerHTML = "Number of this comic within the series : " + TheBook.issueNumber;
                                document.getElementById("price").innerHTML += "Prices : <br/>";
                                for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
                                    console.log(JSON.parse(TheBook.prices)[a])
                                    document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
                                }
                                document.getElementById("startDate").innerHTML = "Dates : <br/>"
                                for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
                                    document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
                                }



                                animateCSS(document.getElementById("contentViewer"), "fadeOut").then((message) => {
                                    animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                        document.getElementById("contentViewer").style.display = "block";
                                    });
                                });


                            }
                        });

                        carddiv.addEventListener("mouseover", function (e) {
                            e.preventDefault;
                            RightClick(this, path);
                        });
                    }
                    n++;
                    const element = document.getElementById("ContentView");
                    const divrating = document.createElement("div");
                    carddiv.appendChild(divrating);
                    carddiv.appendChild(rib)

                    element.appendChild(carddiv);

                    /* if (stat.isDirectory()) {
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
                     }*/
                } else {
                    //POINTER TO LISTGROUP

                    const alist = document.createElement("a");
                    alist.className = "list-group-item list-group-item-action";
                    alist.style.backgroundColor = "transparent";
                    alist.style.color = theme_FG;
                    alist.style.cursor = "pointer";
                    alist.id = "id_vol" + index;
                    alist.addEventListener("mouseover", function () {
                        alist.style.backgroundColor = theme_hover_listview;
                    });
                    alist.addEventListener("mouseleave", function () {
                        alist.style.backgroundColor = "transparent";
                    });
                    alist.innerHTML = node.textContent;
                    divlist.appendChild(alist);
                    const playbtn = document.createElement("button");

                    playbtn.className = "card__play js-play";
                    playbtn.type = "button";
                    playbtn.style.opacity = 1;
                    playbtn.style.top = "10px";
                    const playarr = document.createElement("i");
                    playarr.className = "material-icons";
                    playarr.style.color = theme_button_card;
                    playarr.innerHTML = "play_arrow";
                    playbtn.appendChild(playarr);
                    alist.appendChild(playbtn);


                    //button card_save
                    const buttonfav = document.createElement("button");
                    buttonfav.className = "card__save js-fav";
                    buttonfav.style.opacity = 1;
                    buttonfav.style.top = "10px";
                    buttonfav.style.right = "190px";
                    buttonfav.type = "button";
                    buttonfav.addEventListener("click", function () {
                        favorite();
                    });
                    buttonfav.id = "btn_id_fav_" + TheBook["ID_book"];
                    if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;


                    //icon
                    const favicon = document.createElement("i");
                    favicon.className = "material-icons";
                    favicon.innerHTML = "favorite";
                    buttonfav.appendChild(favicon);
                    alist.appendChild(buttonfav);

                    //button card__close
                    const button_unread = document.createElement("button");
                    button_unread.className = "card__close js-unread";
                    button_unread.type = "button";
                    button_unread.style.opacity = 1;
                    button_unread.style.top = "10px";
                    button_unread.style.right = "70px";

                    button_unread.addEventListener("click", function () {
                        markasunread();
                    });
                    button_unread.id = "btn_id_unread_" + TheBook["ID_book"];
                    if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;


                    //icon
                    const unread_icon = document.createElement("i");
                    unread_icon.className = "material-icons";
                    unread_icon.innerHTML = "close";

                    button_unread.appendChild(unread_icon);
                    alist.appendChild(button_unread);
                    //button card__reading
                    const button_reading = document.createElement("button");
                    button_reading.className = "card__reading js-reading";
                    button_reading.type = "button";
                    button_reading.style.opacity = 1;
                    button_reading.style.top = "10px";
                    button_reading.style.right = "110px";
                    button_reading.addEventListener("click", function () {
                        markasreading();
                    });
                    button_reading.id = "btn_id_reading_" + TheBook["ID_book"];
                    if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;


                    //icon
                    const reading_icon = document.createElement("i");
                    reading_icon.className = "material-icons";
                    reading_icon.innerHTML = "auto_stories";

                    button_reading.appendChild(reading_icon);
                    alist.appendChild(button_reading);
                    //button card__read
                    const button_read = document.createElement("button");
                    button_read.className = "card__read js-read";
                    button_read.type = "button";
                    button_read.style.opacity = 1;
                    button_read.style.top = "10px";
                    button_read.style.right = "150px";
                    button_read.addEventListener("click", function () {
                        markasread();
                    });
                    button_read.id = "btn_id_read_" + TheBook["ID_book"];
                    if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;


                    //ico
                    const read_ion = document.createElement("i");
                    read_ion.className = "material-icons";
                    read_ion.innerHTML = "done";

                    button_read.appendChild(read_ion);
                    alist.appendChild(button_read);


                    var manualDirOverride = false
                    if (playbtn.addEventListener) {
                        if (manualDirOverride) {
                            alist.addEventListener("dblclick", function () {
                                launchDetect(path, root);
                            });
                            playbtn.addEventListener("click", function () {
                                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", true, shortname);
                                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", false, shortname);
                                Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);
                                alert("ici5")

                                window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
                            });
                        } else {
                            playbtn.addEventListener("click", function () {
                                /*                                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", true, shortname);
                                                                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", false, shortname);
                                                                Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);*/
                                alert("ici")
                                window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
                            });
                        }
                        alist.addEventListener("mouseover", function (e) {
                            e.preventDefault;
                            RightClick(this, path);
                        });
                    }
                    n++;
                    const element = document.getElementById("ContentView");
                    const divrating = document.createElement("div");
                    divrating.appendChild(alist);
                    divlist.appendChild(divrating);
                    element.appendChild(divlist);
                }
                /*if (readed) {
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
                } else {
                    //pas fav
                }*/


            })

        }


        if (cardMode === true) {

        } else {
            if (n === 0) {
                Toastifycation(language["empty_notSupported"], "#ff0000");

                document.getElementById("home").innerHTML = language["empty_notSupported2"] + ValidatedExtension + language["empty_notSupported3"];
                document.getElementById("home").style.display = "block";
                document.getElementById("home").style.fontSize = "24px";
            } else {
                var coolanimations = ["zoomInDown", "rollIn", "zoomIn", "jackInTheBox", "fadeInUp", "fadeInDown", "fadeIn", "bounceInUp", "bounceInDown", "backInDown", "flip", "flipInY", "flipInX",];
                var random = coolanimations[Math.floor(Math.random() * coolanimations.length)];
                document.getElementById("home").style.display = "none";
                for (let i = 0; i < n; i++) {
                    animateCSS(document.getElementById("id_vol" + i), random).then((message) => {
                        console.log(message);
                    });
                    document.getElementById("overlay2").style.display = "none";

                    animateCSS(document.getElementById("overlay"), "fadeOut").then((message) => {
                        document.getElementById("overlay").style.display = "none";
                        document.getElementById("ContainerExplorer").style.display = "flex";
                    });
                }
            }

        }
    })


}

function convertDate(inputFormat) {
    function pad(s) {
        return (s < 10) ? '0' + s : s;
    }

    var d = new Date(inputFormat)
    return [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()].join('/')
}

async function GETMARVELAPI_variants(id) {
    var url = "https://gateway.marvel.com:443/v1/public/series/" + id + "/comics?orderBy=issueNumber&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    var response = await fetch(url);
    var data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI_Characters(id, type) {
    var url = "https://gateway.marvel.com:443/v1/public/characters?" + type + "=" + id + "&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    var response = await fetch(url);
    var data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI_Creators(id, type) {
    var url = "https://gateway.marvel.com:443/v1/public/creators?" + type + "=" + id + "&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    var response = await fetch(url);
    var data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI_Comics(name = "", seriesStartDate = "") {
    if (name === "") {
        console.log("GETMARVELAPI_Comics : name is empty");
        return;
    }
    if (seriesStartDate === "") {
        console.log("GETMARVELAPI_Comics : seriesStartDate is empty");
        return;
    }

    var issueNumber = "";
    var inbFromName = name.replace(/[^#0-9]/g, "&");
    console.log("inbFromName : " + inbFromName);
    inbFromName.split("&").forEach(function (element) {
        if (element.match(/^[#][0-9]{1,}$/)) {
            issueNumber = element.replaceAll("#", "");
        }

    });

    name = name.replaceAll(/[(].+[)]/g, "");
    name = name.replaceAll(/[\[].+[\]]/g, "");
    name = name.replaceAll(/[\{].+[\}]/g, "");
    name = name.replaceAll(/[#][0-9]{1,}/g, "");

    name = name.replace(/\s+$/, "");
    console.log("GETMARVELAPI_Comics : name : " + name);
    console.log("GETMARVELAPI_Comics : issueNumber : " + issueNumber);
    console.log("GETMARVELAPI_Comics : seriesStartDate : " + seriesStartDate);
    if (seriesStartDate !== "" && issueNumber !== "") {
        var url = "https://gateway.marvel.com:443/v1/public/comics?titleStartsWith=" + encodeURIComponent(name) + "&startYear=" + seriesStartDate + "&issueNumber=" + issueNumber + "&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    } else {
        var url = "https://gateway.marvel.com:443/v1/public/comics?titleStartsWith=" + encodeURIComponent(name) + "&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    }
    var response = await fetch(url);
    var data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI(name = "") {
    if (name === "") {
        console.log("no name provided, aborting GETMARVELAPI");
        return;
    }
    var date = "";
    var dateNb = 0;
    var dateFromName = name.replace(/[^0-9]/g, "#");
    dateFromName.split("#").forEach(function (element) {
        if (dateNb == 0 && element.match(/^[0-9]{4}$/)) {
            dateNb++;
            date = element;
        }

    });
    name = name.replaceAll(/[(].+[)]/g, "");
    name = name.replace(/\s+$/, "");
    var encodedName = encodeURIComponent(name);
    if (navigator.userAgent.indexOf("Firefox") != -1) {
        encodedName = encodedName.replaceAll(" ", "%20");
    }
    if (date !== "") {
        var url = "https://gateway.marvel.com:443/v1/public/series?titleStartsWith=" + encodedName + "&startYear=" + date + "&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    } else {
        var url = "https://gateway.marvel.com:443/v1/public/series?titleStartsWith=" + encodedName + "&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";

    }
    console.log(url);
    var response = await fetch(url);
    var data = await response.json();
    console.log(data);
    return data;
}

async function GETANILISTAPI_CREATOR(Creators = []) {
    if (Creators === {}) {
        console.log("object invalid, aborting GETANILISTAPI_CREATOR");
        return;
    }
    var tempObj = [];
    for (var i = 0; i < Creators.length; i++) {
        var id = Creators[i].id;
        tempObj.push(
            await fetch("http://" + domain + ":" + port + "/api/anilist/creator/" + id).then(function (response) {
                return response.text();
            }).then(function (data) {
                data = JSON.parse(data);
                return data;

            }).catch(function (error) {
                console.log(error);
            })
        )

    }
    return tempObj;
}

async function GETANILISTAPI_CHARACTER(characters = []) {
    if (characters === {}) {
        console.log("object invalid, aborting GETANILISTAPI_CHARACTER");
        return;
    }
    var tempObj = [];
    for (var i = 0; i < characters.length; i++) {
        var id = characters[i].id;
        tempObj.push(
            await fetch("http://" + domain + ":" + port + "/api/anilist/character/" + id).then(function (response) {
                return response.text();
            }).then(function (data) {
                data = JSON.parse(data);
                return data;

            }).catch(function (error) {
                console.log(error);
            })
        )

    }
    return tempObj;
}

async function GETANILISTAPI_RELATION(title) {

    return fetch("http://" + domain + ":" + port + "/api/anilist/relations/" + title).then(function (response) {
        return response.text();
    }).then(function (data) {
        data = JSON.parse(data);
        console.log(data);
        return data;

    }).catch(function (error) {
        console.log(error);
    })

}

//Loading the content
async function loadContent(provider, FolderRes, libraryPath) {
    var n = 0;
    listOfImages = [];
    document.getElementById("overlay2").style.display = "block";
    /*FolderResults.forEach((file) => {
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
            Get_element_from_data("read", Info) === "undefined" ||
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
    });*/
    FolderRes = JSON.parse(FolderRes);
    const divlist = document.createElement("div");
    divlist.className = "list-group";

    await getFromDB("Series", "title FROM Series").then(async (res) => {
            for (var index = 0; index < FolderRes.length; index++) {
                const path = FolderRes[index];
                var name = path.replaceAll(libraryPath.replaceAll("\\", "/"), "").replace("/", "");
                var path_without_file = path.replace(name, "");
                var realname = name;
                console.log(realname);
                var shortname = get_the_ID_by_name(realname);
                var found = false;
                var titlesList = [];
                var returnedTitles = JSON.parse(res);
                var foundTitle = "";
                for (var i = 0; i < returnedTitles.length; i++) {
                    titlesList.push(returnedTitles[i].title);
                }

                console.log(titlesList);
                console.log(name);


                titlesList.forEach((el) => {
                    console.log(el)
                    save = el
                    el = el.toLowerCase().replaceAll(":", "").replaceAll("'", "")
                        .replaceAll('"', "")
                        .replaceAll("romaji", "").replaceAll("native", "")
                        .replaceAll("english", "").replaceAll("{", "")
                        .replaceAll("}", "")
                    elar = el.split(",");
                    elar.forEach((el2) => {
                        console.log(el2)

                        if (name.toLowerCase().includes(el2.toLowerCase())) {
                            found = true;
                            foundTitle = save
                        }
                    });


                })
                if (found == false) {
                    if (provider == 2) {
                        console.log("provider 2")
                        await getAPIANILIST(name).then(async (data) => {
                            await InsertIntoDB("Series", "(ID_Series,title,statut,start_date,end_date,description,Score,genres,cover,BG,CHARACTERS,TRENDING,STAFF,SOURCE,volumes,chapters)", "('" + data["id"] + "_2" + "','" + JSON.stringify(data["title"]).replaceAll("'", "''") + "','" + data["status"].replaceAll("'", "''") + "','" + JSON.stringify(data["startDate"]).replaceAll("'", "''") + "','" + JSON.stringify(data["endDate"]).replaceAll("'", "''") + "','" + data["description"].replaceAll("'", "''") + "','" + data["meanScore"] + "','" + JSON.stringify(data["genres"]).replaceAll("'", "''") + "','" + data["coverImage"]["large"] + "','" + data["bannerImage"] + "','" + JSON.stringify(data["characters"]).replaceAll("'", "''") + "','" + data["trending"] + "','" + JSON.stringify(data["staff"]).replaceAll("'", "''") + "','" + data["siteUrl"].replaceAll("'", "''") + "','" + data["volumes"] + "','" + data["chapters"] + "')");
                            await GETANILISTAPI_CREATOR(data["staff"]).then(async (ccdata) => {
                                for (let i = 0; i < ccdata.length; i++) {
                                    if (ccdata[i]["description"] == null) {
                                        await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    } else {
                                        await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    }


                                }
                            })
                            await GETANILISTAPI_CHARACTER(data["characters"]).then(async (ccdata) => {
                                for (let i = 0; i < ccdata.length; i++) {
                                    if (ccdata[i]["description"] == null) {
                                        await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    } else {
                                        await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
                                            console.log("inserted");
                                        });

                                    }
                                }
                            })


                            await GETANILISTAPI_RELATION(data["title"]["english"]).then(async (ccdata) => {

                                for (let i = 0; i < ccdata.length; i++) {

                                    var dataR = ccdata[i]["node"];
                                    if (dataR.title.english == null) {
                                        await InsertIntoDB("variants", "", `('${dataR["id"] + "_2"}','${dataR["title"]["romaji"].replaceAll("'", "''")}','${dataR["coverImage"]["large"]}','${dataR["type"] + " / " + dataR["relationType"] + " / " + dataR["format"]}',${null},'${data["id"] + "_2"}')`);
                                        console.log("inserted");
                                    } else {
                                        await InsertIntoDB("variants", "", `('${dataR["id"] + "_2"}','${dataR["title"]["english"].replaceAll("'", "''")}','${dataR["coverImage"]["large"]}','${dataR["type"] + " / " + dataR["relationType"] + " / " + dataR["format"]}',${null},'${data["id"] + "_2"}')`);
                                        console.log("inserted");
                                    }


                                }

                            })


                        })
                    } else if (provider == 1) {
                        console.log("Provider: Marvel Comics");
                        await GETMARVELAPI(name).then(async (data) => {
                            console.log(data);
                            await InsertIntoDB("Series", "(ID_Series,title,start_date,end_date,description,Score,cover,BG,CHARACTERS,STAFF,SOURCE,volumes,chapters)", "('" + data["data"]["results"][0]["id"] + "_1" + "','" + JSON.stringify(data["data"]["results"][0]["title"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["startYear"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["endYear"]).replaceAll("'", "''") + "','" + data["data"]["results"][0]["description"] + "','" + data["data"]["results"][0]["rating"] + "','" + JSON.stringify(data["data"]["results"][0]["thumbnail"]) + "','" + JSON.stringify(data["data"]["results"][0]["thumbnail"]) + "','" + JSON.stringify(data["data"]["results"][0]["characters"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["creators"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["urls"][0]) + "','" + JSON.stringify(data["data"]["results"][0]["comics"]["items"]) + "','" + data["data"]["results"][0]["comics"]["available"] + "')");
                            await GETMARVELAPI_Creators(data["data"]["results"][0]["id"], "series").then(async (ccdata) => {
                                ccdata = ccdata["data"]["results"];
                                for (let i = 0; i < ccdata.length; i++) {
                                    await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["fullName"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}',${null},'${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
                                        console.log("inserted");
                                    });
                                }

                            })
                            await GETMARVELAPI_Characters(data["data"]["results"][0]["id"], "series").then(async (ccdata) => {
                                ccdata = ccdata["data"]["results"];
                                for (let i = 0; i < ccdata.length; i++) {
                                    await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["name"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}','${ccdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
                                        console.log("inserted");
                                    });
                                }

                            })
                            await GETMARVELAPI_variants(data["data"]["results"][0]["id"]).then(async (cvdata) => {
                                cvdata = cvdata["data"]["results"];
                                for (let i = 0; i < cvdata.length; i++) {
                                    if (cvdata[i]["description"] == null) {
                                        await InsertIntoDB("variants", "", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${null}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    } else {
                                        await InsertIntoDB("variants", "", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${cvdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`).then(() => {
                                            console.log("inserted");
                                        });
                                    }

                                }

                            })
                        })

                    } else {
                        console.log("Provider: " + provider);
                    }


                } else {
                    await getFromDB("Series", "* FROM Series where title = '" + foundTitle + "'").then((res) => {
                        console.log(foundTitle);
                        res = JSON.parse(res)
                        console.log(res)
                        if (cardMode === true) {
                            if (provider == 1) {

                                var node = document.createTextNode(JSON.parse(res[0].title));
                            } else {
                                var node = document.createTextNode(JSON.parse(res[0].title)["english"]);

                            }
                        } else {
                            var node = document.createTextNode(JSON.parse(res[0].title)["english"]);
                        }
                        var invertedPath = path.replaceAll("\\", "/");
                        if (provider == 1) {

                            imagelink = JSON.parse(res[0].cover).path + "/detail." + JSON.parse(res[0].cover).extension
                        } else {
                            imagelink = res[0].cover

                        }


                        listOfImages.push(imagelink);
                        //Setting Card Div
                        const carddiv = document.createElement("div");

                        carddiv.style.cursor = "pointer";
                        console.log("DEBUG 2");

                        if (cardMode === true) {
                            console.log("DEBUG 3");

                            carddiv.className = "cardcusto";
                            carddiv.setAttribute("data-effect", "zoom");
                            //button card_save


                            //figure card__image
                            const cardimage = document.createElement("div");
                            cardimage.className = "card__image";
                            cardimage.style.backgroundColor = theme_BG_CI;
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
                            playarr.style.color = theme_button_card;
                            playbtn.appendChild(playarr);
                            bodycard.appendChild(playbtn);
                            /*            new bootstrap.Tooltip(playbtn, {
                                            title: language["Play"],
                                            placement: "bottom",
                                        });*/
                            const pcard_bio = document.createElement("p");
                            pcard_bio.className = "card__bio";
                            pcard_bio.style = "text-align: center;";
                            pcard_bio.style.color = theme_FG;
                            pcard_bio.innerHTML = node.textContent;

                            bodycard.appendChild(pcard_bio);
                            carddiv.appendChild(bodycard);
                            carddiv.id = "id" + n;

                            if (playbtn.addEventListener) {
                                console.log("DEBUG 3b");

                                /*          if (stat.isDirectory()) {*/
                                carddiv.addEventListener("click", async function () {
                                    if (provider == 1) {
                                        loadView(path, libraryPath, JSON.parse(res[0].start_date), provider);
                                        document.getElementById("id").innerText = "This series ID from Marvel : " + parseInt(res[0].ID_Series);
                                        document.getElementById("averageProgress").style.display = "none";
                                        document.getElementById("contentViewer").style.backgroundImage = "url(" + JSON.parse(res[0].BG).path + "/detail." + JSON.parse(res[0].cover).extension + ")";
                                        document.getElementById("ColTitle").innerHTML = JSON.parse(res[0].title)
                                        document.getElementById("ImgColCover").src = JSON.parse(res[0].cover).path + "/detail." + JSON.parse(res[0].cover).extension
                                        if (res[0].description != null && res[0].description != "null") {
                                            document.getElementById("description").innerHTML = res[0].description;
                                        } else {
                                            document.getElementById("description").innerHTML = "";
                                        }
                                        if (JSON.parse(res[0].start_date) == null) {
                                            document.getElementById("startDate").innerHTML = "?";
                                        } else {
                                            document.getElementById("startDate").innerHTML = JSON.parse(res[0].start_date)
                                        }
                                        if (

                                            JSON.parse(res[0].end_date) == null || JSON.parse(res[0].end_date) > new Date().getFullYear()) {
                                            document.getElementById("startDate").innerHTML += " - ?";
                                        } else {
                                            document.getElementById("startDate").innerHTML += " - " + JSON.parse(res[0].end_date);
                                        }


                                        // TODO : add the character list

                                        var NameToFetchList = [];
                                        JSON.parse(res[0].CHARACTERS)["items"].forEach((el) => {
                                            NameToFetchList.push("'" + el.name + "'");
                                        });
                                        var NameToFetch = NameToFetchList.join(",");
                                        var container = document.createElement("div");
                                        await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                                            clres = JSON.parse(clres)
                                            console.log(clres)
                                            container.className = "item-list";
                                            clres.forEach((el) => {
                                                const divs = document.createElement("div");
                                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";
                                                divs.style.marginLeft = "10px";
                                                container.appendChild(divs);
                                            })
                                        })

                                        /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                                        document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(res[0].CHARACTERS)["available"] + "<br/>";
                                        document.getElementById("characters").appendChild(container);
                                        //Genres

                                        document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(res[0].SOURCE).url + ">Voir plus</a>";
                                        // TODO : add the relations
                                        document.getElementById("OtherTitles").innerHTML = "A few comics in this series (for a complete view check the Marvel's website)" + " : ";

                                        await getFromDB("variants", "* FROM variants WHERE series = '" + res[0].ID_Series + "'").then((clres) => {
                                            clres = JSON.parse(clres)
                                            console.log(clres)
                                            const divlist = document.createElement("div");
                                            divlist.className = "cards-list2"
                                            clres.forEach((el) => {
                                                const reltxt = document.createElement("div");
                                                reltxt.innerHTML = el.name;
                                                reltxt.onclick = function () {
                                                    window.open(JSON.parse(el.url)[0].url);
                                                }
                                                reltxt.className = "cardcusto";
                                                const imgcard = document.createElement("img");
                                                imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                                                imgcard.style.width = "100%";
                                                reltxt.appendChild(imgcard);
                                                divlist.appendChild(reltxt);
                                            })
                                            document.getElementById("OtherTitles").appendChild(divlist);
                                        })


                                        // TODO : add the staff list
                                        var tmpstaff = "Number of people : " + JSON.parse(res[0]["STAFF"])["available"] + "<br/>";
                                        var StaffToFetchList = [];
                                        JSON.parse(res[0].STAFF)["items"].forEach((el) => {
                                            StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                                        });
                                        var StaffToFetch = StaffToFetchList.join(",");
                                        var container2 = document.createElement("div");

                                        await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                                            clres = JSON.parse(clres)
                                            container2.className = "item-list";

                                            for (var i = 0; i < clres.length; i++) {
                                                var el = clres[i];
                                                const divs = document.createElement("div");
                                                for (var j = 0; j < clres.length; j++) {
                                                    if (el.name == JSON.parse(res[0]["STAFF"])["items"][j].name) {
                                                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(res[0]["STAFF"])["items"][j]["role"] + "</a>";
                                                        divs.style.marginLeft = "10px";
                                                        container2.appendChild(divs);
                                                    }

                                                }
                                            }

                                        })
                                        document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                                        document.getElementById("Staff").appendChild(container2);
                                        document.getElementById("chapters").innerHTML = "Number of Comics in this series : " + res[0]["chapters"];


                                        if (JSON.parse(res[0].end_date) > new Date().getFullYear()) {
                                            document.getElementById("Status").innerHTML = "RELEASING";
                                            document.getElementById("Status").className = "releasing";
                                        } else if (JSON.parse(res[0].end_date) < new Date().getFullYear()) {
                                            document.getElementById("Status").innerHTML = "FINISHED";
                                            document.getElementById("Status").className = "released";
                                        } else if (JSON.parse(res[0].start_date) > new Date().getFullYear()) {

                                            document.getElementById("Status").innerHTML = "NOT YET RELEASED";
                                            document.getElementById("Status").className = "NotYet";

                                        } else if (JSON.parse(res[0].start_date) == new Date().getFullYear()) {
                                            document.getElementById("Status").innerHTML = "END SOON";
                                            document.getElementById("Status").className = "releasing";
                                        } else {
                                            document.getElementById("Status").innerHTML = "UNKNOWN";
                                            document.getElementById("Status").className = "NotYet";
                                        }

                                        document.getElementById("contentViewer").style.display = "block";
                                        animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                        });                                /*launchDetect(path, root);*/
                                    } else if (provider == 2) {
                                        loadView(path, libraryPath, "", provider);

                                        document.getElementById("contentViewer").style.background = "rgba(0,0,0,0.7) url(" + res[0].BG + ")";
                                        document.getElementById("ColTitle").innerHTML = JSON.parse(res[0].title).english + " / " + JSON.parse(res[0].title).romaji + " / " + JSON.parse(res[0].title).native;
                                        document.getElementById("ImgColCover").src = res[0].cover
                                        document.getElementById("description").innerHTML = res[0].description;
                                        if (JSON.parse(res[0].start_date).year == null) {
                                            document.getElementById("startDate").innerHTML = "?";
                                        } else {
                                            document.getElementById("startDate").innerHTML = JSON.parse(res[0].start_date).year
                                        }
                                        if (

                                            JSON.parse(res[0].end_date).year == null) {
                                            document.getElementById("startDate").innerHTML += " - ?";
                                        } else {
                                            document.getElementById("startDate").innerHTML += " - " + JSON.parse(res[0].end_date).year;
                                        }

                                        // TODO : add the character list

                                        var NameToFetchList = [];
                                        JSON.parse(res[0].CHARACTERS).forEach((el) => {
                                            NameToFetchList.push("'" + el.name + "'");
                                        });
                                        var NameToFetch = NameToFetchList.join(",");
                                        var container = document.createElement("div");
                                        await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                                            clres = JSON.parse(clres)
                                            console.log(clres)
                                            container.className = "item-list";
                                            clres.forEach((el) => {
                                                const divs = document.createElement("div");
                                                divs.innerHTML = "<a target='_blank' href=" + el.url + ">" + "<img src='" + el.image.replaceAll('"', '') + "' class='img-charac'/>" + el.name + "</a>";
                                                divs.style.marginLeft = "10px";
                                                container.appendChild(divs);
                                            })
                                        })

                                        /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                                        document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1><br/>";
                                        document.getElementById("characters").appendChild(container);

                                        //Genres
                                        document.getElementById("genres").innerHTML = "Genres " + ":";
                                        JSON.parse(res[0].genres).forEach((el, index) => {
                                            if (index != JSON.parse(res[0].genres).length - 1) {
                                                document.getElementById("genres").innerHTML += " " + el + ", ";

                                            } else {
                                                document.getElementById("genres").innerHTML += " " + el;

                                            }
                                        });
                                        document.getElementById("SiteURL").innerHTML = "<a href='" + res[0].SOURCE + "'>Voir plus</a>";
                                        document.getElementById("Trending").innerHTML = "Trending : " + res[0]["TRENDING"];

                                        // TODO : add the relations
                                        document.getElementById("OtherTitles").innerHTML = "Relations" + " : ";
                                        await getFromDB("variants", "* FROM variants WHERE series = '" + res[0].ID_Series + "'").then((clres) => {
                                            clres = JSON.parse(clres)
                                            console.log(clres)
                                            const divlist = document.createElement("div");
                                            divlist.className = "cards-list2"
                                            clres.forEach((el) => {
                                                const reltxt = document.createElement("div");
                                                reltxt.innerHTML = el.name;
                                                reltxt.className = "cardcusto";
                                                const imgcard = document.createElement("img");
                                                imgcard.src = el.image;
                                                imgcard.style.width = "100%";
                                                reltxt.appendChild(imgcard);
                                                divlist.appendChild(reltxt);
                                            })
                                            document.getElementById("OtherTitles").appendChild(divlist);
                                        })


                                        document.getElementById("Volumes").innerHTML = res[0]["volumes"];

                                        // TODO : add the staff list
                                        var StaffToFetchList = [];
                                        JSON.parse(res[0].STAFF).forEach((el) => {
                                            StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                                        });
                                        var StaffToFetch = StaffToFetchList.join(",");
                                        var container2 = document.createElement("div");

                                        await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                                            clres = JSON.parse(clres)
                                            container2.className = "item-list";

                                            for (var i = 0; i < clres.length; i++) {
                                                var el = clres[i];
                                                const divs = document.createElement("div");
                                                for (var j = 0; j < clres.length; j++) {
                                                    if (el.name == JSON.parse(res[0]["STAFF"])[j].name) {
                                                        divs.innerHTML = "<a target='_blank' href=" + el.url + ">" + "<img src='" + el.image.replaceAll('"', "") + "' class='img-charac'/>" + el.name + "</a>";
                                                        divs.style.marginLeft = "10px";
                                                        container2.appendChild(divs);
                                                    }

                                                }
                                            }

                                        })
                                        document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>";
                                        document.getElementById("Staff").appendChild(container2);


                                        document.getElementById("chapters").innerHTML = res[0]["chapters"];
                                        document.getElementById("averageScore").innerHTML = res[0]["Score"];
                                        document.querySelectorAll(".circle-small .progress.one").forEach((el) => {
                                            el.style.strokeDashoffset = Math.abs(100 - res[0]["Score"]);
                                        });


                                        document.documentElement.style.setProperty('--averageScore', Math.abs(100 - res[0]["Score"]));
                                        document.getElementById("Status").innerHTML = res[0]["statut"];
                                        if (res[0]["statut"] == "RELEASING") {
                                            document.getElementById("Status").className = "releasing";
                                        } else if (res[0]["statut"] == "FINISHED") {
                                            document.getElementById("Status").className = "released";

                                        } else if (res[0]["statut"] == "Not_YET_RELEASED") {
                                            document.getElementById("Status").className = "NotYet";

                                        }

                                        document.getElementById("contentViewer").style.display = "block";
                                        animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                        });                                /*launchDetect(path, root);*/
                                    }

                                });
                                playbtn.addEventListener("click", function () {
                                    ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", true, shortname);
                                    ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", false, shortname);
                                    Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);
                                    alert("ici2")

                                    window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
                                });
                                /* } else {
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
                                 }*/
                                carddiv.addEventListener("mouseover", function (e) {
                                    e.preventDefault;
                                    RightClick(this, path);
                                });
                            }
                            console.log("DEBUG 3c");

                            n++;
                            const element = document.getElementById("ContainerExplorer");
                            element.style.display = "none";
                            const divrating = document.createElement("div");
                            carddiv.appendChild(divrating);
                            element.appendChild(carddiv);

                            /*
                                        if (stat.isDirectory()) {
                            */
                            const imgNode = document.createElement("img");
                            imgNode.src = "";
                            imgNode.style = "padding-top: 330px";
                            carddiv.appendChild(imgNode);
                            /*     } else if (readed) {
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
                                 }*/
                            console.log("DEBUG 3d");

                        } else {
                            //POINTER TO LISTGROUP
                            console.log("DEBUG 4");

                            const alist = document.createElement("a");
                            alist.className = "list-group-item list-group-item-action";
                            alist.style.backgroundColor = "transparent";
                            alist.style.color = theme_FG;
                            alist.style.cursor = "pointer";
                            alist.id = "id" + index;
                            alist.addEventListener("mouseover", function () {
                                alist.style.backgroundColor = theme_hover_listview;
                            });
                            alist.addEventListener("mouseleave", function () {
                                alist.style.backgroundColor = "transparent";
                            });
                            alist.innerHTML = node.textContent;
                            divlist.appendChild(alist);
                            const playbtn = document.createElement("button");

                            playbtn.className = "card__play js-play";
                            playbtn.type = "button";
                            playbtn.style.opacity = 1;
                            playbtn.style.top = "10px";
                            const playarr = document.createElement("i");
                            playarr.className = "material-icons";
                            playarr.style.color = theme_button_card;
                            playarr.innerHTML = "play_arrow";
                            playbtn.appendChild(playarr);
                            alist.appendChild(playbtn);
                            /*            new bootstrap.Tooltip(playbtn, {
                                            title: language["Play"],
                                            placement: "bottom",
                                        });*/

                            //button card_save
                            const buttonfav = document.createElement("button");
                            buttonfav.className = "card__save js-fav";
                            buttonfav.style.opacity = 1;
                            buttonfav.style.top = "10px";
                            buttonfav.style.right = "190px";
                            buttonfav.type = "button";
                            buttonfav.addEventListener("click", function () {
                                favorite();
                            });
                            buttonfav.id = "btn_id_fav_" + shortname;
                            if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;

                            /*            new bootstrap.Tooltip(buttonfav, {
                                            title: language["toogle_fav"],
                                            placement: "bottom",
                                        });*/
                            //icon
                            const favicon = document.createElement("i");
                            favicon.className = "material-icons";
                            favicon.innerHTML = "favorite";
                            buttonfav.appendChild(favicon);
                            alist.appendChild(buttonfav);

                            //button card__close
                            const button_unread = document.createElement("button");
                            button_unread.className = "card__close js-unread";
                            button_unread.type = "button";
                            button_unread.style.opacity = 1;
                            button_unread.style.top = "10px";
                            button_unread.style.right = "70px";

                            button_unread.addEventListener("click", function () {
                                markasunread();
                            });
                            button_unread.id = "btn_id_unread_" + shortname;
                            if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;

                            /*            new bootstrap.Tooltip(button_unread, {
                                            title: language["mkunread"],
                                            placement: "bottom",
                                        });*/
                            //icon
                            const unread_icon = document.createElement("i");
                            unread_icon.className = "material-icons";
                            unread_icon.innerHTML = "close";

                            button_unread.appendChild(unread_icon);
                            alist.appendChild(button_unread);
                            //button card__reading
                            const button_reading = document.createElement("button");
                            button_reading.className = "card__reading js-reading";
                            button_reading.type = "button";
                            button_reading.style.opacity = 1;
                            button_reading.style.top = "10px";
                            button_reading.style.right = "110px";
                            button_reading.addEventListener("click", function () {
                                markasreading();
                            });
                            button_reading.id = "btn_id_reading_" + shortname;
                            if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;

                            /*            new bootstrap.Tooltip(button_reading, {
                                            title: language["mkreading"],
                                            placement: "bottom",
                                        });*/
                            //icon
                            const reading_icon = document.createElement("i");
                            reading_icon.className = "material-icons";
                            reading_icon.innerHTML = "auto_stories";

                            button_reading.appendChild(reading_icon);
                            alist.appendChild(button_reading);
                            //button card__read
                            const button_read = document.createElement("button");
                            button_read.className = "card__read js-read";
                            button_read.type = "button";
                            button_read.style.opacity = 1;
                            button_read.style.top = "10px";
                            button_read.style.right = "150px";
                            button_read.addEventListener("click", function () {
                                markasread();
                            });
                            button_read.id = "btn_id_read_" + shortname;
                            if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;

                            /*            new bootstrap.Tooltip(button_read, {
                                            title: language["mkread"],
                                            placement: "bottom",
                                        });*/
                            //ico
                            const read_ion = document.createElement("i");
                            read_ion.className = "material-icons";
                            read_ion.innerHTML = "done";

                            button_read.appendChild(read_ion);
                            alist.appendChild(button_read);


                            if (playbtn.addEventListener) {
                                /*
                                                if (stat.isDirectory()) {
                                */
                                alist.addEventListener("dblclick", function () {
                                    launchDetect(path, root);
                                });
                                playbtn.addEventListener("click", function () {
                                    ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", true, shortname);
                                    ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", false, shortname);
                                    Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);
                                    alert("ici3")

                                    window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
                                });
                                /*} else {
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
                                }*/
                                alist.addEventListener("mouseover", function (e) {
                                    e.preventDefault;
                                    RightClick(this, path, name);
                                });
                            }
                            n++;
                            const element = document.getElementById("ContainerExplorer");
                            const divrating = document.createElement("div");
                            divrating.appendChild(alist);
                            divlist.appendChild(divrating);
                            element.appendChild(divlist);
                        }

                    })
                }
            }


            /*        var Info = Get_From_JSON(
                   CosmicComicsData + "/ListOfComics.json",
                   shortname
               );*/
            /* var readed = Get_element_from_data("read", Info);
             var reading = Get_element_from_data("reading", Info);
             var favorite_v = Get_element_from_data("favorite", Info);*/

            /*if (fs.existsSync(invertedPath + "/folder.cosmic")) {
                imagelink = invertedPath + "/folder.cosmic";
                console.log(imagelink);
            } else if (fs.existsSync(invertedPath + "/folder.cosmic.svg")) {
                imagelink = invertedPath + "/folder.cosmic.svg";
                console.log(imagelink);
            } else {*/


            /*}*/
            /*} else if (
                fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)
            ) {
                var node = document.createTextNode(realname);
                var FIOA = fs.readdirSync(
                    CosmicComicsData + "/FirstImageOfAll/" + shortname
                );
                var CCDN = CosmicComicsData.replaceAll("\\", "/");
                invertedPath = path.replaceAll("\\", "/");
                if (fs.existsSync(path_without_file + "/coverAll.cosmic")) {
                    imagelink = path_without_file + "/coverAll.cosmic";
                    console.log(imagelink);
                } else if (fs.existsSync(invertedPath + ".cosmic")) {
                    imagelink = invertedPath + ".cosmic";
                    console.log(imagelink);
                } else if (fs.existsSync(invertedPath + ".cosmic.svg")) {
                    imagelink = invertedPath + ".cosmic.svg";
                    console.log(imagelink);
                } else {
                    if (FIOA.length === 0) {
                        console.log(shortname + "/" + shortname + ".jpg not found");
                        if (fs.existsSync(path_without_file + "/folder.cosmic")) {
                            imagelink = path_without_file + "/folder.cosmic";
                            console.log(imagelink);
                        } else {
                            imagelink = "Images/fileDefault.png";
                        }
                    } else {
                        imagelink = CCDN + "/FirstImageOfAll/" + shortname + "/" + FIOA[0];
                    }
                }
            } else {
                console.log(shortname + "/" + shortname + ".jpg not found");
                var node = document.createTextNode(realname);
                if (fs.existsSync(path_without_file + "/folder.cosmic")) {
                    imagelink = path_without_file + "/folder.cosmic";
                    console.log(imagelink);
                } else {
                    imagelink = "Images/fileDefault.png";
                }
            }*/


            /*        if (readed) {
                        //readed
                        toggleActive(document.getElementById("btn_id_read_" + shortname));
                    } else if (reading) {
                        //reazading
                        toggleActive(document.getElementById("btn_id_reading_" + shortname));
                    } else {
                        //rien
                        toggleActive(document.getElementById("btn_id_unread_" + shortname));
                    }*/

            /*if (favorite_v) {
                toggleActive(document.getElementById("btn_id_fav_" + shortname));

                //favorite
            } else if (stat.isDirectory()) {
                //fav folder
            } else {
                //pas fav
            }*/


        }
    )
    ;
    if (cardMode === true) {

        preloadImage(listOfImages, n);

    } else {
        console.log("DEBUG 5");

        if (n === 0) {
            Toastifycation(language["empty_notSupported"], "#ff0000");

            document.getElementById("home").innerHTML = language["empty_notSupported2"] + ValidatedExtension + language["empty_notSupported3"];
            document.getElementById("home").style.display = "block";
            document.getElementById("home").style.fontSize = "24px";
        } else {
            var coolanimations = ["zoomInDown", "rollIn", "zoomIn", "jackInTheBox", "fadeInUp", "fadeInDown", "fadeIn", "bounceInUp", "bounceInDown", "backInDown", "flip", "flipInY", "flipInX",];
            var random = coolanimations[Math.floor(Math.random() * coolanimations.length)];
            document.getElementById("home").style.display = "none";
            for (let i = 0; i < n; i++) {
                animateCSS(document.getElementById("id" + i), random).then((message) => {
                    console.log(message);
                });
                document.getElementById("overlay2").style.display = "none";

                animateCSS(document.getElementById("overlay"), "fadeOut").then((message) => {
                    document.getElementById("overlay").style.display = "none";
                    document.getElementById("ContainerExplorer").style.display = "flex";

                });
            }
        }
    }
    document.getElementById("gotoback").addEventListener("click", function () {
        animateCSS(document.getElementById("contentViewer"), "fadeOut").then((message) => {
            document.getElementById("contentViewer").style.display = "none";
        });
        document.getElementById("relations").innerHTML = "";
        document.getElementById("ContentView").innerHTML = "";

    });

}

//preload the images
var preloadedImages = [];

function preloadImage(listImages, n) {
    /* for (var i = 0; i < listImages.length; i++) {
      preloadedImages[i] = new Image();
      preloadedImages[i].src = listImages[i];
    } */
    setTimeout(() => {
        LoadImages(n);
    }, 500);
}

//Load Images
function LoadImages(numberOf) {
    var coolanimations = ["zoomInDown", "rollIn", "zoomIn", "jackInTheBox", "fadeInUp", "fadeInDown", "fadeIn", "bounceInUp", "bounceInDown", "backInDown", "flip", "flipInY",];
    var random = coolanimations[Math.floor(Math.random() * coolanimations.length)];
    if (numberOf === 0) {
        Toastifycation(language["empty_notSupported"], "#ff0000");
        animateCSS(document.getElementById("overlay"), "fadeOut").then((message) => {
            document.getElementById("overlay2").style.display = "none";
            document.getElementById("overlay").style.display = "none";
            document.getElementById("ContainerExplorer").style.display = "flex";

            document.getElementById("home").innerHTML = language["empty_notSupported2"] + ValidatedExtension + language["empty_notSupported3"];
            document.getElementById("home").style.display = "block";
            document.getElementById("home").style.fontSize = "24px";
        });
    }
    for (let i = 0; i < numberOf; i++) {
        document.getElementById("home").style.display = "none";
        animateCSS(document.getElementById("id" + i), random).then((message) => {
            console.log(message);
        });
        try {
            document.getElementById("card_img_id_" + i).src = listOfImages[i];
        } catch (error) {
            document.getElementById("card_img_id_" + i).src = CosmicComicsTemp + "/Images/fileDefault.png";
        }
        document.getElementById("overlay2").style.display = "none";
        animateCSS(document.getElementById("overlay"), "fadeOut").then((message) => {
            document.getElementById("overlay").style.display = "none";
            document.getElementById("ContainerExplorer").style.display = "flex";

        });
    }
}

//Navigate or launch the viewer
function launchDetect(dir, root) {
    throw new Error("Method not implemented.");
    window.scrollTo(0, 0);
    var parento = document.getElementById("controller");

    var child = parent.lastElementChild;
    while (child) {
        parent.removeChild(child);
        child = parent.lastElementChild;
    }

    if (dir !== root) {
        const btn = document.getElementById("GotoRoot");
        if (btn.addEventListener) {
            btn.addEventListener("click", function () {
                /*btn.removeEventListener("click")*/
                launchDetect(root, root);
            });
        }
    }

    var contents = DetectFilesAndFolders(dir);
    FolderResults = Check_File_For_Validated_extension(contents, ValidatedExtension);
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
async function GetTheFirstImageOfComicsByFolder(filesInFolder = [], i = 0) {
    document.getElementById("prgs").className = "determinate";
    document.getElementById("prgs").style.width = (i * 100) / filesInFolder.length + "%";
    remote.getCurrentWindow().setProgressBar(i / filesInFolder.length);
    try {
        document.getElementById("decompressfilename").innerHTML = language["extracting"] + patha.basename(filesInFolder[i + 1]);
    } catch (error) {
        console.log(error);
    }
    document.getElementById("overlaymsg").innerHTML = language["extracting_thumb"] + " " + i + " " + language["out_of"] + " " + filesInFolder.length;
    if (i < filesInFolder.length && skip === false) {
        CreateFIOAFolder();
        var name = patha.basename(filesInFolder[i]);
        var ext = name.split(".").pop();
        name = name.split(".");
        name = name[0];
        var shortname = get_the_ID_by_name(name);

        CreateFolder(shortname, CosmicComicsData + "/FirstImageOfAll");
        if (fs.existsSync(CosmicComicsData + "/FirstImageOfAll/" + shortname)) {
            if (fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/" + shortname).length === 0) {
                unarchive_first(filesInFolder[i], CosmicComicsData + "/FirstImageOfAll/" + shortname, shortname, ext, ["*.jpg", "*.png", "*.jpeg", "*.bmp", "*.apng", "*.svg", "*.ico", "*.webp", "*.gif",], i, filesInFolder);
            } else {
                await GetTheFirstImageOfComicsByFolder(filesInFolder, i + 1);
            }
        } else {
            unarchive_first(filesInFolder[i], CosmicComicsData + "\\FirstImageOfAll\\" + shortname, shortname, ext, ["*.jpg", "*.png", "*.jpeg", "*.bmp", "*.apng", "*.svg", "*.ico", "*.webp", "*.gif",], i, filesInFolder);
        }
    } else {
        document.getElementById("overlaymsg").innerHTML = language["conversion"];
        await delete_all_exept_the_first();
        GetAllIMG = true;
        document.getElementById("overlaymsg").innerHTML = language["overlaymsg_worst"];
        document.getElementById("prgs").className = "indeterminate";
        remote.getCurrentWindow().setProgressBar(-1);
        document.getElementById("decompressfilename").innerHTML = "";
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
        if (el !== "") {
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

/*var configOSProvider = fs.readFileSync(CosmicComicsData + "/config.json");
var JSON_OSProvider = JSON.parse(configOSProvider);
var OSprovider = Get_From_Config("update_provider", JSON_OSProvider);*/

//Unarchive the first element of each archive
async function delete_all_exept_the_first() {
    var dir = fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/");
    console.log(dir);
    for (var i = 0; i < dir.length; i++) {
        try {
            var files = fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/" + dir[i]);
            if (files.length > 1) {
                files.sort((a, b) => {
                    let fa = a.toLowerCase(), fb = b.toLowerCase();
                    if (fa < fb) {
                        return -1;
                    }
                    if (fa > fb) {
                        return 1;
                    }
                    return 0;
                });
                for (var j = 1; j < files.length; j++) {
                    fs.unlinkSync(CosmicComicsData + "/FirstImageOfAll/" + dir[i] + "/" + files[j]);
                }
            }
        } catch (error) {
            console.log("Error when reading the folder to delete");
        }
    }
    await WConv();
    //Scan le dossier
    // Sort
    // Delete tt sauf le premier
}

function unarchive_first(zipPath, ExtractDir, name, ext, listofelements, indice, filesInFolder) {
    var nn = 0;
    if (ext === "zip" || ext === "cbz" || ext === "7z" || ext === "cb7" || ext === "tar" || ext === "cbt") {
        var fromfile = [];

        const Streamer = Seven.list(zipPath, {
            recursive: true, $cherryPick: listofelements, $bin: Path27Zip,
        });
        console.log(Streamer);
        Streamer.on("data", function (data) {
            fromfile.push(data.file);
            console.log(fromfile);
        });
        Streamer.on("end", function () {
            const Stream = Seven.extract(zipPath, ExtractDir, {
                recursive: true, $cherryPick: fromfile[0], $bin: Path27Zip,
            });
            Stream.on("data", function (data) {
                GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
            });
            Stream.on("end", function () {
                if (Stream.info.get("Files") === "0") {
                    Toastifycation(language["cover_not_compatible"] + " " + name, "#ff0000");
                    GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
                }
            });
            Stream.on("error", function (err) {
                console.log("Error: " + err);
            });
        });
    }

    if (ext === "rar" || ext === "cbr") {
        if (OSprovider === "msstore") {
            var archive = new Unrar({
                path: zipPath, bin: CosmicComicsData + "/unrar_bin/UnRAR.exe",
            });
        } else {
            var archive = new Unrar({
                path: zipPath, bin: unrarBin,
            });
        }

        archive.list(function (err, entries) {
            if (err) {
                new Notification("Cosmic-Comics", {body: err});
                GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
                return;
            }
            entries.sort((a, b) => {
                let fa = a.name.toLowerCase(), fb = b.name.toLowerCase();
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
                if (process.platform === "win32") {
                    currentName = currentName.toLowerCase();
                }
                if (currentName.includes(".png") || currentName.includes(".jpg") || currentName.includes(".jpeg") || currentName.includes(".gif") || currentName.includes(".apng") || currentName.includes(".svg") || currentName.includes(".ico") || currentName.includes(".webp") || currentName.includes(".bmp")) {
                    var stream = archive.stream(currentName);
                    stream.on("error", function (err) {
                        new Notification("Cosmic-Comics", {body: err});
                        GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);

                    });

                    if (fs.existsSync(ExtractDir + "/0.jpg") === false || fs.existsSync(ExtractDir + "/cover.webp") === false) {
                        var x = fs.createWriteStream(ExtractDir + "/0.jpg");
                        stream.pipe(x);
                        GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
                        return;
                    }
                }
            }
        });
        if (process.platform === "linux" || process.platform === "darwin") {
            GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
            return;
        }
    }
    if (ext === "pdf") {
        GetTheFirstImageOfComicsByFolder(filesInFolder, indice + 1);
    }
}

//mark book as read
function markasread() {
    if (name_of_the_current_book !== "") {
        Toastifycation(language["marked_as_read"], "#00C33C");

        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", false, name_of_the_current_book);
        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", false, name_of_the_current_book);
        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "read", true, name_of_the_current_book);
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
    if (name_of_the_current_book !== "") {
        Toastifycation(language["marked_as_unread"], "#00C33C");

        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", false, name_of_the_current_book);
        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "read", false, name_of_the_current_book);
        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", true, name_of_the_current_book);
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
    if (name_of_the_current_book !== "") {
        Toastifycation(language["marked_as_reading"], "#00C33C");

        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "reading", true, name_of_the_current_book);
        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "read", false, name_of_the_current_book);
        ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "unread", false, name_of_the_current_book);
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
    if (name_of_the_current_book !== "") {
        var Info = Get_From_JSON(CosmicComicsData + "/ListOfComics.json", name_of_the_current_book);
        var favorite = Get_element_from_data("favorite", Info);
        if (favorite) {
            Toastifycation(language["remove_fav"], "#00C33C");

            ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "favorite", false, name_of_the_current_book);
            toggleActive(document.getElementById("btn_id_fav_" + name_of_the_current_book));
        } else {
            Toastifycation(language["add_fav"], "#00C33C");
            ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "favorite", true, name_of_the_current_book);
            toggleActive(document.getElementById("btn_id_fav_" + name_of_the_current_book));
        }
        name_of_the_current_book = "";
    }
}

//(Not Working, old idea to make a navigation by filters)
function showOnlyFavT() {
    favonly = favonly !== true;
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
    window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
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
    return;
    var data = fs.readFileSync(CosmicComicsData + "/bookmarks.json");
    var info = JSON.parse(data);
    console.log(info);
    info.forEach((file) => {
        if (file["bookmarked"] === true) {
            const btn = document.createElement("button");
            console.log("openBOOKM('" + file["path"] + "&page=" + file["page"] + "');");
            btn.addEventListener("click", function () {
                openBOOKM(file["path"] + "&page=" + file["page"]);
            });

            btn.className = "btn btn-primary";
            btn.style = "margin:5px";
            btn.innerHTML = file["full_name"] + " " + language["page"] + " " + (parseInt(file["page"]) + 1);
            document.getElementById("bookmarkContainer").appendChild(btn);
        }
    });
    if (info.length === 0) {
        var iblock = document.createElement("i");
        iblock.innerHTML = "block";
        iblock.className = "material-icons";
        if (currenttheme > 1) iblock.style.color = theme_FG;
        document.getElementById("bookmarkContainer").appendChild(iblock);
    }
}

//the Bookmarked loading
listBM();

//Loading ToolTips and languages
/*new bootstrap.Tooltip(document.getElementById("menuid"), {
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
new bootstrap.Tooltip(document.getElementById("id_theme"), {
    title: language["custom_theme"],
    placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("icon_id_viewmode"), {
    title: language["viewmode"],
    placement: "bottom",
});*/
/*document.getElementById("id_about").innerHTML = language["about"];
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
document.getElementById("id_btn_STB").innerHTML = language["skip_tb"];
document.getElementById("id_btn_CTN").innerHTML = language["clear_tb"];
document.getElementById("id_btn_TE").innerHTML =
    language["activate_theme_date"];
document.getElementById("languages").innerHTML = language["languages"];
document.getElementById("beta_test").innerHTML =
    language["betatest"] + document.getElementById("beta_test").innerHTML;
document.getElementById("id_tips").innerHTML = language["Tips"];
document.getElementById("id_did_you_know").innerHTML = language["did_you_know"];
document.getElementById("id_tip_1").innerHTML = language["tips_1"];
document.getElementById("id_tip_2").innerHTML = language["tips_2"];
document.getElementById("id_tip_3").innerHTML = language["tips_3"];
document.getElementById("extract_thumbnails").innerHTML = language["skip_tb"];
document.getElementById("id_btn_update_provider").innerHTML =
    language["btn_update_provider"];
document.getElementById("id_btn_appdata").innerHTML = language["btn_appdata"];
document.getElementById("id_btn_ComicsFolder").innerHTML =
    language["btn_ComicsFolder"];
document.getElementById("id_btn_Temp").innerHTML = language["btn_Temp"];
document.getElementById("tutotxt").innerHTML = language["tuto_txt"];*/


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


//Handle the drag and drop to open files in the app
document.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();

    for (const f of event.dataTransfer.files) {
        // Using the path attribute to get absolute file path
        console.log("File Path of dragged files: ", f.path);
        if (f.path.includes(".cbz") || f.path.includes(".cbr") || f.path.includes(".cbt") || f.path.includes(".cb7") || f.path.includes(".zip") || f.path.includes(".rar") || f.path.includes(".7z") || f.path.includes(".tar")) {
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
                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "note", parseInt(rate.value), name_of_book);
            }
        });
}

function SetForRating2(name_of_book) {
    var rated = document
        .getElementsByName("Rating_" + name_of_book)
        .forEach((rate) => {
            if (rate.checked) {
                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "note", parseInt(rate.value), name_of_book);
            }
        });
}

function SetForRating3(name_of_book) {
    document.getElementsByName("Rating_" + name_of_book).forEach((rate) => {
        if (rate.checked) {
            ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "note", parseInt(rate.value), name_of_book);
        }
    });
}

function SetForRating4(name_of_book) {
    var rated = document
        .getElementsByName("Rating_" + name_of_book)
        .forEach((rate) => {
            if (rate.checked) {
                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "note", parseInt(rate.value), name_of_book);
            }
        });
}

function SetForRating5(name_of_book) {
    var rated = document

        .getElementsByName("Rating_" + name_of_book)
        .forEach((rate) => {
            if (rate.checked) {
                ModifyJSONFile(CosmicComicsData + "/ListOfComics.json", "note", parseInt(rate.value), name_of_book);
            }
        });
}

// Toggle "active" class
function toggleActive(object) {
    object.classList.toggle("active");
}

/*
document.getElementById("id_btn_FU").innerHTML = language["FU"];
*/

function skipping() {
    skip = true;
}

function toggleSkip() {
    var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
    var parsedJSON = JSON.parse(configFile);
    var old = Get_From_Config("skip", parsedJSON);
    if (old === true) {
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "skip", false);
    } else {
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "skip", true);
    }
}

function clearTN() {
    fs.rmSync(CosmicComicsData + "/FirstImageOfAll", {recursive: true});
    fs.mkdirSync(CosmicComicsData + "/FirstImageOfAll");
}

function changeVM() {
    if (cardMode === true) {
        cardMode = false;
        document.getElementById("icon_id_viewmode").innerHTML = "grid_view";
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "display_style", 1);
    } else {
        cardMode = true;
        document.getElementById("icon_id_viewmode").innerHTML = "view_list";
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "display_style", 0);
    }
}

/*if (cardMode === true) {
    document.getElementById("icon_id_viewmode").innerHTML = "view_list";
} else {
    document.getElementById("icon_id_viewmode").innerHTML = "grid_view";
}*/

function selectTheme() {
    document.head.getElementsByTagName("link")[5].href = "/themes/" + document.getElementById("themeselector").value;
    modifyConfigJson(CosmicComicsTemp + "/config.json", "theme", document.getElementById("themeselector").value);

}

function ToggleTBY() {
    if (Get_From_Config("theme_date", JSON.parse(fs.readFileSync(CosmicComicsData + "/config.json"))) === true) {
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "theme_date", false);
        document.getElementById("id_btn_TE").innerHTML = language["activate_theme_date"];
    } else {
        Modify_JSON_For_Config(CosmicComicsData + "/config.json", "theme_date", true);
        document.getElementById("id_btn_TE").innerHTML = language["deactivate_theme_date"];
    }
}

/*if (
    Get_From_Config(
        "theme_date",
        JSON.parse(fs.readFileSync(CosmicComicsData + "/config.json"))
    ) === true
) {
    document.getElementById("id_btn_TE").innerHTML =
        language["deactivate_theme_date"];
} else {
    document.getElementById("id_btn_TE").innerHTML =
        language["activate_theme_date"];
}*/

fetch('http://' + domain + ":" + port + "/getThemes").then((response) => {
    return response.text();
}).then(function (res) {
    res = JSON.parse(res);

    for (let i = 0; i < res.length; i += 2) {
        let opt = document.createElement("option");
        opt.value = res[i];
        opt.innerHTML = res[i + 1];
        document.getElementById("themeselector").appendChild(opt);
    }
}).catch(function (error) {
    console.log(error);
})

async function WConv() {
    try {
        webp.grant_permission();
    } catch (error) {
        console.log("error");
    }
    var dir = fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/");
    for (var i = 0; i < dir.length; i++) {
        try {
            var file = fs.readdirSync(CosmicComicsData + "/FirstImageOfAll/" + dir[i]);
            if (patha.extname(file[0]) !== ".webp") {
                var oldfile = CosmicComicsData + "/FirstImageOfAll/" + dir[i] + "/" + file[0];
                var newfile = CosmicComicsData + "/FirstImageOfAll/" + dir[i] + "/cover.webp";
                await webp
                    .cwebp(oldfile, newfile, "-q 80 -noalpha -resize 250 380", (logging = "-v"))
                    .then((response) => {
                        console.log(response);
                        fs.unlinkSync(oldfile);
                        document.getElementById("prgs").style.width = (i * 100) / dir.length + "%";
                        remote.getCurrentWindow().setProgressBar(i / dir.length);
                    });
            }
        } catch (error) {
            console.log(error);
        }
    }
}

function saveToTheme(el, value, d = "", d2 = "") {
    if (d === "" && d2 === "") {
        var mod = el.value;
    } else {
        if (el.checked === true) {
            var mod = d2;
        } else {
            var mod = d;
        }
    }

    Modify_JSON_For_Config(__dirname + "/themes/[CUSTOM] - Custom.json", value, mod);
}

function recoverThemeCustom() {
    var id = ["colorBG", "colorFG", "colorO2", "O2BG_id", "colorNotifBG", "btn_card_id", "progress_color_id", "BTNHC_id", "BTNFG_id", "BTNBG_id", "BTNBC_id", "BTNH_id", "FGSBC_id", "BGSBC_id", "BSC_id", "HSC_id", "HLVC_id", "BGCI_id", "NBGC_id", "SCID", "PGRSBW_id", "LBG_id", "MUSIC_id", "PRGSBC_id",];
    var name = ["BG", "FG", "O2", "O2", "notifBG", "button_card", "progress", "hover_close", "btn_FG", "btn_BG", "btn_border", "btn_hover", "btn_FG_s", "btn_BG_s", "btn_border_s", "btn_hover_s", "hover_listview", "BG_CI", "nav_BG", "scrollbar", "progressbar_progresswhite_progressblack", "linkBG", "Music", "progress_color",];
    for (var i = 0; i < id.length; i++) {
        var config_JSON = fs.readFileSync(__dirname + "/themes/[CUSTOM] - Custom.json");
        var parsedJSON = JSON.parse(config_JSON);
        var val = Get_From_Config(name[i], parsedJSON);
        console.log(val);
        try {
            console.log(document.getElementById(id[i]).getAttribute("type"));
            if (document.getElementById(id[i]).getAttribute("type") === "checkbox") {
                document.getElementById(id[i]).setAttribute("checked", val);
            } else {
                document.getElementById(id[i]).value = val;
            }
        } catch (error) {
            console.log(error);
        }
    }
}

/*
recoverThemeCustom();
*/

function openFileImageTheme(id, v) {
    let result = remote.dialog.showOpenDialogSync({
        properties: ["openFile"],
    });
    document.getElementById(id).value = result[0].replaceAll("\\", "/");
    saveToTheme(document.getElementById(id), v);
}

/*document.getElementById("selectTheme_id").innerHTML =
    language["select_a_theme"];
document.getElementById("id_thememod").innerHTML = language["theme_customizer"];
document.getElementById("colorBG_txt").innerHTML = language["colorBG_txt"];
document.getElementById("colorFG_txt").innerHTML = language["colorFG_txt"];
document.getElementById("colorO2_txt").innerHTML = language["colorO2_txt"];
document.getElementById("overlay_background_txt").innerHTML =
    language["overlay_background_txt"];
document.getElementById("browseFileTheme_txt").innerHTML =
    language["browseFileTheme_txt"];
document.getElementById("colorNotifBG_txt").innerHTML =
    language["colorNotifBG_txt"];
document.getElementById("btn_card_txt").innerHTML = language["btn_card_txt"];
document.getElementById("progress_color_txt").innerHTML =
    language["progress_color_txt"];
document.getElementById("BTNHC_txt").innerHTML = language["BTNHC_txt"];
document.getElementById("BTNFG_txt").innerHTML = language["BTNFG_txt"];
document.getElementById("BTNBG_txt").innerHTML = language["BTNBG_txt"];
document.getElementById("BTNBC_txt").innerHTML = language["BTNBC_txt"];
document.getElementById("BTNH_txt").innerHTML = language["BTNH_txt"];
document.getElementById("FGSBC_txt").innerHTML = language["FGSBC_txt"];
document.getElementById("BGSBC_txt").innerHTML = language["BGSBC_txt"];
document.getElementById("BSC_txt").innerHTML = language["BSC_txt"];
document.getElementById("HSC_txt").innerHTML = language["HSC_txt"];
document.getElementById("HLVC_txt").innerHTML = language["HLVC_txt"];
document.getElementById("BGCI_txt").innerHTML = language["BGCI_txt"];
document.getElementById("NBGC_txt").innerHTML = language["NBGC_txt"];
document.getElementById("SCID_txt").innerHTML = language["SCID_txt"];
document.getElementById("PGRSBW_txt").innerHTML = language["PGRSBW_txt"];
document.getElementById("MUSIC_txt").innerHTML = language["MUSIC_txt"];
document.getElementById("LBG_txt").innerHTML = language["LBG_txt"];
document.getElementById("browse_fileImageTheme_txt").innerHTML =
    language["browse_fileImageTheme_txt"];
document.getElementById("PRGSBC_txt").innerHTML = language["PRGSBC_txt"];*/


const download = (url, destination) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(url, response => {
        response.pipe(file);

        file.on('finish', () => {
            file.close(resolve(true));
        });
    }).on('error', error => {
        fs.unlink(destination, () => {
            reject(error);
        });

        reject(error.message);
    });
});

async function downloader() {
    let url = document.getElementById("id_URLDL").value;
    console.log(url);
    const option = {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
            "url": url,
        }, null, 2)
    };
    await fetch('http://' + domain + ":" + port + '/downloadBook', option).then(() => {

        console.log("downloaded");
        Toastifycation("Downloaded");
    }).catch(err => {
        console.log(err);
        Toastifycation("Error while downloading");
    });
}

function OpenDownloadDir() {
    window.location.href = "viewer.html?" + CosmicComicsTemp + "/downloaded_book/";
}

async function addLibrary(forma) {
    var form = forma.form;
    await InsertIntoDB("Libraries", "(NAME,PATH,API_ID)", `('${forma.form[0].value}','${forma.form[1].value}','${forma.form[2].value}')`).then(() => {
        window.location.href = window.location.href.split("?")[0];
    });
}

async function updateLibrary(forma, id) {
    var form = forma.form;
    const option = {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
            "name": forma.form[0].value, "path": forma.form[1].value, "api_id": forma.form[2].value
        }, null, 2)
    };
    await fetch('http://' + domain + ":" + port + '/DB/lib/update/'+connected+"/" + id, option).then(() => {
        window.location.href = window.location.href.split("?")[0];
    });
}


getFromDB("Books", "* FROM Books WHERE reading = 1").then(async (resa) => {
    var TheBookun = JSON.parse(resa);
    console.log(TheBookun);
    for (let i = 0; i < TheBookun.length; i++) {
        var TheBook = TheBookun[i];
        var imagelink = TheBook["URLCover"];
        var node = document.createTextNode(TheBook["NOM"]);
        const carddiv = document.createElement("div");
        carddiv.style.cursor = "pointer";
        if (cardMode === true) {
            carddiv.className = "cardcusto";
            carddiv.setAttribute("data-effect", "zoom");
            //button card_save
            const buttonfav = document.createElement("button");
            buttonfav.className = "card__save js-fav";
            buttonfav.type = "button";
            buttonfav.addEventListener("click", function () {
                favorite();
            });
            buttonfav.id = "btn_id_fav_" + TheBook["ID_book"];

            //icon
            const favicon = document.createElement("i");
            favicon.className = "material-icons";
            favicon.innerHTML = "favorite";
            if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;

            buttonfav.appendChild(favicon);
            carddiv.appendChild(buttonfav);

            //button card__close
            const button_unread = document.createElement("button");
            button_unread.className = "card__close js-unread";

            button_unread.type = "button";
            button_unread.addEventListener("click", function () {
                markasunread();
            });
            button_unread.id = "btn_id_unread_" + TheBook["ID_book"];

            //icon
            const unread_icon = document.createElement("i");
            unread_icon.className = "material-icons";
            unread_icon.innerHTML = "close";
            if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;

            button_unread.appendChild(unread_icon);
            carddiv.appendChild(button_unread);
            //button card__reading
            const button_reading = document.createElement("button");
            button_reading.className = "card__reading js-reading";
            button_reading.type = "button";
            button_reading.addEventListener("click", function () {
                markasreading();
            });
            button_reading.id = "btn_id_reading_" + TheBook["ID_book"];

            //icon
            const reading_icon = document.createElement("i");
            reading_icon.className = "material-icons";
            reading_icon.innerHTML = "auto_stories";
            if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;

            button_reading.appendChild(reading_icon);
            carddiv.appendChild(button_reading);
            //button card__read
            const button_read = document.createElement("button");
            button_read.className = "card__read js-read";
            button_read.type = "button";

            button_read.addEventListener("click", function () {
                markasread();
            });
            button_read.id = "btn_id_read_" + TheBook["ID_book"];

            //ico
            const read_ion = document.createElement("i");
            read_ion.className = "material-icons";
            read_ion.innerHTML = "done";
            if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;

            button_read.appendChild(read_ion);
            carddiv.appendChild(button_read);
            //figure card__image
            const cardimage = document.createElement("div");
            cardimage.className = "card__image";
            cardimage.style.backgroundColor = theme_BG_CI;
            const imgcard = document.createElement("img");
            imgcard.style.width = "100%";
            imgcard.id = "card_img_id_" + TheBook["ID_book"];
            imgcard.src = imagelink;


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
            playarr.style.color = theme_button_card;
            playbtn.appendChild(playarr);
            bodycard.appendChild(playbtn);

            const pcard_bio = document.createElement("p");
            pcard_bio.className = "card__bio";
            pcard_bio.style = "text-align: center;";
            pcard_bio.style.color = theme_FG;
            pcard_bio.innerHTML = node.textContent;

            bodycard.appendChild(pcard_bio);
            carddiv.appendChild(bodycard);
            carddiv.id = "id_vol" + TheBook["ID_book"];

            if (playbtn.addEventListener) {

                playbtn.addEventListener("click", function () {
                    /*            ModifyJSONFile(
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
                                );*/
                    alert("ici4")
                    let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"))

                    window.location.href = "viewer.html?" + encoded;

                });
                carddiv.addEventListener("click", async function () {
                    if (provider == 1) {


                        //TODO FD

                        document.getElementById("relations").innerHTML = "";

                        document.getElementById("id").innerHTML = "This is a : " + TheBook.format + " and it have : " + TheBook.pageCount + " pages. <br/> This is part of the series : " + JSON.parse(TheBook.series).name;
                        document.getElementById("averageProgress").style.display = "none";
                        document.getElementById("ContentView").innerHTML = "";
                        document.getElementById("ColTitle").innerHTML = TheBook.NOM
                        document.getElementById("ImgColCover").src = TheBook.URLCover
                        document.getElementById("Status").innerHTML = "";
                        if (TheBook.description != null && TheBook.description != "null") {
                            document.getElementById("description").innerHTML = TheBook.description;
                        } else {
                            document.getElementById("description").innerHTML = "";
                        }
                        // TODO : add the character list

                        var NameToFetchList = [];
                        JSON.parse(TheBook.characters)["items"].forEach((el) => {
                            NameToFetchList.push("'" + el.name + "'");
                        });
                        var NameToFetch = NameToFetchList.join(",");
                        var container = document.createElement("div");
                        await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            container.className = "item-list";
                            clres.forEach((el) => {
                                const divs = document.createElement("div");
                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";
                                divs.style.marginLeft = "10px";
                                container.appendChild(divs);
                            })
                        })

                        /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                        document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(TheBook.characters)["available"] + "<br/>";
                        document.getElementById("characters").appendChild(container);
                        //Genres

                        document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(TheBook.URLs)[0].url + ">" + JSON.parse(TheBook.URLs)[0].url + "</a>";
                        // TODO : add the relations
                        document.getElementById("OtherTitles").innerHTML = "Variants of this comic (for a complete view check the Marvel's website)" + " : ";

                        await getFromDB("variants", "* FROM variants WHERE series = '" + TheBook.ID_Series + "'").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            const divlist = document.createElement("div");
                            divlist.className = "cards-list2"
                            clres.forEach((el) => {
                                const reltxt = document.createElement("div");
                                reltxt.innerHTML = el.name;
                                reltxt.onclick = function () {
                                    window.open(JSON.parse(el.url)[0].url);
                                }
                                reltxt.className = "cardcusto";
                                const imgcard = document.createElement("img");
                                imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                                imgcard.style.width = "100%";
                                reltxt.appendChild(imgcard);
                                divlist.appendChild(reltxt);
                            })
                            document.getElementById("OtherTitles").appendChild(divlist);
                        })


                        // TODO : add the staff list
                        var tmpstaff = "Number of people : " + JSON.parse(TheBook["creators"])["available"] + "<br/>";
                        var StaffToFetchList = [];
                        JSON.parse(TheBook.creators)["items"].forEach((el) => {
                            StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                        });
                        var StaffToFetch = StaffToFetchList.join(",");
                        var container2 = document.createElement("div");

                        await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            container2.className = "item-list";

                            for (var i = 0; i < clres.length; i++) {
                                var el = clres[i];
                                const divs = document.createElement("div");
                                for (var j = 0; j < clres.length; j++) {
                                    if (el.name == JSON.parse(TheBook["creators"])["items"][j].name) {
                                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(TheBook["creators"])["items"][j]["role"] + "</a>";
                                        divs.style.marginLeft = "10px";
                                        container2.appendChild(divs);
                                    }

                                }
                            }

                        })

                        for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {

                            document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
                        }
                        for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {

                            document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
                        }


                        document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                        document.getElementById("Staff").appendChild(container2);
                        document.getElementById("chapters").innerHTML = "Number of this comic within the series : " + TheBook.issueNumber;
                        document.getElementById("price").innerHTML += "Prices : <br/>";
                        for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
                            console.log(JSON.parse(TheBook.prices)[a])
                            document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
                        }
                        document.getElementById("startDate").innerHTML = "Dates : <br/>"
                        for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
                            document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
                        }

                        animateCSS(document.getElementById("contentViewer"), "fadeOut").then((message) => {
                            animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                document.getElementById("contentViewer").style.display = "block";
                            });
                        });

                    }
                });

            }
            const element = document.getElementById("continueReadingHome");
            const divrating = document.createElement("div");
            carddiv.appendChild(divrating);
            element.appendChild(carddiv);


        }
    }
    if (TheBookun.length == 0) {
        const element = document.getElementById("continueReadingHome");
        let node = document.createElement("p")
        node.innerHTML = "Nothing to display here !<br/>Open a new book or try one of the one's below."
        element.appendChild(node);
    }

})
getFromDB("Books", "* FROM Books ORDER BY ID_DB DESC LIMIT 10").then(async (resa) => {
    var TheBookun = JSON.parse(resa);
    console.log(TheBookun);

    for (let i = 0; i < TheBookun.length; i++) {
        var TheBook = TheBookun[i];
        var imagelink = TheBook["URLCover"];
        var node = document.createTextNode(TheBook["NOM"]);
        const carddiv = document.createElement("div");
        carddiv.style.cursor = "pointer";
        if (cardMode === true) {
            carddiv.className = "cardcusto";
            carddiv.setAttribute("data-effect", "zoom");
            //button card_save
            const buttonfav = document.createElement("button");
            buttonfav.className = "card__save js-fav";
            buttonfav.type = "button";
            buttonfav.addEventListener("click", function () {
                favorite();
            });
            buttonfav.id = "btn_id_fav_" + TheBook["ID_book"];

            //icon
            const favicon = document.createElement("i");
            favicon.className = "material-icons";
            favicon.innerHTML = "favorite";
            if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;

            buttonfav.appendChild(favicon);
            carddiv.appendChild(buttonfav);

            //button card__close
            const button_unread = document.createElement("button");
            button_unread.className = "card__close js-unread";

            button_unread.type = "button";
            button_unread.addEventListener("click", function () {
                markasunread();
            });
            button_unread.id = "btn_id_unread_" + TheBook["ID_book"];

            //icon
            const unread_icon = document.createElement("i");
            unread_icon.className = "material-icons";
            unread_icon.innerHTML = "close";
            if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;

            button_unread.appendChild(unread_icon);
            carddiv.appendChild(button_unread);
            //button card__reading
            const button_reading = document.createElement("button");
            button_reading.className = "card__reading js-reading";
            button_reading.type = "button";
            button_reading.addEventListener("click", function () {
                markasreading();
            });
            button_reading.id = "btn_id_reading_" + TheBook["ID_book"];

            //icon
            const reading_icon = document.createElement("i");
            reading_icon.className = "material-icons";
            reading_icon.innerHTML = "auto_stories";
            if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;

            button_reading.appendChild(reading_icon);
            carddiv.appendChild(button_reading);
            //button card__read
            const button_read = document.createElement("button");
            button_read.className = "card__read js-read";
            button_read.type = "button";

            button_read.addEventListener("click", function () {
                markasread();
            });
            button_read.id = "btn_id_read_" + TheBook["ID_book"];

            //ico
            const read_ion = document.createElement("i");
            read_ion.className = "material-icons";
            read_ion.innerHTML = "done";
            if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;

            button_read.appendChild(read_ion);
            carddiv.appendChild(button_read);
            //figure card__image
            const cardimage = document.createElement("div");
            cardimage.className = "card__image";
            cardimage.style.backgroundColor = theme_BG_CI;
            const imgcard = document.createElement("img");
            imgcard.style.width = "100%";
            imgcard.id = "card_img_id_" + TheBook["ID_book"];
            imgcard.src = imagelink;


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
            playarr.style.color = theme_button_card;
            playbtn.appendChild(playarr);
            bodycard.appendChild(playbtn);

            const pcard_bio = document.createElement("p");
            pcard_bio.className = "card__bio";
            pcard_bio.style = "text-align: center;";
            pcard_bio.style.color = theme_FG;
            pcard_bio.innerHTML = node.textContent;

            bodycard.appendChild(pcard_bio);
            carddiv.appendChild(bodycard);
            carddiv.id = "id_vol" + TheBook["ID_book"];

            if (playbtn.addEventListener) {

                playbtn.addEventListener("click", function () {
                    /*            ModifyJSONFile(
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
                                );*/
                    alert("ici4")
                    let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"))

                    window.location.href = "viewer.html?" + encoded;

                });
                carddiv.addEventListener("click", async function () {
                    if (provider == 1) {


                        //TODO FD

                        document.getElementById("relations").innerHTML = "";

                        document.getElementById("id").innerHTML = "This is a : " + TheBook.format + " and it have : " + TheBook.pageCount + " pages. <br/> This is part of the series : " + JSON.parse(TheBook.series).name;
                        document.getElementById("averageProgress").style.display = "none";
                        document.getElementById("ContentView").innerHTML = "";
                        document.getElementById("ColTitle").innerHTML = TheBook.NOM
                        document.getElementById("ImgColCover").src = TheBook.URLCover
                        document.getElementById("Status").innerHTML = "";
                        if (TheBook.description != null && TheBook.description != "null") {
                            document.getElementById("description").innerHTML = TheBook.description;
                        } else {
                            document.getElementById("description").innerHTML = "";
                        }
                        // TODO : add the character list

                        var NameToFetchList = [];
                        JSON.parse(TheBook.characters)["items"].forEach((el) => {
                            NameToFetchList.push("'" + el.name + "'");
                        });
                        var NameToFetch = NameToFetchList.join(",");
                        var container = document.createElement("div");
                        await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            container.className = "item-list";
                            clres.forEach((el) => {
                                const divs = document.createElement("div");
                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";
                                divs.style.marginLeft = "10px";
                                container.appendChild(divs);
                            })
                        })

                        /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                        document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(TheBook.characters)["available"] + "<br/>";
                        document.getElementById("characters").appendChild(container);
                        //Genres

                        document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(TheBook.URLs)[0].url + ">" + JSON.parse(TheBook.URLs)[0].url + "</a>";
                        // TODO : add the relations
                        document.getElementById("OtherTitles").innerHTML = "Variants of this comic (for a complete view check the Marvel's website)" + " : ";

                        await getFromDB("variants", "* FROM variants WHERE series = '" + TheBook.ID_Series + "'").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            const divlist = document.createElement("div");
                            divlist.className = "cards-list2"
                            clres.forEach((el) => {
                                const reltxt = document.createElement("div");
                                reltxt.innerHTML = el.name;
                                reltxt.onclick = function () {
                                    window.open(JSON.parse(el.url)[0].url);
                                }
                                reltxt.className = "cardcusto";
                                const imgcard = document.createElement("img");
                                imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                                imgcard.style.width = "100%";
                                reltxt.appendChild(imgcard);
                                divlist.appendChild(reltxt);
                            })
                            document.getElementById("OtherTitles").appendChild(divlist);
                        })


                        // TODO : add the staff list
                        var tmpstaff = "Number of people : " + JSON.parse(TheBook["creators"])["available"] + "<br/>";
                        var StaffToFetchList = [];
                        JSON.parse(TheBook.creators)["items"].forEach((el) => {
                            StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                        });
                        var StaffToFetch = StaffToFetchList.join(",");
                        var container2 = document.createElement("div");

                        await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            container2.className = "item-list";

                            for (var i = 0; i < clres.length; i++) {
                                var el = clres[i];
                                const divs = document.createElement("div");
                                for (var j = 0; j < clres.length; j++) {
                                    if (el.name == JSON.parse(TheBook["creators"])["items"][j].name) {
                                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(TheBook["creators"])["items"][j]["role"] + "</a>";
                                        divs.style.marginLeft = "10px";
                                        container2.appendChild(divs);
                                    }

                                }
                            }

                        })

                        for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {

                            document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
                        }
                        for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {

                            document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
                        }


                        document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                        document.getElementById("Staff").appendChild(container2);
                        document.getElementById("chapters").innerHTML = "Number of this comic within the series : " + TheBook.issueNumber;
                        document.getElementById("price").innerHTML += "Prices : <br/>";
                        for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
                            console.log(JSON.parse(TheBook.prices)[a])
                            document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
                        }
                        document.getElementById("startDate").innerHTML = "Dates : <br/>"
                        for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
                            document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
                        }

                        animateCSS(document.getElementById("contentViewer"), "fadeOut").then((message) => {
                            animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                document.getElementById("contentViewer").style.display = "block";
                            });
                        });

                    }
                });

            }
            const element = document.getElementById("recentlyAdded");
            const divrating = document.createElement("div");
            carddiv.appendChild(divrating);
            element.appendChild(carddiv);


        }
    }
    if (TheBookun.length == 0) {
        const element = document.getElementById("recentlyAdded");
        let node = document.createElement("p")
        node.innerHTML = "Nothing to display here !"
        element.appendChild(node);
    }

})
getFromDB("Books", "* FROM Books WHERE unread = 1").then(async (resa) => {
    var TheBookun = JSON.parse(resa);
    console.log(TheBookun);
    for (let i = 0; i < TheBookun.length; i++) {
        var TheBook = TheBookun[i];
        var imagelink = TheBook["URLCover"];
        var node = document.createTextNode(TheBook["NOM"]);
        const carddiv = document.createElement("div");
        carddiv.style.cursor = "pointer";
        if (cardMode === true) {
            carddiv.className = "cardcusto";
            carddiv.setAttribute("data-effect", "zoom");
            //button card_save
            const buttonfav = document.createElement("button");
            buttonfav.className = "card__save js-fav";
            buttonfav.type = "button";
            buttonfav.addEventListener("click", function () {
                favorite();
            });
            buttonfav.id = "btn_id_fav_" + TheBook["ID_book"];

            //icon
            const favicon = document.createElement("i");
            favicon.className = "material-icons";
            favicon.innerHTML = "favorite";
            if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;

            buttonfav.appendChild(favicon);
            carddiv.appendChild(buttonfav);

            //button card__close
            const button_unread = document.createElement("button");
            button_unread.className = "card__close js-unread";

            button_unread.type = "button";
            button_unread.addEventListener("click", function () {
                markasunread();
            });
            button_unread.id = "btn_id_unread_" + TheBook["ID_book"];

            //icon
            const unread_icon = document.createElement("i");
            unread_icon.className = "material-icons";
            unread_icon.innerHTML = "close";
            if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;

            button_unread.appendChild(unread_icon);
            carddiv.appendChild(button_unread);
            //button card__reading
            const button_reading = document.createElement("button");
            button_reading.className = "card__reading js-reading";
            button_reading.type = "button";
            button_reading.addEventListener("click", function () {
                markasreading();
            });
            button_reading.id = "btn_id_reading_" + TheBook["ID_book"];

            //icon
            const reading_icon = document.createElement("i");
            reading_icon.className = "material-icons";
            reading_icon.innerHTML = "auto_stories";
            if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;

            button_reading.appendChild(reading_icon);
            carddiv.appendChild(button_reading);
            //button card__read
            const button_read = document.createElement("button");
            button_read.className = "card__read js-read";
            button_read.type = "button";

            button_read.addEventListener("click", function () {
                markasread();
            });
            button_read.id = "btn_id_read_" + TheBook["ID_book"];

            //ico
            const read_ion = document.createElement("i");
            read_ion.className = "material-icons";
            read_ion.innerHTML = "done";
            if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;

            button_read.appendChild(read_ion);
            carddiv.appendChild(button_read);
            //figure card__image
            const cardimage = document.createElement("div");
            cardimage.className = "card__image";
            cardimage.style.backgroundColor = theme_BG_CI;
            const imgcard = document.createElement("img");
            imgcard.style.width = "100%";
            imgcard.id = "card_img_id_" + TheBook["ID_book"];
            imgcard.src = imagelink;


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
            playarr.style.color = theme_button_card;
            playbtn.appendChild(playarr);
            bodycard.appendChild(playbtn);

            const pcard_bio = document.createElement("p");
            pcard_bio.className = "card__bio";
            pcard_bio.style = "text-align: center;";
            pcard_bio.style.color = theme_FG;
            pcard_bio.innerHTML = node.textContent;

            bodycard.appendChild(pcard_bio);
            carddiv.appendChild(bodycard);
            carddiv.id = "id_vol" + TheBook["ID_book"];

            if (playbtn.addEventListener) {

                playbtn.addEventListener("click", function () {
                    /*            ModifyJSONFile(
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
                                );*/
                    alert("ici4")
                    let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"))

                    window.location.href = "viewer.html?" + encoded;

                });
                carddiv.addEventListener("click", async function () {
                    if (provider == 1) {


                        //TODO FD

                        document.getElementById("relations").innerHTML = "";

                        document.getElementById("id").innerHTML = "This is a : " + TheBook.format + " and it have : " + TheBook.pageCount + " pages. <br/> This is part of the series : " + JSON.parse(TheBook.series).name;
                        document.getElementById("averageProgress").style.display = "none";
                        document.getElementById("ContentView").innerHTML = "";
                        document.getElementById("ColTitle").innerHTML = TheBook.NOM
                        document.getElementById("ImgColCover").src = TheBook.URLCover
                        document.getElementById("Status").innerHTML = "";
                        if (TheBook.description != null && TheBook.description != "null") {
                            document.getElementById("description").innerHTML = TheBook.description;
                        } else {
                            document.getElementById("description").innerHTML = "";
                        }
                        // TODO : add the character list

                        var NameToFetchList = [];
                        JSON.parse(TheBook.characters)["items"].forEach((el) => {
                            NameToFetchList.push("'" + el.name + "'");
                        });
                        var NameToFetch = NameToFetchList.join(",");
                        var container = document.createElement("div");
                        await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            container.className = "item-list";
                            clres.forEach((el) => {
                                const divs = document.createElement("div");
                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";
                                divs.style.marginLeft = "10px";
                                container.appendChild(divs);
                            })
                        })

                        /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                        document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(TheBook.characters)["available"] + "<br/>";
                        document.getElementById("characters").appendChild(container);
                        //Genres

                        document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(TheBook.URLs)[0].url + ">" + JSON.parse(TheBook.URLs)[0].url + "</a>";
                        // TODO : add the relations
                        document.getElementById("OtherTitles").innerHTML = "Variants of this comic (for a complete view check the Marvel's website)" + " : ";

                        await getFromDB("variants", "* FROM variants WHERE series = '" + TheBook.ID_Series + "'").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            const divlist = document.createElement("div");
                            divlist.className = "cards-list2"
                            clres.forEach((el) => {
                                const reltxt = document.createElement("div");
                                reltxt.innerHTML = el.name;
                                reltxt.onclick = function () {
                                    window.open(JSON.parse(el.url)[0].url);
                                }
                                reltxt.className = "cardcusto";
                                const imgcard = document.createElement("img");
                                imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                                imgcard.style.width = "100%";
                                reltxt.appendChild(imgcard);
                                divlist.appendChild(reltxt);
                            })
                            document.getElementById("OtherTitles").appendChild(divlist);
                        })


                        // TODO : add the staff list
                        var tmpstaff = "Number of people : " + JSON.parse(TheBook["creators"])["available"] + "<br/>";
                        var StaffToFetchList = [];
                        JSON.parse(TheBook.creators)["items"].forEach((el) => {
                            StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                        });
                        var StaffToFetch = StaffToFetchList.join(",");
                        var container2 = document.createElement("div");

                        await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            container2.className = "item-list";

                            for (var i = 0; i < clres.length; i++) {
                                var el = clres[i];
                                const divs = document.createElement("div");
                                for (var j = 0; j < clres.length; j++) {
                                    if (el.name == JSON.parse(TheBook["creators"])["items"][j].name) {
                                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(TheBook["creators"])["items"][j]["role"] + "</a>";
                                        divs.style.marginLeft = "10px";
                                        container2.appendChild(divs);
                                    }

                                }
                            }

                        })

                        for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {

                            document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
                        }
                        for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {

                            document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
                        }


                        document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                        document.getElementById("Staff").appendChild(container2);
                        document.getElementById("chapters").innerHTML = "Number of this comic within the series : " + TheBook.issueNumber;
                        document.getElementById("price").innerHTML += "Prices : <br/>";
                        for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
                            console.log(JSON.parse(TheBook.prices)[a])
                            document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
                        }
                        document.getElementById("startDate").innerHTML = "Dates : <br/>"
                        for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
                            document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
                        }

                        animateCSS(document.getElementById("contentViewer"), "fadeOut").then((message) => {
                            animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                document.getElementById("contentViewer").style.display = "block";
                            });
                        });

                    }
                });

            }
            const element = document.getElementById("toRead");
            const divrating = document.createElement("div");
            carddiv.appendChild(divrating);
            element.appendChild(carddiv);


        }
    }
    if (TheBookun.length == 0) {
        const element = document.getElementById("toRead");
        let node = document.createElement("p")
        node.innerHTML = "Nothing to display here !<br/>Look's like you read all your books. Consider to import new ones!"
        element.appendChild(node);
    }

})
getFromDB("Books", "* FROM Books WHERE favorite = 1").then(async (resa) => {
    var TheBookun = JSON.parse(resa);
    console.log(TheBookun);
    for (let i = 0; i < TheBookun.length; i++) {
        var TheBook = TheBookun[i];
        var imagelink = TheBook["URLCover"];
        var node = document.createTextNode(TheBook["NOM"]);
        const carddiv = document.createElement("div");
        carddiv.style.cursor = "pointer";
        if (cardMode === true) {
            carddiv.className = "cardcusto";
            carddiv.setAttribute("data-effect", "zoom");
            //button card_save
            const buttonfav = document.createElement("button");
            buttonfav.className = "card__save js-fav";
            buttonfav.type = "button";
            buttonfav.addEventListener("click", function () {
                favorite();
            });
            buttonfav.id = "btn_id_fav_" + TheBook["ID_book"];

            //icon
            const favicon = document.createElement("i");
            favicon.className = "material-icons";
            favicon.innerHTML = "favorite";
            if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;

            buttonfav.appendChild(favicon);
            carddiv.appendChild(buttonfav);

            //button card__close
            const button_unread = document.createElement("button");
            button_unread.className = "card__close js-unread";

            button_unread.type = "button";
            button_unread.addEventListener("click", function () {
                markasunread();
            });
            button_unread.id = "btn_id_unread_" + TheBook["ID_book"];

            //icon
            const unread_icon = document.createElement("i");
            unread_icon.className = "material-icons";
            unread_icon.innerHTML = "close";
            if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;

            button_unread.appendChild(unread_icon);
            carddiv.appendChild(button_unread);
            //button card__reading
            const button_reading = document.createElement("button");
            button_reading.className = "card__reading js-reading";
            button_reading.type = "button";
            button_reading.addEventListener("click", function () {
                markasreading();
            });
            button_reading.id = "btn_id_reading_" + TheBook["ID_book"];

            //icon
            const reading_icon = document.createElement("i");
            reading_icon.className = "material-icons";
            reading_icon.innerHTML = "auto_stories";
            if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;

            button_reading.appendChild(reading_icon);
            carddiv.appendChild(button_reading);
            //button card__read
            const button_read = document.createElement("button");
            button_read.className = "card__read js-read";
            button_read.type = "button";

            button_read.addEventListener("click", function () {
                markasread();
            });
            button_read.id = "btn_id_read_" + TheBook["ID_book"];

            //ico
            const read_ion = document.createElement("i");
            read_ion.className = "material-icons";
            read_ion.innerHTML = "done";
            if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;

            button_read.appendChild(read_ion);
            carddiv.appendChild(button_read);
            //figure card__image
            const cardimage = document.createElement("div");
            cardimage.className = "card__image";
            cardimage.style.backgroundColor = theme_BG_CI;
            const imgcard = document.createElement("img");
            imgcard.style.width = "100%";
            imgcard.id = "card_img_id_" + TheBook["ID_book"];
            imgcard.src = imagelink;


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
            playarr.style.color = theme_button_card;
            playbtn.appendChild(playarr);
            bodycard.appendChild(playbtn);

            const pcard_bio = document.createElement("p");
            pcard_bio.className = "card__bio";
            pcard_bio.style = "text-align: center;";
            pcard_bio.style.color = theme_FG;
            pcard_bio.innerHTML = node.textContent;

            bodycard.appendChild(pcard_bio);
            carddiv.appendChild(bodycard);
            carddiv.id = "id_vol" + TheBook["ID_book"];

            if (playbtn.addEventListener) {

                playbtn.addEventListener("click", function () {
                    /*            ModifyJSONFile(
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
                                );*/
                    alert("ici4")
                    let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"))

                    window.location.href = "viewer.html?" + encoded;

                });
                carddiv.addEventListener("click", async function () {
                    if (provider == 1) {


                        //TODO FD

                        document.getElementById("relations").innerHTML = "";

                        document.getElementById("id").innerHTML = "This is a : " + TheBook.format + " and it have : " + TheBook.pageCount + " pages. <br/> This is part of the series : " + JSON.parse(TheBook.series).name;
                        document.getElementById("averageProgress").style.display = "none";
                        document.getElementById("ContentView").innerHTML = "";
                        document.getElementById("ColTitle").innerHTML = TheBook.NOM
                        document.getElementById("ImgColCover").src = TheBook.URLCover
                        document.getElementById("Status").innerHTML = "";
                        if (TheBook.description != null && TheBook.description != "null") {
                            document.getElementById("description").innerHTML = TheBook.description;
                        } else {
                            document.getElementById("description").innerHTML = "";
                        }
                        // TODO : add the character list

                        var NameToFetchList = [];
                        JSON.parse(TheBook.characters)["items"].forEach((el) => {
                            NameToFetchList.push("'" + el.name + "'");
                        });
                        var NameToFetch = NameToFetchList.join(",");
                        var container = document.createElement("div");
                        await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            container.className = "item-list";
                            clres.forEach((el) => {
                                const divs = document.createElement("div");
                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";
                                divs.style.marginLeft = "10px";
                                container.appendChild(divs);
                            })
                        })

                        /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                        document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(TheBook.characters)["available"] + "<br/>";
                        document.getElementById("characters").appendChild(container);
                        //Genres

                        document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(TheBook.URLs)[0].url + ">" + JSON.parse(TheBook.URLs)[0].url + "</a>";
                        // TODO : add the relations
                        document.getElementById("OtherTitles").innerHTML = "Variants of this comic (for a complete view check the Marvel's website)" + " : ";

                        await getFromDB("variants", "* FROM variants WHERE series = '" + TheBook.ID_Series + "'").then((clres) => {
                            clres = JSON.parse(clres)
                            console.log(clres)
                            const divlist = document.createElement("div");
                            divlist.className = "cards-list2"
                            clres.forEach((el) => {
                                const reltxt = document.createElement("div");
                                reltxt.innerHTML = el.name;
                                reltxt.onclick = function () {
                                    window.open(JSON.parse(el.url)[0].url);
                                }
                                reltxt.className = "cardcusto";
                                const imgcard = document.createElement("img");
                                imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                                imgcard.style.width = "100%";
                                reltxt.appendChild(imgcard);
                                divlist.appendChild(reltxt);
                            })
                            document.getElementById("OtherTitles").appendChild(divlist);
                        })


                        // TODO : add the staff list
                        var tmpstaff = "Number of people : " + JSON.parse(TheBook["creators"])["available"] + "<br/>";
                        var StaffToFetchList = [];
                        JSON.parse(TheBook.creators)["items"].forEach((el) => {
                            StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                        });
                        var StaffToFetch = StaffToFetchList.join(",");
                        var container2 = document.createElement("div");

                        await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                            clres = JSON.parse(clres)
                            container2.className = "item-list";

                            for (var i = 0; i < clres.length; i++) {
                                var el = clres[i];
                                const divs = document.createElement("div");
                                for (var j = 0; j < clres.length; j++) {
                                    if (el.name == JSON.parse(TheBook["creators"])["items"][j].name) {
                                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(TheBook["creators"])["items"][j]["role"] + "</a>";
                                        divs.style.marginLeft = "10px";
                                        container2.appendChild(divs);
                                    }

                                }
                            }

                        })

                        for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {

                            document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
                        }
                        for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {

                            document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
                        }


                        document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                        document.getElementById("Staff").appendChild(container2);
                        document.getElementById("chapters").innerHTML = "Number of this comic within the series : " + TheBook.issueNumber;
                        document.getElementById("price").innerHTML += "Prices : <br/>";
                        for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
                            console.log(JSON.parse(TheBook.prices)[a])
                            document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
                        }
                        document.getElementById("startDate").innerHTML = "Dates : <br/>"
                        for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
                            document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
                        }

                        animateCSS(document.getElementById("contentViewer"), "fadeOut").then((message) => {
                            animateCSS(document.getElementById("contentViewer"), "fadeIn").then((message) => {
                                document.getElementById("contentViewer").style.display = "block";
                            });
                        });

                    }
                });

            }
            const element = document.getElementById("myfavoriteHome");
            const divrating = document.createElement("div");
            carddiv.appendChild(divrating);
            element.appendChild(carddiv);


        }
    }
    if (TheBookun.length == 0) {
        const element = document.getElementById("myfavoriteHome");
        let node = document.createElement("p")
        node.innerHTML = "Nothing to display here !<br/>Look's like you don't love any comic book yet !";
        element.appendChild(node);
    }

})

document.getElementById("LibTitle").innerHTML = "Home"

function returnToHome(e) {
    document.querySelectorAll(".selectLib").forEach((el) => {
        el.classList.remove("selectLib");
    })
    e.classList.add("selectLib");
    document.getElementById("LibTitle").innerHTML = "Home"

    document.getElementById("ContainerExplorer").innerHTML = "";
    document.getElementById("overlay").style.display = "none"
    document.getElementById("overlay2").style.display = "none"
    document.getElementById("contentViewer").style.display = "none"
    document.getElementById('home').style.display = 'block';
}

theSearchList = [];
getFromDB("Books", "NOM,PATH FROM Books").then(async (resa) => {
    resa = JSON.parse(resa);
    for (var i = 0; i < resa.length; i++) {
        theSearchList.push(resa[i]);
    }
})

async function setSearch(res) {
    for (const key in res) {
        const resItem = document.createElement("li")
        resItem.classList.add("resItem");
        const text = document.createTextNode(res[key].NOM);
        resItem.appendChild(text)

        resItem.addEventListener("click", async (e) => {
            document.getElementById("home").style.display = "none";

            await getFromDB("Books", "* FROM Books WHERE PATH = '" + res[key].PATH + "'").then(async (resa) => {
                let bookList = JSON.parse(resa);
                let TheBook = bookList[0];


                //TODO FD

                document.getElementById("relations").innerHTML = "";

                document.getElementById("id").innerHTML = "This is a : " + TheBook.format + " and it have : " + TheBook.pageCount + " pages. <br/> This is part of the series : " + JSON.parse(TheBook.series).name;
                document.getElementById("averageProgress").style.display = "none";
                document.getElementById("ContentView").innerHTML = "";
                document.getElementById("ColTitle").innerHTML = TheBook.NOM
                document.getElementById("ImgColCover").src = TheBook.URLCover
                document.getElementById("Status").innerHTML = "";
                if (TheBook.description != null && TheBook.description != "null") {
                    document.getElementById("description").innerHTML = TheBook.description;
                } else {
                    document.getElementById("description").innerHTML = "";
                }
                // TODO : add the character list

                var NameToFetchList = [];
                JSON.parse(TheBook.characters)["items"].forEach((el) => {
                    NameToFetchList.push("'" + el.name + "'");
                });
                var NameToFetch = NameToFetchList.join(",");
                var container = document.createElement("div");
                await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
                    clres = JSON.parse(clres)
                    console.log(clres)
                    container.className = "item-list";
                    clres.forEach((el) => {
                        const divs = document.createElement("div");
                        divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "</a>";

                        divs.style.marginLeft = "10px";
                        container.appendChild(divs);
                    })
                })

                /* tmpchara += "<a href=" + el.resourceURI + ">" + el.name + "</a>" + "<br/>";*/
                document.getElementById("characters").innerHTML = "<h1>" + "characters" + ":</h1> " + "Number of characters : " + JSON.parse(TheBook.characters)["available"] + "<br/>";
                document.getElementById("characters").appendChild(container);
                //Genres

                document.getElementById("SiteURL").innerHTML = "URL : <a target='_blank' href=" + JSON.parse(TheBook.URLs)[0].url + ">" + JSON.parse(TheBook.URLs)[0].url + "</a>";
                // TODO : add the relations
                document.getElementById("OtherTitles").innerHTML = "Variants of this comic (for a complete view check the Marvel's website)" + " : ";

                await getFromDB("variants", "* FROM variants WHERE series = '" + TheBook.ID_Series + "'").then((clres) => {
                    clres = JSON.parse(clres)
                    console.log(clres)
                    const divlist = document.createElement("div");
                    divlist.className = "cards-list2"
                    clres.forEach((el) => {
                        const reltxt = document.createElement("div");
                        reltxt.innerHTML = el.name;
                        reltxt.onclick = function () {
                            window.open(JSON.parse(el.url)[0].url);
                        }
                        reltxt.className = "cardcusto";
                        const imgcard = document.createElement("img");
                        imgcard.src = JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension;
                        imgcard.style.width = "100%";
                        reltxt.appendChild(imgcard);
                        divlist.appendChild(reltxt);
                    })
                    document.getElementById("OtherTitles").appendChild(divlist);
                })


                // TODO : add the staff list
                var tmpstaff = "Number of people : " + JSON.parse(TheBook["creators"])["available"] + "<br/>";
                var StaffToFetchList = [];
                JSON.parse(TheBook.creators)["items"].forEach((el) => {
                    StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
                });
                var StaffToFetch = StaffToFetchList.join(",");
                var container2 = document.createElement("div");

                await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
                    clres = JSON.parse(clres)
                    container2.className = "item-list";

                    for (var i = 0; i < clres.length; i++) {
                        var el = clres[i];
                        const divs = document.createElement("div");
                        for (var j = 0; j < clres.length; j++) {
                            if (el.name == JSON.parse(TheBook["creators"])["items"][j].name) {
                                divs.innerHTML = "<a target='_blank' href=" + JSON.parse(el.url)[0].url + ">" + "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/>" + el.name + "<br/>" + JSON.parse(TheBook["creators"])["items"][j]["role"] + "</a>";
                                divs.style.marginLeft = "10px";
                                container2.appendChild(divs);
                            }

                        }
                    }

                })

                for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {

                    document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
                }
                for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {

                    document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
                }

                document.getElementById("contentViewer").style.backgroundImage = "url(" + TheBook.URLCover + ")";

                document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
                document.getElementById("Staff").appendChild(container2);
                document.getElementById("chapters").innerHTML = "Number of this comic within the series : " + TheBook.issueNumber;
                document.getElementById("price").innerHTML += "Prices : <br/>";
                for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
                    console.log(JSON.parse(TheBook.prices)[a])
                    document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
                }
                document.getElementById("startDate").innerHTML = "Dates : <br/>"
                for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
                    document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
                }


                document.getElementById("contentViewer").style.display = "block";

            });
        })

        document.getElementById("searchResults").appendChild(resItem)

    }
    if (res.length == 0) {
        const resItem = document.createElement("li")
        resItem.classList.add("resItem");
        const text = document.createTextNode("No results found");
        resItem.appendChild(text)
        document.getElementById("searchResults").appendChild(resItem)
    }
}

function clearList() {
    while (document.getElementById("searchResults").firstChild) {
        document.getElementById("searchResults").removeChild(document.getElementById("searchResults").firstChild);
    }
}

document.getElementById('searchField').addEventListener('input', function (e) {
    document.getElementById('searchResults').style.display = 'block';
    clearList()
    let value = e.target.value;
    if (value && value.trim().length > 0) {
        value = value.trim().toLowerCase();
        setSearch(theSearchList.filter(item => {
            return item.NOM.toLowerCase().includes(value);
        })).then(r => {

        })

    } else {
        document.getElementById("searchResults").style.display = "none";
        clearList()
    }
})
document.addEventListener('click', function (e) {
    document.getElementById("searchResults").style.display = "none";

    clearList();

})

async function downloadBook(path) {
    const option = {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
            path: path
        }, null, 2)
    };
    console.log(option)
    await fetch('http://' + domain + ":" + port + '/DL', option).then(() => {
        window.open("http://" + domain + ":" + port + "/getDLBook", "_blank");
    });

}
