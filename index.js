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
let imagelink = "null";
let listOfImages = [];
let name_of_the_current_book = "";
let readonly = false;
const url = document.createElement("a");
url.setAttribute("href", window.location.href);
let domain = url.hostname;
let port = url.port;
let currentUser = "";
let userToken = getCookie("selectedProfile");
let providerEnum = {
	"Marvel": 1,
	"Anilist": 2,
	"MANUAL": 0,
	"LOCG": 3,
	"OL": 4
}
let sidebarMini = false;
let searchtoggle = true;
if (userToken == null) {
	window.location.href = "login";
} else {
	fetch("http://" + domain + ":" + port + "/profile/logcheck/" + userToken).then(function (response) {
		return response.text();
	}).then(function (data) {
		if (data === "false") {
			window.location.href = "login";
		} else {
			currentUser = data;
			document.getElementById("icon_id_accountSystem").src = "http://" + domain + ":" + port + "/profile/getPP/" + userToken;
			fetch("http://" + domain + ":" + port + "/config/getConfig/" + userToken).then(function (response) {
				return response.text();
			}).then(function (data) {
				let d = SearchInJSON("display_style", JSON.parse(data));
				let cardMode = _01toBool(d);
			}).catch(function (error) {
				console.log(error);
			});
			fetch("http://" + domain + ":" + port + "/config/getConfig/" + userToken).then(function (response) {
				return response.text();
			}).then(function (data) {
				currenttheme = SearchInJSON("theme", JSON.parse(data));
				console.log(currenttheme);
				Themes();
			}).catch(function (error) {
				console.log(error);
			});
			fetch("http://" + domain + ":" + port + "/config/getConfig/" + userToken).then(function (response) {
				return response.text();
			}).then(function (data) {
				let currenttheme = SearchInJSON("theme", JSON.parse(data));
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
let cardMode = true;

//Search element on the JSON
function SearchInJSON(search, info) {
	for (let i in info) {
		if (i === search) {
			return info[i];
		}
	}
	return null;
}

function _01toBool(number) {
	return number === 0;
}

let theme_FG = "white";
let theme_BG_CI = "rgba(0,0,0,0.753)";
let currenttheme;
let theme_button_card = "";
let theme_hover_listview = "#242424";
let linkBG = "";
document.getElementsByTagName("html")[0].className = "black";
document.getElementById("btn_close_icon_about").className = "btn-close btn-close-white";
let CosmicComicsData = "C:/Users/Public/Cosmic-Comics/data";
let CosmicComicsTemp = "C:/Users/Public/Cosmic-Comics/data";
let CosmicComicsTempI = "C:/Users/Public/Cosmic-Comics/data";
let GetAllIMG = false;
let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
	return new bootstrap.Tooltip(tooltipTriggerEl);
});
let language;
fetch("http://" + domain + ":" + port + "/dirname").then(function (response) {
	return response.text();
}).then(function (data) {
	dirnameFE = data;
	CosmicComicsData = dirnameFE + "/CosmicComics_data";
	CosmicComicsTempI = CosmicComicsTemp + "/current_book/";
	console.log(CosmicComicsTempI);
}).catch(function (error) {
	console.log(error);
});
fetch("http://" + domain + ":" + port + "/CosmicDataLoc").then(function (response) {
	return response.text();
}).then(function (data) {
	CosmicComicsTemp = data;
})

/**
 * Set the theme on the page
 * @param theme The selected theme
 */
function setTheme(theme) {
	document.head.getElementsByTagName("link")[5].href = "/themes/" + theme;
}

/**
 * Get the response from the server
 * @returns {Promise<void>} The response
 */
async function getResponse() {
	console.log("begin Request");
	const response = await fetch("http://" + domain + ":" + port + "/config/getConfig/" + userToken);
	console.log("Requested");
	const dataa = await response.json().then((data) => {
		console.log(data);
		let configFile = data;
		configFile = JSON.stringify(configFile);
		let parsedJSON = JSON.parse(configFile);
		let configlang = SearchInJSON("language", parsedJSON);
		console.log(configlang);
		fetch("http://" + domain + ":" + port + "/lang/" + configlang).then((response) => {
			response.json().then((datoo) => {
				console.log(datoo);
				language = datoo;
			});
		});
	});
}

/**
 * Get the version and display it on the info
 */
fetch("http://" + domain + ":" + port + "/getVersion").then(function (response) {
	return response.text();
}).then(function (data) {
	document.getElementById("version").innerHTML = "Version : " + data;
}).catch(function (error) {
	console.log(error);
});

/**
 * Rematch the element of old_id by the new_id
 * @param {string} new_id New id
 * @param {int} provider The API provider
 * @param {string} type The type of the element
 * @param {string} old_id The old id
 * @param {boolean} isSeries Is the element a series
 */
async function rematch(new_id, provider, type, old_id, isSeries = false) {
	if (isSeries) {
		await fetch("http://" + domain + ":" + port + "/DB/update", {
			method: "POST", headers: {
				"Content-Type": "application/json"
			}, body: JSON.stringify({
				"token": userToken,
				"table": "Series",
				"type": "noedit",
				"column": "ID_Series",
				"whereEl": old_id,
				"value": `'${new_id}'`,
				"where": "ID_Series"
			}, null, 2)
		})
	} else {
		await fetch("http://" + domain + ":" + port + "/DB/update", {
			method: "POST", headers: {
				"Content-Type": "application/json"
			}, body: JSON.stringify({
				"token": userToken,
				"table": "Books",
				"type": "noedit",
				"column": "ID_book",
				"whereEl": old_id,
				"value": `'${new_id}'`,
				"where": "ID_book"
			}, null, 2)
		})
	}
	await refreshMeta(new_id, provider, type);
}

/**
 * Add or remove AnimateCSS animation
 * @param {HTMLElement} element The element to animate
 * @param {string} animation The animation
 * @param {string} prefix The prefix of the class
 */
const animateCSS = (element, animation, prefix = "animate__") =>
	new Promise((resolve, reject) => {
		const animationName = `${prefix}${animation}`;
		const node = element;
		node.classList.add(`${prefix}animated`, animationName);

		function handleAnimationEnd(event) {
			event.stopPropagation();
			node.classList.remove(`${prefix}animated`, animationName);
			resolve("Animation ended");
		}

		node.addEventListener("animationend", handleAnimationEnd, {once: true});
	});

/**
 * Make a request to the DB and get the data
 * @param dbname The name of the DB to get the data
 * @param request The SQL(ite) request
 * @returns {Promise<string>} The data returned by the DB
 */
async function getFromDB(dbname, request) {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"request": request
		}, null, 2)
	};
	return fetch('http://' + domain + ":" + port + '/DB/get/' + userToken + "/" + dbname, option).then(function (response) {
		return response.text();
	}).then(function (data) {
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

/**
 * Insert values in a specific table of the DB
 * @param {string} dbname The name of the DB
 * @param {string} dbinfo The attributes of the table
 * @param {string} values The values to insert
 */
async function InsertIntoDB(dbname, dbinfo, values) {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"into": dbinfo, "val": values
		}, null, 2)
	};
	return fetch('http://' + domain + ":" + port + '/DB/insert/' + userToken + "/" + dbname, option);
}

/**
 * Delete the library
 * @param elElement The element to delete
 * @returns {Promise<void>} The response
 */
async function deleteLib(elElement) {
	let confirmDelete = confirm("Would you like to delete " + elElement["NAME"] + " ?");
	if (confirmDelete) {
		await fetch('http://' + domain + ":" + port + '/DB/lib/delete/' + userToken + "/" + elElement["ID_LIBRARY"]).then(() => {
			alert("The library has been deleted");
			location.reload();
		});
	}
}

/**
 * Get the browser cookies
 * @param {string} cName The name of the cookie
 */
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

/**
 * Change the Lib modal to modify the library
 * @param elElement The element to modify
 */
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

/**
 * Reset the detail overlay to default
 */
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

/**
 * Reset the lib modal to default (adding a library)
 */
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

/**
 * Trigger the metadata refresh for the selected library
 * @param elElement The library to refresh
 */
function refreshMetadata(elElement) {
	let path = elElement["PATH"];
	DetectFolderInLibrary(path).then(async function (data) {
		data = JSON.parse(data);
		await getFromDB("Series", "ID_Series,PATH FROM Series").then(async (res) => {
			res = JSON.parse(res);
			for (let index = 0; index < res.length; index++) {
				let el = res[index]["PATH"];
				for (let i = 0; i < data.length; i++) {
					if (el === data[i]) {
						await refreshMeta(res[index]["ID_Series"], elElement["API_ID"], "Series");
						break;
					}
				}
			}
		});
	})
}

/**
 * Adding a step to the breadcrumb
 * @param {string} title The title of the step
 * @param {(function(): void)|(function(): Promise<void>)} ListenerF The function to call when the step is clicked
 */
function addToBreadCrumb(title, ListenerF) {
	let breadCrumb = document.querySelector(".breadcrumb");
	let newElement = document.createElement("li");
	newElement.addEventListener('click', (e) => {
		removeBreadCrumb(breadCrumb, newElement);
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

/**
 * Remove steps from the breadcrumb to the selected step
 * @param {Element} breadcrumb The breadcrumb element
 * @param {ChildNode} element The element to remove to
 */
function removeBreadCrumb(breadcrumb, element) {
	while (breadcrumb.lastChild !== element) {
		breadcrumb.removeChild(breadcrumb.lastChild);
	}
}

/**
 * Discover the libraries
 */
async function discoverLibraries() {
	let listofFolder;
	const div = document.createElement("div");
	let btn = document.createElement("button");
	btn.id = "downloads";
	btn.addEventListener("click", function () {
		let breadCrumb = document.querySelector(".breadcrumb");
		removeBreadCrumb(breadCrumb, breadCrumb.childNodes[1]);
		document.querySelectorAll(".selectLib").forEach((el) => {
			el.classList.remove("selectLib");
		});
		btn.classList.add("selectLib");
		document.getElementById("ContainerExplorer").innerHTML = "";
		document.getElementById("overlay").style.display = "none";
		document.getElementById("overlay2").style.display = "none";
		document.getElementById("contentViewer").style.display = "none";
		addToBreadCrumb("Downloads", () => {
			return openLibrary(CosmicComicsTemp + "/downloads", 2);
		});
		openLibrary(CosmicComicsTemp + "/downloads", 2);
	});
	const logo = document.createElement("i");
	logo.className = "material-icons";
	logo.innerHTML = "download_file";
	logo.style.color = "white";
	logo.style.lineHeight = "1";
	logo.style.float = "left";
	logo.style.width = "25px";
	logo.style.float = "left";
	logo.style.lineHeight = "1";
	btn.appendChild(logo);
	let naming = document.createElement("span");
	naming.innerHTML = "Downloads";
	btn.appendChild(naming);
	btn.className = "btn btns libbtn";
	div.style.display = "flex";
	btn.style.float = "left";
	div.appendChild(btn);
	document.getElementById("folderExplorer").appendChild(div);
	await getFromDB("Libraries", "* FROM Libraries").then((res) => {
		listofFolder = JSON.parse(res);
		listofFolder.forEach((el) => {
			const div = document.createElement("div");
			let btn = document.createElement("button");
			btn.id = el["NAME"];
			btn.addEventListener("click", function () {
				let breadCrumb = document.querySelector(".breadcrumb");
				removeBreadCrumb(breadCrumb, breadCrumb.childNodes[1]);
				document.querySelectorAll(".selectLib").forEach((el) => {
					el.classList.remove("selectLib");
				});
				btn.classList.add("selectLib");
				document.getElementById("ContainerExplorer").innerHTML = "";
				document.getElementById("overlay").style.display = "none";
				document.getElementById("overlay2").style.display = "none";
				document.getElementById("contentViewer").style.display = "none";
				addToBreadCrumb(el["NAME"], function () {
					return openLibrary(el["PATH"], el["API_ID"]);
				});
				openLibrary(el["PATH"], el["API_ID"]);
			});
			const logo = document.createElement("img");
			if (el["API_ID"] === 1) {
				logo.src = "./Images/marvel-logo-png-10.png";
			} else if (el["API_ID"] === 2) {
				logo.src = "./Images/android-chrome-512x512.png";
			}
			logo.className = "libLogo";
			btn.appendChild(logo);
			let naming = document.createElement("span");
			naming.innerHTML = el["NAME"];
			btn.appendChild(naming);
			btn.className = "btn btns libbtn";
			div.style.display = "flex";
			btn.style.float = "left";
			const menu = document.createElement("button");
			menu.innerHTML = "<span class='material-icons'>more_vert</span>";
			menu.className = "btn libmenu";
			const ul = document.createElement("ul");
			const li = document.createElement("li");
			const li2 = document.createElement("li");
			const li3 = document.createElement("li");
			li.innerHTML = "Delete";
			li2.innerHTML = "Modify";
			li2.setAttribute("data-bs-toggle", "modal");
			li2.setAttribute("data-bs-target", "#lib");
			li3.innerHTML = "Refresh metadata";
			li.addEventListener("click", function () {
				deleteLib(el);
			});
			li2.addEventListener("click", function () {
				modifyLib(el);
			});
			li3.addEventListener("click", function () {
				refreshMetadata(el);
			});
			ul.appendChild(li);
			ul.appendChild(li2);
			ul.appendChild(li3);
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
					if (e.target !== menu && e.target !== ul && e.target !== li && e.target !== li2 && e.target !== li3 && e.target !== btn && e.target !== menu.children[0]) {
						ul.style.display = "none";
					}
				});
			});
			div.appendChild(btn);
			div.appendChild(menu);
			document.getElementById("folderExplorer").appendChild(div);
		});
	});
}

