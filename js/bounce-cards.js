(function () {
  "use strict";

  function parsePxTranslate(transformStr) {
    var match = String(transformStr).match(/translate\(\s*(-?[\d.]+)px\s*\)/);
    return match ? parseFloat(match[1]) : null;
  }

  function parseRotate(transformStr) {
    var match = String(transformStr).match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function getNoRotationTransform(transformStr) {
    if (/rotate\([\s\S]*?\)/.test(transformStr)) {
      return transformStr.replace(/rotate\([\s\S]*?\)/, "rotate(0deg)");
    }
    if (transformStr === "none") return "rotate(0deg)";
    return transformStr + " rotate(0deg)";
  }

  function getPushedTransform(baseTransform, offsetX) {
    var currentX = parsePxTranslate(baseTransform);
    if (currentX !== null) {
      return baseTransform.replace(
        /translate\(\s*-?[\d.]+px\s*\)/,
        "translate(" + (currentX + offsetX) + "px)"
      );
    }
    if (baseTransform === "none") return "translate(" + offsetX + "px)";
    return baseTransform + " translate(" + offsetX + "px)";
  }

  function fitToWrap(wrap, root) {
    if (!wrap) return;
    var baseW = parseFloat(root.getAttribute("data-width") || "500") || 500;
    var scale = Math.min(1, wrap.clientWidth / baseW);
    root.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
    wrap.style.height = (parseFloat(root.getAttribute("data-height") || "250") || 250) * scale + "px";
  }

  function initBounceCards(root) {
    if (!window.gsap) return;

    var wrap = root.parentElement;
    var delay = parseFloat(root.getAttribute("data-delay") || "1");
    var stagger = parseFloat(root.getAttribute("data-stagger") || "0.08");
    var ease = root.getAttribute("data-ease") || "elastic.out(1, 0.5)";
    var enableHover = root.getAttribute("data-hover") === "true";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cards = Array.prototype.slice.call(root.querySelectorAll(".bounce-cards__card"));
    var transforms = cards.map(function (card) {
      return card.getAttribute("data-transform") || "none";
    });

    cards.forEach(function (card, i) {
      window.gsap.set(card, {
        x: parsePxTranslate(transforms[i]) || 0,
        rotation: parseRotate(transforms[i]),
        scale: reduceMotion ? 1 : 0,
        zIndex: i + 1
      });
      card.addEventListener("click", function () {
        var img = card.querySelector("img");
        if (img && typeof window.openImageLightbox === "function") {
          window.openImageLightbox(img.currentSrc || img.src, img.alt);
        }
      });
    });

    fitToWrap(wrap, root);
    if (window.ResizeObserver && wrap) {
      var ro = new ResizeObserver(function () {
        fitToWrap(wrap, root);
      });
      ro.observe(wrap);
    }

    var played = false;
    function play() {
      if (played) return;
      played = true;
      if (reduceMotion) {
        window.gsap.set(cards, { scale: 1 });
        return;
      }
      window.gsap.fromTo(
        cards,
        { scale: 0 },
        {
          scale: 1,
          stagger: stagger,
          ease: ease,
          delay: delay
        }
      );
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              play();
              io.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      io.observe(root);
    } else {
      play();
    }

    if (!enableHover) return;

    function pushSiblings(hoveredIdx) {
      cards.forEach(function (card, i) {
        window.gsap.killTweensOf(card);
        var baseTransform = transforms[i] || "none";
        if (i === hoveredIdx) {
          window.gsap.to(card, {
            transform: getNoRotationTransform(baseTransform),
            duration: 0.4,
            ease: "back.out(1.4)",
            overwrite: "auto"
          });
          return;
        }
        window.gsap.to(card, {
          transform: getPushedTransform(baseTransform, i < hoveredIdx ? -160 : 160),
          duration: 0.4,
          ease: "back.out(1.4)",
          delay: Math.abs(hoveredIdx - i) * 0.05,
          overwrite: "auto"
        });
      });
    }

    function resetSiblings() {
      cards.forEach(function (card, i) {
        window.gsap.killTweensOf(card);
        window.gsap.to(card, {
          transform: transforms[i] || "none",
          duration: 0.4,
          ease: "back.out(1.4)",
          overwrite: "auto"
        });
      });
    }

    cards.forEach(function (card, i) {
      card.addEventListener("mouseenter", function () {
        pushSiblings(i);
      });
      card.addEventListener("mouseleave", resetSiblings);
    });
  }

  document.querySelectorAll("[data-bounce-cards]").forEach(initBounceCards);
})();
