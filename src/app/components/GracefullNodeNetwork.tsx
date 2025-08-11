import { useEffect, useRef } from "react";

// Color palette for the animation (HSL/HSLA)
const COLORS = {
  background: 'hsla(210, 17%, 5%, 0.25)',
  link: 'hsla(225, 100%, 89%, 0.25)',
  particle: 'hsla(0, 0%, 100%, 0.9)',
  wave: 'hsla(210, 100%, 74%, 0.08)'
}

// Full-screen, interactive canvas animation written in TypeScript (TSX) for React.
// Features:
// 1) Particles (nodes) wander on smooth, random-like paths.
// 2) Each frame, nodes connect to their 5 nearest neighbors within a max range.
//    Connections break automatically when out of range.
// 3) Nodes gracefully avoid the mouse cursor.
// 4) Clicking triggers an expanding wave that pushes nodes away smoothly.
//
// Drop this component anywhere in a React + TypeScript app.
// It fills its parent; place it in a container that spans the viewport for a full-screen effect.

// ---------- Types ----------
interface Vec2 { x: number; y: number }
interface Particle {
    id: number
    p: Vec2           // position
    v: Vec2           // velocity
    a: Vec2           // accumulated acceleration (cleared each frame)
    o: Vec2           // per-particle offset for sampling the flow field
    phase: number     // personal phase for wander
    freq: number      // personal frequency for wander (Hz-ish)
}
interface Wave {
    origin: Vec2
    t0: number        // start time (ms)
}

// ---------- Utility math ----------
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const length = (x: number, y: number) => Math.hypot(x, y)
const normalize = (x: number, y: number): Vec2 => {
    const L = Math.hypot(x, y)
    return L > 1e-6 ? { x: x / L, y: y / L } : { x: 0, y: 0 }
}

// Smooth random-ish direction field without external noise libs.
// Combines a few low-frequency sines/cosines so motion meanders.
function flowDir(x: number, y: number, t: number): Vec2 {
    const s1 = Math.sin(0.0009 * x + 0.0007 * y + 0.0005 * t)
    const s2 = Math.sin(0.0013 * x - 0.0004 * y + 0.0008 * t)
    const c1 = Math.cos(0.0006 * x + 0.0009 * y - 0.0007 * t)
    const angle = s1 * 1.1 + s2 * 0.9 + c1 * 0.4
    return { x: Math.cos(angle), y: Math.sin(angle) }
}

// Smoothstep helpers for graceful falloffs
const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)
}
const smootherstep = (edge0: number, edge1: number, x: number) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * t * (t * (t * 6 - 15) + 10)
}

// ---------- Spatial grid for neighbor search ----------
class SpatialGrid {
    private cellSize: number
    private cols = 0
    private rows = 0
    private cells: number[][] = [] // store particle indices

    constructor(cellSize: number) {
        this.cellSize = cellSize
    }

    resize(width: number, height: number) {
        this.cols = Math.max(1, Math.ceil(width / this.cellSize))
        this.rows = Math.max(1, Math.ceil(height / this.cellSize))
        this.cells = new Array(this.cols * this.rows)
        for (let i = 0; i < this.cells.length; i++) this.cells[i] = []
    }

    clear() {
        for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0
    }

    private indexFor(x: number, y: number) {
        const cx = clamp(Math.floor(x / this.cellSize), 0, this.cols - 1)
        const cy = clamp(Math.floor(y / this.cellSize), 0, this.rows - 1)
        return cy * this.cols + cx
    }

    insert(i: number, x: number, y: number) {
        this.cells[this.indexFor(x, y)].push(i)
    }

    // Iterate candidate neighbor indices around (x, y)
    *candidates(x: number, y: number): Iterable<number> {
        const cx = clamp(Math.floor(x / this.cellSize), 0, this.cols - 1)
        const cy = clamp(Math.floor(y / this.cellSize), 0, this.rows - 1)
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const nx = cx + ox, ny = cy + oy
                if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue
                yield* this.cells[ny * this.cols + nx]
            }
        }
    }
}

