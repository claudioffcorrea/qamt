/* ---------- Status HTTP ---------- */
QAMT.tool({
  id: 'status-http', name: 'Status HTTP', icon: '📊', group: 'URLs',
  desc: 'Verifica 200 / 301 / 404 y exporta a Excel'
}, function (ctx) {
  var U = ctx.util, root = ctx.root, ORIGEN = location.origin;

  root.innerHTML =
      '<div class="note"><b>Ejecuta el marcador dentro del dominio que auditas</b>'
    + 'Códigos exactos para URLs de <code>' + U.esc(ORIGEN) + '</code>. Las de otros dominios solo se reportan como alcanzables.</div>'
    + '<label class="fld">Listado de URLs</label>'
    + '<div class="hint">Una por línea. Se analizan de a 6 en paralelo. Las rutas relativas usan el dominio actual.</div>'
    + '<textarea id="ta" spellcheck="false" placeholder="https://www.ejemplo.com/pagina-1&#10;/ruta-relativa-tambien-sirve"></textarea>'
    + '<div class="row">'
    + '<button class="btn primary" id="go">Analizar</button>'
    + '<button class="btn" id="stop" disabled>Detener</button>'
    + '<button class="btn" id="xls" disabled>⬇ Excel</button>'
    + '<button class="btn" id="csv" disabled>⬇ CSV</button>'
    + '<button class="btn" id="clr">Limpiar</button>'
    + '<label class="chk"><input type="checkbox" id="only"> Solo errores</label>'
    + '</div><div class="bar"><i id="bar"></i></div><div class="msg" id="msg"></div>'
    + '<div id="res" style="display:none"><div class="stats" id="stats"></div>'
    + '<div class="tw"><table id="tbl"></table></div></div>';

  var $ = function (s) { return root.querySelector(s); };
  var ta = $('#ta'), msg = $('#msg'), bar = $('#bar'), tbl = $('#tbl'),
      res = $('#res'), stats = $('#stats'), goB = $('#go'), stopB = $('#stop'),
      xlsB = $('#xls'), csvB = $('#csv'), onlyB = $('#only');
  var rows = [], stop = false, MAX = 6;
  U.remember(ta, 'statusUrls'); ta.focus();

  function cls(c) { if (!c) return 'p0'; if (c < 300) return 'p2'; if (c < 400) return 'p3'; return 'p4'; }

  function check(url, cb) {
    var t0 = Date.now(), same = false;
    try { same = (new URL(url).origin === ORIGEN); } catch (e) { }
    var fin = function (o) {
      o.url = url; o.ms = Date.now() - t0;
      o.scope = same ? 'Mismo dominio' : 'Otro dominio'; cb(o);
    };
    fetch(url, { method: 'GET', credentials: same ? 'same-origin' : 'omit', redirect: 'follow', cache: 'no-store' })
      .then(function (r) {
        fin({ code: r.status, result: r.statusText || (r.ok ? 'OK' : '—'),
              red: r.redirected ? 'Sí' : 'No', fin: r.url || url,
              tipo: (r.headers.get('content-type') || '').split(';')[0] });
      })
      .catch(function () {
        fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' })
          .then(function () { fin({ code: 0, result: 'Alcanzable (bloqueado por CORS)', red: '—', fin: '—', tipo: '' }); })
          .catch(function () { fin({ code: 0, result: 'Error / no alcanzable', red: '—', fin: '—', tipo: '' }); });
      });
  }

  function render(total) {
    var n2 = 0, n3 = 0, n4 = 0, n0 = 0, solo = onlyB.checked;
    var h = '<tr><th>#</th><th>URL</th><th>Status</th><th>Red.</th><th>ms</th></tr>';
    rows.forEach(function (r, i) {
      var c = r.code;
      if (!c) n0++; else if (c < 300) n2++; else if (c < 400) n3++; else n4++;
      if (solo && c && c < 400) return;
      h += '<tr><td>' + (i + 1) + '</td><td class="u">' + U.esc(r.url) + '</td>'
        + '<td><span class="pill ' + cls(c) + '">' + (c ? c : '—') + '</span> ' + U.esc(r.result) + '</td>'
        + '<td>' + U.esc(r.red) + '</td><td style="text-align:right">' + r.ms + '</td></tr>';
    });
    tbl.innerHTML = h;
    stats.innerHTML =
        '<div class="stat"><div class="n">' + rows.length + (total ? ' / ' + total : '') + '</div><div class="l">Analizadas</div></div>'
      + '<div class="stat"><div class="n" style="color:#0f7b3f">' + n2 + '</div><div class="l">2xx</div></div>'
      + '<div class="stat"><div class="n" style="color:#9a6700">' + n3 + '</div><div class="l">3xx</div></div>'
      + '<div class="stat"><div class="n" style="color:#c0342b">' + n4 + '</div><div class="l">4xx/5xx</div></div>'
      + '<div class="stat"><div class="n" style="color:#5b6673">' + n0 + '</div><div class="l">Sin dato</div></div>';
  }
  onlyB.onchange = function () { if (rows.length) render(0); };

  var HEAD = ['#', 'URL', 'Status', 'Resultado', 'Redirección', 'URL final', 'Tiempo (ms)', 'Tipo', 'Alcance'];
  var ANCHOS = [34, 330, 50, 170, 70, 300, 70, 120, 100];
  function matrix() {
    return rows.map(function (r, i) { return [i + 1, r.url, (r.code || ''), r.result, r.red, r.fin, r.ms, r.tipo || '', r.scope]; });
  }

  goB.onclick = function () {
    var list = U.parseUrls(ta.value);
    if (!list.length) { msg.innerHTML = '<span class="err">No se encontraron URLs válidas.</span>'; return; }
    rows = []; stop = false; res.style.display = 'block'; render(list.length);
    goB.disabled = true; stopB.disabled = false; xlsB.disabled = true; csvB.disabled = true;
    var idx = 0, done = 0;
    function endState() { goB.disabled = false; stopB.disabled = true; xlsB.disabled = csvB.disabled = (rows.length === 0); }
    function next() {
      if (stop || idx >= list.length) return;
      check(list[idx++], function (r) {
        rows.push(r); done++;
        bar.style.width = Math.round(done / list.length * 100) + '%';
        msg.innerHTML = 'Analizando <b>' + done + '</b> de ' + list.length + '…';
        render(list.length);
        if (stop) return;
        if (done === list.length) {
          msg.innerHTML = '<span class="ok">Listo: <b>' + done + '</b> URLs analizadas.</span> Ya puedes exportar.';
          endState();
        } else next();
      });
    }
    for (var k = 0; k < Math.min(MAX, list.length); k++) next();
  };

  stopB.onclick = function () {
    stop = true; stopB.disabled = true; goB.disabled = false;
    xlsB.disabled = csvB.disabled = (rows.length === 0);
    msg.innerHTML = '<span class="warn">Detenido.</span> <b>' + rows.length + '</b> URLs analizadas.';
  };
  $('#clr').onclick = function () {
    ta.value = ''; rows = []; res.style.display = 'none'; msg.textContent = '';
    bar.style.width = '0'; xlsB.disabled = csvB.disabled = true; U.store.del('statusUrls'); ta.focus();
  };
  xlsB.onclick = function () { U.toExcel(HEAD, matrix(), 'Status HTTP', 'status_urls_' + U.stamp() + '.xls', ANCHOS); };
  csvB.onclick = function () { U.toCsv(HEAD, matrix(), 'status_urls_' + U.stamp() + '.csv'); };
});
