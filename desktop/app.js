'use strict';
/* VL Save Studio Desktop — panel logic (chạy ở shell, điều khiển webview game) */

// ---------- Core save (port từ Save Studio v3) ----------
function gameHash(d) {
  var e = 'vlidle#f2|2026-10-13:' + '2|' + d;
  var n = 3735928559, t = 1103547991;
  for (var i = 0; i < e.length; i++) {
    var c = e.charCodeAt(i);
    n = Math.imul(n ^ c, 2654435761);
    t = Math.imul(t ^ c, 1597334677);
  }
  n = (Math.imul(n ^ (n >>> 16), 2246822507) ^ Math.imul(t ^ (t >>> 13), 3266489909)) >>> 0;
  t = (Math.imul(t ^ (t >>> 16), 2246822507) ^ Math.imul(n ^ (n >>> 13), 3266489909)) >>> 0;
  return (4294967296 * (2097151 & t) + n).toString(36);
}
function parseSaveText(text) {
  var parsed = JSON.parse(String(text).trim());
  var env = typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed;
  if (env.f !== 2 || typeof env.d !== 'string') throw new Error('Định dạng save không hợp lệ');
  return { env: env, pay: JSON.parse(env.d) };
}
function findFdl3(pay) {
  var inv = pay.inv || [];
  for (var i = 0; i < inv.length; i++) if (inv[i] && inv[i].ktc && inv[i].ktc.k === 'fdl3') return inv[i];
  return null;
}
function applyEdits(pay, ed) {
  var notes = [];
  if (ed.name != null) pay.name = ed.name;
  if (ed.netOwner != null) pay.netOwner = ed.netOwner;
  if (ed.uid != null) pay.uid = ed.uid;
  if (ed.gold != null) pay.gold = ed.gold;
  if (ed.knb != null) pay.knb = ed.knb;
  if (ed.lvl != null) pay.lvl = ed.lvl;
  if (ed.xp != null) pay.xp = ed.xp;
  if (ed.attrPts != null) pay.attrPts = ed.attrPts;
  if (ed.skPts != null) pay.skPts = ed.skPts;
  if (ed.misc) {
    if (!pay.mats) pay.mats = {};
    if (!pay.mats.misc) pay.mats.misc = {};
    Object.keys(ed.misc).forEach(function (k) { pay.mats.misc[k] = ed.misc[k]; });
  }
  if (ed.fdl3 != null) {
    var it = findFdl3(pay);
    if (it) {
      it.ktc.c = ed.fdl3;
      var xi = it.n.lastIndexOf('×');
      if (xi >= 0) it.n = it.n.slice(0, xi + 1) + ed.fdl3;
    } else notes.push('Nền này không có Phúc Duyên Lộ (Đại) — bỏ qua mục đó.');
  }
  return notes;
}
function finalize(pay) {
  var now = Date.now();
  pay.cloudAt = now;
  pay.last = now;
  var d = JSON.stringify(pay);
  return JSON.stringify({ f: 2, d: d, h: gameHash(d) });
}
var SLOT_KEYS = ['jxidle', 'jxidle_2', 'jxidle_3'];
var MISC_LABELS = { rngua: 'Rương Ngựa', ldt: 'Lệnh Bài Dã Tẩu' };
var EXP_TABLE = [100,500,1100,1900,2900,4100,5500,7100,8900,10900,13100,15700,18700,22100,25900,30100,34700,39700,45100,50900,57100,63900,71300,79300,87900,97100,106900,117300,128300,139900,152100,165400,179800,195300,211900,229600,248400,268300,289300,311400,334600,360400,388800,419800,453400,489600,528400,569800,613800,660400,709600,766000,829600,900400,978400,1063600,1156000,1255600,1362400,1476400,1597600,1738200,1898200,2077600,2276400,2494600,2732200,2989200,3265600,3561400,3876600,4240200,4652200,5112600,5621400,6178600,6784200,7438200,8140600,8891400,9690600,10600800,11622000,12754200,13997400,15351600,16816800,18393000,20080200,21878400,23787600,25933000,28314600,30932400,33786400,36876600,40203000,43765600,47564400,50000000,50000000,50000000,50000000,50000000,50000000,50000000,50000000,50000000,50000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,100000000,100000000,100000000,100000000,100000000,120000000,120000000,120000000,120000000,120000000,160000000,160000000,160000000,160000000,160000000,200000000,200000000,200000000,200000000,200000000,300000000,300000000,300000000,300000000,300000000,500000000,500000000,500000000,500000000,500000000,800000000,800000000,800000000,800000000,800000000,1200000000,1200000000,1200000000,1200000000,1200000000,1800000000,1800000000,1800000000,1800000000,1800000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000];
function xpNeed(lvl) { return EXP_TABLE[Math.max(1, Math.min(200, lvl | 0)) - 1] || 0; }
function xpPctOf(pay) { var need = xpNeed(pay.lvl || 1); if (!need) return 0; var p = (pay.xp || 0) / need * 100; return Math.round(Math.min(99.99, Math.max(0, p)) * 100) / 100; }
function xpFromPct(lvl, pct) { pct = Math.max(0, Math.min(99.99, pct)); return Math.floor(pct / 100 * xpNeed(lvl)); }

