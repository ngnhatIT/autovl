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
  if (!sess) { var lu = localStorage.getItem('jxidle_lastuser'); if (lu) sess = { id: lu, src: 'jxidle_lastuser' }; }
  if (!sess) sess = scan(localStorage);
  var keys = ['jxidle', 'jxidle_2', 'jxidle_3'];
  var slotIdx = parseInt(localStorage.getItem('jxidle_slot') || '0', 10);
  if (isNaN(slotIdx) || slotIdx < 0 || slotIdx > 2) slotIdx = 0;
  var slots = keys.map(function (k) {
    var raw = localStorage.getItem(k);
    var hasBak = !!localStorage.getItem(k + '_bak');
    if (!raw) return null;
    var p = parseD(raw);
    return p ? { name: p.name, lvl: p.lvl, netOwner: p.netOwner, rngua: (p.mats && p.mats.misc) ? p.mats.misc.rngua : null, hasBak: hasBak }
             : { broken: true, hasBak: hasBak };
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
  if (old) localStorage.setItem(key + '_bak', old);
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
function pageProbe() {
  var keys = ['jxidle', 'jxidle_2', 'jxidle_3'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!localStorage.getItem(k)) {
      var probe = '{"f":2,"d":"{}","h":"probe"}';
      try {
        localStorage.setItem(k, probe);
        var back = localStorage.getItem(k);
        localStorage.removeItem(k);
        return { ok: back === probe, method: 'slot trống ' + k };
      } catch (e) { return { ok: false, method: 'lỗi ghi ' + k + ': ' + e.message }; }
    }
  }
  var cur = localStorage.getItem('jxidle');
  try { localStorage.setItem('jxidle', cur); return { ok: localStorage.getItem('jxidle') === cur, method: 'cơ bản (ghi lại cùng giá trị)' }; }
  catch (e) { return { ok: false, method: 'lỗi: ' + e.message }; }
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
function pageChestClick() {
  var b = document.querySelector('#miUse10:not([disabled])') || document.querySelector('#ktcRngua10:not([disabled])');
  if (b) { b.click(); return 10; }
  b = document.querySelector('#mBody [data-ktcuse="rngua"]:not([disabled])');
  if (b) { b.click(); return 1; }
  return 0;
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
  renderLog();
}
function status(msg) { $('status').textContent = msg; }

var pageState = null;
var basePay = null;
var pending = lsGet('vls_pending', null);
var pendingReported = '';

async function refreshState() {
  try { pageState = await exec(pageReadState); } catch (e) { pageState = null; }
  renderSession();
  refreshAutoId();
  renderChecklist();
  if (activeTab === 'slots') renderSlots();
  if (activeTab === 'chest') renderChestInfo();
  verifyPending();
}
function renderSession() {
  var el = $('session');
  if (!pageState) { el.textContent = 'phiên: chưa đọc được (game đang tải?)'; return; }
  el.textContent = pageState.session
    ? 'phiên: ...' + pageState.session.id.slice(-6) + ' | ' + (pageState.offline ? 'OFFLINE' : 'URL CHÍNH')
    : 'phiên: chưa đăng nhập | ' + (pageState.offline ? 'OFFLINE' : 'URL CHÍNH');
  $('url').textContent = pageState.href;
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
    status('Kiểm chứng THẤT BẠI: save vừa nạp ("' + nm2 + '" cấp ' + lv2 + ') không còn ở slot đích — hiện tại là ' + found + '. Mở tab Kiểm tra để soi nguyên nhân.');
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
  return {
    name: $('f-name').value.trim(),
    netOwner: $('f-netOwner').value.trim(),
    uid: num('f-uid'), gold: num('f-gold'), knb: num('f-knb'),
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
  if (!ok) { status('GHI THẤT BẠI: đọc lại không khớp — mở tab Kiểm tra để soi.'); return; }
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

// ---------- Bases ----------
async function loadBase(kind) {
  try {
    if (kind === 'tpl-kunlun') basePay = parseSaveText(window.TEMPLATES.kunlun).pay;
    else if (kind === 'tpl-vo4') basePay = parseSaveText(window.TEMPLATES.vo4).pay;
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
  if (this.value !== 'file') loadBase(this.value);
};
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

// ---------- Tab Slots ----------
function renderSlots() {
  var box = $('slots');
  if (!pageState) { box.innerHTML = '<div class="box">Chưa đọc được trạng thái game.</div>'; return; }
  box.innerHTML = pageState.slots.map(function (s, i) {
    var info = '(trống)';
    if (s) info = s.broken ? '(save không đọc được)' : '<b>' + s.name + '</b> — cấp ' + s.lvl + ' | Rương Ngựa: ' + (s.rngua == null ? '?' : s.rngua) + ' | chủ ...' + String(s.netOwner || '?').slice(-6);
    return '<div class="slot-card">Slot ' + (i + 1) + ' (' + SLOT_KEYS[i] + '): ' + info +
      (s && s.hasBak ? '<br><button class="mini" data-restore="' + i + '" style="margin-top:5px;background:#6d4c00;color:#ffd54f">Khôi phục bản backup</button>' : '') + '</div>';
  }).join('');
  box.querySelectorAll('[data-restore]').forEach(function (b) {
    b.onclick = async function () {
      var i = parseInt(b.getAttribute('data-restore'), 10);
      if (!pageState || !pageState.offline) { alert('Khôi phục nên làm ở bản offline — bấm nút "Bản offline" trước.'); return; }
      if (!confirm('Khôi phục backup vào Slot ' + (i + 1) + '?')) return;
      var bak = await exec(pageReadKey, SLOT_KEYS[i] + '_bak');
      if (!bak) return;
      var ok = await exec(pageWriteSave, SLOT_KEYS[i], bak, i);
      if (ok) {
        try { var bp = parseSaveText(bak).pay; pending = { slot: i, name: bp.name, lvl: bp.lvl, netOwner: bp.netOwner, stage: 'written', ts: Date.now() }; lsSet('vls_pending', pending); } catch (e) {}
        log('Khôi phục backup -> slot ' + (i + 1));
        wv.reload();
      } else alert('Ghi thất bại.');
    };
  });
}
$('slots-refresh').onclick = refreshState;

// ---------- Tab Kiểm tra ----------
$('diag-run').onclick = async function () {
  var out = $('diag-out');
  if (!pageState) { out.textContent = 'Chưa đọc được trạng thái game.'; return; }
  var lines = [];
  lines.push([null, 'Trang: ' + (pageState.offline ? 'bản OFFLINE' : 'URL CHÍNH') + ' — ' + pageState.href]);
  lines.push([null, 'Môi trường: app desktop — không extension, không Save Guard, profile riêng sạch']);
  if (pageState.session) lines.push([true, 'Acc đang đăng nhập: ...' + pageState.session.id.slice(-6) + ' (từ ' + pageState.session.src + ')']);
  else lines.push([false, 'Acc đang đăng nhập: chưa đăng nhập']);
  if (pageState.lastuser && pageState.session && pageState.lastuser !== pageState.session.id)
    lines.push([false, 'jxidle_lastuser (...' + pageState.lastuser.slice(-6) + ') là ID CŨ còn sót — đừng tin nó']);
  pageState.slots.forEach(function (s, i) {
    if (!s) { lines.push([null, 'Slot ' + (i + 1) + ': trống']); return; }
    if (s.broken) { lines.push([false, 'Slot ' + (i + 1) + ': save không đọc được']); return; }
    var mine = pageState.session && String(s.netOwner) === pageState.session.id;
    lines.push([pageState.session ? mine : null, 'Slot ' + (i + 1) + ': ' + s.name + ' cấp ' + s.lvl + ', chủ ...' + String(s.netOwner || '?').slice(-6) + (pageState.session ? (mine ? ' (khớp acc đang đăng nhập)' : ' (KHÔNG thuộc acc đang đăng nhập)') : '')]);
  });
  try {
    var pr = await exec(pageProbe);
    lines.push([pr.ok, 'Thử ghi save (' + pr.method + '): ' + (pr.ok ? 'GHI OK' : 'BỊ CHẶN')]);
  } catch (e) { lines.push([false, 'Thử ghi save: lỗi ' + e.message]); }
  out.textContent = lines.map(function (i) { return (i[0] === true ? '● OK  ' : i[0] === false ? '● LỖI  ' : '● --  ') + i[1]; }).join('\n');
  log('Đã chạy kiểm tra hệ thống');
};

// ---------- Tab Mở rương (logic v4: đếm bằng save thật) ----------
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

// ---------- Tab Mua KNB (tự bấm ×100 ở Kỳ Trân Các, đếm bằng KNB thật) ----------
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

// ---------- Nhật ký ----------
function renderLog() {
  var arr = lsGet('vls_log', []);
  $('log').textContent = arr.length ? arr.join('\n') : '(chưa có thao tác nào)';
}
$('log-clear').onclick = function () { lsSet('vls_log', []); renderLog(); };

// ---------- Tabs + điều hướng ----------
var activeTab = 'edit';
function showTab(name) {
  activeTab = name;
  ['edit', 'chest', 'knb', 'slots', 'check', 'log'].forEach(function (t) {
    $('tab-' + t).style.display = t === name ? 'block' : 'none';
  });
  document.querySelectorAll('#tabs button').forEach(function (b) {
    b.className = b.getAttribute('data-tab') === name ? 'on' : '';
  });
  if (name === 'knb') renderKnbInfo();
  if (name === 'slots') renderSlots();
  if (name === 'chest') renderChestInfo();
  if (name === 'log') renderLog();
}
document.querySelectorAll('#tabs button').forEach(function (b) {
  b.onclick = function () { showTab(b.getAttribute('data-tab')); };
});
$('nav-main').onclick = function () { wv.loadURL('https://volamidle.pages.dev/'); };
$('nav-off').onclick = function () { wv.loadURL('https://volamidle.pages.dev/?offline_test=1'); };
$('nav-reload').onclick = function () { wv.reload(); };
wv.addEventListener('did-finish-load', function () { refreshState(); });
wv.addEventListener('did-navigate', function (e) { $('url').textContent = e.url; });
setInterval(function () { if (document.hasFocus()) refreshState(); }, 6000);

// ---------- Boot ----------
renderLog();
loadBase('tpl-kunlun');
refreshState();
console.log('[VL Save Studio Desktop] sẵn sàng');
