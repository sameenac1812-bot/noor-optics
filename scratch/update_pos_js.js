const fs = require('fs');

let js = fs.readFileSync('admin.js', 'utf8');

// 1. Ensure getPosInlineCustomer, clearPosInlineCustomer, and updatePosLiveClock are present
const helpersCode = `
  // ── OpticTool Inline Customer & Live Clock Helpers ─────────────────────────
  function getPosInlineCustomer() {
    const name = document.getElementById('pos-inline-name')?.value.trim() || 'Walk-in Customer';
    const phone = document.getElementById('pos-inline-phone')?.value.trim() || null;
    const city = document.getElementById('pos-inline-city')?.value.trim() || null;
    const age = parseInt(document.getElementById('pos-inline-age')?.value || '0', 10) || null;
    return {
      id: state.posSelectedClient?.id || null,
      name,
      phone,
      city,
      age
    };
  }

  function clearPosInlineCustomer() {
    ['pos-inline-name', 'pos-inline-phone', 'pos-inline-city', 'pos-inline-age', 'pos-bill-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function updatePosLiveClock() {
    const clockEl = document.getElementById('pos-live-clock');
    if (!clockEl) return;
    const now = new Date();
    const opts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    clockEl.textContent = now.toLocaleDateString('en-GB', opts).replace(/,/g, '');
  }
`;

// Insert helpers before updatePosCartUI
const updateCartAnchor = '  function updatePosCartUI() {';
if (!js.includes('function getPosInlineCustomer()')) {
  js = js.replace(updateCartAnchor, helpersCode + '\n' + updateCartAnchor);
  console.log('Inserted inline customer helpers');
}

// 2. Replace updatePosCartUI with comprehensive OpticTool version
const updateCartStart = '  function updatePosCartUI() {';
const updateCartEnd = '  window.changePosItemQty = function (idx, delta) {';

const idxCartStart = js.indexOf(updateCartStart);
const idxCartEnd = js.indexOf(updateCartEnd);