// ---------- Snippet chạy BÊN TRONG trang game (tự chứa, không closure) ----------
function pageReadState() {
  function parseD(t) { try { var p = JSON.parse(t); var e = typeof p.data === 'string' ? JSON.parse(p.data) : p; return JSON.parse(e.d); } catch (x) { return null; } }
  function jwtSub(tok) { try { var p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (p.length % 4) p += '='; var bin = atob(p); var bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return JSON.parse(new TextDecoder('utf-8').decode(bytes)).sub || null; } catch (x) { return null; } }
  function findJwt(v) { var i = v.indexOf('eyJ'); if (i < 0) return null; var j = i; var ok = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.'; while (j < v.length && ok.indexOf(v[j]) >= 0) j++; var t = v.slice(i, j); return t.split('.').length === 3 ? t : null; }
  function scan(st) {
    for (var i = 0; i < st.length; i++) {
      var k = st.key(i); if (!k) continue;
      if (k.indexOf('auth') < 0 && k.indexOf('sb-') < 0 && k.indexOf('jxidle') < 0) continue;
      var v = st.getItem(k); if (!v) continue;
      var tok = findJwt(v);
      if (tok) { var sub = jwtSub(tok); if (sub) return { id: sub, src: 'token (' + k + ')' }; }
      try { var o = JSON.parse(v); var u = o.user || (o.currentSession && o.currentSession.user) || (o.data && o.data.user) || (o.session && o.session.user); if (u && u.id) return { id: u.id, src: k }; } catch (e) {}
    }
    return null;
  }
  var sess = scan(sessionStorage);
  if (!sess) sess = scan(localStorage);
  if (!sess) { var lu = localStorage.getItem('jxidle_lastuser'); if (lu) sess = { id: lu, src: 'jxidle_lastuser (ID cũ — chỉ tham khảo)' }; }
  var keys = ['jxidle', 'jxidle_2', 'jxidle_3'];
  var slotIdx = parseInt(localStorage.getItem('jxidle_slot') || '0', 10);
  if (isNaN(slotIdx) || slotIdx < 0 || slotIdx > 2) slotIdx = 0;
  var slots = keys.map(function (k) {
    var raw = localStorage.getItem(k);
    if (!raw) return null;
    var p = parseD(raw);
    return p ? { name: p.name, lvl: p.lvl, netOwner: p.netOwner, rngua: (p.mats && p.mats.misc) ? p.mats.misc.rngua : null }
             : { broken: true };
  });
  return {
    href: location.href,
    offline: location.search.indexOf('offline_test=1') >= 0,
    session: sess,
    lastuser: localStorage.getItem('jxidle_lastuser') || null,
    slotIdx: slotIdx,
    slots: slots,
    allowSave: typeof window.__vlAllowSave !== 'undefined' ? String(window.__vlAllowSave) : 'undefined'
  };
}
function pageReadKey(key) { return localStorage.getItem(key); }
function pageWriteSave(key, envStr, slotIdx) {
  window.__vlAllowSave = true;
  var old = localStorage.getItem(key);
  if (old) {
    var bts = Date.now(); while (localStorage.getItem(key + '_bak_' + bts)) bts++;
    try { localStorage.setItem(key + '_bak_' + bts, old); } catch (e) {}
    var mine = [];
    for (var bi = 0; bi < localStorage.length; bi++) { var bk = localStorage.key(bi); if (bk && bk.indexOf(key + '_bak_') === 0) mine.push(bk); }
    mine.sort();
    while (mine.length > 5) { localStorage.removeItem(mine.shift()); }
  }
  localStorage.setItem(key, envStr);
  localStorage.setItem('jxidle_slot', String(slotIdx));
  if (localStorage.getItem(key) !== envStr) return false;
  var orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === 'jxidle' || k === 'jxidle_1' || k === 'jxidle_2' || k === 'jxidle_3') return;
    return orig.call(this, k, v);
  };
  return true;
}
function pageRngua() {
  try {
    var keys = ['jxidle', 'jxidle_2', 'jxidle_3'];
    var s = parseInt(localStorage.getItem('jxidle_slot') || '0', 10);
    var raw = localStorage.getItem(keys[s] || 'jxidle');
    if (!raw) return -1;
    var p = JSON.parse(raw);
    var e = typeof p.data === 'string' ? JSON.parse(p.data) : p;
    var pay = JSON.parse(e.d);
    var n = pay.mats && pay.mats.misc ? pay.mats.misc.rngua : null;
    return typeof n === 'number' ? n : -1;
  } catch (x) { return -1; }
}
function pageKnb() {
  try {
    var keys = ['jxidle', 'jxidle_2', 'jxidle_3'];
    var s = parseInt(localStorage.getItem('jxidle_slot') || '0', 10);
    var raw = localStorage.getItem(keys[s] || 'jxidle');
    if (!raw) return -1;
    var p = JSON.parse(raw);
    var e = typeof p.data === 'string' ? JSON.parse(p.data) : p;
    var pay = JSON.parse(e.d);
    return typeof pay.knb === 'number' ? pay.knb : -1;
  } catch (x) { return -1; }
}
function pageKnbToday() {
  var b = document.querySelector('#mBody');
  if (!b) return -1;
  var m = (b.textContent || '').match(/Hôm nay đã đổi\s*(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}
function pageBuyKnb100() {
  var b = document.querySelector('#mBody [data-ktc100="knb"]:not([disabled])');
  if (b) { b.click(); return 1; }
  return 0;
}
function pageBackupList() {
  var out = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (!/^jxidle(_2|_3)?_bak_\d+$/.test(k)) continue;
    var name = '?', lvl = '?';
    try { var p = JSON.parse(localStorage.getItem(k)); var e = typeof p.data === 'string' ? JSON.parse(p.data) : p; var pay = JSON.parse(e.d); name = pay.name; lvl = pay.lvl; } catch (x) {}
    out.push({ key: k, ts: parseInt(k.split('_bak_')[1], 10), name: name, lvl: lvl });
  }
  out.sort(function (x, y) { return y.ts - x.ts; });
  return JSON.stringify(out);
}
function pageCreateBackup(slotKey) {
  var raw = localStorage.getItem(slotKey);
  if (!raw) return '';
  var bts2 = Date.now(); while (localStorage.getItem(slotKey + '_bak_' + bts2)) bts2++;
  var bk = slotKey + '_bak_' + bts2;
  try { localStorage.setItem(bk, raw); } catch (e) { return ''; }
  var mine = [];
  for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(slotKey + '_bak_') === 0) mine.push(k); }
  mine.sort();
  while (mine.length > 5) { localStorage.removeItem(mine.shift()); }
  return bk;
}
function pageDeleteKey(k) { localStorage.removeItem(k); return 1; }
function pageChestClick() {
  var b = document.querySelector('#miUse10:not([disabled])') || document.querySelector('#ktcRngua10:not([disabled])');
  if (b) { b.click(); return 10; }
  b = document.querySelector('#mBody [data-ktcuse="rngua"]:not([disabled])');
  if (b) { b.click(); return 1; }
  return 0;
}

async function pageCompat() {
  var out = { ver: null, caches: [], exp: null };
  try {
    if (window.caches) {
      var ks = await caches.keys();
      out.caches = ks;
      ks.forEach(function (k) { var m = /v(\d{2,5})/.exec(k); if (m) { var v = parseInt(m[1], 10); if (!out.ver || v > out.ver) out.ver = v; } });
    }
  } catch (e) {}
  if (!out.ver) {
    try {
      Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
        var mm = /[?&]v=(\d{2,5})/.exec(s.getAttribute('src') || '');
        if (mm) { var v2 = parseInt(mm[1], 10); if (!out.ver || v2 > out.ver) out.ver = v2; }
      });
    } catch (e) {}
  }
  try {
    var txt = await (await fetch(location.origin + '/data.js?vlss=' + Date.now(), { cache: 'no-store' })).text();
    var mx = /exp:\[([0-9eE.,\s]+)\]/.exec(txt);
    if (mx) out.exp = mx[1].split(',').map(function (x) { return Number(x.trim()); }).filter(function (n) { return !isNaN(n); });
  } catch (e) {}
  return JSON.stringify(out);
}
async function pageClearGameCache() {
  var n = { sw: 0, cache: 0 };
  try {
    if (navigator.serviceWorker) {
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) { try { if (await regs[i].unregister()) n.sw++; } catch (e) {} }
    }
  } catch (e) {}
  try {
    if (window.caches) {
      var ks = await caches.keys();
      for (var j = 0; j < ks.length; j++) { try { if (await caches.delete(ks[j])) n.cache++; } catch (e) {} }
    }
  } catch (e) {}
  return JSON.stringify(n);
}

// ---------- Shell ----------
var wv = document.getElementById('wv');
function exec(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  var code = '(' + fn.toString() + ')(' + args.map(function (a) { return JSON.stringify(a); }).join(',') + ')';
  return wv.executeJavaScript(code);
}
function $(id) { return document.getElementById(id); }
function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function log(msg) {
  var arr = lsGet('vls_log', []);
  arr.unshift(new Date().toLocaleString() + ' — ' + msg);
  if (arr.length > 100) arr.length = 100;
  lsSet('vls_log', arr);
  toast(msg);
}
var toastTimer = null;
function toast(msg) {
  var t = $('toast');
  if (!t) return;
  t.textContent = msg.length > 110 ? msg.slice(0, 110) + '…' : msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.style.opacity = '0'; }, 3400);
}
function status(msg) { $('status').textContent = msg; }

