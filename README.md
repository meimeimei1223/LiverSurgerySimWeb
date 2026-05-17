# Liver Surgery Simulator (Web)

Real-time liver surgery simulation running in the browser via WebAssembly.

---
## Live Demo

**[Launch Simulator](https://meimeimei1223.github.io/LiverSurgerySimWeb/)** — latest version (continuously updated)

[Benchmark mode](https://meimeimei1223.github.io/LiverSurgerySimWeb/?bench=1) — performance measurement panel enabled (current build)

### 📄 Reproducibility — Frozen Snapshot for Paper

The exact deployment used to collect the benchmark results reported in our
AE-CAI 2026 paper is preserved at a separate, immutable URL:

**[paper-benchmark-v1 (live snapshot)](https://meimeimei1223.github.io/LiverSurgerySimWeb/paper-benchmark-v1/?bench=1)**

Equivalent references:

| Resource | URL |
|---|---|
| Live snapshot (runnable) | https://meimeimei1223.github.io/LiverSurgerySimWeb/paper-benchmark-v1/ |
| Source code (browsable) | https://github.com/meimeimei1223/LiverSurgerySimWeb/tree/paper-benchmark-v1 |
| Git tag (commit `54c80b7`) | `git checkout paper-benchmark-v1` |
| Snapshot README | [paper-benchmark-v1/README.md](paper-benchmark-v1/README.md) |

The snapshot is `index.html v286` + `benchmark.js v1.0.9` + the
`softbody.{js,wasm,data}` binaries built on 2026-04-30. The live URL above
the snapshot will continue to evolve, but the snapshot URL is bit-frozen.

> ⚠️ **Not for clinical use.** This is an educational demonstration only.
> Do not upload identifiable patient data.
> 
## Quick Start

1. **[Click → Launch Simulator](https://meimeimei1223.github.io/LiverSurgerySimWeb/)**
2. The default liver model auto-loads (~10 s on desktop).
3. **Mouse drag** to rotate, **scroll** to zoom, **right-drag** to pan.
4. Press **`D`** → click the surface to place a handle → drag to deform.
5. Press **`X`** → drag to position the cutter → click **Execute Cut** to slice.
6. Press **`B`** to open the Volume panel (S1–S8 ml breakdown).

➡ For detailed step-by-step tutorials with screenshots, see **[USAGE.md](USAGE.md)**.

To load your own patient OBJ model, see [Loading Custom Models](#loading-custom-models) below.

---

## Features

- **Soft-body physics** — XPBD (Extended Position Based Dynamics) solver compiled from C++ to WebAssembly
- **Free Cut** — Place a 3D cutter and cut liver/portal/vein with fragment selection
- **Segment Cut** — Select portal segments (S1–S8) and cut by segment with volume calculation
- **Deform** — Place handle spheres and deform the liver interactively
- **Transform** — Rotate and translate the model using FullSphereCamera (quaternion, no gimbal lock)
- **Transparency** — Per-organ alpha control with depth-sorted rendering
- **Volume Display** — Real-time volume calculation with segment breakdown (ml / %)
- **Seg Overlay** — Visualize which segment the cutter is touching during Free Cut
- **OBJ Drop** — Drop custom OBJ files to tetrahedralize and simulate any liver model
- **Cross-platform** — Desktop browsers, Android (browser + AR passthrough), Quest3 (browser + immersive VR)

---

## Loading Custom Models

### Required folder structure

A complete liver model consists of up to 5 OBJ files in one folder:

```
my_patient/
├── liver.obj      ← Parent mesh (REQUIRED)
├── portal.obj     ← Portal vein (optional but recommended)
├── vein.obj       ← Hepatic vein
├── tumor.obj      ← Tumor lesion
└── gb.obj         ← Gallbladder
```

The filenames are matched by substring (case-insensitive), so
`patient001_liver.obj` etc. also work.

### Naming convention

Filenames are matched by **case-insensitive substring**, so the following all work:

| Detected as | Patterns that match |
|---|---|
| Liver | `liver.obj`, `LIVER.obj`, `patient001_liver.obj`, `case_A_LIVER.obj` |
| Portal | `portal.obj`, `portal_vein.obj`, `PORTAL_VEIN.obj` |
| Vein | `vein.obj`, `hepatic_vein.obj`, `HV.obj` |
| Tumor | `tumor.obj`, `Tumor_1.obj`, `lesion_TUMOR.obj` |
| GB | `gb.obj`, `GB.obj`, `gallbladder.obj` |

Only **liver** is required; others are optional but recommended.

### Drop method by platform

| Platform | Method |
|---|---|
| Desktop (Chrome / Firefox / Edge) | Drag the **folder** onto the page |
| Android Browser / AR | Tap the floating ➕ button → select extracted folder |
| Quest3 Browser / VR | Drag a **ZIP archive** onto the page (folder drop unsupported on Meta Browser) |

For Quest3 ZIP format:

```
my_patient.zip
└── my_patient/
    ├── liver.obj
    ├── portal.obj
    ├── ...
```

After dropping, choose a [tetrahedralization preset](#tet-density-presets) and click **Generate**.

➡ Full walkthrough including OBJ Drop modal screenshots: **[USAGE.md §1](USAGE.md#1-loading-a-model--full-walkthrough)**.

---

## Tet Density Presets

The tetrahedral grid resolution controls simulation accuracy vs. performance:

| Preset | Sim tets | Visual tets | Recommended hardware |
|---|---|---|---|
| **Low** | ~3,665 | ~22,975 | Mobile phones, low-end laptops, AR mode |
| **Mid** | ~6,485 | ~42,070 | Modern desktop, Quest3 VR |
| **High** | ~42,070 | ~300,780 | Desktop with discrete GPU only |

Higher density → smoother deformation and finer cuts, but proportionally more
CPU (physics) and GPU (rendering) load. See [Performance by Platform](#performance-by-platform)
for measured FPS on each preset.

---

## Interaction Modes (summary)

| Mode | Key | What it does |
|---|---|---|
| **Deform** | `D` | Place handle spheres, drag to deform the liver in real time |
| **Free Cut** | `X` | Place a 3D cutter plane, slice liver / portal / vein |
| **Segment Cut** | `Q` then `Z` | Select Couinaud S1–S8 segments and resect them as a group |
| **Transform** | `T` | Rotate / translate the whole model |

➡ Step-by-step tutorials for each mode (with screenshots): **[USAGE.md §2–§5](USAGE.md)**.

---

## Controls

### Desktop (mouse + keyboard)

| Key / Mouse | Action |
|---|---|
| Left drag | Camera rotate / Grab mesh (in Deform mode) |
| Right drag | Camera pan |
| Scroll | Camera zoom |
| **D** | Deform mode (Handle Place) |
| **X** | Free Cut mode |
| **Q** | Seg Overlay (in Free Cut) / Segment Cut mode |
| **T** | Transform mode |
| **F** | Liver Select |
| **G** | Portal Select |
| **Z** | Execute Segment Cut |
| **K** | Clear Selection |
| **B** | Volume panel |
| F1 | Wireframe toggle |
| F2 | Reset shape |
| Esc | Exit immersive (VR/AR) |

### Mobile / Tablet (touch)

| Touch | Action |
|---|---|
| Single finger drag | Camera rotate |
| Two finger pinch | Zoom |
| Two finger drag | Camera pan |
| Tap a handle | Grab (Deform mode) |
| Drag a handle | Deform mesh |
| Tap mode buttons (bottom bar) | Switch modes |

UI is fully touch-accessible — no keyboard required.

### Immersive VR / AR

| Mode | Platform | Entry |
|---|---|---|
| **VR immersive** | Quest3 (Meta Browser) | Tap **VR** button |
| **AR passthrough** | Android (Chrome) | Tap **AR** button |

➡ Detailed VR / AR hand & touch controls: **[USAGE.md §7–§8](USAGE.md#7-quest3-vr-immersive)**.

---

## Performance by Platform

Measured idle FPS at the standardized benchmark workflow
([source: `?bench=1`](https://meimeimei1223.github.io/LiverSurgerySimWeb/paper-benchmark-v1/?bench=1)):

| Platform | Hardware | Low | Mid | High |
|---|---|---|---|---|
| Desktop Chrome | RTX 4070 | 58 | 60 | 28 |
| Desktop Firefox | RTX 4070 | 55 | 52 | 34 |
| Quest3 Browser 2D | Adreno 740 | 26 | 23 | 17 |
| Quest3 VR immersive | Adreno 740 | 30 | 21 | **5** |
| Android Browser | Adreno 710 | 34 | 32 | 9 |
| Android AR immersive | Adreno 710 | 27 | 15 | **3.5** |

➡ Cut compute times, mean ± std, full benchmark methodology: **[USAGE.md §9](USAGE.md#9-benchmark-mode-for-paper-measurement)** and paper supplementary material.

---

## Known Limitations (brief)

- **HIGH preset on mobile / HMD**: 3–17 FPS — usable for review, not real-time interactive
- **Quest3**: ZIP drop only (folder drop unsupported in Meta Browser)
- **Firefox**: GPU and CPU threads spoofed by Resist Fingerprinting (same RTX 4070 hardware, same performance as Chrome)
- **iOS Safari**: Not officially tested (WebGL2 + WebXR incomplete)
- **"Liver (exclude tumor)" volume**: Desktop C++ only; WASM port deferred (post-paper)

➡ Full limitations + troubleshooting table: **[USAGE.md §10](USAGE.md#10-troubleshooting-extended)**.

## Technology

- **Physics**: C++ XPBD solver → WebAssembly (Emscripten)
- **Rendering**: WebGL 2.0 with depth-sorted transparency
- **Camera**: FullSphereCamera (quaternion rotation, no gimbal lock)
- **Segmentation**: Voxel skeleton analysis + OBJ S1–S8 Couinaud classification
- **Tetrahedralization**: CentVoxTetrahedralizerHybrid (in-browser, proprietary)

---

## License

This software is released under the **LiverSurgerySimWeb License**, a proprietary source-available license with all rights reserved. See [LICENSE](LICENSE) for the complete terms.

### Key Points

| | |
|---|---|
| ✅ | Personal academic study is permitted |
| ✅ | Citation is required in academic publications |
| ❌ | No copying, forking, cloning, or re-hosting |
| ❌ | No modifications or derivative works |
| ❌ | No reverse engineering or decompilation |
| ❌ | No use as AI / machine learning training data |
| ❌ | No commercial or clinical use without written permission |
| ❌ | Not a medical device — not for clinical decision making |

### Commercial Licensing

The author welcomes inquiries from organizations interested in licensing this technology for:

- Commercial software products
- Medical device development and regulatory submission
- Integration into paid educational platforms
- Clinical research with appropriate regulatory oversight

For licensing inquiries, please contact: **meidai1223@gmail.com**

---

## Citation

If you reference this work in academic publications, please cite:

> Kasai, M. (2026). *LiverSurgerySimWeb: A browser-based liver surgery simulator with soft-body physics and segment-aware cutting.* [Software]. https://github.com/meimeimei1223/LiverSurgerySimWeb

## Disclaimer

This software is provided "as is" without warranty of any kind. It has not been reviewed, cleared, or approved by the PMDA, FDA, EMA, or any other regulatory authority. The soft-body physics simulation is a simplified model for educational and demonstrative purposes and does not accurately represent the biomechanical behavior of real human liver tissue.

**This software must not be used for any clinical decision making, surgical planning, or treatment of human patients.**

---

## Third-Party Components

This project incorporates the following third-party libraries, statically compiled into `softbody.wasm`:

- [Dear ImGui](https://github.com/ocornut/imgui) — MIT License
- [GLM](https://github.com/g-truc/glm) — MIT License
- [stb](https://github.com/nothings/stb) — MIT License / Public Domain
- [tinyobjloader](https://github.com/tinyobjloader/tinyobjloader) — MIT License
- [GLEW](https://glew.sourceforge.net) — Modified BSD / MIT / SGI Free Software License B
- [GLFW](https://www.glfw.org) — zlib License

See [LICENSE](LICENSE) Section 6 for details.

---

## Contact

**Meidai Kasai, MD**
Email: meidai1223@gmail.com
Repository: https://github.com/meimeimei1223/LiverSurgerySimWeb
