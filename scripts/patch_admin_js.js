const fs = require('fs');
const path = require('path');

const adminJsPath = path.join(__dirname, '..', 'admin.js');
let code = fs.readFileSync(adminJsPath, 'utf8');

// 1. Update switchNav allowedNavs and titles
if (!code.includes("'diagnostics'")) {
  code = code.replace(
    "const allowedNavs = ['dashboard', 'orders', 'inventory', 'pos'];",
    "const allowedNavs = ['dashboard', 'orders', 'inventory', 'pos', 'diagnostics'];"
  );
}

if (!code.includes("diagnostics: { title: 'System Diagnostics & Spooler Queue'")) {
  const targetTitle = `pos: { title: 'In-Store POS Register', sub: 'Cashier checkout, optical frame camera scanning & tax billing' }
    };`;
  const replacementTitle = `pos: { title: 'In-Store POS Register', sub: 'Cashier checkout, optical frame camera scanning & tax billing' },
      diagnostics: { title: 'System Diagnostics & Spooler Queue', sub: 'Supabase cloud synchronization, Realtime event multiplexer & thermal print spooler' }
    };`;
  code = code.replace(targetTitle, replacementTitle);
}

if (!code.includes("else if (navKey === 'diagnostics')")) {
  const targetNavTrigger = `} else if (navKey === 'pos') {
      loadPosCatalog();
    }`;
  const replacementNavTrigger = `} else if (navKey === 'pos') {
      loadPosCatalog();
    } else if (navKey === 'diagnostics') {
      loadDiagnostics();
    }`;
  code = code.replace(targetNavTrigger, replacementNavTrigger);
}

// 2. Update getOrderChannel to strictly honor database source field
const targetGetOrderChannel = `function getOrderChannel(o) {
    if (!o) return 'POS';
    const ref = String(o.order_number || o.order_ref || o.orderNumber || o.invoiceNumber || o.id || '').toUpperCase();
    if (ref.includes('-POS-')) return 'POS';
    if (ref.includes('-WEB-') || ref.includes('-ONL-')) return 'WEBSITE';
    if (o.channel === 'POS' || o.channel === 'IN-STORE') return 'POS';
    if (o.channel === 'ONLINE' || o.channel === 'WEBSITE') return 'WEBSITE';
    if (Array.isArray(o.items) && o.items[0]?.channel) {
      return (o.items[0].channel === 'POS' || o.items[0].channel === 'IN-STORE') ? 'POS' : 'WEBSITE';
    }
    if (o.delivery_address && /pos|boutique|flagship|store|rethibowli|counter|in-store/i.test(o.delivery_address)) return 'POS';
    return 'WEBSITE';
  }`;

const replacementGetOrderChannel = `function getOrderChannel(o) {
    if (!o) return 'POS';
    // STRICT SOURCE RESOLVER (Authoritative database-level dual pipeline separation)
    if (o.source === 'website' || o.source === 'WEBSITE') return 'WEBSITE';
    if (o.source === 'instore' || o.source === 'pos' || o.source === 'INSTORE') return 'POS';
    const ref = String(o.order_number || o.order_ref || o.orderNumber || o.invoiceNumber || o.id || '').toUpperCase();
    if (ref.includes('-POS-') || ref.includes('POS')) return 'POS';
    if (ref.includes('-WEB-') || ref.includes('-ONL-') || ref.includes('ONLINE')) return 'WEBSITE';
    if (o.channel === 'POS' || o.channel === 'IN-STORE') return 'POS';
    if (o.channel === 'ONLINE' || o.channel === 'WEBSITE') return 'WEBSITE';
    if (Array.isArray(o.items) && o.items[0]?.channel) {
      return (o.items[0].channel === 'POS' || o.items[0].channel === 'IN-STORE') ? 'POS' : 'WEBSITE';
    }
    if (o.delivery_address && /pos|boutique|flagship|store|rethibowli|counter|in-store/i.test(o.delivery_address)) return 'POS';
    return 'WEBSITE';
  }`;

code = code.replace(targetGetOrderChannel, replacementGetOrderChannel);