if (idxCartStart !== -1 && idxCartEnd !== -1) {
  const newUpdateCartUI = `  function updatePosCartUI() {
    const listEl = document.getElementById('pos-cart-items-list');
    const countEl = document.getElementById('pos-cart-count');
    const subtotalEl = document.getElementById('pos-subtotal-val');
    const discountValEl = document.getElementById('pos-discount-val');
    const discountInput = document.getElementById('pos-discount-amount');
    const taxEl = document.getElementById('pos-tax-val');
    const advanceInput = document.getElementById('pos-advance-amount');
    const advanceValEl = document.getElementById('pos-advance-val');
    const remainingValEl = document.getElementById('pos-remaining-val');
    const grandTotalEl = document.getElementById('pos-grand-total-val');
    const btnCheckout = document.getElementById('btn-pos-confirm-checkout');

    if (!listEl) return;

    if (state.posCart.length === 0) {
      listEl.innerHTML = \`
        <div class="pos-cart-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <p>Bill is currently empty.<br/>Scan a QR sticker or tap frames from stock.</p>
        </div>
      \`;
      if (countEl) countEl.textContent = '0 items';
      if (subtotalEl) subtotalEl.textContent = '₹0.00';
      if (discountValEl) discountValEl.textContent = '-₹0.00';
      if (taxEl) taxEl.textContent = '₹0.00';
      if (advanceValEl) advanceValEl.textContent = '₹0.00';
      if (remainingValEl) remainingValEl.textContent = '₹0.00';
      if (grandTotalEl) grandTotalEl.value = '0.00';
      if (btnCheckout) btnCheckout.disabled = true;
      return;
    }

    let subtotalPaise = 0;
    let totalItems = 0;

    listEl.innerHTML = state.posCart.map((item, idx) => {
      subtotalPaise += item.lineTotalPaise;
      totalItems += item.quantity;

      return \`
        <div class="pos-cart-line-item">
          <div class="cart-item-info">
            <span class="cart-item-name" title="\${escapeHtml(item.name)}">\${escapeHtml(item.name)}</span>
            <span class="cart-item-sku">\${escapeHtml(item.sku)}\${item.color ? ' • ' + escapeHtml(item.color) : ''}</span>
          </div>
          <div class="cart-item-qty-ctrl">
            <button type="button" class="btn-qty" onclick="changePosItemQty(\${idx}, -1)">−</button>
            <span style="font-weight:700; width:16px; text-align:center;">\${item.quantity}</span>
            <button type="button" class="btn-qty" onclick="changePosItemQty(\${idx}, 1)">+</button>
          </div>
          <div class="cart-item-price">\${formatINR(item.priceINR)}</div>
          <div class="cart-item-total" style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
            <span>\${formatINR(item.lineTotalINR)}</span>
            <button type="button" class="btn-remove-cart-item" onclick="removePosItem(\${idx})" title="Remove item">&times;</button>
          </div>
        </div>
      \`;
    }).join('');

    const discountINR = parseFloat(discountInput ? discountInput.value : 0) || 0;
    const discountPaise = Math.round(discountINR * 100);
    const netBasePaise = Math.max(0, subtotalPaise - discountPaise);
    // GST 18% inclusive
    const taxPaise = Math.round(netBasePaise - (netBasePaise / 1.18));
    const grandTotalPaise = netBasePaise;

    const advanceINR = parseFloat(advanceInput ? advanceInput.value : 0) || 0;
    const advancePaise = Math.round(advanceINR * 100);
    const remainingPaise = Math.max(0, grandTotalPaise - advancePaise);

    if (countEl) countEl.textContent = \`\${totalItems} item\${totalItems > 1 ? 's' : ''}\`;
    if (subtotalEl) subtotalEl.textContent = formatINR(subtotalPaise, true);
    if (discountValEl) discountValEl.textContent = \`-\${formatINR(discountPaise, true)}\`;
    if (taxEl) taxEl.textContent = formatINR(taxPaise, true);
    if (advanceValEl) advanceValEl.textContent = formatINR(advancePaise, true);
    if (remainingValEl) remainingValEl.textContent = formatINR(remainingPaise, true);
    if (grandTotalEl) grandTotalEl.value = (grandTotalPaise / 100).toFixed(2);
    if (btnCheckout) btnCheckout.disabled = false;

    // ── Update Attached Prescription Summary Badge ────────
    const attachedRx = state.posDraftPrescription || state.posSelectedPrescription;
    const rxBadge = document.getElementById('pos-rx-attached-badge');
    const rxBadgeText = document.getElementById('pos-rx-badge-text');
    const rxMiniTable = document.getElementById('pos-rx-mini-table');

    if (attachedRx && rxBadge) {
      rxBadge.style.display = 'block';
      if (rxBadgeText) {
        rxBadgeText.textContent = attachedRx.prescription_number || '🩺 RX Attached';
      }
      if (rxMiniTable) {
        const odSph = attachedRx.od_sph || attachedRx.odSph || '0.00';
        const odCyl = attachedRx.od_cyl || attachedRx.odCyl || '—';
        const odAxis = (attachedRx.od_axis || attachedRx.odAxis) ? (attachedRx.od_axis || attachedRx.odAxis) + '°' : '—';
        const osSph = attachedRx.os_sph || attachedRx.osSph || '0.00';
        const osCyl = attachedRx.os_cyl || attachedRx.osCyl || '—';
        const osAxis = (attachedRx.os_axis || attachedRx.osAxis) ? (attachedRx.os_axis || attachedRx.osAxis) + '°' : '—';

        rxMiniTable.innerHTML = \`
          <table style="width:100%; font-size:0.72rem; border-collapse:collapse; margin-top:4px;">
            <thead>
              <tr style="color:#94A3B8; text-align:left; border-bottom:1px solid rgba(255,255,255,0.15);">
                <th style="padding:2px 4px;">EYE</th>
                <th style="padding:2px 4px;">SPH</th>
                <th style="padding:2px 4px;">CYL</th>
                <th style="padding:2px 4px;">AXIS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:3px 4px; font-weight:700; color:#BAE6FD;">OD (Right)</td>
                <td style="padding:3px 4px;">\${odSph}</td>
                <td style="padding:3px 4px;">\${odCyl}</td>
                <td style="padding:3px 4px;">\${odAxis}</td>
              </tr>
              <tr>
                <td style="padding:3px 4px; font-weight:700; color:#BAE6FD;">OS (Left)</td>
                <td style="padding:3px 4px;">\${osSph}</td>
                <td style="padding:3px 4px;">\${osCyl}</td>
                <td style="padding:3px 4px;">\${osAxis}</td>
              </tr>
            </tbody>
          </table>
        \`;
      }
    } else if (rxBadge) {
      rxBadge.style.display = 'none';
    }

    // Dynamic UPI QR if UPI_GPAY is selected
    if (state.posPaymode === 'UPI_GPAY') {
      renderPosDynamicUpiQr(grandTotalPaise / 100);
    }
  }

`;
  js = js.slice(0, idxCartStart) + newUpdateCartUI + js.slice(idxCartEnd);
  console.log('Replaced updatePosCartUI');
}

