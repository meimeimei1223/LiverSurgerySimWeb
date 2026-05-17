# Usage Guide — Detailed Tutorials & Screenshots

This page is the in-depth companion to [README.md](README.md).
README has the Quick Start, loading instructions, and reference tables;
this page walks through each interaction mode with screenshots and
explains common workflows step by step.

For installation / launch / control reference: see [README.md](README.md).

---

## Table of Contents

1. [Loading a model — full walkthrough](#1-loading-a-model--full-walkthrough)
2. [Deform workflow (handle drag)](#2-deform-workflow-handle-drag)
3. [Free Cut workflow (3D cutter plane)](#3-free-cut-workflow-3d-cutter-plane)
4. [Segment Cut workflow (Couinaud anatomical resection)](#4-segment-cut-workflow-couinaud-anatomical-resection)
5. [Volume panel and tumor visualization](#5-volume-panel-and-tumor-visualization)
6. [Mobile / Tablet usage](#6-mobile--tablet-usage)
7. [Quest3 VR immersive](#7-quest3-vr-immersive)
8. [Android AR passthrough](#8-android-ar-passthrough)
9. [Benchmark mode (for paper measurement)](#9-benchmark-mode-for-paper-measurement)
10. [Troubleshooting (extended)](#10-troubleshooting-extended)

---

## 1. Loading a model — full walkthrough

> **📸 Screenshot needed — `docs/screenshots/01_main_ui.png`**
> Desktop full-window view immediately after the default liver model finishes
> loading. Show: liver mesh centered, top-left "Liver Simulation v287" label,
> top-right mode buttons row (`Visibility | Volume | Reset`).

### Default model

When you visit the simulator URL for the first time without dropping anything,
a small **built-in liver model** is loaded automatically (~3 s on desktop).
This is suitable for trying out the controls but is smaller and lower-resolution
than typical patient data.

### Dropping a patient model

#### Desktop (Chrome / Firefox / Edge)

1. Prepare a folder containing your OBJ files (see [naming convention](#naming-convention) below).
2. Drag the **whole folder** onto the browser window.
3. The OBJ Drop modal appears.

#### Quest3 (Meta Browser, both 2D and VR)

The Meta Browser does **not** support folder drop, so you must ZIP the folder first:

```
my_patient.zip
└── my_patient/
    ├── liver.obj
    ├── portal.obj
    ├── vein.obj
    ├── tumor.obj
    └── gb.obj
```

1. Drag the **`.zip` file** onto the browser window.
2. `fflate.min.js` automatically extracts in-browser (typically <1 s).
3. The OBJ Drop modal appears.

#### Android (Chrome on phone / tablet)

1. Extract the ZIP on your device beforehand (Files app → tap the ZIP).
2. Tap the floating **➕** button.
3. Choose the extracted folder via the system folder picker.

### Naming convention

#### Organ meshes (substring match, case-insensitive)

| Detected as | Required? | Patterns that match |
|---|---|---|
| Liver | **REQUIRED** | `liver.obj`, `LIVER.obj`, `patient001_liver.obj`, `case_A_LIVER.obj` |
| Portal | Strongly recommended (needed for Auto Seg) | `portal.obj`, `portal_vein.obj`, `patient001_PORTAL_VEIN.obj` |
| Vein | Optional | `vein.obj`, `hepatic_vein.obj`, `HV.obj` |
| Tumor | Optional | `tumor.obj`, `Tumor_1.obj`, `lesion_TUMOR.obj` |
| GB | Optional | `gb.obj`, `GB.obj`, `gallbladder.obj` |

If the auto-match is wrong, the modal lets you manually assign files.
Only **liver.obj** is strictly required; the others enable different feature sets:

- Without `portal.obj` → Auto Seg disabled (Segment Cut still works if Preset Seg files are provided)
- Without `tumor.obj` → Tumor row in Volume panel hidden
- Without `vein.obj` / `gb.obj` → those layers omitted (no functional impact)

#### Preset Seg meshes (S/s + digit pattern)

For **Preset Seg mode** (high-accuracy Couinaud segmentation), provide
pre-segmented liver sub-meshes in the same folder. The detection rule (from
`MultiOBJTetrahedralizerWasm.cpp:186-191`) is simple:

> A file is treated as a Couinaud segment if its filename starts with
> **`S` or `s`** followed by a **digit (0–9)**.

Recommended filenames and their anatomical correspondence:

| Filename | Couinaud segment |
|---|---|
| `S1.obj` | S1 (caudate lobe) |
| `S2.obj` | S2 (left lateral superior) |
| `S3.obj` | S3 (left lateral inferior) |
| `S4.obj` | S4 (left medial) |
| `S5.obj` | S5 (right anterior inferior) |
| `S6.obj` | S6 (right posterior inferior) |
| `S7.obj` | S7 (right posterior superior) |
| `S8.obj` | S8 (right anterior superior) |

Variants that also work:

| Pattern | Example | Why it works |
|---|---|---|
| Lowercase | `s1.obj`, `s8.obj` | Either case is accepted |
| Trailing suffix | `S1_lateral.obj`, `s8_extracted.obj` | Only the first two chars are checked |
| Multi-digit | `S10.obj` | Second char is still a digit |

Patterns that do **not** work (no segment detection):

| Bad pattern | Why |
|---|---|
| `soft_S1.obj` | Starts with `s` but second char is `o`, not a digit |
| `Segment1.obj` | Starts with `S` but second char is `e` |
| `S_1.obj` | Second char is `_`, not a digit |
| `liver_S1.obj` | Starts with `l` |

> ℹ️ Internally, the simulator renames detected segment files to
> `/tmp/soft_S*.obj` in the WASM virtual filesystem (the `soft_` prefix is added
> automatically by the tetrahedralizer). You do **not** need to use this prefix
> in your source filenames.

All matched files are auto-loaded after the main liver is generated.
The loading-status bar reports `+ S1-S8` when binding succeeds.

If no segment files are detected, the simulator falls back to **Auto Seg**
(skeleton-based segmentation from `portal.obj`), which is approximate.

### Two segmentation modes

After loading, the **Visual Mode** toolbar (top-right) lets you switch between:

| Button | Mode | Source | Anatomical accuracy |
|---|---|---|---|
| Normal | No segmentation | — | — |
| Auto Seg | Auto segment from portal vein skeleton | `portal.obj` | Approximate (algorithmic) |
| **Preset Seg** | Pre-segmented OBJ | `soft_S1.obj`–`soft_S8.obj` | **High** (matches input segmentation) |

The Preset Seg button is **greyed out** if no `soft_S*.obj` files were loaded.

> ⚠️ **Important for clinical / paper interpretation**: the S1–S8 labels in the
> Volume panel correspond to **Preset Seg** anatomy only. Auto Seg's segment
> numbering is geometric (based on portal branch counts), not Couinaud anatomy,
> so do not interpret "Auto Seg S5" as anatomical Couinaud segment 5.

### Choosing a tetrahedralization preset

> **📸 Screenshot needed — `docs/screenshots/02_load_dialog.png`**
> The "OBJ Drop" modal showing detected files (liver, portal, vein, tumor, gb),
> three preset buttons (`Low / Mid / High`), the grid value sliders, and the
> **Generate** button.

| Preset | Sim tets | Visual tets | Tet generation time (desktop) | Recommended hardware |
|---|---|---|---|---|
| **Low** | ~3,665 | ~22,975 | ~5 s | Mobile, low-end laptops |
| **Mid** | ~6,485 | ~42,070 | ~10 s | Modern desktop, Quest3 |
| **High** | ~42,070 | ~300,780 | ~40 s | Desktop with discrete GPU only |

Click **Generate**. Progress is shown in the loading bar. The simulation
becomes interactive when "First interactable" appears in the console.

---

## 2. Deform workflow (handle drag)

> **📸 Screenshot needed — `docs/screenshots/03_deform.png`**
> Liver with 2–3 handle spheres placed (one on the top of the right lobe, one on
> the inferior border). One handle being actively dragged, showing visible mesh
> deformation. The Deform mode indicator should be highlighted in the UI.

### Steps

1. Press **`D`** to enter Deform mode (or click the **Deform** button in the toolbar).
2. The mode has two sub-modes: **Handle Place** (default) and **Deform**.
3. **Handle Place**: click anywhere on the liver surface — a colored handle sphere appears at that point. Place as many as you want.
4. **Deform**: click on a handle and drag — the surrounding mesh deforms in real time using XPBD soft-body physics.
5. Press **`K`** to clear all handles.

### Tips

- Handles are sticky: they stay attached to the underlying tet even after deformation.
- The smaller the handle, the more localized the deformation.
- You can place multiple handles and pull them in different directions for compound deformation.

---

## 3. Free Cut workflow (3D cutter plane)

> **📸 Screenshot needed — `docs/screenshots/04_freecut.png`**
> Free Cut mode active. Show the green/blue translucent cutter quad intersecting
> the liver mesh. The "Execute Cut" button should be visible. Camera angle should
> make the intersection clear.

### Steps

1. Press **`X`** to enter Free Cut mode.
2. A semi-transparent **cutter quad** appears in the center of the scene.
3. Position the cutter:
   - Drag the cutter itself to move it.
   - Rotate the camera to align it with the desired cut plane.
4. Click the **Execute Cut** button. The liver is sliced along the cutter plane.
5. If the cut produces multiple disconnected fragments, a **Fragment Selection** popup appears:
   - Each fragment is highlighted with a number.
   - Click the fragment you want to **keep** (the others are discarded).

### Seg Overlay (visual aid during Free Cut)

While in Free Cut mode, press **`Q`** to toggle the **Seg Overlay**:
- The liver re-colors to show which Couinaud segments the cutter is currently intersecting.
- Useful for "I want to cut along the S5/S6 boundary" type planning.

---

## 4. Segment Cut workflow (Couinaud anatomical resection)

> **📸 Screenshot needed — `docs/screenshots/05_segcut.png`**
> Liver in Couinaud segment color mode (S1–S8 as distinct colors). Two adjacent
> segments highlighted as selected. Volume panel open on the side showing current
> ml values.

### Steps

1. Press **`Q`** to enter Segment Cut mode (when not already in Free Cut).
2. The liver re-colors to show **S1–S8** segments. Segmentation is automatic:
   - If your portal.obj contains pre-segmented sub-meshes (e.g., from 3D Slicer), those are used.
   - Otherwise, a voxel-based skeleton analysis assigns each tet to the nearest portal branch.
3. **Click** on a segment to **select** it (it brightens). Click again to deselect.
4. Multi-select is supported — typically you select adjacent segments for an anatomical resection (e.g., S5+S6+S7+S8 = right hepatectomy).
5. Press **`Z`** to execute the cut. Selected segments are removed.
6. Open the Volume panel (**`B`**) to see:
   - Remnant liver volume (ml)
   - Resected volume (ml + % of original)

### Tips

- Auto-segmentation quality depends on portal vein mesh completeness.
- For published anatomical accuracy, use a pre-segmented portal.obj from clinical segmentation software.
- Use Free Cut for non-anatomical cuts (wedge resections, etc.).

---

## 5. Volume panel and tumor visualization

> **📸 Screenshot needed — `docs/screenshots/06_volume_panel.png`**
> Volume panel open showing: Total volume (e.g., "1966 ml"), S1–S8 rows with ml
> + %, and Tumor row. Liver mesh visible with tumor inside (semi-transparent so
> tumor is partially visible through liver surface).

### Opening

Press **`B`** or click the **Volume** button. The panel is draggable.

### Contents

| Row | Meaning |
|---|---|
| **Total** | Current liver volume in ml |
| **Original** | Liver volume at load (snapshot) |
| **Remnant** | Current / Original × 100% |
| **S1–S8** | Per-segment volume + percentage |
| **Portal / Vein / Tumor / GB** | Initial volume of other organs |

### Color coding

- **Green** (✓): volume within 90–110% of original — normal post-cut
- **Yellow** (⚠): 80–120% — minor deformation
- **Red** (✗): outside 80% — significant change (intentional resection or error)

### Tumor visualization

Toggle tumor opacity via the **Visibility** button (top-right) → tumor slider.

> **Coming soon**: "Liver (exclude tumor)" row — the C++ desktop version
> calculates this (liver − tumor overlap volume), but the WASM port is
> deferred until after paper submission. See `project_plan_volume.md` in
> the source repository for the implementation plan.

---

## 6. Mobile / Tablet usage

> **📸 Screenshot needed — `docs/screenshots/07_mobile_ui.png`**
> Android phone screenshot in landscape mode showing the simulator with the
> bottom mode toolbar visible (Deform / Free Cut / Seg Cut / Transform buttons).

### Touch reference

| Touch | Action |
|---|---|
| Single finger drag | Camera rotate |
| Two finger pinch | Zoom |
| Two finger drag | Camera pan |
| Tap a handle | Grab (Deform mode) |
| Drag a handle | Deform mesh |
| Tap mode buttons (bottom bar) | Switch modes |
| Tap ➕ button | Submenu (Volume, Visibility, Reset) |

### Tips

- UI is fully touch-accessible — no keyboard required.
- The bottom toolbar contains all the same modes as the desktop keyboard shortcuts.
- For best performance on mobile, use the **Low** preset.
- Folder drop is unsupported in mobile browsers; use the ➕ button to pick an extracted folder.

---

## 7. Quest3 VR immersive

> **📸 Screenshot needed — `docs/screenshots/08_vr_view.png`**
> Quest3 in-VR screenshot showing: liver mesh with handle spheres, side panel
> floating in 3D space (now properly behind objects after v287 fix), hand
> tracking skeleton visualization, FPS / control info panel.

### Entry

1. Open the simulator URL in **Meta Browser** on Quest3.
2. Load a model (see [Loading](#1-loading-a-model--full-walkthrough)).
3. Choose preset (recommend Low or Mid for VR).
4. Click **Generate** → wait for tet generation.
5. Tap the **VR** button (visible when WebXR `immersive-vr` is supported).

### Hand controls

| Action | Effect |
|---|---|
| Right hand pinch + drag on handle | Grab + deform |
| Left hand pinch + drag in empty space | Rotate / translate the entire model |
| Right index pinch on cutter | Place / move cutter |
| Pinch on side-panel button | Activate UI button |
| Both hands pinch + spread/squeeze | Scale model |

### Tips

- Hand tracking is preferred over controllers (more intuitive for surgical gestures).
- The side panel is anchored to the left of the main panel. Both follow your head.
- For comfortable use, sit and keep movements small. The simulation runs at 30 FPS on Mid preset.
- High preset on Quest3 VR is ~5 FPS — usable for static observation only.

### Exit

Press the menu button on the right controller (or remove the headset) to exit VR mode.
The benchmark report button (📊) reappears in flat-screen mode after exit.

---

## 8. Android AR passthrough

> **📸 Screenshot needed — `docs/screenshots/09_ar_view.png`**
> Android phone AR passthrough screenshot: liver model anchored on a real-world
> surface (e.g., desk), with DOM overlay UI buttons at the top. Show some
> real-world background visible (table, hand, etc.).

### Requirements

- ARCore-supported Android device (Chrome 90+).
- Camera permission.
- Adequate lighting for plane detection.

### Entry

1. Open the simulator URL in **Chrome on Android**.
2. Load a model and Generate.
3. Tap the **AR** button (visible when WebXR `immersive-ar` is supported).
4. Move the phone to scan a flat surface — a reticle indicates the placement target.
5. Tap to anchor the liver on the surface.

### Touch controls

| Touch | Effect |
|---|---|
| Tap on handle | Grab (then drag to deform) |
| Tap on empty mesh surface | Place new handle (Handle Place sub-mode) |
| Two finger pinch | Scale model |
| Tap panel buttons (DOM overlay) | Standard UI |
| Tap **Exit** | Return to flat-screen browser mode |

### Tips

- AR is best for visual demonstration to colleagues / patients (immersive viewing).
- Performance is preset-dependent: Low ~27 FPS, Mid ~15 FPS, High ~3.5 FPS.
- The same DOM overlay UI from browser mode is available in AR — no separate AR-specific UI to learn.

---

## 9. Benchmark mode (for paper measurement)

When the URL has `?bench=1`, a floating **📊 Bench** button appears at the bottom-right corner.

> **📸 Screenshot needed — `docs/screenshots/10_bench_panel.png`**
> The benchmark report panel open, showing the Markdown report with sections:
> Platform, Model, Initial load, OBJ drop history, FPS, Cut operations, XR Sessions.

### Workflow

1. Append `?bench=1` to the URL: `https://.../LiverSurgerySimWeb/?bench=1`
2. Drop your model and Generate.
3. Perform the standardized interaction sequence:
   - 10 s **idle** (no interaction)
   - 10 s **rotation** (camera or hand rotation)
   - 10 s **deform** (place + drag handles)
   - 3× **Free Cut**
   - 1× **Segment Cut**
4. Click the **📊** button → **Download JSON** (or **Copy JSON / MD**).
5. The JSON contains per-second FPS samples per activity bucket, cut compute times, XR session details, and platform fingerprint.

### Reproducible deployment

For exact paper reproducibility, use the frozen snapshot URL:

```
https://meimeimei1223.github.io/LiverSurgerySimWeb/paper-benchmark-v1/?bench=1
```

This is the bit-frozen v286 deployment used to collect the data in the AE-CAI 2026 paper.

---

## 10. Troubleshooting (extended)

| Symptom | Cause / Fix |
|---|---|
| Black screen on load | WebGL2 not supported. Update browser. Check `chrome://gpu` for blacklist entries. |
| Drop doesn't trigger | Folder must contain at least one file with "liver" in the name. Re-drop the same folder works in v282+. |
| Quest3 VR button missing | WebXR `immersive-vr` not detected. Ensure Meta Browser is updated and dev-mode is on if needed. |
| Android AR button missing | ARCore not installed or device unsupported. Check `chrome://flags` for WebXR AR. |
| Cut button greyed out | Cutter must intersect the mesh. Drag the cutter into the liver first. |
| FPS very low after first load | Browser still warming up (texture upload, JIT compilation). Wait 30 s and re-measure. |
| Volume shows 0 ml | `scaleFactor` not yet applied. Reload after the model finishes generating. |
| VR side panel hides the liver | Fixed in v287 (draw order change). Hard-reload (Ctrl+Shift+R) to clear SW cache. |
| Service Worker stuck on old version | DevTools → Application → Service Workers → Unregister → reload. |
| HIGH preset crashes Quest3 | Adreno 740 may run out of GPU memory at ~300K visual tets. Use Mid instead. |
| OBJ drop modal doesn't appear | Open DevTools console — check for "Failed to load OBJ" errors. Some OBJ exporters (e.g., Blender with grouping options) produce non-standard files. |
| Firebase login fails | Optional feature; not required for benchmarking. Sign-in is for cloud model storage. |
| Tet generation hangs >60 s | HIGH preset on slow CPU. Lower to Mid or wait. WASM lacks threads, so it's single-threaded. |

If you encounter an issue not listed here, please open an issue at:
https://github.com/meimeimei1223/LiverSurgerySimWeb/issues
(include browser console log, platform, URL, and steps to reproduce).

---

## Screenshots inventory (checklist for the maintainer)

This file currently has **10 screenshot placeholders**:

| # | File | Captures |
|---|---|---|
| 01 | `01_main_ui.png` | Desktop fresh load, default model, labels visible |
| 02 | `02_load_dialog.png` | OBJ Drop modal with preset buttons |
| 03 | `03_deform.png` | Deform mode with handles + active drag |
| 04 | `04_freecut.png` | Free Cut cutter intersecting liver |
| 05 | `05_segcut.png` | Segment Cut with S1–S8 colors + selected segs |
| 06 | `06_volume_panel.png` | Volume panel open with breakdown |
| 07 | `07_mobile_ui.png` | Android landscape with mode toolbar |
| 08 | `08_vr_view.png` | Quest3 VR view, hand tracking, panels |
| 09 | `09_ar_view.png` | Android AR with liver on table |
| 10 | `10_bench_panel.png` | Benchmark report panel |

Put PNG files in `docs/screenshots/` (create folder). README and USAGE.md already reference the expected paths.
