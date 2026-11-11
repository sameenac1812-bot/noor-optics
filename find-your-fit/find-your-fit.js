/**
 * find-your-fit/find-your-fit.js
 * Minimalist, Uncluttered Controller for Noor Optics 'Find Your Fit'
 * Direct camera launch, clean reticle, zero annoying popups,
 * neat measurements, and curated optical frame showcase.
 */

(function (window, document) {
  'use strict';

  if (window.FindYourFit) return;

  var meshMath = window.FFitMeshMath;
  var config = window.__FFIT_CONFIG__ || null;

  var state = {
    isOpen: false,
    currentStep: 'scanner', // 'scanner' | 'results' | 'notice'
    stream: null,
    landmarker: null,
    isModelLoading: false,
    animFrameId: null,
    frameBuffer: [],
    minFrames: 35,
    lastVideoTime: -1,
    lastScanResult: null,
    activeShape: null,
    activeSize: null
  };

  var backdropEl = null;

  function buildModalDOM() {
    if (backdropEl) return;

    backdropEl = document.createElement('div');
    backdropEl.className = 'ffit-backdrop';
    backdropEl.id = 'ffit-modal-backdrop';

    backdropEl.innerHTML =
      '<div class="ffit-modal" role="dialog" aria-modal="true" aria-label="Find Your Fit">' +
        '<button type="button" class="ffit-close-btn" id="ffit-btn-close" aria-label="Close Modal">&times;</button>' +
        '<div id="ffit-view-scanner" class="ffit-scanner-view"></div>' +
        '<div id="ffit-view-results" class="ffit-results-view" style="display:none;"></div>' +
        '<div id="ffit-view-notice" class="ffit-notice-view" style="display:none;"></div>' +
      '</div>';

    document.body.appendChild(backdropEl);

    document.getElementById('ffit-btn-close').addEventListener('click', close);
    backdropEl.addEventListener('click', function (e) {
      if (e.target === backdropEl) close();
    });
  }

  // ── Render Scanner View (Clean, No Dark Oval Mask) ─────────────────────────
  function renderScannerView() {
    var view = document.getElementById('ffit-view-scanner');
    if (!view) return;

    view.innerHTML =
      '<div class="ffit-video-wrap">' +
        '<video id="ffit-video" class="ffit-video-feed" playsinline webkit-playsinline autoplay muted></video>' +
        '<canvas id="ffit-canvas" class="ffit-debug-canvas"></canvas>' +
        '<div class="ffit-laser-scanline"></div>' +
        '<div id="ffit-reticle" class="ffit-scanner-reticle">' +
          '<span class="ffit-reticle-corner tl"></span>' +
          '<span class="ffit-reticle-corner tr"></span>' +
          '<span class="ffit-reticle-corner bl"></span>' +
          '<span class="ffit-reticle-corner br"></span>' +
        '</div>' +
        '<div class="ffit-scanner-bottom-bar">' +
          '<span id="ffit-status-text" class="ffit-scanner-status-text">Scanning face...</span>' +
          '<div class="ffit-scanner-progress-track">' +
            '<div id="ffit-progress-fill" class="ffit-scanner-progress-fill"></div>' +
          '</div>' +
          '<span id="ffit-status-pct" class="ffit-scanner-pct">0%</span>' +
        '</div>' +
      '</div>';
  }

  // ── Lazy-Load MediaPipe Vision Model ──────────────────────────────────────
  function loadMediaPipeVision() {
    if (state.landmarker) return Promise.resolve(state.landmarker);
    if (state.isModelLoading) {
      return new Promise(function (resolve) {
        var interval = setInterval(function () {
          if (state.landmarker) {
            clearInterval(interval);
            resolve(state.landmarker);
          }
        }, 100);
      });
    }

    state.isModelLoading = true;
    var statusText = document.getElementById('ffit-status-text');
    if (statusText) statusText.textContent = 'Loading optical detector...';

    var bundlePromise = (window.Vision || window.FilesetResolver) ? Promise.resolve() : new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = '/find-your-fit/models/vision_bundle.js';
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });

    return bundlePromise
      .then(function () {
        var visionApi = window.Vision || window;
        var FilesetResolver = visionApi.FilesetResolver || window.FilesetResolver;
        var FaceLandmarker = visionApi.FaceLandmarker || window.FaceLandmarker;

        if (!FilesetResolver || !FaceLandmarker) {
          throw new Error('MediaPipe Vision exports not found');
        }

        return FilesetResolver.forVisionTasks('/find-your-fit/models')
          .then(function (vision) {
            return FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: '/find-your-fit/models/face_landmarker.task',
                delegate: 'GPU'
              },
              runningMode: 'VIDEO',
              numFaces: 1,
              minFaceDetectionConfidence: 0.5,
              minFacePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5
            }).catch(function () {
              return FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: '/find-your-fit/models/face_landmarker.task',
                  delegate: 'CPU'
                },
                runningMode: 'VIDEO',
                numFaces: 1
              });
            });
          });
      })
      .then(function (landmarker) {
        state.landmarker = landmarker;
        state.isModelLoading = false;
        return landmarker;
      })
      .catch(function (err) {
        state.isModelLoading = false;
        throw err;
      });
  }

  // ── Camera Initialization & Direct Launch ─────────────────────────────────
  async function startScanner() {
    switchView('scanner');
    renderScannerView();
    state.frameBuffer = [];
    state.minFrames = 35;

    var video = document.getElementById('ffit-video');
    var statusText = document.getElementById('ffit-status-text');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      renderNoticeView('Camera streaming is not supported on this browser or requires HTTPS.');
      return;
    }

    var stream = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (_) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      state.stream = stream;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');

      await new Promise(function (resolve) {
        video.onloadedmetadata = function () {
          video.play().then(resolve).catch(resolve);
        };
        setTimeout(resolve, 600);
      });
    } catch (camErr) {
      stopCamera();
      var msg = 'Camera access was not granted. Please allow camera permissions in your address bar and retry.';
      if (camErr.name === 'NotFoundError') {
        msg = 'No camera found on this device. You can explore matching glasses manually below.';
      }
      renderNoticeView(msg);
      return;
    }

    if (statusText) statusText.textContent = 'Align face inside frame...';
    try {
      await loadMediaPipeVision();
      if (statusText) statusText.textContent = 'Scanning facial structure...';
      runDetectionLoop();
    } catch (modelErr) {
      console.error('Vision detector load error:', modelErr);
      if (statusText) statusText.textContent = 'Starting detector...';
    }
  }

  // ── Detection Loop (Smooth, Quiet, No Popups) ──────────────────────────────
  function runDetectionLoop() {
    var video = document.getElementById('ffit-video');
    var reticle = document.getElementById('ffit-reticle');
    var statusText = document.getElementById('ffit-status-text');
    var progressFill = document.getElementById('ffit-progress-fill');
    var statusPct = document.getElementById('ffit-status-pct');

    if (!state.isOpen || state.currentStep !== 'scanner' || !video || !state.landmarker) return;

    if (video.readyState >= 2) {
      var vw = video.videoWidth || 640;
      var vh = video.videoHeight || 480;

      var now = performance.now();
      if (now !== state.lastVideoTime) {
        state.lastVideoTime = now;

        var results = null;
        try {
          results = state.landmarker.detectForVideo(video, now);
        } catch (_) {}

        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          var landmarks = results.faceLandmarks[0];
          meshMath = window.FFitMeshMath || meshMath;

          var evalRes = meshMath.evaluateFrameQuality(landmarks, config, vw, vh);

          if (reticle) {
            reticle.className = evalRes.isValid ? 'ffit-scanner-reticle ffit-aligned' : 'ffit-scanner-reticle';
          }

          if (evalRes.isValid) {
            state.frameBuffer.push(evalRes);
            var count = state.frameBuffer.length;
            var pct = Math.min(100, Math.round((count / state.minFrames) * 100));

            if (progressFill) progressFill.style.width = pct + '%';
            if (statusPct) statusPct.textContent = pct + '%';
            if (statusText) statusText.textContent = 'Measuring facial dimensions... ' + pct + '%';

            if (count >= state.minFrames) {
              completeScan();
              return;
            }
          } else {
            if (statusText) statusText.textContent = evalRes.guidance;
          }
        } else {
          if (statusText) statusText.textContent = 'Center face in the frame...';
          if (reticle) reticle.className = 'ffit-scanner-reticle';
        }
      }
    }

    state.animFrameId = requestAnimationFrame(runDetectionLoop);
  }

  function stopCamera() {
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
      state.animFrameId = null;
    }
    if (state.stream) {
      state.stream.getTracks().forEach(function (track) {
        track.stop();
      });
      state.stream = null;
    }
    var video = document.getElementById('ffit-video');
    if (video) video.srcObject = null;
  }

  function completeScan() {
    stopCamera();
    meshMath = window.FFitMeshMath || meshMath;

    var aggregate = meshMath.aggregateFrameBuffer(state.frameBuffer, config);
    if (!aggregate) {
      renderNoticeView('Measurement completed with low confidence. Please retry.');
      return;
    }

    var shapeClassification = meshMath.classifyFaceShape(aggregate.ratios, config);
    var sizeClassification = meshMath.classifyFaceSize(aggregate.mm.cheekWidth, config);

    state.lastScanResult = {
      aggregate: aggregate,
      shape: shapeClassification,
      size: sizeClassification
    };

    state.activeShape = shapeClassification.primaryShape;
    state.activeSize = sizeClassification;

    renderResultsView();
  }

  // ── Render Neat Results & Curated Glasses ─────────────────────────────────
  function renderResultsView() {
    switchView('results');
    var view = document.getElementById('ffit-view-results');
    if (!view) return;

    var res = state.lastScanResult;
    var shape = state.activeShape || res.shape.primaryShape;
    var size = state.activeSize || res.size;

    var catalog = (window.EYEWEAR_CATALOG && window.EYEWEAR_CATALOG.length > 0) ? window.EYEWEAR_CATALOG : [];
    meshMath = window.FFitMeshMath || meshMath;
    var recommended = meshMath.recommendFrames(catalog, shape, size, config);

    var shapeDef = config?.shapes?.[shape] || {};
    var agg = res.aggregate;

    var recsHtml = '';
    if (recommended.length > 0) {
      recsHtml = recommended.map(function (item) {
        var priceFormatted = (item.price && item.price > 0) ? '₹' + item.price.toLocaleString('en-IN') : '₹999';
        var imgUrl = item.imageUrl || item.image_url || item.image || '/images/frames/frame_34.jpg';
        var displaySize = item.frame_size || item.size || (item.fit === 'Narrow' ? 'Small' : (item.fit === 'Wide' ? 'Large' : 'Medium'));
        return (
          '<div class="ffit-prod-card">' +
            '<div class="ffit-prod-img-wrap">' +
              '<span class="ffit-prod-badge">' + (item.badgeReason || 'Match') + '</span>' +
              '<img src="' + imgUrl + '" alt="' + item.name + '" class="ffit-prod-img" onerror="this.src=\'/images/frames/frame_34.jpg\'" />' +
            '</div>' +
            '<div class="ffit-prod-body">' +
              '<div class="ffit-prod-brand">' + (item.brand || 'Noor Optics') + '</div>' +
              '<div class="ffit-prod-name" title="' + item.name + '">' + item.name + '</div>' +
              '<div class="ffit-prod-meta">' +
                '<span>' + item.shape + '</span> • <span>Size ' + displaySize + '</span>' +
              '</div>' +
              '<div class="ffit-prod-price">' + priceFormatted + '</div>' +
              '<button type="button" class="ffit-prod-btn" data-view-product="' + item.id + '">View Details</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    } else {
      recsHtml = '<p style="text-align:center;color:#6B6B85;grid-column:1/-1;">No matching frames in stock.</p>';
    }

    view.innerHTML =
      '<div class="ffit-results-header">' +
        '<span class="ffit-results-badge">Scan Complete</span>' +
        '<h2 class="ffit-results-title">' + shape + ' Face Profile</h2>' +
        '<p class="ffit-results-sub">' + (shapeDef.description || '') + '</p>' +
      '</div>' +

      '<div class="ffit-summary-grid">' +
        '<div class="ffit-summary-card">' +
          '<div class="ffit-card-tag">Face Shape</div>' +
          '<div class="ffit-card-val">' + shape + '</div>' +
          '<div class="ffit-card-detail">' + Math.round(res.shape.primaryScore * 100) + '% match</div>' +
        '</div>' +
        '<div class="ffit-summary-card">' +
          '<div class="ffit-card-tag">Recommended Frame Size</div>' +
          '<div class="ffit-card-val">' + size.label + '</div>' +
          '<div class="ffit-card-detail">' + Math.round(agg.mm.cheekWidth) + ' mm width</div>' +
        '</div>' +
      '</div>' +

      '<div class="ffit-measurements-card">' +
        '<div class="ffit-measurements-title">📐 Facial Measurements</div>' +
        '<div class="ffit-measurements-grid">' +
          '<div class="ffit-meas-item"><span class="ffit-meas-label">Face Width</span><span class="ffit-meas-val">' + Math.round(agg.mm.cheekWidth) + ' mm</span></div>' +
          '<div class="ffit-meas-item"><span class="ffit-meas-label">Face Length</span><span class="ffit-meas-val">' + Math.round(agg.mm.faceLength) + ' mm</span></div>' +
          '<div class="ffit-meas-item"><span class="ffit-meas-label">Jawline</span><span class="ffit-meas-val">' + Math.round(agg.mm.jawWidth) + ' mm</span></div>' +
          '<div class="ffit-meas-item"><span class="ffit-meas-label">Forehead</span><span class="ffit-meas-val">' + Math.round(agg.mm.foreheadWidth) + ' mm</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="ffit-recs-section-title">' +
        '<span>Curated Glasses for ' + shape + '</span>' +
        '<span style="font-size:0.78rem;color:#6B6B85;font-weight:400;">' + recommended.length + ' frames</span>' +
      '</div>' +

      '<div class="ffit-recs-grid">' + recsHtml + '</div>' +

      '<div class="ffit-secondary-actions">' +
        '<button type="button" class="ffit-btn-rescan" id="ffit-btn-rescan">🔄 Scan Again</button>' +
        '<button type="button" class="ffit-btn-rescan" id="ffit-btn-manual">Explore Other Shapes</button>' +
      '</div>';

    // View Details Click: Add recommended frame to cart and direct immediately to checkout
    view.querySelectorAll('[data-view-product]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var productId = btn.getAttribute('data-view-product');
        var matchedItem = recommended.find(function (r) { return String(r.id) === String(productId); });
        close();
        if (window.buyNowProduct) {
          window.buyNowProduct(productId, null, null, matchedItem);
        } else if (window.addToCart && window.openDemoCheckout) {
          window.addToCart(productId, null, null, true);
          window.openDemoCheckout();
        } else {
          bridgeOpenQuickView(productId);
        }
      });
    });

    var rescanBtn = document.getElementById('ffit-btn-rescan');
    if (rescanBtn) rescanBtn.addEventListener('click', function () { startScanner(); });

    var manualBtn = document.getElementById('ffit-btn-manual');
    if (manualBtn) {
      manualBtn.addEventListener('click', function () {
        var shapes = ['Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Oblong'];
        var currentIdx = shapes.indexOf(state.activeShape);
        var nextShape = shapes[(currentIdx + 1) % shapes.length];
        state.activeShape = nextShape;
        renderResultsView();
      });
    }
  }

  // ── Fallback Notice View ───────────────────────────────────────────────────
  function renderNoticeView(message) {
    switchView('notice');
    var view = document.getElementById('ffit-view-notice');
    if (!view) return;

    view.innerHTML =
      '<h2 class="ffit-results-title">Camera Notice</h2>' +
      '<p class="ffit-results-sub" style="margin-top:8px;">' + message + '</p>' +
      '<button type="button" class="ffit-action-btn-primary" id="ffit-btn-notice-retry">' +
        '🔄 Retry Camera' +
      '</button>' +
      '<button type="button" class="ffit-action-btn-secondary" id="ffit-btn-notice-manual">' +
        'Choose Shape & Size Manually' +
      '</button>';

    document.getElementById('ffit-btn-notice-retry').addEventListener('click', function () {
      startScanner();
    });

    document.getElementById('ffit-btn-notice-manual').addEventListener('click', function () {
      showManualSelection();
    });
  }

  function showManualSelection() {
    state.lastScanResult = {
      aggregate: {
        mm: { cheekWidth: 130.5, faceLength: 185.0, jawWidth: 99.0, foreheadWidth: 108.0 },
        ratios: { lengthToWidth: 1.42, jawToCheekbone: 0.76, foreheadToCheekbone: 0.83, foreheadToJaw: 1.09, jawAngleDeg: 135 }
      },
      shape: { primaryShape: 'Oval', primaryScore: 0.88, isBorderline: false },
      size: { label: 'Medium', matchedFits: ['Regular', 'M'], isBoundary: false }
    };
    state.activeShape = 'Oval';
    state.activeSize = state.lastScanResult.size;
    renderResultsView();
  }

  function bridgeOpenQuickView(productId) {
    if (!productId) return;

    if (window.buyNowProduct) {
      window.buyNowProduct(productId);
      return;
    }
    if (window.addToCart && window.openDemoCheckout) {
      window.addToCart(productId, null, null, true);
      window.openDemoCheckout();
      return;
    }

    var existingBtn = document.querySelector('.products-grid [data-action="quickview"][data-id="' + productId + '"]');
    if (existingBtn) {
      existingBtn.click();
      return;
    }

    var grid = document.querySelector('.products-grid') || document.body;
    var fakeTrigger = document.createElement('div');
    fakeTrigger.setAttribute('data-action', 'quickview');
    fakeTrigger.setAttribute('data-id', productId);
    fakeTrigger.style.display = 'none';
    grid.appendChild(fakeTrigger);

    fakeTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fakeTrigger.remove();
  }

  function switchView(viewName) {
    state.currentStep = viewName;
    ['scanner', 'results', 'notice'].forEach(function (v) {
      var el = document.getElementById('ffit-view-' + v);
      if (el) el.style.display = (v === viewName) ? 'block' : 'none';
    });
  }

  function open() {
    buildModalDOM();
    state.isOpen = true;
    backdropEl.style.display = 'flex';
    setTimeout(function () {
      backdropEl.classList.add('ffit-visible');
    }, 10);
    startScanner();
  }

  function close() {
    stopCamera();
    state.isOpen = false;
    if (backdropEl) {
      backdropEl.classList.remove('ffit-visible');
      setTimeout(function () {
        backdropEl.style.display = 'none';
      }, 200);
    }
  }

  window.FindYourFit = {
    open: open,
    close: close,
    getState: function () { return state; }
  };

})(window, document);
