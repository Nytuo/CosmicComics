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
const ValidatedExtension = ["cbr", "cbz", "pdf", "zip", "7z", "cb7", "tar", "cbt", "rar"];
let coolanimations = ["zoomInDown", "rollIn", "zoomIn", "jackInTheBox", "fadeInUp", "fadeInDown", "fadeIn", "bounceInUp", "bounceInDown", "backInDown"];
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
var currentUser = "";
var connected = getCookie("selectedProfile");
console.log(connected);
if (connected == null) {
	window.location.href = "login";
} else {
	fetch("http://" + domain + ":" + port + "/profile/logcheck/" + connected).then(function (response) {
		return response.text();
	}).then(function (data) {
		if (data === "false") {
			window.location.href = "login";
		} else {
			currentUser = data;
			document.getElementById("icon_id_accountSystem").src = "http://" + domain + ":" + port + "/profile/getPP/" + connected;
			fetch("http://" + domain + ":" + port + "/config/getConfig/" + connected).then(function (response) {
				return response.text();
			}).then(function (data) {
				d = GetElFromInforPath("display_style", JSON.parse(data));
				var cardMode = _01toBool(d);
			}).catch(function (error) {
				console.log(error);
			});
			fetch("http://" + domain + ":" + port + "/config/getConfig/" + connected).then(function (response) {
				return response.text();
			}).then(function (data) {
				currenttheme = GetElFromInforPath("theme", JSON.parse(data));
				console.log(currenttheme);
				Themes();
			}).catch(function (error) {
				console.log(error);
			});
			fetch("http://" + domain + ":" + port + "/config/getConfig/" + connected).then(function (response) {
				return response.text();
			}).then(function (data) {
				let currenttheme = GetElFromInforPath(
					"theme",
					JSON.parse(data));
				console.log(currenttheme);
				setTheme(currenttheme);
			}).catch(function (error) {
				console.log(error);
			});
			getResponse();
		}
	}).catch(function (error) {
		console.log(error);
	});
}
var cardMode = true;

function GetElFromInforPath(search, info) {
	for (var i in info) {
		if (i == search) {
			return info[i];
		}
	}
	return null;
}

var theme_FG = "white";
var theme_BG_CI = "rgba(0,0,0,0.753)";
var currenttheme;
var theme_button_card = "";
var theme_hover_listview = "#242424";
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
	CosmicComicsTemp = dirnameFE;
	CosmicComicsTempI = CosmicComicsTemp + "/current_book/";
	console.log(CosmicComicsTempI);
}).catch(function (error) {
	console.log(error);
});

function setTheme(theme) {
	document.head.getElementsByTagName("link")[5].href = "/themes/" + theme;
}

var GetAllIMG = false;
//ToolTips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
	return new bootstrap.Tooltip(tooltipTriggerEl);
});
var language;
console.log(language);

async function getResponse() {
	console.log("begin Request");
	const response = await fetch("http://" + domain + ":" + port + "/config/getConfig/" + connected);
	console.log("Requested");
	const dataa = await response.json().then((data) => {
		console.log(data);
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
	return fetch('http://' + domain + ":" + port + '/DB/get/' + connected + "/" + dbname, option).then(function (response) {
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
	return fetch('http://' + domain + ":" + port + '/DB/insert/' + connected + "/" + dbname, option);
}

async function deleteLib(elElement) {
	let confirmDelete = confirm("Would you like to delete " + elElement["NAME"] + " ?");
	if (confirmDelete) {
		await fetch('http://' + domain + ":" + port + '/DB/lib/delete/' + connected + "/" + elElement["ID_LIBRARY"]).then(() => {
			alert("The library has been deleted");
			location.reload();
		});
	}
}

function getCookie(cName) {
	const name = cName + "=";
	const cDecoded = decodeURIComponent(document.cookie); //to be careful
	const cArr = cDecoded.split('; ');
	let res;
	cArr.forEach(val => {
		if (val.indexOf(name) === 0) res = val.substring(name.length);
	});
	return res;
}

function modifyLib(elElement) {
	document.getElementById("id_lib").innerHTML = "Modify a library";
	document.getElementById("namelocation").value = elElement["NAME"];
	document.getElementById("locationa").value = elElement["PATH"];
	document.getElementById("opt" + elElement["API_ID"]).setAttribute("selected", "true");
	document.getElementById("opt" + elElement["API_ID"]).selected = true;
	document.getElementById("sendlib").innerHTML = "Modify library";
	document.getElementById("sendlib").onclick = function () {
		return updateLibrary({'form': [document.getElementById('namelocation'), document.getElementById('locationa'), document.getElementById('providerID')]}, elElement["ID_LIBRARY"]);
	};
}

let defaultBG = document.documentElement.style.getPropertyValue('--background');

function resetOverlay() {
	document.documentElement.style.overflow = "auto";
	document.getElementById("ColTitle").innerHTML = "";
	document.getElementById("startDate").innerHTML = "";
	document.getElementById("Status").innerHTML = "";
	document.getElementById("price").innerHTML = "";
	document.getElementById("genres").innerHTML = "";
	document.getElementById("chapters").innerHTML = "";
	document.getElementById("id").innerHTML = "";
	document.getElementById("characters").innerHTML = "";
	document.getElementById("colissue").innerHTML = "";
	document.getElementById("col").innerHTML = "";
	document.getElementById("Volumes").innerHTML = "";
	document.getElementById("Trending").innerHTML = "";
	document.getElementById("Staff").innerHTML = "";
	document.getElementById("SiteURL").innerHTML = "";
	document.getElementById("OtherTitles").innerHTML = "";
	document.getElementById("relations").innerHTML = "";
	document.getElementById("provider_text").innerHTML = "";
	document.getElementById("description").innerHTML = "";
	document.getElementById("ImgColCover").src = "null";
	document.getElementById("readstat").innerHTML = "";
	document.documentElement.style.setProperty('--background', defaultBG);
	for (let childrenKey in document.querySelector("#btnsActions").children) {
		document.querySelector("#btnsActions").children[childrenKey].outerHTML = document.querySelector("#btnsActions").children[childrenKey].outerHTML;
	}
	for (let i = 1; i <= 5; i++) {
		document.getElementById("rating-" + i).onclick = "";
		try {
			document.getElementById("rating-" + i).removeAttribute("checked");
		} catch (e) {
			console.log(e);
		}
	}
	document.getElementById("ContentView").innerHTML = "<h2>Volumes : </h2>";
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
	document.getElementById("sendlib").onclick = function () {
		return addLibrary({'form': [document.getElementById('namelocation'), document.getElementById('locationa'), document.getElementById('providerID')]});
	};
}

function refreshMetadata(elElement) {
	alert(elElement);
}

function refreshLibrary(elElement) {
	alert(elElement);
}

function addToBreadCrumb(title, ListenerF) {
	let breadCrumb = document.querySelector(".breadcrumb");
	let newElement = document.createElement("li");
	newElement.addEventListener('click', (e) => {
		let breadCrumb = document.querySelector(".breadcrumb");
		/* Delete all childs after this one */
		while (breadCrumb.lastChild != newElement) {
			breadCrumb.removeChild(breadCrumb.lastChild);
		}
		document.getElementById("ContainerExplorer").innerHTML = "";
		document.getElementById("overlay").style.display = "none";
		document.getElementById("overlay2").style.display = "none";
		document.getElementById("contentViewer").style.display = "none";
		resetOverlay();
		ListenerF();
	});
	newElement.innerHTML = title;
	newElement.setAttribute("class", "breadcrumb-item");
	newElement.setAttribute("aria-current", "page");
	breadCrumb.appendChild(newElement);
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
				let breadCrumb = document.querySelector(".breadcrumb");
				/* Delete all childs after this one */
				while (breadCrumb.lastChild != breadCrumb.childNodes[1]) {
					breadCrumb.removeChild(breadCrumb.lastChild);
				}
				document.querySelectorAll(".selectLib").forEach((el) => {
					el.classList.remove("selectLib");
				});
				btn.classList.add("selectLib");
				document.getElementById("ContainerExplorer").innerHTML = "";
				document.getElementById("overlay").style.display = "none";
				document.getElementById("overlay2").style.display = "none";
				document.getElementById("contentViewer").style.display = "none";
				addToBreadCrumb(el["NAME"], function () {return openFolder_logic(el["PATH"], el["API_ID"]);});
				openFolder_logic(el["PATH"], el["API_ID"]);
			});
			const marvelogo = document.createElement("img");
			if (el["API_ID"] === 1) {
				marvelogo.src = "./Images/marvel-logo-png-10.png";
			} else if (el["API_ID"] === 2) {
				marvelogo.src = "./Images/android-chrome-512x512.png";
			}
			marvelogo.style.width = "25px";
			marvelogo.style.float = "left";
			marvelogo.style.lineHeight = "1";
			btn.appendChild(marvelogo);
			let naming = document.createElement("span");
			naming.innerHTML = el["NAME"];
			btn.appendChild(naming);
			btn.className = "btn btns libbtn";
			div.style.display = "flex";
			btn.style.float = "left";
			const menu = document.createElement("button");
			menu.innerHTML = "<span class='material-icons'>more_vert</span>";
			menu.className = "btn libmenu";
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
	});
	const div = document.createElement("div");
	var btn = document.createElement("button");
	btn.id = "downloads";
	btn.addEventListener("click", function () {
		let breadCrumb = document.querySelector(".breadcrumb");
		/* Delete all childs after this one */
		while (breadCrumb.lastChild != breadCrumb.childNodes[1]) {
			breadCrumb.removeChild(breadCrumb.lastChild);
		}
		document.querySelectorAll(".selectLib").forEach((el) => {
			el.classList.remove("selectLib");
		});
		btn.classList.add("selectLib");
		document.getElementById("ContainerExplorer").innerHTML = "";
		document.getElementById("overlay").style.display = "none";
		document.getElementById("overlay2").style.display = "none";
		document.getElementById("contentViewer").style.display = "none";
		addToBreadCrumb("Downloads", () => {return openFolder_logic(CosmicComicsTemp + "/downloads", 2);});
		openFolder_logic(CosmicComicsTemp + "/downloads", 2);
	});
	const marvelogo = document.createElement("i");
	marvelogo.className = "material-icons";
	marvelogo.innerHTML = "download_file";
	marvelogo.style.color = "white";
	marvelogo.style.lineHeight = "1";
	marvelogo.style.float = "left";
	marvelogo.style.width = "25px";
	marvelogo.style.float = "left";
	marvelogo.style.lineHeight = "1";
	btn.appendChild(marvelogo);
	let naming = document.createElement("span");
	naming.innerHTML = "Downloads";
	btn.appendChild(naming);
	btn.className = "btn btns libbtn";
	div.style.display = "flex";
	btn.style.float = "left";
	div.appendChild(btn);
	document.getElementById("folderExplorer").appendChild(div);
}

discoverFolders();

