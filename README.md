# Liver Surgery Simulator (Web)

Real-time liver surgery simulation running in the browser via WebAssembly.

## Features

- **Soft-body physics** — XPBD (Extended Position Based Dynamics) solver compiled from C++ to WebAssembly
- **Free Cut** — Place a 3D cutter and cut liver/portal/vein with fragment selection
- **Segment Cut** — Select portal segments (S1-S8) and cut by segment with volume calculation
- **Deform** — Place handle spheres and deform the liver interactively
- **Transform** — Rotate and translate the model using FullSphereCamera (quaternion, no gimbal lock)
- **Transparency** — Per-organ alpha control with depth-sorted rendering
- **Volume Display** — Real-time volume calculation with segment breakdown (ml / %)
- **Seg Overlay** — Visualize which segment the cutter is touching during Free Cut
- **OBJ Drop** — Drop custom OBJ files to tetrahedralize and simulate any liver model

## Live Demo

[Launch Simulator](https://meimeimei1223.github.io/LiverSurgerySimWeb/)

## Controls

| Key | Action |
|-----|--------|
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
- **Segmentation**: Voxel skeleton analysis + OBJ S1-S8 Couinaud classification
- **Tetrahedralization**: CentVoxTetrahedralizerHybrid (in-browser)

## License

LiverSurgerySimWeb License

Copyright (c) 2026 MEIDAI KASAI MD

1. **Research and Education Use:**
   Free to use, copy, modify, and distribute for non-commercial
   research and educational purposes, provided this notice is retained.

2. **Commercial Use:**
   Any commercial use requires prior written permission from the author.
   Contact: meidai1223@gmail.com

3. **Disclaimer:**
   This software is provided "as is" without warranty of any kind.
   This software is NOT approved for clinical use.
   The author is not liable for any damages arising from its use.

4. **Third-Party Libraries (compiled into WebAssembly):**
   The following libraries are statically compiled into `softbody.wasm`.

   **ImGui**:
   Copyright (c) 2014-2024 Omar Cornut
   Licensed under MIT License
   Source: https://github.com/ocornut/imgui

   **GLM**:
   Copyright (c) 2005 G-Truc Creation
   Licensed under MIT License
   Source: https://github.com/g-truc/glm

   **stb_image**:
   Copyright (c) 2017 Sean Barrett
   Licensed under MIT License / Public Domain
   Source: https://github.com/nothings/stb

   **stb_truetype**:
   Copyright (c) 2017 Sean Barrett
   Licensed under MIT License / Public Domain
   Source: https://github.com/nothings/stb

   **tinyobjloader**:
   Copyright (c) 2012-2019 Syoyo Fujita and many contributors
   Licensed under MIT License
   Source: https://github.com/tinyobjloader/tinyobjloader

   **GLEW**:
   Copyright (c) 2002-2007, Milan Ikits; Copyright (c) 2002-2007, Marcelo E. Magallon
   Licensed under Modified BSD License / MIT License / SGI Free Software License B
   Source: https://glew.sourceforge.net

   **GLFW**:
   Copyright (c) 2002-2006 Marcus Geelnard; Copyright (c) 2006-2019 Camilla Löwy
   Licensed under zlib License
   Source: https://www.glfw.org
