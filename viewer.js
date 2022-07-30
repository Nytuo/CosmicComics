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
const ValidatedExtension = [
	"cbr",
	"cbz",
	"pdf",
	"zip",
	"7z",
	"cb7",
	"rar",
	"tar",
	"cbt"
];
const ValidatedExtensionV = [
	"png",
	"jpg",
	"jpeg",
	"bmp",
	"apng",
	"svg",
	"ico",
	"webp",
	"gif"
];
var imagelink = "null";
var nabc = 0;
var toogleBGC = false;
var dirnameFE;
var CosmicComicsData = "C:/Users/Public/Cosmic-Comics/data";
var CosmicComicsTemp = "C:/Users/Public/Cosmic-Comics/data";
var CosmicComicsTempI = "C:/Users/Public/Cosmic-Comics/data";
var listofImg;
const url = document.createElement("a");
url.setAttribute("href", window.location.href);
var domain = url.hostname;
var port = url.port;
var currentUser = "";
var connected = getCookie("selectedProfile");
console.log(connected);

function setTheme(theme) {
	document.head.getElementsByTagName("link")[6].href = "/themes/" + theme;
}

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
fetch("http://" + domain + ":" + port + "/viewer/view/current/" + connected).then(
	(response) => {
		response.json().then((data) => {
				listofImg = data;
				console.log(listofImg);
			}
		).catch(function (error) {
			console.log(error);
		});
	}
);
fetch("http://" + domain + ":" + port + "/dirname").then(function (response) {
	return response.text();
}).then(function (data) {
	dirnameFE = data;
	CosmicComicsData = dirnameFE + "/CosmicComics_data";
	CosmicComicsTemp = dirnameFE + "/CosmicData";
	CosmicComicsTempI = CosmicComicsTemp + "/profiles/" + currentUser + "/current_book/";
	console.log(CosmicComicsTempI);
}).catch(function (error) {
	console.log(error);
});
var name1 = GetFilePath().split("/").pop();
console.log(name1);
var realname1 = name1.split(".")[0];
console.log(realname1);
var shortname = GetTheName(realname1);
console.log(shortname);
var rarlength = 0;
var Dpath = GetFilePath();
/*
var DPageTotal = GetListOfImg(CosmicComicsTempI).length;
*/
var DPageActu = 1;
var DoublePageMode = false;
var BlankFirstPage = false;
var DPMNoH = false;
var wasDPM = false;
var PPwasDPM = false;
var mangaMode = false;
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
		fetch("http://" + domain + ":" + port + "/lang/" + configlang).then(
			(response) => {
				response.json().then((datoo) => {
					console.log(datoo);
					language = datoo;
					//Languages for ToolTips and other things
					new bootstrap.Tooltip(document.getElementById("goback_id"), {
						title: language[0]["go_back"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("magnifier_id"), {
						title: language[0]["magnifier_toggle"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_gostart"), {
						title: language[0]["go_start"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_bookmenu"), {
						title: language[0]["book_settings"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_goprevious"), {
						title: language[0]["go_previous"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("nextpage"), {
						title: language[0]["go_next"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_goend"), {
						title: language[0]["go_end"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_mkread"), {
						title: language[0]["mkread"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_mkreading"), {
						title: language[0]["mkreading"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_mkunread"), {
						title: language[0]["mkunread"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_togglefav"), {
						title: language[0]["toogle_fav"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_fixheight"), {
						title: language[0]["fix_height"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_fixwidth"), {
						title: language[0]["fix_width"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_autobgcolor"), {
						title: language[0]["auto_bg_color"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_zoomin"), {
						title: language[0]["zoom_in"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_zoomout"), {
						title: language[0]["zoom_out"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_toogleBookMark"), {
						title: language[0]["Bookmark"],
						placement: "bottom"
					});
					(document.getElementById("id_magnifiermod").innerHTML =
						language[0]["magnifier_mod"]),
						(document.getElementById("zoomlvl").innerHTML = language[0]["zoom"]);
					document.getElementById("widthlvl").innerHTML = language[0]["width"];
					document.getElementById("heightlvl").innerHTML = language[0]["height"];
					document.getElementById("BGBTTXT").innerHTML =
						language[0]["background_by_theme"];
					document.getElementById("Radiuslvl").innerHTML = language[0]["radius"];
					new bootstrap.Tooltip(document.getElementById("magnifier_note"), {
						title: language[0]["magnifier_note"],
						placement: "bottom"
					});
					document.getElementById("id_spawnmagnifier").innerHTML =
						language[0]["spawn_magnifier"];
					document.getElementById("id_destroymagnifier").innerHTML =
						language[0]["destroy_magnifier"];
					document.getElementById("id_booksettings").innerHTML =
						language[0]["book_settings"];
					console.log(language[0]["book_settings"]);
					document.getElementById("DPMTXT").innerHTML = language[0]["double_page_mode"];
					document.getElementById("BPABTXT").innerHTML =
						language[0]["blank_at_beggining"];
					document.getElementById("NDPFHTXT").innerHTML =
						language[0]["no_dpm_horizontal"];
					document.getElementById("MMTXT").innerHTML = language[0]["manga_mode"];
					document.getElementById("SSTXT").innerHTML = language[0]["Slideshow"];
					document.getElementById("NBARTXT").innerHTML = language[0]["nobar"];
					document.getElementById("SSBTXT").innerHTML = language[0]["sideBar"];
					document.getElementById("PCTXT").innerHTML = language[0]["PageCount"];
					document.getElementById("VIVTXT").innerHTML = language[0]["vertical_reader"];
					document.getElementById("WTMTXT").innerHTML = language[0]["Webtoon_Mode"];
					document.getElementById("RZPSTXT").innerHTML = language[0]["reset_zoom"];
					document.getElementById("SBVSTXT").innerHTML = language[0]["scrollBar_visible"];
					document.getElementById("marginlvl").innerHTML = language[0]["margin"];
					document.getElementById("rotlvl").innerHTML = language[0]["rotation"];
					document.getElementById("zlvll").innerHTML = language[0]["zoomlvl"];
					document.getElementById("sstxt").innerHTML = language[0]["slideshow_interval"];
					document.getElementById("lsps").innerHTML = language[0]["page_slider"];
					document.getElementById("colorpicker_txt_id").innerHTML =
						language[0]["color_picker"];
					document.getElementById("close_id_books").innerHTML = language[0]["close"];
					new bootstrap.Tooltip(document.getElementById("id_rotateright"), {
						title: language[0]["rotate_right"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("id_rotateleft"), {
						title: language[0]["rotate_left"],
						placement: "bottom"
					});
					new bootstrap.Tooltip(document.getElementById("fullscreen_id"), {
						title: language[0]["full_screen"],
						placement: "bottom"
					});
				});
			}
		);
	});
}

var BGBT = false; // Background By Theme
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
//Send BE
//get language reference for the selected language
function lang(langg) {
	fetch("http://" + domain + ":" + port + "/lang/" + langg).then(
		(response) => {
			response.json().then((data) => {
				return data;
			});
		}
	);
}

//get element from config.json
function GetElFromInforPath(search, info) {
	for (var i in info) {
		if (i == search) {
			return info[i];
		}
	}
	return null;
}

function hasNumbers(t) {
	var regex = /\d/g;
	return regex.test(t);
}

//getting the ID of the book
function GetTheName(CommonName = "") {
	CommonName = decodeURIComponent(CommonName);
	CommonName = CommonName.replaceAll("-", " ");
	CommonName = CommonName.replaceAll(")", " ");
	CommonName = CommonName.replaceAll("(", " ");
	CommonName = CommonName.replaceAll("[", " ");
	CommonName = CommonName.replaceAll("]", " ");
	/* remove the extension using regex */
	CommonName = CommonName.replace(/\.[^/.]+$/, "");
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

//Theme set up
var theme_BG = "#181818";
var theme_FG = "white";
var theme_BG_CI = "rgba(0,0,0,0.753)";
var currenttheme;
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

function Themes() {
	if (currenttheme != "[DEFAULT] - Default.json") {
		if (currenttheme == "[EVENT] - Halloween.json") {
			document.getElementById("logo_id").src = "Images/Logo_h.png";
		} else if (currenttheme == "[EVENT] - X-Mas.json") {
			document.getElementById("logo_id").src = "Images/Logo_n.png";
		}
		fetch("http://" + domain + ":" + port + "/themes/read/" + currenttheme).then(function (response) {
			return response.text();
		}).then(function (data) {
			console.log("theme loaded");
			var config_JSON = data;
			var parsedJSON = JSON.parse(config_JSON)[0];
			linkBG = GetElFromInforPath("linkBG", parsedJSON);
			theme_BG = GetElFromInforPath("BG", parsedJSON);
			theme_FG = GetElFromInforPath("FG", parsedJSON);
			theme_O2 = GetElFromInforPath("O2", parsedJSON);
			theme_notifBG = GetElFromInforPath("notifBG", parsedJSON);
			theme_button_card = GetElFromInforPath("button_card", parsedJSON);
			theme_progress = GetElFromInforPath("progress", parsedJSON);
			theme_hover_close = GetElFromInforPath("hover_close", parsedJSON);
			theme_btn_FG = GetElFromInforPath("btn_FG", parsedJSON);
			theme_btn_BG = GetElFromInforPath("btn_BG", parsedJSON);
			theme_btn_border = theme_btn_BG;
			theme_btn_hover = GetElFromInforPath("btn_hover", parsedJSON);
			theme_btn_FG_s = GetElFromInforPath("btn_FG_s", parsedJSON);
			theme_btn_BG_s = GetElFromInforPath("btn_BG_s", parsedJSON);
			theme_btn_border_s = theme_btn_BG_s;
			theme_btn_hover_s = GetElFromInforPath("btn_hover_s", parsedJSON);
			document.getElementsByTagName("html")[0].className = GetElFromInforPath(
				"scrollbar",
				parsedJSON
			);
			document.getElementsByTagName("nav")[0].style.backgroundColor =
				GetElFromInforPath("nav_BG", parsedJSON);
			theme_hover_listview = GetElFromInforPath("hover_listview", parsedJSON);
			theme_BG_CI = GetElFromInforPath("BG_CI", parsedJSON);
			if (BGBT == true) {
				document.getElementById("overlaymsg").style.color = theme_FG;
				document.getElementById("snackbar").style.color = theme_FG;
				document.getElementById("snackbar").style.backgroundColor = theme_notifBG;
				document.getElementsByTagName("html")[0].style.backgroundColor = theme_BG;
			} else {
				document.getElementById("overlaymsg").style.color = theme_FG;
				document.getElementById("snackbar").style.color = theme_FG;
				document.getElementById("snackbar").style.backgroundColor = theme_notifBG;
				document.getElementsByTagName("html")[0].style.backgroundColor = "black";
			}
			for (
				let i = 0;
				i < document.querySelectorAll(".modal-content").length;
				i++
			) {
				document.getElementsByClassName("modal-content")[
					i
					].style.backgroundColor = theme_BG;
			}
			for (let i = 0; i < document.querySelectorAll(".btn").length; i++) {
				if (
					document
						.getElementsByClassName("btn")
						[i].classList.contains("btn-primary") ||
					document
						.getElementsByClassName("btn")
						[i].classList.contains("btn-secondary")
				) {
					if (
						document
							.getElementsByClassName("btn")
							[i].classList.contains("btn-primary")
					) {
						document.getElementsByClassName("btn")[i].style.color = theme_btn_FG;
						document.getElementsByClassName("btn")[i].style.backgroundColor =
							theme_btn_BG;
						document.getElementsByClassName("btn")[i].style.borderColor =
							theme_btn_BG;
						document
							.getElementsByClassName("btn")
							[i].addEventListener("mouseover", function () {
							document.getElementsByClassName("btn")[i].style.backgroundColor =
								theme_btn_hover;
						});
						document
							.getElementsByClassName("btn")
							[i].addEventListener("mouseout", function () {
							document.getElementsByClassName("btn")[i].style.backgroundColor =
								theme_btn_BG;
						});
						document
							.getElementsByClassName("btn")
							[i].addEventListener("mousedown", function () {
							document.getElementsByClassName("btn")[i].style.borderColor =
								theme_btn_BG;
						});
					} else {
						document.getElementsByClassName("btn")[i].style.color =
							theme_btn_FG_s;
						document.getElementsByClassName("btn")[i].style.backgroundColor =
							theme_btn_BG_s;
						document.getElementsByClassName("btn")[i].style.borderColor =
							theme_btn_BG_s;
						document
							.getElementsByClassName("btn")
							[i].addEventListener("mouseover", function () {
							document.getElementsByClassName("btn")[i].style.backgroundColor =
								theme_btn_hover_s;
						});
						document
							.getElementsByClassName("btn")
							[i].addEventListener("mouseout", function () {
							document.getElementsByClassName("btn")[i].style.backgroundColor =
								theme_btn_BG_s;
						});
					}
				} else {
					document.getElementsByClassName("btn")[i].style.color = theme_FG;
					document
						.getElementsByClassName("btn")
						[i].addEventListener("mouseover", function () {
						document.getElementsByClassName("btn")[i].style.backgroundColor =
							theme_hover_listview;
					});
					document
						.getElementsByClassName("btn")
						[i].addEventListener("mouseout", function () {
						document.getElementsByClassName("btn")[i].style.backgroundColor =
							theme_nohover_listview;
					});
				}
			}
			for (let i = 0; i < document.querySelectorAll(".modal-title").length; i++) {
				document.getElementsByClassName("modal-title")[i].style.color = theme_FG;
			}
			for (let i = 0; i < document.querySelectorAll("p").length; i++) {
				document.getElementsByTagName("p")[i].style.color = theme_FG;
			}
			for (let i = 0; i < document.querySelectorAll("h1").length; i++) {
				document.getElementsByTagName("h1")[i].style.color = theme_FG;
			}
			for (let i = 0; i < document.querySelectorAll("label").length; i++) {
				document.getElementsByTagName("label")[i].style.color = theme_FG;
			}
			for (let i = 0; i < document.querySelectorAll(".btnw").length; i++) {
				document.getElementsByClassName("btnw")[i].style.color = theme_FG;
				document
					.getElementsByClassName("btnw")
					[i].addEventListener("mouseover", function () {
					document.getElementsByClassName("btnw")[i].style.backgroundColor =
						theme_hover_listview;
				});
				document
					.getElementsByClassName("btnw")
					[i].addEventListener("mouseout", function () {
					document.getElementsByClassName("btnw")[i].style.backgroundColor =
						theme_nohover_listview;
				});
			}
			document.getElementsByClassName("closebtn")[0].style.color = theme_FG;
			document
				.getElementsByClassName("closebtn")[0]
				.addEventListener("mouseover", function () {
					document.getElementsByClassName("closebtn")[0].style.backgroundColor =
						theme_hover_close;
				});
			document
				.getElementsByClassName("closebtn")[0]
				.addEventListener("mouseout", function () {
					document.getElementsByClassName("closebtn")[0].style.backgroundColor =
						theme_nohover_listview;
				});
			for (let i = 0; i < document.querySelectorAll("li").length; i++) {
				document.getElementsByTagName("li")[i].style.color = theme_FG;
			}
			for (let i = 0; i < document.querySelectorAll("h4").length; i++) {
				document.getElementsByTagName("h4")[i].style.color = theme_FG;
			}
			if (linkBG != "" && BGBT == true) {
				document.getElementsByTagName("html")[0].style.backgroundImage =
					"url('" + linkBG + "')";
			} else {
				document.getElementsByTagName("html")[0].style.backgroundImage = "";
			}
		}).catch(function (error) {
			console.log(error);
		});
	}
}

function BGBTF() {
	if (BGBT == true) {
		BGBT = false;
		Themes();
	} else {
		BGBT = true;
		Themes();
	}
}

//same as the one in the "end" listener of the ZIP but for RAR archive
function postunrar() {
	Toastifycation(language[0]["extraction_completed"], "#00C33C");
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
			getFromDB("Books", "last_page FROM Books WHERE ID_book='" + shortname + "'").then((res) => {
				lastpage = JSON.parse(res)[0]["last_page"];
				document.getElementById("overlay").style.display = "none";
				setTimeout(() => {
					Reader(listofImg, lastpage);
				}, 1000);
			});
		} catch (error) {
			console.log(error);
		}
	}
}

//Getting the File path from the URL Parameters
function GetFilePath() {
	var HTMLParam = window.location.search;
	HTMLParam = HTMLParam.replace("?", "");
	HTMLParam = decodeURIComponent(HTMLParam);
	HTMLParam = HTMLParam.replaceAll("%20", " ");
	HTMLParam = HTMLParam.replaceAll("ù", "/").replaceAll("%C3%B9", "/");
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
	HTMLParam = HTMLParam.replaceAll("ù", "/").replaceAll("%C3%B9", "/");
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

let DirectoryPath = window.decodeURIComponent(window.location.search.replace("?", "").split("&")[0]).replace("%3A", ":").replaceAll("%C3%B9", "/");
console.log(DirectoryPath);
let isADirectory;
fetch("http://" + domain + ":" + port + "/view/isDir/" + window.location.search.replace("?", "").split("&")[0]).then((res) => {
	return res.json();
}).then((res) => {
	isADirectory = res;
});

async function prepareReader() {
	Toastifycation("loading_cache", "#292929");
	await fetch("http://" + domain + ":" + port + "/viewer/view/current/" + connected).then(
		(response) => {
			response.json().then(async (data) => {
					let listofImgLoc = data;
					listofImg = listofImgLoc;
					console.log(listofImgLoc);
					if (listofImgLoc == false) {
						Toastifycation("error", "#292929");
					}
					listofImgLoc.sort((a, b) => {
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
					console.log(listofImgLoc);
					var filepage = GetFilePage();
					preloadImage(listofImgLoc);
					console.log(filepage);
					if (filepage != false) {
						var lastpage = filepage;
						Reader(listofImgLoc, lastpage);
					} else {
						var lastpage = 0;
						try {
							await getFromDB("Books", "last_page FROM Books WHERE ID_book='" + shortname + "'").then(async (res) => {
								lastpage = JSON.parse(res)[0]["last_page"];
								console.log(lastpage);
								Reader(listofImgLoc, lastpage);
							});
						} catch (error) {
							console.log(error);
						}
					}
					Toastifycation(language[0]["loaded_local"], "#00C33C");
				}
			).catch(function (error) {
				console.log(error);
			});
		}
	);
}

//Send BE
//Main Fonction, executed onload
async function Viewer() {
	document.getElementById("overlay").style.display = "block";
	loadParameters();
	//If the folder doesn't exist then create it and unzip in it
	//Else we check for the path.txt and if it doesn't exist we unzip
	//Else we check if the path.txt is equal to the path if he is not then we unzip
	//Else, the folder is created, as well as the path.txt and already contains the images
	var path = GetFilePath();
	console.log(path);
	await fetch("http://" + domain + ":" + port + "/view/isDir/" + window.location.search.replace("?", "").split("&")[0]).then((response) => {
		response.json().then(async (isDir) => {
			if (isDir === true) {
				CosmicComicsTempI = path + "/";
			}
			await fetch("http://" + domain + ":" + port + "/view/exist/" + window.encodeURIComponent(CosmicComicsTempI)).then((response) => {
				response.json().then(async (existCCI) => {
					if (!existCCI) {
						//Unzip if the folder doesn't exist
						fetch("http://" + domain + ":" + port + "/Unzip/" + window.location.search.replace("?", "") + "/" + connected).then((response) => {
							console.log("here 3");
							prepareReader();
						});
					} else {
						if (isDir === true) {
							//If the path is a folder then it contains images
							Toastifycation("loading_cache", "#292929");
							const options = {
								method: "GET",
								headers: {
									"Content-Type": "application/json",
									"path": window.decodeURI(window.location.search.replace("?", "").split("&")[0]).replace("%3A", ":")
								}
							};
							await fetch("http://" + domain + ":" + port + "/viewer/view/", options).then(
								(response) => {
									response.json().then(async (data) => {
											let listofImgLoc = data;
											listofImg = listofImgLoc;
											console.log(listofImgLoc);
											if (listofImgLoc == false) {
												Toastifycation("error", "#292929");
											}
											listofImgLoc.sort((a, b) => {
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
											console.log(listofImgLoc);
											var filepage = GetFilePage();
											preloadImage(listofImgLoc);
											console.log(filepage);
											if (filepage != false) {
												var lastpage = filepage;
												Reader(listofImgLoc, lastpage);
											} else {
												var lastpage = 0;
												try {
													await getFromDB("Books", "last_page FROM Books WHERE ID_book='" + shortname + "'").then(async (res) => {
														lastpage = JSON.parse(res)[0]["last_page"];
														console.log(lastpage);
														Reader(listofImgLoc, lastpage);
													});
												} catch (error) {
													console.log(error);
												}
											}
											Toastifycation(language[0]["loaded_local"], "#00C33C");
										}
									).catch(function (error) {
										console.log(error);
									});
								}
							);
						} else {
							//Else we need to extract it
							//We test if the path in the path.txt exists
							fetch("http://" + domain + ":" + port + "/view/exist/" + ((CosmicComicsTempI + "/path.txt").replaceAll("/", "ù").replaceAll("\\", "ù"))).then((response) => {
								response.json().then((existCCIP) => {
									console.log("path : " + existCCIP);
									if (existCCIP) {
										fetch("http://" + domain + ":" + port + "/view/readFile/" + ((CosmicComicsTempI + "path.txt").replaceAll("/", "ù").replaceAll("\\", "ù"))).then((response) => {
											response.json().then((readCCTIP) => {
												console.log("read : " + readCCTIP);
												console.log("path : " + CosmicComicsTempI + "path.txt");
												console.log("path2 : " + decodeURIComponent(path).replaceAll("%C3%B9", "/"));
												if (
													readCCTIP != decodeURIComponent(path).replaceAll("%C3%B9", "/") ||
													path.includes(".pdf")
												) {
													// if it's not the same we need to extract it
													fetch("http://" + domain + ":" + port + "/Unzip/" + window.location.search.replace("?", "") + "/" + connected).then((response) => {
														console.log(response);
														console.log("here 2");
														prepareReader();
													});
												} else {
													prepareReader();
												}
											});
										});
									} else {
										// if don't have a path.txt we extract
										fetch("http://" + domain + ":" + port + "/Unzip/" + window.location.search.replace("?", "") + "/" + connected).then((response) => {
											return response.text();
										}).then((data) => {
											prepareReader();
										});
									}
								});
							});
						}
					}
				});
			}).catch((error) => {
				alert("ERROR : " + error);
			});
		});
	});
}

//Loading image to render
function Reader(listOfImg, page) {
	let images = [];
	console.log(DirectoryPath, isADirectory);
	let options = {
		"method": "GET",
		"headers": {
			"Content-Type": "application/json",
			"path": DirectoryPath,
			"token": connected,
			"met": isADirectory ? "DL" : "CLASSIC",
			"page": listOfImg[page]
		}
	};
	fetch("http://" + domain + ":" + port + "/view/readImage", options).then(async (response) => {
		console.log(images);
		images.push(URL.createObjectURL(await response.blob()));
		let options = {
			"method": "GET",
			"headers": {
				"Content-Type": "application/json",
				"path": DirectoryPath,
				"token": connected,
				"met": isADirectory ? "DL" : "CLASSIC",
				"page": listOfImg[page + 1]
			}
		};
		fetch("http://" + domain + ":" + port + "/view/readImage", options).then(async (response) => {
			images.push(URL.createObjectURL(await response.blob()));
			if (DoublePageMode == true && BlankFirstPage == false) {
				document.getElementById("imgViewer_0").style.display = "";
				document.getElementById("imgViewer_1").style.display = "";
				if (mangaMode == true) {
					document.getElementById("imgViewer_0").src =
						images[1];
					document.getElementById("imgViewer_1").src =
						images[0];
					document.getElementById("currentpage").innerHTML =
						page + 2 + " / " + listOfImg.length;
				} else {
					document.getElementById("imgViewer_0").src =
						images[0];
					document.getElementById("imgViewer_1").src =
						images[1];
					document.getElementById("currentpage").innerHTML =
						page + 2 + " / " + listOfImg.length;
				}
				DPageActu = page + 1;
			} else if (DoublePageMode == true && BlankFirstPage == true) {
				if (page == 0 || page == -1) {
					document.getElementById("imgViewer_0").style.display = "";
					document.getElementById("imgViewer_1").style.display = "none";
					if (page == 2) {
						document.getElementById("imgViewer_0").src =
							images[1];
						document.getElementById("currentpage").innerHTML =
							page + 1 + " / " + listOfImg.length;
					} else {
						document.getElementById("imgViewer_0").src =
							images[0];
						document.getElementById("currentpage").innerHTML =
							page + 1 + " / " + listOfImg.length;
					}
					DPageActu = page + 1;
				} else {
					document.getElementById("imgViewer_0").style.display = "";
					document.getElementById("imgViewer_1").style.display = "";
					if (mangaMode == true) {
						document.getElementById("imgViewer_0").src =
							images[1];
						document.getElementById("imgViewer_1").src =
							images[0];
						document.getElementById("currentpage").innerHTML =
							page + 2 + " / " + listOfImg.length;
					} else {
						document.getElementById("imgViewer_0").src =
							images[0];
						document.getElementById("imgViewer_1").src =
							images[1];
						document.getElementById("currentpage").innerHTML =
							page + 2 + " / " + listOfImg.length;
					}
					DPageActu = page + 1;
				}
			} else {
				document.getElementById("imgViewer_0").style.display = "";
				document.getElementById("imgViewer_1").style.display = "none";
				document.getElementById("imgViewer_0").src = images[0];
				document.getElementById("currentpage").innerHTML =
					page + 1 + " / " + listOfImg.length;
				DPageActu = page + 1;
			}
			setTimeout(() => {
					if (toogleBGC == true) {
						var pathBG;
						if (custom) {
							pathBG = images[0];
							console.log("ColorThief : Enable");
							GettheBGColor(listOfImg[page]).then((BGColor) => {
								BGColor = BGColor.replaceAll("[", "").replaceAll("]", "");
								BGColor = BGColor.split(',');
								const R = BGColor[0];
								const G = BGColor[1];
								const B = BGColor[2];
								const val = "rgb(" + R + "," + G + "," + B + ")";
								document.getElementsByTagName("html")[0].style.backgroundColor = val;
							});
						}
					}
				}
				,
				50
			);
		});
	});
	console.log(listOfImg);
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
	if (wasDPM == true) {
		DoublePageMode = true;
	}
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
		var CurrentPage = Math.abs(
			document.getElementById("currentpage").innerHTML.split(" ")[0] - 1
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
function NextPage(override = false) {
	if (mangaMode == true) {
		if (override == false) {
			PreviousPage(true);
			return false;
		}
	}
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
							block: "center"
						});
				} else if (scrollindex_next == 2) {
					document
						.getElementById("div_imgViewer_" + CurrentPage)
						.scrollIntoView({
							block: "end"
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
				ModifyDB(
					"Books",
					"reading",
					false,
					shortname
				).then(() => {
					ModifyDB(
						"Books",
						"read",
						true,
						shortname
					);
				});
			}
			ModifyDB(
				"Books",
				"last_page",
				CurrentPage,
				shortname
			).then(() => {
				Reader(listofImg, CurrentPage);
			});
		}
	}
}

//Going to the previous page
function PreviousPage(override = false) {
	if (mangaMode == true) {
		if (override == false) {
			NextPage(true);
			return false;
		}
	}
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
	if (VIV_On == true) {
		for (let i = 0; i < VIV_Count; i++) {
			document.getElementById("imgViewer_" + i).style.height = height + "px";
			document.getElementById("imgViewer_" + i).style.width = "auto";
		}
	}
	if (BarOn == false) {
		document.getElementById("imgViewer_0").style.height = window.innerHeight + "px";
		document.getElementById("imgViewer_0").style.width = "auto";
		document.getElementById("imgViewer_1").style.height = window.innerHeight + "px";
		document.getElementById("imgViewer_1").style.width = "auto";
	} else {
		document.getElementById("imgViewer_0").style.height = height + "px";
		document.getElementById("imgViewer_0").style.width = "auto";
		document.getElementById("imgViewer_1").style.height = height + "px";
		document.getElementById("imgViewer_1").style.width = "auto";
	}
}

//GO to the beginning
function Start() {
	if (mangaMode == true) {
		Reader(listofImg, 0);
	} else {
		Reader(listofImg, 0);
	}
}

//Send BE
//Go to the end
function End() {
	if (DoublePageMode == true) {
		var max = listofImg.length - 2;
	} else {
		var max = listofImg.length - 1;
	}
	ModifyDB(
		"Books",
		"reading",
		false,
		shortname
	).then(() => {
		ModifyDB(
			"Books",
			"read",
			true,
			shortname
		).then(() => {
			Reader(listofImg, max);
		});
	});
}

//get the object by JSON
async function GetInfoFromJSON(json, name) {
	return fetch("http://" + domain + ":" + port + "/DB/read/" + json).then(function (response) {
		return response.text();
	}).then(function (data) {
		var info = JSON.parse(data);
		console.log(info);
		var Info = GetInfo("name", info, name);
		console.log(Info);
		return Info;
	}).catch(function (error) {
		console.log(error);
	});
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
async function getFromDB(dbname, request) {
	const option = {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			"request": request
		}, null, 2)
	};
	return fetch('http://192.168.1.84:8000/DB/get/' + connected + "/" + dbname, option).then(function (response) {
		return response.text();
	}).then(function (data) {
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

//TODO REBUILD FOR DB
function GetElFromInfo(search, info) {
	for (var i in info) {
		if (i == search) {
			return info[i];
		}
	}
	return null;
}

//Send BE
//mark as read
function markasread() {
	Toastifycation(language[0]["marked_as_read"], "#00C33C");
	ModifyDB(
		"Books",
		"reading",
		false,
		shortname
	).then(() => {
		ModifyDB(
			"Books",
			"unread",
			false,
			shortname
		).then(() => {
			ModifyDB(
				"Books",
				"read",
				true,
				shortname
			);
		});
	});
}

//Send BE
//Mark as unread
function markasunread() {
	Toastifycation(language[0]["marked_as_unread"], "#00C33C");
	ModifyDB(
		"Books",
		"reading",
		false,
		shortname
	).then(() => {
		ModifyDB(
			"Books",
			"read",
			false,
			shortname
		).then(() => {
			ModifyDB(
				"Books",
				"unread",
				true,
				shortname
			);
		});
	});
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

async function ModifyDB(dbName, ColName, value, id) {
	return fetch('http://192.168.1.84:8000/DB/update/' + connected + "/" + dbName + "/" + ColName + "/" + value + "/" + id);
}

async function DeleteFromDB(dbName, id, option) {
	return fetch('http://192.168.1.84:8000/DB/delete/' + connected + "/" + dbName + "/" + id + "/" + option);
}

async function InsertIntoDB(dbname, dbinfo, values) {
	const option = {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			"into": dbinfo,
			"val": values
		}, null, 2)
	};
	return fetch('http://192.168.1.84:8000/DB/insert/' + connected + "/" + dbname, option);
}

//Send BE
//mark as reading
function markasreading() {
	console.log("reading");
	Toastifycation(language[0]["marked_as_reading"], "#00C33C");
	ModifyDB(
		"Books",
		"reading",
		true,
		shortname
	).then(() => {
		ModifyDB(
			"Books",
			"read",
			false,
			shortname
		).then(() => {
			ModifyDB(
				"Books",
				"unread",
				false,
				shortname
			);
		});
	});
}

//Send BE
//Toggle the favorite status
function ToogleFav() {
	getFromDB("Books", "favorite FROM Books WHERE ID_book='" + shortname + "'").then((res) => {
		console.log(info);
		var res = JSON.parse(res)[0]["favorite"];
		console.log(res);
		if (res == true) {
			Toastifycation(language[0]["remove_fav"], "#00C33C");
			document.getElementById("favoicon").innerHTML = "favorite_border";
			ModifyDB(
				"Books",
				"favorite",
				false,
				shortname
			);
		} else if (res == false) {
			Toastifycation(language[0]["add_fav"], "#00C33C");
			document.getElementById("favoicon").innerHTML = "favorite";
			ModifyDB(
				"Books",
				"favorite",
				true,
				shortname
			);
		} else {
			Toastifycation(language[0]["error"], "#ff0000");
			console.log("FAV : Error");
		}
	});
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
		window.location.href = "index";
	} else if (e.code == "KeyH") {
		FixHeight();
	} else if (e.code == "KeyL") {
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
//Send BE
//Modify the JSON for config.json
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

//Send BE
//Change the Zoom Level when Zooming
var ZoomLVL = 20;

function changeZoomLVL() {
	var val = document.getElementById("zlvls").value;
	ZoomLVL = parseInt(val);
	document.getElementById("zlvll").innerHTML =
		language[0]["zoomlvl"] + " (" + ZoomLVL + "px):";
	modifyConfigJson(CosmicComicsData + "/config.json", "ZoomLVL", ZoomLVL);
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
//Send BE
//Trigger Automatic background
function AutoBGC() {
	if (toogleBGC == true) {
		toogleBGC = false;
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Automatic_Background_Color",
			false
		);
	} else {
		toogleBGC = true;
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Automatic_Background_Color",
			true
		);
	}
	console.log("clicked", toogleBGC);
}

//Getting the Background Color by the dominant color of image
async function GettheBGColor(page) {
	return fetch("http://" + domain + ":" + port + "/img/getColor/" + page + "/" + connected).then(function (response) {
		return response.text();
	}).then(function (data) {
		console.log("ColorThief : ", data);
		return data;
	}).catch(function (error) {
		console.log(error);
	});
	//var img = document.getElementById("imgViewer_0");
	//return colorThief.getColor(img);
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
//Send BE
function TBM() {
	//check if bookmark is already bookmarked
	var thepage = GetCurrentPage();
	getFromDB("Bookmarks", "PATH,page FROM Bookmarks WHERE BOOK_ID='" + shortname + "' AND page=" + thepage + ";").then((res1) => {
		var jres = JSON.parse(res1);
		if (jres.length !== 0) {
			console.log(jres);
			if (jres[0]["page"] == thepage.toString()) {
				DeleteFromDB(
					"Bookmarks",
					shortname,
					"AND page=" + thepage.toString()
				);
				document.getElementById("BMI").innerHTML = "bookmark_border";
			}
		} else {
			console.log("Bookmarks doesn't exist yet!");
			InsertIntoDB(
				"bookmarks",
				"(BOOK_ID,PATH,page)",
				"('" + shortname + "','" + GetFilePath() + "','" + GetCurrentPage() + "')"
			);
			document.getElementById("BMI").innerHTML = "bookmark";
		}
	});
}

//Send BE
//Loading the BookMark
function LoadBMI(pagec = 0) {
	try {
		getFromDB("Bookmarks", "* FROM Bookmarks WHERE BOOK_ID='" + shortname + "' AND page=" + pagec + ";").then((res) => {
			res = JSON.parse(res);
			console.log(res);
			if (res.length != 0) {
				document.getElementById("BMI").innerHTML = "bookmark";
			} else {
				document.getElementById("BMI").innerHTML = "bookmark_border";
			}
		});
	} catch (error) {
		console.log(error);
	}
}

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
//Send BE
//Toggle active Double Page Mode
function TDPM() {
	if (DoublePageMode == true) {
		try {
			modifyConfigJson(
				CosmicComicsData + "/config.json",
				"Double_Page_Mode",
				false
			);
		} catch (e) {
			console.log(e);
		}
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
		try {
			modifyConfigJson(
				CosmicComicsData + "/config.json",
				"Double_Page_Mode",
				true
			);
		} catch (e) {
			console.log(e);
		}
		//TODO Activate les autres modes
		document.getElementById("BPABS").removeAttribute("disabled");
		document.getElementById("MarginValue").removeAttribute("disabled");
		document.getElementById("NDPFHS").removeAttribute("disabled");
		DoublePageMode = true;
		wasDPM = true;
		var currentPage = GetCurrentPage();
		if (currentPage % 2 == 0) {
			Reader(listofImg, currentPage - 1);
		} else {
			Reader(listofImg, currentPage);
		}
		showDB();
	}
}

//Send BE
//Change the margin
function MarginSlider() {
	if (VIV_On == true) {
		for (let i = 0; i < VIV_Count; i++) {
			document.getElementById("imgViewer_" + i).style.marginBottom =
				document.getElementById("MarginValue").value;
			document.getElementById("marginlvl").innerHTML =
				language[0]["margin"] +
				" (" +
				document.getElementById("MarginValue").value +
				" px):";
			modifyConfigJson(
				CosmicComicsData + "/config.json",
				"Margin",
				document.getElementById("MarginValue").value
			);
		}
	} else {
		document.getElementById("imgViewer_1").style.marginLeft =
			document.getElementById("MarginValue").value;
		document.getElementById("marginlvl").innerHTML =
			language[0]["margin"] +
			" (" +
			document.getElementById("MarginValue").value +
			" px):";
		modifyConfigJson(
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

//Send BE
//Blank first page at begginning
function BPAB() {
	if (BlankFirstPage == true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Blank_page_At_Begginning",
			false
		);
		BlankFirstPage = false;
		var currentPage = GetCurrentPage();
		Reader(listofImg, currentPage);
	} else {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Blank_page_At_Begginning",
			true
		);
		BlankFirstPage = true;
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
	var image = new Image();
	image.src = CosmicComicsTempI + listofImg[NextPage];
	var H = DetectHorizontal(image);
	return H;
}

//Getting the orientation (Horizontal or Vertical) of the previous image
function GetTheHOfPreviousImage() {
	var CurrentPage = GetCurrentPage();
	var NextPage = CurrentPage - 2;
	var image = new Image();
	image.src = CosmicComicsTempI + listofImg[NextPage];
	var H = DetectHorizontal(image);
	return H;
}

//Send BE
//No Double Page when Horizontal
function NDPFH() {
	if (DPMNoH == true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"No_Double_Page_For_Horizontal",
			false
		);
		DPMNoH = false;
		var currentPage = GetCurrentPage();
	} else {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"No_Double_Page_For_Horizontal",
			true
		);
		DPMNoH = true;
		var currentPage = GetCurrentPage();
	}
}

//preloading images
var preloadedImages = [];

function preloadImage(listImages) {
	for (var i = 0; i < listImages.length; i++) {
		preloadedImages[i] = new Image();
		preloadedImages[i].src = "http://" + domain + ":" + port + "/CosmicData/profiles/" + currentUser + "/current_book/" + listImages[i];
	}
}

//Error When loading images
document.getElementById("imgViewer_0").onerror = function () {
	Toastifycation(language[0]["error"], "#ff0000");
	document.getElementById("imgViewer_0").src = "Images/fileDefault.png";
};
document.getElementById("imgViewer_1").onerror = function () {
	Toastifycation(language[0]["error"], "#ff0000");
	document.getElementById("imgViewer_1").src = "Images/fileDefault.png";
};
document.getElementById("imgViewer_0").addEventListener("load", () => {
	document.getElementById("overlay").style.display = "none";
});
document.getElementById("imgViewer_0").addEventListener("loadstart", () => {
	document.getElementById("overlay").style.display = "block";
});
/*
document.getElementById("imgViewer_0").onload = function () {
	document.getElementById("overlay").style.display = "none";
}
document.getElementById("imgViewer_1").onloadstart = function () {
	document.getElementById("overlay").style.display = "block";
}
document.getElementById("imgViewer_2").onload = function () {
	document.getElementById("overlay").style.display = "none";
}*/
//Send BE
//Manga Mode
function MMT() {
	if (mangaMode == true) {
		modifyConfigJson(
			"config",
			"Manga_Mode",
			false
		);
		mangaMode = false;
	} else {
		modifyConfigJson(
			"config",
			"Manga_Mode",
			true
		);
		mangaMode = true;
	}
	console.log(mangaMode);
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

//Send BE
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
			language[0]["rotation"] + " (" + rotateval + " degrees):";
	}
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"Rotate_All",
		AlwaysRotateV
	);
}

//Send BE
//Slide Show
var TSSON = false;

function TSS() {
	if (TSSON == true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"SlideShow",
			false
		);
		TSSON = false;
	} else {
		modifyConfigJson(CosmicComicsData + "/config.json", "SlideShow", true);
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
		language[0]["slideshow_interval"] +
		" (" +
		document.getElementById("SSValue").value +
		" " +
		language[0]["secondes"] +
		"):";
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

//Send BE
//No bar Mode
var BarOn = true;

function NoBAR() {
	if (BarOn == true) {
		document.getElementsByTagName("header")[0].style.display = "none";
		modifyConfigJson(CosmicComicsData + "/config.json", "NoBar", true);
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
		FixHeight();
	} else {
		modifyConfigJson(CosmicComicsData + "/config.json", "NoBar", false);
		BarOn = true;
		document.getElementsByTagName("header")[0].style.display = "block";
		FixHeight();
		document.body.removeChild(document.getElementById("nobarr"));
	}
}

var SideBarOn = false;
//Send BE
//Toggle SideBar
function TSB() {
	if (SideBarOn == true) {
		SideBarOn = false;
		modifyConfigJson(CosmicComicsData + "/config.json", "SideBar", false);
		document.getElementById("SideBar").style.display = "none";
		document.getElementById("viewport").style = "text-align: center;";
	} else {
		SideBarOn = true;
		modifyConfigJson(CosmicComicsData + "/config.json", "SideBar", true);
		document.getElementById("SideBar").style.display = "block";
		document.getElementById("viewport").style =
			"text-align: center;padding-left: 200px;";
		ConstructSideBar();
	}
}

//Construct the SideBar
function ConstructSideBar() {
	if (document.getElementById("SideBar").childElementCount == 0) {
		console.log(listofImg);
		listofImg.forEach((image, index) => {
			var el = document.getElementById("SideBar");
			const divcontainer = document.createElement("div");
			const acontainer = document.createElement("a");
			const pel = document.createElement("p");
			const img = document.createElement("img");
			img.src = "CosmicData/profiles/" + currentUser + "/current_book/" + image;
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
//Send BE
//Page Counter on/off
var DM_CurrentPage = true;

function ChangeDM_CurrentPage() {
	if (DM_CurrentPage == true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Page_Counter",
			false
		);
		DM_CurrentPage = false;
		document.getElementById("currentpage").style.display = "none";
	} else {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Page_Counter",
			true
		);
		DM_CurrentPage = true;
		document.getElementById("currentpage").style.display = "block";
	}
}

//Send BE
//Vertical Image Viewer Mode
var VIV_On = false;
var VIV_Count = 0;

function VIVT() {
	if (VIV_On == true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Vertical_Reader_Mode",
			false
		);
		window.location.reload();
	} else {
		modifyConfigJson(
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
	VIV_Count = listofImg.length;
	for (let i = 0; i < listofImg.length; i++) {
		const imgel = document.createElement("img");
		const div = document.createElement("div");
		imgel.id = "imgViewer_" + i;
		imgel.src = "CosmicData/profiles/" + currentUser + "/current_book/" + listofImg[i];
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
	{threshold: [0.1]}
);

//Can move direclty to a page by using a slider
function pageslide() {
	var pageto = document.getElementById("sps").value - 1;
	document.getElementById("lsps").innerHTML =
		language[0]["page_slider"] +
		" (" +
		document.getElementById("sps").value +
		"):";
	Reader(listofImg, pageto);
}

//Do not remember what this do, sorry
function pagechoose() {
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

//Send BE
//Webtoon Mode
var WTMTV = false;

function WTMT() {
	if (WTMTV == true) {
		WTMTV = false;
		modifyConfigJson(
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
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"WebToonMode",
			true
		);
	}
}

//Send BE
//Change Background Color by color picker
function changeBGColorByPicker() {
	var value = document.getElementById("exampleColorInput").value;
	document.getElementsByTagName("html")[0].style.backgroundColor = value;
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"Background_color",
		value
	);
}

//Send BE
//reset zoom for each page
var RZPV = false;

function RZP() {
	if (RZPV == true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"reset_zoom",
			false
		);
		RZPV = false;
	} else {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"reset_zoom",
			true
		);
		RZPV = true;
	}
}

//Send BE
//Scroll bar visible
var scrollbarvisibiel = true;

function SBVT() {
	if (scrollbarvisibiel == true) {
		setNoScrollbar();
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Scroll_bar_visible",
			false
		);
		scrollbarvisibiel = false;
	} else {
		setScrollbar();
		modifyConfigJson(
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
//Send BE
function loadParameters() {
	fetch("http://" + domain + ":" + port + "/config/getConfig/" + connected).then(function (response) {
		return response.text();
	}).then(function (data) {
		var configFile = data;
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
			language[0]["slideshow_interval"] +
			" (" +
			configSST +
			" " +
			language[0]["secondes"] +
			"):";
		document.getElementById("RotateValue").value = configRA;
		AlwaysRotate();
		if (VIV_On == true) {
			for (let i = 0; i < VIV_Count; i++) {
				document.getElementById("imgViewer_" + i).style.marginBottom = configM;
				document.getElementById("marginlvl").innerHTML =
					language[0]["margin"] + " (" + configM + " px):";
			}
		} else {
			document.getElementById("imgViewer_1").style.marginLeft = configM;
			document.getElementById("marginlvl").innerHTML =
				language[0]["margin"] + " (" + configM + " px):";
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
	}).catch(function (error) {
		console.log(error);
	});
}

//Envoie BE
document.getElementById("Heightvalue").onchange = function () {
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"magnifier_Height",
		parseInt(document.getElementById("Heightvalue").value)
	);
};
document.getElementById("widthvalue").onchange = function () {
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"magnifier_Width",
		parseInt(document.getElementById("widthvalue").value)
	);
};
document.getElementById("zoomvalue").onchange = function () {
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"magnifier_zoom",
		parseInt(document.getElementById("zoomvalue").value)
	);
};
document.getElementById("Radiusvalue").onchange = function () {
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"magnifier_Radius",
		parseInt(document.getElementById("Radiusvalue").value)
	);
};
document.getElementById("SSValue").onchange = function () {
	ShowOnChangeSlideShow();
	modifyConfigJson(
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
	.addEventListener("contextmenu", function (event) {
		event.preventDefault();
		NextPage();
	});
//Wait before Image load up
document.getElementById("imgViewer_0").onload = function () {
	document.getElementById("imgViewer_0").style.display = "";
};
document.getElementById("imgViewer_1").onload = function () {
	document.getElementById("imgViewer_1").style.display = "";
};
