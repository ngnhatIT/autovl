// ==UserScript==
// @name         VL Save Studio Pro
// @namespace    vlss-pro
// @version      3.1
// @description  Võ Lâm Idle: tạo/sửa/nạp save (template sẵn, preset, sổ tài khoản, quản lý slot + backup) và tự động mở Rương Ngựa đếm bằng save thật.
// @match        https://volamidle.pages.dev/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
//
// VL SAVE STUDIO PRO v3.1
// Cài 1 lần trong Tampermonkey -> vào game là có nút "VL Studio".
// Tab Tạo/Sửa: chọn nền (2 template có sẵn / save hiện tại / file),
//   sửa tên, ID tài khoản, UID, toàn bộ nguyên liệu, Phúc Duyên Lộ
//   (Đại), Vàng, KNB -> NẠP LUÔN hoặc xuất file .jxsave.
// Tab Mở rương: tự bấm "Dùng x10" mở Rương Ngựa, đếm bằng save
//   thật trong localStorage (kế thừa bản v4). Chạy ở URL chính,
//   mở sẵn popup Rương Ngựa trong Hành trang.
// Tool KHÔNG tự tạo tài khoản game và KHÔNG sửa Điểm Phúc Duyên
//   (chỉ số do server quản lý, sửa local bị ghi đè khi đồng bộ).
(function () {
  'use strict';

  // ==HASH-BEGIN==
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
  // ==HASH-END==

  var TPL_KUNLUN = "__TPL_KUNLUN__";
  var TPL_VO4 = "__TPL_VO4__";

  var SLOT_KEYS = ['jxidle', 'jxidle_2', 'jxidle_3'];
  var MISC_LABELS = { rngua: 'Rương Ngựa', ldt: 'Lệnh Bài Dã Tẩu' };
  var EXP_TABLE = [100,500,1100,1900,2900,4100,5500,7100,8900,10900,13100,15700,18700,22100,25900,30100,34700,39700,45100,50900,57100,63900,71300,79300,87900,97100,106900,117300,128300,139900,152100,165400,179800,195300,211900,229600,248400,268300,289300,311400,334600,360400,388800,419800,453400,489600,528400,569800,613800,660400,709600,766000,829600,900400,978400,1063600,1156000,1255600,1362400,1476400,1597600,1738200,1898200,2077600,2276400,2494600,2732200,2989200,3265600,3561400,3876600,4240200,4652200,5112600,5621400,6178600,6784200,7438200,8140600,8891400,9690600,10600800,11622000,12754200,13997400,15351600,16816800,18393000,20080200,21878400,23787600,25933000,28314600,30932400,33786400,36876600,40203000,43765600,47564400,50000000,50000000,50000000,50000000,50000000,50000000,50000000,50000000,50000000,50000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,60000000,100000000,100000000,100000000,100000000,100000000,120000000,120000000,120000000,120000000,120000000,160000000,160000000,160000000,160000000,160000000,200000000,200000000,200000000,200000000,200000000,300000000,300000000,300000000,300000000,300000000,500000000,500000000,500000000,500000000,500000000,800000000,800000000,800000000,800000000,800000000,1200000000,1200000000,1200000000,1200000000,1200000000,1800000000,1800000000,1800000000,1800000000,1800000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000,2000000000];
  function xpNeed(lvl) { return EXP_TABLE[Math.max(1, Math.min(200, lvl | 0)) - 1] || 0; }
  function xpPctOf(pay) { var need = xpNeed(pay.lvl || 1); if (!need) return 0; var p = (pay.xp || 0) / need * 100; return Math.round(Math.min(99.99, Math.max(0, p)) * 100) / 100; }
  function xpFromPct(lvl, pct) { pct = Math.max(0, Math.min(99.99, pct)); return Math.floor(pct / 100 * xpNeed(lvl)); }

  // ==CORE-BEGIN==
  function slotKeyOf(i) { return SLOT_KEYS[i] || 'jxidle'; }

  function currentSlotIdx() {
    var s = parseInt(localStorage.getItem('jxidle_slot') || '0', 10);
    if (isNaN(s) || s < 0 || s > 2) s = 0;
    return s;
  }

  function parseSaveText(text) {
    var parsed = JSON.parse(String(text).trim());
    var env = typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed;
    if (env.f !== 2 || typeof env.d !== 'string') throw new Error('Định dạng save không hợp lệ');
    return { env: env, pay: JSON.parse(env.d) };
  }

  function findFdl3(pay) {
    var inv = pay.inv || [];
    for (var i = 0; i < inv.length; i++) {
      if (inv[i] && inv[i].ktc && inv[i].ktc.k === 'fdl3') return inv[i];
    }
    return null;
  }

  function rnguaOf(envText) {
    try {
      var pay = parseSaveText(envText).pay;
      var n = pay.mats && pay.mats.misc ? pay.mats.misc.rngua : null;
      return typeof n === 'number' ? n : -1;
    } catch (e) { return -1; }
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
      } else {
        notes.push('Nền này không có Phúc Duyên Lộ (Đại) trong túi — bỏ qua mục đó.');
      }
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
  // ==CORE-END==

  function lsGet(k, dflt) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function log(msg) {
    var arr = lsGet('vlss_log', []);
    arr.unshift(new Date().toLocaleString() + ' — ' + msg);
    if (arr.length > 100) arr.length = 100;
    lsSet('vlss_log', arr);
    renderLog();
  }

  function isOfflinePage() { return location.search.indexOf('offline_test=1') >= 0; }

  // ==ID-BEGIN==
  var _idInfo = null;
  function jwtSub(tok) {
    try {
      var p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (p.length % 4) p += '=';
      var bin = atob(p);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var obj = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      return obj.sub || null;
    } catch (e) { return null; }
  }
  function findJwt(v) {
    var i = v.indexOf('eyJ');
    if (i < 0) return null;
    var j = i;
    var ok = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.' ;
    while (j < v.length && ok.indexOf(v[j]) >= 0) j++;
    var tok = v.slice(i, j);
    return tok.split('.').length === 3 ? tok : null;
  }
  function scanStore(st) {
    for (var i = 0; i < st.length; i++) {
      var k = st.key(i);
      if (!k) continue;
      if (k.indexOf('auth') < 0 && k.indexOf('sb-') < 0 && k.indexOf('jxidle') < 0) continue;
      var v = st.getItem(k);
      if (!v) continue;
      var tok = findJwt(v);
      if (tok) {
        var sub = jwtSub(tok);
        if (sub) return { id: sub, src: 'token đăng nhập (' + k + ')' };
      }
      try {
        var o = JSON.parse(v);
        var u = o.user || (o.currentSession && o.currentSession.user) || (o.data && o.data.user) || (o.session && o.session.user);
        if (u && u.id) return { id: u.id, src: k };
      } catch (e) {}
    }
    return null;
  }
  function resolveAccountId() {
    // Ưu tiên PHIÊN ĐĂNG NHẬP hiện tại (sessionStorage) — sự thật "đang đăng nhập acc nào".
    // jxidle_lastuser chỉ là phương án dự phòng: thực tế nó có thể là ID cũ còn sót,
    // khác hẳn acc đang đăng nhập (đã gặp: lastuser 7330fd3a trong khi phiên là ab10bf91).
    var r = scanStore(sessionStorage);
    if (r) { _idInfo = r; return _idInfo; }
    var id = localStorage.getItem('jxidle_lastuser');
    if (id) { _idInfo = { id: id, src: 'jxidle_lastuser' }; return _idInfo; }
    r = scanStore(localStorage);
    if (r) { _idInfo = r; return _idInfo; }
    _idInfo = null;
    return null;
  }
  function lastUser() {
    var r = resolveAccountId();
    return r ? r.id : '';
  }
  // ==ID-END==

  // ==DIAG-BEGIN==
  function probeWrite(storage) {
    for (var i = 0; i < 3; i++) {
      var k = slotKeyOf(i);
      if (!storage.getItem(k)) {
        var probe = '{"f":2,"d":"{}","h":"probe"}';
        try {
          storage.setItem(k, probe);
          var back = storage.getItem(k);
          storage.removeItem(k);
          return { ok: back === probe, method: 'slot trống ' + k, tested: k };
        } catch (e) { return { ok: false, method: 'lỗi khi ghi ' + k + ': ' + e.message, tested: k }; }
      }
    }
    var key0 = slotKeyOf(0);
    var cur = storage.getItem(key0);
    try {
      storage.setItem(key0, cur);
      return { ok: storage.getItem(key0) === cur, method: 'cơ bản (ghi lại cùng giá trị)', tested: key0 };
    } catch (e) { return { ok: false, method: 'lỗi: ' + e.message, tested: key0 }; }
  }

  function checkPending(storage) {
    var raw = storage.getItem('vlss_pending');
    if (!raw) return { status: 'none' };
    var p = null;
    try { p = JSON.parse(raw); } catch (e) { return { status: 'none' }; }
    if (Date.now() - (p.ts || 0) > 30 * 60 * 1000) return { status: 'expired', pending: p };
    var slotRaw = storage.getItem(slotKeyOf(p.slot));
    if (!slotRaw) return { status: 'missing', pending: p };
    var pay = null;
    try { pay = parseSaveText(slotRaw).pay; } catch (e) { return { status: 'missing', pending: p }; }
    var ok = pay.name === p.name && String(pay.netOwner) === String(p.netOwner) && (pay.lvl || 0) >= (p.lvl || 0);
    return { status: ok ? 'ok' : 'mismatch', pending: p, found: { name: pay.name, lvl: pay.lvl, netOwner: pay.netOwner } };
  }

  function collectDiag() {
    var lines = [];
    var off = isOfflinePage();
    lines.push([null, 'Trang: ' + (off ? 'bản OFFLINE' : 'URL CHÍNH') + ' — ' + location.href]);
    var sess = resolveAccountId();
    var luRaw = localStorage.getItem('jxidle_lastuser') || '';
    if (sess) lines.push([true, 'Acc đang đăng nhập: ...' + sess.id.slice(-6) + ' (từ ' + sess.src + ')']);
    else lines.push([false, 'Acc đang đăng nhập: KHÔNG xác định được (chưa đăng nhập?)']);
    if (luRaw && sess && luRaw !== sess.id) lines.push([false, 'jxidle_lastuser (...' + luRaw.slice(-6) + ') là ID CŨ còn sót, khác acc đang đăng nhập — đừng tin nó']);
    for (var i = 0; i < 3; i++) {
      var raw = localStorage.getItem(slotKeyOf(i));
      if (!raw) { lines.push([null, 'Slot ' + (i + 1) + ': trống']); continue; }
      try {
        var pp = parseSaveText(raw).pay;
        var mine = sess && String(pp.netOwner) === sess.id;
        lines.push([sess ? mine : null, 'Slot ' + (i + 1) + ': ' + pp.name + ' cấp ' + pp.lvl + ', chủ ...' + String(pp.netOwner || '?').slice(-6) + (sess ? (mine ? ' (khớp acc đang đăng nhập)' : ' (KHÔNG thuộc acc đang đăng nhập — game sẽ gạt)') : '')]);
      } catch (e) { lines.push([false, 'Slot ' + (i + 1) + ': save không đọc được']); }
    }
    var pr = probeWrite(localStorage);
    lines.push([pr.ok, 'Thử ghi save (' + pr.method + '): ' + (pr.ok ? 'GHI OK' : 'BỊ CHẶN')]);
    lines.push([null, 'Cờ __vlAllowSave: ' + String(window.__vlAllowSave)]);
    return lines;
  }
  // ==DIAG-END==

  // Ghi save vào 1 slot: bật cờ Save Guard, backup, ghi, verify, chặn ghi đè, reload.
  function writeSave(slotIdx, envStr, why, meta) {
    var key = slotKeyOf(slotIdx);
    window.__vlAllowSave = true;
    var old = localStorage.getItem(key);
    if (old) localStorage.setItem(key + '_bak', old);
    localStorage.setItem(key, envStr);
    localStorage.setItem('jxidle_slot', String(slotIdx));
    if (localStorage.getItem(key) !== envStr) return false;
    if (meta) lsSet('vlss_pending', { slot: slotIdx, name: meta.name, lvl: meta.lvl, netOwner: meta.netOwner, stage: 'written', ts: Date.now() });
    log(why + ' -> slot ' + (slotIdx + 1) + ' (' + key + ')' + (old ? ', đã backup bản cũ' : ''));
    var origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (SLOT_KEYS.indexOf(k) >= 0) return;
      return origSet.call(this, k, v);
    };
    return true;
  }

  // ---------- UI ----------
  var basePay = null;
  var baseKind = 'tpl-kunlun';

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstChild;
  }
  function inp(id, val, type) {
    return '<input id="vlss-' + id + '" type="' + (type || 'number') + '" value="' + val + '" style="width:100%;padding:4px;margin:2px 0 6px;box-sizing:border-box">';
  }
  function lbl(t) { return '<label style="color:#bbb">' + t + ':</label><br>'; }

  var btn = el('<button style="position:fixed;right:12px;bottom:12px;z-index:999998;background:#2e7d32;color:#fff;border:0;border-radius:20px;padding:10px 16px;font:700 13px sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)">VL Studio</button>');
  btn.id = 'vlss-btn';

  var panel = el('<div style="position:fixed;top:8px;right:8px;z-index:999999;width:372px;max-height:94vh;overflow:auto;background:#171724;color:#eee;border:1px solid #3a3a55;border-radius:10px;padding:12px 14px;font:13px/1.45 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);display:none"></div>');
  panel.id = 'vlss-panel';
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<b style="font-size:14px">VL SAVE STUDIO PRO</b>' +
    '<button id="vlss-x" style="background:#555;color:#fff;border:0;border-radius:4px;padding:2px 9px;cursor:pointer">X</button></div>' +
    '<div id="vlss-session" style="margin-top:6px;font-size:12px;color:#9ccc65"></div>' +
    '<div style="display:flex;gap:4px;margin:9px 0">' +
    ['edit|Tạo/Sửa', 'chest|Mở rương', 'slots|Slots', 'check|Kiểm tra', 'log|Nhật ký'].map(function (t) {
      var p = t.split('|');
      return '<button data-tab="' + p[0] + '" class="vlss-tab" style="flex:1;padding:6px 2px;background:#26263a;color:#ddd;border:1px solid #3a3a55;border-radius:6px;cursor:pointer;font-size:12px">' + p[1] + '</button>';
    }).join('') + '</div>' +
    '<div id="vlss-tab-edit"></div>' +
    '<div id="vlss-tab-chest" style="display:none"></div>' +
    '<div id="vlss-tab-slots" style="display:none"></div>' +
    '<div id="vlss-tab-check" style="display:none"></div>' +
    '<div id="vlss-tab-log" style="display:none"></div>';

  // --- Tab Tạo/Sửa ---
  panel.querySelector('#vlss-tab-edit').innerHTML =
    lbl('Nền save') +
    '<select id="vlss-base" style="width:100%;padding:4px;margin:2px 0 8px">' +
    '<option value="tpl-kunlun">Template Côn Luân cấp 49 · XP 99,99%</option>' +
    '<option value="tpl-vo4">Template Vô Môn Phái cấp 49 · XP 99,99%</option>' +
    '<option value="cur">Save hiện tại trong máy (slot đang chọn)</option>' +
    '<option value="file">Chọn file .jxsave...</option></select>' +
    '<input type="file" id="vlss-file" accept=".jxsave,.json,.txt" style="display:none;width:100%;margin-bottom:6px">' +
    '<div id="vlss-form"></div>' +
    lbl('Nạp vào slot') +
    '<select id="vlss-target" style="width:100%;padding:4px;margin:2px 0 6px">' +
    '<option value="cur">Slot đang chọn trong game</option>' +
    '<option value="0">Slot 1</option><option value="1">Slot 2</option><option value="2">Slot 3</option></select>' +
    '<div id="vlss-check" style="background:#10101c;border:1px solid #2c2c44;border-radius:6px;padding:6px 8px;margin:6px 0;white-space:pre-wrap"></div>' +
    '<div style="display:flex;gap:6px">' +
    '<button id="vlss-apply" style="flex:1;padding:9px;background:#2e7d32;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:700">NẠP LUÔN</button>' +
    '<button id="vlss-dl" style="flex:1;padding:9px;background:#37474f;color:#fff;border:0;border-radius:6px;cursor:pointer">Tải file .jxsave</button></div>' +
    '<label style="display:flex;gap:6px;align-items:center;margin-top:8px;color:#ef9a9a;font-size:12px"><input type="checkbox" id="vlss-override"> Vẫn nạp dù ID khác acc đang đăng nhập (rủi ro bị game gạt — chính là lỗi sáng nay)</label>' +
    '<div id="vlss-confirm" style="display:none;background:#10101c;border:1px solid #2e7d32;border-radius:6px;padding:8px;margin-top:8px"></div>' +
    '<div id="vlss-status" style="margin-top:8px;color:#ffd54f;white-space:pre-wrap"></div>';

  // --- Tab Mở rương ---
  panel.querySelector('#vlss-tab-chest').innerHTML =
    '<div style="color:#bbb;margin-bottom:6px">Tự bấm nút "Dùng ×10" trong popup Rương Ngựa (Hành trang). Đếm bằng save thật — bấm hụt là tool biết ngay. Chạy ở <b>URL chính</b>, mở sẵn popup trước khi bấm Bắt đầu.</div>' +
    '<div id="vlss-chest-info" style="margin:6px 0"></div>' +
    lbl('Số rương muốn mở') + inp('chest-n', 9999) +
    '<div style="display:flex;gap:6px">' +
    '<button id="vlss-chest-go" style="flex:1;padding:9px;background:#2e7d32;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:700">Bắt đầu mở</button>' +
    '<button id="vlss-chest-stop" style="flex:1;padding:9px;background:#8e2828;color:#fff;border:0;border-radius:6px;cursor:pointer">Dừng</button></div>' +
    '<div id="vlss-chest-status" style="margin-top:8px;color:#ffd54f;white-space:pre-wrap"></div>';

  // --- Tab Slots ---
  panel.querySelector('#vlss-tab-slots').innerHTML =
    '<div id="vlss-slots"></div>' +
    '<button id="vlss-slots-refresh" style="padding:6px 10px;background:#37474f;color:#fff;border:0;border-radius:6px;cursor:pointer;margin-top:6px">Làm mới</button>';

  // --- Tab Kiểm tra ---
  panel.querySelector('#vlss-tab-check').innerHTML =
    '<div style="color:#bbb;margin-bottom:6px">Kiểm tra tận gốc các lỗi đã gặp: đang đăng nhập acc nào, các slot chứa gì và thuộc về ai, ghi save có bị chặn không.</div>' +
    '<button id="vlss-diag-run" style="padding:8px 14px;background:#2e7d32;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:700">Chạy kiểm tra</button>' +
    '<div id="vlss-diag-out" style="margin-top:8px;white-space:pre-wrap;background:#10101c;border:1px solid #2c2c44;border-radius:6px;padding:7px 9px"></div>';

  // --- Tab Nhật ký ---
  panel.querySelector('#vlss-tab-log').innerHTML =
    '<div id="vlss-log" style="white-space:pre-wrap;font-size:12px;color:#ccc"></div>' +
    '<button id="vlss-log-clear" style="padding:6px 10px;background:#555;color:#fff;border:0;border-radius:6px;cursor:pointer;margin-top:6px">Xóa nhật ký</button>';

  function status(msg) { panel.querySelector('#vlss-status').textContent = msg; }
  function chestStatus(msg) { panel.querySelector('#vlss-chest-status').textContent = msg; }

  function showTab(name) {
    ['edit', 'chest', 'slots', 'check', 'log'].forEach(function (t) {
      panel.querySelector('#vlss-tab-' + t).style.display = t === name ? 'block' : 'none';
    });
    if (name === 'slots') renderSlots();
    if (name === 'log') renderLog();
    if (name === 'chest') renderChestInfo();
  }
  panel.querySelectorAll('.vlss-tab').forEach(function (b) {
    b.onclick = function () { showTab(b.getAttribute('data-tab')); };
  });
  btn.onclick = function () {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') { renderSession(); refreshAutoId(); renderChestInfo(); }
  };
  panel.querySelector('#vlss-x').onclick = function () { panel.style.display = 'none'; };

  function mount() {
    if (!document.getElementById('vlss-btn')) document.body.appendChild(btn);
    if (!document.getElementById('vlss-panel')) document.body.appendChild(panel);
  }
  mount();
  setInterval(mount, 5000);

  function renderSession() {
    var bar = panel.querySelector('#vlss-session');
    if (!bar) return;
    var r = resolveAccountId();
    var page = isOfflinePage() ? 'Bản OFFLINE' : 'URL CHÍNH';
    bar.textContent = r ? ('Đang đăng nhập: ...' + r.id.slice(-6) + ' (từ ' + r.src + ') | ' + page)
                        : ('Chưa xác định được acc đang đăng nhập | ' + page);
  }

  function verifyPending() {
    var res = checkPending(localStorage);
    if (res.status === 'none') return false;
    if (res.status === 'expired') { localStorage.removeItem('vlss_pending'); return false; }
    var p = res.pending;
    if (res.status === 'ok') {
      if (!isOfflinePage()) {
        localStorage.removeItem('vlss_pending');
        status('Kiểm chứng HOÀN TẤT: "' + p.name + '" cấp ' + p.lvl + ' vẫn giữ nguyên sau khi qua URL chính — nạp thành công trọn vẹn.');
        log('Kiểm chứng URL chính OK — nạp hoàn tất: ' + p.name + ' cấp ' + p.lvl);
        return true;
      }
      if (p.stage === 'written') {
        p.stage = 'offline-ok';
        p.ts = Date.now();
        lsSet('vlss_pending', p);
        status('Kiểm chứng sau nạp: "' + p.name + '" cấp ' + p.lvl + ' ĐÃ GHI DÍNH ở bản offline. Mở URL chính (dán lại tool nếu dùng bản Console) để tool xác nhận nốt bước đồng bộ.');
        log('Kiểm chứng offline OK: ' + p.name + ' cấp ' + p.lvl);
        return true;
      }
      return false;
    }
    localStorage.removeItem('vlss_pending');
    var found = res.status === 'missing' ? 'slot trống/không đọc được' : ('"' + res.found.name + '" cấp ' + res.found.lvl + ', chủ ...' + String(res.found.netOwner || '?').slice(-6));
    status('Kiểm chứng THẤT BẠI: save vừa nạp ("' + p.name + '" cấp ' + p.lvl + ') không còn ở slot ' + (p.slot + 1) + ' — hiện tại là ' + found + '. Mở tab Kiểm tra để soi nguyên nhân.');
    log('Kiểm chứng THẤT BẠI cho ' + p.name + ' — hiện tại: ' + found);
    return true;
  }

  panel.querySelector('#vlss-diag-run').onclick = function () {
    var lines = collectDiag();
    try {
      var fr = document.createElement('iframe');
      document.body.appendChild(fr);
      var patched = Storage.prototype.setItem !== fr.contentWindow.Storage.prototype.setItem;
      fr.remove();
      lines.push([null, 'setItem có bị script khác bọc: ' + patched + ' (Save Guard cũng bọc — ghi vẫn vào thì không sao)']);
    } catch (e) {}
    panel.querySelector('#vlss-diag-out').textContent = lines.map(function (i) {
      return (i[0] === true ? '● OK  ' : i[0] === false ? '● LỖI  ' : '● --  ') + i[1];
    }).join('\n');
    renderSession();
    log('Đã chạy kiểm tra hệ thống');
  };

  // ---------- Form Tạo/Sửa ----------
  function buildForm(pay) {
    var box = panel.querySelector('#vlss-form');
    var accounts = lsGet('vlss_accounts', []);
    var accOpts = accounts.map(function (a, i) {
      return '<option value="' + i + '">' + a.label + ' (...' + String(a.id).slice(-6) + ')</option>';
    }).join('');
    var misc = (pay.mats && pay.mats.misc) || {};
    var miscRows = Object.keys(misc).map(function (k) {
      var name = MISC_LABELS[k] ? MISC_LABELS[k] + ' [' + k + ']' : k;
      return lbl(name) + '<input data-misc="' + k + '" type="number" value="' + misc[k] + '" style="width:100%;padding:4px;margin:2px 0 6px;box-sizing:border-box">';
    }).join('');
    var fdl = findFdl3(pay);
    box.innerHTML =
      lbl('Tên nhân vật') + inp('name', pay.name || '', 'text') +
      lbl('ID tài khoản') + inp('netOwner', pay.netOwner || '', 'text') +
      '<div style="display:flex;gap:6px;margin:-2px 0 8px">' +
      '<select id="vlss-acc" style="flex:1;padding:4px"><option value="">— Sổ tài khoản —</option>' + accOpts + '</select>' +
      '<button id="vlss-acc-save" style="padding:4px 8px;background:#444;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:11px">Lưu ID này</button></div>' +
      '<div style="display:flex;gap:6px;align-items:center;margin:-2px 0 8px"><div id="vlss-autoid" style="flex:1;font-size:12px;color:#9ccc65"></div>' +
      '<button id="vlss-autoid-btn" style="padding:4px 8px;background:#2e7d32;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:11px">Tự lấy ID acc</button></div>' +
      lbl('UID nhân vật (tự sinh sẵn, bấm nút để đổi)') +
      '<div style="display:flex;gap:6px">' + inp('uid', pay.uid || 0) +
      '<button id="vlss-rand" style="padding:4px 10px;background:#444;color:#fff;border:0;border-radius:4px;cursor:pointer;margin:2px 0 6px">Ngẫu nhiên</button></div>' +
      lbl('Cấp độ (1-200)') + inp('lvl', pay.lvl || 1) +
      lbl('% XP trong cấp') + '<input id="vlss-xppct" type="number" step="0.01" value="' + xpPctOf(pay) + '" style="width:100%;padding:4px;margin:2px 0 6px;box-sizing:border-box">' +
      lbl('Điểm tiềm năng chưa cộng') + inp('attrpts', pay.attrPts || 0) +
      lbl('Điểm kỹ năng chưa cộng') + inp('skpts', pay.skPts || 0) +
      '<div style="margin:4px 0 2px;color:#bbb">Nguyên liệu:</div>' + miscRows +
      lbl('Phúc Duyên Lộ (Đại)' + (fdl ? '' : ' — nền này không có')) +
      '<input id="vlss-fdl3" type="number" value="' + (fdl ? fdl.ktc.c : 0) + '"' + (fdl ? '' : ' disabled') + ' style="width:100%;padding:4px;margin:2px 0 6px;box-sizing:border-box">' +
      lbl('Vàng') + inp('gold', pay.gold || 0) +
      lbl('KNB') + inp('knb', pay.knb || 0) +
      '<div style="display:flex;gap:6px;margin:4px 0 2px">' +
      '<button class="vlss-preset" data-p="full" style="flex:1;padding:6px;background:#4a3f1d;color:#ffd54f;border:1px solid #6b5c24;border-radius:6px;cursor:pointer;font-size:12px">Preset: Full 9999</button>' +
      '<button class="vlss-preset" data-p="mid" style="flex:1;padding:6px;background:#37474f;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:12px">Preset: Vừa phải</button>' +
      '<button class="vlss-preset" data-p="save" style="flex:1;padding:6px;background:#37474f;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:12px">Lưu preset</button>' +
      '<button class="vlss-preset" data-p="load" style="flex:1;padding:6px;background:#37474f;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:12px">Áp preset đã lưu</button></div>';

    panel.querySelector('#vlss-rand').onclick = freshUid;
    panel.querySelector('#vlss-acc').onchange = function () {
      if (this.value === '') return;
      var a = lsGet('vlss_accounts', [])[parseInt(this.value, 10)];
      if (a) { panel.querySelector('#vlss-netOwner').value = a.id; renderChecklist(); }
    };
    var aib = panel.querySelector('#vlss-autoid-btn');
    if (aib) aib.onclick = function () {
      var r = refreshAutoId();
      status(r ? 'Đã lấy ID acc: ...' + r.id.slice(-6) + ' (từ ' + r.src + ')' : 'Không lấy được ID acc nào — kiểm tra đã đăng nhập chưa.');
    };
    panel.querySelector('#vlss-acc-save').onclick = function () {
      var id = panel.querySelector('#vlss-netOwner').value.trim();
      if (!id) { status('Chưa có ID tài khoản để lưu.'); return; }
      var label = prompt('Đặt nhãn cho tài khoản này (vd: BiPro2):', panel.querySelector('#vlss-name').value || '');
      if (!label) return;
      var arr = lsGet('vlss_accounts', []);
      arr = arr.filter(function (a) { return a.id !== id; });
      arr.push({ label: label, id: id });
      lsSet('vlss_accounts', arr);
      status('Đã lưu vào sổ tài khoản: ' + label);
      if (basePay) buildForm(basePay);
    };
    refreshAutoId();
    panel.querySelector('#vlss-netOwner').onchange = renderChecklist;
    panel.querySelectorAll('.vlss-preset').forEach(function (b) {
      b.onclick = function () { applyPreset(b.getAttribute('data-p')); };
    });
    renderChecklist();
  }

  // (định nghĩa refreshAutoId ở phía dưới, cạnh readEdits)
  function freshUid() {
    panel.querySelector('#vlss-uid').value = 100000 + Math.floor(Math.random() * 900000);
  }

  function setMiscRow(k, v) {
    var row = panel.querySelector('[data-misc="' + k + '"]');
    if (row) row.value = v;
  }
  function applyPreset(kind) {
    if (kind === 'full' || kind === 'mid') {
      var v = kind === 'full' ? { rngua: 9999, ldt: 9999, fdl3: 9999 } : { rngua: 500, ldt: 500, fdl3: 100 };
      setMiscRow('rngua', v.rngua);
      setMiscRow('ldt', v.ldt);
      var f = panel.querySelector('#vlss-fdl3');
      if (f && !f.disabled) f.value = v.fdl3;
      status('Đã áp preset ' + (kind === 'full' ? 'Full 9999' : 'Vừa phải') + ' (chưa nạp — kiểm tra rồi bấm NẠP LUÔN).');
    } else if (kind === 'save') {
      lsSet('vlss_preset', readEdits());
      status('Đã lưu preset hiện tại trong form.');
    } else if (kind === 'load') {
      var p = lsGet('vlss_preset', null);
      if (!p) { status('Chưa có preset nào được lưu.'); return; }
      if (p.misc) Object.keys(p.misc).forEach(function (k) { setMiscRow(k, p.misc[k]); });
      var f2 = panel.querySelector('#vlss-fdl3');
      if (f2 && !f2.disabled && p.fdl3 != null) f2.value = p.fdl3;
      if (p.gold != null) panel.querySelector('#vlss-gold').value = p.gold;
      if (p.knb != null) panel.querySelector('#vlss-knb').value = p.knb;
      status('Đã áp preset đã lưu (chưa nạp).');
    }
  }

  function refreshAutoId() {
    var r = resolveAccountId();
    var box = panel.querySelector('#vlss-autoid');
    var f = panel.querySelector('#vlss-netOwner');
    if (r) {
      if (f) f.value = r.id;
      if (box) box.textContent = 'Đã tự lấy ID acc từ ' + r.src + ': ...' + r.id.slice(-6);
    } else if (box) {
      box.textContent = 'Chưa lấy được ID acc — hãy đăng nhập ở URL chính trước, quay lại bấm "Tự lấy ID acc".';
    }
    renderChecklist();
    return r;
  }

  function readEdits() {
    function num(sel) {
      var n = parseInt(panel.querySelector(sel).value, 10);
      return isNaN(n) ? 0 : n;
    }
    var misc = {};
    panel.querySelectorAll('[data-misc]').forEach(function (row) {
      var v = parseInt(row.value, 10);
      misc[row.getAttribute('data-misc')] = isNaN(v) ? 0 : v;
    });
    var f = panel.querySelector('#vlss-fdl3');
    var lvlEl = panel.querySelector('#vlss-lvl');
    var lvl = lvlEl ? Math.max(1, Math.min(200, num('#vlss-lvl') || 1)) : null;
    var pctEl = panel.querySelector('#vlss-xppct');
    var pct = pctEl ? parseFloat(pctEl.value) : 0;
    if (isNaN(pct)) pct = 0;
    return {
      name: panel.querySelector('#vlss-name').value.trim(),
      netOwner: panel.querySelector('#vlss-netOwner').value.trim(),
      uid: num('#vlss-uid'),
      gold: num('#vlss-gold'),
      knb: num('#vlss-knb'),
      lvl: lvl, xp: lvl != null ? xpFromPct(lvl, pct) : null,
      attrPts: panel.querySelector('#vlss-attrpts') ? num('#vlss-attrpts') : null,
      skPts: panel.querySelector('#vlss-skpts') ? num('#vlss-skpts') : null,
      fdl3: f && !f.disabled ? num('#vlss-fdl3') : null,
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
    var v = panel.querySelector('#vlss-target').value;
    return v === 'cur' ? currentSlotIdx() : parseInt(v, 10);
  }

  function renderChecklist() {
    var box = panel.querySelector('#vlss-check');
    if (!box) return;
    var items = [];
    var off = isOfflinePage();
    items.push([off, off ? 'Trang: bản OFFLINE — nạp được' : 'Trang: URL CHÍNH — nạp save phải ở bản offline (?offline_test=1)']);
    var lu = lastUser();
    var ownerEl = panel.querySelector('#vlss-netOwner');
    var owner = ownerEl ? ownerEl.value.trim() : '';
    if (!lu) items.push([null, 'Tài khoản: không đọc được acc đang đăng nhập']);
    else if (owner && owner !== lu) items.push([false, 'Tài khoản: ID trong form (...' + owner.slice(-6) + ') KHÁC acc đang đăng nhập (...' + lu.slice(-6) + ')']);
    else items.push([true, 'Tài khoản: khớp acc đang đăng nhập (...' + lu.slice(-6) + (_idInfo ? ', từ ' + _idInfo.src : '') + ')']);
    var ts = targetSlot();
    var cur = localStorage.getItem(slotKeyOf(ts));
    items.push([null, 'Slot đích: Slot ' + (ts + 1) + (cur ? ' — đang có nhân vật ' + safeName(cur) : ' — đang trống') + (cur ? ' (sẽ backup trước khi ghi)' : '')]);
    box.textContent = items.map(function (i) {
      return (i[0] === true ? '● OK  ' : i[0] === false ? '● LỖI  ' : '● --  ') + i[1];
    }).join('\n');
  }

  function safeName(envText) {
    try { return parseSaveText(envText).pay.name || '?'; } catch (e) { return '?'; }
  }

  function loadBase(kind) {
    baseKind = kind;
    try {
      if (kind === 'tpl-kunlun') basePay = parseSaveText(TPL_KUNLUN).pay;
      else if (kind === 'tpl-vo4') basePay = parseSaveText(TPL_VO4).pay;
      else if (kind === 'cur') {
        var raw = localStorage.getItem(slotKeyOf(currentSlotIdx()));
        if (!raw) throw new Error('Slot đang chọn trống, không có save làm nền.');
        basePay = parseSaveText(raw).pay;
      }
      if (basePay) {
        var lu = lastUser();
        if (lu) basePay.netOwner = lu;
        else if (kind !== 'cur') basePay.netOwner = '';
        buildForm(basePay);
        if (kind !== 'cur') freshUid();
        var nm = panel.querySelector('#vlss-name');
        if (nm) { nm.focus(); nm.select(); }
        status('Đã nạp nền: ' + (kind === 'cur' ? 'save hiện tại' : 'template') + ' — ' + basePay.name + ' cấp ' + basePay.lvl + '.');
      }
    } catch (e) {
      status('Lỗi nền: ' + (e.message || e));
    }
  }

  panel.querySelector('#vlss-base').onchange = function () {
    var fi = panel.querySelector('#vlss-file');
    fi.style.display = this.value === 'file' ? 'block' : 'none';
    if (this.value !== 'file') loadBase(this.value);
  };
  panel.querySelector('#vlss-file').onchange = function () {
    var f = this.files && this.files[0];
    if (!f) return;
    f.text().then(function (t) {
      try {
        baseKind = 'file';
        basePay = parseSaveText(t).pay;
        var lu = lastUser();
        if (lu) basePay.netOwner = lu;
        else basePay.netOwner = '';
        buildForm(basePay);
        freshUid();
        status('Đã đọc file nền: ' + f.name);
      } catch (e) { status('Lỗi file: ' + (e.message || e)); }
    });
  };
  panel.querySelector('#vlss-target').onchange = renderChecklist;

  var pendingApply = null;
  function hideConfirm() {
    var b = panel.querySelector('#vlss-confirm');
    if (b) { b.style.display = 'none'; b.innerHTML = ''; }
    pendingApply = null;
  }
  function showConfirm(r, ts) {
    var box = panel.querySelector('#vlss-confirm');
    var curRaw = localStorage.getItem(slotKeyOf(ts));
    var cur = null;
    if (curRaw) { try { cur = parseSaveText(curRaw).pay; } catch (e) {} }
    function dl(label, a, b) { return label + ': ' + (a == null || a === undefined ? '(trống)' : a) + ' -> ' + b; }
    function miscOf(p, k) { return p && p.mats && p.mats.misc ? p.mats.misc[k] : null; }
    var fdl = findFdl3(r.pay);
    var lines = [
      'NẠP VÀO SLOT ' + (ts + 1) + ' — xem kỹ rồi xác nhận:',
      dl('Tên', cur && cur.name, r.pay.name),
      dl('Cấp', cur && cur.lvl, r.pay.lvl),
      dl('Rương Ngựa', miscOf(cur, 'rngua'), (r.pay.mats.misc.rngua || 0)),
      dl('Lệnh Bài', miscOf(cur, 'ldt'), (r.pay.mats.misc.ldt || 0)),
      dl('Vàng', cur && cur.gold, r.pay.gold),
      dl('KNB', cur && cur.knb, r.pay.knb),
      'Tài khoản đích: ...' + String(r.pay.netOwner).slice(-6)
    ];
    if (fdl) lines.push('Phúc Duyên Lộ (Đại): ' + fdl.ktc.c);
    if (r.notes.length) lines.push(r.notes.join(' '));
    box.innerHTML = '<div style="white-space:pre-wrap">' + lines.join('\n') + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:7px">' +
      '<button id="vlss-confirm-yes" style="flex:1;padding:8px;background:#2e7d32;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:700">Xác nhận nạp</button>' +
      '<button id="vlss-confirm-no" style="padding:8px 12px;background:#555;color:#fff;border:0;border-radius:6px;cursor:pointer">Hủy</button></div>';
    box.style.display = 'block';
    panel.querySelector('#vlss-confirm-yes').onclick = doApply;
    panel.querySelector('#vlss-confirm-no').onclick = hideConfirm;
  }
  function doApply() {
    if (!pendingApply) return;
    var r = pendingApply.r, ts = pendingApply.ts;
    pendingApply = null;
    hideConfirm();
    if (!writeSave(ts, r.envStr, 'Nạp ' + r.pay.name + ' cấp ' + r.pay.lvl, { name: r.pay.name, lvl: r.pay.lvl, netOwner: r.pay.netOwner })) {
      status('GHI THẤT BẠI: đọc lại không khớp — mở tab Kiểm tra, mục thử ghi sẽ cho biết có gì đang chặn.');
      return;
    }
    alert('ĐÃ GHI XONG: ' + r.pay.name + ' cấp ' + r.pay.lvl + ' vào slot ' + (ts + 1) + '.\nTrang tải lại ở bản offline — tool tự kiểm chứng và báo lại; sau đó mở URL chính, tool kiểm chứng nốt bước đồng bộ.');
    location.reload();
  }
  panel.querySelector('#vlss-apply').onclick = function () {
    try {
      hideConfirm();
      if (!isOfflinePage()) { status('Đang ở URL chính — hãy mở bản offline (?offline_test=1) rồi nạp.'); return; }
      var r = buildFinal();
      var ts = targetSlot();
      var sess = resolveAccountId();
      var override = panel.querySelector('#vlss-override').checked;
      if (!sess) {
        if (!override) { status('CHẶN: chưa xác định được acc đang đăng nhập nên không chứng minh được save sẽ thuộc về ai. Đăng nhập ở URL chính trước — hoặc tích ô "Vẫn nạp..." nếu bạn chắc chắn.'); return; }
      } else if (String(r.pay.netOwner) !== sess.id && !override) {
        status('CHẶN: ID đích (...' + String(r.pay.netOwner).slice(-6) + ') KHÁC acc đang đăng nhập (...' + sess.id.slice(-6) + ', từ ' + sess.src + '). Đây chính là lỗi làm các lần nạp sáng nay bị game gạt. Sửa ID cho khớp — hoặc tích ô "Vẫn nạp..." nếu cố ý nạp chéo.');
        return;
      }
      pendingApply = { r: r, ts: ts };
      showConfirm(r, ts);
    } catch (e) { status('Lỗi: ' + (e.message || e)); }
  };

  panel.querySelector('#vlss-dl').onclick = function () {
    try {
      var r = buildFinal();
      var outer = JSON.stringify({ game: 'jxidle', v: 1, exported: Date.now(), fac: r.pay.fac, lvl: r.pay.lvl, data: r.envStr });
      var blob = new Blob([outer], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'jxidle_' + String(r.pay.name).replace(/[^a-zA-Z0-9_]/g, '_') + '_studio.jxsave';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      log('Xuất file cho ' + r.pay.name + ' cấp ' + r.pay.lvl);
      status('Đã xuất file .jxsave.' + (r.notes.length ? '\n' + r.notes.join('\n') : ''));
    } catch (e) { status('Lỗi: ' + (e.message || e)); }
  };

  // ---------- Tab Slots ----------
  function renderSlots() {
    var box = panel.querySelector('#vlss-slots');
    if (!box) return;
    var html = '';
    for (var i = 0; i < 3; i++) {
      var key = slotKeyOf(i);
      var raw = localStorage.getItem(key);
      var bak = localStorage.getItem(key + '_bak');
      var info = '(trống)';
      if (raw) {
        try {
          var p = parseSaveText(raw).pay;
          info = '<b>' + p.name + '</b> — cấp ' + p.lvl + ' | Rương Ngựa: ' + ((p.mats && p.mats.misc && p.mats.misc.rngua) || 0);
        } catch (e) { info = '(save không đọc được)'; }
      }
      html += '<div style="background:#10101c;border:1px solid #2c2c44;border-radius:6px;padding:7px 9px;margin-bottom:6px">' +
        'Slot ' + (i + 1) + ' (' + key + '): ' + info +
        (bak ? '<br><button data-restore="' + i + '" style="margin-top:5px;padding:4px 9px;background:#6d4c00;color:#ffd54f;border:0;border-radius:4px;cursor:pointer;font-size:12px">Khôi phục bản backup</button>' : '') +
        '</div>';
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-restore]').forEach(function (b) {
      b.onclick = function () {
        var i = parseInt(b.getAttribute('data-restore'), 10);
        var key = slotKeyOf(i);
        var bak = localStorage.getItem(key + '_bak');
        if (!bak) return;
        if (!isOfflinePage()) { alert('Khôi phục nên làm ở bản offline (?offline_test=1).'); return; }
        if (!confirm('Khôi phục backup vào Slot ' + (i + 1) + '? Save hiện tại ở slot này cũng sẽ được backup tiếp.')) return;
        var meta = null;
        try { var bp = parseSaveText(bak).pay; meta = { name: bp.name, lvl: bp.lvl, netOwner: bp.netOwner }; } catch (e) {}
        if (writeSave(i, bak, 'Khôi phục backup', meta)) {
          alert('Đã khôi phục. Trang sẽ tải lại.');
          location.reload();
        } else {
          alert('Ghi thất bại — tắt Save Guard rồi thử lại.');
        }
      };
    });
  }
  panel.querySelector('#vlss-slots-refresh').onclick = renderSlots;

  // ---------- Tab Nhật ký ----------
  function renderLog() {
    var box = panel.querySelector('#vlss-log');
    if (!box) return;
    var arr = lsGet('vlss_log', []);
    box.textContent = arr.length ? arr.join('\n') : '(chưa có thao tác nào)';
  }
  panel.querySelector('#vlss-log-clear').onclick = function () {
    lsSet('vlss_log', []);
    renderLog();
  };

  // ---------- Tab Mở rương (kế thừa v4: đếm bằng save thật) ----------
  var chest = { chay: false, mo: 0, nutGoc: null };
  function xemRuongNow() {
    return rnguaOf(localStorage.getItem(slotKeyOf(currentSlotIdx())) || '');
  }
  function renderChestInfo() {
    var box = panel.querySelector('#vlss-chest-info');
    if (!box) return;
    var n = xemRuongNow();
    box.textContent = 'Rương Ngựa trong save hiện tại: ' + (n >= 0 ? n : 'không đọc được (hãy vào hẳn trong game, chọn nhân vật trước)');
  }
  function chestNut() {
    var b = document.querySelector('#miUse10:not([disabled])') ||
            document.querySelector('#ktcRngua10:not([disabled])');
    if (b) return { el: b, buoc: 10 };
    b = document.querySelector('#mBody [data-ktcuse="rngua"]:not([disabled])');
    if (b) return { el: b, buoc: 1 };
    if (chest.nutGoc) return { el: chest.nutGoc, buoc: 10 };
    return null;
  }
  function chestStop(msg) {
    chest.chay = false;
    var n = xemRuongNow();
    chestStatus(msg + '\nĐã mở THẬT: ' + chest.mo + ' rương' + (n >= 0 ? ', còn ' + n + ' rương' : ''));
    log('Mở rương: ' + msg + ' — đã mở ' + chest.mo);
    renderChestInfo();
  }
  function chestRun(target) {
    var c0 = xemRuongNow();
    if (c0 < 0) { chestStatus('Không đọc được save — vào hẳn trong game (đã chọn nhân vật) rồi thử lại.'); return; }
    var nut = chestNut();
    if (!nut) { chestStatus('Chưa thấy nút mở rương — mở Hành trang -> bấm vào Rương Ngựa (thấy nút "Dùng ×10"), để nguyên popup rồi bấm lại.'); return; }
    chest.nutGoc = nut.el;
    chest.chay = true;
    chest.mo = 0;
    var mucTieu = Math.min(target, c0);
    var thatBai = 0;
    chestStatus('Đang mở ' + mucTieu + ' rương (chế độ x' + nut.buoc + '), đếm bằng save thật...');
    log('Bắt đầu mở rương: mục tiêu ' + mucTieu);
    function buocTiep() {
      if (!chest.chay) return;
      if (chest.mo >= mucTieu) { chestStop('Hoàn tất!'); return; }
      var truoc = xemRuongNow();
      if (truoc <= 0) { chestStop('Đã mở hết rương!'); return; }
      var n = chestNut();
      if (!n) { chestStop('Mất nút bấm giữa chừng — dừng.'); return; }
      n.el.click();
      var cho = 0;
      var timer = setInterval(function () {
        if (!chest.chay) { clearInterval(timer); return; }
        var sau = xemRuongNow();
        var giam = truoc - sau;
        if (giam > 0) {
          clearInterval(timer);
          chest.mo += giam;
          thatBai = 0;
          chestStatus('Đã mở ' + chest.mo + '/' + mucTieu + ' (còn ' + sau + ' rương)');
          buocTiep();
        } else if (++cho >= 30) {
          clearInterval(timer);
          if (++thatBai >= 2) {
            chestStop('Bấm 2 lần liên tiếp mà số rương trong save không giảm — TÚI ĐẦY hoặc popup đã đóng. Dọn túi, mở lại popup rồi chạy tiếp.');
          } else {
            buocTiep();
          }
        }
      }, 100);
    }
    buocTiep();
  }
  panel.querySelector('#vlss-chest-go').onclick = function () {
    if (isOfflinePage()) { chestStatus('Mở rương là thao tác trong game — hãy chạy ở URL chính https://volamidle.pages.dev/'); return; }
    if (chest.chay) { chestStatus('Đang chạy rồi!'); return; }
    var v = parseInt(panel.querySelector('#vlss-chest-n').value, 10);
    chestRun(isNaN(v) || v <= 0 ? 9999 : v);
  };
  panel.querySelector('#vlss-chest-stop').onclick = function () {
    if (chest.chay) chestStop('Đã dừng theo lệnh.');
  };
  // Giữ thói quen cũ: gõ moRuong()/xemRuong()/dungMoRuong() trong Console vẫn chạy.
  window.xemRuong = xemRuongNow;
  window.moRuong = function (n) { chestRun(n || 9999); };
  window.dungMoRuong = function () { if (chest.chay) chestStop('Đã dừng theo lệnh.'); };

  renderSession();
  if (verifyPending()) panel.style.display = 'block';
  loadBase('tpl-kunlun');
  console.log('[VL Save Studio Pro] Sẵn sàng — bấm nút "VL Studio" ở góc dưới phải.');
})();
