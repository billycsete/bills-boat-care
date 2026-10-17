var e=e=>[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255],t=[{base:60,surface:e(`#3552b0`),deep:e(`#2c439f`),highlight:.12,trigger:150,waves:[[5,420,-22,.25],[3,230,30,.2],[1.5,110,-38,.1],[0,1,0,0]]},{base:85,surface:e(`#2a46a6`),deep:e(`#1d3089`),highlight:.16,trigger:100,waves:[[6,520,28,.3],[3.5,260,-24,.2],[1.5,130,42,.15],[0,1,0,0]]},{base:110,surface:e(`#1d3291`),deep:e(`#0e1a58`),highlight:.24,trigger:55,waves:[[7,640,34,.35],[4,300,-30,.25],[2,150,46,.15],[1,70,-55,.1]]}],n=`
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
`;function i(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader`);return r}function a(e,a){let o=a.getContext(`webgl`,{antialias:!0,alpha:!0,premultipliedAlpha:!0});if(!o)return;let s=o.createProgram();if(o.attachShader(s,i(o,o.VERTEX_SHADER,n)),o.attachShader(s,i(o,o.FRAGMENT_SHADER,r)),o.linkProgram(s),!o.getProgramParameter(s,o.LINK_STATUS))throw Error(o.getProgramInfoLog(s)??`link`);o.useProgram(s);let c={x:o.getAttribLocation(s,`a_x`),side:o.getAttribLocation(s,`a_side`),h:o.getAttribLocation(s,`a_h`),res:o.getUniformLocation(s,`u_res`),time:o.getUniformLocation(s,`u_time`),base:o.getUniformLocation(s,`u_base`),waves:o.getUniformLocation(s,`u_waves`),surface:o.getUniformLocation(s,`u_surface`),deep:o.getUniformLocation(s,`u_deep`),highlight:o.getUniformLocation(s,`u_highlight`)},l=o.createBuffer(),u=o.createBuffer(),d=0,f=0,p=0,m=new Float32Array,h=.09,g=e=>1-(1-e)**3;class _{h=new Float32Array;v=new Float32Array;presses=[];resize(){let e=this.h;this.h=new Float32Array(p),this.v=new Float32Array(p),this.h.set(e.subarray(0,p))}push(e,t,n){let r=(e+60)/6,i=Math.ceil(n*3/6),a=Math.max(0,Math.floor(r-i)),o=Math.min(p-1,Math.ceil(r+i));if(o<a)return;let s=new Float32Array(o-a+1);for(let e=a;e<=o;e++){let i=(e-r)*6/n;s[e-a]=Math.exp(-i*i),this.v[e]+=t*.4*s[e-a]}this.presses.push({start:a,weights:s,depth:t*.05,age:0})}simulate(e){let{h:t,v:n}=this,r=e/4;for(let e=0;e<4;e++){this.applyPresses(r);for(let e=0;e<p;e++){let i=1877.7777777777778*(t[e>0?e-1:e]+t[e<p-1?e+1:e]-2*t[e])-3*t[e]-1.6*n[e];n[e]+=i*r}for(let e=0;e<p;e++)t[e]=Math.max(-40,Math.min(40,t[e]+n[e]*r))}}applyPresses(e){if(this.presses.length){for(let t of this.presses){let n=t.age/h;t.age=Math.min(t.age+e,h);let r=t.depth*(g(t.age/h)-g(n));t.weights.forEach((e,n)=>{let i=t.start+n;i<p&&(this.h[i]+=r*e)})}this.presses=this.presses.filter(e=>e.age<h)}}settled(){return!this.presses.length&&this.h.every((e,t)=>Math.abs(e)<.05&&Math.abs(this.v[t])<.5)}}let v=t.map(()=>new _);function y(){let e=a.getBoundingClientRect(),t=Math.min(window.devicePixelRatio||1,2);d=e.width,f=e.height,a.width=Math.round(d*t),a.height=Math.round(f*t),o.viewport(0,0,a.width,a.height),p=Math.ceil((d+120)/6)+1,v.forEach(e=>e.resize()),m=new Float32Array(p*2);let n=new Float32Array(p*4);for(let e=0;e<p;e++){let t=e*6-60;n.set([t,0,t,1],e*4)}o.bindBuffer(o.ARRAY_BUFFER,l),o.bufferData(o.ARRAY_BUFFER,n,o.STATIC_DRAW),o.bindBuffer(o.ARRAY_BUFFER,u),o.bufferData(o.ARRAY_BUFFER,m,o.DYNAMIC_DRAW)}let b=null;function x(e){let t=a.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top,t:e.timeStamp}}function S(e){let n=Math.round((e+60)/6),r=1/0;return t.forEach((t,i)=>{let a=v[i].h[n]??0;for(let[n,r,i]of t.waves)n&&(a+=n*Math.cos(2*Math.PI/r*(e-i*O)));r=Math.min(r,t.base-a)}),r}let C=(e,t,n)=>{let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)};function w(e){let n=S(e.x)-e.y,r=n<24||e.x<0||e.x>d;return t.map(e=>r?0:1-C(0,45,Math.abs(n-e.trigger)))}window.addEventListener(`pointermove`,e=>{let t=x(e);if(b&&t.t>b.t&&t.t-b.t<100){let e=Math.max((t.t-b.t)/1e3,1/240),n=(t.x-b.x)/e,r=(t.y-b.y)/e,i=-(Math.min(Math.max(r,0),600)*.04+Math.min(Math.abs(n),500)*.006);w(t).forEach((e,n)=>{e>0&&i<0&&(v[n].push(t.x,i*e,16),M())})}b=t}),window.addEventListener(`pointerdown`,e=>{let t=x(e);w(t).forEach((e,n)=>{e>0&&(v[n].push(t.x,-70*e,20),M())}),b=t});let T=window.matchMedia(`(prefers-reduced-motion: reduce)`),E=!0,D=0,O=0,k=0;function A(){o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.uniform2f(c.res,d,f),o.uniform1f(c.time,O),o.bindBuffer(o.ARRAY_BUFFER,l),o.enableVertexAttribArray(c.x),o.vertexAttribPointer(c.x,1,o.FLOAT,!1,8,0),o.enableVertexAttribArray(c.side),o.vertexAttribPointer(c.side,1,o.FLOAT,!1,8,4),t.forEach((e,t)=>{let{h:n}=v[t];for(let e=0;e<p;e++)m[e*2]=n[e],m[e*2+1]=n[e];o.bindBuffer(o.ARRAY_BUFFER,u),o.bufferSubData(o.ARRAY_BUFFER,0,m),o.enableVertexAttribArray(c.h),o.vertexAttribPointer(c.h,1,o.FLOAT,!1,0,0),o.uniform1f(c.base,e.base),o.uniform4fv(c.waves,e.waves.flat()),o.uniform3fv(c.surface,e.surface),o.uniform3fv(c.deep,e.deep),o.uniform1f(c.highlight,e.highlight),o.drawArrays(o.TRIANGLE_STRIP,0,p*2)})}function j(e){D=0;let t=Math.min((e-k)/1e3,1/30);k=e,T.matches||(O+=t),v.forEach(e=>e.simulate(t)),A();let n=T.matches&&v.every(e=>e.settled());E&&!n&&(D=requestAnimationFrame(j))}function M(){!D&&E&&(k=performance.now(),D=requestAnimationFrame(j))}new ResizeObserver(()=>{y(),A()}).observe(a),new IntersectionObserver(([e])=>{E=e.isIntersecting,E?M():D&&=(cancelAnimationFrame(D),0)}).observe(e),T.addEventListener(`change`,M),y(),A(),e.dataset.water=`webgl`,M()}var o=document.querySelector(`[data-water-root]`),s=document.querySelector(`[data-water-canvas]`);if(o&&s)try{a(o,s)}catch(e){console.warn(`Water effect unavailable:`,e)}