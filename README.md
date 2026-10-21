# autovl — Bộ tool Võ Lâm Idle

Toàn bộ code tool hỗ trợ game Võ Lâm Idle (volamidle.pages.dev):

## desktop/ — VL Save Studio Desktop (Electron)
App desktop có trình duyệt game tích hợp: đăng nhập trong app, panel bên cạnh lo tạo/sửa/nạp save, mở rương, kiểm tra — port đầy đủ từ Save Studio Pro v3.0 (chốt chặn sai tài khoản, xem trước diff, tự kiểm chứng sau nạp).
Chạy: `cd desktop && npm install && npm start` — Build .exe Windows: `npm run dist`. Chi tiết: [desktop/README.md](desktop/README.md).

## save-studio/ — Bản chạy trong trình duyệt
- `vl_save_studio_pro_console.js` — dán vào DevTools Console ở trang `?offline_test=1` (bản chính, không cần extension).
- `vl_save_studio_pro.user.js` — bản Tampermonkey (cài 1 lần, nút nổi trong game).
- `vl_save_studio_pro_skeleton.user.js` — skeleton nguồn để build 2 bản trên (template được inject lúc build).
- `vl_nap_save_1click.js` — tool nạp save 1-click từ file .jxsave (console).
- `auto_mo_ruong_ngua.js` — tool tự mở Rương Ngựa v4 (đếm bằng save thật).

## Lưu ý
- Repo này PUBLIC: các template save nhúng trong code đã được **gỡ ID tài khoản** (netOwner để trống) — khi chạy, tool luôn tự điền ID của tài khoản đang đăng nhập nên không ảnh hưởng chức năng. Đừng commit file .jxsave hay template còn chứa ID tài khoản thật lên đây.
- Điểm Phúc Duyên/Bánh là tiền do server quản lý — không tool nào ở đây sửa được bằng file save.