// 3. Make setupPosCameraScanner resilient (do not return early if window.Html5Qrcode not ready at boot)
const oldScannerSetup = `  function setupPosCameraScanner() {
    const btnToggle = document.getElementById('btn-toggle-camera');
    const viewportWrap = document.getElementById('camera-viewport-wrap');
    const cameraDot = document.getElementById('camera-status-dot');
    const btnText = document.getElementById('btn-camera-text');
    const cameraDropdown = document.getElementById('camera-select-dropdown');

    if (!btnToggle || !window.Html5Qrcode) return;`;

const newScannerSetup = `  function setupPosCameraScanner() {
    const btnToggle = document.getElementById('btn-toggle-camera');
    const viewportWrap = document.getElementById('camera-viewport-wrap');
    const cameraDot = document.getElementById('camera-status-dot');
    const btnText = document.getElementById('btn-camera-text');
    const cameraDropdown = document.getElementById('camera-select-dropdown');

    if (!btnToggle) return;`;

if (js.includes(oldScannerSetup)) {
  js = js.replace(oldScannerSetup, newScannerSetup);
  console.log('Updated setupPosCameraScanner header');
}

// Inside setupPosCameraScanner, add check for Html5Qrcode on click:
const oldClickScanner = `    btnToggle.addEventListener('click', async () => {
      if (state.posScannerActive) {
        // Stop Camera
        await stopCameraScanner();
      } else {
        // Start Camera
        await startCameraScanner();
      }
    });`;

const newClickScanner = `    btnToggle.addEventListener('click', async () => {
      if (!window.Html5Qrcode) {
        showToast('Camera scanner library is initializing. Please tap again in a moment.', 'info');
        return;
      }
      if (state.posScannerActive) {
        // Stop Camera
        await stopCameraScanner();
      } else {
        // Start Camera
        await startCameraScanner();
      }
    });`;

if (js.includes(oldClickScanner)) {
  js = js.replace(oldClickScanner, newClickScanner);
  console.log('Updated btnToggle click listener');
}

// 4. Add setupPosOpticFeatures and replace setupPosCheckout
const oldCheckoutStart = '  function setupPosCheckout() {';
const oldCheckoutEnd = '  // ═══════════════════════════════════════════════════════════════════════════\n  // 6. SECTION: OPTICALTOOL DIOPTER SELECTOR BOTTOM SHEET';

const idxChkStart = js.indexOf(oldCheckoutStart);
const idxChkEnd = js.indexOf(oldCheckoutEnd);

