const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const SevenBin = require("7zip-bin");
const unrarBin = require("unrar-binaries");
var Unrar = require("unrar");
const Seven = require("node-7z");
const {getColorFromURL} = require('color-thief-node');
const Path27Zip = SevenBin.path7za;
app.use(express.static('public'))
var CosmicComicsTemp = __dirname + "/public/CosmicComics_local";
var CosmicComicsTempI = CosmicComicsTemp + "/current_book/";
var sqlite3 = require("sqlite3");
const anilist = require("anilist-node");
const AniList = new anilist();
/* const {Client} = require("anilist.js");
const AniList2 = new Client(); */
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
const ValidatedExtensionV = [
    "png",
    "jpg",
    "jpeg",
    "bmp",
    "apng",
    "svg",
    "ico",
    "webp",
    "gif",
];


fs.mkdirSync(__dirname + "/public/CosmicComics_local/", {recursive: true});

var mangaMode = false;

//Creating the database

let db = new sqlite3.Database(__dirname + '/public/CosmicComics_local/ComicsComics.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log("Conected to the DB")
})

db.run('CREATE TABLE IF NOT EXISTS Books (ID_DB INT AUTO_INCREMENT, ID_book VARCHAR(255) PRIMARY KEY NOT NULL, NOM VARCHAR(255) NOT NULL,read boolean NOT NULL,reading boolean NOT NULL,unread boolean NOT NULL,favorite boolean NOT NULL,last_page INTEGER NOT NULL,folder boolean NOT NULL,PATH VARCHAR(255) NOT NULL,URLCover VARCHAR(255), issueNumber INTEGER,description VARCHAR(255),format VARCHAR(255),pageCount INTEGER,URLs VARCHAR(255),series VARCHAR(255),creators VARCHAR(255),characters VARCHAR(255),prices VARCHAR(255),dates VARCHAR(255),collectedIssues VARCHAR(255),collections VARCHAR(255),variants VARCHAR(255))')
db.run("CREATE TABLE IF NOT EXISTS Bookmarks (ID_BOOKMARK INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,BOOK_ID VARCHAR(255) NOT NULL,PATH VARCHAR(4096) NOT NULL,page INTEGER NOT NULL,FOREIGN KEY (BOOK_ID) REFERENCES Book (ID_book));")
db.run("CREATE TABLE IF NOT EXISTS API (ID_API INTEGER PRIMARY KEY NOT NULL, NOM VARCHAR(255) NOT NULL);", () => {

    db.run("REPLACE INTO API (ID_API,NOM) VALUES (1,'Marvel'), (2,'Anilist'),(3,'LeagueOfComicsGeeks');")
});
db.run("CREATE TABLE IF NOT EXISTS Series (ID_Series VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,title VARCHAR(255) NOT NULL,note INTEGER,statut VARCHAR(255),start_date VARCHAR(255),end_date VARCHAR(255),description VARCHAR(255),Score INTEGER,genres VARCHAR(255),cover VARCHAR(255),BG VARCHAR(255),CHARACTERS VARCHAR(255),TRENDING INTEGER,STAFF VARCHAR(255),SOURCE VARCHAR(255),volumes INTEGER,chapters INTEGER);")
db.run("CREATE TABLE IF NOT EXISTS Creators (ID_CREATOR VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),description VARCHAR(255),url VARCHAR(255))")
db.run("CREATE TABLE IF NOT EXISTS Characters (ID_CHAR VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),description VARCHAR(255),url VARCHAR(255))")
db.run("CREATE TABLE IF NOT EXISTS variants (ID_variant VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,name VARCHAR(255),image varchar(255),description VARCHAR(255),url VARCHAR(255),series VARCHAR(255), FOREIGN KEY (series) REFERENCES Series (ID_Series))")

db.run("CREATE TABLE IF NOT EXISTS Libraries (ID_LIBRARY INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, NAME VARCHAR(255) NOT NULL,PATH VARCHAR(4096) NOT NULL,API_ID INTEGER NOT NULL,FOREIGN KEY (API_ID) REFERENCES API(ID_API));")

