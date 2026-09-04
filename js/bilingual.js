/**
 * English by default.
 * Right-click [data-zh] to peek at Chinese.
 * Floating button translates the whole page; click again to restore English.
 */
(function () {
  "use strict";

  var popover = null;
  var hideTimer = null;
  var fab = null;
  var isZh = false;

  function ensurePopover() {
    if (popover) return popover;
    popover = document.createElement("div");
    popover.className = "zh-popover";
    popover.setAttribute("role", "tooltip");
    popover.innerHTML =
      '<span class="zh-popover__label">中文原文</span>' +
      '<div class="zh-popover__text"></div>';
    document.body.appendChild(popover);
    return popover;
  }

  function hidePopover() {
    if (!popover) return;
    popover.classList.remove("is-visible");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (popover && !popover.classList.contains("is-visible")) {
        popover.querySelector(".zh-popover__text").textContent = "";
      }
    }, 220);
  }

  function showPopover(text, x, y) {
    var el = ensurePopover();
    var textEl = el.querySelector(".zh-popover__text");
    textEl.textContent = text;

    el.style.left = "0px";
    el.style.top = "0px";
    el.classList.add("is-visible");

    var rect = el.getBoundingClientRect();
    var pad = 12;
    var left = x + pad;
    var top = y + pad;

    if (left + rect.width > window.innerWidth - pad) {
      left = x - rect.width - pad;
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = y - rect.height - pad;
    }
    if (left < pad) left = pad;
    if (top < pad) top = pad;

    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function translationTargets() {
    return Array.prototype.filter.call(document.querySelectorAll("[data-zh]"), function (el) {
      return !el.closest(".lang-fab") && !el.closest(".zh-popover");
    });
  }

  function stripTags(html) {
    var box = document.createElement("div");
    box.innerHTML = html;
    return (box.textContent || "").replace(/\s+/g, " ").trim();
  }

  function applyChinese(el) {
    if (!el.hasAttribute("data-en-html")) {
      el.setAttribute("data-en-html", el.innerHTML);
    }
    var zh = el.getAttribute("data-zh") || "";
    var enText = stripTags(el.getAttribute("data-en-html") || "");
    var prefix = enText.charAt(0) === "•" && zh.charAt(0) !== "•" ? "• " : "";
    el.textContent = prefix + zh;
  }

  function applyEnglish(el) {
    var html = el.getAttribute("data-en-html");
    if (html != null) el.innerHTML = html;
  }

  function setPageLang(nextZh) {
    isZh = nextZh;
    translationTargets().forEach(nextZh ? applyChinese : applyEnglish);
    document.documentElement.lang = nextZh ? "zh-CN" : "en";
    document.body.classList.toggle("is-zh", nextZh);
    if (fab) {
      fab.classList.toggle("is-zh", nextZh);
      fab.textContent = nextZh ? "EN" : "中";
      fab.setAttribute(
        "aria-label",
        nextZh ? "Show page in English" : "Translate page to Chinese"
      );
      fab.setAttribute("title", nextZh ? "English" : "全篇中文");
    }
  }

  function ensureFab() {
    if (fab) return fab;
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "lang-fab";
    fab.textContent = "中";
    fab.setAttribute("aria-label", "Translate page to Chinese");
    fab.setAttribute("title", "全篇中文");
    fab.addEventListener("click", function (e) {
      e.stopPropagation();
      hidePopover();
      setPageLang(!isZh);
    });
    document.body.appendChild(fab);
    return fab;
  }

  document.addEventListener(
    "contextmenu",
    function (e) {
      if (e.target.closest(".lang-fab")) return;

      var target = e.target.closest("[data-zh]");
      if (!target || target.closest(".zh-popover")) {
        hidePopover();
        return;
      }

      var zh = target.getAttribute("data-zh");
      if (!zh) return;

      e.preventDefault();
      showPopover(zh, e.clientX, e.clientY);
    },
    true
  );

  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest(".lang-fab")) return;
      hidePopover();
    },
    true
  );
  document.addEventListener("scroll", hidePopover, { passive: true, capture: true });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hidePopover();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureFab);
  } else {
    ensureFab();
  }
})();
