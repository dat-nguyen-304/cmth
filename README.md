# Chưởng Môn Tí Hon

Game web đấu tự động (auto-battler) phong cách võ hiệp chibi 2D. Đội hình lao vào nhau
trên một hàng ngang, người chơi bấm chân dung để tung chiêu cuối khi thanh nộ đầy; thắng
trận → tu luyện (lên cấp, tăng chỉ số) → vượt màn khó hơn.

> Lấy cảm hứng từ tựa game đã ngừng phát hành của VNG, nhưng dùng thiết kế / tên gọi
> nguyên bản. Xem kế hoạch chi tiết: [`chuong-mon-ti-hon-ke-hoach-du-an.md`](./chuong-mon-ti-hon-ke-hoach-du-an.md)
> (EN: [`chuong-mon-ti-hon-project-plan.md`](./chuong-mon-ti-hon-project-plan.md)).

## Trạng thái: Giai đoạn 1 (nguyên mẫu, client-only)

Lõi chơi được: combat 1 chiều loạn chiến, bấm-tung-chiêu, lên cấp theo nhân vật, art khối
tạm, lưu cục bộ (localStorage). Backend / tài khoản / gacha là Giai đoạn 2.

## Cấu trúc (monorepo, npm workspaces)

| Package | Vai trò |
|---------|---------|
| `packages/sim` | Bộ mô phỏng chiến đấu **tất định, headless** (TS thuần). Có test. Sau này server dùng lại để xác thực PvP. |
| `packages/client` | Frontend: **PixiJS** vẽ trận đấu + **React** cho giao diện. |

## Lệnh

```bash
npm install                              # cài dependencies cho cả workspace
npm test                                 # chạy test bộ sim (Vitest)
npm run dev --workspace=@cmth/client     # dev server (http://localhost:5173)
npm run build --workspace=@cmth/client   # build production
npm run typecheck                        # typecheck toàn workspace
```

## Công nghệ

TypeScript • PixiJS 8 • React 18 • Vite • Vitest. (Giai đoạn 2: Node + PostgreSQL + REST.)
