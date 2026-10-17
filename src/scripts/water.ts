// Interactive WebGL water for the footer.
//
// Each layer is a triangle strip: one vertex on the surface and one at the bottom of the
// canvas per column. Ambient swell comes from summed Gerstner waves in the vertex shader
// (sharp crests, wide troughs). The front layers also add a 1D wave-equation simulation
// on the CPU, which pointer and touch input push on.

const COLUMN_SPACING = 6; // CSS px between simulated columns
const EDGE_OVERDRAW = 60; // extend past both edges so Gerstner drift never shows a gap
const MAX_DISPLACEMENT = 40; // clamp on simulated height, keeps waves clear of the text

interface Layer {
  /** Resting surface, in CSS px from the top of the canvas. */
  base: number;
  /** How strongly the interactive simulation shows on this layer (0 = ambient only). */
  sim: number;
  surface: [number, number, number];
  deep: [number, number, number];
  highlight: number;
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
    sim: 0,
    surface: hex('#3552b0'),
    deep: hex('#2c439f'),
    highlight: 0.12,
    waves: [
      [5, 420, -22, 0.25],
      [3, 230, 30, 0.2],
      [1.5, 110, -38, 0.1],
      [0, 1, 0, 0],
    ],
  },
  {
    base: 85,
    sim: 0.35,
    surface: hex('#2a46a6'),
    deep: hex('#1d3089'),
    highlight: 0.16,
    waves: [
      [6, 520, 28, 0.3],
      [3.5, 260, -24, 0.2],
      [1.5, 130, 42, 0.15],
      [0, 1, 0, 0],
    ],
  },
  {
    base: 110,
    sim: 1,
    surface: hex('#1d3291'),
    deep: hex('#0e1a58'),
    highlight: 0.24,
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
uniform float u_sim;
uniform vec4 u_waves[4];
varying float v_depth;
varying float v_x;

void main() {
  float x = a_x;
  float lift = a_h * u_sim;
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

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

export function startWater(root: HTMLElement, canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  gl.useProgram(program);

  const loc = {
    x: gl.getAttribLocation(program, 'a_x'),
    side: gl.getAttribLocation(program, 'a_side'),
    h: gl.getAttribLocation(program, 'a_h'),
    res: gl.getUniformLocation(program, 'u_res'),
    time: gl.getUniformLocation(program, 'u_time'),
    base: gl.getUniformLocation(program, 'u_base'),
    sim: gl.getUniformLocation(program, 'u_sim'),
    waves: gl.getUniformLocation(program, 'u_waves'),
    surface: gl.getUniformLocation(program, 'u_surface'),
    deep: gl.getUniformLocation(program, 'u_deep'),
    highlight: gl.getUniformLocation(program, 'u_highlight'),
  };

  const geometry = gl.createBuffer();
  const heights = gl.createBuffer();
  let width = 0;
  let height = 0;
  let columns = 0;
  let h = new Float32Array(0); // simulated height per column (px, up is positive)
  let v = new Float32Array(0); // vertical velocity per column (px/s)
  let vertexHeights = new Float32Array(0);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);

    columns = Math.ceil((width + EDGE_OVERDRAW * 2) / COLUMN_SPACING) + 1;
    const oldH = h;
    h = new Float32Array(columns);
    v = new Float32Array(columns);
    h.set(oldH.subarray(0, columns));
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
  }

  // Wave equation with a weak spring back to rest and damping, so disturbances
  // travel outward, reflect softly at the edges and settle.
  const SPEED = 260; // px/s
  const tension = (SPEED * SPEED) / (COLUMN_SPACING * COLUMN_SPACING);
  function simulate(dt: number) {
    const steps = 4;
    const step = dt / steps;
    for (let s = 0; s < steps; s++) {
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

  /** Push the water around x (CSS px). Positive force lifts the surface. */
  function push(x: number, force: number, radius = 28) {
    const center = (x + EDGE_OVERDRAW) / COLUMN_SPACING;
    const reach = Math.ceil((radius * 3) / COLUMN_SPACING);
    for (let i = Math.max(0, Math.floor(center - reach)); i <= Math.min(columns - 1, center + reach); i++) {
      const d = ((i - center) * COLUMN_SPACING) / radius;
      v[i] += force * Math.exp(-d * d);
    }
  }

  // Pointer and touch: moving across the front surface drags the water with it,
  // and a press or tap drops a splash.
  let last: { x: number; y: number; t: number } | null = null;
  const front = LAYERS[LAYERS.length - 1];
  function local(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp };
  }
  // How strongly the pointer affects the water, by its distance from the front surface.
  // Above the water it fades gently as the pointer rises. At and below the surface it is
  // much weaker and fades fast, so moving through the water or over the footer text barely
  // stirs it.
  function influence(p: { x: number; y: number }) {
    const column = Math.round((p.x + EDGE_OVERDRAW) / COLUMN_SPACING);
    const below = p.y - (front.base - (h[column] ?? 0));
    return below < 0 ? Math.exp(below / 45) : 0.25 * Math.exp(-below / 20);
  }
  root.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (last && p.t > last.t) {
      const dt = Math.max((p.t - last.t) / 1000, 1 / 240);
      const vx = (p.x - last.x) / dt;
      const vy = (p.y - last.y) / dt;
      const near = influence(p);
      if (near > 0.02) {
        // Down/up strokes push the surface the same way; sideways strokes leave a wake.
        const force = (-Math.max(-1600, Math.min(1600, vy)) * 0.35 - Math.min(Math.abs(vx), 2000) * 0.06) * near;
        push(p.x, force);
      }
    }
    last = p;
    wake();
  });
  root.addEventListener('pointerleave', () => (last = null));
  root.addEventListener('pointerdown', (e) => {
    const p = local(e);
    push(p.x, -520 * Math.max(influence(p), 0.15), 34);
    last = p;
    wake();
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let frame = 0;
  let time = 0;
  let previous = 0;

  function draw() {
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniform2f(loc.res, width, height);
    gl!.uniform1f(loc.time, time);

    for (let i = 0; i < columns; i++) {
      vertexHeights[i * 2] = h[i];
      vertexHeights[i * 2 + 1] = h[i];
    }
    gl!.bindBuffer(gl!.ARRAY_BUFFER, heights);
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, vertexHeights);
    gl!.enableVertexAttribArray(loc.h);
    gl!.vertexAttribPointer(loc.h, 1, gl!.FLOAT, false, 0, 0);

    gl!.bindBuffer(gl!.ARRAY_BUFFER, geometry);
    gl!.enableVertexAttribArray(loc.x);
    gl!.vertexAttribPointer(loc.x, 1, gl!.FLOAT, false, 8, 0);
    gl!.enableVertexAttribArray(loc.side);
    gl!.vertexAttribPointer(loc.side, 1, gl!.FLOAT, false, 8, 4);

    for (const layer of LAYERS) {
      gl!.uniform1f(loc.base, layer.base);
      gl!.uniform1f(loc.sim, layer.sim);
      gl!.uniform4fv(loc.waves, layer.waves.flat());
      gl!.uniform3fv(loc.surface, layer.surface);
      gl!.uniform3fv(loc.deep, layer.deep);
      gl!.uniform1f(loc.highlight, layer.highlight);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, columns * 2);
    }
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min((now - previous) / 1000, 1 / 30);
    previous = now;
    if (!reducedMotion.matches) time += dt;
    simulate(dt);
    draw();
    // With reduced motion the ambient swell is frozen; keep running only while a disturbance settles.
    const settled = reducedMotion.matches && h.every((y, i) => Math.abs(y) < 0.05 && Math.abs(v[i]) < 0.5);
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
