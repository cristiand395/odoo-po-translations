/**
 * Placeholder extraction shared by the linter.
 *
 * Odoo translations use several placeholder styles, sometimes mixed:
 *   - printf positional:   %s, %d, %02d, %.2f, %x
 *   - printf named:        %(name)s, %(amount).2f   (Python %-formatting)
 *   - str.format / brace:  {}, {0}, {name}, {obj.field}
 *
 * A literal `%%` is an escaped percent and is NOT a placeholder.
 */

export interface Placeholder {
  /** Normalized key used for comparison between msgid and msgstr. */
  key: string;
  /** The raw matched text, for display. */
  raw: string;
}

const NAMED_RE = /%\(([^)]*)\)[-+ #0-9.*hlLqjzt]*([diouxXeEfFgGcrsab])/g;
const PRINTF_RE = /%([-+ #0-9.*hlLqjzt]*)([diouxXeEfFgGcrsab%])/g;
const BRACE_RE = /\{([^{}]*)\}/g;

export function extractPlaceholders(text: string): Placeholder[] {
  const result: Placeholder[] = [];

  // Named %(...)s first; record spans so the generic printf pass can skip them.
  const consumed: Array<[number, number]> = [];
  let m: RegExpExecArray | null;

  NAMED_RE.lastIndex = 0;
  while ((m = NAMED_RE.exec(text)) !== null) {
    consumed.push([m.index, m.index + m[0].length]);
    result.push({ key: `%(${m[1]})${m[2]}`, raw: m[0] });
  }

  PRINTF_RE.lastIndex = 0;
  while ((m = PRINTF_RE.exec(text)) !== null) {
    if (m[2] === '%') {
      continue; // %% escaped percent
    }
    const start = m.index;
    if (consumed.some(([a, b]) => start >= a && start < b)) {
      continue; // already captured as a named placeholder
    }
    result.push({ key: m[0], raw: m[0] });
  }

  BRACE_RE.lastIndex = 0;
  while ((m = BRACE_RE.exec(text)) !== null) {
    result.push({ key: `{${m[1]}}`, raw: m[0] });
  }

  return result;
}

/** Multiset of placeholder keys. */
export function placeholderCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of extractPlaceholders(text)) {
    counts.set(p.key, (counts.get(p.key) ?? 0) + 1);
  }
  return counts;
}

export interface PlaceholderDiff {
  /** Keys present in msgid but missing (or fewer) in msgstr. */
  missing: string[];
  /** Keys present in msgstr but absent (or extra) in msgid. */
  extra: string[];
}

export function diffPlaceholders(msgid: string, msgstr: string): PlaceholderDiff {
  const a = placeholderCounts(msgid);
  const b = placeholderCounts(msgstr);
  const missing: string[] = [];
  const extra: string[] = [];

  for (const [key, count] of a) {
    const other = b.get(key) ?? 0;
    for (let i = other; i < count; i++) {
      missing.push(key);
    }
  }
  for (const [key, count] of b) {
    const other = a.get(key) ?? 0;
    for (let i = other; i < count; i++) {
      extra.push(key);
    }
  }
  return { missing, extra };
}
