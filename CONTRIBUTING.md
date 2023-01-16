# Contributing Guide

Welcome, interested person! Contributions are welcome. If you're ever unsure, feel free to open an issue.

Preferably, features are developed in another branch or fork. After the feature is ready, a pull request to the master branch should be opened.

## Prerequisites

- [Install the Tauri prerequesites for your system](https://tauri.app/v1/guides/getting-started/prerequisites)
- [Node 18 or greater](https://nodejs.org/en/). Don't install Chocolatey.
- A code editor (see below)

## Setup

1. Fork the repository
2. Clone your fork
3. `npm install`
4. `npm run tauri dev`

Note that it may take well over a minute the first time you try this out

### Install youtube-dl

Install youtube-dl using the following commands on Windows or macOS

```sh
curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
chmod a+rx /usr/local/bin/youtube-dl
```

Or on Linux

```sh
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl
```

For further information, check their [documentation](http://ytdl-org.github.io/youtube-dl/download.html).

## Recommended Tooling

I recommend using [Visual Studio Code](https://code.visualstudio.com/) with

- [Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) to format your files
- Settings &rarr; Format On Save &rarr; Enable (`"editor.formatOnSave": true,`)
  - If you are using autosave: Settings &rarr; Autosave &rarr; On Focus Change (`"files.autoSave": "onFocusChange",`)
- [Vue Language Features (Volar) Extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar) for Vue.js
- [TypeScript Vue Plugin (Volar) Extension](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) for Vue.js. Take-over mode is _not_ recommended, so just get this plugin.
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [Rust Analyzer Extension](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [(optional)Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) to see all the errors inline with the code
- [(optional)TODO Highlight Extension](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight)

As for settings, I personally am a fan of those "inlay hints".

## Used Libraries

The most important ones are

- [Tauri](https://tauri.app/)
- [Typescript](https://www.typescriptlang.org/) - Typesafe Javascript
- [Vue 3](https://github.com/vuejs/vue-next/) - Vue 3 with [the composition API](https://vuejs.org/guide/extras/composition-api-faq.html#what-is-composition-api)

## Unit Testing

Unit testing the frontend is currently not being done, due to the lacking quality of the code and the relative difficulty of unit testing Typescript and GUIs. (Using Vitest is potentially the easiest approach.)

Unit tests for the Rust part should be added, especially for non-trivial functions.

## Structure of code

We're using the default Tauri file structure. Essentially `src-tauri` contains the Rust part of the project, while `src` contains the frontend part of the project.

## Publishing a release

Build the project using

- `npm run tauri build`

When publishing a new release, don't forget to

- Update the version in `tauri.conf.json`
- Update the version in `src-tauri/Cargo.toml`
- Add a `src/store.ts` migration
- Create a new tag with the version number
- Wait for the expensive GitHub action and then publish the created release
- Update https://github.com/stefnotch/downline/tree/gh-pages