function modifyConfigJson(json, tomod, mod) {
	//check si obj exist pour remplacer valeur
	fetch("http://" + domain + ":" + port + "/config/getConfig/" + connected).then(function (response) {
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
		fetch('/config/writeConfig/' + connected, option);
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

let sidebarMini = false;
let searchtoggle = true;

function toggleSideBar() {
	if (sidebarMini) {
		sidebarMini = false;
		document.querySelector(".librariesSideBar").style.width = "15vw";
		document.querySelector(".librariesSideBar").style.overflow = "auto";
		document.querySelector("#groupbtn").setAttribute("class", "btn-group");
		document.querySelectorAll(".libmenu").forEach((el) => {
			el.style.display = "block";
		});
		document.querySelectorAll(".libbtn").forEach((el) => {
			el.children[1].style.display = "block";
		});
		document.getElementById("home").style.marginLeft = "18vw";
		document.querySelector(".cards-list").style.marginLeft = "15vw";
		document.querySelector("#overlay").style.left = "16vw";
		document.querySelector("#ColCover > img").style.marginLeft = "20vw";
		let list = "#id, #averageProgress, #startDate, #description, #Trending, #genres, #chapters, #btnsActions, #price, #Volumes, #readstat".split(',');
		list.forEach((el) => {
			document.querySelector(el).style.marginLeft = "45vw";
		});
		let list2 = "#SiteURL, #Staff, #OtherTitles, #characters, #relations".split(',');
		list2.forEach((el) => {
			document.querySelector(el).style.marginLeft = "20vw";
		});
		document.querySelector("#ContentView").style.marginLeft = "20vw";
		document.querySelector("#ColTitle").style.marginLeft = "45vw";
		try {
			document.querySelector(".releasing").style.left = "45vw";
		} catch (e) {
			try {
				document.querySelector(".released").style.left = "45vw";
			} catch (e) {
				try {
					document.querySelector(".NotYet").style.left = "45vw";
				} catch (e) {
					console.log(e);
				}
			}
		}
	} else {
		sidebarMini = true;
		document.querySelector(".librariesSideBar").style.width = "50px";
		document.querySelector(".librariesSideBar").style.overflow = "hidden";
		document.querySelector("#groupbtn").setAttribute("class", "");
		document.querySelectorAll(".libmenu").forEach((el) => {
			el.style.display = "none";
		});
		document.querySelectorAll(".libbtn").forEach((el) => {
			el.children[1].style.display = "none";
		});
		document.getElementById("home").style.marginLeft = "100px";
		document.querySelector("#ColCover > img").style.marginLeft = "100px";
		let list = "#id, #averageProgress, #startDate, #description, #Trending, #genres, #chapters, #btnsActions, #price, #Volumes, #readstat".split(',');
		list.forEach((el) => {
			document.querySelector(el).style.marginLeft = "550px";
		});
		let list2 = "#SiteURL, #Staff, #OtherTitles, #characters, #relations".split(',');
		list2.forEach((el) => {
			document.querySelector(el).style.marginLeft = "150px";
		});
		document.querySelector(".cards-list").style.marginLeft = "100px";
		document.querySelector("#ContentView").style.marginLeft = "100px";
		document.querySelector("#ColTitle").style.marginLeft = "550px";
		document.querySelector("#overlay").style.left = "10%";
		try {
			document.querySelector(".releasing").style.left = "550px";
		} catch (e) {
			try {
				document.querySelector(".released").style.left = "550px";
			} catch (e) {
				try {
					document.querySelector(".NotYet").style.left = "550px";
				} catch (e) {
					console.log(e);
				}
			}
		}
	}
}

document.getElementById("searchField").style.display = "none";

function summonSearch() {
	if (searchtoggle) {
		searchtoggle = false;
		document.getElementById("searchField").style.display = "block";
	} else {
		searchtoggle = true;
		document.getElementById("searchField").style.display = "none";
	}
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
                var Info = Get_From_JSON(
                    CosmicComicsData + "/ListOfComics.json",
                );
                if (
                    Get_element_from_data("read", Info) === "undefined" ||
                    Get_element_from_data("read", Info) == null
                ) {
                    if (stat.isDirectory()) {
                        var obj = {
                            fullname: realname,
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
	console.log("folderRes : " + FolderRes);
	console.log("libraryPath : " + libraryPath);
	document.getElementById("overlay2").style.display = "none";
	/*FolderResults.forEach((file) => {
        var stat = fs.statSync(file);
        var name = patha.basename(file);
        var realname = name.split(".");
        realname = realname[0];
        var Info = Get_From_JSON(
            CosmicComicsData + "/ListOfComics.json",
        );
        if (
            Get_element_from_data("read", Info) === "undefined" ||
            Get_element_from_data("read", Info) == null
        ) {
            if (stat.isDirectory()) {
                var obj = {
                    fullname: realname,
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
	divlist.className = "cards-list2";
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
			let readBookNB = await getFromDB("Books", "COUNT(*) FROM Books WHERE READ = 1 AND PATH = '" + path + "'");
			console.log(JSON.parse(readBookNB));
			document.getElementById("readstat").innerHTML = JSON.parse(readBookNB)[0]["COUNT(*)"] + " / " + data.length + " volumes read";
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
								await InsertIntoDB("Books", "", `(?,'${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${cdata["thumbnail"].path + "/detail." + cdata["thumbnail"].extension}','${cdata["issueNumber"]}','${cdata["description"].replaceAll("'", "''")}','${cdata["format"]}',${cdata["pageCount"]},'${JSON.stringify(cdata["urls"])}','${JSON.stringify(cdata["series"])}','${JSON.stringify(cdata["creators"])}','${JSON.stringify(cdata["characters"])}','${JSON.stringify(cdata["prices"])}','${JSON.stringify(cdata["dates"])}','${JSON.stringify(cdata["collectedIssues"])}','${JSON.stringify(cdata["collections"])}','${JSON.stringify(cdata["variants"])}')`).then(() => {
									console.log("inserted");
									TheBook = {
										NOM: realname,
										note: null,
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
									};
								});
								await GETMARVELAPI_Creators(cdata["id"], "comics").then(async (ccdata) => {
									ccdata = ccdata["data"]["results"];
									for (let i = 0; i < ccdata.length; i++) {
										await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["fullName"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}',${null},'${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
											console.log("inserted");
										});
									}
								});
								await GETMARVELAPI_Characters(cdata["id"], "comics").then(async (ccdata) => {
									ccdata = ccdata["data"]["results"];
									for (let i = 0; i < ccdata.length; i++) {
										await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["name"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}','${ccdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
											console.log("inserted");
										});
									}
								});
							} else {
								await InsertIntoDB("Books", "", `(?,'${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}')`).then(() => {
									console.log("inserted");
									TheBook = {
										NOM: realname,
										read: 0,
										reading: 0,
										unread: 1,
										note: null,
										favorite: 0,
										last_page: 0,
										folder: 0,
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
									};
								});
							}
						});
					} else if (provider == 2) {
						await getFromDB("Series", "title FROM Series").then(async (data) => {
							let SerieName = "";
							data = JSON.parse(data);
							console.log(data);
							for (let i = 0; i < data.length; i++) {
								let el = JSON.parse(data[i].title);
								console.log(el);
								path.split("/").forEach((ele) => {
									console.log(ele);
									if (ele == el.english || ele == el.romaji || ele == el.native) {
										if (el.english != null) {
											SerieName = el.english;
										} else if (el.romaji != null) {
											SerieName = el.romaji;
										} else if (el.native != null) {
											SerieName = el.native;
										} else {
											SerieName = el.english;
										}
									}
								});
								if (SerieName != "") {
									break;
								}
							}
							console.log(SerieName);
							await InsertIntoDB("Books", "", `(?,'${realname}',${null},${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${"Anilist_" + realname.replaceAll(" ", "$") + "_" + SerieName.replaceAll(" ", "$")}','${null}','${null}','${null}','${null}','${null}','${null}','${null}')`).then(() => {
								console.log("inserted");
								TheBook = {
									NOM: realname,
									read: 0,
									reading: 0,
									unread: 1,
									note: null,
									favorite: 0,
									last_page: 0,
									folder: 0,
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
								};
							});
						});
					}
				}
				/*        var Info = Get_From_JSON(
CosmicComicsData + "/ListOfComics.json",
);*/
				/*        var readed = Get_element_from_data("read", Info);
                        var reading = Get_element_from_data("reading", Info);
                        var favorite_v = Get_element_from_data("favorite", Info);*/
				/*if (
                ) {
                    var node = document.createTextNode(realname);
                    var FIOA = fs.readdirSync(
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
                            if (fs.existsSync(path_without_file + "/folder.cosmic")) {
                                imagelink = path_without_file + "/folder.cosmic";
                                console.log(imagelink);
                            } else {*/
				imagelink = TheBook["URLCover"];
				var node = document.createTextNode(TheBook["NOM"]);
				/*}
            } else {
            }
            }
            }

        else
            {
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
				// TODO faire plus simple / séparer / template
				if (cardMode === true) {
					const rib = document.createElement("div");
					if (TheBook["unread"] == 1) {
						rib.className = "pointR";
					}
					if (TheBook["reading"] == 1) {
						rib.className = "pointY";
					}
					if (TheBook["favorite"] == 1) {
						rib.innerHTML = "<i class='material-icons' style='font-size: 16px;position: relative;left: -17px;'>favorite</i>";
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

                                        );
                                        ModifyJSONFile(
                                            CosmicComicsData + "/ListOfComics.json",
                                            "unread",
                                            false,
                                        );
                                        Modify_JSON_For_Config(
                                            CosmicComicsData + "/config.json",
                                            "last_opened",
                                            path
                                        );*/
							alert("ici4");
							let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"));
							window.location.href = "viewer.html?" + encoded;
						});
						carddiv.addEventListener("click", async function () {
							await createDetails(TheBook, provider);
						});
					}
					n++;
					const element = document.getElementById("ContentView");
					carddiv.appendChild(rib);
					divlist.appendChild(carddiv);
					element.appendChild(divlist);
					/* if (stat.isDirectory()) {
                         const imgNode = document.createElement("img");
                         imgNode.src = "";
                         imgNode.style = "padding-top: 330px";
                         carddiv.appendChild(imgNode);
                     } else if (readed) {
                         //readed
                     } else if (reading) {
                         //reazading
                     } else {
                         //rien
                     }

                     if (favorite_v) {

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
					var manualDirOverride = false;
					if (playbtn.addEventListener) {
						if (manualDirOverride) {
							alist.addEventListener("dblclick", function () {
								launchDetect(path, root);
							});
							playbtn.addEventListener("click", function () {
								Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);
								alert("ici5");
								window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
							});
						} else {
							playbtn.addEventListener("click", function () {
								window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
							});
						}
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
                } else if (reading) {
                    //reazading
                } else {
                    //rien
                }

                if (favorite_v) {

                    //favorite
                } else {
                    //pas fav
                }*/
			});
		}
		if (cardMode === true) {
		} else {
			if (n === 0) {
				Toastifycation(language["empty_notSupported"], "#ff0000");
				document.getElementById("home").innerHTML = language["empty_notSupported2"] + ValidatedExtension + language["empty_notSupported3"];
				document.getElementById("home").style.display = "block";
				document.getElementById("home").style.fontSize = "24px";
			} else {
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
	});
}

function convertDate(inputFormat) {
	function pad(s) {
		return (s < 10) ? '0' + s : s;
	}

	let d = new Date(inputFormat);
	return [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()].join('/');
}

async function GETMARVELAPI_variants(id) {
	var url = "https://gateway.marvel.com:443/v1/public/series/" + id + "/comics?noVariants=false&orderBy=issueNumber&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";
	var response = await fetch(url);
	var data = await response.json();
	console.log(data);
	return data;
}

async function GETMARVELAPI_relations(id) {
	var url = "https://gateway.marvel.com:443/v1/public/series/" + id + "/comics?noVariants=true&orderBy=issueNumber&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";
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
		var url = "https://gateway.marvel.com:443/v1/public/comics?titleStartsWith=" + encodeURIComponent(name) + "&startYear=" + seriesStartDate + "&issueNumber=" + issueNumber + "&noVariants=true&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";
	} else {
		var url = "https://gateway.marvel.com:443/v1/public/comics?titleStartsWith=" + encodeURIComponent(name) + "&noVariants=true&apikey=1ad92a16245cfdb9fecffa6745b3bfdc";
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
		);
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
		);
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
	});
}

