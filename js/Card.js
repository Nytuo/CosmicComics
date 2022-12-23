class Card {

    constructor(unread,read,reading,ID,URLCover="",Name="",favorite) {
        this._unread = unread;
        this._read = read;
        this._reading = reading;
        this._ID = ID;
        this._URLCover = URLCover;
        this._Name = Name;
        this._favorite = favorite;
        const carddiv = document.createElement("div");
        carddiv.style.cursor = "pointer";
        const rib = document.createElement("div");
        if (this._URLCover === "null" || this._URLCover === "" || this._URLCover == null) {
            this._URLCover = "Images/fileDefault.webp";
        } else if (this._URLCover.includes("public/FirstImagesOfAll")) {
            this._URLCover = this._URLCover.split("public/")[1];
        }
        let node = document.createTextNode(this._Name);
        if (this._unread !== null && this._read !== null && this._reading !== null) {
            if (this._unread === 1 || this._unread === "true") {
                rib.className = "pointR";
            }
            if (this._reading === 1 || this._reading === "true") {
                rib.className = "pointY";
            }
            if (this._favorite === 1 || this._favorite === "true") {
                rib.innerHTML = "<i class='material-icons' style='font-size: 16px;position: relative;left: -17px;'>favorite</i>";
            }
        }
        carddiv.className = "cardcusto";
        carddiv.setAttribute("data-effect", "zoom");
        const buttonfav = document.createElement("button");
        buttonfav.className = "card__save js-fav";
        buttonfav.type = "button";
        buttonfav.addEventListener("click", function () {
            favorite();
        });
        buttonfav.id = "btn_id_fav_" + this._ID + "_" + Math.random() * 8000;
        const favicon = document.createElement("i");
        favicon.className = "material-icons";
        favicon.innerHTML = "favorite";
        if (currenttheme > 1) buttonfav.className = "js-fav card__save" + theme_button_card;
        buttonfav.appendChild(favicon);
        carddiv.appendChild(buttonfav);
        const button_unread = document.createElement("button");
        button_unread.className = "card__close js-unread";
        button_unread.type = "button";
        button_unread.addEventListener("click", function () {
            markasunread();
        });
        button_unread.id = "btn_id_unread_" + this._ID + "_" + Math.random() * 8000;
        const unread_icon = document.createElement("i");
        unread_icon.className = "material-icons";
        unread_icon.innerHTML = "close";
        if (currenttheme > 1) button_unread.className = "js-unread card__close" + theme_button_card;
        button_unread.appendChild(unread_icon);
        carddiv.appendChild(button_unread);
        const button_reading = document.createElement("button");
        button_reading.className = "card__reading js-reading";
        button_reading.type = "button";
        button_reading.addEventListener("click", function () {
            AllForOne("unread", "read", "reading", this._ID);
        });
        button_reading.id = "btn_id_reading_" + this._ID + "_" + Math.floor(Math.random() * 8000);
        const reading_icon = document.createElement("i");
        reading_icon.className = "material-icons";
        reading_icon.innerHTML = "auto_stories";
        if (currenttheme > 1) button_reading.className = "js-reading card__reading" + theme_button_card;
        button_reading.appendChild(reading_icon);
        carddiv.appendChild(button_reading);
        const button_read = document.createElement("button");
        button_read.className = "card__read js-read";
        button_read.type = "button";
        button_read.addEventListener("click", function () {
            markasread();
        });
        button_read.id = "btn_id_read_" + this._ID + "_" + Math.floor(Math.random() * 8000);
        const read_ion = document.createElement("i");
        read_ion.className = "material-icons";
        read_ion.innerHTML = "done";
        if (currenttheme > 1) button_read.className = "js-read card__read" + theme_button_card;
        button_read.appendChild(read_ion);
        carddiv.appendChild(button_read);
        const cardimage = document.createElement("div");
        cardimage.className = "card__image";
        cardimage.style.backgroundColor = theme_BG_CI;
        const imgcard = document.createElement("img");
        imgcard.style.width = "100%";
        imgcard.id = "card_img_id_" + this._ID;
        imgcard.src = this._URLCover;
        cardimage.appendChild(imgcard);
        carddiv.appendChild(cardimage);
        const bodycard = document.createElement("div");
        bodycard.className = "card__body";
        const playbtn = document.createElement("button");
        playbtn.className = "card__play js-play";
        playbtn.type = "button";
        const playarr = document.createElement("i");
        playarr.className = "material-icons";
        playarr.innerHTML = "play_arrow";
        playarr.style.color = theme_button_card;
        playbtn.appendChild(playarr);
        bodycard.appendChild(playbtn);
        const pcard_bio = document.createElement("p");
        pcard_bio.className = "card__bio";
        pcard_bio.style.textAlign = "center";
        pcard_bio.style.color = theme_FG;
        pcard_bio.innerHTML = node.textContent;
        bodycard.appendChild(pcard_bio);
        carddiv.appendChild(bodycard);
        carddiv.id = "id_vol" + this._ID + "_" + Math.floor(Math.random() * 8000);
        carddiv.appendChild(rib);
        this._card =  carddiv;
    }

    get card() {
        return this._card;
    }

    addPlayButtonListener() {
        this._card.querySelector(".card__play").addEventListener("click", function () {
            AllForOne("unread", "read", "reading", this._ID);
            let encoded = encodeURIComponent(path.replaceAll("/", "%C3%B9"));
            window.location.href = "viewer.html?" + encoded;
        });

    }
}