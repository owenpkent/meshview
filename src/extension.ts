import * as vscode from 'vscode';
import { StlEditorProvider } from './stlEditor';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    // STL files open in the MeshView STL preview (a read-only custom editor).
    vscode.window.registerCustomEditorProvider(
      StlEditorProvider.viewType,
      new StlEditorProvider(context),
      {
        supportsMultipleEditorsPerDocument: false,
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),

    vscode.commands.registerCommand('meshview.openPreview', async (uri?: vscode.Uri) => {
      const target = pickUri(uri);
      if (!target) {
        void vscode.window.showInformationMessage('MeshView: open or select an STL file first.');
        return;
      }
      await vscode.commands.executeCommand('vscode.openWith', target, StlEditorProvider.viewType);
    }),
  );
}

export function deactivate(): void {
  // No global state to tear down; each webview panel disposes its own resources.
}

// Resolve the file the command should target: an explicit URI (context menu),
// else the active text editor's document, else whatever the active tab is
// showing (an already-open STL preview is a custom editor tab, not a text
// editor, so activeTextEditor alone would miss it).
function pickUri(uri?: vscode.Uri): vscode.Uri | undefined {
  if (uri) {
    return uri;
  }
  if (vscode.window.activeTextEditor) {
    return vscode.window.activeTextEditor.document.uri;
  }
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (activeTab?.input instanceof vscode.TabInputCustom) {
    return activeTab.input.uri;
  }
  return undefined;
}
