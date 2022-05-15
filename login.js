window.scroll(0, 0);
const profilesDiv = document.getElementById("login_discover")
const url = document.createElement("a");
url.setAttribute("href", window.location.href);
var domain = url.hostname;
var port = url.port;
fetch("http://" + domain + ":" + port + "/profile/discover").then(function (response) {
    return response.text();
}).then(async function (data) {
        data = JSON.parse(data);
        for (let i = 0; i < data.length; i++) {
            let profile = data[i];
            let profileDiv = document.createElement("div");
            let profileName = document.createElement("h3");
            let profileImage = document.createElement("img");
            profileImage.setAttribute("src", profile.image);
            profileImage.className = "profile_image";
            profileName.innerHTML = profile.name;
            profileDiv.appendChild(profileImage);
            profileDiv.appendChild(profileName);
            profileDiv.className = "login_elements";
            if (profile.passcode == true) {
                profileDiv.addEventListener("click", function () {
                    document.getElementById("id_log").innerText = "Login for : "+profile.name;
                    var myModal = new bootstrap.Modal(document.getElementById('passcode'), {
                        keyboard: false
                    })
                    var modalToggle = document.getElementById('passcode') // relatedTarget
                    myModal.show(modalToggle)

                    document.getElementById("loginInBtn").addEventListener("click", async function () {
                        await fetch("http://" + domain + ":" + port + "/profile/login/" + profile.name + "/" + document.getElementById("ThePassToWord").value).then(function (response) {
                            return response.text();
                        }).then(function (data) {
                            if (data == "false") {
                                alert("Wrong passcode");

                            } else {
                                setCookie('selectedProfile', data, 2);
                                setCookie('selectedProfileName', profile.name, 2);
                                window.location.href = "/";
                            }
                        });
                    });
                });

            } else {
                profileDiv.addEventListener("click", function () {
                    setCookie('selectedProfile', profile.name, 2);
                    setCookie('selectedProfileName', profile.name, 2);

                    window.location.href = "/";

                })
            }
            profilesDiv.appendChild(profileDiv);
        }

    }
).catch(function (error) {
    console.log(error);
})

// Set a Cookie
function setCookie(cName, cValue, expHours) {
    let date = new Date();
    date.setTime(date.getTime() + (expHours * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = cName + "=" + cValue + "; " + expires + "; path=/";
}
