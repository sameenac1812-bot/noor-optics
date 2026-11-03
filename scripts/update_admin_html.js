const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
let content = fs.readFileSync(adminHtmlPath, 'utf8');

// 1. Add sidebar nav item if not already present
if (!content.includes('id="nav-btn-diagnostics"')) {
  const targetSidebar = `<div class="nav-item" data-nav="pos" id="nav-btn-pos" title="Cashier Register, Camera QR Scanner & Billing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="14" x2="6.01" y2="14"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
          <span>In-store POS</span>
        </div>`;

  const newSidebarItem = `${targetSidebar}

        <!-- 5. System Diagnostics & Print Queue -->
        <div class="nav-item" data-nav="diagnostics" id="nav-btn-diagnostics" title="System Health, Dual Pipeline Diagnostics & Print Spooler Queue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>Diagnostics &amp; Queue</span>
          <span class="nav-item-badge" id="sidebar-queue-badge" style="display:none; background:#DC2626;">0</span>
        </div>`;

  content = content.replace(targetSidebar, newSidebarItem);
  console.log('Sidebar nav item added.');
}

// 2. Add mobile bottom nav item if not already present
if (!content.includes('id="mob-nav-diagnostics"')) {
  const targetMobNav = `<button type="button" class="mob-nav-item" data-nav="pos" id="mob-nav-pos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="14" x2="6.01" y2="14"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
      <span>POS Register</span>
    </button>`;

  const newMobItem = `${targetMobNav}
    <button type="button" class="mob-nav-item" data-nav="diagnostics" id="mob-nav-diagnostics">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <span>Diagnostics</span>
    </button>`;

  content = content.replace(targetMobNav, newMobItem);
  console.log('Mobile bottom nav item added.');
}