if (idxChkStart !== -1 && idxChkEnd !== -1) {
  const newOpticAndCheckout = `  // ── OpticTool POS UI Interactions (Stock toggle, Bill Image, Prescription) ─
  function setupPosOpticFeatures() {
    // 1. Stock catalog toggle
    const btnToggleStock = document.getElementById('btn-toggle-stock-catalog');
    const stockCatalogWrap = document.getElementById('optic-stock-catalog-wrap');
    if (btnToggleStock && stockCatalogWrap) {
      btnToggleStock.addEventListener('click', () => {
        const isHidden = window.getComputedStyle(stockCatalogWrap).display === 'none';
        stockCatalogWrap.style.display = isHidden ? 'block' : 'none';
        btnToggleStock.innerHTML = isHidden ? '<span>✕ Hide Stock</span>' : '<span>📦 View Stock</span>';
      });
    }

    // 2. Bill Image handlers (Camera snap & Gallery upload)
    const btnRxCamera = document.getElementById('btn-rx-camera-snap');
    const btnRxGallery = document.getElementById('btn-pos-rx-upload');
    const fileGallery = document.getElementById('pos-rx-file-input');
    const fileCamera = document.getElementById('pos-camera-file-input');
    const previewWrap = document.getElementById('pos-rx-preview-wrap');
    const previewImg = document.getElementById('pos-rx-image-preview');
    const btnRemoveRxImg = document.getElementById('btn-remove-rx-img');

    if (btnRxCamera && fileCamera) {
      btnRxCamera.addEventListener('click', () => fileCamera.click());
    }
    if (btnRxGallery && fileGallery) {
      btnRxGallery.addEventListener('click', () => fileGallery.click());
    }

    const handleBillFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        state.uploadedRxImageUrl = dataUrl;
        if (previewImg) previewImg.src = dataUrl;
        if (previewWrap) previewWrap.style.display = 'block';
        showToast('Bill image attached!', 'success');
      };
      reader.readAsDataURL(file);

      // Async background server upload
      const formData = new FormData();
      formData.append('image', file);
      const headers = {};
      if (state.token) headers['Authorization'] = \`Bearer \${state.token}\`;
      fetch('/api/prescriptions/upload-image', {
        method: 'POST',
        headers,
        body: formData
      })
      .then(res => res.json())
      .then(json => {
        if (json.imageUrl) state.uploadedRxImageUrl = json.imageUrl;
      })
      .catch(err => console.warn('Server image upload sync:', err));
    };

    if (fileCamera) {
      fileCamera.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleBillFile(e.target.files[0]);
      });
    }
    if (fileGallery) {
      fileGallery.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleBillFile(e.target.files[0]);
      });
    }

    if (btnRemoveRxImg) {
      btnRemoveRxImg.addEventListener('click', () => {
        state.uploadedRxImageUrl = null;
        if (previewWrap) previewWrap.style.display = 'none';
        if (previewImg) previewImg.src = '';
        if (fileCamera) fileCamera.value = '';
        if (fileGallery) fileGallery.value = '';
        showToast('Bill image removed.', 'info');
      });
    }

    // 3. Prescription actions
    const btnRxCreateNew = document.getElementById('btn-rx-create-new');
    if (btnRxCreateNew) {
      btnRxCreateNew.addEventListener('click', () => {
        openPrescriptionModal(null, (rxData) => {
          state.posDraftPrescription = rxData;
          state.posSelectedPrescription = null;
          updatePosCartUI();
          showToast('Prescription attached to bill!', 'success');
        });
      });
    }

    const btnRxSearchExisting = document.getElementById('btn-rx-search-existing');
    if (btnRxSearchExisting) {
      btnRxSearchExisting.addEventListener('click', () => {
        openClientDetailsModal();
      });
    }

    const btnBrowseClients = document.getElementById('btn-browse-clients');
    if (btnBrowseClients) {
      btnBrowseClients.addEventListener('click', () => {
        openClientDetailsModal();
      });
    }

    const btnRemoveRx = document.getElementById('btn-pos-remove-rx');
    if (btnRemoveRx) {
      btnRemoveRx.addEventListener('click', (e) => {
        e.stopPropagation();
        state.posDraftPrescription = null;
        state.posSelectedPrescription = null;
        updatePosCartUI();
        showToast('Prescription detached.', 'info');
      });
    }
  }

  // ── POS Payment & Checkout Submission ─────────────────────────────────────
  function setupPosCheckout() {
    const btnNewBill = document.getElementById('btn-pos-new-bill');
    const btnReset = document.getElementById('btn-pos-reset');
    const btnClearCart = document.getElementById('btn-clear-cart');
    const btnCheckout = document.getElementById('btn-pos-confirm-checkout');
    const discountInput = document.getElementById('pos-discount-amount');
    const advanceInput = document.getElementById('pos-advance-amount');

    const resetBill = (confirmUser = false) => {
      if (confirmUser && (state.posCart.length > 0 || document.getElementById('pos-inline-name')?.value)) {
        if (!confirm('Are you sure you want to reset this bill? All current items and inputs will be cleared.')) {
          return;
        }
      }
      state.posCart = [];
      state.posSelectedClient = null;
      state.posSelectedPrescription = null;
      state.posDraftPrescription = null;
      state.uploadedRxImageUrl = null;
      clearPosInlineCustomer();
      const wrap = document.getElementById('pos-rx-preview-wrap');
      if (wrap) wrap.style.display = 'none';
      const previewImg = document.getElementById('pos-rx-image-preview');
      if (previewImg) previewImg.src = '';
      if (discountInput) discountInput.value = 0;
      if (advanceInput) advanceInput.value = 0;

      const tokenDisplay = document.getElementById('pos-token-display');
      if (tokenDisplay) {
        tokenDisplay.textContent = 'INV-NOOR-' + Date.now().toString().slice(-4);
      }
      updatePosCartUI();
    };

    if (btnNewBill) {
      btnNewBill.addEventListener('click', () => {
        resetBill(false);
        showToast('New in-store bill started.', 'info');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetBill(true);
        showToast('Bill reset.', 'info');
      });
    }

    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        state.posCart = [];
        updatePosCartUI();
      });
    }

    if (discountInput) {
      discountInput.addEventListener('input', () => updatePosCartUI());
    }

    if (advanceInput) {
      advanceInput.addEventListener('input', () => updatePosCartUI());
    }

    // Payment mode selection buttons
    document.querySelectorAll('.btn-pos-pm').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-pos-pm').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.posPaymode = btn.dataset.paymode;

        const upiCard = document.getElementById('pos-upi-display-card');
        if (upiCard) {
          upiCard.style.display = state.posPaymode === 'UPI_GPAY' ? 'block' : 'none';
          if (state.posPaymode === 'UPI_GPAY') {
            const grandTotalEl = document.getElementById('pos-grand-total-val');
            const total = parseFloat(grandTotalEl?.value || '0') || 0;
            renderPosDynamicUpiQr(total);
          }
        }
      });
    });

    // Save Bill & Print Checkout Action
    if (btnCheckout) {
      btnCheckout.addEventListener('click', async () => {
        if (state.posCart.length === 0) {
          showToast('Please add at least one frame before saving bill.', 'warning');
          return;
        }

        // Authoritative inline customer details
        const inlineCust = getPosInlineCustomer();
        const clientPayload = state.posSelectedClient ? {
          ...state.posSelectedClient,
          name: inlineCust.name || state.posSelectedClient.name,
          phone: inlineCust.phone || state.posSelectedClient.phone,
          city: inlineCust.city || state.posSelectedClient.city,
          age: inlineCust.age || state.posSelectedClient.age
        } : {
          id: null,
          name: inlineCust.name,
          phone: inlineCust.phone,
          city: inlineCust.city,
          age: inlineCust.age
        };

        btnCheckout.disabled = true;
        btnCheckout.innerHTML = \`<span>Processing Sale...</span>\`;

        try {
          const discountINR = parseFloat(discountInput ? discountInput.value : 0) || 0;
          const advanceINR = parseFloat(advanceInput ? advanceInput.value : 0) || 0;
          const claimedUtr = document.getElementById('pos-claimed-utr') ? document.getElementById('pos-claimed-utr').value.trim() : null;
          const notes = document.getElementById('pos-bill-notes')?.value.trim() || null;

          const payload = {
            customerId: clientPayload.id || null,
            clientDetails: clientPayload.id ? null : clientPayload,
            prescriptionId: state.posSelectedPrescription ? state.posSelectedPrescription.id : null,
            newPrescription: state.posDraftPrescription || (state.uploadedRxImageUrl ? { imageUrl: state.uploadedRxImageUrl } : null),
            customerName: clientPayload.name,
            customerPhone: clientPayload.phone || null,
            customerCity: clientPayload.city || null,
            customerAge: clientPayload.age || null,
            paymentMethod: state.posPaymode,
            discountINR,
            advanceINR,
            notes,
            claimedUpiRef: claimedUtr,
            isVerifiedAtCounter: true,
            items: state.posCart.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPricePaise: item.pricePaise
            }))
          };

          const res = await apiFetch('/api/pos/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          showToast(\`Sale completed! Invoice: \${res.invoiceNumber} (Token #\${res.tokenNumber})\`, 'success');

          // Reset cart & inputs
          state.posCart = [];
          state.posSelectedClient = null;
          state.posSelectedPrescription = null;
          state.posDraftPrescription = null;
          state.uploadedRxImageUrl = null;
          clearPosInlineCustomer();
          const wrap = document.getElementById('pos-rx-preview-wrap');
          if (wrap) wrap.style.display = 'none';
          const previewImg = document.getElementById('pos-rx-image-preview');
          if (previewImg) previewImg.src = '';
          if (discountInput) discountInput.value = 0;
          if (advanceInput) advanceInput.value = 0;

          // Generate next token number
          const tokenDisplay = document.getElementById('pos-token-display');
          if (tokenDisplay) {
            tokenDisplay.textContent = 'INV-NOOR-' + Date.now().toString().slice(-4);
          }
          updatePosCartUI();

          // Refresh live datasets across system
          loadInventory();
          loadDashboard();
          loadOrders();
          if (typeof loadClients === 'function') loadClients();

          // Instant automatic bill printout
          if (res.orderId) {
            instantPrintReceipt(res.orderId);
          }

          // Show Order Done modal
          const successModal = document.getElementById('modal-order-success');
          if (successModal) {
            const invoiceElem = document.getElementById('success-invoice-num');
            const tokenElem = document.getElementById('success-token-num');
            const clientElem = document.getElementById('success-client-name');
            const rxElem = document.getElementById('success-rx-status');
            if (invoiceElem) invoiceElem.textContent = res.invoiceNumber || '-';
            if (tokenElem) tokenElem.textContent = res.tokenNumber ? \`#\${res.tokenNumber}\` : '-';
            if (clientElem) clientElem.textContent = payload.customerName || 'Walk-in Client';
            if (rxElem) rxElem.textContent = (res.prescriptionId || payload.newPrescription) ? 'Attached & Saved ✓' : 'Standard (Non-RX)';
            const btnReprint = document.getElementById('btn-success-reprint');
            if (btnReprint) {
              btnReprint.onclick = () => instantPrintReceipt(res.orderId);
            }
            successModal.classList.add('open');
          }
        } catch (err) {
          showToast('Checkout failed: ' + err.message, 'error');
        } finally {
          btnCheckout.disabled = false;
          btnCheckout.innerHTML = \`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" id="pos-checkout-btn-icon"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span id="pos-btn-checkout-label">Save Bill &amp; Print</span>
          \`;
          updatePosCartUI();
        }
      });
    }
  }

`;
  js = js.slice(0, idxChkStart) + newOpticAndCheckout + js.slice(idxChkEnd);
  console.log('Replaced setupPosCheckout & added setupPosOpticFeatures');
}