var pageState = null;
var basePay = null;
var pending = lsGet('vls_pending', null);
var pendingReported = '';

var refreshing = false;
async function refreshState() {
  if (refreshing) return;
  refreshing = true;
  try {
    try { pageState = await exec(pageReadState); } catch (e) { pageState = null; }
    renderSession();
    refreshAutoId();
    renderChecklist();
    if (activeTab === 'home') renderHome();
    if (activeTab === 'auto') { renderChestInfo(); renderKnbInfo(); }
    verifyPending();
    if (!compatAutoDone && pageState) { compatAutoDone = true; runCompat(); }
  } finally { refreshing = false; }
}
function renderSession() {
  var el = $('session');
  if (!pageState) { el.textContent = 'phiên: chưa đọc được (game đang tải?)'; return; }
  el.textContent = pageState.session
    ? 'phiên: ...' + pageState.session.id.slice(-6) + ' | ' + (pageState.offline ? 'OFFLINE' : 'URL CHÍNH')
    : 'phiên: chưa đăng nhập | ' + (pageState.offline ? 'OFFLINE' : 'URL CHÍNH');
  if (pageState.session && String(pageState.session.src).indexOf('lastuser') >= 0) el.textContent += ' | LƯU Ý: ID lấy từ lastuser (có thể là ID cũ)';
  $('url').textContent = pageState.href;
  var cur = pageState.slots[pageState.slotIdx];
  if (cur && !cur.broken) el.textContent += ' | ' + cur.name + ' cấp ' + cur.lvl + (cur.rngua != null ? ' · ' + cur.rngua + ' rương' : '');
  if (activeTab === 'home') renderHome();
}

// ---------- Kiểm chứng sau nạp ----------
function verifyPending() {
  if (!pending || !pageState) return;
  if (Date.now() - (pending.ts || 0) > 30 * 60 * 1000) { pending = null; lsSet('vls_pending', null); return; }
  var slot = pageState.slots[pending.slot];
  var match = slot && !slot.broken && slot.name === pending.name &&
    String(slot.netOwner) === String(pending.netOwner) && (slot.lvl || 0) >= (pending.lvl || 0);
  var stageKey = (match ? 'ok' : 'bad') + ':' + (pageState.offline ? 'off' : 'main') + ':' + pending.stage;
  if (stageKey === pendingReported) return;
  if (match && pageState.offline && pending.stage === 'written') {
    pending.stage = 'offline-ok'; pending.ts = Date.now(); lsSet('vls_pending', pending);
    pendingReported = stageKey;
    status('Kiểm chứng sau nạp: "' + pending.name + '" cấp ' + pending.lvl + ' ĐÃ GHI DÍNH ở bản offline. Bấm "Trang chính" để game đẩy lên cloud — app sẽ xác nhận nốt.');
    log('Kiểm chứng offline OK: ' + pending.name + ' cấp ' + pending.lvl);
    showTab('edit');
  } else if (match && !pageState.offline) {
    var nm = pending.name, lv = pending.lvl;
    pending = null; lsSet('vls_pending', null); pendingReported = '';
    status('Kiểm chứng HOÀN TẤT: "' + nm + '" cấp ' + lv + ' vẫn giữ nguyên sau khi qua URL chính — nạp thành công trọn vẹn.');
    log('Kiểm chứng URL chính OK — nạp hoàn tất: ' + nm + ' cấp ' + lv);
    showTab('edit');
  } else if (!match && slot !== undefined) {
    var found = !slot ? 'slot trống' : slot.broken ? 'save không đọc được' : '"' + slot.name + '" cấp ' + slot.lvl + ', chủ ...' + String(slot.netOwner || '?').slice(-6);
    var nm2 = pending.name, lv2 = pending.lvl;
    pending = null; lsSet('vls_pending', null); pendingReported = '';
    status('Kiểm chứng THẤT BẠI: save vừa nạp ("' + nm2 + '" cấp ' + lv2 + ') không còn ở slot đích — hiện tại là ' + found + '. Kiểm tra lại acc đang đăng nhập và slot đích.');
    log('Kiểm chứng THẤT BẠI cho ' + nm2 + ' — hiện tại: ' + found);
    showTab('edit');
  }
}

