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
const webp = require('webp-converter');
let CryptoJS = require("crypto-js");
app.use("", express.static(__dirname + "/public"));
app.use("/js", express.static(__dirname + "/js"));
var RateLimit = require('express-rate-limit');
var apiAnilistLimiter = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 90
});
var apiMarvelLimiter = RateLimit({
    //for a day
    windowMs: 1*60*1000*60*24,
    max: 3000
});
var limiterDefault = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 1000
});
var apiGoogleLimiter = RateLimit({
    windowMs: 1*100*1000,
    max: 100
})
var viewerLimiter = RateLimit({
    windowMs: 1*60*1000,
    max: 100
})
var accountLimiter = RateLimit({
    windowMs: 1*60*1000*60,
    max: 100,
})
const isPortable = fs.existsSync(path.join(__dirname, "portable.txt"));
const isElectron = fs.existsSync(path.join(__dirname, 'portable.txt')) && fs.readFileSync(path.join(__dirname, "portable.txt"), "utf8") === "electron";
let devMode = true;



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
if (devMode) {
    CosmicComicsTemp = path.join(__dirname, "CosmicData");
}
//Creating the folders to the CosmicData's path
fs.mkdirSync(CosmicComicsTemp, {recursive: true});

if (!fs.existsSync(CosmicComicsTemp+"/.env")){
    let envTemplate = "MARVEL_PUBLIC_KEY=\nMARVEL_PRIVATE_KEY=\nGBOOKSAPIKEY=\n"
    fs.writeFileSync(CosmicComicsTemp + "/.env", envTemplate, {encoding: 'utf8'});
}
const dotenv = require('dotenv');
dotenv.config({
    path: CosmicComicsTemp+"/.env"
});
let MarvelPublicKey = process.env.MARVEL_PUBLIC_KEY;
let MarvelPrivateKey = process.env.MARVEL_PRIVATE_KEY;
let sqlite3 = require("sqlite3");
const anilist = require("anilist-node");
const AniList = new anilist();
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
    "epub",
    "ebook"
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
    "gif",
    "tiff",
];
let mangaMode = false;


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