// 5. Update save client button to sync with inline customer fields
const saveClientSync = `        // Attach client to active POS state
        state.posSelectedClient = {
          id: hiddenId,
          name,
          age,
          phone,
          city,
          email: email || null,
          dob: dob || null,
          address: address || null,
          notes: notes || null
        };

        // Also sync inline customer inputs on POS view
        const inlineName = document.getElementById('pos-inline-name');
        const inlinePhone = document.getElementById('pos-inline-phone');
        const inlineCity = document.getElementById('pos-inline-city');
        const inlineAge = document.getElementById('pos-inline-age');
        if (inlineName) inlineName.value = name;
        if (inlinePhone) inlinePhone.value = phone;
        if (inlineCity) inlineCity.value = city;
        if (inlineAge) inlineAge.value = age || '';`;

const oldSaveClientBlock = `        // Attach client to active POS state
        state.posSelectedClient = {
          id: hiddenId,
          name,
          age,
          phone,
          city,
          email: email || null,
          dob: dob || null,
          address: address || null,
          notes: notes || null
        };`;

if (js.includes(oldSaveClientBlock)) {
  js = js.replace(oldSaveClientBlock, saveClientSync);
  console.log('Updated client modal to sync inline customer fields');
}

// 6. Update selectTypeaheadClient to also sync inline fields
const typeaheadSync = `      document.getElementById('cust-address').value = client.address || '';
      document.getElementById('cust-notes').value = client.notes || '';

      const inlineName = document.getElementById('pos-inline-name');
      const inlinePhone = document.getElementById('pos-inline-phone');
      const inlineCity = document.getElementById('pos-inline-city');
      const inlineAge = document.getElementById('pos-inline-age');
      if (inlineName) inlineName.value = client.name || '';
      if (inlinePhone) inlinePhone.value = client.phone || '';
      if (inlineCity) inlineCity.value = client.city || '';
      if (inlineAge) inlineAge.value = client.age || '';`;

