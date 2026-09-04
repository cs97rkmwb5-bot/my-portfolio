/**
 * Zensit 横版海报：鼠标跟随玻璃透镜（FluidGlass lens）
 * 不影响海报原有点击放大 / MorphSlider
 */
(function () {
  "use strict";

  var wrap = document.querySelector("#zensit .poster-full");
  if (!wrap) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SCALE = 0.25;
  var IOR = 1.15;
  var THICKNESS = 2;
  var ABERRATION = 0.05;
  var ANISOTROPY = 0.01;

  var VERT = [
    "attribute vec2 position;",
    "attribute vec2 uv;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = uv;",
    "  gl_Position = vec4(position, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform sampler2D uTex;",
    "uniform vec2 uRes;",
    "uniform vec2 uMouse;",
    "uniform float uRadius;",
    "uniform float uIor;",
    "uniform float uThickness;",
    "uniform float uAberration;",
    "uniform float uAnisotropy;",
    "uniform float uVisible;",
    "varying vec2 vUv;",
    "void main() {",
    "  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);",
    "  vec2 p = (vUv - uMouse) * aspect;",
    "  p.x *= 1.0 + uAnisotropy * 8.0;",
    "  float d = length(p);",
    "  float r = uRadius;",
    "  float edge = smoothstep(r, r * 0.92, d);",
    "  if (d > r || uVisible < 0.01) {",
    "    gl_FragColor = vec4(0.0);",
    "    return;",
    "  }",
    "  float z = sqrt(max(0.0, 1.0 - (d * d) / max(r * r, 1e-5)));",
    "  vec3 n = normalize(vec3(p / max(r, 1e-5), z));",
    "  vec3 rd = refract(vec3(0.0, 0.0, -1.0), n, 1.0 / uIor);",
    "  vec2 offset = rd.xy * uThickness * 0.018;",
    "  vec2 mag = uMouse + (vUv - uMouse) * (1.0 - 0.16 * z);",
    "  vec2 sampleUV = mag + offset;",
    "  float ca = uAberration * 0.012 * z;",
    "  vec3 col = vec3(",
    "    texture2D(uTex, sampleUV + vec2(ca, 0.0)).r,",
    "    texture2D(uTex, sampleUV).g,",
    "    texture2D(uTex, sampleUV - vec2(ca, 0.0)).b",
    "  );",
    "  float spec = pow(max(dot(n, normalize(vec3(-0.35, 0.55, 0.75))), 0.0), 42.0);",
    "  float rim = pow(1.0 - z, 2.2) * 0.38;",
    "  col += spec * 0.55;",
    "  col += vec3(0.92, 0.95, 1.0) * rim;",
    "  float alpha = edge * uVisible;",
    "  gl_FragColor = vec4(col, alpha);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var canvas = document.createElement("canvas");
  canvas.className = "poster-lens";
  canvas.setAttribute("aria-hidden", "true");
  wrap.appendChild(canvas);

  var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) {
    canvas.remove();
    return;
  }

  var vs = compile(gl, gl.VERTEX_SHADER, VERT);
  var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    canvas.remove();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "position");
  gl.bindAttribLocation(program, 1, "uv");
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.remove();
    return;
  }

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 0,
    3, -1, 2, 0,
    -1, 3, 0, 2
  ]), gl.STATIC_DRAW);

  var loc = {
    uTex: gl.getUniformLocation(program, "uTex"),
    uRes: gl.getUniformLocation(program, "uRes"),
    uMouse: gl.getUniformLocation(program, "uMouse"),
    uRadius: gl.getUniformLocation(program, "uRadius"),
    uIor: gl.getUniformLocation(program, "uIor"),
    uThickness: gl.getUniformLocation(program, "uThickness"),
    uAberration: gl.getUniformLocation(program, "uAberration"),
    uAnisotropy: gl.getUniformLocation(program, "uAnisotropy"),
    uVisible: gl.getUniformLocation(program, "uVisible")
  };

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

  var source = wrap.querySelector(".morph-slider-canvas") || wrap.querySelector("img") || wrap.querySelector("canvas");
  var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  var visible = 0;
  var hovering = false;
  var raf = 0;

  function resize() {
    var rect = wrap.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(Math.floor(rect.width * dpr), 1);
    var h = Math.max(Math.floor(rect.height * dpr), 1);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function grabSource() {
    if (!source || !source.width) {
      source = wrap.querySelector(".morph-slider-canvas") || wrap.querySelector("canvas") || wrap.querySelector("img");
    }
    if (!source) return;
    try {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch (err) {}
  }

  function render() {
    resize();
    grabSource();

    var damp = reduceMotion ? 1 : 0.16;
    mouse.x += (mouse.tx - mouse.x) * damp;
    mouse.y += (mouse.ty - mouse.y) * damp;
    visible += ((hovering ? 1 : 0) - visible) * (reduceMotion ? 1 : 0.14);

    var radius = SCALE * 0.5;
    var aspect = canvas.width / Math.max(canvas.height, 1);
    if (aspect > 1) radius *= 1 / aspect;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc.uTex, 0);
    gl.uniform2f(loc.uRes, canvas.width, canvas.height);
    gl.uniform2f(loc.uMouse, mouse.x, mouse.y);
    gl.uniform1f(loc.uRadius, radius);
    gl.uniform1f(loc.uIor, IOR);
    gl.uniform1f(loc.uThickness, THICKNESS);
    gl.uniform1f(loc.uAberration, ABERRATION);
    gl.uniform1f(loc.uAnisotropy, ANISOTROPY);
    gl.uniform1f(loc.uVisible, visible);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (hovering || visible > 0.01) {
      raf = requestAnimationFrame(render);
    } else {
      raf = 0;
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  function setPointer(e) {
    var rect = wrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.tx = (e.clientX - rect.left) / rect.width;
    mouse.ty = 1 - (e.clientY - rect.top) / rect.height;
  }

  wrap.addEventListener("pointerenter", function (e) {
    hovering = true;
    setPointer(e);
    if (reduceMotion) {
      mouse.x = mouse.tx;
      mouse.y = mouse.ty;
    }
    start();
  });

  wrap.addEventListener("pointermove", function (e) {
    hovering = true;
    setPointer(e);
    start();
  });

  wrap.addEventListener("pointerleave", function () {
    hovering = false;
    start();
  });

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(wrap);
  }
  resize();
})();
