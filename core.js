/* ============================================================
   QA Multitool — NÚCLEO (modo remoto)
   Se carga desde el marcador. Lee manifest.js y las herramientas
   de la misma carpeta. No contiene datos de ninguna empresa.
   ============================================================ */
(function () {
  if (window.QAMT && window.QAMT._panel) { window.QAMT._panel(); return; }

  var BASE = (window.QAMT_BASE || '').replace(/\/?$/, '/');
  var ESPERA = 12000;
  var Q = window.QAMT = {};
  Q.base = BASE;
  Q.tools = [];

  /* Registro de herramientas: QAMT.tool({...}, function(ctx){}) */
  Q.tool = function (meta, fn) { meta = meta || {}; meta.run = fn; Q.tools.push(meta); };

  /* ---------- Utilidades compartidas ---------- */
  var U = Q.util = {};

  U.parseUrls = function (text) {
    var raw = String(text || '').split(/[\r\n]+/), out = [], seen = {}, i, u;
    for (i = 0; i < raw.length; i++) {
      u = raw[i].trim().replace(/^[<"']+|[>"',;]+$/g, '');
      if (!u || u.charAt(0) === '#') continue;
      if (!/^https?:\/\//i.test(u)) {
        if (/^\/\//.test(u)) u = 'https:' + u;
        else if (/^\//.test(u)) u = location.origin + u;
        else if (/^[\w.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(u)) u = 'https://' + u;
        else continue;
      }
      if (seen[u]) continue;
      seen[u] = 1; out.push(u);
    }
    return out;
  };

  U.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  U.stamp = function () {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  };

  U.download = function (content, type, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2500);
  };

  U.toExcel = function (head, rows, sheet, file, widths) {
    var e = U.esc;
    var x = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'
      + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
      + '<Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/>'
      + '<Interior ss:Color="#0F6CBD" ss:Pattern="Solid"/></Style>'
      + '<Style ss:ID="c"><Alignment ss:Vertical="Top"/></Style></Styles>'
      + '<Worksheet ss:Name="' + e(sheet) + '"><Table>';
    (widths || []).forEach(function (w) { x += '<Column ss:Width="' + w + '"/>'; });
    x += '<Row>';
    head.forEach(function (h) { x += '<Cell ss:StyleID="h"><Data ss:Type="String">' + e(h) + '</Data></Cell>'; });
    x += '</Row>';
    rows.forEach(function (r) {
      x += '<Row>';
      r.forEach(function (v) {
        var num = (typeof v === 'number' && isFinite(v));
        x += '<Cell ss:StyleID="c"><Data ss:Type="' + (num ? 'Number' : 'String') + '">' + e(v) + '</Data></Cell>';
      });
      x += '</Row>';
    });
    x += '</Table></Worksheet></Workbook>';
    U.download(x, 'application/vnd.ms-excel', file);
  };

  U.toCsv = function (head, rows, file) {
    var q = function (s) { return '"' + String(s === undefined || s === null ? '' : s).replace(/"/g, '""') + '"'; };
    var out = [head.map(q).join(';')];
    rows.forEach(function (r) { out.push(r.map(q).join(';')); });
    U.download('\uFEFF' + out.join('\r\n'), 'text/csv;charset=utf-8', file);
  };

  U.store = {
    get: function (k) { try { return localStorage.getItem('qamt.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('qamt.' + k, v); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem('qamt.' + k); } catch (e) { } }
  };

  U.remember = function (el, key) {
    var v = U.store.get(key); if (v) el.value = v;
    el.addEventListener('input', function () { U.store.set(key, el.value); });
  };

  U.copy = function (texto, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { cb(true); }, function () { cb(false); });
    } else cb(false);
  };

  /* ---------- Panel ---------- */
  var host, shadow, root, titleEl, backEl, bodyEl, footEl;

  var CSS = ''
    + ':host{all:initial}'
    + '*{box-sizing:border-box;font-family:"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif}'
    + '.wrap{position:fixed;z-index:2147483647;top:16px;right:16px;width:560px;max-width:calc(100vw - 24px);'
    + 'max-height:88vh;display:flex;flex-direction:column;background:#fff;color:#1b1f24;border:1px solid #e2e7ee;'
    + 'border-radius:12px;box-shadow:0 12px 40px rgba(16,24,40,.22);font-size:14px;line-height:1.5;overflow:hidden}'
    + '.hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #e2e7ee;'
    + 'background:#f7f9fc;cursor:move;user-select:none}'
    + '.lg{width:26px;height:26px;border-radius:7px;background:#0f6cbd;color:#fff;display:flex;align-items:center;'
    + 'justify-content:center;font-weight:700;font-size:11px;flex:none}'
    + '.ti{font-weight:600;font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.ib{border:0;background:none;cursor:pointer;font-size:16px;line-height:1;padding:4px 7px;border-radius:6px;color:#5b6673}'
    + '.ib:hover{background:#e8f1fb;color:#0f6cbd}'
    + '.bd{padding:14px;overflow:auto;flex:1}'
    + '.ft{padding:7px 14px;border-top:1px solid #e2e7ee;background:#f7f9fc;font-size:11px;color:#8a94a0;'
    + 'display:flex;justify-content:space-between;gap:10px}'
    + '.sb{position:relative;margin-bottom:10px}'
    + '.sb input{width:100%;padding:8px 11px 8px 30px;border:1px solid #e2e7ee;border-radius:8px;background:#f7f9fc;'
    + 'font-size:13px;outline:none;color:#1b1f24}'
    + '.sb input:focus{border-color:#0f6cbd;box-shadow:0 0 0 3px #e8f1fb}'
    + '.sb .mg{position:absolute;left:10px;top:8px;color:#8a94a0;font-size:12px}'
    + '.menu{display:flex;flex-direction:column;gap:7px}'
    + '.mi{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e2e7ee;border-radius:9px;'
    + 'background:#fff;cursor:pointer;text-align:left;transition:.12s;width:100%}'
    + '.mi:hover,.mi.sel{border-color:#0f6cbd;background:#f4f9ff}'
    + '.mi .ic{font-size:20px;flex:none;width:26px;text-align:center}'
    + '.mi .tx{flex:1;min-width:0}'
    + '.mi .nm{font-weight:600;font-size:13.5px;display:block}'
    + '.mi .ds{font-size:12px;color:#5b6673;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.mi .ar{color:#b6c0cc;font-size:15px}'
    + '.grp{font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8a94a0;margin:6px 0 1px;font-weight:600}'
    + 'label.fld{display:block;font-size:13px;font-weight:600;margin-bottom:5px}'
    + '.hint{font-size:12px;color:#5b6673;margin:-1px 0 7px}'
    + 'textarea,input[type=text],select{width:100%;background:#f7f9fc;border:1px solid #e2e7ee;border-radius:8px;'
    + 'padding:9px 11px;outline:none;color:#1b1f24;font-size:13px}'
    + 'textarea{min-height:140px;resize:vertical;font-family:Consolas,"Cascadia Mono",monospace;line-height:1.5}'
    + 'textarea:focus,input:focus{border-color:#0f6cbd;box-shadow:0 0 0 3px #e8f1fb}'
    + '.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:11px}'
    + '.btn{border:1px solid #e2e7ee;background:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;'
    + 'font-weight:600;font-size:13px;color:#1b1f24;transition:.12s}'
    + '.btn:hover:not(:disabled){border-color:#0f6cbd;color:#0f6cbd}'
    + '.btn.primary{background:#0f6cbd;border-color:#0f6cbd;color:#fff}'
    + '.btn.primary:hover:not(:disabled){filter:brightness(1.08);color:#fff}'
    + '.btn:disabled{opacity:.45;cursor:not-allowed}'
    + '.chk{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#5b6673;cursor:pointer}'
    + '.msg{margin-top:10px;font-size:13px;min-height:19px}'
    + '.msg b{color:#1b1f24}.err{color:#c0342b}.ok{color:#0f7b3f}.warn{color:#9a6700}'
    + '.note{background:#e8f1fb;border:1px solid #d3e3f5;border-left:3px solid #0f6cbd;border-radius:8px;'
    + 'padding:10px 12px;font-size:12.5px;margin-bottom:12px}'
    + '.note.bad{background:#fbe6e4;border-color:#f3cdc9;border-left-color:#c0342b}'
    + '.note b{display:block;margin-bottom:2px}'
    + 'code{background:#f0f3f7;border:1px solid #e2e7ee;border-radius:4px;padding:1px 4px;font-size:12px;'
    + 'font-family:Consolas,monospace;word-break:break-all}'
    + '.bar{height:5px;border-radius:99px;background:#e2e7ee;overflow:hidden;margin:10px 0 2px}'
    + '.bar>i{display:block;height:100%;background:#0f6cbd;width:0;transition:width .2s}'
    + '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;margin:12px 0}'
    + '.stat{background:#f7f9fc;border:1px solid #e2e7ee;border-radius:8px;padding:8px 10px}'
    + '.stat .n{font-size:18px;font-weight:700;line-height:1.1}'
    + '.stat .l{font-size:10.5px;color:#5b6673;text-transform:uppercase;letter-spacing:.4px}'
    + '.tw{overflow:auto;border:1px solid #e2e7ee;border-radius:8px;max-height:42vh}'
    + 'table{width:100%;border-collapse:collapse;font-size:12px}'
    + 'th{position:sticky;top:0;background:#f7f9fc;text-align:left;padding:7px 9px;border-bottom:1px solid #e2e7ee;'
    + 'font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#5b6673}'
    + 'td{padding:6px 9px;border-bottom:1px solid #eef1f5;vertical-align:top}'
    + 'td.u{word-break:break-all;max-width:300px}'
    + '.pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:700}'
    + '.p2{background:#e3f4ea;color:#0f7b3f}.p3{background:#fbf0d9;color:#9a6700}'
    + '.p4{background:#fbe6e4;color:#c0342b}.p0{background:#f0f3f7;color:#5b6673}'
    + '.spin{display:inline-block;width:13px;height:13px;border:2px solid #d3e3f5;border-top-color:#0f6cbd;'
    + 'border-radius:50%;animation:sp .7s linear infinite;vertical-align:-2px;margin-right:6px}'
    + '@keyframes sp{to{transform:rotate(360deg)}}'
    + '@media(max-width:620px){.wrap{top:8px;right:8px;left:8px;width:auto;max-height:92vh}td.u{max-width:150px}}';

  function build() {
    host = document.createElement('div');
    host.id = '__qamt_host__';
    host.style.cssText = 'all:initial;position:static';
    document.documentElement.appendChild(host);
    shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var st = document.createElement('style'); st.textContent = CSS; shadow.appendChild(st);

    root = document.createElement('div'); root.className = 'wrap';
    root.innerHTML =
      '<div class="hd"><div class="lg">QA</div>'
      + '<button class="ib" id="bk" title="Volver al menú" style="display:none">&#8592;</button>'
      + '<div class="ti" id="ti">QA Multitool</div>'
      + '<button class="ib" id="rl" title="Recargar herramientas">&#8635;</button>'
      + '<button class="ib" id="cl" title="Cerrar (Esc)">&#10005;</button></div>'
      + '<div class="bd" id="bd"></div>'
      + '<div class="ft"><span id="ftl">&nbsp;</span><span id="ftr">&nbsp;</span></div>';
    shadow.appendChild(root);

    titleEl = root.querySelector('#ti');
    backEl = root.querySelector('#bk');
    bodyEl = root.querySelector('#bd');
    footEl = { l: root.querySelector('#ftl'), r: root.querySelector('#ftr') };

    root.querySelector('#cl').onclick = Q.close;
    root.querySelector('#rl').onclick = function () { Q.close(); location.reload === null ? 0 : 0; };
    backEl.onclick = Q.menu;
    drag(root.querySelector('.hd'), root);
    document.addEventListener('keydown', function (e) {
      if (!host || !host.isConnected) return;
      if (e.key === 'Escape') Q.close();
    });
    footEl.r.textContent = BASE.replace(/^https?:\/\//, '').slice(0, 40);
  }

  function drag(handle, el) {
    var sx, sy, ox, oy, on = false;
    handle.addEventListener('mousedown', function (e) {
      if (e.target.classList && e.target.classList.contains('ib')) return;
      on = true; sx = e.clientX; sy = e.clientY;
      var r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      el.style.right = 'auto'; el.style.left = ox + 'px'; el.style.top = oy + 'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!on) return;
      el.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
      el.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', function () { on = false; });
  }

  /* ---------- Menú ---------- */
  Q.menu = function () {
    titleEl.textContent = 'QA Multitool';
    backEl.style.display = 'none';
    footEl.l.textContent = Q.tools.length + ' herramientas';
    bodyEl.innerHTML =
      '<div class="sb"><span class="mg">&#128269;</span>'
      + '<input type="text" id="bs" placeholder="Buscar herramienta…" autocomplete="off"></div><div id="lista"></div>';
    var inp = bodyEl.querySelector('#bs'), lista = bodyEl.querySelector('#lista');

    function pintar(filtro) {
      filtro = (filtro || '').toLowerCase().trim();
      var vis = Q.tools.filter(function (t) {
        if (!filtro) return true;
        return ((t.name || '') + ' ' + (t.desc || '') + ' ' + (t.group || '')).toLowerCase().indexOf(filtro) >= 0;
      });
      if (!vis.length) { lista.innerHTML = '<div class="hint">Sin resultados.</div>'; return; }
      var h = '<div class="menu">', grupo = null;
      vis.forEach(function (t) {
        var g = t.group || 'General';
        if (g !== grupo) { grupo = g; h += '<div class="grp">' + U.esc(g) + '</div>'; }
        h += '<button class="mi" data-id="' + U.esc(t.id) + '"><span class="ic">' + (t.icon || '🧩') + '</span>'
          + '<span class="tx"><span class="nm">' + U.esc(t.name) + '</span>'
          + '<span class="ds">' + U.esc(t.desc || '') + '</span></span><span class="ar">&#8250;</span></button>';
      });
      lista.innerHTML = h + '</div>';
      Array.prototype.forEach.call(lista.querySelectorAll('.mi'), function (b) {
        b.onclick = function () { Q.run(b.dataset.id); };
      });
    }
    inp.addEventListener('input', function () { pintar(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var p = lista.querySelector('.mi'); if (p) Q.run(p.dataset.id); }
    });
    pintar('');
    setTimeout(function () { inp.focus(); }, 30);
  };

  Q.run = function (id) {
    var tool = null;
    Q.tools.forEach(function (t) { if (t.id === id) tool = t; });
    if (!tool) { Q.menu(); return; }
    titleEl.textContent = tool.name;
    backEl.style.display = '';
    footEl.l.textContent = tool.id;
    bodyEl.innerHTML = '';
    try { tool.run({ root: bodyEl, util: U, tool: tool, panel: Q, shadow: shadow }); }
    catch (e) {
      bodyEl.innerHTML = '<div class="note bad"><b>Error en la herramienta</b>' + U.esc(e.message)
        + '</div><div class="hint">Herramienta: <code>' + U.esc(tool.id) + '</code></div>';
    }
  };

  Q._panel = function () { if (host) host.style.display = ''; };
  Q.close = function () { if (host) host.remove(); try { delete window.QAMT; } catch (e) { window.QAMT = null; } };

  /* ---------- Carga remota ---------- */
  function fail(causa, url) {
    var titulo = causa === 'timeout' ? 'El servidor no respondió a tiempo'
      : (causa === 'vacio' ? 'El archivo se descargó pero no se ejecutó' : 'No se encontró el archivo');
    var esRaw = /raw\.githubusercontent|github\.com\/.*\/blob\//i.test(url);
    var h = '<div class="note bad"><b>' + titulo + '</b>'
      + 'El núcleo no pudo cargar uno de los archivos de la carpeta.</div>'
      + '<div class="hint">Dirección solicitada:</div><code>' + U.esc(url) + '</code>';
    if (esRaw) {
      h += '<div class="note" style="margin-top:12px"><b>Estás usando una URL de código fuente</b>'
        + '<code>raw.githubusercontent.com</code> y las páginas <code>/blob/</code> no sirven JavaScript ejecutable. '
        + 'Necesitas la dirección de <b>GitHub Pages</b>, con la forma '
        + '<code>https://USUARIO.github.io/REPO/</code>.</div>';
    }
    h += '<div class="hint" style="margin-top:12px">Abre <code>' + U.esc(BASE + 'core.js') + '</code> en otra pestaña: '
      + 'si ves el código, la ruta sirve; si se descarga un archivo, no.</div>'
      + '<div class="row"><button class="btn" id="ab">Abrir core.js</button></div>';
    bodyEl.innerHTML = h;
    var b = bodyEl.querySelector('#ab');
    if (b) b.onclick = function () { window.open(BASE + 'core.js', '_blank', 'noopener'); };
  }

  var pendientes = 0, fallo = false;

  function inject(file, onEnd) {
    var url = BASE + file + (file.indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now();
    var s = document.createElement('script'), listo = false;
    s.src = url; s.async = false;
    var reloj = setTimeout(function () { if (!listo) { listo = true; onEnd('timeout', url); } }, ESPERA);
    s.onload = function () { if (!listo) { listo = true; clearTimeout(reloj); onEnd(null, url); } };
    s.onerror = function () { if (!listo) { listo = true; clearTimeout(reloj); onEnd('error', url); } };
    document.documentElement.appendChild(s);
  }

  /* Lo llama manifest.js con la lista de archivos de herramientas */
  Q.load = function (lista) {
    lista = lista || [];
    if (!lista.length) { Q.menu(); return; }
    pendientes = lista.length;
    bodyEl.innerHTML = '<div class="hint"><span class="spin"></span>Cargando ' + lista.length + ' herramientas…</div>';
    lista.forEach(function (f) {
      inject(f, function (err, url) {
        if (err && !fallo) { fallo = true; fail(err, url); return; }
        if (--pendientes === 0 && !fallo) {
          if (!Q.tools.length) { fail('vacio', BASE + lista[0]); return; }
          Q.menu();
        }
      });
    });
  };

  build();
  if (!BASE) { fail('error', '(el marcador no tiene ruta base)'); return; }
  bodyEl.innerHTML = '<div class="hint"><span class="spin"></span>Cargando catálogo…</div>';
  inject('manifest.js', function (err, url) {
    if (err) { fallo = true; fail(err, url); return; }
    setTimeout(function () { if (!Q.tools.length && !pendientes && !fallo) fail('vacio', url); }, 1200);
  });
})();
