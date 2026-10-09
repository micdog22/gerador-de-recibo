// Valor em reais por extenso, em português do Brasil.
// Usa só aritmética de strings e inteiros pequenos: nada de ponto flutuante.

export const MAX_INTEGER_DIGITS = 15; // até 999 trilhões

const UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
// Índice = posição do grupo de três dígitos, contando da direita (0 = unidades).
const SCALES = [null, ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões'], ['trilhão', 'trilhões']];
const NBSP = '\u00a0';

/** Número de 1 a 999 por extenso (masculino): 100 = "cem", 101 = "cento e um". */
export function hundredsToWords(n) {
  if (!Number.isInteger(n) || n < 1 || n > 999) throw new RangeError('Use um inteiro entre 1 e 999.');
  if (n === 100) return 'cem';
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);
  if (rest > 0 && rest < 20) parts.push(UNITS[rest]);
  if (rest >= 20) {
    const tens = TENS[Math.floor(rest / 10)];
    parts.push(rest % 10 === 0 ? tens : `${tens} e ${UNITS[rest % 10]}`);
  }
  return parts.join(' e ');
}

/** Inteiro (string de dígitos) por extenso: "1250" → "mil duzentos e cinquenta". */
export function integerToWords(digits) {
  const clean = String(digits).replace(/^0+(?=\d)/, '');
  if (!/^\d+$/.test(clean) || clean.length > MAX_INTEGER_DIGITS) throw new RangeError('Inteiro inválido ou acima de 999 trilhões.');
  if (clean === '0') return 'zero';
  const padded = clean.padStart(Math.ceil(clean.length / 3) * 3, '0');
  const groups = [];
  for (let i = 0; i < padded.length; i += 3) groups.push(Number(padded.slice(i, i + 3)));

  const pieces = [];
  groups.forEach((value, index) => {
    if (value === 0) return;
    const scale = groups.length - 1 - index;
    let text;
    if (scale === 0) text = hundredsToWords(value);
    else if (scale === 1) text = value === 1 ? 'mil' : `${hundredsToWords(value)} mil`; // nunca "um mil"
    else text = `${hundredsToWords(value)} ${SCALES[scale][value === 1 ? 0 : 1]}`;
    pieces.push({ text, value });
  });

  // Entre grupos, "e" só antes de um grupo menor que 100 ou de uma centena redonda:
  // 1.200 = "mil e duzentos", 1.250 = "mil duzentos e cinquenta".
  return pieces.reduce((acc, piece, index) => {
    if (index === 0) return piece.text;
    const joiner = piece.value < 100 || piece.value % 100 === 0 ? ' e ' : ' ';
    return acc + joiner + piece.text;
  }, '');
}

/**
 * Interpreta um valor em reais: "1.234,56", "1234.56", "R$ 10", "0,5".
 * Retorna { ok: true, reais: '1234', centavos: 56 } ou { ok: false, error: 'mensagem' }.
 */
export function parseAmount(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { ok: false, error: 'Valor inválido.' };
    if (!Number.isSafeInteger(Math.round(input * 100))) return { ok: false, error: 'Número grande demais para ser exato: informe o valor como texto, por exemplo "100.000.000.000.000,00".' };
    return parseAmount(input.toFixed(2));
  }
  if (typeof input !== 'string') return { ok: false, error: 'Valor inválido.' };
  let s = input.replace(/R\$/gi, '').replace(/[\s\u00a0]/g, '');
  if (s === '') return { ok: false, error: 'Informe o valor.' };
  if (s.startsWith('-')) return { ok: false, error: 'O valor não pode ser negativo.' };
  if (s.startsWith('+')) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return { ok: false, error: 'Valor inválido. Use o formato 1.234,56.' };

  const grouped = (text, sep) => {
    const groups = text.split(sep);
    return /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((g) => /^\d{3}$/.test(g));
  };
  const invalid = { ok: false, error: 'Valor inválido. Use o formato 1.234,56.' };
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let int = s;
  let frac = '';
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const groupSep = decimalSep === ',' ? '.' : ',';
    const at = s.lastIndexOf(decimalSep);
    int = s.slice(0, at);
    frac = s.slice(at + 1);
    if (int.includes(decimalSep) || !grouped(int, groupSep)) return invalid;
    int = int.split(groupSep).join('');
  } else if (lastComma !== -1) {
    const parts = s.split(',');
    if (parts.length !== 2) return invalid;
    [int, frac] = parts;
  } else if (lastDot !== -1) {
    const parts = s.split('.');
    if (parts.length > 2) {
      if (!grouped(s, '.')) return invalid;
      int = parts.join('');
    } else if (parts[0] !== '0' && grouped(s, '.')) {
      int = parts.join(''); // "1.234" = mil duzentos e trinta e quatro
    } else {
      [int, frac] = parts;
    }
  }
  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return invalid;
  if (frac.length > 2) return { ok: false, error: 'Use no máximo duas casas decimais (centavos).' };
  const reais = int.replace(/^0+/, '') || '0';
  if (reais.length > MAX_INTEGER_DIGITS) return { ok: false, error: 'Valor acima do limite de 999 trilhões.' };
  return { ok: true, reais, centavos: Number(frac.padEnd(2, '0')) };
}

/**
 * Valor por extenso: "1.234,56" → "mil duzentos e trinta e quatro reais e cinquenta e seis centavos".
 * Aceita texto, número ou o resultado de parseAmount. Lança RangeError para entradas inválidas.
 */
export function amountToWords(input) {
  const amount = typeof input === 'object' && input !== null ? input : parseAmount(input);
  if (!amount.ok) throw new RangeError(amount.error);
  const parts = [];
  if (amount.reais !== '0') {
    // Milhões, bilhões e trilhões exatos pedem "de": "um milhão de reais".
    const exactMillions = amount.reais.length > 6 && amount.reais.endsWith('000000');
    parts.push(`${integerToWords(amount.reais)}${exactMillions ? ' de' : ''} ${amount.reais === '1' ? 'real' : 'reais'}`);
  }
  if (amount.centavos > 0) {
    parts.push(`${hundredsToWords(amount.centavos)} ${amount.centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  return parts.length === 0 ? 'zero reais' : parts.join(' e ');
}

/** "R$ 1.234,56" (com espaço não separável entre o símbolo e o número). */
export function formatAmount(input) {
  const amount = typeof input === 'object' && input !== null ? input : parseAmount(input);
  if (!amount.ok) throw new RangeError(amount.error);
  const reais = amount.reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$${NBSP}${reais},${String(amount.centavos).padStart(2, '0')}`;
}

export function isZero(amount) {
  return amount.ok && amount.reais === '0' && amount.centavos === 0;
}
