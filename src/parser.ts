/**
 * Minimal gettext PO/POT parser.
 *
 * It is deliberately tolerant: a malformed file should still yield as many
 * usable entries as possible so diagnostics can run on the rest.
 */

export interface PoReference {
  file: string;
  line: number;
  /** Zero-based line of the `#:` comment inside the document. */
  docLine: number;
  /** Column where the `file` token starts on that line. */
  startCol: number;
  /** Column just past the line number. */
  endCol: number;
}

export interface PoString {
  /** Decoded, concatenated value across continuation lines. */
  value: string;
  /** Document line of the keyword (e.g. the line holding `msgid`). */
  keywordLine: number;
  /** Document lines (zero-based) that hold quoted content for this field. */
  valueLines: number[];
}

export interface PoEntry {
  startLine: number;
  endLine: number;
  obsolete: boolean;
  flags: string[];
  /** Document line of the `#,` flags comment, or -1 if absent. */
  flagsLine: number;
  references: PoReference[];
  msgctxt?: PoString;
  msgid?: PoString;
  msgidPlural?: PoString;
  /** Keyed by plural index; index 0 is a plain `msgstr`. */
  msgstr: Map<number, PoString>;
}

const KEYWORD_RE = /^(msgctxt|msgid_plural|msgid|msgstr)(?:\[(\d+)\])?\s/;

/**
 * Extract the content between the first and last double-quote on a line,
 * honoring backslash escapes. Returns null if there is no quoted segment.
 */
function extractQuoted(
  line: string
): { content: string; startCol: number; endCol: number } | null {
  const start = line.indexOf('"');
  if (start === -1) {
    return null;
  }
  let i = start + 1;
  let content = '';
  let end = -1;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\' && i + 1 < line.length) {
      content += line[i] + line[i + 1];
      i += 2;
      continue;
    }
    if (ch === '"') {
      end = i;
      break;
    }
    content += ch;
    i += 1;
  }
  if (end === -1) {
    // Unterminated string: take the rest of the line.
    end = line.length;
  }
  return { content, startCol: start, endCol: end + 1 };
}

export function parsePo(text: string): PoEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: PoEntry[] = [];

  let current = blankEntry(0);
  let started = false;
  // Tracks which keyword the following bare "string" continuation lines belong to.
  let lastField: PoString | null = null;

  const flush = (endLine: number) => {
    if (started) {
      current.endLine = endLine;
      entries.push(current);
    }
  };

  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n];
    let line = raw;
    let obsolete = false;

    // Obsolete entries are prefixed with `#~`.
    const obsMatch = /^#~\s?/.exec(line);
    if (obsMatch) {
      obsolete = true;
      line = line.slice(obsMatch[0].length);
    }

    const trimmed = line.trim();

    // Blank line ends the current entry.
    if (trimmed === '' && !obsolete) {
      if (started) {
        flush(n - 1);
        current = blankEntry(n + 1);
        started = false;
        lastField = null;
      }
      continue;
    }

    if (!started) {
      started = true;
      current = blankEntry(n);
    }
    current.obsolete = current.obsolete || obsolete;

    // Comments (only on non-obsolete original lines; obsolete strips `#~`).
    if (!obsolete && line.startsWith('#')) {
      lastField = null;
      if (line.startsWith('#,')) {
        current.flagsLine = n;
        current.flags = line
          .slice(2)
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean);
      } else if (line.startsWith('#:')) {
        parseReferences(line, n, current.references);
      }
      continue;
    }

    const kwMatch = KEYWORD_RE.exec(line);
    if (kwMatch) {
      const keyword = kwMatch[1];
      const quoted = extractQuoted(line);
      const field: PoString = {
        value: quoted ? quoted.content : '',
        keywordLine: n,
        valueLines: quoted ? [n] : [],
      };
      switch (keyword) {
        case 'msgctxt':
          current.msgctxt = field;
          break;
        case 'msgid':
          current.msgid = field;
          break;
        case 'msgid_plural':
          current.msgidPlural = field;
          break;
        case 'msgstr': {
          const index = kwMatch[2] ? parseInt(kwMatch[2], 10) : 0;
          current.msgstr.set(index, field);
          break;
        }
      }
      lastField = field;
      continue;
    }

    // Continuation line: a bare quoted string belonging to the last field.
    if (trimmed.startsWith('"') && lastField) {
      const quoted = extractQuoted(line);
      if (quoted) {
        lastField.value += quoted.content;
        lastField.valueLines.push(n);
      }
    }
  }

  flush(lines.length - 1);
  return entries;
}

function parseReferences(line: string, docLine: number, out: PoReference[]): void {
  // `#: path/to/file.py:142 other/file.xml:7`
  const body = line.slice(2);
  const re = /(\S+?):(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const startCol = 2 + m.index;
    out.push({
      file: m[1],
      line: parseInt(m[2], 10),
      docLine,
      startCol,
      endCol: startCol + m[0].length,
    });
  }
}

function blankEntry(startLine: number): PoEntry {
  return {
    startLine,
    endLine: startLine,
    obsolete: false,
    flags: [],
    flagsLine: -1,
    references: [],
    msgstr: new Map(),
  };
}
