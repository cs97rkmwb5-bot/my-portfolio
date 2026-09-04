/**
 * StaggeredMenu — vanilla port of the React Bits component.
 * Used here as a scene index over a preview image.
 */
(function () {
  "use strict";

  function StaggeredMenu(root) {
    this.root = root;
    this.panel = root.querySelector(".staggered-menu-panel");
    this.preContainer = root.querySelector(".sm-prelayers");
    this.layers = this.preContainer
      ? Array.prototype.slice.call(this.preContainer.querySelectorAll(".sm-prelayer"))
      : [];
    this.toggleBtn = root.querySelector(".sm-toggle");
    this.icon = root.querySelector(".sm-icon");
    this.plusH = root.querySelector(".sm-icon-line:not(.sm-icon-line-v)");
    this.plusV = root.querySelector(".sm-icon-line-v");
    this.textInner = root.querySelector(".sm-toggle-textInner");
    this.preview = root.parentElement
      ? root.parentElement.querySelector("[data-kueh-folk-preview]")
      : null;
    this.position = root.getAttribute("data-position") || "right";
    this.menuButtonColor = root.getAttribute("data-menu-color") || "#222222";
    this.openMenuButtonColor = root.getAttribute("data-open-color") || "#222222";
    this.open = false;
    this.busy = false;
    this.openedAt = 0;
    this.openTl = null;
    this.closeTween = null;
    this.spinTween = null;
    this.textTween = null;
    this.colorTween = null;

    if (!this.panel || !this.toggleBtn || !this.plusH || !this.plusV || !this.icon || !this.textInner) {
      return;
    }

    this.offscreen = this.position === "left" ? -100 : 100;
    this._setup();
    this._bind();
  }

  StaggeredMenu.prototype._park = function (els) {
    var gsap = window.gsap;
    gsap.set(els, { x: 0, y: 0, xPercent: this.offscreen, yPercent: 0, opacity: 1 });
  };

  StaggeredMenu.prototype._setup = function () {
    var gsap = window.gsap;
    if (!gsap) return;
    this._park([this.panel].concat(this.layers));
    this.root.classList.add("is-ready");
    if (this.preContainer) gsap.set(this.preContainer, { x: 0, xPercent: 0, opacity: 1 });
    gsap.set(this.plusH, { transformOrigin: "50% 50%", rotate: 0 });
    gsap.set(this.plusV, { transformOrigin: "50% 50%", rotate: 90 });
    gsap.set(this.icon, { rotate: 0, transformOrigin: "50% 50%" });
    gsap.set(this.textInner, { yPercent: 0 });
    gsap.set(this.toggleBtn, { color: this.menuButtonColor });
  };

  StaggeredMenu.prototype._bind = function () {
    var self = this;
    this.toggleBtn.addEventListener("click", function () {
      self.toggle();
    });
    document.addEventListener("mousedown", function (e) {
      if (!self.open) return;
      if (Date.now() - self.openedAt < 450) return;
      if (self.panel.contains(e.target) || self.toggleBtn.contains(e.target)) return;
      self.close();
    });
    Array.prototype.forEach.call(this.panel.querySelectorAll(".sm-panel-item[data-image]"), function (btn) {
      btn.addEventListener("click", function () {
        self.selectItem(btn);
      });
    });
  };

  StaggeredMenu.prototype._itemEls = function () {
    return Array.prototype.slice.call(this.panel.querySelectorAll(".sm-panel-itemLabel"));
  };

  StaggeredMenu.prototype._numberEls = function () {
    return Array.prototype.slice.call(this.panel.querySelectorAll(".sm-panel-list[data-numbering] .sm-panel-item"));
  };

  StaggeredMenu.prototype.buildOpenTimeline = function () {
    var gsap = window.gsap;
    if (!gsap || !this.panel) return null;
    if (this.openTl) this.openTl.kill();
    if (this.closeTween) {
      this.closeTween.kill();
      this.closeTween = null;
    }

    var itemEls = this._itemEls();
    var numberEls = this._numberEls();
    var layers = this.layers;
    var offscreen = this.offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { "--sm-num-opacity": 0 });

    this._park(layers.concat([this.panel]));
    var tl = gsap.timeline({ paused: true });
    layers.forEach(function (el, i) {
      tl.fromTo(
        el,
        { x: 0, xPercent: offscreen },
        { x: 0, xPercent: 0, duration: 0.5, ease: "power4.out" },
        i * 0.07
      );
    });
    var lastTime = layers.length ? (layers.length - 1) * 0.07 : 0;
    var panelInsertTime = lastTime + (layers.length ? 0.08 : 0);
    var panelDuration = 0.65;
    tl.fromTo(
      this.panel,
      { x: 0, xPercent: offscreen },
      { x: 0, xPercent: 0, duration: panelDuration, ease: "power4.out" },
      panelInsertTime
    );
    if (itemEls.length) {
      var itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: "power4.out",
          stagger: { each: 0.1, from: "start" }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: "power2.out",
            "--sm-num-opacity": 1,
            stagger: { each: 0.08, from: "start" }
          },
          itemsStart + 0.1
        );
      }
    }
    this.openTl = tl;
    return tl;
  };

  StaggeredMenu.prototype.playOpen = function () {
    var self = this;
    if (this.busy) return;
    this.busy = true;
    var tl = this.buildOpenTimeline();
    if (tl) {
      tl.eventCallback("onComplete", function () {
        self.busy = false;
      });
      tl.play(0);
    } else {
      this.busy = false;
    }
  };

  StaggeredMenu.prototype.playClose = function () {
    var gsap = window.gsap;
    var self = this;
    if (this.openTl) {
      this.openTl.kill();
      this.openTl = null;
    }
    if (!gsap || !this.panel) return;
    var all = this.layers.concat([this.panel]);
    if (this.closeTween) this.closeTween.kill();
    this.closeTween = gsap.to(all, {
      x: 0,
      xPercent: this.offscreen,
      duration: 0.32,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: function () {
        var itemEls = self._itemEls();
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        var numberEls = self._numberEls();
        if (numberEls.length) gsap.set(numberEls, { "--sm-num-opacity": 0 });
        self.busy = false;
      }
    });
  };

  StaggeredMenu.prototype.animateIcon = function (opening) {
    var gsap = window.gsap;
    if (!gsap || !this.icon) return;
    if (this.spinTween) this.spinTween.kill();
    this.spinTween = gsap.to(this.icon, {
      rotate: opening ? 225 : 0,
      duration: opening ? 0.8 : 0.35,
      ease: opening ? "power4.out" : "power3.inOut",
      overwrite: "auto"
    });
  };

  StaggeredMenu.prototype.animateColor = function (opening) {
    var gsap = window.gsap;
    if (!gsap || !this.toggleBtn) return;
    if (this.colorTween) this.colorTween.kill();
    this.colorTween = gsap.to(this.toggleBtn, {
      color: opening ? this.openMenuButtonColor : this.menuButtonColor,
      delay: 0.18,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  StaggeredMenu.prototype.animateText = function (opening) {
    var gsap = window.gsap;
    var inner = this.textInner;
    if (!gsap || !inner) return;
    if (this.textTween) this.textTween.kill();
    var currentLabel = opening ? "Menu" : "Close";
    var targetLabel = opening ? "Close" : "Menu";
    var seq = [currentLabel];
    var last = currentLabel;
    var i;
    for (i = 0; i < 3; i++) {
      last = last === "Menu" ? "Close" : "Menu";
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    inner.innerHTML = seq
      .map(function (line) {
        return '<span class="sm-toggle-line">' + line + "</span>";
      })
      .join("");
    gsap.set(inner, { yPercent: 0 });
    var finalShift = ((seq.length - 1) / seq.length) * 100;
    this.textTween = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + seq.length * 0.07,
      ease: "power4.out"
    });
  };

  StaggeredMenu.prototype.toggle = function () {
    if (this.open) this.close();
    else this.openMenu();
  };

  StaggeredMenu.prototype.openMenu = function () {
    if (this.open) return;
    this.open = true;
    this.openedAt = Date.now();
    this.root.setAttribute("data-open", "true");
    this.toggleBtn.setAttribute("aria-expanded", "true");
    this.toggleBtn.setAttribute("aria-label", "Close menu");
    this.panel.setAttribute("aria-hidden", "false");
    this.playOpen();
    this.animateIcon(true);
    this.animateColor(true);
    this.animateText(true);
  };

  StaggeredMenu.prototype.close = function () {
    if (!this.open) return;
    this.open = false;
    this.root.removeAttribute("data-open");
    this.toggleBtn.setAttribute("aria-expanded", "false");
    this.toggleBtn.setAttribute("aria-label", "Open menu");
    this.panel.setAttribute("aria-hidden", "true");
    this.playClose();
    this.animateIcon(false);
    this.animateColor(false);
    this.animateText(false);
  };

  StaggeredMenu.prototype.selectItem = function (btn) {
    var src = btn.getAttribute("data-image");
    var alt = btn.getAttribute("data-alt") || "";
    if (this.preview && src) {
      this.preview.src = src;
      this.preview.alt = alt;
    }
    Array.prototype.forEach.call(this.panel.querySelectorAll(".sm-panel-item"), function (el) {
      el.classList.toggle("is-active", el === btn);
    });
    this.close();
  };

  document.querySelectorAll("[data-staggered-menu]").forEach(function (root) {
    new StaggeredMenu(root);
  });
})();
