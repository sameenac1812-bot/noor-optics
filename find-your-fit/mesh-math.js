/**
 * find-your-fit/mesh-math.js
 * Geometric analysis, pose estimation, scale calibration, outlier rejection,
 * continuous 0-1 shape scoring, and size band classification.
 *
 * Universal Module: compatible with Node.js (CommonJS) and browser (window.FFitMeshMath).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FFitMeshMath = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Landmark Indices (MediaPipe Face Landmarker 478 Mesh) ──────────────────
  const LANDMARKS = {
    // Face outline & structure
    FOREHEAD_TOP: 10,       // Trichion / top of forehead
    CHIN: 152,              // Menton / bottom of chin
    CHEEKBONE_RIGHT: 234,   // Right zygomatic arch
    CHEEKBONE_LEFT: 454,    // Left zygomatic arch
    JAW_RIGHT: 172,         // Right gonion / jaw angle
    JAW_LEFT: 397,          // Left gonion / jaw angle
    TEMPLE_RIGHT: 71,       // Right forehead crest / temple
    TEMPLE_LEFT: 301,       // Left forehead crest / temple
    NOSE_TIP: 4,            // Pronasale
    NOSE_ROOT: 168,         // Glabella / nasion
    SUB_NASALE: 2,          // Base of nose
    BRIDGE_TOP: 6,          // Upper nose bridge (glasses detection)

    // Eye corners for roll & symmetry
    EYE_OUTER_RIGHT: 33,
    EYE_INNER_RIGHT: 133,
    EYE_OUTER_LEFT: 263,
    EYE_INNER_LEFT: 362,

    // Iris landmarks (468-477)
    RIGHT_IRIS_CENTER: 468,
    RIGHT_IRIS_RIGHT: 469,
    RIGHT_IRIS_TOP: 470,
    RIGHT_IRIS_LEFT: 471,
    RIGHT_IRIS_BOTTOM: 472,

    LEFT_IRIS_CENTER: 473,
    LEFT_IRIS_RIGHT: 474,
    LEFT_IRIS_TOP: 475,
    LEFT_IRIS_LEFT: 476,
    LEFT_IRIS_BOTTOM: 477
  };

  /**
   * Calculate 2D or 3D Euclidean distance between two landmarks
   */
  function distance(p1, p2, useZ = false) {
    if (!p1 || !p2) return 0;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    if (useZ && p1.z != null && p2.z != null) {
      const dz = p1.z - p2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle in degrees between three points (vertex is p2)
   */
  function angleBetween(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return 180;
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 === 0 || mag2 === 0) return 180;
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  /**
   * Estimate 3D head pose (Yaw, Pitch, Roll in degrees) from key landmarks
   */
  function estimateHeadPose(landmarks, width = 640, height = 480) {
    const nose = landmarks[LANDMARKS.NOSE_TIP];
    const leftEye = landmarks[LANDMARKS.EYE_OUTER_LEFT];
    const rightEye = landmarks[LANDMARKS.EYE_OUTER_RIGHT];
    const chin = landmarks[LANDMARKS.CHIN];
    const forehead = landmarks[LANDMARKS.FOREHEAD_TOP];

    if (!nose || !leftEye || !rightEye || !chin || !forehead) {
      return { yaw: 0, pitch: 0, roll: 0, isValid: false };
    }

    // 1. Roll: angle of eye line relative to horizontal
    const eyeDx = (leftEye.x - rightEye.x) * width;
    const eyeDy = (leftEye.y - rightEye.y) * height;
    const roll = (Math.atan2(eyeDy, eyeDx) * 180) / Math.PI;

    // 2. Yaw: horizontal offset of nose tip relative to eye midpoint
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeDist = Math.abs(leftEye.x - rightEye.x);
    const yawRatio = eyeDist > 0 ? (nose.x - eyeMidX) / eyeDist : 0;
    const yaw = yawRatio * 55; // Calibrated angular approximation

    // 3. Pitch: vertical offset of nose tip relative to forehead-chin line
    const faceMidY = (forehead.y + chin.y) / 2;
    const faceHeight = Math.abs(chin.y - forehead.y);
    const pitchRatio = faceHeight > 0 ? (nose.y - faceMidY) / faceHeight : 0;
    const pitch = (pitchRatio - 0.08) * 60; // Offset accounting for anatomical nose height

    return {
      yaw: Math.round(yaw * 10) / 10,
      pitch: Math.round(pitch * 10) / 10,
      roll: Math.round(roll * 10) / 10,
      isValid: true
    };
  }

  /**
   * Measure iris diameter in normalized pixels and compute mm-per-pixel ratio
   */
  function computeIrisCalibration(landmarks, config, imageWidth = 640, imageHeight = 480) {
    const defaultIrisMm = config?.calibration?.irisDiameterMm || 11.7;

    // Right iris horizontal diameter
    const rRight = landmarks[LANDMARKS.RIGHT_IRIS_RIGHT];
    const rLeft = landmarks[LANDMARKS.RIGHT_IRIS_LEFT];
    const rightIrisPx = rRight && rLeft ?
      distance(
        { x: rRight.x * imageWidth, y: rRight.y * imageHeight },
        { x: rLeft.x * imageWidth, y: rLeft.y * imageHeight }
      ) : 0;

    // Left iris horizontal diameter
    const lRight = landmarks[LANDMARKS.LEFT_IRIS_RIGHT];
    const lLeft = landmarks[LANDMARKS.LEFT_IRIS_LEFT];
    const leftIrisPx = lRight && lLeft ?
      distance(
        { x: lRight.x * imageWidth, y: lRight.y * imageHeight },
        { x: lLeft.x * imageWidth, y: lLeft.y * imageHeight }
      ) : 0;

    let avgIrisPx = 0;
    if (rightIrisPx > 0 && leftIrisPx > 0) {
      avgIrisPx = (rightIrisPx + leftIrisPx) / 2;
    } else {
      avgIrisPx = rightIrisPx || leftIrisPx || 0;
    }

    if (avgIrisPx <= 0) {
      return { mmPerPixel: 0.35, avgIrisPx: 33.4, isValid: false };
    }

    const mmPerPixel = defaultIrisMm / avgIrisPx;
    return {
      mmPerPixel,
      avgIrisPx,
      rightIrisPx,
      leftIrisPx,
      isValid: avgIrisPx >= 15 && avgIrisPx <= 80
    };
  }

  /**
   * Extract raw pixel and millimeter geometric measurements from a single frame
   */
  function extractFrameMetrics(landmarks, config, imageWidth = 640, imageHeight = 480) {
    const scale = computeIrisCalibration(landmarks, config, imageWidth, imageHeight);
    const mmPerPx = scale.mmPerPixel || 0.35;

    // Convert landmark to pixel coordinates
    const toPx = (lm) => ({ x: lm.x * imageWidth, y: lm.y * imageHeight, z: (lm.z || 0) * imageWidth });

    const pCheekR = toPx(landmarks[LANDMARKS.CHEEKBONE_RIGHT]);
    const pCheekL = toPx(landmarks[LANDMARKS.CHEEKBONE_LEFT]);
    const pForehead = toPx(landmarks[LANDMARKS.FOREHEAD_TOP]);
    const pChin = toPx(landmarks[LANDMARKS.CHIN]);
    const pJawR = toPx(landmarks[LANDMARKS.JAW_RIGHT]);
    const pJawL = toPx(landmarks[LANDMARKS.JAW_LEFT]);
    const pTempleR = toPx(landmarks[LANDMARKS.TEMPLE_RIGHT]);
    const pTempleL = toPx(landmarks[LANDMARKS.TEMPLE_LEFT]);

    // Distances in pixels
    const cheekWidthPx = distance(pCheekR, pCheekL);
    const faceLengthPx = distance(pForehead, pChin);
    const jawWidthPx = distance(pJawR, pJawL);
    const foreheadWidthPx = distance(pTempleR, pTempleL);

    // Jaw angle at chin
    const jawAngleDeg = angleBetween(pJawR, pChin, pJawL);

    // Ratios
    const lengthToWidth = cheekWidthPx > 0 ? faceLengthPx / cheekWidthPx : 1.4;
    const jawToCheekbone = cheekWidthPx > 0 ? jawWidthPx / cheekWidthPx : 0.75;
    const foreheadToCheekbone = cheekWidthPx > 0 ? foreheadWidthPx / cheekWidthPx : 0.82;
    const foreheadToJaw = jawWidthPx > 0 ? foreheadWidthPx / jawWidthPx : 1.1;

    // Metric dimensions in millimeters
    const cheekWidthMm = cheekWidthPx * mmPerPx;
    const faceLengthMm = faceLengthPx * mmPerPx;
    const jawWidthMm = jawWidthPx * mmPerPx;
    const foreheadWidthMm = foreheadWidthPx * mmPerPx;

    // Face to frame ratio
    const faceToFrameRatio = cheekWidthPx / imageWidth;

    return {
      pixels: {
        cheekWidth: cheekWidthPx,
        faceLength: faceLengthPx,
        jawWidth: jawWidthPx,
        foreheadWidth: foreheadWidthPx,
        irisDiameter: scale.avgIrisPx
      },
      mm: {
        cheekWidth: cheekWidthMm,
        faceLength: faceLengthMm,
        jawWidth: jawWidthMm,
        foreheadWidth: foreheadWidthMm
      },
      ratios: {
        lengthToWidth,
        jawToCheekbone,
        foreheadToCheekbone,
        foreheadToJaw,
        jawAngleDeg
      },
      faceToFrameRatio,
      mmPerPixel: mmPerPx,
      scaleValid: scale.isValid
    };
  }

  /**
   * Evaluate frame quality against thresholds and check for hair/glasses warnings
   */
  function evaluateFrameQuality(landmarks, config, imageWidth = 640, imageHeight = 480) {
    const qConf = config?.quality || {};
    const pose = estimateHeadPose(landmarks, imageWidth, imageHeight);
    const metrics = extractFrameMetrics(landmarks, config, imageWidth, imageHeight);

    const issues = [];
    const warnings = [];

    // 1. Pose checks
    if (Math.abs(pose.yaw) > (qConf.maxPoseYawDeg || 7.0)) {
      issues.push(pose.yaw > 0 ? 'Turn head slightly left' : 'Turn head slightly right');
    }
    if (Math.abs(pose.pitch) > (qConf.maxPosePitchDeg || 7.0)) {
      issues.push(pose.pitch > 0 ? 'Tilt head slightly down' : 'Tilt head slightly up');
    }
    if (Math.abs(pose.roll) > (qConf.maxPoseRollDeg || 5.0)) {
      issues.push('Keep head level');
    }

    // 2. Framing checks
    if (metrics.faceToFrameRatio < (qConf.minFaceToFrameRatio || 0.20)) {
      issues.push('Move closer to the camera');
    } else if (metrics.faceToFrameRatio > (qConf.maxFaceToFrameRatio || 0.78)) {
      issues.push('Move slightly back');
    }

    // 3. Scale validity
    if (!metrics.scaleValid) {
      issues.push('Ensure eyes and irises are clearly visible');
    }

    // 4. Hair over forehead check (visibility / confidence of landmark 10)
    const foreheadPt = landmarks[LANDMARKS.FOREHEAD_TOP];
    if (foreheadPt && (foreheadPt.visibility != null && foreheadPt.visibility < (qConf.hairForeheadThreshold || 0.35))) {
      warnings.push({
        type: 'hair',
        message: 'Hair detected covering forehead. Face length measurement has estimated ±4 mm variance.'
      });
    }

    // 5. Eyeglasses worn check (depth deviation around bridge / inner corners)
    const bridgePt = landmarks[LANDMARKS.BRIDGE_TOP];
    const noseRootPt = landmarks[LANDMARKS.NOSE_ROOT];
    if (bridgePt && noseRootPt && Math.abs((bridgePt.z || 0) - (noseRootPt.z || 0)) > (qConf.glassesBridgeThreshold || 0.05)) {
      warnings.push({
        type: 'glasses',
        message: 'Eyeglasses detected. Please remove glasses for accurate optical frame sizing.'
      });
    }

    return {
      isValid: issues.length === 0,
      guidance: issues.length > 0 ? issues[0] : 'Great pose! Hold still...',
      issues,
      warnings,
      pose,
      metrics
    };
  }

  /**
   * Filter outliers using Interquartile Range (IQR) and return median
   */
  function computeMedianWithIQR(values) {
    if (!values || values.length === 0) return 0;
    if (values.length < 4) {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    // Filter outliers within 1.5 * IQR
    const minVal = q1 - 1.5 * iqr;
    const maxVal = q3 + 1.5 * iqr;
    const filtered = sorted.filter(v => v >= minVal && v <= maxVal);

    if (filtered.length === 0) {
      return sorted[Math.floor(sorted.length / 2)];
    }

    const mid = Math.floor(filtered.length / 2);
    if (filtered.length % 2 !== 0) {
      return filtered[mid];
    }
    return (filtered[mid - 1] + filtered[mid]) / 2;
  }

  /**
   * Aggregate a buffer of frames (40+ frames), reject outliers, and compute robust medians
   */
  function aggregateFrameBuffer(buffer, config) {
    if (!buffer || buffer.length === 0) return null;

    const cheekWidthsMm = [];
    const faceLengthsMm = [];
    const jawWidthsMm = [];
    const foreheadWidthsMm = [];
    const lengthToWidths = [];
    const jawToCheekbones = [];
    const foreheadToCheekbones = [];
    const foreheadToJaws = [];
    const jawAngles = [];

    const allWarnings = new Map();

    buffer.forEach(frame => {
      const m = frame.metrics;
      if (!m) return;
      cheekWidthsMm.push(m.mm.cheekWidth);
      faceLengthsMm.push(m.mm.faceLength);
      jawWidthsMm.push(m.mm.jawWidth);
      foreheadWidthsMm.push(m.mm.foreheadWidth);

      lengthToWidths.push(m.ratios.lengthToWidth);
      jawToCheekbones.push(m.ratios.jawToCheekbone);
      foreheadToCheekbones.push(m.ratios.foreheadToCheekbone);
      foreheadToJaws.push(m.ratios.foreheadToJaw);
      jawAngles.push(m.ratios.jawAngleDeg);

      if (Array.isArray(frame.warnings)) {
        frame.warnings.forEach(w => allWarnings.set(w.type, w));
      }
    });

    const medianCheekMm = computeMedianWithIQR(cheekWidthsMm);
    const medianLengthMm = computeMedianWithIQR(faceLengthsMm);
    const medianJawMm = computeMedianWithIQR(jawWidthsMm);
    const medianForeheadMm = computeMedianWithIQR(foreheadWidthsMm);

    const medianLW = computeMedianWithIQR(lengthToWidths);
    const medianJC = computeMedianWithIQR(jawToCheekbones);
    const medianFC = computeMedianWithIQR(foreheadToCheekbones);
    const medianFJ = computeMedianWithIQR(foreheadToJaws);
    const medianJawAngle = computeMedianWithIQR(jawAngles);

    return {
      mm: {
        cheekWidth: Math.round(medianCheekMm * 10) / 10,
        faceLength: Math.round(medianLengthMm * 10) / 10,
        jawWidth: Math.round(medianJawMm * 10) / 10,
        foreheadWidth: Math.round(medianForeheadMm * 10) / 10
      },
      ratios: {
        lengthToWidth: Math.round(medianLW * 1000) / 1000,
        jawToCheekbone: Math.round(medianJC * 1000) / 1000,
        foreheadToCheekbone: Math.round(medianFC * 1000) / 1000,
        foreheadToJaw: Math.round(medianFJ * 1000) / 1000,
        jawAngleDeg: Math.round(medianJawAngle * 10) / 10
      },
      validFramesCount: buffer.length,
      warnings: Array.from(allWarnings.values())
    };
  }

  /**
   * Continuous 0-1 Gaussian membership function
   */
  function gaussianScore(value, mean, sigma) {
    if (sigma <= 0) return 0;
    const diff = value - mean;
    return Math.exp(-(diff * diff) / (2 * sigma * sigma));
  }

  /**
   * Classify face shape using continuous 0-1 scores with zero gaps
   */
  function classifyFaceShape(ratios, config) {
    const shapesConfig = config?.shapes || {};
    const shapeKeys = ['Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Oblong'];
    const scores = {};

    shapeKeys.forEach(shapeKey => {
      const shapeDef = shapesConfig[shapeKey];
      if (!shapeDef || !shapeDef.targets) {
        scores[shapeKey] = 0;
        return;
      }

      let totalScore = 0;
      let totalWeight = 0;

      const t = shapeDef.targets;

      if (t.lengthToWidth) {
        const s = gaussianScore(ratios.lengthToWidth, t.lengthToWidth.mean, t.lengthToWidth.sigma);
        totalScore += s * t.lengthToWidth.weight;
        totalWeight += t.lengthToWidth.weight;
      }

      if (t.jawToCheekbone) {
        const s = gaussianScore(ratios.jawToCheekbone, t.jawToCheekbone.mean, t.jawToCheekbone.sigma);
        totalScore += s * t.jawToCheekbone.weight;
        totalWeight += t.jawToCheekbone.weight;
      }

      if (t.foreheadToCheekbone) {
        const s = gaussianScore(ratios.foreheadToCheekbone, t.foreheadToCheekbone.mean, t.foreheadToCheekbone.sigma);
        totalScore += s * t.foreheadToCheekbone.weight;
        totalWeight += t.foreheadToCheekbone.weight;
      }

      if (t.foreheadToJaw) {
        const s = gaussianScore(ratios.foreheadToJaw, t.foreheadToJaw.mean, t.foreheadToJaw.sigma);
        totalScore += s * t.foreheadToJaw.weight;
        totalWeight += t.foreheadToJaw.weight;
      }

      if (t.jawAngleDeg) {
        const s = gaussianScore(ratios.jawAngleDeg, t.jawAngleDeg.mean, t.jawAngleDeg.sigma);
        totalScore += s * t.jawAngleDeg.weight;
        totalWeight += t.jawAngleDeg.weight;
      }

      const compositeScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      scores[shapeKey] = Math.round(compositeScore * 1000) / 1000;
    });

    // Rank shapes by descending score
    const ranked = shapeKeys
      .map(key => ({
        shape: key,
        displayName: shapesConfig[key]?.displayName || key,
        description: shapesConfig[key]?.description || '',
        score: scores[key]
      }))
      .sort((a, b) => b.score - a.score);

    const primary = ranked[0];
    const secondary = ranked[1];

    const delta = Math.abs(primary.score - secondary.score);
    const borderlineThreshold = config?.borderline?.scoreDeltaThreshold || 0.10;
    const isBorderline = delta <= borderlineThreshold && secondary.score > 0.45;

    return {
      primaryShape: primary.shape,
      primaryScore: primary.score,
      secondaryShape: secondary.shape,
      secondaryScore: secondary.score,
      isBorderline,
      delta: Math.round(delta * 1000) / 1000,
      rankedScores: ranked
    };
  }

  /**
   * Classify face size with configurable boundaries and +/- 4mm overlap
   */
  function classifyFaceSize(cheekWidthMm, config) {
    const sConf = config?.sizeBands || {};
    const smallUpper = sConf.smallUpperMm || 126;
    const largeLower = sConf.largeLowerMm || 136;
    const tol = sConf.boundaryToleranceMm || 4;

    const lowerBoundaryMin = smallUpper - tol; // e.g. 122 mm
    const lowerBoundaryMax = smallUpper + tol; // e.g. 130 mm
    const upperBoundaryMin = largeLower - tol; // e.g. 132 mm
    const upperBoundaryMax = largeLower + tol; // e.g. 140 mm

    let sizeCategory = 'Medium';
    let isBoundary = false;
    let label = 'Medium';
    let matchedFits = ['Regular', 'M'];

    if (cheekWidthMm < lowerBoundaryMin) {
      // Strictly Small (< 122 mm)
      sizeCategory = 'Small';
      isBoundary = false;
      label = 'Small';
      matchedFits = ['Narrow'];
    } else if (cheekWidthMm >= lowerBoundaryMin && cheekWidthMm <= lowerBoundaryMax) {
      // Boundary Small / Medium (122 - 130 mm)
      sizeCategory = 'Small / Medium';
      isBoundary = true;
      label = 'Small / Medium';
      matchedFits = ['Narrow', 'Regular', 'M'];
    } else if (cheekWidthMm > lowerBoundaryMax && cheekWidthMm < upperBoundaryMin) {
      // Strictly Medium (130 - 132 mm)
      sizeCategory = 'Medium';
      isBoundary = false;
      label = 'Medium';
      matchedFits = ['Regular', 'M'];
    } else if (cheekWidthMm >= upperBoundaryMin && cheekWidthMm <= upperBoundaryMax) {
      // Boundary Medium / Large (132 - 140 mm)
      sizeCategory = 'Medium / Large';
      isBoundary = true;
      label = 'Medium / Large';
      matchedFits = ['Regular', 'M', 'Wide'];
    } else {
      // Strictly Large (> 140 mm)
      sizeCategory = 'Large';
      isBoundary = false;
      label = 'Large';
      matchedFits = ['Wide'];
    }

    return {
      sizeCategory,
      isBoundary,
      label,
      cheekWidthMm,
      matchedFits,
      recommendedFrameWidthRange: {
        min: Math.round(cheekWidthMm - 4),
        max: Math.round(cheekWidthMm + 4)
      }
    };
  }

  /**
   * Recommend frames from catalog matching face shape and size with minimum 6 fallback
   */
  function recommendFrames(catalog, shape, sizeClassification, config) {
    if (!Array.isArray(catalog) || catalog.length === 0) return [];

    const recConfig = config?.recommendations?.[shape] || {};
    const primaryShapes = recConfig.primaryShapes || ['Rectangular', 'Square'];
    const compShapes = recConfig.complementaryShapes || [];
    const matchedFits = sizeClassification.matchedFits || ['Regular', 'M'];
    const minRequired = config?.catalogFallback?.minRecommendedFrames || 6;

    // Helper: is frame in stock
    const isInStock = (item) => {
      if (item.stock !== undefined) return Number(item.stock) > 0;
      if (item.total_stock !== undefined) return Number(item.total_stock) > 0;
      if (item.available_qty !== undefined) return Number(item.available_qty) > 0;
      return true;
    };

    // Normalize shape strings
    const matchShape = (itemShape, targetShapes) => {
      if (!itemShape) return false;
      const cleanItem = String(itemShape).trim().toLowerCase();
      return targetShapes.some(t => String(t).trim().toLowerCase() === cleanItem);
    };

    // Normalize fit strings (supports item object or fit string, and Small/Medium/Large <-> Narrow/Regular/Wide)
    const matchFit = (itemOrFit, targetFits) => {
      let rawVal = itemOrFit;
      if (typeof itemOrFit === 'object' && itemOrFit !== null) {
        rawVal = itemOrFit.frame_size || itemOrFit.size || itemOrFit.fit;
      }
      if (!rawVal) return true;
      const cleanItem = String(rawVal).trim().toLowerCase();
      const targetLower = (targetFits || []).map(t => String(t).trim().toLowerCase());
      if (targetLower.includes(cleanItem)) return true;

      // Symmetric mapping between Small/Narrow, Medium/Regular, Large/Wide
      if ((cleanItem === 'small' || cleanItem === 's') && (targetLower.includes('narrow') || targetLower.includes('small') || targetLower.includes('s'))) return true;
      if (cleanItem === 'narrow' && (targetLower.includes('small') || targetLower.includes('narrow') || targetLower.includes('s'))) return true;

      if ((cleanItem === 'medium' || cleanItem === 'm') && (targetLower.includes('regular') || targetLower.includes('medium') || targetLower.includes('m'))) return true;
      if (cleanItem === 'regular' && (targetLower.includes('medium') || targetLower.includes('regular') || targetLower.includes('m'))) return true;

      if ((cleanItem === 'large' || cleanItem === 'l') && (targetLower.includes('wide') || targetLower.includes('large') || targetLower.includes('l'))) return true;
      if (cleanItem === 'wide' && (targetLower.includes('large') || targetLower.includes('wide') || targetLower.includes('l'))) return true;

      return false;
    };

    const results = [];
    const seenIds = new Set();

    // 1. Tier 1: Primary Shape + Exact Fit Match
    catalog.forEach(item => {
      if (!isInStock(item)) return;
      if (matchShape(item.shape, primaryShapes) && matchFit(item, matchedFits)) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push({
            ...item,
            recommendationTier: 'primary',
            badgeReason: 'Ideal Match for ' + shape
          });
        }
      }
    });

    // 2. Tier 2: Complementary Shape + Exact Fit Match (if needed)
    if (results.length < minRequired && compShapes.length > 0) {
      catalog.forEach(item => {
        if (!isInStock(item)) return;
        if (matchShape(item.shape, compShapes) && matchFit(item, matchedFits)) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push({
              ...item,
              recommendationTier: 'complementary',
              badgeReason: 'Complementary Style'
            });
          }
        }
      });
    }

    // 3. Tier 3: Primary Shape + Adjacent Fits (if needed)
    if (results.length < minRequired && config?.catalogFallback?.expandToAdjacentSize) {
      catalog.forEach(item => {
        if (!isInStock(item)) return;
        if (matchShape(item.shape, primaryShapes)) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push({
              ...item,
              recommendationTier: 'adjacent_size',
              badgeReason: 'Adjacent Fit Match'
            });
          }
        }
      });
    }

    // 4. Tier 4: Complementary Shape + Any Fit (ultimate fallback to ensure catalog depth)
    if (results.length < minRequired) {
      catalog.forEach(item => {
        if (!isInStock(item)) return;
        if (matchShape(item.shape, compShapes)) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push({
              ...item,
              recommendationTier: 'extended',
              badgeReason: 'Alternative Styling'
            });
          }
        }
      });
    }

    // 5. Tier 5: Catalog In-Stock Fallback (guarantee minimum frames if boutique catalog has few shape variants)
    if (results.length < minRequired) {
      catalog.forEach(item => {
        if (!isInStock(item)) return;
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push({
            ...item,
            recommendationTier: 'curated_catalog',
            badgeReason: 'Popular Selection'
          });
        }
      });
    }

    return results;
  }

  // Public API
  return {
    LANDMARKS,
    distance,
    angleBetween,
    estimateHeadPose,
    computeIrisCalibration,
    extractFrameMetrics,
    evaluateFrameQuality,
    computeMedianWithIQR,
    aggregateFrameBuffer,
    gaussianScore,
    classifyFaceShape,
    classifyFaceSize,
    recommendFrames
  };
});