if (!fs.existsSync(__dirname + "/public/CosmicComics_local/config.json")) {
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
        theme_date: true,
    };
    fs.writeFileSync(
        __dirname + "/public/CosmicComics_local/config.json",
        JSON.stringify(obj, null, 2), {encoding: "utf8"}
    );


}

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
if (!fs.existsSync(CosmicComicsTemp + "/downloaded_book")) {
    fs.mkdirSync(CosmicComicsTemp + "/downloaded_book")
}
const cors = require('cors');
const {ChildProcess} = require("child_process");
const {fork} = require('node:child_process');
const {spawn} = require('child_process');

app.use(cors());
app.use(express.json({limit: "50mb"}))
app.use(express.urlencoded({extended: true}));
app.listen(8000, "0.0.0.0", function () {
    const host = this.address().address;
    const port = this.address().port;
    console.log("Listening on port %s:%s!", host, port);
});
app.post("/downloadBook", function (req, res) {
    const python = spawn("python", [__dirname + "/external_scripts/bookDownloader.py", req.body.url]);
    python.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    python.on('close', (code) => {
        console.log(`child process close all stdio with code ${code}`)
        res.sendStatus(200);

    });
});
let DLBOOKPATH = "";
app.post("/DL", function (req, res) {
    console.log(req.body);
    DLBOOKPATH = req.body.path;
    res.sendStatus(200);
})
app.get("/getDLBook", function (req, res) {
  res.download(DLBOOKPATH);
})
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
app.get("/css/base.css", (req, res) => {
    res.sendFile(__dirname + "/css/base.css");
})
app.get("/css/bootstrap.css", (req, res) => {
    res.sendFile(__dirname + "/css/bootstrap.css");
})
app.get("/modules/bootstrapJS", (req, res) => {
    res.sendFile(__dirname + "/node_modules/bootstrap/dist/js/bootstrap.bundle.js", {
        headers: {
            "Content-Type": "text/javascript"
        }
    });
})

app.get("/img/getColor/:img", async (req, res) => {
    var img = __dirname + "/public/CosmicComics_local/current_book/" + req.params.img;
    const dominantColor = await getColorFromURL(img);
    res.send(dominantColor);
})

app.get("/css/materialize.css", (req, res) => {
    res.sendFile(__dirname + "/css/materialize.css");
})

app.get("/js/materialize.js", (req, res) => {
    res.sendFile(__dirname + "/js/materialize.js");
})
app.get("/index.js", (req, res) => {
    res.sendFile(__dirname + "/index.js");
})


app.get("/viewer.js", (req, res) => {
    res.sendFile(__dirname + "/viewer.js");
})
app.get("/viewer.html", (req, res) => {
    res.sendFile(__dirname + "/viewer.html");
})
app.get("/css/animate", (req, res) => {
    res.sendFile(__dirname + "/css/animate.css");
})
app.get("/js/html-magnifier.js", (req, res) => {
    res.sendFile(__dirname + "/js/html-magnifier.js");
})


var currentBookPath = "";
var SendToUnZip = "";
app.get("/Unzip/:path", (req, res) => {
    var currentPath = replaceHTMLAdressPath(req.params.path);
    currentBookPath = currentPath.split("&page=")[1];
    var patho = currentPath;
    var named = path.basename(patho);
    named = named.split(".");
    var ext = named.pop();
    UnZip(currentPath, CosmicComicsTempI, "00000", ext)
    inter = setInterval(() => {
        if (SendToUnZip != "") {
            res.send(SendToUnZip)
            clearInterval(inter)
            return;
        }
    }, 1000);

})
app.get("/viewer/view/current", (req, res) => {
    res.send(GetListOfImg(CosmicComicsTempI))
})


app.get("/dirname", (req, res) => {
    res.send(__dirname)
})

app.get("/viewer/view/current/:page", (req, res) => {
    var page = req.params.page;
    var listOfImg = GetListOfImg(CosmicComicsTempI);
    res.send(CosmicComicsTempI + listOfImg[page])
})