// ---------- Form ----------
function buildForm(pay) {
  var box = $('form');
  var accounts = lsGet('vls_accounts', []);
  var accOpts = accounts.map(function (a, i) {
    return '<option value="' + i + '">' + a.label + ' (...' + String(a.id).slice(-6) + ')</option>';
  }).join('');
  var misc = (pay.mats && pay.mats.misc) || {};
  var miscRows = Object.keys(misc).map(function (k) {
    var name = MISC_LABELS[k] ? MISC_LABELS[k] + ' [' + k + ']' : k;
    return '<label>' + name + ':</label><input data-misc="' + k + '" type="number" value="' + misc[k] + '">';
  }).join('');
  var fdl = findFdl3(pay);
  box.innerHTML =
    '<label>Tên nhân vật:</label><input id="f-name" type="text" value="' + String(pay.name || '').replace(/"/g, '&quot;') + '">' +
    '<label>ID tài khoản:</label><input id="f-netOwner" type="text" value="' + (pay.netOwner || '') + '">' +
    '<div class="row" style="margin:-2px 0 7px"><select id="f-acc" style="flex:1"><option value="">— Sổ tài khoản —</option>' + accOpts + '</select>' +
    '<button id="f-acc-save" class="mini">Lưu ID này</button></div>' +
    '<div id="f-autoid" style="font-size:12px;color:#9ccc65;margin:-2px 0 7px"></div>' +
    '<label>UID nhân vật:</label><div class="row"><input id="f-uid" type="number" value="' + (pay.uid || 0) + '"><button id="f-rand" class="mini">Ngẫu nhiên</button></div>' +
    '<div class="row"><div><label>Cấp độ (1-200):</label><input id="f-lvl" type="number" value="' + (pay.lvl || 1) + '"></div>' +
    '<div><label>% XP trong cấp:</label><input id="f-xppct" type="number" step="0.01" value="' + xpPctOf(pay) + '"></div></div>' +
    '<div class="row"><div><label>Điểm tiềm năng:</label><input id="f-attrpts" type="number" value="' + (pay.attrPts || 0) + '"></div>' +
    '<div><label>Điểm kỹ năng:</label><input id="f-skpts" type="number" value="' + (pay.skPts || 0) + '"></div></div>' +
    '<div style="margin:4px 0 2px;color:#bbb">Nguyên liệu:</div>' + miscRows +
    '<label>Phúc Duyên Lộ (Đại)' + (fdl ? '' : ' — nền này không có') + ':</label>' +
    '<input id="f-fdl3" type="number" value="' + (fdl ? fdl.ktc.c : 0) + '"' + (fdl ? '' : ' disabled') + '>' +
    '<label>Vàng:</label><input id="f-gold" type="number" value="' + (pay.gold || 0) + '">' +
    '<label>KNB:</label><input id="f-knb" type="number" value="' + (pay.knb || 0) + '">' +
    '<div class="row" style="margin:4px 0 2px">' +
    '<button class="preset gold" data-p="full">Preset: Full 9999</button>' +
    '<button class="preset" data-p="mid">Vừa phải</button>' +
    '<button class="preset" data-p="save">Lưu preset</button>' +
    '<button class="preset" data-p="load">Áp preset</button></div>';
  $('f-rand').onclick = freshUid;
  $('f-acc').onchange = function () {
    if (this.value === '') return;
    var a = lsGet('vls_accounts', [])[parseInt(this.value, 10)];
    if (a) { $('f-netOwner').value = a.id; renderChecklist(); }
  };
  $('f-acc-save').onclick = function () {
    var id = $('f-netOwner').value.trim();
    if (!id) { status('Chưa có ID tài khoản để lưu.'); return; }
    var label = prompt('Đặt nhãn cho tài khoản này:', $('f-name').value || '');
    if (!label) return;
    var arr = lsGet('vls_accounts', []).filter(function (a) { return a.id !== id; });
    arr.push({ label: label, id: id });
    lsSet('vls_accounts', arr);
    status('Đã lưu vào sổ tài khoản: ' + label);
    buildForm(basePay);
  };
  $('f-netOwner').onchange = renderChecklist;
  if (baseKind === 'clean') {
    $('f-lvl').onchange = function () {
      var L = Math.max(1, Math.min(200, parseInt(this.value, 10) || 1));
      this.value = L;
      $('f-attrpts').value = (L - 1) * 5;
      $('f-skpts').value = L;
      $('f-xppct').value = 0;
      renderChecklist();
    };
  }
  box.querySelectorAll('.preset').forEach(function (b) { b.onclick = function () { applyPreset(b.getAttribute('data-p')); }; });
  refreshAutoId();
  renderChecklist();
}
function freshUid() { $('f-uid').value = 100000 + Math.floor(Math.random() * 900000); }
var lastAutoId = '';
function refreshAutoId() {
  var box = $('f-autoid');
  if (!box) return;
  var field = $('f-netOwner');
  if (pageState && pageState.session) {
    var cur = field.value.trim();
    if (!cur || cur === lastAutoId) {
      field.value = pageState.session.id;
      lastAutoId = pageState.session.id;
      box.textContent = 'Đã tự lấy ID acc từ ' + pageState.session.src + ': ...' + pageState.session.id.slice(-6);
    } else {
      box.textContent = 'Acc đang đăng nhập: ...' + pageState.session.id.slice(-6) + ' (ID trong ô là do bạn tự nhập — giữ nguyên)';
    }
  } else {
    box.textContent = 'Chưa lấy được ID acc — hãy đăng nhập game ở khung bên trái trước.';
  }
}
function setMiscRow(k, v) { var r = document.querySelector('[data-misc="' + k + '"]'); if (r) r.value = v; }
function applyPreset(kind) {
  if (kind === 'full' || kind === 'mid') {
    var v = kind === 'full' ? { rngua: 9999, ldt: 9999, fdl3: 9999 } : { rngua: 500, ldt: 500, fdl3: 100 };
    setMiscRow('rngua', v.rngua); setMiscRow('ldt', v.ldt);
    var f = $('f-fdl3'); if (f && !f.disabled) f.value = v.fdl3;
    status('Đã áp preset (chưa nạp — kiểm tra rồi bấm NẠP LUÔN).');
  } else if (kind === 'save') {
    lsSet('vls_preset', readEdits());
    status('Đã lưu preset hiện tại.');
  } else if (kind === 'load') {
    var p = lsGet('vls_preset', null);
    if (!p) { status('Chưa có preset nào được lưu.'); return; }
    if (p.misc) Object.keys(p.misc).forEach(function (k) { setMiscRow(k, p.misc[k]); });
    var f2 = $('f-fdl3'); if (f2 && !f2.disabled && p.fdl3 != null) f2.value = p.fdl3;
    if (p.gold != null) $('f-gold').value = p.gold;
    if (p.knb != null) $('f-knb').value = p.knb;
    status('Đã áp preset đã lưu (chưa nạp).');
  }
}
function readEdits() {
  function num(id) { var n = parseInt($(id).value, 10); return isNaN(n) ? 0 : n; }
  var misc = {};
  document.querySelectorAll('[data-misc]').forEach(function (row) {
    var v = parseInt(row.value, 10);
    misc[row.getAttribute('data-misc')] = isNaN(v) ? 0 : v;
  });
  var f = $('f-fdl3');
  var lvlEl = $('f-lvl');
  var lvl = lvlEl ? Math.max(1, Math.min(200, num('f-lvl') || 1)) : null;
  var pct = parseFloat($('f-xppct') ? $('f-xppct').value : '0');
  if (isNaN(pct)) pct = 0;
  return {
    name: $('f-name').value.trim(),
    netOwner: $('f-netOwner').value.trim(),
    uid: num('f-uid'), gold: num('f-gold'), knb: num('f-knb'),
    lvl: lvl, xp: lvl != null ? xpFromPct(lvl, pct) : null,
    attrPts: $('f-attrpts') ? num('f-attrpts') : null,
    skPts: $('f-skpts') ? num('f-skpts') : null,
    fdl3: f && !f.disabled ? num('f-fdl3') : null,
    misc: misc
  };
}
function buildFinal() {
  if (!basePay) throw new Error('Chưa có nền save.');
  var pay = JSON.parse(JSON.stringify(basePay));
  var ed = readEdits();
  if (!ed.name) throw new Error('Chưa nhập tên nhân vật.');
  if (!ed.netOwner) throw new Error('Chưa nhập ID tài khoản.');
  var notes = applyEdits(pay, ed);
  return { envStr: finalize(pay), pay: pay, notes: notes };
}
function targetSlot() {
  var v = $('target').value;
  return v === 'cur' ? (pageState ? pageState.slotIdx : 0) : parseInt(v, 10);
}
function renderChecklist() {
  var box = $('checklist');
  if (!box) return;
  if (!pageState) { box.textContent = '● --  Chưa đọc được trạng thái game'; return; }
  var items = [];
  items.push([pageState.offline, pageState.offline ? 'Trang: bản OFFLINE — nạp được' : 'Trang: URL CHÍNH — nạp save phải ở bản offline']);
  var ownerEl = $('f-netOwner');
  var owner = ownerEl ? ownerEl.value.trim() : '';
  if (!pageState.session) items.push([null, 'Tài khoản: chưa đăng nhập trong khung game']);
  else if (owner && owner !== pageState.session.id) items.push([false, 'Tài khoản: ID trong form (...' + owner.slice(-6) + ') KHÁC acc đang đăng nhập (...' + pageState.session.id.slice(-6) + ')']);
  else items.push([true, 'Tài khoản: khớp acc đang đăng nhập (...' + pageState.session.id.slice(-6) + ')']);
  var ts = targetSlot();
  var cur = pageState.slots[ts];
  items.push([null, 'Slot đích: Slot ' + (ts + 1) + (cur && !cur.broken ? ' — đang có ' + cur.name + ' cấp ' + cur.lvl + ' (sẽ backup trước khi ghi)' : ' — đang trống')]);
  box.textContent = items.map(function (i) { return (i[0] === true ? '● OK  ' : i[0] === false ? '● LỖI  ' : '● --  ') + i[1]; }).join('\n');
}

// ---------- Nạp / xuất file ----------
var pendingApply = null;
function hideConfirm() { var b = $('confirm'); b.style.display = 'none'; b.innerHTML = ''; pendingApply = null; }
function showConfirm(r, ts) {
  var box = $('confirm');
  var cur = pageState ? pageState.slots[ts] : null;
  function dl(label, a, b) { return label + ': ' + (a == null ? '(trống)' : a) + ' -> ' + b; }
  var fdl = findFdl3(r.pay);
  var lines = [
    'NẠP VÀO SLOT ' + (ts + 1) + ' — xem kỹ rồi xác nhận:',
    dl('Tên', cur && cur.name, r.pay.name),
    dl('Cấp', cur && cur.lvl, r.pay.lvl),
    dl('Rương Ngựa', cur && cur.rngua, r.pay.mats.misc.rngua || 0),
    'Tài khoản đích: ...' + String(r.pay.netOwner).slice(-6)
  ];
  if (fdl) lines.push('Phúc Duyên Lộ (Đại): ' + fdl.ktc.c);
  if (r.notes.length) lines.push(r.notes.join(' '));
  box.innerHTML = '<div style="white-space:pre-wrap">' + lines.join('\n') + '</div>' +
    '<div class="row" style="margin-top:7px"><button id="cf-yes" class="act">Xác nhận nạp</button><button id="cf-no" class="sec">Hủy</button></div>';
  box.style.display = 'block';
  $('cf-yes').onclick = doApply;
  $('cf-no').onclick = hideConfirm;
}
async function doApply() {
  if (!pendingApply) return;
  var r = pendingApply.r, ts = pendingApply.ts;
  hideConfirm();
  var ok = false;
  try { ok = await exec(pageWriteSave, SLOT_KEYS[ts], r.envStr, ts); } catch (e) {}
  if (!ok) { status('GHI THẤT BẠI: đọc lại không khớp — tải lại khung game rồi thử lại.'); return; }
  pending = { slot: ts, name: r.pay.name, lvl: r.pay.lvl, netOwner: r.pay.netOwner, stage: 'written', ts: Date.now() };
  lsSet('vls_pending', pending);
  pendingReported = '';
  log('Nạp ' + r.pay.name + ' cấp ' + r.pay.lvl + ' -> slot ' + (ts + 1));
  status('ĐÃ GHI XONG — đang tải lại khung game để kiểm chứng...');
  wv.reload();
}
$('apply').onclick = function () {
  try {
    hideConfirm();
    if (!pageState) { status('Chưa đọc được trạng thái game — đợi game tải xong rồi thử lại.'); return; }
    if (!pageState.offline) { status('Đang ở URL chính — bấm nút "Bản offline (nạp save)" trên thanh công cụ trước.'); return; }
    var r = buildFinal();
    var ts = targetSlot();
    var sess = pageState.session;
    var override = $('override').checked;
    if (!sess) {
      if (!override) { status('CHẶN: chưa đăng nhập acc nào trong khung game nên không chứng minh được save thuộc về ai. Đăng nhập trước — hoặc tích ô "Vẫn nạp..." nếu chắc chắn.'); return; }
    } else if (String(r.pay.netOwner) !== sess.id && !override) {
      status('CHẶN: ID đích (...' + String(r.pay.netOwner).slice(-6) + ') KHÁC acc đang đăng nhập (...' + sess.id.slice(-6) + '). Đây là lỗi làm các lần nạp sáng nay bị game gạt. Sửa ID cho khớp — hoặc tích ô "Vẫn nạp..." nếu cố ý nạp chéo.');
      return;
    }
    pendingApply = { r: r, ts: ts };
    showConfirm(r, ts);
  } catch (e) { status('Lỗi: ' + (e.message || e)); }
};
$('download').onclick = function () {
  try {
    var r = buildFinal();
    var outer = JSON.stringify({ game: 'jxidle', v: 1, exported: Date.now(), fac: r.pay.fac, lvl: r.pay.lvl, data: r.envStr });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([outer], { type: 'application/octet-stream' }));
    a.download = 'jxidle_' + String(r.pay.name).replace(/[^a-zA-Z0-9_]/g, '_') + '_studio.jxsave';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    log('Xuất file cho ' + r.pay.name + ' cấp ' + r.pay.lvl);
    status('Đã xuất file .jxsave.');
  } catch (e) { status('Lỗi: ' + (e.message || e)); }
};

