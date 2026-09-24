/* ---------- Abrir varias URLs ---------- */
QAMT.tool({
  id: 'open-urls', name: 'Abrir varias URLs', icon: '🗂️', group: 'URLs',
  desc: 'Abre un listado completo en pestañas separadas'
}, function (ctx) {
  var U = ctx.util, root = ctx.root;

  root.innerHTML =
      '<label class="fld">Listado de URLs</label>'
    + '<div class="hint">Una por línea. Se limpian comillas y comas, se agrega <code>https://</code> si falta y se descartan duplicados.</div>'
    + '<textarea id="ta" spellcheck="false" placeholder="https://www.ejemplo.com/pagina-1&#10;www.ejemplo.com/pagina-2"></textarea>'
    + '<div class="row">'
    + '<button class="btn primary" id="go">Abrir pestañas</button>'
    + '<button class="btn" id="clr">Limpiar</button>'
    + '<label class="chk"><input type="checkbox" id="rev"> Orden inverso</label>'
    + '<label class="chk"><input type="checkbox" id="slow" checked> Escalonada</label>'
    + '</div><div class="msg" id="msg"></div>'
    + '<div class="note" style="margin-top:12px"><b>Si no se abren todas</b>'
    + 'Permite las ventanas emergentes para este sitio en el aviso de la barra de direcciones y vuelve a pulsar.</div>';

  var $ = function (s) { return root.querySelector(s); };
  var ta = $('#ta'), msg = $('#msg');
  U.remember(ta, 'openUrls'); ta.focus();

  $('#clr').onclick = function () { ta.value = ''; msg.textContent = ''; U.store.del('openUrls'); ta.focus(); };

  $('#go').onclick = function () {
    var list = U.parseUrls(ta.value);
    if (!list.length) { msg.innerHTML = '<span class="err">No se encontraron URLs válidas.</span>'; return; }
    if ($('#rev').checked) list.reverse();
    var slow = $('#slow').checked, ok = 0, bad = 0, i = 0;
    (function fire() {
      if (i >= list.length) {
        msg.innerHTML = bad
          ? 'Abiertas <b>' + ok + '</b> de ' + list.length + '. <span class="err">' + bad + ' bloqueadas por el navegador.</span>'
          : '<span class="ok">Abiertas <b>' + ok + '</b> de ' + list.length + ' pestañas.</span>';
        return;
      }
      var w = window.open(list[i++], '_blank', 'noopener');
      if (w) ok++; else bad++;
      msg.innerHTML = 'Abriendo ' + i + ' de ' + list.length + '…';
      slow ? setTimeout(fire, 220) : fire();
    })();
  };
});
