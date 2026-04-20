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