// ---------- Nhân vật sạch Vô Môn theo cấp (khung: template Vô Môn, reset về đúng mẫu factory D6 của game) ----------
function buildCleanChar(L) {
  L = Math.max(1, Math.min(200, L | 0));
  var pay = parseSaveText(window.TEMPLATES.vo4).pay;
  pay.lvl = L;
  pay.xp = 0;
  pay.attrPts = (L - 1) * 5;
  pay.skPts = L;
  pay.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
  pay.gold = 0;
  pay.knb = 0;
  pay.inv = [];
  pay.chest = [];
  pay.stable = [];
  pay.eq = {};
  pay.mats = { ht: {}, ore: {}, shard: {}, misc: {}, dp: {} };
  pay.sk = {};
  pay.skL = {};
  pay.kp = {};
  pay.kps = 0.2;
  pay.stage = 1;
  pay.maxStage = 1;
  pay.wave = 1;
  pay.totalKills = 0;
  return pay;
}
var baseKind = '';

// ---------- Bases ----------
async function loadBase(kind) {
  baseKind = kind;
  try {
    if (kind === 'tpl-kunlun') basePay = parseSaveText(window.TEMPLATES.kunlun).pay;
    else if (kind === 'tpl-vo4') basePay = parseSaveText(window.TEMPLATES.vo4).pay;
    else if (kind === 'clean') basePay = buildCleanChar(parseInt(($('clean-lvl') || {}).value, 10) || 100);
    else if (kind === 'cur') {
      if (!pageState) throw new Error('Chưa đọc được trạng thái game.');
      var raw = await exec(pageReadKey, SLOT_KEYS[pageState.slotIdx]);
      if (!raw) throw new Error('Slot đang chọn trống, không có save làm nền.');
      basePay = parseSaveText(raw).pay;
    }
    if (basePay) {
      if (pageState && pageState.session) basePay.netOwner = pageState.session.id;
      else if (kind !== 'cur') basePay.netOwner = '';
      buildForm(basePay);
      if (kind !== 'cur') freshUid();
      status('Đã nạp nền: ' + basePay.name + ' cấp ' + basePay.lvl + '.');
    }
  } catch (e) { status('Lỗi nền: ' + (e.message || e)); }
}
$('base').onchange = function () {
  $('base-file').style.display = this.value === 'file' ? 'block' : 'none';
  $('clean-row').style.display = this.value === 'clean' ? 'block' : 'none';
  if (this.value !== 'file') loadBase(this.value);
};
$('clean-lvl').onchange = function () { if (baseKind === 'clean') loadBase('clean'); };
$('base-file').onchange = function () {
  var f = this.files && this.files[0];
  if (!f) return;
  f.text().then(function (t) {
    try {
      basePay = parseSaveText(t).pay;
      if (pageState && pageState.session) basePay.netOwner = pageState.session.id;
      buildForm(basePay);
      freshUid();
      status('Đã đọc file nền: ' + f.name);
    } catch (e) { status('Lỗi file: ' + (e.message || e)); }
  });
};
$('target').onchange = renderChecklist;

