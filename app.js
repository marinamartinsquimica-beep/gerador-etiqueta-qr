'use strict';

/* =========================================================
   VERSÃO
   ========================================================= */

const APP_VERSION = '1.1.0';

// SymbolShapeHint.FORCE_SQUARE no bundle UMD fixado do ZXing 0.23.0.
const DATA_MATRIX_FORCE_SQUARE = 1;

const FONT_STORAGE_KEY = 'configEtiqueta-v1.1';


/* =========================================================
   CONFIGURAÇÃO DE FONTES
   ========================================================= */

const FONT_RULES = {

  sku: {
    defaultValue: 15,
    min: 10,
    max: 18,
    step: 0.2,
    printVar: '--sku-font-print',
    previewVar: '--sku-font-preview',
    previewRatio: 26 / 11,
    output: '#sku-font-value'
  },

  lotLabel: {
    defaultValue: 5.2,
    min: 4.0,
    max: 6.0,
    step: 0.1,
    printVar: '--lot-label-font-print',
    previewVar: '--lot-label-font-preview',
    previewRatio: 11 / 4.5,
    output: '#lot-label-font-value'
  },

  lotValue: {
    defaultValue: 10.5,
    min: 7.0,
    max: 13.0,
    step: 0.1,
    printVar: '--lot-value-font-print',
    previewVar: '--lot-value-font-preview',
    previewRatio: 14 / 6.2,
    output: '#lot-value-font-value'
  }

};


/* =========================================================
   ELEMENTOS DA TELA
   ========================================================= */

const form =
  document.querySelector('#label-form');

const skuInput =
  document.querySelector('#sku');

const lotPartOneInput =
  document.querySelector('#lot-part-one');

const lotPartTwoInput =
  document.querySelector('#lot-part-two');

const postureInput =
  document.querySelector('#posture');

const quantityInput =
  document.querySelector('#quantity');

const completeLotOutput =
  document.querySelector('#complete-lot');

const errorOutput =
  document.querySelector('#form-error');

const preview =
  document.querySelector('#preview-section');

const qrContainer =
  document.querySelector('#qr-code');

const labelSku =
  document.querySelector('#label-sku');

const labelLotLine1 =
  document.querySelector('#label-lot-line1');

const labelLotLine2 =
  document.querySelector('#label-lot-line2');

const payloadOutput =
  document.querySelector('#payload');

const pageSummary =
  document.querySelector('#page-summary');

const printArea =
  document.querySelector('#print-area');

const appVersionOutput =
  document.querySelector('#app-version');


let waitingWorker = null;


/* =========================================================
   CONFIGURAÇÃO INICIAL DE FONTES
   ========================================================= */

let fontSettings =
  Object.fromEntries(
    Object.entries(FONT_RULES)
      .map(
        ([key, rule]) => [
          key,
          rule.defaultValue
        ]
      )
  );


if (appVersionOutput) {

  appVersionOutput.textContent =
    APP_VERSION;

}


/* =========================================================
   FONTES
   ========================================================= */

function applyFontSettings(
  save = true
) {

  Object
    .entries(FONT_RULES)
    .forEach(
      ([key, rule]) => {

        const value =
          fontSettings[key];


        document
          .documentElement
          .style
          .setProperty(
            rule.printVar,
            `${value}pt`
          );


        document
          .documentElement
          .style
          .setProperty(
            rule.previewVar,
            `${
              (
                value *
                rule.previewRatio
              ).toFixed(2)
            }px`
          );


        const output =
          document
            .querySelector(
              rule.output
            );


        if (output) {

          output.textContent =
            `${
              value
                .toFixed(1)
                .replace('.', ',')
            } pt`;

        }

      }
    );


  if (save) {

    try {

      localStorage.setItem(
        FONT_STORAGE_KEY,
        JSON.stringify(
          fontSettings
        )
      );

    } catch (
      error
    ) {

      console.warn(
        'Não foi possível salvar os ajustes de fonte.',
        error
      );

    }

  }

}



