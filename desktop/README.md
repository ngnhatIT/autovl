# VL Save Studio Desktop

App desktop (Electron) gói trọn VL Save Studio Pro v3.0: **trình duyệt game tích hợp ngay trong app** — đăng nhập một lần trong khung bên trái, panel bên phải lo toàn bộ việc tạo/sửa/nạp save, mở rương, kiểm tra. Không cần F12, không cần extension/Tampermonkey, không copy-paste code.

## Cách dùng

1. Mở app. Khung bên trái là trang game — **đăng nhập tài khoản của bạn ở đó** (app dùng profile riêng, sạch, không extension nào khác; đăng nhập được giữ lại cho lần mở sau).
2. Panel bên phải luôn hiện acc đang đăng nhập (đọc từ token phiên, không tin `jxidle_lastuser`).
3. Nạp save: bấm **"Bản offline (nạp save)"** trên thanh công cụ → chọn nền/template → sửa số liệu → **NẠP LUÔN**. Tool có chốt chặn cứng nếu ID khác acc đang đăng nhập, hiện bảng xem trước cũ → mới trước khi ghi, và **tự kiểm chứng sau khi nạp** (kiểm chứng nốt khi bạn bấm "Trang chính" để game đẩy lên cloud).
4. Mở rương / mua KNB: ở **Trang chính**, mở sẵn popup tương ứng trong game → sang tab **Tự động** → Bắt đầu. Tool đếm bằng save thật, bấm hụt là biết ngay. Test số nhỏ (50) trước.
5. Tab **Tổng quan**: xem 3 slot, xuất file .jxsave từng slot, và quản lý **bản lưu có tên** (tối đa 5 bản/slot, khôi phục về đúng slot). Tool tự tạo một bản lưu trước mỗi lần nạp ghi đè — chung một danh sách, không còn backup rời kiểu cũ.
6. Mục **Công cụ** (tab Tổng quan): **Kiểm tra tương thích** — tool tự đối chiếu với game đang chạy (phiên bản game, hàm băm + định dạng save verify trên save thật, bảng EXP tải trực tiếp từ game; game đổi bảng EXP thì tool tự dùng bảng mới và báo), tự chạy một lần khi mở app. **Xóa cache game** — gỡ service worker + cache của game để ép tải bản game mới nhất (save và đăng nhập không bị đụng). **Xuất nhật ký** — tải file .txt gồm trạng thái phiên/slot/tương thích + lịch sử thao tác, dùng khi cần soi lỗi từ xa.

## Chạy từ mã nguồn (máy dev)

```
npm install
npm start
```

## Build bản .exe cho Windows

Trên máy Windows (Node 20+):

```
npm install
npm run dist
```

Ra file `release/VL-Save-Studio-1.0.0.exe` (bản portable, chạy luôn không cần cài). Muốn bản cài đặt (NSIS): `npm run dist-installer`.

## Lưu ý quan trọng

- App này chạy **trên máy của bạn** — tuyệt đối không đăng nhập hộ, không chạy app từ máy/IP lạ với tài khoản xịn (tiền lệ: IP bị game đánh dấu ban sẽ làm acc bị wipe).
- Điểm Phúc Duyên / Bánh là tiền do server quản lý — app cố ý không có mục sửa, sửa file local cũng bị server ghi đè khi đồng bộ.
- App không tự tạo tài khoản game, không tự đăng nhập — bạn tự đăng ký/đăng nhập như bình thường.
