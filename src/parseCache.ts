import * as vscode from 'vscode';
import { parsePo, PoEntry } from './parser';

/**
 * Per-document parse cache keyed by document version.
 *
 * Diagnostics, the CodeLens provider and the fuzzy decorations all need the
 * parsed entries of the same document on every keystroke. Without a cache we
 * would parse the same text three times per change; with it, only once.
 */
const cache = new Map<string, { version: number; entries: PoEntry[] }>();

export function getEntries(doc: vscode.TextDocument): PoEntry[] {
  const key = doc.uri.toString();
  const hit = cache.get(key);
  if (hit && hit.version === doc.version) {
    return hit.entries;
  }
  const entries = parsePo(doc.getText());
  cache.set(key, { version: doc.version, entries });
  return entries;
}

export function dropFromCache(doc: vscode.TextDocument): void {
  cache.delete(doc.uri.toString());
}

export function clearCache(): void {
  cache.clear();
}
