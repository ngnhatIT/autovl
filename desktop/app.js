'use strict';
/* VL Save Studio Desktop 2.0.0 — bản rút gọn: chỉ tạo nhân vật Vô Môn cấp 49 · XP 99,99% · 10 tỷ vàng (trơn) + mua KNB.
   Chốt an toàn giữ nguyên chạy ngầm: ID lấy từ token phiên, backup trước khi ghi đè, kiểm chứng sau nạp 2 giai đoạn. */

// ---------- Core save ----------
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
function finalize(pay) {
  var now = Date.now();
  pay.cloudAt = now;
  pay.last = now;
  var d = JSON.stringify(pay);
  return JSON.stringify({ f: 2, d: d, h: gameHash(d) });
}
var SLOT_KEYS = ['jxidle', 'jxidle_2', 'jxidle_3'];

// ---------- Nhân vật cố định: Vô Môn trơn cấp 49 (khung template Vô Môn reset về mẫu factory D6 của game) ----------
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
// XP trong cấp 49 ở mức 99,99%: lên cấp 50 cần 613.800 XP -> để 613.738 (đúng số các template cấp 49 đang dùng)
function buildFixedChar() {
  var pay = buildCleanChar(49);
  pay.xp = 613738;
  pay.gold = 10000000000;
  return pay;
}

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
    return p ? { name: p.name, lvl: p.lvl, netOwner: p.netOwner }
             : { broken: true };
  });
  return {
    href: location.href,
    offline: location.search.indexOf('offline_test=1') >= 0,
    session: sess,
    slotIdx: slotIdx,
    slots: slots
  };
}
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
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

var pageState = null;
var pending = lsGet('vls_pending', null);
var pendingReported = '';

var refreshing = false;
async function refreshState() {
  if (refreshing) return;
  refreshing = true;
  try {
    try { pageState = await exec(pageReadState); } catch (e) { pageState = null; }
    renderSession();
    renderChecklist();
    renderKnbInfo();
    verifyPending();
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
  if (cur && !cur.broken) el.textContent += ' | ' + cur.name + ' cấp ' + cur.lvl;
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
  } else if (match && !pageState.offline) {
    var nm = pending.name, lv = pending.lvl;
    pending = null; lsSet('vls_pending', null); pendingReported = '';
    status('Kiểm chứng HOÀN TẤT: "' + nm + '" cấp ' + lv + ' vẫn giữ nguyên sau khi qua URL chính — nạp thành công trọn vẹn.');
    log('Kiểm chứng URL chính OK — nạp hoàn tất: ' + nm + ' cấp ' + lv);
  } else if (!match && slot !== undefined) {
    var found = !slot ? 'slot trống' : slot.broken ? 'save không đọc được' : '"' + slot.name + '" cấp ' + slot.lvl + ', chủ ...' + String(slot.netOwner || '?').slice(-6);
    var nm2 = pending.name, lv2 = pending.lvl;
    pending = null; lsSet('vls_pending', null); pendingReported = '';
    status('Kiểm chứng THẤT BẠI: save vừa nạp ("' + nm2 + '" cấp ' + lv2 + ') không còn ở slot đích — hiện tại là ' + found + '. Kiểm tra lại acc đang đăng nhập và slot đích.');
    log('Kiểm chứng THẤT BẠI cho ' + nm2 + ' — hiện tại: ' + found);
  }
}

