# Chưởng Môn Tí Hon (Bản Web) — Kế Hoạch Dự Án

> Một bản làm lại trên nền web, lấy cảm hứng từ tựa game đã ngừng phát hành của VNG
> *Tiểu Võ Lâm*: game đấu tự động (auto-battler) phong cách võ hiệp chibi 2D, các nhân
> vật tự động lao vào nhau và người chơi bấm vào chân dung để kích hoạt chiêu cuối.
>
> **Lưu ý:** Tài liệu này được viết lại sau buổi làm rõ yêu cầu. Nó đã sửa nhiều lỗi
> quan trọng trong bản nháp do AI tạo ra ban đầu (xem §10).

---

## 1. Tóm Tắt Ý Tưởng

Một game **đấu tự động võ hiệp chibi 2D**, chạy trên trình duyệt, **có máy chủ và tài
khoản người chơi**.

- Đội của bạn tự động chiến đấu với đội địch: nhân vật lao vào, đánh thường qua lại,
  bị đẩy lùi rồi lại lao vào.
- Mỗi nhân vật có **một chiêu cuối** gắn với **bang phái** của mình.
- Thao tác chủ động duy nhất khi giao chiến: **bấm vào chân dung nhân vật để tung
  chiêu cuối** khi thanh nộ đầy.
- Thắng trận → vàng/kinh nghiệm → **tu luyện**: lên cấp, tăng chỉ số → vượt các màn
  khó hơn.
- Nhân vật thuộc các **bang phái**; nhân vật hiếm (lấy cảm hứng từ các đại hiệp võ
  hiệp kinh điển) được mở khóa bằng cách thu thập **mảnh nhân vật** qua hệ thống
  **gacha nhiều lớp**.

### Ràng buộc / quyết định thiết kế
- **Nền tảng:** Web (trình duyệt). Không có bản tải về / bản desktop.
- **Có máy chủ:** Có backend thật với tài khoản người chơi. Máy chủ là nguồn dữ liệu
  chính xác cho ví tiền và tiến trình (vì có liên quan đến tiền thật).
- **Kiếm tiền:** Có loại tiền cao cấp (**kim cương**) được bán bằng **tiền thật theo
  hình thức xử lý thủ công** — người chơi liên hệ trực tiếp với admin, thanh toán
  bên ngoài game, và admin cộng kim cương vào tài khoản của họ. **Không tích hợp cổng
  thanh toán tự động.**
- **Ngôn ngữ giao diện:** **Tiếng Việt.**
- **Bản quyền / tính nguyên bản:** **Không** sao chép art gốc của VNG hay dùng trực
  tiếp các nhân vật có bản quyền (ví dụ các đại hiệp của Kim Dung). Dùng thiết kế
  **lấy cảm hứng** với tên riêng và tên bang phái tự đặt.

---

## 2. Đặc Tả Chiến Đấu

- **Số lượng đội hình:** 6 nhân vật mỗi bên (6 đấu 6).
- **Chiến trường:** **đấu theo 1 chiều ngang trên CÙNG một hàng.** TẤT CẢ nhân vật
  (cả hai phe) đứng chung trên một đường ngang duy nhất; phe trái tiến sang phải, phe
  phải tiến sang trái; không ai đi lên hay xuống. Lúc đầu xếp thành hàng nhưng **tất cả
  cùng lao vào một lúc** — loạn chiến đồng thời, *không* đánh tuần tự / lần lượt. Có
  lực đẩy nhẹ giữa các thân để chúng không chồng khít lên một điểm.
- **Di chuyển & chọn mục tiêu:** hoàn toàn tự động, chỉ theo chiều ngang. Mỗi nhân vật
  lao tới **kẻ địch gần nhất theo trục x** (bằng nhau thì theo id) và đánh ngay khi vào
  tầm đánh của mình — nên **tất cả cùng giao chiến một lúc**.
