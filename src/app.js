import { amountToWords, formatAmount, isZero, parseAmount } from './extenso.js';
import { buildReceipt, formatDocument, nextReceiptNumber, todayISO, validateReceipt } from './recibo.js';

const STORAGE_KEY = 'gerador-de-recibo:recebedor';
const FIELDS = ['recebedorNome', 'recebedorDoc', 'pagadorNome', 'pagadorDoc', 'valor', 'referente', 'forma', 'formaOutro', 'numero', 'data', 'cidade', 'observacoes'];
const VALIDATED = ['recebedorNome', 'pagadorNome', 'valor', 'referente', 'formaOutro', 'data'];

const form = document.getElementById('recibo-form');
const sheet = document.getElementById('sheet');
const frame = document.getElementById('preview-frame');
const status = document.getElementById('status');
const remember = document.getElementById('lembrar');
let attemptedPrint = false;
let fits = true;

const input = (name) => form.elements[name];

function readForm() {
  const data = {};
  for (const name of FIELDS) data[name] = input(name).value;
  data.duasVias = input('duasVias').checked;
  return data;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = `status${kind ? ` is-${kind}` : ''}`;
}

/* ---------- Pré-visualização ---------- */

function renderReceipt(receipt, via) {
  const article = el('article', 'receipt');
  const head = el('header', 'receipt-head');
  const titleBox = el('div');
  titleBox.append(el('p', 'receipt-title', 'RECIBO'));
  if (receipt.number) titleBox.append(el('p', 'receipt-number', `Nº ${receipt.number}`));
  head.append(titleBox, el('p', 'receipt-amount', receipt.amount));
  article.append(head);
  if (via) article.append(el('p', 'receipt-via', via));

  const body = el('p', 'receipt-body');
  for (const part of receipt.body) {
    if (part.placeholder) body.append(el('span', 'placeholder', part.text));
    else if (part.strong) body.append(el('strong', '', part.text));
    else body.append(document.createTextNode(part.text));
  }
  article.append(body);
  if (receipt.payment) article.append(el('p', '', receipt.payment));
  if (receipt.notes) article.append(el('p', 'receipt-notes', `Observações: ${receipt.notes}`));
  article.append(el('p', '', receipt.closing));
  if (receipt.placeDate) article.append(el('p', 'receipt-date', receipt.placeDate));

  const signature = el('div', 'signature');
  signature.append(el('span', 'line'));
  signature.append(el('p', receipt.signer.name.placeholder ? 'placeholder' : '', receipt.signer.name.text));
  if (receipt.signer.document) signature.append(el('p', '', receipt.signer.document));
  article.append(signature);
  return article;
}

// Em duas vias, cada recibo tem meia folha: diminui a letra até o texto caber.
function fitReceipts() {
  const receipts = [...sheet.querySelectorAll('.receipt')];
  for (const receipt of receipts) receipt.style.fontSize = '';
  if (!sheet.classList.contains('two')) return true;
  const overflows = () => receipts.some((receipt) => receipt.scrollHeight > receipt.clientHeight + 1);
  for (let size = 11; overflows() && size >= 8; size -= 0.5) {
    for (const receipt of receipts) receipt.style.fontSize = `${size}pt`;
  }
  return !overflows();
}

function fitPreview() {
  const pageWidth = sheet.offsetWidth;
  if (!pageWidth) return;
  const scale = Math.min(1, frame.clientWidth / pageWidth);
  sheet.style.transform = `scale(${scale})`;
  frame.style.height = `${Math.ceil(sheet.offsetHeight * scale)}px`;
}

function updateAmountHint(value) {
  const hint = document.getElementById('valor-extenso');
  const amount = parseAmount(value);
  hint.textContent = value.trim() && amount.ok && !isZero(amount) ? `${formatAmount(amount)}: ${amountToWords(amount)}.` : '';
}

function render() {
  const data = readForm();
  const receipt = buildReceipt(data);
  sheet.classList.toggle('two', data.duasVias);
  if (data.duasVias) {
    const cut = el('div', 'cut-line', '✂ corte aqui');
    cut.setAttribute('aria-hidden', 'true');
    sheet.replaceChildren(renderReceipt(receipt, '1ª via'), cut, renderReceipt(receipt, '2ª via'));
  } else {
    sheet.replaceChildren(renderReceipt(receipt));
  }
  document.getElementById('formaOutro-campo').hidden = data.forma !== 'outro';
  updateAmountHint(data.valor);
  fits = fitReceipts();
  document.getElementById('duasVias-aviso').textContent = fits
    ? ''
    : 'O texto ficou longo demais para duas vias na mesma folha. Encurte as observações ou desmarque esta opção.';
  fitPreview();
  if (attemptedPrint) showErrors(validateReceipt(data));
}

