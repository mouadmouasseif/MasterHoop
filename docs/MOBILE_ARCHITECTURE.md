# Mobile Architecture

## Options

- PWA: fastest path, already compatible with the current React/Vite app.
- Capacitor: preferred native wrapper candidate for camera, notifications, offline, and synchronization without duplicating AI logic.
- React Native: useful only if the product later needs a fully native app.

## Direction

Keep the web/PWA as primary. Prepare `/mobile` architecture with shared analysis services and no duplicated AI engine.