//Loading the content
async function loadContent(provider, FolderRes, libraryPath) {
	var n = 0;
	listOfImages = [];
	document.getElementById("overlay2").style.display = "block";
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
					console.log(el);
					save = el;
					el = el.toLowerCase().replaceAll(":", "").replaceAll("'", "")
						.replaceAll('"', "")
						.replaceAll("romaji", "").replaceAll("native", "")
						.replaceAll("english", "").replaceAll("{", "")
						.replaceAll("}", "");
					elar = el.split(",");
					elar.forEach((el2) => {
						if (name.toLowerCase() === (el2.toLowerCase())) {
							console.log(el2);
							found = true;
							foundTitle = save;
						}
					});
				});
				if (found == false) {
					if (provider == 2) {
						console.log("provider 2");
						await getAPIANILIST(name).then(async (data) => {
								let randID = Math.floor(Math.random() * 1000000);
								if (data == null) {
									await InsertIntoDB("Series", "(ID_Series,title,note,statut,start_date,end_date,description,Score,genres,cover,BG,CHARACTERS,TRENDING,STAFF,SOURCE,volumes,chapters,favorite,PATH)",
										"('" + randID + "U_2" + "','" + JSON.stringify(name.replaceAll("'", "''")) + "',null,null,null,null,null,'0',null,null,null,null,null,null,null,null,null,0,'" + path + "')");
								} else {
									await InsertIntoDB("Series", "(ID_Series,title,note,statut,start_date,end_date,description,Score,genres,cover,BG,CHARACTERS,TRENDING,STAFF,SOURCE,volumes,chapters,favorite,PATH)", "('" + data["id"] + "_2" + "','" + JSON.stringify(data["title"]).replaceAll("'", "''") + "',null,'" + data["status"].replaceAll("'", "''") + "','" + JSON.stringify(data["startDate"]).replaceAll("'", "''") + "','" + JSON.stringify(data["endDate"]).replaceAll("'", "''") + "','" + data["description"].replaceAll("'", "''") + "','" + data["meanScore"] + "','" + JSON.stringify(data["genres"]).replaceAll("'", "''") + "','" + data["coverImage"]["large"] + "','" + data["bannerImage"] + "','" + JSON.stringify(data["characters"]).replaceAll("'", "''") + "','" + data["trending"] + "','" + JSON.stringify(data["staff"]).replaceAll("'", "''") + "','" + data["siteUrl"].replaceAll("'", "''") + "','" + data["volumes"] + "','" + data["chapters"] + "',0,'" + path + "')");
									await GETANILISTAPI_CREATOR(data["staff"]).then(async (ccdata) => {
										for (let i = 0; i < ccdata.length; i++) {
											try {
												if (ccdata[i]["description"] == null) {
													await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
														console.log("inserted");
													});
												} else {
													await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
														console.log("inserted");
													});
												}
											} catch (e) {
												try {
													if (ccdata[i]["description"] == null) {
														await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["romaji"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
															console.log("inserted");
														});
													} else {
														await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["romaji"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
															console.log("inserted");
														});
													}
												} catch (e) {
													try {
														if (ccdata[i]["description"] == null) {
															await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["native"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
																console.log("inserted");
															});
														} else {
															await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["native"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
																console.log("inserted");
															});
														}
													} catch (e) {
														try {
															if (ccdata[i]["description"] == null) {
																await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','Unknown','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
																	console.log("inserted");
																});
															} else {
																await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_2"}','Unknown','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
																	console.log("inserted");
																});
															}
														} catch (e) {
															console.log(e);
														}
													}
												}
											}
										}
									});
									await GETANILISTAPI_CHARACTER(data["characters"]).then(async (ccdata) => {
										for (let i = 0; i < ccdata.length; i++) {
											try {
												if (ccdata[i]["description"] == null) {
													await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
														console.log("inserted");
													});
												} else {
													await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["english"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
														console.log("inserted");
													});
												}
											} catch (e) {
												try {
													if (ccdata[i]["description"] == null) {
														await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["romaji"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
															console.log("inserted");
														});
													} else {
														await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["romaji"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
															console.log("inserted");
														});
													}
												} catch (e) {
													try {
														if (ccdata[i]["description"] == null) {
															await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["native"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${null}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
																console.log("inserted");
															});
														} else {
															await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_2"}','${ccdata[i]["name"]["native"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["image"]["medium"])}','${JSON.stringify(ccdata[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(ccdata[i]["siteUrl"])}')`).then(() => {
																console.log("inserted");
															});
														}
													} catch (e) {
														console.log(e);
													}
												}
											}
										}
									});
									await GETANILISTAPI_RELATION(data["title"]["english"]).then(async (ccdata) => {
										for (let i = 0; i < ccdata.length; i++) {
											var dataR = ccdata[i]["node"];
											if (dataR.title.english == null) {
												await InsertIntoDB("relations", "", `('${dataR["id"] + "_2"}','${dataR["title"]["romaji"].replaceAll("'", "''")}','${dataR["coverImage"]["large"]}','${dataR["type"] + " / " + dataR["relationType"] + " / " + dataR["format"]}',${null},'${data["id"] + "_2"}')`);
												console.log("inserted");
											} else {
												await InsertIntoDB("relations", "", `('${dataR["id"] + "_2"}','${dataR["title"]["english"].replaceAll("'", "''")}','${dataR["coverImage"]["large"]}','${dataR["type"] + " / " + dataR["relationType"] + " / " + dataR["format"]}',${null},'${data["id"] + "_2"}')`);
												console.log("inserted");
											}
										}
									});
								}
							}
						);
					} else if (provider == 1) {
						console.log("Provider: Marvel Comics");
						await GETMARVELAPI(name).then(async (data) => {
							console.log(data);
							let randID = Math.floor(Math.random() * 1000000);
							if (data["data"]["total"] == 0) {
								await InsertIntoDB("Series", "(ID_Series,title,note,start_date,end_date,description,Score,cover,BG,CHARACTERS,STAFF,SOURCE,volumes,chapters,favorite,PATH)",
									"('" + randID + "U_1" + "','" + JSON.stringify(name.replaceAll("'", "''")) + "',null,null,null,null,'0',null,null,null,null,null,null,null,0,'" + path + "')");
							} else {
								await InsertIntoDB("Series", "(ID_Series,title,note,start_date,end_date,description,Score,cover,BG,CHARACTERS,STAFF,SOURCE,volumes,chapters,favorite,PATH)", "('" + data["data"]["results"][0]["id"] + "_1" + "','" + JSON.stringify(data["data"]["results"][0]["title"]).replaceAll("'", "''") + "',null,'" + JSON.stringify(data["data"]["results"][0]["startYear"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["endYear"]).replaceAll("'", "''") + "','" + data["data"]["results"][0]["description"] + "','" + data["data"]["results"][0]["rating"] + "','" + JSON.stringify(data["data"]["results"][0]["thumbnail"]) + "','" + JSON.stringify(data["data"]["results"][0]["thumbnail"]) + "','" + JSON.stringify(data["data"]["results"][0]["characters"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["creators"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["urls"][0]) + "','" + JSON.stringify(data["data"]["results"][0]["comics"]["items"]) + "','" + data["data"]["results"][0]["comics"]["available"] + "',0,'" + path + "')");
								await GETMARVELAPI_Creators(data["data"]["results"][0]["id"], "series").then(async (ccdata) => {
									ccdata = ccdata["data"]["results"];
									for (let i = 0; i < ccdata.length; i++) {
										await InsertIntoDB("Creators", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["fullName"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}',${null},'${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
											console.log("inserted");
										});
									}
								});
								await GETMARVELAPI_Characters(data["data"]["results"][0]["id"], "series").then(async (ccdata) => {
									ccdata = ccdata["data"]["results"];
									for (let i = 0; i < ccdata.length; i++) {
										await InsertIntoDB("Characters", "", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["name"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}','${ccdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["urls"])}')`).then(() => {
											console.log("inserted");
										});
									}
								});
								/*  await GETMARVELAPI_variants(data["data"]["results"][0]["id"]).then(async (cvdata) => {
									  cvdata = cvdata["data"]["results"];
									  for (let i = 0; i < cvdata.length; i++) {
											  await InsertIntoDB("variants", "", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${null}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`).then(() => {
												  console.log("inserted");
											  });
									  }
								  })*/
								await GETMARVELAPI_relations(data["data"]["results"][0]["id"]).then(async (cvdata) => {
									cvdata = cvdata["data"]["results"];
									for (let i = 0; i < cvdata.length; i++) {
										if (cvdata[i]["description"] == null) {
											await InsertIntoDB("relations", "", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${null}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`).then(() => {
												console.log("inserted");
											});
										} else {
											await InsertIntoDB("relations", "", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${cvdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`).then(() => {
												console.log("inserted");
											});
										}
									}
								});
							}
						});
					} else {
					}
				} else {
					await getFromDB("Series", "* FROM Series where title = '" + foundTitle + "'").then((res) => {
						console.log(foundTitle);
						res = JSON.parse(res);
						console.log(res);
						let node;
						if (cardMode === true) {
							if (provider == 1) {
								node = document.createTextNode(JSON.parse(res[0].title));
							} else {
								if (JSON.parse(res[0].title)["english"] !== undefined) {
									node = document.createTextNode(JSON.parse(res[0].title)["english"]);
								} else {
									node = document.createTextNode(JSON.parse(res[0].title));
								}
							}
						} else {
							node = document.createTextNode(JSON.parse(res[0].title)["english"]);
						}
						var invertedPath = path.replaceAll("\\", "/");
						if (provider == 1) {
							try {
								imagelink = JSON.parse(res[0].cover).path + "/detail." + JSON.parse(res[0].cover).extension;
							} catch (e) {
								imagelink = "null";
							}
						} else {
							imagelink = res[0].cover;
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
									await createSeries(provider, path, libraryPath, res);
								});
								playbtn.addEventListener("click", function () {
									Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);
									alert("ici2");
									window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
								});
								/* } else {
                                     playbtn.addEventListener("click", function () {
                                         ModifyJSONFile(
                                             CosmicComicsData + "/ListOfComics.json",
                                             "reading",
                                             true,
                                         );
                                         ModifyJSONFile(
                                             CosmicComicsData + "/ListOfComics.json",
                                             "unread",
                                             false,
                                         );
                                         Modify_JSON_For_Config(
                                             CosmicComicsData + "/config.json",
                                             "last_opened",
                                             path
                                         );
                                         window.location.href = "viewer.html?" + path;
                                     });
                                 }*/
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
                                 } else if (reading) {
                                     //reazading
                                 } else {
                                     //rien
                                 }

                                 if (favorite_v) {

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
							buttonfav.id = "btn_id_fav_" + Math.random() * 10000;
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
							button_unread.id = "btn_id_unread_" + Math.random() * 10000;
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
							button_reading.id = "btn_id_reading_" + Math.random() * 10000;
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
							button_read.id = "btn_id_read_" + Math.random() * 10000;
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
									Modify_JSON_For_Config(CosmicComicsData + "/config.json", "last_opened", path);
									alert("ici3");
									window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
								});
								/*} else {
                                    playbtn.addEventListener("click", function () {
                                        ModifyJSONFile(
                                            CosmicComicsData + "/ListOfComics.json",
                                            "reading",
                                            true,
                                        );
                                        ModifyJSONFile(
                                            CosmicComicsData + "/ListOfComics.json",
                                            "unread",
                                            false,
                                        );
                                        Modify_JSON_For_Config(
                                            CosmicComicsData + "/config.json",
                                            "last_opened",
                                            path
                                        );
                                        window.location.href = "viewer.html?" + path;
                                    });
                                }*/
							}
							n++;
							const element = document.getElementById("ContainerExplorer");
							const divrating = document.createElement("div");
							divrating.appendChild(alist);
							divlist.appendChild(divrating);
							element.appendChild(divlist);
						}
					});
				}
			}
			/*        var Info = Get_From_JSON(
                   CosmicComicsData + "/ListOfComics.json",
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
            ) {
                var node = document.createTextNode(realname);
                var FIOA = fs.readdirSync(
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
                        if (fs.existsSync(path_without_file + "/folder.cosmic")) {
                            imagelink = path_without_file + "/folder.cosmic";
                            console.log(imagelink);
                        } else {
                            imagelink = "Images/fileDefault.png";
                        }
                    } else {
                    }
                }
            } else {
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
                    } else if (reading) {
                        //reazading
                    } else {
                        //rien
                    }*/
			/*if (favorite_v) {

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
	var random = coolanimations[Math.floor(Math.random() * coolanimations.length)];
	if (numberOf === 0) {
		Toastifycation(language["empty_notSupported"], "#ff0000");
		animateCSS(document.getElementById("overlay"), "fadeOut").then((message) => {
			document.getElementById("overlay2").style.display = "none";
			document.getElementById("overlay").style.display = "none";
			document.getElementById("ContainerExplorer").style.display = "flex";
			document.getElementById("home").innerHTML = "This library is empty. If you think this is an error, please refresh the page and try again.";
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
}

//Check if the passed element contains numbers
function hasNumbers(t) {
	var regex = /\d/g;
	return regex.test(t);
}

//get the ID of the book by name
function get_the_ID_by_name(the_name = "") {
	return finalName;
}

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
	// TODO favorite
}

//Open a single file
function OpenFileOnce() {
	// TODO Open file from the file explorer
}

//Open a book in the bookmarks
function openBOOKM(path) {
	window.location.href = "viewer.html?" + path;
}

//List of Bookmarked folder
function listBM() {
	return; // TODO bookmark
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

//Send Notification
function Toastifycation(message, BGColor = "#333", FrontColor = "#ffffff") {
	var x = document.querySelector("#snack_msg");
	x.style.paddingLeft = "10px";
	document.querySelector(".snack_container").style.display = "flex";
	document.querySelector(".snack_container").style.position = "fixed";
	document.querySelector(".snack_rectangle").style.position = "absolute";
	document.querySelector(".snack_rectangle").style.bottom = "15vh";
	document.querySelector(".snack_rectangle").style.right = "-99vw";
	document.querySelector(".snack_container").style.zIndex = "10";
	x.innerHTML = message;
	document.querySelector(".snack_rectangle").style.backgroundColor = BGColor;
	x.style.color = FrontColor;
	setTimeout(function () {
		document.querySelector(".snack_container").style.display = "none";
		/*x.className = x.className.replace("show", "");*/
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

