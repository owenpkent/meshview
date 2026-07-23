# Changelog

All notable changes to MeshView are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Guards against malformed and oversized STL files.** Before allocating geometry, MeshView rejects a binary STL whose header declares more triangles than the file can hold, and caps loads at 10 million triangles. Both cases show an explanatory message in the panel instead of hanging the viewer on a huge allocation.

### Fixed

- **Valid STL files no longer fail to load with "File is too short to be a valid STL."** File bytes did not survive the trip from the extension host to the webview as a typed array; the message channel is JSON, which turns a `Uint8Array` into a plain object that was then silently rebuilt as an empty array, so every file looked truncated. Bytes now cross as base64 and are decoded on arrival, and a payload that still arrives empty says so instead of blaming the file.

### Changed

- **Large models load dramatically faster.** Sending file bytes as base64 rather than letting JSON expand a typed array into a numeric-keyed object cuts the message for a 5 MB STL from about 67 MB to 6.7 MB, and the encode/decode round trip from roughly 1.1 s to 7 ms. Files big enough to previously exhaust the webview's memory now open.

## [0.1.0] - 2026-07-23

### Added

- **STL custom editor.** Opening a `.stl` (or `.STL`) file registers MeshView as a read-only custom editor and renders it in a Three.js viewer, no external application needed.
- **Mouse-only orbit, pan, and zoom.** Left-drag to orbit, right-drag to pan, scroll wheel to zoom. No keyboard required.
- **Binary and ASCII STL support**, with the camera auto-fitting to the model on load.
- **Wireframe and grid toggles** in the viewer toolbar, alongside a fit-view action.
- **Stats overlay** showing triangle count and bounding-box dimensions (X x Y x Z).
- **Follows the active VS Code color theme.**
- **Settings:** `meshview.showGrid` (show a grid under the model, default on) and `meshview.meshColor` (mesh material color, default `#8ab4f8`).
- **Explorer and command integration:** right-click an `.stl` file in the Explorer, or run `MeshView: Open STL Preview`, to open the preview explicitly.
