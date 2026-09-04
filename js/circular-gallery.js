/**
 * CircularGallery — vanilla port of the React Bits / OGL component.
 * Pointer and wheel stay on the panel so nearby copy and page scroll stay free.
 */
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm";

function debounce(func, wait) {
  var timeout;
  return function () {
    var args = arguments;
    var self = this;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      func.apply(self, args);
    }, wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function getFontSize(font) {
  var match = String(font).match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 28;
}

function createTextTexture(gl, text, font, color) {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  context.font = font;
  var metrics = context.measureText(text);
  var textWidth = Math.ceil(metrics.width);
  var textHeight = Math.ceil(getFontSize(font) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  var texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture: texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor(opts) {
    this.gl = opts.gl;
    this.plane = opts.plane;
    this.text = opts.text;
    this.textColor = opts.textColor;
    this.font = opts.font;
    this.createMesh();
  }

  createMesh() {
    var drawn = createTextTexture(this.gl, this.text, this.font, this.textColor);
    var geometry = new Plane(this.gl);
    var program = new Program(this.gl, {
      vertex:
        "attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragment:
        "precision highp float;uniform sampler2D tMap;varying vec2 vUv;void main(){vec4 color=texture2D(tMap,vUv);if(color.a<0.1)discard;gl_FragColor=color;}",
      uniforms: { tMap: { value: drawn.texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry: geometry, program: program });
    var aspect = drawn.width / drawn.height;
    var textHeight = this.plane.scale.y * 0.15;
    var textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  constructor(opts) {
    this.extra = 0;
    this.geometry = opts.geometry;
    this.gl = opts.gl;
    this.image = opts.image;
    this.index = opts.index;
    this.length = opts.length;
    this.scene = opts.scene;
    this.screen = opts.screen;
    this.text = opts.text;
    this.viewport = opts.viewport;
    this.bend = opts.bend;
    this.textColor = opts.textColor;
    this.borderRadius = opts.borderRadius;
    this.font = opts.font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  createShader() {
    var texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex:
        "precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;uniform float uTime;uniform float uSpeed;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z=(sin(p.x*4.0+uTime)*1.5+cos(p.y*2.0+uTime)*1.5)*(0.1+uSpeed*0.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}",
      fragment:
        "precision highp float;uniform vec2 uImageSizes;uniform vec2 uPlaneSizes;uniform sampler2D tMap;uniform float uBorderRadius;varying vec2 vUv;float roundedBoxSDF(vec2 p,vec2 b,float r){vec2 d=abs(p)-b;return length(max(d,vec2(0.0)))+min(max(d.x,d.y),0.0)-r;}void main(){vec2 ratio=vec2(min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.0),min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.0));vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5,vUv.y*ratio.y+(1.0-ratio.y)*0.5);vec4 color=texture2D(tMap,uv);float d=roundedBoxSDF(vUv-0.5,vec2(0.5-uBorderRadius),uBorderRadius);float edgeSmooth=0.002;float alpha=1.0-smoothstep(-edgeSmooth,edgeSmooth,d);gl_FragColor=vec4(color.rgb,alpha);}",
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [1, 1] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    var self = this;
    img.onload = function () {
      texture.image = img;
      self.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  }

  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;
    var x = this.plane.position.x;
    var H = this.viewport.width / 2;
    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      var B_abs = Math.abs(this.bend);
      var R = (H * H + B_abs * B_abs) / (2 * B_abs);
      var effectiveX = Math.min(Math.abs(x), H);
      var arc = R - Math.sqrt(Math.max(R * R - effectiveX * effectiveX, 0));
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(Math.min(effectiveX / R, 1));
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(Math.min(effectiveX / R, 1));
      }
    }
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = scroll.current - scroll.last;
    var planeOffset = this.plane.scale.x / 2;
    var viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize(next) {
    if (next && next.screen) this.screen = next.screen;
    if (next && next.viewport) this.viewport = next.viewport;
    var cardH = Math.min(this.screen.height * 0.7, 280);
    var cardW = cardH * (700 / 900);
    this.plane.scale.y = (this.viewport.height * cardH) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * cardW) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    if (this.title && this.title.mesh) {
      var aspect = this.title.mesh.scale.x / this.title.mesh.scale.y;
      var textHeight = this.plane.scale.y * 0.15;
      this.title.mesh.scale.set(textHeight * aspect, textHeight, 1);
      this.title.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    }
    this.padding = 1.35;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  constructor(container, opts) {
    this.container = container;
    this.scrollSpeed = opts.scrollSpeed;
    this.scroll = { ease: opts.scrollEase, current: 0, target: 0, last: 0, position: 0 };
    this.running = true;
    this.isDown = false;
    this.onCheck = this.onCheck.bind(this);
    this.onCheckDebounce = debounce(this.onCheck, 200);
    this.onResize = this.onResize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.tick = this.tick.bind(this);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(opts.items, opts.bend, opts.textColor, opts.borderRadius, opts.font);
    this.addEventListeners();
    this.tick();
  }

  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0.973, 0.973, 0.965, 0);
    this.container.appendChild(this.gl.canvas);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 40,
      widthSegments: 80
    });
  }

  createMedias(items, bend, textColor, borderRadius, font) {
    this.mediasImages = items.concat(items);
    var self = this;
    this.medias = this.mediasImages.map(function (data, index) {
      return new Media({
        geometry: self.planeGeometry,
        gl: self.gl,
        image: data.image,
        index: index,
        length: self.mediasImages.length,
        scene: self.scene,
        screen: self.screen,
        text: data.text,
        viewport: self.viewport,
        bend: bend,
        textColor: textColor,
        borderRadius: borderRadius,
        font: font
      });
    });
  }

  pointerX(e) {
    if (e.touches && e.touches[0]) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  onPointerDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = this.pointerX(e);
    this.container.classList.add("is-dragging");
  }

  onPointerMove(e) {
    if (!this.isDown) return;
    var distance = (this.start - this.pointerX(e)) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
  }

  onPointerUp() {
    this.isDown = false;
    this.container.classList.remove("is-dragging");
    this.onCheck();
  }

  onWheel(e) {
    e.preventDefault();
    var delta = e.deltaY || e.wheelDelta || 0;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }

  onKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      this.scroll.target += this.scrollSpeed * 5;
      this.onCheckDebounce();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.scroll.target -= this.scrollSpeed * 5;
      this.onCheckDebounce();
    }
  }

  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    var width = this.medias[0].width;
    var itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    var item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;
    if (width < 8 || height < 8) return;
    this.screen = { width: width, height: height };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    var fov = (this.camera.fov * Math.PI) / 180;
    var h = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: h * this.camera.aspect, height: h };
    if (this.medias) {
      var self = this;
      this.medias.forEach(function (media) {
        media.onResize({ screen: self.screen, viewport: self.viewport });
      });
    }
  }

  tick() {
    if (!this.running) return;
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    var direction = this.scroll.current > this.scroll.last ? "right" : "left";
    if (this.medias) {
      var self = this;
      this.medias.forEach(function (media) {
        media.update(self.scroll, direction);
      });
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.tick);
  }

  addEventListeners() {
    this.ro = new ResizeObserver(this.onResize);
    this.ro.observe(this.container);
    this.container.addEventListener("wheel", this.onWheel, { passive: false });
    this.container.addEventListener("mousedown", this.onPointerDown);
    this.container.addEventListener("touchstart", this.onPointerDown, { passive: true });
    this.container.addEventListener("touchmove", this.onPointerMove, { passive: true });
    this.container.addEventListener("touchend", this.onPointerUp);
    this.container.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("mousemove", this.onPointerMove);
    window.addEventListener("mouseup", this.onPointerUp);
  }

  destroy() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    this.container.removeEventListener("wheel", this.onWheel);
    this.container.removeEventListener("mousedown", this.onPointerDown);
    this.container.removeEventListener("touchstart", this.onPointerDown);
    this.container.removeEventListener("touchmove", this.onPointerMove);
    this.container.removeEventListener("touchend", this.onPointerUp);
    this.container.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("mousemove", this.onPointerMove);
    window.removeEventListener("mouseup", this.onPointerUp);
    if (this.gl && this.gl.canvas && this.gl.canvas.parentNode) {
      this.gl.canvas.parentNode.removeChild(this.gl.canvas);
    }
  }
}