function restoreSavedFontSettings() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          FONT_STORAGE_KEY
        )
      );


    if (!saved) {
      return;
    }


    Object
      .entries(FONT_RULES)
      .forEach(
        ([key, rule]) => {

          const value =
            Number(
              saved[key]
            );


          if (
            Number.isFinite(value) &&
            value >= rule.min &&
            value <= rule.max
          ) {

            fontSettings[key] =
              value;

          }

        }
      );

  } catch (
    error
  ) {

    console.warn(
      'Não foi possível restaurar os ajustes de fonte.',
      error
    );

  }

}



restoreSavedFontSettings();

applyFontSettings(false);



document
  .querySelectorAll('[data-font]')
  .forEach(
    (button) => {

      button.addEventListener(
        'click',
        () => {

          const key =
            button.dataset.font;

          const direction =
            Number(
              button.dataset.direction
            );

          const rule =
            FONT_RULES[key];


          if (!rule) {
            return;
          }


          const nextValue =
            Number(
              (
                fontSettings[key] +
                direction *
                rule.step
              ).toFixed(1)
            );


          const message =
            document.querySelector(
              '#font-limit-message'
            );


          if (
            nextValue <
            rule.min
          ) {

            if (message) {

              message.textContent =
                'Limite mínimo atingido para esta etiqueta.';

            }

            return;

          }


          if (
            nextValue >
            rule.max
          ) {

            if (message) {

              message.textContent =
                'Limite máximo seguro atingido para esta etiqueta.';

            }

            return;

          }


          fontSettings[key] =
            nextValue;


          if (message) {

            message.textContent =
              '';

          }


          applyFontSettings();

        }
      );

    }
  );



const resetFontsButton =
  document.querySelector(
    '#reset-fonts'
  );


if (resetFontsButton) {

  resetFontsButton.addEventListener(
    'click',
    () => {

      fontSettings =
        Object.fromEntries(
          Object.entries(
            FONT_RULES
          )
            .map(
              ([key, rule]) => [
                key,
                rule.defaultValue
              ]
            )
        );


      const message =
        document.querySelector(
          '#font-limit-message'
        );


      if (message) {

        message.textContent =
          '';

      }


      applyFontSettings();

      updateLabel();

    }
  );

}


/* =========================================================
   DATA
   ========================================================= */

function parseDate(
  value
) {

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(value)
  ) {

    return null;

  }


  const [
    year,
    month,
    day
  ] =
    value
      .split('-')
      .map(Number);


  const date =
    new Date(
      year,
      month - 1,
      day
    );


  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;


  if (!valid) {
    return null;
  }


  return {
    year,
    month,
    day
  };

}


/* =========================================================
   LOTE
   ========================================================= */

function sanitizeLotPart(
  input
) {

  input.value =
    input.value
      .replace(
        /\D/g,
        ''
      )
      .slice(
        0,
        2
      );

}



function getLot() {

  const first =
    lotPartOneInput.value;

  const second =
    lotPartTwoInput.value;


  if (
    !/^\d{2}$/
      .test(first)
  ) {

    return '';

  }


  if (
    !/^\d{2}$/
      .test(second)
  ) {

    return '';

  }


  return (
    `${first}.${second}`
  );

}


/* =========================================================
   LOTE COMPLETO DA TELA

   Exemplo:
   lote digitado: 17.13
   postura: 14/08/2026

   resultado:
   L17.13.14.08.26
   ========================================================= */

function calculateCompleteLot(
  lot,
  dateValue
) {

  const date =
    parseDate(
      dateValue
    );


  if (
    !lot ||
    !date
  ) {

    return '';

  }


  const day =
    String(
      date.day
    )
      .padStart(
        2,
        '0'
      );


  const month =
    String(
      date.month
    )
      .padStart(
        2,
        '0'
      );


  const year =
    String(
      date.year
    )
      .slice(-2);


  return (
    `L${lot}.${day}.${month}.${year}`
  );

}