// ---------- Main component ----------
export default function GracefullNodeNetwork() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext("2d")!

        // Config (tweak freely)
        const particleCountBase = 220          // base # of particles for 1920x1080; scales with area
        const maxLinkDist = 140                // px, max distance to consider for edges
        const maxNeighbors = 5                 // connect to at most N nearest
        const baseSpeed = 40                   // px/s baseline speed
        const flowStrength = 26                // steering toward flow field
        const wanderStrength = 18              // small personal wander force
        const damping = 0.985                  // velocity damping per frame (slightly higher to slow drift)
        const mouseAvoidRadius = 110           // px (smaller so they don't flee too far)
        const mouseAvoidStrength = 350         // gentler avoidance force
        const waveSpeed = 800                  // px/s radius expansion
        const waveThickness = 90               // shell thickness that applies impulse
        const waveImpulse = 900                // impulse magnitude
        const waveDrag = 0.9                   // how fast wave energy decays (per pass)
        const maxSpeed = 140                   // hard cap on particle speed to prevent runaway

        // State
        const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1))
        let width = 0, height = 0
        let particles: Particle[] = []
        const grid = new SpatialGrid(maxLinkDist)
        const waves: Wave[] = []
        const mouse: { pos: Vec2; inside: boolean; down: boolean } = {
            pos: { x: 0, y: 0 },
            inside: false,
            down: false,
        }

        // Resize handling
        const resize = () => {
            // Always size to the full viewport
            width = Math.max(1, Math.floor(window.innerWidth))
            height = Math.max(1, Math.floor(window.innerHeight))
            canvas.width = width * DPR
            canvas.height = height * DPR
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
            grid.resize(width, height)

            // Particle count scales with area so density is steady across sizes
            const scale = (width * height) / (1920 * 1080)
            const targetCount = Math.max(80, Math.floor(particleCountBase * scale))
            if (particles.length === 0) {
                particles = new Array(targetCount)
                for (let i = 0; i < targetCount; i++) particles[i] = makeParticle(i)
            } else if (particles.length < targetCount) {
                const start = particles.length
                for (let i = start; i < targetCount; i++) particles.push(makeParticle(i))
            } else if (particles.length > targetCount) {
                particles.length = targetCount
            }
        }

        const makeParticle = (id: number): Particle => {
            // Start positions jittered, velocities aligned to flow for smooth entry
            const p: Vec2 = { x: Math.random() * width, y: Math.random() * height }
            const seed = performance.now()
            const dir = flowDir(p.x + Math.random() * 1000, p.y + Math.random() * 1000, seed + Math.random() * 1000)
            const speed = baseSpeed * (0.6 + Math.random() * 0.8)
            return {
              id,
              p,
              v: { x: dir.x * speed, y: dir.y * speed },
              a: { x: 0, y: 0 },
              o: { x: Math.random() * 10000, y: Math.random() * 10000 }, // sample different parts of the field
              phase: Math.random() * Math.PI * 2,
              freq: 0.2 + Math.random() * 0.6,
            }
        }

        // Pointer events
        const toLocal = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            return { x: e.clientX - rect.left, y: e.clientY - rect.top }
        }
        const onMove = (e: PointerEvent) => { mouse.pos = toLocal(e); mouse.inside = true }
        const onEnter = () => { mouse.inside = true }
        const onLeave = () => { mouse.inside = false }
        const onDown = (e: PointerEvent) => {
            mouse.down = true
            mouse.pos = toLocal(e)
            waves.push({ origin: { ...mouse.pos }, t0: performance.now() })
        }
        const onUp = () => { mouse.down = false }

        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onEnter)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("resize", resize)

        // Initial sizing
        resize()

        // Animation loop
        let lastT = performance.now()
        let raf = 0
        const tick = () => {
            const now = performance.now()
            const dt = clamp((now - lastT) / 1000, 0, 0.05) // s, cap delta for stability
            lastT = now

            // Integrate dynamics
            stepPhysics(now, dt)

            // Draw
            draw()

            raf = requestAnimationFrame(tick)
        }

        const stepPhysics = (now: number, dt: number) => {
            // Clear accel and reinsert into grid
            grid.clear()

            for (let i = 0; i < particles.length; i++) {
                const pi = particles[i]
                pi.a.x = 0; pi.a.y = 0
                grid.insert(i, pi.p.x, pi.p.y)
            }

            // Flow field steering + mouse avoidance + wave impulse
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]

                // Flow steering with per-particle offset (prevents convergence)
                const dir = flowDir(p.p.x + p.o.x, p.p.y + p.o.y, now * 0.001 + p.phase * 0.37)
                p.a.x += dir.x * flowStrength
                p.a.y += dir.y * flowStrength

                // Personal wander: tiny sideways nudge that varies per particle
                const theta = Math.sin(now * 0.001 * (0.5 + p.freq) + p.phase)
                const pvx = p.v.x, pvy = p.v.y
                const vmag = Math.hypot(pvx, pvy) || 1
                // perpendicular unit vector to current velocity
                const perpX = -pvy / vmag
                const perpY =  pvx / vmag
                p.a.x += perpX * wanderStrength * theta
                p.a.y += perpY * wanderStrength * theta

                // Mouse avoidance (graceful falloff)
                if (mouse.inside) {
                    const dx = p.p.x - mouse.pos.x
                    const dy = p.p.y - mouse.pos.y
                    const d = Math.hypot(dx, dy)
                    if (d < mouseAvoidRadius) {
                        const falloff = 1 - smoothstep(0, mouseAvoidRadius, d)
                        const force = mouseAvoidStrength * falloff * falloff
                        const n = normalize(dx, dy)
                        p.a.x += n.x * force
                        p.a.y += n.y * force
                    }
                }

                // Waves (expanding shells)
                for (let w = 0; w < waves.length; w++) {
                    const wave = waves[w]
                    const r = (now - wave.t0) * 0.001 * waveSpeed
                    const dx = p.p.x - wave.origin.x
                    const dy = p.p.y - wave.origin.y
                    const d = Math.hypot(dx, dy)

                    // Influence strongest near the shell r, fades across thickness
                    const band = Math.abs(d - r)
                    if (band < waveThickness) {
                        const strength = waveImpulse * (1 - smootherstep(0, waveThickness, band))
                        const n = normalize(dx, dy)
                        p.a.x += n.x * strength
                        p.a.y += n.y * strength
                    }
                }
            }

            // Integrate velocity & position with damping
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]
                p.v.x = (p.v.x + p.a.x * dt) * damping
                p.v.y = (p.v.y + p.a.y * dt) * damping

                // Clamp velocity so particles can't rocket away
                {
                    const vmag = Math.hypot(p.v.x, p.v.y)
                    if (vmag > maxSpeed) {
                        const s = maxSpeed / vmag
                        p.v.x *= s
                        p.v.y *= s
                    }
                }

                // Keep a minimum drift so particles don't stall
                const vL = length(p.v.x, p.v.y)
                const minV = 20
                if (vL < minV) {
                    const d = flowDir(p.p.x * 1.2, p.p.y * 1.1, now * 0.001)
                    p.v.x += d.x * (minV - vL)
                    p.v.y += d.y * (minV - vL)
                }

                p.p.x += p.v.x * dt
                p.p.y += p.v.y * dt

                // Soft-wrap edges (toroidal) so paths feel continuous
                if (p.p.x < -10) p.p.x = width + 10
                if (p.p.x > width + 10) p.p.x = -10
                if (p.p.y < -10) p.p.y = height + 10
                if (p.p.y > height + 10) p.p.y = -10
            }

            // Fade old waves
            for (let i = waves.length - 1; i >= 0; i--) {
                // Let the wave persist a while but remove when radius surpasses diagonal
                const age = (now - waves[i].t0) * 0.001
                const r = age * waveSpeed
                if (r > Math.hypot(width, height) * 1.2) waves.splice(i, 1)
            }

            // Gentle global drag on impulses
            if (waves.length > 0) {
                for (let i = 0; i < particles.length; i++) {
                    particles[i].v.x *= waveDrag
                    particles[i].v.y *= waveDrag
                }
            }
        }

        const draw = () => {
            // Background with slight trail for a classy look
            ctx.fillStyle = COLORS.background
            ctx.fillRect(0, 0, width, height)

            // Pre-pass: build neighbor lists and draw edges
            ctx.lineWidth = 1
            ctx.strokeStyle = COLORS.link

            for (let i = 0; i < particles.length; i++) {
                const a = particles[i]
                // gather candidates from spatial grid
                const nearest: { j: number; d2: number }[] = []
                for (const j of grid.candidates(a.p.x, a.p.y)) {
                    if (j === i) continue
                    const b = particles[j]
                    const dx = b.p.x - a.p.x
                    const dy = b.p.y - a.p.y
                    const d2 = dx * dx + dy * dy
                    if (d2 > maxLinkDist * maxLinkDist) continue
                    // maintain a small sorted array of size <= maxNeighbors
                    if (nearest.length < maxNeighbors) {
                        nearest.push({ j, d2 })
                        if (nearest.length === maxNeighbors) nearest.sort((u, v) => u.d2 - v.d2)
                    } else if (d2 < nearest[nearest.length - 1].d2) {
                        nearest[nearest.length - 1] = { j, d2 }
                        nearest.sort((u, v) => u.d2 - v.d2)
                    }
                }

                // Draw edges with opacity by distance for softness
                for (let k = 0; k < nearest.length; k++) {
                    const b = particles[nearest[k].j]
                    const d = Math.sqrt(nearest[k].d2)
                    const alpha = 1 - d / maxLinkDist
                    ctx.globalAlpha = 0.25 * alpha
                    ctx.beginPath()
                    ctx.moveTo(a.p.x, a.p.y)
                    ctx.lineTo(b.p.x, b.p.y)
                    ctx.stroke()
                }
            }

            ctx.globalAlpha = 1

            // Draw particles
            ctx.fillStyle = COLORS.particle
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]
                ctx.beginPath()
                ctx.arc(p.p.x, p.p.y, 2, 0, Math.PI * 2)
                ctx.fill()
            }

            // Optional: visualize wave fronts (very subtle)
            if (waves.length > 0) {
                ctx.lineWidth = 1
                ctx.strokeStyle = COLORS.wave
                for (const w of waves) {
                    const age = (performance.now() - w.t0) * 0.001
                    const r = age * waveSpeed
                    ctx.beginPath()
                    ctx.arc(w.origin.x, w.origin.y, r, 0, Math.PI * 2)
                    ctx.stroke()
                }
            }
        }

        // Kick off
        raf = requestAnimationFrame(tick)

        // Cleanup
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("resize", resize)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onEnter)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
        }
    }, [])

    // Canvas fills the entire viewport, independent of parent layout.
    return (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {/*
        Usage:
        <div className="w-screen h-screen"><GracefullNodeNetwork/></div>
      */}
        </div>
    )
}
