import * as vscode from 'vscode';
import { WorkspaceScanner, Totals } from './workspaceScanner';

/** Status-bar item showing the aggregated totals across the workspace. */
export class WorkspaceStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor(private readonly scanner: WorkspaceScanner) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.item.command = 'odooPo.scanWorkspace';
    this.item.name = 'Odoo PO (workspace)';
    this.scanner.onDidChange(() => this.render());
  }

  dispose(): void {
    this.item.dispose();
  }

  private render(): void {
    if (vscode.workspace.workspaceFolders === undefined) {
      this.item.hide();
      return;
    }
    if (this.scanner.scanning) {
      this.item.text = '$(sync~spin) PO workspace…';
      this.item.tooltip = 'Analizando todos los .po/.pot del proyecto…';
      this.item.backgroundColor = undefined;
      this.item.show();
      return;
    }

    if (!this.scanner.hasScanned) {
      this.item.text = '$(search) Escanear PO';
      this.item.tooltip =
        'Clic para analizar todos los .po/.pot del proyecto (no se hace automáticamente).';
      this.item.backgroundColor = undefined;
      this.item.show();
      return;
    }

    const t = this.scanner.totals;
    const parts = ['$(globe) Proyecto'];
    const total = t.errors + t.warnings;

    if (total === 0) {
      parts.push('$(check)');
    } else {
      if (t.errors > 0) {
        parts.push(`$(error) ${t.errors}`);
      }
      if (t.empty > 0) {
        parts.push(`$(circle-slash) ${t.empty}`);
      }
    }

    // The workspace indicator stays neutral on purpose: only the active-file
    // indicator turns red, so two red blobs never look like a duplicate.
    this.item.backgroundColor = undefined;
    this.item.text = parts.join(' ');
    this.item.tooltip = this.buildTooltip(t);
    this.item.show();
  }

  private buildTooltip(t: Totals): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportThemeIcons = true;
    md.appendMarkdown(`**Workspace — total de todos los .po/.pot**\n\n`);
    md.appendMarkdown(`$(error) Placeholders incorrectos: **${t.placeholder}**\n\n`);
    md.appendMarkdown(`$(circle-slash) Sin traducir: **${t.empty}**\n\n`);
    md.appendMarkdown(`$(edit) Fuzzy (por revisar): **${t.fuzzy}**\n\n`);
    md.appendMarkdown(`$(copy) msgid duplicados: **${t.duplicate}**\n\n`);
    md.appendMarkdown(`$(code) HTML inconsistente: **${t.html}**\n\n`);
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(
      `${t.filesWithIssues}/${t.files} archivo(s) con problemas` +
        (this.scanner.truncated ? ' _(lista recortada)_' : '') +
        `.\n\n`
    );
    md.appendMarkdown(`_Clic para volver a escanear el workspace._`);
    return md;
  }
}
