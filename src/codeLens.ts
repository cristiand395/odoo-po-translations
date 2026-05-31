import * as vscode from 'vscode';
import { getEntries } from './parseCache';

/**
 * Shows a single CodeLens at the top of the file with the translation
 * progress: percentage translated, count, and how many entries have issues.
 * Clicking it re-validates the file.
 */
export class PoCodeLensProvider implements vscode.CodeLensProvider {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.emitter.event;

  /** Ask VS Code to re-request the lenses (call on document edits). */
  refresh(): void {
    this.emitter.fire();
  }

  provideCodeLenses(doc: vscode.TextDocument): vscode.CodeLens[] {
    const isTemplate = /\.pot$/i.test(doc.fileName);
    const entries = getEntries(doc);

    let total = 0;
    let translated = 0;

    for (const entry of entries) {
      if (entry.obsolete || !entry.msgid) {
        continue;
      }
      const isHeader = entry.msgid.value === '' && entry.msgctxt === undefined;
      if (isHeader) {
        continue;
      }
      total++;
      const values = [...entry.msgstr.values()];
      const allFilled =
        values.length > 0 && values.every((s) => s.value !== '');
      if (allFilled) {
        translated++;
      }
    }

    const range = new vscode.Range(0, 0, 0, 0);
    let title: string;

    if (isTemplate) {
      title = `$(book) Plantilla .pot — ${total} entradas a traducir`;
    } else if (total === 0) {
      title = `$(globe) PO — sin entradas`;
    } else {
      const pct = Math.round((translated / total) * 100);
      const remaining = total - translated;
      const tail = remaining > 0 ? ` · faltan ${remaining}` : ' · ¡completo! ✓';
      title = `$(globe) ${pct}% traducido — ${translated}/${total}${tail}`;
    }

    return [
      new vscode.CodeLens(range, {
        title,
        command: 'odooPo.validateFile',
        tooltip: 'Validar el archivo PO',
      }),
    ];
  }
}
