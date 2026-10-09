// Montagem do texto do recibo. Módulo puro (sem DOM): a página só desenha o que sai daqui.
import { amountToWords, formatAmount, isZero, parseAmount } from './extenso.js';

export const PAYMENT_METHODS = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência bancária',
  cartao: 'Cartão',
  boleto: 'Boleto',
  outro: 'Outro',
};

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * Máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) enquanto a pessoa digita.
 * Só formata, não valida. Aceita letras para o CNPJ alfanumérico.
 */
export function formatDocument(raw) {
  const clean = String(raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
  if (/^\d{0,11}$/.test(clean)) {
    const d = clean;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  const c = clean;
  let out = c.slice(0, 2);
  if (c.length > 2) out += `.${c.slice(2, 5)}`;
  if (c.length > 5) out += `.${c.slice(5, 8)}`;
  if (c.length > 8) out += `/${c.slice(8, 12)}`;
  if (c.length > 12) out += `-${c.slice(12, 14)}`;
  return out;
}

/** "CPF", "CNPJ" ou "CPF/CNPJ" (quando ainda incompleto), pelo número de caracteres. */
export function documentKind(raw) {
  const clean = String(raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (/^\d{11}$/.test(clean)) return 'CPF';
  if (clean.length === 14) return 'CNPJ';
  return 'CPF/CNPJ';
}

/** "2026-10-08" → "8 de outubro de 2026"; o dia 1 vira "1º". */
export function formatDateLong(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!match) return '';
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${day === 1 ? '1º' : day} de ${MONTHS[month - 1]} de ${year}`;
}

/** Data de hoje no formato do campo de data (AAAA-MM-DD), no fuso de quem usa. */
export function todayISO(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

/** Lista de problemas que impedem a impressão: [{ field, message }]. */
export function validateReceipt(data) {
  const errors = [];
  if (!clean(data.recebedorNome)) errors.push({ field: 'recebedorNome', message: 'Informe o nome de quem recebe.' });
  if (!clean(data.pagadorNome)) errors.push({ field: 'pagadorNome', message: 'Informe o nome de quem paga.' });
  const amount = parseAmount(data.valor ?? '');
  if (!amount.ok) errors.push({ field: 'valor', message: amount.error });
  else if (isZero(amount)) errors.push({ field: 'valor', message: 'O valor precisa ser maior que zero.' });
  if (!clean(data.referente)) errors.push({ field: 'referente', message: 'Diga a que o pagamento se refere.' });
  if (data.forma === 'outro' && !clean(data.formaOutro)) errors.push({ field: 'formaOutro', message: 'Descreva a forma de pagamento.' });
  if (!formatDateLong(data.data)) errors.push({ field: 'data', message: 'Informe uma data válida.' });
  return errors;
}

/**
 * Conteúdo do recibo em trechos { text, strong?, placeholder? }.
 * Campos vazios viram marcadores entre colchetes para a pré-visualização.
 */
export function buildReceipt(data) {
  const slot = (value, label, extra = {}) => (clean(value) ? { text: clean(value), ...extra } : { text: `[${label}]`, placeholder: true });
  const amount = parseAmount(data.valor ?? '');
  const validAmount = amount.ok && !isZero(amount);
  const company = documentKind(data.recebedorDoc) === 'CNPJ';
  const payerDoc = clean(data.pagadorDoc);
  const receiverDoc = clean(data.recebedorDoc);
  const reference = clean(data.referente).replace(/[.;,\s]+$/, '');

  const body = [
    { text: `${company ? 'Recebemos' : 'Recebi'} de ` },
    slot(data.pagadorNome, 'nome de quem paga', { strong: true }),
    ...(payerDoc ? [{ text: `, ${documentKind(payerDoc)} ${formatDocument(payerDoc)}` }] : []),
    { text: ', a importância de ' },
    validAmount ? { text: formatAmount(amount), strong: true } : { text: '[valor]', placeholder: true },
    ...(validAmount ? [{ text: ` (${amountToWords(amount)})` }] : []),
    { text: ', referente a ' },
    slot(reference, 'descrição do pagamento'),
    { text: '.' },
  ];

  const method = data.forma === 'outro' ? clean(data.formaOutro) : PAYMENT_METHODS[data.forma] || '';
  const date = formatDateLong(data.data);
  const city = clean(data.cidade);
  return {
    number: clean(data.numero),
    amount: validAmount ? formatAmount(amount) : 'R$ [valor]',
    body,
    payment: method ? `Forma de pagamento: ${method}.` : '',
    notes: clean(data.observacoes),
    closing: `Para maior clareza, ${company ? 'firmamos' : 'firmo'} o presente recibo.`,
    placeDate: date ? `${city ? `${city}, ` : ''}${date}.` : '',
    signer: {
      name: slot(data.recebedorNome, 'nome de quem recebe'),
      document: receiverDoc ? `${documentKind(receiverDoc)}: ${formatDocument(receiverDoc)}` : '',
    },
  };
}

/** Próximo número de recibo: "001" → "002", "2026-015" → "2026-016"; vazio se não terminar em dígitos. */
export function nextReceiptNumber(current) {
  const match = /^(.*?)(\d+)$/.exec(clean(current));
  if (!match) return '';
  const [, prefix, digits] = match;
  return prefix + (BigInt(digits) + 1n).toString().padStart(digits.length, '0');
}

/** Texto corrido do recibo (útil para conferência e testes). */
export function receiptPlainText(receipt) {
  return receipt.body.map((part) => part.text).join('');
}
