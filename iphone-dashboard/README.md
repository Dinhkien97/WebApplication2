# iPhone Dashboard

iPhone mở một trang web (Safari) → gửi cảm biến chuyển động, la bàn, GPS, trạng thái mạng qua WebSocket → dashboard hiển thị realtime.

## Chạy
```bash
npm install
DASH_TOKEN=<chuoi-bi-mat> npm start     # không đặt thì server tự sinh token và in ra
```
- Dashboard (máy tính): `http://localhost:3000/?token=<token>`
- iPhone: `https://<host>:3000/sensor.html?token=<token>` → bấm **Bắt đầu gửi dữ liệu** → cho phép Chuyển động & Vị trí.

## Bắt buộc HTTPS cho iPhone
Safari chỉ cấp cảm biến/GPS trong *secure context*. Chọn một cách:
1. **Tunnel** (nhanh nhất): `cloudflared tunnel --url http://localhost:3000` hoặc `tailscale serve`, rồi dùng URL https đó trên iPhone.
2. **TLS cục bộ**: tạo chứng chỉ bằng `mkcert`, cài root CA lên iPhone, chạy `CERT=cert.pem KEY=key.pem npm start`.

## Giới hạn của iOS Safari
- Không đọc được % pin; Apple Health không truy cập được từ web (cần app Swift hoặc Shortcuts).
- Giữ màn hình sáng khi gửi (đã dùng Wake Lock nếu Safari hỗ trợ), nếu khóa máy Safari dừng cảm biến.

## Bảo mật
- WebSocket yêu cầu token (so sánh timing-safe); payload tối đa 4 KB, được kiểm tra khoảng giá trị ở `validate.js`.
- Không dùng token mặc định; đừng commit token. Khi mở ra Internet, luôn dùng HTTPS.

## Kiểm thử
`npm test`
