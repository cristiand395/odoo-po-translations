import * as vscode from 'vscode';
import { WorkspaceScanner, FileResult } from './workspaceScanner';

type Node =
  | { kind: 'file'; result: FileResult }
  | { kind: 'diag'; uri: vscode.Uri; diag: vscode.Diagnostic };

/**
 * Tree view (activity bar) that lists every .po/.pot with problems and, under
 * each file, its individual issues. Clicking an issue jumps to its location —
 * a navigable translation checklist for the whole module.
 */
export class PoProblemsTree implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly scanner: WorkspaceScanner) {
    this.scanner.onDidChange(() => this._onDidChangeTreeData.fire());
  }

  getChildren(element?: Node): Node[] {
    if (!element) {
      return this.scanner.results.map((result) => ({ kind: 'file', result }));
    }
    if (element.kind === 'file') {
      return element.result.diagnostics
        .slice()
        .sort((a, b) => a.range.start.line - b.range.start.line)
        .map((diag) => ({ kind: 'diag', uri: element.result.uri, diag }));
    }
    return [];
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'file') {
      const { uri, diagnostics } = node.result;
      const item = new vscode.TreeItem(
        vscode.workspace.asRelativePath(uri),
        vscode.TreeItemCollapsibleState.Collapsed
      );
      const errors = diagnostics.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      ).length;
      const warnings = diagnostics.length - errors;
      item.description = `${errors ? `${errors} ⛔ ` : ''}${warnings} ⚠`;
      item.resourceUri = uri;
      item.iconPath = vscode.ThemeIcon.File;
      item.tooltip = uri.fsPath;
      return item;
    }

    const { diag, uri } = node;
    const item = new vscode.TreeItem(
      diag.message,
      vscode.TreeItemCollapsibleState.None
    );
    item.description = `línea ${diag.range.start.line + 1}`;
    const isError = diag.severity === vscode.DiagnosticSeverity.Error;
    item.iconPath = new vscode.ThemeIcon(
      isError ? 'error' : 'warning',
      new vscode.ThemeColor(
        isError ? 'problemsErrorIcon.foreground' : 'problemsWarningIcon.foreground'
      )
    );
    item.command = {
      command: 'vscode.open',
      title: 'Abrir',
      arguments: [uri, { selection: diag.range }],
    };
    return item;
  }
}
