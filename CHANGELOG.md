# Changelog

All notable changes to the deployed simulator, newest first.
The version number shown in the app's corner is the `vNNN` here.

Frozen snapshots ([paper-benchmark-v1](paper-benchmark-v1/) = v286,
[paper-volume-v1](paper-volume-v1/) = v311, [demo-tutorial-v1](demo-tutorial-v1/) = v317)
never change; this log tracks the live root only.

---

## v317 — 2026-08-09

- Interactive tutorial shipped on the live site: five lessons (Deform, Cut,
  Select & Cut, Display & Organs, Camera & Controls) with real screenshots.
  Opens from the **🎓 Tutorial** pill (bottom-right); `?tut=1` / `?tut=0`
  overrides; disabled entirely under `?bench` so it cannot interfere with
  benchmark runs.
- Two remaining Japanese UI strings translated to English (AR reticle hint,
  VR button tooltip).

## v316 — 2026-06-07

- Fixed the VR button greying out on Quest 3: a Meta Browser update made the
  headset report touch capability, which tripped the "touch devices get no VR"
  guard from v300. The guard now excludes Quest devices.

## v315 — 2026-05-26

- Fixed fragment-preview colors not updating when a liver is loaded without a
  portal vein: the highlight draw path required skeleton analysis even for
  plain liver fragment selection. (JS-side fix; the C++ color computation was
  already correct.)

## v314 — 2026-05-24

- Volume panel **Export JSON** now records `displayMode`
  (`normal` / `auto-seg` / `preset-seg`) so exported cases state which
  segmentation view was active at export time.

## v313 — 2026-05-24

- Fixed Visibility buttons mislabeling organs when a dropped model set is
  missing a mesh (e.g. no vein): the UI now resolves organ cards by label
  instead of load order, across desktop, mobile, VR panel, and cut targets.

## v301–v312 — 2026-05-19

- Volume panel: **Other Organs** section (Portal / Vein / Tumor / GB) and live
  **Liver (excl. tumor)** row backed by a tumor-overlap voxel mask computed in
  WebAssembly; panel is draggable; **Export JSON** button added.
- Mobile: Volume overlay fixes for portrait/landscape and AR transitions.
- Fullscreen + AR conflict now blocked with a warning banner.
- `paper-volume-v1` snapshot frozen from v311; v312 is comment translation
  only (binaries identical to v311).

## v288–v300 — 2026-05-18

- Mobile landscape UI overhaul, tablet layout, low-power GPU handling, and
  portal segmentation exposed through the WASM wrapper (v288).

## v283–v287 — 2026-05-17

- Benchmark instrumentation (`?bench=1`, benchmark.js v1.0.7–v1.0.9) and UI
  fixes used for the paper's 18-cell performance measurements.
  `paper-benchmark-v1` snapshot frozen from v286.
