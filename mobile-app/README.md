# Tamanna Mobile App

Native iOS and Android application built with [Capacitor](https://capacitorjs.com/) wrapping the Tamanna voice assistant PWA.

## Architecture

```
mobile-app/
├── package.json               # Node dependencies (Capacitor)
├── capacitor.config.json      # Capacitor configuration
├── android/                    # Android project (generated)
└── ios/                        # iOS project (generated)
```

## Features

- **Native Status Bar**: Light style with brand color background
- **Splash Screen**: Branded splash with spinner (2s duration)
- **Portrait Lock**: Forces portrait orientation
- **Keyboard Handling**: Proper keyboard avoid handling
- **Safe Areas**: Automatic content inset for notch/home indicator
- **Haptic Feedback**: Native haptic feedback support
- **Share Extension**: Share content to Tamanna from other apps

## Prerequisites

- **Node.js**: v18+
- **Android Studio** (for Android builds)
- **Xcode 15+** (for iOS builds, macOS only)
- **Parent Next.js app** must be built first

## Setup

```bash
cd mobile-app
npm install

# Add platforms
npx cap add android
npx cap add ios

# Build the Next.js app and sync
npm run build:mobile
```

## Development

### Android
```bash
# Open in Android Studio
npm run cap:open:android
```

### iOS
```bash
# Open in Xcode
npm run cap:open:ios
```

## Building

### Android (APK)
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS (IPA)
```bash
# Use Xcode → Product → Archive → Distribute App
npm run cap:open:ios
```

## Customizing

### Splash Screen
Replace the splash images in:
- Android: `android/app/src/main/res/drawable/splash.png`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

### App Icon
Replace the icon files in:
- Android: `android/app/src/main/res/mipmap-*`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Status Bar Color
Edit `capacitor.config.json` → `plugins.StatusBar.backgroundColor`

## Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `appId` | `ai.tamanna.voiceassistant` | Bundle identifier |
| `plugins.SplashScreen.launchShowDuration` | 2000 | Splash duration (ms) |
| `plugins.SplashScreen.backgroundColor` | `#faf8ff` | Splash background |
| `plugins.StatusBar.style` | `LIGHT` | Status bar text color |
| `plugins.ScreenOrientation.default` | `portrait` | Lock orientation |

## Troubleshooting

**Build fails**: Ensure the parent Next.js app is built (`cd .. && bun run build`)
**White screen**: Check the `webDir` in `capacitor.config.json` points to the correct build output
**Keyboard overlapping input**: The `resize` plugin handles this — ensure `@capacitor/keyboard` is installed
