const test = require('node:test');
const assert = require('node:assert');
const {
  extractHtmlTags,
  diffHtmlTags,
  displayTag,
} = require('../out/htmlTags.js');

test('detecta etiqueta de cierre faltante', () => {
  const diff = diffHtmlTags('Press <b>Save</b>', 'Presiona <b>Guardar');
  assert.deepStrictEqual(diff.missing, ['/b']);
  assert.deepStrictEqual(diff.extra, []);
});

test('detecta etiqueta sobrante', () => {
  const diff = diffHtmlTags('Plain', 'Con <i>cursiva</i>');
  assert.deepStrictEqual(diff.missing, []);
  assert.deepStrictEqual(diff.extra.sort(), ['/i', 'i']);
});

test('ignora atributos al comparar', () => {
  const diff = diffHtmlTags(
    'Click <a href="/a">x</a>',
    'Clic <a href="/b">x</a>'
  );
  assert.strictEqual(diff.missing.length, 0);
  assert.strictEqual(diff.extra.length, 0);
});

test('maneja etiquetas auto-cerradas', () => {
  const tags = extractHtmlTags('Line<br/>break').map((t) => t.key);
  assert.deepStrictEqual(tags, ['br/']);
});

test('displayTag reconstruye la etiqueta legible', () => {
  assert.strictEqual(displayTag('a'), '<a>');
  assert.strictEqual(displayTag('/a'), '</a>');
  assert.strictEqual(displayTag('br/'), '<br/>');
});
