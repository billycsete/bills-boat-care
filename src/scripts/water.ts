// Interactive WebGL water for the footer.
//
// Each layer is a triangle strip: one vertex on the surface and one at the bottom of the
// canvas per column. Ambient swell comes from summed Gerstner waves in the vertex shader
// (sharp crests, wide troughs). On top of that, each layer runs its own 1D wave-equation
// simulation on the CPU, which pointer and touch input push on.

const COLUMN_SPACING = 6; // CSS px between simulated columns
const EDGE_OVERDRAW = 60; // extend past both edges so Gerstner drift never shows a gap
const MAX_DISPLACEMENT = 40; // clamp on simulated height, keeps waves clear of the text

interface Layer {
  /** Resting surface, in CSS px from the top of the canvas. */
  base: number;
  surface: [number, number, number];
  deep: [number, number, number];
  highlight: number;
  /** Height (px) above the top of the water where a pointer pushes this layer hardest. */
  trigger: number;
  /** Gerstner waves: amplitude (px), wavelength (px), speed (px/s, sign = direction), steepness.
   *  Steepness bunches points toward the crests; keep each layer's total under 1 so crests never fold. */
  waves: [number, number, number, number][];
}

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

// Back to front. Farther layers are lighter, smaller and slower, for depth.
const LAYERS: Layer[] = [
  {
    base: 60,
    surface: hex('#3552b0'),
    deep: hex('#2c439f'),
    highlight: 0.12,
    trigger: 150,
    waves: [
      [5, 420, -22, 0.25],
      [3, 230, 30, 0.2],
      [1.5, 110, -38, 0.1],
      [0, 1, 0, 0],
    ],
  },
  {
    base: 85,
    surface: hex('#2a46a6'),
    deep: hex('#1d3089'),
    highlight: 0.16,
    trigger: 100,
    waves: [
      [6, 520, 28, 0.3],
      [3.5, 260, -24, 0.2],
      [1.5, 130, 42, 0.15],
      [0, 1, 0, 0],
    ],
  },
  {
    base: 110,
    surface: hex('#1d3291'),
    deep: hex('#0e1a58'),
    highlight: 0.24,
    trigger: 55,
    waves: [
      [7, 640, 34, 0.35],
      [4, 300, -30, 0.25],
      [2, 150, 46, 0.15],
      [1, 70, -55, 0.1],
    ],
  },
];

const VERTEX = `
attribute float a_x;
attribute float a_side;
attribute float a_h;
uniform vec2 u_res;
uniform float u_time;
uniform float u_base;
uniform vec4 u_waves[4];
varying float v_depth;
varying float v_x;

void main() {
  float x = a_x;
  float lift = a_h;
  for (int i = 0; i < 4; i++) {
    vec4 w = u_waves[i];
    if (w.x == 0.0) continue;
    float k = 6.2831853 / w.y;
    float phase = k * (a_x - w.z * u_time);
    // Gerstner: points orbit, bunching up at crests and spreading out in troughs.
    x -= w.w / k * sin(phase);
    lift += w.x * cos(phase);
  }
  float surfaceY = u_base - lift;
  float y = a_side < 0.5 ? surfaceY : u_res.y + 2.0;
  v_depth = y - surfaceY;
  v_x = x;
  vec2 clip = vec2(x / u_res.x * 2.0 - 1.0, 1.0 - y / u_res.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const FRAGMENT = `
// Match the vertex shader's default highp so shared uniforms (u_time) link.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 u_surface;
uniform vec3 u_deep;
uniform float u_highlight;
uniform float u_time;
varying float v_depth;
varying float v_x;

