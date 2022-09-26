const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();
const SevenBin = require("7zip-bin");
const unrarBin = require("unrar-binaries");
const os = require("os");
const tinycolor = require("tinycolor2");
let Unrar = require("unrar");
const Seven = require("node-7z");
const {getColor, getPalette} = require('color-extr-thief');
const Path27Zip = SevenBin.path7za;
app.use(express.static(path.join(__dirname, '/public')));
const isPortable = fs.existsSync(path.join(__dirname, "portable.txt"));
const isElectron = fs.existsSync(path.join(__dirname, 'portable.txt')) && fs.readFileSync(path.join(__dirname, "portable.txt"), "utf8") === "electron";
let path2Data;
if (isPortable) {
	if (isElectron) {
		path2Data = path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'CosmicData');
	} else {
		path2Data = path.join(path.dirname(__dirname), 'CosmicData');
	}
} else {
	if (os.platform() === "win32") {
		path2Data = process.env.APPDATA + "/CosmicComics/CosmicData/";
	} else if (os.platform() === "darwin") {
		path2Data = process.env.HOME + "/Library/Application Support/CosmicComics/CosmicData/";
	} else if (os.platform() === "linux") {
		path2Data = process.env.HOME + "/.config/CosmicComics/CosmicData/";
	}
}
let CosmicComicsTemp = path2Data;
let sqlite3 = require("sqlite3");
const anilist = require("anilist-node");
const AniList = new anilist();
const {Client} = require("anilist.js");
const AniList2 = new Client();
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
const ValidatedExtensionImage = [
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
let mangaMode = false;
let devMode = true;
if (devMode) {
	CosmicComicsTemp = path.join(__dirname, "CosmicData");
}
//Creating the folders to the CosmicData's path
fs.mkdirSync(CosmicComicsTemp, {recursive: true});
//If the serverconfig.json doesn't exist, create it
if (!fs.existsSync(CosmicComicsTemp + "/serverconfig.json")) {
	const obj = {
		"Token": {},
		"port": 4696
	};
	fs.writeFileSync(CosmicComicsTemp + "/serverconfig.json", JSON.stringify(obj), {encoding: 'utf8'});
} else {
	if (devMode === false) {
		//Reseting the serverconfig.json for revoking tokens
		let configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json");
		let config = JSON.parse(configFile);
		config["Token"] = {};
		fs.writeFileSync(CosmicComicsTemp + "/serverconfig.json", JSON.stringify(config), {encoding: 'utf8'});
	}
}
const upload = multer({dest: CosmicComicsTemp + "/uploads/"});

/**
 * Check if the passed param has number in it
 * @param {string} toCheck
 */
function hasNumbers(toCheck) {
	const regex = /\d/g;
	return regex.test(toCheck);
}

/**
 * Get the name without some special characters
 * @param {string} CommonName
 * @return {string} finalName
 */
function GetTheName(CommonName = "") {
	CommonName = CommonName.replaceAll("-", " ");
	CommonName = CommonName.replaceAll(")", " ");
	CommonName = CommonName.replaceAll("(", " ");
	CommonName = CommonName.replaceAll("[", " ");
	CommonName = CommonName.replaceAll("]", " ");
	CommonName = CommonName.replace(/\.[^/.]+$/, "");
	var s = CommonName.split(" ");
	var finalName = "";
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

if (!fs.existsSync(CosmicComicsTemp + "/FirstImageOfAll")) {
	fs.mkdirSync(CosmicComicsTemp + "/FirstImageOfAll");
}
const cors = require('cors');
const {spawn} = require('child_process');

function backupTable(user, tableName) {
	getDB(user).run("ALTER TABLE " + tableName + " RENAME TO " + tableName + "_old");
}

async function getAllColumns(user, tableName) {
	return await getDB(user).run("SELECT type,tbl_name FROM sqlite_master", (err, rows) => {
		if (err) {
			console.log(err);
		}
		return rows["tbl_name"][tableName];
	})
}

function makeDB(forwho) {
	let db = new sqlite3.Database(CosmicComicsTemp + '/profiles/' + forwho + '/CosmicComics.db', (err) => {
		if (err) {
			return console.error(err.message);
		}
		console.log("Connected to the DB");
	});
	db.run('CREATE TABLE IF NOT EXISTS Books (ID_book INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, API_ID VARCHAR(255), NOM VARCHAR(255) NOT NULL,note INTEGER,read boolean NOT NULL,reading boolean NOT NULL,unread boolean NOT NULL,favorite boolean NOT NULL,last_page INTEGER NOT NULL,folder boolean NOT NULL,PATH VARCHAR(255) NOT NULL,URLCover VARCHAR(255), issueNumber INTEGER,description VARCHAR(255),format VARCHAR(255),pageCount INTEGER,URLs VARCHAR(255),series VARCHAR(255),creators VARCHAR(255),characters VARCHAR(255),prices VARCHAR(255),dates VARCHAR(255),collectedIssues VARCHAR(255),collections VARCHAR(255),variants VARCHAR(255),lock boolean DEFAULT false NOT NULL)');
	db.run("CREATE TABLE IF NOT EXISTS Bookmarks (ID_BOOKMARK INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,BOOK_ID VARCHAR(255) NOT NULL,PATH VARCHAR(4096) NOT NULL,page INTEGER NOT NULL,FOREIGN KEY (BOOK_ID) REFERENCES Book (ID_book));");
	db.run("CREATE TABLE IF NOT EXISTS API (ID_API INTEGER PRIMARY KEY NOT NULL, NOM VARCHAR(255) NOT NULL);", () => {
		db.run("REPLACE INTO API (ID_API,NOM) VALUES (1,'Marvel'), (2,'Anilist'),(3,'LeagueOfComicsGeeks');");
	});
	db.run("CREATE TABLE IF NOT EXISTS Series (ID_Series VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,title VARCHAR(255) NOT NULL,note INTEGER,statut VARCHAR(255),start_date VARCHAR(255),end_date VARCHAR(255),description VARCHAR(255),Score INTEGER,genres VARCHAR(255),cover VARCHAR(255),BG VARCHAR(255),CHARACTERS VARCHAR(255),TRENDING INTEGER,STAFF VARCHAR(255),SOURCE VARCHAR(255),volumes INTEGER,chapters INTEGER,favorite boolean NOT NULL,PATH VARCHAR(255) NOT NULL,lock boolean DEFAULT false NOT NULL );");
	db.run("CREATE TABLE IF NOT EXISTS Creators (ID_CREATOR VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),description VARCHAR(255),url VARCHAR(255))");
	db.run("CREATE TABLE IF NOT EXISTS Characters (ID_CHAR VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),description VARCHAR(255),url VARCHAR(255))");
	db.run("CREATE TABLE IF NOT EXISTS variants (ID_variant VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),url VARCHAR(255),series VARCHAR(255), FOREIGN KEY (series) REFERENCES Series (ID_Series))");
	db.run("CREATE TABLE IF NOT EXISTS relations (ID_variant VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),description VARCHAR(255),url VARCHAR(255),series VARCHAR(255), FOREIGN KEY (series) REFERENCES Series (ID_Series))");
	db.run("CREATE TABLE IF NOT EXISTS Libraries (ID_LIBRARY INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, NAME VARCHAR(255) NOT NULL,PATH VARCHAR(4096) NOT NULL,API_ID INTEGER NOT NULL,FOREIGN KEY (API_ID) REFERENCES API(ID_API));");
	db.run("PRAGMA user_version = " + process.env.npm_package_version.split(".").join("") + ";");
	db.close();
}

function resolveToken(token) {
	var configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json", "utf8");
	var config = JSON.parse(configFile);
	for (var i in config) {
		for (var j in config["Token"]) {
			if (config["Token"][j] === token) {
				return j;
			}
		}
	}
}

let openedDB = new Map();

async function checkForDBUpdate(forwho) {
	let DBVersion;
	await getDB(forwho).get("PRAGMA user_version", (err, row) => {
		DBVersion = row["user_version"];
		console.log(DBVersion);
		if (DBVersion < 20000) {
			console.log("Impossible to update the DB (you are using an old version of CosmicComics)");
		}
		if (DBVersion <= 20001) {
		}
		getDB(forwho).run("PRAGMA user_version = " + process.env.npm_package_version.split(".").join("") + ";");
	})
}

function getDB(forwho) {
	if (!openedDB.has(forwho)) {
		openedDB.set(forwho, new sqlite3.Database(CosmicComicsTemp + '/profiles/' + forwho + '/CosmicComics.db', (err) => {
			if (err) {
				return console.error(err.message);
			}
			checkForDBUpdate(forwho)
			console.log("Conected to the DB");
		}));
	}
	return openedDB.get(forwho);
}

app.use(cors());
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true}));
let host, port;