/* =========================================================
   LOTE VISÍVEL NA ETIQUETA

   Exemplo:
   lote digitado: 17.13
   postura: 14/08/2026

   impressão:

   LOTE:
   L17
   14.08

   Data Matrix recebe:
   DM1|5008|17.13|2026-08-14
   ========================================================= */

function calculatePrintedLot(
  lot,
  dateValue
) {

  const date =
    parseDate(
      dateValue
    );


  if (
    !lot ||
    !date
  ) {

    return null;

  }


  const firstLotPart =
    lot
      .split('.')[0];


  const day =
    String(
      date.day
    )
      .padStart(
        2,
        '0'
      );


  const month =
    String(
      date.month
    )
      .padStart(
        2,
        '0'
      );


  return {

    line1:
      `L${firstLotPart}`,

    line2:
      `${day}.${month}`,

    full:
      `L${firstLotPart}.${day}.${month}`

  };

}


/* =========================================================
   QUANTIDADE DE ETIQUETAS
   ========================================================= */

function getQuantity() {

  const quantity =
    Number.parseInt(
      quantityInput.value,
      10
    );


  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1
  ) {

    return null;

  }


  return quantity;

}



function calculatePages(
  quantity
) {

  return Math.ceil(
    quantity / 3
  );

}


/* =========================================================
   DATA MATRIX ECC200
   ========================================================= */

function buildDataMatrixPayload(
  sku,
  lot,
  posture
) {

  return `DM1|${sku}|${lot}|${posture}`;

}


function createDataMatrix(
  container,
  payload
) {

  if (!container) {
    return;
  }


  container.replaceChildren();


  if (
    !window.ZXing ||
    typeof window.ZXing.DataMatrixWriter !== 'function'
  ) {

    throw new Error(
      'Biblioteca Data Matrix indisponível.'
    );

  }


  const hints =
    new Map();


  hints.set(
    window.ZXing.EncodeHintType.DATA_MATRIX_SHAPE,
    DATA_MATRIX_FORCE_SQUARE
  );


  const matrix =
    new window.ZXing.DataMatrixWriter()
      .encode(
        payload,
        window.ZXing.BarcodeFormat.DATA_MATRIX,
        0,
        0,
        hints
      );


  const quietZone =
    2;


  const canvas =
    document.createElement(
      'canvas'
    );


  canvas.width =
    matrix.getWidth() +
    quietZone * 2;


  canvas.height =
    matrix.getHeight() +
    quietZone * 2;


  canvas.setAttribute(
    'aria-label',
    `Data Matrix: ${payload}`
  );


  const context =
    canvas.getContext(
      '2d'
    );


  context.imageSmoothingEnabled =
    false;


  context.fillStyle =
    '#ffffff';


  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  context.fillStyle =
    '#000000';


  for (
    let y = 0;
    y < matrix.getHeight();
    y += 1
  ) {

    for (
      let x = 0;
      x < matrix.getWidth();
      x += 1
    ) {

      if (
        matrix.get(
          x,
          y
        )
      ) {

        context.fillRect(
          x + quietZone,
          y + quietZone,
          1,
          1
        );

      }

    }

  }


  container.appendChild(
    canvas
  );

}


/* =========================================================
   CRIA UMA ETIQUETA FÍSICA
   ========================================================= */

