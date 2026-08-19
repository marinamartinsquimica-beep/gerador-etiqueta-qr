const CACHE_NAME =
  'gerador-data-matrix-paletes-v1.1.2-horizontal';


const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './version.json',
  './vendor/zxing.min.js',
  './vendor/LICENSE-zxing.txt',
  './icons/icon-192.png',
  './icons/icon-512.png'
];


/* =========================================================
   INSTALAÇÃO
   ========================================================= */

self.addEventListener(
  'install',
  (event) => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          (cache) =>
            cache.addAll(
              ASSETS
            )
        )

    );

  }
);


/* =========================================================
   ATIVAÇÃO
   Remove caches das versões anteriores
   ========================================================= */

self.addEventListener(
  'activate',
  (event) => {

    event.waitUntil(

      caches
        .keys()
        .then(
          (cacheNames) =>

            Promise.all(

              cacheNames
                .filter(
                  (cacheName) =>
                    cacheName !==
                    CACHE_NAME
                )
                .map(
                  (cacheName) =>
                    caches.delete(
                      cacheName
                    )
                )

            )

        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


/* =========================================================
   FETCH
   Prioriza a versão publicada.
   Se estiver offline, usa o cache.
   ========================================================= */

self.addEventListener(
  'fetch',
  (event) => {

    if (
      event.request.method !==
      'GET'
    ) {

      return;

    }


    event.respondWith(

      fetch(
        event.request
      )
        .then(
          (response) => {

            if (
              !response ||
              response.status !== 200
            ) {

              return response;

            }


            const responseCopy =
              response.clone();


            caches
              .open(
                CACHE_NAME
              )
              .then(
                (cache) => {

                  cache.put(
                    event.request,
                    responseCopy
                  );

                }
              );


            return response;

          }
        )

        .catch(
          () =>
            caches.match(
              event.request
            )
        )

    );

  }
);


/* =========================================================
   ATUALIZAÇÃO IMEDIATA
   ========================================================= */

self.addEventListener(
  'message',
  (event) => {

    if (
      event.data &&
      event.data.type ===
        'SKIP_WAITING'
    ) {

      self.skipWaiting();

    }

  }
);
