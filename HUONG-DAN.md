# Zalo Bong Bóng – Hướng dẫn

Bong bóng chat Zalo nổi trên màn hình Windows. Bấm bong bóng để mở khung chat. Bên trong khung là Zalo Web (chat.zalo.me).

## Cài đặt lần đầu (khoảng 5 phút)

1. Cài **Node.js bản LTS** tại https://nodejs.org. Bấm Next liên tục là xong.
2. Giải nén thư mục `zalo-bong-bong` ra một chỗ cố định, ví dụ `D:\Apps\zalo-bong-bong`.
3. Chạy **`1-CAI-DAT.bat`** và đợi tải thư viện (cần mạng, khoảng 200 MB).
4. Chạy **`2-CHAY-THU.bat`** để dùng thử.
5. Dùng ổn rồi thì chạy **`3-DONG-GOI-EXE.bat`**. Thư mục `dist` sẽ có 2 file:
   - `Zalo Bong Bong Setup 1.8.2.exe`: bản cài đặt, có shortcut ngoài Desktop.
   - `ZaloBongBong-portable-1.8.2.exe`: bản chạy luôn, không cần cài, chép sang máy khác được.

Khi chạy file .exe lần đầu, Windows có thể hiện cảnh báo SmartScreen do app chưa có chữ ký số. Bấm **More info → Run anyway**.

## Lần đầu mở app

1. Khung chat tự bật ra. Quét mã QR bằng Zalo trên điện thoại để đăng nhập.
2. Bấm nút **⋯** trên khung chat (hoặc chuột phải vào bong bóng) → **Cài đặt…**
3. Nhập **Tên Zalo của bạn**, đúng tên hiển thị trong các nhóm, rồi bấm **Lưu**.

## Cách dùng

| Thao tác | Kết quả |
|---|---|
| Bấm bong bóng | Mở hoặc thu gọn khung chat. Nếu trước đó đang mở nhóm/người từ bong bóng nhỏ, khung chat **về trang chủ Zalo** (tắt được trong Cài đặt) |
| Kéo bong bóng | Di chuyển, thả ra tự hút vào mép màn hình gần nhất |
| Chuột phải bong bóng | Mở menu: chế độ thông báo, tắt âm, cài đặt, thoát… |
| Nút **Mở rộng** (mũi tên chéo) trên khung chat | Mở ứng dụng Zalo PC chính, khung bong bóng tự thu lại |
| Bấm ra ngoài khung chat | Khung tự thu gọn (trừ khi bật nút ghim) |
| **Ctrl + Alt + S** | Chụp màn hình nhanh |
| **Ctrl + Alt + E** | Gửi vùng Excel vừa copy thành ảnh |
| **Ctrl + Alt + Z** | Mở hoặc thu khung chat từ bất kỳ đâu |
| Biểu tượng ở khay hệ thống (góc phải thanh Taskbar) | Bấm để mở chat, chuột phải để xem menu |

### Chỉ báo khi được tag tên

- Số đỏ trên bong bóng luôn hiện tổng tin chưa đọc.
- Bong bóng chỉ **rung viền cam, kêu 2 tiếng và hiện thông báo Windows** khi:
  - tin nhắn có `@Tên của bạn`, hoặc
  - tin chứa từ khóa bạn khai trong Cài đặt, hoặc
  - tin đến từ người hoặc nhóm trong danh sách "luôn được báo".
- Các tin khác chỉ tăng số đếm, không làm phiền.
- Đổi chế độ nhanh: chuột phải bong bóng → **Thông báo** → Chỉ khi được tag tên / Mọi tin nhắn / Tắt thông báo.

### Hộp "Tin nhắc tên tôi"

- Mỗi lần có người @tag bạn, app ghi lại: **nhóm nào, ai tag, mấy giờ** và nội dung tin. App giữ lại 7 ngày gần nhất.
- Mở hộp bằng 1 trong 3 cách:
  - bấm chấm cam **@** ở góc trái trên bong bóng (chỉ hiện khi có tin chưa xem hôm nay),
  - bấm nút **@** trên thanh tiêu đề khung chat,
  - chuột phải bong bóng → **Tin nhắc tên tôi**.
