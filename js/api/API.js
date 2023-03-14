class API {
    /**
     * Trigger the metadata refresh for the selected library
     * @param elElement The library to refresh
     */
    refreshMetadata(elElement) {
        let path = elElement["PATH"];
        DetectFolderInLibrary(path).then(async function (data) {
            data = JSON.parse(data);
            await getFromDB("Series", "ID_Series,PATH FROM Series").then(async (res) => {
                res = JSON.parse(res);
                for (let index = 0; index < res.length; index++) {
                    let el = res[index]["PATH"];
                    for (let i = 0; i < data.length; i++) {
                        if (el === data[i]) {
                            await this.refreshMeta(res[index]["ID_Series"], elElement["API_ID"], "Series");
                            break;
                        }
                    }
                }
            });
        })
    }
    /**
     * Rematch the element of old_id by the new_id
     * @param {string} new_id New id
     * @param {int} provider The API provider
     * @param {string} type The type of the element
     * @param {string} old_id The old id
     * @param {boolean} isSeries Is the element a series
     */
    async rematch(new_id, provider, type, old_id, isSeries = false) {
        if (isSeries) {
            await fetch(PDP + "/DB/update", {
                method: "POST", headers: {
                    "Content-Type": "application/json"
                }, body: JSON.stringify({
                    "token": currentProfile.getToken,
                    "table": "Series",
                    "type": "noedit",
                    "column": "ID_Series",
                    "whereEl": old_id,
                    "value": `'${new_id}'`,
                    "where": "ID_Series"
                }, null, 2)
            })
        } else {
            await fetch(PDP + "/DB/update", {
                method: "POST", headers: {
                    "Content-Type": "application/json"
                }, body: JSON.stringify({
                    "token": currentProfile.getToken,
                    "table": "Books",
                    "type": "noedit",
                    "column": "API_ID",
                    "whereEl": old_id,
                    "value": `'${new_id}'`,
                    "where": "ID_book"
                }, null, 2)
            })
        }
        await this.refreshMeta(new_id, provider, type);
    }

    /**API_ID
     * Launch the metadata refresh
     * @param {*} id The ID in the DB of the element to refresh
     * @param {int} provider The provider of the element to refresh
     * @param {string} type The type of the element to refresh
     */
    async refreshMeta(id, provider, type) {
        console.log("Refreshing metadata for " + id + " from " + provider + " (" + type + ")");
        Toastifycation("Refreshing metadata...");
        fetch(PDP + "/refreshMeta", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "id": id,
                "provider": provider,
                "type": type,
                "token": currentProfile.getToken
            })
        }).then((res) => {
            Toastifycation("Metadata updated");
        })
    }
}