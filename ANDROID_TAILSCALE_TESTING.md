# Android / Tailscale testing

This branch is isolated from the production baseline.

## Tailscale build

Build the mobile-compatible web bundle with the Tailscale API origin:

```bash
cd maamara_market_project/frontend
npm run build:mobile:tailscale
```

The `.env.tailscale` file is loaded only in the explicit `tailscale` mode.
Normal website builds keep their existing same-origin API behavior.

For an APK, the GitHub Actions **Maa Mara Market native app build** workflow
uses the Tailscale API origin automatically on this branch. A manual workflow
run can override the `api_url` input.

## Android status bar / safe area

The generated Capacitor app now includes the StatusBar plugin configuration:
the Android status bar stays visible, uses dark icons on a light background, and
the web content accounts for `env(safe-area-inset-top)`. This avoids putting
the app's top controls over the battery, signal, clock, and notification icons.

The Tailscale HTTP address is a test-only starting point. Android WebView
cross-origin, cookie, and CSRF rules may still require a Tailscale HTTPS endpoint
and matching Django CORS/CSRF trusted origins. Do not use the test API setting
for production builds.
