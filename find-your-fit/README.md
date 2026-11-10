# Noor Optics – "Find Your Fit" Face-Scan & Frame Recommendation Engine

The **Find Your Fit** module is a 100% client-side, privacy-preserving face geometry scanner and optical frame recommendation tool built for the Noor Optics storefront. It runs in-browser using self-hosted MediaPipe Face Landmarker models (478 3D landmarks) with zero server-side image processing.

---

## 1. How to Place or Move the Button

The module uses an ultra-lightweight inline loader (`< 2 KB`) that lazy-loads all stylesheets, mathematical models, and vision WASM files **only when the user clicks the button**.

To place the button anywhere in your HTML, add this single 2-line snippet:

```html
<!-- Noor Optics: Find Your Fit Module -->
<div id="ffit-mount"></div>
<script src="/find-your-fit/ffit-loader.js" async></script>
```

If `#ffit-mount` is placed in the DOM, the button mounts exactly inside that container. If the script is included without the container, it gracefully inserts itself directly below the main storefront header.

---

## 2. Instant On/Off Kill-Switch

To enable or disable the entire feature instantly across the website without modifying HTML code:

1. Open `find-your-fit/config.json`.
2. Toggle the `"enabled"` flag:
   ```json
   {
     "enabled": false
   }
   ```
3. When `"enabled": false`, `ffit-loader.js` silently hides the mount container with **zero console errors** and downloads zero models or styles.

---

## 3. How to Tune Classification Thresholds & Weights

All mathematical scoring parameters reside in `find-your-fit/config.json`. The engine computes a continuous **0 to 1 score** for each shape with **zero gaps** in ratio ranges using Gaussian membership functions:

$$\text{Score}(x) = \exp\left( -\frac{(x - \mu)^2}{2 \sigma^2} \right)$$

In `find-your-fit/config.json`, edit any shape's target parameters:

```json
"Oval": {
  "displayName": "Oval",
  "targets": {
    "lengthToWidth":        { "mean": 1.45, "sigma": 0.12, "weight": 0.30 },
    "jawToCheekbone":       { "mean": 0.74, "sigma": 0.08, "weight": 0.25 },
    "foreheadToCheekbone":  { "mean": 0.82, "sigma": 0.08, "weight": 0.20 },
    "foreheadToJaw":        { "mean": 1.10, "sigma": 0.10, "weight": 0.15 },
    "jawAngleDeg":          { "mean": 136.0, "sigma": 10.0, "weight": 0.10 }
  }
}
```

- **`mean`**: The ideal geometric ratio representing this shape.
- **`sigma`**: The tolerance spread (larger = more forgiving, smaller = stricter).
- **`weight`**: The relative importance of this ratio (sum of weights = 1.0).

---

## 4. Size Bands & $\pm 4\text{ mm}$ Boundary Overlap

Millimeter sizing thresholds are editable in `find-your-fit/config.json`:

```json
"sizeBands": {
  "smallUpperMm": 126,
  "largeLowerMm": 136,
  "boundaryToleranceMm": 4
}
```

- **Strictly Small**: Width $< 122\text{ mm}$ ($126 - 4$).
- **Small / Medium Boundary Match**: $122\text{ mm} \le \text{Width} \le 130\text{ mm}$ (recommends both `Narrow` and `Regular`).
- **Strictly Medium**: $130\text{ mm} < \text{Width} < 132\text{ mm}$.
- **Medium / Large Boundary Match**: $132\text{ mm} \le \text{Width} \le 140\text{ mm}$ (recommends both `Regular` and `Wide`).
- **Strictly Large**: Width $> 140\text{ mm}$ ($136 + 4$).

---

## 5. Catalog Recommendations & Fallbacks

Each face shape maps to recommended optical frame styles using exact string literals matching `data.js`:

```json
"recommendations": {
  "Round": {
    "primaryShapes": ["Rectangular", "Square"],
    "complementaryShapes": ["Hex / Geometric", "Geometric"]
  }
}
```

- **Minimum 6-Frame Guarantee**: If inventory for the primary shape and size yields fewer than 6 frames, the engine automatically expands to complementary shapes and adjacent size bands, badging each item clearly in the results UI.
- **Stock Enforcement**: Products with `stock: 0` are strictly excluded from recommendations.

---

## 6. Hidden Empirical Calibration Laboratory

To tune thresholds using real human subjects and stylists:

1. Open your browser to:
   [http://localhost:3000/find-your-fit/calibration.html](http://localhost:3000/find-your-fit/calibration.html)
2. Position a test subject in front of the camera.
3. Observe live measurements (Face Width mm, Length mm, Jaw mm, Jaw Angle, Auto-Prediction).
4. Have the master stylist select their expert judgment (Stylist Shape & Size).
5. Click **"Save Test Subject Measurement"**.
6. Repeat for 30–50 subjects across genders and ethnicities.
7. Click **"Export Dataset to CSV"** to download `noor_face_calibration_dataset.csv`.
8. Compare algorithm predictions vs stylist classifications and adjust the `mean` and `sigma` values in `config.json` accordingly.

---

## 7. URL Debug Mode (`?ffit-debug=1`)

To inspect real-time landmark meshes, iris circles, head pose vectors, and live 0–1 score cards on the storefront:

Visit: [http://localhost:3000/?ffit-debug=1](http://localhost:3000/?ffit-debug=1)

---

## 8. Summary of Known Limitations & Expected Accuracy

| Measurement / Feature | Expected Accuracy | Limitations & Edge Cases |
| :--- | :--- | :--- |
| **Face Width (Cheekbone to Cheekbone)** | **$\pm 1.5\text{ mm}$** | High precision. Dependent on user looking directly at the camera (within $\pm 7^\circ$ yaw). |
| **Jaw Width & Jaw Angle** | **$\pm 1.8\text{ mm}$ / $\pm 3^\circ$** | High precision. Significant facial hair / beards may obscure jaw gonion landmarks (172, 397). |
| **Face Length (Trichion to Menton)** | **$\pm 4.0\text{ mm}$** | **Lowest precision measurement**. Hair fringes or bangs covering the forehead obscure landmark 10. The system detects this and triggers a warning banner. |
| **Iris Scale Calibration (11.7 mm HVID)** | **$\pm 2.5\%$ scale error** | Standard human HVID averages $11.7\text{ mm}$ with a population standard deviation of $\pm 0.5\text{ mm}$. A user with naturally larger or smaller irises may have slight scale offset. Phase 2 physical card calibration will offer ground-truth scale. |
| **Eyeglasses Detection** | Real-time warning | Users wearing thick-rimmed glasses may deflect eye corner and bridge landmarks. The scanner prompts users to remove glasses. |
| **Lighting & Camera Quality** | Adequate luminance required | Backlit environments or cameras under 480p can increase landmark jitter. Outlier rejection (IQR) and 40-frame median smoothing mitigate transient jitter. |

