window.CHROMA = (function () {
  'use strict';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad(n) { return ('0' + Math.round(n).toString(16)).slice(-2).toUpperCase(); }
  function normHex(v) {
    if (!v) return null;
    var s = String(v).trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return '#' + s.toUpperCase();
  }
  function hexToRgb(hex) {
    var s = hex.replace('#', '');
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
  }
  function rgbToHex(r, g, b) { return '#' + pad(r) + pad(g) + pad(b); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    var h = 0, s = 0, l = (max + min) / 2;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function hexToHsl(hex) { var c = hexToRgb(hex); return rgbToHsl(c.r, c.g, c.b); }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }
  function hslToHex(h, s, l) { var c = hslToRgb(h, s, l); return rgbToHex(c.r, c.g, c.b); }
  function rgbText(hex) { var c = hexToRgb(hex); return c.r + ', ' + c.g + ', ' + c.b; }
  function lum(hex) {
    var c = hexToRgb(hex), a = [c.r, c.g, c.b].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(a, b) {
    var x = lum(a), y = lum(b), hi = Math.max(x, y), lo = Math.min(x, y);
    return ((hi + 0.05) / (lo + 0.05)).toFixed(1);
  }
  function nameColor(hex) {
    var c = hexToHsl(hex), h = c.h, s = c.s, l = c.l, base;
    if (s < 10) base = l > 88 ? '白' : l < 20 ? '墨' : '灰';
    else if (h < 15 || h >= 345) base = '红';
    else if (h < 45) base = '陶土橙';
    else if (h < 70) base = '沙金';
    else if (h < 95) base = '黄绿';
    else if (h < 160) base = '苔绿';
    else if (h < 195) base = '青';
    else if (h < 255) base = '蓝';
    else if (h < 290) base = '紫';
    else base = '玫粉';
    var pre = l > 76 ? '浅' : l < 30 ? '深' : s < 26 ? '柔' : '';
    return pre + base;
  }
  function attrText(hex) {
    var c = hexToHsl(hex);
    var warm = (c.h < 70 || c.h > 330) ? '暖' : (c.h > 190 && c.h < 280) ? '冷' : '中性偏暖';
    return warm + ' · ' + (c.l > 70 ? '高明度' : c.l < 32 ? '低明度' : '中明度') + ' · ' + (c.s > 55 ? '高饱和' : c.s < 22 ? '低饱和' : '中饱和');
  }

  var RELATIONS = [
    { id: 'tonal', name: '同色系', en: 'TONAL', offsets: [0, 0, 0], desc: '色相不变，靠明度差拉开层次，最耐看也最不容易出错。' },
    { id: 'analogous', name: '邻近色', en: 'ANALOGOUS', offsets: [0, 30, -30], desc: '色相相差 30° 左右，过渡自然，适合整套低对比的柔和造型。' },
    { id: 'complement', name: '互补色', en: 'COMPLEMENTARY', offsets: [0, 180, 180], desc: '色相相差 180°，对比最强；把其中一色降饱和或缩小面积才耐看。' },
    { id: 'split', name: '分裂互补', en: 'SPLIT COMP.', offsets: [0, 150, 210], desc: '取互补轴两侧各 30°，保留冷暖对立，又比直接互补更从容。' },
    { id: 'triad', name: '三角色', en: 'TRIADIC', offsets: [0, 120, 240], desc: '色相环上等距三点，活跃但需靠 60/30/10 比例压住主次。' },
    { id: 'neutral', name: '经典中性', en: 'NEUTRAL', offsets: [0, 0, 0], desc: '以米白、炭灰、棕等中性色承接主色，通勤与日常最稳妥。' }
  ];
  var SEASONS = [
    { id: 'spring', name: '春', en: 'SPRING', L: 78, S: 38, tint: '#E8EDE1', axis: '#DCE7D2', temp: '14–20°C', materials: '亚麻 / 棉 / 薄针织', layers: 2, cats: '薄外套 · 衬衫 · 长裤', note: '清新、柔和、轻盈，整体明度抬升，饱和略降。' },
    { id: 'summer', name: '夏', en: 'SUMMER', L: 85, S: 30, tint: '#E4EEF0', axis: '#DCEDEF', temp: '24–32°C', materials: '棉麻 / 亚麻 / 针织', layers: 1, cats: '短袖 · 薄裤 · 凉鞋', note: '清爽、明亮、通透，冷调优先，层次最少。' },
    { id: 'autumn', name: '秋', en: 'AUTUMN', L: 62, S: 44, tint: '#EDE0CE', axis: '#E8D6BC', temp: '10–18°C', materials: '羊毛 / 灯芯绒 / 皮革', layers: 3, cats: '针织 · 风衣 · 长裤', note: '温暖、沉稳、丰富，暖调与中等饱和最相宜。' },
    { id: 'winter', name: '冬', en: 'WINTER', L: 48, S: 34, tint: '#E6E9EC', axis: '#CBD3DC', temp: '-2–8°C', materials: '羊绒 / 羊毛 / 皮革', layers: 4, cats: '大衣 · 高领 · 围巾 · 短靴', note: '冷冽、干净、层次多，低明度与材质对比承担质感。' }
  ];
  var STYLES = [
    { id: 'minimal', name: '极简主义', coat: '无领直身大衣', shoes: '极简乐福鞋', acc: '细金属饰' },
    { id: 'quiet', name: '静奢风', coat: '羊绒长大衣', shoes: '软皮乐福鞋', acc: '哑金细饰' },
    { id: 'business', name: '商务休闲', coat: '单排扣西装外套', shoes: '德比鞋', acc: '皮质腕表' },
    { id: 'japanese', name: '日系', coat: '落肩棉质外套', shoes: '帆布鞋', acc: '布质托特' },
    { id: 'korean', name: '韩系', coat: '微廓形短大衣', shoes: '厚底乐福鞋', acc: '细链项链' },
    { id: 'american', name: '美式休闲', coat: '牛仔夹克', shoes: '复古跑鞋', acc: '棒球帽' },
    { id: 'street', name: '街头风', coat: '工装外套', shoes: '高帮运动鞋', acc: '斜挎小包' },
    { id: 'retro', name: '复古风', coat: '灯芯绒外套', shoes: '复古皮鞋', acc: '印花方巾' },
    { id: 'clean', name: 'Clean Fit', coat: '短款干净外套', shoes: '白色德比鞋', acc: '极简皮带' },
    { id: 'outdoor', name: '户外机能风', coat: '轻量机能外套', shoes: '徒步鞋', acc: '机能腰包' }
  ];
  var PRESETS = [
    ['#1F3A5F', '深海蓝'], ['#C4462F', '朱砂'], ['#A8957E', '灰褐'], ['#E4DCCB', '燕麦'],
    ['#6B5D4C', '深咖'], ['#2E2A25', '墨'], ['#8E99A0', '雾蓝灰'], ['#A6604C', '陶土'],
    ['#6E7B6A', '苔绿'], ['#C9D2D8', '初雪灰'], ['#EDE0CE', '落叶米'], ['#3E4A55', '炭灰']
  ];
  var WHEEL12 = ['#E2574C', '#E08B3E', '#D9BE45', '#A8C04B', '#55B06A', '#38AC91', '#35A6BF', '#3379C0', '#4457B8', '#8454B8', '#B24FA9', '#CC4E7C'];
  var SOFT8 = ['#E8EDE1', '#DCE7D8', '#DCE7EA', '#D8DEE8', '#E4DEE8', '#EDE1DC', '#EDE6D6', '#E0E6D2'];
  var NATURE = [
    ['#E8EDE1', '新芽'], ['#BFD8DC', '海盐'], ['#C89B6A', '落叶'], ['#C9D2D8', '初雪'],
    ['#3E4A55', '炭木'], ['#F5F1E6', '亚麻']
  ];

  function seasonById(id) { return SEASONS.filter(function (s) { return s.id === id; })[0] || SEASONS[3]; }
  function styleById(id) { return STYLES.filter(function (s) { return s.id === id; })[0] || STYLES[0]; }
  function relationById(id) { return RELATIONS.filter(function (r) { return r.id === id; })[0] || RELATIONS[0]; }

  function buildPalette(hex, relationId, seasonId) {
    var base = hexToHsl(hex), S = seasonById(seasonId), shift = (S.L - 62) * 0.28;
    var out;
    if (relationId === 'neutral') {
      out = [
        { hex: '#F0EDE5', name: '米白', role: '主导 DOMINANT', ratio: 60 },
        { hex: hex, name: nameColor(hex), role: '主色焦点 SECONDARY', ratio: 30 },
        { hex: '#8A6A45', name: '焦糖棕', role: '点缀 ACCENT', ratio: 10 }
      ];
    } else {
      var R = relationById(relationId), o = R.offsets;
      var h2 = base.h + o[1], h3 = base.h + o[2];
      var l2 = clamp(base.l + 30 + shift, 18, 94), l3 = clamp(base.l + 6 + shift * 0.5, 14, 88);
      var c2 = hslToHex(h2, clamp(base.s - 16, 8, 70), l2);
      var c3 = hslToHex(h3, clamp(base.s + 4, 10, 78), l3);
      if (relationId === 'tonal') { c2 = hslToHex(base.h, clamp(base.s - 8, 6, 60), l2); c3 = hslToHex(base.h, clamp(base.s + 10, 10, 70), l3); }
      out = [
        { hex: c2, name: nameColor(c2), role: '主导 DOMINANT', ratio: 60 },
        { hex: hex, name: nameColor(hex), role: '主色焦点 SECONDARY', ratio: 30 },
        { hex: c3, name: nameColor(c3), role: '点缀 ACCENT', ratio: 10 }
      ];
    }
    var ls = out.map(function (c) { return hexToHsl(c.hex).l; });
    var ss = out.map(function (c) { return hexToHsl(c.hex).s; });
    var dL = Math.max.apply(null, ls) - Math.min.apply(null, ls);
    var dS = Math.max.apply(null, ss) - Math.min.apply(null, ss);
    var R2 = relationById(relationId);
    return {
      hex: hex, relation: relationId, season: seasonId, colors: out,
      dL: dL, dS: dS, contrast: contrast(out[0].hex, out[1].hex),
      reason: R2.desc, seasonMeta: S
    };
  }

  function reasons(P, gender, style) {
    var g = gender === 'women' ? '女士' : '男士';
    return [
      ['色相关系', relationById(P.relation).name + '。' + relationById(P.relation).desc],
      ['明度对比', '三色明度差 ' + P.dL + '%，对比读数 ' + P.contrast + ':1。' + (P.dL > 45 ? '层次清晰，适合用深色压住重心。' : '层次柔和，靠材质区分更合适。')],
      ['饱和度控制', '饱和度差 ' + P.dS + '%。高饱和只留一处，其余降饱和，避免两色争夺注意力。'],
      ['中性色缓冲', '按 60 / 30 / 10 分配，' + P.colors[0].name + '提供大面积呼吸面，主色作为焦点而非最大面积。'],
      ['季节与场景', P.seasonMeta.note + ' 推荐材质 ' + P.seasonMeta.materials + '，约 ' + P.seasonMeta.layers + ' 层。'],
      ['版型与光线', '已按' + g + '版型与「' + style.name + '」调整单品。' + (P.season === 'winter' ? '冬季羊毛吸光，实物会比色卡略沉一档。' : '不同面料反光不同，实物会与色卡有细微差异。') + '以上只是依据，可自行微调组合。']
    ];
  }

  function items(P, gender, style) {
    var s = P.season, isW = gender === 'women';
    var warm = s === 'spring' || s === 'summer';
    var base = {
      women: {
        coat: warm ? '轻薄长外套' : '收腰羊绒大衣',
        top: warm ? '棉质衬衫' : '羊绒高领针织',
        bottom: warm ? '高腰阔腿裤' : '毛呢阔腿裤',
        shoes: warm ? '软皮乐福鞋' : '及踝短靴',
        bag: isW ? '结构手提包' : '托特包',
        acc: warm ? '丝质方巾' : '羊毛围巾'
      },
      men: {
        coat: warm ? '轻薄短外套' : '直筒羊毛大衣',
        top: warm ? '棉质针织衫' : '羊绒高领',
        bottom: warm ? '直筒棉质长裤' : '毛呢直筒裤',
        shoes: warm ? '皮质乐福鞋' : '德比鞋',
        bag: '公文托特包',
        acc: warm ? '棉质方巾' : '羊毛围巾'
      }
    }[gender];
    var over = style || {};
    var names = {
      coat: over.coat || base.coat, top: base.top, bottom: base.bottom,
      shoes: over.shoes || base.shoes, bag: base.bag, acc: over.acc || base.acc
    };
    var order = ['coat', 'top', 'bottom', 'shoes', 'bag', 'acc'];
    var colorMap = [P.colors[1].hex, P.colors[0].hex, P.colors[0].hex, P.colors[2].hex, P.colors[2].hex, P.colors[0].hex];
    var matMap = {
      coat: P.seasonMeta.materials.split(' / ')[0], top: P.seasonMeta.materials.split(' / ')[1] || '棉',
      bottom: '毛呢 / 棉', shoes: '皮革', bag: '皮革 / 帆布', acc: '羊毛 / 丝'
    };
    return order.map(function (k, i) {
      return { key: k, name: names[k], color: colorMap[i], material: matMap[k] };
    });
  }

  function itemSVG(key, color) {
    var p = {
      coat: '<path d="M18 6 L30 10 L42 6 L48 46 L12 46 Z" fill="C" stroke="rgba(0,0,0,.16)" stroke-width=".6"/><path d="M18 6 L30 24 L24 27 Z" fill="rgba(255,255,255,.24)"/><line x1="30" y1="24" x2="30" y2="46" stroke="rgba(0,0,0,.18)" stroke-width=".7"/>',
      top: '<path d="M20 8 L30 12 L40 8 L47 18 L40 22 L40 46 L20 46 L20 22 L13 18 Z" fill="C"/><line x1="30" y1="13" x2="30" y2="30" stroke="rgba(0,0,0,.15)" stroke-width=".6"/>',
      bottom: '<path d="M18 6 L42 6 L40 46 L31 46 L30 22 L29 46 L20 46 Z" fill="C"/><line x1="30" y1="8" x2="30" y2="20" stroke="rgba(0,0,0,.15)" stroke-width=".6"/>',
      shoes: '<path d="M10 28 L32 28 L36 36 L44 39 L46 45 L10 45 Z" fill="C"/><line x1="10" y1="39" x2="45" y2="39" stroke="rgba(255,255,255,.35)" stroke-width=".7"/>',
      bag: '<path d="M20 20 Q20 9 30 9 Q40 9 40 20" fill="none" stroke="C" stroke-width="2"/><rect x="14" y="18" width="32" height="26" rx="1.5" fill="C"/>',
      acc: '<path d="M20 6 L27 6 L30 40 L24 43 Z" fill="C"/><path d="M33 6 L40 6 L36 43 L30 40 Z" fill="C" opacity=".85"/>'
    }[key] || '';
    return '<svg viewBox="0 0 60 52" role="img" aria-label="单品示意">' + p.split('C').join(color) + '</svg>';
  }

  function lookInner(P, gender) {
    var c = {
      coat: P.colors[1].hex, top: P.colors[0].hex, bottom: P.colors[0].hex,
      shoe: P.colors[2].hex, bag: P.colors[2].hex, acc: P.colors[0].hex,
      hair: '#3A3633', skin: '#DFCBB6'
    };
    var dark = 'rgba(0,0,0,.18)', light = 'rgba(255,255,255,.30)';
    if (gender === 'women') {
      return [
        '<path d="M188 10 Q205 2 222 10 L224 44 L186 44 Z" fill="' + c.hair + '"/>',
        '<ellipse cx="205" cy="28" rx="12" ry="15" fill="' + c.skin + '"/>',
        '<path d="M190 22 Q205 9 220 22 Q205 17 190 22 Z" fill="' + c.hair + '"/>',
        '<rect x="200" y="41" width="10" height="10" fill="' + c.skin + '"/>',
        '<path d="M181 49 L229 49 L241 154 L169 154 Z" fill="' + c.coat + '" stroke="' + dark + '" stroke-width=".7"/>',
        '<path d="M181 50 L166 138 L178 141 L191 57 Z" fill="' + c.coat + '" stroke="' + dark + '" stroke-width=".7" opacity=".9"/>',
        '<path d="M229 50 L244 138 L232 141 L219 57 Z" fill="' + c.coat + '" stroke="' + dark + '" stroke-width=".7" opacity=".9"/>',
        '<rect x="193" y="51" width="24" height="72" fill="' + c.top + '"/>',
        '<path d="M193 49 L205 76 L193 94 Z" fill="' + light + '"/><path d="M217 49 L205 76 L217 94 Z" fill="' + light + '"/>',
        '<line x1="205" y1="76" x2="205" y2="154" stroke="' + dark + '" stroke-width=".8"/>',
        '<circle cx="211" cy="104" r="1.5" fill="' + dark + '"/><circle cx="211" cy="126" r="1.5" fill="' + dark + '"/>',
        '<path d="M197 46 Q205 54 213 46 L215 88 L207 84 L205 94 L201 84 L195 88 Z" fill="' + c.acc + '" stroke="' + dark + '" stroke-width=".5"/>',
        '<path d="M182 154 L176 212 L199 212 L205 154 Z" fill="' + c.bottom + '" stroke="' + dark + '" stroke-width=".6"/>',
        '<path d="M205 154 L213 212 L236 212 L230 154 Z" fill="' + c.bottom + '" stroke="' + dark + '" stroke-width=".6"/>',
        '<path d="M174 206 L199 206 L201 218 L170 218 Z" fill="' + c.shoe + '"/><path d="M213 206 L236 206 L242 218 L211 218 Z" fill="' + c.shoe + '"/>',
        '<path d="M246 120 Q246 106 258 106 Q270 106 270 120" fill="none" stroke="' + c.bag + '" stroke-width="2"/>',
        '<rect x="244" y="118" width="28" height="28" rx="1.5" fill="' + c.bag + '"/>'
      ].join('');
    }
    return [
      '<path d="M191 12 Q205 4 219 12 L221 34 L189 34 Z" fill="' + c.hair + '"/>',
      '<ellipse cx="205" cy="28" rx="12.5" ry="15" fill="' + c.skin + '"/>',
      '<path d="M191 22 Q205 11 219 22 Q205 18 191 22 Z" fill="' + c.hair + '"/>',
      '<rect x="200" y="41" width="10" height="10" fill="' + c.skin + '"/>',
      '<path d="M176 49 L234 49 L249 154 L161 154 Z" fill="' + c.coat + '" stroke="' + dark + '" stroke-width=".7"/>',
      '<path d="M176 50 L159 140 L173 143 L187 57 Z" fill="' + c.coat + '" stroke="' + dark + '" stroke-width=".7" opacity=".9"/>',
      '<path d="M234 50 L251 140 L237 143 L223 57 Z" fill="' + c.coat + '" stroke="' + dark + '" stroke-width=".7" opacity=".9"/>',
      '<rect x="192" y="51" width="26" height="72" fill="' + c.top + '"/>',
      '<path d="M192 49 L205 76 L192 94 Z" fill="' + light + '"/><path d="M218 49 L205 76 L218 94 Z" fill="' + light + '"/>',
      '<line x1="205" y1="76" x2="205" y2="154" stroke="' + dark + '" stroke-width=".8"/>',
      '<circle cx="212" cy="104" r="1.5" fill="' + dark + '"/><circle cx="212" cy="126" r="1.5" fill="' + dark + '"/>',
      '<path d="M194 45 Q205 55 216 45 L218 86 L210 82 L205 92 L200 82 L192 86 Z" fill="' + c.acc + '" stroke="' + dark + '" stroke-width=".5"/>',
      '<path d="M179 154 L175 212 L199 212 L205 154 Z" fill="' + c.bottom + '" stroke="' + dark + '" stroke-width=".6"/>',
      '<path d="M205 154 L213 212 L237 212 L231 154 Z" fill="' + c.bottom + '" stroke="' + dark + '" stroke-width=".6"/>',
      '<path d="M173 206 L199 206 L201 218 L169 218 Z" fill="' + c.shoe + '"/><path d="M213 206 L237 206 L243 218 L211 218 Z" fill="' + c.shoe + '"/>',
      '<path d="M252 122 Q252 108 264 108 Q276 108 276 122" fill="none" stroke="' + c.bag + '" stroke-width="2"/>',
      '<rect x="250" y="120" width="28" height="28" fill="' + c.bag + '"/>'
    ].join('');
  }

  function lookFigure(P, gender, theme) {
    var bg = theme === 'd' ? P.seasonMeta.tint : '#FAFAF8';
    var head = '<svg viewBox="0 0 332 232" width="100%" role="img" aria-label="完整穿搭效果图">';
    var defs = theme === 'c'
      ? '<defs><pattern id="gr" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0 L0 0 0 16" fill="none" stroke="#E4E4DF" stroke-width=".5"/></pattern></defs>'
      : '';
    var back = '<rect width="332" height="232" fill="' + bg + '"/>';
    if (theme === 'c') back += '<rect width="332" height="232" fill="url(#gr)"/>';
    else back += '<ellipse cx="56" cy="28" rx="120" ry="76" fill="#FFFFFF" opacity=".34"/><ellipse cx="292" cy="6" rx="88" ry="56" fill="#FFFFFF" opacity=".20"/>';
    back += '<line x1="0" y1="218" x2="332" y2="218" stroke="rgba(0,0,0,.10)" stroke-width=".8"/>';
    var notes = '';
    if (theme === 'c') {
      notes = [
        '<line x1="112" y1="72" x2="170" y2="72" stroke="#B8B8B0" stroke-width=".8" stroke-dasharray="2 2"/><circle cx="170" cy="72" r="2" fill="' + P.colors[1].hex + '"/>',
        '<rect x="14" y="62" width="22" height="18" fill="' + P.colors[1].hex + '"/><text x="42" y="75" font-size="10" fill="#4A4A47" font-family="monospace">' + P.colors[1].hex + '</text>',
        '<line x1="112" y1="172" x2="180" y2="172" stroke="#B8B8B0" stroke-width=".8" stroke-dasharray="2 2"/><circle cx="180" cy="172" r="2" fill="' + P.colors[0].hex + '"/>',
        '<rect x="14" y="162" width="22" height="18" fill="' + P.colors[0].hex + '"/><text x="42" y="175" font-size="10" fill="#4A4A47" font-family="monospace">' + P.colors[0].hex + '</text>',
        '<line x1="112" y1="208" x2="180" y2="208" stroke="#B8B8B0" stroke-width=".8" stroke-dasharray="2 2"/><circle cx="180" cy="208" r="2" fill="' + P.colors[2].hex + '"/>',
        '<rect x="14" y="198" width="22" height="18" fill="' + P.colors[2].hex + '"/><text x="42" y="211" font-size="10" fill="#4A4A47" font-family="monospace">' + P.colors[2].hex + '</text>'
      ].join('');
    } else {
      notes = '<text x="18" y="30" font-size="10" letter-spacing="2" fill="rgba(0,0,0,.42)" font-family="Georgia,serif">' + P.seasonMeta.en + ' LOOK</text>';
    }
    return head + defs + back + lookInner(P, gender) + notes + '</svg>';
  }

  function wheelSVG(opts) {
    var size = opts.size || 200, cx = size / 2, cy = size / 2;
    var r = opts.r || (size * 0.35), w = opts.w || (size * 0.13);
    var colors = opts.colors || WHEEL12, n = colors.length;
    var circ = 2 * Math.PI * r, dash = circ / n;
    var s = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" role="img" aria-label="色相环">';
    colors.forEach(function (col, i) {
      s += '<circle class="seg" data-hue="' + Math.round(i * 360 / n) + '" data-color="' + col + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-dasharray="' + dash.toFixed(2) + ' ' + (circ - dash).toFixed(2) + '" transform="rotate(' + (i * 360 / n) + ' ' + cx + ' ' + cy + ')"/>';
    });
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - w / 2 - 2) + '" fill="' + (opts.centerBg || '#FAFAF8') + '"/>';
    if (opts.border !== false) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - w / 2 - 2) + '" fill="none" stroke="#D6D6D1" stroke-width="1"/>';
    if (opts.pointer !== false) {
      var a = (opts.hue || 0) * Math.PI / 180;
      s += '<circle cx="' + (cx + r * Math.cos(a)).toFixed(1) + '" cy="' + (cy + r * Math.sin(a)).toFixed(1) + '" r="5.5" fill="#fff" stroke="#1A1A1A" stroke-width="1.5"/>';
    }
    if (opts.center) {
      s += '<rect x="' + (cx - 15) + '" y="' + (cy - 26) + '" width="30" height="13" fill="' + (opts.centerColor || '#1F3A5F') + '"/>';
      s += '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="10" fill="#77776F" font-family="monospace">INPUT</text>';
      s += '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" font-size="15" fill="#1A1A1A" font-family="monospace">' + (opts.hue || 0) + '°</text>';
    }
    if (opts.ticks) {
      s += '<text x="' + cx + '" y="14" text-anchor="middle" font-size="9" fill="#77776F" font-family="monospace">90</text>';
      s += '<text x="' + (size - 12) + '" y="' + (cy + 3) + '" font-size="9" fill="#77776F" font-family="monospace">0</text>';
      s += '<text x="' + cx + '" y="' + (size - 6) + '" text-anchor="middle" font-size="9" fill="#77776F" font-family="monospace">270</text>';
      s += '<text x="4" y="' + (cy + 3) + '" font-size="9" fill="#77776F" font-family="monospace">180</text>';
    }
    return s + '</svg>';
  }

  var LEARN = [
    ['01', '色相 HUE', '颜色在色相环上的位置，用 0–359° 表示。色相差决定对比强度：相差 30° 是邻近，180° 是互补，120° 是三角。', ['#E2574C', '#E08B3E', '#D9BE45', '#55B06A', '#3379C0', '#8454B8']],
    ['02', '明度 LIGHTNESS', '颜色有多亮，0% 是黑，100% 是白。整套搭配的层次感主要来自明度差，而不是色相差。', ['#14213A', '#2B4368', '#4E7099', '#8FA9C4', '#C8D6E5', '#EDF2F7']],
    ['03', '饱和度 SATURATION', '颜色有多鲜艳。两套高饱和色同时出现容易互相争夺注意力，通常只留一处高饱和当主角。', ['#8A96A6', '#6A7C94', '#3D6391', '#1F3A5F', '#C4462F', '#E2574C']],
    ['04', '冷暖属性', '红橙黄偏暖，蓝绿紫偏冷。冷暖对立让搭配有张力；全冷或全暖则更安静、更整体。', ['#C4462F', '#C89B6A', '#EDE0CE', '#E6E9EC', '#AEB8C2', '#3E4A55']],
    ['05', '六种色彩关系', '同色系、邻近色、互补色、分裂互补、三角色、经典中性。前五种按角度计算，最后一种用中性色承接。', ['#1F3A5F', '#3379C0', '#C4462F', '#E08B3E', '#55B06A', '#F0EDE5']],
    ['06', '60 / 30 / 10 比例', '主导色 60%、辅助色 30%、点缀色 10%。用户选的颜色常作为焦点而非最大面积，这是耐看的关键。', ['#F0EDE5', '#F0EDE5', '#F0EDE5', '#1F3A5F', '#1F3A5F', '#8A6A45']]
  ];

  return {
    clamp: clamp, normHex: normHex, hexToRgb: hexToRgb, rgbToHex: rgbToHex,
    rgbToHsl: rgbToHsl, hexToHsl: hexToHsl, hslToRgb: hslToRgb, hslToHex: hslToHex,
    rgbText: rgbText, contrast: contrast, nameColor: nameColor, attrText: attrText,
    RELATIONS: RELATIONS, SEASONS: SEASONS, STYLES: STYLES, PRESETS: PRESETS,
    WHEEL12: WHEEL12, SOFT8: SOFT8, NATURE: NATURE, LEARN: LEARN,
    seasonById: seasonById, styleById: styleById, relationById: relationById,
    buildPalette: buildPalette, reasons: reasons, items: items,
    itemSVG: itemSVG, lookFigure: lookFigure, wheelSVG: wheelSVG
  };
})();
