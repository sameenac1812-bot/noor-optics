/**
 * pos-daemon.js – High-Performance Instant Thermal Print Daemon
 * 
 * 1. Exposes local REST API on http://127.0.0.1:5001/api/print for local web orders.
 * 2. Connects to ntfy.sh real-time SSE stream so orders placed from ANY mobile phone
 *    or remote device instantly print on the laptop's physical POS thermal printer!
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 5001;
const PRINTER_NAME = 'POS-80';
const CLOUD_TOPIC = 'subfresh_orders_live_v4_78637e1f';
const CLOUD_HOSTS = ['https://ntfy.adminforge.de', 'https://ntfy.tedomum.fr'];
let currentHostIdx = 0;

const CACHE_FILE = path.join(__dirname, '.printed_orders.json');
const printedOrders = new Set();

try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach(id => printedOrders.add(id));
      console.log(`[Cache] Loaded ${printedOrders.size} previously printed order records from disk.`);
    }
  }
} catch (e) {}

function persistPrintedOrders() {
  try {
    const arr = Array.from(printedOrders).slice(-500);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(arr), 'utf8');
  } catch (e) {}
}

let printCount = 0;

// ── Zero-Delay Persistent Print Worker ────────────────────────
let printerWorker = null;
let isWorkerReady = false;
const printQueue = [];
const pendingPrints = [];

function initWorker() {
  if (printerWorker) {
    try { printerWorker.kill(); } catch (e) {}
  }
  isWorkerReady = false;
  const scriptPath = path.join(__dirname, 'worker-printer.ps1');

  printerWorker = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-File', scriptPath,
    '-PrinterName', PRINTER_NAME
  ], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';
  printerWorker.stdout.on('data', data => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('WORKER_READY')) {
        isWorkerReady = true;
        const targetP = line.split(':')[1] || PRINTER_NAME;
        console.log(`[Printer] ⚡ Zero-Delay Instant Engine Ready on "${targetP}" (0ms latency)`);
        flushQueue();
      } else if (line.startsWith('PRINT_SUCCESS')) {
        const oid = line.split(':')[1];
        console.log(`[Printer] ✅ Instant Print Completed (0ms delay): #${oid}`);
        if (pendingPrints.length > 0) {
          const item = pendingPrints.shift();
          if (item && item.resolve) item.resolve({ success: true, orderId: oid });
        }
      } else if (line.startsWith('PRINT_FAIL') || line.startsWith('PRINT_ERROR')) {
        console.error(`[Printer] ❌ ${line}`);
        if (pendingPrints.length > 0) {
          const item = pendingPrints.shift();
          if (item && item.reject) item.reject(new Error(line));
        }
      }
    }
  });

  printerWorker.stderr.on('data', data => {
    const errText = data.toString().trim();
    if (errText) console.warn('[Printer Worker Stderr]:', errText);
  });

  printerWorker.on('exit', code => {
    console.warn(`[Printer Worker] Process closed (code ${code}). Re-initializing in 1s...`);
    isWorkerReady = false;
    setTimeout(initWorker, 1000);
  });
}

function flushQueue() {
  while (isWorkerReady && printQueue.length > 0) {
    const next = printQueue.shift();
    sendOrderToWorker(next);
  }
}

function sendOrderToWorker(item) {
  pendingPrints.push(item);
  try {
    const line = JSON.stringify(item.order).replace(/[\r\n]+/g, ' ') + '\n';
    printerWorker.stdin.write(line);
  } catch (err) {
    console.error('[Printer Write Error]:', err);
    if (item.reject) item.reject(err);
  }
}

// Start persistent worker immediately on daemon boot
initWorker();

// Auto-heal Windows print spooler on startup
try {
  const cleanCmd = `Get-PrintJob -PrinterName "${PRINTER_NAME}" -ErrorAction SilentlyContinue | Where-Object { $_.JobStatus -match "Error|Retained|UserIntervention" } | Remove-PrintJob -ErrorAction SilentlyContinue`;
  spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', cleanCmd], { windowsHide: true });
} catch (e) {}

function printOrder(order) {
  if (!order || !order.id) {
    console.warn('[Printer] Invalid order payload');
    return Promise.reject(new Error('Invalid order payload'));
  }

  // Skip stale replayed orders older than 60 minutes
  if (order.timestamp) {
    const ageSec = (Date.now() - new Date(order.timestamp).getTime()) / 1000;
    if (ageSec > 3600) {
      console.log(`[Printer] Skipping older order ${order.id} (${Math.round(ageSec)}s old).`);
      return Promise.resolve({ skipped: true, id: order.id, reason: 'stale' });
    }
  }

  if (printedOrders.has(order.id)) {
    console.log(`[Printer] Order ${order.id} already printed. Skipping duplicate.`);
    return Promise.resolve({ skipped: true, id: order.id });
  }

  printedOrders.add(order.id);
  persistPrintedOrders();
  printCount++;

  const tok = order.tokenId || order.id;
  const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;

  console.log(`\n========================================`);
  console.log(`⚡ PRINTING BILL INSTANTLY: TOKEN #${tokStr}`);
  console.log(`🪑 Table    : ${order.tableNumber || '—'} (${(order.serviceMode || 'dine-in').toUpperCase()})`);
  console.log(`💳 Payment  : ${(order.paymentMethod || 'cash').toUpperCase()}`);
  console.log(`💰 Total    : ₹${order.total}`);
  console.log(`========================================\n`);

  return new Promise((resolve, reject) => {
    const item = { order, resolve, reject };
    if (isWorkerReady) {
      sendOrderToWorker(item);
    } else {
      printQueue.push(item);
    }
  });
}

// ── HTTP API Server ───────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/api/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const order = JSON.parse(body);
        const result = await printOrder(order);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      printer: PRINTER_NAME,
      printedOrdersCount: printCount,
      cloudTopic: CLOUD_TOPIC,
      uptimeSec: Math.floor(process.uptime())
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[POS Daemon] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[POS Daemon] Target Printer: "${PRINTER_NAME}"`);

  // Hardware presence check
  try {
    const chk = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command',
      "((Get-Printer -Name 'POS-80' -ErrorAction SilentlyContinue) -ne $null) -or ((Get-PnpDevice | Where-Object { ($_.FriendlyName -match 'POS|Thermal' -or $_.InstanceId -like '*0483*') -and $_.Present }).Count -gt 0)"
    ]);
    chk.stdout.on('data', d => {
      const isPresent = d.toString().trim().toLowerCase() === 'true';
      if (!isPresent) {
        console.warn(`\n************************************************************`);
        console.warn(`[Printer Notice] ⚠️  THERMAL PRINTER POS-80 NOT DETECTED ON USB!`);
        console.warn(`[Printer Notice] 1. Turn ON the power switch on the thermal printer.`);
        console.warn(`[Printer Notice] 2. Ensure the USB cable is firmly plugged into laptop.`);
        console.warn(`************************************************************\n`);
      } else {
        console.log(`[Printer] 🟢 Thermal Printer POS-80 is Connected & Powered On.`);
      }
    });
  } catch (e) {}
});

// ── Cloud Real-Time Stream Listener (ntfy.sh SSE) ─────────────
let sseReq = null;

function connectCloudStream() {
  const host = CLOUD_HOSTS[currentHostIdx];
  const streamUrl = `${host}/${CLOUD_TOPIC}/sse`;
  console.log(`[CloudSync] Connecting to live order stream: ${streamUrl}`);

  try {
    sseReq = https.get(streamUrl, {
      headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' }
    }, res => {
      if (res.statusCode !== 200) {
        console.warn(`[CloudSync] SSE connection returned ${res.statusCode}. Retrying in 4s...`);
        currentHostIdx = (currentHostIdx + 1) % CLOUD_HOSTS.length;
        setTimeout(connectCloudStream, 4000);
        return;
      }

      console.log(`[CloudSync] 🟢 Connected (${host})! Listening for customer orders live.`);
      let buffer = '';

      res.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const envelope = JSON.parse(jsonStr);
            if (envelope.event === 'message' && envelope.message) {
              const msg = JSON.parse(envelope.message);
              if (msg.type === 'new_order' && msg.order) {
                const tok = msg.order.tokenId || msg.order.id;
                const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;
                console.log(`[CloudSync] 🔔 Received order from mobile/web: Token #${tokStr}`);
                printOrder(msg.order).catch(err => {
                  console.error('[CloudSync] Automatic print error:', err.message);
                });
              }
            }
          } catch (e) {
            // Ignore heartbeats or non-order events
          }
        }
      });

      res.on('end', () => {
        console.warn('[CloudSync] SSE stream disconnected. Reconnecting in 3s...');
        currentHostIdx = (currentHostIdx + 1) % CLOUD_HOSTS.length;
        setTimeout(connectCloudStream, 3000);
      });
    });

    sseReq.on('error', err => {
      console.warn('[CloudSync] Network error:', err.message, '. Reconnecting with backup host in 4s...');
      currentHostIdx = (currentHostIdx + 1) % CLOUD_HOSTS.length;
      setTimeout(connectCloudStream, 4000);
    });
  } catch (err) {
    console.error('[CloudSync] Stream setup exception:', err);
    currentHostIdx = (currentHostIdx + 1) % CLOUD_HOSTS.length;
    setTimeout(connectCloudStream, 4000);
  }
}

connectCloudStream();