app.listen(JSON.parse(fs.readFileSync(CosmicComicsTemp + "/serverconfig.json").toString()).port, "0.0.0.0", function () {
	host = this.address().address;
	port = this.address().port;
	console.log("Listening on port %s:%s!", host, port);
});
app.post("/downloadBook", function (req, res) {
	if (fs.existsSync(CosmicComicsTemp + "/downloads") === false) {
		fs.mkdirSync(CosmicComicsTemp + "/downloads");
	}
	const python = spawn("python", [__dirname + "/external_scripts/bookDownloader.py", req.body.url, CosmicComicsTemp + "/downloads/" + req.body.name + "/" + req.body.vol]);
	python.stdout.on('data', (data) => {
		console.log(data.toString());
	});
	python.on('close', (code) => {
		console.log(`child process close all stdio with code ${code}`);
		res.sendStatus(200);
	});
});
let DLBOOKPATH = "";
app.post("/uploadComic", upload.single("ComicTemp"), function (req, res) {
	let file = req.file;
	console.log(file);
	fs.renameSync(file.path, CosmicComicsTemp + "/uploads/" + file.originalname);
	res.sendStatus(200);
})
app.post("/createUser", function (req, res) {
	const name = req.body.name;
	const passcode = req.body.password;
	fs.mkdirSync(CosmicComicsTemp + "/profiles/" + name, {recursive: true});
	console.log("Creating dir " + name);
	fs.writeFileSync(CosmicComicsTemp + "/profiles/" + name + "/passcode.txt", passcode.trim(), {encoding: "utf8"});
	if (!fs.existsSync(CosmicComicsTemp + "/profiles/" + name + "/config.json")) {
		const obj = {
			path: "",
			last_opened: "",
			language: "us",
			update_provider: "",
			ZoomLVL: 10,
			Scroll_bar_visible: true,
			Background_color: "rgb(33,33,33)",
			WebToonMode: false,
			Vertical_Reader_Mode: false,
			Page_Counter: true,
			SideBar: false,
			NoBar: false,
			SlideShow: false,
			SlideShow_Time: 1,
			Rotate_All: 0,
			Margin: 0,
			Manga_Mode: false,
			No_Double_Page_For_Horizontal: false,
			Blank_page_At_Begginning: false,
			Double_Page_Mode: false,
			Automatic_Background_Color: false,
			magnifier_zoom: 1,
			magnifier_Width: 100,
			magnifier_Height: 100,
			magnifier_Radius: 0,
			reset_zoom: false,
			force_update: false,
			skip: false,
			display_style: 0,
			theme: "default.css",
			theme_date: true
		};
		fs.writeFileSync(
			CosmicComicsTemp + "/profiles/" + name + "/config.json",
			JSON.stringify(obj, null, 2), {encoding: "utf8"}
		);
	}
	if (req.body.pp == {}) {
		let random = Math.floor(Math.random() * (fs.readdirSync(__dirname + "/public/Images/account_default/").length - 1) + 1);
		fs.copyFileSync(__dirname + "/public/Images/account_default/" + random + ".jpg", CosmicComicsTemp + "/profiles/" + name + "/pp.png");
	} else {
		let nppPath = req.body.pp.toString().replace(/http:\/\/(([0-9]{1,3}\.){3}[0-9]{1,3}){0,1}(localhost){0,1}:[0-9]{4}/g, __dirname + "/public");
		fs.copyFileSync(nppPath, CosmicComicsTemp + "/profiles/" + name + "/pp.png");
	}
	makeDB(name);
	console.log("User created");
	res.sendStatus(200);
});
app.get("/null", function (req, res) {
	res.sendFile(__dirname + "/public/Images/fileDefault.png");
});
app.post("/DL", function (req, res) {
	console.log(req.body);
	DLBOOKPATH = req.body.path;
	res.sendStatus(200);
});
app.get("/getDLBook", function (req, res) {
	if (DLBOOKPATH == "") {
		res.sendStatus(404);
	} else if (fs.existsSync(DLBOOKPATH) && !fs.statSync(DLBOOKPATH).isDirectory()) {
		res.download(DLBOOKPATH);
	} else if (fs.statSync(DLBOOKPATH).isDirectory()) {
		const compress = Seven.add(__dirname + "/public/TODL/" + path.basename(DLBOOKPATH) + ".zip", DLBOOKPATH, {
			recursive: true,
			$bin: Path27Zip
		});
		compress.on("error", (err) => {
			console.log(err);
		});
		compress.on("end", () => {
			console.log("Compressed");
			res.download(__dirname + "/public/TODL/" + path.basename(DLBOOKPATH) + ".zip");
		});
	} else {
		res.sendStatus(404);
	}
});
app.get("/", function (req, res) {
	res.sendFile(__dirname + "/launchPage.html");
});
app.get("/index", function (req, res) {
	res.sendFile(__dirname + "/index.html");
});
app.get("/css/base.css", (req, res) => {
	res.sendFile(__dirname + "/css/base.css");
});
app.get("/css/bootstrap.css", (req, res) => {
	res.sendFile(__dirname + "/css/bootstrap.css");
});
app.get("/modules/bootstrapJS", (req, res) => {
	res.sendFile(__dirname + "/node_modules/bootstrap/dist/js/bootstrap.bundle.js", {
		headers: {
			"Content-Type": "text/javascript"
		}
	});
});
app.get("/img/getColor/:img/:token", async (req, res) => {
	const token = resolveToken(req.params.token);
	var img = CosmicComicsTemp + "/profiles/" + token + "/current_book/" + req.params.img;
	const dominantColor = await getColor(img);
	res.send(dominantColor);
});
app.get("/img/getPalette/:token", async (req, res) => {
	const token = resolveToken(req.params.token);
	await getPalette(req.headers.img).then(function (palette) {
		let rgb = "rgb(" + palette[0][0] + "," + palette[0][1] + "," + palette[0][2] + ")";
		if (tinycolor(rgb).isLight()) {
			res.send(tinycolor(rgb).darken(45).toString());
		} else {
			res.send(rgb);
		}
	});
});
app.get("/css/materialize.css", (req, res) => {
	res.sendFile(__dirname + "/css/materialize.css");
});
app.get("/js/materialize.js", (req, res) => {
	res.sendFile(__dirname + "/js/materialize.js");
});
app.get("/index.js", (req, res) => {
	res.sendFile(__dirname + "/index.js");
});
app.get("/viewer.js", (req, res) => {
	res.sendFile(__dirname + "/viewer.js");
});
app.get("/viewer.html", (req, res) => {
	res.sendFile(__dirname + "/viewer.html");
});
app.get("/css/animate", (req, res) => {
	res.sendFile(__dirname + "/css/animate.css");
});
app.get("/js/html-magnifier.js", (req, res) => {
	res.sendFile(__dirname + "/js/html-magnifier.js");
});
app.get("/login", (req, res) => {
	res.sendFile(__dirname + "/login.html");
});
app.get("/js/login", (req, res) => {
	res.sendFile(__dirname + "/login.js");
});
app.get("/profile/DLBDD/:token", (req, res) => {
	const token = resolveToken(req.params.token);
	res.download(CosmicComicsTemp + "/profiles/" + token + "/CosmicComics.db", (err) => {
		if (err) console.log(err);
	});
});
var currentBookPath = "";
var SendToUnZip = "";
app.get("/Unzip/:path/:token", (req, res) => {
	const token = req.params.token;
	var currentPath = replaceHTMLAdressPath(req.params.path);
	currentBookPath = currentPath.split("&page=")[1];
	var patho = currentPath;
	var named = path.basename(patho);
	named = named.split(".");
	var ext = named.pop();
	UnZip(currentPath, CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book", "00000", ext, token);
	let inter = setInterval(() => {
		if (SendToUnZip !== "") {
			res.sendStatus(200);
			clearInterval(inter);
			return;
		}
	}, 1000);
});
app.get("/viewer/view/current/:token", (req, res) => {
	res.send(GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(req.params.token) + "/current_book/"));
});
app.get("/viewer/view/", (req, res) => {
	let param = replaceHTMLAdressPath(req.headers.path);
	let tosend = GetListOfImg(param);
	console.log(tosend);
	console.log(param);
	res.send(tosend);
});
app.get("/dirname", (req, res) => {
	res.send(path2Data);
});
app.get("/CosmicDataLoc", (req, res) => {
	res.send(CosmicComicsTemp);
});
app.get("/viewer/view/current/:page/:token", (req, res) => {
	var page = req.params.page;
	var listOfImg = GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(req.params.token) + "/current_book/");
	res.send(CosmicComicsTemp + "/profiles/" + resolveToken(req.params.token) + "/current_book/" + listOfImg[page]);
});
app.get("/config/getConfig/:token", (req, res) => {
	const token = resolveToken(req.params.token);
	res.send(fs.readFileSync(CosmicComicsTemp + "/profiles/" + token + "/config.json"));
});
app.get("/BM/getBM", (req, res) => {
	res.send(fs.readFileSync(CosmicComicsTemp + "/bookmarks.json"));
});
app.get("/lang/:lang", (req, res) => {
	res.send(fs.readFileSync(__dirname + "/languages/" + req.params.lang + ".json"));
});
app.get("/view/isDir/:path", (req, res) => {
	var isDir = fs.statSync(replaceHTMLAdressPath(req.params.path)).isDirectory();
	console.log(isDir);
	res.send(isDir);
});
app.get("/view/exist/:path", (req, res) => {
	var exist = fs.existsSync(replaceHTMLAdressPath(req.params.path));
	console.log(exist);
	res.send(exist);
});
app.get("/view/readFile/:path", (req, res) => {
	var o = replaceHTMLAdressPath(req.params.path);
	var p = fs.readFileSync(o, "utf8");
	res.send(JSON.stringify(p));
});
app.get("/view/readImage", (req, res) => {
	if (req.headers.met == "DL") {
		res.sendFile(req.headers.path + "/" + req.headers.page);
	} else if (req.headers.met == "CLASSIC") {
		let token = resolveToken(req.headers.token);
		res.sendFile(CosmicComicsTemp + "/profiles/" + token + "/current_book/" + req.headers.page);
	}
});
app.post('/config/writeConfig/:token', (req, res) => {
	console.log(req.body);
	const token = resolveToken(req.params.token);
	fs.writeFileSync(CosmicComicsTemp + "/profiles/" + token + "/config.json", JSON.stringify(req.body, null, 2));
	res.sendStatus(200);
});
app.post('/DB/write/:jsonFile', (req, res) => {
	fs.writeFileSync(CosmicComicsTemp + "/" + req.params.jsonFile + ".json", JSON.stringify(req.body, null, 2));
	res.sendStatus(200);
});
app.get("/DB/read/:jsonFile", (req, res) => {
	res.send(fs.readFileSync(CosmicComicsTemp + "/" + req.params.jsonFile + ".json"));
});
app.get("/themes/read/:jsonFile", (req, res) => {
	res.send(fs.readFileSync(__dirname + "/themes/" + req.params.jsonFile));
});
app.get("/DB/update/:token/:dbName/:colName/:value/:id", (req, res) => {
	try {
		getDB(resolveToken(req.params.token)).run("UPDATE " + req.params.dbName + " SET " + req.params.colName + " = " + req.params.value + " WHERE ID_book='" + req.params.id + "';");
	} catch (e) {
		console.log(e);
	}
	res.sendStatus(200);
});
app.post("/DB/update/", (req, res) => {
	if (req.body.type == "edit") {
		let listOfColumns = req.body.column;
		let listOfValues = req.body.value;
		let what = [];
		for (let i = 0; i < listOfColumns.length; i++) {
			if (listOfColumns[i] == "description") {
				what.push(listOfColumns[i] + " = \"" + listOfValues[i] + "\"");
			} else {
				what.push(listOfColumns[i] + " = '" + listOfValues[i] + "'");
			}
		}
		console.log(what);
		try {
			getDB(resolveToken(req.body.token)).run("UPDATE " + req.body.table + " SET " + what.toString() + " WHERE " + req.body.where + "='" + req.body.whereEl + "';");
		} catch (e) {
			console.log(e);
		}
	} else {
		try {
			getDB(resolveToken(req.body.token)).run("UPDATE " + req.body.table + " SET " + req.body.column + " = " + req.body.value + " WHERE " + req.body.where + "='" + req.body.whereEl + "';");
		} catch (e) {
			console.log(e);
		}
	}
	res.sendStatus(200);
});
app.post("/DB/lib/update/:token/:id", (req, res) => {
	console.log(req.body);
	const name = req.body.name;
	const path = req.body.path;
	const api = req.body.api_id;
	const token = resolveToken(req.params.token);
	console.log(name, path, api);
	console.log("UPDATE Libraries SET NAME='" + name + "', PATH='" + path + "', API_ID=" + api + " WHERE ID_LIBRARY=" + req.params.id + ";");
	try {
		getDB(token).run("UPDATE Libraries SET NAME='" + name + "', PATH='" + path + "', API_ID=" + api + " WHERE ID_LIBRARY=" + req.params.id + ";");
	} catch (e) {
		console.log(e);
	}
	res.sendStatus(200);
});
app.post("/DB/insert/:token/:dbName", (req, res) => {
	try {
		const dbinfo = req.body.into;
		const values = req.body.val;
		const token = resolveToken(req.params.token);
		console.log(dbinfo + values);
		getDB(token).run("INSERT OR IGNORE INTO " + req.params.dbName + " " + dbinfo + " VALUES " + values + ";");
	} catch (e) {
		console.log(e);
	}
	res.sendStatus(200);
});
app.get("/DB/delete/:token/:dbName/:id/:option", (req, res) => {
	try {
		const token = resolveToken(req.params.token);
		getDB(token).run("DELETE FROM " + req.params.dbName + " WHERE BOOK_ID='" + req.params.id + "' " + req.params.option + ";");
	} catch (e) {
		console.log(e);
	}
	res.sendStatus(200);
});
app.get("/DB/lib/delete/:token/:id", (req, res) => {
	try {
		const token = resolveToken(req.params.token);
		getDB(token).run("DELETE FROM Libraries WHERE ID_LIBRARY=" + req.params.id + ";");
	} catch (e) {
		console.log(e);
	}
	res.sendStatus(200);
});
app.post("/DB/get/:token/:dbName", (req, res) => {
	try {
		var result = [];
		const token = resolveToken(req.params.token);
		const requestToDB = req.body.request;
		getDB(token).all("SELECT " + requestToDB + ";", function (err, resD) {
			if (err) return console.log("Error getting element", err);
			resD.forEach((row) => {
				result.push(row);
			});
			res.send(result);
		});
	} catch (e) {
		console.log(e);
	}
});
app.get("/getVersion", (req, res) => {
	res.send(process.env.npm_package_version);
});
app.get("/getListOfFolder/:path", (req, res) => {
	var dir = req.params.path;
	dir = replaceHTMLAdressPath(dir);
	var listOfFolder = [];
	if (fs.existsSync(dir)) {
		fs.readdirSync(dir).forEach(function (file) {
			file = dir + "/" + file;
			var stat = fs.statSync(file);
			if (stat.isDirectory()) {
				listOfFolder.push(file);
			} else {
			}
		});
	}
	res.send(listOfFolder);
});
app.get("/profile/discover", (req, res) => {
	let result = [];
	try {
		fs.readdirSync(CosmicComicsTemp + "/profiles").forEach(function (file) {
			let resultOBJ = {};
			resultOBJ.name = path.basename(file, path.extname(file));
			resultOBJ.image = "/profile/getPPBN/" + path.basename(file, path.extname(file));
			if (fs.existsSync(CosmicComicsTemp + "/profiles/" + file + "/passcode.txt")) {
				resultOBJ.passcode = true;
			} else {
				resultOBJ.passcode = false;
			}
			result.push(resultOBJ);
		});
	} catch (e) {
		console.log("No profile, First time setup...");
	}
	res.send(result);
});
var rand = function () {
	return Math.random().toString(36).substr(2); // remove `0.`
};
var tokena = function () {
	return rand() + rand(); // to make it longer
};
setInterval(() => {
	console.log("Resetting Tokens");
	var configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json", "utf8");
	var config = JSON.parse(configFile);
	for (var i in config) {
		config["Token"] = {};
	}
	fs.writeFileSync(CosmicComicsTemp + "/serverconfig.json", JSON.stringify(config));
}, 2 * 60 * 60 * 1000);
setInterval(() => {
	console.log("Removing ZIPs to DL");
	if (fs.existsSync(__dirname + "/public/TODL")) {
		fs.rmSync(__dirname + "/public/TODL", {recursive: true, force: true});
	}
}, 2 * 60 * 60 * 1000);
app.get("/profile/login/:name/:passcode", (req, res) => {
	if (fs.existsSync(CosmicComicsTemp + "/profiles/" + req.params.name + "/passcode.txt")) {
		var passcode = fs.readFileSync(CosmicComicsTemp + "/profiles/" + req.params.name + "/passcode.txt", "utf8");
		if (passcode == req.params.passcode) {
			let token = tokena();
			var configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json", "utf8");
			var config = JSON.parse(configFile);
			for (var i in config) {
				config["Token"][req.params.name] = token;
			}
			fs.writeFileSync(CosmicComicsTemp + "/serverconfig.json", JSON.stringify(config));
			res.send(token);
		} else {
			res.send(false);
		}
	} else {
		res.send(false);
	}
});
app.get("/profile/logcheck/:token", (req, res) => {
	var configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json", "utf8");
	var config = JSON.parse(configFile);
	for (var i in config) {
		for (var j in config["Token"]) {
			if (config["Token"][j] == req.params.token) {
				res.send(j);
				return;
			}
		}
	}
	res.send(false);
});
app.post("/profile/logout/:token", (req, res) => {
	var configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json", "utf8");
	var config = JSON.parse(configFile);
	for (var i in config) {
		for (var j in config["Token"]) {
			if (config["Token"][j] == req.params.token) {
				delete config["Token"][j];
				fs.writeFileSync(CosmicComicsTemp + "/serverconfig.json", JSON.stringify(config), {encoding: 'utf8'});
				res.sendStatus(200);
				return;
			}
		}
	}
	res.sendStatus(402);
});
app.get("/getListOfFilesAndFolders/:path", (req, res) => {
	var dir = req.params.path;
	dir = replaceHTMLAdressPath(dir);
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
	res.send(result);
});
app.get("/api/anilist/search/:name", (req, res) => {
	var name = req.params.name;
	let isSend = false;
	AniList.searchEntry.manga(
		name,
		null, 1,
		25
	).then(async function (data) {
		if (data == null || data.pageInfo.total == 0) {
			res.send(null);
		} else {
			for (let i = 0; i < data.media.length; i++) {
				console.log(isSend, i);
				let item = data.media[i];
				console.log(item.title.romaji, name);
				if (item.title.romaji.toLowerCase() == name.toLowerCase() || item.title.english.toLowerCase() == name.toLowerCase() || item.title.native.toLowerCase() == name.toLowerCase()) {
					if (!isSend) {
						await AniList.media.manga(data.media[i].id).then(function (data2) {
							isSend = true;
							res.send(data2);
						});
					}
				}
			}
			if (!isSend) {
				res.send(null);
			}
		}
	}).catch(function (err) {
		console.log(err);
	});
});
app.get("/api/anilist/searchByID/:id", (req, res) => {
	try {
		AniList.media.manga(parseInt(req.params.id)).then(function (data2) {
			res.send(data2);
		});
	} catch (e) {
		res.sendStatus(500);
	}
});
app.get("/api/anilist/searchOnly/:id", (req, res) => {
	var name = req.params.name;
	let isSend = false;
	AniList.searchEntry.manga(
		name,
		null, 1,
		25
	).then(async function (data) {
		if (data == null || data.pageInfo.total == 0) {
			res.send(null);
		} else {
			res.send(data.media)
		}
	});
});
app.get("/api/anilist/creator/:id", (req, res) => {
	try {
		AniList.people.staff(parseInt(req.params.id)).then(function (data) {
			res.send(data);
		});
	} catch (e) {
		console.log(e);
	}
});
app.get("/api/anilist/character/:id", (req, res) => {
	try {
		AniList.people.character(parseInt(req.params.id)).then(function (data) {
			res.send(data);
		});
	} catch (e) {
		console.log(e);
	}
});
app.get("/api/anilist/relations/:name", (req, res) => {
	try {
		AniList2.searchMedia({
			search: req.params.name,
			format: "MANGA",
			perPage: 25
		})
			.then(function (data) {
				res.send(data["Results"][0]["info"]["relations"]["edges"]);
			});
	} catch (e) {
		console.log(e);
	}
});
app.get("/getThemes", (req, res) => {
	var oi = fs.readdirSync(__dirname + "/public/themes");
	let result = [];
	oi.forEach((el) => {
		result.push(el, path.basename(__dirname + "/themes/" + el).split(".")[0]);
	});
	res.send(result);
});
////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////  Commmon  ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
function replaceHTMLAdressPath(path) {
	var HTMLParam = path.replaceAll("%20", " ");
	HTMLParam = HTMLParam.replaceAll("ù", "/").replaceAll("%C3%B9", "/").replaceAll("%23", "#");
	return HTMLParam;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////  Viewer  /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
function GetElFromInforPath(search, info) {
	for (var i in info) {
		if (i == search) {
			return info[i];
		}
	}
	return null;
}

function SendTo(val) {
	console.log("sendto => " + val);
	SendToUnZip = val;
}

//UnZip the archive
function UnZip(zipPath, ExtractDir, name, ext, token) {
	var listofImg;
	try {
		var n = 0;
		if (fs.existsSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book")) {
			fs.rmSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book", {
				recursive: true
			});
		}
		/*fs.mkdirSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");*/
		fs.mkdirSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");
		fs.writeFileSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book/path.txt", zipPath);
		if (ext === "pdf") {
			alert(language[0]["pdf"]);
			window.location.href = zipPath;
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
				$bin: Path27Zip
			});
			var resEnd;
			Stream.on("end", () => {
				listofImg = GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");
				console.log("finish");
				var name1 = path.basename(zipPath);
				console.log(zipPath);
				var shortname = name1.split(".")[0];
				var lastpage = 0;
				try {
					try {
						var result = [];
						getDB(resolveToken(token)).all("SELECT last_page FROM Books WHERE PATH='" + zipPath + "';", function (err, resD) {
							if (err) return console.log("Error getting element", err);
							resD.forEach((row) => {
								console.log(row);
								result.push(row);
							});
							console.log(result);
							SendTo(result[0].last_page);
							return result[0].last_page;
						});
					} catch (e) {
						console.log(e);
					}
				} catch (error) {
					console.log(error);
				}
			});
			Stream.on("error", (err) => {
				console.log("An error occured" + err);
			});
		}
		if (ext == "rar" || ext == "cbr") {
			var configFile = fs.readFileSync(CosmicComicsTemp + "/profiles/" + token + "/config.json");
			var parsedJSON = JSON.parse(configFile);
			var provider = GetElFromInforPath("update_provider", parsedJSON);
			if (provider == "msstore") {
				var archive = new Unrar({
					path: zipPath,
					bin: CosmicComicsTemp + "/unrar_bin/UnRAR.exe"
				});
			} else {
				var archive = new Unrar({
					path: zipPath,
					bin: unrarBin
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
							if (!fs.existsSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book")) {
								fs.mkdirSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");
							}
							if (
								currentName.includes("png") ||
								currentName.includes("jpg") ||
								currentName.includes("jpeg") ||
								currentName.includes(".gif") ||
								currentName.includes("bmp") ||
								currentName.includes("apng") ||
								currentName.includes("svg") ||
								currentName.includes("ico") ||
								currentName.includes("webp")
							) {
								stream.pipe(
									fs.createWriteStream(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book/" + name + ".jpg")
								);
								n = parseInt(name) + 1;
								name = Array(5 - String(n).length + 1).join("0") + n;
							}
						}
					}
				});
				/*postunrar();*/
			});
		}
	} catch (error) {
		console.log(error);
	}
}

