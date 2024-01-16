# How to do reminder
> [!WARNING]
> This should be done in Linux

Install flatpak and flatpak-builder
Also needed : Python and pipx (python-pipx on arch)

clone this : ```https://github.com/flatpak/flatpak-builder-tools/tree/master/node```

Do ```pipx install .```

Install
```flatpak install flathub org.electronjs.Electron2.BaseApp//23.08``` and 
```flatpak install flathub org.freedesktop.Sdk.Extension.node18//23.08```

In the root dir run : ```npm i --package-lock-only```
then ```(python3) flatpak-node-generator(.py) npm package-lock.json```
The python3 and .py may are not needed depending on the install method.

This generate a 'generated-sources.json' that you need to move to the flatpak folder

Now run
```flatpak-builder build fr.nytuo.cosmiccomics.yml --install --force-clean --user```

And finally to run, debug and test :

```flatpak run fr.nytuo.cosmiccomics```