app.get("/config/getConfig", (req, res) => {
    res.send(fs.readFileSync("public/CosmicComics_local/config.json"));
})


app.get("/BM/getBM", (req, res) => {
    res.send(fs.readFileSync("public/CosmicComics_local/bookmarks.json"));
})
app.get("/lang/:lang", (req, res) => {
    res.send(fs.readFileSync(__dirname + "/languages/" + req.params.lang + ".json"));
})

app.get("/view/isDir/:path", (req, res) => {
    var isDir = fs.statSync(replaceHTMLAdressPath(req.params.path)).isDirectory();
    console.log(isDir)
    res.send(isDir);
})
app.get("/view/exist/:path", (req, res) => {
    var exist = fs.existsSync(replaceHTMLAdressPath(req.params.path));
    console.log(exist)
    res.send(exist);
})

app.get("/view/readFile/:path", (req, res) => {
    var o = replaceHTMLAdressPath(req.params.path);
    var p = fs.readFileSync(o, "utf8");
    res.send(JSON.stringify(p));
})

app.post('/config/writeConfig', (req, res) => {
    console.log(req.body);
    fs.writeFileSync("public/CosmicComics_local/config.json", JSON.stringify(req.body, null, 2));
    res.sendStatus(200)
})

app.post('/DB/write/:jsonFile', (req, res) => {
    fs.writeFileSync("public/CosmicComics_local/" + req.params.jsonFile + ".json", JSON.stringify(req.body, null, 2));
    res.sendStatus(200)
})
app.get("/DB/read/:jsonFile", (req, res) => {
    res.send(fs.readFileSync("public/CosmicComics_local/" + req.params.jsonFile + ".json"));
})
app.get("/themes/read/:jsonFile", (req, res) => {
    res.send(fs.readFileSync(__dirname + "/themes/" + req.params.jsonFile));
})
app.get("/DB/update/:dbName/:colName/:value/:id", (req, res) => {
    try {
        db.run("UPDATE " + req.params.dbName + " SET " + req.params.colName + " = " + req.params.value + " WHERE ID_book='" + req.params.id + "';")
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200)

})
app.post("/DB/lib/update/:id", (req, res) => {
    console.log(req.body)
    const name = req.body.name;
    const path = req.body.path;
    const api = req.body.api_id;
    console.log(name, path, api)
    console.log("UPDATE Libraries SET NAME='" + name + "', PATH='" + path + "', API_ID=" + api + " WHERE ID_LIBRARY=" + req.params.id + ";")
    try {
        db.run("UPDATE Libraries SET NAME='" + name + "', PATH='" + path + "', API_ID=" + api + " WHERE ID_LIBRARY=" + req.params.id + ";")
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200)

})
app.post("/DB/insert/:dbName", (req, res) => {
    try {
        const dbinfo = req.body.into
        const values = req.body.val
        console.log(dbinfo + values)
        db.run("INSERT OR IGNORE INTO " + req.params.dbName + " " + dbinfo + " VALUES " + values + ";")
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200)

})

app.post("/DB/insert/lib", (req, res) => {
    try {
        const dbinfo = req.body.into
        const values = req.body.val
        db.run("INSERT OR IGNORE INTO Librairies " + +" VALUES " + values + ";")
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200)

})


app.get("/DB/delete/:dbName/:id/:option", (req, res) => {
    try {
        db.run("DELETE FROM " + req.params.dbName + " WHERE BOOK_ID='" + req.params.id + "' " + req.params.option + ";")
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200)

})

app.get("/DB/lib/delete/:id", (req, res) => {
    try {
        db.run("DELETE FROM Libraries WHERE ID_LIBRARY=" + req.params.id + ";")
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200)

})

