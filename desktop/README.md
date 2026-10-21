# VL Save Studio Desktop

App desktop (Electron) gói trọn VL Save Studio Pro v3.0: **trình duyệt game tích hợp ngay trong app** — đăng nhập một lần trong khung bên trái, panel bên phải lo toàn bộ việc tạo/sửa/nạp save, mở rương, kiểm tra. Không cần F12, không cần extension/Tampermonkey, không copy-paste code.

## Cách dùng

Bản 2.0.0 rút gọn: panel chỉ còn đúng 2 việc.

Bản 2.0.1: kiểm chứng sau nạp chuyển thành 2 nhịp — qua trang chính phải giữ nguyên cấp ổn định hơn 20 giây mới báo HOÀN TẤT (bản cũ báo ngay lần đọc đầu nên bị 'xanh giả' khi server khóa tài khoản wipe nhân vật vài giây sau khi trang tải). Nếu nhân vật bị reset về cấp thấp mà giữ nguyên tên, tool báo đích danh dấu hiệu tài khoản bị server khóa.

1. **Tạo nhân vật** (mặc định duy nhất, không chọn nền/chỉnh số nữa): Vô Môn · cấp 49 · XP 99,99% · vàng 10.000.000.000 · trơn hoàn toàn (không item/trang bị/ngựa/nguyên liệu, KNB 0, màn 1), điểm tiềm năng 240 + kỹ năng 49 để nguyên chưa cộng. Cách nạp: đăng nhập acc ở khung game → bấm **"Bản offline (nạp save)"** → nhập tên nhân vật → **NẠP LUÔN** → xác nhận → bấm **"Trang chính"** và chờ "Kiểm chứng HOÀN TẤT". Tool tự lấy ID từ token phiên đăng nhập (chặn nạp khi không chứng minh được acc), tự backup save cũ của slot trước mỗi lần ghi đè (tối đa 5 bản/slot, lưu ngầm trong game), tự kiểm chứng sau nạp 2 giai đoạn.
2. **Mua KNB tự động**: ở **Trang chính**, mở sẵn Kỳ Trân Các (tab Tiện ích) trong khung game → nhập số lần bấm ×100 → Bắt đầu mua. Tool đếm bằng KNB thật trong save; giới hạn của game 10.000 KNB/ngày.

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
