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
//importing the modules required
const fs = require("fs");
const patha = require("path");
var popper = require("@popperjs/core");
var bootstrap = require("bootstrap");
const app = remote.app;
const { Client } = require("anilist.js");
//declaring the popovers
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

//Decclaring the AppDataDirectory
var CosmicComicsData = app.getPath("userData") + "/CosmicComics_data";
const parentfolder1 = require("path").dirname(__dirname);
const parentfolder2 = require("path").dirname(parentfolder1);
const parentfolder3 = require("path").dirname(parentfolder2);
if (fs.existsSync(parentfolder3+"/portable.txt")){
  CosmicComicsData = parentfolder3+"/AppData"
}

//Declaring and initializing the Anilist API
const AniList = new Client();

//Declaring the league of comics geek scrapper
const CG = require("./comicgeeks/dist/index");

//The word below are excluded of the string for searching on the comics website
const Name_Exception = ["Asgard Empire", "Digital", "Collection"];

//Getting the name and the ID of the file from the path
var Name_With_Ext = patha.basename(GetFilePath());
var Name_Without_Ext = Name_With_Ext.split(".")[0];
var name_ID = Get_the_name_id(Name_Without_Ext);

//#endregion

//Get Element from the config.json
function Get_From_Config(what_to_search_for, data) {
  for (var i in data[0]) {
    if (i == what_to_search_for) {
      return data[0][i];
    }
  }
  return null;
}
//Setting the language variable
var language = Get_Lang();

//Getting the Language file used in the app from the config.json
function Get_Lang() {
  var configFile = fs.readFileSync(CosmicComicsData + "/config.json");
  var parsedJSON = JSON.parse(configFile);
  var configlang = Get_From_Config("language", parsedJSON);
  return lang_from_JSON(configlang);
}
//Getting all the language's data from the language's JSON
function lang_from_JSON(language) {
  var file = fs.readFileSync(__dirname + "/languages/" + language + ".json");
  var JSONRes = JSON.parse(file);
  return JSONRes[0];
}

//Getting the file path from the URL's parameter
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

//get the name id from the name without ext
function Get_the_name_id(the_name = "") {
  //removing all unwanted characters from the_name
  the_name = the_name.replaceAll(/ *\([^)]*\) */g, "");
  the_name = the_name.replaceAll(/ *\[[^\]]*\] */g, "");
  the_name = the_name.replaceAll("-", " ");

  //creating a list of the_name
  var temp = the_name.split(" ");

  //removing all the unwanted words
  for (var i = 0; i < temp.length; i++) {
    const el = temp[i];
    if (Name_Exception.includes(el) == true) {
      temp[i] = "";
    }
  }

  //removing all empty in the list
  temp = temp.filter(function (el) {
    return el != "";
  });

  //Removing all numbers from the Name
  var Name_without_number = "";
  temp.forEach((el) => {
    if (el != "") {
      if (hasNumbers(el)) {
      } else if (isNaN(parseInt(el))) {
        if (Name_without_number == "") {
          Name_without_number += el;
        } else {
          Name_without_number += " " + el;
        }
      } else {
        if (Name_without_number == "") {
          Name_without_number += el;
        } else {
          Name_without_number += " " + el;
        }
      }
    }
  });

  //Replacing all "," to a space on the string
  Name_without_number = Name_without_number.replaceAll(",", " ");
  return Name_without_number;
}

//Checking if the passed element contains numbers
function hasNumbers(t) {
  var regex = /\d/g;
  return regex.test(t);
}

