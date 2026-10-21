// ============================================================
//  AUTO MỞ RƯƠNG NGỰA v4 (đếm bằng SAVE THẬT) - Võ Lâm Idle
//  Các bản trước hỏng vì: (1) nút x10 #ktcRngua10 trong Kỳ Trân
//  Các KHÔNG tồn tại ngoài đời (chỉ có trong code, dev bỏ dở);
//  nút x10 thật là "Dùng ×10" (#miUse10) ở popup vật phẩm trong
//  Hành trang. (2) đếm bằng số hiển thị trên nút bấm -> nút vẽ
//  lại chậm, số đứng yên giả -> đếm ảo/dừng oan.
//  v4 đếm bằng save thật trong localStorage (game lưu sau mỗi
//  lần mở): bấm xong số không giảm = cú bấm không ăn, tool biết
//  ngay và không đếm ảo.
//  Cách dùng:
//  1) Nếu bản cũ đang chạy: gõ dungMoRuong() để dừng trước
//  2) Mở Hành trang -> bấm vào Rương Ngựa -> thấy popup có nút
//     "Dùng ×10" (để nguyên popup đó, đừng đóng)
//  3) Mở Console (F12), dán toàn bộ file này vào, Enter
//  4) Gõ:  moRuong(9999)  -> mở hết
//          xemRuong()    -> xem số rương thật còn lại
//          dungMoRuong() -> dừng giữa chừng
//  Ngựa mở ra vào TÚI - túi đầy tool sẽ báo dừng, dọn rồi chạy tiếp.
// ============================================================
var __mr4 = { chay: false, mo: 0, nutGoc: null };
function dungMoRuong() {
  __mr4.chay = false;
  if (window.__mr3) __mr3.chay = false;
  if (window.__mr2) __mr2.chay = false;
  if (window.__moRuong) __moRuong.chay = false;
  console.log('🛑 Đã dừng. Đã mở THẬT: ' + __mr4.mo + ' rương');
}
function __mrSlotKey() {
  var s = parseInt(localStorage.getItem('jxidle_slot') || '0');
  return ['jxidle', 'jxidle_2', 'jxidle_3'][s] || 'jxidle';
}
function xemRuong() {
  try {
    var raw = localStorage.getItem(__mrSlotKey());
    if (!raw) return -1;
    var d = JSON.parse(JSON.parse(raw).d);
    var n = d.mats && d.mats.misc ? d.mats.misc.rngua : null;
    return typeof n === 'number' ? n : -1;
  } catch (e) { return -1; }
}
function __mrNut() {
  var b = document.querySelector('#miUse10:not([disabled])') ||
          document.querySelector('#ktcRngua10:not([disabled])');
  if (b) return { el: b, buoc: 10 };
  b = document.querySelector('#mBody [data-ktcuse="rngua"]:not([disabled])');
  if (b) return { el: b, buoc: 1 };
  if (__mr4.nutGoc) return { el: __mr4.nutGoc, buoc: 10 };
  return null;
}
function moRuong(soLuong) {
  soLuong = soLuong || 100;
  if (__mr4.chay) { console.log('⚠️ Đang chạy rồi!'); return; }
  if (window.__mr3) __mr3.chay = false;
  if (window.__mr2) __mr2.chay = false;
  if (window.__moRuong) __moRuong.chay = false;
  var c0 = xemRuong();
  if (c0 < 0) {
    console.log('❌ Không đọc được save — hãy vào hẳn trong game (đã chọn nhân vật) rồi thử lại!');
    return;
  }
  var nut = __mrNut();
  if (!nut) {
    console.log('❌ Chưa thấy nút mở rương — mở Hành trang → chọn Rương Ngựa (thấy nút "Dùng ×10") rồi chạy lại!');
    return;
  }
  __mr4.nutGoc = nut.el;
  __mr4.chay = true; __mr4.mo = 0;
  var mucTieu = Math.min(soLuong, c0);
  var thatBai = 0;
  console.log('▶️ v4 mở ' + mucTieu + ' rương (đang có ' + c0 + ', chế độ x' + nut.buoc + '). Đếm bằng save thật...');
  function xong(msg) {
    __mr4.chay = false;
    console.log(msg + ' Đã mở THẬT: ' + __mr4.mo + ' rương, còn ' + xemRuong() + ' rương');
  }
  function buocTiep() {
    if (!__mr4.chay) return;
    if (__mr4.mo >= mucTieu) { xong('✅ Hoàn tất!'); return; }
    var truoc = xemRuong();
    if (truoc <= 0) { xong('✅ Đã mở hết rương!'); return; }
    var n = __mrNut();
    if (!n) { xong('❌ Mất nút bấm, không dùng lại được nút cũ.'); return; }
    n.el.click();
    var cho = 0;
    var timer = setInterval(function () {
      if (!__mr4.chay) { clearInterval(timer); return; }
      var sau = xemRuong();
      var giam = truoc - sau;
      if (giam > 0) {
        clearInterval(timer);
        __mr4.mo += giam; thatBai = 0;
        if (__mr4.mo <= 30 || __mr4.mo % (n.buoc * 20) === 0 || __mr4.mo >= mucTieu)
          console.log('🐎 Đã mở ' + __mr4.mo + '/' + mucTieu + ' (còn ' + sau + ' rương)');
        buocTiep();
      } else if (++cho >= 30) {
        clearInterval(timer);
        if (++thatBai >= 2) {
          xong('⚠️ Bấm 2 lần liên tiếp mà số rương trong save không giảm — TÚI ĐẦY hoặc popup đã đóng/nút mất tác dụng. Dọn túi, mở lại popup Rương Ngựa rồi chạy tiếp!');
        } else {
          console.log('…cú bấm vừa rồi chưa ăn, thử lại…');
          buocTiep();
        }
      }
    }, 100);
  }
  buocTiep();
}
console.log('✅ Tool v4 sẵn sàng! Mở popup Rương Ngựa (nút "Dùng ×10") rồi gõ moRuong(9999). xemRuong() = số rương thật. Dừng: dungMoRuong()');
