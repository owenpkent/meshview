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

The webview is served with a strict CSP and a nonce per load: only the nonce-tagged bundle script can run, there is no remote resource loading, and all local assets (the script) are loaded through `webview.asWebviewUri` with `localResourceRoots` limited to the extension's `media` folder.

## STL parsing

STL bytes are read by the extension host with `workspace.fs.readFile` and handed to the webview, which parses binary and ASCII STL locally (no network access, no shelling out). Parsing is defensive against malformed input (truncated files, bad triangle counts); a file that fails to parse shows an error in the panel instead of crashing the extension host.

## Reporting a vulnerability

Please report suspected vulnerabilities privately by emailing **Owenpkent@gmail.com** rather than opening a public issue. Include the VS Code version, OS, a minimal reproducing `.stl` file if possible, and the observed behavior. You will get an acknowledgement and a fix timeline.

Please do not include secrets, credentials, or other personal or identifying information in a report or attached file.
