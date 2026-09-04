/**
 * FlyingPosters — vanilla port of the React Bits / OGL component.
 * Events stay on the panel so page scroll and nearby copy are untouched.
 */
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture } from "https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm";

const vertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uPosition;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;
uniform float uDistortion;
varying vec2 vUv;
float PI = 3.141592653589793238;
mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(
      oc * axis.x * axis.x + c,         oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
      oc * axis.x * axis.y + axis.z * s,oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
      oc * axis.z * axis.x - axis.y * s,oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
      0.0,                              0.0,                                0.0,                                1.0
    );
}
vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}
float qinticInOut(float t) {
  return t < 0.5
    ? 16.0 * pow(t, 5.0)
    : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}
void main() {
  vUv = uv;
  float norm = 0.5;
  vec3 newpos = position;
  float offset = (dot(distortionAxis, position) + norm / 2.) / norm;
  float localprogress = clamp(
    (fract(uPosition * 5.0 * 0.01) - 0.01 * uDistortion * offset) / (1. - 0.01 * uDistortion),
    0.,
    2.
  );
  localprogress = qinticInOut(localprogress) * PI;
  newpos = rotate(newpos, rotationAxis, localprogress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`;

const fragmentShader = `
precision highp float;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;
varying vec2 vUv;
void main() {
  vec2 imageSize = uImageSize;
  vec2 planeSize = uPlaneSize;
  float imageAspect = imageSize.x / imageSize.y;
  float planeAspect = planeSize.x / planeSize.y;
  vec2 scale = vec2(1.0, 1.0);
  if (planeAspect > imageAspect) {
      scale.x = imageAspect / planeAspect;
  } else {
      scale.y = planeAspect / imageAspect;
  }
  vec2 uv = vUv * scale + (1.0 - scale) * 0.5;
  gl_FragColor = texture2D(tMap, uv);
}
`;

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function map(num, min1, max1, min2, max2) {
  return ((num - min1) / (max1 - min1)) * (max2 - min2) + min2;
}

function numAttr(el, name, fallback) {
  var n = parseFloat(el.getAttribute(name));
  return Number.isFinite(n) ? n : fallback;
}

class Media {
  constructor(opts) {
    this.extra = 0;
    this.gl = opts.gl;
    this.geometry = opts.geometry;
    this.scene = opts.scene;
    this.screen = opts.screen;
    this.viewport = opts.viewport;
    this.image = opts.image;
    this.length = opts.length;
    this.index = opts.index;
    this.planeWidth = opts.planeWidth;
    this.planeHeight = opts.planeHeight;
    this.distortion = opts.distortion;
    this.createShader();
    this.createMesh();
    this.onResize();
  }

  createShader() {
    var texture = new Texture(this.gl, { generateMipmaps: false });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment: fragmentShader,
      vertex: vertexShader,
      uniforms: {
        tMap: { value: texture },
        uPosition: { value: 0 },
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [1, 1] },
        uSpeed: { value: 0 },
        rotationAxis: { value: [0, 1, 0] },
        distortionAxis: { value: [1, 1, 0] },
        uDistortion: { value: this.distortion },
        uViewportSize: { value: [this.viewport.width, this.viewport.height] },
        uTime: { value: 0 }
      },
      cullFace: false
    });
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    var self = this;
    img.onload = function () {
      texture.image = img;
      self.program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }

  setScale() {
    this.plane.scale.x = (this.viewport.width * this.planeWidth) / this.screen.width;
    this.plane.scale.y = (this.viewport.height * this.planeHeight) / this.screen.height;
    this.plane.position.x = 0;
    this.plane.program.uniforms.uPlaneSize.value = [this.plane.scale.x, this.plane.scale.y];
  }

  onResize(next) {
    if (next && next.screen) this.screen = next.screen;
    if (next && next.viewport) {
      this.viewport = next.viewport;
      this.plane.program.uniforms.uViewportSize.value = [this.viewport.width, this.viewport.height];
    }
    if (next && next.planeWidth) this.planeWidth = next.planeWidth;
    if (next && next.planeHeight) this.planeHeight = next.planeHeight;
    this.setScale();
    this.padding = Math.max(2.2, this.plane.scale.y * 0.35);
    this.height = this.plane.scale.y + this.padding;
    this.heightTotal = this.height * this.length;
    this.y = -this.heightTotal / 2 + (this.index + 0.5) * this.height;
  }

  update(scroll) {
    this.plane.position.y = this.y - scroll.current - this.extra;
    this.program.uniforms.uPosition.value = map(
      this.plane.position.y,
      -this.viewport.height,
      this.viewport.height,
      5,
      15
    );
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = scroll.current;
    var planeHeight = this.plane.scale.y;
    var viewportHeight = this.viewport.height;
    var topEdge = this.plane.position.y + planeHeight / 2;
    var bottomEdge = this.plane.position.y - planeHeight / 2;
    if (topEdge < -viewportHeight / 2) this.extra -= this.heightTotal;
    else if (bottomEdge > viewportHeight / 2) this.extra += this.heightTotal;
  }
}

class Canvas {
  constructor(opts) {
    this.container = opts.container;
    this.canvas = opts.canvas;
    this.items = opts.items;
    this.distortion = opts.distortion;
    this.cameraFov = opts.cameraFov;
    this.cameraZ = opts.cameraZ;
    this.scroll = {
      ease: opts.scrollEase,
      current: 0,
      target: 0,
      last: 0,
      position: 0
    };
    this.isDown = false;
    this.running = true;
    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.tick = this.tick.bind(this);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias();
    this.addEventListeners();
    this.tick();
  }

  planeSize(rect) {
    var w = Math.max(140, Math.min(rect.width * 0.72, rect.height * 0.78, 300));
    return { width: w, height: w * 0.78 };
  }

  createRenderer() {
    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0.973, 0.973, 0.965, 0);
  }

  createCamera() {
    this.camera = new Camera(this.gl, { fov: this.cameraFov });
    this.camera.position.z = this.cameraZ;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 1,
      widthSegments: 80
    });
  }

  createMedias() {
    var self = this;
    this.medias = this.items.map(function (image, index) {
      return new Media({
        gl: self.gl,
        geometry: self.planeGeometry,
        scene: self.scene,
        screen: self.screen,
        viewport: self.viewport,
        image: image,
        length: self.items.length,
        index: index,
        planeWidth: self.planeWidth,
        planeHeight: self.planeHeight,
        distortion: self.distortion
      });
    });
  }

  onResize() {
    var rect = this.container.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    this.screen = { width: rect.width, height: rect.height };
    var size = this.planeSize(rect);
    this.planeWidth = size.width;
    this.planeHeight = size.height;
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.gl.canvas.width / this.gl.canvas.height
    });
    var fov = (this.camera.fov * Math.PI) / 180;
    var height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    var width = height * this.camera.aspect;
    this.viewport = { height: height, width: width };
    if (this.medias) {
      var self = this;
      this.medias.forEach(function (media) {
        media.onResize({
          screen: self.screen,
          viewport: self.viewport,
          planeWidth: self.planeWidth,
          planeHeight: self.planeHeight
        });
      });
    }
  }

  pointerY(e) {
    if (e.touches && e.touches[0]) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientY;
    return e.clientY;
  }

  onPointerDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = this.pointerY(e);
    this.container.classList.add("is-dragging");
  }

  onPointerMove(e) {
    if (!this.isDown) return;
    var distance = (this.start - this.pointerY(e)) * 0.1;
    this.scroll.target = this.scroll.position + distance;
  }

  onPointerUp() {
    this.isDown = false;
    this.container.classList.remove("is-dragging");
  }

  onWheel(e) {
    e.preventDefault();
    this.scroll.target += e.deltaY * 0.005;
  }

  tick() {
    if (!this.running) return;
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    if (this.medias) {
      var self = this;
      this.medias.forEach(function (media) {
        media.update(self.scroll);
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
    window.removeEventListener("mousemove", this.onPointerMove);
    window.removeEventListener("mouseup", this.onPointerUp);
  }
}

function init(root) {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = root.querySelector(".posters-canvas");
  var fallback = root.querySelector(".posters-fallback");
  var items = Array.prototype.map.call(root.querySelectorAll("[data-poster-src]"), function (el) {
    return el.getAttribute("data-poster-src") || el.getAttribute("src");
  }).filter(Boolean);
  if (!items.length) {
    items = [
      "assets/images/kueh/folk-01.jpg",
      "assets/images/kueh/folk-02.jpg",
      "assets/images/kueh/folk-03.jpg",
      "assets/images/kueh/folk-04.jpg"
    ];
  }
  if (reduce || !canvas) {
    if (fallback) fallback.removeAttribute("hidden");
    if (canvas) canvas.hidden = true;
    return;
  }
  try {
    var instance = new Canvas({
      container: root,
      canvas: canvas,
      items: items,
      distortion: numAttr(root, "data-distortion", 2.4),
      scrollEase: numAttr(root, "data-scroll-ease", 0.06),
      cameraFov: numAttr(root, "data-camera-fov", 45),
      cameraZ: numAttr(root, "data-camera-z", 20)
    });
    root.classList.add("is-ready");
    root._flyingPosters = instance;
  } catch (err) {
    if (fallback) fallback.removeAttribute("hidden");
    if (canvas) canvas.hidden = true;
  }
}

document.querySelectorAll("[data-flying-posters]").forEach(init);
