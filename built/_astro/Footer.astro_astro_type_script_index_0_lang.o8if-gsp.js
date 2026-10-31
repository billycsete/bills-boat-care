var e=e=>[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255],t=[{base:60,surface:e(`#3552b0`),deep:e(`#2c439f`),highlight:.12,waves:[[5,420,-22,.25],[3,230,30,.2],[1.5,110,-38,.1],[0,1,0,0]]},{base:85,surface:e(`#2a46a6`),deep:e(`#1d3089`),highlight:.16,waves:[[6,520,28,.3],[3.5,260,-24,.2],[1.5,130,42,.15],[0,1,0,0]]},{base:110,surface:e(`#1d3291`),deep:e(`#0e1a58`),highlight:.24,waves:[[7,640,34,.35],[4,300,-30,.25],[2,150,46,.15],[1,70,-55,.1]]}],n=`
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
`,i=`
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
`,a=`
precision mediump float;
varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`;function o(){let t=[];for(let e=0;e<=8;e++){let n=e/8;t.push([(1-n)**2*5+2*(1-n)*n*-12+n*n*-17,(1-n)**2*50+2*(1-n)*n*34+n*n*9])}return[[e(`#9aa3b0`),[[3.3,6],[4.7,6],[4.7,52],[3.3,52]]],[e(`#dadee4`),[[5,9],...t]],[e(`#c8ced7`),[[4,45],[22,8],[8,8]]],[e(`#c4453b`),[[-20,7],[24,7],[15,-5],[-17,-5]]]]}function s(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader`);return r}function c(e,t,n){let r=e.createProgram();if(e.attachShader(r,s(e,e.VERTEX_SHADER,t)),e.attachShader(r,s(e,e.FRAGMENT_SHADER,n)),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw Error(e.getProgramInfoLog(r)??`link`);return r}function l(e,s){let l=s.getContext(`webgl`,{antialias:!0,alpha:!0,premultipliedAlpha:!0});if(!l)return;let u=c(l,n,r),d=c(l,i,a),f={x:l.getAttribLocation(u,`a_x`),side:l.getAttribLocation(u,`a_side`),h:l.getAttribLocation(u,`a_h`),res:l.getUniformLocation(u,`u_res`),time:l.getUniformLocation(u,`u_time`),base:l.getUniformLocation(u,`u_base`),waves:l.getUniformLocation(u,`u_waves`),surface:l.getUniformLocation(u,`u_surface`),deep:l.getUniformLocation(u,`u_deep`),highlight:l.getUniformLocation(u,`u_highlight`)},p={pos:l.getAttribLocation(d,`a_pos`),color:l.getAttribLocation(d,`a_color`),res:l.getUniformLocation(d,`u_res`),origin:l.getUniformLocation(d,`u_origin`),angle:l.getUniformLocation(d,`u_angle`)},m=[];for(let[e,t]of o())for(let n=1;n<t.length-1;n++)for(let r of[t[0],t[n],t[n+1]])m.push(...r,...e);let h=m.length/5,g=l.createBuffer();l.bindBuffer(l.ARRAY_BUFFER,g),l.bufferData(l.ARRAY_BUFFER,new Float32Array(m),l.STATIC_DRAW);let _=l.createBuffer(),v=l.createBuffer(),y=0,b=0,x=0,S=new Float32Array,C=.09,w=e=>1-(1-e)**3;class T{h=new Float32Array;v=new Float32Array;presses=[];resize(){let e=this.h;this.h=new Float32Array(x),this.v=new Float32Array(x),this.h.set(e.subarray(0,x))}push(e,t,n){let r=(e+60)/6,i=Math.ceil(n*3/6),a=Math.max(0,Math.floor(r-i)),o=Math.min(x-1,Math.ceil(r+i));if(o<a)return;let s=new Float32Array(o-a+1);for(let e=a;e<=o;e++){let i=(e-r)*6/n;s[e-a]=Math.exp(-i*i),this.v[e]+=t*.4*s[e-a]}this.presses.push({start:a,weights:s,depth:t*.05,age:0})}simulate(e){let{h:t,v:n}=this,r=e/4;for(let e=0;e<4;e++){this.applyPresses(r);for(let e=0;e<x;e++){let i=1877.7777777777778*(t[e>0?e-1:e]+t[e<x-1?e+1:e]-2*t[e])-3*t[e]-1.6*n[e];n[e]+=i*r}for(let e=0;e<x;e++)t[e]=Math.max(-40,Math.min(40,t[e]+n[e]*r))}}applyPresses(e){if(this.presses.length){for(let t of this.presses){let n=t.age/C;t.age=Math.min(t.age+e,C);let r=t.depth*(w(t.age/C)-w(n));t.weights.forEach((e,n)=>{let i=t.start+n;i<x&&(this.h[i]+=r*e)})}this.presses=this.presses.filter(e=>e.age<C)}}nudge(e,t,n){let r=(e+60)/6,i=Math.ceil(n*3/6),a=Math.max(0,Math.floor(r-i)),o=Math.min(x-1,Math.ceil(r+i));for(let e=a;e<=o;e++){let i=(e-r)*6/n;this.v[e]+=t*Math.exp(-i*i)}}heightAt(e){let t=Math.min(Math.max((e+60)/6,0),x-1),n=Math.floor(t),r=t-n;return(this.h[n]??0)*(1-r)+(this.h[n+1]??0)*r}settled(){return!this.presses.length&&this.h.every((e,t)=>Math.abs(e)<.05&&Math.abs(this.v[t])<.5)}}let E=t.map(()=>new T);function D(){let e=s.getBoundingClientRect(),t=Math.min(window.devicePixelRatio||1,2);y=e.width,b=e.height,s.width=Math.round(y*t),s.height=Math.round(b*t),l.viewport(0,0,s.width,s.height),x=Math.ceil((y+120)/6)+1,E.forEach(e=>e.resize()),S=new Float32Array(x*2);let n=new Float32Array(x*4);for(let e=0;e<x;e++){let t=e*6-60;n.set([t,0,t,1],e*4)}l.bindBuffer(l.ARRAY_BUFFER,_),l.bufferData(l.ARRAY_BUFFER,n,l.STATIC_DRAW),l.bindBuffer(l.ARRAY_BUFFER,v),l.bufferData(l.ARRAY_BUFFER,S,l.DYNAMIC_DRAW),A.placed||=(A.x=y*.3,A.y=A.water=O(k,A.x),!0)}function O(e,n){let{base:r,waves:i}=t[e],a=n;for(let e=0;e<4;e++){let e=0;for(let[t,n,r,o]of i){let i=2*Math.PI/n;t&&(e+=o/i*Math.sin(i*(a-r*V)))}a=n+e}let o=E[e].heightAt(a);for(let[e,t,n]of i)e&&(o+=e*Math.cos(2*Math.PI/t*(a-n*V)));return r-o}let k=1,A={x:0,y:0,vx:0,vy:0,angle:0,spin:0,water:0,placed:!1};function j(e){if(!e)return;let t=E[1],n=O(1,A.x-18),r=O(1,A.x),i=O(1,A.x+18),a=(n+2*r+i)/4,o=(a-A.water)/e;A.water=a,A.vy+=(120*(a-A.y)-9*(A.vy-o))*e,A.y+=A.vy*e;let s=Math.atan2(n-i,36);A.spin+=(90*(s-A.angle)-10*A.spin)*e,A.angle=Math.min(Math.max(A.angle+A.spin*e,-.6),.6);let c=t.heightAt(A.x),l=(t.heightAt(A.x+18)-t.heightAt(A.x-18))/36,u=R.matches?0:9;A.vx+=(-220*c*l+(u-A.vx)*.8)*e,A.vx=Math.min(Math.max(A.vx,-80),80),A.x+=A.vx*e,t.nudge(A.x,-8*(A.vy-o)*e,18),(A.x>y+36||A.x<-36)&&(A.x=A.x>0?-36:y+36,A.y=A.water=O(1,A.x),A.vy=0)}function M(){return Math.abs(A.vx)<.5&&Math.abs(A.vy)<.5&&Math.abs(A.spin)<.01}let N=null;function P(e){let t=s.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top}}let F=(e,t,n)=>{let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)};function I(e){return e.x<0||e.x>y?t.map(()=>0):t.map((t,n)=>1-F(0,10,Math.abs(O(n,e.x)-e.y-10)))}function L(e,t){let n={x:e.clientX,y:e.clientY,t};if(N&&n.t>N.t&&n.t-N.t<100){let t=P(e),r=Math.max((n.t-N.t)/1e3,1/240),i=(n.x-N.x)/r,a=(n.y-N.y)/r,o=-(Math.min(Math.max(a,0),600)*.048+Math.min(Math.abs(i),500)*.0072);I(t).forEach((e,n)=>{e>0&&o<0&&(E[n].push(t.x,o*e,16),K())})}N=n}window.addEventListener(`pointermove`,e=>{e.pointerType!==`touch`&&L(e,e.timeStamp)}),window.addEventListener(`touchmove`,e=>{e.touches.length===1&&L(e.touches[0],e.timeStamp)},{passive:!0}),window.addEventListener(`pointerdown`,e=>{let t=P(e),n=t.x-A.x;Math.abs(n)<24&&t.y>A.y-54&&t.y<A.y+6&&(A.vy+=90,A.spin+=n>0?-1.5:1.5,K()),I(t).forEach((e,n)=>{e>0&&(E[n].push(t.x,-84*e,20),K())}),N={x:e.clientX,y:e.clientY,t:e.timeStamp}});let R=window.matchMedia(`(prefers-reduced-motion: reduce)`),z=!0,B=0,V=0,H=0;function U(){l.clearColor(0,0,0,0),l.clear(l.COLOR_BUFFER_BIT),t.forEach((e,t)=>{t===1&&W(),l.useProgram(u),l.uniform2f(f.res,y,b),l.uniform1f(f.time,V),l.bindBuffer(l.ARRAY_BUFFER,_),l.enableVertexAttribArray(f.x),l.vertexAttribPointer(f.x,1,l.FLOAT,!1,8,0),l.enableVertexAttribArray(f.side),l.vertexAttribPointer(f.side,1,l.FLOAT,!1,8,4);let{h:n}=E[t];for(let e=0;e<x;e++)S[e*2]=n[e],S[e*2+1]=n[e];l.bindBuffer(l.ARRAY_BUFFER,v),l.bufferSubData(l.ARRAY_BUFFER,0,S),l.enableVertexAttribArray(f.h),l.vertexAttribPointer(f.h,1,l.FLOAT,!1,0,0),l.uniform1f(f.base,e.base),l.uniform4fv(f.waves,e.waves.flat()),l.uniform3fv(f.surface,e.surface),l.uniform3fv(f.deep,e.deep),l.uniform1f(f.highlight,e.highlight),l.drawArrays(l.TRIANGLE_STRIP,0,x*2)})}function W(){[f.x,f.side,f.h].forEach(e=>l.disableVertexAttribArray(e)),l.useProgram(d),l.uniform2f(p.res,y,b),l.uniform2f(p.origin,A.x,A.y),l.uniform1f(p.angle,A.angle),l.bindBuffer(l.ARRAY_BUFFER,g),l.enableVertexAttribArray(p.pos),l.vertexAttribPointer(p.pos,2,l.FLOAT,!1,20,0),l.enableVertexAttribArray(p.color),l.vertexAttribPointer(p.color,3,l.FLOAT,!1,20,8),l.drawArrays(l.TRIANGLES,0,h),l.disableVertexAttribArray(p.pos),l.disableVertexAttribArray(p.color)}function G(e){B=0;let t=Math.min((e-H)/1e3,1/30);H=e,R.matches||(V+=t),E.forEach(e=>e.simulate(t)),j(t),U();let n=R.matches&&M()&&E.every(e=>e.settled());z&&!n&&(B=requestAnimationFrame(G))}function K(){!B&&z&&(H=performance.now(),B=requestAnimationFrame(G))}new ResizeObserver(()=>{D(),U()}).observe(s),new IntersectionObserver(([e])=>{z=e.isIntersecting,z?K():B&&=(cancelAnimationFrame(B),0)}).observe(e),R.addEventListener(`change`,K),D(),U(),e.dataset.water=`webgl`,K()}var u=document.querySelector(`[data-water-root]`),d=document.querySelector(`[data-water-canvas]`);if(u&&d)try{l(u,d)}catch(e){console.warn(`Water effect unavailable:`,e)}