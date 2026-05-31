const test = require('node:test');
const assert = require('node:assert');
const { parsePo } = require('../out/parser.js');

test('parsea entradas básicas con msgid y msgstr', () => {
  const entries = parsePo('msgid "Hello"\nmsgstr "Hola"\n');
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].msgid.value, 'Hello');
  assert.strictEqual(entries[0].msgstr.get(0).value, 'Hola');
});

test('separa entradas por línea en blanco', () => {
  const entries = parsePo('msgid "A"\nmsgstr "a"\n\nmsgid "B"\nmsgstr "b"\n');
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[1].msgid.value, 'B');
});

test('concatena líneas de continuación', () => {
  const entries = parsePo('msgid ""\n"parte1 "\n"parte2"\nmsgstr "x"\n');
  assert.strictEqual(entries[0].msgid.value, 'parte1 parte2');
});

test('captura flags incluyendo fuzzy', () => {
  const entries = parsePo('#, fuzzy, python-format\nmsgid "A"\nmsgstr "a"\n');
  assert.deepStrictEqual(entries[0].flags, ['fuzzy', 'python-format']);
  assert.ok(entries[0].flagsLine >= 0);
});

test('parsea plurales', () => {
  const entries = parsePo(
    'msgid "{n} item"\nmsgid_plural "{n} items"\nmsgstr[0] "x"\nmsgstr[1] "y"\n'
  );
  assert.strictEqual(entries[0].msgidPlural.value, '{n} items');
  assert.strictEqual(entries[0].msgstr.get(0).value, 'x');
  assert.strictEqual(entries[0].msgstr.get(1).value, 'y');
});

test('extrae referencias #: archivo:línea', () => {
  const entries = parsePo('#: addons/sale/models/sale.py:142\nmsgid "A"\nmsgstr "a"\n');
  assert.strictEqual(entries[0].references.length, 1);
  assert.strictEqual(entries[0].references[0].file, 'addons/sale/models/sale.py');
  assert.strictEqual(entries[0].references[0].line, 142);
});

test('marca entradas obsoletas', () => {
  const entries = parsePo('#~ msgid "old"\n#~ msgstr "viejo"\n');
  assert.strictEqual(entries[0].obsolete, true);
});

test('respeta comillas escapadas dentro del string', () => {
  const entries = parsePo('msgid "dice \\"hola\\""\nmsgstr "x"\n');
  assert.strictEqual(entries[0].msgid.value, 'dice \\"hola\\"');
});
