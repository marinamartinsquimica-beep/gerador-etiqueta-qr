'use strict';

const APP_VERSION = '1.0.8';

const FONT_STORAGE_KEY = 'configEtiqueta';

const FONT_RULES = {
  sku: {
    defaultValue: 11,
    min: 8,
    max: 12,
    step: 0.2,
    printVar: '--sku-font-print',
    previewVar: '--sku-font-preview',
    previewRatio: 26 / 11,
    output: '#sku-font-value'
  },

  lotLabel: {
    defaultValue: 4.5,
    min: 3.8,
    max: 5.2,
    step: 0.1,
    printVar: '--lot-label-font-print',
    previewVar: '--lot-label-font-preview',
    previewRatio: 11 / 4.5,
    output: '#lot-label-font-value'
  },

  lotValue: {
    defaultValue: 6.2,
    min: 5.0,
    max: 6.6,
    step: 0.1,
    printVar: '--lot-value-font-print',
    previewVar: '--lot-value-font-preview',
    previewRatio: 14 / 6.2,
    output: '#lot-value-font-value'
  }
};


const form = document.querySelector('#label-form');

const skuInput = document.querySelector('#sku');

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


let waitingWorker = null;


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


document
  .querySelector('#app-version')
  .textContent =
    APP_VERSION;


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

      localStorage
        .setItem(
          FONT_STORAGE_KEY,
          JSON.stringify(
            fontSettings
          )
        );

    } catch {}

  }

}