// Toggle "active" class
function toggleActive(object) {
	object.classList.toggle("active");
}

function clearTN() {
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
});

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
	let name = document.getElementById("id_NAME_DL").value;
	let vol = document.getElementById("id_VOL_DL").value;
	console.log(url);
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"url": url,
			"name": name,
			"vol": vol
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

async function modifyAccount(forma) {
	var form = forma.form;
	var nuser = form[0];
	var npass = form[1];
	var npp = form[2];
	let nppPath;
	if (forma.form[0] == "") {
		nuser = null;
	}
	if (forma.form[1] == "") {
		npass = null;
	}
	if (forma.form[2].length == 0 && forma.form[3] == null) {
		npp = null;
	} else {
		npp = form[2];
	}
	console.log(npp);
	const options = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"nuser": nuser, "npass": npass, "npp": npp.src, "token": connected
		}, null, 2)
	};
	await fetch("/profile/modification", options);
	console.log(forma.form);
}

async function updateLibrary(forma, id) {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"name": forma.form[0].value, "path": forma.form[1].value, "api_id": forma.form[2].value
		}, null, 2)
	};
	await fetch('http://' + domain + ":" + port + '/DB/lib/update/' + connected + "/" + id, option).then(() => {
		window.location.href = window.location.href.split("?")[0];
	});
}

function HomeRoutine() {
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

									);
									ModifyJSONFile(
										CosmicComicsData + "/ListOfComics.json",
										"unread",
										false,
									);
									Modify_JSON_For_Config(
										CosmicComicsData + "/config.json",
										"last_opened",
										path
									);*/
						alert("ici4");
						let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"));
						window.location.href = "viewer.html?" + encoded;
					});
					let brook = TheBook;
					carddiv.addEventListener("click", function () {
						let provider = ((brook.series.includes("marvel")) ? (1) : ((brook.series.includes("Anilist")) ? (2) : (0)));
						createDetails(brook, provider);
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
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !<br/>Open a new book or try one of those below.";
			element.appendChild(node);
		}
	});
	getFromDB("Books", "* FROM Books ORDER BY ID_book DESC LIMIT 10").then((resa) => {
		var TheBookun = JSON.parse(resa);
		console.log(TheBookun);
		const element = document.getElementById("recentlyAdded");
		for (let i = 0; i < TheBookun.length; i++) {
			var TheBook = TheBookun[i];
			var imagelink = TheBook["URLCover"];
			var node = document.createTextNode(TheBook["NOM"]);
			let carddiv = document.createElement("div");
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
				buttonfav.id = "btn_id_fav_" + Math.random() * 100000;
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
				button_unread.id = "btn_id_unread_" + Math.random() * 100000;
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
				button_reading.id = "btn_id_reading_" + Math.random() * 100000;
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
				button_read.id = "btn_id_read_" + Math.random() * 100000;
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
				imgcard.id = "card_img_id_" + Math.random() * 100000;
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
				carddiv.id = "id_vol" + Math.random() * 100000;
				playbtn.addEventListener("click", function () {
					/*            ModifyJSONFile(
									CosmicComicsData + "/ListOfComics.json",
									"reading",
									true,
								);
								ModifyJSONFile(
									CosmicComicsData + "/ListOfComics.json",
									"unread",
									false,
								);
								Modify_JSON_For_Config(
									CosmicComicsData + "/config.json",
									"last_opened",
									path
								);*/
					alert("ici4");
					let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"));
					window.location.href = "viewer.html?" + encoded;
				});
				let brook = TheBook;
				carddiv.addEventListener("click", function () {
					let provider = ((brook.series.includes("marvel")) ? (1) : ((brook.series.includes("Anilist")) ? (2) : (0)));
					createDetails(brook, provider);
				});
				element.appendChild(carddiv);
			}
		}
		if (TheBookun.length == 0) {
			const element = document.getElementById("recentlyAdded");
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !";
			element.appendChild(node);
		}
	});
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
				buttonfav.id = "btn_id_fav_" + Math.random() * 100000;
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
				button_unread.id = "btn_id_unread_" + Math.random() * 100000;
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
				button_reading.id = "btn_id_reading_" + Math.random() * 100000;
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
				button_read.id = "btn_id_read_" + Math.random() * 100000;
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
				imgcard.id = "card_img_id_" + Math.random() * 100000;
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
				carddiv.id = "id_vol" + Math.random() * 100000;
				if (playbtn.addEventListener) {
					playbtn.addEventListener("click", function () {
						/*            ModifyJSONFile(
										CosmicComicsData + "/ListOfComics.json",
										"reading",
										true,
									);
									ModifyJSONFile(
										CosmicComicsData + "/ListOfComics.json",
										"unread",
										false,
									);
									Modify_JSON_For_Config(
										CosmicComicsData + "/config.json",
										"last_opened",
										path
									);*/
						alert("ici4");
						let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"));
						window.location.href = "viewer.html?" + encoded;
					});
					let brook = TheBook;
					carddiv.addEventListener("click", function () {
						let provider = ((brook.series.includes("marvel")) ? (1) : ((brook.series.includes("Anilist")) ? (2) : (0)));
						createDetails(brook, provider);
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
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !<br/>Look's like you read all your books. Consider to import new ones!";
			element.appendChild(node);
		}
	});
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
				buttonfav.id = "btn_id_fav_" + Math.random() * 10000;
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
				button_unread.id = "btn_id_unread_" + Math.random() * 10000;
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
				button_reading.id = "btn_id_reading_" + Math.random() * 10000;
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
				button_read.id = "btn_id_read_" + Math.random() * 10000;
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
				imgcard.id = "card_img_id_" + Math.random() * 10000;
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
				carddiv.id = "id_vol" + Math.random() * 10000;
				if (playbtn.addEventListener) {
					playbtn.addEventListener("click", function () {
						/*            ModifyJSONFile(
										CosmicComicsData + "/ListOfComics.json",
										"reading",
										true,
									);
									ModifyJSONFile(
										CosmicComicsData + "/ListOfComics.json",
										"unread",
										false,
									);
									Modify_JSON_For_Config(
										CosmicComicsData + "/config.json",
										"last_opened",
										path
									);*/
						alert("ici4");
						let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"));
						window.location.href = "viewer.html?" + encoded;
					});
					let brook = TheBook;
					carddiv.addEventListener("click", function () {
						let provider = ((brook.series.includes("marvel")) ? (1) : ((brook.series.includes("Anilist")) ? (2) : (0)));
						createDetails(brook, provider);
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
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !<br/>Look's like you don't love any comic book yet !";
			element.appendChild(node);
		}
	});
}

HomeRoutine();

function returnToHome() {
	let e = document.getElementById("libHome");
	document.querySelectorAll(".selectLib").forEach((el) => {
		el.classList.remove("selectLib");
	});
	e.classList.add("selectLib");
	document.getElementById("ContainerExplorer").innerHTML = "";
	document.getElementById("overlay").style.display = "none";
	document.getElementById("overlay2").style.display = "none";
	document.getElementById("contentViewer").style.display = "none";
	document.getElementById('home').innerHTML =
		"    <p>Continue reading : </p>\n" +
		"    <div id=\"continueReadingHome\"></div>\n" +
		"    <p>My favorites : </p>\n" +
		"    <div id=\"myfavoriteHome\"></div>\n" +
		"    <p>Recently added : </p>\n" +
		"    <div id=\"recentlyAdded\"></div>\n" +
		"    <p>To read : </p>\n" +
		"    <div id=\"toRead\"></div>\n";
	HomeRoutine();
	document.getElementById('home').style.display = 'block';
	document.getElementById('home').style.fontSize = '16px';
	resetOverlay();
	let breadCrumb = document.querySelector(".breadcrumb");
	/* Delete all childs after this one */
	while (breadCrumb.lastChild != breadCrumb.childNodes[1]) {
		breadCrumb.removeChild(breadCrumb.lastChild);
	}
}

theSearchList = [];
getFromDB("Books", "NOM,PATH,URLCover,Series FROM Books").then(async (resa) => {
	resa = JSON.parse(resa);
	for (var i = 0; i < resa.length; i++) {
		theSearchList.push(resa[i]);
	}
});
getFromDB("Series", "title,cover,PATH FROM Series").then(async (resa) => {
	resa = JSON.parse(resa);
	for (var i = 0; i < resa.length; i++) {
		theSearchList.push(resa[i]);
	}
});

