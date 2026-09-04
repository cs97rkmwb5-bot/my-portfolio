(function () {
  "use strict";

  var MAX_OVERFLOW = 50;

  function decay(value, max) {
    if (max === 0) return 0;
    var entry = value / max;
    var sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
    return sigmoid * max;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function initSlider(root) {
    var startingValue = Number(root.getAttribute("data-min")) || 0;
    var maxValue = Number(root.getAttribute("data-max"));
    if (!isFinite(maxValue)) maxValue = 100;
    var defaultValue = Number(root.getAttribute("data-default"));
    if (!isFinite(defaultValue)) defaultValue = 50;
    var isStepped = root.getAttribute("data-stepped") === "true";
    var stepSize = Number(root.getAttribute("data-step")) || 1;

    var row = root.querySelector(".elastic-slider__row");
    var trackRoot = root.querySelector(".elastic-slider__root");
    var wrap = root.querySelector(".elastic-slider__track-wrap");
    var range = root.querySelector(".elastic-slider__range");
    var valueEl = root.querySelector(".elastic-slider__value");
    var leftIcon = root.querySelector(".elastic-slider__icon--left");
    var rightIcon = root.querySelector(".elastic-slider__icon--right");
    if (!trackRoot || !wrap || !range) return;

    var value = Math.min(Math.max(defaultValue, startingValue), maxValue);
    var region = "middle";
    var clientX = 0;
    var overflow = 0;
    var scale = 1;
    var dragging = false;

    function rangePercent() {
      var total = maxValue - startingValue;
      if (total === 0) return 0;
      return ((value - startingValue) / total) * 100;
    }

    function apply() {
      var width = trackRoot.getBoundingClientRect().width || 1;
      var origin = clientX < trackRoot.getBoundingClientRect().left + width / 2 ? "right" : "left";
      var height = lerp(6, 12, (scale - 1) / 0.2);
      var margin = lerp(0, -3, (scale - 1) / 0.2);
      var opacity = lerp(0.7, 1, (scale - 1) / 0.2);
      var scaleX = 1 + overflow / width;
      var scaleY = lerp(1, 0.8, overflow / MAX_OVERFLOW);

      row.style.transform = "scale(" + scale + ")";
      row.style.opacity = String(opacity);
      wrap.style.height = height + "px";
      wrap.style.marginTop = margin + "px";
      wrap.style.marginBottom = margin + "px";
      wrap.style.transformOrigin = origin;
      wrap.style.transform = "scale(" + scaleX + ", " + scaleY + ")";
      range.style.width = rangePercent() + "%";
      if (valueEl) valueEl.textContent = String(Math.round(value));

      var leftX = region === "left" ? -overflow / scale : 0;
      var rightX = region === "right" ? overflow / scale : 0;
      leftIcon.style.setProperty("--shift", leftX + "px");
      rightIcon.style.setProperty("--shift", rightX + "px");
    }

    function pulse(el) {
      if (!window.gsap || !el) return;
      var svg = el.querySelector("svg") || el;
      window.gsap.fromTo(svg, { scale: 1 }, { scale: 1.4, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" });
    }

    function setOverflowFromX(x) {
      var box = trackRoot.getBoundingClientRect();
      var nextRegion = "middle";
      var raw = 0;
      if (x < box.left) {
        nextRegion = "left";
        raw = box.left - x;
      } else if (x > box.right) {
        nextRegion = "right";
        raw = x - box.right;
      }
      if (nextRegion !== region && nextRegion !== "middle") {
        pulse(nextRegion === "left" ? leftIcon : rightIcon);
      }
      region = nextRegion;
      overflow = decay(raw, MAX_OVERFLOW);
    }

    function setValueFromX(x) {
      var box = trackRoot.getBoundingClientRect();
      var next = startingValue + ((x - box.left) / box.width) * (maxValue - startingValue);
      if (isStepped) next = Math.round(next / stepSize) * stepSize;
      value = Math.min(Math.max(next, startingValue), maxValue);
    }

    function onPointerMove(e) {
      if (!dragging && e.buttons === 0) return;
      if (e.buttons === 0 && !dragging) return;
      if (!dragging) return;
      setValueFromX(e.clientX);
      clientX = e.clientX;
      setOverflowFromX(e.clientX);
      apply();
    }

    function onPointerDown(e) {
      dragging = true;
      trackRoot.setPointerCapture(e.pointerId);
      setValueFromX(e.clientX);
      clientX = e.clientX;
      setOverflowFromX(e.clientX);
      apply();
    }

    function onPointerUp() {
      dragging = false;
      region = "middle";
      if (window.gsap) {
        window.gsap.to({ n: overflow }, {
          n: 0,
          duration: 0.75,
          ease: "elastic.out(1, 0.45)",
          onUpdate: function () {
            overflow = this.targets()[0].n;
            apply();
          }
        });
      } else {
        overflow = 0;
        apply();
      }
    }

    function hoverOn() {
      if (window.gsap) {
        window.gsap.to({ n: scale }, {
          n: 1.2,
          duration: 0.22,
          ease: "power2.out",
          onUpdate: function () {
            scale = this.targets()[0].n;
            apply();
          }
        });
      } else {
        scale = 1.2;
        apply();
      }
    }

    function hoverOff() {
      if (dragging) return;
      if (window.gsap) {
        window.gsap.to({ n: scale }, {
          n: 1,
          duration: 0.22,
          ease: "power2.out",
          onUpdate: function () {
            scale = this.targets()[0].n;
            apply();
          }
        });
      } else {
        scale = 1;
        apply();
      }
    }

    trackRoot.addEventListener("pointerdown", onPointerDown);
    trackRoot.addEventListener("pointermove", onPointerMove);
    trackRoot.addEventListener("pointerup", onPointerUp);
    trackRoot.addEventListener("pointercancel", onPointerUp);
    trackRoot.addEventListener("lostpointercapture", onPointerUp);
    row.addEventListener("mouseenter", hoverOn);
    row.addEventListener("mouseleave", hoverOff);
    row.addEventListener("touchstart", hoverOn, { passive: true });
    row.addEventListener("touchend", hoverOff);

    apply();
  }

  document.querySelectorAll("[data-elastic-slider]").forEach(initSlider);
})();
