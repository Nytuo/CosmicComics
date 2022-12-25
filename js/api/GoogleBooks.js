class GoogleBooks {
    async InsertBook(name = "", path) {
        return fetch("http://" + domain + ":" + port + "/insert/googlebooks/book/", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                "name": name,
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

    async GetComics(name = "") {
        name = encodeURIComponent(name);
        return fetch("http://" + domain + ":" + port + "/api/googlebooks/getComics/" + name).then(function (response) {
            return response.text();
        }).then(function (data) {
            data = JSON.parse(data);
            return data;
        }).catch(function (error) {
            console.log(error);
        });
    }
}