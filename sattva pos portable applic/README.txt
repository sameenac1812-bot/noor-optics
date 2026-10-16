================================================================================
   SATTVA TIFFINS – STANDALONE POS THERMAL PRINTER PACKAGE
   Zero-Install / Works on ANY Windows 10/11 Laptop without IDE or Node.js
================================================================================

HOW TO USE ON ANOTHER LAPTOP (E.G. COUNTER / CASHIER LAPTOP):
--------------------------------------------------------------------------------

STEP 1: COPY THIS ENTIRE FOLDER
   Copy this "sattva pos portable applic" folder to the other laptop 
   (e.g., to Desktop or C:\SattvaPOS) using a pen drive, Google Drive, or LAN.

STEP 2: PLUG IN THE THERMAL PRINTER
   Plug your 80mm thermal receipt printer into any USB port on that laptop.
   Make sure it is powered on with paper loaded.

STEP 3: TEST THE PRINTER
   Double-click:  TEST-PRINTER.bat   (or test-print.bat)
   -> It shows all detected printers, USB ports, and sends an immediate test bill.
   -> If the test customer bill and kitchen token slip print immediately, 
      you are 100% ready!
   -> If the printer is NOT detected on this laptop:
      1. Right-click "setup-printer.bat" -> Select "Run as administrator".
      2. Press 1 to Auto-Detect the USB port (USB001/USB002) and setup POS-80.
      3. Run TEST-PRINTER.bat again to verify.

STEP 4: START AUTOMATIC LIVE PRINTING
   Double-click:  start-pos.bat
   -> A clean black console window will open showing:
      "🟢 LIVE & READY! Listening for orders from customers..."
   
   Leave this window open in the background!
   Whenever ANY customer scans the QR code or orders online from their phone,
   the bill and kitchen token slip will AUTOMATICALLY print out right away!

--------------------------------------------------------------------------------
FILES INCLUDED:
- start-pos.bat       : 1-Click launcher (runs native Windows engine, no install)
- test-print.bat      : 1-Click test print to verify printer connection
- setup-printer.bat   : Helper to view or configure Windows printer drivers
- print-order.ps1     : Exact bill layout & ESC/POS cutter
- pos-daemon.ps1      : Pure Windows cloud stream receiver
- pos-daemon.js       : Node.js version (optional, used if Node is installed)
- images/             : Contains sattva_logo_escpos.bin for sharp logo printing
================================================================================