function readItems(root) {
  var zh = document.body.classList.contains("is-zh");
  return Array.prototype.map.call(root.querySelectorAll("[data-gallery-src]"), function (el) {
    return {
      image: el.getAttribute("data-gallery-src"),
      text: zh && el.getAttribute("data-zh") ? el.getAttribute("data-zh") : el.getAttribute("data-text") || ""
    };
  }).filter(function (item) {
    return item.image;
  });
}

function numAttr(el, name, fallback) {
  var n = parseFloat(el.getAttribute(name));
  return Number.isFinite(n) ? n : fallback;
}

function start(root) {
  if (root._circularGallery) {
    root._circularGallery.destroy();
    root._circularGallery = null;
  }
  var fallback = root.querySelector(".circular-gallery__fallback");
  var items = readItems(root);
  if (!items.length) {
    if (fallback) fallback.removeAttribute("hidden");
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (fallback) fallback.removeAttribute("hidden");
    return;
  }
  var font = '700 28px "Cormorant Garamond", "Noto Serif SC", serif';
  var boot = function () {
    try {
      root._circularGallery = new App(root, {
        items: items,
        bend: numAttr(root, "data-bend", 2.2),
        textColor: root.getAttribute("data-text-color") || "#222222",
        borderRadius: numAttr(root, "data-border-radius", 0.04),
        font: font,
        scrollSpeed: numAttr(root, "data-scroll-speed", 2),
        scrollEase: numAttr(root, "data-scroll-ease", 0.05)
      });
      root.classList.add("is-ready");
    } catch (err) {
      if (fallback) fallback.removeAttribute("hidden");
    }
  };
  if (document.fonts && document.fonts.load) {
    document.fonts.load(font).then(boot).catch(boot);
  } else {
    boot();
  }
}

function bindLang(root) {
  var last = document.body.classList.contains("is-zh");
  var mo = new MutationObserver(function () {
    var next = document.body.classList.contains("is-zh");
    if (next !== last) {
      last = next;
      start(root);
    }
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

document.querySelectorAll("[data-circular-gallery]").forEach(function (root) {
  start(root);
  bindLang(root);
});