- **Tầm đánh (cận chiến vs tầm xa):** tầm đánh theo từng nhân vật. Cận chiến phải lại
  gần; **nhân vật tầm xa (vd: pháp sư Ma Giáo, hỗ trợ Nga Mi) đánh từ xa** và đứng phía
  sau đám cận chiến chứ không lao vào.
- **Thao tác người chơi:** thao tác chủ động *duy nhất* là **bấm chân dung để tung
  chiêu cuối** của nhân vật đó.
- **Mô hình thời gian:** *cảm giác* thời gian thực, nhưng được hiện thực bằng **mô
  phỏng theo bước thời gian cố định, có tính tất định** (RNG có seed, logic mô phỏng
  tách hoàn toàn khỏi phần hiển thị).
- **Thắng/thua:** tiêu diệt toàn bộ đội địch.

### Tính tất định là yêu cầu bắt buộc
Vì **PvP bất đồng bộ đã được lên kế hoạch** (xem §6) và có tiền thật trong game, bộ mô
phỏng chiến đấu phải **có tính tất định và chạy được không cần giao diện** ngay từ đầu.
Với PvP, client gửi input + seed và **máy chủ chạy lại đúng bộ mô phỏng đó** để xác
thực kết quả — dùng chung một bộ mã. Nếu xây phần chiến đấu gắn chặt với phần hiển thị
thì sau này sẽ phải viết lại toàn bộ engine, nên đây là điều không thể thỏa hiệp.

---

## 3. Chiêu Cuối

- Mỗi nhân vật có **thanh nộ riêng**.
- Thanh nộ tăng khi **gây và nhận sát thương** (tham gia chiến đấu).
- Khi đầy, người chơi **bấm chân dung để tung chiêu**. Có thể có nhiều chiêu sẵn sàng
  cùng lúc; người chơi tự chọn thứ tự tung.
- Mỗi nhân vật một chiêu cuối, mang đặc trưng bang phái.

---

## 4. Bang Phái, Đội Hình & Tiến Trình

### 5 bang phái và vai trò
| Bang phái | Vai trò / đặc trưng |
|-----------|---------------------|
| Thiếu Lâm | Đỡ đòn / phòng thủ |
| Cái Bang | Sát thương vật lý |
| Nga Mi | Hồi máu / hỗ trợ |
| Võ Đang | Khống chế / trụ lâu |
| Ma Giáo | Sát thương bùng nổ rủi ro cao / gây hiệu ứng xấu |

### Đội hình mặc định (7 nhân vật) + nhân vật hiếm
- Thiếu Lâm — 1 mặc định (nam)
- Võ Đang — 1 mặc định (nam)
- Nga Mi — 1 mặc định (nữ)
- Cái Bang — 2 mặc định
- Ma Giáo — 2 mặc định
- Mỗi bang phái còn có **một vài nhân vật hiếm mở khóa được**.

### Lập đội
- **Chọn tự do:** bất kỳ 6 nhân vật đang sở hữu, thuộc bang phái nào cũng được, không
  bắt buộc bộ đôi/cộng hưởng.
- **Mỗi nhân vật chỉ một bản** trên sân (mảnh trùng sẽ chuyển thành tài nguyên).

### Tiến trình ("tu luyện")
- Lên cấp **theo từng nhân vật** bằng kinh nghiệm → tăng chỉ số.
- **Dùng vàng để nâng cấp** chỉ số và sức mạnh chiêu cuối ngay từ đầu. Hệ thống
  **trang bị / vật phẩm thật sự sẽ làm sau** (bản mở rộng tương lai).
- Chỉ số cốt lõi: **HP, ATK (công), DEF (thủ), SPD (tốc độ)** (tốc độ tích nộ là một
  đòn bẩy ngầm).

---

## 5. Kinh Tế & Kiếm Tiền