// 3. Remove duplicate playOrderChime from loadOrders
const targetLoadOrdersAudio = `      // Real-time detection of new incoming orders (customer mobile storefront or in-store POS)
      if (!state.hasInitializedOrders) {
        incoming.forEach(o => state.knownOrderIds.add(o.id));
        state.hasInitializedOrders = true;
      } else {
        const brandNewOrders = incoming.filter(o => !state.knownOrderIds.has(o.id));
        if (brandNewOrders.length > 0) {
          brandNewOrders.forEach(o => state.knownOrderIds.add(o.id));
          const latest = brandNewOrders[0];

          // 1. Play audible boutique chime
          playOrderChime();

          // 2. Flash live notification toast only when not currently in an active sale completion modal
          const isSuccessModalOpen = document.getElementById('modal-order-success')?.classList.contains('open');
          if (!isSuccessModalOpen && latest) {
            showToast(\`🔔 New Order Placed: #\${latest.order_number} by \${latest.customer_name || 'Client'}\`, 'success');
          }
          // Note: Automatic bill printing is handled directly by the POS Daemon listening to Supabase Cloud
          // (Calling instantPrintReceipt here causes double prints).
        }
      }`;

const replacementLoadOrdersAudio = `      // Record known order IDs quietly. Audio chime is handled centrally by NoorSupabase.realtime event stream.
      if (!state.hasInitializedOrders) {
        incoming.forEach(o => state.knownOrderIds.add(o.id));
        state.hasInitializedOrders = true;
      } else {
        incoming.forEach(o => state.knownOrderIds.add(o.id));
      }`;

code = code.replace(targetLoadOrdersAudio, replacementLoadOrdersAudio);

// 4. Update POS checkout completion to NOT call instantPrintReceipt twice
const targetPosCheckoutInstantPrint = `          // Instant automatic bill printout with complete embedded prescription
          if (res.orderId) {
            const subtotalFromCart = (subtotalPaiseSnapshot > 0) ? (subtotalPaiseSnapshot / 100) : res.totalPayableINR;
            const fullOrderSnapshot = {
              id: res.orderId,
              order_number: res.orderNumber || res.invoiceNumber,
              token_number: res.tokenNumber,
              customer_name: payload.customerName || 'Walk-in Client',
              customer_phone: payload.customerPhone,
              channel: 'IN-STORE',
              items: cartSnapshot.map(i => ({
                product_name: i.name || i.product_name || i.model || 'Optical Frame',
                name: i.name || i.product_name || 'Optical Frame',
                sku: i.sku || 'NOOR-FRAME',
                variant_name: i.color || i.colorName || i.variantName || 'Standard',
                color: i.color || i.colorName || 'Standard',
                lens_name: i.lensName || 'Standard Demo Lens',
                quantity: i.quantity || 1,
                unit_price_inr: (i.priceINR != null) ? Number(i.priceINR) : ((i.pricePaise || 0) / 100),
                subtotal_inr: (i.lineTotalINR != null) ? Number(i.lineTotalINR) : (((i.pricePaise || 0) * (i.quantity || 1)) / 100)
              })),
              subtotal_inr: subtotalFromCart,
              discount_inr: discountINR,
              total_payable_inr: res.totalPayableINR,
              amount_paid_inr: res.totalPayableINR,
              payment_method: state.posPaymode,
              prescription: rxSnapshot,
              ...(rxSnapshot || {})
            };
            instantPrintReceipt(res.orderId, false, fullOrderSnapshot);
          }`;

const replacementPosCheckoutInstantPrint = `          // Print job is created atomically in durable print_jobs table.
          // The POS Daemon worker automatically claims and processes it via Realtime wake-up signal.
          if (res.orderId) {
            showToast(\`🖨️ Bill #\${res.orderNumber || res.invoiceNumber} queued for thermal printing.\`, 'info');
          }`;

code = code.replace(targetPosCheckoutInstantPrint, replacementPosCheckoutInstantPrint);

// 5. Update deleteOrderPrompt to wait for database confirmation before removing from state
const targetDeleteOrderPrompt = `      // Optimistically remove from UI
      state.ordersCache = state.ordersCache.filter(o => o.id !== orderId && o.order_number !== orderNumber);
      renderOrdersTable();

      // Direct cloud deletion
      await directDeleteSupabaseOrder(orderNumber);

      const res = await apiFetch(\`/api/orders/\${orderId}\`, {
        method: 'DELETE'
      });
      showToast(res.message || \`Order \${orderNumber} deleted successfully.\`, 'success');`;

