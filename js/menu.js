const getWindow = () => remote.BrowserWindow.getFocusedWindow();
function closeWindow() {
  getWindow().close();
}

function minimizeWindow() {
  getWindow().minimize();
}

function maximizeWindow() {
  const window = getWindow();
  if (window.isMaximized()) {
    window.unmaximize();
    document.getElementById("maximize").innerHTML =
      "<i class='material-icons'>fullscreen</i>";
  } else {
    window.maximize();
    document.getElementById("maximize").innerHTML =
      "<i class='material-icons'>fullscreen_exit</i>";
  }
}
