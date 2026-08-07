# Tamanna Desktop App

Native desktop application built with [Tauri](https://tauri.app/) wrapping the Tamanna voice assistant.

## Architecture

```
desktop-app/
├── package.json            # Node dependencies (Tauri CLI)
├── src-tauri/
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # Tauri configuration
│   ├── build.rs            # Rust build script
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Main app logic + tray
│   ├── capabilities/       # Permission configs
│   └── icons/              # App icons
```

## Features

- **Native Window**: Custom-sized window (480×800, like a mobile app)
- **System Tray**: Tray icon with Open/Quit menu
- **Theme Integration**: Respects system dark/light mode
- **Lightweight**: < 10MB binary, minimal memory usage
- **Auto-updater Ready**: Built-in updater support (disabled by default)

## Prerequisites

- **Rust** (stable toolchain): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** dependencies: `cd desktop-app && npm install`
- **Parent Next.js app** must be built: `cd .. && bun run build`

## Development

```bash
# From the project root
cd desktop-app
npm install

# Run in dev mode (connects to Next.js dev server on localhost:3000)
npm run tauri:dev
```

## Building

```bash
# macOS
npm run tauri:build:mac

# Windows
npm run tauri:build:win

# Linux
npm run tauri:build
```

Output binaries are in `src-tauri/target/release/bundle/`.

## Configuration

Key settings in `src-tauri/tauri.conf.json`:

| Setting | Value | Description |
|---------|-------|-------------|
| `windows.width` | 480 | Window width |
| `windows.height` | 800 | Window height |
| `windows.minWidth` | 380 | Minimum width |
| `windows.center` | true | Center on screen |
| `bundle.targets` | nsis, app, dmg | Build targets |

## Troubleshooting

**Build fails with "font not found"**: Install system fonts or update `tauri.conf.json`
**Window too small**: Adjust `windows.width`/`windows.height` in `tauri.conf.json`
**Gateway not reachable**: Ensure the Tamanna gateway is running on port 3003
