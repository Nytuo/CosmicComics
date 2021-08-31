/*This file is part of Cosmic-comics.

Cosmic-Comics is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Cosmic-Comics is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Cosmic-Comics.  If not, see <https://www.gnu.org/licenses/>.*/
const { remote } = require("electron"); // Importing remote from Electron
const getWindow = () => remote.BrowserWindow.getFocusedWindow(); // Get the current window

//Closing the window
function closeWindow() {
  getWindow().close();
}

//Minimize the window
function minimizeWindow() {
  getWindow().minimize();
}

//Maximize the window or Unmaximize it
function maximizeWindow() {
  const window = getWindow();
  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
}
