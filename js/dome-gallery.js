(function () {
  "use strict";

  var DEFAULTS = {
    maxVerticalRotationDeg: 5,
    dragSensitivity: 20,
    enlargeTransitionMs: 300,
    segments: 35
  };

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function normalizeAngle(d) {
    return ((d % 360) + 360) % 360;
  }

  function wrapAngleSigned(deg) {
    var a = (((deg + 180) % 360) + 360) % 360;
    return a - 180;
  }

  function getDataNumber(el, name, fallback) {
    var attr = el.dataset[name];
    if (attr == null) attr = el.getAttribute("data-" + name.replace(/[A-Z]/g, function (m) {
      return "-" + m.toLowerCase();
    }));
    var n = attr == null ? NaN : parseFloat(attr);
    return Number.isFinite(n) ? n : fallback;
  }

  function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
    var unit = 360 / segments / 2;
    return {
      rotateY: unit * (offsetX + (sizeX - 1) / 2),
      rotateX: unit * (offsetY - (sizeY - 1) / 2)
    };
  }

  function buildItems(pool, seg) {
    var xCols = [];
    var i;
    for (i = 0; i < seg; i++) xCols.push(-37 + i * 2);
    var evenYs = [-4, -2, 0, 2, 4];
    var oddYs = [-3, -1, 1, 3, 5];
    var coords = [];
    xCols.forEach(function (x, c) {
      var ys = c % 2 === 0 ? evenYs : oddYs;
      ys.forEach(function (y) {
        coords.push({ x: x, y: y, sizeX: 2, sizeY: 2 });
      });
    });
    if (!pool.length) {
      return coords.map(function (c) {
        return { x: c.x, y: c.y, sizeX: 2, sizeY: 2, src: "", alt: "" };
      });
    }
    var used = [];
    for (i = 0; i < coords.length; i++) used.push(pool[i % pool.length]);
    for (i = 1; i < used.length; i++) {
      if (used[i].src === used[i - 1].src) {
        var j;
        for (j = i + 1; j < used.length; j++) {
          if (used[j].src !== used[i].src) {
            var tmp = used[i];
            used[i] = used[j];
            used[j] = tmp;
            break;
          }
        }
      }
    }
    return coords.map(function (c, idx) {
      return {
        x: c.x,
        y: c.y,
        sizeX: 2,
        sizeY: 2,
        src: used[idx].src,
        alt: used[idx].alt
      };
    });
  }

  function initDomeGallery(root) {
    var pool = Array.prototype.slice.call(root.querySelectorAll("img")).map(function (img) {
      return { src: img.getAttribute("src") || "", alt: img.getAttribute("alt") || "" };
    });
    if (!pool.length) return;

    var fit = parseFloat(root.getAttribute("data-fit") || "0.5");
    var minRadius = parseFloat(root.getAttribute("data-min-radius") || "600");
    var maxRadius = parseFloat(root.getAttribute("data-max-radius") || String(Infinity));
    var padFactor = parseFloat(root.getAttribute("data-pad-factor") || "0.25");
    var maxVertical = parseFloat(root.getAttribute("data-max-vertical") || String(DEFAULTS.maxVerticalRotationDeg));
    var segments = parseInt(root.getAttribute("data-segments") || String(DEFAULTS.segments), 10);
    var dragDampening = parseFloat(root.getAttribute("data-drag-dampening") || "2");
    var dragSensitivity = parseFloat(root.getAttribute("data-drag-sensitivity") || String(DEFAULTS.dragSensitivity));
    var enlargeMs = parseFloat(root.getAttribute("data-enlarge-ms") || String(DEFAULTS.enlargeTransitionMs));
    var openedWidth = root.getAttribute("data-opened-width") || "400px";
    var openedHeight = root.getAttribute("data-opened-height") || "400px";
    var grayscale = root.getAttribute("data-grayscale") === "true";
    var overlay = root.getAttribute("data-overlay") || "#f8f8f6";
    var tileRadius = root.getAttribute("data-tile-radius") || "30px";
    var enlargeRadius = root.getAttribute("data-enlarge-radius") || "30px";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    root.style.setProperty("--segments-x", String(segments));
    root.style.setProperty("--segments-y", String(segments));
    root.style.setProperty("--overlay-blur-color", overlay);
    root.style.setProperty("--tile-radius", tileRadius);
    root.style.setProperty("--enlarge-radius", enlargeRadius);
    root.style.setProperty("--image-filter", grayscale ? "grayscale(1)" : "none");

    var items = buildItems(pool, segments);
    var main = document.createElement("div");
    main.className = "dome-gallery__main";
    var stage = document.createElement("div");
    stage.className = "dome-gallery__stage";
    var sphere = document.createElement("div");
    sphere.className = "dome-gallery__sphere";

    items.forEach(function (it) {
      var item = document.createElement("div");
      item.className = "dome-gallery__item";
      item.dataset.src = it.src;
      item.dataset.offsetX = String(it.x);
      item.dataset.offsetY = String(it.y);
      item.dataset.sizeX = String(it.sizeX);
      item.dataset.sizeY = String(it.sizeY);
      item.style.setProperty("--offset-x", String(it.x));
      item.style.setProperty("--offset-y", String(it.y));
      item.style.setProperty("--item-size-x", String(it.sizeX));
      item.style.setProperty("--item-size-y", String(it.sizeY));
      var tile = document.createElement("div");
      tile.className = "dome-gallery__tile";
      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("aria-label", it.alt || "Open image");
      var img = document.createElement("img");
      img.src = it.src;
      img.alt = it.alt || "";
      img.draggable = false;
      tile.appendChild(img);
      item.appendChild(tile);
      sphere.appendChild(item);
    });

    stage.appendChild(sphere);
    main.appendChild(stage);

    var overlayEl = document.createElement("div");
    overlayEl.className = "dome-gallery__overlay";
    var overlayBlur = document.createElement("div");
    overlayBlur.className = "dome-gallery__overlay dome-gallery__overlay--blur";
    var edgeTop = document.createElement("div");
    edgeTop.className = "dome-gallery__edge dome-gallery__edge--top";
    var edgeBottom = document.createElement("div");
    edgeBottom.className = "dome-gallery__edge dome-gallery__edge--bottom";
    var viewer = document.createElement("div");
    viewer.className = "dome-gallery__viewer";
    var scrim = document.createElement("div");
    scrim.className = "dome-gallery__scrim";
    var frame = document.createElement("div");
    frame.className = "dome-gallery__frame";
    viewer.appendChild(scrim);
    viewer.appendChild(frame);

    main.appendChild(overlayEl);
    main.appendChild(overlayBlur);
    main.appendChild(edgeTop);
    main.appendChild(edgeBottom);
    main.appendChild(viewer);
    root.appendChild(main);

    var rot = { x: 0, y: 0 };
    var focusedEl = null;
    var originalTilePos = null;
    var opening = false;
    var openStartedAt = 0;
    var scrollLocked = false;

    function applyTransform() {
      sphere.style.transform =
        "translateZ(calc(var(--radius) * -1)) rotateX(" + rot.x + "deg) rotateY(" + rot.y + "deg)";
    }

    function lockScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      document.body.classList.add("dg-scroll-lock");
    }

    function unlockScroll() {
      if (!scrollLocked) return;
      if (root.getAttribute("data-enlarging") === "true") return;
      scrollLocked = false;
      document.body.classList.remove("dg-scroll-lock");
    }

    function resize() {
      var rect = root.getBoundingClientRect();
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      var minDim = Math.min(w, h);
      var maxDim = Math.max(w, h);
      var aspect = w / h;
      var basis = aspect >= 1.3 ? w : minDim;
      var radius = basis * fit;
      radius = Math.min(radius, h * 1.35);
      radius = clamp(radius, minRadius, isFinite(maxRadius) ? maxRadius : Infinity);
      root.style.setProperty("--radius", Math.round(radius) + "px");
      root.style.setProperty("--viewer-pad", Math.max(8, Math.round(minDim * padFactor)) + "px");
      applyTransform();

      var enlarged = viewer.querySelector(".dome-gallery__enlarge");
      if (enlarged && openedWidth && openedHeight) {
        var frameR = frame.getBoundingClientRect();
        var mainR = main.getBoundingClientRect();
        var temp = document.createElement("div");
        temp.style.cssText = "position:absolute;width:" + openedWidth + ";height:" + openedHeight + ";visibility:hidden;";
        document.body.appendChild(temp);
        var tempRect = temp.getBoundingClientRect();
        document.body.removeChild(temp);
        enlarged.style.left = frameR.left - mainR.left + (frameR.width - tempRect.width) / 2 + "px";
        enlarged.style.top = frameR.top - mainR.top + (frameR.height - tempRect.height) / 2 + "px";
      }
    }

    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(root);
    }
    resize();

    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var startRot = { x: 0, y: 0 };
    var lastX = 0;
    var lastY = 0;
    var lastT = 0;
    var velX = 0;
    var velY = 0;
    var inertiaId = null;
    var lastDragEndAt = 0;

    function stopInertia() {
      if (inertiaId) {
        cancelAnimationFrame(inertiaId);
        inertiaId = null;
      }
    }

    function startInertia(vx, vy) {
      if (reduceMotion) return;
      var MAX_V = 1.4;
      var vX = clamp(vx, -MAX_V, MAX_V) * 80;
      var vY = clamp(vy, -MAX_V, MAX_V) * 80;
      var frames = 0;
      var d = clamp(dragDampening, 0, 1);
      var frictionMul = 0.94 + 0.055 * d;
      var stopThreshold = 0.015 - 0.01 * d;
      var maxFrames = Math.round(90 + 270 * d);
      stopInertia();
      function step() {
        vX *= frictionMul;
        vY *= frictionMul;
        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaId = null;
          return;
        }
        if (++frames > maxFrames) {
          inertiaId = null;
          return;
        }
        rot.x = clamp(rot.x - vY / 200, -maxVertical, maxVertical);
        rot.y = wrapAngleSigned(rot.y + vX / 200);
        applyTransform();
        inertiaId = requestAnimationFrame(step);
      }
      inertiaId = requestAnimationFrame(step);
    }

    main.addEventListener("pointerdown", function (e) {
      if (focusedEl) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      stopInertia();
      dragging = true;
      moved = false;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      lastT = performance.now();
      velX = 0;
      velY = 0;
      startRot = { x: rot.x, y: rot.y };
      try {
        main.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    main.addEventListener("pointermove", function (e) {
      if (focusedEl || !dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (dx * dx + dy * dy > 16) moved = true;
      var now = performance.now();
      var dt = Math.max(1, now - lastT);
      velX = (e.clientX - lastX) / dt;
      velY = (e.clientY - lastY) / dt;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      rot.x = clamp(startRot.x - dy / dragSensitivity, -maxVertical, maxVertical);
      rot.y = wrapAngleSigned(startRot.y + dx / dragSensitivity);
      applyTransform();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(velX) > 0.005 || Math.abs(velY) > 0.005) startInertia(velX, velY);
      if (moved) lastDragEndAt = performance.now();
    }

    main.addEventListener("pointerup", endDrag);
    main.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    function closeEnlarge() {
      if (performance.now() - openStartedAt < 250) return;
      var el = focusedEl;
      if (!el) return;
      var parent = el.parentElement;
      var overlayNode = viewer.querySelector(".dome-gallery__enlarge");
      if (!overlayNode) return;
      var refDiv = parent.querySelector(".dome-gallery__tile--ref");

      if (!originalTilePos) {
        overlayNode.remove();
        if (refDiv) refDiv.remove();
        parent.style.setProperty("--rot-y-delta", "0deg");
        parent.style.setProperty("--rot-x-delta", "0deg");
        el.style.visibility = "";
        el.style.zIndex = 0;
        focusedEl = null;
        root.removeAttribute("data-enlarging");
        opening = false;
        unlockScroll();
        return;
      }

      var currentRect = overlayNode.getBoundingClientRect();
      var rootRect = root.getBoundingClientRect();
      var originalPosRelativeToRoot = {
        left: originalTilePos.left - rootRect.left,
        top: originalTilePos.top - rootRect.top,
        width: originalTilePos.width,
        height: originalTilePos.height
      };
      var overlayRelativeToRoot = {
        left: currentRect.left - rootRect.left,
        top: currentRect.top - rootRect.top,
        width: currentRect.width,
        height: currentRect.height
      };

      var animatingOverlay = document.createElement("div");
      animatingOverlay.className = "dome-gallery__enlarge-closing";
      animatingOverlay.style.cssText =
        "position:absolute;left:" + overlayRelativeToRoot.left + "px;top:" + overlayRelativeToRoot.top +
        "px;width:" + overlayRelativeToRoot.width + "px;height:" + overlayRelativeToRoot.height +
        "px;z-index:9999;border-radius:var(--enlarge-radius,32px);overflow:hidden;background:transparent;" +
        "box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all " + enlargeMs +
        "ms ease-out;pointer-events:none;margin:0;transform:none;";
      var originalImg = overlayNode.querySelector("img");
      if (originalImg) {
        var clone = originalImg.cloneNode(true);
        clone.style.cssText = "width:100%;height:100%;object-fit:contain;image-rendering:pixelated;";
        animatingOverlay.appendChild(clone);
      }
      overlayNode.remove();
      root.appendChild(animatingOverlay);
      void animatingOverlay.getBoundingClientRect();
      requestAnimationFrame(function () {
        animatingOverlay.style.left = originalPosRelativeToRoot.left + "px";
        animatingOverlay.style.top = originalPosRelativeToRoot.top + "px";
        animatingOverlay.style.width = originalPosRelativeToRoot.width + "px";
        animatingOverlay.style.height = originalPosRelativeToRoot.height + "px";
        animatingOverlay.style.opacity = "0";
      });

      var cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        animatingOverlay.remove();
        originalTilePos = null;
        if (refDiv) refDiv.remove();
        parent.style.transition = "none";
        el.style.transition = "none";
        parent.style.setProperty("--rot-y-delta", "0deg");
        parent.style.setProperty("--rot-x-delta", "0deg");
        requestAnimationFrame(function () {
          el.style.visibility = "";
          el.style.opacity = "0";
          el.style.zIndex = 0;
          focusedEl = null;
          root.removeAttribute("data-enlarging");
          requestAnimationFrame(function () {
            parent.style.transition = "";
            el.style.transition = "opacity 300ms ease-out";
            requestAnimationFrame(function () {
              el.style.opacity = "1";
              setTimeout(function () {
                el.style.transition = "";
                el.style.opacity = "";
                opening = false;
                if (!dragging && root.getAttribute("data-enlarging") !== "true") {
                  document.body.classList.remove("dg-scroll-lock");
                  scrollLocked = false;
                }
              }, 300);
            });
          });
        });
      }
      animatingOverlay.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, enlargeMs + 80);
    }

    function openItemFromElement(el) {
      if (opening) return;
      opening = true;
      openStartedAt = performance.now();
      lockScroll();
      var parent = el.parentElement;
      focusedEl = el;
      el.setAttribute("data-focused", "true");

      var offsetX = getDataNumber(parent, "offsetX", 0);
      var offsetY = getDataNumber(parent, "offsetY", 0);
      var sizeX = getDataNumber(parent, "sizeX", 2);
      var sizeY = getDataNumber(parent, "sizeY", 2);
      var parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments);
      var parentY = normalizeAngle(parentRot.rotateY);
      var globalY = normalizeAngle(rot.y);
      var rotY = -(parentY + globalY) % 360;
      if (rotY < -180) rotY += 360;
      var rotX = -parentRot.rotateX - rot.x;
      parent.style.setProperty("--rot-y-delta", rotY + "deg");
      parent.style.setProperty("--rot-x-delta", rotX + "deg");

      var refDiv = document.createElement("div");
      refDiv.className = "dome-gallery__tile dome-gallery__tile--ref";
      refDiv.style.opacity = "0";
      refDiv.style.transform = "rotateX(" + -parentRot.rotateX + "deg) rotateY(" + -parentRot.rotateY + "deg)";
      parent.appendChild(refDiv);
      void refDiv.offsetHeight;

      var tileR = refDiv.getBoundingClientRect();
      var mainR = main.getBoundingClientRect();
      var frameR = frame.getBoundingClientRect();
      if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
        opening = false;
        focusedEl = null;
        parent.removeChild(refDiv);
        unlockScroll();
        return;
      }

      originalTilePos = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
      el.style.visibility = "hidden";
      el.style.zIndex = 0;

      var enlarge = document.createElement("div");
      enlarge.className = "dome-gallery__enlarge";
      enlarge.style.position = "absolute";
      enlarge.style.left = frameR.left - mainR.left + "px";
      enlarge.style.top = frameR.top - mainR.top + "px";
      enlarge.style.width = frameR.width + "px";
      enlarge.style.height = frameR.height + "px";
      enlarge.style.opacity = "0";
      enlarge.style.zIndex = "30";
      enlarge.style.willChange = "transform, opacity";
      enlarge.style.transformOrigin = "top left";
      enlarge.style.transition = "transform " + enlargeMs + "ms ease, opacity " + enlargeMs + "ms ease";
      var rawSrc = parent.dataset.src || (el.querySelector("img") && el.querySelector("img").src) || "";
      var img = document.createElement("img");
      img.src = rawSrc;
      img.alt = (el.querySelector("img") && el.querySelector("img").alt) || "";
      enlarge.appendChild(img);
      viewer.appendChild(enlarge);

      var tx0 = tileR.left - frameR.left;
      var ty0 = tileR.top - frameR.top;
      var sx0 = tileR.width / frameR.width;
      var sy0 = tileR.height / frameR.height;
      var validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
      var validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;
      enlarge.style.transform = "translate(" + tx0 + "px, " + ty0 + "px) scale(" + validSx0 + ", " + validSy0 + ")";

      setTimeout(function () {
        if (!enlarge.parentElement) return;
        enlarge.style.opacity = "1";
        enlarge.style.transform = "translate(0px, 0px) scale(1, 1)";
        root.setAttribute("data-enlarging", "true");
      }, 16);

      if (openedWidth || openedHeight) {
        enlarge.addEventListener("transitionend", function onFirstEnd(ev) {
          if (ev.propertyName !== "transform") return;
          enlarge.removeEventListener("transitionend", onFirstEnd);
          var prevTransition = enlarge.style.transition;
          enlarge.style.transition = "none";
          var tempWidth = openedWidth || frameR.width + "px";
          var tempHeight = openedHeight || frameR.height + "px";
          enlarge.style.width = tempWidth;
          enlarge.style.height = tempHeight;
          var newRect = enlarge.getBoundingClientRect();
          enlarge.style.width = frameR.width + "px";
          enlarge.style.height = frameR.height + "px";
          void enlarge.offsetWidth;
          enlarge.style.transition =
            "left " + enlargeMs + "ms ease, top " + enlargeMs + "ms ease, width " + enlargeMs + "ms ease, height " + enlargeMs + "ms ease";
          var centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
          var centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
          requestAnimationFrame(function () {
            enlarge.style.left = centeredLeft + "px";
            enlarge.style.top = centeredTop + "px";
            enlarge.style.width = tempWidth;
            enlarge.style.height = tempHeight;
          });
          enlarge.addEventListener("transitionend", function cleanupSecond() {
            enlarge.style.transition = prevTransition;
          }, { once: true });
        });
      }
    }

    function onTileClick(tile) {
      if (moved) return;
      if (performance.now() - lastDragEndAt < 80) return;
      if (opening) return;
      openItemFromElement(tile);
    }

    root.querySelectorAll(".dome-gallery__tile").forEach(function (tile) {
      if (tile.classList.contains("dome-gallery__tile--ref")) return;
      tile.addEventListener("click", function (e) {
        e.stopPropagation();
        onTileClick(tile);
      });
      tile.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTileClick(tile);
        }
      });
    });

    scrim.addEventListener("click", closeEnlarge);
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeEnlarge();
    });
  }

  document.querySelectorAll("[data-dome-gallery]").forEach(initDomeGallery);
})();