async function setSearch(res) {
	for (const key in res) {
		const resItem = document.createElement("li");
		resItem.classList.add("resItem");
		let text=document.createElement("span");
		let img = document.createElement("img");
			let series = document.createElement("span");
		let isBook = res[key].NOM !== undefined;
		if (isBook) {
			text.innerHTML = res[key].NOM;
			try {
				series.innerHTML = JSON.parse(res[key].series).name;
			} catch (e) {
				try {
					series.innerHTML = res[key].series.split("_")[2].replaceAll("$", " ");
				} catch (e) {
					if (res[key].series != null && res[key].series != "null") {
						series.innerHTML = res[key].series;
					} else {
						series.innerHTML = "No series linked";
					}
				}
			}
			img.src = res[key].URLCover;
		} else {
			text.innerHTML = JSON.parse(res[key].title);
			if (typeof JSON.parse(res[key].title) == "object") {
				try {
					text.innerHTML = JSON.parse(res[key].title).english;
				} catch (e) {
					try {
						text.innerHTML = JSON.parse(res[key].title).romaji;
					} catch (e) {
						text.innerHTML = JSON.parse(res[key].title).native;
					}
				}
			}
			try {
				if (typeof JSON.parse(res[key].cover) == "object") {
					img.src = JSON.parse(res[key].cover).path + "/detail." + JSON.parse(res[key].cover).extension;
				} else {
					img.src = res[key].cover;
				}
			} catch (e) {
				img.src = res[key].cover;
			}
		}
		img.style.width = "50px";
		resItem.appendChild(text);
		resItem.appendChild(img);
			resItem.appendChild(series);
		resItem.addEventListener("click", async (e) => {
			document.getElementById("searchResults").style.display = "none";
			document.getElementById("home").style.display = "none";
			if (isBook) {
				await getFromDB("Books", "* FROM Books WHERE PATH = '" + res[key].PATH + "'").then(async (resa) => {
					let bookList = JSON.parse(resa);
					let TheBook = bookList[0];
					let provider = ((TheBook.series.includes("marvel")) ? (1) : ((TheBook.series.includes("Anilist")) ? (2) : (0)));
					await createDetails(TheBook, provider);
				});
			} else {
				await getFromDB("Series", "* FROM Series WHERE title = '" + res[key].title + "'").then(async (resa) => {
					console.log("HERE");
					let bookList = JSON.parse(resa);
					let TheBook = bookList[0];
					let provider = ((TheBook.ID_Series.includes("_1")) ? (1) : ((TheBook.ID_Series.includes("_2")) ? (2) : (0)));
					let result = res[key].PATH;
					console.log(result);
					let libPath = result.replaceAll("\\", "/");
					libPath = libPath.replace(/\/[^\/]+$/, "");
					libPath = libPath.replaceAll("/", "\\");
					if (provider == 1) {
						await createSeries(provider, result, libPath, bookList);
					} else if (provider == 2) {
						try {
							await createSeries(provider, result, libPath, bookList);
						} catch (e) {
							try {
								await createSeries(provider, result, libPath, bookList);
							} catch (e) {
								await createSeries(provider, result, libPath, bookList);
							}
						}
					}
				});
			}
		});
		document.getElementById("searchResults").appendChild(resItem);
	}
	if (res.length == 0) {
		const resItem = document.createElement("li");
		resItem.classList.add("resItem");
		const text = document.createTextNode("No results found");
		resItem.appendChild(text);
		document.getElementById("searchResults").appendChild(resItem);
	}
}

function resolveTitle(title) {
	try {
		if (JSON.parse(title).english !== undefined) {
			return JSON.parse(title).english;
		} else if (JSON.parse(title).romaji !== undefined) {
			return JSON.parse(title).romaji;
		} else if (JSON.parse(title).native !== undefined) {
			return JSON.parse(title).native;
		} else if (typeof JSON.parse(title) !== 'object') {
			return JSON.parse(title);
		} else {
			return title;
		}
	} catch (e) {
		return title;
	}
}