// ---------- Bản lưu có tên + Dashboard ----------
function renderBackups() {
  var box = $('backups');
  if (!box) return;
  exec(pageBackupList).then(function (json) {
    var arr = [];
    try { arr = JSON.parse(json || '[]'); } catch (e) {}
    if (!arr.length) { box.innerHTML = '<div class="desc">(chưa có bản lưu nào — bấm "Tạo bản lưu" ở thẻ slot phía trên)</div>'; return; }
    box.innerHTML = arr.map(function (b) {
      var slotIdx = b.key.indexOf('jxidle_3') === 0 ? 3 : b.key.indexOf('jxidle_2') === 0 ? 2 : 1;
      var when = new Date(b.ts).toLocaleString();
      return '<div class="slot-card">Slot ' + slotIdx + ' — <b>' + b.name + '</b> cấp ' + b.lvl + '<br><span style="color:#8b94a7">' + when + '</span><br>' +
        '<button class="mini" data-bak-restore="' + b.key + '" style="margin-top:5px">Khôi phục vào slot ' + slotIdx + '</button>' +
        '<button class="mini" data-bak-del="' + b.key + '" style="margin-top:5px;margin-left:5px;background:#5c2626">Xoá</button></div>';
    }).join('');
    box.querySelectorAll('[data-bak-restore]').forEach(function (btn) {
      btn.onclick = function () { restoreBackupKey(btn.getAttribute('data-bak-restore')); };
    });
    box.querySelectorAll('[data-bak-del]').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('Xoá bản lưu này?')) return;
        await exec(pageDeleteKey, btn.getAttribute('data-bak-del'));
        log('Đã xoá bản lưu ' + btn.getAttribute('data-bak-del'));
        renderBackups();
      };
    });
  }).catch(function () {});
}
async function restoreBackupKey(bkKey) {
  if (!pageState || !pageState.offline) { alert('Khôi phục nên làm ở bản offline — bấm nút "Bản offline" trước.'); return; }
  if (!confirm('Khôi phục bản lưu này vào slot của nó? Save hiện tại trong slot sẽ bị ghi đè.')) return;
  var raw = await exec(pageReadKey, bkKey);
  if (!raw) { alert('Không đọc được bản lưu.'); return; }
  var idx = bkKey.indexOf('jxidle_3') === 0 ? 2 : bkKey.indexOf('jxidle_2') === 0 ? 1 : 0;
  var ok = await exec(pageWriteSave, SLOT_KEYS[idx], raw, idx);
  if (!ok) { alert('Ghi thất bại.'); return; }
  try { var bp = parseSaveText(raw).pay; pending = { slot: idx, name: bp.name, lvl: bp.lvl, netOwner: bp.netOwner, stage: 'written', ts: Date.now() }; lsSet('vls_pending', pending); pendingReported = ''; } catch (e) {}
  log('Khôi phục bản lưu ' + bkKey + ' -> slot ' + (idx + 1));
  wv.reload();
}
function renderHome() {
  var sEl = $('home-session'), box = $('home-slots');
  if (!sEl || !box) return;
  if (!pageState) { sEl.textContent = 'Đang đọc trạng thái game...'; box.innerHTML = ''; return; }
  var sess = pageState.session;
  sEl.innerHTML = (pageState.offline ? 'Chế độ: <b>Bản offline</b> (nạp save)' : 'Chế độ: <b>Trang chính</b> (chơi / thao tác trong game)') +
    '<br>Tài khoản: ' + (sess ? 'đã đăng nhập (...' + sess.id.slice(-6) + ')' + (String(sess.src).indexOf('lastuser') >= 0 ? ' <span style="color:#ffd54f">— ID lấy từ lastuser, có thể là ID cũ!</span>' : '') : 'chưa đăng nhập') +
    (pending ? '<br><span style="color:#ffd54f">Kiểm chứng lần nạp gần nhất: ' + pending.name + ' — ' + pending.stage + '</span>' : '');
  box.innerHTML = pageState.slots.map(function (s, i) {
    var cur = i === pageState.slotIdx;
    if (!s) return '<div class="slot-card"><b>Slot ' + (i + 1) + '</b> — trống' + (cur ? ' · <span style="color:#9ccc65">đang chọn</span>' : '') + '</div>';
    if (s.broken) return '<div class="slot-card"><b>Slot ' + (i + 1) + '</b> — save không đọc được</div>';
    return '<div class="slot-card"><b>' + s.name + '</b> — cấp ' + s.lvl + (cur ? ' · <span style="color:#9ccc65">đang chọn</span>' : '') +
      '<br><span style="color:#8b94a7">Rương Ngựa: ' + (s.rngua == null ? '?' : s.rngua) + ' · chủ ...' + String(s.netOwner || '?').slice(-6) + '</span>' +
      '<br><button class="mini" data-dl="' + i + '" style="margin-top:5px">Xuất file .jxsave</button>' +
      '<button class="mini" data-baknew="' + i + '" style="margin-top:5px;margin-left:5px">Tạo bản lưu</button></div>';
  }).join('');
  box.querySelectorAll('[data-dl]').forEach(function (b) {
    b.onclick = async function () {
      var i = parseInt(b.getAttribute('data-dl'), 10);
      var raw = await exec(pageReadKey, SLOT_KEYS[i]);
      if (!raw) return;
      try {
        var parsed = parseSaveText(raw);
        var outer = JSON.stringify({ game: 'jxidle', v: 1, exported: Date.now(), fac: parsed.pay.fac, lvl: parsed.pay.lvl, data: raw });
        var a2 = document.createElement('a');
        a2.href = URL.createObjectURL(new Blob([outer], { type: 'application/octet-stream' }));
        a2.download = 'jxidle_' + String(parsed.pay.name).replace(/[^a-zA-Z0-9_]/g, '_') + '_slot' + (i + 1) + '.jxsave';
        a2.click();
        setTimeout(function () { URL.revokeObjectURL(a2.href); }, 4000);
        log('Xuất file slot ' + (i + 1) + ': ' + parsed.pay.name + ' cấp ' + parsed.pay.lvl);
      } catch (e) { alert('Slot này không đọc được để xuất.'); }
    };
  });
  box.querySelectorAll('[data-baknew]').forEach(function (b) {
    b.onclick = async function () {
      var i = parseInt(b.getAttribute('data-baknew'), 10);
      var k = await exec(pageCreateBackup, SLOT_KEYS[i]);
      if (k) { log('Tạo bản lưu ' + k); renderBackups(); }
      else alert('Không tạo được bản lưu (slot trống?).');
    };
  });
  renderBackups();
}
document.querySelectorAll('[data-goto]').forEach(function (b) {
  b.onclick = function () { showTab(b.getAttribute('data-goto')); };
});