//Trying geting information from the Manga DataBase (Anilist.co)
async function Manga(name, n) {
  Toastifycation(language["searhcing_for_manga"], "#292929");

  //removing "volumes" and "volume" words from the name of the manga
  var name_clean = name.replaceAll("Volumes", "");
  name_clean = name_clean.replaceAll("Volume", "");

  //searching for a manga with 25 elements per page
  const search = await AniList.searchMedia({
    search: name_clean,
    format: "MANGA",
    perPage: 25,
  });

  //If the result as found something
  if (search.Results.length != 0) {
    //Creating the list of other mangas in the select tag

    //Removing all previous child from the select tag and the relations
    var child = document.getElementById("selectAnother").lastElementChild;
    while (child) {
      document.getElementById("selectAnother").removeChild(child);
      child = document.getElementById("selectAnother").lastElementChild;
    }
    var child2 = document.getElementById("relations").lastElementChild;
    while (child2) {
      document.getElementById("relations").removeChild(child2);
      child2 = document.getElementById("relations").lastElementChild;
    }

    //creating the new select tag
    for (var i = 0; i < search.Results.length; i++) {
      const opt = document.createElement("option");
      if (i == n) {
        opt.setAttribute("selected", "");
      }
      opt.value = i;
      opt.innerHTML = search.Results[i]["info"]["title"].romaji;
      document.getElementById("selectAnother").appendChild(opt);
    }

    //Notify the user
    Toastifycation(language["found"], "#00C33C");

    const result = search.Results[n];
    //Cover IMG
    document.getElementById("cover").src =
      result["info"]["coverImage"].extraLarge;
    //Title
    document.getElementById("Title").innerHTML =
      result["info"]["title"].english +
      " / " +
      result["info"]["title"].romaji +
      " / " +
      result["info"]["title"].native;
    //Description
    document.getElementById("description").innerHTML =
      result["info"]["description"];
    //Rating
    document.getElementById("rating").innerHTML =
      language["rating"] + result["info"]["averageScore"];
    //Number of chapters
    document.getElementById("chapt").innerHTML =
      language["chapters"] + result["info"]["chapters"];
    //List of Characters show total and 25 first
    var tmpchara = "";
    result["info"]["characters"]["edges"].forEach((el) => {
      tmpchara +=
        el.role +
        ": " +
        el.node.name.full +
        " / " +
        el.node.name.native +
        "<br></br>";
    });
    document.getElementById("charct").innerHTML =
      "<h1>" +
      language["characters"] +
      ":</h1> " +
      result["info"]["characters"]["pageInfo"]["perPage"] +
      " " +
      language["characters"] +
      " " +
      language["of"] +
      " " +
      result["info"]["characters"]["pageInfo"]["total"] +
      "<br></br>" +
      tmpchara;

    //Origins Conutry
    document.getElementById("OriginCountry").innerHTML =
      language["country_of_origin"] + " : " + result["info"]["countryOfOrigin"];
    //End Date
    if (
      result["info"]["endDate"].day == null &&
      result["info"]["endDate"].month == null &&
      result["info"]["endDate"].year == null
    ) {
      document.getElementById("EndDate").innerHTML =
        language["ending_date"] + ": " + language["unknown"];
    } else {
      document.getElementById("EndDate").innerHTML =
        language["ending_date"] +
        ": " +
        result["info"]["endDate"].day +
        "/" +
        result["info"]["endDate"].month +
        "/" +
        result["info"]["endDate"].year;
    }

    //favorites
    document.getElementById("Favo").innerHTML =
     language["favorite"]+ ": " + result["info"]["favourites"];
    //Format
    document.getElementById("Format").innerHTML =
      language["format"]+": " + result["info"]["format"];
    //Genres
    document.getElementById("Genres").innerHTML = language["genres"]+":";
    result["info"]["genres"].forEach((el) => {
      document.getElementById("Genres").innerHTML += " " + el;
    });

    //Anilist ID
    document.getElementById("ID").innerHTML =
      "Anilist ID: " + result["info"]["id"];
    //MeanSCore
    document.getElementById("MeanScore").innerHTML =
      "Mean Score: " + result["info"]["meanScore"];
    //relation
    document.getElementById("relationsTXT").innerHTML = language["relations"]+": ";
    result["info"]["relations"]["edges"].forEach((el) => {
      const reltxt = document.createElement("div");
      reltxt.innerHTML =
        el.node.title.romaji +
        "<br></br>" +
        language["this_is_a_n"]+": " +
        el.relationType +
        "<br></br>" +
        language["format"]+": " +
        el.node.format +
        "<br></br>" +
        language["type"]+": " +
        el.node.type;
      const relimage = document.createElement("img");
      relimage.src = el.node.coverImage.large;
      relimage.width = "230";
      relimage.height = "320";
      var reldiv = document.getElementById("relations");
      const ContentDiv = document.createElement("div");
      ContentDiv.style.margin = "10px";
      reltxt.className = "hovercap";

      ContentDiv.appendChild(relimage);
      ContentDiv.appendChild(reltxt);
      ContentDiv.className = "hoverwrap";
      reldiv.appendChild(ContentDiv);
    });
    //rankings
    var tmp = language["ranking"]+": ";
    result["info"]["rankings"].forEach((el) => {
      tmp += " / " + el.context;
    });
    document.getElementById("rankings").innerHTML = tmp;
    //popularity
    document.getElementById("popu").innerHTML =
      language["popularity"]+": " + result["info"]["popularity"];
    //Start date
    document.getElementById("startdate").innerHTML =
      language["starting_date"]+": " +
      result["info"]["startDate"].day +
      "/" +
      result["info"]["startDate"].month +
      "/" +
      result["info"]["startDate"].year;
    //status
    document.getElementById("status").innerHTML =
      language["status"]+": " + result["info"]["status"];
    //Type
    document.getElementById("type").innerHTML =
      language["type"]+": " + result["info"]["type"];
    //Trending
    document.getElementById("trending").innerHTML =
      language["trending"]+": " + result["info"]["trending"];
    //Volumes
    document.getElementById("volume").innerHTML =
      language["volumes"]+": " + result["info"]["volumes"];

    //Link Title
    document.getElementById("link").innerHTML = language["see_more_on"]+" Anilist.co";
    //Website URL
    document.getElementById("link").href = "#";
    document
      .getElementById("link")
      .setAttribute(
        "onclick",
        "shell.openExternal('" + result["info"]["siteUrl"] + "')"
      );
    //bannerImg
    document.getElementById("bgimage").style.backgroundImage =
      "url(" + result["info"]["coverImage"].extraLarge + ")";
  } else {
    //if not a manga then it's maybe a Comics so let's search for it
    Toastifycation(language["searching_for_comics"], "#292929");
    Comics(name, n);
  }
}

