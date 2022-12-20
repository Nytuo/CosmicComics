class Marvel {
    constructor() {

    }
    async SearchComic(name = "", date = "") {
        return fetch("http://" + domain + ":" + port + "/api/marvel/searchonly/" + name + "/" + date).then(function (response) {
            return response.text();
        }).then(function (data) {
            console.log(data);
            data = JSON.parse(data);
            return data;
        }).catch(function (error) {
            console.log(error);
        });
    }

    async GetComics(name = "", date = "") {
        name = encodeURIComponent(name);
        date = encodeURIComponent(date);
        return fetch("http://" + domain + ":" + port + "/api/marvel/getComics/" + name + "/" + date).then(function (response) {
            return response.text();
        }).then(function (data) {
            data = JSON.parse(data);
            return data;
        }).catch(function (error) {
            console.log(error);
        });
    }

    async InsertBook(name = "", date = "", path) {
        return fetch("http://" + domain + ":" + port + "/insert/marvel/book/", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                "name": name,
                "datea": date,
                "path": path,
                "token": currentProfile.getToken
            }
        }).then(function (response) {
            return response.text();
        }).then(function (data) {
            console.log(data);
            data = JSON.parse(data);
            return data;
        }).catch(function (error) {
            console.log(error);
        });
    }
    InsertSeries(name = "", path) {
    fetch('http://' + domain + ":" + port + '/api/marvel/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "token": currentProfile.getToken,
            "name": name,
            "path": path,
        })
    }).then(function (response) {
        Toastifycation("Marvel API : " + response.status);
    })
}
}