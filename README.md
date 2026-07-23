# MeshView

View STL 3D models directly in VS Code. Opens `.stl` files in a Three.js viewer with orbit, pan, and zoom.

## Features

- Custom read-only editor for `.stl` files, no external viewer needed.
- Mouse-only controls: left-drag to orbit, right-drag to pan, scroll wheel to zoom. No keyboard required.
- Handles both binary and ASCII STL files.
- Auto-fits the camera to the model on load.
- Toolbar: Fit view, wireframe toggle, grid toggle.
- Stats overlay: triangle count and bounding-box dimensions (X x Y x Z).
- Follows the active VS Code color theme.

## Getting started

Open any `.stl` file in the workspace and it opens in the MeshView preview automatically. Use the `MeshView: Open STL Preview` command, or right-click an `.stl` file in the Explorer, to open it explicitly.

## Commands

| Command                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `meshview.openPreview` | Open the active or selected `.stl` file in the MeshView preview. |

## Settings

| Setting              | Default   | Description                  |
| -------------------- | --------- | ---------------------------- |
| `meshview.showGrid`  | `true`    | Show a grid under the model. |
| `meshview.meshColor` | `#8ab4f8` | Color of the mesh material.  |

## Develop

```
npm install
npm run watch      # rebuild extension host + webview on change
npm run lint
npm test
npm run compile    # type-check + build both bundles
npm run vsix       # package a .vsix
```

## License

MIT
