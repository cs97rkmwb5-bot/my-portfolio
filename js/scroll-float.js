/**
 * ScrollFloat — 原生 JS 移植（React Bits + GSAP）
 * 滚动进入视口时，标题逐字浮入动画
 */

(function () {
  "use strict";

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("ScrollFloat: GSAP or ScrollTrigger is not loaded");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /**
   * @param {HTMLElement} el
   * @param {Object} options
   */
  function initScrollFloat(el, options) {
    var text = el.textContent.trim();
    if (!text) return;

    el.textContent = "";
    el.classList.add("scroll-float-title");

    var textWrap = document.createElement("span");
    textWrap.className = "scroll-float-text";

    text.split("").forEach(function (char) {
      var charEl = document.createElement("span");
      charEl.className = "char";
      charEl.textContent = char === " " ? "\u00A0" : char;
      textWrap.appendChild(charEl);
    });

    el.appendChild(textWrap);

    var chars = textWrap.querySelectorAll(".char");

    gsap.fromTo(
      chars,
      {
        willChange: "opacity, transform",
        opacity: 0,
        yPercent: 120,
        scaleY: 2.3,
        scaleX: 0.7,
        transformOrigin: "50% 0%"
      },
      {
        duration: options.animationDuration || 1,
        ease: options.ease || "back.inOut(2)",
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger: options.stagger || 0.03,
        scrollTrigger: {
          trigger: el,
          start: options.scrollStart || "center bottom+=50%",
          end: options.scrollEnd || "bottom bottom-=40%",
          scrub: true
        }
      }
    );
  }

  document.querySelectorAll("[data-scroll-float]").forEach(function (el) {
    initScrollFloat(el, {
      animationDuration: 1,
      ease: "back.inOut(2)",
      scrollStart: "center bottom+=50%",
      scrollEnd: "bottom bottom-=40%",
      stagger: 0.03
    });
  });
})();