//This is for getting the Mounth from a string in a Date object format
function getMonthFromString(mon) {
  return new Date(Date.parse(mon + " 1, 2012")).getMonth() + 1;
}

//Getting informations about a comics (leagueofcomicsleague.com)
function Comics(name, n) {
  CG.fetchSearchResults(name)
    .then((result) => {
      //deleting older elements
      var child = document.getElementById("selectAnother").lastElementChild;
      while (child) {
        document.getElementById("selectAnother").removeChild(child);
        child = document.getElementById("selectAnother").lastElementChild;
      }
      //creating the select tag list
      for (var i = 0; i < result.length; i++) {
        const opt = document.createElement("option");
        if (i == n) {
          opt.setAttribute("selected", "");
        }
        opt.value = i;
        opt.innerHTML = result[i]["name"];
        document.getElementById("selectAnother").appendChild(opt);
      }

      //getting the date
      var date = result[n]["date"];
      var day = parseInt(
        date.split(" ")[1].split(",")[0].replace("th", "").replaceAll(" ", "")
      );
      var month = date.split(" ")[0].replaceAll(" ", "");
      month = getMonthFromString(month) - 1;
      var year = parseInt(date.split(" ")[2].replaceAll(" ", ""));
      date = new Date(year, month, day);

      //fetching release by date
      CG.fetchReleases(date, {
        publishers: [result[n]["publisher"]],
      })
        .then((resulta) => {
          //Search if the comics you are looking for is in the list
          for (var i = 0; i < resulta.length; i++) {
            if (resulta[i]["name"] === result[n]["name"]) {
              //When the comic is found
              Toastifycation(language["found"], "#00C33C");

              document.getElementById("cover").src = resulta[i]["cover"];
              document.getElementById("Title").innerHTML = resulta[i]["name"];
              document.getElementById("description").innerHTML =
                resulta[i]["description"];
              document.getElementById("publisher").innerHTML =
                language["publisher"]+": " + resulta[i]["publisher"];
              document.getElementById("startdate").innerHTML =
                language["published_the"]+": " + day + "/" + month + "/" + year;
              document.getElementById("rating").innerHTML =
                language["rating"]+": " + resulta[i]["rating"];
              document.getElementById("link").innerHTML =
                language["see_more_on"]+" LeagueOfComicGeek.com";
              document.getElementById("link").href = "#";
              document
                .getElementById("link")
                .setAttribute(
                  "onclick",
                  "shell.openExternal('" + resulta[i]["url"] + "')"
                );
              document.getElementById("bgimage").style.backgroundImage =
                "url(" + resulta[i]["cover"] + ")";
              document.getElementById("iframeID").src = resulta[i]["url"];
            }
          }
        })
        .catch(function () {
          Toastifycation(language["not_found"], "#ff0000");
        });
    })
    .catch(function () {
      Toastifycation(language["not_found"], "#ff0000");
    });
}

//Start the search
Manga(name_ID, 0);

//Select another book
function selectAnother() {
  var test = document.querySelector("#selectAnother").selectedIndex;
  Toastifycation(language["fetching_metadata"], "#292929");
  Manga(name_ID, test);
}

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

//Set Languages for other elements
document.getElementById("Title").innerHTML = language["fetching_metadata"];
document.getElementById("id_warning_title").innerHTML = language["get_help"];
document.getElementById("id_warning_text").innerHTML = language["warning"];
document.getElementById("id_warning_full_text").innerHTML =
  language["warning_text"];
document.getElementById("id_issues").innerHTML = language["issues"];
document.getElementById("id_issues_text").innerHTML = language["issues_txt"];
document.getElementById("id_not_what_you_wanted").innerHTML =
  language["not_what_you_wanted"];
document.getElementById("close_gethelp").innerHTML = language["close"];
new bootstrap.Tooltip(document.getElementById("warning_btn"), {
  title: language["warning"],
  placement: "bottom",
});
new bootstrap.Tooltip(document.getElementById("goback_id"), {
  title: language["go_back"],
  placement: "bottom",
});