// 3. Add view-diagnostics section after view-pos if not already present
if (!content.includes('id="view-diagnostics"')) {
  const posSectionEnd = `              <button type="button" class="btn-optic-save" id="btn-pos-confirm-checkout" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" id="pos-checkout-btn-icon"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span id="pos-btn-checkout-label">Save Bill &amp; Print</span>
              </button>
            </div>

          </div>
        </section>`;

  const diagnosticsSection = `
        <!-- ═════════════════════════════════════════════════════════════════ -->
        <!-- 5. VIEW: DIAGNOSTICS & DURABLE PRINT QUEUE                       -->
        <!-- ═════════════════════════════════════════════════════════════════ -->
        <section class="view-section" id="view-diagnostics">
          <div class="optic-diagnostics-wrap" style="max-width:1400px; margin:0 auto; padding:1.5rem 1rem;">
            
            <!-- Top Controls & Realtime Status Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.25rem 1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
              <div>
                <h2 style="margin:0; font-size:1.35rem; font-weight:800; color:#0F172A; display:flex; align-items:center; gap:8px;">
                  <span>⚙️ System Diagnostics &amp; Spooler Queue</span>
                  <span style="font-size:0.75rem; font-weight:700; background:#EFF6FF; color:#1D4ED8; padding:3px 8px; border-radius:99px; border:1px solid #BFDBFE;">v11.1 Enterprise</span>
                </h2>
                <div style="font-size:0.82rem; color:#64748B; margin-top:4px;">
                  Authoritative health monitor for Supabase cloud sync, Realtime multiplexer, dual pipelines, and portable print daemon.
                </div>
              </div>

              <!-- Diagnostic Action Buttons -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <button type="button" class="btn-table-action" id="btn-diag-refresh" style="padding:7px 14px; background:#F8FAFC; border:1px solid #CBD5E1; color:#334155; font-weight:700; border-radius:8px; cursor:pointer;">
                  🔄 Refresh Status
                </button>
                <button type="button" class="btn-table-action" id="btn-diag-retry-failed" style="padding:7px 14px; background:#FEF3C7; border:1px solid #FDE68A; color:#92400E; font-weight:700; border-radius:8px; cursor:pointer;">
                  ⚡ Retry Failed Jobs
                </button>
                <button type="button" class="btn-table-action" id="btn-diag-manual-reprint" style="padding:7px 14px; background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-weight:700; border-radius:8px; cursor:pointer;">
                  🖨️ Authorized Reprint
                </button>
                <button type="button" class="btn-table-action" id="btn-diag-test-print" style="padding:7px 14px; background:#0F172A; border:1px solid #0F172A; color:#FFFFFF; font-weight:700; border-radius:8px; cursor:pointer;">
                  🧪 Test Receipt Print
                </button>
              </div>
            </div>

            <!-- Health Status Indicators Grid -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
              
              <!-- Supabase Cloud DB -->
              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.1rem 1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.8rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Cloud Database</span>
                  <span id="diag-db-badge" style="width:10px; height:10px; border-radius:50%; background:#10B981; display:inline-block;" title="Database Active"></span>
                </div>
                <div style="font-size:1.15rem; font-weight:800; color:#0F172A;" id="diag-db-status">Connected</div>
                <div style="font-size:0.75rem; color:#64748B; margin-top:4px;" id="diag-db-sub">Last Sync: <span id="diag-last-sync-time">Just now</span></div>
              </div>

              <!-- Realtime WebSocket -->
              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.1rem 1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.8rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Realtime Multiplexer</span>
                  <span id="diag-realtime-badge" style="width:10px; height:10px; border-radius:50%; background:#10B981; display:inline-block;" title="Realtime Active"></span>
                </div>
                <div style="font-size:1.15rem; font-weight:800; color:#0F172A;" id="diag-realtime-status">Subscribed</div>
                <div style="font-size:0.75rem; color:#64748B; margin-top:4px;" id="diag-realtime-sub">Single multiplexed channel</div>
              </div>

              <!-- Windows Print Daemon (Port 5001) -->
              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.1rem 1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.8rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Windows Daemon</span>
                  <span id="diag-daemon-badge" style="width:10px; height:10px; border-radius:50%; background:#94A3B8; display:inline-block;" title="Daemon Status"></span>
                </div>
                <div style="font-size:1.15rem; font-weight:800; color:#0F172A;" id="diag-daemon-status">Checking...</div>
                <div style="font-size:0.75rem; color:#64748B; margin-top:4px;" id="diag-daemon-sub">Port 5001 • Single Worker Mutex</div>
              </div>

              <!-- Thermal POS Printer (POS-80) -->
              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.1rem 1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.8rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">POS-80 Printer</span>
                  <span id="diag-printer-badge" style="width:10px; height:10px; border-radius:50%; background:#94A3B8; display:inline-block;" title="Printer Status"></span>
                </div>
                <div style="font-size:1.15rem; font-weight:800; color:#0F172A;" id="diag-printer-status">Detecting...</div>
                <div style="font-size:0.75rem; color:#64748B; margin-top:4px;" id="diag-printer-sub">Last Print: <span id="diag-last-print-time">None</span></div>
              </div>

            </div>

            <!-- Print Queue Metrics Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
              
              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; padding:1rem; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748B; text-transform:uppercase;">Queued Jobs</div>
                <div style="font-size:1.8rem; font-weight:900; color:#2563EB; margin:4px 0;" id="count-jobs-queued">0</div>
                <div style="font-size:0.72rem; color:#64748B;">Ready to be claimed</div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; padding:1rem; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748B; text-transform:uppercase;">Processing</div>
                <div style="font-size:1.8rem; font-weight:900; color:#D97706; margin:4px 0;" id="count-jobs-processing">0</div>
                <div style="font-size:0.72rem; color:#64748B;">Leased by active worker</div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; padding:1rem; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748B; text-transform:uppercase;">Failed Jobs</div>
                <div style="font-size:1.8rem; font-weight:900; color:#DC2626; margin:4px 0;" id="count-jobs-failed">0</div>
                <div style="font-size:0.72rem; color:#64748B;">Eligible for retry</div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; padding:1rem; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748B; text-transform:uppercase;">Uncertain Status</div>
                <div style="font-size:1.8rem; font-weight:900; color:#7C3AED; margin:4px 0;" id="count-jobs-uncertain">0</div>
                <div style="font-size:0.72rem; color:#64748B;">Duplicate suppression active</div>
              </div>

            </div>

            <!-- Print Spooler Queue Table -->
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0F172A; display:flex; align-items:center; gap:6px;">
                  <span>📋 Persistent Print Queue (\`print_jobs\`)</span>
                </h3>
                <span style="font-size:0.75rem; color:#64748B;">Auto-refreshed via Realtime wake-up</span>
              </div>

              <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                  <thead>
                    <tr style="border-bottom:2px solid #E2E8F0; color:#475569; font-weight:700;">
                      <th style="padding:10px 12px;">Job ID / Order</th>
                      <th style="padding:10px 12px;">Pipeline / Type</th>
                      <th style="padding:10px 12px;">Status</th>
                      <th style="padding:10px 12px;">Attempts</th>
                      <th style="padding:10px 12px;">Lease / Claim</th>
                      <th style="padding:10px 12px;">Spooler / Last Error</th>
                      <th style="padding:10px 12px; text-align:right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="diag-queue-table-body">
                    <tr>
                      <td colspan="7" style="padding:2rem; text-align:center; color:#94A3B8;">Loading durable print queue records...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Diagnostics Event Log & Error Audit Feed -->
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:1.25rem 1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0F172A; display:flex; align-items:center; gap:6px;">
                  <span>📜 Real-Time Diagnostics Log</span>
                </h3>
                <button type="button" class="btn-table-action" id="btn-diag-clear-log" style="font-size:0.72rem; padding:3px 8px; cursor:pointer;">Clear Display</button>
              </div>

              <div id="diag-event-log-container" style="background:#0F172A; color:#E2E8F0; font-family:Consolas, Monaco, monospace; font-size:0.78rem; border-radius:8px; padding:1rem; max-height:260px; overflow-y:auto; line-height:1.5;">
                <div style="color:#94A3B8;">[System Ready] Diagnostics stream initialized. Listening for Supabase sync and print daemon events...</div>
              </div>
            </div>

          </div>
        </section>`;

  // Normalize CRLF for robust matching
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedTarget = posSectionEnd.replace(/\r\n/g, '\n');

  if (normalizedContent.includes(normalizedTarget)) {
    const isCRLF = content.includes('\r\n');
    const replacementWithDiag = normalizedTarget + '\n' + diagnosticsSection;
    const finalReplacement = isCRLF ? replacementWithDiag.replace(/\n/g, '\r\n') : replacementWithDiag;
    const finalTarget = isCRLF ? normalizedTarget.replace(/\n/g, '\r\n') : normalizedTarget;
    content = content.replace(finalTarget, finalReplacement);
    console.log('view-diagnostics section added.');
  } else {
    console.error('Target posSectionEnd not found in admin.html!');
  }
}

fs.writeFileSync(adminHtmlPath, content, 'utf8');
console.log('admin.html successfully updated.');

