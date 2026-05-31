import * as vscode from 'vscode';
import { parsePo, PoEntry, PoString } from './parser';
import { Code, SOURCE } from './diagnostics';
import { diffPlaceholders } from './placeholders';
import { diffHtmlTags, displayTag } from './htmlTags';

/** Escape a raw string value for embedding inside a PO double-quoted string. */
function escapePo(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function fieldRange(doc: vscode.TextDocument, field: PoString): vscode.Range {
  const last = field.valueLines.length
    ? field.valueLines[field.valueLines.length - 1]
    : field.keywordLine;
  const start = doc.lineAt(field.keywordLine).range.start;
  const end = doc.lineAt(last).range.end;
  return new vscode.Range(start, end);
}

/** Find the (entry, msgstr) whose value lives on the diagnostic's line. */
function locateMsgstr(
  entries: PoEntry[],
  line: number
): { entry: PoEntry; index: number; field: PoString } | undefined {
  for (const entry of entries) {
    for (const [index, field] of entry.msgstr) {
      if (field.keywordLine === line || field.valueLines.includes(line)) {
        return { entry, index, field };
      }
    }
  }
  return undefined;
}

export class PoCodeActionProvider implements vscode.CodeActionProvider {
  static readonly kinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    doc: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const entries = parsePo(doc.getText());
    const actions: vscode.CodeAction[] = [];

    for (const diag of context.diagnostics) {
      if (diag.source !== SOURCE) {
        continue;
      }
      const line = diag.range.start.line;

      if (diag.code === Code.Fuzzy) {
        const action = this.removeFuzzy(doc, line);
        if (action) {
          action.diagnostics = [diag];
          actions.push(action);
        }
        continue;
      }

      const located = locateMsgstr(entries, line);
      if (!located) {
        continue;
      }
      const { entry, index, field } = located;
      const reference =
        index > 0 && entry.msgidPlural ? entry.msgidPlural : entry.msgid;

      if (diag.code === Code.EmptyMsgstr && reference) {
        const action = new vscode.CodeAction(
          'Copiar el texto del original (msgid) a la traducción',
          vscode.CodeActionKind.QuickFix
        );
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(
          doc.uri,
          fieldRange(doc, field),
          `${msgstrKeyword(index)} "${escapePo(reference.value)}"`
        );
        action.diagnostics = [diag];
        actions.push(action);
      }

      if (diag.code === Code.PlaceholderMissing && reference) {
        const diff = diffPlaceholders(reference.value, field.value);
        const newValue = field.value + diff.missing.join(' ');
        const action = new vscode.CodeAction(
          `Añadir placeholders faltantes (${[...new Set(diff.missing)].join(', ')})`,
          vscode.CodeActionKind.QuickFix
        );
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(
          doc.uri,
          fieldRange(doc, field),
          `${msgstrKeyword(index)} "${escapePo(newValue)}"`
        );
        action.diagnostics = [diag];
        actions.push(action);
      }

      if (diag.code === Code.HtmlMismatch && reference) {
        const diff = diffHtmlTags(reference.value, field.value);
        if (diff.missing.length > 0) {
          const tagsToAdd = diff.missing.map(displayTag).join('');
          const labelTags = [...new Set(diff.missing)].map(displayTag).join(', ');
          const action = new vscode.CodeAction(
            `Añadir etiquetas HTML faltantes (${labelTags})`,
            vscode.CodeActionKind.QuickFix
          );
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(
            doc.uri,
            fieldRange(doc, field),
            `${msgstrKeyword(index)} "${escapePo(field.value + tagsToAdd)}"`
          );
          action.diagnostics = [diag];
          actions.push(action);
        }
      }
    }

    return actions;
  }

  private removeFuzzy(
    doc: vscode.TextDocument,
    line: number
  ): vscode.CodeAction | undefined {
    if (line >= doc.lineCount) {
      return undefined;
    }
    const text = doc.lineAt(line).text;
    if (!text.startsWith('#,')) {
      return undefined;
    }
    const flags = text
      .slice(2)
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f && f !== 'fuzzy');

    const action = new vscode.CodeAction(
      'Quitar la marca "fuzzy"',
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    if (flags.length === 0) {
      // Remove the whole flags line.
      action.edit.delete(
        doc.uri,
        new vscode.Range(line, 0, line + 1, 0)
      );
    } else {
      action.edit.replace(
        doc.uri,
        doc.lineAt(line).range,
        `#, ${flags.join(', ')}`
      );
    }
    return action;
  }
}

function msgstrKeyword(index: number): string {
  return index > 0 ? `msgstr[${index}]` : 'msgstr';
}
