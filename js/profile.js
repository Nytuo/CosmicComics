class Profile {

    constructor(token) {
        this._token = token;
        this._name = "Unknown";
        this._pp = PDP+ "/profile/getPP/" + this._token;

    }

    /**
     * Create an account on the server
     */
    async createAccount() {
        let accountsNames = [];
        fetch(PDP + "/profile/discover").then(function (response) {
            return response.text();
        }).then(async function (data) {
            data = JSON.parse(data);
            data.forEach(function (item) {
                accountsNames.push(item.name.toLowerCase());
            });
        });
        if (!accountsNames.includes(document.getElementById("usernameManager").value.toLowerCase())) {
            const option = {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
                    "token": this._token,
                    "name": document.getElementById("usernameManager").value,
                    "password": document.getElementById("passwordManager").value,
                    "pp": document.getElementById("newImage").src
                }, null, 2)
            };
            fetch(PDP + "/createUser", option).then(() => {
                console.log("account created !");
            });
            Toastifycation("The user is created", "#00C33C");
            document.getElementById("close_mna").click();
        } else {
            Toastifycation("This username is already used. User creation aborted", "#ff0000");
        }
    }
    /**
     * Delete the account
     */
    async DeleteAccount() {
        const option = {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
                "token": this._token
            }, null, 2)
        };
        fetch(PDP+ "/profile/deleteAccount", option).then(() => {
            Toastifycation("Account deleted", "#00C33C");
        }).catch((err) => {
            Toastifycation("Account not deleted", "#ff0000");
        });
        window.location.href = 'login';
    }
    /**
     * Download the database
     */
    DownloadBDD() {
        window.open(PDP + "/profile/DLBDD/" + this._token);
    }

    /**
     * Modify the account
     * @param {{form: (*|HTMLElement)[]}} forma The form to get the data (The HTML element)
     */
    async modifyAccount(forma) {
        let form = forma.form;
        let nuser = form[0];
        let npass = form[1];
        let npp = form[2];
        if (forma.form[0] === "") {
            nuser = null;
        }
        if (forma.form[1] === "") {
            npass = null;
        }
        if (forma.form[2].length === 0 && forma.form[3] == null) {
            npp = null;
        }
        const options = {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
                "nuser": nuser, "npass": npass, "npp": npp.src, "token": this._token
            }, null, 2)
        };
        await fetch("/profile/modification", options);
    }

    set setName(name) {
        this._name = name;
    }

    get getName() {
        return this._name;
    }

    set setPP(pp) {
        this._pp = pp;
    }

    get getPP() {
        return this._pp;
    }

    get getToken() {
        return this._token;
    }
}