### Các loại tiền & tài nguyên
| Vật phẩm | Nguồn | Dùng để |
|----------|-------|---------|
| **Vàng** (tiền thường) | Thắng trận, hoạt động hằng ngày, sự kiện | Quay gacha, nâng cấp chỉ số/chiêu |
| **Kim cương** (cao cấp) | **Tiền thật, admin cộng thủ công** | Gacha / cửa hàng cao cấp |
| **Mảnh nhân vật** | Quay gacha, hoạt động hằng ngày, sự kiện | Tích đủ → mở khóa một nhân vật hiếm cụ thể |
| **Tiền tham gia hằng ngày** (kiểu thể lực) | Tự hồi theo thời gian | Vào các hoạt động hằng ngày |
| **Tài nguyên nâng cấp** (chung) | Quay trúng nhân vật đã có | Nâng cấp các nhân vật khác |

### Mô hình mở khóa nhân vật hiếm — nhiều lớp
Quay gacha cho ra **mảnh ngẫu nhiên**; mảnh tích lũy đến ngưỡng sẽ **mở khóa đảm bảo**
(kiểu cơ chế "pity"). Không có kiểu thuần ngẫu nhiên "được ăn cả ngã về không".

### Quy trình kiếm tiền (xử lý thủ công)
1. Người chơi liên hệ admin và thanh toán bên ngoài game (chuyển khoản / ví điện tử).
2. Admin dùng **công cụ quản trị** để tra cứu tài khoản người chơi và **cộng kim cương**.
3. Ví tiền **do máy chủ quản lý chính thức**, nên không thể làm giả kim cương ở phía client.

---

## 6. Các Chế Độ Chơi

- **Cốt truyện (Campaign)** — thang PvE cốt lõi: vượt màn → vàng/kinh nghiệm → màn khó hơn.
- **Hoạt động hằng ngày** — nội dung lặp lại, mở bằng tiền tham gia hằng ngày.
- **Sự kiện giới hạn thời gian** — do máy chủ lên lịch, thưởng mảnh/tài nguyên, thường
  gắn với một nhân vật hiếm nổi bật.
- **Màn gacha / triệu hồi** — quay để lấy mảnh tiến tới mở khóa nhân vật hiếm.
- **Đấu trường PvP bất đồng bộ — làm sau (không có ở bản v1):** đánh với ảnh chụp đội
  hình đã lưu của người chơi khác (do AI điều khiển). Cần **máy chủ xác thực chiến
  đấu** — đây là lý do bộ mô phỏng phải có tính tất định ngay từ đầu.

---

## 7. Kiến Trúc & Công Nghệ

- **Monorepo TypeScript:** `packages/sim`, `packages/client`, `packages/server`.
  Bộ mô phỏng chiến đấu tất định là **một module dùng chung** cho cả client và server.
- **Frontend:** **PixiJS** để hiển thị chiến đấu (sprite, tween, hiệu ứng hạt) +
  **React** cho menu và giao diện quản trị.
- **Backend:** **Node** (TypeScript) với API **REST/HTTP**.
- **Cơ sở dữ liệu:** **PostgreSQL** (giao dịch ACID cho ví tiền / cộng kim cương).
- **Đăng nhập:** tài khoản **email + mật khẩu**.
- **Quyền của máy chủ:** máy chủ quản lý **ví tiền, tiến trình và kho nhân vật**;
  **client mô phỏng chiến đấu** và báo kết quả. (Gian lận kết quả PvE chỉ làm phồng
  tiến trình của chính người đó; kim cương vẫn do admin kiểm soát. PvP sẽ được máy chủ
  xác thực.)

---

## 8. Quy Trình Làm Art

Art là phần tốn kém, nhưng **để sau**.

- Dùng **art khối tạm (placeholder)** xuyên suốt giai đoạn nguyên mẫu và làm hệ thống.
- Art nhân vật thật chỉ làm **sau cùng**, khi game đã chứng minh là vui.
- Phương pháp làm art (tự chạy SD + LoRA / công cụ AI online / thuê họa sĩ) **chưa
  chốt**, sẽ quyết định khi đến lúc.
