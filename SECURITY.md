# Security

## Supported versions

MeshView is pre-1.0. Only the latest published version on the VS Code Marketplace is supported; please upgrade before reporting an issue.

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |
| Older   | No        |

## Threat model

MeshView reads binary or ASCII STL files you open and renders them with Three.js in a webview. An STL is just triangle geometry (vertices and normals), so there is no script content to execute and no network fetch involved. The areas that matter are the webview's Content Security Policy and how untrusted file bytes are parsed into geometry.

## Content Security Policy

The webview is served with a strict CSP, set in `src/stlEditor.ts`:

```
default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; font-src ${cspSource}
```

`default-src 'none'` denies everything not named explicitly, so there is no remote resource loading and no `connect-src` for the webview to talk to the network. The bundle is loaded through `webview.asWebviewUri` with `localResourceRoots` limited to the extension's `media` folder, so the only scripts that can run are ones shipped inside the extension.

`style-src` allows `'unsafe-inline'` because the panel's layout ships as an inline `<style>` block in the webview HTML. This relaxes CSS only: `script-src` carries no `'unsafe-inline'` and no `'unsafe-eval'`, so inline event handlers and injected `<script>` tags stay blocked. Nothing in the webview writes untrusted input to an HTML sink either (no `innerHTML`, `insertAdjacentHTML`, or `document.write` anywhere in the extension); file names and parse errors reach the panel through `textContent`, which does not parse markup.

## STL parsing

STL bytes are read by the extension host with `workspace.fs.readFile` and handed to the webview, which parses binary and ASCII STL locally (no network access, no shelling out). Parsing is defensive against malformed input: before any geometry is allocated, `checkStl()` rejects a binary header whose declared triangle count exceeds what the file can actually hold (an ~84-byte crafted file can otherwise claim ~4.29 billion triangles and drive a multi-gigabyte allocation), and caps loads at 10 million triangles. A file that is rejected or fails to parse shows an error in the panel instead of crashing the extension host.

## Reporting a vulnerability

Please report suspected vulnerabilities privately by emailing **Owenpkent@gmail.com** rather than opening a public issue. Include the VS Code version, OS, a minimal reproducing `.stl` file if possible, and the observed behavior. You will get an acknowledgement and a fix timeline.

Please do not include secrets, credentials, or other personal or identifying information in a report or attached file.
