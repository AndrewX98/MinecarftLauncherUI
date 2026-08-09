# Linux Minecraft Launcher

An Electron launcher for **Minecraft: Bedrock Edition** on Linux. It downloads the
game directly from the Google Play Store using a Google account, extracts the APK,
and runs it through `mcpelauncher-client`.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Google account sign-in** — embedded Google login flow, session persisted locally.
- **Live Play Store version list** — the version dropdown is populated from the real
  `appInfo` for `com.mojang.minecraftpe` (not a hardcoded list).
- **Direct APK download** — downloads the base APK plus split/config APKs from Google's
  delivery API with progress reporting (bytes / percent).
- **Automatic extraction** — base APK is unpacked after download; the button turns into
  **PLAY** once installed.
- **Launch** — runs `bin/mcpelauncher-client -dg <extracted> -dd <data dir>` and streams
  the game's stdout/stderr to a live **Log** page.
- **Mods** — fetch mods from a GitHub mod database, download, extract, and manage them;
  installed state is read from disk (`.so` files in the mods folder).
- **News** — recent Minecraft news pulled from minecraft.net.
- **Clear Download Cache** — wipes downloaded APKs and extracted game dirs.

## Getting Started

### Prerequisites

- Linux x86-64
- Node.js and npm
- Google account that **owns Minecraft** (must be purchased). The Play delivery API
  returns `status=3` for unowned/paid apps, so signing in with an account that owns
  Minecraft on the Play Store or a ChromeOS license is required.

### Install

```sh
npm install
```

Build the native C++ addon (vendors `playapi` and a libzip-based extractor):

```sh
npm run build:native
```

> This produces `native/build/launcher.node`. The build needs `libzip-dev` on the
> system (`build.sh` links against `-lzip`).

Drop the `mcpelauncher-client` binary into `bin/`:

```sh
mkdir -p bin
# copy your existing mcpelauncher-client build here, e.g.:
#   cp ~/path/to/mcpelauncher-client bin/
```

### Run

```sh
npm start
```

1. **Sign in** with the Google account that owns Minecraft.
2. Click **DOWNLOAD**. The launcher fetches `com.mojang.minecraftpe` from Play Store,
   downloads the base + split APKs, and extracts them.
3. The button becomes **PLAY**. Click it to launch the game through `mcpelauncher-client`
   and watch the output on the **Log** page.

## Data locations

| What                          | Where                                      |
| ----------------------------- | ------------------------------------------ |
| Download cache (APKs, extracts) | `~/.local/share/mcpelauncher/`            |
| Mods                          | `~/.local/share/mcpelauncher/mods/`       |
| Login tokens                  | `~/.local/share/mcpelauncher/gplay.*`     |

Opening the **Folder** page reveals these in your file manager.

## Troubleshooting

- **"Download failed: status 3"** — the account isn't entitled to the app (not purchased).
  Sign in with an account that owns Minecraft.
- **Game log shows `Failed to load libminecraftpe.so`** — the package downloaded wasn't a
  valid Minecraft APK (the pipeline was previously tested with `com.google.android.gm`).
  Only Minecraft produces a runnable extraction.
- **Native addon missing** — rebuild with `npm run build:native`; Play features are
  unavailable without it.

## Project layout

```
index.html      UI shell
style.css       styles
main.js         Electron main process: IPC, game launch, mods, login
preload.js      contextBridge API (`window.launcher`)
js/             renderer modules (play, versions, mods, news, settings, logs, auth, ...)
native/         C++ N-API addon: playapi (Play Store API), libzip extraction, build.sh
bin/            mcpelauncher-client (git-ignored)
```

## License

MIT — see [LICENSE](LICENSE).