function createPrintCopy(
  sku,
  printedLot,
  payload,
  active = true
) {

  const copy =
    document.createElement(
      'div'
    );


  copy.className =
    active
      ? 'print-copy'
      : 'print-copy empty';


  copy.innerHTML = `
    <div class="print-qr"></div>

    <div class="label-data">

      <p class="label-sku">

        <span>SKU</span>

        <strong
          class="print-sku"
        ></strong>

      </p>


      <div class="label-lot">

        <span>
          LOTE:
        </span>


        <strong
          class="lot-value-two-lines"
        >

          <span
            class="print-lot-line1 lot-line1"
          ></span>

          <span
            class="print-lot-line2 lot-line2"
          ></span>

        </strong>

      </div>

    </div>
  `;


  if (!active) {

    return copy;

  }


  const skuOutput =
    copy.querySelector(
      '.print-sku'
    );


  const lotLine1Output =
    copy.querySelector(
      '.print-lot-line1'
    );


  const lotLine2Output =
    copy.querySelector(
      '.print-lot-line2'
    );


  const dataMatrixTarget =
    copy.querySelector(
      '.print-qr'
    );


  skuOutput.textContent =
    sku;


  lotLine1Output.textContent =
    printedLot.line1;


  lotLine2Output.textContent =
    printedLot.line2;


  createDataMatrix(
    dataMatrixTarget,
    payload
  );


  return copy;

}


/* =========================================================
   MONTA TODAS AS PÁGINAS / FILEIRAS

   30 etiquetas
   = 10 páginas
   = 3 etiquetas por página
   ========================================================= */

function buildPrintArea(
  sku,
  printedLot,
  payload,
  quantity
) {

  printArea.replaceChildren();


  const pages =
    calculatePages(
      quantity
    );


  for (
    let pageIndex = 0;
    pageIndex < pages;
    pageIndex += 1
  ) {

    const page =
      document.createElement(
        'div'
      );


    page.className =
      'print-page';


    for (
      let position = 0;
      position < 3;
      position += 1
    ) {

      const labelIndex =
        pageIndex * 3 +
        position;


      const active =
        labelIndex <
        quantity;


      const copy =
        createPrintCopy(
          sku,
          printedLot,
          payload,
          active
        );


      page.appendChild(
        copy
      );

    }


    printArea.appendChild(
      page
    );

  }


  return pages;

}


/* =========================================================
   ATUALIZAÇÃO PRINCIPAL
   ========================================================= */

function updateLabel() {

  const sku =
    skuInput.value
      .trim();


  const lot =
    getLot();


  const date =
    parseDate(
      postureInput.value
    );


  const quantity =
    getQuantity();


  const completeLot =
    calculateCompleteLot(
      lot,
      postureInput.value
    );


  const printedLot =
    calculatePrintedLot(
      lot,
      postureInput.value
    );


  completeLotOutput.textContent =
    completeLot || '—';


  if (
    !sku ||
    !lot ||
    !date
  ) {

    preview.hidden =
      true;


    if (
      errorOutput
    ) {

      errorOutput.textContent =
        '';

    }


    return false;

  }


  if (
    !quantity
  ) {

    errorOutput.textContent =
      'Informe uma quantidade válida de etiquetas.';


    preview.hidden =
      true;


    return false;

  }


  const payload =
    buildDataMatrixPayload(
      sku,
      lot,
      postureInput.value
    );


  errorOutput.textContent =
    '';


  labelSku.textContent =
    sku;


  labelLotLine1.textContent =
    printedLot.line1;


  labelLotLine2.textContent =
    printedLot.line2;


  payloadOutput.textContent =
    payload;


  createDataMatrix(
    qrContainer,
    payload
  );


  const pages =
    buildPrintArea(
      sku,
      printedLot,
      payload,
      quantity
    );


  pageSummary.innerHTML =
    `
      <strong>${quantity}</strong>
      etiqueta(s)
      =
      <strong>${pages}</strong>
      página(s)/fileira(s)
      de até 3 etiquetas.
    `;


  preview.hidden =
    false;


  return true;

}


/* =========================================================
   EVENTOS DOS CAMPOS
   ========================================================= */

[
  skuInput,
  lotPartOneInput,
  lotPartTwoInput,
  postureInput,
  quantityInput
]
.forEach(
  (input) => {

    input.addEventListener(
      'input',
      () => {

        if (
          input ===
            lotPartOneInput ||
          input ===
            lotPartTwoInput
        ) {

          sanitizeLotPart(
            input
          );

        }


        updateLabel();

      }
    );

  }
);


