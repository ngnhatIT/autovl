// ============================================================
// Võ Lâm Idle — TOOL NẠP SAVE 1-CLICK (chạy trên máy người chơi)
// ------------------------------------------------------------
// Cách dùng:
//   1. Đăng nhập ĐÚNG tài khoản đích trong game như bình thường.
//   2. Mở: https://volamidle.pages.dev/?offline_test=1
//   3. Bấm F12 -> tab Console -> dán toàn bộ file này -> Enter.
//   4. Chọn file .jxsave -> tool hiện thông tin để kiểm tra -> OK.
//   5. Trang tự tải lại ở bản offline: kiểm tra nhân vật đã đúng.
//   6. Mở https://volamidle.pages.dev/ để game tự đẩy lên cloud.
//
// Tool tự làm các việc mà nạp tay hay lỗi:
//   - Đọc + kiểm tra định dạng file trước khi nạp; luôn tính lại hash
//     mới theo đúng hàm của bản game hiện tại (file đời cũ hay lệch
//     hash gốc vẫn nạp được).
//   - Đối chiếu tài khoản trong file với tài khoản đang đăng nhập.
//   - Làm mới cloudAt/last + tính lại hash -> save local luôn thắng
//     khi đồng bộ, không bị cloud cũ kéo đè như các lần nạp hỏng.
//   - Bật cờ cho Save Guard (Tampermonkey) để không bị chặn ghi.
//   - Chặn game ghi đè save bằng state cũ trong RAM lúc tải lại trang.
//   - Backup save cũ của slot vào key <slot>_bak trước khi ghi.
// ============================================================
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

  var SAVE_KEYS = ['jxidle', 'jxidle_1', 'jxidle_2', 'jxidle_3'];

  function currentSlot() {
    var s = parseInt(localStorage.getItem('jxidle_slot') || '0', 10);
    if (isNaN(s) || s < 0 || s > 2) s = 0;
    return { slot: s, key: s === 0 ? 'jxidle' : 'jxidle_' + (s + 1) };
  }

  function charNameOf(envStr) {
    try {
      return JSON.parse(JSON.parse(envStr).d).name || '?';
    } catch (e) {
      return '?';
    }
  }

  function pickFile() {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.jxsave,.json,.txt';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        document.body.removeChild(inp);
        resolve(f || null);
      };
      inp.click();
    });
  }

  async function main() {
    if (location.hostname !== 'volamidle.pages.dev') {
      alert('Tool chỉ chạy trên trang game volamidle.pages.dev');
      return;
    }
    if (location.search.indexOf('offline_test=1') < 0) {
      alert('Hãy chạy tool ở bản OFFLINE:\nhttps://volamidle.pages.dev/?offline_test=1\n\n(Bản online chặn nạp save.)');
      return;
    }

    console.log('[NapSave] Chọn file .jxsave...');
    var file = await pickFile();
    if (!file) {
      console.log('[NapSave] Đã hủy chọn file.');
      return;
    }

    var text = (await file.text()).trim();
    var parsed = JSON.parse(text);
    // File .jxsave có lớp vỏ {game, exported, data:"<envelope>"}; cũng chấp nhận envelope thô.
    var env = typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed;
    if (env.f !== 2 || typeof env.d !== 'string' || typeof env.h !== 'string') {
      alert('File không đúng định dạng save Võ Lâm Idle. Dừng.');
      return;
    }
    // File đời cũ có thể mang hash tính bằng bản game trước — không dừng,
    // vì tool luôn tính lại hash mới theo đúng hàm hiện tại trước khi ghi.
    var hashGocLech = gameHash(env.d) !== env.h;

    var pay = JSON.parse(env.d);

    // Làm mới mốc đồng bộ để save local thắng cloud, tính lại hash.
    var now = Date.now();
    pay.cloudAt = now;
    pay.last = now;
    var d2 = JSON.stringify(pay);
    var envStr2 = JSON.stringify({ f: 2, d: d2, h: gameHash(d2) });

    var sk = currentSlot();
    var curRaw = localStorage.getItem(sk.key);
    var lastUser = localStorage.getItem('jxidle_lastuser') || '';

    var msg = 'NẠP SAVE VÀO SLOT ' + (sk.slot + 1) + '?\n\n' +
      'Nhân vật trong file: ' + pay.name + ' — cấp ' + pay.lvl + '\n' +
      'Nhân vật hiện tại ở slot này: ' + (curRaw ? charNameOf(curRaw) : '(trống)') + '\n' +
      'Tài khoản trong file: ...' + String(pay.netOwner || '?').slice(-6);
    if (hashGocLech) {
      msg += '\n\nLưu ý: hash gốc trong file không khớp nội dung (file đời cũ) — tool sẽ tính lại hash mới khi nạp, không ảnh hưởng.';
    }
    if (lastUser && pay.netOwner && lastUser !== pay.netOwner) {
      msg += '\n\n!! CẢNH BÁO: tài khoản đang đăng nhập (...' + lastUser.slice(-6) +
        ') KHÁC tài khoản trong file. Nạp vào có thể bị game xóa.\n' +
        'Bấm Cancel, đăng nhập đúng tài khoản rồi chạy lại tool.';
    } else if (!lastUser) {
      msg += '\n\nLưu ý: không đọc được tài khoản đang đăng nhập — hãy chắc chắn bạn đã đăng nhập đúng tài khoản ở trang này.';
    }
    if (!confirm(msg)) {
      console.log('[NapSave] Người dùng hủy.');
      return;
    }

    // Cho phép ghi qua Save Guard (Tampermonkey) nếu đang bật.
    window.__vlAllowSave = true;

    if (curRaw) {
      localStorage.setItem(sk.key + '_bak', curRaw);
      console.log('[NapSave] Đã backup save cũ vào ' + sk.key + '_bak');
    }
    localStorage.setItem(sk.key, envStr2);
    localStorage.setItem('jxidle_slot', String(sk.slot));

    if (localStorage.getItem(sk.key) !== envStr2) {
      alert('GHI THẤT BẠI: đọc lại không khớp (có thể Save Guard vẫn chặn).\nHãy tắt script Save Guard trong Tampermonkey rồi chạy lại tool.');
      return;
    }
    console.log('[NapSave] Đã ghi + verify OK vào ' + sk.key);

    // Chặn game ghi đè bằng state cũ trong RAM khi trang tải lại (pagehide).
    var origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (SAVE_KEYS.indexOf(k) >= 0) return;
      return origSet.call(this, k, v);
    };

    alert('ĐÃ NẠP XONG: ' + pay.name + ' cấp ' + pay.lvl + ' vào slot ' + (sk.slot + 1) + '.\n\n' +
      'Trang sẽ tải lại ở bản offline — kiểm tra nhân vật đã đúng chưa,\n' +
      'rồi mở https://volamidle.pages.dev/ để game đẩy save lên cloud.');
    location.reload();
  }

  main().catch(function (e) {
    console.error('[NapSave] Lỗi:', e);
    alert('Lỗi: ' + ((e && e.message) || e));
  });
})();