app.post("/DB/get/:dbName", (req, res) => {
    try {
        var result = [];
        const requestToDB = req.body.request
        db.all("SELECT " + requestToDB + ";", function (err, resD) {
            if (err) return console.log("Error getting element", err)
            resD.forEach((row) => {
                result.push(row);
            })
            res.send(result);

        })
    } catch (e) {
        console.log(e);
    }
})
app.get("/getVersion", (req, res) => {
    res.send(process.env.npm_package_version);
})
app.get("/getListOfFolder/:path", (req, res) => {
    var dir = req.params.path;
    dir = replaceHTMLAdressPath(dir);
    var listOfFolder = [];
    fs.readdirSync(dir).forEach(function (file) {
        file = dir + "/" + file;
        var stat = fs.statSync(file);

        if (stat.isDirectory()) {
            listOfFolder.push(file);
        } else {
        }
    });
    res.send(listOfFolder);
})
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
})
app.get("/api/anilist/search/:name", (req, res) => {
    var name = req.params.name;
    AniList.searchEntry.manga(
        name,
        null, 1,
        25,
    ).then(function (data) {
        if (data == null) {
            res.send(null);
        } else {

            AniList.media.manga(data.media[0].id).then(function (data2) {
                res.send(data2);
            })
        }
    }).catch(function (err) {
        console.log(err);
    });
})
app.get("/api/anilist/creator/:id", (req, res) => {
    try {
        AniList.people.staff(parseInt(req.params.id)).then(function (data) {
            res.send(data);
        })


    } catch (e) {
        console.log(e);
    }
})
app.get("/api/anilist/character/:id", (req, res) => {
    try {
        AniList.people.character(parseInt(req.params.id)).then(function (data) {
            res.send(data);
        })


    } catch (e) {
        console.log(e);
    }
})
/* app.get("/api/anilist/relations/:name", (req, res) => {
    try {
        AniList2.searchMedia({
            search: req.params.name,
            format: "MANGA",
            perPage: 25,
        })
            .then(function (data) {
                res.send(data["Results"][0]["info"]["relations"]["edges"]);
            })


    } catch (e) {
        console.log(e);
    }
}) */
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
    HTMLParam = HTMLParam.replaceAll("ù", "/").replaceAll("%C3%B9", "/");
    return HTMLParam;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////  Viewer  /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
//get element from config.json
function GetElFromInforPath(search, info) {
    for (var i in info) {
        if (i == search) {
            return info[i];
        }
    }
    return null;
}

function SendTo(val) {
    console.log("sendto" + val)
    SendToUnZip = val
}

//UnZip the archive
function UnZip(zipPath, ExtractDir, name, ext) {
    var listofImg;
    try {
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
                $bin: Path27Zip,
            });
            var resEnd;
            Stream.on("end", () => {

                listofImg = GetListOfImg(CosmicComicsTempI);
                console.log("finish")

                var name1 = path.basename(zipPath);

                var shortname = GetTheName(name1);
                var lastpage = 0;
                try {
                    try {
                        var result = [];
                        db.all("SELECT last_page FROM Books WHERE ID_Book='" + shortname + "';", function (err, resD) {
                            if (err) return console.log("Error getting element", err)
                            resD.forEach((row) => {
                                console.log(row)
                                result.push(row);

                            })
                            console.log(result)
                            SendTo(result)
                        })

                    } catch (e) {
                        console.log(e);
                    }


                } catch (error) {
                    console.log(error);
                }


            })
            Stream.on("error", (err) => {
                console.log("An error occured" + err);
            });
        }

        if (ext == "rar" || ext == "cbr") {
            var configFile = fs.readFileSync(CosmicComicsTemp + "/config.json");
            var parsedJSON = JSON.parse(configFile);
            var provider = GetElFromInforPath("update_provider", parsedJSON);
            if (provider == "msstore") {
                var archive = new Unrar({
                    path: zipPath,
                    bin: CosmicComicsTemp + "/unrar_bin/UnRAR.exe",
                });
            } else {
                var archive = new Unrar({
                    path: zipPath,
                    bin: unrarBin,
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
                                    fs.createWriteStream(CosmicComicsTempI + name + ".jpg")
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
        console.log(error)
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