//Getting the list of images
function GetListOfImg(dirPath) {
	if (fs.existsSync(dirPath)) {
		var listoffiles = fs.readdirSync(dirPath);
		var listOfImage = [];
		listoffiles.forEach((file) => {
			var ext = file.split(".").pop();
			if (ValidatedExtensionImage.includes(ext)) {
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
	} else {
		return [];
	}
}

const server = app.listen(8000);
process.on('SIGINT', () => {
	console.log('SIGINT signal received: closing server');
	console.log("Removing ZIPs to DL");
	if (fs.existsSync(__dirname + "/public/TODL")) {
		fs.rmSync(__dirname + "/public/TODL", {recursive: true, force: true});
	}
	if (fs.existsSync(CosmicComicsTemp + "/uploads")) {
		fs.rmSync(CosmicComicsTemp + "/uploads", {recursive: true, force: true});
	}
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});
app.post("/configServ/:name/:passcode/:port", (req, res) => {
	console.log("creating user");
	const name = req.params.name;
	const passcode = req.params.passcode;
	const portServ = req.params.port;
	fs.mkdirSync(CosmicComicsTemp + "/profiles/" + name, {recursive: true});
	console.log("Creating dir " + name);
	fs.writeFileSync(CosmicComicsTemp + "/profiles/" + name + "/passcode.txt", passcode, {encoding: "utf8"});
	if (!fs.existsSync(CosmicComicsTemp + "/profiles/" + name + "/config.json")) {
		const obj = {
			path: "",
			last_opened: "",
			language: "us",
			update_provider: "",
			ZoomLVL: 10,
			Scroll_bar_visible: true,
			Background_color: "rgb(33,33,33)",
			WebToonMode: false,
			Vertical_Reader_Mode: false,
			Page_Counter: true,
			SideBar: false,
			NoBar: false,
			SlideShow: false,
			SlideShow_Time: 1,
			Rotate_All: 0,
			Margin: 0,
			Manga_Mode: false,
			No_Double_Page_For_Horizontal: false,
			Blank_page_At_Begginning: false,
			Double_Page_Mode: false,
			Automatic_Background_Color: false,
			magnifier_zoom: 1,
			magnifier_Width: 100,
			magnifier_Height: 100,
			magnifier_Radius: 0,
			reset_zoom: false,
			force_update: false,
			skip: false,
			display_style: 0,
			theme: "default.css",
			theme_date: true
		};
		fs.writeFileSync(
			CosmicComicsTemp + "/profiles/" + name + "/config.json",
			JSON.stringify(obj, null, 2), {encoding: "utf8"}
		);
	}
	let random = Math.floor(Math.random() * (fs.readdirSync(__dirname + "/public/Images/account_default/").length - 1) + 1);
	fs.copyFileSync(__dirname + "/public/Images/account_default/" + random + ".jpg", CosmicComicsTemp + "/profiles/" + name + "/pp.png");
	makeDB(name);
	console.log("User created");
	res.sendStatus(200);
});
app.get("/profile/getPP/:token", (req, res) => {
	const token = resolveToken(req.params.token);
	res.sendFile(CosmicComicsTemp + "/profiles/" + token + "/pp.png");
});
app.get("/profile/getPPBN/:name", (req, res) => {
	res.sendFile(CosmicComicsTemp + "/profiles/" + req.params.name + "/pp.png");
});
app.get("/profile/custo/getNumber", (req, res) => {
	res.send({"length": fs.readdirSync(__dirname + "/public/Images/account_default").length});
});
app.get("/api/", (req, res) => {

})

//Modifications of the profile
app.post("/profile/modification", (req, res) => {
	const token = resolveToken(req.body.token);
	console.log(req.body.npp);
	if (req.body.npass != null) {
		fs.writeFileSync(CosmicComicsTemp + "/profiles/" + token + "/passcode.txt", req.body.npass.trim(), {encoding: "utf-8"});
	}
	if (req.body.npp !== {}) {
		let nppPath = req.body.npp.toString().replace(/http:\/\/(([0-9]{1,3}\.){3}[0-9]{1,3}){0,1}(localhost){0,1}:[0-9]{4}/g, __dirname + "/public");
		fs.copyFileSync(nppPath, CosmicComicsTemp + "/profiles/" + token + "/pp.png");
	}
	if (req.body.nuser != null) {
		fs.renameSync(CosmicComicsTemp + "/profiles/" + token, CosmicComicsTemp + "/profiles/" + req.body.nuser);
	}
	res.sendStatus(200);
});

//Deleting an account
app.post("/profile/deleteAccount", (req, res) => {
	const token = resolveToken(req.body.token);
	getDB(token).close();
	openedDB.delete(token);
	fs.rm(CosmicComicsTemp + "/profiles/" + token, {recursive: true, force: true}, function (err) {
		console.log(err);
	});
});

//If page not found
app.all('*', (req, res) => {
	res.sendFile(__dirname + '/404.html');
});