void main() {
  vec3 color = mix(u_surface, u_deep, smoothstep(0.0, 160.0, v_depth));
  // Soft light band under the surface, brightest right at the waterline.
  float rim = 1.0 - smoothstep(0.0, 3.0, v_depth);
  float glow = exp(-v_depth / 22.0) * 0.35;
  // Gentle shimmer near the surface, like light moving through the water.
  float shimmer = sin(v_x * 0.045 + u_time * 1.3 + v_depth * 0.09) * sin(v_x * 0.021 - u_time * 0.8);
  shimmer *= exp(-v_depth / 45.0) * 0.06;
  color += vec3(0.75, 0.88, 1.0) * u_highlight * (rim + glow) + shimmer * u_highlight * 3.0;
  gl_FragColor = vec4(color, 1.0);
}
`;

// The sailboat: flat-colored triangles in boat space (CSS px, y up, origin on the waterline
// amidships), placed and tilted by the CPU buoyancy model below.
const BOAT_VERTEX = `
attribute vec2 a_pos;
attribute vec3 a_color;
uniform vec2 u_res;
uniform vec2 u_origin;
uniform float u_angle;
varying vec3 v_color;

void main() {
  float c = cos(u_angle);
  float s = sin(u_angle);
  vec2 p = u_origin + vec2(a_pos.x * c - a_pos.y * s, -(a_pos.x * s + a_pos.y * c));
  v_color = a_color;
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
}
`;

const BOAT_FRAGMENT = `
precision mediump float;
varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`;

/** Convex outlines in boat space, bow to the right, drawn in order. */
function boatShapes(): [[number, number, number], [number, number][]][] {
  // Mainsail leech: a curve from the masthead down to the end of the boom, bellied aft.
  const leech: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    leech.push([(1 - t) ** 2 * 5 + 2 * (1 - t) * t * -12 + t * t * -17, (1 - t) ** 2 * 50 + 2 * (1 - t) * t * 34 + t * t * 9]);
  }
  return [
    [hex('#9aa3b0'), [[3.3, 6], [4.7, 6], [4.7, 52], [3.3, 52]]], // mast
    [hex('#dadee4'), [[5, 9], ...leech]], // mainsail
    [hex('#c8ced7'), [[4, 45], [22, 8], [8, 8]]], // jib
    [hex('#c4453b'), [[-20, 7], [24, 7], [15, -5], [-17, -5]]], // hull
  ];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

function link(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  return program;
}

export function startWater(root: HTMLElement, canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return;

  const program = link(gl, VERTEX, FRAGMENT);
  const boatProgram = link(gl, BOAT_VERTEX, BOAT_FRAGMENT);

  const loc = {
    x: gl.getAttribLocation(program, 'a_x'),
    side: gl.getAttribLocation(program, 'a_side'),
    h: gl.getAttribLocation(program, 'a_h'),
    res: gl.getUniformLocation(program, 'u_res'),
    time: gl.getUniformLocation(program, 'u_time'),
    base: gl.getUniformLocation(program, 'u_base'),
    waves: gl.getUniformLocation(program, 'u_waves'),
    surface: gl.getUniformLocation(program, 'u_surface'),
    deep: gl.getUniformLocation(program, 'u_deep'),
    highlight: gl.getUniformLocation(program, 'u_highlight'),
  };
  const boatLoc = {
    pos: gl.getAttribLocation(boatProgram, 'a_pos'),
    color: gl.getAttribLocation(boatProgram, 'a_color'),
    res: gl.getUniformLocation(boatProgram, 'u_res'),
    origin: gl.getUniformLocation(boatProgram, 'u_origin'),
    angle: gl.getUniformLocation(boatProgram, 'u_angle'),
  };

  // Fan-triangulate the boat's outlines into one interleaved buffer: x, y, r, g, b.
  const boatData: number[] = [];
  for (const [color, points] of boatShapes()) {
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) boatData.push(...p, ...color);
    }
  }
  const boatVertices = boatData.length / 5;
  const boatGeometry = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, boatGeometry);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boatData), gl.STATIC_DRAW);

  const geometry = gl.createBuffer();
  const heights = gl.createBuffer();
  let width = 0;
  let height = 0;
  let columns = 0;
  let vertexHeights = new Float32Array(0);

  // A push moves the surface directly, eased out over PRESS_DURATION so most of the dent
  // appears in the first few frames, plus a little velocity so the water carries on and
  // ripples outward afterwards.
  const PRESS_DURATION = 0.09; // s
  const PRESS_DEPTH = 0.05; // px of dent per unit of force
  const PRESS_MOMENTUM = 0.4; // share of the force also given as velocity
  const easeOut = (t: number) => 1 - (1 - t) ** 3;
  interface Press {
    start: number;
    weights: Float32Array;
    depth: number;
    age: number;
  }

  // Wave equation with a weak spring back to rest and damping, so disturbances
  // travel outward, reflect softly at the edges and settle.
  const SPEED = 260; // px/s
  const tension = (SPEED * SPEED) / (COLUMN_SPACING * COLUMN_SPACING);

  /** One layer's interactive surface: its own heights, velocities and in-progress presses. */
  class Surface {
    h = new Float32Array(0); // simulated height per column (px, up is positive)
    v = new Float32Array(0); // vertical velocity per column (px/s)
    presses: Press[] = [];

    resize() {
      const old = this.h;
      this.h = new Float32Array(columns);
      this.v = new Float32Array(columns);
      this.h.set(old.subarray(0, columns));
    }

    /** Push the water around x (CSS px). Positive force lifts the surface. */
    push(x: number, force: number, radius: number) {
      const center = (x + EDGE_OVERDRAW) / COLUMN_SPACING;
      const reach = Math.ceil((radius * 3) / COLUMN_SPACING);
      const start = Math.max(0, Math.floor(center - reach));
      const end = Math.min(columns - 1, Math.ceil(center + reach));
      if (end < start) return;
      const weights = new Float32Array(end - start + 1);
      for (let i = start; i <= end; i++) {
        const d = ((i - center) * COLUMN_SPACING) / radius;
        weights[i - start] = Math.exp(-d * d);
        this.v[i] += force * PRESS_MOMENTUM * weights[i - start];
      }
      this.presses.push({ start, weights, depth: force * PRESS_DEPTH, age: 0 });
    }

    simulate(dt: number) {
      const { h, v } = this;
      const steps = 4;
      const step = dt / steps;
      for (let s = 0; s < steps; s++) {
        this.applyPresses(step);
        for (let i = 0; i < columns; i++) {
          const left = h[i > 0 ? i - 1 : i];
          const right = h[i < columns - 1 ? i + 1 : i];
          const accel = tension * (left + right - 2 * h[i]) - 3 * h[i] - 1.6 * v[i];
          v[i] += accel * step;
        }
        for (let i = 0; i < columns; i++) {
          h[i] = Math.max(-MAX_DISPLACEMENT, Math.min(MAX_DISPLACEMENT, h[i] + v[i] * step));
        }
      }
    }

    applyPresses(step: number) {
      if (!this.presses.length) return;
      for (const press of this.presses) {
        const t0 = press.age / PRESS_DURATION;
        press.age = Math.min(press.age + step, PRESS_DURATION);
        const amount = press.depth * (easeOut(press.age / PRESS_DURATION) - easeOut(t0));
        press.weights.forEach((w, j) => {
          const i = press.start + j;
          if (i < columns) this.h[i] += amount * w;
        });
      }
      this.presses = this.presses.filter((press) => press.age < PRESS_DURATION);
    }

    /** Give the water around x (CSS px) a little vertical velocity, with no direct dent. */
    nudge(x: number, dv: number, radius: number) {
      const center = (x + EDGE_OVERDRAW) / COLUMN_SPACING;
      const reach = Math.ceil((radius * 3) / COLUMN_SPACING);
      const start = Math.max(0, Math.floor(center - reach));
      const end = Math.min(columns - 1, Math.ceil(center + reach));
      for (let i = start; i <= end; i++) {
        const d = ((i - center) * COLUMN_SPACING) / radius;
        this.v[i] += dv * Math.exp(-d * d);
      }
    }

    /** Simulated height at x (CSS px of rest position), interpolated between columns. */
    heightAt(x: number) {
      const c = Math.min(Math.max((x + EDGE_OVERDRAW) / COLUMN_SPACING, 0), columns - 1);
      const i = Math.floor(c);
      const f = c - i;
      return (this.h[i] ?? 0) * (1 - f) + (this.h[i + 1] ?? 0) * f;
    }

    settled() {
      return !this.presses.length && this.h.every((y, i) => Math.abs(y) < 0.05 && Math.abs(this.v[i]) < 0.5);
    }
  }
  const surfaces = LAYERS.map(() => new Surface());

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);

    columns = Math.ceil((width + EDGE_OVERDRAW * 2) / COLUMN_SPACING) + 1;
    surfaces.forEach((surface) => surface.resize());
    vertexHeights = new Float32Array(columns * 2);

    // Two vertices per column: surface (side 0) and canvas bottom (side 1).
    const data = new Float32Array(columns * 4);
    for (let i = 0; i < columns; i++) {
      const x = i * COLUMN_SPACING - EDGE_OVERDRAW;
      data.set([x, 0, x, 1], i * 4);
    }
    gl!.bindBuffer(gl!.ARRAY_BUFFER, geometry);
    gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.STATIC_DRAW);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, heights);
    gl!.bufferData(gl!.ARRAY_BUFFER, vertexHeights, gl!.DYNAMIC_DRAW);

    if (!boat.placed) {
      boat.x = width * 0.3;
      boat.y = boat.water = surfaceY(BOAT_LAYER, boat.x);
      boat.placed = true;
    }
  }

  /** A layer's surface at x (CSS px from the top of the canvas), swell and simulation included. */
  function surfaceY(n: number, x: number) {
    const { base, waves } = LAYERS[n];
    // Gerstner waves shift points sideways, so first find the rest position drawn at x.
    let rest = x;
    for (let iteration = 0; iteration < 4; iteration++) {
      let shift = 0;
      for (const [amplitude, wavelength, speed, steepness] of waves) {
        const k = (2 * Math.PI) / wavelength;
        if (amplitude) shift += (steepness / k) * Math.sin(k * (rest - speed * time));
      }
      rest = x + shift;
    }
    let lift = surfaces[n].heightAt(rest);
    for (const [amplitude, wavelength, speed] of waves) {
      if (amplitude) lift += amplitude * Math.cos(((2 * Math.PI) / wavelength) * (rest - speed * time));
    }
    return base - lift;
  }

  // The sailboat floats on the middle line and is drawn just behind it, so its keel sits under
  // the water. Buoyancy springs it toward the surface under its hull and tilts it to match the
  // slope between bow and stern. Disturbances in the simulated water push it away (toward
  // calmer water), it drifts slowly to the right and wraps around, and as it bobs against the
  // water it stirs up small ripples of its own. Tapping it dunks it.
  const BOAT_LAYER = 1;
  const BOAT_HALF_LENGTH = 18; // px between amidships and the bow and stern sample points
  const BUOYANCY = 120; // spring toward the surface (1/s²)
  const BOB_DAMPING = 9; // 1/s
  const TILT_SPRING = 90;
  const TILT_DAMPING = 10;
  const DRIFT = 9; // px/s
  const DRIFT_DRAG = 0.8; // 1/s; how quickly it returns to its drift speed
  const RIPPLE_PUSH = 220;
  const STIR = 8; // how much the boat's bobbing stirs the water
  const DUNK = 90; // px/s
  const boat = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, water: 0, placed: false };

  function updateBoat(dt: number) {
    if (!dt) return;
    const surface = surfaces[BOAT_LAYER];
    const stern = surfaceY(BOAT_LAYER, boat.x - BOAT_HALF_LENGTH);
    const mid = surfaceY(BOAT_LAYER, boat.x);
    const bow = surfaceY(BOAT_LAYER, boat.x + BOAT_HALF_LENGTH);
    const water = (stern + 2 * mid + bow) / 4;
    const waterSpeed = (water - boat.water) / dt;
    boat.water = water;

    boat.vy += (BUOYANCY * (water - boat.y) - BOB_DAMPING * (boat.vy - waterSpeed)) * dt;
    boat.y += boat.vy * dt;
    const tilt = Math.atan2(stern - bow, BOAT_HALF_LENGTH * 2);
    boat.spin += (TILT_SPRING * (tilt - boat.angle) - TILT_DAMPING * boat.spin) * dt;
    boat.angle = Math.min(Math.max(boat.angle + boat.spin * dt, -0.6), 0.6);

    // -h·dh/dx points away from where the water is most displaced.
    const h = surface.heightAt(boat.x);
    const slope = (surface.heightAt(boat.x + BOAT_HALF_LENGTH) - surface.heightAt(boat.x - BOAT_HALF_LENGTH)) / (BOAT_HALF_LENGTH * 2);
    const drift = reducedMotion.matches ? 0 : DRIFT;
    boat.vx += (-RIPPLE_PUSH * h * slope + (drift - boat.vx) * DRIFT_DRAG) * dt;
    boat.vx = Math.min(Math.max(boat.vx, -80), 80);
    boat.x += boat.vx * dt;

    // Moving down through the water pushes it down (and up pulls it up), sending out ripples.
    surface.nudge(boat.x, -STIR * (boat.vy - waterSpeed) * dt, BOAT_HALF_LENGTH);

    const margin = BOAT_HALF_LENGTH * 2;
    if (boat.x > width + margin || boat.x < -margin) {
      boat.x = boat.x > 0 ? -margin : width + margin;
      boat.y = boat.water = surfaceY(BOAT_LAYER, boat.x);
      boat.vy = 0;
    }
  }

  function boatSettled() {
    return Math.abs(boat.vx) < 0.5 && Math.abs(boat.vy) < 0.5 && Math.abs(boat.spin) < 0.01;
  }

  // Pointer and touch: a pointer moving in the air above the waves presses the water down
  // very gently, like a breeze; a press or tap there drops a tiny splash. Each layer has its
  // own trigger band at a different height (Layer.trigger), so as the pointer comes down the
  // lines respond one after another rather than all at once. Pointers on or in the water do
  // nothing. Listens on the window so the pointer can come from the page above.
  let last: { x: number; y: number; t: number } | null = null;
  function local(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp };
  }
  /** Top of the visible water at x (CSS px from the canvas top): the highest of all layers, swell included. */
  function waterTopAt(x: number) {
    return Math.min(...LAYERS.map((_, n) => surfaceY(n, x)));
  }
  const POINTER_RADIUS = 16; // px; width of the dent a pointer presses into the water
  const GAP = 24; // px above the water where nothing is triggered
  const TRIGGER_WIDTH = 45; // px; half-height of each layer's trigger band
  const MOVE_FORCE = 0.04; // per px/s of downward pointer speed
  const WAKE_FORCE = 0.006; // per px/s of sideways pointer speed
  const TAP_FORCE = 70;
  const smoothstep = (a: number, b: number, v: number) => {
    const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };
  /** How strongly the pointer affects each layer (0 to 1), from its height above the water. */
  function influence(p: { x: number; y: number }) {
    const above = waterTopAt(p.x) - p.y;
    const outside = above < GAP || p.x < 0 || p.x > width;
    return LAYERS.map((layer) => (outside ? 0 : 1 - smoothstep(0, TRIGGER_WIDTH, Math.abs(above - layer.trigger))));
  }
  window.addEventListener('pointermove', (e) => {
    const p = local(e);
    // Treat a long pause as a fresh start so a jump doesn't read as a fast stroke.
    if (last && p.t > last.t && p.t - last.t < 100) {
      const dt = Math.max((p.t - last.t) / 1000, 1 / 240);
      const vx = (p.x - last.x) / dt;
      const vy = (p.y - last.y) / dt;
      // Only ever presses the water down: downward strokes push it, sideways strokes leave
      // a light wake, and upward strokes add nothing (the water never follows the pointer up).
      // Speeds are capped low so a fast swipe stays as gentle and narrow as a slow one.
      const force = -(Math.min(Math.max(vy, 0), 600) * MOVE_FORCE + Math.min(Math.abs(vx), 500) * WAKE_FORCE);
      influence(p).forEach((strength, n) => {
        if (strength > 0 && force < 0) {
          surfaces[n].push(p.x, force * strength, POINTER_RADIUS);
          wake();
        }
      });
    }
    last = p;
  });
  window.addEventListener('pointerdown', (e) => {
    const p = local(e);
    const dx = p.x - boat.x;
    if (Math.abs(dx) < BOAT_HALF_LENGTH + 6 && p.y > boat.y - 54 && p.y < boat.y + 6) {
      boat.vy += DUNK;
      boat.spin += dx > 0 ? -1.5 : 1.5; // the tapped end dips
      wake();
    }
    influence(p).forEach((strength, n) => {
      if (strength > 0) {
        surfaces[n].push(p.x, -TAP_FORCE * strength, POINTER_RADIUS * 1.25);
        wake();
      }
    });
    last = p;
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let frame = 0;
  let time = 0;
  let previous = 0;

  function draw() {
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    LAYERS.forEach((layer, n) => {
      if (n === BOAT_LAYER) drawBoat();

      gl!.useProgram(program);
      gl!.uniform2f(loc.res, width, height);
      gl!.uniform1f(loc.time, time);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, geometry);
      gl!.enableVertexAttribArray(loc.x);
      gl!.vertexAttribPointer(loc.x, 1, gl!.FLOAT, false, 8, 0);
      gl!.enableVertexAttribArray(loc.side);
      gl!.vertexAttribPointer(loc.side, 1, gl!.FLOAT, false, 8, 4);

      // Upload this layer's simulated heights (same value for both vertices of a column).
      const { h } = surfaces[n];
      for (let i = 0; i < columns; i++) {
        vertexHeights[i * 2] = h[i];
        vertexHeights[i * 2 + 1] = h[i];
      }
      gl!.bindBuffer(gl!.ARRAY_BUFFER, heights);
      gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, vertexHeights);
      gl!.enableVertexAttribArray(loc.h);
      gl!.vertexAttribPointer(loc.h, 1, gl!.FLOAT, false, 0, 0);

      gl!.uniform1f(loc.base, layer.base);
      gl!.uniform4fv(loc.waves, layer.waves.flat());
      gl!.uniform3fv(loc.surface, layer.surface);
      gl!.uniform3fv(loc.deep, layer.deep);
      gl!.uniform1f(loc.highlight, layer.highlight);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, columns * 2);
    });
  }

  function drawBoat() {
    [loc.x, loc.side, loc.h].forEach((attribute) => gl!.disableVertexAttribArray(attribute));
    gl!.useProgram(boatProgram);
    gl!.uniform2f(boatLoc.res, width, height);
    gl!.uniform2f(boatLoc.origin, boat.x, boat.y);
    gl!.uniform1f(boatLoc.angle, boat.angle);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, boatGeometry);
    gl!.enableVertexAttribArray(boatLoc.pos);
    gl!.vertexAttribPointer(boatLoc.pos, 2, gl!.FLOAT, false, 20, 0);
    gl!.enableVertexAttribArray(boatLoc.color);
    gl!.vertexAttribPointer(boatLoc.color, 3, gl!.FLOAT, false, 20, 8);
    gl!.drawArrays(gl!.TRIANGLES, 0, boatVertices);
    gl!.disableVertexAttribArray(boatLoc.pos);
    gl!.disableVertexAttribArray(boatLoc.color);
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min((now - previous) / 1000, 1 / 30);
    previous = now;
    if (!reducedMotion.matches) time += dt;
    surfaces.forEach((surface) => surface.simulate(dt));
    updateBoat(dt);
    draw();
    // With reduced motion the ambient swell is frozen; keep running only while a disturbance settles.
    const settled = reducedMotion.matches && boatSettled() && surfaces.every((surface) => surface.settled());
    if (visible && !settled) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (!frame && visible) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(root);
  reducedMotion.addEventListener('change', wake);

  resize();
  draw();
  root.dataset.water = 'webgl';
  wake();
}