/* =========================================================
   AVANÇO AUTOMÁTICO DO PRIMEIRO CAMPO DO LOTE
   ========================================================= */

lotPartOneInput.addEventListener(
  'input',
  () => {

    if (
      lotPartOneInput
        .value
        .length === 2
    ) {

      lotPartTwoInput.focus();

    }

  }
);


/* =========================================================
   EVITA SUBMIT TRADICIONAL DO FORM
   ========================================================= */

form.addEventListener(
  'submit',
  (event) => {

    event.preventDefault();

  }
);


/* =========================================================
   IMPRIMIR
   ========================================================= */

const printButton =
  document.querySelector(
    '#print-button'
  );


if (printButton) {

  printButton.addEventListener(
    'click',
    () => {

      const valid =
        updateLabel();


      if (!valid) {

        if (
          !errorOutput.textContent
        ) {

          errorOutput.textContent =
            'Preencha SKU, lote, data de postura e quantidade antes de imprimir.';

        }


        return;

      }


      window.print();

    }
  );

}


/* =========================================================
   CTRL + P

   Antes da impressão,
   prepara todas as páginas.
   ========================================================= */

window.addEventListener(
  'beforeprint',
  () => {

    updateLabel();

  }
);


/* =========================================================
   NOVA ETIQUETA
   ========================================================= */

const newButton =
  document.querySelector(
    '#new-button'
  );


if (newButton) {

  newButton.addEventListener(
    'click',
    () => {

      preview.hidden =
        true;


      errorOutput.textContent =
        '';


      skuInput.focus();


      window.scrollTo(
        {
          top: 0,
          behavior: 'smooth'
        }
      );

    }
  );

}


/* =========================================================
   PWA — AVISO DE ATUALIZAÇÃO
   ========================================================= */

function showUpdate(
  worker
) {

  waitingWorker =
    worker;


  const banner =
    document.querySelector(
      '#update-banner'
    );


  if (banner) {

    banner.hidden =
      false;

  }

}



const updateButton =
  document.querySelector(
    '#update-button'
  );


if (updateButton) {

  updateButton.addEventListener(
    'click',
    () => {

      if (
        waitingWorker
      ) {

        waitingWorker.postMessage(
          {
            type:
              'SKIP_WAITING'
          }
        );

      }

    }
  );

}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  'serviceWorker' in navigator &&
  location.protocol !== 'file:'
) {

  let refreshing =
    false;


  navigator
    .serviceWorker
    .addEventListener(
      'controllerchange',
      () => {

        if (
          refreshing
        ) {

          return;

        }


        refreshing =
          true;


        location.reload();

      }
    );


  window.addEventListener(
    'load',
    async () => {

      try {

        const registration =
          await navigator
            .serviceWorker
            .register(
              './sw.js'
            );


        if (
          registration.waiting
        ) {

          showUpdate(
            registration.waiting
          );

        }


        registration.addEventListener(
          'updatefound',
          () => {

            const worker =
              registration
                .installing;


            if (!worker) {
              return;
            }


            worker.addEventListener(
              'statechange',
              () => {

                if (
                  worker.state ===
                    'installed' &&
                  navigator
                    .serviceWorker
                    .controller
                ) {

                  showUpdate(
                    worker
                  );

                }

              }
            );

          }
        );


        /*
          Verifica atualização
          uma vez por hora.
        */

        setInterval(
          () => {

            registration.update();

          },
          60 *
          60 *
          1000
        );

      } catch (
        error
      ) {

        console.error(
          'Falha ao registrar o service worker:',
          error
        );

      }

    }
  );

}


/* =========================================================
   API PARA TESTES
   ========================================================= */

window.PalletLabel = {

  APP_VERSION,

  parseDate,

  getLot,

  calculateCompleteLot,

  calculatePrintedLot,

  getQuantity,

  calculatePages,

  buildDataMatrixPayload,

  createDataMatrix,

  buildPrintArea,

  updateLabel

};
