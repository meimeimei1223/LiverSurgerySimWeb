/* benchmark.js — LiverSurgerySimWeb performance measurement
 * Version: 1.0.0
 * Loaded via ?bench URL parameter only.
 * No external dependencies. No network. No persistence.
 * Phase 1 (MVP): platform, load times, FPS (idle/rotation), 4-cut logging,
 *                report UI. Phase 2/3 (XR sessions, memory) are stubs.
 */
(function() {
    'use strict';

    // Defense in depth: re-check URL param
    if (!new URLSearchParams(location.search).has('bench')) return;

    const BENCH_VERSION = '1.0.1';
    const BENCH_BOOT_AT = performance.now();

    // ============================================================
    // Utility helpers
    // ============================================================
    function safeNum(x) { return Number.isFinite(x) ? x : null; }

    function statsOf(samples) {
        if (!samples || samples.length === 0) {
            return { count: 0, mean: null, median: null, std: null,
                     p01: null, p05: null, min: null, max: null };
        }
        const sorted = [...samples].sort((a, b) => a - b);
        const n = sorted.length;
        const sum = sorted.reduce((s, v) => s + v, 0);
        const mean = sum / n;
        const median = n % 2 === 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
            : sorted[(n - 1) / 2];
        const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
        const std = Math.sqrt(variance);
        const pickPct = (p) => sorted[Math.max(0, Math.min(n - 1, Math.floor(n * p)))];
        return {
            count: n,
            mean: +mean.toFixed(2),
            median: +median.toFixed(2),
            std: +std.toFixed(2),
            p01: +pickPct(0.01).toFixed(2),
            p05: +pickPct(0.05).toFixed(2),
            min: +sorted[0].toFixed(2),
            max: +sorted[n - 1].toFixed(2),
        };
    }

    function nowIso() { return new Date().toISOString(); }

    function copyToClipboard(text) {
        if (navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    }
    function fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) {
            console.warn('[Bench] clipboard fallback failed:', e);
            return false;
        }
    }

    // ============================================================
    // PlatformProbe
    // ============================================================
    const PlatformProbe = {
        data: {
            userAgent: navigator.userAgent,
            platformHint: 'unknown',
            os: 'unknown',
            browser: { name: 'unknown', version: 'unknown' },
            hardwareConcurrency: navigator.hardwareConcurrency ?? null,
            deviceMemoryGB: navigator.deviceMemory ?? null,
            screenW: screen.width,
            screenH: screen.height,
            devicePixelRatio: window.devicePixelRatio,
            webgl: { vendor: null, renderer: null, version: null, maxTextureSize: null },
            webxr: { supported: !!navigator.xr, vrSupported: null, arSupported: null },
            wasm: { simd: null, threads: null },
            connection: navigator.connection?.effectiveType ?? null,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        async init() {
            const ua = navigator.userAgent;
            // Platform hint
            if (/OculusBrowser|Quest/i.test(ua)) this.data.platformHint = 'xr-vr';
            else if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) this.data.platformHint = 'mobile';
            else if (/iPhone|iPod/i.test(ua)) this.data.platformHint = 'mobile';
            else this.data.platformHint = 'desktop';

            // OS
            if (/Windows NT/i.test(ua)) this.data.os = 'Windows';
            else if (/Android/i.test(ua)) this.data.os = 'Android';
            else if (/iPhone|iPad|iPod/i.test(ua)) this.data.os = 'iOS';
            else if (/Mac OS X/i.test(ua)) this.data.os = 'macOS';
            else if (/Linux/i.test(ua)) this.data.os = 'Linux';

            // Browser
            const browserMatch = ua.match(/(Edg|Chrome|Firefox|Safari|OculusBrowser)\/([\d.]+)/);
            if (browserMatch) {
                this.data.browser.name = browserMatch[1];
                this.data.browser.version = browserMatch[2];
            }
            // Safari hides Chrome from UA but contains both Safari/Chrome — already handled above by order.

            // WebXR support
            if (navigator.xr) {
                try { this.data.webxr.vrSupported = await navigator.xr.isSessionSupported('immersive-vr'); }
                catch { this.data.webxr.vrSupported = false; }
                try { this.data.webxr.arSupported = await navigator.xr.isSessionSupported('immersive-ar'); }
                catch { this.data.webxr.arSupported = false; }
            }

            // WASM features
            this.data.wasm.simd = (typeof WebAssembly !== 'undefined' &&
                WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])));
            this.data.wasm.threads = (typeof SharedArrayBuffer !== 'undefined');

            // WebGL info — defer until window.gl exists
            this._pollGL();
        },
        _pollGL(attempts = 0) {
            const gl = window.gl;
            if (!gl) {
                if (attempts < 50) setTimeout(() => this._pollGL(attempts + 1), 100);
                return;
            }
            try {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbg) {
                    this.data.webgl.vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
                    this.data.webgl.renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
                } else {
                    this.data.webgl.vendor = gl.getParameter(gl.VENDOR);
                    this.data.webgl.renderer = gl.getParameter(gl.RENDERER);
                }
                this.data.webgl.version = gl.getParameter(gl.VERSION);
                this.data.webgl.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            } catch (e) {
                console.warn('[Bench] WebGL probe failed:', e);
            }
        },
    };

    // ============================================================
    // LoadTimeTracker
    // ============================================================
    const LoadTimeTracker = {
        initialLoad: {
            navStart: 0,
            domContentLoaded: null,
            benchLoaded: BENCH_BOOT_AT,
            wasmReady: null,
            sbCreated: null,
            firstInteractable: null,
        },
        objDropEvents: [],   // {dropAt, tetCompleteAt, simReadyAt, durationMs, presetAtDrop, simTetsAfter, visTetsAfter}
        _currentDrop: null,  // pending drop in progress
        _origConsoleLog: null,
        _renderFramesAfterSb: 0,

        init() {
            // navStart from PerformanceNavigationTiming if available
            const nav = performance.getEntriesByType('navigation')[0];
            this.initialLoad.navStart = nav ? 0 : 0;  // by definition relative

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initialLoad.domContentLoaded = performance.now();
                });
            } else {
                this.initialLoad.domContentLoaded = performance.now();
            }

            // Wrap Module.onRuntimeInitialized — the existing handler is already set
            // We poll for window.Module and wrap once.
            this._pollWasmReady();

            // Wrap console.log to detect "[TET] Simulation restarted."
            this._origConsoleLog = console.log.bind(console);
            const self = this;
            console.log = function(...args) {
                if (typeof args[0] === 'string' && args[0].includes('[TET] Simulation restarted')) {
                    self._onTetComplete();
                }
                return self._origConsoleLog.apply(console, args);
            };

            // Drop event listener (capture phase, do not interfere)
            document.addEventListener('drop', (e) => {
                this._onDrop(e);
            }, true);

            // Poll window.sb for first creation
            this._pollSb();
        },

        _pollWasmReady(attempts = 0) {
            // We can't easily detect when onRuntimeInitialized fires without wrapping.
            // Instead, poll for window._wasmRuntimeReady (set by index.html).
            if (window._wasmRuntimeReady) {
                if (this.initialLoad.wasmReady === null) {
                    this.initialLoad.wasmReady = performance.now();
                }
                return;
            }
            if (attempts < 200) setTimeout(() => this._pollWasmReady(attempts + 1), 50);
        },

        _pollSb(attempts = 0) {
            if (window.sb && this.initialLoad.sbCreated === null) {
                this.initialLoad.sbCreated = performance.now();
                this._countRenderFramesAfterSb();
                return;
            }
            // sb not yet — keep polling
            if (attempts < 600) setTimeout(() => this._pollSb(attempts + 1), 100);
        },

        _countRenderFramesAfterSb() {
            // Count 10 rAF after sb creation as "first interactable".
            const tick = () => {
                this._renderFramesAfterSb++;
                if (this._renderFramesAfterSb >= 10) {
                    this.initialLoad.firstInteractable = performance.now();
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        },

        _onDrop(e) {
            const dropAt = performance.now();
            // Capture preset at drop time
            const ts = window.TetPreset?.getCurrentValues?.();
            this._currentDrop = {
                dropAt,
                tetCompleteAt: null,
                simReadyAt: null,
                durationMs: null,
                presetAtDrop: ts?.preset ?? 'unknown',
                gridValuesAtDrop: ts?.values ?? null,
                simTetsAfter: null,
                visTetsAfter: null,
            };
        },

        _onTetComplete() {
            if (!this._currentDrop) {
                // No drop tracked (could be initial load or programmatic) — ignore
                return;
            }
            this._currentDrop.tetCompleteAt = performance.now();
            this._currentDrop.durationMs = this._currentDrop.tetCompleteAt - this._currentDrop.dropAt;

            // Wait a few rAF for new sb, then snapshot tet counts
            const drop = this._currentDrop;
            this._currentDrop = null;
            const start = performance.now();
            const tick = () => {
                if (window.sb) {
                    drop.simReadyAt = performance.now();
                    try {
                        drop.simTetsAfter = window.sb.getNumLowResTets?.() ?? null;
                        drop.visTetsAfter = window.sb.getNumHighResTets?.() ?? null;
                    } catch {}
                    LoadTimeTracker.objDropEvents.push(drop);
                    return;
                }
                if (performance.now() - start > 5000) {
                    LoadTimeTracker.objDropEvents.push(drop);  // record anyway
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        },
    };

    // ============================================================
    // FPSSampler — independent rAF loop, 4-bucket classification
    // ============================================================
    const FPSSampler = {
        buckets: {
            idle:     { samples: [] },
            rotation: { samples: [] },
            deform:   { samples: [] },
            postCut:  { samples: [] },
        },
        frameTimes: [],            // ring buffer
        _maxFrameTimes: 3000,
        currentBucket: 'idle',
        _lastFrameTime: null,
        _lastFpsAt: null,
        _frameCountInWindow: 0,
        _started: false,
        _lastPointerMoveAt: 0,
        _lastCutAt: 0,

        start() {
            if (this._started) return;
            this._started = true;

            // Track pointer movement for "rotation" detection
            window.addEventListener('pointermove', () => {
                this._lastPointerMoveAt = performance.now();
            }, { passive: true, capture: true });

            // Begin loop
            this._lastFrameTime = performance.now();
            this._lastFpsAt = this._lastFrameTime;
            requestAnimationFrame((t) => this._tick(t));
        },

        notifyCut() {
            this._lastCutAt = performance.now();
        },

        _tick(t) {
            const now = t || performance.now();
            const dt = now - this._lastFrameTime;
            this._lastFrameTime = now;
            this._frameCountInWindow++;

            if (Number.isFinite(dt) && dt > 0) {
                this.frameTimes.push(dt);
                if (this.frameTimes.length > this._maxFrameTimes) this.frameTimes.shift();
            }

            // Classify state
            this.currentBucket = this._classifyState(now);

            // Per-second FPS sample
            if (now - this._lastFpsAt >= 1000) {
                const fps = this._frameCountInWindow / ((now - this._lastFpsAt) / 1000);
                const bucket = this.buckets[this.currentBucket];
                if (bucket) bucket.samples.push(+fps.toFixed(2));
                this._lastFpsAt = now;
                this._frameCountInWindow = 0;
            }

            requestAnimationFrame((t2) => this._tick(t2));
        },

        _classifyState(now) {
            // Priority order:
            // 1. XR session + active grab → deform
            // 2. sb.isGrabbing() true → deform
            // 3. recent cut (<500ms) → postCut
            // 4. recent pointermove (<500ms) + not in cut mode placement → rotation
            // 5. else → idle
            try {
                if (window.xrSession) {
                    const grabs = window.vrGrabs;
                    if (grabs && (grabs.left?.active || grabs.right?.active)) return 'deform';
                }
                if (window.sb?.isGrabbing?.()) return 'deform';
                if (now - this._lastCutAt < 500) return 'postCut';
                if (now - this._lastPointerMoveAt < 500) {
                    // exclude pointermove during cut placement (cutMode + pointer down)
                    // simple heuristic: if cutMode true, pointermove may be cutter rotation,
                    // still count as rotation since 1-finger drag rotates either cutter or scene
                    return 'rotation';
                }
            } catch {}
            return 'idle';
        },

        reset() {
            for (const b of Object.values(this.buckets)) b.samples = [];
            this.frameTimes = [];
            this._frameCountInWindow = 0;
            this._lastFpsAt = performance.now();
        },

        report() {
            const out = { buckets: {}, overall: null };
            const allSamples = [];
            for (const [name, b] of Object.entries(this.buckets)) {
                out.buckets[name] = { ...statsOf(b.samples), samples: b.samples.slice() };
                allSamples.push(...b.samples);
            }
            out.overall = statsOf(allSamples);
            return out;
        },
    };

    // ============================================================
    // InteractionLogger — wrap 4 cut methods on sb
    // ============================================================
    const InteractionLogger = {
        cuts: [],                    // all cut records
        _lastWrappedSb: null,
        _pendingFragment: null,      // stage-A buffer for segment-fragment

        init() {
            // Poll sb and re-wrap when sb identity changes (after OBJ drop -> new sb)
            this._poll();
        },

        _poll() {
            const sb = window.sb;
            if (sb && sb !== this._lastWrappedSb) {
                this._wrap(sb);
                this._lastWrappedSb = sb;
            }
            setTimeout(() => this._poll(), 200);
        },

        _wrap(sb) {
            const self = this;
            const origCut  = sb.executeCut?.bind(sb);
            const origCh   = sb.executeChildCut?.bind(sb);
            const origSeg  = sb.executeSegmentCut?.bind(sb);
            const origComp = sb.completePendingCut?.bind(sb);
            if (!origCut || !origCh || !origSeg || !origComp) {
                console.warn('[Bench] sb missing one of the cut methods, skip wrap');
                return;
            }

            sb.executeCut = function() {
                const t0 = performance.now();
                const before = self._safeTets(sb);
                const count = origCut();
                const t1 = performance.now();
                const after = self._safeTets(sb);
                self._record('liver-free', { t0, t1, count, before, after });
                FPSSampler.notifyCut();
                return count;
            };

            sb.executeChildCut = function(ci) {
                const t0 = performance.now();
                const before = self._safeTets(sb);
                const count = origCh(ci);
                const t1 = performance.now();
                const after = self._safeTets(sb);
                self._record('child-free', { t0, t1, count, before, after, childIndex: ci });
                FPSSampler.notifyCut();
                return count;
            };

            sb.executeSegmentCut = function(mode) {
                const t0 = performance.now();
                const before = self._safeTets(sb);
                const count = origSeg(mode);
                const t1 = performance.now();
                const after = self._safeTets(sb);

                if (count === -1) {
                    // Fragment selection pending — store stage A for later pairing
                    self._pendingFragment = {
                        stageA: { t0, t1, computeMs: +(t1 - t0).toFixed(2) },
                        simTetsBefore: before,
                        pendingAt: t1,
                        bucketAtCut: FPSSampler.currentBucket,
                    };
                } else {
                    self._record('segment', { t0, t1, count, before, after });
                }
                FPSSampler.notifyCut();
                return count;
            };

            sb.completePendingCut = function(rank) {
                const t0 = performance.now();
                const before = self._safeTets(sb);
                const count = origComp(rank);
                const t1 = performance.now();
                const after = self._safeTets(sb);

                if (self._pendingFragment) {
                    const rec = self._pendingFragment;
                    self._pendingFragment = null;
                    const record = {
                        target: 'segment-fragment',
                        stageA: rec.stageA,
                        fragmentPendingMs: +(t0 - rec.pendingAt).toFixed(2),
                        stageB: { t0, t1, t3: null, computeMs: +(t1 - t0).toFixed(2), displayMs: null },
                        tetsCut: count,
                        simTetsBefore: rec.simTetsBefore,
                        simTetsAfter: after,
                        bucketAtCut: rec.bucketAtCut,
                        fragmentRank: rank,
                    };
                    self.cuts.push(record);
                    requestAnimationFrame(() => {
                        record.stageB.t3 = performance.now();
                        record.stageB.displayMs = +(record.stageB.t3 - record.stageB.t0).toFixed(2);
                    });
                } else {
                    // Orphan completePending (e.g., after cancel) — record as best-effort
                    self._record('segment-fragment-orphan', { t0, t1, count, before, after, fragmentRank: rank });
                }
                FPSSampler.notifyCut();
                return count;
            };

            console.log('[Bench] sb cut methods wrapped');
        },

        _safeTets(sb) {
            try { return sb.getNumLowResTets?.() ?? null; } catch { return null; }
        },

        _record(target, { t0, t1, count, before, after, childIndex, fragmentRank }) {
            const record = {
                target,
                t0, t1, t3: null,
                computeMs: +(t1 - t0).toFixed(2),
                displayMs: null,
                tetsCut: count,
                simTetsBefore: before,
                simTetsAfter: after,
                bucketAtCut: FPSSampler.currentBucket,
                childIndex: childIndex ?? null,
                fragmentRank: fragmentRank ?? null,
            };
            this.cuts.push(record);
            requestAnimationFrame(() => {
                record.t3 = performance.now();
                record.displayMs = +(record.t3 - record.t0).toFixed(2);
            });
        },

        reset() {
            this.cuts = [];
            this._pendingFragment = null;
        },

        report() {
            const cuts = this.cuts.slice();
            const byTarget = {};
            for (const c of cuts) {
                const k = c.target;
                if (!byTarget[k]) byTarget[k] = { count: 0, computeMs: [], displayMs: [] };
                byTarget[k].count++;
                if (c.target === 'segment-fragment') {
                    byTarget[k].computeMs.push(c.stageA.computeMs + (c.stageB.computeMs ?? 0));
                    if (c.stageB.displayMs != null) byTarget[k].displayMs.push(c.stageB.displayMs);
                } else {
                    if (c.computeMs != null) byTarget[k].computeMs.push(c.computeMs);
                    if (c.displayMs != null) byTarget[k].displayMs.push(c.displayMs);
                }
            }
            const summary = { byTarget: {} };
            for (const [k, v] of Object.entries(byTarget)) {
                summary.byTarget[k] = {
                    count: v.count,
                    computeMs: statsOf(v.computeMs),
                    displayMs: statsOf(v.displayMs),
                };
            }
            return { cuts, summary };
        },
    };

    // ============================================================
    // XRSessionProbe — Phase 2 stub
    // ============================================================
    const XRSessionProbe = {
        sessions: [],
        activeSession: null,
        init() {
            // TODO Phase 2: poll window.xrSession, record session lifecycles,
            // sample vrFps every 1s during active session, compute fps stats.
        },
        report() {
            return { sessions: this.sessions.slice(), activeSession: this.activeSession };
        },
        reset() { this.sessions = []; this.activeSession = null; },
    };

    // ============================================================
    // MemorySampler — Phase 3 stub
    // ============================================================
    const MemorySampler = {
        jsHeap: { samples: [], peakUsed: 0 },
        wasmHeap: { samples: [], peakSize: 0 },
        init() {
            // TODO Phase 3: 2-second polling of performance.memory and
            // Module.HEAPU8.length, push samples, track peaks.
        },
        report() {
            return {
                jsHeap: { peakUsed: this.jsHeap.peakUsed, samples: this.jsHeap.samples.slice() },
                wasmHeap: { peakSize: this.wasmHeap.peakSize, samples: this.wasmHeap.samples.slice() },
            };
        },
        reset() {
            this.jsHeap = { samples: [], peakUsed: 0 };
            this.wasmHeap = { samples: [], peakSize: 0 };
        },
    };

    // ============================================================
    // ReportRenderer
    // ============================================================
    const ReportRenderer = {
        build() {
            const sb = window.sb;
            // v1.0.1: distinguish baked-default model from OBJ-dropped model.
            //         Default startup uses pre-baked /model/*_mesh.txt files; the gs-* sliders
            //         are ignored until the user drops an OBJ folder and presses Generate.
            //         For the baked default, slider state is irrelevant — report it as
            //         'pre-baked-default' and surface the slider state separately as a hint.
            const usingPrebaked = LoadTimeTracker.objDropEvents.length === 0;
            let sliderState = null;
            try {
                const ts = window.TetPreset?.getCurrentValues?.();
                if (ts) sliderState = { preset: ts.preset, values: ts.values };
            } catch {}
            let model = {
                preset: usingPrebaked ? 'pre-baked-default' : (sliderState?.preset ?? 'unknown'),
                gridValues: usingPrebaked ? null : (sliderState?.values ?? null),
                sliderState,    // always include for transparency / debug
                source: usingPrebaked ? 'pre-baked' : 'obj-drop',
                simTets: null,
                visualTets: null,
                surfaceTris: null,
                lowResParticles: null,
                children: null,
                skeletonAnalyzed: null,
                sampledAt: nowIso(),
            };
            if (sb) {
                try {
                    model.simTets       = sb.getNumLowResTets?.() ?? null;
                    model.visualTets    = sb.getNumHighResTets?.() ?? null;
                    model.surfaceTris   = sb.getNumHighResSurfaceTriIdsAfterCut?.() != null
                                          ? Math.floor(sb.getNumHighResSurfaceTriIdsAfterCut() / 3) : null;
                    model.lowResParticles = sb.getNumLowResParticles?.() ?? null;
                    model.children      = sb.getNumChildren?.() ?? null;
                    model.skeletonAnalyzed = sb.isSkeletonAnalyzed?.() ?? null;
                } catch {}
            }

            return {
                bench: {
                    version: BENCH_VERSION,
                    reportGeneratedAt: nowIso(),
                    runDurationMs: +(performance.now() - BENCH_BOOT_AT).toFixed(0),
                },
                platform: PlatformProbe.data,
                loadTime: {
                    initial: { ...LoadTimeTracker.initialLoad },
                    objDrops: LoadTimeTracker.objDropEvents.slice(),
                },
                model,
                fps: FPSSampler.report(),
                interaction: InteractionLogger.report(),
                xr: XRSessionProbe.report(),
                memory: MemorySampler.report(),
            };
        },

        toJSON(report) {
            return JSON.stringify(report, null, 2);
        },

        toMarkdown(report) {
            const p = report.platform;
            const m = report.model;
            const lt = report.loadTime;
            const fps = report.fps;
            const iter = report.interaction;

            const fmt = (v, suffix = '') => v == null ? '—' : v + suffix;
            const fmtMs = (v) => v == null ? '—' : (v.toFixed ? v.toFixed(0) : v) + ' ms';
            const fmtBucket = (b) =>
                `| ${b.count} | ${fmt(b.mean)} | ${fmt(b.median)} | ${fmt(b.std)} | ${fmt(b.p01)} | ${fmt(b.p05)} | ${fmt(b.min)} | ${fmt(b.max)} |`;

            const lines = [];
            lines.push('## LiverSurgerySimWeb Benchmark Report');
            lines.push('');
            lines.push(`**Generated**: ${report.bench.reportGeneratedAt}`);
            const dur = report.bench.runDurationMs / 1000;
            lines.push(`**Run duration**: ${(dur / 60 | 0)}:${(dur % 60).toFixed(0).padStart(2, '0')}`);
            lines.push(`**Bench version**: ${report.bench.version}`);
            lines.push('');

            lines.push('### Platform');
            lines.push('| Field | Value |');
            lines.push('|---|---|');
            lines.push(`| UserAgent | ${p.browser.name} ${p.browser.version} / ${p.os} |`);
            lines.push(`| Platform hint | ${p.platformHint} |`);
            lines.push(`| GPU | ${p.webgl.renderer ?? '—'} |`);
            lines.push(`| GPU vendor | ${p.webgl.vendor ?? '—'} |`);
            lines.push(`| WebGL version | ${p.webgl.version ?? '—'} |`);
            lines.push(`| CPU threads | ${fmt(p.hardwareConcurrency)} |`);
            lines.push(`| Device memory | ${fmt(p.deviceMemoryGB, ' GB')} |`);
            lines.push(`| Screen | ${p.screenW}x${p.screenH} @ DPR ${p.devicePixelRatio} |`);
            lines.push(`| WebXR | VR: ${p.webxr.vrSupported ? '✓' : '✗'} / AR: ${p.webxr.arSupported ? '✓' : '✗'} |`);
            lines.push(`| WASM SIMD | ${p.wasm.simd ? '✓' : '✗'} |`);
            lines.push(`| WASM threads | ${p.wasm.threads ? '✓' : '✗'} |`);
            lines.push(`| Connection | ${fmt(p.connection)} |`);
            lines.push(`| Language | ${p.language} |`);
            lines.push(`| Timezone | ${p.timezone} |`);
            lines.push('');

            lines.push('### Model');
            lines.push('| Field | Value |');
            lines.push('|---|---|');
            if (m.source === 'pre-baked') {
                lines.push(`| Source | **Pre-baked default** (build-time tet, sliders ignored) |`);
                lines.push(`| Preset | _N/A — drop OBJ folder to enable presets_ |`);
                if (m.sliderState) {
                    lines.push(`| Slider state (informational only) | ${m.sliderState.preset.toUpperCase()} (liver ${m.sliderState.values['gs-liver-low']}/${m.sliderState.values['gs-liver-high']}, vessel ${m.sliderState.values['gs-vessel-low']}/${m.sliderState.values['gs-vessel-high']}, skel ${m.sliderState.values['gs-skeleton']}) |`);
                }
            } else {
                lines.push(`| Source | OBJ-drop (slider values applied at tet generation) |`);
                lines.push(`| Preset | ${m.preset.toUpperCase()} |`);
                if (m.gridValues) {
                    lines.push(`| Grid (liver) | low ${m.gridValues['gs-liver-low']} / high ${m.gridValues['gs-liver-high']} |`);
                    lines.push(`| Grid (vessel) | low ${m.gridValues['gs-vessel-low']} / high ${m.gridValues['gs-vessel-high']} |`);
                    lines.push(`| Grid (skeleton) | ${m.gridValues['gs-skeleton']} |`);
                }
            }
            lines.push(`| Sim tets (low-res) | ${fmt(m.simTets)} |`);
            lines.push(`| Visual tets (high-res) | ${fmt(m.visualTets)} |`);
            lines.push(`| Surface triangles | ${fmt(m.surfaceTris)} |`);
            lines.push(`| Low-res particles | ${fmt(m.lowResParticles)} |`);
            lines.push(`| Child meshes | ${fmt(m.children)} |`);
            lines.push(`| Skeleton analyzed | ${m.skeletonAnalyzed ? '✓' : '✗'} |`);
            lines.push('');

            lines.push('### Initial load (ms from bench boot)');
            lines.push('| Milestone | Value |');
            lines.push('|---|---|');
            lines.push(`| DOMContentLoaded | ${fmtMs(lt.initial.domContentLoaded)} |`);
            lines.push(`| WASM ready | ${fmtMs(lt.initial.wasmReady)} |`);
            lines.push(`| SB created | ${fmtMs(lt.initial.sbCreated)} |`);
            lines.push(`| First interactable | ${fmtMs(lt.initial.firstInteractable)} |`);
            lines.push('');

            lines.push(`### OBJ drop history (n=${lt.objDrops.length})`);
            if (lt.objDrops.length === 0) {
                lines.push('_No OBJ drops yet._');
            } else {
                lines.push('| # | Preset | Drop → Tet complete (ms) | Sim tets after | Visual tets after |');
                lines.push('|---|---|---|---|---|');
                lt.objDrops.forEach((d, i) => {
                    lines.push(`| ${i + 1} | ${d.presetAtDrop?.toUpperCase() ?? '—'} | ${fmtMs(d.durationMs)} | ${fmt(d.simTetsAfter)} | ${fmt(d.visTetsAfter)} |`);
                });
            }
            lines.push('');

            lines.push('### FPS (per-second samples, by state)');
            lines.push('| State | n | Mean | Median | Std | 1%L | 5%L | Min | Max |');
            lines.push('|---|---|---|---|---|---|---|---|---|');
            lines.push(`| idle | ${fmtBucket(fps.buckets.idle).slice(2)}`);
            lines.push(`| rotation | ${fmtBucket(fps.buckets.rotation).slice(2)}`);
            lines.push(`| deform | ${fmtBucket(fps.buckets.deform).slice(2)}`);
            lines.push(`| post-cut | ${fmtBucket(fps.buckets.postCut).slice(2)}`);
            lines.push(`| **overall** | ${fmtBucket(fps.overall).slice(2)}`);
            lines.push('');

            lines.push('### Cut operations');
            const targets = Object.keys(iter.summary.byTarget);
            if (targets.length === 0) {
                lines.push('_No cuts recorded._');
            } else {
                lines.push('| target | n | compute ms (mean±std) | display ms (mean±std) |');
                lines.push('|---|---|---|---|');
                for (const t of targets) {
                    const s = iter.summary.byTarget[t];
                    const c = s.computeMs;
                    const d = s.displayMs;
                    const cStr = c.count > 0 ? `${c.mean} ± ${c.std}` : '—';
                    const dStr = d.count > 0 ? `${d.mean} ± ${d.std}` : '—';
                    lines.push(`| ${t} | ${s.count} | ${cStr} | ${dStr} |`);
                }
            }
            lines.push('');

            lines.push('### Memory (Phase 3 — stub)');
            lines.push('_Not implemented in Phase 1._');
            lines.push('');

            lines.push('### XR Sessions (Phase 2 — stub)');
            lines.push('_Not implemented in Phase 1._');
            lines.push('');

            lines.push('---');
            lines.push(`_Generated by benchmark.js v${report.bench.version}_`);

            return lines.join('\n');
        },
    };

    // ============================================================
    // ReportUI — floating button + overlay
    // ============================================================
    const ReportUI = {
        _btn: null,
        _panel: null,
        _body: null,
        _toast: null,

        init() {
            this._mountButton();
            this._mountPanel();
            this._mountToast();
        },

        _mountButton() {
            const btn = document.createElement('button');
            btn.id = 'bench-toggle-btn';
            btn.textContent = '📊 Bench';
            btn.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:99998;' +
                'background:#000a;color:#7dff7d;padding:8px 12px;' +
                'font-family:monospace;font-size:12px;' +
                'border:1px solid #7dff7d;border-radius:4px;cursor:pointer;';
            btn.addEventListener('click', () => this.show());
            document.body.appendChild(btn);
            this._btn = btn;
        },

        _mountPanel() {
            const panel = document.createElement('div');
            panel.id = 'bench-panel';
            panel.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;' +
                'width:min(640px,92vw);max-height:90vh;overflow:auto;' +
                'background:#000e;color:#ddd;padding:16px;' +
                'font-family:monospace;font-size:12px;' +
                'border:1px solid #7dff7d;border-radius:6px;display:none;';
            panel.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong style="color:#7dff7d;">📊 Benchmark Report</strong>
                    <button id="bench-close-btn" style="background:transparent;color:#aaa;border:0;font-size:18px;cursor:pointer;">×</button>
                </div>
                <div style="margin:10px 0;display:flex;gap:6px;flex-wrap:wrap;">
                    <button id="bench-copy-md"     style="${this._btnStyle('#7dff7d')}">Copy MD</button>
                    <button id="bench-copy-json"   style="${this._btnStyle('#88ccff')}">Copy JSON</button>
                    <button id="bench-download-json" style="${this._btnStyle('#ffcc88')}">Download JSON</button>
                    <button id="bench-refresh"     style="${this._btnStyle('#cccccc')}">Refresh</button>
                    <button id="bench-reset"       style="${this._btnStyle('#ff8888')}">Reset Samples</button>
                </div>
                <pre id="bench-report-body" style="white-space:pre-wrap;background:#0008;padding:10px;border-radius:4px;max-height:60vh;overflow:auto;margin:0;"></pre>
            `;
            document.body.appendChild(panel);
            this._panel = panel;
            this._body = panel.querySelector('#bench-report-body');

            panel.querySelector('#bench-close-btn').addEventListener('click', () => this.hide());
            panel.querySelector('#bench-copy-md').addEventListener('click', async () => {
                const md = ReportRenderer.toMarkdown(ReportRenderer.build());
                const ok = await copyToClipboard(md);
                this._toastMsg(ok ? 'Markdown copied' : 'Copy failed (see console)');
                if (!ok) console.log('[Bench] Markdown:\n' + md);
            });
            panel.querySelector('#bench-copy-json').addEventListener('click', async () => {
                const json = ReportRenderer.toJSON(ReportRenderer.build());
                const ok = await copyToClipboard(json);
                this._toastMsg(ok ? 'JSON copied' : 'Copy failed (see console)');
                if (!ok) console.log('[Bench] JSON:\n' + json);
            });
            panel.querySelector('#bench-download-json').addEventListener('click', () => {
                const json = ReportRenderer.toJSON(ReportRenderer.build());
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = nowIso().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `bench_${ts}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this._toastMsg('JSON downloaded');
            });
            panel.querySelector('#bench-refresh').addEventListener('click', () => this._refresh());
            panel.querySelector('#bench-reset').addEventListener('click', () => {
                if (!confirm('Reset all FPS/cut samples?')) return;
                FPSSampler.reset();
                InteractionLogger.reset();
                XRSessionProbe.reset();
                MemorySampler.reset();
                this._refresh();
                this._toastMsg('Samples reset');
            });
        },

        _mountToast() {
            const t = document.createElement('div');
            t.id = 'bench-toast';
            t.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:99999;' +
                'background:#000d;color:#7dff7d;padding:8px 14px;' +
                'font-family:monospace;font-size:12px;border:1px solid #7dff7d;' +
                'border-radius:4px;display:none;';
            document.body.appendChild(t);
            this._toast = t;
        },

        _btnStyle(color) {
            return `background:transparent;color:${color};border:1px solid ${color};` +
                   `padding:5px 10px;border-radius:3px;cursor:pointer;font-family:monospace;font-size:11px;`;
        },

        _toastMsg(msg) {
            if (!this._toast) return;
            this._toast.textContent = msg;
            this._toast.style.display = 'block';
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => { this._toast.style.display = 'none'; }, 1800);
        },

        show() {
            this._refresh();
            this._panel.style.display = 'block';
        },
        hide() { this._panel.style.display = 'none'; },

        _refresh() {
            const md = ReportRenderer.toMarkdown(ReportRenderer.build());
            this._body.textContent = md;
        },

        // Hide button while in XR session
        _xrPoll() {
            const inXR = !!window.xrSession;
            if (this._btn) this._btn.style.display = inXR ? 'none' : '';
            if (inXR && this._panel.style.display !== 'none') this.hide();
            setTimeout(() => this._xrPoll(), 500);
        },
    };

    // ============================================================
    // Bootstrap
    // ============================================================
    function start() {
        try { PlatformProbe.init(); } catch (e) { console.warn('[Bench] PlatformProbe error:', e); }
        try { LoadTimeTracker.init(); } catch (e) { console.warn('[Bench] LoadTimeTracker error:', e); }
        try { FPSSampler.start(); } catch (e) { console.warn('[Bench] FPSSampler error:', e); }
        try { InteractionLogger.init(); } catch (e) { console.warn('[Bench] InteractionLogger error:', e); }
        try { XRSessionProbe.init(); } catch (e) { console.warn('[Bench] XRSessionProbe error:', e); }
        try { MemorySampler.init(); } catch (e) { console.warn('[Bench] MemorySampler error:', e); }
        try {
            ReportUI.init();
            ReportUI._xrPoll();
        } catch (e) { console.warn('[Bench] ReportUI error:', e); }
        console.log('[Bench] benchmark.js v' + BENCH_VERSION + ' active.');
    }

    // ============================================================
    // window.Bench public API
    // ============================================================
    window.Bench = {
        VERSION: BENCH_VERSION,
        getReport() { return ReportRenderer.build(); },
        getPlatform() { return PlatformProbe.data; },
        resetSamples() {
            FPSSampler.reset();
            InteractionLogger.reset();
            XRSessionProbe.reset();
            MemorySampler.reset();
        },
        _internal: {
            PlatformProbe, LoadTimeTracker, FPSSampler,
            InteractionLogger, XRSessionProbe, MemorySampler,
            ReportRenderer, ReportUI,
        },
    };

    // ============================================================
    // Entry
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