// ---------- Tương thích với game hiện tại + Công cụ ----------
var compatState = null;
var compatRunning = false;
var compatAutoDone = false;
function renderCompat() {
  var el = $('compat');
  if (!el) return;
  if (!compatState) { el.innerHTML = '<b>Tương thích với game:</b> <span style="color:#8b94a7">chưa kiểm tra — bấm "Kiểm tra tương thích" ở mục Công cụ bên dưới.</span>'; return; }
  var color = compatState.level === 'fail' ? '#ef9a9a' : compatState.level === 'warn' ? '#ffd54f' : '#9ccc65';
  var head = compatState.level === 'fail' ? 'KHÔNG KHỚP — KHÔNG NÊN NẠP LÚC NÀY' : compatState.level === 'warn' ? 'Có điểm cần chú ý' : 'Khớp tốt';
  el.innerHTML = '<b style="color:' + color + '">Tương thích với game: ' + head + '</b>' +
    (compatState.ver ? ' · phiên bản game: <b>v' + compatState.ver + '</b>' : '') +
    '<br><span style="color:#8b94a7">' + compatState.lines.map(function (l) { return (l.ok === true ? '● OK&nbsp;&nbsp;' : l.ok === false ? '● LỖI&nbsp;&nbsp;' : '● --&nbsp;&nbsp;') + l.text; }).join('<br>') + '</span>' +
    '<br><span style="color:#5d6677">Kiểm tra lúc ' + compatState.when + '</span>';
}
async function runCompat() {
  if (compatRunning) return;
  compatRunning = true;
  var lines = [], level = 'ok', ver = null;
  try {
    var pc = {};
    try { pc = JSON.parse((await exec(pageCompat)) || '{}'); } catch (e) {}
    ver = pc.ver || null;
    var checked = false;
    if (pageState) {
      for (var i = 0; i < 3 && !checked; i++) {
        var raw = await exec(pageReadKey, SLOT_KEYS[i]);
        if (!raw) continue;
        checked = true;
        try {
          var p2 = JSON.parse(raw);
          var e2 = typeof p2.data === 'string' ? JSON.parse(p2.data) : p2;
          if (e2.f !== 2) { lines.push({ ok: false, text: 'Save ở slot ' + (i + 1) + ' có định dạng lạ (f=' + e2.f + ', tool chỉ hiểu f=2)' }); level = 'fail'; }
          else if (gameHash(e2.d) === e2.h) lines.push({ ok: true, text: 'Hàm băm + định dạng save khớp save thật ở slot ' + (i + 1) });
          else { lines.push({ ok: false, text: 'Hàm băm KHÔNG khớp save thật ở slot ' + (i + 1) + ' — game có thể đã đổi salt hoặc định dạng save' }); level = 'fail'; }
        } catch (e) { lines.push({ ok: false, text: 'Save ở slot ' + (i + 1) + ' không đọc được: ' + e.message }); level = 'fail'; }
      }
    }
    if (!checked) lines.push({ ok: null, text: 'Chưa có save nào trong máy để kiểm chứng hàm băm' });
    if (pc.exp && pc.exp.length) {
      var same = pc.exp.length === EXP_TABLE.length && pc.exp.every(function (v, ix) { return v === EXP_TABLE[ix]; });
      if (same) lines.push({ ok: true, text: 'Bảng EXP khớp game hiện tại (200 cấp)' });
      else if (pc.exp.length === 200 && pc.exp[0] === 100 && pc.exp.every(function (v, ix) { return v > 0 && (ix === 0 || v >= pc.exp[ix - 1]); })) {
        EXP_TABLE = pc.exp;
        lines.push({ ok: null, text: 'Bảng EXP của game ĐÃ ĐỔI — tool đã tự dùng bảng mới cho phiên làm việc này' });
        if (level === 'ok') level = 'warn';
      } else lines.push({ ok: null, text: 'Đọc được bảng EXP lạ từ game — giữ nguyên bảng EXP cũ của tool cho chắc' });
    } else lines.push({ ok: null, text: 'Không đọc được bảng EXP từ game (bỏ qua mục này)' });
    if (ver) {
      var prev = lsGet('vls_game_ver', 0);
      if (prev && prev !== ver) lines.push({ ok: null, text: 'Game vừa cập nhật: v' + prev + ' → v' + ver });
      lsSet('vls_game_ver', ver);
    } else lines.push({ ok: null, text: 'Không xác định được phiên bản game (không thấy cache của game)' });
  } catch (e) {
    lines.push({ ok: false, text: 'Lỗi khi kiểm tra: ' + (e.message || e) });
    if (level === 'ok') level = 'warn';
  }
  compatState = { level: level, ver: ver, lines: lines, when: new Date().toLocaleString() };
  compatRunning = false;
  renderCompat();
  log('Kiểm tra tương thích: ' + level.toUpperCase() + (ver ? ' (game v' + ver + ')' : ''));
}
$('compat-run').onclick = function () { runCompat(); };
$('clear-cache').onclick = async function () {
  if (!confirm('Xóa cache của game (service worker + bộ nhớ đệm) để ép tải bản game mới nhất?\nSave trong máy và đăng nhập KHÔNG bị đụng vào.')) return;
  try {
    var r = JSON.parse((await exec(pageClearGameCache)) || '{}');
    log('Đã xóa cache game: ' + (r.sw || 0) + ' service worker, ' + (r.cache || 0) + ' mục cache');
    status('Đã xóa cache game — đang tải lại khung game để nhận bản mới nhất...');
  } catch (e) { status('Xóa cache lỗi: ' + (e.message || e)); return; }
  compatAutoDone = false;
  wv.reload();
};
$('export-log').onclick = function () {
  var L = [];
  L.push('VL Save Studio Desktop v1.6.0 — xuất lúc ' + new Date().toLocaleString());
  if (pageState) {
    L.push('Trang: ' + (pageState.offline ? 'OFFLINE (nạp save)' : 'URL CHÍNH') + ' — ' + pageState.href);
    L.push('Phiên: ' + (pageState.session ? 'đã đăng nhập ...' + pageState.session.id.slice(-6) + ' (ID từ ' + pageState.session.src + ')' : 'chưa đăng nhập'));
    L.push('Slot đang chọn: ' + (pageState.slotIdx + 1));
    pageState.slots.forEach(function (s, i) { L.push('Slot ' + (i + 1) + ': ' + (!s ? 'trống' : s.broken ? 'save không đọc được' : s.name + ' cấp ' + s.lvl + ', chủ ...' + String(s.netOwner || '?').slice(-6))); });
  } else L.push('Chưa đọc được trạng thái game.');
  if (compatState) {
    L.push('Tương thích: ' + compatState.level.toUpperCase() + (compatState.ver ? ' (game v' + compatState.ver + ')' : '') + ' — kiểm tra lúc ' + compatState.when);
    compatState.lines.forEach(function (l) { L.push('  ' + (l.ok === true ? 'OK   ' : l.ok === false ? 'LỖI  ' : '--   ') + l.text); });
  }
  if (pending) L.push('Kiểm chứng sau nạp đang chờ: ' + pending.name + ' cấp ' + pending.lvl + ' — giai đoạn ' + pending.stage);
  L.push('');
  L.push('--- NHẬT KÝ THAO TÁC ---');
  var arr = lsGet('vls_log', []);
  L.push(arr.length ? arr.slice().reverse().join('\n') : '(trống)');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' }));
  a.download = 'vl-studio-nhat-ky.txt';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  log('Đã xuất nhật ký ra file vl-studio-nhat-ky.txt');
};

