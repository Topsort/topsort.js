# Changelog

All notable changes to `@topsort/verification` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version 0.1.0 (Unreleased)

### Added

- Framework-neutral verification runtime with per-element registration, replacement,
  deduplication, and disposal
- Consent-aware provider startup with bounded lifecycle diagnostics
- Narrow IAS web-display adapter for the confirmed `staticjs.adsafeprotected.com/fw.js`
  monitoring tag format
- Exact-element provider script insertion without evaluating stored markup
- Provider loading waits for the browser's `load` or `error` signal, or explicit disposal,
  without imposing a package-defined network timeout
- Optional React callback-ref integration through `@topsort/verification/react`
- Chromium, Firefox, and WebKit browser coverage
- Packed-package validation for public exports, SSR-safe imports, React isolation, and package
  contents

### Support boundary

- Supports npm/module-based web applications and IAS monitoring tags for web display banners
- Does not yet support an IIFE build, direct `<script>` installation, IAS blocking wrappers,
  arbitrary provider tags, providers other than IAS, or native mobile-app OM SDK measurement
