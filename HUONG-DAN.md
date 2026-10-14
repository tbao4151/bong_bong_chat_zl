# Zalo Bong Bóng Secure 2.1 – Windows (bản kiểm thử bảo mật)

Đây là ứng dụng **không chính thức** giúp hiển thị bong bóng nổi giống Android khi **Zalo Web phát sinh thông báo**. App không sử dụng API chính thức của Zalo, do đó có thể bỏ sót thông báo hoặc mở sai cuộc trò chuyện nếu Zalo đổi giao diện. Không đảm bảo tương đương Android.

## Các chức năng

- Bong bóng riêng cho từng người nhắn, cập nhật số tin chưa đọc.
- Bong bóng nhóm cho tin nhắn đến (không cần @tag); @tag được đánh dấu khác biệt.
- Bấm vào bong bóng mở khung Zalo Web và thử đi tới hội thoại tương ứng.
- Cài đặt số bong bóng tối đa, ghim, tự ẩn, tắt âm, ẩn nội dung xem trước.
- Tự khởi động cùng Windows mặc định **tắt**. Để nhận bong bóng phải để ứng dụng đang chạy.
- Khi bật tính năng ảnh đại diện, ứng dụng chỉ tải ảnh từ các miền Zalo cho phép.

## Mô hình bảo mật

- Electron 44.7.2, WebContentsView sandbox, tắt Node Integration, bật Context Isolation.
- Electron Packager 20.3.0 thay cho electron-builder cũ có phụ thuộc cảnh báo DoS.
- Cài thư viện theo đúng `package-lock.json` qua `npm ci`.
- CI thực hiện `npm audit --audit-level=moderate`. Chỉ đóng gói nếu audit và unit test thành công.
- Không gọi `desktopCapturer`; đã **loại bỏ chụp màn hình, công cụ ghi chú ảnh và gửi vùng Excel**, cũng không có API đọc clipboard.
- Quyền media (camera, micro), clipboard-read, fullscreen bị từ chối đối với Zalo Web. Chỉ xem xét quyền thông báo và ghi clipboard đã xử lý từ origin Zalo chính.
- Mã thông báo, hình đại diện và bản xem trước được giữ trong RAM, không lưu thành các tệp JSON plaintext. Dữ liệu đó mất khi thoát ứng dụng.
- **Phiên đăng nhập Zalo Web vẫn lưu trên đĩa**, giống việc trình duyệt ghi nhớ đăng nhập. Thư mục mới `%APPDATA%\Zalo Bong Bong Secure`, cách ly hoàn toàn với phiên đăng nhập và dữ liệu ứng dụng cũ.
- Nội dung xem trước và tải avatar đều **tắt theo mặc định**.
- Từ chối URL bên ngoài không dùng HTTPS; hiện hộp xác nhận trước khi mở trình duyệt ngoài.

## Tải và chạy bản portable

1. Vào GitHub repository → **Actions** → workflow **Test and Package Windows**.
2. Chọn bản build mới nhất ở nhánh `feature/secure-android-style-bubbles`, kiểm tra **tất cả các bước đều Success** và commit SHA tương ứng với mã nguồn đã review.
3. Tải artifact `ZaloBongBong-v2.1-portable-unsigned` và giải nén ZIP vào thư mục bạn có quyền ghi, ví dụ `D:\Apps\ZaloBongBongSecure`.
4. Mở `ZaloBongBong.exe` trong thư mục vừa giải nén, đăng nhập **tài khoản thử** bằng Zalo QR trên điện thoại.
5. Nhờ tài khoản khác gửi tin riêng/nhóm, kiểm tra hiển thị bong bóng, mở đúng hội thoại, đóng/mở và logout.

**Không tải bản EXE v2.0 trước đây.** Tất cả file EXE vẫn **chưa được ký số**. Không bỏ qua cảnh báo Microsoft Defender/SmartScreen nếu file không được xác minh. Quy trình build thành công không chứng minh ứng dụng an toàn tuyệt đối.

## Chạy từ mã nguồn (Windows)

Cài Node.js 24 và Git. Mở PowerShell tại thư mục dự án:

```powershell
npm ci
npm test
npm audit --audit-level=moderate
npm start
```

Nếu muốn đóng gói bản portable cho chính máy của bạn:

```powershell
npm run dist
```

Thư mục `dist/ZaloBongBong-win32-x64/` chứa `ZaloBongBong.exe` và các tài nguyên đi kèm. Phải giữ toàn bộ thư mục, không chép riêng file EXE.

## Những giới hạn cần biết

- Chỉ đọc thông báo Zalo Web, không đọc dữ liệu từ ứng dụng Zalo PC đang cài trên máy.
- Nếu Zalo Web không tạo Notification, bong bóng có thể không xuất hiện. Không đọc toàn bộ DOM tin nhắn để tránh tăng quyền truy cập dữ liệu.
- Chưa có kết quả kiểm thử với tài khoản thật, máy Windows của người dùng hoặc phân tích lưu lượng động. Chỉ coi đây là bản **kiểm thử bảo mật** cho đến khi các bước này được xác nhận.
- Source code công khai cho phép kiểm tra, nhưng không bảo đảm artifact EXE phát hành không bị sửa. Cần chữ ký số từ đơn vị phát hành tin cậy nếu muốn phân phối rộng.
- Thoát ứng dụng sẽ xóa dữ liệu bong bóng trong RAM nhưng **không** tự đăng xuất phiên Web. Muốn xóa hoàn toàn, hãy đăng xuất thiết bị trong Zalo, thoát app và xóa thư mục `%APPDATA%\Zalo Bong Bong Secure` (đồng thời mất tất cả cài đặt).

Chi tiết code: `src/main.js`, `src/security.js`, `src/inbox.js`, `src/zalo-preload.js`; test nằm trong `test/`.
