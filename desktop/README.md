# VL Save Studio Desktop

App desktop (Electron) gói trọn VL Save Studio Pro v3.0: **trình duyệt game tích hợp ngay trong app** — đăng nhập một lần trong khung bên trái, panel bên phải lo toàn bộ việc tạo/sửa/nạp save, mở rương, kiểm tra. Không cần F12, không cần extension/Tampermonkey, không copy-paste code.

## Cách dùng

1. Mở app. Khung bên trái là trang game — **đăng nhập tài khoản của bạn ở đó** (app dùng profile riêng, sạch, không extension nào khác; đăng nhập được giữ lại cho lần mở sau).
2. Panel bên phải luôn hiện acc đang đăng nhập (đọc từ token phiên, không tin `jxidle_lastuser`).
3. Nạp save: bấm **"Bản offline (nạp save)"** trên thanh công cụ → chọn nền/template → sửa số liệu → **NẠP LUÔN**. Tool có chốt chặn cứng nếu ID khác acc đang đăng nhập, hiện bảng xem trước cũ → mới trước khi ghi, và **tự kiểm chứng sau khi nạp** (kiểm chứng nốt khi bạn bấm "Trang chính" để game đẩy lên cloud).
4. Mở rương: ở **Trang chính**, mở Hành trang → bấm vào Rương Ngựa (thấy nút "Dùng ×10") → sang tab **Mở rương** → Bắt đầu mở. Tool đếm bằng save thật, bấm hụt là biết ngay. Test số nhỏ (50) trước.
5. Tab **Kiểm tra**: chẩn đoán phiên đăng nhập, chủ từng slot, thử ghi save. Tab **Slots**: xem/khôi phục backup. Tab **Nhật ký**: lịch sử thao tác.

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