function restoreSavedFontSettings() {

  try {

    const saved =
      JSON.parse(
        localStorage
          .getItem(
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

  } catch {}

}



restoreSavedFontSettings();

applyFontSettings(false);



document
  .querySelectorAll(
    '[data-font]'
  )
  .forEach(
    (button) => {

      button
        .addEventListener(
          'click',
          () => {

            const key =
              button
                .dataset
                .font;


            const direction =
              Number(
                button
                  .dataset
                  .direction
              );


            const rule =
              FONT_RULES[key];


            const nextValue =
              Number(
                (
                  fontSettings[key] +
                  direction *
                  rule.step
                )
                  .toFixed(1)
              );


            const message =
              document
                .querySelector(
                  '#font-limit-message'
                );


            if (
              nextValue <
              rule.min
            ) {

              message
                .textContent =
                'Limite mínimo atingido para esta etiqueta.';

              return;

            }


            if (
              nextValue >
              rule.max
            ) {

              message
                .textContent =
                'Limite máximo seguro atingido para esta etiqueta.';

              return;

            }


            fontSettings[key] =
              nextValue;


            message
              .textContent =
              '';


            applyFontSettings();

          }
        );

    }
  );



document
  .querySelector(
    '#reset-fonts'
  )
  .addEventListener(
    'click',
    () => {

      fontSettings =
        Object.fromEntries(
          Object
            .entries(
              FONT_RULES
            )
            .map(
              ([key, rule]) => [
                key,
                rule.defaultValue
              ]
            )
        );


      document
        .querySelector(
          '#font-limit-message'
        )
        .textContent =
        '';


      applyFontSettings();

    }
  );


/* =========================================================
   DATA
   ========================================================= */

function parseDate(value) {

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
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day;


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
    input
      .value
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



/*
  LOTE COMPLETO DA TELA

  Exemplo:
  17.13
  14/08/2026

  resultado:
  L17.13.14.08.26
*/

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



/*
  LOTE VISÍVEL DA ETIQUETA

  IMPORTANTE:

  Primeiro grupo do lote
  + dia da postura
  + mês da postura

  lote digitado:
  17.13

  postura:
  14/08/2026

  etiqueta:
  L17.14.08

  O QR continua mantendo:
  LOTE=17.13
  POSTURA=2026-08-14
*/

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


  return (
    `L${firstLotPart}.${day}.${month}`
  );

}


/* =========================================================
   QUANTIDADE
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
   QR CODE
   ========================================================= */

function createQr(
  container,
  payload,
  size = 164
) {

  if (!container) {
    return;
  }


  container
    .replaceChildren();


  new QRCode(
    container,
    {
      text:
        payload,

      width:
        size,

      height:
        size,

      colorDark:
        '#000000',

      colorLight:
        '#ffffff',

      correctLevel:
        QRCode
          .CorrectLevel
          .M
    }
  );

}


/* =========================================================
   CRIA UMA ETIQUETA PARA IMPRESSÃO
   ========================================================= */

function createPrintCopy(
  sku,
  printedLot,
  payload,
  active = true
) {

  const copy =
    document
      .createElement(
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
        <strong class="print-sku"></strong>
      </p>

      <div class="label-lot">

  <span>LOTE:</span>

  <strong class="lot-value-two-lines">

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


  copy
    .querySelector(
      '.print-sku'
    )
    .textContent =
    sku;


 copy
  .querySelector(
    '.print-lot-line1'
  )
  .textContent =
  printedLot.line1;


copy
  .querySelector(
    '.print-lot-line2'
  )
  .textContent =
  printedLot.line2;labelLotNumber


  const qrTarget =
    copy
      .querySelector(
        '.print-qr'
      );


  createQr(
    qrTarget,
    payload,
    164
  );


  return copy;

}


/* =========================================================
   MONTA TODAS AS PÁGINAS DE IMPRESSÃO
   ========================================================= */

function buildPrintArea(
  sku,
  printedLot,
  payload,
  quantity
) {

  printArea
    .replaceChildren();


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
      document
        .createElement(
          'div'
        );


    page.className =
      'print-page';


    /*
      Cada página/fileira
      possui exatamente
      3 posições.
    */

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


      page
        .appendChild(
          copy
        );

    }


    printArea
      .appendChild(
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
    skuInput
      .value
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


  completeLotOutput
    .textContent =
    completeLot || '—';


  /*
    Enquanto os três dados
    principais ainda não foram
    preenchidos, não gera QR.
  */

  if (
    !sku ||
    !lot ||
    !date
  ) {

    preview.hidden =
      true;

    return false;

  }


  if (!quantity) {

    errorOutput
      .textContent =
      'Informe uma quantidade válida de etiquetas.';

    preview.hidden =
      true;

    return false;

  }


  /*
    PAYLOAD DO QR

    NÃO ALTERAR.

    O Romaneio precisa
    continuar recebendo
    exatamente estes dados.
  */

  const payload =
    `SKU=${sku};LOTE=${lot};POSTURA=${postureInput.value}`;


  errorOutput
    .textContent =
    '';


  /*
    PREVIEW
  */

  labelSku
    .textContent =
    sku;


 labelLotLine1
  .textContent =
  printedLot.line1;


labelLotLine2
  .textContent =
  printedLot.line2;


  payloadOutput
    .textContent =
    payload;


  createQr(
    qrContainer,
    payload,
    164
  );


  /*
    IMPRESSÃO
  */

  const pages =
    buildPrintArea(
      sku,
      printedLot,
      payload,
      quantity
    );


  pageSummary
    .innerHTML =
    `
      <strong>${quantity}</strong>
      etiqueta(s)
      =
      <strong>${pages}</strong>
      fileira(s)/página(s)
      de até 3 etiquetas.
    `;


  preview.hidden =
    false;


  return true;

}


/* =========================================================
   CAMPOS
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

    input
      .addEventListener(
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



lotPartOneInput
  .addEventListener(
    'input',
    () => {

      if (
        lotPartOneInput
          .value
          .length === 2
      ) {

        lotPartTwoInput
          .focus();

      }

    }
  );



form
  .addEventListener(
    'submit',
    (event) => {

      event
        .preventDefault();

    }
  );


/* =========================================================
   BOTÃO IMPRIMIR
   ========================================================= */

document
  .querySelector(
    '#print-button'
  )
  .addEventListener(
    'click',
    () => {

      const valid =
        updateLabel();


      if (!valid) {

        if (
          !errorOutput
            .textContent
        ) {

          errorOutput
            .textContent =
            'Preencha SKU, lote, data de postura e quantidade antes de imprimir.';

        }

        return;

      }


      window.print();

    }
  );


/* =========================================================
   CTRL + P
   =========================================================

   O navegador dispara beforeprint.

   Assim, mesmo se o usuário usar
   Ctrl + P, todas as páginas são
   montadas antes da impressão.
   ========================================================= */

window
  .addEventListener(
    'beforeprint',
    () => {

      updateLabel();

    }
  );


/* =========================================================
   NOVA ETIQUETA
   ========================================================= */

document
  .querySelector(
    '#new-button'
  )
  .addEventListener(
    'click',
    () => {

      /*
        Mantemos os dados digitados
        como nas versões anteriores.

        O botão apenas volta o foco
        para permitir nova operação.
      */

      preview.hidden =
        true;


      errorOutput
        .textContent =
        '';


      skuInput
        .focus();


      window
        .scrollTo(
          {
            top: 0,
            behavior: 'smooth'
          }
        );

    }
  );


/* =========================================================
   ATUALIZAÇÃO PWA
   ========================================================= */

function showUpdate(
  worker
) {

  waitingWorker =
    worker;


  document
    .querySelector(
      '#update-banner'
    )
    .hidden =
    false;

}



document
  .querySelector(
    '#update-button'
  )
  .addEventListener(
    'click',
    () => {

      if (
        waitingWorker
      ) {

        waitingWorker
          .postMessage(
            {
              type:
                'SKIP_WAITING'
            }
          );

      }

    }
  );



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


        location
          .reload();

      }
    );


  window
    .addEventListener(
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
            registration
              .waiting
          ) {

            showUpdate(
              registration
                .waiting
            );

          }


          registration
            .addEventListener(
              'updatefound',
              () => {

                const worker =
                  registration
                    .installing;


                if (!worker) {
                  return;
                }


                worker
                  .addEventListener(
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
            Verificação periódica
            de nova versão.
          */

          setInterval(
            () => {

              registration
                .update();

            },
            60 *
            60 *
            1000
          );

        } catch (
          error
        ) {

          console.error(
            'Falha ao registrar service worker:',
            error
          );

        }

      }
    );

}


/* =========================================================
   API INTERNA PARA TESTES
   ========================================================= */

window.PalletLabel = {

  APP_VERSION,

  parseDate,

  getLot,

  calculateCompleteLot,

  calculatePrintedLot,

  getQuantity,

  calculatePages,

  buildPrintArea,

  updateLabel

};
