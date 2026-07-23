# Changelog

All notable changes to MeshView are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Guards against malformed and oversized STL files.** Before allocating geometry, MeshView rejects a binary STL whose header declares more triangles than the file can hold, and caps loads at 10 million triangles. Both cases show an explanatory message in the panel instead of hanging the viewer on a huge allocation.
