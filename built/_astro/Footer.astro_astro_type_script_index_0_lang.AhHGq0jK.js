var e=e=>[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255],t=[{base:60,sim:0,surface:e(`#3552b0`),deep:e(`#2c439f`),highlight:.12,waves:[[5,420,-22,.25],[3,230,30,.2],[1.5,110,-38,.1],[0,1,0,0]]},{base:85,sim:.35,surface:e(`#2a46a6`),deep:e(`#1d3089`),highlight:.16,waves:[[6,520,28,.3],[3.5,260,-24,.2],[1.5,130,42,.15],[0,1,0,0]]},{base:110,sim:1,surface:e(`#1d3291`),deep:e(`#0e1a58`),highlight:.24,waves:[[7,640,34,.35],[4,300,-30,.25],[2,150,46,.15],[1,70,-55,.1]]}],n=`
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
`,r=`
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
`;function i(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader`);return r}function a(e,a){let o=a.getContext(`webgl`,{antialias:!0,alpha:!0,premultipliedAlpha:!0});if(!o)return;let s=o.createProgram();if(o.attachShader(s,i(o,o.VERTEX_SHADER,n)),o.attachShader(s,i(o,o.FRAGMENT_SHADER,r)),o.linkProgram(s),!o.getProgramParameter(s,o.LINK_STATUS))throw Error(o.getProgramInfoLog(s)??`link`);o.useProgram(s);let c={x:o.getAttribLocation(s,`a_x`),side:o.getAttribLocation(s,`a_side`),h:o.getAttribLocation(s,`a_h`),res:o.getUniformLocation(s,`u_res`),time:o.getUniformLocation(s,`u_time`),base:o.getUniformLocation(s,`u_base`),sim:o.getUniformLocation(s,`u_sim`),waves:o.getUniformLocation(s,`u_waves`),surface:o.getUniformLocation(s,`u_surface`),deep:o.getUniformLocation(s,`u_deep`),highlight:o.getUniformLocation(s,`u_highlight`)},l=o.createBuffer(),u=o.createBuffer(),d=0,f=0,p=0,m=new Float32Array,h=new Float32Array,g=new Float32Array;function _(){let e=a.getBoundingClientRect(),t=Math.min(window.devicePixelRatio||1,2);d=e.width,f=e.height,a.width=Math.round(d*t),a.height=Math.round(f*t),o.viewport(0,0,a.width,a.height),p=Math.ceil((d+120)/6)+1;let n=m;m=new Float32Array(p),h=new Float32Array(p),m.set(n.subarray(0,p)),g=new Float32Array(p*2);let r=new Float32Array(p*4);for(let e=0;e<p;e++){let t=e*6-60;r.set([t,0,t,1],e*4)}o.bindBuffer(o.ARRAY_BUFFER,l),o.bufferData(o.ARRAY_BUFFER,r,o.STATIC_DRAW),o.bindBuffer(o.ARRAY_BUFFER,u),o.bufferData(o.ARRAY_BUFFER,g,o.DYNAMIC_DRAW)}function v(e){let t=e/4;for(let e=0;e<4;e++){for(let e=0;e<p;e++){let n=1877.7777777777778*(m[e>0?e-1:e]+m[e<p-1?e+1:e]-2*m[e])-3*m[e]-1.6*h[e];h[e]+=n*t}for(let e=0;e<p;e++)m[e]=Math.max(-40,Math.min(40,m[e]+h[e]*t))}}function y(e,t,n=28){let r=(e+60)/6,i=Math.ceil(n*3/6);for(let e=Math.max(0,Math.floor(r-i));e<=Math.min(p-1,r+i);e++){let i=(e-r)*6/n;h[e]+=t*Math.exp(-i*i)}}let b=null,x=t[t.length-1];function S(e){let t=a.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top,t:e.timeStamp}}function C(e){let t=Math.round((e.x+60)/6),n=e.y-(x.base-(m[t]??0));return n<0?Math.exp(n/45):.25*Math.exp(-n/20)}e.addEventListener(`pointermove`,e=>{let t=S(e);if(b&&t.t>b.t){let e=Math.max((t.t-b.t)/1e3,1/240),n=(t.x-b.x)/e,r=(t.y-b.y)/e,i=C(t);if(i>.02){let e=(-Math.max(-1600,Math.min(1600,r))*.35-Math.min(Math.abs(n),2e3)*.06)*i;y(t.x,e)}}b=t,j()}),e.addEventListener(`pointerleave`,()=>b=null),e.addEventListener(`pointerdown`,e=>{let t=S(e);y(t.x,-520*Math.max(C(t),.15),34),b=t,j()});let w=window.matchMedia(`(prefers-reduced-motion: reduce)`),T=!0,E=0,D=0,O=0;function k(){o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.uniform2f(c.res,d,f),o.uniform1f(c.time,D);for(let e=0;e<p;e++)g[e*2]=m[e],g[e*2+1]=m[e];o.bindBuffer(o.ARRAY_BUFFER,u),o.bufferSubData(o.ARRAY_BUFFER,0,g),o.enableVertexAttribArray(c.h),o.vertexAttribPointer(c.h,1,o.FLOAT,!1,0,0),o.bindBuffer(o.ARRAY_BUFFER,l),o.enableVertexAttribArray(c.x),o.vertexAttribPointer(c.x,1,o.FLOAT,!1,8,0),o.enableVertexAttribArray(c.side),o.vertexAttribPointer(c.side,1,o.FLOAT,!1,8,4);for(let e of t)o.uniform1f(c.base,e.base),o.uniform1f(c.sim,e.sim),o.uniform4fv(c.waves,e.waves.flat()),o.uniform3fv(c.surface,e.surface),o.uniform3fv(c.deep,e.deep),o.uniform1f(c.highlight,e.highlight),o.drawArrays(o.TRIANGLE_STRIP,0,p*2)}function A(e){E=0;let t=Math.min((e-O)/1e3,1/30);O=e,w.matches||(D+=t),v(t),k();let n=w.matches&&m.every((e,t)=>Math.abs(e)<.05&&Math.abs(h[t])<.5);T&&!n&&(E=requestAnimationFrame(A))}function j(){!E&&T&&(O=performance.now(),E=requestAnimationFrame(A))}new ResizeObserver(()=>{_(),k()}).observe(a),new IntersectionObserver(([e])=>{T=e.isIntersecting,T?j():E&&=(cancelAnimationFrame(E),0)}).observe(e),w.addEventListener(`change`,j),_(),k(),e.dataset.water=`webgl`,j()}var o=document.querySelector(`[data-water-root]`),s=document.querySelector(`[data-water-canvas]`);if(o&&s)try{a(o,s)}catch(e){console.warn(`Water effect unavailable:`,e)}