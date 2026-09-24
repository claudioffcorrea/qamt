/* ---------- Chequeo SEO de la página actual ---------- */
QAMT.tool({
  id: 'seo-check', name: 'Chequeo SEO', icon: '🔎', group: 'Página actual',
  desc: 'Title, meta, H1-H6, imágenes sin alt y enlaces'
}, function (ctx) {
  var U = ctx.util, root = ctx.root, D = document;

  function txt(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function meta(n, attr) {
    var e = D.querySelector('meta[' + (attr || 'name') + '="' + n + '"]');
    return e ? (e.getAttribute('content') || '').trim() : '';
  }

  var title = txt(D.querySelector('title')), desc = meta('description');
  var canon = (D.querySelector('link[rel="canonical"]') || {}).href || '';
  var robots = meta('robots'), lang = D.documentElement.getAttribute('lang') || '';
  var ogT = meta('og:title', 'property'), ogD = meta('og:description', 'property'), ogI = meta('og:image', 'property');

  var hs = [];
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(function (t) {
    Array.prototype.forEach.call(D.querySelectorAll(t), function (e) { hs.push({ t: t.toUpperCase(), x: txt(e) }); });
  });
  var h1 = hs.filter(function (h) { return h.t === 'H1'; });
  var imgs = Array.prototype.slice.call(D.images || []);
  var sinAlt = imgs.filter(function (m) { return !m.getAttribute('alt'); });
  var links = Array.prototype.slice.call(D.querySelectorAll('a[href]'));
  var ext = 0, vacios = 0;
  links.forEach(function (a) {
    var h = a.getAttribute('href') || '';
    if (!h || h === '#') { vacios++; return; }
    try { if (new URL(a.href).origin !== location.origin) ext++; } catch (e) { }
  });

  var chk = [];
  chk.push(['Title', title, !title ? 'err' : (title.length < 30 || title.length > 65 ? 'warn' : 'ok'),
    title ? title.length + ' caracteres (ideal 30-65)' : 'Falta el title']);
  chk.push(['Meta description', desc, !desc ? 'err' : (desc.length < 70 || desc.length > 160 ? 'warn' : 'ok'),
    desc ? desc.length + ' caracteres (ideal 70-160)' : 'Falta la descripción']);
  chk.push(['H1', h1.map(function (h) { return h.x; }).join(' | '),
    h1.length === 1 ? 'ok' : (h1.length === 0 ? 'err' : 'warn'), h1.length + ' encontrado(s)']);
  chk.push(['Canonical', canon, canon ? 'ok' : 'warn', canon ? '' : 'Sin etiqueta canonical']);
  chk.push(['Idioma (lang)', lang, lang ? 'ok' : 'warn', '']);
  chk.push(['Meta robots', robots, /noindex/i.test(robots) ? 'err' : 'ok',
    /noindex/i.test(robots) ? 'La página está marcada como noindex' : '']);
  chk.push(['og:title', ogT, ogT ? 'ok' : 'warn', '']);
  chk.push(['og:description', ogD, ogD ? 'ok' : 'warn', '']);
  chk.push(['og:image', ogI, ogI ? 'ok' : 'warn', '']);
  chk.push(['Imágenes sin alt', sinAlt.length + ' de ' + imgs.length, sinAlt.length === 0 ? 'ok' : 'warn',
    sinAlt.length ? 'Revisar accesibilidad' : '']);
  chk.push(['Enlaces', links.length + ' (' + ext + ' externos)', 'info', vacios ? vacios + ' con href vacío o #' : '']);

  function fila(et, val, estado, obs) {
    var cl = estado === 'ok' ? 'p2' : (estado === 'warn' ? 'p3' : (estado === 'err' ? 'p4' : 'p0'));
    var ic = estado === 'ok' ? 'OK' : (estado === 'warn' ? '!' : (estado === 'err' ? 'X' : '—'));
    return '<tr><td><b>' + U.esc(et) + '</b></td><td class="u">' + U.esc(val || '—') + '</td>'
      + '<td><span class="pill ' + cl + '">' + ic + '</span></td><td>' + U.esc(obs || '') + '</td></tr>';
  }

  var h = '<div class="stats">'
    + '<div class="stat"><div class="n">' + hs.length + '</div><div class="l">Encabezados</div></div>'
    + '<div class="stat"><div class="n">' + imgs.length + '</div><div class="l">Imágenes</div></div>'
    + '<div class="stat"><div class="n" style="color:' + (sinAlt.length ? '#9a6700' : '#0f7b3f') + '">' + sinAlt.length + '</div><div class="l">Sin alt</div></div>'
    + '<div class="stat"><div class="n">' + links.length + '</div><div class="l">Enlaces</div></div></div>'
    + '<div class="tw"><table><tr><th>Elemento</th><th>Valor</th><th>Estado</th><th>Observación</th></tr>';
  chk.forEach(function (c) { h += fila(c[0], c[1], c[2], c[3]); });
  h += '</table></div><div class="row"><button class="btn primary" id="xls">⬇ Excel</button>'
    + '<button class="btn" id="hsb">Ver estructura de encabezados</button></div>'
    + '<div id="hbox" style="display:none;margin-top:12px"></div>'
    + '<div class="hint" style="margin-top:10px">Analizado: <code>' + U.esc(location.href.slice(0, 120)) + '</code></div>';
  root.innerHTML = h;

  root.querySelector('#xls').onclick = function () {
    var rows = chk.map(function (c, i) { return [i + 1, c[0], c[1], c[2].toUpperCase(), c[3]]; });
    rows.push(['', 'URL analizada', location.href, '', '']);
    U.toExcel(['#', 'Elemento', 'Valor', 'Estado', 'Observación'], rows, 'SEO',
      'seo_check_' + U.stamp() + '.xls', [34, 150, 400, 60, 260]);
  };
  root.querySelector('#hsb').onclick = function () {
    var box = root.querySelector('#hbox');
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    var t = '<div class="tw"><table><tr><th>Nivel</th><th>Texto</th></tr>';
    hs.forEach(function (x) {
      var ind = (parseInt(x.t.charAt(1), 10) - 1) * 14;
      t += '<tr><td><span class="pill p0">' + x.t + '</span></td>'
        + '<td class="u" style="padding-left:' + (9 + ind) + 'px">' + U.esc(x.x || '(vacío)') + '</td></tr>';
    });
    box.innerHTML = t + '</table></div>'; box.style.display = 'block';
  };
});
