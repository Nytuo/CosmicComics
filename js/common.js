const url = document.createElement("a");
url.setAttribute("href", window.location.href);
let domain = url.hostname;
let port = url.port;
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