- Bấm vào một dòng: khung chat mở và nhảy tới đúng hội thoại đó. Nếu Zalo Web đã tải lại trang và không nhảy được, app sẽ báo tên nhóm để bạn tự mở.
- Có 2 tab **Hôm nay** và **7 ngày qua**, cùng các nút **Đánh dấu đã xem hết** và **Xóa danh sách**.
- Tin vẫn được ghi lại kể cả khi bạn đang tắt thông báo.

### Bong bóng từng nhóm và từng người

Dưới bong bóng chính có thể xuất hiện 2 loại bong bóng nhỏ:

| Loại | Khi nào xuất hiện | Dấu hiệu |
|---|---|---|
| **Nhóm** | Bạn bị @tag trong một nhóm chat | Chấm **cam @số** (số lần bị tag chưa xem), viền cam, biểu tượng hai người ở góc dưới |
| **Người** | Có người nhắn riêng (1-1) cho bạn | **Số đỏ** (số tin mới), viền trắng |

- Mỗi nhóm / mỗi người chỉ có 1 bong bóng, tin mới thì số tăng lên.
- **Rê chuột**: xem trước (ai tag / nội dung tin).
- **Bấm**: mở khung chat đúng nhóm / đúng người, số trên bong bóng mất đi. **Bấm lại** đúng bong bóng đó (hoặc bấm ra ngoài) để thu khung chat.
- **Chuột phải**: Mở, **Ghim** (không tự ẩn), Đóng bong bóng này, Đóng tất cả, Tắt loại bong bóng đó.
- **Đọc xong** (bấm vào bong bóng, hoặc đọc hết tin trên Zalo ở khung chat / điện thoại / Zalo PC): **bong bóng vẫn giữ lại, chỉ mất số**, rồi tự ẩn sau thời gian cài đặt (mặc định 2 giờ).
  - Muốn đọc xong là ẩn ngay: chuột phải bong bóng chính → tích **Ẩn bong bóng nhỏ khi đã đọc** (hoặc trong Cài đặt).
  - Xóa số bằng tay: chuột phải bong bóng nhỏ → **Đánh dấu đã đọc**; chuột phải bong bóng chính → **Đánh dấu tất cả đã đọc**.
  - Ẩn ngay một bong bóng: chuột phải → **Đóng bong bóng này**.
- Bong bóng đã **ghim** không tự ẩn (chỉ mất số).
- Tối đa 5 bong bóng (cả hai loại cộng lại), tự ẩn sau 2 giờ không có tin mới. Bong bóng ghim luôn nằm trên cùng.
- Bật/tắt từng loại: chuột phải bong bóng chính → **Bong bóng nhóm được tag** / **Bong bóng người nhắn riêng**, hoặc **Cài đặt → Bong bóng từng nhóm và từng người**.
- Khi khung chat đang mở và bạn đang xem, tin nhắn riêng mới không tạo bong bóng (vì bạn đã thấy).
- **Ảnh đại diện**: app lấy ảnh kèm theo thông báo của Zalo và lưu lại. Người/nhóm chưa có ảnh (hoặc chưa nhắn lần nào sau khi cập nhật) sẽ hiện chữ viết tắt; ảnh sẽ tự xuất hiện từ tin nhắn tiếp theo. Tắt trong **Cài đặt → Hiện ảnh đại diện**.

### Chụp màn hình nhanh

1. Nhấn **Ctrl + Alt + S**, hoặc bấm nút chụp trên thanh tiêu đề khung chat.
2. Kéo chuột khoanh vùng cần chụp. Nhấn Esc hoặc chuột phải để hủy.
3. Thả chuột: **bảng vẽ ghi chú** mở ra (xem mục dưới).

### Gửi vùng Excel vừa copy thành ảnh

1. Trong Excel, bôi đen vùng cần gửi rồi nhấn **Ctrl + C**.
2. Nhấn **Ctrl + Alt + E**, hoặc bấm nút **bảng (ô lưới)** trên thanh tiêu đề khung chat.
3. Ảnh của vùng Excel mở trong **bảng vẽ ghi chú**. Bạn có thể khoanh ô cần chú ý, rồi bấm **Dán vào chat**.