const oldTypeaheadBlock = `      document.getElementById('cust-address').value = client.address || '';
      document.getElementById('cust-notes').value = client.notes || '';`;

if (js.includes(oldTypeaheadBlock)) {
  js = js.replace(oldTypeaheadBlock, typeaheadSync);
  console.log('Updated typeahead to sync inline customer fields');
}

// 7. In init(), call setupPosOpticFeatures and start updatePosLiveClock interval
const oldInitCalls = `    setupDailySalesReport();
    setupPosCameraScanner();
    setupKeyboardScannerListener();
    setupPosCheckout();`;

const newInitCalls = `    setupDailySalesReport();
    setupPosCameraScanner();
    setupKeyboardScannerListener();
    setupPosOpticFeatures();
    setupPosCheckout();

    // Start OpticTool Live Clock
    updatePosLiveClock();
    setInterval(updatePosLiveClock, 1000);

    const tokenDisplay = document.getElementById('pos-token-display');
    if (tokenDisplay) {
      tokenDisplay.textContent = 'INV-NOOR-' + Date.now().toString().slice(-4);
    }`;

if (js.includes(oldInitCalls)) {
  js = js.replace(oldInitCalls, newInitCalls);
  console.log('Updated init() calls');
}

fs.writeFileSync('admin.js', js, 'utf8');
console.log('Successfully updated admin.js!');

