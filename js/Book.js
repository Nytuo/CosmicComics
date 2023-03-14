//create class Book
class Book {
  constructor(ID,title,cover,description,staff,characters,urls,note,read,reading,unread,favorite,last_page,folder,path,issueNumber,format,pageCount,series,prices,dates,collectedIssues,collections,variants,lock) {
    this._ID = ID;
    this._title = title;
    this._cover = cover;
    this._description = description;
    this._staff = staff;
    this._characters = characters;
    this._urls = urls;
    this._note = note;
    this._read = read;
    this._reading = reading;
    this._unread = unread;
    this._favorite = favorite;
    this._last_page = last_page;
    this._folder = folder;
    this._path = path;
    this._issueNumber = issueNumber;
    this._format = format;
    this._pageCount = pageCount;
    this._series = series;
    this._prices = prices;
    this._dates = dates;
    this._collectedIssues = collectedIssues;
    this._collections = collections;
    this._variants = variants;
    this._lock = lock;
  }


  get ID() {
    return this._ID;
  }

  set ID(value) {
    this._ID = value;
  }

  get title() {
    return this._title;
  }

  set title(value) {
    this._title = value;
  }

  get cover() {
    return this._cover;
  }

  set cover(value) {
    this._cover = value;
  }

  get description() {
    return this._description;
  }

  set description(value) {
    this._description = value;
  }

  get staff() {
    return this._staff;
  }

  set staff(value) {
    this._staff = value;
  }

  get characters() {
    return this._characters;
  }

  set characters(value) {
    this._characters = value;
  }

  get urls() {
    return this._urls;
  }

  set urls(value) {
    this._urls = value;
  }

  get note() {
    return this._note;
  }

  set note(value) {
    this._note = value;
  }

  get read() {
    return this._read;
  }

  set read(value) {
    this._read = value;
  }

  get reading() {
    return this._reading;
  }

  set reading(value) {
    this._reading = value;
  }

  get unread() {
    return this._unread;
  }

  set unread(value) {
    this._unread = value;
  }

  get favorite() {
    return this._favorite;
  }

  set favorite(value) {
    this._favorite = value;
  }

  get last_page() {
    return this._last_page;
  }

  set last_page(value) {
    this._last_page = value;
  }

  get folder() {
    return this._folder;
  }

  set folder(value) {
    this._folder = value;
  }

  get path() {
    return this._path;
  }

  set path(value) {
    this._path = value;
  }

  get issueNumber() {
    return this._issueNumber;
  }

  set issueNumber(value) {
    this._issueNumber = value;
  }

  get format() {
    return this._format;
  }

  set format(value) {
    this._format = value;
  }

  get pageCount() {
    return this._pageCount;
  }

  set pageCount(value) {
    this._pageCount = value;
  }

  get series() {
    return this._series;
  }

  set series(value) {
    this._series = value;
  }

  get prices() {
    return this._prices;
  }

  set prices(value) {
    this._prices = value;
  }

  get dates() {
    return this._dates;
  }

  set dates(value) {
    this._dates = value;
  }

  get collectedIssues() {
    return this._collectedIssues;
  }

  set collectedIssues(value) {
    this._collectedIssues = value;
  }

  get collections() {
    return this._collections;
  }

  set collections(value) {
    this._collections = value;
  }

  get variants() {
    return this._variants;
  }

  set variants(value) {
    this._variants = value;
  }

  get lock() {
    return this._lock;
  }

  set lock(value) {
    this._lock = value;
  }

  get book() {
    return {
        ID_book: this._ID,
        NOM: this._title,
        URLCover: this._cover,
        description: this._description,
        staff: this._staff,
        characters: this._characters,
        URLs: this._urls,
        note: this._note,
        read: this._read,
        reading: this._reading,
        unread: this._unread,
        favorite: this._favorite,
        last_page: this._last_page,
        folder: this._folder,
        PATH: this._path,
        issueNumber: this._issueNumber,
        format: this._format,
        pageCount: this._pageCount,
        series: this._series,
        prices: this._prices,
        dates: this._dates,
        collectedIssues: this._collectedIssues,
        collections: this._collections,
        variants: this._variants,
        lock: this._lock
    }
  }

  /**
   * Download a book from the server
   * @param path the path of the book
   * @return {Promise<void>} the promise
   */
  async downloadBook(path) {
    const option = {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
        path: path
      }, null, 2)
    };
    console.log(option);
    await fetch(PDP + '/DL', option).then(() => {
      window.open(PDP + "/getDLBook", "_blank");
    });
  }
}