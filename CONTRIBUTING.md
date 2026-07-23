# Contributing

Thanks for helping improve MeshView. This guide covers the local setup, the build, debugging, and coding conventions.

## Prerequisites

- Node.js 20 or newer (matches the version CI builds and tests on).
- VS Code 1.90 or newer (matches `engines.vscode`).

## Setup

```bash
npm install
```

## Build

```bash
npm run compile     # type-check, then build both bundles
npm run watch       # rebuild the extension host and webview on change
```

`compile` runs three steps:

1. `check-types` (`tsc --noEmit`) type-checks the whole tree without emitting.
2. `build:ext` (`esbuild.js`) bundles the Node extension to `dist/extension.js`.
3. `build:web` (`esbuild.web.js`) bundles the webview (Three.js viewer) to `media/webview.js`.

## Lint, format, and type-check

```bash
npm run lint          # eslint (flat config, typescript-eslint)
npm run check-types   # tsc --noEmit
npm run format        # prettier --write .
npm run format:check  # prettier --check . (what CI runs)
```

Run `npm run format` before committing so `format:check` stays green. CI runs `lint`, `format:check`, `check-types`, `test`, `compile`, and packages a VSIX on every push and PR; a PR cannot merge unless CI passes.

## Tests

```bash
npm test          # vitest run (what CI runs)
```

Unit tests live in `tests/` and cover the pure, host-independent logic in `src/webview/stlInfo.ts`: format sniffing, the safety checks that gate parsing, and normalizing the byte payload that arrives from the extension host.

## Debug

1. Run `npm run watch` (or let step 2 build for you).
2. Press **F5** in VS Code. The `Run Extension` config in `.vscode/launch.json` builds first (the `npm: compile` task) and launches the Extension Development Host with MeshView loaded, opening `samples/` so there is something to click.
3. In the new window, open any `.stl` file. It should open automatically in the MeshView preview; if not, run **MeshView: Open STL Preview** from the Command Palette or right-click the file in the Explorer.
4. Orbit (left-drag), pan (right-drag), and zoom (scroll wheel) to exercise the viewer, and try the toolbar's fit-view, wireframe, and grid toggles.

To debug the webview itself, open **Developer: Open Webview Developer Tools** from the Command Palette in the Extension Development Host.

## Project layout

| Path                           | What lives here                                                           |
| ------------------------------ | ------------------------------------------------------------------------- |
| `src/extension.ts`             | Host: activation and command registration.                                |
| `src/stlEditor.ts`             | Host: read-only custom editor for `.stl` files, webview lifecycle.        |
| `src/webview/main.ts`          | Webview: Three.js scene, mouse controls, toolbar, stats overlay.          |
| `src/webview/stlInfo.ts`       | Pure STL sniffing, safety checks, and payload normalization; unit-tested. |
| `tests/`                       | Vitest unit tests.                                                        |
| `media/`                       | Built webview bundle and static webview assets.                           |
| `samples/`                     | Small binary and ASCII STL files for manual testing.                      |
| `scripts/`                     | Repo tooling (for example `make-icon.mjs`, run via `npm run icon`).       |
| `.vscode/`                     | Debug launch config and the build task F5 runs.                           |
| `esbuild.js`, `esbuild.web.js` | The bundlers (extension host and webview respectively).                   |

## Coding conventions

- TypeScript, strict mode. Keep `tsc --noEmit` green.
- Match the surrounding style: small, focused functions with clear section comments.
- No em dashes in any text or comment; use commas, colons, or parentheses.
- Do not bundle `vscode` (it is external and provided at runtime).
- Keep the viewer mouse-only: avoid adding functionality that requires a keyboard to use.

## Commit and PR guidance

- Keep commits focused and describe the "why," not just the "what."
- Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` for any user-facing change.
- Update the README if behavior, settings, or commands changed.
- Open a PR against `main` and fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md). CI must pass before merge.

## Filing issues

Include your VS Code version, MeshView version, OS, and, if relevant, characteristics of the `.stl` file involved (binary or ASCII, approximate size or triangle count).
