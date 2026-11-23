/* ---------- Chequeo SEO individual y masivo ---------- */
QAMT.tool({
  id: 'seo-check',
  name: 'Chequeo SEO',
  icon: '🔎',
  group: 'Página actual',
  desc: 'Analiza SEO de la página actual o de varias URLs'
}, function (ctx) {
  var U = ctx.util;
  var root = ctx.root;
  var D = document;
  var resultadosMasivos = [];

  function txt(el) {
    return el
      ? (el.textContent || '').replace(/\s+/g, ' ').trim()
      : '';
  }

  function meta(doc, name, attr) {
    var selector =
      'meta[' + (attr || 'name') + '="' + name + '"]';

    var element = doc.querySelector(selector);

    return element
      ? (element.getAttribute('content') || '').trim()
      : '';
  }

  function getCanonical(doc, baseUrl) {
    var element = doc.querySelector('link[rel~="canonical"]');

    if (!element) {
      return '';
    }

    var href = element.getAttribute('href') || '';

    if (!href) {
      return '';
    }

    try {
      return new URL(href, baseUrl).href;
    } catch (e) {
      return href;
    }
  }

  function normalizeRobots(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function evaluateRobots(metaRobots, xRobotsTag) {
    var combined = normalizeRobots(
      (metaRobots || '') + ', ' + (xRobotsTag || '')
    );

    var noindex = /\bnoindex\b/i.test(combined);
    var nofollow = /\bnofollow\b/i.test(combined);

    return {
      combined: combined,
      index: noindex ? 'NOINDEX' : 'INDEX',
      follow: nofollow ? 'NOFOLLOW' : 'FOLLOW',
      noindex: noindex,
      nofollow: nofollow
    };
  }

  function isSelfCanonical(pageUrl, canonicalUrl) {
    if (!canonicalUrl) {
      return false;
    }

    try {
      var page = new URL(pageUrl);
      var canonical = new URL(canonicalUrl, pageUrl);

      function clean(url) {
        var pathname = url.pathname.replace(/\/+$/, '') || '/';

        return (
          url.protocol.toLowerCase() +
          '//' +
          url.host.toLowerCase() +
          pathname +
          url.search
        );
      }

      return clean(page) === clean(canonical);
    } catch (e) {
      return false;
    }
  }

  function statusClass(status) {
    if (status >= 200 && status < 300) {
      return 'ok';
    }

    if (status >= 300 && status < 400) {
      return 'warn';
    }

    return 'err';
  }

  function resultClass(result) {
    if (result === 'PASS') {
      return 'ok';
    }

    if (result === 'WARNING') {
      return 'warn';
    }

    return 'err';
  }

  function pill(value, estado) {
    var css =
      estado === 'ok'
        ? 'p2'
        : estado === 'warn'
        ? 'p3'
        : estado === 'err'
        ? 'p4'
        : 'p0';

    return (
      '<span class="pill ' +
      css +
      '">' +
      U.esc(value || '—') +
      '</span>'
    );
  }

  function fila(etiqueta, valor, estado, observacion) {
    var css =
      estado === 'ok'
        ? 'p2'
        : estado === 'warn'
        ? 'p3'
        : estado === 'err'
        ? 'p4'
        : 'p0';

    var icono =
      estado === 'ok'
        ? 'OK'
        : estado === 'warn'
        ? '!'
        : estado === 'err'
        ? 'X'
        : '—';

    return (
      '<tr>' +
      '<td><b>' +
      U.esc(etiqueta) +
      '</b></td>' +
      '<td class="u">' +
      U.esc(valor || '—') +
      '</td>' +
      '<td><span class="pill ' +
      css +
      '">' +
      icono +
      '</span></td>' +
      '<td>' +
      U.esc(observacion || '') +
      '</td>' +
      '</tr>'
    );
  }

  /* =====================================================
     PANTALLA INICIAL
  ===================================================== */

  function renderInicio() {
    root.innerHTML =
      '<div class="fld">' +
      '<label>Modo de análisis</label>' +
      '<div class="row" style="margin-top:8px">' +
      '<button class="btn primary" id="currentMode">Página actual</button>' +
      '<button class="btn" id="bulkMode">Varias URLs</button>' +
      '</div>' +
      '</div>' +
      '<div id="seoContent"></div>';

    root.querySelector('#currentMode').onclick = function () {
      activateMode('current');
      renderCurrent();
    };

    root.querySelector('#bulkMode').onclick = function () {
      activateMode('bulk');
      renderBulkForm();
    };

    renderCurrent();
  }

  function activateMode(mode) {
    var currentButton = root.querySelector('#currentMode');
    var bulkButton = root.querySelector('#bulkMode');

    if (!currentButton || !bulkButton) {
      return;
    }

    currentButton.className =
      mode === 'current' ? 'btn primary' : 'btn';

    bulkButton.className =
      mode === 'bulk' ? 'btn primary' : 'btn';
  }

  function getContentRoot() {
    return root.querySelector('#seoContent');
  }

  /* =====================================================
     ANÁLISIS DE LA PÁGINA ACTUAL
  ===================================================== */

  function renderCurrent() {
    var content = getContentRoot();

    var title = txt(D.querySelector('title'));
    var desc = meta(D, 'description');
    var canonical = getCanonical(D, location.href);
    var robots = meta(D, 'robots');
    var lang = D.documentElement.getAttribute('lang') || '';

    var ogTitle = meta(D, 'og:title', 'property');
    var ogDescription = meta(D, 'og:description', 'property');
    var ogImage = meta(D, 'og:image', 'property');

    var headings = [];

    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(
      function (tag) {
        Array.prototype.forEach.call(
          D.querySelectorAll(tag),
          function (element) {
            headings.push({
              type: tag.toUpperCase(),
              text: txt(element)
            });
          }
        );
      }
    );

    var h1 = headings.filter(function (heading) {
      return heading.type === 'H1';
    });

    var images = Array.prototype.slice.call(D.images || []);

    var withoutAlt = images.filter(function (image) {
      return !image.hasAttribute('alt') ||
        !(image.getAttribute('alt') || '').trim();
    });

    var links = Array.prototype.slice.call(
      D.querySelectorAll('a[href]')
    );

    var externalLinks = 0;
    var emptyLinks = 0;

    links.forEach(function (anchor) {
      var href = anchor.getAttribute('href') || '';

      if (!href || href === '#') {
        emptyLinks++;
        return;
      }

      try {
        if (new URL(anchor.href).origin !== location.origin) {
          externalLinks++;
        }
      } catch (e) {}
    });

    var robotsEvaluation = evaluateRobots(robots, '');

    var checks = [];

    checks.push([
      'Title',
      title,
      !title
        ? 'err'
        : title.length < 30 || title.length > 65
        ? 'warn'
        : 'ok',
      title
        ? title.length + ' caracteres (ideal 30-65)'
        : 'Falta el title'
    ]);

    checks.push([
      'Meta description',
      desc,
      !desc
        ? 'err'
        : desc.length < 70 || desc.length > 160
        ? 'warn'
        : 'ok',
      desc
        ? desc.length + ' caracteres (ideal 70-160)'
        : 'Falta la descripción'
    ]);

    checks.push([
      'H1',
      h1.map(function (heading) {
        return heading.text;
      }).join(' | '),
      h1.length === 1
        ? 'ok'
        : h1.length === 0
        ? 'err'
        : 'warn',
      h1.length + ' encontrado(s)'
    ]);

    checks.push([
      'Canonical',
      canonical,
      !canonical
        ? 'warn'
        : isSelfCanonical(location.href, canonical)
        ? 'ok'
        : 'warn',
      !canonical
        ? 'Sin etiqueta canonical'
        : isSelfCanonical(location.href, canonical)
        ? 'Canonical autorreferencial'
        : 'El canonical apunta a otra URL'
    ]);

    checks.push([
      'Idioma (lang)',
      lang,
      lang ? 'ok' : 'warn',
      lang ? '' : 'No se encontró el atributo lang'
    ]);

    checks.push([
      'Meta robots',
      robots || 'No especificado',
      robotsEvaluation.noindex || robotsEvaluation.nofollow
        ? 'err'
        : 'ok',
      robots
        ? robotsEvaluation.index +
          ', ' +
          robotsEvaluation.follow
        : 'Sin directiva restrictiva: INDEX, FOLLOW'
    ]);

    checks.push([
      'Indexación',
      robotsEvaluation.index,
      robotsEvaluation.noindex ? 'err' : 'ok',
      robotsEvaluation.noindex
        ? 'La página tiene NOINDEX'
        : 'La página permite indexación'
    ]);

    checks.push([
      'Seguimiento',
      robotsEvaluation.follow,
      robotsEvaluation.nofollow ? 'err' : 'ok',
      robotsEvaluation.nofollow
        ? 'La página tiene NOFOLLOW'
        : 'La página permite seguimiento'
    ]);

    checks.push([
      'og:title',
      ogTitle,
      ogTitle ? 'ok' : 'warn',
      ''
    ]);

    checks.push([
      'og:description',
      ogDescription,
      ogDescription ? 'ok' : 'warn',
      ''
    ]);

    checks.push([
      'og:image',
      ogImage,
      ogImage ? 'ok' : 'warn',
      ''
    ]);

    checks.push([
      'Imágenes sin alt',
      withoutAlt.length + ' de ' + images.length,
      withoutAlt.length === 0 ? 'ok' : 'warn',
      withoutAlt.length
        ? 'Revisar accesibilidad'
        : ''
    ]);

    checks.push([
      'Enlaces',
      links.length + ' (' + externalLinks + ' externos)',
      'info',
      emptyLinks
        ? emptyLinks + ' con href vacío o #'
        : ''
    ]);

    var html =
      '<div class="stats">' +
      '<div class="stat">' +
      '<div class="n">' +
      headings.length +
      '</div>' +
      '<div class="l">Encabezados</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n">' +
      images.length +
      '</div>' +
      '<div class="l">Imágenes</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n" style="color:' +
      (withoutAlt.length ? '#9a6700' : '#0f7b3f') +
      '">' +
      withoutAlt.length +
      '</div>' +
      '<div class="l">Sin alt</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n">' +
      links.length +
      '</div>' +
      '<div class="l">Enlaces</div>' +
      '</div>' +
      '</div>' +
      '<div class="tw">' +
      '<table>' +
      '<tr>' +
      '<th>Elemento</th>' +
      '<th>Valor</th>' +
      '<th>Estado</th>' +
      '<th>Observación</th>' +
      '</tr>';

    checks.forEach(function (check) {
      html += fila(
        check[0],
        check[1],
        check[2],
        check[3]
      );
    });

    html +=
      '</table>' +
      '</div>' +
      '<div class="row">' +
      '<button class="btn primary" id="xls">⬇ Excel</button>' +
      '<button class="btn" id="headingsButton">' +
      'Ver estructura de encabezados' +
      '</button>' +
      '</div>' +
      '<div id="headingsBox" ' +
      'style="display:none;margin-top:12px"></div>' +
      '<div class="hint" style="margin-top:10px">' +
      'Analizado: <code>' +
      U.esc(location.href.slice(0, 150)) +
      '</code>' +
      '</div>';

    content.innerHTML = html;

    content.querySelector('#xls').onclick = function () {
      var rows = checks.map(function (check, index) {
        return [
          index + 1,
          check[0],
          check[1],
          check[2].toUpperCase(),
          check[3]
        ];
      });

      rows.push([
        '',
        'URL analizada',
        location.href,
        '',
        ''
      ]);

      U.toExcel(
        [
          '#',
          'Elemento',
          'Valor',
          'Estado',
          'Observación'
        ],
        rows,
        'SEO',
        'seo_check_' + U.stamp() + '.xls',
        [34, 150, 400, 60, 260]
      );
    };

    content.querySelector('#headingsButton').onclick =
      function () {
        var box = content.querySelector('#headingsBox');

        if (box.style.display === 'block') {
          box.style.display = 'none';
          return;
        }

        var table =
          '<div class="tw">' +
          '<table>' +
          '<tr>' +
          '<th>Nivel</th>' +
          '<th>Texto</th>' +
          '</tr>';

        headings.forEach(function (heading) {
          var indentation =
            (parseInt(heading.type.charAt(1), 10) - 1) * 14;

          table +=
            '<tr>' +
            '<td>' +
            '<span class="pill p0">' +
            heading.type +
            '</span>' +
            '</td>' +
            '<td class="u" style="padding-left:' +
            (9 + indentation) +
            'px">' +
            U.esc(heading.text || '(vacío)') +
            '</td>' +
            '</tr>';
        });

        box.innerHTML =
          table + '</table></div>';

        box.style.display = 'block';
      };
  }

  /* =====================================================
     FORMULARIO PARA VARIAS URLS
  ===================================================== */

  function renderBulkForm() {
    var content = getContentRoot();

    var saved = '';

    try {
      saved = U.store
        ? U.store('seo_bulk_urls') || ''
        : '';
    } catch (e) {}

    content.innerHTML =
      '<div class="fld" style="margin-top:12px">' +
      '<label>URLs para analizar</label>' +
      '<textarea id="bulkUrls" rows="10" ' +
      'placeholder="Pega una URL por línea">' +
      U.esc(saved) +
      '</textarea>' +
      '</div>' +
      '<div class="row">' +
      '<button class="btn primary" id="startBulk">' +
      '🔎 Analizar URLs' +
      '</button>' +
      '<button class="btn" id="clearBulk">' +
      'Limpiar' +
      '</button>' +
      '</div>' +
      '<div class="hint" style="margin-top:10px">' +
      'La herramienta elimina URLs duplicadas automáticamente. ' +
      'Para leer el HTML, la URL debe permitir solicitudes desde ' +
      'el dominio actual.' +
      '</div>' +
      '<div id="bulkProgress" style="margin-top:12px"></div>' +
      '<div id="bulkResults" style="margin-top:12px"></div>';

    content.querySelector('#clearBulk').onclick = function () {
      content.querySelector('#bulkUrls').value = '';
      content.querySelector('#bulkProgress').innerHTML = '';
      content.querySelector('#bulkResults').innerHTML = '';
      resultadosMasivos = [];

      try {
        if (U.store) {
          U.store('seo_bulk_urls', '');
        }
      } catch (e) {}
    };

    content.querySelector('#startBulk').onclick = function () {
      var raw = content.querySelector('#bulkUrls').value || '';
      var urls = parseBulkUrls(raw);

      if (!urls.length) {
        alert('Ingresa al menos una URL válida.');
        return;
      }

      try {
        if (U.store) {
          U.store('seo_bulk_urls', raw);
        }
      } catch (e) {}

      runBulkAnalysis(urls);
    };
  }

  function parseBulkUrls(value) {
    var rawUrls = [];

    if (U.parseUrls) {
      try {
        rawUrls = U.parseUrls(value);
      } catch (e) {
        rawUrls = [];
      }
    }

    if (!rawUrls || !rawUrls.length) {
      rawUrls = String(value || '')
        .split(/[\n\r\t,;]+/)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);
    }

    var unique = [];
    var seen = {};

    rawUrls.forEach(function (item) {
      var url = String(item || '').trim();

      if (!/^https?:\/\//i.test(url)) {
        return;
      }

      try {
        url = new URL(url).href;
      } catch (e) {
        return;
      }

      if (!seen[url]) {
        seen[url] = true;
        unique.push(url);
      }
    });

    return unique;
  }

  /* =====================================================
     ANÁLISIS MASIVO
  ===================================================== */

  function analyzeUrl(url) {
    var startedAt = Date.now();

    return fetch(url, {
      method: 'GET',
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store'
    })
      .then(function (response) {
        var finalUrl = response.url || url;
        var xRobotsTag =
          response.headers.get('x-robots-tag') || '';

        return response.text().then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(
            html,
            'text/html'
          );

          var title = txt(doc.querySelector('title'));
          var description = meta(doc, 'description');
          var robots = meta(doc, 'robots');
          var canonical = getCanonical(doc, finalUrl);
          var lang =
            doc.documentElement.getAttribute('lang') || '';

          var h1Elements = Array.prototype.slice.call(
            doc.querySelectorAll('h1')
          );

          var h1Texts = h1Elements
            .map(function (element) {
              return txt(element);
            })
            .filter(Boolean);

          var robotsEvaluation = evaluateRobots(
            robots,
            xRobotsTag
          );

          var result = 'PASS';
          var observations = [];

          if (!response.ok) {
            result = 'FAIL';
            observations.push(
              'HTTP ' + response.status
            );
          }

          if (robotsEvaluation.noindex) {
            result = 'FAIL';
            observations.push('Se encontró NOINDEX');
          }

          if (robotsEvaluation.nofollow) {
            result = 'FAIL';
            observations.push('Se encontró NOFOLLOW');
          }

          if (!title) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push('Falta title');
          } else if (
            title.length < 30 ||
            title.length > 65
          ) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push(
              'Title fuera de 30-65 caracteres'
            );
          }

          if (!description) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push('Falta meta description');
          } else if (
            description.length < 70 ||
            description.length > 160
          ) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push(
              'Description fuera de 70-160 caracteres'
            );
          }

          if (h1Elements.length !== 1) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push(
              h1Elements.length +
                ' elementos H1'
            );
          }

          if (!canonical) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push('Falta canonical');
          } else if (!isSelfCanonical(finalUrl, canonical)) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push(
              'Canonical apunta a otra URL'
            );
          }

          if (!lang) {
            if (result !== 'FAIL') {
              result = 'WARNING';
            }

            observations.push('Falta atributo lang');
          }

          return {
            requestedUrl: url,
            finalUrl: finalUrl,
            redirected: finalUrl !== url,
            status: response.status,
            statusText: response.statusText || '',
            title: title,
            titleLength: title.length,
            description: description,
            descriptionLength: description.length,
            h1: h1Texts.join(' | '),
            h1Count: h1Elements.length,
            canonical: canonical,
            selfCanonical: isSelfCanonical(
              finalUrl,
              canonical
            ),
            robots: robots || 'No especificado',
            xRobotsTag:
              xRobotsTag || 'No especificado',
            index: robotsEvaluation.index,
            follow: robotsEvaluation.follow,
            lang: lang,
            result: result,
            observation:
              observations.join(' | ') || 'Sin incidencias',
            duration: Date.now() - startedAt,
            error: ''
          };
        });
      })
      .catch(function (error) {
        return {
          requestedUrl: url,
          finalUrl: '',
          redirected: false,
          status: 0,
          statusText: '',
          title: '',
          titleLength: 0,
          description: '',
          descriptionLength: 0,
          h1: '',
          h1Count: 0,
          canonical: '',
          selfCanonical: false,
          robots: 'No disponible',
          xRobotsTag: 'No disponible',
          index: 'NO VERIFICADO',
          follow: 'NO VERIFICADO',
          lang: '',
          result: 'FAIL',
          observation:
            'No se pudo leer la URL. Posible bloqueo CORS, ' +
            'error de red o certificado.',
          duration: Date.now() - startedAt,
          error: error && error.message
            ? error.message
            : String(error)
        };
      });
  }

  function runBulkAnalysis(urls) {
    var content = getContentRoot();
    var progress = content.querySelector('#bulkProgress');
    var resultsBox = content.querySelector('#bulkResults');
    var startButton = content.querySelector('#startBulk');

    resultadosMasivos = [];
    var completed = 0;
    var total = urls.length;
    var currentIndex = 0;
    var concurrency = Math.min(5, total);

    startButton.disabled = true;
    resultsBox.innerHTML = '';

    updateProgress();

    function updateProgress() {
      var percent = total
        ? Math.round((completed / total) * 100)
        : 0;

      progress.innerHTML =
        '<div class="hint">' +
        'Analizando ' +
        completed +
        ' de ' +
        total +
        ' URLs (' +
        percent +
        '%)' +
        '</div>';
    }

    function worker() {
      if (currentIndex >= total) {
        return Promise.resolve();
      }

      var index = currentIndex++;
      var url = urls[index];

      return analyzeUrl(url)
        .then(function (result) {
          resultadosMasivos[index] = result;
          completed++;
          updateProgress();
          renderBulkResults(false);
        })
        .then(worker);
    }

    var workers = [];

    for (var i = 0; i < concurrency; i++) {
      workers.push(worker());
    }

    Promise.all(workers).then(function () {
      startButton.disabled = false;
      renderBulkResults(true);

      progress.innerHTML =
        '<div class="hint">' +
        'Análisis finalizado: ' +
        total +
        ' URL(s).' +
        '</div>';
    });
  }

  /* =====================================================
     RESULTADOS MASIVOS
  ===================================================== */

  function renderBulkResults(finished) {
    var content = getContentRoot();
    var resultsBox = content.querySelector('#bulkResults');

    if (!resultsBox) {
      return;
    }

    var available = resultadosMasivos.filter(Boolean);

    if (!available.length) {
      return;
    }

    var pass = available.filter(function (item) {
      return item.result === 'PASS';
    }).length;

    var warnings = available.filter(function (item) {
      return item.result === 'WARNING';
    }).length;

    var fails = available.filter(function (item) {
      return item.result === 'FAIL';
    }).length;

    var noindex = available.filter(function (item) {
      return item.index === 'NOINDEX';
    }).length;

    var nofollow = available.filter(function (item) {
      return item.follow === 'NOFOLLOW';
    }).length;

    var html =
      '<div class="stats">' +
      '<div class="stat">' +
      '<div class="n" style="color:#0f7b3f">' +
      pass +
      '</div>' +
      '<div class="l">PASS</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n" style="color:#9a6700">' +
      warnings +
      '</div>' +
      '<div class="l">Warnings</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n" style="color:#c62828">' +
      fails +
      '</div>' +
      '<div class="l">Fail</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n" style="color:#c62828">' +
      noindex +
      '</div>' +
      '<div class="l">Noindex</div>' +
      '</div>' +
      '<div class="stat">' +
      '<div class="n" style="color:#c62828">' +
      nofollow +
      '</div>' +
      '<div class="l">Nofollow</div>' +
      '</div>' +
      '</div>' +
      '<div class="tw">' +
      '<table>' +
      '<tr>' +
      '<th>#</th>' +
      '<th>URL</th>' +
      '<th>HTTP</th>' +
      '<th>Robots</th>' +
      '<th>X-Robots</th>' +
      '<th>Index</th>' +
      '<th>Follow</th>' +
      '<th>Title</th>' +
      '<th>Meta description</th>' +
      '<th>H1</th>' +
      '<th>Canonical</th>' +
      '<th>Resultado</th>' +
      '<th>Observación</th>' +
      '</tr>';

    resultadosMasivos.forEach(function (item, index) {
      if (!item) {
        return;
      }

      var httpState = statusClass(item.status);
      var indexState =
        item.index === 'INDEX'
          ? 'ok'
          : item.index === 'NOINDEX'
          ? 'err'
          : 'warn';

      var followState =
        item.follow === 'FOLLOW'
          ? 'ok'
          : item.follow === 'NOFOLLOW'
          ? 'err'
          : 'warn';

      var titleState =
        !item.title
          ? 'err'
          : item.titleLength < 30 ||
            item.titleLength > 65
          ? 'warn'
          : 'ok';

      var descriptionState =
        !item.description
          ? 'err'
          : item.descriptionLength < 70 ||
            item.descriptionLength > 160
          ? 'warn'
          : 'ok';

      var h1State =
        item.h1Count === 1
          ? 'ok'
          : item.h1Count === 0
          ? 'err'
          : 'warn';

      var canonicalState =
        !item.canonical
          ? 'warn'
          : item.selfCanonical
          ? 'ok'
          : 'warn';

      html +=
        '<tr>' +
        '<td>' +
        (index + 1) +
        '</td>' +
        '<td class="u">' +
        '<a href="' +
        U.esc(item.requestedUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        U.esc(item.requestedUrl) +
        '</a>' +
        (item.redirected
          ? '<div class="hint">Final: ' +
            U.esc(item.finalUrl) +
            '</div>'
          : '') +
        '</td>' +
        '<td>' +
        pill(
          item.status
            ? String(item.status)
            : 'ERROR',
          httpState
        ) +
        '</td>' +
        '<td class="u">' +
        U.esc(item.robots) +
        '</td>' +
        '<td class="u">' +
        U.esc(item.xRobotsTag) +
        '</td>' +
        '<td>' +
        pill(item.index, indexState) +
        '</td>' +
        '<td>' +
        pill(item.follow, followState) +
        '</td>' +
        '<td class="u">' +
        pill(
          item.titleLength
            ? item.titleLength + ' chars'
            : 'Falta',
          titleState
        ) +
        '<div>' +
        U.esc(item.title || '—') +
        '</div>' +
        '</td>' +
        '<td class="u">' +
        pill(
          item.descriptionLength
            ? item.descriptionLength + ' chars'
            : 'Falta',
          descriptionState
        ) +
        '<div>' +
        U.esc(item.description || '—') +
        '</div>' +
        '</td>' +
        '<td class="u">' +
        pill(
          item.h1Count + ' H1',
          h1State
        ) +
        '<div>' +
        U.esc(item.h1 || '—') +
        '</div>' +
        '</td>' +
        '<td class="u">' +
        pill(
          item.canonical
            ? item.selfCanonical
              ? 'SELF'
              : 'OTHER'
            : 'FALTA',
          canonicalState
        ) +
        '<div>' +
        U.esc(item.canonical || '—') +
        '</div>' +
        '</td>' +
        '<td>' +
        pill(
          item.result,
          resultClass(item.result)
        ) +
        '</td>' +
        '<td class="u">' +
        U.esc(item.observation) +
        (item.error
          ? '<div class="hint">' +
            U.esc(item.error) +
            '</div>'
          : '') +
        '</td>' +
        '</tr>';
    });

    html += '</table></div>';

    if (finished) {
      html +=
        '<div class="row">' +
        '<button class="btn primary" id="bulkExcel">' +
        '⬇ Excel' +
        '</button>' +
        '<button class="btn" id="onlyProblems">' +
        'Mostrar solo problemas' +
        '</button>' +
        '<button class="btn" id="showAll">' +
        'Mostrar todos' +
        '</button>' +
        '</div>';
    }

    resultsBox.innerHTML = html;

    if (finished) {
      resultsBox.querySelector('#bulkExcel').onclick =
        exportBulkExcel;

      resultsBox.querySelector('#onlyProblems').onclick =
        function () {
          var rows =
            resultsBox.querySelectorAll('table tr');

          for (var i = 1; i < rows.length; i++) {
            var result =
              resultadosMasivos[i - 1];

            rows[i].style.display =
              result && result.result !== 'PASS'
                ? ''
                : 'none';
          }
        };

      resultsBox.querySelector('#showAll').onclick =
        function () {
          var rows =
            resultsBox.querySelectorAll('table tr');

          for (var i = 1; i < rows.length; i++) {
            rows[i].style.display = '';
          }
        };
    }
  }

  function exportBulkExcel() {
    var rows = resultadosMasivos
      .filter(Boolean)
      .map(function (item, index) {
        return [
          index + 1,
          item.requestedUrl,
          item.finalUrl,
          item.redirected ? 'Sí' : 'No',
          item.status || 'ERROR',
          item.title,
          item.titleLength,
          item.description,
          item.descriptionLength,
          item.h1,
          item.h1Count,
          item.canonical,
          item.selfCanonical ? 'Sí' : 'No',
          item.robots,
          item.xRobotsTag,
          item.index,
          item.follow,
          item.lang,
          item.result,
          item.observation,
          item.error,
          item.duration + ' ms'
        ];
      });

    U.toExcel(
      [
        '#',
        'URL solicitada',
        'URL final',
        'Redirección',
        'HTTP',
        'Title',
        'Longitud title',
        'Meta description',
        'Longitud description',
        'H1',
        'Cantidad H1',
        'Canonical',
        'Canonical autorreferencial',
        'Meta robots',
        'X-Robots-Tag',
        'Indexación',
        'Seguimiento',
        'Lang',
        'Resultado',
        'Observación',
        'Error',
        'Tiempo'
      ],
      rows,
      'SEO Masivo',
      'seo_check_masivo_' + U.stamp() + '.xls',
      [
        35,
        320,
        320,
        70,
        60,
        300,
        80,
        400,
        100,
        300,
        70,
        320,
        110,
        150,
        150,
        80,
        80,
        60,
        80,
        350,
        250,
        80
      ]
    );
  }

  renderInicio();
});