function showErrors(errors) {
  for (const name of VALIDATED) {
    const error = errors.find((e) => e.field === name);
    document.getElementById(`${name}-erro`).textContent = error ? error.message : '';
    if (error) input(name).setAttribute('aria-invalid', 'true');
    else input(name).removeAttribute('aria-invalid');
  }
}

/* ---------- Dados de quem recebe ---------- */

function saveReceiver() {
  try {
    if (!remember.checked) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lembrar: false }));
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lembrar: true,
      nome: input('recebedorNome').value,
      documento: input('recebedorDoc').value,
      cidade: input('cidade').value,
    }));
  } catch {
    // Armazenamento indisponível (modo privado, cota cheia): segue sem salvar.
  }
}

function loadReceiver() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return;
    if (saved.lembrar === false) {
      remember.checked = false;
      return;
    }
    if (typeof saved.nome === 'string') input('recebedorNome').value = saved.nome;
    if (typeof saved.documento === 'string') input('recebedorDoc').value = formatDocument(saved.documento);
    if (typeof saved.cidade === 'string') input('cidade').value = saved.cidade;
  } catch {
    // Dados salvos ilegíveis: ignorar.
  }
}

remember.addEventListener('change', () => {
  saveReceiver();
  setStatus(remember.checked ? 'Os dados de quem recebe serão lembrados neste navegador.' : 'Os dados de quem recebe não serão mais salvos.', 'ok');
});

document.getElementById('esquecer').addEventListener('click', () => {
  remember.checked = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lembrar: false }));
  } catch {
    // Nada a apagar se o armazenamento estiver indisponível.
  }
  setStatus('Dados salvos apagados deste navegador.', 'ok');
});

/* ---------- Eventos ---------- */

for (const name of ['recebedorDoc', 'pagadorDoc']) {
  const field = input(name);
  field.addEventListener('input', () => {
    if (field.selectionStart === field.value.length) field.value = formatDocument(field.value);
  });
  field.addEventListener('blur', () => {
    field.value = formatDocument(field.value);
    render();
  });
}

input('valor').addEventListener('blur', () => {
  const field = input('valor');
  if (!field.value.trim()) return;
  const amount = parseAmount(field.value);
  if (amount.ok) field.value = formatAmount(amount).replace(/^R\$\s/, '');
  else if (!attemptedPrint) {
    document.getElementById('valor-erro').textContent = amount.error;
    field.setAttribute('aria-invalid', 'true');
  }
  render();
});

form.addEventListener('input', (event) => {
  if (event.target === input('valor') && !attemptedPrint) {
    document.getElementById('valor-erro').textContent = '';
    input('valor').removeAttribute('aria-invalid');
  }
  if (['recebedorNome', 'recebedorDoc', 'cidade'].includes(event.target.name)) saveReceiver();
  render();
});
form.addEventListener('change', render);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  attemptedPrint = true;
  const errors = validateReceipt(readForm());
  showErrors(errors);
  if (errors.length > 0) {
    setStatus('Preencha os campos destacados antes de imprimir.', 'error');
    input(errors[0].field).focus();
    return;
  }
  render();
  if (!fits) {
    setStatus('O recibo não cabe em meia folha. Encurte o texto ou desmarque "Duas vias na mesma folha".', 'error');
    input('duasVias').focus();
    return;
  }
  setStatus('');
  window.print();
});

document.getElementById('novo').addEventListener('click', () => {
  for (const name of ['pagadorNome', 'pagadorDoc', 'valor', 'referente', 'observacoes']) input(name).value = '';
  input('numero').value = nextReceiptNumber(input('numero').value);
  input('data').value = todayISO();
  attemptedPrint = false;
  showErrors([]);
  render();
  setStatus('Pronto para um novo recibo. Os dados de quem recebe foram mantidos.', 'ok');
  input('pagadorNome').focus();
});

new ResizeObserver(fitPreview).observe(frame);

input('data').value = todayISO();
loadReceiver();
render();