- Chuyển động làm **bằng code, không dùng AI video**: lao vào/bị đẩy lùi = tween vị
  trí x; đánh thường = lao tới + chớp sáng + hạt; chiêu cuối = phóng to + hiệu ứng màu
  theo bang phái.

---

## 9. Kế Hoạch Xây Dựng (theo giai đoạn)

Ước lượng tính theo **số vòng lặp xây dựng**, không phải theo lịch. Chỉ Giai đoạn 1
chạy thuần client; từ sau đó đều có backend.

### Giai đoạn 1 — Kiểm tra vòng lặp cốt lõi có vui không (thuần client)
- Bộ mô phỏng tất định + chiến đấu PixiJS + bấm-tung-chiêu + lên cấp theo nhân vật,
  ~5–6 nhân vật, **art khối tạm**, chỉ lưu trạng thái cục bộ.
- Mục tiêu: *Có vui không? Có đúng cái chất không?* trước khi xây backend.

### Giai đoạn 2 — Backend & hệ thống
- Node + PostgreSQL, tài khoản email/mật khẩu, **ví tiền & tiến trình phía máy chủ**,
  gacha nhiều lớp, các màn cốt truyện, hoạt động hằng ngày, và **công cụ quản trị**
  để cộng kim cương.

### Giai đoạn 3 — Sự kiện, hoàn thiện & art
- Sự kiện giới hạn thời gian, cân bằng chỉ số, tiện ích, và **art thật** thay cho
  placeholder.

### Tương lai
- **Đấu trường PvP bất đồng bộ** (máy chủ xác thực chiến đấu).
- Hệ thống **trang bị / vật phẩm** thật sự.

---

## 10. Các Điểm Sửa So Với Bản Nháp AI Ban Đầu

Bản nháp đầu tiên nắm đúng *cái chất* nhưng sai ở những phần cốt lõi:

1. **"Không máy chủ, không tiền thật, không live-service" → SAI.** Dự án có máy chủ,
   có kim cương bằng tiền thật (xử lý thủ công), có hoạt động hằng ngày và sự kiện.
   Đây là lỗi lớn nhất và làm thay đổi toàn bộ kế hoạch.
2. **"4 bang phái, mỗi bang 2 nhân vật mặc định (nam + nữ)" → SAI.** Thực tế có **5
   bang phái** (thiếu Ma Giáo) với số mặc định **không đều** (tổng 7).
3. **"Giữ file game đã export làm bản chính" → BỎ.** Trạng thái nằm ở máy chủ theo
   tài khoản; không có bản build dạng một file export.
4. **Không nêu công nghệ, đăng nhập, kinh tế hay PvP** — các khoảng trống lớn nay đã
   được lấp.
5. **Phân giai đoạn giả định thuần client** — chỉ Giai đoạn 1 còn đúng với giả định đó.

---

## 11. Các Hạng Mục Còn Mở (chưa chốt)

- Tiền tham gia hằng ngày: tốc độ hồi, giới hạn, quy tắc reset hằng ngày.
- Công cụ quản trị: phạm vi tính năng ngoài việc cộng kim cương (hoàn tiền, cấm tài
  khoản, nhật ký kiểm toán?).
- Danh sách nhân vật hiếm cụ thể và chiêu cuối của họ.
- Lên lịch sự kiện: tần suất, loại sự kiện, bảng phần thưởng.
- Tỷ lệ gacha và ngưỡng pity (con số cụ thể).

---

## 12. Bước Tiếp Theo Ngay

**Làm Giai đoạn 1:** vòng lặp cốt lõi thuần client với art khối tạm — bộ mô phỏng tất
định, đấu tự động, bấm-tung-chiêu, lên cấp theo nhân vật, vài nhân vật thuộc một hai
bang phái. Sau đó đánh giá độ vui trước khi xây backend và các hệ thống.
