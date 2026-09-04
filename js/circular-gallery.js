/**
 * CircularGallery — file:// 可用的静态左右轮播
 * 不再使用 ES Module / OGL，避免双击打开时脚本被拦截
 */
(function () {
  "use strict";

  function readItems(root) {
    var zh = document.body.classList.contains("is-zh");
    return Array.prototype.map.call(root.querySelectorAll("[data-gallery-src]"), function (el) {
      return {
        image: el.getAttribute("data-gallery-src"),
        caption: zh && el.getAttribute("data-zh") ? el.getAttribute("data-zh") : el.getAttribute("data-text") || "",
        alt: el.getAttribute("alt") || ""
      };
    }).filter(function (item) {
      return item.image;
    });
  }

  function start(root) {
    if (!window.initMorphSlider) return;
    var items = readItems(root);
    var fallback = root.querySelector(".circular-gallery__fallback");
    if (!items.length) {
      if (fallback) fallback.removeAttribute("hidden");
      return;
    }
    if (fallback) fallback.setAttribute("hidden", "hidden");

    var oldControls = root.querySelector(".morph-slider-controls");
    var oldDots = root.querySelector(".morph-slider-indicators");
    if (oldControls) oldControls.parentNode.removeChild(oldControls);
    if (oldDots) oldDots.parentNode.removeChild(oldDots);

    var stage = root.querySelector(".morph-slider-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.className = "morph-slider-stage";
      stage.setAttribute("role", "group");
      stage.setAttribute("aria-roledescription", "carousel");
      stage.setAttribute("tabindex", "0");
      root.insertBefore(stage, root.firstChild);
    }

    root.classList.add("morph-slider", "morph-slider--paper");
    window.initMorphSlider(root, items, {
      radius: 0,
      showCaptions: false,
      showControls: true,
      showIndicators: true,
      loop: true
    });
    root.classList.add("is-ready");
  }

  document.querySelectorAll("[data-circular-gallery]").forEach(start);
})();