Ảnh giữ đúng định dạng màu, viền, cỡ chữ như trong Excel, và người nhận không sửa được số liệu.

### Bảng vẽ ghi chú

Mở tự động sau khi chụp màn hình hoặc gửi vùng Excel.

| Công cụ | Phím | Dùng để |
|---|---|---|
| Mũi tên | 1 | Chỉ vào ô / chi tiết cần chú ý |
| Khung | 2 | Đóng khung một vùng |
| Khoanh | 3 | Khoanh tròn chỗ lỗi |
| Bút | 4 | Vẽ tự do |
| Tô sáng | 5 | Tô dạ quang lên dòng / ô |
| Chữ | 6 | Bấm vào ảnh rồi gõ, Enter để xong (Shift+Enter xuống dòng) |

- Chọn màu (đỏ, vàng, xanh lá, xanh dương, đen) và độ dày nét (mỏng, vừa, dày).
- **Ctrl + Z**: hoàn tác. **Xóa hết**: bỏ toàn bộ ghi chú.
- **Dán vào chat** (Ctrl + Enter): khung chat mở và ảnh được dán sẵn. Kiểm tra rồi bấm gửi.
- **Chỉ chép ảnh** (Ctrl + C): chép vào bộ nhớ tạm để dán chỗ khác (email, Excel, Word…).
- **Hủy** (Esc).
- Không cần ghi chú thì bấm **Dán vào chat** luôn.

Nếu ảnh chưa hiện trong ô chat, hãy mở đúng hội thoại cần gửi rồi nhấn **Ctrl + V**. Ảnh vẫn nằm sẵn trong bộ nhớ tạm.

## Đổi hình bong bóng chính (icon / GIF động)

Vào **Cài đặt → Hình bong bóng chính**, bấm chọn một hình rồi bấm **Lưu**:

- **Logo Zalo** (mặc định) hoặc **Xanh (kiểu cũ)**.
- **6 icon tĩnh có sẵn**: Xanh lá, Tối, Chuông, A còng, Mặt cười, Bánh răng.
- **4 icon động có sẵn** (nhãn ĐỘNG): Đang gõ, Nhịp sóng, Chuông lắc, Bánh răng quay.
- **4 thú cưng động**: **Mèo** (chớp mắt, vẫy tai), **Cún** (nghiêng đầu, thè lưỡi), **Thỏ** (ngoáy tai, giật mũi), **Gà con** (nhảy, vỗ cánh).
- **Ảnh/GIF của bạn**: bấm **Chọn ảnh/GIF…** – hỗ trợ PNG, JPG, **GIF động**, WebP, tối đa 5 MB. Ảnh được cắt tròn, nên dùng ảnh vuông.

**Giữ nguyên hình (không cắt tròn):** tích ô này trong Cài đặt (hoặc chuột phải bong bóng chính → **Giữ nguyên hình**). Bong bóng bỏ khung tròn, viền trắng và nền – ảnh **PNG đã tách nền** (hoặc GIF nền trong suốt) sẽ chỉ còn chủ thể nổi trên màn hình, có bóng đổ nhẹ. Khi bị tag, chủ thể phát sáng viền cam thay cho vòng tròn.

**Tự xóa nền:** ảnh/GIF **chưa tách nền** (nền trắng hoặc nền một màu) – tích **Tự xóa nền** trong Cài đặt, hoặc chuột phải bong bóng chính → **Tự xóa nền trắng / nền một màu của hình**. App làm trong suốt phần nền liền với mép ảnh ở **từng khung hình** (cả GIF động), chủ thể giữ nguyên. Khi chọn ảnh mới bằng **Chọn ảnh/GIF…**, app tự bật **Giữ nguyên hình**, và tự bật **Tự xóa nền** nếu ảnh chưa trong suốt.

**Kích thước:** kéo thanh **Kích thước bong bóng chính** (40–160 px) rồi bấm Lưu, hoặc nhanh hơn: chuột phải bong bóng chính → **Kích thước bong bóng** → Nhỏ / Vừa / Lớn / Rất lớn, hoặc **To hơn / Nhỏ hơn** từng nấc (đổi ngay, không cần Lưu).