async function createSeries(provider, path, libraryPath, res) {
	resetOverlay();
	console.log(provider);
	document.documentElement.style.overflow = "hidden";
	addToBreadCrumb(resolveTitle(res[0].title), () => { return createSeries(provider, path, libraryPath, res);});
	let APINOTFOUND = /[a-zA-Z]/g.test(res[0].ID_Series);
	if (!APINOTFOUND) {
		document.getElementById("provider_text").innerHTML = ((provider == 1) ? ("Data provided by Marvel. © 2014 Marvel") : ((provider == 2) ? ("Data provided by Anilist.") : ("The Data are not provided by an API.")));
	} else {
		document.getElementById("provider_text").innerHTML = "The data are not from the API";
	}
	for (let i = 1; i <= 5; i++) {
		document.getElementById("rating-" + i).onclick = function () {
			changeRating("Series", res[0].ID_Series, i);
		};
		try {
			document.getElementById("rating-" + i).removeAttribute("checked");
		} catch (e) {
			console.log(e);
		}
	}
	if (res[0].note != null) {
		document.getElementById("rating-" + res[0].note).setAttribute("checked", "true");
	}
	document.getElementById("DLBOOK").addEventListener("click", function (e) {
		downloadBook(path);
	});
	document.getElementById("readingbtndetails").style.display = "none";
	if (!APINOTFOUND) {
		if (res[0].BG != null && res[0].BG != "null" && res[0].BG != "") {
			const options = {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"img": ((provider == 1) ? (JSON.parse(res[0].BG).path + "/detail." + JSON.parse(res[0].BG).extension) : (res[0].BG))
				}
			};
			await fetch("http://" + domain + ":" + port + "/img/getPalette/" + connected, options).then(function (response) {
				return response.text();
			}).then(function (data) {
				let Blurcolors = data;
				console.log(Blurcolors);
				setTimeout(function () {
					document.documentElement.style.setProperty("--background", Blurcolors.toString());
				}, 500);
			});
		}
	} else {
		if (res[0].BG != null && res[0].BG != "null" && res[0].BG != "") {
			const options = {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"img": res[0].BG
				}
			};
			await fetch("http://" + domain + ":" + port + "/img/getPalette/" + connected, options).then(function (response) {
				return response.text();
			}).then(function (data) {
				let Blurcolors = data;
				console.log(Blurcolors);
				setTimeout(function () {
					document.documentElement.style.setProperty("--background", Blurcolors.toString());
				}, 500);
			});
		}
	}
	if (!APINOTFOUND) {
		document.getElementById("ColTitle").innerHTML = "<a target='_blank' href='" + ((provider == 1) ? (JSON.parse(res[0].SOURCE).url) : (res[0].SOURCE)) + "' style='color:white'>" + ((provider == 1) ? (JSON.parse(res[0].title)) : (JSON.parse(res[0].title).english + " / " + JSON.parse(res[0].title).romaji + " / " + JSON.parse(res[0].title).native)) + "<i style='font-size: 18px;top: -10px;position: relative' class='material-icons'>open_in_new</i></a>";
		document.getElementById("ImgColCover").src = ((provider == 1) ? (JSON.parse(res[0].cover).path + "/detail." + JSON.parse(res[0].cover).extension) : (res[0].cover));
		if (((provider == 1) ? (JSON.parse(res[0].start_date)) : (JSON.parse(res[0].start_date).year)) == null) {
			document.getElementById("startDate").innerHTML = "?";
		} else {
			document.getElementById("startDate").innerHTML = ((provider == 1) ? (JSON.parse(res[0].start_date)) : (JSON.parse(res[0].start_date).year));
		}
		if (((provider == 1) ? (JSON.parse(res[0].end_date)) : (JSON.parse(res[0].end_date).year)) == null || JSON.parse(res[0].end_date) > new Date().getFullYear()) {
			document.getElementById("startDate").innerHTML += " - ?";
		} else {
			document.getElementById("startDate").innerHTML += " - " + ((provider == 1) ? (JSON.parse(res[0].end_date)) : (JSON.parse(res[0].end_date).year));
		}
		var NameToFetchList = [];
		if (provider == 1) {
			JSON.parse(res[0].CHARACTERS)["items"].forEach((el) => {
				NameToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		} else if (provider == 2) {
			JSON.parse(res[0].CHARACTERS).forEach((el) => {
				NameToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		}
		var NameToFetch = NameToFetchList.join(",");
		var container = document.createElement("div");
		await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
			clres = JSON.parse(clres);
			console.log(clres);
			container.className = "item-list";
			clres.forEach((el) => {
				const divs = document.createElement("div");
				const divs2 = document.createElement("div");
				let desc = el.description;
				let image = el.image;
				let urlo = el.url;
				let name = el.name;
				divs2.setAttribute("data-bs-toggle", "modal");
				divs2.setAttribute("data-bs-target", "#moreinfo");
				divs2.addEventListener("click", function (e) {
					if (provider == 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider == 2) {
						document.getElementById("moreinfo_img").src = image.replaceAll('"', "");
						document.getElementById("moreinfo_btn").href = urlo;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							try {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + JSON.parse(desc);
							} catch (e) {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
							}
						}
					}
					document.getElementById("moreinfo_btn").target = "_blank";
					document.getElementById("moreinfo_btn").innerHTML = "See more";
				});
				if (provider == 1) {
					divs2.innerHTML += "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span>";
				} else if (provider == 2) {
					divs2.innerHTML += "<img src='" + el.image.replaceAll('"', '') + "' class='img-charac'/><br><span>" + el.name + "</span>";
				}
				divs.appendChild(divs2);
				divs2.style.marginTop = "10px";
				divs2.style.textAlign = "center";
				divs.style.marginLeft = "10px";
				container.appendChild(divs);
			});
		});
		document.getElementById("characters").innerHTML = "<h1>" + "Characters" + ":</h1> " + "Number of characters : " + ((provider == 1) ? (JSON.parse(res[0].CHARACTERS)["available"]) : (JSON.parse(res[0].CHARACTERS).length)) + "<br/>";
		let scrollCharactersAmount = 0;
		let moveRight = document.createElement("button");
		moveRight.className = "scrollBtnR";
		moveRight.onclick = function () {
			container.scrollTo({
				left: Math.max(scrollCharactersAmount += 140, container.clientWidth),
				behavior: "smooth"
			});
		};
		moveRight.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft = document.createElement("button");
		moveLeft.className = "scrollBtnL";
		moveLeft.onclick = function () {
			container.scrollTo({
				left: Math.min(scrollCharactersAmount -= 140, 0),
				behavior: "smooth"
			});
		};
		moveLeft.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("characters").appendChild(moveLeft);
		document.getElementById("characters").appendChild(moveRight);
		document.getElementById("characters").appendChild(container);
		document.getElementById("OtherTitles").innerHTML = ((provider == 1) ? ("A few comics in this series (for a complete view check the Marvel's website)") : ("Relations")) + " : ";
		await getFromDB("relations", "* FROM relations WHERE series = '" + res[0].ID_Series + "'").then((clres) => {
			clres = JSON.parse(clres);
			console.log(clres);
			const divlist = document.createElement("div");
			divlist.className = "cards-list2";
			/*Sort alphabetical and numeric*/
			clres.sort(function (a, b) {
				if (a.name < b.name) {
					return -1;
				}
				if (a.name > b.name) {
					return 1;
				}
				return 0;
			});
			clres.forEach((el) => {
				const reltxt = document.createElement("div");
				const relbody = document.createElement("div");
				const relbio = document.createElement("p");
				relbio.innerHTML = el.name;
				relbio.className = "card__bio";
				relbio.style.textAlign = "center";
				relbio.style.color = "white";
				relbody.appendChild(relbio);
				relbody.className = "card__body";
				let image = el.image;
				let urlo = el.url;
				let desc = el.description;
				let name = el.name;
				reltxt.onclick = function () {
					document.getElementById("moreinfo_img").className = "img-relation";
					if (provider == 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider == 2) {
						document.getElementById("moreinfo_img").src = image.replaceAll('"', "");
						document.getElementById("moreinfo_btn").href = urlo;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							try {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + JSON.parse(desc);
							} catch (e) {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
							}
						}
					}
					document.getElementById("moreinfo_btn").target = "_blank";
					document.getElementById("moreinfo_btn").innerHTML = "See more";
				};
				reltxt.className = "cardcusto";
				reltxt.style.cursor = "pointer";
				reltxt.setAttribute("data-bs-toggle", "modal");
				reltxt.setAttribute("data-bs-target", "#moreinfo");
				const relimg = document.createElement("div");
				const imgcard = document.createElement("img");
				imgcard.src = ((provider == 1) ? (JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension) : (el.image));
				imgcard.style.width = "100%";
				relimg.className = "card__image";
				relimg.style.backgroundColor = "rgba(0,0,0,0.753)";
				relimg.appendChild(imgcard);
				reltxt.appendChild(relimg);
				reltxt.appendChild(relbody);
				divlist.appendChild(reltxt);
			});
			document.getElementById("OtherTitles").appendChild(divlist);
		});
		var tmpstaff = "Number of people : " + ((provider == 1) ? (JSON.parse(res[0].STAFF)["available"]) : (JSON.parse(res[0].STAFF).length)) + "<br/>";
		var StaffToFetchList = [];
		if (provider == 1) {
			JSON.parse(res[0].STAFF)["items"].forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		} else if (provider == 2) {
			JSON.parse(res[0].STAFF).forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		}
		var StaffToFetch = StaffToFetchList.join(",");
		var container2 = document.createElement("div");
		await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
			clres = JSON.parse(clres);
			container2.className = "item-list";
			for (var i = 0; i < clres.length; i++) {
				var el = clres[i];
				const divs = document.createElement("div");
				const divs2 = document.createElement("div");
				divs2.className = "CCDIV";
				let desc = el.description;
				let image = el.image;
				let urlo = el.url;
				let name = el.name;
				divs2.setAttribute("data-bs-toggle", "modal");
				divs2.setAttribute("data-bs-target", "#moreinfo");
				divs2.addEventListener("click", function (e) {
					if (provider == 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider == 2) {
						document.getElementById("moreinfo_img").src = image.replaceAll('"', "");
						document.getElementById("moreinfo_btn").href = urlo;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							try {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + JSON.parse(desc);
							} catch (e) {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
							}
						}
					}
					document.getElementById("moreinfo_btn").target = "_blank";
					document.getElementById("moreinfo_btn").innerHTML = "See more";
				});
				for (var j = 0; j < clres.length; j++) {
					if (provider == 1) {
						if (el.name == JSON.parse(res[0]["STAFF"])["items"][j].name) {
							divs2.innerHTML += "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span><br/><span style='font-size: 14px;color: #a8a8a8a8'>" + JSON.parse(res[0]["STAFF"])["items"][j]["role"] + "</span>";
						}
					} else if (provider == 2) {
						if (el.name == JSON.parse(res[0]["STAFF"])[j].name) {
							divs2.innerHTML += "<img src='" + el.image.replaceAll('"', "") + "' class='img-charac'/><br><span>" + el.name + "</span>";
						}
					}
					divs.appendChild(divs2);
					divs2.style.marginTop = "10px";
					divs2.style.textAlign = "center";
					divs.style.marginLeft = "10px";
					container2.appendChild(divs);
				}
			}
		});
		document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
		let scrollStaffAmount = 0;
		let moveRight2 = document.createElement("button");
		moveRight2.className = "scrollBtnR";
		moveRight2.onclick = function () {
			container2.scrollTo({
				left: Math.max(scrollStaffAmount += 140, container2.clientWidth),
				behavior: "smooth"
			});
		};
		moveRight2.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft2 = document.createElement("button");
		moveLeft2.className = "scrollBtnL";
		moveLeft2.onclick = function () {
			container2.scrollTo({
				left: Math.min(scrollStaffAmount += 140, 0),
				behavior: "smooth"
			});
		};
		moveLeft2.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("Staff").appendChild(moveLeft2);
		document.getElementById("Staff").appendChild(moveRight2);
		document.getElementById("Staff").appendChild(container2);
	} else {
		document.getElementById("ColTitle").innerHTML = "<a target='_blank' href='" + res[0].SOURCE + "' style='color:white'>" + JSON.parse(res[0].title) + "<i style='font-size: 18px;top: -10px;position: relative' class='material-icons'>open_in_new</i></a>";
		document.getElementById("ImgColCover").src = res[0].cover;
		if (JSON.parse(res[0].start_date) == null) {
			document.getElementById("startDate").innerHTML = "?";
		} else {
			document.getElementById("startDate").innerHTML = (JSON.parse(res[0].start_date));
		}
		if (JSON.parse(res[0].end_date) == null || JSON.parse(res[0].end_date) > new Date().getFullYear()) {
			document.getElementById("startDate").innerHTML += " - ?";
		} else {
			document.getElementById("startDate").innerHTML += " - " + (JSON.parse(res[0].end_date));
		}
	}
	if (res[0]["chapters"] != null) {
		document.getElementById("chapters").innerHTML = ((provider == 1) ? ("Number of Comics in this series : ") : ("Number of chapter in this series : ")) + res[0]["chapters"];
	}
	document.getElementById("contentViewer").style.display = "block";
	animateCSS(document.getElementById("onContentViewer"), "fadeIn").then((message) => {
	});
	/*launchDetect(path, root);*/
	document.getElementById("detailSeparator").style.marginTop = "5vh";
	await getFromDB("Books", "PATH FROM Books WHERE unread=1 OR reading=1").then(async (resa) => {
		let continueSeriesReading;
		let bookList = JSON.parse(resa);
		console.log(bookList);
		for (var i = 0; i < bookList.length; i++) {
			if (bookList[i].PATH.toLowerCase().includes(res[0].title.toLowerCase().replaceAll('"', ''))) {
				continueSeriesReading = bookList[i].PATH;
				break;
			}
		}
		document.getElementById("playbutton").addEventListener("click", function (e) {
			let encoded = encodeURIComponent(continueSeriesReading.replaceAll("/", "%C3%B9"));
			window.location.href = "viewer.html?" + encoded;
		});
	});
	document.getElementById("checkbtn").addEventListener("click", function (e) {
		OneForAll("unread", "reading", "read", res[0].title);
		Toastifycation("Set all as Read", "#00C33C");
	});
	document.getElementById("readingbtndetails").addEventListener("click", function (e) {
		OneForAll("unread", "read", "reading", res[0].title);
		Toastifycation("Set all as Reading", "#00C33C");
	});
	document.getElementById("decheckbtn").addEventListener("click", function (e) {
		OneForAll("read", "reading", "unread", res[0].title);
		Toastifycation("Set all as Unread", "#00C33C");
	});
	let currentFav = res[0].favorite;
	document.getElementById("favoritebtn").addEventListener("click", async function (e) {
		if (currentFav == 1) {
			Toastifycation("Removed from favorite", "#00C33C");
			currentFav = 0;
			await getFromDB("Series", "* FROM Series WHERE favorite=1").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (var i = 0; i < bookList.length; i++) {
					if (res[0].title == bookList[i].title) {
						let options = {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								"token": connected,
								"table": "Series",
								"column": "favorite",
								"whereEl": bookList[i].ID_Series,
								"value": false,
								"where": "ID_Series"
							}, null, 2)
						};
						fetch("http://" + domain + ":" + port + "/DB/update", options);
					}
				}
			});
		} else {
			Toastifycation("Set as favorite", "#00C33C");
			currentFav = 1;
			await getFromDB("Series", "* FROM Series WHERE favorite=0").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (var i = 0; i < bookList.length; i++) {
					if (res[0].title == bookList[i].title) {
						let options = {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								"token": connected,
								"table": "Series",
								"column": "favorite",
								"whereEl": bookList[i].ID_Series,
								"value": true,
								"where": "ID_Series"
							}, null, 2)
						};
						fetch("http://" + domain + ":" + port + "/DB/update", options);
					}
				}
			});
		}
	});
	if (!APINOTFOUND) {
		if (provider == 1) {
			loadView(path, libraryPath, JSON.parse(res[0].start_date), provider);
			document.getElementById("id").innerText = "This series ID from Marvel : " + parseInt(res[0].ID_Series);
			if (res[0].description != null && res[0].description !== "null") {
				document.getElementById("description").innerHTML = res[0].description;
			} else {
				document.getElementById("description").innerHTML = "";
			}
			document.getElementById("averageProgress").style.display = "none";
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
		} else if (provider == 2) {
			loadView(path, libraryPath, "", provider);
			document.getElementById("description").innerHTML = res[0].description;
			document.getElementById("genres").innerHTML = "Genres " + ":";
			JSON.parse(res[0].genres).forEach((el, index) => {
				if (index != JSON.parse(res[0].genres).length - 1) {
					document.getElementById("genres").innerHTML += " " + el + ", ";
				} else {
					document.getElementById("genres").innerHTML += " " + el;
				}
			});
			document.getElementById("Trending").innerHTML = "Trending : " + res[0]["TRENDING"];
			document.getElementById("Volumes").innerHTML = "Number of Volumes : " + res[0]["volumes"];
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
		}
	} else {
		if (provider == 1) {
			loadView(path, libraryPath, JSON.parse(res[0].start_date), provider);
			if (res[0].description != null && res[0].description !== "null") {
				document.getElementById("description").innerHTML = res[0].description;
			} else {
				document.getElementById("description").innerHTML = "";
			}
			document.getElementById("averageProgress").style.display = "none";
			if (JSON.parse(res[0].end_date) == null && JSON.parse(res[0].start_date) == null) {
				document.getElementById("Status").innerHTML = "UNKNOWN";
				document.getElementById("Status").className = "NotYet";
			} else {
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
			}
		} else if (provider == 2) {
			loadView(path, libraryPath, "", provider);
			document.getElementById("description").innerHTML = res[0].description;
			if (res[0]["TRENDING"] != null && res[0]["TRENDING"] !== "null") {
				document.getElementById("Trending").innerHTML = "Trending : " + res[0]["TRENDING"];
			} else {
				document.getElementById("Trending").innerHTML = "";
			}
			if (res[0]["volumes"] != null && res[0]["volumes"] !== "null") {
				document.getElementById("Volumes").innerHTML = "Number of Volumes : " + res[0]["volumes"];
			} else {
				document.getElementById("Volumes").innerHTML = "";
			}
			if (res[0]["Score"] != null && res[0]["Score"] !== "null" && res[0]["Score"] !== 0) {
				document.getElementById("averageScore").innerHTML = res[0]["Score"];
				document.querySelectorAll(".circle-small .progress.one").forEach((el) => {
					el.style.strokeDashoffset = Math.abs(100 - res[0]["Score"]);
				});
				document.documentElement.style.setProperty('--averageScore', Math.abs(100 - res[0]["Score"]));
			} else {
				document.getElementById("averageScore").innerHTML = "";
				document.querySelectorAll(".circle-small .progress.one").forEach((el) => {
					el.style.strokeDashoffset = Math.abs(100 - 0);
				});
				document.documentElement.style.setProperty('--averageScore', Math.abs(100 - 0));
			}
			document.getElementById("Status").innerHTML = ((res[0]["statut"] == null) ? "UNKNOWN" : res[0]["statut"]);
			if (res[0]["statut"] == "RELEASING") {
				document.getElementById("Status").className = "releasing";
			} else if (res[0]["statut"] == "FINISHED") {
				document.getElementById("Status").className = "released";
			} else if (res[0]["statut"] == "Not_YET_RELEASED") {
				document.getElementById("Status").className = "NotYet";
			} else {
				document.getElementById("Status").className = "NotYet";
			}
		}
	}
	if (res[0].favorite == 1) {
		document.getElementById("Status").innerHTML += " (Favorite)";
		document.getElementById("Status").classList.add("favorite");
	}
}

async function OneForAll(W1, W2, A, title) {
	await getFromDB("Books", "* FROM Books WHERE " + W1 + "=1 OR " + W2 + "=1").then(async (resa) => {
		let bookList = JSON.parse(resa);
		console.log(bookList);
		for (var i = 0; i < bookList.length; i++) {
			if (bookList[i].PATH.toLowerCase().includes(title.toLowerCase().replaceAll('"', ''))) {
				let options = {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						"token": connected,
						"table": "Books",
						"column": A,
						"whereEl": bookList[i].PATH,
						"value": true,
						"where": "PATH"
					}, null, 2)
				};
				await fetch("http://" + domain + ":" + port + "/DB/update", options).then(async () => {
					options = {
						method: "POST",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify({
							"token": connected,
							"table": "Books",
							"column": W1,
							"whereEl": bookList[i].PATH,
							"value": false,
							"where": "PATH"
						}, null, 2)
					};
					await fetch("http://" + domain + ":" + port + "/DB/update", options).then(async () => {
						options = {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								"token": connected,
								"table": "Books",
								"column": W2,
								"whereEl": bookList[i].PATH,
								"value": false,
								"where": "PATH"
							}, null, 2)
						};
						await fetch("http://" + domain + ":" + port + "/DB/update", options);
					});
				});
			}
		}
	});
}

