# Build for Flatpak

This is a minimal, opinionated guide to build the project as a Flatpak. Run these steps from the repository root (use WSL/Ubuntu on Windows).

1) Install system dependencies (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install flatpak flatpak-builder
```

2) Create and activate a Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3) Install helper Python packages and generate sources:

```bash
pip install aiohttp toml tomlkit
pip install "git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node"
curl -O https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/cargo/flatpak-cargo-generator.py
python3 flatpak-cargo-generator.py src/src-tauri/Cargo.lock -o cargo-sources.json
python3 -m flatpak_node_generator npm src/package-lock.json -o node-sources.json
```

4) Install required Flatpak SDKs (once):

```bash
flatpak install flathub org.gnome.Sdk//47 org.gnome.Platform//47
flatpak install flathub org.freedesktop.Sdk.Extension.rust-stable//24.08
flatpak install flathub org.freedesktop.Sdk.Extension.node20//24.08
flatpak install flathub org.freedesktop.Sdk.Extension.llvm18//24.08
```

5) Build and install the Flatpak locally (from project root):

```bash
flatpak-builder --force-clean --user --install build-dir fr.nytuo.cosmiccomics.yml
```

Notes:
- If you're on Windows, run these commands inside WSL2/Ubuntu or a Linux environment.