discoverLibraries().then(r => {
	if (window.screen.width <= 1300) {
		toggleSideBar();
	}
});

/**
 * Modify user's profile configuration JSON file
 * @param {string|number} tomod The key to modify
 * @param {*} mod the new value
 */
function modifyConfigJson(tomod, mod) {
	//check si obj exist pour remplacer valeur
	fetch("http://" + domain + ":" + port + "/config/getConfig/" + userToken).then(function (response) {
		return response.text();
	}).then(function (data) {
		let config = JSON.parse(data);
		for (let i in config) {
			config[tomod] = mod;
		}
		const option = {
			method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(config, null, 2)
		};
		fetch('/config/writeConfig/' + userToken, option);
	}).catch(function (error) {
		console.log(error);
	});
}

/**
 * Search a value in a JSON file by the key
 * @param {string} what_you_want The key to search
 * @param {*} data The JSON file
 */
function Get_From_Config(what_you_want, data) {
	for (let i in data[0]) {
		if (i === what_you_want) {
			return data[0][i];
		}
	}
	return null;
}

/**
 * Toggle the sidebar
 */
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

/**
 * Show the search bar
 */
function summonSearch() {
	if (searchtoggle) {
		searchtoggle = false;
		document.getElementById("searchField").style.display = "block";
	} else {
		searchtoggle = true;
		document.getElementById("searchField").style.display = "none";
	}
}

/**
 * Reload the page
 */
function refreshPage() {
	window.location.href = window.location.href;
}

/**
 * Scan for folders in the library
 * @param {string} result The path to the library
 * @returns {Promise<string[]>} The list of folders
 */
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

/**
 * Open the library
 * @param {string} folder The path to the library
 * @param {*} provider The provider of the library (default to MANUAL)
 */