async function AllForOne(W1, W2, A, ID) {
	let options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"token": connected,
			"table": "Books",
			"column": A,
			"whereEl": ID,
			"value": true,
			"where": "ID_book"
		}, null, 2)
	};
	await fetch("http://" + domain + ":" + port + "/DB/update", options).then(async () => {
		options = {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"token": connected,
				"table": "Books",
				"column": W1,
				"whereEl": ID,
				"value": false,
				"where": "ID_book"
			}, null, 2)
		};
		await fetch("http://" + domain + ":" + port + "/DB/update", options).then(async () => {
			options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					"token": connected,
					"table": "Books",
					"column": W2,
					"whereEl": ID,
					"value": false,
					"where": "ID_book"
				}, null, 2)
			};
			await fetch("http://" + domain + ":" + port + "/DB/update", options);
		});
	});
}

addToBreadCrumb("Home", () => {
	returnToHome();
});

async function createDetails(TheBook, provider) {
	resetOverlay();
	document.documentElement.style.overflow = "hidden";
	console.log(provider);
	console.log(TheBook);
	addToBreadCrumb(TheBook.NOM, () => {return createDetails(TheBook, provider);});
	document.getElementById("provider_text").innerHTML = ((provider == 1) ? ("Data provided by Marvel. © 2014 Marvel") : ((provider == 2) ? ("Data provided by Anilist.") : ("The Data are not provided by an API.")));
	document.getElementById("contentViewer").style.display = "block";
	document.getElementById("DLBOOK").addEventListener("click", function (e) {
		let path = TheBook.PATH;
		console.log(path);
		downloadBook(path);
	});
	document.getElementById("playbutton").addEventListener("click", function (e) {
		let encoded = encodeURIComponent(TheBook.PATH.replaceAll("/", "%C3%B9"));
		window.location.href = "viewer.html?" + encoded;
	});
	for (let i = 1; i <= 5; i++) {
		document.getElementById("rating-" + i).onclick = function () {
			changeRating("Books", TheBook.ID_book, i);
		};
		try {
			document.getElementById("rating-" + i).removeAttribute("checked");
		} catch (e) {
			console.log(e);
		}
	}
	if (TheBook.note != null) {
		document.getElementById("rating-" + TheBook.note).setAttribute("checked", "true");
	}
	document.getElementById("readingbtndetails").style.display = "inline";
	document.getElementById("OtherTitles").innerHTML = "";
	document.getElementById("relations").innerHTML = "";
	if (TheBook.characters != "null") {
		document.getElementById("id").innerHTML = "This is a " + TheBook.format + " of " + TheBook.pageCount + " pages. <br/> This is part of the '" + JSON.parse(TheBook.series).name + "' series.";
	} else {
		if (provider == 2) {
			document.getElementById("id").innerHTML = "This is part of the '" + TheBook.series.split("_")[2].replaceAll("$", " ") + "' series.";
		} else if (provider == 1) {
			document.getElementById("id").innerHTML = "This is part of the '" + JSON.parse(TheBook.series).name + "' series.";
		}
	}
	document.getElementById("averageProgress").style.display = "none";
	document.getElementById("ContentView").innerHTML = "";
	try {
		if (provider == 1) {
			document.getElementById("ColTitle").innerHTML = "<a target='_blank' href='" + ((TheBook.URLs == null) ? ("#") : (JSON.parse(TheBook.URLs)[0].url)) + "' style='color:white'>" + TheBook.NOM + "<i style='font-size: 18px;top: -10px;position: relative' class='material-icons'>open_in_new</i></a>";
		} else if (provider == 2) {
			document.getElementById("ColTitle").innerHTML = "<a target='_blank' style='color:white'>" + TheBook.NOM + "</a>";
		} else {
			document.getElementById("ColTitle").innerHTML = "<a target='_blank' style='color:white'>" + TheBook.NOM + "</a>";
		}
	} catch (e) {
		document.getElementById("ColTitle").innerHTML = "<a target='_blank' style='color:white'>" + TheBook.NOM + "</a>";
	}
	document.getElementById("ImgColCover").src = TheBook.URLCover;
	document.getElementById("Status").innerHTML = "";
	if (TheBook.description != null && TheBook.description != "null") {
		document.getElementById("description").innerHTML = TheBook.description;
	} else {
		document.getElementById("description").innerHTML = "";
	}
	document.getElementById("checkbtn").addEventListener("click", function (e) {
		AllForOne("unread", "reading", "read", TheBook.ID_book);
		Toastifycation("Set as Read", "#00C33C");
	});
	document.getElementById("readingbtndetails").addEventListener("click", function (e) {
		AllForOne("unread", "read", "reading", TheBook.ID_book);
		Toastifycation("Set all as Reading", "#00C33C");
	});
	document.getElementById("decheckbtn").addEventListener("click", function (e) {
		AllForOne("read", "reading", "unread", TheBook.ID_book);
		Toastifycation("Set all as Unread", "#00C33C");
	});
	if (TheBook.URLCover != null && TheBook.URLCover != "null") {
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"img": TheBook.URLCover
			}
		};
		await fetch("http://" + domain + ":" + port + "/img/getPalette/" + connected, options).then(function (response) {
			return response.text();
		}).then(function (data) {
			let Blurcolors = data;
			setTimeout(function () {
				document.documentElement.style.setProperty("--background", Blurcolors.toString());
			}, 500);
		});
	}
	document.getElementById("favoritebtn").addEventListener("click", async function (e) {
		if (TheBook.favorite == 1) {
			TheBook.favorite = 0;
			Toastifycation("Removed from favorite", "#00C33C");
			await getFromDB("Books", "* FROM Books WHERE favorite=1").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (var i = 0; i < bookList.length; i++) {
					if (bookList[i].PATH.toLowerCase().includes(TheBook.NOM.toLowerCase().replaceAll('"', ''))) {
						let options = {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								"token": connected,
								"table": "Books",
								"column": "favorite",
								"whereEl": bookList[i].PATH,
								"value": false,
								"where": "PATH"
							}, null, 2)
						};
						fetch("http://" + domain + ":" + port + "/DB/update", options);
					}
				}
			});
		} else {
			TheBook.favorite = 1;
			Toastifycation("Set as favorite", "#00C33C");
			await getFromDB("Books", "* FROM Books WHERE favorite=0").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (var i = 0; i < bookList.length; i++) {
					if (bookList[i].PATH.toLowerCase().includes(TheBook.NOM.toLowerCase().replaceAll('"', ''))) {
						let options = {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								"token": connected,
								"table": "Books",
								"column": "favorite",
								"whereEl": bookList[i].PATH,
								"value": true,
								"where": "PATH"
							}, null, 2)
						};
						fetch("http://" + domain + ":" + port + "/DB/update", options);
					}
				}
			});
		}
	});
	if (TheBook.characters != "null") {
		var NameToFetchList = [];
		if (provider == 1) {
			JSON.parse(TheBook.characters)["items"].forEach((el) => {
				NameToFetchList.push("'" + el.name + "'");
			});
		} else if (provider == 2) {
			JSON.parse(TheBook.characters).forEach((el) => {
				NameToFetchList.push("'" + el.name + "'");
			});
		}
		var NameToFetch = NameToFetchList.join(",");
		var container = document.createElement("div");
		await getFromDB("Characters", "* FROM Characters WHERE name IN (" + NameToFetch + ")").then((clres) => {
			clres = JSON.parse(clres);
			console.log(clres);
			container.className = "item-list";
			clres.forEach((el) => {
				const divs = document.createElement("div");
				const divs2 = document.createElement("div");
				let desc = el.description;
				let image = el.image;
				let urlo = el.url;
				let name = el.name;
				divs2.setAttribute("data-bs-toggle", "modal");
				divs2.setAttribute("data-bs-target", "#moreinfo");
				divs2.addEventListener("click", function (e) {
					if (provider == 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider == 2) {
						document.getElementById("moreinfo_img").src = image.replaceAll('"', "");
						document.getElementById("moreinfo_btn").href = urlo;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							try {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + JSON.parse(desc);
							} catch (e) {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
							}
						}
					}
					document.getElementById("moreinfo_btn").target = "_blank";
					document.getElementById("moreinfo_btn").innerHTML = "See more";
				});
				if (provider == 1) {
					divs2.innerHTML = "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span>";
				} else if (provider == 2) {
					divs2.innerHTML = "<img src='" + el.image.replaceAll('"', '') + "' class='img-charac'/><br><span>" + el.name + "</span>";
				}
				divs.appendChild(divs2);
				divs2.style.marginTop = "10px";
				divs2.style.textAlign = "center";
				divs.style.marginLeft = "10px";
				container.appendChild(divs);
			});
		});
		if (TheBook.read == 1) {
			document.getElementById("Status").innerHTML = "READ";
			document.getElementById("Status").className = "released";
		} else if (TheBook.unread == 1) {
			document.getElementById("Status").innerHTML = "UNREAD";
			document.getElementById("Status").className = "NotYet";
		} else if (TheBook.reading == 1) {
			document.getElementById("Status").innerHTML = "READING";
			document.getElementById("Status").className = "releasing";
		}
		if (TheBook.favorite == 1) {
			document.getElementById("Status").innerHTML += "(Favorite)";
		}
		document.getElementById("readstat").innerHTML = "<input type=\"number\" step=\"1\" min=\"0\" id=\"readAddInput\">" + " / " + TheBook.pageCount + " pages read";
		document.getElementById("readAddInput").value = TheBook.last_page;
		document.getElementById("readAddInput").max = TheBook.pageCount;
		document.getElementById("readAddInput").addEventListener("change", async function (e) {
			let options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					"token": connected,
					"table": "Books",
					"column": "last_page",
					"whereEl": TheBook.ID_book,
					"value": e.target.value,
					"where": "ID_book"
				}, null, 2)
			};
			await fetch("http://" + domain + ":" + port + "/DB/update", options).catch((err) => {
				Toastifycation("Error", "#d92027");
			});
		});
		document.getElementById("characters").innerHTML = "<h1>" + "Characters" + ":</h1> " + "Number of characters : " + ((provider == 1) ? (JSON.parse(TheBook.characters)["available"]) : ((TheBook.characters != "null") ? (JSON.parse(TheBook.characters).length) : (0))) + "<br/>";
		document.getElementById("detailSeparator").style.marginTop = "5vh";
		let scrollCharactersAmount = 0;
		let moveRight = document.createElement("button");
		moveRight.className = "scrollBtnR";
		moveRight.onclick = function () {
			container.scrollTo({
				left: Math.max(scrollCharactersAmount += 140, container.clientWidth),
				behavior: "smooth"
			});
		};
		moveRight.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft = document.createElement("button");
		moveLeft.className = "scrollBtnL";
		moveLeft.onclick = function () {
			container.scrollTo({
				left: Math.min(scrollCharactersAmount -= 140, 0),
				behavior: "smooth"
			});
		};
		moveLeft.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("characters").appendChild(moveLeft);
		document.getElementById("characters").appendChild(moveRight);
		document.getElementById("characters").appendChild(container);
	}
	//Genres
	if (TheBook.creators != "null") {
		var tmpstaff = "Number of people : " + ((provider == 1) ? (JSON.parse(TheBook["creators"])["available"]) : ((TheBook["creators"] != "null") ? (JSON.parse(TheBook["creators"]).length) : ("0"))) + "<br/>";
		var StaffToFetchList = [];
		if (provider == 1) {
			JSON.parse(TheBook.creators)["items"].forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		} else if (provider == 2) {
			JSON.parse(TheBook.creators).forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		}
		var StaffToFetch = StaffToFetchList.join(",");
		var container2 = document.createElement("div");
		await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
			clres = JSON.parse(clres);
			container2.className = "item-list";
			for (var i = 0; i < clres.length; i++) {
				var el = clres[i];
				const divs = document.createElement("div");
				const divs2 = document.createElement("div");
				for (var j = 0; j < clres.length; j++) {
					if (provider == 1) {
						if (el.name == JSON.parse(TheBook.creators)["items"][j].name) {
							divs2.innerHTML = "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span><br/><span style='font-size: 14px;color: #a8a8a8a8'>" + JSON.parse(TheBook.creators)["items"][j]["role"] + "</span>";
						}
					} else if (provider == 2) {
						if (el.name == JSON.parse(TheBook.creators)[j].name) {
							divs2.innerHTML = "<img src='" + el.image.replaceAll('"', "") + "' class='img-charac'/><br><span>" + el.name + "</span>";
						}
					}
					let desc = el.description;
					let image = el.image;
					let urlo = el.url;
					let name = el.name;
					divs2.setAttribute("data-bs-toggle", "modal");
					divs2.setAttribute("data-bs-target", "#moreinfo");
					divs2.addEventListener("click", function (e) {
						if (provider == 1) {
							document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
							document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
							if (desc == null) {
								document.getElementById("moreinfo_txt").innerHTML = name;
							} else {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
							}
						} else if (provider == 2) {
							document.getElementById("moreinfo_img").src = image.replaceAll('"', "");
							document.getElementById("moreinfo_btn").href = urlo;
							if (desc == null) {
								document.getElementById("moreinfo_txt").innerHTML = name;
							} else {
								try {
									document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + JSON.parse(desc);
								} catch (e) {
									document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
								}
							}
						}
						document.getElementById("moreinfo_btn").target = "_blank";
						document.getElementById("moreinfo_btn").innerHTML = "See more";
					});
					divs.appendChild(divs2);
					divs2.style.marginTop = "10px";
					divs2.style.textAlign = "center";
					divs.style.marginLeft = "10px";
					container2.appendChild(divs);
				}
			}
		});
		document.getElementById("Staff").innerHTML = "<h1>" + "Staff" + ":</h1> " + "<br/>" + tmpstaff;
		let scrollStaffAmount = 0;
		let moveRight2 = document.createElement("button");
		moveRight2.className = "scrollBtnR";
		moveRight2.onclick = function () {
			container2.scrollTo({
				left: Math.max(scrollStaffAmount += 140, container2.clientWidth),
				behavior: "smooth"
			});
		};
		moveRight2.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft2 = document.createElement("button");
		moveLeft2.className = "scrollBtnL";
		moveLeft2.onclick = function () {
			container2.scrollTo({
				left: Math.min(scrollStaffAmount += 140, 0),
				behavior: "smooth"
			});
		};
		moveLeft2.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("Staff").appendChild(moveLeft2);
		document.getElementById("Staff").appendChild(moveRight2);
		document.getElementById("Staff").appendChild(container2);
	}
	if (TheBook.collectedIssues != "null") {
		for (var a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {
			document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
		}
	}
	if (TheBook.collections != "null") {
		for (var a = 0; a < JSON.parse(TheBook.collections).length; a++) {
			document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
		}
	}
	if (TheBook.issueNumber != "null" && TheBook.issueNumber != "" && TheBook.issueNumber != null) {
		document.getElementById("chapters").innerHTML = "Number of this volume within the series : " + TheBook.issueNumber;
	} else {
		document.getElementById("chapters").innerHTML = "";
	}
	if (TheBook.prices != "null" && TheBook.prices != "" && TheBook.prices != null) {
		if (provider == 1) {
			document.getElementById("price").innerHTML += "Prices : <br/>";
			for (var a = 0; a < JSON.parse(TheBook.prices).length; a++) {
				console.log(JSON.parse(TheBook.prices)[a]);
				document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
			}
		}
	}
	if (TheBook.dates != "null") {
		document.getElementById("startDate").innerHTML = "Dates : <br/>";
		for (var b = 0; b < JSON.parse(TheBook.dates).length; b++) {
			document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
		}
	}
	if (TheBook.variants != "null" && TheBook.variants != "" && TheBook.variants != null) {
		if (provider == 1) {
			createVariants(TheBook);
		}
	}
}

