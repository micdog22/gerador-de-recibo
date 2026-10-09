import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountToWords, formatAmount, hundredsToWords, integerToWords, parseAmount } from '../src/extenso.js';

const NBSP = '\u00a0';

const TABLE = [
  ['0,01', 'um centavo'],
  ['0,50', 'cinquenta centavos'],
  ['1,00', 'um real'],
  ['1,01', 'um real e um centavo'],
  ['2,00', 'dois reais'],
  ['10', 'dez reais'],
  ['11', 'onze reais'],
  ['12', 'doze reais'],
  ['13', 'treze reais'],
  ['14', 'quatorze reais'],
  ['15', 'quinze reais'],
  ['16', 'dezesseis reais'],
  ['17', 'dezessete reais'],
  ['18', 'dezoito reais'],
  ['19', 'dezenove reais'],
  ['20', 'vinte reais'],
  ['21', 'vinte e um reais'],
  ['99', 'noventa e nove reais'],
  ['100', 'cem reais'],
  ['101', 'cento e um reais'],
  ['110', 'cento e dez reais'],
  ['115', 'cento e quinze reais'],
  ['199', 'cento e noventa e nove reais'],
  ['200', 'duzentos reais'],
  ['999', 'novecentos e noventa e nove reais'],
  ['1.000', 'mil reais'],
  ['1.001', 'mil e um reais'],
  ['1.010', 'mil e dez reais'],
  ['1.099', 'mil e noventa e nove reais'],
  ['1.100', 'mil e cem reais'],
  ['1.200', 'mil e duzentos reais'],
  ['1.250', 'mil duzentos e cinquenta reais'],
  ['1.999', 'mil novecentos e noventa e nove reais'],
  ['2.000', 'dois mil reais'],
  ['10.000', 'dez mil reais'],
  ['21.000', 'vinte e um mil reais'],
  ['100.000', 'cem mil reais'],
  ['101.000', 'cento e um mil reais'],
  ['999.999', 'novecentos e noventa e nove mil novecentos e noventa e nove reais'],
  ['1.000.000', 'um milhão de reais'],
  ['1.000.001', 'um milhão e um reais'],
  ['1.001.000', 'um milhão e mil reais'],
  ['1.100.000', 'um milhão e cem mil reais'],
  ['1.500.000', 'um milhão e quinhentos mil reais'],
  ['2.300.000', 'dois milhões e trezentos mil reais'],
  ['2.000.000,10', 'dois milhões de reais e dez centavos'],
  ['1.000.000.000', 'um bilhão de reais'],
  ['2.000.000.000', 'dois bilhões de reais'],
  ['3.500.000.000', 'três bilhões e quinhentos milhões de reais'],
  ['1.000.100.000', 'um bilhão e cem mil reais'],
  ['1.234.567,89', 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos'],
  ['1.000.000.000.000', 'um trilhão de reais'],
  ['0,00', 'zero reais'],
];

for (const [input, expected] of TABLE) {
  test(`por extenso: ${input}`, () => {
    assert.equal(amountToWords(input), expected);
  });
}

test('limite de 999 trilhões', () => {
  assert.equal(
    amountToWords('999.999.999.999.999,99'),
    'novecentos e noventa e nove trilhões novecentos e noventa e nove bilhões novecentos e noventa e nove milhões '
      + 'novecentos e noventa e nove mil novecentos e noventa e nove reais e noventa e nove centavos',
  );
  assert.equal(parseAmount('1.000.000.000.000.000').ok, false);
  assert.throws(() => amountToWords('1000000000000000'), RangeError);
});

test('leitura do valor digitado', () => {
  assert.deepEqual(parseAmount('1.234,56'), { ok: true, reais: '1234', centavos: 56 });
  assert.deepEqual(parseAmount('1234.56'), { ok: true, reais: '1234', centavos: 56 });
  assert.deepEqual(parseAmount('R$ 10'), { ok: true, reais: '10', centavos: 0 });
  assert.deepEqual(parseAmount(`R$${NBSP}1.000,5`), { ok: true, reais: '1000', centavos: 50 });
  assert.deepEqual(parseAmount('1.234'), { ok: true, reais: '1234', centavos: 0 });
  assert.deepEqual(parseAmount('0.5'), { ok: true, reais: '0', centavos: 50 });
  assert.deepEqual(parseAmount(',99'), { ok: true, reais: '0', centavos: 99 });
  assert.deepEqual(parseAmount('007'), { ok: true, reais: '7', centavos: 0 });
  assert.deepEqual(parseAmount('1,234.56'), { ok: true, reais: '1234', centavos: 56 });
  assert.deepEqual(parseAmount(1234.5), { ok: true, reais: '1234', centavos: 50 });
});

test('valores inválidos', () => {
  for (const input of ['', '   ', 'abc', '12a', '1,2,3', '1.23,45', '1.2.3', 'R$', '.', '1e5', null, undefined, NaN]) {
    const result = parseAmount(input);
    assert.equal(result.ok, false, `deveria rejeitar ${String(input)}`);
    assert.ok(result.error.length > 0);
  }
  assert.match(parseAmount('').error, /Informe o valor/);
  assert.match(parseAmount('-10').error, /negativo/);
  assert.match(parseAmount('10,555').error, /duas casas/);
  assert.throws(() => amountToWords('abc'), RangeError);
});

test('sem erro de ponto flutuante', () => {
  assert.equal(amountToWords('0,29'), 'vinte e nove centavos');
  assert.equal(amountToWords('1.000.000.000.000,07'), 'um trilhão de reais e sete centavos');
  assert.equal(amountToWords(0.1 + 0.2), 'trinta centavos');
});

test('peças menores', () => {
  assert.equal(hundredsToWords(100), 'cem');
  assert.equal(hundredsToWords(345), 'trezentos e quarenta e cinco');
  assert.equal(integerToWords('0'), 'zero');
  assert.equal(integerToWords('000201000'), 'duzentos e um mil');
  assert.throws(() => hundredsToWords(1000), RangeError);
});

test('valor formatado como R$ 1.234,56', () => {
  assert.equal(formatAmount('1234,56'), `R$${NBSP}1.234,56`);
  assert.equal(formatAmount('0,5'), `R$${NBSP}0,50`);
  assert.equal(formatAmount('1000000'), `R$${NBSP}1.000.000,00`);
  assert.throws(() => formatAmount('x'), RangeError);
});
