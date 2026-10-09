import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReceipt,
  documentKind,
  formatDateLong,
  formatDocument,
  nextReceiptNumber,
  receiptPlainText,
  todayISO,
  validateReceipt,
} from '../src/recibo.js';

const NBSP = '\u00a0';
const sample = {
  recebedorNome: 'João Exemplo',
  recebedorDoc: '12345678909',
  pagadorNome: 'Maria Exemplo',
  pagadorDoc: '',
  valor: '1.234,56',
  referente: 'aluguel de outubro de 2026.',
  forma: 'pix',
  cidade: 'Limeira',
  data: '2026-10-08',
  numero: '001',
  observacoes: '',
};

test('máscara de CPF enquanto digita', () => {
  assert.equal(formatDocument('123'), '123');
  assert.equal(formatDocument('1234'), '123.4');
  assert.equal(formatDocument('1234567'), '123.456.7');
  assert.equal(formatDocument('12345678909'), '123.456.789-09');
  assert.equal(formatDocument('123.456.789-09'), '123.456.789-09');
  assert.equal(documentKind('123.456.789-09'), 'CPF');
});

test('máscara de CNPJ, inclusive alfanumérico', () => {
  assert.equal(formatDocument('123456789012'), '12.345.678/9012');
  assert.equal(formatDocument('12345678000195'), '12.345.678/0001-95');
  assert.equal(formatDocument('12.345.678/0001-95999'), '12.345.678/0001-95');
  assert.equal(formatDocument('12abc34501de35'), '12.ABC.345/01DE-35');
  assert.equal(documentKind('12.345.678/0001-95'), 'CNPJ');
  assert.equal(documentKind('1234'), 'CPF/CNPJ');
  assert.equal(formatDocument(''), '');
});

test('data por extenso', () => {
  assert.equal(formatDateLong('2026-10-08'), '8 de outubro de 2026');
  assert.equal(formatDateLong('2026-03-01'), '1º de março de 2026');
  assert.equal(formatDateLong('2024-02-29'), '29 de fevereiro de 2024');
  assert.equal(formatDateLong('2026-02-30'), '');
  assert.equal(formatDateLong('08/10/2026'), '');
  assert.equal(todayISO(new Date(2026, 9, 8, 23, 59)), '2026-10-08');
});

test('texto do recibo', () => {
  const receipt = buildReceipt(sample);
  assert.equal(
    receiptPlainText(receipt),
    `Recebi de Maria Exemplo, a importância de R$${NBSP}1.234,56 (mil duzentos e trinta e quatro reais e cinquenta e seis centavos), referente a aluguel de outubro de 2026.`,
  );
  assert.equal(receipt.amount, `R$${NBSP}1.234,56`);
  assert.equal(receipt.number, '001');
  assert.equal(receipt.payment, 'Forma de pagamento: Pix.');
  assert.equal(receipt.placeDate, 'Limeira, 8 de outubro de 2026.');
  assert.equal(receipt.closing, 'Para maior clareza, firmo o presente recibo.');
  assert.deepEqual(receipt.signer, { name: { text: 'João Exemplo' }, document: 'CPF: 123.456.789-09' });
  assert.ok(receipt.body.some((part) => part.strong && part.text === 'Maria Exemplo'));
});

test('empresa recebedora (CNPJ) fala no plural; documento do pagador aparece', () => {
  const receipt = buildReceipt({ ...sample, recebedorDoc: '12345678000195', pagadorDoc: '98765432100', forma: 'outro', formaOutro: 'cheque', cidade: '' });
  assert.match(receiptPlainText(receipt), /^Recebemos de Maria Exemplo, CPF 987\.654\.321-00, a importância/);
  assert.equal(receipt.closing, 'Para maior clareza, firmamos o presente recibo.');
  assert.equal(receipt.payment, 'Forma de pagamento: cheque.');
  assert.equal(receipt.placeDate, '8 de outubro de 2026.');
  assert.equal(receipt.signer.document, 'CNPJ: 12.345.678/0001-95');
});

test('pré-visualização mostra marcadores nos campos vazios', () => {
  const receipt = buildReceipt({ forma: 'pix', data: '2026-10-08' });
  const text = receiptPlainText(receipt);
  assert.match(text, /\[nome de quem paga\]/);
  assert.match(text, /\[valor\]/);
  assert.match(text, /\[descrição do pagamento\]/);
  assert.equal(receipt.signer.name.placeholder, true);
  assert.equal(receipt.amount, 'R$ [valor]');
});

test('nomes com HTML ficam como texto puro', () => {
  const receipt = buildReceipt({ ...sample, pagadorNome: '<img src=x onerror=alert(1)>' });
  assert.ok(receipt.body.some((part) => part.text === '<img src=x onerror=alert(1)>'));
});

test('numeração do próximo recibo', () => {
  assert.equal(nextReceiptNumber('001'), '002');
  assert.equal(nextReceiptNumber('099'), '100');
  assert.equal(nextReceiptNumber('2026-015'), '2026-016');
  assert.equal(nextReceiptNumber('A9'), 'A10');
  assert.equal(nextReceiptNumber('sem número'), '');
  assert.equal(nextReceiptNumber(''), '');
});

test('validação antes de imprimir', () => {
  assert.deepEqual(validateReceipt(sample), []);
  const fields = (data) => validateReceipt(data).map((e) => e.field);
  assert.deepEqual(fields({}), ['recebedorNome', 'pagadorNome', 'valor', 'referente', 'data']);
  assert.deepEqual(fields({ ...sample, valor: '0,00' }), ['valor']);
  assert.deepEqual(fields({ ...sample, valor: '-3' }), ['valor']);
  assert.deepEqual(fields({ ...sample, forma: 'outro', formaOutro: ' ' }), ['formaOutro']);
  assert.deepEqual(fields({ ...sample, data: '2026-13-01' }), ['data']);
});
