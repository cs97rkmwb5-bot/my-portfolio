/**
 * MorphSlider（原生 WebGL + GSAP）
 * 对应 React Bits MorphSlider：melt 置换过渡、色差、idle drift
 */
(function () {
  "use strict";

  var TRANSITIONS = { melt: 0, ripple: 1, shear: 2, swirl: 3 };

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
    "uniform sampler2D tCurrent;",
    "uniform sampler2D tNext;",
    "uniform vec2 uResolution;",
    "uniform vec2 uCurrentSize;",
    "uniform vec2 uNextSize;",
    "uniform float uProgress;",
    "uniform float uDir;",
    "uniform float uMode;",
    "uniform float uIntensity;",
    "uniform float uScale;",
    "uniform float uAberration;",
    "uniform float uDrift;",
    "uniform float uTime;",
    "uniform float uReduce;",
    "uniform vec2 uPointer;",
    "uniform vec3 uOverlay;",
    "varying vec2 vUv;",
    "const float PI = 3.14159265359;",
    "float hash11(float p) {",
    "  p = fract(p * 0.1031);",
    "  p *= p + 33.33;",
    "  p *= p + p;",
    "  return fract(p);",
    "}",
    "float hash21(vec2 p) {",
    "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
    "  p3 += dot(p3, p3.yzx + 33.33);",
    "  return fract((p3.x + p3.y) * p3.z);",
    "}",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  float a = hash21(i);",
    "  float b = hash21(i + vec2(1.0, 0.0));",
    "  float c = hash21(i + vec2(0.0, 1.0));",
    "  float d = hash21(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
    "}",
    "float fbm(vec2 p) {",
    "  float v = 0.0;",
    "  float a = 0.5;",
    "  for (int i = 0; i < 5; i++) {",
    "    v += a * noise(p);",
    "    p *= 2.0;",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",
    "mat2 rot(float a) {",
    "  float s = sin(a);",
    "  float c = cos(a);",
    "  return mat2(c, -s, s, c);",
    "}",
    "vec2 coverUV(vec2 uv, vec2 res, vec2 img) {",
    "  float rA = res.x / max(res.y, 1.0);",
    "  float iA = img.x / max(img.y, 1.0);",
    "  vec2 s = vec2(1.0);",
    "  float ratio = rA / max(iA, 0.0001);",
    "  if (ratio > 1.0) {",
    "    s.y = 1.0 / ratio;",
    "  } else {",
    "    s.x = ratio;",
    "  }",
    "  return (uv - 0.5) * s + 0.5;",
    "}",
    "void main() {",
    "  float p = clamp(uProgress, 0.0, 1.0);",
    "  float env = sin(p * PI);",
    "  vec2 uv = vUv;",
    "  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;",
    "  uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;",
    "  vec2 uvC = uv;",
    "  vec2 uvN = uv;",
    "  float m = smoothstep(0.0, 1.0, p);",
    "  if (uReduce < 0.5) {",
    "    if (uMode > 2.5) {",
    "      vec2 c = uv - 0.5;",
    "      float r = length(c);",
    "      float ang = env * uIntensity * 3.5 * (1.0 - r);",
    "      uvC = rot(ang) * c + 0.5;",
    "      uvN = rot(-ang) * c + 0.5;",
    "      m = smoothstep(0.0, 1.0, p);",
    "    } else if (uMode > 0.5 && uMode < 1.5) {",
    "      float d = distance(uv, uPointer);",
    "      float ring = p * 1.6;",
    "      float wave = sin((d - ring) * 30.0) * env;",
    "      vec2 dir = normalize(uv - uPointer + 1e-4);",
    "      vec2 disp = dir * wave * uIntensity * 0.25;",
    "      uvC = uv + disp;",
    "      uvN = uv + disp * 0.6;",
    "      m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);",
    "    } else if (uMode > 1.5) {",
    "      float slices = 14.0;",
    "      float row = floor(uv.y * slices);",
    "      float rnd = hash11(row);",
    "      vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);",
    "      uvC = uv + disp;",
    "      uvN = uv + disp;",
    "      float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;",
    "      float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;",
    "      m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);",
    "    } else {",
    "      float nn = fbm(uv * uScale + uTime * 0.03);",
    "      float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);",
    "      vec2 g = vec2(nn, warp) - 0.5;",
    "      uvC = uv + g * uIntensity * 0.5 * p;",
    "      uvN = uv - g * uIntensity * 0.5 * (1.0 - p);",
    "      m = smoothstep(nn - 0.15, nn + 0.15, p);",
    "    }",
    "  }",
    "  vec2 sC = coverUV(uvC, uResolution, uCurrentSize);",
    "  vec2 sN = coverUV(uvN, uResolution, uNextSize);",
    "  float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;",
    "  vec3 colC = vec3(",
    "    texture2D(tCurrent, sC + vec2(ca, 0.0)).r,",
    "    texture2D(tCurrent, sC).g,",
    "    texture2D(tCurrent, sC - vec2(ca, 0.0)).b",
    "  );",
    "  vec3 colN = vec3(",
    "    texture2D(tNext, sN + vec2(ca, 0.0)).r,",
    "    texture2D(tNext, sN).g,",
    "    texture2D(tNext, sN - vec2(ca, 0.0)).b",
    "  );",
    "  vec3 col = mix(colC, colN, m);",
    "  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));",
    "  col = mix(col, uOverlay, (1.0 - vig) * 0.28);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function hexToRgb(hex) {
    var h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) {
      h = h.split("").map(function (c) { return c + c; }).join("");
    }
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createProgram(gl, vs, fs) {
    var v = compile(gl, gl.VERTEX_SHADER, vs);
    var f = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, "position");
    gl.bindAttribLocation(p, 1, "uv");
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  function makeTexture(gl, image, w, h) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (image) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else {
      var data = new Uint8Array([24, 24, 28, 255]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w || 1, h || 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    return tex;
  }

  function MorphEngine(container, config) {
    this.container = container;
    this.items = config.items;
    this.getOptions = config.getOptions;
    this.onIndexChange = config.onIndexChange;
    this.reducedMotion = config.reducedMotion;
    this.current = config.startIndex || 0;
    this.shownIndex = this.current;
    this.animating = false;
    this.dragging = false;
    this.dragDir = 0;
    this.tween = null;
    this.uniforms = {
      progress: 0,
      dir: 1,
      time: 0,
      pointer: [0.5, 0.5]
    };

    var canvas = document.createElement("canvas");
    canvas.className = "morph-slider-canvas";
    container.appendChild(canvas);
    this.canvas = canvas;

    var gl = canvas.getContext("webgl", { alpha: false, antialias: true, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    gl.clearColor(0.973, 0.973, 0.965, 1);

    this.program = createProgram(gl, VERT, FRAG);
    if (!this.program) throw new Error("Shader compile failed");

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0,
      3, -1, 2, 0,
      -1, 3, 0, 2
    ]), gl.STATIC_DRAW);

    this.loc = {
      position: gl.getAttribLocation(this.program, "position"),
      uv: gl.getAttribLocation(this.program, "uv"),
      tCurrent: gl.getUniformLocation(this.program, "tCurrent"),
      tNext: gl.getUniformLocation(this.program, "tNext"),
      uResolution: gl.getUniformLocation(this.program, "uResolution"),
      uCurrentSize: gl.getUniformLocation(this.program, "uCurrentSize"),
      uNextSize: gl.getUniformLocation(this.program, "uNextSize"),
      uProgress: gl.getUniformLocation(this.program, "uProgress"),
      uDir: gl.getUniformLocation(this.program, "uDir"),
      uMode: gl.getUniformLocation(this.program, "uMode"),
      uIntensity: gl.getUniformLocation(this.program, "uIntensity"),
      uScale: gl.getUniformLocation(this.program, "uScale"),
      uAberration: gl.getUniformLocation(this.program, "uAberration"),
      uDrift: gl.getUniformLocation(this.program, "uDrift"),
      uTime: gl.getUniformLocation(this.program, "uTime"),
      uReduce: gl.getUniformLocation(this.program, "uReduce"),
      uPointer: gl.getUniformLocation(this.program, "uPointer"),
      uOverlay: gl.getUniformLocation(this.program, "uOverlay")
    };

    this.textures = this.items.map(function () { return makeTexture(gl); });
    this.sizes = this.items.map(function () { return [1, 1]; });
    this.dprCap = config.dprCap || 2;

    this.resize();
    this.loadTextures();

    var self = this;
    this.ro = new ResizeObserver(function () { self.resize(); });
    this.ro.observe(container);
    this.boundLoop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.boundLoop);
  }

  MorphEngine.prototype.loadTextures = function () {
    var self = this;
    var gl = this.gl;
    this.items.forEach(function (item, index) {
      var img = new Image();
      img.onload = function () {
        if (self.textures[index]) gl.deleteTexture(self.textures[index]);
        self.textures[index] = makeTexture(gl, img);
        self.sizes[index] = [img.naturalWidth || 1, img.naturalHeight || 1];
      };
      img.onerror = function () {};
      img.src = item.image;
    });
  };

  MorphEngine.prototype.resize = function () {
    var rect = this.container.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    var w = Math.max(Math.floor(rect.width * dpr), 1);
    var h = Math.max(Math.floor(rect.height * dpr), 1);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  };

  MorphEngine.prototype.syncOptions = function () {
    this.opts = this.getOptions();
  };

  MorphEngine.prototype.loop = function (t) {
    this.uniforms.time = t * 0.001;
    if (!this.dragging && !this.animating) this.syncOptions();
    this.render();
    this.raf = requestAnimationFrame(this.boundLoop);
  };

  MorphEngine.prototype.render = function () {
    var gl = this.gl;
    var loc = this.loc;
    var opts = this.opts || this.getOptions();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(loc.position);
    gl.vertexAttribPointer(loc.position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(loc.uv);
    gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.current]);
    gl.uniform1i(loc.tCurrent, 0);

    var nextTex = this.textures[this.wrap(this.current + (this.dragDir || 1))];
    if (this.animating || this.dragging) {
      nextTex = this._nextTex || nextTex;
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._nextTex || this.textures[this.current]);
    gl.uniform1i(loc.tNext, 1);

    var curSize = this.sizes[this.current];
    var nextSize = this._nextSize || curSize;
    gl.uniform2f(loc.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(loc.uCurrentSize, curSize[0], curSize[1]);
    gl.uniform2f(loc.uNextSize, nextSize[0], nextSize[1]);
    gl.uniform1f(loc.uProgress, this.uniforms.progress);
    gl.uniform1f(loc.uDir, this.uniforms.dir);
    gl.uniform1f(loc.uMode, TRANSITIONS[opts.transition] || 0);
    gl.uniform1f(loc.uIntensity, opts.intensity);
    gl.uniform1f(loc.uScale, opts.scale);
    gl.uniform1f(loc.uAberration, opts.aberration);
    gl.uniform1f(loc.uDrift, opts.drift);
    gl.uniform1f(loc.uTime, this.uniforms.time);
    gl.uniform1f(loc.uReduce, this.reducedMotion ? 1 : 0);
    gl.uniform2f(loc.uPointer, this.uniforms.pointer[0], this.uniforms.pointer[1]);
    var rgb = hexToRgb(opts.overlayColor);
    gl.uniform3f(loc.uOverlay, rgb[0], rgb[1], rgb[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  MorphEngine.prototype.wrap = function (i) {
    var n = this.items.length;
    return ((i % n) + n) % n;
  };

  MorphEngine.prototype.prepareNext = function (dir) {
    var target = this.wrap(this.current + dir);
    this._nextTex = this.textures[target];
    this._nextSize = this.sizes[target];
    this.uniforms.dir = dir;
    return target;
  };

  MorphEngine.prototype.goTo = function (dir) {
    if (this.animating || this.dragging || this.items.length < 2) return;
    var opts = this.getOptions();
    if (!opts.loop) {
      var raw = this.current + dir;
      if (raw < 0 || raw > this.items.length - 1) return;
    }
    this.syncOptions();
    var target = this.prepareNext(dir);
    this.animating = true;
    this.announce(target);
    var duration = this.reducedMotion ? Math.min(opts.duration, 0.4) : opts.duration;
    var self = this;
    var proxy = { value: 0 };
    this.uniforms.progress = 0;
    this.tween = window.gsap.fromTo(
      proxy,
      { value: 0 },
      {
        value: 1,
        duration: duration,
        ease: opts.ease,
        onUpdate: function () { self.uniforms.progress = proxy.value; },
        onComplete: function () { self.commit(target); }
      }
    );
  };

  MorphEngine.prototype.announce = function (index) {
    if (index === this.shownIndex) return;
    this.shownIndex = index;
    if (this.onIndexChange) this.onIndexChange(index);
  };

  MorphEngine.prototype.commit = function (target) {
    this.current = target;
    this._nextTex = this.textures[target];
    this._nextSize = this.sizes[target];
    this.uniforms.progress = 0;
    this.animating = false;
    this.tween = null;
    this.announce(target);
  };

  MorphEngine.prototype.next = function () { this.goTo(1); };
  MorphEngine.prototype.prev = function () { this.goTo(-1); };

  MorphEngine.prototype.setPointer = function (x, y) {
    this.uniforms.pointer = [x, y];
  };

  MorphEngine.prototype.beginDrag = function () {
    if (this.animating || this.items.length < 2) return false;
    this.dragging = true;
    this.dragDir = 0;
    this.syncOptions();
    return true;
  };

  MorphEngine.prototype.drag = function (ndx) {
    if (!this.dragging) return;
    var opts = this.getOptions();
    var dir = ndx < 0 ? 1 : -1;
    if (!opts.loop) {
      var raw = this.current + dir;
      if (raw < 0 || raw > this.items.length - 1) {
        this.uniforms.progress = 0;
        return;
      }
    }
    if (dir !== this.dragDir) {
      this.dragDir = dir;
      this.prepareNext(dir);
    }
    this.uniforms.progress = Math.min(Math.abs(ndx), 1);
    this.announce(this.uniforms.progress > 0.5 ? this.wrap(this.current + dir) : this.current);
  };

  MorphEngine.prototype.endDrag = function () {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.dragDir === 0) return;
    var p = this.uniforms.progress;
    var target = this.wrap(this.current + this.dragDir);
    var duration = this.reducedMotion ? 0.3 : 0.5;
    var self = this;
    var proxy = { value: p };
    this.animating = true;
    if (p > 0.4) {
      this.announce(target);
      this.tween = window.gsap.to(proxy, {
        value: 1,
        duration: duration,
        ease: "power2.out",
        onUpdate: function () { self.uniforms.progress = proxy.value; },
        onComplete: function () { self.commit(target); }
      });
    } else {
      this.announce(this.current);
      this.tween = window.gsap.to(proxy, {
        value: 0,
        duration: duration,
        ease: "power2.out",
        onUpdate: function () { self.uniforms.progress = proxy.value; },
        onComplete: function () {
          self.animating = false;
          self.tween = null;
        }
      });
    }
  };

  MorphEngine.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    if (this.tween) this.tween.kill();
    if (this.ro) this.ro.disconnect();
    var gl = this.gl;
    this.textures.forEach(function (tex) { if (tex) gl.deleteTexture(tex); });
    if (this.program) gl.deleteProgram(this.program);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  function setActive(nodes, index) {
    nodes.forEach(function (el, i) {
      el.classList.toggle("is-active", i === index);
      if (el.hasAttribute("aria-selected")) {
        el.setAttribute("aria-selected", i === index ? "true" : "false");
      }
      if (el.hasAttribute("aria-hidden")) {
        el.setAttribute("aria-hidden", i === index ? "false" : "true");
      }
    });
  }

  function initMorphSlider(root, items, options) {
    var opts = Object.assign({
      transition: "melt",
      intensity: 0.55,
      aberration: 0.35,
      drift: 0.4,
      autoplay: false,
      overlayColor: "#05060a",
      duration: 1.1,
      ease: "power2.inOut",
      scale: 2.4,
      autoplayDelay: 4,
      loop: true,
      radius: 16,
      showCaptions: true,
      showControls: true,
      showIndicators: true
    }, options || {});

    root.style.borderRadius = opts.radius + "px";
    root.style.setProperty("--ms-swap", (opts.duration * 0.66).toFixed(3) + "s");
    root.style.setProperty("--ms-dot", (opts.duration * 0.45).toFixed(3) + "s");

    var stage = root.querySelector(".morph-slider-stage");
    if (!stage) return;

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var engine;
    var index = 0;
    var hovering = false;
    var playTimer = null;
    var captionEls = [];
    var dotEls = [];

    function getOptions() { return opts; }

    function onIndexChange(i) {
      index = i;
      setActive(captionEls, i);
      setActive(dotEls, i);
      scheduleAutoplay();
    }

    try {
      engine = new MorphEngine(stage, {
        items: items,
        startIndex: 0,
        reducedMotion: reducedMotion,
        dprCap: 2,
        getOptions: getOptions,
        onIndexChange: onIndexChange
      });
    } catch (err) {
      var fallback = document.createElement("img");
      fallback.className = "morph-slider-fallback img-zoom";
      fallback.src = items[0].image;
      fallback.alt = items[0].caption || "Zensit poster";
      stage.appendChild(fallback);
      return;
    }

    var hasCaptions = opts.showCaptions && items.some(function (item) { return item.caption; });
    if (hasCaptions) {
      var capWrap = document.createElement("div");
      capWrap.className = "morph-slider-caption";
      items.forEach(function (item, i) {
        if (!item.caption) return;
        var span = document.createElement("span");
        span.className = "morph-slider-caption-text" + (i === 0 ? " is-active" : "");
        span.textContent = item.caption;
        span.setAttribute("aria-hidden", i === 0 ? "false" : "true");
        capWrap.appendChild(span);
        captionEls.push(span);
      });
      root.appendChild(capWrap);
    }

    var multi = items.length > 1;
    if (opts.showControls && multi) {
      stage.classList.add("is-draggable");
      var controls = document.createElement("div");
      controls.className = "morph-slider-controls";
      controls.innerHTML =
        '<button type="button" class="morph-slider-btn" aria-label="Previous slide">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        '<button type="button" class="morph-slider-btn" aria-label="Next slide">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>";
      var btns = controls.querySelectorAll(".morph-slider-btn");
      btns[0].addEventListener("click", function () { engine.prev(); });
      btns[1].addEventListener("click", function () { engine.next(); });
      root.appendChild(controls);
    }

    if (opts.showIndicators && multi) {
      var dots = document.createElement("div");
      dots.className = "morph-slider-indicators";
      items.forEach(function (item, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "morph-slider-dot" + (i === 0 ? " is-active" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
        btn.setAttribute("aria-label", "Go to slide " + (i + 1));
        btn.addEventListener("click", function () {
          if (i === index) return;
          engine.goTo(i > index ? 1 : -1);
        });
        dots.appendChild(btn);
        dotEls.push(btn);
      });
      root.appendChild(dots);
    }

    function scheduleAutoplay() {
      if (playTimer) clearTimeout(playTimer);
      if (!opts.autoplay || hovering || !multi) return;
      playTimer = setTimeout(function () { engine.next(); }, Math.max(opts.autoplayDelay, 1) * 1000);
    }

    root.addEventListener("mouseenter", function () {
      hovering = true;
      if (playTimer) clearTimeout(playTimer);
    });
    root.addEventListener("mouseleave", function () {
      hovering = false;
      scheduleAutoplay();
    });

    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        engine.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        engine.prev();
      }
    });

    var startX = 0;
    var width = 1;
    var active = false;
    var moved = false;

    stage.addEventListener("pointerdown", function (e) {
      var rect = stage.getBoundingClientRect();
      width = rect.width || 1;
      startX = e.clientX;
      moved = false;
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      engine.setPointer(px, 1 - py);
      active = engine.beginDrag();
      if (active) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!active) return;
      if (Math.abs(e.clientX - startX) > 6) moved = true;
      engine.drag((e.clientX - startX) / width);
    });
    function endPointer() {
      if (active) {
        active = false;
        engine.endDrag();
        return;
      }
      if (moved) return;
      var item = items[engine.current];
      if (item && typeof window.openImageLightbox === "function") {
        window.openImageLightbox(item.image, item.caption || "");
      }
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", function () {
      if (!active) return;
      active = false;
      engine.endDrag();
    });

    scheduleAutoplay();
  }

  var posterRoot = document.getElementById("poster-morph");
  if (posterRoot) {
    initMorphSlider(posterRoot, [
      {
        image: "assets/images/zensit/poster-stamp.jpg",
        caption: ""
      }
    ], {
      transition: "melt",
      intensity: 0.55,
      aberration: 0.35,
      drift: 0.4,
      autoplay: false,
      overlayColor: "#05060a",
      duration: 1.1,
      ease: "power2.inOut",
      scale: 2.4,
      autoplayDelay: 4,
      loop: true,
      radius: 16,
      showCaptions: true,
      showControls: true,
      showIndicators: true
    });
  }

  var storyRoot = document.getElementById("storyboard-morph");
  if (storyRoot) {
    initMorphSlider(storyRoot, [
      {
        image: "assets/images/zensit/boards/board-01.jpg?v=5",
        caption: ""
      },
      {
        image: "assets/images/zensit/boards/board-02.jpg?v=5",
        caption: ""
      },
      {
        image: "assets/images/zensit/boards/board-03.jpg?v=5",
        caption: ""
      }
    ], {
      transition: "melt",
      intensity: 0.55,
      aberration: 0.35,
      drift: 0.4,
      autoplay: false,
      overlayColor: "#f8f8f6",
      duration: 1.1,
      ease: "power2.inOut",
      scale: 2.4,
      autoplayDelay: 4,
      loop: true,
      radius: 0,
      showCaptions: false,
      showControls: true,
      showIndicators: true
    });
  }
})();
