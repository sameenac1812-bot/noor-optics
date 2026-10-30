# NOOR OPTICS - PORTABLE POS PRINT DAEMON (v2.4.0)

Automated, high-speed Windows thermal receipt printing for 2.5-inch (58mm) printers.

## 🖨️ Key Features
- **2.5-Inch (58mm) Paper Width**: Precision 32-column formatting with zero clipping or horizontal overflow.
- **Single Customer Bill**: Prints a single, comprehensive customer invoice slip (no separate KOT slip).
- **Embedded Glasses Prescription (Rx)**: Complete OD/OS prescription table (SPH, CYL, AXIS, ADD, IPD, Optometrist) cleanly printed directly on the bill whenever an Rx is attached.
- **Dual Automatic Ingestion**:
  1. **Website Orders**: Automatically listens to the cloud event stream and prints incoming confirmed website orders in real time.
  2. **In-Store POS Orders**: Instant hardware printout as soon as cashier saves or completes checkout.
- **Yellow Frame QR Sticker Printing**: Supports direct thermal printing of scannable QR frame tags on 2.5-inch thermal paper with thermal bleed shaving.
- **Duplicate Print Prevention**: Persistent `.printed_orders.json` ensures an order is never automatically double-printed.
- **Dual Engine (Node.js & Native PowerShell)**: Runs on Node.js when available, or seamlessly falls back to native Windows PowerShell without any installation needed.

---

## 🚀 Quick Start (Windows 10/11)

1. Open the `pos-daemon` folder.
2. *(First Time Only)* Double-click `setup-printer.bat` to verify your thermal printer (default: `POS-80`).
3. Double-click `start-pos.bat` (or `START-POS-PRINT-DAEMON.bat` in the project root).
4. Keep the black daemon window open or minimized in the background during billing hours.

---

## 🛠️ Included Tools

- **`start-pos.bat`**: Automatic launcher with duplicate-prevention lock and watchdog auto-restart.
- **`setup-printer.bat`**: Scans and displays installed Windows printers and updates `config.json`.
- **`test-print.bat`**: Dispatches a 2.5-inch test receipt with sample prescription to verify your printer hardware.
- **`sample-order.json`**: Reference order payload for testing.
- **`print-order.ps1`**: Command-line order printer:
  ```powershell
  .\print-order.ps1 -OrderFile sample-order.json -PrinterName "POS-80"
  ```

---

## 🌐 Local REST API (Port 5001)

- `GET http://127.0.0.1:5001/api/status`: Health check & metrics.
- `GET http://127.0.0.1:5001/api/printers`: List of installed Windows printers.
- `POST http://127.0.0.1:5001/api/print`: Submit order JSON to print customer bill.
- `POST http://127.0.0.1:5001/api/printer/print-qr-sticker`: Submit frame QR sticker payload.
- `POST http://127.0.0.1:5001/api/test-print`: Print test receipt.