function openLibrary(folder, provider = 0) {
	document.getElementById("home").style.display = "none";
	document.getElementById("overlay").style.display = "block";
	setTimeout(() => {
		let result = folder.toString();
		if (result) {
			console.log(result);
			DetectFolderInLibrary(result).then((data) => {
				console.log(data);
				if (data.length <= 0) throw new Error("Folder empty or not found");
				//Ajouter a la DB les dossiers trouvés en tant que Collection
				loadContent(provider, data, result);
			});
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

/**
 * Get from ANILIST API the data of the manga by ID
 * @param {number|string} id The ID of the manga
 * @return {Promise<*>} The data of the manga
 */
async function API_ANILIST_GET_ID(id) {
	return fetch("http://" + domain + ":" + port + "/api/anilist/searchByID/" + id).then(function (response) {
		return response.text();
	}).then(function (data) {
		data = JSON.parse(data);
		console.log(data);
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

/**
 * Search on ANILIST API by the manga name
 * @param {string} name The name of the manga
 * @return {Promise<*>} The list of mangas
 */
async function API_ANILIST_GET_SEARCH(name) {
	return fetch("http://" + domain + ":" + port + "/api/anilist/searchOnly/" + name).then(function (response) {
		return response.text();
	}).then(function (data) {
		data = JSON.parse(data);
		console.log(data);
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

/**
 * Add the manga and all related information to the database
 * @param {string} name The name of the manga
 * @param {string} path The path to the manga
 */
function API_ANILIST_POST_SEARCH(name, path) {
	fetch("http://" + domain + ":" + port + "/api/anilist", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"name": name,
			"token": userToken,
			"path": path
		}
	}).then(() => {
		Toastifycation("Manga added to the database");
	})
}

/**
 * Generation of the Book Object for not yet DB inserted items
 * @param NOM The name of the item
 * @param ID The ID of the item
 * @param COVER The cover of the item
 * @param DESCRIPTION The description of the item
 * @param STAFF The staff of the item
 * @param CHARACTERS The characters of the item
 * @param SITEURL The site URL of the item
 * @param NOTE The note of the item
 * @param READ The read status of the item
 * @param READING The reading status of the item
 * @param UNREAD  The unread status of the item
 * @param FAVORITE The favorite status of the item
 * @param LAST_PAGE The last page of the item
 * @param FOLDER The folder of the item
 * @param PATH The path of the item
 * @param ISSUENUMBER The issue number of the item
 * @param FORMAT The format of the item
 * @param PAGECOUNT The page count of the item
 * @param SERIES The series of the item
 * @param PRICES The prices of the item
 * @param DATES The dates of the item
 * @param COLLECTEDISSUES The collected issues of the item
 * @param COLLECTIONS The collections of the item
 * @param VARIANTS The variants of the item
 * @param LOCK The lock status of the item
 * @return {{PATH: null, note: null, unread: null, creators: null, issueNumber: null, description: null, variants: null, characters: null, collections: null, lock: null, id: null, prices: null, collectedIssues: null, pageCount: null, read: null, URLs: null, last_page: null, format: null, reading: null, dates: null, NOM: null, folder: null, series: null, favorite: null, URLCover: null}} The Book Object
 */
function generateBookTemplate(NOM = null, ID = null, NOTE = null, READ = null, READING = null,
                              UNREAD = null, FAVORITE = null, LAST_PAGE = null, FOLDER = null,
                              PATH = null, COVER = null, ISSUENUMBER = null, DESCRIPTION = null,
                              FORMAT = null, PAGECOUNT = null, SITEURL = null, SERIES = null,
                              STAFF = null, CHARACTERS = null, PRICES = null, DATES = null,
                              COLLECTEDISSUES = null, COLLECTIONS = null, VARIANTS = null, LOCK = null) {
	return {
		"NOM": NOM,
		"id": ID,
		"note": NOTE,
		"read": READ,
		"reading": READING,
		"unread": UNREAD,
		"favorite": FAVORITE,
		"last_page": LAST_PAGE,
		"folder": FOLDER,
		"PATH": PATH,
		"URLCover": COVER,
		"issueNumber": ISSUENUMBER,
		"description": DESCRIPTION,
		"format": FORMAT,
		"pageCount": PAGECOUNT,
		"URLs": SITEURL,
		"series": SERIES,
		"creators": STAFF,
		"characters": CHARACTERS,
		"prices": PRICES,
		"dates": DATES,
		"collectedIssues": COLLECTEDISSUES,
		"collections": COLLECTIONS,
		"variants": VARIANTS,
		"lock": LOCK
	};
}

/**
 * Load the content of the element
 * @param {string} FolderRes The folder path
 * @param {string} libraryPath The library path
 * @param {*} date The date of the element
 * @param {providerEnum} provider The provider of the element
 */
function loadView(FolderRes, libraryPath, date = "", provider = providerEnum.MANUAL) {
	let n = 0;
	let listOfImages = [];
	document.getElementById("overlay2").style.display = "none";
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
			let name = path.replaceAll(libraryPath.replaceAll("\\", "/"), "")
			let realname = /[^\\\/]+(?=\.[\w]+$)|[^\\\/]+$/.exec(name)[0];
			let readBookNB = await getFromDB("Books", "COUNT(*) FROM Books WHERE READ = 1 AND PATH = '" + path + "'");
			document.getElementById("readstat").innerHTML = JSON.parse(readBookNB)[0]["COUNT(*)"] + " / " + data.length + " volumes read";
			await getFromDB("Books", "* FROM Books WHERE PATH = '" + path + "'").then(async (resa) => {
				let bookList = JSON.parse(resa);
				let TheBook = bookList[0];
				if (bookList.length === 0) {
					if (provider === providerEnum.Marvel) {
						await GETMARVELAPI_Comics_INSERT(realname, date,path).then(async (cdata) => {
							console.log(cdata);
							if (cdata === undefined) {
								throw new Error("no data");
							}
							if (cdata["data"]["total"] > 0) {
								cdata = cdata["data"]["results"][0];
								TheBook = generateBookTemplate(realname, cdata["id"], null, 0, 0, 1, 0, 0, 0, path,
									cdata["thumbnail"].path + "/detail." + cdata["thumbnail"].extension, cdata["issueNumber"], cdata["description"], cdata["format"],
									cdata["pageCount"], cdata["urls"], cdata["series"], cdata["creators"], cdata["characters"], cdata["prices"], cdata["dates"],
									cdata["collectedIssues"], cdata["collections"], cdata["variants"], false);
							} else {
								TheBook = generateBookTemplate(realname, null, null, 0, 0, 1, 0, 0, 0, path, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null)
							}
						});
					} else if (provider === providerEnum.Anilist) {
						fetch("http://" + domain + ":" + port + "/insert/anilist/book", {
							method: "POST",
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								"token": userToken,
								"path": path,
								"realname": realname,
							})
						})
						TheBook = generateBookTemplate(realname, null, null, 0, 0, 1, 0, 0, 0, path, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null)
					}
				}
				let carddiv = createCard(TheBook["unread"], TheBook["read"], TheBook["reading"], TheBook["ID_book"] + "_" + n, TheBook["URLCover"], TheBook["NOM"], TheBook["favorite"])
				carddiv.querySelector(".card__play").addEventListener("click", function () {
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
				n++;
				const element = document.getElementById("ContentView");
				divlist.appendChild(carddiv);
				element.appendChild(divlist);
			});
		}
	});
}

/**
 * Convert a date to a string
 * @param {number|string|Date|VarDate} inputFormat
 * @return {string} date in string format (dd/mm/yyyy)
 */
function convertDate(inputFormat) {
	function pad(s) {
		return (s < 10) ? '0' + s : s;
	}

	let d = new Date(inputFormat);
	return [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()].join('/');
}

/* TODO CODE VERIFICATION */
function GETMARVELAPI(name = "",path) {
	fetch('http://' + domain + ":" + port + '/api/marvel/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			"token": userToken,
			"name": name,
			"path": path,
		})
	}).then(function (response) {
		Toastifycation("Marvel API : " + response.status);
	})
}

async function loadContent(provider, FolderRes, libraryPath) {
	let n = 0;
	listOfImages = [];
	document.getElementById("overlay2").style.display = "block";
	FolderRes = JSON.parse(FolderRes);
	const divlist = document.createElement("div");
	divlist.className = "list-group";
	await getFromDB("Series", "PATH FROM Series").then(async (res) => {
		for (let index = 0; index < FolderRes.length; index++) {
			const path = FolderRes[index];
			let name = path.replaceAll(libraryPath.replaceAll("\\", "/"), "").replace("/", "");
			let path_without_file = path.replace(name, "");
			let realname = name;
			console.log(realname);
			let found = false;
			let titlesList = [];
			let returnedPath = JSON.parse(res);
			let foundPATH = "";
			for (let i = 0; i < returnedPath.length; i++) {
				titlesList.push(returnedPath[i].PATH);
			}
			console.log(titlesList);
			console.log(name);
			titlesList.forEach((el) => {
				console.log(el);
				if (el === path) {
					found = true;
					foundPATH = el;
				}
			});
			if (found === false) {
				if (provider === providerEnum.Anilist) {
					console.log("provider 2");
					API_ANILIST_POST_SEARCH(name, path)
				} else if (provider === providerEnum.Marvel) {
					console.log("Provider: Marvel Comics");
					GETMARVELAPI(name,path);
				}
			} else {
				await getFromDB("Series", "* FROM Series where PATH = '" + foundPATH + "'").then((res) => {
					console.log(foundPATH);
					res = JSON.parse(res);
					console.log(res);
					let node;
					if (cardMode === true) {
						if (provider === 1) {
							node = JSON.parse(res[0].title);
						} else {
							if (JSON.parse(res[0].title)["english"] !== undefined && JSON.parse(res[0].title)["english"] !== null) {
								node = JSON.parse(res[0].title)["english"];
							} else if (JSON.parse(res[0].title)["romaji"] !== undefined && JSON.parse(res[0].title)["romaji"] !== null) {
								node = JSON.parse(res[0].title)["romaji"];
							} else {
								node = JSON.parse(res[0].title);
							}
						}
					} else {
						node = JSON.parse(res[0].title)["english"];
					}
					let invertedPath = path.replaceAll("\\", "/");
					if (provider === 1) {
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
					let carddiv = createCard(null, null, null, n, imagelink, node, res[0]["favorite"])
					carddiv.querySelector(".card__play").addEventListener("click", function () {
						alert("ici2");
						window.location.href = "viewer.html?" + encodeURIComponent(path.replaceAll("/", "%C3%B9"));
					});
					carddiv.addEventListener("click", async function () {
						await createSeries(provider, path, libraryPath, res);
					});
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
				});
			}
		}
	});
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
			let random = coolanimations[Math.floor(Math.random() * coolanimations.length)];
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
let preloadedImages = [];

function preloadImage(listImages, n) {
	/* for (var i = 0; i < listImages.length; i++) {
      preloadedImages[i] = new Image();
      preloadedImages[i].src = listImages[i];
    } */
	setTimeout(() => {
		LoadImages(n);
	}, 500);
}

/**
 * Load the images
 * @param numberOf the number of images to load
 */
function LoadImages(numberOf) {
	let random = coolanimations[Math.floor(Math.random() * coolanimations.length)];
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

/* TODO CODE VERIFICATION */
//Sorting number in a string
let SortingNumInStr = function (a, b) {
	return Number(a.match(/(\d+)/g)[0]) - Number(b.match(/(\d+)/g)[0]);
};

//Check if the passed element contains numbers
function hasNumbers(t) {
	let regex = /\d/g;
	return regex.test(t);
}

//Open a single file
function openInViewer() {
	let file = document.getElementById("fileUp").files[0];
	if (file) {
		let url = CosmicComicsTemp + "/uploads/" + file.name;
		let encoded = encodeURIComponent(url.replaceAll("/", "%C3%B9"));
		window.location.href = "viewer.html?" + encoded;
	} else {
		alert("Failed to load file");
	}
}

//Open a book in the bookmarks
function openBOOKM(path) {
	window.location.href = "viewer.html?" + path;
}

//List of Bookmarked folder
function listBM() {
	// TODO bookmark
	/*let data = fs.readFileSync(CosmicComicsData + "/bookmarks.json");
	let info = JSON.parse(data);
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
		let iblock = document.createElement("i");
		iblock.innerHTML = "block";
		iblock.className = "material-icons";
		if (currenttheme > 1) iblock.style.color = theme_FG;
		document.getElementById("bookmarkContainer").appendChild(iblock);
	}*/
}

//the Bookmarked loading
listBM();

/**
 * Alert the client with a Toast Notification
 * @param {string} message The message to display
 * @param {string} BGColor The background color of the toast
 * @param {string} FrontColor The front color of the toast
 *
 */
function Toastifycation(message, BGColor = "#333", FrontColor = "#ffffff") {
	let x = document.querySelector("#snack_msg");
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
			Toastifycation("drag&drop_fail", "#ff0000");
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

function selectTheme() {
	document.head.getElementsByTagName("link")[5].href = "/themes/" + document.getElementById("themeselector").value;
	modifyConfigJson("theme", document.getElementById("themeselector").value);
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

async function downloader() {
	let url = document.getElementById("id_URLDL").value;
	let name = document.getElementById("id_NAME_DL").value;
	let vol = document.getElementById("id_VOL_DL").value;
	console.log(url);
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"url": url, "name": name, "vol": vol
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

/**
 * Add a new library
 * @param {{form: HTMLElement[]}} forma The form to get the data (The HTML element)
 */
async function addLibrary(forma) {
	await InsertIntoDB("Libraries", "(NAME,PATH,API_ID)", `('${forma.form[0].value}','${forma.form[1].value}','${forma.form[2].value}')`).then(() => {
		window.location.href = window.location.href.split("?")[0];
	});
}

/**
 * Modify the account
 * @param {{form: (*|HTMLElement)[]}} forma The form to get the data (The HTML element)
 */
async function modifyAccount(forma) {
	let form = forma.form;
	let nuser = form[0];
	let npass = form[1];
	let npp = form[2];
	if (forma.form[0] === "") {
		nuser = null;
	}
	if (forma.form[1] === "") {
		npass = null;
	}
	if (forma.form[2].length === 0 && forma.form[3] == null) {
		npp = null;
	}
	const options = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"nuser": nuser, "npass": npass, "npp": npp.src, "token": userToken
		}, null, 2)
	};
	await fetch("/profile/modification", options);
}

/**
 * Update the library
 * @param {{form: HTMLElement}} forma The form to get the data (The HTML element)
 * @param {string} id The id of the library
 */
async function updateLibrary(forma, id) {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"name": forma.form[0].value, "path": forma.form[1].value, "api_id": forma.form[2].value
		}, null, 2)
	};
	await fetch('http://' + domain + ":" + port + '/DB/lib/update/' + userToken + "/" + id, option).then(() => {
		window.location.href = window.location.href.split("?")[0];
	});
}

function HomeRoutine() {
	getFromDB("Books", "* FROM Books WHERE reading = 1").then(async (resa) => {
		let TheBookun = JSON.parse(resa);
		console.log(TheBookun);
		for (let i = 0; i < TheBookun.length; i++) {
			let TheBook = TheBookun[i];
			let carddiv = createCard(TheBook["unread"], TheBook["read"], TheBook["reading"], TheBook["ID_book"], TheBook["URLCover"], TheBook["NOM"], TheBook["favorite"])
			carddiv.querySelector(".card__play").addEventListener("click", function () {
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
			const element = document.getElementById("continueReadingHome");
			const divrating = document.createElement("div");
			carddiv.appendChild(divrating);
			element.appendChild(carddiv);
		}
		if (TheBookun.length === 0) {
			const element = document.getElementById("continueReadingHome");
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !<br/>Open a new book or try one of those below.";
			element.appendChild(node);
		}
	});
	getFromDB("Books", "* FROM Books ORDER BY ID_book DESC LIMIT 10").then((resa) => {
		let TheBookun = JSON.parse(resa);
		console.log(TheBookun);
		const element = document.getElementById("recentlyAdded");
		for (let i = 0; i < TheBookun.length; i++) {
			let TheBook = TheBookun[i];
			let carddiv = createCard(TheBook["unread"], TheBook["read"], TheBook["reading"], TheBook["ID_book"], TheBook["URLCover"], TheBook["NOM"], TheBook["favorite"])
			carddiv.querySelector(".card__play").addEventListener("click", function () {
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
		if (TheBookun.length === 0) {
			const element = document.getElementById("recentlyAdded");
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !";
			element.appendChild(node);
		}
	});
	getFromDB("Books", "* FROM Books WHERE unread = 1").then(async (resa) => {
		let TheBookun = JSON.parse(resa);
		for (let i = 0; i < TheBookun.length; i++) {
			let TheBook = TheBookun[i];
			let carddiv = createCard(TheBook["unread"], TheBook["read"], TheBook["reading"], TheBook["ID_book"], TheBook["URLCover"], TheBook["NOM"], TheBook["favorite"])
			carddiv.querySelector(".card__play").addEventListener("click", function () {
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
			const element = document.getElementById("toRead");
			const divrating = document.createElement("div");
			carddiv.appendChild(divrating);
			element.appendChild(carddiv);
		}
		if (TheBookun.length === 0) {
			const element = document.getElementById("toRead");
			let node = document.createElement("p");
			node.innerHTML = "Nothing to display here !<br/>Look's like you read all your books. Consider to import new ones!";
			element.appendChild(node);
		}
	});
	getFromDB("Books", "* FROM Books WHERE favorite = 1").then(async (resa) => {
		let TheBookun = JSON.parse(resa);
		console.log(TheBookun);
		for (let i = 0; i < TheBookun.length; i++) {
			let TheBook = TheBookun[i];
			let carddiv = createCard(TheBook["unread"], TheBook["read"], TheBook["reading"], TheBook["ID_book"], TheBook["URLCover"], TheBook["NOM"], TheBook["favorite"])
			carddiv.querySelector(".card__play").addEventListener("click", function () {
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
			const element = document.getElementById("myfavoriteHome");
			const divrating = document.createElement("div");
			carddiv.appendChild(divrating);
			element.appendChild(carddiv);
		}
		if (TheBookun.length === 0) {
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
	document.getElementById('home').innerHTML = "    <p>Continue reading : </p>\n" + "    <div id=\"continueReadingHome\"></div>\n" + "    <p>My favorites : </p>\n" + "    <div id=\"myfavoriteHome\"></div>\n" + "    <p>Recently added : </p>\n" + "    <div id=\"recentlyAdded\"></div>\n" + "    <p>To read : </p>\n" + "    <div id=\"toRead\"></div>\n";
	HomeRoutine();
	document.getElementById('home').style.display = 'block';
	document.getElementById('home').style.fontSize = '16px';
	resetOverlay();
	let breadCrumb = document.querySelector(".breadcrumb");
	/* Delete all childs after this one */
	while (breadCrumb.lastChild !== breadCrumb.childNodes[1]) {
		breadCrumb.removeChild(breadCrumb.lastChild);
	}
}

theSearchList = [];
getFromDB("Books", "NOM,PATH,URLCover,Series FROM Books").then(async (resa) => {
	resa = JSON.parse(resa);
	for (let i = 0; i < resa.length; i++) {
		theSearchList.push(resa[i]);
	}
});
getFromDB("Series", "title,cover,PATH FROM Series").then(async (resa) => {
	resa = JSON.parse(resa);
	for (let i = 0; i < resa.length; i++) {
		theSearchList.push(resa[i]);
	}
});

async function setSearch(res) {
	for (const key in res) {
		const resItem = document.createElement("li");
		resItem.classList.add("resItem");
		let text = document.createElement("span");
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
					if (res[key].series != null && res[key].series !== "null") {
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
		img.style.width = "135px";
		img.style.display = "inline";
		resItem.appendChild(img);
		resItem.appendChild(text);
		let separator = document.createElement("span")
		separator.innerHTML = " in "
		if (series.innerHTML !== "") resItem.appendChild(separator)
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
					if (provider === 1) {
						await createSeries(provider, result, libPath, bookList);
					} else if (provider === 2) {
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
	if (res.length === 0) {
		const resItem = document.createElement("li");
		resItem.classList.add("resItem");
		const text = document.createTextNode("No results found");
		resItem.appendChild(text);
		document.getElementById("searchResults").appendChild(resItem);
	}
}

/**
 * Resolve the title of a book
 * @param {string} title - The title of the book
 * @returns {string} - The resolved title
 */
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

async function GETMARVELAPI_SEARCH(name = "", date = "") {
	return fetch("http://" + domain + ":" + port + "/api/marvel/searchonly/" + name + "/" + date).then(function (response) {
		return response.text();
	}).then(function (data) {
		console.log(data);
		data = JSON.parse(data);
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

async function GETMARVELAPI_Comics(name = "", date = "") {
	name = encodeURIComponent(name);
	date = encodeURIComponent(date);
	return fetch("http://" + domain + ":" + port + "/api/marvel/getComics/" + name + "/" + date).then(function (response) {
		return response.text();
	}).then(function (data) {
		data = JSON.parse(data);
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

async function GETMARVELAPI_Comics_INSERT(name = "", date = "",path) {

	return fetch("http://" + domain + ":" + port + "/insert/marvel/book/",{
		method:"GET",
		headers: {
			'Content-Type': 'application/json',
			"name":name,
			"datea":date,
			"path":path,
			"token":userToken
		}
	}).then(function (response) {
		return response.text();
	}).then(function (data) {
		console.log(data);
		data = JSON.parse(data);
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

async function createSeries(provider, path, libraryPath, res) {
	resetOverlay();
	console.log(provider);
	document.documentElement.style.overflow = "hidden";
	addToBreadCrumb(resolveTitle(res[0].title), () => {
		return createSeries(provider, path, libraryPath, res);
	});
	let APINOTFOUND = /[a-zA-Z]/g.test(res[0].ID_Series);
	document.getElementById('bookEdit').style.display = "none";
	document.getElementById('seriesEdit').style.display = "block";
	document.querySelectorAll("#seriesEdit>label>input").forEach((e) => {
		e.value = res[0][e.id.replaceAll("edit_", "")];
	})
	document.querySelectorAll("#commonEdit>label>input").forEach((e) => {
		e.value = res[0][e.id.replaceAll("edit_", "")];
	})
	document.getElementById("sendEdit").onclick = async () => {
		let values = [];
		let columns = [];
		document.querySelectorAll("#commonEdit>label>input").forEach((e) => {
			values.push(e.value)
			columns.push(e.id.replaceAll("edit_", ""))
		})
		document.querySelectorAll("#seriesEdit>label>input").forEach((e) => {
			values.push(e.value)
			columns.push(e.id.replaceAll("edit_", ""))
		})
		values.push(document.getElementById("lockCheck").checked);
		columns.push("lock");
		await fetch("http://" + domain + ":" + port + "/DB/update", {
			method: "POST", headers: {
				"Content-Type": "application/json"
			}, body: JSON.stringify({
				"token": userToken,
				"table": "Series",
				"type": "edit",
				"column": columns,
				"whereEl": res[0].PATH,
				"value": values,
				"where": "PATH"
			}, null, 2)
		})
	}
	let isLocked = () => {
		return res[0].lock === 1 || res[0].lock === true;
	}
	document.getElementById("rematchSearchSender").onclick = () => {
		let rematchResult = document.getElementById("resultRematch")
		let search = document.getElementById("rematchSearch")
		let year = document.getElementById('rematchYearSearch')
		if (provider === 1) {
			GETMARVELAPI_SEARCH(search.value, year.value).then((cdata) => {
				if (cdata["data"]["total"] > 0) {
					for (let i = 0; i < cdata["data"]["total"]; i++) {
						let cdataI = cdata["data"]["results"][i];
						let l = createCard(null, null, null, cdataI["id"], cdataI["thumbnail"].path + "/detail." + cdataI["thumbnail"].extension, cdataI['title'])
						l.addEventListener("click", () => {
							rematch(cdataI.id + "_" + provider, provider, "Series", res[0].ID_Series, true)
						})
						rematchResult.appendChild(l);
					}
				}
			})
		} else if (provider === 2) {
			API_ANILIST_GET_SEARCH(search.value).then((el) => {
				if (el != null) {
					el=el.base;
					for (let o = 0; o < el.length; o++) {
						let l = createCard(null, null, null, el[o].id, el[o].coverImage.large, el[o].title.english+" / "+el[o].title.romaji+" / "+el[o].title.native)
						l.addEventListener("click", () => {
							rematch(el[o].id + "_" + provider, provider, "Series", res[0].ID_Series, true)
						})
						rematchResult.appendChild(l);
					}
				}
			})
		} else if (provider === 0) {
		} else {
		}
		//fetch API
		//return results to DIV#Result
		//Chaque result to conduire vers rematch()
	}
	document.getElementById("lockCheck").checked = res[0].lock;
	document.getElementById('refresh').onclick = async () => {
		if (!isLocked()) {
			await refreshMeta(res[0].ID_Series, provider, "series");
		} else {
			Toastifycation("This series is locked", "#ff0000");
		}
	}
	if (!APINOTFOUND) {
		document.getElementById("provider_text").innerHTML = ((provider === 1) ? ("Data provided by Marvel. © 2014 Marvel") : ((provider === 2) ? ("Data provided by Anilist.") : ("The Data are not provided by an API.")));
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
		if (res[0].BG != null && res[0].BG !== "null" && res[0].BG !== "") {
			const options = {
				method: "GET", headers: {
					"Content-Type": "application/json",
					"img": ((provider === 1) ? (JSON.parse(res[0].BG).path + "/detail." + JSON.parse(res[0].BG).extension) : (res[0].BG))
				}
			};
			await fetch("http://" + domain + ":" + port + "/img/getPalette/" + userToken, options).then(function (response) {
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
		if (res[0].BG != null && res[0].BG !== "null" && res[0].BG !== "") {
			const options = {
				method: "GET", headers: {
					"Content-Type": "application/json", "img": res[0].BG
				}
			};
			await fetch("http://" + domain + ":" + port + "/img/getPalette/" + userToken, options).then(function (response) {
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
		document.getElementById("ColTitle").innerHTML = "<a target='_blank' href='" + ((provider === 1) ? (JSON.parse(res[0].SOURCE).url) : (res[0].SOURCE)) + "' style='color:white'>" + ((provider === 1) ? (JSON.parse(res[0].title)) : (JSON.parse(res[0].title).english + " / " + JSON.parse(res[0].title).romaji + " / " + JSON.parse(res[0].title).native)) + "<i style='font-size: 18px;top: -10px;position: relative' class='material-icons'>open_in_new</i></a>";
		document.getElementById("ImgColCover").src = ((provider === 1) ? (JSON.parse(res[0].cover).path + "/detail." + JSON.parse(res[0].cover).extension) : (res[0].cover));
		if (((provider === 1) ? (JSON.parse(res[0].start_date)) : (JSON.parse(res[0].start_date).year)) == null) {
			document.getElementById("startDate").innerHTML = "?";
		} else {
			document.getElementById("startDate").innerHTML = ((provider === 1) ? (JSON.parse(res[0].start_date)) : (JSON.parse(res[0].start_date).year));
		}
		if (((provider === 1) ? (JSON.parse(res[0].end_date)) : (JSON.parse(res[0].end_date).year)) == null || JSON.parse(res[0].end_date) > new Date().getFullYear()) {
			document.getElementById("startDate").innerHTML += " - ?";
		} else {
			document.getElementById("startDate").innerHTML += " - " + ((provider === 1) ? (JSON.parse(res[0].end_date)) : (JSON.parse(res[0].end_date).year));
		}
		let NameToFetchList = [];
		if (provider === 1) {
			JSON.parse(res[0].CHARACTERS)["items"].forEach((el) => {
				NameToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		} else if (provider === 2) {
			JSON.parse(res[0].CHARACTERS).forEach((el) => {
				NameToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		}
		let NameToFetch = NameToFetchList.join(",");
		let container = document.createElement("div");
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
					if (provider === 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider === 2) {
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
				if (provider === 1) {
					divs2.innerHTML += "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span>";
				} else if (provider === 2) {
					divs2.innerHTML += "<img src='" + el.image.replaceAll('"', '') + "' class='img-charac'/><br><span>" + el.name + "</span>";
				}
				divs.appendChild(divs2);
				divs2.style.marginTop = "10px";
				divs2.style.textAlign = "center";
				divs.style.marginLeft = "10px";
				container.appendChild(divs);
			});
		});
		document.getElementById("characters").innerHTML = "<h1>" + "Characters" + ":</h1> " + "Number of characters : " + ((provider === 1) ? (JSON.parse(res[0].CHARACTERS)["available"]) : (JSON.parse(res[0].CHARACTERS).length)) + "<br/>";
		let scrollCharactersAmount = 0;
		let moveRight = document.createElement("button");
		moveRight.className = "scrollBtnR";
		moveRight.onclick = function () {
			container.scrollTo({
				left: Math.max(scrollCharactersAmount += 140, container.clientWidth), behavior: "smooth"
			});
		};
		moveRight.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft = document.createElement("button");
		moveLeft.className = "scrollBtnL";
		moveLeft.onclick = function () {
			container.scrollTo({
				left: Math.min(scrollCharactersAmount -= 140, 0), behavior: "smooth"
			});
		};
		moveLeft.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("characters").appendChild(moveLeft);
		document.getElementById("characters").appendChild(moveRight);
		document.getElementById("characters").appendChild(container);
		document.getElementById("OtherTitles").innerHTML = ((provider === 1) ? ("A few comics in this series (for a complete view check the Marvel's website)") : ("Relations")) + " : ";
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
					if (provider === 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider === 2) {
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
				imgcard.src = ((provider === 1) ? (JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension) : (el.image));
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
		let tmpstaff = "Number of people : " + ((provider === 1) ? (JSON.parse(res[0].STAFF)["available"]) : (JSON.parse(res[0].STAFF).length)) + "<br/>";
		let StaffToFetchList = [];
		if (provider === 1) {
			JSON.parse(res[0].STAFF)["items"].forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		} else if (provider === 2) {
			JSON.parse(res[0].STAFF).forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		}
		let StaffToFetch = StaffToFetchList.join(",");
		let container2 = document.createElement("div");
		await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
			clres = JSON.parse(clres);
			container2.className = "item-list";
			for (let i = 0; i < clres.length; i++) {
				let el = clres[i];
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
					if (provider === 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider === 2) {
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
				for (let j = 0; j < clres.length; j++) {
					if (provider === 1) {
						if (el.name === JSON.parse(res[0]["STAFF"])["items"][j].name) {
							divs2.innerHTML += "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span><br/><span style='font-size: 14px;color: #a8a8a8a8'>" + JSON.parse(res[0]["STAFF"])["items"][j]["role"] + "</span>";
						}
					} else if (provider === 2) {
						if (el.name === JSON.parse(res[0]["STAFF"])[j].name) {
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
				left: Math.max(scrollStaffAmount += 140, container2.clientWidth), behavior: "smooth"
			});
		};
		moveRight2.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft2 = document.createElement("button");
		moveLeft2.className = "scrollBtnL";
		moveLeft2.onclick = function () {
			container2.scrollTo({
				left: Math.min(scrollStaffAmount += 140, 0), behavior: "smooth"
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
		document.getElementById("chapters").innerHTML = ((provider === 1) ? ("Number of Comics in this series : ") : ("Number of chapter in this series : ")) + res[0]["chapters"];
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
		for (let i = 0; i < bookList.length; i++) {
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
		if (currentFav === 1) {
			Toastifycation("Removed from favorite", "#00C33C");
			currentFav = 0;
			await getFromDB("Series", "* FROM Series WHERE favorite=1").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (let i = 0; i < bookList.length; i++) {
					if (res[0].title === bookList[i].title) {
						let options = {
							method: "POST", headers: {
								"Content-Type": "application/json"
							}, body: JSON.stringify({
								"token": userToken,
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
				for (let i = 0; i < bookList.length; i++) {
					if (res[0].title === bookList[i].title) {
						let options = {
							method: "POST", headers: {
								"Content-Type": "application/json"
							}, body: JSON.stringify({
								"token": userToken,
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
		if (provider === 1) {
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
			} else if (JSON.parse(res[0].start_date) === new Date().getFullYear()) {
				document.getElementById("Status").innerHTML = "END SOON";
				document.getElementById("Status").className = "releasing";
			} else {
				document.getElementById("Status").innerHTML = "UNKNOWN";
				document.getElementById("Status").className = "NotYet";
			}
		} else if (provider === 2) {
			loadView(path, libraryPath, "", provider);
			document.getElementById("description").innerHTML = res[0].description;
			document.getElementById("genres").innerHTML = "Genres " + ":";
			JSON.parse(res[0].genres).forEach((el, index) => {
				if (index !== JSON.parse(res[0].genres).length - 1) {
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
			if (res[0]["statut"] === "RELEASING") {
				document.getElementById("Status").className = "releasing";
			} else if (res[0]["statut"] === "FINISHED") {
				document.getElementById("Status").className = "released";
			} else if (res[0]["statut"] === "Not_YET_RELEASED") {
				document.getElementById("Status").className = "NotYet";
			}
		}
	} else {
		if (provider === 1) {
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
				} else if (JSON.parse(res[0].start_date) === new Date().getFullYear()) {
					document.getElementById("Status").innerHTML = "END SOON";
					document.getElementById("Status").className = "releasing";
				} else {
					document.getElementById("Status").innerHTML = "UNKNOWN";
					document.getElementById("Status").className = "NotYet";
				}
			}
		} else if (provider === 2) {
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
					el.style.strokeDashoffset = Math.abs(100);
				});
				document.documentElement.style.setProperty('--averageScore', Math.abs(100));
			}
			document.getElementById("Status").innerHTML = ((res[0]["statut"] == null) ? "UNKNOWN" : res[0]["statut"]);
			if (res[0]["statut"] === "RELEASING") {
				document.getElementById("Status").className = "releasing";
			} else if (res[0]["statut"] === "FINISHED") {
				document.getElementById("Status").className = "released";
			} else if (res[0]["statut"] === "Not_YET_RELEASED") {
				document.getElementById("Status").className = "NotYet";
			} else {
				document.getElementById("Status").className = "NotYet";
			}
		}
	}
	if (res[0].favorite === 1) {
		document.getElementById("Status").innerHTML += " (Favorite)";
		document.getElementById("Status").classList.add("favorite");
	}
}

function OneForAll(W1, W2, A, title) {
	fetch("http://" + domain + ":" + port + "/DB/update/OneForAll", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			"W1": W1,
			"W2": W2,
			"A": A,
			"title": title,
			"token": userToken,
		})
	})
}

/**
 *
 * @param W1
 * @param W2
 * @param A
 * @param ID
 * @constructor
 */
function AllForOne(W1, W2, A, ID) {
	let asso = {}
	asso[A] = true;
	asso[W1] = false
	asso[W2] = false;
	let columns = [];
	let values = [];
	for (let key in asso) {
		columns.push(key);
		values.push(asso[key]);
	}
	let options = {
		method: "POST", headers: {
			"Content-Type": "application/json"
		}, body: JSON.stringify({
			"token": userToken,
			"table": "Books",
			"type": "edit",
			"column": columns,
			"whereEl": ID,
			"value": values,
			"where": "ID_book"
		}, null, 2)
	};
	fetch("http://" + domain + ":" + port + "/DB/update", options);
}

addToBreadCrumb("Home", () => {
	returnToHome();
});

/**
 * Launch the metadata refresh
 * @param {*} id The ID in the DB of the element to refresh
 * @param {int} provider The provider of the element to refresh
 * @param {string} type The type of the element to refresh
 */
async function refreshMeta(id, provider, type) {
	console.log("Refreshing metadata for " + id + " from " + provider + " (" + type + ")");
	Toastifycation("Refreshing metadata...");
	fetch("http://" + domain + ":" + port + "/refreshMeta", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			"id": id,
			"provider": provider,
			"type": type,
			"token": userToken
		})
	}).then((res) => {
		Toastifycation("Metadata updated");
	})
}

document.getElementById("rematch").setAttribute("data-bs-toggle", "modal");
document.getElementById("rematch").setAttribute("data-bs-target", "#rematchModal");

/**
 *
 * @param {{}} TheBook
 * @param provider
 * @return {Promise<void>}
 */
async function createDetails(TheBook, provider) {
	resetOverlay();
	document.documentElement.style.overflow = "hidden";
	console.log(provider);
	console.log(TheBook);
	document.getElementById('bookEdit').style.display = "block";
	document.getElementById('seriesEdit').style.display = "none";
	document.querySelectorAll("#commonEdit>label>input").forEach((e) => {
		e.value = TheBook[e.id.replaceAll("edit_", "")];
	})
	document.querySelectorAll("#bookEdit>label>input").forEach((e) => {
		e.value = TheBook[e.id.replaceAll("edit_", "")];
	})
	let isLocked = () => {
		return TheBook.lock === 1 || TheBook.lock === true;
	}
	document.getElementById("rematchSearchSender").onclick = () => {
		let rematchResult = document.getElementById("resultRematch")
		let search = document.getElementById("rematchSearch");
		let year = document.getElementById('rematchYearSearch')
		if (provider === 1) {
			GETMARVELAPI_Comics(search.value, year.value).then((cdata) => {
				if (cdata["data"]["total"] > 0) {
					for (let i = 0; i < cdata["data"]["total"]; i++) {
						let cdataI = cdata["data"]["results"][i];
						let l = createCard(null, null, null, cdataI["id"], cdataI["thumbnail"].path + "/detail." + cdataI["thumbnail"].extension, cdataI['title'])
						l.addEventListener("click", () => {
							rematch(cdataI.id + "_" + provider, provider, "book", TheBook.ID_book, false)
						})
						rematchResult.appendChild(l);
					}
				}
			})
		} else if (provider === 2) {
		} else if (provider === 0) {
		} else {
		}
		//fetch API
		//return results to DIV#Result
		//Chaque result to conduire vers rematch()
	}
	document.getElementById("lockCheck").checked = isLocked();
	document.getElementById('refresh').onclick = async () => {
		if (provider === 2) {
			Toastifycation("Anilist is not compatible for this feature", "#ff0000")
		} else {
			if (!isLocked()) {
				await refreshMeta(TheBook.ID_book, provider, "book");
			} else {
				Toastifycation("This book is locked", "#ff0000");
			}
		}
	}
	document.getElementById("sendEdit").onclick = async () => {
		let values = [];
		let columns = [];
		document.querySelectorAll("#commonEdit>label>input").forEach((e) => {
			values.push(e.value.replaceAll("'","''").replaceAll('"',"'"));
			columns.push(e.id.replaceAll("edit_", ""))
		})
		document.querySelectorAll("#bookEdit>label>input").forEach((e) => {
			values.push(e.value.replaceAll("'","''").replaceAll('"',"'"))
			columns.push(e.id.replaceAll("edit_", ""))
		})
		values.push(document.getElementById("lockCheck").checked);
		columns.push("lock");
		await fetch("http://" + domain + ":" + port + "/DB/update", {
			method: "POST", headers: {
				"Content-Type": "application/json"
			}, body: JSON.stringify({
				"token": userToken,
				"table": "Books",
				"type": "edit",
				"column": columns,
				"whereEl": TheBook.PATH,
				"value": values,
				"where": "PATH"
			}, null, 2)
		})
	}
	addToBreadCrumb(TheBook.NOM, () => {
		return createDetails(TheBook, provider);
	});
	document.getElementById("provider_text").innerHTML = ((provider === 1) ? ("Data provided by Marvel. © 2014 Marvel") : ((provider === 2) ? ("Data provided by Anilist.") : ("The Data are not provided by an API.")));
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
	if (TheBook.characters !== "null") {
		document.getElementById("id").innerHTML = "This is a " + TheBook.format + " of " + TheBook.pageCount + " pages. <br/> This is part of the '" + JSON.parse(TheBook.series).name + "' series.";
	} else {
		if (provider === 2) {
			document.getElementById("id").innerHTML = "This is part of the '" + TheBook.series.split("_")[2].replaceAll("$", " ") + "' series.";
		} else if (provider === 1) {
			document.getElementById("id").innerHTML = "This is part of the '" + JSON.parse(TheBook.series).name + "' series.";
		}
	}
	document.getElementById("averageProgress").style.display = "none";
	document.getElementById("ContentView").innerHTML = "";
	try {
		if (provider === 1) {
			document.getElementById("ColTitle").innerHTML = "<a target='_blank' href='" + ((TheBook.URLs == null) ? ("#") : (JSON.parse(TheBook.URLs)[0].url)) + "' style='color:white'>" + TheBook.NOM + "<i style='font-size: 18px;top: -10px;position: relative' class='material-icons'>open_in_new</i></a>";
		} else if (provider === 2) {
			document.getElementById("ColTitle").innerHTML = "<a target='_blank' style='color:white'>" + TheBook.NOM + "</a>";
		} else {
			document.getElementById("ColTitle").innerHTML = "<a target='_blank' style='color:white'>" + TheBook.NOM + "</a>";
		}
	} catch (e) {
		document.getElementById("ColTitle").innerHTML = "<a target='_blank' style='color:white'>" + TheBook.NOM + "</a>";
	}
	if (TheBook.URLCover.includes("public/FirstImagesOfAll")) {
		document.getElementById("ImgColCover").src = TheBook.URLCover.split("public/")[1];
	} else {
		document.getElementById("ImgColCover").src = TheBook.URLCover;
	}
	document.getElementById("Status").innerHTML = "";
	if (TheBook.description != null && TheBook.description !== "null") {
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
	if (TheBook.URLCover != null && TheBook.URLCover !== "null") {
		const options = {
			method: "GET", headers: {
				"Content-Type": "application/json", "img": TheBook.URLCover
			}
		};
		await fetch("http://" + domain + ":" + port + "/img/getPalette/" + userToken, options).then(function (response) {
			return response.text();
		}).then(function (data) {
			let Blurcolors = data;
			setTimeout(function () {
				document.documentElement.style.setProperty("--background", Blurcolors.toString());
			}, 500);
		});
	}
	document.getElementById("favoritebtn").addEventListener("click", async function (e) {
		if (TheBook.favorite === 1) {
			TheBook.favorite = 0;
			Toastifycation("Removed from favorite", "#00C33C");
			await getFromDB("Books", "* FROM Books WHERE favorite=1").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (let i = 0; i < bookList.length; i++) {
					if (bookList[i].PATH.toLowerCase().includes(TheBook.NOM.toLowerCase().replaceAll('"', ''))) {
						let options = {
							method: "POST", headers: {
								"Content-Type": "application/json"
							}, body: JSON.stringify({
								"token": userToken,
								"table": "Books",
								"column": "favorite",
								"whereEl": bookList[i].PATH,
								"value": false,
								"where": "PATH"
							}, null, 2)
						};
						await fetch("http://" + domain + ":" + port + "/DB/update", options);
					}
				}
			});
		} else {
			TheBook.favorite = 1;
			Toastifycation("Set as favorite", "#00C33C");
			await getFromDB("Books", "* FROM Books WHERE favorite=0").then(async (resa) => {
				let bookList = JSON.parse(resa);
				console.log(bookList);
				for (let i = 0; i < bookList.length; i++) {
					if (bookList[i].PATH.toLowerCase().includes(TheBook.NOM.toLowerCase().replaceAll('"', ''))) {
						let options = {
							method: "POST", headers: {
								"Content-Type": "application/json"
							}, body: JSON.stringify({
								"token": userToken,
								"table": "Books",
								"column": "favorite",
								"whereEl": bookList[i].PATH,
								"value": true,
								"where": "PATH"
							}, null, 2)
						};
						await fetch("http://" + domain + ":" + port + "/DB/update", options);
					}
				}
			});
		}
	});
	if (TheBook.characters !== "null") {
		let NameToFetchList = [];
		if (provider === 1) {
			JSON.parse(TheBook.characters)["items"].forEach((el) => {
				NameToFetchList.push("'" + el.name + "'");
			});
		} else if (provider === 2) {
			JSON.parse(TheBook.characters).forEach((el) => {
				NameToFetchList.push("'" + el.name + "'");
			});
		}
		let NameToFetch = NameToFetchList.join(",");
		let container = document.createElement("div");
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
					if (provider === 1) {
						document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
						document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
						if (desc == null) {
							document.getElementById("moreinfo_txt").innerHTML = name;
						} else {
							document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
						}
					} else if (provider === 2) {
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
				if (provider === 1) {
					divs2.innerHTML = "<img alt='a character' src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span>";
				} else if (provider === 2) {
					divs2.innerHTML = "<img alt='a character' src='" + el.image.replaceAll('"', '') + "' class='img-charac'/><br><span>" + el.name + "</span>";
				}
				divs.appendChild(divs2);
				divs2.style.marginTop = "10px";
				divs2.style.textAlign = "center";
				divs.style.marginLeft = "10px";
				container.appendChild(divs);
			});
		});
		if (TheBook.read === 1) {
			document.getElementById("Status").innerHTML = "READ";
			document.getElementById("Status").className = "released";
		} else if (TheBook.unread === 1) {
			document.getElementById("Status").innerHTML = "UNREAD";
			document.getElementById("Status").className = "NotYet";
		} else if (TheBook.reading === 1) {
			document.getElementById("Status").innerHTML = "READING";
			document.getElementById("Status").className = "releasing";
		}
		if (TheBook.favorite === 1) {
			document.getElementById("Status").innerHTML += "(Favorite)";
		}
		document.getElementById("readstat").innerHTML = "<input type=\"number\" step=\"1\" min=\"0\" id=\"readAddInput\">" + " / " + TheBook.pageCount + " pages read";
		document.getElementById("readAddInput").value = TheBook.last_page;
		document.getElementById("readAddInput").max = TheBook.pageCount;
		document.getElementById("readAddInput").addEventListener("change", async function (e) {
			let options = {
				method: "POST", headers: {
					"Content-Type": "application/json"
				}, body: JSON.stringify({
					"token": userToken,
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
		document.getElementById("characters").innerHTML = "<h1>" + "Characters" + ":</h1> " + "Number of characters : " + ((provider === 1) ? (JSON.parse(TheBook.characters)["available"]) : ((TheBook.characters !== "null") ? (JSON.parse(TheBook.characters).length) : (0))) + "<br/>";
		document.getElementById("detailSeparator").style.marginTop = "5vh";
		let scrollCharactersAmount = 0;
		let moveRight = document.createElement("button");
		moveRight.className = "scrollBtnR";
		moveRight.onclick = function () {
			container.scrollTo({
				left: Math.max(scrollCharactersAmount += 140, container.clientWidth), behavior: "smooth"
			});
		};
		moveRight.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft = document.createElement("button");
		moveLeft.className = "scrollBtnL";
		moveLeft.onclick = function () {
			container.scrollTo({
				left: Math.min(scrollCharactersAmount -= 140, 0), behavior: "smooth"
			});
		};
		moveLeft.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("characters").appendChild(moveLeft);
		document.getElementById("characters").appendChild(moveRight);
		document.getElementById("characters").appendChild(container);
	}
	//Genres
	if (TheBook.creators !== "null") {
		let tmpstaff = "Number of people : " + ((provider === 1) ? (JSON.parse(TheBook["creators"])["available"]) : ((TheBook["creators"] !== "null") ? (JSON.parse(TheBook["creators"]).length) : ("0"))) + "<br/>";
		let StaffToFetchList = [];
		if (provider === 1) {
			JSON.parse(TheBook.creators)["items"].forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		} else if (provider === 2) {
			JSON.parse(TheBook.creators).forEach((el) => {
				StaffToFetchList.push("'" + el.name.replaceAll("'", "''") + "'");
			});
		}
		let StaffToFetch = StaffToFetchList.join(",");
		let container2 = document.createElement("div");
		await getFromDB("Creators", "* FROM Creators WHERE name IN (" + StaffToFetch + ")").then((clres) => {
			clres = JSON.parse(clres);
			container2.className = "item-list";
			for (let i = 0; i < clres.length; i++) {
				let el = clres[i];
				const divs = document.createElement("div");
				const divs2 = document.createElement("div");
				for (let j = 0; j < clres.length; j++) {
					if (provider === 1) {
						if (el.name === JSON.parse(TheBook.creators)["items"][j].name) {
							divs2.innerHTML = "<img src='" + JSON.parse(el.image).path + "/detail." + JSON.parse(el.image).extension + "' class='img-charac'/><br><span>" + el.name + "</span><br/><span style='font-size: 14px;color: #a8a8a8a8'>" + JSON.parse(TheBook.creators)["items"][j]["role"] + "</span>";
						}
					} else if (provider === 2) {
						if (el.name === JSON.parse(TheBook.creators)[j].name) {
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
						if (provider === 1) {
							document.getElementById("moreinfo_img").src = JSON.parse(image).path + "/detail." + JSON.parse(image).extension;
							document.getElementById("moreinfo_btn").href = JSON.parse(urlo)[0].url;
							if (desc == null) {
								document.getElementById("moreinfo_txt").innerHTML = name;
							} else {
								document.getElementById("moreinfo_txt").innerHTML = name + "<br/>" + desc;
							}
						} else if (provider === 2) {
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
				left: Math.max(scrollStaffAmount += 140, container2.clientWidth), behavior: "smooth"
			});
		};
		moveRight2.innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
		let moveLeft2 = document.createElement("button");
		moveLeft2.className = "scrollBtnL";
		moveLeft2.onclick = function () {
			container2.scrollTo({
				left: Math.min(scrollStaffAmount += 140, 0), behavior: "smooth"
			});
		};
		moveLeft2.innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
		document.getElementById("Staff").appendChild(moveLeft2);
		document.getElementById("Staff").appendChild(moveRight2);
		document.getElementById("Staff").appendChild(container2);
	}
	if (TheBook.collectedIssues !== "null") {
		for (let a = 0; a < JSON.parse(TheBook.collectedIssues).length; a++) {
			document.getElementById("colissue").innerHTML += JSON.parse(TheBook.collectedIssues)[a].name + "<br/>";
		}
	}
	if (TheBook.collections !== "null") {
		for (let a = 0; a < JSON.parse(TheBook.collections).length; a++) {
			document.getElementById("col").innerHTML += JSON.parse(TheBook.collections)[a].name + "<br/>";
		}
	}
	if (TheBook.issueNumber !== "null" && TheBook.issueNumber !== "" && TheBook.issueNumber != null) {
		document.getElementById("chapters").innerHTML = "Number of this volume within the series : " + TheBook.issueNumber;
	} else {
		document.getElementById("chapters").innerHTML = "";
	}
	if (TheBook.prices !== "null" && TheBook.prices !== "" && TheBook.prices != null) {
		if (provider === 1) {
			document.getElementById("price").innerHTML += "Prices : <br/>";
			for (let a = 0; a < JSON.parse(TheBook.prices).length; a++) {
				console.log(JSON.parse(TheBook.prices)[a]);
				document.getElementById("price").innerHTML += JSON.parse(TheBook.prices)[a].type.replace(/([A-Z])/g, ' $1').trim() + " : " + JSON.parse(TheBook.prices)[a].price + "<br/>";
			}
		}
	}
	if (TheBook.dates !== "null") {
		document.getElementById("startDate").innerHTML = "Dates : <br/>";
		for (let b = 0; b < JSON.parse(TheBook.dates).length; b++) {
			document.getElementById("startDate").innerHTML += JSON.parse(TheBook.dates)[b].type.replace(/([A-Z])/g, ' $1').trim() + " : " + convertDate(JSON.parse(TheBook.dates)[b].date) + "<br/>";
		}
	}
	if (TheBook.variants !== "null" && TheBook.variants !== "" && TheBook.variants != null) {
		if (provider === 1) {
			createVariants(TheBook);
		}
	}
}

/* TODO ↑ CODE VERIFICATION ↑ */
/**
 * Create variants list
 * @param TheBook The book (Object from DB) to retrieve variants from
 */
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

/**
 * Create a card HTML element
 * @param {int | null} unread - 0 if read, 1 if unread
 * @param {int|null} read - 0 if unread, 1 if read
 * @param {int|null} reading - 0 if not reading, 1 if reading
 * @param {string|int} ID - ID of the book
 * @param {string} URLCover - URL of the cover
 * @param {string} NOM - Name of the book
 * @param {int|null} favorite  - 0 if not favorite, 1 if favorite
 * @return {HTMLDivElement} The card generated
 */
function createCard(unread, read, reading, ID, URLCover, NOM, favorite = 0) {
	/*document.getElementById("relations").appendChild(createCard(TheBook.unread,TheBook.read,TheBook.reading,TheBook.ID,TheBook.URLCover,TheBook.NOM));*/
	const carddiv = document.createElement("div");
	carddiv.style.cursor = "pointer";
	const rib = document.createElement("div");
	imagelink = URLCover;
	if (imagelink === "null" || imagelink === "" || imagelink == null) {
		imagelink = "Images/fileDefault.png";
	} else if (URLCover.includes("public/FirstImagesOfAll")) {
		imagelink = URLCover.split("public/")[1];
	}
	let node = document.createTextNode(NOM);
	if (unread !== null && read !== null && reading !== null) {
		if (unread === 1) {
			rib.className = "pointR";
		}
		if (reading === 1) {
			rib.className = "pointY";
		}
		if (favorite === 1) {
			rib.innerHTML = "<i class='material-icons' style='font-size: 16px;position: relative;left: -17px;'>favorite</i>";
		}
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
	buttonfav.id = "btn_id_fav_" + ID + "_" + Math.random() * 8000;
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
	button_unread.id = "btn_id_unread_" + ID + "_" + Math.random() * 8000;
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
	button_reading.id = "btn_id_reading_" + ID + "_" + Math.random() * 8000;
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
	button_read.id = "btn_id_read_" + ID + "_" + Math.random() * 8000;
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
	pcard_bio.style.textAlign = "center";
	pcard_bio.style.color = theme_FG;
	pcard_bio.innerHTML = node.textContent;
	bodycard.appendChild(pcard_bio);
	carddiv.appendChild(bodycard);
	carddiv.id = "id_vol" + ID + "_" + Math.random() * 8000;
	carddiv.appendChild(rib);
	return carddiv;
}

/**
 * Clear the list of results
 */
function clearList() {
	while (document.getElementById("searchResults").firstChild) {
		document.getElementById("searchResults").removeChild(document.getElementById("searchResults").firstChild);
	}
}

/**
 * On search results focused
 */
document.getElementById('searchField').addEventListener('focus', function (e) {
	document.getElementById('searchResults').style.display = 'block';
	setTimeout(function () {
		document.addEventListener('click', listenerClickSearch);
	}, 100);
});
/**
 * Search an element in the list of available items
 */
document.getElementById('searchField').addEventListener('input', function (e) {
	console.log(theSearchList);
	document.getElementById('searchResults').style.display = 'block';
	clearList();
	let value = e.target.value;
	if (value && value.trim().length > 0) {
		value = value.trim().toLowerCase();
		setSearch(theSearchList.filter(item => {
			if (item.NOM !== undefined) {
				return item.NOM.toLowerCase().includes(value);
			} else {
				return item.title.toLowerCase().includes(value);
			}
		})).then(r => {
		});
	} else {
		clearList();
	}
	document.addEventListener('click', listenerClickSearch);
});

/**
 * Custom Listeners for hdie the search results
 */
function listenerClickSearch() {
	document.getElementById("searchResults").style.display = "none";
	document.removeEventListener('click', listenerClickSearch);
}

/**
 * Download a book from the server
 * @param path the path of the book
 * @return {Promise<void>} the promise
 */
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

/**
 * Logout the user
 * @return {Promise<void>}
 */
async function logout() {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}
	};
	await fetch('http://' + domain + ":" + port + '/profile/logout/' + userToken, option).then(() => {
		window.location.href = 'login';
	});
}

/**
 * Template for the context menu
 * @param {{}} elements
 *
 */
function createContextMenu(elements = [{}]) {
	let ul = document.createElement("ul");
	for (let i = 0; i < elements.length; i++) {
		let el = elements[i];
		let liTemp = document.createElement("li")
		liTemp.innerHTML = el.nom;
		for (let elo in el.attribs) {
			liTemp.setAttribute(elo, el.attribs[elo]);
		}
		for (let elo in el.listeners) {
			liTemp.addEventListener(elo, el.listeners[elo]);
		}
		ul.appendChild(liTemp);
	}
	ul.className = "contextMenu";
	ul.style.right = "0.4vw";
	ul.style.display = "block";
	return ul;
}

/**
 * Spawn a context menu for account management
 *
 */
function AccountMenu() {
	let menu = createContextMenu(
		[{
			"nom": "Modify your account",
			"attribs": {
				"data-bs-toggle": "modal",
				"data-bs-target": "#modifAccount"
			},
			"listeners": {}
		},
			{
				"nom": "Create a new user",
				"attribs": {
					"data-bs-toggle": "modal",
					"data-bs-target": "#modifAccount"
				},
				"listeners": {
					"click": function () {
						document.getElementById("id_modifAccount").innerHTML = "Create a new user";
						document.getElementById("delaccount").style.display = "none";
						document.getElementById("sendbdd").style.display = "none";
						document.getElementById("sendaccount").onclick = async function () {
							console.log("sendaccount");
							await createAccount();
						};
					}
				}
			},
			{
				"nom": "Logout",
				"attribs": {},
				"listeners": {
					"click": function () {
						logout();
					}
				}
			},
		])
	document.body.appendChild(menu);
	menu.style.top = 70 + "px";
	menu.style.display = "flex";
	document.addEventListener("click", function (e) {
		if (e.target !== menu && e.target !== document.getElementById("id_accountSystem") && e.target !== document.getElementById("icon_id_accountSystem")) {
			document.body.removeChild(menu);
		}
	});
}

fetch("/profile/custo/getNumber").then((res) => {
	return res.json();
}).then((data) => {
	data = data.length;
	let temp = document.getElementsByTagName("template")[0];
	let item = temp.content.querySelector("img");
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

/**
 * Download the database
 */
function DownloadBDD() {
	window.open('http://' + domain + ":" + port + "/profile/DLBDD/" + userToken);
}

/**
 * Delete the account
 */
async function DeleteAccount() {
	const option = {
		method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
			"token": userToken
		}, null, 2)
	};
	fetch('http://' + domain + ":" + port + "/profile/deleteAccount", option).then(() => {
		Toastifycation("Account deleted", "#00C33C");
		console.log("account deleted !");
	}).catch((err) => {
		Toastifycation("Account not deleted", "#ff0000");
	});
	window.location.href = 'login';
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

/**
 * Create an account on the server
 */
async function createAccount() {
	if (!accountsNames.includes(document.getElementById("usernameManager").value.toLowerCase())) {
		const option = {
			method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
				"token": userToken,
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

/**
 * Change the element rating
 * @param table the table to update
 * @param where the where clause
 * @param value the new value
 */
function changeRating(table, where, value) {
	if (table === "Books") {
		console.log(table, value + " from Book");
		const options = {
			method: "POST", headers: {
				"Content-Type": "application/json"
			}, body: JSON.stringify({
				"token": userToken,
				"table": table,
				"column": "note",
				"whereEl": where,
				"value": value,
				"where": "ID_book"
			}, null, 2)
		};
		fetch("http://" + domain + ":" + port + "/DB/update", options);
	} else if (table === "Series") {
		console.log(table, value);
		const options = {
			method: "POST", headers: {
				"Content-Type": "application/json"
			}, body: JSON.stringify({
				"token": userToken,
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

document.getElementById("id_firstOfAll").addEventListener("click", function (e) {
	fetch("http://" + domain + ":" + port + "/fillBlankImage", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"token": userToken
		}, null, 2)
	}).then((res) => {
		Toastifycation("empty image ressources will be filled up", "#00C33C");
	})
})
