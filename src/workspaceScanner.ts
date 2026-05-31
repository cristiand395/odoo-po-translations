import * as vscode from 'vscode';
import { computeDiagnostics, SOURCE, Code } from './diagnostics';

export interface FileResult {
  uri: vscode.Uri;
  diagnostics: vscode.Diagnostic[];
}

export interface Totals {
  files: number;
  filesWithIssues: number;
  placeholder: number;
  empty: number;
  fuzzy: number;
  duplicate: number;
  html: number;
  errors: number;
  warnings: number;
}

export function emptyTotals(): Totals {
  return {
    files: 0,
    filesWithIssues: 0,
    placeholder: 0,
    empty: 0,
    fuzzy: 0,
    duplicate: 0,
    html: 0,
    errors: 0,
    warnings: 0,
  };
}

/** Hard cap so a huge monorepo can't freeze the scan. */
const MAX_FILES = 3000;

/**
 * Scans every .po/.pot in the workspace once and shares the results with all
 * consumers (status bar + problems tree) through a change event. The scan is
 * on-demand (command / save / activation), never per keystroke.
 */
export class WorkspaceScanner {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  results: FileResult[] = [];
  totals: Totals = emptyTotals();
  scanning = false;
  truncated = false;
  /** Whether a full scan has completed at least once this session. */
  hasScanned = false;

  dispose(): void {
    this._onDidChange.dispose();
  }

  async scan(): Promise<void> {
    if (this.scanning) {
      return;
    }
    if (vscode.workspace.workspaceFolders === undefined) {
      this.results = [];
      this.totals = emptyTotals();
      this._onDidChange.fire();
      return;
    }

    this.scanning = true;
    this._onDidChange.fire(); // let consumers show a "scanning…" state

    try {
      let uris = await vscode.workspace.findFiles(
        '**/*.{po,pot}',
        '**/node_modules/**'
      );
      this.truncated = uris.length > MAX_FILES;
      if (this.truncated) {
        uris = uris.slice(0, MAX_FILES);
      }

      const totals = emptyTotals();
      totals.files = uris.length;
      const results: FileResult[] = [];

      for (const uri of uris) {
        let diags: vscode.Diagnostic[];
        try {
          const doc = await vscode.workspace.openTextDocument(uri);
          diags = computeDiagnostics(doc).filter((d) => d.source === SOURCE);
        } catch {
          continue;
        }
        if (diags.length === 0) {
          continue;
        }
        totals.filesWithIssues++;
        results.push({ uri, diagnostics: diags });
        for (const d of diags) {
          if (d.severity === vscode.DiagnosticSeverity.Error) {
            totals.errors++;
          } else {
            totals.warnings++;
          }
          switch (d.code) {
            case Code.PlaceholderMissing:
            case Code.PlaceholderExtra:
              totals.placeholder++;
              break;
            case Code.EmptyMsgstr:
              totals.empty++;
              break;
            case Code.Fuzzy:
              totals.fuzzy++;
              break;
            case Code.DuplicateMsgid:
              totals.duplicate++;
              break;
            case Code.HtmlMismatch:
              totals.html++;
              break;
          }
        }
      }

      results.sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath));
      this.results = results;
      this.totals = totals;
      this.hasScanned = true;
    } finally {
      this.scanning = false;
      this._onDidChange.fire();
    }
  }
}
