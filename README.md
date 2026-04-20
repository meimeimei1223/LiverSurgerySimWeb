# Liver Surgery Simulator (Web)

Real-time liver surgery simulation running in the browser via WebAssembly.

> **Patent Pending** · **Proprietary Software** · **Commercial Licensing Available**

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

## Live Demo

**[Launch Simulator](https://meimeimei1223.github.io/LiverSurgerySimWeb/)**

> ⚠️ **Not for clinical use.** This is an educational demonstration only.
> Do not upload identifiable patient data.

## Controls

| Key | Action |
|---|---|
| Left drag | Camera rotate / Grab mesh |
| Right drag | Camera pan |
| Scroll | Camera zoom |
| D | Deform mode (Handle Place) |
| X | Free Cut mode |
| Q | Seg Overlay (in Free Cut) / Seg Cut mode |
| T | Transform mode |
| F | Liver Select |
| G | Portal Select |
| Z | Execute Segment Cut |
| K | Clear Selection |
| B | Volume panel |
| F1 | Wireframe toggle |
| Esc | Exit |

## Technology

- **Physics**: C++ XPBD solver → WebAssembly (Emscripten)
- **Rendering**: WebGL 2.0 with depth-sorted transparency
- **Camera**: FullSphereCamera (quaternion rotation, no gimbal lock)
- **Segmentation**: Voxel skeleton analysis + OBJ S1–S8 Couinaud classification
- **Tetrahedralization**: CentVoxTetrahedralizerHybrid (in-browser, proprietary)

---

## License

This software is released under the **LiverSurgerySimWeb License**, a proprietary source-available license with patent rights reserved and commercial licensing available. See [LICENSE](LICENSE) for the complete terms.

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