const replacementDeleteOrderPrompt = `      // Delete from Supabase cloud database first with confirmation
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        const cloudRes = await window.NoorSupabase.deleteOrder(orderId || orderNumber);
        if (!cloudRes.success) {
          throw new Error(cloudRes.error || 'Supabase delete rejection');
        }
      }

      // Delete from local backend if available
      try {
        await apiFetch(\`/api/orders/\${orderId}\`, { method: 'DELETE' });
      } catch (_) {}

      // Confirmed by Supabase: remove from UI state
      state.ordersCache = state.ordersCache.filter(o => o.id !== orderId && o.order_number !== orderNumber);
      renderOrdersTable();
      showToast(\`Order \${orderNumber} permanently deleted.\`, 'success');`;

code = code.replace(targetDeleteOrderPrompt, replacementDeleteOrderPrompt);

// 6. Add requestManualReprint, loadDiagnostics, retryPrintJob, testReceiptPrint
if (!code.includes('window.requestManualReprint =')) {
  const diagnosticsFunctions = `
  // ── Authorized Manual Reprint Handler ──────────────────────────────────────
  window.requestManualReprint = async function (orderId, defaultReason = 'Staff requested reprint') {
    if (!orderId) return;
    const order = (state.ordersCache || []).find(o => o.id === orderId || o.order_number === orderId);
    const orderRef = order?.order_number || order?.id || orderId;
    const requestedBy = prompt(\`Authorized Reprint for Order #\${orderRef}\\nEnter Staff Name:\`, 'Counter Staff');
    if (!requestedBy) return;
    const reason = prompt(\`Enter reason for reprint:\`, 'Customer requested duplicate receipt') || defaultReason;

    showToast(\`Submitting reprint request for #\${orderRef}...\`, 'info');
    try {
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        const res = await window.NoorSupabase.reprintOrder(order?.id || orderId, requestedBy, reason);
        if (res && res.success) {
          showToast(\`🖨️ Authorized reprint queued in print_jobs table.\`, 'success');
          if (state.activeNav === 'diagnostics') loadDiagnostics(true);
          return;
        }
      }

      // Fallback: direct daemon reprint endpoint
      const resp = await fetch(\`http://127.0.0.1:5001/api/printer/orders/\${encodeURIComponent(order?.id || orderId)}/reprint\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_by: requestedBy, reason })
      });
      if (resp.ok) {
        showToast(\`🖨️ Reprint submitted to Windows thermal spooler.\`, 'success');
        if (state.activeNav === 'diagnostics') loadDiagnostics(true);
      } else {
        showToast(\`Reprint failed: \${await resp.text()}\`, 'error');
      }
    } catch (err) {
      showToast(\`Reprint error: \${err.message}\`, 'error');
    }
  };

  // ── Print Job Retry Action ─────────────────────────────────────────────────
  window.retryPrintJob = async function (jobId) {
    if (!jobId) return;
    try {
      showToast(\`Retrying print job \${jobId.slice(0, 8)}...\`, 'info');
      const resp = await fetch(\`http://127.0.0.1:5001/api/printer/jobs/\${encodeURIComponent(jobId)}/retry\`, {
        method: 'POST'
      });
      if (resp.ok) {
        showToast('Print job reset to queued. Worker will process it immediately.', 'success');
        loadDiagnostics(true);
      } else {
        showToast(\`Retry failed: \${await resp.text()}\`, 'error');
      }
    } catch (e) {
      showToast(\`Error retrying job: \${e.message}\`, 'error');
    }
  };

  // ── Diagnostics Test Receipt Print ─────────────────────────────────────────
  window.testReceiptPrint = async function () {
    try {
      showToast('Sending diagnostic test slip to POS thermal printer...', 'info');
      const resp = await fetch('http://127.0.0.1:5001/api/test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receipt' })
      });
      if (resp.ok) {
        showToast('Diagnostic test slip sent to printer spooler!', 'success');
        loadDiagnostics(true);
      } else {
        showToast(\`Test print error: \${await resp.text()}\`, 'error');
      }
    } catch (e) {
      showToast(\`Cannot reach print daemon on port 5001: \${e.message}\`, 'error');
    }
  };

  // ── Diagnostics & Durable Print Queue Loader ──────────────────────────────
  async function loadDiagnostics(silent = false) {
    try {
      const dbStatusEl = document.getElementById('diag-db-status');
      const dbBadgeEl = document.getElementById('diag-db-badge');
      const dbLastSyncEl = document.getElementById('diag-last-sync-time');
      const realtimeStatusEl = document.getElementById('diag-realtime-status');
      const realtimeBadgeEl = document.getElementById('diag-realtime-badge');
      const daemonStatusEl = document.getElementById('diag-daemon-status');
      const daemonBadgeEl = document.getElementById('diag-daemon-badge');
      const daemonSubEl = document.getElementById('diag-daemon-sub');
      const printerStatusEl = document.getElementById('diag-printer-status');
      const printerBadgeEl = document.getElementById('diag-printer-badge');
      const printerLastPrintEl = document.getElementById('diag-last-print-time');

      const countQueuedEl = document.getElementById('count-jobs-queued');
      const countProcEl = document.getElementById('count-jobs-processing');
      const countFailedEl = document.getElementById('count-jobs-failed');
      const countUncertainEl = document.getElementById('count-jobs-uncertain');
      const queueTbody = document.getElementById('diag-queue-table-body');

      // 1. Check Supabase DB & Print Queue Stats
      let queueStats = { pending: 0, processing: 0, failed: 0, uncertain: 0, completed: 0, recent_jobs: [] };
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        try {
          queueStats = await window.NoorSupabase.fetchPrintQueueStats();
          if (dbStatusEl) dbStatusEl.textContent = 'Connected (Cloud)';
          if (dbBadgeEl) dbBadgeEl.style.background = '#10B981';
          if (dbLastSyncEl) dbLastSyncEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (dbErr) {
          if (dbStatusEl) dbStatusEl.textContent = 'Degraded';
          if (dbBadgeEl) dbBadgeEl.style.background = '#F59E0B';
        }
      }

      // 2. Realtime Multiplexer Status
      const rtManager = window.NoorSupabase?.realtime;
      if (rtManager && rtManager.channel) {
        if (realtimeStatusEl) realtimeStatusEl.textContent = 'Active (Multiplexed)';
        if (realtimeBadgeEl) realtimeBadgeEl.style.background = '#10B981';
      } else {
        if (realtimeStatusEl) realtimeStatusEl.textContent = 'Connected (Polling)';
        if (realtimeBadgeEl) realtimeBadgeEl.style.background = '#3B82F6';
      }

      // 3. POS Print Daemon Status
      try {
        const dResp = await fetch('http://127.0.0.1:5001/api/status', { signal: AbortSignal.timeout(2500) });
        if (dResp.ok) {
          const dData = await dResp.json();
          if (daemonStatusEl) daemonStatusEl.textContent = 'Online & Active';
          if (daemonBadgeEl) daemonBadgeEl.style.background = '#10B981';
          if (daemonSubEl) daemonSubEl.textContent = \`Worker: \${dData.is_worker_active ? 'Processing' : 'Idle'} • Polling 8s\`;

          if (dData.printer) {
            if (printerStatusEl) printerStatusEl.textContent = dData.printer.connected ? \`\${dData.printer.name || 'POS-80'} (Ready)\` : 'Offline / Error';
            if (printerBadgeEl) printerBadgeEl.style.background = dData.printer.connected ? '#10B981' : '#EF4444';
          }
          if (dData.last_successful_print && printerLastPrintEl) {
            printerLastPrintEl.textContent = new Date(dData.last_successful_print).toLocaleTimeString('en-IN');
          }
        } else {
          throw new Error('Non-200 status');
        }
      } catch (_) {
        if (daemonStatusEl) daemonStatusEl.textContent = 'Offline (Port 5001)';
        if (daemonBadgeEl) daemonBadgeEl.style.background = '#EF4444';
        if (printerStatusEl) printerStatusEl.textContent = 'Daemon Unreachable';
        if (printerBadgeEl) printerBadgeEl.style.background = '#94A3B8';
      }

      // 4. Update Queue Metric Counters
      if (countQueuedEl) countQueuedEl.textContent = queueStats.pending || 0;
      if (countProcEl) countProcEl.textContent = queueStats.processing || 0;
      if (countFailedEl) countFailedEl.textContent = queueStats.failed || 0;
      if (countUncertainEl) countUncertainEl.textContent = queueStats.uncertain || 0;

      const sidebarQueueBadge = document.getElementById('sidebar-queue-badge');
      const alertCount = (queueStats.failed || 0) + (queueStats.uncertain || 0);
      if (sidebarQueueBadge) {
        sidebarQueueBadge.textContent = alertCount;
        sidebarQueueBadge.style.display = alertCount > 0 ? 'inline-block' : 'none';
      }

      // 5. Render Print Queue Table
      if (queueTbody) {
        const jobs = queueStats.recent_jobs || [];
        if (jobs.length === 0) {
          queueTbody.innerHTML = \`<tr><td colspan="7" style="padding:2rem; text-align:center; color:#94A3B8;">No print jobs recorded in durable queue.</td></tr>\`;
        } else {
          queueTbody.innerHTML = jobs.map(j => {
            const statusColors = {
              queued: 'background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE;',
              claimed: 'background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;',
              printing: 'background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;',
              completed: 'background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;',
              failed: 'background:#FEF2F2; color:#991B1B; border:1px solid #FECACA;',
              uncertain: 'background:#F5F3FF; color:#5B21B6; border:1px solid #DDD6FE;'
            };
            const sStyle = statusColors[j.status] || 'background:#F1F5F9; color:#475569;';
            const shortId = (j.id || '').slice(0, 8);
            const orderRef = j.order_ref || j.order_number || (j.order_id ? j.order_id.slice(0, 8) : '-');
            const leaseExp = j.lease_expires_at ? new Date(j.lease_expires_at).toLocaleTimeString('en-IN') : '-';
            const lastErr = j.last_error ? escapeHtml(String(j.last_error).slice(0, 60)) : (j.spooler_job_id ? \`Spooler #\${j.spooler_job_id}\` : '-');

            return \`
              <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:10px 12px;">
                  <strong style="font-family:monospace; color:#0F172A;">\${shortId}</strong>
                  <div style="font-size:0.72rem; color:#64748B;">Order: \${escapeHtml(orderRef)}</div>
                </td>
                <td style="padding:10px 12px;">
                  <span style="font-weight:700; color:#334155;">\${escapeHtml(j.print_type || 'receipt').toUpperCase()}</span>
                </td>
                <td style="padding:10px 12px;">
                  <span style="display:inline-block; padding:3px 8px; border-radius:99px; font-weight:800; font-size:0.72rem; text-transform:uppercase; \${sStyle}">
                    \${escapeHtml(j.status || 'queued')}
                  </span>
                </td>
                <td style="padding:10px 12px; font-weight:700;">\${j.attempt_count || 0}</td>
                <td style="padding:10px 12px; font-size:0.75rem; color:#64748B;">
                  \${j.claimed_at ? \`Claimed: \${new Date(j.claimed_at).toLocaleTimeString('en-IN')}\` : 'Unclaimed'}
                  \${j.lease_expires_at ? \`<br/>Lease: \${leaseExp}\` : ''}
                </td>
                <td style="padding:10px 12px; font-size:0.72rem; color:#DC2626; max-width:220px; word-break:break-word;">
                  \${lastErr}
                </td>
                <td style="padding:10px 12px; text-align:right;">
                  \${(j.status === 'failed' || j.status === 'uncertain') ? \`
                    <button type="button" class="btn-table-action" onclick="retryPrintJob('\${j.id}')" style="padding:4px 8px; font-size:0.72rem; background:#FEF3C7; color:#92400E; font-weight:700; border-radius:6px; cursor:pointer;">⚡ Retry</button>
                  \` : \`
                    <button type="button" class="btn-table-action" onclick="requestManualReprint('\${j.order_id}')" style="padding:4px 8px; font-size:0.72rem; background:#F8FAFC; color:#334155; font-weight:700; border-radius:6px; cursor:pointer;">Reprint</button>
                  \`}
                </td>
              </tr>
            \`;
          }).join('');
        }
      }
    } catch (err) {
      if (!silent) console.warn('Diagnostics load note:', err);
    }
  }
`;

  // Insert before checkDaemonStatus
  code = code.replace(
    '  // ── POS Print Daemon Health Monitor (Port 5001) ───────────────────────────',
    diagnosticsFunctions + '\n  // ── POS Print Daemon Health Monitor (Port 5001) ───────────────────────────'
  );
}

