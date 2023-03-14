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
let imagelink = "null";
let nabc = 0;
let toogleBGC = false;
let dirnameFE;
let CosmicComicsData = "C:/Users/Public/Cosmic-Comics/data";
let CosmicComicsTemp = "C:/Users/Public/Cosmic-Comics/data";
let CosmicComicsTempI = "C:/Users/Public/Cosmic-Comics/data";
let listofImg;
let currentUser = "";
let connected = getCookie("selectedProfile");
console.log(connected);

function setTheme(theme) {
	document.head.getElementsByTagName("link")[6].href = "/themes/" + theme;
}

if (connected == null) {
	window.location.href = "login";
} else {
	fetch(PDP+ "/profile/logcheck/" + connected).then(function (response) {
		return response.text();
	}).then(async function (data) {
		if (data === "false") {
			window.location.href = "login";
		} else {
			currentUser = data;
			fetch(PDP + "/config/getConfig/" + connected).then(function (response) {
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
			await getFromDB("Books", "ID_book FROM Books WHERE PATH='" + path + "'").then((res) => {
				console.log(res);
				bookID = JSON.parse(res)[0].ID_book;
				console.log(bookID);
			})
			loadParameters();
		}
	}).catch(function (error) {
		console.log(error);
	});
}
fetch(PDP+ "/viewer/view/current/" + connected).then(
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
fetch(PDP+ "/dirname").then(function (response) {
	return response.text();
}).then(function (data) {
	dirnameFE = data;
	CosmicComicsData = dirnameFE + "/CosmicComics_data";
	CosmicComicsTemp = dirnameFE;
	CosmicComicsTempI = CosmicComicsTemp + "profiles/" + currentUser + "/current_book/";
	console.log(CosmicComicsTempI);
}).catch(function (error) {
	console.log(error);
});
fetch(PDP + "/CosmicDataLoc").then(function (response) {
	return response.text();
}).then(function (data) {
	dirnameFE = data;
	CosmicComicsTemp = dirnameFE;
}).catch(function (error) {
	console.log(error);
});
let name1 = GetFilePath().split("/").pop();
let path = GetFilePath();
console.log(name1);
let realname1 = name1.split(".")[0];
console.log(realname1);
let shortname = GetTheName(realname1);
console.log(shortname);
let rarlength = 0;
let Dpath = GetFilePath();
/*
var DPageTotal = GetListOfImg(CosmicComicsTempI).length;
*/
let DPageActu = 1;
let DoublePageMode = false;
let BlankFirstPage = false;
let DPMNoH = false;
let wasDPM = false;
let PPwasDPM = false;
let mangaMode = false;
let bookID = "NaID_"+Math.random()*100500;

new bootstrap.Tooltip(document.getElementById("goback_id"), {
	title: language["go_back"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("magnifier_id"), {
	title: language["magnifier_toggle"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_gostart"), {
	title: language["go_start"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_bookmenu"), {
	title: language["book_settings"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_goprevious"), {
	title: language["go_previous"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("nextpage"), {
	title: language["go_next"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_goend"), {
	title: language["go_end"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_mkread"), {
	title: language["mkread"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_mkreading"), {
	title: language["mkreading"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_mkunread"), {
	title: language["mkunread"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_togglefav"), {
	title: language["toogle_fav"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_fixheight"), {
	title: language["fix_height"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_fixwidth"), {
	title: language["fix_width"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_autobgcolor"), {
	title: language["auto_bg_color"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_zoomin"), {
	title: language["zoom_in"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_zoomout"), {
	title: language["zoom_out"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_toogleBookMark"), {
	title: language["Bookmark"],
	placement: "bottom"
});
(document.getElementById("id_magnifiermod").innerText =
	language["magnifier_mod"]),
	(document.getElementById("zoomlvl").innerText = language["zoom"]);
document.getElementById("widthlvl").innerText = language["width"];
document.getElementById("heightlvl").innerText = language["height"];
document.getElementById("BGBTTXT").innerText =
	language["background_by_theme"];
document.getElementById("Radiuslvl").innerText = language["radius"];
new bootstrap.Tooltip(document.getElementById("magnifier_note"), {
	title: language["magnifier_note"],
	placement: "bottom"
});
document.getElementById("id_spawnmagnifier").innerText =
	language["spawn_magnifier"];
document.getElementById("id_destroymagnifier").innerText =
	language["destroy_magnifier"];
document.getElementById("id_booksettings").innerText =
	language["book_settings"];
console.log(language["book_settings"]);
document.getElementById("DPMTXT").innerText = language["double_page_mode"];
document.getElementById("BPABTXT").innerText =
	language["blank_at_beggining"];
document.getElementById("NDPFHTXT").innerText =
	language["no_dpm_horizontal"];
document.getElementById("MMTXT").innerText = language["manga_mode"];
document.getElementById("SSTXT").innerText = language["Slideshow"];
document.getElementById("NBARTXT").innerText = language["nobar"];
document.getElementById("SSBTXT").innerText = language["sideBar"];
document.getElementById("PCTXT").innerText = language["PageCount"];
document.getElementById("VIVTXT").innerText = language["vertical_reader"];
document.getElementById("WTMTXT").innerText = language["Webtoon_Mode"];
document.getElementById("RZPSTXT").innerText = language["reset_zoom"];
document.getElementById("SBVSTXT").innerText = language["scrollBar_visible"];
document.getElementById("marginlvl").innerText = language["margin"];
document.getElementById("rotlvl").innerText = language["rotation"];
document.getElementById("zlvll").innerText = language["zoomlvl"];
document.getElementById("sstxt").innerText = language["slideshow_interval"];
document.getElementById("lsps").innerText = language["page_slider"];
document.getElementById("colorpicker_txt_id").innerText =
	language["color_picker"];
document.getElementById("close_id_books").innerText = language["close"];
new bootstrap.Tooltip(document.getElementById("id_rotateright"), {
	title: language["rotate_right"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("id_rotateleft"), {
	title: language["rotate_left"],
	placement: "bottom"
});
new bootstrap.Tooltip(document.getElementById("fullscreen_id"), {
	title: language["full_screen"],
	placement: "bottom"
});
let BGBT = false; // Background By Theme
//toolTips
let tooltipTriggerList = [].slice.call(
	document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
	return new bootstrap.Tooltip(tooltipTriggerEl);
});
let popoverTriggerList = [].slice.call(
	document.querySelectorAll('[data-bs-toggle="popover"]')
);
let popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
	return new bootstrap.Popover(popoverTriggerEl);
});
//#endregion
//Send BE
//get language reference for the selected language
function lang(langg) {
	fetch(PDP + "/lang/" + langg).then(
		(response) => {
			response.json().then((data) => {
				return data;
			});
		}
	);
}

//get element from config.json
function GetElFromInforPath(search, info) {
	for (let i in info) {
		if (i === search) {
			return info[i];
		}
	}
	return null;
}

function hasNumbers(t) {
	let regex = /\d/g;
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
	let s = CommonName.split(" ");
	let finalName = "";
	console.log(s);
	s.forEach((el) => {
		console.log(parseInt(el));
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
	console.log(finalName);
	return finalName;
}

//Send Notification to User
function Toastifycation(message, BGColor = "#333", FrontColor = "#ffffff") {
	let x = document.getElementById("snackbar");
	x.className = "show";
	x.innerText = message;
	x.style.backgroundColor = BGColor;
	x.style.color = FrontColor;
	setTimeout(function () {
		x.className = x.className.replace("show", "");
	}, 3000);
}

//Theme set up
let theme_BG = "#181818";
let theme_FG = "white";
let theme_BG_CI = "rgba(0,0,0,0.753)";
let currenttheme;
let theme_O2 = "black";
let theme_notifBG = "rgb(143, 143, 143)";
let theme_button_card = "";
let theme_progress = "";
let theme_hover_listview = "#242424";
let theme_nohover_listview = "transparent";
let theme_hover_close;
let theme_btn_FG = "white";
let theme_btn_BG = "#0d6efd";
let theme_btn_FG_s = "white";
let theme_btn_BG_s = "#6c757d";
let theme_btn_border = theme_btn_BG;
let theme_btn_hover = "#0b5ed7";
let theme_btn_border_s = theme_btn_BG;
let theme_btn_hover_s = "#5c636a";
let linkBG = "";
document.getElementsByTagName("html")[0].className = "black";

function Themes() {
	if (currenttheme !== "[DEFAULT] - Default.json") {
		if (currenttheme === "[EVENT] - Halloween.json") {
			document.getElementById("logo_id").src = "Images/Logo_h.png";
		} else if (currenttheme === "[EVENT] - X-Mas.json") {
			document.getElementById("logo_id").src = "Images/Logo_n.png";
		}
		fetch(PDP + "/themes/read/" + currenttheme).then(function (response) {
			return response.text();
		}).then(function (data) {
			console.log("theme loaded");
			let config_JSON = data;
			let parsedJSON = JSON.parse(config_JSON)[0];
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
			if (BGBT === true) {
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
			if (linkBG !== "" && BGBT === true) {
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
	if (BGBT === true) {
		BGBT = false;
		Themes();
	} else {
		BGBT = true;
		Themes();
	}
}

//same as the one in the "end" listener of the ZIP but for RAR archive
async function postunrar() {
	Toastifycation(language["extraction_completed"], "#00C33C");
	let filepage = GetFilePage();
	preloadImage(listofImg);
	console.log(filepage);
	if (filepage !== false) {
		let lastpage = filepage;
		document.getElementById("overlay").style.display = "none";
		setTimeout(() => {
			Reader(listofImg, lastpage);
		}, 1000);
	} else {
		let lastpage = 0;
		try {
			await getFromDB("Books", "last_page FROM Books WHERE PATH='" + path + "'").then((res) => {
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
	let HTMLParam = window.location.search;
	HTMLParam = HTMLParam.replace("?", "");
	HTMLParam = decodeURIComponent(HTMLParam);
	HTMLParam = HTMLParam.replaceAll("%20", " ");
	HTMLParam = HTMLParam.replaceAll("ù", "/").replaceAll("%C3%B9", "/");
	HTMLParam = HTMLParam.split("&");
	console.log(HTMLParam);
	HTMLParam = HTMLParam[0];
	console.log(HTMLParam);
	return HTMLParam;
}

//Getting the page by HTML URL Parameters
function GetFilePage() {
	let HTMLParam = window.location.search;
	HTMLParam = HTMLParam.replace("?", "");
	HTMLParam = HTMLParam.replaceAll("%20", " ");
	HTMLParam = HTMLParam.replaceAll("ù", "/").replaceAll("%C3%B9", "/");
	HTMLParam = HTMLParam.split("&page=");
	console.log(HTMLParam);
	HTMLParam = HTMLParam[1];
	let HN = hasNumbers(HTMLParam);
	if (HN === true) {
		HTMLParam = parseInt(HTMLParam);
		return HTMLParam;
	} else {
		return false;
	}
}

let DirectoryPath = window.decodeURIComponent(window.location.search.replace("?", "").split("&")[0]).replace("%3A", ":").replaceAll("%C3%B9", "/");
console.log(DirectoryPath);
let isADirectory;
fetch(PDP + "/view/isDir/" + encodeURIComponent(decodeURIComponent(window.location.search).replace("?", "").split("&")[0])).then((res) => {
	return res.json();
}).then((res) => {
	isADirectory = res;
});

async function prepareReader() {
	Toastifycation("loading_cache", "#292929");
	await fetch(PDP + "/viewer/view/current/" + connected).then(
		(response) => {
			response.json().then(async (data) => {
					let listofImgLoc = data;
					listofImg = listofImgLoc;
					console.log(listofImgLoc);
					if (listofImgLoc === false) {
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
					let filepage = GetFilePage();
					preloadImage(listofImgLoc);
					console.log(filepage);
					if (filepage !== false) {
						let lastpage = filepage;
						Reader(listofImgLoc, lastpage);
					} else {
						let lastpage = 0;
						try {
							await getFromDB("Books", "last_page FROM Books WHERE PATH='" + path + "'").then(async (res) => {
								console.log(res);
								if (res === "[]" || res === undefined || res === null || res === "" || res.length === 0){
									lastpage = 0;
								}else{
									lastpage = JSON.parse(res)[0]["last_page"];
								}
								console.log(lastpage);
								Reader(listofImgLoc, lastpage);
							});
						} catch (error) {
							console.log(error);
						}
					}
					Toastifycation(language["loaded_local"], "#00C33C");
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
	//If the folder doesn't exist then create it and unzip in it
	//Else we check for the path.txt and if it doesn't exist we unzip
	//Else we check if the path.txt is equal to the path if he is not then we unzip
	//Else, the folder is created, as well as the path.txt and already contains the images
	var path = GetFilePath();
	console.log(path);
	await fetch(PDP + "/view/isDir/" + window.location.search.replace("?", "").split("&")[0]).then((response) => {
		response.json().then(async (isDir) => {
			if (isDir === true) {
				CosmicComicsTempI = path + "/";
			}
			await fetch(PDP + "/view/exist/" + window.encodeURIComponent(CosmicComicsTempI)).then((response) => {
				response.json().then(async (existCCI) => {
					if (!existCCI) {
						//Unzip if the folder doesn't exist
						fetch(PDP + "/Unzip/" + window.location.search.replace("?", "") + "/" + connected).then((response) => {
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
							await fetch(PDP + "/viewer/view/", options).then(
								(response) => {
									response.json().then(async (data) => {
											let listofImgLoc = data;
											listofImg = listofImgLoc;
											console.log(listofImgLoc);
											if (listofImgLoc === false) {
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
											let filepage = GetFilePage();
											preloadImage(listofImgLoc);
											console.log(filepage);
											if (filepage !== false) {
												let lastpage = filepage;
												Reader(listofImgLoc, lastpage);
											} else {
												let lastpage = 0;
												try {
													await getFromDB("Books", "last_page FROM Books WHERE PATH='" + window.decodeURI(window.location.search.replace("?", "").split("&")[0]).replace("%3A", ":") + "'").then(async (res) => {
														lastpage = JSON.parse(res)[0]["last_page"];
														console.log(lastpage);
														Reader(listofImgLoc, lastpage);
													});
												} catch (error) {
													console.log(error);
													Reader(listofImgLoc, lastpage);
												}
											}
											Toastifycation(language["loaded_local"], "#00C33C");
										}
									).catch(function (error) {
										console.log(error);
									});
								}
							);
						} else {
							//Else we need to extract it
							//We test if the path in the path.txt exists
							fetch(PDP + "/view/exist/" + ((CosmicComicsTempI + "/path.txt").replaceAll("/", "ù").replaceAll("\\", "ù"))).then((response) => {
								response.json().then((existCCIP) => {
									console.log("path : " + existCCIP);
									if (existCCIP) {
										fetch(PDP + "/view/readFile/" + ((CosmicComicsTempI + "path.txt").replaceAll("/", "ù").replaceAll("\\", "ù"))).then((response) => {
											response.json().then((readCCTIP) => {
												console.log("read : " + readCCTIP);
												console.log("path : " + CosmicComicsTempI + "path.txt");
												console.log("path2 : " + decodeURIComponent(path).replaceAll("%C3%B9", "/"));
												if (
													readCCTIP !== decodeURIComponent(path).replaceAll("%C3%B9", "/") ||
													path.includes(".pdf")
												) {
													// if it's not the same we need to extract it
													fetch(PDP + "/Unzip/" + window.location.search.replace("?", "") + "/" + connected).then((response) => {
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
										fetch(PDP + "/Unzip/" + window.location.search.replace("?", "") + "/" + connected).then((response) => {
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
	fetch(PDP + "/view/readImage", options).then(async (response) => {
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
		fetch(PDP + "/view/readImage", options).then(async (response) => {
			images.push(URL.createObjectURL(await response.blob()));
			if (DoublePageMode === true && BlankFirstPage === false) {
				document.getElementById("imgViewer_0").style.display = "";
				document.getElementById("imgViewer_1").style.display = "";
				if (mangaMode === true) {
					document.getElementById("imgViewer_0").src =
						images[1];
					document.getElementById("imgViewer_1").src =
						images[0];
					document.getElementById("currentpage").innerText =
						page + 2 + " / " + listOfImg.length;
				} else {
					document.getElementById("imgViewer_0").src =
						images[0];
					document.getElementById("imgViewer_1").src =
						images[1];
					document.getElementById("currentpage").innerText =
						page + 2 + " / " + listOfImg.length;
				}
				DPageActu = page + 1;
			} else if (DoublePageMode === true && BlankFirstPage === true) {
				if (page === 0 || page === -1) {
					document.getElementById("imgViewer_0").style.display = "";
					document.getElementById("imgViewer_1").style.display = "none";
					if (page === 2) {
						document.getElementById("imgViewer_0").src =
							images[1];
						document.getElementById("currentpage").innerText =
							page + 1 + " / " + listOfImg.length;
					} else {
						document.getElementById("imgViewer_0").src =
							images[0];
						document.getElementById("currentpage").innerText =
							page + 1 + " / " + listOfImg.length;
					}
					DPageActu = page + 1;
				} else {
					document.getElementById("imgViewer_0").style.display = "";
					document.getElementById("imgViewer_1").style.display = "";
					if (mangaMode === true) {
						document.getElementById("imgViewer_0").src =
							images[1];
						document.getElementById("imgViewer_1").src =
							images[0];
						document.getElementById("currentpage").innerText =
							page + 2 + " / " + listOfImg.length;
					} else {
						document.getElementById("imgViewer_0").src =
							images[0];
						document.getElementById("imgViewer_1").src =
							images[1];
						document.getElementById("currentpage").innerText =
							page + 2 + " / " + listOfImg.length;
					}
					DPageActu = page + 1;
				}
			} else {
				document.getElementById("imgViewer_0").style.display = "";
				document.getElementById("imgViewer_1").style.display = "none";
				document.getElementById("imgViewer_0").src = images[0];
				document.getElementById("currentpage").innerText =
					page + 1 + " / " + listOfImg.length;
				DPageActu = page + 1;
			}
			setTimeout(() => {
					if (toogleBGC === true) {
						let pathBG;
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
	if (RZPV === true) {
		if (
			document.getElementById("imgViewer_0").style.width ===
			window.innerWidth - 5 + "px" ||
			document.getElementById("imgViewer_0").style.width ===
			window.innerWidth - 205 + "px"
		) {
			FixWidth();
		} else {
			FixHeight();
		}
	}
	document.getElementById("inputonwhat").innerText = " / " + listOfImg.length;
	document.getElementById("input_text").value = page + 1;
	try {
		for (let i = 0; i < listOfImg.length; i++) {
			document.getElementById("id_img_" + i).className = "";
		}
		document.getElementById("id_img_" + page).className = "SideBar_current";
		document.getElementById("SideBar").scrollTop =
			document.getElementById("id_img_" + page).offsetTop - 100;
	} catch (e) {
		console.log(e);
	}
	if (AlwaysRotateB === false) {
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
	if (wasDPM === true) {
		DoublePageMode = true;
	}
}

//Getting the current page
function GetCurrentPage() {
	if (mangaMode === true)
		return Math.abs(
			document.getElementById("currentpage").innerHTML.split(" ")[0] - 1
		);
	else
		return document.getElementById("currentpage").innerHTML.split(" ")[0] - 1;
}

let scrollindex_next = 1;
let VIV_On = false;
let VIV_Count = 0;

//Going to the next page
function NextPage(override = false) {
	if (mangaMode === true) {
		if (override === false) {
			PreviousPage(true);
			return false;
		}
	}
	if (VIV_On === true) {
		let CurrentPage = GetCurrentPage();
		console.log(scrollindex_next);
		if (
			document.getElementById("imgViewer_" + CurrentPage).style.width ===
			window.innerWidth - 5 + "px"
		) {
			if (scrollindex_next > 2) {
				window.scrollTo(
					0,
					document.getElementById("imgViewer_" + (CurrentPage + 1)).offsetTop -
					document.getElementsByTagName("header")[0].offsetHeight
				);
			} else {
				if (scrollindex_next === 1) {
					document
						.getElementById("div_imgViewer_" + CurrentPage)
						.scrollIntoView({
							block: "center"
						});
				} else if (scrollindex_next === 2) {
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
		let CurrentPage = GetCurrentPage();
		if (DPMNoH === true) {
			let NW = preloadedImages[CurrentPage + 1].naturalWidth;
			let NH = preloadedImages[CurrentPage + 1].naturalHeight;
			let NW2 = preloadedImages[CurrentPage + 2].naturalWidth;
			let NH2 = preloadedImages[CurrentPage + 2].naturalHeight;
			if (NW > NH || NW2 > NH2) {
				DoublePageMode = false;
			}
		}
		let max = listofImg.length;
		if (CurrentPage < max - 1) {
			CurrentPage += 1;
			if (currentpage === max - 1) {
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
	if (mangaMode === true) {
		if (override === false) {
			NextPage(true);
			return false;
		}
	}
	if (VIV_On === true) {
		let CurrentPage = GetCurrentPage();
		if (scrollindex_next === 2 || scrollindex_next === 3) {
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
		let CurrentPage = GetCurrentPage();
		if (DoublePageMode === true && BlankFirstPage === false && DPMNoH === false) {
			if (CurrentPage > 2) {
				CurrentPage -= 3;
				Reader(listofImg, CurrentPage);
			} else {
				if (CurrentPage - 1 !== -1) {
					CurrentPage -= 1;
					Reader(listofImg, CurrentPage);
				}
			}
		} else if (
			DoublePageMode === true &&
			BlankFirstPage === false &&
			DPMNoH === true
		) {
			if (CurrentPage > 2) {
				let NW = preloadedImages[CurrentPage - 1].naturalWidth;
				let NH = preloadedImages[CurrentPage - 1].naturalHeight;
				let NW2 = preloadedImages[CurrentPage - 2].naturalWidth;
				let NH2 = preloadedImages[CurrentPage - 2].naturalHeight;
				if (NW > NH || NW2 > NH2) {
					DoublePageMode = false;
					CurrentPage -= 1;
					Reader(listofImg, CurrentPage);
				} else {
					CurrentPage -= 3;
					Reader(listofImg, CurrentPage);
				}
			} else {
				if (CurrentPage - 2 !== -1) {
					CurrentPage -= 2;
					Reader(listofImg, CurrentPage);
				}
			}
		} else if (
			DoublePageMode === true &&
			BlankFirstPage === true &&
			DPMNoH === false
		) {
			if (CurrentPage !== 0 && CurrentPage - 3 !== -1) {
				CurrentPage -= 3;
				Reader(listofImg, CurrentPage);
			} else if (CurrentPage - 3 === -1) {
				CurrentPage -= 2;
				Reader(listofImg, CurrentPage);
			}
		} else if (
			DoublePageMode === true &&
			BlankFirstPage === true &&
			DPMNoH === true
		) {
			if (CurrentPage !== 0 && CurrentPage - 3 !== -1) {
				let NW = preloadedImages[CurrentPage - 2].naturalWidth;
				let NH = preloadedImages[CurrentPage - 2].naturalHeight;
				let NW2 = preloadedImages[CurrentPage - 3].naturalWidth;
				let NH2 = preloadedImages[CurrentPage - 3].naturalHeight;
				if (NW > NH || NW2 > NH2) {
					DoublePageMode = false;
					CurrentPage -= 2;
					Reader(listofImg, CurrentPage);
				} else {
					CurrentPage -= 2;
					Reader(listofImg, CurrentPage);
				}
			} else if (CurrentPage - 3 === -1) {
				let NW = preloadedImages[CurrentPage - 1].naturalWidth;
				let NH = preloadedImages[CurrentPage - 1].naturalHeight;
				let NW2 = preloadedImages[CurrentPage - 2].naturalWidth;
				let NH2 = preloadedImages[CurrentPage - 2].naturalHeight;
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
			if (CurrentPage !== 0) {
				CurrentPage -= 1;
				Reader(listofImg, CurrentPage);
			}
		}
	}
}

//Display by Height
function FixHeight() {
	let height =
		window.innerHeight - document.getElementsByTagName("nav")[0].offsetHeight;
	if (VIV_On === true) {
		for (let i = 0; i < VIV_Count; i++) {
			document.getElementById("imgViewer_" + i).style.height = height + "px";
			document.getElementById("imgViewer_" + i).style.width = "auto";
		}
	}
	if (BarOn === false) {
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
		Reader(listofImg, 0);
}

//Send BE
//Go to the end
function End() {
	let max;
	if (DoublePageMode === true) {
		max = listofImg.length - 2;
	} else {
		max = listofImg.length - 1;
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
	return fetch(PDP + "/DB/read/" + json).then(function (response) {
		return response.text();
	}).then(function (data) {
		let info = JSON.parse(data);
		console.log(info);
		let Info = GetInfo("name", info, name);
		console.log(Info);
		return Info;
	}).catch(function (error) {
		console.log(error);
	});
}

//Search in the object getted and for the book ID
function GetInfo(search, info, name) {
	for (let i in info) {
		for (let j in info[i]) {
			if (j === search) {
				if (name === info[i][j]) {
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
	return fetch(PDP + '/DB/get/' + connected + "/" + dbname, option).then(function (response) {
		return response.text();
	}).then(function (data) {
		return data;
	}).catch(function (error) {
		console.log(error);
	});
}

//mark as read
function markasread() {
	Toastifycation(language["marked_as_read"], "#00C33C");
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

//Mark as unread
function markasunread() {
	Toastifycation(language["marked_as_unread"], "#00C33C");
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
	return fetch(PDP + '/DB/update/' + connected + "/" + dbName + "/" + ColName + "/" + value + "/" + id);
}

async function DeleteFromDB(dbName, id, option) {
	return fetch(PDP + '/DB/delete/' + connected + "/" + dbName + "/" + id + "/" + option);
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
	return fetch(PDP + '/DB/insert/' + connected + "/" + dbname, option);
}

//Send BE
//mark as reading
function markasreading() {
	console.log("reading");
	Toastifycation(language["marked_as_reading"], "#00C33C");
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
	getFromDB("Books", "favorite FROM Books WHERE PATH='" + path + "'").then((res) => {
		console.log(info);
		res = JSON.parse(res)[0]["favorite"];
		console.log(res);
		if (res) {
			Toastifycation(language["remove_fav"], "#00C33C");
			document.getElementById("favoicon").innerText = "favorite_border";
			ModifyDB(
				"Books",
				"favorite",
				false,
				shortname
			);
		} else{
			Toastifycation(language["add_fav"], "#00C33C");
			document.getElementById("favoicon").innerText = "favorite";
			ModifyDB(
				"Books",
				"favorite",
				true,
				shortname
			);
		}
	});
}

//keyboard Shortcuts
window.addEventListener("keydown", (e) => {
	if ((e.code === "Equal" || e.code === "NumpadAdd") && e.ctrlKey === true) {
		ZoomIn();
	} else if (
		(e.code === "Digit6" || e.code === "NumpadSubtract") &&
		e.ctrlKey === true
	) {
		ZoomOut();
	} else if (e.code === "ArrowLeft" && e.ctrlKey === false) {
		PreviousPage();
	} else if (e.code === "ArrowRight" && e.ctrlKey === false) {
		NextPage();
	} else if (e.code === "ArrowUp" && e.ctrlKey === false) {
		PreviousPage();
	} else if (e.code === "ArrowDown" && e.ctrlKey === false) {
		NextPage();
	} else if (e.code === "ArrowLeft" && e.ctrlKey === true) {
		Start();
	} else if (e.code === "ArrowRight" && e.ctrlKey === true) {
		End();
	} else if (e.code === "ArrowUp" && e.ctrlKey === true) {
		Start();
	} else if (e.code === "ArrowDown" && e.ctrlKey === true) {
		End();
	} else if (e.ctrlKey === true) {
		ctrlisDown = true;
	} else if (e.code === "KeyF") {
		fullscreen();
	} else if (e.code === "8") {
		window.location.href = "index";
	} else if (e.code === "KeyH") {
		FixHeight();
	} else if (e.code === "KeyL") {
		FixWidth();
	} else if (e.code === "KeyB") {
		TBM();
	} else if (e.code === "KeyR" && e.shiftKey === false) {
		rotate(90);
	} else if (e.code === "KeyR" && e.shiftKey === true) {
		rotate(-90);
	} else if (e.code === "KeyO") {
		markasread();
	} else if (e.code === "KeyI") {
		markasreading();
	} else if (e.code === "KeyU") {
		markasunread();
	} else if (e.code === "KeyP") {
		ToogleFav();
	}

});

document.getElementById('viewport').addEventListener('touchstart', handleTouchStart, false);
document.getElementById('viewport').addEventListener('touchmove', handleTouchMove, false);

let xDown = null;
let yDown = null;

function getTouches(evt) {
	return evt.touches ||             // browser API
		evt.originalEvent.touches; // jQuery
}

function handleTouchStart(evt) {
	const firstTouch = getTouches(evt)[0];
	xDown = firstTouch.clientX;
	yDown = firstTouch.clientY;
};

function handleTouchMove(evt) {
	if ( ! xDown || ! yDown ) {
		return;
	}

	let xUp = evt.touches[0].clientX;
	let yUp = evt.touches[0].clientY;

	let xDiff = xDown - xUp;
	let yDiff = yDown - yUp;

	if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
		if ( xDiff > 0 ) {
			NextPage();
		} else {
			PreviousPage();
		}
	}
	/* reset values */
	xDown = null;
	yDown = null;
};


//Send BE
//Modify the JSON for config.json
function modifyConfigJson(json, tomod, mod) {
	//check si obj exist pour remplacer valeur
	fetch(PDP + "/config/getConfig/" + connected).then(function (response) {
		return response.text();
	}).then(function (data) {
		let configFile = data;
		let config = JSON.parse(configFile);
		for (let i in config) {
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
let ZoomLVL = 20;

function changeZoomLVL() {
	let val = document.getElementById("zlvls").value;
	ZoomLVL = parseInt(val);
	document.getElementById("zlvll").innerText =
		language["zoomlvl"] + " (" + ZoomLVL + "px):";
	modifyConfigJson(CosmicComicsData + "/config.json", "ZoomLVL", ZoomLVL);
}

//Zoom in
function ZoomIn() {
	if (VIV_On === true) {
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
		if (DoublePageMode === true) {
			document.getElementById("imgViewer_1").style.height =
				parseInt(document.getElementById("imgViewer_1").style.height) +
				ZoomLVL +
				"px";
		}
	}
}

//To Zoom Out
function ZoomOut() {
	if (VIV_On === true) {
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
		if (DoublePageMode === true) {
			document.getElementById("imgViewer_1").style.height =
				parseInt(document.getElementById("imgViewer_1").style.height) -
				ZoomLVL +
				"px";
		}
	}
}

//Detect where the wheel go
function detectMouseWheelDirection(e) {
	let delta = null,
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

let ctrlisDown = false;
let maxHeight = 10000000;
let minHeight = 100;
//Send BE
//Trigger Automatic background
function AutoBGC() {
	if (toogleBGC === true) {
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
	return fetch(PDP + "/img/getColor/" + page + "/" + connected).then(function (response) {
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
	if (DoublePageMode === true) {
		document.getElementById("imgViewer_0").style.width =
			(window.innerWidth - 5) / 2 + "px";
		document.getElementById("imgViewer_0").style.height = "auto";
		document.getElementById("imgViewer_1").style.width =
			(window.innerWidth - 5) / 2 + "px";
		document.getElementById("imgViewer_1").style.height = "auto";
	}
	if (SideBarOn === true) {
		document.getElementById("imgViewer_0").style.width =
			window.innerWidth - 205 + "px";
		document.getElementById("imgViewer_0").style.height = "auto";
		document.getElementById("imgViewer_1").style.width =
			window.innerWidth - 205 + "px";
		document.getElementById("imgViewer_1").style.height = "auto";
	}
	if (VIV_On === true) {
		for (let i = 0; i < VIV_Count; i++) {
			if (SideBarOn === true) {
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
	let thepage = GetCurrentPage();
	let filePath = GetFilePath();
	getFromDB("Bookmarks", "PATH,page FROM Bookmarks WHERE BOOK_ID='"+bookID+"' AND PATH='" + filePath + "' AND page=" + thepage + ";").then((res1) => {
		let jres = JSON.parse(res1);
		if (jres.length !== 0) {
			console.log(jres);
			if (jres[0]["page"] === GetCurrentPage()) {
				DeleteFromDB(
					"Bookmarks",
					bookID,
					"AND page=" + GetCurrentPage()
				);
				document.getElementById("BMI").innerText = "bookmark_border";
			}
		} else {
			console.log("Bookmarks doesn't exist yet!");
			InsertIntoDB(
				"bookmarks",
				"(BOOK_ID,PATH,page)",
				"('" + bookID + "','" + GetFilePath() + "','" + GetCurrentPage() + "')"
			);
			document.getElementById("BMI").innerText = "bookmark";
		}
	});
}

//Send BE
//Loading the BookMark
async function LoadBMI(pagec = 0) {
	try {
		await getFromDB("Bookmarks", "* FROM Bookmarks WHERE BOOK_ID='" + bookID + "' AND page=" + pagec + ";").then((res) => {
			res = JSON.parse(res);
			console.log(res);
			if (res.length !== 0) {
				document.getElementById("BMI").innerText = "bookmark";
			} else {
				document.getElementById("BMI").innerText = "bookmark_border";
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
	if (DoublePageMode === true) {
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
		if (document.getElementById("BPABS").checked === true) {
			document.getElementById("BPABS").checked = false;
			BPAB();
		}
		if (document.getElementById("NDPFHS").checked === true) {
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
		let currentPage = GetCurrentPage();
		if (currentPage % 2 === 0) {
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
	if (VIV_On === true) {
		for (let i = 0; i < VIV_Count; i++) {
			document.getElementById("imgViewer_" + i).style.marginBottom =
				document.getElementById("MarginValue").value;
			document.getElementById("marginlvl").innerText =
				language["margin"] +
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
		document.getElementById("marginlvl").innerText =
			language["margin"] +
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
	if (BlankFirstPage === true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Blank_page_At_Begginning",
			false
		);
		BlankFirstPage = false;
		let currentPage = GetCurrentPage();
		Reader(listofImg, currentPage);
	} else {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"Blank_page_At_Begginning",
			true
		);
		BlankFirstPage = true;
		let currentPage = GetCurrentPage();
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
	let CurrentPage = GetCurrentPage();
	let NextPage = CurrentPage + 1;
	let image = new Image();
	image.src = CosmicComicsTempI + listofImg[NextPage];
	let H = DetectHorizontal(image);
	return H;
}

//Getting the orientation (Horizontal or Vertical) of the previous image
function GetTheHOfPreviousImage() {
	let CurrentPage = GetCurrentPage();
	let NextPage = CurrentPage - 2;
	let image = new Image();
	image.src = CosmicComicsTempI + listofImg[NextPage];
	let H = DetectHorizontal(image);
	return H;
}

//Send BE
//No Double Page when Horizontal
function NDPFH() {
	if (DPMNoH === true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"No_Double_Page_For_Horizontal",
			false
		);
		DPMNoH = false;
		let currentPage = GetCurrentPage();
	} else {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"No_Double_Page_For_Horizontal",
			true
		);
		DPMNoH = true;
		let currentPage = GetCurrentPage();
	}
}

//preloading images
let preloadedImages = [];

function preloadImage(listImages) {
	for (let i = 0; i < listImages.length; i++) {
		preloadedImages[i] = new Image();
		let options = {
			"method": "GET",
			"headers": {
				"Content-Type": "application/json",
				"path": DirectoryPath,
				"token": connected,
				"met": isADirectory ? "DL" : "CLASSIC",
				"page": listImages[i]
			}
		};
		let a = i
		fetch(PDP+ "/view/readImage", options).then(async (response) => {
			preloadedImages[a].src = URL.createObjectURL(await response.blob());
		});
	}
}

//Error When loading images
document.getElementById("imgViewer_0").onerror = function () {
	Toastifycation(language["error"], "#ff0000");
	document.getElementById("imgViewer_0").src = "Images/fileDefault.webp";
};
document.getElementById("imgViewer_1").onerror = function () {
	Toastifycation(language["error"], "#ff0000");
	document.getElementById("imgViewer_1").src = "Images/fileDefault.webp";
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
	if (mangaMode === true) {
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
	let newlist = [];
	for (let i = 0; i < list.length; i++) {
		newlist[i] = list[i];
	}
	newlist.reverse();
	return newlist;
}

//Rotation of an element
let degreesT = 0;
let AlwaysRotateB = false;
let AlwaysRotateV = 0;

function rotate(degrees = 0) {
	degreesT += degrees;
	if (VIV_On === true) {
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
	let rotateval = document.getElementById("RotateValue").value;
	AlwaysRotateB = true;
	AlwaysRotateV = rotateval;
	if (rotateval === 0) {
		AlwaysRotateB = false;
		AlwaysRotateV = 0;
	}
	if (VIV_On === true) {
		for (let i = 0; i < VIV_Count; i++) {
			document.getElementById("imgViewer_" + i).style.transform =
				"rotate(" + AlwaysRotateV + "deg)";
		}
	} else {
		document.getElementById("imgViewer_0").style.transform =
			"rotate(" + AlwaysRotateV + "deg)";
		document.getElementById("imgViewer_1").style.transform =
			"rotate(" + AlwaysRotateV + "deg)";
		document.getElementById("rotlvl").innerText =
			language["rotation"] + " (" + rotateval + " degrees):";
	}
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"Rotate_All",
		AlwaysRotateV
	);
}

//Send BE
//Slide Show
let TSSON = false;

function TSS() {
	if (TSSON === true) {
		modifyConfigJson(
			CosmicComicsData + "/config.json",
			"SlideShow",
			false
		);
		TSSON = false;
	} else {
		modifyConfigJson(CosmicComicsData + "/config.json", "SlideShow", true);
		TSSON = true;
		let intervalTime = document.getElementById("SSValue").value * 1000;
		let slideshowID = setInterval(() => {
			if (TSSON === false) {
				clearInterval(slideshowID);
			} else {
				NextPage();
			}
		}, intervalTime);
	}
}

//Text of the Slide Show slider
function ShowOnChangeSlideShow() {
	document.getElementById("sstxt").innerText =
		language["slideshow_interval"] +
		" (" +
		document.getElementById("SSValue").value +
		" " +
		language["secondes"] +
		"):";
}

//FullScreen
let fsOn = false;

function fullscreen() {
	if (fsOn === true) {
		fsOn = false;
		document.exitFullscreen();
		document.getElementById("fullscreen_i_id").innerText = "fullscreen";
	} else {
		fsOn = true;
		document.documentElement.requestFullscreen();
		document.getElementById("fullscreen_i_id").innerText = "fullscreen_exit";
	}
}

//Send BE
//No bar Mode
let BarOn = true;

function NoBAR() {
	if (BarOn === true) {
		document.getElementsByTagName("header")[0].style.display = "none";
		modifyConfigJson(CosmicComicsData + "/config.json", "NoBar", true);
		BarOn = false;
		let newdiv = document.createElement("div");
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

let SideBarOn = false;
//Send BE
//Toggle SideBar
function TSB() {
	if (SideBarOn === true) {
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
	if (document.getElementById("SideBar").childElementCount === 0) {
		console.log(listofImg);
		listofImg.forEach((image, index) => {
			let el = document.getElementById("SideBar");
			const divcontainer = document.createElement("div");
			const acontainer = document.createElement("a");
			const pel = document.createElement("p");
			const img = document.createElement("img");
			let options = {
				"method": "GET",
				"headers": {
					"Content-Type": "application/json",
					"path": DirectoryPath,
					"token": connected,
					"met": isADirectory ? "DL" : "CLASSIC",
					"page": image
				}
			};
			fetch(PDP+ "/view/readImage", options).then(async (response) => {
				img.src = URL.createObjectURL(await response.blob());
			});
			img.height = "120";
			pel.innerText = index + 1;
			acontainer.appendChild(img);
			acontainer.appendChild(pel);
			divcontainer.id = "id_img_" + index;
			acontainer.style.color = "white";
			acontainer.style.width = "100%";
			divcontainer.style.cursor = "pointer";
			divcontainer.addEventListener("click", function (e) {
				e.preventDefault();
				if (VIV_On === true) {
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
let DM_CurrentPage = true;

function ChangeDM_CurrentPage() {
	if (DM_CurrentPage === true) {
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
function VIVT() {
	if (VIV_On === true) {
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
	let el = document.getElementById("viewport");
	document.getElementById("imgViewer_0").remove();
	document.getElementById("imgViewer_1").remove();
	VIV_Count = listofImg.length;
	for (let i = 0; i < listofImg.length; i++) {
		const imgel = document.createElement("img");
		const div = document.createElement("div");
		imgel.id = "imgViewer_" + i;
		let options = {
			"method": "GET",
			"headers": {
				"Content-Type": "application/json",
				"path": DirectoryPath,
				"token": connected,
				"met": isADirectory ? "DL" : "CLASSIC",
				"page": listofImg[i]
			}
		};
		fetch(PDP + "/view/readImage", options).then(async (response) => {
			imgel.src = URL.createObjectURL(await response.blob());
		});
		div.appendChild(imgel);
		div.id = "div_imgViewer_" + i;
		el.appendChild(div);
		observer.observe(document.querySelector("#div_imgViewer_" + i));
	}
}

//observer to know where you are on the page
let observer = new IntersectionObserver(
	function (entries) {
		if (entries[0].isIntersecting === true)
			document.getElementById("currentpage").innerText =
				parseInt(entries[0].target.id.split("div_imgViewer_")[1]) +
				1 +
				" / " +
				VIV_Count;
		try {
			for (let i = 0; i < VIV_Count; i++) {
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
	let pageto = document.getElementById("sps").value - 1;
	document.getElementById("lsps").innerText =
		language["page_slider"] +
		" (" +
		document.getElementById("sps").value +
		"):";
	Reader(listofImg, pageto);
}

//Do not remember what this do, sorry
function pagechoose() {
	let pageto = document.getElementById("input_text").value - 1;
	if (
		pageto >= document.getElementById("sps").min - 1 &&
		pageto <= document.getElementById("sps").max - 1
	) {
		Reader(listofImg, pageto);
	} else {
		Toastifycation(language["not_available"], "#ff0000");
	}
}

//Send BE
//Webtoon Mode
let WTMTV = false;

function WTMT() {
	if (WTMTV === true) {
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
	let value = document.getElementById("exampleColorInput").value;
	document.getElementsByTagName("html")[0].style.backgroundColor = value;
	modifyConfigJson(
		CosmicComicsData + "/config.json",
		"Background_color",
		value
	);
}

//Send BE
//reset zoom for each page
let RZPV = false;

function RZP() {
	if (RZPV === true) {
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
let scrollbarvisibiel = true;

function SBVT() {
	if (scrollbarvisibiel === true) {
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
	let styleSheet = document.styleSheets[document.styleSheets.length - 3];
	styleSheet.insertRule("::-webkit-scrollbar {display: none;}");
}

//Set scrollbar
function setScrollbar() {
	let styleSheet = document.styleSheets[document.styleSheets.length - 3];
	styleSheet.removeRule("::-webkit-scrollbar {display: none;}");
}

//Load the parameters
//Send BE
function loadParameters() {
	fetch(PDP + "/config/getConfig/" + connected).then(function (response) {
		return response.text();
	}).then(function (data) {
		console.log(data);
		let configFile = data;
		let parsedJSON = JSON.parse(configFile);
		let configZoomLVL = GetElFromInforPath("ZoomLVL", parsedJSON);
		let configSBV = GetElFromInforPath("Scroll_bar_visible", parsedJSON);
		let configBGC = GetElFromInforPath("Background_color", parsedJSON);
		let configWTM = GetElFromInforPath("WebToonMode", parsedJSON);
		let configVRM = GetElFromInforPath("Vertical_Reader_Mode", parsedJSON);
		let configPC = GetElFromInforPath("Page_Counter", parsedJSON);
		let configSB = GetElFromInforPath("SideBar", parsedJSON);
		let configNB = GetElFromInforPath("NoBar", parsedJSON);
		let configSS = GetElFromInforPath("SlideShow", parsedJSON);
		let configSST = GetElFromInforPath("SlideShow_Time", parsedJSON);
		let configRA = GetElFromInforPath("Rotate_All", parsedJSON);
		let configM = GetElFromInforPath("Margin", parsedJSON);
		let configMM = GetElFromInforPath("Manga_Mode", parsedJSON);
		let configNDPFH = GetElFromInforPath(
			"No_Double_Page_For_Horizontal",
			parsedJSON
		);
		let configBPAB = GetElFromInforPath("Blank_page_At_Begginning", parsedJSON);
		let configDPM = GetElFromInforPath("Double_Page_Mode", parsedJSON);
		let configABC = GetElFromInforPath("Automatic_Background_Color", parsedJSON);
		let configMZ = GetElFromInforPath("magnifier_zoom", parsedJSON);
		let configMW = GetElFromInforPath("magnifier_Width", parsedJSON);
		let configMH = GetElFromInforPath("magnifier_Height", parsedJSON);
		let configMR = GetElFromInforPath("magnifier_Radius", parsedJSON);
		let configRZ = GetElFromInforPath("reset_zoom", parsedJSON);
		ZoomLVL = configZoomLVL;
		if (configSBV === false) {
			SBVT();
			document.getElementById("SBVS").checked = false;
		}
		if (configWTM === true) {
			WTMT();
			document.getElementById("WTM").checked = true;
		}
		let value = configBGC;
		document.getElementsByTagName("html")[0].style.backgroundColor = value;
		document.getElementById("exampleColorInput").value = value;
		if (configVRM === true) {
			VIVT();
			document.getElementById("VIV").checked = true;
		}
		if (configPC === false) {
			ChangeDM_CurrentPage();
			document.getElementById("PC").checked = false;
		}
		if (configSB === true) {
			TSB();
			document.getElementById("SSB").checked = true;
		}
		if (configNB === true) {
			NoBAR();
			document.getElementById("NBAR").checked = true;
		}
		if (configSS === true) {
			document.getElementById("SS").checked = true;
			if (TSSON === true) {
				TSSON = false;
			} else {
				TSSON = true;
				let intervalTime = configSST;
				let slideshowID = setInterval(() => {
					if (TSSON === false) {
						clearInterval(slideshowID);
					} else {
						NextPage();
					}
				}, intervalTime);
			}
		}
		document.getElementById("sstxt").innerText =
			language["slideshow_interval"] +
			" (" +
			configSST +
			" " +
			language["secondes"] +
			"):";
		document.getElementById("RotateValue").value = configRA;
		AlwaysRotate();
		if (VIV_On === true) {
			for (let i = 0; i < VIV_Count; i++) {
				document.getElementById("imgViewer_" + i).style.marginBottom = configM;
				document.getElementById("marginlvl").innerText =
					language["margin"] + " (" + configM + " px):";
			}
		} else {
			document.getElementById("imgViewer_1").style.marginLeft = configM;
			document.getElementById("marginlvl").innerText =
				language["margin"] + " (" + configM + " px):";
		}
		if (configMM === true) {
			MMT();
			document.getElementById("MMS").checked = true;
		}
		if (configNDPFH === true) {
			NDPFH();
			document.getElementById("NDPFHS").checked = true;
		}
		if (configBPAB === true) {
			BPAB();
			document.getElementById("BPABS").checked = true;
		}
		if (configDPM === true) {
			TDPM();
			document.getElementById("TDPMS").checked = true;
		}
		if (configABC === true) {
			AutoBGC();
		}
		document.getElementById("Heightvalue").value = configMH;
		document.getElementById("widthvalue").value = configMW;
		document.getElementById("zoomvalue").value = configMZ;
		document.getElementById("Radiusvalue").value = configMR;
		document.getElementById("SSValue").value = configSST;
		document.getElementById("MarginValue").value = configM;
		if (configRZ === true) {
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
let Auth_Prev = false;
let Auth_next = false;
window.onscroll = function (ev) {
	if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
		console.log("You're at the bottom");
		Auth_next = true;
	} else {
		Auth_next = false;
	}
	if (document.body.scrollTop === 0) {
		console.log("You're at the top");
		Auth_Prev = true;
	} else {
		Auth_Prev = false;
	}
};
let nb_of_next = 0;
let nb_of_prev = 0;
//Go to the next or previous page by scrolling
window.addEventListener("wheel", function (e) {
	if (ctrlisDown) {
		console.log(ctrlisDown);
		ctrlisDown = false;
		let direc = detectMouseWheelDirection(e);
		console.log(direc);
		if (direc === "down") {
			if (
				parseInt(document.getElementById("imgViewer_0").style.height) - 100 >
				minHeight
			) {
				ZoomOut();
			}
		} else if (direc === "up") {
			if (
				parseInt(document.getElementById("imgViewer_0").style.height) + 100 <
				maxHeight
			) {
				ZoomIn();
			}
		}
	} else {
		if (Auth_next === true) {
			nb_of_next += 1;
			if (nb_of_next === 2) {
				nb_of_next = 0;
				nb_of_prev = 0;
				Auth_next = false;
				Auth_Prev = false;
				NextPage();
			}
		}
		if (Auth_Prev === true) {
			nb_of_prev += 1;
			if (nb_of_prev === 2) {
				nb_of_next = 0;
				Auth_next = false;
				nb_of_prev = 0;
				Auth_Prev = false;
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
