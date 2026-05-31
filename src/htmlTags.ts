/**
 * HTML tag consistency between msgid and msgstr.
 *
 * A translation must keep the same HTML structure as the original: if the
 * source has `<a>...</a>` the translation must too, or Odoo renders broken
 * markup. We compare the *multiset of tag tokens* (tag name + open/close/self),
 * ignoring attributes — a translator may legitimately keep `href` untouched,
 * and attribute order/values are not our concern here.
 */

export interface HtmlTag {
  /** Normalized comparison key: `a`, `/a`, `br/`. */
  key: string;
}

const TAG_RE = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:_.-]*)(?:[^>]*?)(\/?)\s*>/g;

export function extractHtmlTags(text: string): HtmlTag[] {
  const tags: HtmlTag[] = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text)) !== null) {
    const closing = m[1] === '/';
    const selfClosing = m[3] === '/';
    const name = m[2].toLowerCase();
    let key = name;
    if (closing) {
      key = `/${name}`;
    } else if (selfClosing) {
      key = `${name}/`;
    }
    tags.push({ key });
  }
  return tags;
}

function counts(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of extractHtmlTags(text)) {
    map.set(t.key, (map.get(t.key) ?? 0) + 1);
  }
  return map;
}

export interface HtmlDiff {
  missing: string[];
  extra: string[];
}

export function diffHtmlTags(msgid: string, msgstr: string): HtmlDiff {
  const a = counts(msgid);
  const b = counts(msgstr);
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

/** Turn a comparison key back into a human-readable tag: `/a` -> `</a>`. */
export function displayTag(key: string): string {
  if (key.startsWith('/')) {
    return `</${key.slice(1)}>`;
  }
  if (key.endsWith('/')) {
    return `<${key.slice(0, -1)}/>`;
  }
  return `<${key}>`;
}
