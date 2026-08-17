'use strict';

const APP_VERSION = '1.0.5';
const FONT_STORAGE_KEY = 'configEtiqueta';
const FONT_RULES = {
  sku: { defaultValue: 11, min: 8, max: 12, step: 0.2, previewRatio: 26 / 11, printVar: '--sku-font-print', previewVar: '--sku-font-preview', output: '#sku-font-value' },
  lotLabel: { defaultValue: 4.5, min: 3.8, max: 5.2, step: 0.1, previewRatio: 11 / 4.5, printVar: '--lot-label-font-print', previewVar: '--lot-label-font-preview', output: '#lot-label-font-value' },
  lotValue: { defaultValue: 4.1, min: 3.6, max: 4.2, step: 0.1, previewRatio: 10.7 / 4.1, printVar: '--lot-value-font-print', previewVar: '--lot-value-font-preview', output: '#lot-value-font-value' }
};
const form = document.querySelector('#label-form');
const skuInput = document.querySelector('#sku');
const lotPartOneInput = document.querySelector('#lot-part-one');
const lotPartTwoInput = document.querySelector('#lot-part-two');
const postureInput = document.querySelector('#posture');
const completeLotOutput = document.querySelector('#complete-lot');
const errorOutput = document.querySelector('#form-error');
const preview = document.querySelector('#preview-section');
const qrContainer = document.querySelector('#qr-code');
const labelLotNumber = document.querySelector('#label-lot-number');
let waitingWorker = null;
let fontSettings = Object.fromEntries(Object.entries(FONT_RULES).map(([key, rule]) => [key, rule.defaultValue]));

document.querySelector('#app-version').textContent = APP_VERSION;

function fitsMaximumLot(fontSizePt) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return fontSizePt <= FONT_RULES.lotValue.max;
  const fontSizePx = fontSizePt * (4 / 3);
  const maximumText = 'L99.99.31.12.26';
  context.font = `900 ${fontSizePx}px "Arial Narrow", Arial, sans-serif`;
  const letterSpacing = -0.09 * fontSizePx * (maximumText.length - 1);
  const visualGap = 0.4 * (96 / 25.4);
  const availableWidth = 10.5 * (96 / 25.4);
  return context.measureText(maximumText).width + letterSpacing + visualGap <= availableWidth;
}

function applyFontSettings(save = true) {
  Object.entries(FONT_RULES).forEach(([key, rule]) => {
    const value = fontSettings[key];
    document.documentElement.style.setProperty(rule.printVar, `${value}pt`);
    document.documentElement.style.setProperty(rule.previewVar, `${(value * rule.previewRatio).toFixed(2)}px`);
    document.querySelector(rule.output).textContent = `${value.toFixed(1).replace('.', ',')} pt`;
  });
  if (save) {
    try { localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(fontSettings)); } catch {}
  }
}

function restoreSavedFontSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(FONT_STORAGE_KEY));
    if (!saved) return;
    Object.entries(FONT_RULES).forEach(([key, rule]) => {
      const value = Number(saved[key]);
      if (Number.isFinite(value) && value >= rule.min && value <= rule.max && (key !== 'lotValue' || fitsMaximumLot(value))) {
        fontSettings[key] = value;
      }
    });
  } catch {}
}

restoreSavedFontSettings();
applyFontSettings(false);

document.querySelectorAll('[data-font]').forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.font;
    const rule = FONT_RULES[key];
    const direction = Number(button.dataset.direction);
    const nextValue = Number((fontSettings[key] + direction * rule.step).toFixed(1));
    const message = document.querySelector('#font-limit-message');

    if (nextValue < rule.min) {
      message.textContent = 'Limite mínimo atingido para esta etiqueta.';
      return;
    }
    if (nextValue > rule.max || (key === 'lotValue' && !fitsMaximumLot(nextValue))) {
      message.textContent = 'Limite máximo atingido para esta etiqueta.';
      return;
    }

    fontSettings[key] = nextValue;
    message.textContent = '';
    applyFontSettings();
  });
});

document.querySelector('#reset-fonts').addEventListener('click', () => {
  fontSettings = Object.fromEntries(Object.entries(FONT_RULES).map(([key, rule]) => [key, rule.defaultValue]));
  document.querySelector('#font-limit-message').textContent = '';
  applyFontSettings();
});

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? { year, month, day }
    : null;
}

function calculateCompleteLot(lot, dateValue) {
  const date = parseDate(dateValue);
  if (!lot || !date) return '';
  const day = String(date.day).padStart(2, '0');
  const month = String(date.month).padStart(2, '0');
  const year = String(date.year).slice(-2);
  return `L${lot}.${day}.${month}.${year}`;
}

function sanitizeLotPart(input) {
  input.value = input.value.replace(/\D/g, '').slice(0, 2);
}

function getLot() {
  const first = lotPartOneInput.value;
  const second = lotPartTwoInput.value;
  return /^\d{2}$/.test(first) && /^\d{2}$/.test(second) ? `${first}.${second}` : '';
}

function updateLabel() {
  const sku = skuInput.value.trim();
  const lot = getLot();
  const date = parseDate(postureInput.value);
  const completeLot = calculateCompleteLot(lot, postureInput.value);
  const printedLot = calculatePrintedLot(lot, postureInput.value);

  completeLotOutput.textContent = completeLot || '—';

  if (!sku || !lot || !date) {
  preview.hidden = true;
  errorOutput.textContent = '';
  return;
}

  const payload = `SKU=${sku};LOTE=${lot};POSTURA=${postureInput.value}`;
  errorOutput.textContent = '';
  completeLotOutput.textContent = completeLot;
  document.querySelector('#label-sku').textContent = sku;
  labelLotNumber.textContent = printedLot.slice(1);
  document.querySelector('#payload').textContent = payload;
  qrContainer.replaceChildren();
  new QRCode(qrContainer, { text: payload, width: 164, height: 164, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  preview.hidden = false;
}

[skuInput, lotPartOneInput, lotPartTwoInput, postureInput].forEach((input) => {
  input.addEventListener('input', () => {
    if (input === lotPartOneInput || input === lotPartTwoInput) sanitizeLotPart(input);
    updateLabel();
  });
});

lotPartOneInput.addEventListener('input', () => {
  if (lotPartOneInput.value.length === 2) lotPartTwoInput.focus();
});

form.addEventListener('submit', (event) => event.preventDefault());

document.querySelector('#print-button').addEventListener('click', () => window.print());
document.querySelector('#new-button').addEventListener('click', () => {
  preview.hidden = true;
  errorOutput.textContent = '';
  skuInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function showUpdate(worker) {
  waitingWorker = worker;
  document.querySelector('#update-banner').hidden = false;
}

document.querySelector('#update-button').addEventListener('click', () => {
  if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; location.reload(); }
  });
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('./sw.js');
    if (registration.waiting) showUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
      });
    });
    setInterval(() => registration.update(), 60 * 60 * 1000);
  });
}

window.PalletLabel = { calculateCompleteLot, parseDate, getLot, updateLabel, APP_VERSION };

function calculatePrintedLot(lot, dateValue) {
  const date = parseDate(dateValue);
  if (!lot || !date) return '';

  const firstLotPart = lot.split('.')[0];
  const day = String(date.day).padStart(2, '0');
  const month = String(date.month).padStart(2, '0');

  return `L${firstLotPart}.${day}.${month}`;
}
