(function () {
  'use strict';
  var C = window.CHROMA;
  var theme = document.body.dataset.theme || 'c';
  var isD = theme === 'd';
  var KEY = 'chroma_state_' + theme;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var DEFAULTS = {
    hex: isD ? '#C9D2D8' : '#1F3A5F',
    gender: 'women', season: isD ? 'winter' : 'autumn',
    relation: isD ? 'tonal' : 'neutral', style: isD ? 'clean' : 'business',
    saved: [], history: []
  };
  var state = Object.assign({}, DEFAULTS);
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var p = JSON.parse(raw);
      Object.keys(DEFAULTS).forEach(function (k) { if (p[k] !== undefined) state[k] = p[k]; });
    }
  } catch (e) { /* 存储不可用时保持默认 */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var currentResult = null;
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function gLabel() { return state.gender === 'women' ? '女士' : '男士'; }
  function P() { return C.buildPalette(state.hex, state.relation, state.season); }
  function S() { return C.seasonById(state.season); }
  function ST() { return C.styleById(state.style); }

  function ratioBar(colors, cls) {
    return '<div class="' + (cls || 'ratio-bar') + '">' + colors.map(function (c) {
      return '<span style="width:' + c.ratio + '%;background:' + c.hex + '"></span>';
    }).join('') + '</div>';
  }
  function strip(colors, style) {
    return '<span class="strip" style="' + (style || '') + '">' + colors.map(function (c) {
      return '<span style="width:' + c.ratio + '%;background:' + c.hex + '"></span>';
    }).join('') + '</span>';
  }
  function hueAxis(Pal) {
    var hs = Pal.colors.map(function (c) { return C.hexToHsl(c.hex).h; });
    return '<svg viewBox="0 0 300 50" width="100%" height="50" role="img" aria-label="色相轴">' +
      '<line x1="18" y1="24" x2="282" y2="24" stroke="#1A1A1A" stroke-width=".8"/>' +
      '<line x1="18" y1="20" x2="18" y2="28" stroke="#1A1A1A" stroke-width=".8"/>' +
      '<line x1="282" y1="20" x2="282" y2="28" stroke="#1A1A1A" stroke-width=".8"/>' +
      hs.map(function (h, i) {
        var x = 18 + 264 * h / 360;
        return '<circle cx="' + x.toFixed(1) + '" cy="24" r="6" fill="' + Pal.colors[i].hex + '" stroke="#1A1A1A" stroke-width=".6"/>';
      }).join('') +
      '<text x="18" y="42" font-size="10" fill="#77776F" font-family="monospace">0°</text>' +
      '<text x="282" y="42" text-anchor="end" font-size="10" fill="#77776F" font-family="monospace">360°</text>' +
      '<text x="150" y="42" text-anchor="middle" font-size="10" fill="#4A4A47" font-family="monospace">ΔH ' + (Math.max.apply(null, hs) - Math.min.apply(null, hs)) + '°</text></svg>';
  }

  function renderGender() {
    $$('[data-gender]').forEach(function (b) {
      var on = b.dataset.gender === state.gender;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function renderHome() {
    var Pal = P();
    $('#homeWheel').innerHTML = C.wheelSVG({
      size: 240, r: 84, w: isD ? 20 : 26, hue: C.hexToHsl(state.hex).h,
      colors: isD ? C.SOFT8 : C.WHEEL12, center: true, centerColor: state.hex,
      ticks: !isD, border: !isD, pointer: true
    });
    $('#homeWheelNote').textContent = isD
      ? '柔和色环 · 按季节筛过的低饱和色，点选即可开始'
      : '点选色相环上的任意色，直接进入工作台';

    var formula = C.buildPalette(state.hex, isD ? 'tonal' : 'neutral', state.season);
    $('#homeFormula').innerHTML = formula.colors.map(function (c) {
      return '<div class="fcard"><div class="sw" style="background:' + c.hex + '"></div><div class="tx"><b>' +
        c.role.split(' ')[0] + '</b>' + c.hex + '<br>RGB ' + C.rgbText(c.hex) + '<br>' + c.ratio + '%</div></div>';
    }).join('');

    $('#homeLook').innerHTML = '<div class="look-figure">' + C.lookFigure(Pal, state.gender, theme) + '</div>' +
      '<div class="look-cap"><span>' + gLabel() + '版型 · ' + S().name + '季 · ' + ST().name + '</span><span>LOOK 01 / 06</span></div>';

    $('#homeSeasons').innerHTML = C.SEASONS.map(function (s) {
      return '<div class="ax"><i style="background:' + s.axis + '"></i><b>' + s.name + '</b><em>L ' + s.L + '%</em></div>';
    }).join('');
    if ($('#globalSeasons')) {
      $('#globalSeasons').innerHTML = C.SEASONS.map(function (s) {
        return '<button type="button" data-season="' + s.id + '" class="chip' + (s.id === state.season ? ' on' : '') + '">' + s.name + '</button>';
      }).join('');
    }
  }

  function trackGradient(kind) {
    var h = C.hexToHsl(state.hex);
    if (kind === 'h') return 'linear-gradient(90deg,' + C.WHEEL12.join(',') + ',' + C.WHEEL12[0] + ')';
    if (kind === 's') return 'linear-gradient(90deg,#9AA0A8,' + C.hslToHex(h.h, 100, h.l) + ')';
    return 'linear-gradient(90deg,#0B0B0B,' + C.hslToHex(h.h, h.s, 50) + ',#FFFFFF)';
  }
  function renderStudio(opts) {
    opts = opts || {};
    var h = C.hexToHsl(state.hex), Pal = P();
    if (!opts.keepInput) $('#hexInput').value = state.hex;
    $('#hexSwatch').style.background = state.hex;
    document.documentElement.style.setProperty('--accent', state.hex);
    $('#rgbOut').textContent = C.rgbText(state.hex);
    $('#hslOut').textContent = h.h + '° / ' + h.s + '% / ' + h.l + '%';
    $('#colorName').textContent = C.nameColor(state.hex);
    $('#colorAttr').textContent = C.attrText(state.hex);
    $('#hexErr').hidden = true;

    $('#wheel').innerHTML = C.wheelSVG({
      size: 200, r: 68, w: isD ? 16 : 22, hue: h.h,
      colors: isD ? C.SOFT8 : C.WHEEL12, center: true, centerColor: state.hex, border: !isD
    });

    [['hueRange', 'h', h.h], ['satRange', 's', h.s], ['lightRange', 'l', h.l]].forEach(function (a) {
      var el = $('#' + a[0]);
      if (!opts.keepSliders) el.value = a[2];
      el.style.setProperty('--track', trackGradient(a[1]));
    });
    $('#hueVal').textContent = h.h + '°'; $('#satVal').textContent = h.s + '%'; $('#lightVal').textContent = h.l + '%';

    var lib = isD ? C.NATURE.concat(C.PRESETS.slice(0, 6)) : C.PRESETS;
    $('#swatches').innerHTML = lib.map(function (p) {
      return '<button type="button" class="sw-item' + (p[0] === state.hex ? ' on' : '') + '" data-swatch="' + p[0] + '" aria-label="选择 ' + p[1] + '"><i style="background:' + p[0] + '"></i><em>' + p[1] + '</em></button>';
    }).join('');

    $('#relationBtns').innerHTML = C.RELATIONS.map(function (r) {
      return '<button type="button" class="rel' + (r.id === state.relation ? ' on' : '') + '" data-relation="' + r.id + '"><b>' + r.name + '</b><em>' + r.en + '</em></button>';
    }).join('');
    $('#relationNote').textContent = C.relationById(state.relation).desc;

    $('#seasonBtns').innerHTML = C.SEASONS.map(function (s) {
      return '<button type="button" class="chip' + (s.id === state.season ? ' on' : '') + '" data-season="' + s.id + '">' + s.name + '</button>';
    }).join('');
    if ($('#globalSeasons')) {
      $$('#globalSeasons [data-season]').forEach(function (b) { b.classList.toggle('on', b.dataset.season === state.season); });
    }

    $('#styleSelect').innerHTML = C.STYLES.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === state.style ? ' selected' : '') + '>' + s.name + '</option>';
    }).join('');

    $('#outputColors').innerHTML = Pal.colors.map(function (c) {
      return '<div class="oc"><span class="sw" style="background:' + c.hex + '"></span><span class="tx"><b>' + c.role + '</b>' + c.hex + ' · ' + c.name + ' · RGB ' + C.rgbText(c.hex) + '</span><span class="pc">' + c.ratio + '%</span></div>';
    }).join('');
    $('#ratioBar').innerHTML = Pal.colors.map(function (c) {
      return '<span style="width:' + c.ratio + '%;background:' + c.hex + '"></span>';
    }).join('');
    $('#readout').innerHTML = 'ΔL ' + Pal.dL + '% &nbsp;·&nbsp; 明度对比 ' + Pal.contrast + ':1 &nbsp;·&nbsp; ΔS ' + Pal.dS + '%<br>' +
      (isD ? S().note : '中性色缓冲 ' + (state.relation === 'neutral' ? '2' : '1') + ' 组 &nbsp;·&nbsp; WCAG AA ' + (parseFloat(Pal.contrast) >= 4.5 ? '通过' : '参考') + ' &nbsp;·&nbsp; ' + S().name + ' L ' + S().L + '%');
  }

  function resultHTML() {
    var Pal = P(), gender = state.gender, style = ST(), its = C.items(Pal, gender, style);
    var rel = C.relationById(state.relation);
    var title = isD
      ? S().name + '天的' + (S().layers > 2 ? S().layers + ' 层' : '一身') + '，从' + Pal.colors[1].name + '开始。'
      : '配色方案 01 · ' + rel.name;
    var head = '<div class="r-head"><h2>' + esc(title) + '</h2><span>' + rel.en + ' &nbsp;·&nbsp; INPUT ' + state.hex +
      ' &nbsp;·&nbsp; ' + gLabel() + ' &nbsp;·&nbsp; ' + S().name + '季 &nbsp;·&nbsp; ' + style.name + '</span></div>';

    var figure = '<div class="r-block"><p class="r-title">' + (isD ? 'THE LOOK / 完整穿搭' : 'LOOK 01 / 穿搭技术图') + '</p>' +
      '<div class="r-figure">' + C.lookFigure(Pal, gender, theme) + '</div>' +
      '<div class="r-cap"><span>' + gLabel() + '版型 · ' + style.name + ' · ' + S().materials + '</span><span>' + S().temp + ' · ' + S().layers + ' 层</span></div></div>';

    var structure;
    if (isD) {
      var layerNames = ['外层', '中层', '下装', '鞋履与包袋', '配饰', '点缀'];
      structure = '<div class="r-block"><p class="r-title">LAYERS / 层次拆解</p><div class="layer-list">' +
        its.map(function (it, i) {
          return '<div class="layer-row"><i style="background:' + it.color + '"></i><div class="tx"><b>' + layerNames[i] + ' · ' + esc(it.name) + '</b><em>' + it.color + ' · ' + esc(it.material) + '</em></div><span>' + [45, 30, 0, 10, 0, 15][i] + '%</span></div>';
        }).join('') + '</div>' + ratioBar(Pal.colors, 'ratio-bar round') +
        '<div class="weather-row"><div><b>' + S().temp + '</b><span>适穿温度</span></div><div><b>' + S().materials + '</b><span>推荐材质</span></div><div><b>' + S().layers + ' 层</b><span>穿衣层次</span></div></div></div>';
    } else {
      structure = '<div class="r-block"><p class="r-title">COLOUR MATRIX / 配色矩阵</p><div class="matrix">' +
        Pal.colors.map(function (c) {
          var hsl = C.hexToHsl(c.hex);
          return '<div class="m"><i style="background:' + c.hex + '"></i><div class="t"><b>' + c.role.split(' ')[0] + '</b>' + c.hex +
            '<br>RGB ' + C.rgbText(c.hex) + '<br>H' + hsl.h + ' S' + hsl.s + ' L' + hsl.l + '<br>' + c.ratio + '%</div></div>';
        }).join('') + '</div>' + ratioBar(Pal.colors, 'ratio-bar') +
        '<div class="ratio-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>' +
        '<div style="margin-top:10px">' + hueAxis(Pal) + '</div>' +
        '<p class="readout">ΔL ' + Pal.dL + '% &nbsp;·&nbsp; 明度对比 ' + Pal.contrast + ':1 &nbsp;·&nbsp; ΔS ' + Pal.dS + '%</p></div>';
    }

    var why = C.reasons(Pal, gender, style);
    var reasonHTML = isD
      ? '<div class="r-block"><p class="r-title">STYLIST\'S NOTE / 搭配理由</p><p class="soft-note">' + esc(why[0][1]) + ' ' + esc(why[1][1]) + ' ' + esc(why[3][1]) + ' ' + esc(why[5][1]) + '</p></div>'
      : '<div class="r-block"><p class="r-title">WHY IT WORKS / 搭配理由</p>' + why.map(function (w) {
          return '<div class="why"><span class="kk">' + w[0] + '</span><span class="vv">' + esc(w[1]) + '</span></div>';
        }).join('') + '</div>';

    var itemHTML = '<div class="r-block"><p class="r-title">THE SIX PIECES / 单品与对应颜色</p><div class="items-grid">' +
      its.map(function (it) {
        return '<div class="it">' + C.itemSVG(it.key, it.color) + '<i style="background:' + it.color + '"></i><div class="nm">' + esc(it.name) + '</div><div class="hx">' + it.color + '</div></div>';
      }).join('') + '</div></div>';

    var tags = [S().name + '季', '通勤', '周末', style.name, gender === 'women' ? '女士衣橱' : '男士衣橱', '可调整配色'];
    var meta = '<div class="r-block"><p class="r-title">CONTEXT / 季节、场合与替换</p><div class="tag-row">' +
      tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<p class="micro" style="margin-top:14px">替换单品：外套 → ' + esc(C.styleById(C.STYLES[(C.STYLES.indexOf(style) + 1) % C.STYLES.length].id).coat) +
      '；鞋履 → ' + esc(C.styleById(C.STYLES[(C.STYLES.indexOf(style) + 2) % C.STYLES.length].id).shoes) +
      '。改一件，比例与配色关系会自动重算。</p></div>';

    var actions = '<div class="r-actions"><button type="button" class="btn primary" data-save>收藏这套提案</button>' +
      '<a class="btn" href="#studio" data-go="studio">回工作台调整</a>' +
      '<button type="button" class="btn" data-swap-gender>切换' + (gender === 'women' ? '男士' : '女士') + '版型</button></div>';

    return head + figure + structure + reasonHTML + itemHTML + meta + actions;
  }
  function renderResult() {
    $('#resultSwitch').innerHTML = C.RELATIONS.map(function (r) {
      return '<button type="button" class="rs' + (r.id === state.relation ? ' on' : '') + '" data-relation="' + r.id + '">' + r.name + '</button>';
    }).join('') + '<button type="button" class="rs" data-swap-gender>切换' + (state.gender === 'women' ? '男士' : '女士') + '版型</button>';
    $('#resultWrap').innerHTML = resultHTML();
    currentResult = {
      hex: state.hex, relation: state.relation, season: state.season,
      style: state.style, gender: state.gender
    };
  }

  function renderSeasons() {
    $('#seasonsWrap').innerHTML = '<div class="season-cards">' + C.SEASONS.map(function (s) {
      var Pal = C.buildPalette(state.hex, state.relation, s.id);
      return '<div class="sc"><div class="hd"><b>' + s.name + ' / ' + s.en + '</b><em>L ' + s.L + '% · S ' + s.S + '%</em></div><div class="bd">' +
        strip(Pal.colors) +
        '<dl style="margin-top:14px"><dt>色域</dt><dd>' + s.note + '</dd>' +
        '<dt>材质</dt><dd>' + s.materials + '</dd>' +
        '<dt>层次</dt><dd>' + s.layers + ' 层 · ' + s.cats + '</dd>' +
        '<dt>温度</dt><dd>' + s.temp + '</dd>' +
        '<dt>配色</dt><dd>' + Pal.colors.map(function (c) { return c.hex + ' ' + c.name; }).join(' · ') + '</dd></dl>' +
        '<button type="button" class="btn ghost" data-season="' + s.id + '" data-go="studio" style="margin-top:16px">用这个季节配色 <span aria-hidden="true">→</span></button>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  var savedFilter = 'all';
  function renderSaved() {
    var sc = $('#saveCount'); if (sc) sc.textContent = state.saved.length;
    var filters = ['all'].concat(C.SEASONS.map(function (s) { return s.id; }));
    if ($('#savedFilter')) $('#savedFilter').innerHTML = filters.map(function (f) {
      return '<button type="button" class="chip' + (f === savedFilter ? ' on' : '') + '" data-filter="' + f + '">' +
        (f === 'all' ? '全部' : C.seasonById(f).name + '季') + '</button>';
    }).join('');
    var list = state.saved.filter(function (x) { return savedFilter === 'all' || x.season === savedFilter; });
    $('#savedWrap').innerHTML = list.length ? '<div class="saved-list">' + list.map(function (x) {
      var Pal = C.buildPalette(x.hex, x.relation, x.season);
      return '<div class="sv">' + strip(Pal.colors) + '<div class="tx"><b>' + C.relationById(x.relation).name + ' · ' + C.nameColor(x.hex) + ' · ' + C.seasonById(x.season).name + '季</b><em>' +
        x.hex + ' / ' + (x.gender === 'women' ? '女士' : '男士') + ' / ' + C.styleById(x.style).name + ' / ' + new Date(x.ts).toLocaleDateString('zh-CN') + '</em></div>' +
        '<button type="button" class="del" data-del="' + x.id + '" aria-label="删除这条收藏">删除</button></div>';
    }).join('') + '</div>' : '<div class="empty"><b>还没有收藏的搭配</b>在穿搭推荐页点「收藏这套提案」，配色与单品会保存在这台设备上。</div>';
    $('#historyWrap').innerHTML = state.history.length ? '<div class="saved-list">' + state.history.slice(0, 6).map(function (x) {
      var Pal = C.buildPalette(x.hex, x.relation, x.season);
      return '<div class="sv">' + strip(Pal.colors) + '<div class="tx"><b>' + C.nameColor(x.hex) + ' · ' + C.relationById(x.relation).name + '</b><em>' + x.hex + ' / ' + C.seasonById(x.season).name + '季 / ' + C.styleById(x.style).name + '</em></div>' +
        '<button type="button" class="del" data-reopen="' + x.id + '">载入</button></div>';
    }).join('') + '</div>' : '<div class="empty">生成过搭配后，这里会留下最近浏览记录。</div>';
  }

  function renderLearn() {
    $('#learnGrid').innerHTML = C.LEARN.map(function (l) {
      return '<div class="lg"><span class="num">' + l[0] + '</span><h3>' + l[1] + '</h3><p>' + l[2] + '</p><div class="mini">' +
        l[3].map(function (c) { return '<span style="width:16.66%;background:' + c + '"></span>'; }).join('') + '</div></div>';
    }).join('');
    renderLearnDemo();
  }
  function renderLearnDemo() {
    if (!$('#learnDemo')) return;
    var l = parseInt($('#learnRange').value, 10), h = C.hexToHsl(state.hex).h;
    $('#learnDemo').innerHTML = [10, 30, 50, 70, 90].map(function (v, i) {
      var val = C.clamp(l + (i - 2) * 8, 5, 96);
      return '<i style="background:' + C.hslToHex(h, 46, val) + '" title="L ' + val + '%"></i>';
    }).join('');
  }

  function renderAll() {
    renderGender(); renderHome(); renderStudio(); renderResult(); renderSeasons(); renderSaved(); renderLearn();
  }

  function recordHistory() {
    var last = state.history[0];
    if (last && last.hex === state.hex && last.relation === state.relation &&
        last.season === state.season && last.style === state.style && last.gender === state.gender) return;
    state.history.unshift({
      id: Date.now(), hex: state.hex, relation: state.relation,
      season: state.season, style: state.style, gender: state.gender
    });
    state.history = state.history.slice(0, 8);
    persist(); renderSaved();
  }

  function showView(name) {
    if (!document.querySelector('[data-view="' + name + '"]')) name = 'home';
    $$('.view').forEach(function (v) { v.classList.toggle('on', v.dataset.view === name); });
    $$('.nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.go === name); });
    $('#nav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false');
    if (name === 'result') { recordHistory(); renderResult(); }
    if (name === 'saved') renderSaved();
    if (name === 'seasons') renderSeasons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setHex(hex, sliderMode) {
    var v = C.normHex(hex);
    if (!v) { $('#hexErr').hidden = false; return false; }
    state.hex = v; persist();
    renderStudio(sliderMode ? { keepSliders: true } : {});
    renderHome(); renderResult();
    return true;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var go = t.closest('[data-go]');
    if (go) {
      e.preventDefault();
      var seasonAttr = go.dataset.season;
      if (seasonAttr) { state.season = seasonAttr; persist(); renderAll(); }
      var target = go.dataset.go;
      if (location.hash !== '#' + target) location.hash = target; else showView(target);
      return;
    }
    var g = t.closest('[data-gender]');
    if (g) { state.gender = g.dataset.gender; persist(); renderAll(); toast('已切换为' + gLabel() + '版型，单品与廓形同步更新'); return; }
    var hue = t.closest('[data-hue]');
    if (hue) {
      var h = parseInt(hue.dataset.hue, 10), old = C.hexToHsl(state.hex);
      setHex(C.hslToHex(h, Math.max(old.s, 42), C.clamp(old.l > 70 ? 55 : old.l, 28, 62)));
      location.hash = 'studio'; showView('studio'); toast('已取色相 ' + h + '°'); return;
    }
    var sw = t.closest('[data-swatch]');
    if (sw) { setHex(sw.dataset.swatch); toast('已选择 ' + C.nameColor(sw.dataset.swatch)); return; }
    var rel = t.closest('[data-relation]');
    if (rel) { state.relation = rel.dataset.relation; persist(); renderStudio(); renderResult(); return; }
    var sea = t.closest('[data-season]');
    if (sea) { state.season = sea.dataset.season; persist(); renderAll(); toast('已切换' + S().name + '季：色域、材质与层次同步变化'); return; }
    var fil = t.closest('[data-filter]');
    if (fil) { savedFilter = fil.dataset.filter; renderSaved(); return; }
    var del = t.closest('[data-del]');
    if (del) { state.saved = state.saved.filter(function (x) { return String(x.id) !== del.dataset.del; }); persist(); renderSaved(); toast('已删除'); return; }
    var re = t.closest('[data-reopen]');
    if (re) {
      var x = state.history.filter(function (y) { return String(y.id) === re.dataset.reopen; })[0];
      if (x) { state.hex = x.hex; state.relation = x.relation; state.season = x.season; state.style = x.style; state.gender = x.gender; persist(); renderAll(); location.hash = 'studio'; showView('studio'); toast('已载入历史配色'); }
      return;
    }
    if (t.closest('[data-swap-gender]')) { state.gender = state.gender === 'women' ? 'men' : 'women'; persist(); renderAll(); toast('已切换为' + gLabel() + '版型'); return; }
    if (t.closest('[data-save]')) {
      if (!currentResult) return;
      var rec = Object.assign({}, currentResult, { id: Date.now(), ts: Date.now() });
      state.saved.unshift(rec); persist(); renderSaved(); toast('已收藏，可在「我的收藏」查看');
      return;
    }
    if (t.closest('#loadFormula')) { location.hash = 'studio'; showView('studio'); toast('今日配色公式已载入'); return; }
    if (t.closest('#navToggle')) {
      var open = $('#nav').classList.toggle('open'); $('#navToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'hexInput') {
      var v = C.normHex(e.target.value);
      $('#hexErr').hidden = !!v || e.target.value.trim() === '';
      if (v) { state.hex = v; persist(); renderStudio({ keepInput: true }); renderHome(); renderResult(); }
      return;
    }
    if (['hueRange', 'satRange', 'lightRange'].indexOf(e.target.id) >= 0) {
      var hh = parseInt($('#hueRange').value, 10), ss = parseInt($('#satRange').value, 10), ll = parseInt($('#lightRange').value, 10);
      $('#hueVal').textContent = hh + '°'; $('#satVal').textContent = ss + '%'; $('#lightVal').textContent = ll + '%';
      setHex(C.hslToHex(hh, ss, ll), true);
      return;
    }
    if (e.target.id === 'learnRange') renderLearnDemo();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'styleSelect') { state.style = e.target.value; persist(); renderResult(); renderHome(); return; }
    if (e.target.id === 'imagePicker') pickImage(e.target.files && e.target.files[0]);
  });

  function pickImage(file) {
    if (!file) return;
    var msg = $('#pickerMsg'); msg.textContent = '正在本机提取主色…';
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
        var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 40, 40);
        var d;
        try { d = ctx.getImageData(0, 0, 40, 40).data; } catch (err) { msg.textContent = '这张图片无法在本机读取，请换一张。'; return; }
        var r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) continue;
          var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          if (mx - mn < 18 && (mx > 238 || mx < 22)) continue;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
        if (!n) { r = g = b = 128; n = 1; }
        var hex = C.rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
        setHex(hex); msg.textContent = '已提取主色 ' + hex + '（' + C.nameColor(hex) + '），图片未上传。';
        toast('已从图片取色 ' + hex);
      };
      img.onerror = function () { msg.textContent = '图片读取失败，请换一张。'; };
      img.src = ev.target.result;
    };
    reader.onerror = function () { msg.textContent = '图片读取失败，请换一张。'; };
    reader.readAsDataURL(file);
  }

  window.addEventListener('hashchange', function () { showView(location.hash.slice(1) || 'home'); });

  renderAll();
  var initial = location.hash.slice(1) || 'home';
  showView(initial);
  if (!location.hash) history.replaceState(null, '', '#home');
})();