function createVariants(TheBook) {
	console.log(TheBook);
	let variants = JSON.parse(TheBook.variants);
	document.getElementById("relations").appendChild(document.createTextNode("Variants list : "));
	document.getElementById("relations").appendChild(document.createElement("br"));
	variants.forEach((el, index) => {
		document.getElementById("relations").appendChild(document.createTextNode(el.name));
		document.getElementById("relations").appendChild(document.createElement("br"));
	});
}

function createCard(unread, read, reading, ID, URLCover, NOM) {
	/*document.getElementById("relations").appendChild(createCard(TheBook.unread,TheBook.read,TheBook.reading,TheBook.ID,TheBook.URLCover,TheBook.NOM));*/
	const carddiv = document.createElement("div");
	const rib = document.createElement("div");
	imagelink = URLCover;
	let node = document.createTextNode(NOM);
	if (unread == 1) {
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
	buttonfav.id = "btn_id_fav_" + ID;
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
	button_unread.id = "btn_id_unread_" + ID;
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
	button_reading.id = "btn_id_reading_" + ID;
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
	button_read.id = "btn_id_read_" + ID;
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
	imgcard.id = "card_img_id_" + ID;
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
	carddiv.id = "id_vol" + ID;
	carddiv.appendChild(rib);
	return carddiv;
}

function clearList() {
	while (document.getElementById("searchResults").firstChild) {
		document.getElementById("searchResults").removeChild(document.getElementById("searchResults").firstChild);
	}
}

document.getElementById('searchField').addEventListener('focus', function (e) {
	document.getElementById('searchResults').style.display = 'block';
	setTimeout(function () {
		document.addEventListener('click', listenerClickSearch);
	}, 100);
});
document.getElementById('searchField').addEventListener('input', function (e) {
	console.log(theSearchList);
	clearList();
	let value = e.target.value;
	if (value && value.trim().length > 0) {
		value = value.trim().toLowerCase();
		setSearch(theSearchList.filter(item => {
			if (item.NOM != undefined) {
				return item.NOM.toLowerCase().includes(value);
			} else {
				return item.title.toLowerCase().includes(value);
			}
		})).then(r => {
		});
	} else {
		document.getElementById("searchResults").style.display = "none";
		clearList();
	}
	document.addEventListener('click', listenerClickSearch);
});

function listenerClickSearch() {
	document.getElementById("searchResults").style.display = "none";
	document.removeEventListener('click', listenerClickSearch);
}

async function downloadBook(path) {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			path: path
		}, null, 2)
	};
	console.log(option);
	await fetch('http://' + domain + ":" + port + '/DL', option).then(() => {
		window.open("http://" + domain + ":" + port + "/getDLBook", "_blank");
	});
}

async function logout() {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}
	};
	await fetch('http://' + domain + ":" + port + '/profile/logout/' + connected, option).then(() => {
		window.location.href = 'login';
	});
}

function createContextMenu(elements = []) {
}

function AccountMenu() {
// TODO generaliser de la creation de menu
	const ul = document.createElement("ul");
	const li2 = document.createElement("li");
	const li3 = document.createElement("li");
	const li4 = document.createElement("li");
	li2.innerHTML = "Modify your account";
	li2.setAttribute("data-bs-toggle", "modal");
	li2.setAttribute("data-bs-target", "#modifAccount");
	li3.innerHTML = "Create a new user";
	li3.setAttribute("data-bs-toggle", "modal");
	li3.setAttribute("data-bs-target", "#modifAccount");
	li3.addEventListener("click", function () {
		document.getElementById("id_modifAccount").innerHTML = "Create a new user";
		document.getElementById("delaccount").style.display = "none";
		document.getElementById("sendbdd").style.display = "none";
		document.getElementById("sendaccount").onclick = async function () {
			console.log("sendaccount");
			createAccount();
		};
	});
	li4.innerHTML = "Logout";
	li4.addEventListener("click", function () {
		logout();
	});
	ul.appendChild(li2);
	ul.appendChild(li3);
	ul.appendChild(li4);
	ul.className = "contextMenu";
	ul.style.right = "0.4vw";
	ul.style.display = "block";
	document.body.appendChild(ul);
	ul.style.top = 70 + "px";
	ul.style.display = "flex";
	document.addEventListener("click", function (e) {
		if (e.target != ul && e.target != li2 && e.target != li3 && e.target != li4 && e.target != document.getElementById("id_accountSystem") && e.target != document.getElementById("icon_id_accountSystem")) {
			ul.style.display = "none";
		}
	});
}

fetch("/profile/custo/getNumber").then((res) => {
	return res.json();
}).then((data) => {
	data = data.length;
	temp = document.getElementsByTagName("template")[0];
	item = temp.content.querySelector("img");
	for (let i = 1; i < data + 1; i++) {
		const newone = document.importNode(item, true);
		newone.src = "Images/account_default/" + i + ".jpg";
		newone.addEventListener("click", () => {
			console.log(document.getElementById(newone.id));
			if (document.getElementById("newImage") == null) {
				newone.id = "newImage";
			} else {
				document.getElementById("newImage").removeAttribute("id");
				newone.id = "newImage";
			}
		});
		document.getElementById("AMImages").appendChild(newone);
	}
});

function DownloadBDD() {
	window.open('http://' + domain + ":" + port + "/profile/DLBDD/" + connected);
}

async function DeleteAccount() {
	window.location.href = 'login';
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"token": connected
		}, null, 2)
	};
	fetch('http://' + domain + ":" + port + "/profile/deleteAccount", option).then(() => {
		Toastifycation("Account deleted", "#00C33C");
		console.log("account deleted !");
	}).catch((err) => {
		Toastifycation("Account not deleted", "#ff0000");
	});
}

let accountsNames = [];
fetch("http://" + domain + ":" + port + "/profile/discover").then(function (response) {
	return response.text();
}).then(async function (data) {
	data = JSON.parse(data);
	data.forEach(function (item) {
		accountsNames.push(item.name.toLowerCase());
	});
});

async function createAccount() {
	if (!accountsNames.includes(document.getElementById("usernameManager").value.toLowerCase())) {
		const option = {
			method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
				"token": connected,
				"name": document.getElementById("usernameManager").value,
				"password": document.getElementById("passwordManager").value,
				"pp": document.getElementById("newImage").src
			}, null, 2)
		};
		fetch('http://' + domain + ":" + port + "/createUser", option).then(() => {
			console.log("account created !");
		});
		Toastifycation("The user is created", "#00C33C");
		document.getElementById("close_mna").click();
	} else {
		Toastifycation("This username is already used. User creation aborted", "#ff0000");
	}
}

function changeRating(table, where, value) {
	if (table == "Books") {
		console.log(table, value + " from Book");
		const options = {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"token": connected,
				"table": table,
				"column": "note",
				"whereEl": where,
				"value": value,
				"where": "ID_book"
			}, null, 2)
		};
		fetch("http://" + domain + ":" + port + "/DB/update", options);
	} else if (table == "Series") {
		console.log(table, value);
		const options = {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"token": connected,
				"table": table,
				"column": "note",
				"where": "ID_Series",
				"whereEl": where,
				"value": value
			}, null, 2)
		};
		fetch("http://" + domain + ":" + port + "/DB/update", options);
	}
}