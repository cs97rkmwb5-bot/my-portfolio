/**
 * CardNav — vanilla JS + GSAP port of React Bits CardNav
 */
(function () {
  "use strict";

  var root = document.getElementById("card-nav-root");
  if (!root) return;

  var HOME = root.getAttribute("data-home") || "index.html.html";
  var NAV_OFFSET = 88;
  var EASE = "power3.out";

  function pageHref(hash) {
    return HOME + hash;
  }

  var items = [
    {
      label: "About",
      zh: "关于",
      bgColor: "#f8f8f6",
      textColor: "#222222",
      links: [
        { label: "About Me", zh: "关于我", href: pageHref("#about"), ariaLabel: "About Me" }
      ]
    },
    {
      label: "Projects",
      zh: "项目",
      bgColor: "#f8f8f6",
      textColor: "#222222",
      links: [
        { label: "Advertisement Design", zh: "广告设计", href: pageHref("#advertisement-design"), ariaLabel: "Advertisement Design" },
        { label: "Game Prototype", zh: "游戏原型", href: pageHref("#game-prototype"), ariaLabel: "Game Prototype" },
        { label: "Client‑based Works", zh: "商业委托", href: pageHref("#projects"), ariaLabel: "Client-based Works" },
        { label: "Hand‑drawn Art", zh: "手绘作品", href: pageHref("#illustration"), ariaLabel: "Hand-drawn Art" }
      ]
    },
    {
      label: "Contact",
      zh: "联系",
      bgColor: "#f8f8f6",
      textColor: "#222222",
      links: [
        { label: "Email", zh: "邮箱", href: pageHref("#contact"), ariaLabel: "Email Jin Qiuzhu" },
        { label: "WeChat", zh: "微信", href: pageHref("#contact"), ariaLabel: "WeChat contact" }
      ]
    }
  ];

  var arrowSvg =
    '<svg class="nav-card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"></path><path d="M7 7h10v10"></path></svg>';

  function isHomePage() {
    var name = (window.location.pathname.split("/").pop() || "").toLowerCase();
    return name === "" || name === "index.html" || name === "index.html.html" || name === "layout.html";
  }

  function goTo(href) {
    if (href.indexOf("mailto:") === 0) {
      window.location.href = href;
      return;
    }

    var hashIndex = href.indexOf("#");
    var path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    var hash = hashIndex >= 0 ? href.slice(hashIndex) : "";

    if (hash && isHomePage() && (path === "" || path === HOME)) {
      var target = document.querySelector(hash);
      if (target) {
        var offset = hash === "#about" ? 0 : NAV_OFFSET;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: "smooth" });
        return;
      }
    }

    window.location.href = href;
  }

  var cardsHtml = items.map(function (item) {
    var links = (item.links || []).map(function (lnk) {
      var zh = lnk.zh ? ' data-zh="' + lnk.zh + '"' : "";
      return (
        '<a class="nav-card-link" href="' + lnk.href + '" aria-label="' + lnk.ariaLabel + '"' + zh + ">" +
        arrowSvg + lnk.label +
        "</a>"
      );
    }).join("");

    var labelZh = item.zh ? ' data-zh="' + item.zh + '"' : "";
    return (
      '<div class="nav-card" style="background-color:' + item.bgColor + ";color:" + item.textColor + '">' +
      '<div class="nav-card-label"' + labelZh + ">" + item.label + "</div>" +
      '<div class="nav-card-links">' + links + "</div>" +
      "</div>"
    );
  }).join("");

  root.innerHTML =
    '<div class="card-nav-container">' +
      '<nav class="card-nav" aria-label="Portfolio navigation">' +
        '<div class="card-nav-top">' +
          '<button type="button" class="hamburger-menu" aria-label="Open menu" aria-expanded="false">' +
            '<span class="hamburger-line"></span>' +
            '<span class="hamburger-line"></span>' +
          "</button>" +
          '<a class="logo-container" href="' + pageHref("#cover") + '" aria-label="Home">' +
            '<span class="logo-text">Jin Qiuzhu<span>|</span><span class="logo-text__rest">Design Portfolio</span></span>' +
          "</a>" +
          '<a class="card-nav-cta-button" href="' + pageHref("#contact") + '" data-zh="取得联系">Get in Touch</a>' +
        "</div>" +
        '<div class="card-nav-content" aria-hidden="true">' + cardsHtml + "</div>" +
      "</nav>" +
    "</div>";

  var navEl = root.querySelector(".card-nav");
  var hamburger = root.querySelector(".hamburger-menu");
  var contentEl = root.querySelector(".card-nav-content");
  var cardEls = Array.prototype.slice.call(root.querySelectorAll(".nav-card"));
  var isExpanded = false;
  var tl = null;

  function calculateHeight() {
    if (!contentEl) return 260;

    var wasVisibility = contentEl.style.visibility;
    var wasPointer = contentEl.style.pointerEvents;
    var wasPosition = contentEl.style.position;
    var wasHeight = contentEl.style.height;
    var wasBottom = contentEl.style.bottom;

    contentEl.style.visibility = "visible";
    contentEl.style.pointerEvents = "auto";
    contentEl.style.position = "static";
    contentEl.style.height = "auto";
    contentEl.style.bottom = "auto";
    contentEl.offsetHeight;

    var contentHeight = contentEl.scrollHeight;

    contentEl.style.visibility = wasVisibility;
    contentEl.style.pointerEvents = wasPointer;
    contentEl.style.position = wasPosition;
    contentEl.style.height = wasHeight;
    contentEl.style.bottom = wasBottom;

    return 60 + contentHeight + 8;
  }

  function createTimeline() {
    if (!window.gsap || !navEl) return null;

    window.gsap.set(navEl, { height: 60, overflow: "hidden" });
    window.gsap.set(cardEls, { y: 50, opacity: 0 });

    var timeline = window.gsap.timeline({ paused: true });
    timeline.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease: EASE
    });
    timeline.to(cardEls, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      ease: EASE,
      stagger: 0.08
    }, "-=0.1");
    return timeline;
  }

  function rebuildTimeline(keepOpen) {
    if (tl) tl.kill();
    tl = createTimeline();
    if (keepOpen && tl) {
      window.gsap.set(navEl, { height: calculateHeight() });
      tl.progress(1);
    }
  }

  function openMenu() {
    if (!tl || isExpanded) return;
    isExpanded = true;
    navEl.classList.add("open");
    hamburger.classList.add("open");
    hamburger.setAttribute("aria-expanded", "true");
    hamburger.setAttribute("aria-label", "Close menu");
    contentEl.setAttribute("aria-hidden", "false");
    tl.play(0);
  }

  function closeMenu() {
    if (!tl || !isExpanded) return;
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.setAttribute("aria-label", "Open menu");
    tl.eventCallback("onReverseComplete", function () {
      isExpanded = false;
      navEl.classList.remove("open");
      contentEl.setAttribute("aria-hidden", "true");
    });
    tl.reverse();
  }

  function toggleMenu() {
    if (isExpanded) closeMenu();
    else openMenu();
  }

  hamburger.addEventListener("click", toggleMenu);

  root.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href") || "";
      if (!href || href.indexOf("mailto:") === 0) {
        closeMenu();
        return;
      }
      e.preventDefault();
      closeMenu();
      goTo(href);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  document.addEventListener("click", function (e) {
    if (isExpanded && !root.contains(e.target)) closeMenu();
  });

  window.addEventListener("resize", function () {
    rebuildTimeline(isExpanded);
  });

  rebuildTimeline(false);
})();
