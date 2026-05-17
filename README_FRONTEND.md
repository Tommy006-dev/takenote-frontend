# TakeNote Frontend

Đây là bản frontend React đã được tối ưu UI/UX cho đồ án Note Management Application.
Backend/API thật có thể được kết nối sau mà không cần thay đổi giao diện chính.

## Chạy local

```bash
npm install
npm start
```

## Build production

```bash
npm run build
```

Thư mục `build/` đã được tạo sẵn sau khi build thành công.

## Các điểm backend cần kết nối sau

- Đăng ký / đăng nhập / đăng xuất / kích hoạt tài khoản: `src/pages/LoginPage.jsx`, `src/App.js`
- Hồ sơ, avatar, đổi mật khẩu: `src/pages/ProfilePage.jsx`
- CRUD ghi chú, auto-save, pin, khóa ghi chú, ảnh, nhãn: `src/pages/HomePage.jsx`, `src/components/NoteEditor.jsx`, `src/utils/db.js`
- Chia sẻ ghi chú và quyền truy cập: `src/components/ShareDialog.jsx`, `src/components/NoteList.jsx`
- Offline/PWA hiện đang dùng IndexedDB ở `src/utils/db.js`; backend có thể đồng bộ thêm khi online.

## Ghi chú

- Không hard-code localhost/port trong source.
- Không đính kèm `node_modules` trong bản nộp để giảm dung lượng.
- Các thay đổi chủ yếu nằm ở frontend: UI/UX, feedback/toast, xác nhận xóa hiện đại, responsive, branding TakeNote.
