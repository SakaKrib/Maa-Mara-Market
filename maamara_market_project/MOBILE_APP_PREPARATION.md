# Maa Mara Market mobile app preparation

This preparation keeps the existing React storefront as the shared UI. It does
not redesign the homepage, change routes, or replace the Django backend.

## Current direction

- Android and iOS are planned as Capacitor shells around the existing Vite build.
- Website builds retain Vite's current root-relative asset paths.
- Native builds use relative asset paths and a configurable API origin.
- The API origin belongs in the build environment, not in React components.
- The native app uses bundled web assets; it must not load the full site from a
  remote `server.url`.
- Do not add API secrets to any `VITE_*` variable; Vite embeds these values in
  the client bundle.

## Build environment

Copy `.env.mobile.example` to `.env.mobile` (or configure the equivalent
environment variables in the build environment) and verify the API origin
before building. The example uses `https://mamaramarket.com` as a placeholder
for the intended public origin; confirm DNS, HTTPS, routing and API availability
before treating it as production.

Set `VITE_BUILD_TARGET=mobile` when creating the native web bundle. Website
development and production builds should leave this unset unless intentionally
using relative asset paths.

## Work still required before a store build

1. Add and lock Capacitor packages through npm so `package.json` and
   `package-lock.json` remain consistent.
2. Generate Android and iOS platform projects from the Capacitor configuration.
3. Validate cookies, refresh-token behavior, Google OAuth return handling,
   WebSockets, media uploads, checkout and payment-provider redirects on devices.
4. Configure Android app links and iOS universal links only after the public
   domain and callback paths are confirmed.
5. Test Android release builds. iOS build/signing requires macOS with Xcode or a
   suitable macOS build runner.
6. Verify the production API host, TLS, Django allowed hosts, CORS/CSRF trusted
   origins, cookie settings, and payment callback URLs before release.

## Current status

The shared frontend now supports an explicit API origin and mobile-specific
relative asset paths. The Capacitor CLI/platform dependencies and native platform
projects have not yet been installed/generated. This document is a preparation
record, not a claim that store-ready builds have been produced or tested.
