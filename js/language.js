
var keys = Object.keys(thelanguage);
let language = keys.includes(getCookie("lang")) === true ? thelanguage[getCookie("lang")]: thelanguage["en"];
console.log(language);