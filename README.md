# Hopf lab

Open `index.html` in a modern browser. No install, build, CDN, or internet connection is needed.

Alternatively, run `python3 -m http.server 8000` in this directory and visit http://localhost:8000.

For the standalone **Orbit workshop**, open [`orbital.html`](orbital.html). It is a self-contained, offline 2D orbital sandbox: choose a planetary system, planet/moon/rocket system, binary stars, or empty space. Add stars, planets, moons and rockets with automatic circular velocities, or drag an arrow to launch manually. Adjust mass and velocity, apply speed-up/braking burns, watch trails and estimated orbits, and save/open systems as JSON. Undo restores the moment before an edit; Restart returns to the loaded system.

The orbital model uses pairwise Newtonian gravity (G = 40 in toy units), softened at very small distances, and velocity Verlet integration with smaller steps near close encounters. Contact merges conserve mass and linear momentum. Dashed paths are approximate two-body orbits; they do not predict all the interactions in a multi-body system. Sizes are exaggerated and there are no atmosphere or fuel mechanics.

In the MHD and Hopf viewers, drag horizontally or vertically to turn about the screen’s axes; hold **Shift** and drag horizontally to spin (roll). Scroll to zoom, and click **Evolve** to run MHD. **Vortex kick** adds a localized swirl to the velocity field. Resistivity and viscosity apply immediately; the initial-flow menu applies when you reset. Space toggles evolution and R resets (when a form control does not have focus).

## Hopf fibration viewer

The geometry viewer sits alongside the MHD viewer on wide screens and below it on smaller screens. Its controls and camera are independent of the simulation. Choose one, three, or five nested tori, adjust the fibers per torus and the central polar angle θ, and use **Highlight fiber** to match a white circle to its ringed point on the base sphere. Colors follow longitude; rear points on the sphere are dimmed. The geometry automatically fits the view as θ changes.

Drag or use the arrow keys while the Hopf canvas is focused to turn; **Shift + horizontal drag** (or **Shift + Left/Right**) spins the view. Scroll or press +/− to zoom. **Reset view** (or Home) resets its camera. **Slowly orbit** controls automatic rotation independently in each viewer.

Fibers are sampled directly from the exact parametrization

    z₁ = cos(θ/2) exp(it), z₂ = sin(θ/2) exp(i(t − φ)), 0 ≤ t ≤ 2π,
    h(z₁,z₂) = (2 Re(z₁ conjugate(z₂)), 2 Im(z₁ conjugate(z₂)), |z₁|² − |z₂|²),
    (x,y,z) = (Re z₁, Im z₁, Im z₂) / (1 − Re z₂).

Each fiber maps to the single sphere point (sin θ cos φ, sin θ sin φ, cos θ). The displayed curves are closed polylines sampling these exact circles; they do not use numerical field integration. The pole whose fiber projects to a straight line is excluded. The moving highlight dot indicates phase, not fluid velocity. This is a geometric reference, not a second MHD simulation. See [Bielefeld University's Hopf fibration introduction](https://www.math.uni-bielefeld.de/~sek/top/hopf/hopf-fib.htm).

Run the geometry checks with `node tests/hopf-geometry.test.cjs` (Node.js is only needed for tests).

## Model

A deliberately small, dimensionless incompressible resistive MHD simulation, with density and magnetic permeability set to one:

- ∂v/∂t + (v·∇)v = −∇P + (B·∇)B + ν∇²v
- ∂B/∂t + (v·∇)B = (B·∇)v + η∇²B
- ∇·v = ∇·B = 0, enforced approximately through projection.

Here P includes magnetic pressure. The solver uses a 24³ periodic grid over an 8³ box, trilinear semi-Lagrangian advection, central differences for stretching and diffusion, and 36 Jacobi iterations for each projection. Forward divergence and backward pressure gradients share a compatible seven-point Laplacian. A CFL-style timestep limit includes magnetic and fluid speeds and diffusion.

The initial field, in coordinates scaled by a = 1.15, is

    B = 3 / (1 + x² + y² + z²)³ · (2(xz − y), 2(yz + x), 1 − x² − y² + z²).

This is a divergence-free Hopf field on infinite space. The initial view traces its analytic field using midpoint integration; after the first step, lines are traced through the evolving grid. Dots indicate field direction, not fluid speed. Lines stop at the display box, even though the solver has periodic boundaries. Colors identify seeds, not field strength. Energy is the discrete volume integral of B²/2 and v²/2; the graph records diagnostic samples, not evenly spaced physical times.

This is an exploratory toy, not a validated research solver: the grid, periodic seam, approximate projections, and numerical diffusion change the initial field and do not exactly conserve helicity, topology, or energy. Zero resistivity does not remove numerical diffusion. The v = B preset approaches the ideal Alfvénic balance but will still diffuse numerically. Simulation speed controls steps per display frame, so wall-clock speed depends on the device.

Background: [Kamchatnov, Topological soliton in magnetohydrodynamics](https://arxiv.org/abs/physics/0409093).
