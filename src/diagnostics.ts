import * as vscode from 'vscode';
import { PoEntry, PoString } from './parser';
import { getEntries } from './parseCache';
import { diffPlaceholders } from './placeholders';
import { diffHtmlTags, displayTag } from './htmlTags';

export const SOURCE = 'Odoo PO';

export const Code = {
  Fuzzy: 'fuzzy',
  EmptyMsgstr: 'empty-msgstr',
  PlaceholderMissing: 'placeholder-missing',
  PlaceholderExtra: 'placeholder-extra',
  DuplicateMsgid: 'duplicate-msgid',
  HtmlMismatch: 'html-mismatch',
} as const;

interface Options {
  warnOnFuzzy: boolean;
  warnOnEmptyMsgstr: boolean;
  checkPlaceholders: boolean;
  checkHtml: boolean;
}

function readOptions(): Options {
  const cfg = vscode.workspace.getConfiguration('odooPo');
  return {
    warnOnFuzzy: cfg.get('warnOnFuzzy', true),
    warnOnEmptyMsgstr: cfg.get('warnOnEmptyMsgstr', true),
    checkPlaceholders: cfg.get('checkPlaceholders', true),
    checkHtml: cfg.get('checkHtml', true),
  };
}

function rangeForField(doc: vscode.TextDocument, field: PoString): vscode.Range {
  if (field.valueLines.length === 0) {
    const line = Math.min(field.keywordLine, doc.lineCount - 1);
    return doc.lineAt(line).range;
  }
  const first = field.valueLines[0];
  const last = field.valueLines[field.valueLines.length - 1];
  const firstText = doc.lineAt(first).text;
  const startChar = Math.max(0, firstText.indexOf('"'));
  const endChar = doc.lineAt(last).text.length;
  return new vscode.Range(first, startChar, last, endChar);
}

/** Stable key for duplicate detection: context + msgid. */
function entryKey(entry: PoEntry): string {
  const ctx = entry.msgctxt?.value ?? '';
  const id = entry.msgid?.value ?? '';
  return JSON.stringify([ctx, id]);
}

export function computeDiagnostics(doc: vscode.TextDocument): vscode.Diagnostic[] {
  const opts = readOptions();
  const entries = getEntries(doc);
  const diagnostics: vscode.Diagnostic[] = [];

  // A .pot is a template: every msgstr is empty by design, so "untranslated"
  // and empty-string placeholder checks would be pure noise.
  const isTemplate = /\.pot$/i.test(doc.fileName);

  const seen = new Map<string, PoEntry>();

  for (const entry of entries) {
    if (entry.obsolete) {
      continue;
    }
    // The PO header has an empty msgid; skip its content checks.
    const isHeader = (entry.msgid?.value ?? '') === '' && entry.msgctxt === undefined;

    // --- fuzzy ---
    if (opts.warnOnFuzzy && entry.flags.includes('fuzzy') && entry.flagsLine >= 0) {
      const d = new vscode.Diagnostic(
        doc.lineAt(entry.flagsLine).range,
        'Entrada marcada como "fuzzy": traducción pendiente de revisión.',
        vscode.DiagnosticSeverity.Warning
      );
      d.source = SOURCE;
      d.code = Code.Fuzzy;
      diagnostics.push(d);
    }

    if (isHeader || !entry.msgid) {
      continue;
    }

    // --- duplicate msgid ---
    const key = entryKey(entry);
    const previous = seen.get(key);
    if (previous && entry.msgid) {
      const d = new vscode.Diagnostic(
        rangeForField(doc, entry.msgid),
        `msgid duplicado (ya definido en la línea ${previous.msgid!.keywordLine + 1}).`,
        vscode.DiagnosticSeverity.Warning
      );
      d.source = SOURCE;
      d.code = Code.DuplicateMsgid;
      diagnostics.push(d);
    } else {
      seen.set(key, entry);
    }

    // --- per-msgstr checks ---
    for (const [index, str] of entry.msgstr) {
      const reference =
        index > 0 && entry.msgidPlural ? entry.msgidPlural : entry.msgid;

      // empty translation
      if (str.value === '') {
        if (opts.warnOnEmptyMsgstr && !isTemplate) {
          const d = new vscode.Diagnostic(
            rangeForField(doc, str),
            'msgstr vacío: cadena sin traducir.',
            vscode.DiagnosticSeverity.Warning
          );
          d.source = SOURCE;
          d.code = Code.EmptyMsgstr;
          diagnostics.push(d);
        }
        // Placeholder check is meaningless on an empty string (and every entry
        // in a .pot template is empty), so stop here either way.
        continue;
      }

      // placeholder mismatch
      if (opts.checkPlaceholders && reference) {
        const diff = diffPlaceholders(reference.value, str.value);
        if (diff.missing.length > 0) {
          const d = new vscode.Diagnostic(
            rangeForField(doc, str),
            `Faltan placeholders en la traducción: ${unique(diff.missing).join(
              ', '
            )}. Deben coincidir con el original o Odoo fallará en runtime.`,
            vscode.DiagnosticSeverity.Error
          );
          d.source = SOURCE;
          d.code = Code.PlaceholderMissing;
          diagnostics.push(d);
        }
        if (diff.extra.length > 0) {
          const d = new vscode.Diagnostic(
            rangeForField(doc, str),
            `Placeholders que no existen en el original: ${unique(diff.extra).join(
              ', '
            )}.`,
            vscode.DiagnosticSeverity.Error
          );
          d.source = SOURCE;
          d.code = Code.PlaceholderExtra;
          diagnostics.push(d);
        }
      }

      // HTML tag consistency
      if (opts.checkHtml && reference) {
        const diff = diffHtmlTags(reference.value, str.value);
        if (diff.missing.length > 0 || diff.extra.length > 0) {
          const messages: string[] = [];
          if (diff.missing.length > 0) {
            messages.push(
              `faltan ${unique(diff.missing).map(displayTag).join(', ')}`
            );
          }
          if (diff.extra.length > 0) {
            messages.push(
              `sobran ${unique(diff.extra).map(displayTag).join(', ')}`
            );
          }
          const d = new vscode.Diagnostic(
            rangeForField(doc, str),
            `La traducción no conserva las mismas etiquetas HTML que el original (${messages.join(
              '; '
            )}).`,
            vscode.DiagnosticSeverity.Warning
          );
          d.source = SOURCE;
          d.code = Code.HtmlMismatch;
          diagnostics.push(d);
        }
      }
    }
  }

  return diagnostics;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
