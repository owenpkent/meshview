import * as vscode from 'vscode';

// A read-only custom editor that renders STL files with Three.js in a webview.
// Mouse-only orbit/pan/zoom; see media/webview.js (built from src/webview/main.ts).
export class StlEditorProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'meshview.stlPreview';

  constructor(private readonly context: vscode.ExtensionContext) {}

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => undefined };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const webview = panel.webview;
    const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    webview.options = {
      enableScripts: true,
      localResourceRoots: [mediaRoot],
    };

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'webview.js'));
    webview.html = this.html(webview, scriptUri);

    webview.onDidReceiveMessage(async (msg: { type?: string }) => {
      if (msg?.type !== 'ready') {
        return;
      }
      try {
        const bytes = await vscode.workspace.fs.readFile(document.uri);
        const cfg = vscode.workspace.getConfiguration('meshview', document.uri);
        void webview.postMessage({
          type: 'load',
          name: basename(document.uri),
          // Base64, not the raw Uint8Array. The webview transport JSON-encodes
          // messages, and JSON turns a typed array into a numeric-keyed object
          // ~13x the size of the file (a 5 MB STL becomes ~67 MB of JSON and
          // several hundred MB of objects). Base64 costs 1.33x and stays a
          // string end to end. toBytes() in src/webview/stlInfo.ts decodes it.
          bytes: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64'),
          showGrid: cfg.get<boolean>('showGrid', true),
          meshColor: cfg.get<string>('meshColor', '#8ab4f8'),
        });
      } catch (err) {
        void vscode.window.showErrorMessage(
          `MeshView: could not read ${basename(document.uri)} (${String(err)}).`,
        );
      }
    });
  }

  private html(webview: vscode.Webview, scriptUri: vscode.Uri): string {
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource}`,
      `font-src ${webview.cspSource}`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MeshView</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
  #viewport { position: fixed; inset: 0; }
  #viewport canvas { display: block; outline: none; }
  #toolbar { position: fixed; top: 8px; left: 8px; z-index: 10; display: flex; gap: 6px; }
  #toolbar button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    border: 1px solid var(--vscode-contrastBorder, transparent);
    border-radius: 4px;
    background: var(--vscode-button-secondaryBackground, #3a3d41);
    color: var(--vscode-button-secondaryForeground, #ffffff);
    cursor: pointer;
    padding: 0;
  }
  #toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground, #45494e); }
  #toolbar button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  #stats {
    position: fixed;
    bottom: 8px;
    left: 8px;
    z-index: 10;
    font-size: 11px;
    padding: 4px 7px;
    border-radius: 4px;
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editorWidget-background, rgba(0, 0, 0, 0.4));
    border: 1px solid var(--vscode-widget-border, transparent);
    pointer-events: none;
    white-space: pre;
  }
</style>
</head>
<body>
  <div id="viewport"></div>
  <div id="toolbar">
    <button id="btn-fit" title="Fit view" aria-label="Fit view">&#10530;</button>
    <button id="btn-wireframe" title="Toggle wireframe" aria-label="Toggle wireframe">&#9638;</button>
    <button id="btn-grid" title="Toggle grid" aria-label="Toggle grid">&#8862;</button>
  </div>
  <div id="stats"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function basename(uri: vscode.Uri): string {
  const p = uri.path;
  return p.substring(p.lastIndexOf('/') + 1);
}
