const test = require('node:test');
const assert = require('node:assert');
const {
  extractPlaceholders,
  diffPlaceholders,
} = require('../out/placeholders.js');

test('detecta placeholder nombrado faltante', () => {
  const diff = diffPlaceholders('Hello %(name)s', 'Hola');
  assert.deepStrictEqual(diff.missing, ['%(name)s']);
  assert.deepStrictEqual(diff.extra, []);
});

test('detecta placeholder sobrante', () => {
  const diff = diffPlaceholders('Done', 'Hecho %s');
  assert.deepStrictEqual(diff.missing, []);
  assert.deepStrictEqual(diff.extra, ['%s']);
});

test('placeholders coincidentes no producen diferencias', () => {
  const diff = diffPlaceholders('Hi %(u)s, %d msgs', 'Hola %(u)s, %d msgs');
  assert.strictEqual(diff.missing.length, 0);
  assert.strictEqual(diff.extra.length, 0);
});

test('ignora %% (porcentaje escapado)', () => {
  const tags = extractPlaceholders('100%% done %s');
  assert.deepStrictEqual(tags.map((t) => t.key), ['%s']);
});

test('detecta placeholders de tipo brace', () => {
  const diff = diffPlaceholders('Total: {amount}', 'Total:');
  assert.deepStrictEqual(diff.missing, ['{amount}']);
});

test('compara por multiconjunto (cantidad)', () => {
  const diff = diffPlaceholders('%s %s', '%s');
  assert.deepStrictEqual(diff.missing, ['%s']);
});
