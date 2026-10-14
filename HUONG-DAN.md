# Zalo Bong Bóng 2.0 – bản thử nghiệm dành cho Windows

Ứng dụng Electron chạy **Zalo Web** (`https://chat.zalo.me/`) trong cửa sổ gọn, có bong bóng nổi tương tự Android. Đây là dự án **không chính thức**, không do Zalo phát triển hoặc chứng nhận bảo mật.

## Bong bóng tin nhắn mới

- **Tin nhắn riêng:** khi Zalo Web phát sinh thông báo, một bong bóng nhỏ của người gửi xuất hiện dưới bong bóng chính. Nhiều tin của cùng một người gom vào một bong bóng.
- **Tin nhắn nhóm:** tạo bong bóng theo tên nhóm ngay cả khi bạn không được @tag. Nhóm có @tag được đánh dấu khác màu.
- **Bấm bong bóng:** mở khung Zalo Web và thử chuyển đến hội thoại theo tên hoặc thao tác thông báo gốc. Nếu Zalo đổi cấu trúc giao diện, tính năng này có thể không hoạt động, bạn vẫn mở hội thoại bằng tay.
- **Rê chuột:** xem tên và số tin; nội dung chỉ hiện nếu tắt tùy chọn ẩn xem trước.
- **Đọc xong:** số tin mới trở về 0, bong bóng tự ẩn theo thời hạn đã đặt; có tùy chọn ẩn ngay khi đọc.
- Mỗi lần nhận tin mới có thể hiện hiệu ứng viền; chế độ chuông/thông báo hệ thống vẫn tùy thiết lập @tag, ưu tiên hay mọi tin.

**Điều kiện:** ứng dụng phải đang chạy, có mạng, còn phiên đăng nhập Zalo Web và Zalo Web thực sự phát sinh thông báo mà preload nhận được. Ứng dụng **không** đọc thông báo của Zalo PC, không có API chính thức của Zalo và **không thể bảo đảm nhận mọi tin**, đặc biệt khi Zalo Web tự thay đổi cách tạo thông báo, khi đang ở chính cuộc trò chuyện hoặc sau khi máy ngủ.

## Thay đổi an toàn trong 2.0

- Electron **44.7.2**, electron-builder **26.15.3**; không còn dùng Electron 33 hết hỗ trợ.
- Chỉ cho phép phiên Zalo Web ở origin `https://chat.zalo.me` xin quyền thông báo và ghi clipboard đã xử lý. Từ chối mặc định đọc clipboard, microphone/camera, chụp màn hình qua API web, v.v.
- Vẫn có **chụp màn hình thủ công** (Ctrl+Alt+S) và **gửi vùng Excel vừa sao chép** (Ctrl+Alt+E) bằng chức năng nội bộ khi người dùng kích hoạt.
- **Không lưu lịch sử thông báo, nội dung tin nhắn hay avatar ra các file JSON.** Bộ nhớ trong phiên được xóa khi đóng ứng dụng. Khi nâng cấp, các file cache JSON dạng cũ được xóa, nhưng phiên đăng nhập Zalo Web không bị xóa.
- **Phiên Zalo Web (cookie, storage)** vẫn tồn tại trên ổ đĩa để không cần đăng nhập lại. Vì vậy không nên dùng nếu máy tính không đáng tin cậy hoặc tài khoản hệ điều hành bị chia sẻ.
- Mặc định ẩn nội dung xem trước và **không** bật tự khởi động cùng Windows. Có thể tự bật nếu muốn bong bóng luôn hoạt động khi đăng nhập Windows.
- Hạn chế URL avatar được tải từ Zalo; kiểm tra cửa sổ gọi các kênh điều khiển nội bộ.
- CI thực hiện test, npm audit và đóng gói Windows. Chưa có chữ ký số cho file EXE.

## Cài đặt từ mã nguồn (Windows 10/11)

1. Cài Node.js 24 LTS phù hợp hoặc bản Node tương thích theo tài liệu Electron.
2. Tải đúng mã nguồn từ nhánh/commit mà bạn tự kiểm tra, không chạy một EXE do người lạ gửi.
3. Mở PowerShell trong thư mục chứa `package.json`, chạy:

```powershell
npm install
npm test
npm start
```

4. Nếu chạy thử bình thường, có thể đóng gói bằng:

```powershell
npm run dist
```

Trong thư mục `dist` sẽ có bản Setup và bản Portable. Đây là bản **chưa ký số**, Windows SmartScreen có thể cảnh báo; không bỏ qua cảnh báo chỉ vì thấy tên Zalo.

**Khóa phụ thuộc:** mã nguồn hiện chưa có `package-lock.json` được tạo từ npm registry trong môi trường CI có internet. Sau lần `npm install` đáng tin cậy đầu tiên, hãy kiểm tra `npm audit`, commit lockfile và dùng `npm ci` cho các bản build kế tiếp. Workflow CI hiện tạo lockfile tạm thời trong runner trước khi chạy `npm ci`; đây chưa phải reproducible build lý tưởng.

## Tạo EXE bằng GitHub Actions

Trong trang GitHub, chọn **Actions → Test and Build Windows**. Workflow chạy trên Windows, kiểm thử trước, kiểm tra dependency audit rồi mới tạo artifact `ZaloBongBong-v2-Windows-unsigned`. Khi nhánh được merge vào `main`, có thể chạy thủ công từ **Run workflow**. Nếu các bước kiểm thử/audit thất bại, **không** nên sử dụng artifact.

## Các thao tác khác

- **Ctrl+Alt+Z:** mở/đóng khung chat; **Ctrl+Alt+S:** chụp màn hình; **Ctrl+Alt+E:** chuyển vùng Excel đã copy thành ảnh.
- Chuột phải bong bóng chính để mở menu chỉnh thông báo, chế độ rung/âm, cỡ, bong bóng nhóm và riêng, khởi động cùng Windows.
- Nút **Mở rộng** mở ứng dụng Zalo PC chính nếu đã cài; không chia sẻ phiên đăng nhập với Zalo Web.
- Để xóa phiên đăng nhập Zalo Web hoàn toàn, hãy thoát ứng dụng, đăng xuất thiết bị từ Zalo chính và xóa thư mục dữ liệu ứng dụng `%APPDATA%\Zalo Bong Bong`. Thao tác này cũng xóa mọi cài đặt người dùng; đường dẫn thực tế phụ thuộc cấu hình Windows/Electron.

## Rủi ro và giới hạn chưa được xác minh

Chưa thực hiện kiểm thử end-to-end trong Windows thật, thử nhiều kiểu tin nhắn Zalo hoặc phân tích lưu lượng mạng của EXE. Zalo có thể hạn chế hoặc thay đổi tích hợp với ứng dụng thứ ba. Phiên WebContents được tải từ Internet nên vẫn có rủi ro phần mềm, cookie và web supply-chain. Không thể cam kết ứng dụng an toàn tuyệt đối hay ổn định 100%.

Cần thử trên tài khoản phụ trước khi đăng nhập tài khoản chính. Đối với cuộc gọi/video, hãy dùng Zalo chính thức; quyền microphone và camera của trang web đã bị tắt theo mặc định.

**Cấu trúc chính:** `src/main.js` (Electron), `src/inbox.js` (bong bóng lưu RAM), `src/security.js` (chính sách quyền), `src/zalo-preload.js` (nhận thông báo), `src/ui/stack.html` (bong bóng riêng/nhóm), `test/security-and-inbox.test.js` (kiểm thử tự động).
