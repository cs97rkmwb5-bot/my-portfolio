/**
 * MorphSlider — 纯静态 DOM 轮播
 * 不使用 WebGL / ES Module / 后端，file:// 双击即可左右切图
 */
(function () {
  "use strict";

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
      duration: 0.45,
      loop: true,
      radius: 16,
      showCaptions: true,
      showControls: true,
      showIndicators: true
    }, options || {});

    if (!root || !items || !items.length) return;

    root.style.borderRadius = opts.radius + "px";
    root.style.setProperty("--ms-swap", opts.duration + "s");
    root.style.setProperty("--ms-dot", Math.max(opts.duration * 0.7, 0.2) + "s");

    var stage = root.querySelector(".morph-slider-stage");
    if (!stage) return;

    stage.innerHTML = "";
    var slides = [];
    items.forEach(function (item, i) {
      var img = document.createElement("img");
      img.className = "morph-slider-slide" + (i === 0 ? " is-active" : "");
      img.src = item.image;
      img.alt = item.caption || item.alt || "";
      img.draggable = false;
      img.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      stage.appendChild(img);
      slides.push(img);
    });

    var index = 0;
    var captionEls = [];
    var dotEls = [];

    function show(nextIndex) {
      var n = items.length;
      if (n < 1) return;
      nextIndex = ((nextIndex % n) + n) % n;
      if (nextIndex === index) return;
      index = nextIndex;
      setActive(slides, index);
      setActive(captionEls, index);
      setActive(dotEls, index);
    }

    function next() { show(index + 1); }
    function prev() { show(index - 1); }

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
      btns[0].addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        prev();
      });
      btns[1].addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        next();
      });
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
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          show(i);
        });
        dots.appendChild(btn);
        dotEls.push(btn);
      });
      root.appendChild(dots);
    }

    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    });

    var startX = 0;
    var active = false;
    var moved = false;

    stage.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      startX = e.clientX;
      moved = false;
      active = true;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener("pointermove", function (e) {
      if (!active) return;
      if (Math.abs(e.clientX - startX) > 8) moved = true;
    });
    function endPointer(e) {
      if (!active) return;
      active = false;
      var dx = e.clientX - startX;
      if (moved && Math.abs(dx) > 40 && multi) {
        if (dx < 0) next();
        else prev();
        return;
      }
      if (moved) return;
      var item = items[index];
      if (item && typeof window.openImageLightbox === "function") {
        window.openImageLightbox(item.image, item.caption || "");
      }
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", function () {
      active = false;
    });
  }

  window.initMorphSlider = initMorphSlider;

  var posterRoot = document.getElementById("poster-morph");
  if (posterRoot) {
    initMorphSlider(posterRoot, [
      {
        image: "assets/images/zensit/poster-stamp.jpg",
        caption: ""
      }
    ], {
      radius: 16,
      showCaptions: true,
      showControls: true,
      showIndicators: true,
      loop: true
    });
  }

  var storyRoot = document.getElementById("storyboard-morph");
  if (storyRoot) {
    initMorphSlider(storyRoot, [
      { image: "assets/images/zensit/boards/board-01.jpg?v=5", caption: "" },
      { image: "assets/images/zensit/boards/board-02.jpg?v=5", caption: "" },
      { image: "assets/images/zensit/boards/board-03.jpg?v=5", caption: "" }
    ], {
      radius: 0,
      showCaptions: false,
      showControls: true,
      showIndicators: true,
      loop: true
    });
  }
})();
