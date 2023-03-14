const url = document.createElement("a");
url.setAttribute("href", window.location.href);
let domain = url.hostname;
let port = url.port;
let isHttps = url.protocol === "https:";
let protocol = isHttps ? "https://" : "http://";

/**
 * The protocol, domain and port using in the app
 * @type {string} The protocol, domain and port using in the app
 */
const PDP = protocol + domain + (port ? ":" + port : "");

let currentProfile = new Profile(getCookie("selectedProfile"));

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