try{
if (!fs.existsSync(__dirname + "/public/FirstImagesOfAll")) {
    fs.mkdirSync(__dirname + "/public/FirstImagesOfAll");
    changePermissionForFilesInFolder(__dirname + "/public/FirstImagesOfAll");
}
}catch(e){
console.log(e);
}
const cors = require('cors');
const {spawn} = require('child_process');
const puppeteer = require("puppeteer");

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
        db.run("REPLACE INTO API (ID_API,NOM) VALUES (1,'Marvel'), (2,'Anilist'),(4,'LeagueOfComicsGeeks'),(3,'OpenLibrary'),(0,'MANUAL')");
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
    let configFile = fs.readFileSync(CosmicComicsTemp + "/serverconfig.json", "utf8");
    let config = JSON.parse(configFile);
    for (let i in config) {
        for (let j in config["Token"]) {
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
        var pjson = require('./package.json');
        getDB(forwho).run("PRAGMA user_version = " + pjson.version.split(".").join("") + ";");
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
app.use(limiterDefault)
let host;
const args = process.argv.slice(2);
let port = JSON.parse(fs.readFileSync(CosmicComicsTemp + "/serverconfig.json").toString()).port;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "-p" || args[i] === "--port") {
        port = args[i + 1];
        break;
    }
}
const server = app.listen(port, "0.0.0.0", function () {
    host = this.address().address;
    port = this.address().port;
    console.log("Listening on port %s:%s!", host, port);
});
app.post("/downloadBook",limiterDefault, function (req, res) {
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
app.post("/createUser", limiterDefault,function (req, res) {
    const name = req.body.name;
    const passcode = req.body.password;
    fs.mkdirSync(CosmicComicsTemp + "/profiles/" + name, {recursive: true});
    changePermissionForFilesInFolder(CosmicComicsTemp + "/profiles/" + name);
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
    if (req.body.pp === {}) {
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
    res.sendFile(__dirname + "/public/Images/fileDefault.webp");
});
app.post("/DL", limiterDefault,function (req, res) {
    console.log(req.body);
    DLBOOKPATH = req.body.path;
    res.sendStatus(200);
});
app.get("/getDLBook",limiterDefault, function (req, res) {
    if (DLBOOKPATH === "") {
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
app.get("/",limiterDefault, function (req, res) {
    res.sendFile(__dirname + "/launchPage.html");
});
app.get("/index",limiterDefault, function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
app.get("/css/base.css",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/css/base.css");
});
app.get("/css/bootstrap.css",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/css/bootstrap.css");
});
app.get("/modules/bootstrapJS",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/node_modules/bootstrap/dist/js/bootstrap.bundle.js", {
        headers: {
            "Content-Type": "text/javascript"
        }
    });
});
app.get("/img/getColor/:img/:token",limiterDefault, async (req, res) => {
    const token = resolveToken(req.params.token);
    var img = CosmicComicsTemp + "/profiles/" + token + "/current_book/" + req.params.img;
    const dominantColor = await getColor(img);
    res.send(dominantColor);
});
app.get("/img/getPalette/:token",limiterDefault, async (req, res) => {
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
app.get("/css/materialize.css",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/css/materialize.css");
});
app.get("/js/materialize.js",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/js/materialize.js");
});
app.get("/index.js",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/index.js");
});
app.get("/viewer.js", limiterDefault,(req, res) => {
    res.sendFile(__dirname + "/viewer.js");
});
app.get("/viewer.html", limiterDefault,(req, res) => {
    res.sendFile(__dirname + "/viewer.html");
});
app.get("/css/animate",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/css/animate.css");
});
app.get("/js/html-magnifier.js", limiterDefault,(req, res) => {
    res.sendFile(__dirname + "/js/html-magnifier.js");
});
app.get("/login", limiterDefault,(req, res) => {
    res.sendFile(__dirname + "/login.html");
});
app.get("/js/login",limiterDefault, (req, res) => {
    res.sendFile(__dirname + "/login.js");
});
app.get("/profile/DLBDD/:token", limiterDefault,(req, res) => {
    const token = resolveToken(req.params.token);
    res.download(CosmicComicsTemp + "/profiles/" + token + "/CosmicComics.db", (err) => {
        if (err) console.log(err);
    });
});
var currentBookPath = "";
var SendToUnZip = "";
app.get("/Unzip/:path/:token", limiterDefault,(req, res) => {
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
app.get("/viewer/view/current/:token",viewerLimiter, (req, res) => {
    res.send(GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(req.params.token) + "/current_book/"));
});
app.get("/viewer/view/", viewerLimiter,(req, res) => {
    let param = replaceHTMLAdressPath(req.headers.path);
    let tosend = GetListOfImg(param);
    console.log(tosend);
    console.log(param);
    res.send(tosend);
});
app.get("/dirname",limiterDefault, (req, res) => {
    res.send(path2Data);
});
app.get("/CosmicDataLoc", limiterDefault,(req, res) => {
    res.send(CosmicComicsTemp);
});
app.get("/viewer/view/current/:page/:token",limiterDefault, (req, res) => {
    var page = req.params.page;
    var listOfImg = GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(req.params.token) + "/current_book/");
    res.send(CosmicComicsTemp + "/profiles/" + resolveToken(req.params.token) + "/current_book/" + listOfImg[page]);
});
app.get("/config/getConfig/:token",limiterDefault, (req, res) => {
    const token = resolveToken(req.params.token);
    res.send(fs.readFileSync(CosmicComicsTemp + "/profiles/" + token + "/config.json"));
});
app.get("/BM/getBM",limiterDefault, (req, res) => {
    try {
        var result = [];
        const token = resolveToken(req.headers.token);
        getDB(token).all("SELECT * FROM Bookmarks;", function (err, resD) {
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
app.get("/lang/:lang", limiterDefault,(req, res) => {
    res.send(fs.readFileSync(__dirname + "/languages/" + req.params.lang + ".json"));
});
app.get("/view/isDir/:path",viewerLimiter, (req, res) => {
    var isDir = fs.statSync(replaceHTMLAdressPath(req.params.path)).isDirectory();
    console.log(isDir);
    res.send(isDir);
});
app.get("/view/exist/:path",viewerLimiter, (req, res) => {
    var exist = fs.existsSync(replaceHTMLAdressPath(req.params.path));
    console.log(exist);
    res.send(exist);
});
app.get("/view/readFile/:path",viewerLimiter, (req, res) => {
    var o = replaceHTMLAdressPath(req.params.path);
    var p = fs.readFileSync(o, "utf8");
    res.send(JSON.stringify(p));
});
app.get("/view/readImage",viewerLimiter, (req, res) => {
    if (req.headers.met == "DL") {
        res.sendFile(req.headers.path + "/" + req.headers.page);
    } else if (req.headers.met == "CLASSIC") {
        let token = resolveToken(req.headers.token);
        res.sendFile(CosmicComicsTemp + "/profiles/" + token + "/current_book/" + req.headers.page);
    }
});
app.post('/config/writeConfig/:token', limiterDefault,(req, res) => {
    console.log(req.body);
    const token = resolveToken(req.params.token);
    fs.writeFileSync(CosmicComicsTemp + "/profiles/" + token + "/config.json", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});
app.post('/DB/write/:jsonFile', limiterDefault,(req, res) => {
    fs.writeFileSync(CosmicComicsTemp + "/" + req.params.jsonFile + ".json", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});
app.get("/DB/read/:jsonFile", limiterDefault,(req, res) => {
    res.send(fs.readFileSync(CosmicComicsTemp + "/" + req.params.jsonFile + ".json"));
});
app.get("/themes/read/:jsonFile",limiterDefault, (req, res) => {
    res.send(fs.readFileSync(__dirname + "/themes/" + req.params.jsonFile));
});
app.get("/DB/update/:token/:dbName/:colName/:value/:id",limiterDefault, (req, res) => {
    try {
        getDB(resolveToken(req.params.token)).run("UPDATE " + req.params.dbName + " SET " + req.params.colName + " = " + req.params.value + " WHERE ID_book='" + req.params.id + "';");
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200);
});
app.post("/DB/update/OneForAll", limiterDefault,(req, res) => {
    let token = resolveToken(req.body.token);
    let W1 = req.body.W1;
    let W2 = req.body.W2;
    let A = req.body.A;
    let title = req.body.title;
    console.log(W1, W2, A, title);
    try {
        getDB(token).all("SELECT * FROM Books WHERE " + W1 + "=1 OR " + W2 + "=1" + ";", function (err, resD) {
            if (err) return console.log("Error getting element", err);
            console.log(resD);
            let bookList = resD;
            console.log(bookList);
            for (let i = 0; i < bookList.length; i++) {
                if (bookList[i].PATH.toLowerCase().includes(JSON.parse(title)["english"].toLowerCase().replaceAll('"', ''))) {
                    let asso = {}
                    asso[A] = 1;
                    asso[W1] = 0;
                    asso[W2] = 0;
                    let columns = [];
                    let values = [];
                    for (let key in asso) {
                        columns.push(key);
                        values.push(asso[key]);
                    }
                    console.log(columns);
                    console.log(values);
                    UpdateDB("edit", columns, values, req.body.token, "Books", "PATH", bookList[i].PATH);
                }
            }
        });
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200);
})

function UpdateDB(type, column, value, token, table, where, whereEl) {
    if (type === "edit") {
        let listOfColumns = column;
        let listOfValues = value;
        let what = [];
        for (let i = 0; i < listOfColumns.length; i++) {
            if (listOfColumns[i] === "description") {
                what.push(listOfColumns[i] + " = '" + listOfValues[i].toString().replaceAll("'", "''").replaceAll('"', '\\"') + "'");
            } else {
                what.push(listOfColumns[i] + " = '" + listOfValues[i] + "'");
            }
        }
        console.log(what);
        try {
            getDB(resolveToken(token)).run("UPDATE " + table + " SET " + what.toString() + " WHERE " + where + "='" + whereEl + "';");
        } catch (e) {
            console.log(e);
        }
    } else {
        try {
            getDB(resolveToken(token)).run("UPDATE " + table + " SET " + column + " = " + value + " WHERE " + where + "='" + whereEl + "';");
        } catch (e) {
            console.log(e);
        }
    }
}

app.post("/DB/update/", limiterDefault,(req, res) => {
    UpdateDB(req.body.type, req.body.column, req.body.value, req.body.token, req.body.table, req.body.where, req.body.whereEl);
    res.sendStatus(200);
});
app.post("/DB/lib/update/:token/:id",limiterDefault, (req, res) => {
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

function insertIntoDB(into, val, tokenu, dbName) {
    try {
        const dbinfo = into;
        const values = val;
        const token = resolveToken(tokenu);
        console.log(dbinfo + values);
        getDB(token).run("INSERT OR IGNORE INTO " + dbName + " " + dbinfo + " VALUES " + values + ";");
    } catch (e) {
        console.log(e);
    }
}

app.post("/DB/insert/:token/:dbName",limiterDefault, (req, res) => {
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
app.get("/DB/delete/:token/:dbName/:id/:option", limiterDefault,(req, res) => {
    try {
        const token = resolveToken(req.params.token);
        getDB(token).run("DELETE FROM " + req.params.dbName + " WHERE BOOK_ID='" + req.params.id + "' " + req.params.option + ";");
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200);
});
app.get("/DB/truedelete/:token/:dbName/:id",limiterDefault, (req, res) => {
    try {
        const token = resolveToken(req.params.token);
        getDB(token).run("DELETE FROM " + req.params.dbName + " WHERE ID_book='" + req.params.id + "';");
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200);
});
app.get("/DB/lib/delete/:token/:id", limiterDefault,(req, res) => {
    try {
        const token = resolveToken(req.params.token);
        getDB(token).run("DELETE FROM Libraries WHERE ID_LIBRARY=" + req.params.id + ";");
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200);
});
app.post("/DB/get/:token/:dbName", limiterDefault,(req, res) => {
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
app.get("/getVersion",limiterDefault, (req, res) => {
    res.send(process.env.npm_package_version);
});
app.get("/getListOfFolder/:path",limiterDefault, (req, res) => {
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
app.get("/profile/discover", limiterDefault,(req, res) => {
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
app.get("/profile/login/:name/:passcode", accountLimiter,(req, res) => {
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
app.get("/profile/logcheck/:token", limiterDefault,(req, res) => {
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
app.post("/profile/logout/:token", limiterDefault,(req, res) => {
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
app.get("/getListOfFilesAndFolders/:path",limiterDefault, (req, res) => {
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

async function API_ANILIST_GET(name) {
    let query =
        `query ($page: Int, $perPage: Int, $search: String) {
  Page(page:$page,perPage:$perPage){
    pageInfo{
      total
    }
    media(type: MANGA,search:$search){
      id
      title{
        romaji
        english
        native
      }
      status
      startDate{
        year
        month
        day
      }
      endDate{
        year
        month
        day
	  }
	  description
	  meanScore
	  genres
	  coverImage{
	  large
	  }
	  bannerImage
	  trending
	  siteUrl
	  volumes
	  chapters
      staff{
        nodes{
          id
          name {
            full
            native
          }
          image {
            medium
          }
          description
          siteUrl
        }
        edges{
        role
        }
      }
      characters{
        nodes{
          id
          name {
            full
            native
          }
          image {
            medium
          }
          description
          siteUrl
        }
        edges{
        role
        }
      }
      relations{
        nodes{
          id
          title{
            romaji
            english
            native
          }
          coverImage{
          large
          }
          type
          format
        }
        edges{
          relationType
        }        
      }
    }
  }
}`;
    let variables = {
        search: name,
        page: 1,
        perPage: 5
    }
    let url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };
    let results = {};
    await fetch(url, options).then(handleResponse).then(handleData).catch(handleError);

    function handleResponse(response) {
        return response.json().then(function (json) {
            return response.ok ? json : Promise.reject(json);
        });
    }

    // duplicate an object
    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function handleData(data) {
        console.log(data);
        if (data.data.Page.media.length === 0) {
            results = null;
            return;
        }
        let baseObject = clone(data.data.Page.media[0]);
        let staffObject = clone(data.data.Page.media[0].staff.nodes);
        let charactersObject = clone(data.data.Page.media[0].characters.nodes);
        let relationsObjectNodes = clone(data.data.Page.media[0].relations.nodes);
        let relationsObjectEdges = clone(data.data.Page.media[0].relations.edges);
        let relationsObject = [];
        for (let i = 0; i < relationsObjectNodes.length; i++) {
            relationsObject[i] = relationsObjectNodes[i];
            relationsObject[i]["relationType"] = relationsObjectEdges[i].relationType;
        }
        delete baseObject["relations"];
        for (let i = 0; i < baseObject.staff.nodes.length; i++) {
            for (let key in baseObject.staff.nodes[i]) {
                if (key !== "id" && key !== "name") {
                    delete baseObject.staff.nodes[i][key];
                }
            }
            baseObject.staff.nodes[i]["name"] = baseObject.staff.nodes[i]["name"]["full"];
        }
        baseObject.staff = baseObject.staff.nodes;
        for (let i = 0; i < baseObject.characters.nodes.length; i++) {
            for (let key in baseObject.characters.nodes[i]) {
                if (key !== "id" && key !== "name") {
                    delete baseObject.characters.nodes[i][key];
                }
            }
            baseObject.characters.nodes[i]["name"] = baseObject.characters.nodes[i]["name"]["full"];
        }
        baseObject.characters = baseObject.characters.nodes;
        results = {
            "base": baseObject,
            "staff": staffObject,
            "characters": charactersObject,
            "relations": relationsObject
        }
    }

    return results;

    function handleError(error) {
        console.error(error);
    }
}

async function API_ANILIST_GET_SEARCH(name) {
    let query =
        `query ($page: Int, $perPage: Int, $search: String) {
  Page(page:$page,perPage:$perPage){
    pageInfo{
      total
    }
    media(type: MANGA,search:$search){
      id
      title{
        romaji
        english
        native
      }
	  coverImage{
	  large
	  }
    }
  }
}`;
    let variables = {
        search: name,
        page: 1,
        perPage: 20
    }
    let url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };
    let results = {};
    await fetch(url, options).then(handleResponse).then(handleData).catch(handleError);

    function handleResponse(response) {
        return response.json().then(function (json) {
            return response.ok ? json : Promise.reject(json);
        });
    }

    // duplicate an object
    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function handleData(data) {
        console.log(data);
        if (data.data.Page.media.length === 0) {
            results = null;
            return;
        }
        let baseObject = clone(data.data.Page.media);
        results = {
            "base": baseObject,
        }
    }

    return results;

    function handleError(error) {
        console.error(error);
    }
}

function generateMarvelAPIAuth() {
    let ts = new Date().getTime();
    return "&ts=" + ts + "&hash=" + CryptoJS.MD5(ts + MarvelPrivateKey + MarvelPublicKey).toString() + "&apikey=" + MarvelPublicKey;
}

async function API_MARVEL_GET(name = "") {
    console.log("API_MARVEL_GET: " + name);
    if (name === "") {
        console.log("no name provided, aborting GETMARVELAPI");
        return;
    }
    let date = "";
    let dateNb = 0;
    let dateFromName = name.replace(/[^0-9]/g, "#");
    dateFromName.split("#").forEach(function (element) {
        if (dateNb === 0 && element.match(/^[0-9]{4}$/)) {
            dateNb++;
            date = element;
        }
    });
    name = name.replaceAll(/[(].+[)]/g, "");
    name = name.replace(/\s+$/, "");
    let encodedName = encodeURIComponent(name);
    let url;
    if (date !== "") {
        url = "https://gateway.marvel.com:443/v1/public/series?titleStartsWith=" + encodedName + "&startYear=" + date + generateMarvelAPIAuth();
    } else {
        url = "https://gateway.marvel.com:443/v1/public/series?titleStartsWith=" + encodedName + generateMarvelAPIAuth();
    }
    let response = await fetch(url);
    return await response.json();
}

/**
 * Recover the Marvel API data from the server
 * @param {string} what - What to recover (characters, comics, creators, events, series, stories)
 * @param {string} id - The id of the element to recover
 * @param {string} what2 - What to recover (characters, comics, creators, events, series, stories)
 * @param {boolean|string} noVariants - If the comics should be without variants
 * @param {string} orderBy - How to order the results
 * @param {string} type - The type of the element to recover (comic, collection, creator, event, story, series, character)
 */
function recoverMarvelAPILink(what, id, what2, noVariants = true, orderBy = "issueNumber", type = null) {
    if (type != null) {
        return "https://gateway.marvel.com:443/v1/public/" + what + "?" + type + "=" + id + generateMarvelAPIAuth();
    }
    if (what2 === "") {
        return "https://gateway.marvel.com:443/v1/public/" + what + "/" + id + "?noVariants=" + noVariants + "&orderBy=" + orderBy + generateMarvelAPIAuth();
    }
    return "https://gateway.marvel.com:443/v1/public/" + what + "/" + id + "/" + what2 + "?noVariants=" + noVariants + "&orderBy=" + orderBy + generateMarvelAPIAuth();
}

async function GETMARVELAPI_variants(id) {
    let url = recoverMarvelAPILink("series", id, "comics", true, "issueNumber")
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI_relations(id) {
    let url = recoverMarvelAPILink("series", id, "comics", true, "issueNumber")
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI_Characters(id, type) {
    let url = recoverMarvelAPILink("characters", id, "comics", true, "issueNumber", type)
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

async function GETMARVELAPI_Creators(id, type) {
    let url = recoverMarvelAPILink("creators", id, "comics", true, "issueNumber", type)
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

/**
 * Get from the Marvel API the list of comics
 * @param {string} id - The id of the comic
 * @return {string} The list of comics
 */
app.post("/refreshMeta", limiterDefault,async function (req, res) {
    let id = req.body.id;
    let type = req.body.type;
    let provider = req.body.provider;
    let token = req.body.token;
    console.log(id);
    console.log(type);
    console.log(provider);

    if (provider === 1) {
        if (type === "book") {
            getDB(resolveToken(token)).all("SELECT * FROM Books WHERE ID_book=" + id + ";", async function (err, resD) {
                let result = [];
                if (err) return console.log("Error getting element", err);
                resD.forEach((row) => {
                    result.push(row);
                });
                let book = result[0];
                await GETMARVELAPI_Comics_ByID(book.API_ID).then(async (res2) => {
                    res2 = res2.data.results[0];
                    let blacklisted = ["note", "read", "reading", "unread", "favorite", "last_page", "folder", "PATH", "lock", "ID_book"]
                    let asso = {}
                    for (let i = 0; i < book.length; i++) {
                        for (let key in book[i]) {
                            if (!blacklisted.includes(key)) {
                                asso[key] = book[i][key];
                            }
                        }
                    }
                    asso["NOM"] = res2.title;
                    asso["URLCover"] = res2.thumbnail.path + "/detail." + res2.thumbnail.extension;
                    asso["issueNumber"] = res2.issueNumber;
                    asso["description"] = res2.description.replaceAll("'", "''");
                    asso["format"] = res2.format;
                    asso["pageCount"] = res2.pageCount;
                    asso["URLs"] = JSON.stringify(res2.urls);
                    asso["dates"] = JSON.stringify(res2.dates);
                    asso["prices"] = JSON.stringify(res2.prices);
                    asso["creators"] = JSON.stringify(res2.creators);
                    asso["characters"] = JSON.stringify(res2.characters);
                    asso["series"] = JSON.stringify(res2.series);
                    asso["collectedIssues"] = JSON.stringify(res2.collectedIssues);
                    asso["variants"] = JSON.stringify(res2.variants);
                    asso["collections"] = JSON.stringify(res2.collections);
                    let columns = [];
                    let values = [];
                    for (let key in asso) {
                        columns.push(key);
                        values.push(asso[key]);
                    }
                    UpdateDB("edit", columns, values, token, "Books", "PATH", book.PATH);
                });
            })
        } else {
            getDB(resolveToken(token)).all("SELECT * FROM Series WHERE ID_Series='" + id + "';", async function (err, resD) {
                let result = [];
                if (err) return console.log("Error getting element", err);
                resD.forEach((row) => {
                    result.push(row);
                });
                let book = result[0];
                console.log(book);
                await GETMARVELAPI_Series_ByID(parseInt(id)).then(async (res2) => {
                    if (!res2.hasOwnProperty("data")) {
                        return;
                    }
                    res2 = res2.data.results[0];
                    let blacklisted = ["note", "favorite", "PATH", "lock", "ID_Series"]
                    let asso = {}
                    for (let i = 0; i < book.length; i++) {
                        for (let key in book[i]) {
                            if (!blacklisted.includes(key)) {
                                asso[key] = book[i][key];
                            }
                        }
                    }
                    asso["title"] = JSON.stringify(res2.title).replaceAll("'", "''");
                    asso["cover"] = JSON.stringify(res2.thumbnail);
                    if (res2.description != null) {
                        asso["description"] = res2.description.replaceAll("'", "''");
                    } else {
                        asso["description"] = "";
                    }
                    asso["start_date"] = res2.startYear
                    asso["end_date"] = res2.endYear
                    asso["CHARACTERS"] = JSON.stringify(res2.characters).replaceAll("'", "''");
                    asso["STAFF"] = JSON.stringify(res2.creators).replaceAll("'", "''");
                    asso["SOURCE"] = JSON.stringify(res2.urls[0]);
                    asso["BG"] = JSON.stringify(res2.thumbnail);
                    asso["volumes"] = JSON.stringify(res2.comics.items).replaceAll("'", "''");
                    asso["chapters"] = JSON.stringify(res2.comics.available).replaceAll("'", "''");
                    let columns = [];
                    let values = [];
                    for (let key in asso) {
                        columns.push(key);
                        values.push(asso[key]);
                    }
                    UpdateDB("edit", columns, values, token, "Series", "PATH", book.PATH);
                });
            })
        }
    } else if (provider === 2) {
        if (type !== "book") {
            getDB(resolveToken(token)).all("SELECT * FROM Series WHERE ID_Series='" + id + "';", async function (err, resD) {
                let result = [];
                if (err) return console.log("Error getting element", err);
                resD.forEach((row) => {
                    result.push(row);
                });
                let book = result[0];
                await AniList.media.manga(parseInt(id)).then(function (res2) {
                    let blacklisted = ["note", "favorite", "PATH", "lock", "ID_Series"]
                    let asso = {}
                    for (let i = 0; i < book.length; i++) {
                        for (let key in book[i]) {
                            if (!blacklisted.includes(key)) {
                                asso[key] = book[i][key];
                            }
                        }
                    }
                    asso["title"] = JSON.stringify(res2.title).replaceAll("'", "''");
                    asso["cover"] = res2.coverImage.large;
                    if (res2.description != null) {
                        asso["description"] = res2.description.replaceAll("'", "''");
                    } else {
                        asso["description"] = "";
                    }
                    asso["start_date"] = JSON.stringify(res2.startDate).replaceAll("'", "''");
                    asso["end_date"] = JSON.stringify(res2.endDate).replaceAll("'", "''");
                    asso["CHARACTERS"] = JSON.stringify(res2.characters).replaceAll("'", "''");
                    asso["STAFF"] = JSON.stringify(res2.staff).replaceAll("'", "''");
                    asso["SOURCE"] = JSON.stringify(res2.siteUrl).replaceAll("'", "''");
                    asso["BG"] = res2.bannerImage;
                    asso["volumes"] = JSON.stringify(res2.volumes).replaceAll("'", "''");
                    asso["chapters"] = JSON.stringify(res2.chapters).replaceAll("'", "''");
                    asso["statut"] = res2["status"].replaceAll("'", "''");
                    asso["Score"] = res2["meanScore"]
                    asso["genres"] = JSON.stringify(res2["genres"]).replaceAll("'", "''");
                    asso["TRENDING"] = JSON.stringify(res2["trending"]).replaceAll("'", "''");
                    let columns = [];
                    let values = [];
                    for (let key in asso) {
                        columns.push(key);
                        values.push(asso[key]);
                    }
                    UpdateDB("edit", columns, values, token, "Series", "PATH", book.PATH);
                });
            })
        }
    }else if (provider === 3) {
        getDB(resolveToken(token)).all("SELECT * FROM Books WHERE API_ID='" + id + "';", async function (err, resD) {
            let result = [];
            if (err) return console.log("Error getting element", err);
            resD.forEach((row) => {
                result.push(row);
            });
            let book = result[0];
            await GETOLAPI_Comics_ByID(id).then(async (res2) => {
                let firstChild = Object.keys(res2)[0];
                res2 = res2[firstChild];
                console.log(res2)
                let blacklisted = ["note", "read", "reading", "unread", "favorite", "last_page", "folder", "PATH", "lock", "ID_book","API_ID"]
                let asso = {}
                for (let i = 0; i < book.length; i++) {
                    for (let key in book[i]) {
                        if (!blacklisted.includes(key)) {
                            asso[key] = book[i][key];
                        }
                    }
                }
                asso["NOM"] = res2.details.title;
                asso["URLCover"] = res2.thumbnail_url.replace("-S","-L");
                asso["issueNumber"] = "null";
                asso["description"] = res2.details.description !== undefined ? res2.details.description.replaceAll("'", "''") : "null";
                asso["format"] = res2.details.physical_format
                asso["pageCount"] = JSON.stringify(res2.details.number_of_pages);
                asso["URLs"] = JSON.stringify(res2.details.info_url);
                asso["dates"] = JSON.stringify(res2.details.publish_date);
                asso["prices"] = "null";
                asso["creators"] = JSON.stringify(res2.details.authors);
                asso["characters"] = "null";
                asso["series"] = "null";
                asso["collectedIssues"] = "null";
                asso["variants"] = "null";
                asso["collections"] = "null";
                let columns = [];
                let values = [];
                for (let key in asso) {
                    columns.push(key);
                    values.push(asso[key]);
                }
                console.log(columns, values)
                UpdateDB("edit", columns, values, token, "Books", "PATH", book.PATH);
            });
        })
    }else if (provider === 4) {
        getDB(resolveToken(token)).all("SELECT * FROM Books WHERE API_ID=" + id + ";", async function (err, resD) {
            let result = [];
            if (err) return console.log("Error getting element", err);
            resD.forEach((row) => {
                result.push(row);
            });
            let book = result[0];
            await GETGBAPI_Comics_ByID(id).then(async (res2) => {
                res2 = res2[0];
                let blacklisted = ["note", "read", "reading", "unread", "favorite", "last_page", "folder", "PATH", "lock", "ID_book"]
                let asso = {}
                for (let i = 0; i < book.length; i++) {
                    for (let key in book[i]) {
                        if (!blacklisted.includes(key)) {
                            asso[key] = book[i][key];
                        }
                    }
                }
                let price;
                if (res2["saleInfo"]["retailPrice"] !== undefined) {
                    price = res2["saleInfo"]["retailPrice"]["amount"]
                } else {
                    price = null;
                }
                let cover;
                if (res2["volumeInfo"]["imageLinks"] !== undefined) {

                    cover = res2["volumeInfo"]["imageLinks"]
                    if (cover["large"] !== undefined) {
                        cover = cover["large"]
                    } else if (cover["thumbnail"] !== undefined) {
                        cover = cover["thumbnail"]
                    } else {
                        cover = null
                    }
                } else {
                    cover = null;
                }
                asso["NOM"] = res2.volumeInfo.title;
                asso["URLCover"] = cover;
                asso["issueNumber"] = "null";
                asso["description"] = res2.volumeInfo.description.replaceAll("'", "''");
                asso["format"] = res2.volumeInfo.printType;
                asso["pageCount"] = res2.volumeInfo.pageCount;
                asso["URLs"] = JSON.stringify(res2.volumeInfo.infoLink);
                asso["dates"] = JSON.stringify(res2.volumeInfo.publishedDate);
                asso["prices"] = JSON.stringify(res2.price);
                asso["creators"] = JSON.stringify(res2.volumeInfo.authors);
                asso["characters"] = "null";
                asso["series"] = "null";
                asso["collectedIssues"] = "null";
                asso["variants"] = "null";
                asso["collections"] = "null";
                let columns = [];
                let values = [];
                for (let key in asso) {
                    columns.push(key);
                    values.push(asso[key]);
                }
                UpdateDB("edit", columns, values, token, "Books", "PATH", book.PATH);
            });
        })
    }
    res.sendStatus(200);
})

async function GETMARVELAPI_Comics_ByID(id) {
    let url = recoverMarvelAPILink("comics", id, "", true, "issueNumber")
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

async function GETOLAPI_Comics_ByID(id) {
    let url = "https://openlibrary.org/api/books?bibkeys=OLID:" + id.replace("_3","") + "&jscmd=details&format=json";
    console.log(url)
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

async function GETGBAPI_Comics_ByID(id) {
    let response = await fetch("https://www.googleapis.com/books/v1/volumes/" + id.toString());
    let data = await response.json();
    console.log(data);
    return data;
}

app.get("/api/marvel/getComics/:name/:date", apiMarvelLimiter, async function (req, res) {
    let name = decodeURIComponent(req.params.name);
    let date = decodeURIComponent(req.params.date);
    GETMARVELAPI_Comics(req.params.name, req.params.date).then(function (data) {
        res.send(data);
    })
})
app.get("/api/ol/getComics/:name", limiterDefault, async function (req, res) {
    let name = decodeURIComponent(req.params.name);
    GETOLAPI_search(name).then(function (data) {
        res.send(data);
    })
})
app.get("/api/googlebooks/getComics/:name", apiGoogleLimiter, async function (req, res) {
    let name = decodeURIComponent(req.params.name);
    GETGOOGLEAPI_book(name).then(function (data) {
        res.send(data);
    })
})
app.get("/insert/marvel/book/",apiMarvelLimiter, async function (req, res) {
    let token = req.headers.token;
    let realname = req.headers.name;
    let date = req.headers.datea;
    let path = req.headers.path;
    GETMARVELAPI_Comics(realname, date).then(async function (cdata) {
        res.send(cdata);
        console.log(cdata);
        if (cdata === undefined) {
            throw new Error("no data");
        }
        if (cdata["data"]["total"] > 0) {
            cdata = cdata["data"]["results"][0];
            await insertIntoDB("", `(?,'${cdata["id"]}','${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${cdata["thumbnail"].path + "/detail." + cdata["thumbnail"].extension}','${cdata["issueNumber"]}','${cdata["description"].replaceAll("'", "''")}','${cdata["format"]}',${cdata["pageCount"]},'${JSON.stringify(cdata["urls"])}','${JSON.stringify(cdata["series"])}','${JSON.stringify(cdata["creators"])}','${JSON.stringify(cdata["characters"])}','${JSON.stringify(cdata["prices"])}','${JSON.stringify(cdata["dates"])}','${JSON.stringify(cdata["collectedIssues"])}','${JSON.stringify(cdata["collections"])}','${JSON.stringify(cdata["variants"])}',false)`, token, "Books")
            GETMARVELAPI_Creators(cdata["id"], "comics").then(async (ccdata) => {
                ccdata = ccdata["data"]["results"];
                for (let i = 0; i < ccdata.length; i++) {
                    await insertIntoDB("", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["fullName"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}',${null},'${JSON.stringify(ccdata[i]["urls"])}')`, token, "Creators")
                }
            });
            GETMARVELAPI_Characters(cdata["id"], "comics").then(async (ccdata) => {
                ccdata = ccdata["data"]["results"];
                for (let i = 0; i < ccdata.length; i++) {
                    await insertIntoDB("", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["name"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}','${ccdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["urls"])}')`, token, "Characters")
                }
            });
        } else {
            await insertIntoDB("", `(?,'${null}','${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}',false)`, token, "Books")
        }
    })
})
app.get("/insert/ol/book/",limiterDefault, async function (req, res) {
    let token = req.headers.token;
    let realname = req.headers.name;
    let path = req.headers.path;
    GETOLAPI_search(realname).then(async function (cdata) {
        if (cdata === undefined) {
            throw new Error("no data");
        }
        if (cdata["num_found"] > 0) {
            let key = cdata["docs"][0];
            key = key["seed"][0];
            key = key.split("/")[2];
            console.log(key);
            await GETOLAPI_book(key).then(async (book) => {
                res.send(book);
                //get the first child of an object
                let firstChild = Object.keys(book)[0];
                book = book[firstChild];
                console.log(book);
                let bookD = book["details"];
                console.log(bookD);
                await insertIntoDB("", `(?,'${book["bib_key"]}','${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${book.hasOwnProperty("thumbnail_url") ? book["thumbnail_url"].replace("-S","-L"):null}','${null}','${bookD["description"] !== undefined ? bookD["description"].replaceAll("'", "''"):null}','${bookD["physical_format"] !== undefined ? bookD["physical_format"] : null}',${bookD["number_of_pages"] !== undefined ? bookD["number_of_pages"] : null},'${bookD["info_url"]  !== undefined ? JSON.stringify(bookD["info_url"]) : null}','${null}','${bookD["authors"]  !== undefined ? JSON.stringify(bookD["authors"]) : null}','${null}','${null}','${bookD["publish_date"]  !== undefined ? JSON.stringify(bookD["publish_date"]) : null}','${null}','${null}','${null}',false)`, token, "Books")
                let bookauthors = bookD["authors"];
                for (let i = 0; i < bookauthors.length; i++) {
                    await insertIntoDB("", `('${bookauthors[i]["key"] + "_3"}','${bookauthors[i]["name"].replaceAll("'", "''")}','${null}',${null},'${null}')`, token, "Creators")
                }

            })
        } else {
            res.send(cdata)
            await insertIntoDB("", `(?,'${null}','${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}',false)`, token, "Books")
        }
    })
})
app.get("/insert/googlebooks/book/",apiGoogleLimiter, async function (req, res) {
    let token = req.headers.token;
    let realname = req.headers.name;
    let path = req.headers.path;
    GETGOOGLEAPI_book(realname).then(async function (cdata) {
        res.send(cdata);
        console.log(cdata);
        if (cdata === undefined) {
            throw new Error("no data");
        }
        if (cdata["totalItems"] > 0) {
            cdata = cdata["items"][0];
            await insertIntoDB("", `(?,'${cdata["id"]}','${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${cdata["volumeInfo"]["imageLinks"] !== undefined ? (cdata["volumeInfo"]["imageLinks"]["large"] !== undefined ? (cdata["volumeInfo"]["imageLinks"]["large"]):(cdata["volumeInfo"]["imageLinks"]["thumbnail"])):null }','${null}','${cdata["volumeInfo"]["description"] !== undefined ? cdata["volumeInfo"]["description"].replaceAll("'", "''"):null}','${cdata["volumeInfo"]["printType"]}',${cdata["volumeInfo"]["pageCount"]},'${JSON.stringify(cdata["volumeInfo"]["infoLink"])}','${null}','${JSON.stringify(cdata["volumeInfo"]["authors"])}','${null}','${cdata["saleInfo"]["retailPrice"] !== undefined ? (JSON.stringify(cdata["saleInfo"]["retailPrice"]["amount"])):null}','${JSON.stringify(cdata["volumeInfo"]["publishedDate"])}','${null}','${null}','${null}',false)`, token, "Books")
                let authorsccdata = cdata["volumeInfo"]["authors"];
                for (let i = 0; i < authorsccdata.length; i++) {
                    await insertIntoDB("", `('${Math.floor(Math.random()*100000) + "_4"}','${authorsccdata[i].replaceAll("'", "''")}','${null}',${null},'${null}')`, token, "Creators")
                }
        } else {
            await insertIntoDB("", `(?,'${null}','${realname}',null,${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}','${null}',false)`, token, "Books")
        }
    })
})
app.post("/insert/anilist/book", apiAnilistLimiter, function (req, res) {
    let token = req.body.token;
    let path = req.body.path;
    let realname = req.body.realname;
    try {
        let data = [];
        getDB(resolveToken(token)).all("SELECT title FROM Series;", function (err, resD) {
            if (err) return console.log("Error getting element", err);
            resD.forEach((row) => {
                data.push(row);
            });
            let SerieName = "";
            for (let i = 0; i < data.length; i++) {
                let el = JSON.parse(data[i].title);
                path.split("/").forEach((ele) => {
                    if (ele === el.english || ele === el.romaji || ele === el.native) {
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
                if (SerieName !== "") {
                    break;
                }
            }
            insertIntoDB("", `(?,'${null}','${realname}',${null},${0},${0},${1},${0},${0},${0},'${path}','${null}','${null}','${null}','${null}',${null},'${null}','${"Anilist_" + realname.replaceAll(" ", "$") + "_" + SerieName.replaceAll(" ", "$")}','${null}','${null}','${null}','${null}','${null}','${null}','${null}',false)`, token, "Books")
        });
    } catch (e) {
        console.log(e);
    }
})

async function GETMARVELAPI_Comics(name = "", seriesStartDate = "") {
    if (name === "") {
        console.log("GETMARVELAPI_Comics : name is empty");
        return;
    }
    if (seriesStartDate === "") {
        console.log("GETMARVELAPI_Comics : seriesStartDate is empty");
        return;
    }
    let issueNumber = "";
    let inbFromName = name.replace(/[^#0-9]/g, "&");
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
    let url;
    if (seriesStartDate !== "" && issueNumber !== "") {
        url = "https://gateway.marvel.com:443/v1/public/comics?titleStartsWith=" + encodeURIComponent(name) + "&startYear=" + seriesStartDate + "&issueNumber=" + issueNumber + "&noVariants=true" + generateMarvelAPIAuth();
    } else {
        url = "https://gateway.marvel.com:443/v1/public/comics?titleStartsWith=" + encodeURIComponent(name) + "&noVariants=true" + generateMarvelAPIAuth();
    }
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}
async function GETGOOGLEAPI_book(name = "") {
    if (name === "") {
        console.log("GETGOOGLEAPI_book : name is empty");
        return;
    }

    name = name.replaceAll(/[(].+[)]/g, "");
    name = name.replaceAll(/[\[].+[\]]/g, "");
    name = name.replaceAll(/[\{].+[\}]/g, "");
    name = name.replaceAll(/[#][0-9]{1,}/g, "");
    name = name.replace(/\s+$/, "");
    console.log("GETGOOGLEAPI_book : name : " + name);
    let url = "https://www.googleapis.com/books/v1/volumes?q=" + encodeURIComponent(name)+"&maxResults=1&key=" + process.env.GBOOKSAPIKEY;
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}
async function GETOLAPI_search(name = "") {
    if (name === "") {
        console.log("OL API : name is empty");
        return;
    }

    name = name.replaceAll(/[(].+[)]/g, "");
    name = name.replaceAll(/[\[].+[\]]/g, "");
    name = name.replaceAll(/[\{].+[\}]/g, "");
    name = name.replaceAll(/[#][0-9]{1,}/g, "");
    name = name.replace(/\s+$/, "");
    console.log("OL API : name : " + name);
    let url = "http://openlibrary.org/search.json?q=" + encodeURIComponent(name)
    let response = await fetch(url);
    let data = await response.json();
    return data;
}

async function GETOLAPI_book(key = "") {
    if (key === "") {
        console.log("OL API : key is empty");
        return;
    }
    console.log("OL API : book : " + key);
    // let url = "https://openlibrary.org/works/" + key + ".json"
    let url = "https://openlibrary.org/api/books?bibkeys=OLID:" + key + "&jscmd=details&format=json"
    let response = await fetch(url);
    let data = await response.json();
    return data;
}

async function GETMARVELAPI_Series_ByID(id) {
    let url = "https://gateway.marvel.com:443/v1/public/series?id=" + id + generateMarvelAPIAuth();
    console.log(url);
    let response = await fetch(url);
    let data = await response.json();
    console.log(data);
    return data;
}

app.get("/api/marvel/searchonly/:name/",apiMarvelLimiter, async (req, res) => {
    GETMARVELAPI_SEARCH(req.params.name).then(function (data) {
        res.send(data);
    })
})
app.get("/api/marvel/searchonly/:name/:date",apiMarvelLimiter, async (req, res) => {
    GETMARVELAPI_SEARCH(req.params.name, req.params.date).then(function (data) {
        res.send(data);
    })
})

async function GETMARVELAPI_SEARCH(name = "", date = "") {
    if (name === "") {
        console.log("no name provided, aborting GETMARVELAPI");
        return;
    }
    name = name.replaceAll(/[(].+[)]/g, "");
    name = name.replace(/\s+$/, "");
    let encodedName = encodeURIComponent(name);
    let url;
    if (date !== "") {
        url = "https://gateway.marvel.com:443/v1/public/series?titleStartsWith=" + encodedName + "&startYear=" + date + generateMarvelAPIAuth();
    } else {
        url = "https://gateway.marvel.com:443/v1/public/series?titleStartsWith=" + encodedName + generateMarvelAPIAuth();
    }
    let response = await fetch(url);
    return await response.json();
}

app.post("/api/marvel",apiMarvelLimiter, (req, res) => {
    let token = req.body.token;
    let name = req.body.name;
    let path = req.body.path;
    API_MARVEL_GET(name).then(async function (data) {
        let randID = Math.floor(Math.random() * 1000000);
        console.log(data);
        console.log(name);
        if (data["data"]["total"] === 0) {
            await insertIntoDB("(ID_Series,title,note,start_date,end_date,description,Score,cover,BG,CHARACTERS,STAFF,SOURCE,volumes,chapters,favorite,PATH,lock)", "('" + randID + "U_1" + "','" + JSON.stringify(name.replaceAll("'", "''")) + "',null,null,null,null,'0',null,null,null,null,null,null,null,0,'" + path + "',false)", token, "Series");
        } else {
            await insertIntoDB("(ID_Series,title,note,start_date,end_date,description,Score,cover,BG,CHARACTERS,STAFF,SOURCE,volumes,chapters,favorite,PATH,lock)", "('" + data["data"]["results"][0]["id"] + "_1" + "','" + JSON.stringify(data["data"]["results"][0]["title"]).replaceAll("'", "''") + "',null,'" + JSON.stringify(data["data"]["results"][0]["startYear"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["endYear"]).replaceAll("'", "''") + "','" + data["data"]["results"][0]["description"] + "','" + data["data"]["results"][0]["rating"] + "','" + JSON.stringify(data["data"]["results"][0]["thumbnail"]) + "','" + JSON.stringify(data["data"]["results"][0]["thumbnail"]) + "','" + JSON.stringify(data["data"]["results"][0]["characters"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["creators"]).replaceAll("'", "''") + "','" + JSON.stringify(data["data"]["results"][0]["urls"][0]) + "','" + JSON.stringify(data["data"]["results"][0]["comics"]["items"]) + "','" + data["data"]["results"][0]["comics"]["available"] + "',0,'" + path + "',false)", token, "Series");
            await GETMARVELAPI_Creators(data["data"]["results"][0]["id"], "series").then(async (ccdata) => {
                ccdata = ccdata["data"]["results"];
                for (let i = 0; i < ccdata.length; i++) {
                    await insertIntoDB("", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["fullName"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}',${null},'${JSON.stringify(ccdata[i]["urls"])}')`, token, "Creators")
                }
            }).catch((err) => {
                console.log(err);
            });
            await GETMARVELAPI_Characters(data["data"]["results"][0]["id"], "series").then(async (ccdata) => {
                ccdata = ccdata["data"]["results"];
                for (let i = 0; i < ccdata.length; i++) {
                    await insertIntoDB("", `('${ccdata[i]["id"] + "_1"}','${ccdata[i]["name"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["thumbnail"])}','${ccdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(ccdata[i]["urls"])}')`, token, "Characters")
                }
            }).catch((err) => {
                console.log(err);
            });
            /*  await GETMARVELAPI_variants(data["data"]["results"][0]["id"]).then(async (cvdata) => {
                  cvdata = cvdata["data"]["results"];
                  for (let i = 0; i < cvdata.length; i++) {
                          await insertIntoDB("variants", "", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${null}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`).then(() => {
                              console.log("inserted");
                          });
                  }
              })*/
            await GETMARVELAPI_relations(data["data"]["results"][0]["id"]).then(async (cvdata) => {
                cvdata = cvdata["data"]["results"];
                for (let i = 0; i < cvdata.length; i++) {
                    if (cvdata[i]["description"] == null) {
                        await insertIntoDB("", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${null}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`, token, "relations")
                    } else {
                        await insertIntoDB("", `('${cvdata[i]["id"] + "_1"}','${cvdata[i]["title"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["thumbnail"])}','${cvdata[i]["description"].replaceAll("'", "''")}','${JSON.stringify(cvdata[i]["urls"])}','${data["data"]["results"][0]["id"] + "_1"}')`, token, "relations")
                    }
                }
            }).catch((err) => {
                console.log(err);
            });
        }
    }).catch((err) => {
        console.log(err);
    })
})
app.post("/api/anilist", apiAnilistLimiter, async(req, res) => {
    let name = req.headers.name;
    let token = req.headers.token;
    let path = req.headers.path;
    await API_ANILIST_GET(name).then(async function (thedata) {
        console.log(thedata);
        let randID = Math.floor(Math.random() * 1000000);
        if (thedata === null) {
            await insertIntoDB("(ID_Series,title,note,statut,start_date,end_date,description,Score,genres,cover,BG,CHARACTERS,TRENDING,STAFF,SOURCE,volumes,chapters,favorite,PATH,lock)", "('" + randID + "U_2" + "','" + JSON.stringify(name.replaceAll("'", "''")) + "',null,null,null,null,null,'0',null,null,null,null,null,null,null,null,null,0,'" + path + "',false)", token, "Series");
            return;
        }
        let data = thedata["base"];
        let relationsData = thedata["relations"];
        let charactersData = thedata["characters"];
        let staffData = thedata["staff"];
        console.log(staffData);
        await insertIntoDB("(ID_Series,title,note,statut,start_date,end_date,description,Score,genres,cover,BG,CHARACTERS,TRENDING,STAFF,SOURCE,volumes,chapters,favorite,PATH,lock)", "('" + data["id"] + "_2" + "','" + JSON.stringify(data["title"]).replaceAll("'", "''") + "',null,'" + data["status"].replaceAll("'", "''") + "','" + JSON.stringify(data["startDate"]).replaceAll("'", "''") + "','" + JSON.stringify(data["endDate"]).replaceAll("'", "''") + "','" + data["description"].replaceAll("'", "''") + "','" + data["meanScore"] + "','" + JSON.stringify(data["genres"]).replaceAll("'", "''") + "','" + data["coverImage"]["large"] + "','" + data["bannerImage"] + "','" + JSON.stringify(data["characters"]).replaceAll("'", "''") + "','" + data["trending"] + "','" + JSON.stringify(data["staff"]).replaceAll("'", "''") + "','" + data["siteUrl"].replaceAll("'", "''") + "','" + data["volumes"] + "','" + data["chapters"] + "',0,'" + path + "',false)", token, "Series");
        for (let i = 0; i < staffData.length; i++) {
            try {
                if (staffData[i]["description"] == null) {
                    await insertIntoDB("", `('${staffData[i]["id"] + "_2"}','${staffData[i]["name"]["full"].replaceAll("'", "''")}','${JSON.stringify(staffData[i]["image"]["medium"])}','${null}','${JSON.stringify(staffData[i]["siteUrl"])}')`, token, "Creators")
                } else {
                    await insertIntoDB("", `('${staffData[i]["id"] + "_2"}','${staffData[i]["name"]["full"].replaceAll("'", "''")}','${JSON.stringify(staffData[i]["image"]["medium"])}','${JSON.stringify(staffData[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(staffData[i]["siteUrl"])}')`, token, "Creators")
                }
            } catch (e) {
                console.log(e);
            }
        }
        for (let i = 0; i < charactersData.length; i++) {
            try {
                if (charactersData[i]["description"] == null) {
                    await insertIntoDB("", `('${charactersData[i]["id"] + "_2"}','${charactersData[i]["name"]["full"].replaceAll("'", "''")}','${JSON.stringify(charactersData[i]["image"]["medium"])}','${null}','${JSON.stringify(charactersData[i]["siteUrl"])}')`, token, "Characters")
                } else {
                    await insertIntoDB("", `('${charactersData[i]["id"] + "_2"}','${charactersData[i]["name"]["full"].replaceAll("'", "''")}','${JSON.stringify(charactersData[i]["image"]["medium"])}','${JSON.stringify(charactersData[i]["description"].replaceAll("'", "''"))}','${JSON.stringify(charactersData[i]["siteUrl"])}')`, token, "Characters")
                }
            } catch (e) {
                console.log(e);
            }
        }
        for (let i = 0; i < relationsData.length; i++) {
            let dataR = relationsData[i];
            if (dataR.title.english == null) {
                await insertIntoDB("", `('${dataR["id"] + "_2"}','${dataR["title"]["romaji"].replaceAll("'", "''")}','${dataR["coverImage"]["large"]}','${dataR["type"] + " / " + dataR["relationType"] + " / " + dataR["format"]}',${null},'${data["id"] + "_2"}')`, token, "relations");
                console.log("inserted");
            } else {
                await insertIntoDB("", `('${dataR["id"] + "_2"}','${dataR["title"]["english"].replaceAll("'", "''")}','${dataR["coverImage"]["large"]}','${dataR["type"] + " / " + dataR["relationType"] + " / " + dataR["format"]}',${null},'${data["id"] + "_2"}')`, token, "relations");
                console.log("inserted");
            }
        }
    })
    res.sendStatus(200)
});

app.get("/api/anilist/searchOnly/:name",apiAnilistLimiter, (req, res) => {
    let name = req.params.name;
    API_ANILIST_GET_SEARCH(name).then(async function (dataa) {
        res.send(dataa);
    })
});

app.get("/getThemes", limiterDefault,(req, res) => {
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
async function UnZip(zipPath, ExtractDir, name, ext, token) {
    var listOfElements;
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
        fs.chmodSync(__dirname + "/node_modules/7zip-bin/linux/x64/7za", 0o777);
        if (ext === "epub" || ext === "ebook") {
            var fromfile = "";
            const Stream = Seven.extractFull(zipPath, ExtractDir, {
                recursive: true,
                $bin: Path27Zip
            });
            var resEnd;
            Stream.on("end", async () => {
                listOfElements = fs.readdirSync(ExtractDir);
                const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
                const page = await browser.newPage();
                let bignb = 0;
                for (var i = 0; i < listOfElements.length; i++) {
                    var el = listOfElements[i];
                    if (el.includes(".xhtml")) {
                        await page.goto("file://" + ExtractDir + "/" + el, {waitUntil: "networkidle0"});
                        await page.emulateMediaType('print');
                        n = parseInt(name) + 1;
                        name = Array(5 - String(n).length + 1).join("0") + n;
                        await page.screenshot({path: ExtractDir + "/" + name + ".png", fullPage: true});
                        bignb++;
                    }
                }
                await browser.close();
                let allFiles = fs.readdirSync(ExtractDir);
                allFiles.forEach((el) => {
                    if (!el.includes(".png")) {
                        fs.rmSync(ExtractDir + "/" + el, {recursive: true});
                    }
                });
                listOfElements = GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");
                console.log("finish");
                console.log(zipPath);
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
        } else if (ext === "pdf") {

            const {spawn} = require('child_process');
            let ls;
            ls = spawn('convert', ['-density', '300', zipPath, ExtractDir + '/%d.jpg']);
            ls.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                
            });
            ls.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });               
            ls.on('close', (code) => {
                console.log(`child process exited with code ${code}`);  
                listOfElements = GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");
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
                            if (result === undefined || result.length == 0) {
                                SendTo(0);
                                return 0;
                            }else{

                                SendTo(result[0].last_page);
                                return result[0].last_page;
                            }
                        });
                    } catch (e) {
                        console.log(e);
                    }
                } catch (error) {
                    console.log(error);
                }
            });
        } else if (
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
                listOfElements = GetListOfImg(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/current_book");
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
        } else if (ext == "rar" || ext == "cbr") {
            var configFile = fs.readFileSync(CosmicComicsTemp + "/profiles/" + resolveToken(token) + "/config.json");
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
        } else {
            console.log("not supported");
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
    } else {
        return [];
    }
}

function unzip_first(zipPath, ExtractDir, ext, token, fileName) {
    //Unzip the first image
    //premiere image si dossier
    console.log(fileName);
    try {
        let n = 0;
        if (
            ext === "zip" ||
            ext === "cbz" ||
            ext === "7z" ||
            ext === "cb7" ||
            ext === "tar" ||
            ext === "cbt"
        ) {
            let fromfile = [];
            let cherrypick = [
                "*.jpg",
                "*.png",
                "*.jpeg",
                "*.bmp",
                "*.apng",
                "*.svg",
                "*.ico",
                "*.webp",
                "*.gif",
            ];
            const Streamer = Seven.list(zipPath, {
                recursive: true,
                $cherryPick: cherrypick,
                $bin: Path27Zip,
            });
            Streamer.on("data", function (data) {
                fromfile.push(data.file);
            });
            Streamer.on("end", function () {
                const Stream = Seven.extract(zipPath, ExtractDir, {
                    recursive: true,
                    $cherryPick: fromfile[0],
                    $bin: Path27Zip
                });
                Stream.on("end", function () {
                    if (Stream.info.get("Files") === "0") {
                        console.log("no file found");
                        //no file found
                    } else {
                        fs.renameSync(ExtractDir + "/" + fromfile[0], ExtractDir + "/" + fileName + ".jpg");
                        console.log("file found and extracted : " + ExtractDir + "/" + fileName + ".jpg");
                    }
                });
                Stream.on("error", (err) => {
                    console.log("An error occured" + err);
                });
            })
        } else if (ext === "rar" || ext === "cbr") {
            let configFile = fs.readFileSync(CosmicComicsTemp + "/profiles/" + token + "/config.json");
            let parsedJSON = JSON.parse(configFile);
            let provider = GetElFromInforPath("update_provider", parsedJSON);
            let archive;
            if (provider === "msstore") {
                archive = new Unrar({
                    path: zipPath,
                    bin: CosmicComicsTemp + "/unrar_bin/UnRAR.exe"
                });
            } else {
                archive = new Unrar({
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
                    for (let i in file) {
                        if (i === "name") {
                            let currentName = file[i];
                            currentName = currentName.toString();
                            let stream = archive.stream(currentName);
                            stream.on("error", console.error);
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
                                if (!fs.existsSync(ExtractDir + "/" + fileName + ".jpg")) {
                                    stream.pipe(
                                        fs.createWriteStream(ExtractDir + "/" + fileName + ".jpg")
                                    );
                                } else {
                                    console.log("file already exist");
                                }
                                return;
                            }
                        }
                    }
                });
            });
        } else {
            //throw error for try catch
            throw "not supported";
        }
    } catch (error) {
        if (error === "not supported") {
            throw "not supported";
        }
        console.log(error);
    }
}

async function changePermissionForFilesInFolder(folderPath) {
    fs.chmodSync(folderPath, 0o777);
    console.log("chmod 777 for " + folderPath);
    fs.readdirSync(folderPath, (err, files) => {
        files.forEach((file) => {
            fs.chmodSync(folderPath + "/" + file, 0o777);
            console.log("chmod 777 for " + folderPath + "/" + file);
        });
    });
}

app.post("/fillBlankImage",limiterDefault, (req, res) => {
    let token = req.body.token;
    fillBlankImages(token);
    res.sendStatus(200);
})

function fillBlankImages(token) {
    //get the null, "null", "undefined", blank cover or BannerImage from the books DB
    try {
        let result = [];
        getDB(resolveToken(token)).all("select * from Books where URLCover IS NULL OR URLCover = 'null' OR URLCover='undefined';", async function (err, resD) {
            if (err) return console.log("Error getting element", err);
            resD.forEach((row) => {
                console.log(row);
                result.push(row);
            });
            for (const book of result) {
                console.log("Beggining fillBlankImages for : " + book.NOM);
                let filename = book.ID_book
                try {
                    unzip_first(book.PATH, __dirname + "/public/FirstImagesOfAll", path.extname(book.PATH).replaceAll(".", ""), token, filename);
                    await changePermissionForFilesInFolder(__dirname + "/public/FirstImagesOfAll/");
                    /*
                                        let newpath = await WConv(filename + ".jpg");
                    */
                    UpdateDB("noedit", "URLCover", "'" + __dirname + "/public/FirstImagesOfAll/" + filename + ".jpg'", token, "Books", "ID_book", book.ID_book);
                } catch (e) {
                    console.log("NOT SUPPORTED");
                }
            }
        });
    } catch (e) {
        console.log(e);
    }
    //Unzip the first image for each with their path to a folder
    //Convert it in webp
    //Replace the null, "null", "undefined", blank cover or BannerImage from the books DB with the new webp
}

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
app.post("/configServ/:name/:passcode/:port",limiterDefault, (req, res) => {
    console.log("creating user");
    const name = req.params.name;
    const passcode = req.params.passcode;
    const portServ = req.params.port;
    fs.mkdirSync(CosmicComicsTemp + "/profiles/" + name, {recursive: true});
    changePermissionForFilesInFolder(CosmicComicsTemp + "/profiles/" + name);
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
app.get("/profile/getPP/:token",accountLimiter, (req, res) => {
    const token = resolveToken(req.params.token);
    res.sendFile(CosmicComicsTemp + "/profiles/" + token + "/pp.png");
});
app.get("/profile/getPPBN/:name",accountLimiter, (req, res) => {
    res.sendFile(CosmicComicsTemp + "/profiles/" + req.params.name + "/pp.png");
});
app.get("/profile/custo/getNumber", accountLimiter,(req, res) => {
    res.send({"length": fs.readdirSync(__dirname + "/public/Images/account_default").length});
});
/*app.get("/api/marvel", (req, res) => {
	let id = req.body.id
	fetch("https://gateway.marvel.com:443/v1/public/series/" + id + "/comics?noVariants=false&orderBy=issueNumber&apikey=").then((e)=>{
		res.send(e)
	})
})*/
//Modifications of the profile
app.post("/profile/modification", accountLimiter,(req, res) => {
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
app.post("/profile/deleteAccount",accountLimiter, (req, res) => {
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

async function WConv(file) {
    try {
        webp.grant_permission();
    } catch (error) {
        console.log("WEBP CONVERTER ERROR: " + error);
    }
    let oldfile = __dirname + "/public/FirstImagesOfAll/" + file;
    let newfile = __dirname + "/public/FirstImagesOfAll/" + path.basename(file) + ".webp";
    try {
        if (path.extname(file) !== ".webp") {
            await webp
                .cwebp(oldfile, newfile, "-q 80 -noalpha -resize 250 380", (logging = "-v"))
                .then((response) => {
                    console.log(response);
                    fs.rmSync(oldfile);
                })
            return newfile
        }
    } catch (error) {
        console.log(error);
    }
    return newfile
}