Mục **Ảnh động (GIF)**:
- **Luôn chuyển động**, hoặc
- **Chỉ chuyển động khi có tin mới**: bình thường bong bóng đứng yên, có tin chưa đọc hoặc được tag thì GIF chạy.

Nếu Windows đang bật giảm hiệu ứng chuyển động (Settings → Accessibility → Visual effects → tắt Animation effects), GIF sẽ đứng yên.

## Lưu ý

- Bấm bong bóng nhỏ hoặc tin trong hộp "Tin nhắc tên tôi": app tìm **đúng tên** người/nhóm trong danh sách hội thoại của Zalo Web và bấm vào; không thấy thì gõ tên vào ô **Tìm kiếm** của Zalo rồi chọn kết quả trùng tên. Nếu có 2 người/nhóm **trùng tên**, app có thể mở nhầm.

- Về trang chủ Zalo = tải lại Zalo Web (mất 1–2 giây). Sau khi về trang chủ, bấm vào các tin nhắc tên **cũ** có thể không nhảy thẳng vào hội thoại được nữa; app sẽ hiện tên nhóm để bạn tự mở. Tin mới đến sau đó vẫn nhảy được bình thường.

- App chỉ "bọc" Zalo Web, không can thiệp vào tài khoản. Không có tính năng tự động gửi tin, nên không có nguy cơ bị khóa.
- Việc nhận biết tag dựa vào nội dung thông báo Zalo Web gửi ra. Nếu Zalo đổi cách hiển thị, hãy thêm từ khóa phù hợp trong Cài đặt. Nếu vẫn không thấy báo, tạm chuyển sang chế độ "Mọi tin nhắn".
- Thông báo Windows hiển thị ổn định nhất khi dùng **bản đã cài (Setup.exe)**. Lúc chạy thử bằng `2-CHAY-THU.bat`, thông báo có thể không hiện, nhưng bong bóng vẫn rung và kêu bình thường.
- Gọi thoại/video nên dùng app Zalo PC chính (bấm nút **Mở rộng**).
- Nút Mở rộng tự tìm Zalo PC ở các vị trí cài đặt thường gặp. Nếu không tìm thấy, app sẽ hỏi bạn chọn file `Zalo.exe` (hoặc shortcut Zalo ngoài Desktop). Có thể đổi lại trong **Cài đặt → Ứng dụng Zalo PC**.
- Zalo có thể giới hạn số phiên đăng nhập trên máy tính. Nếu mở Zalo PC làm bong bóng bị đăng xuất (hoặc ngược lại), hãy báo mình để điều chỉnh.
- Cài đặt được lưu tại `%APPDATA%\Zalo Bong Bong\cai-dat.json`, danh sách tin nhắc tên ở `nhac-ten.json` cùng thư mục.

## Cấu trúc thư mục

```
src/main.js          Xử lý chính: bong bóng, khung chat, thông báo, chụp màn hình, phím tắt
src/config.js        Đọc / lưu cài đặt
src/mentions.js      Lưu danh sách tin nhắc tên (7 ngày)
src/zalo-preload.js  Bắt thông báo của Zalo Web để lọc theo tag
src/ui-preload.js    Cầu nối an toàn cho giao diện
src/ui/bubble.html   Giao diện bong bóng
src/ui/shell.html    Thanh tiêu đề khung chat
src/ui/capture.html  Màn hình khoanh vùng chụp
src/ui/settings.html Cửa sổ cài đặt
src/ui/mentions.html Hộp tin nhắc tên tôi
src/ui/editor.html   Bảng vẽ ghi chú lên ảnh
src/ui/stack.html    Bong bóng từng nhóm có tag bạn và từng người nhắn riêng
src/privates.js      Lưu tin nhắn riêng gần đây (7 ngày)
src/icons.js         Lưu ảnh đại diện cho bong bóng
src/navigate.js      Mở đúng hội thoại theo tên (danh sách / ô tìm kiếm Zalo Web)
assets/              Biểu tượng app
```
