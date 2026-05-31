import * as vscode from 'vscode';
import { Code, SOURCE } from './diagnostics';

/**
 * A status-bar item that summarizes the issues of the active PO file:
 * untranslated strings, fuzzy entries, placeholder errors and duplicates.
 * Clicking it opens the Problems panel.
 */
export class PoStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = 'workbench.actions.view.problems';
    this.item.name = 'Odoo PO (archivo)';
  }

  dispose(): void {
    this.item.dispose();
  }

  hide(): void {
    this.item.hide();
  }

  update(diagnostics: readonly vscode.Diagnostic[]): void {
    const counts = { placeholder: 0, empty: 0, fuzzy: 0, duplicate: 0, html: 0 };
    let errors = 0;
    let warnings = 0;

    for (const d of diagnostics) {
      if (d.source !== SOURCE) {
        continue;
      }
      if (d.severity === vscode.DiagnosticSeverity.Error) {
        errors++;
      } else {
        warnings++;
      }
      switch (d.code) {
        case Code.PlaceholderMissing:
        case Code.PlaceholderExtra:
          counts.placeholder++;
          break;
        case Code.EmptyMsgstr:
          counts.empty++;
          break;
        case Code.Fuzzy:
          counts.fuzzy++;
          break;
        case Code.DuplicateMsgid:
          counts.duplicate++;
          break;
        case Code.HtmlMismatch:
          counts.html++;
          break;
      }
    }

    const total = errors + warnings;
    const parts = ['$(file) PO'];

    if (total === 0) {
      parts.push('$(check) sin problemas');
      this.item.backgroundColor = undefined;
    } else {
      if (errors > 0) {
        parts.push(`$(error) ${errors}`);
      }
      if (counts.empty > 0) {
        parts.push(`$(circle-slash) ${counts.empty}`);
      }
      if (counts.fuzzy > 0) {
        parts.push(`$(edit) ${counts.fuzzy}`);
      }
      if (counts.duplicate > 0) {
        parts.push(`$(copy) ${counts.duplicate}`);
      }
      if (counts.html > 0) {
        parts.push(`$(code) ${counts.html}`);
      }
      this.item.backgroundColor = new vscode.ThemeColor(
        errors > 0
          ? 'statusBarItem.errorBackground'
          : 'statusBarItem.warningBackground'
      );
    }

    this.item.text = parts.join(' ');
    this.item.tooltip = this.buildTooltip(counts, errors, warnings);
    this.item.show();
  }

  private buildTooltip(
    counts: {
      placeholder: number;
      empty: number;
      fuzzy: number;
      duplicate: number;
      html: number;
    },
    errors: number,
    warnings: number
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportThemeIcons = true;
    md.appendMarkdown(`**Traducción PO — resumen**\n\n`);
    md.appendMarkdown(`$(error) Placeholders incorrectos: **${counts.placeholder}**\n\n`);
    md.appendMarkdown(`$(circle-slash) Sin traducir: **${counts.empty}**\n\n`);
    md.appendMarkdown(`$(edit) Fuzzy (por revisar): **${counts.fuzzy}**\n\n`);
    md.appendMarkdown(`$(copy) msgid duplicados: **${counts.duplicate}**\n\n`);
    md.appendMarkdown(`$(code) HTML inconsistente: **${counts.html}**\n\n`);
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`Total: ${errors} error(es), ${warnings} advertencia(s).\n\n`);
    md.appendMarkdown(`_Clic para abrir el panel de problemas._`);
    return md;
  }
}
