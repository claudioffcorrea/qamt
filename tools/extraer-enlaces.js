/* ---------- Extraer enlaces de la página actual ---------- */
QAMT.tool({
  id: 'extraer-enlaces', name: 'Extraer enlaces', icon: '🔗', group: 'Página actual',
  desc: 'Saca todos los enlaces para analizarlos o abrirlos'
}, function (ctx) {
  var U = ctx.util, root = ctx.root, D = document;

  var todos = [];
  Array.prototype.forEach.call(D.querySelectorAll('a[href]'), function (a) {
    var href = a.getAttribute('href') || '';
    if (!href || href === '#' || /^(javascript|mailto|tel):/i.test(href)) return;
    var abs = a.href, interno = true;
    try { interno = (new URL(abs).origin === location.origin); } catch (e) { return; }
    todos.push({ url: abs, texto: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), interno: interno });
  });

  var vistos = {}, unicos = [];
  todos.forEach(function (l) { if (!vistos[l.url]) { vistos[l.url] = 1; unicos.push(l); } });

  root.innerHTML =
      '<div class="stats">'
    + '<div class="stat"><div class="n">' + unicos.length + '</div><div class="l">Únicos</div></div>'
    + '<div class="stat"><div class="n">' + todos.length + '</div><div class="l">Totales</div></div>'
    + '<div class="stat"><div class="n">' + unicos.filter(function (l) { return l.interno; }).length + '</div><div class="l">Internos</div></div>'
    + '<div class="stat"><div class="n">' + unicos.filter(function (l) { return !l.interno; }).length + '</div><div class="l">Externos</div></div>'
    + '</div>'
    + '<div class="row" style="margin-top:0">'
    + '<label class="chk"><input type="radio" name="f" value="todos" checked> Todos</label>'
    + '<label class="chk"><input type="radio" name="f" value="int"> Solo internos</label>'
    + '<label class="chk"><input type="radio" name="f" value="ext"> Solo externos</label>'
    + '</div>'
    + '<label class="fld" style="margin-top:12px">Listado</label>'
    + '<div class="hint">Cópialo y pégalo en <b>Status HTTP</b> o en <b>Abrir varias URLs</b>.</div>'
    + '<textarea id="out" spellcheck="false" readonly></textarea>'
    + '<div class="row">'
    + '<button class="btn primary" id="cp">Copiar listado</button>'
    + '<button class="btn" id="xls">⬇ Excel</button>'
    + '<button class="btn" id="ir">Analizar en Status HTTP</button>'
    + '</div><div class="msg" id="msg"></div>';

  var out = root.querySelector('#out'), msg = root.querySelector('#msg');

  function filtrados() {
    var v = 'todos';
    Array.prototype.forEach.call(root.querySelectorAll('input[name=f]'), function (r) { if (r.checked) v = r.value; });
    return unicos.filter(function (l) { return v === 'todos' || (v === 'int' ? l.interno : !l.interno); });
  }
  function pintar() { out.value = filtrados().map(function (l) { return l.url; }).join('\n'); }
  Array.prototype.forEach.call(root.querySelectorAll('input[name=f]'), function (r) { r.onchange = pintar; });
  pintar();

  root.querySelector('#cp').onclick = function () {
    out.select();
    U.copy(out.value, function (ok) {
      if (!ok) { try { document.execCommand('copy'); ok = true; } catch (e) { } }
      msg.innerHTML = ok
        ? '<span class="ok">Listado copiado (' + filtrados().length + ' enlaces).</span>'
        : '<span class="err">No se pudo copiar: selecciona el texto manualmente.</span>';
    });
  };

  root.querySelector('#xls').onclick = function () {
    var rows = filtrados().map(function (l, i) { return [i + 1, l.url, l.texto, l.interno ? 'Interno' : 'Externo']; });
    U.toExcel(['#', 'URL', 'Texto del enlace', 'Tipo'], rows, 'Enlaces',
      'enlaces_' + U.stamp() + '.xls', [34, 380, 260, 80]);
  };

  root.querySelector('#ir').onclick = function () {
    U.store.set('statusUrls', out.value);
    ctx.panel.run('status-http');
  };
});