// ---------- Tab Tự động: Mở rương (logic v4: đếm bằng save thật) ----------
var chest = { chay: false, mo: 0 };
function renderChestInfo() {
  exec(pageRngua).then(function (n) {
    $('chest-info').textContent = 'Rương Ngựa trong save hiện tại: ' + (n >= 0 ? n : 'không đọc được (hãy vào hẳn trong game, chọn nhân vật trước)');
  }).catch(function () {});
}
function chestStatus(m) { $('chest-status').textContent = m; }
function chestStop(msg) {
  chest.chay = false;
  exec(pageRngua).then(function (n) {
    chestStatus(msg + '\nĐã mở THẬT: ' + chest.mo + ' rương' + (n >= 0 ? ', còn ' + n + ' rương' : ''));
    log('Mở rương: ' + msg + ' — đã mở ' + chest.mo);
    renderChestInfo();
  });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function chestRun(target) {
  var c0 = await exec(pageRngua);
  if (c0 < 0) { chestStatus('Không đọc được save — vào hẳn trong game (đã chọn nhân vật) rồi thử lại.'); return; }
  chest.chay = true; chest.mo = 0;
  var mucTieu = Math.min(target, c0);
  var thatBai = 0;
  chestStatus('Đang mở ' + mucTieu + ' rương, đếm bằng save thật...');
  log('Bắt đầu mở rương: mục tiêu ' + mucTieu);
  while (chest.chay && chest.mo < mucTieu) {
    var truoc = await exec(pageRngua);
    if (truoc <= 0) { chestStop('Đã mở hết rương!'); return; }
    var step = await exec(pageChestClick);
    if (!step) { chestStop('Mất nút bấm — mở Hành trang -> Rương Ngựa (thấy nút "Dùng ×10"), để nguyên popup rồi chạy lại.'); return; }
    var giam = 0;
    for (var w = 0; w < 30 && chest.chay; w++) {
      await sleep(100);
      var sau = await exec(pageRngua);
      if (sau >= 0 && sau < truoc) { giam = truoc - sau; break; }
    }
    if (!chest.chay) return;
    if (giam > 0) {
      chest.mo += giam;
      thatBai = 0;
      chestStatus('Đã mở ' + chest.mo + '/' + mucTieu + ' (còn ' + (truoc - giam) + ' rương)');
    } else if (++thatBai >= 2) {
      chestStop('Bấm 2 lần liên tiếp mà số rương trong save không giảm — TÚI ĐẦY hoặc popup đã đóng. Dọn túi, mở lại popup rồi chạy tiếp.');
      return;
    }
  }
  if (chest.chay) chestStop('Hoàn tất!');
}
$('chest-go').onclick = function () {
  if (pageState && pageState.offline) { chestStatus('Mở rương là thao tác trong game — hãy chạy ở Trang chính.'); return; }
  if (chest.chay) { chestStatus('Đang chạy rồi!'); return; }
  var v = parseInt($('chest-n').value, 10);
  chestRun(isNaN(v) || v <= 0 ? 9999 : v);
};
$('chest-stop').onclick = function () { if (chest.chay) chestStop('Đã dừng theo lệnh.'); };

// ---------- Tab Tự động: Mua KNB (tự bấm ×100 ở Kỳ Trân Các, đếm bằng KNB thật) ----------
var knbBuy = { chay: false, clicks: 0, gained: 0 };
function renderKnbInfo() {
  exec(pageKnb).then(function (n) {
    $('knb-info').textContent = 'KNB hiện có: ' + (n >= 0 ? n : 'không đọc được (hãy vào hẳn trong game trước)');
    exec(pageKnbToday).then(function (t) {
      if (t >= 0) $('knb-info').textContent += '\nĐã đổi hôm nay: ' + t + ' / 10.000 (đọc từ cửa hàng đang mở)';
    }).catch(function () {});
  }).catch(function () {});
}
function knbStatus(m) { $('knb-status').textContent = m; }
function knbStop(msg) {
  knbBuy.chay = false;
  exec(pageKnb).then(function (n) {
    knbStatus(msg + '\nĐã bấm: ' + knbBuy.clicks + ' lần ×100 — KNB +' + knbBuy.gained + (n >= 0 ? ', hiện có ' + n + ' KNB' : ''));
    log('Mua KNB: ' + msg + ' — ' + knbBuy.clicks + ' lần, +' + knbBuy.gained + ' KNB');
    renderKnbInfo();
  });
}
async function knbRun(times) {
  var k0 = await exec(pageKnb);
  if (k0 < 0) { knbStatus('Không đọc được save — vào hẳn trong game (đã chọn nhân vật) rồi thử lại.'); return; }
  knbBuy.chay = true; knbBuy.clicks = 0; knbBuy.gained = 0;
  var thatBai = 0;
  knbStatus('Đang mua: tối đa ' + times + ' lần ×100, đếm bằng KNB thật...');
  log('Bắt đầu tự mua KNB ×100: tối đa ' + times + ' lần');
  while (knbBuy.chay && knbBuy.clicks < times) {
    var truoc = await exec(pageKnb);
    var st = await exec(pageBuyKnb100);
    if (!st) { knbStop('Không thấy nút ×100 khả dụng — mở Kỳ Trân Các ở tab Tiện ích, để nguyên cửa hàng rồi chạy lại. (Nút cũng tự khoá khi đã đổi đủ 10.000 hôm nay.)'); return; }
    var tang = 0;
    for (var w = 0; w < 26 && knbBuy.chay; w++) {
      await sleep(150);
      var sau = await exec(pageKnb);
      if (sau >= 0 && sau > truoc) { tang = sau - truoc; break; }
    }
    if (!knbBuy.chay) return;
    if (tang > 0) {
      knbBuy.clicks++;
      knbBuy.gained += tang;
      thatBai = 0;
      knbStatus('Đã bấm ' + knbBuy.clicks + '/' + times + ' lần — KNB +' + knbBuy.gained + ' (hiện có ' + (truoc + tang) + ')');
    } else if (++thatBai >= 2) {
      knbStop('Bấm 2 lần liên tiếp mà KNB không tăng — đã đủ hạn mức 10.000 hôm nay, hoặc hết ngân lượng, hoặc cửa hàng đã đóng.');
      return;
    }
  }
  if (knbBuy.chay) knbStop('Hoàn tất!');
}
$('knb-go').onclick = function () {
  if (pageState && pageState.offline) { knbStatus('Mua KNB là thao tác trong game — hãy chạy ở Trang chính.'); return; }
  if (knbBuy.chay) { knbStatus('Đang chạy rồi!'); return; }
  var v = parseInt($('knb-n').value, 10);
  knbRun(isNaN(v) || v <= 0 ? 100 : v);
};
$('knb-stop').onclick = function () { if (knbBuy.chay) knbStop('Đã dừng theo lệnh.'); };

// ---------- Nhật ký: log() vẫn lưu ngầm vào localStorage 'vls_log' để debug khi cần (không còn tab riêng) ----------

// ---------- Tabs + điều hướng ----------
var activeTab = 'home';
function showTab(name) {
  activeTab = name;
  ['home', 'edit', 'auto'].forEach(function (t) {
    $('tab-' + t).style.display = t === name ? 'block' : 'none';
  });
  document.querySelectorAll('#tabs button').forEach(function (b) {
    b.className = b.getAttribute('data-tab') === name ? 'on' : '';
  });
  if (name === 'home') renderHome();
  if (name === 'auto') { renderChestInfo(); renderKnbInfo(); }
}
document.querySelectorAll('#tabs button').forEach(function (b) {
  b.onclick = function () { showTab(b.getAttribute('data-tab')); };
});
$('nav-main').onclick = function () { wv.loadURL('https://volamidle.pages.dev/'); };
$('nav-off').onclick = function () { wv.loadURL('https://volamidle.pages.dev/?offline_test=1'); };
$('nav-reload').onclick = function () { wv.reload(); };
wv.addEventListener('did-finish-load', function () { refreshState(); });
wv.addEventListener('did-navigate', function (e) { $('url').textContent = e.url; });
setInterval(refreshState, 6000);

// ---------- Boot ----------
renderCompat();
loadBase('tpl-kunlun');
refreshState();
showTab('home');
console.log('[VL Save Studio Desktop] sẵn sàng');