// 7. Wire Centralized Realtime Manager and Header Badge in initialization
if (!code.includes('NoorSupabase.realtime.onOrderEvent')) {
  const initTarget = `    // Verify session
    checkExistingAuth();`;

  const initReplacement = `    // Wire Header Badge to Open Diagnostics & Spooler Queue
    const daemonBadge = document.getElementById('daemon-status-badge');
    if (daemonBadge) {
      daemonBadge.style.cursor = 'pointer';
      daemonBadge.addEventListener('click', () => switchNav('diagnostics'));
    }

    // Wire Diagnostics Section Action Buttons
    document.getElementById('btn-diag-refresh')?.addEventListener('click', () => loadDiagnostics());
    document.getElementById('btn-diag-retry-failed')?.addEventListener('click', async () => {
      showToast('Retrying all failed and uncertain print jobs...', 'info');
      try {
        const stats = await window.NoorSupabase?.fetchPrintQueueStats();
        const retryable = (stats?.recent_jobs || []).filter(j => j.status === 'failed' || j.status === 'uncertain');
        for (const j of retryable) {
          await window.retryPrintJob(j.id);
        }
        loadDiagnostics(true);
      } catch (e) {
        showToast('Retry batch failed: ' + e.message, 'error');
      }
    });
    document.getElementById('btn-diag-manual-reprint')?.addEventListener('click', () => {
      const orderRef = prompt('Enter Order Number or Permanent UUID to reprint:');
      if (orderRef) window.requestManualReprint(orderRef.trim());
    });
    document.getElementById('btn-diag-test-print')?.addEventListener('click', () => window.testReceiptPrint());
    document.getElementById('btn-diag-clear-log')?.addEventListener('click', () => {
      const logBox = document.getElementById('diag-event-log-container');
      if (logBox) logBox.innerHTML = '<div style="color:#94A3B8;">[Cleared] Listening for new events...</div>';
    });

    // Wire Centralized Realtime Notification Manager (Single Listener, Deduplicated Chimes)
    if (window.NoorSupabase && window.NoorSupabase.realtime) {
      window.NoorSupabase.realtime.init();
      window.NoorSupabase.realtime.onOrderEvent(({ eventType, new: record, isNewAudioEligible }) => {
        const logBox = document.getElementById('diag-event-log-container');
        if (logBox) {
          const item = document.createElement('div');
          item.style.padding = '2px 0';
          item.textContent = \`[\${new Date().toLocaleTimeString('en-IN')}] ORDER \${eventType}: #\${record?.order_number || record?.id || 'Unknown'} (\${record?.source || record?.channel || 'dual-pipeline'})\`;
          logBox.appendChild(item);
          logBox.scrollTop = logBox.scrollHeight;
        }

        if (eventType === 'INSERT') {
          if (isNewAudioEligible) {
            playOrderChime();
            showToast(\`🔔 New Order: #\${record?.order_number || record?.id} by \${record?.customer_name || 'Client'}\`, 'success');
          }
          loadOrders(true);
        } else if (eventType === 'UPDATE' || eventType === 'DELETE') {
          loadOrders(true);
        }
      });

      window.NoorSupabase.realtime.onPrintJobEvent(({ eventType, new: job }) => {
        const logBox = document.getElementById('diag-event-log-container');
        if (logBox) {
          const item = document.createElement('div');
          item.style.padding = '2px 0';
          item.style.color = job?.status === 'failed' ? '#FCA5A5' : (job?.status === 'completed' ? '#86EFAC' : '#93C5FD');
          item.textContent = \`[\${new Date().toLocaleTimeString('en-IN')}] PRINT_JOB \${eventType}: #\${job?.id?.slice(0, 8)} (\${job?.print_type}) -> Status: \${job?.status}\`;
          logBox.appendChild(item);
          logBox.scrollTop = logBox.scrollHeight;
        }
        if (state.activeNav === 'diagnostics') {
          loadDiagnostics(true);
        }
      });
    }

    // Verify session
    checkExistingAuth();`;

  code = code.replace(initTarget, initReplacement);
}

fs.writeFileSync(adminJsPath, code, 'utf8');
console.log('admin.js successfully patched.');