// ---------- Tạo nhân vật + nạp ----------
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
  if (!pageState.session) items.push([false, 'Tài khoản: chưa đăng nhập trong khung game']);
  else items.push([true, 'Tài khoản: ...' + pageState.session.id.slice(-6) + (String(pageState.session.src).indexOf('lastuser') >= 0 ? ' (ID lấy từ lastuser — có thể là ID cũ, cân nhắc!)' : '')]);
  var name = $('c-name').value.trim();
  items.push([!!name, name ? 'Tên nhân vật: ' + name : 'Tên nhân vật: chưa nhập']);
  var ts = targetSlot();
  var cur = pageState.slots[ts];
  items.push([null, 'Slot đích: Slot ' + (ts + 1) + (cur && !cur.broken ? ' — đang có ' + cur.name + ' cấp ' + cur.lvl + ' (tool tự backup trước khi ghi đè)' : ' — đang trống')]);
  box.textContent = items.map(function (i) { return (i[0] === true ? '● OK  ' : i[0] === false ? '● LỖI  ' : '● --  ') + i[1]; }).join('\n');
}
function buildFinal() {
  var name = $('c-name').value.trim();
  if (!name) throw new Error('Chưa nhập tên nhân vật.');
  if (!pageState || !pageState.session) throw new Error('Chưa đăng nhập tài khoản trong khung game.');
  var pay = buildFixedChar();
  pay.name = name;
  pay.netOwner = pageState.session.id;
  pay.uid = 100000 + Math.floor(Math.random() * 900000);
  return { envStr: finalize(pay), pay: pay };
}
var pendingApply = null;
function hideConfirm() { var b = $('confirm'); b.style.display = 'none'; b.innerHTML = ''; pendingApply = null; }
function showConfirm(r, ts) {
  var box = $('confirm');
  var cur = pageState ? pageState.slots[ts] : null;
  var lines = [
    'NẠP VÀO SLOT ' + (ts + 1) + ' — xem kỹ rồi xác nhận:',
    'Tên: ' + (cur && cur.name ? cur.name : '(trống)') + ' -> ' + r.pay.name,
    'Nhân vật mới: Vô Môn · cấp 49 · XP 99,99% · Vàng 10.000.000.000',
    'Tiềm năng 240 · Kỹ năng 49 (chưa cộng) · không item · KNB 0',
    'Tài khoản đích: ...' + String(r.pay.netOwner).slice(-6)
  ];
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
    if (pageState.session && String(pageState.session.src).indexOf('lastuser') >= 0) {
      status('CHẶN: ID acc chỉ lấy được từ lastuser (không thấy token phiên) — không chắc chắn đây là acc đang đăng nhập thật. Hãy đăng nhập lại trong khung game cho token được tạo, rồi thử lại.');
      return;
    }
    var r = buildFinal();
    pendingApply = { r: r, ts: targetSlot() };
    showConfirm(r, pendingApply.ts);
  } catch (e) { status('Lỗi: ' + (e.message || e)); }
};
$('c-name').oninput = renderChecklist;
$('target').onchange = renderChecklist;

// ---------- Mua KNB (tự bấm ×100 ở Kỳ Trân Các, đếm bằng KNB thật) ----------
var knbBuy = { chay: false, clicks: 0, gained: 0 };
function renderKnbInfo() {
  var el = $('knb-info');
  if (!el) return;
  exec(pageKnb).then(function (n) {
    el.textContent = 'KNB hiện có: ' + (n >= 0 ? n : 'không đọc được (hãy vào hẳn trong game trước)');
    exec(pageKnbToday).then(function (t) {
      if (t >= 0) el.textContent += '\nĐã đổi hôm nay: ' + t + ' / 10.000 (đọc từ cửa hàng đang mở)';
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

// ---------- Điều hướng ----------
$('nav-main').onclick = function () { wv.loadURL('https://volamidle.pages.dev/'); };
$('nav-off').onclick = function () { wv.loadURL('https://volamidle.pages.dev/?offline_test=1'); };
$('nav-reload').onclick = function () { wv.reload(); };
wv.addEventListener('did-finish-load', function () { refreshState(); });
wv.addEventListener('did-navigate', function (e) { $('url').textContent = e.url; });
setInterval(refreshState, 6000);

// ---------- Boot ----------
refreshState();
console.log('[VL Save Studio Desktop 2.0.0] sẵn sàng');
