import * as vscode from 'vscode';
import { getEntries } from './parseCache';

const LANG = 'po';

/**
 * Paints a subtle background over every `fuzzy` entry so they stand out as
 * "needs review" blocks, plus a mark in the overview ruler (right scrollbar).
 */
export class PoDecorations {
  private readonly fuzzyType: vscode.TextEditorDecorationType;

  constructor() {
    this.fuzzyType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: 'rgba(254, 222, 93, 0.07)',
      overviewRulerColor: 'rgba(254, 222, 93, 0.7)',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }

  dispose(): void {
    this.fuzzyType.dispose();
  }

  update(editor: vscode.TextEditor | undefined): void {
    if (!editor || editor.document.languageId !== LANG) {
      return;
    }
    const enabled = vscode.workspace
      .getConfiguration('odooPo')
      .get('highlightFuzzy', true);

    if (!enabled) {
      editor.setDecorations(this.fuzzyType, []);
      return;
    }

    const doc = editor.document;
    const entries = getEntries(doc);
    const ranges: vscode.Range[] = [];

    for (const entry of entries) {
      if (entry.obsolete || !entry.flags.includes('fuzzy')) {
        continue;
      }
      const start = entry.flagsLine >= 0 ? entry.flagsLine : entry.startLine;
      const end = Math.min(entry.endLine, doc.lineCount - 1);
      ranges.push(
        new vscode.Range(start, 0, end, doc.lineAt(end).text.length)
      );
    }

    editor.setDecorations(this.fuzzyType, ranges);
  }
}
