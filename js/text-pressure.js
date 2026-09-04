/**
 * TextPressure — 原生 JS 移植（React Bits）
 * 鼠标靠近时，可变字体字重 / 宽度 / 斜体随距离变化
 * Ported from https://codepen.io/JuanFuentes/full/rgXKGQ
 */

(function () {
  "use strict";

  function dist(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getAttr(distance, maxDist, minVal, maxVal) {
    var val = maxVal - Math.abs((maxVal * distance) / maxDist);
    return Math.max(minVal, val + minVal);
  }

  function debounce(func, delay) {
    var timeoutId;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        func.apply(ctx, args);
      }, delay);
    };
  }

  /**
   * @param {HTMLElement} container
   * @param {Object} options
   */
  function TextPressure(container, options) {
    this.container = container;
    this.text = options.text || "Hello!";
    this.fontFamily = options.fontFamily || "Roboto Flex";
    this.width = options.width !== false;
    this.weight = options.weight !== false;
    this.italic = options.italic !== false;
    this.alpha = options.alpha === true;
    this.flex = options.flex !== false;
    this.stroke = options.stroke === true;
    this.scale = options.scale === true;
    this.textColor = options.textColor || "#222222";
    this.strokeColor = options.strokeColor || "#444444";
    this.minFontSize = options.minFontSize || 36;

    this.chars = this.text.split("");
    this.spans = [];
    this.mouse = { x: 0, y: 0 };
    this.cursor = { x: 0, y: 0 };
    this.fontSize = this.minFontSize;
    this.scaleY = 1;
    this.lineHeight = 1;
    this.rafId = null;

    this._build();
    this._bindEvents();
    this._setSize();
    this._animate();
  }

  TextPressure.prototype._build = function () {
    var title = document.createElement("h1");
    var classes = ["text-pressure-title"];

    if (this.flex) classes.push("flex");
    if (this.stroke) classes.push("stroke");

    title.className = classes.join(" ");
    title.style.color = this.textColor;
    title.style.fontFamily = this.fontFamily;
    title.style.fontSize = this.minFontSize + "px";
    title.style.lineHeight = String(this.lineHeight);
    title.style.transform = "scale(1, " + this.scaleY + ")";

    if (this.stroke) {
      title.style.setProperty("--stroke-color", this.strokeColor);
    }

    var self = this;

    this.chars.forEach(function (char) {
      var span = document.createElement("span");
      span.textContent = char;
      span.setAttribute("data-char", char);
      if (!self.stroke) span.style.color = self.textColor;
      title.appendChild(span);
      self.spans.push(span);
    });

    this.container.innerHTML = "";
    this.container.appendChild(title);
    this.title = title;
  };

  TextPressure.prototype._bindEvents = function () {
    var self = this;

    this._onMouseMove = function (e) {
      self.cursor.x = e.clientX;
      self.cursor.y = e.clientY;
    };

    this._onTouchMove = function (e) {
      var t = e.touches[0];
      if (!t) return;
      self.cursor.x = t.clientX;
      self.cursor.y = t.clientY;
    };

    this._onResize = debounce(function () {
      self._setSize();
    }, 100);

    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("touchmove", this._onTouchMove, { passive: true });
    window.addEventListener("resize", this._onResize);

    var rect = this.container.getBoundingClientRect();
    this.mouse.x = rect.left + rect.width / 2;
    this.mouse.y = rect.top + rect.height / 2;
    this.cursor.x = this.mouse.x;
    this.cursor.y = this.mouse.y;
  };

  TextPressure.prototype._setSize = function () {
    var rect = this.container.getBoundingClientRect();
    var containerW = rect.width;
    var containerH = rect.height;
    var charCount = this.chars.length;

    var newFontSize = containerW / (charCount / 2);
    newFontSize = Math.max(newFontSize, this.minFontSize);

    this.fontSize = newFontSize;
    this.scaleY = 1;
    this.lineHeight = 1;

    this.title.style.fontSize = newFontSize + "px";
    this.title.style.lineHeight = "1";
    this.title.style.transform = "scale(1, 1)";

    if (this.scale) {
      var self = this;
      requestAnimationFrame(function () {
        var textRect = self.title.getBoundingClientRect();
        if (textRect.height > 0) {
          var yRatio = containerH / textRect.height;
          self.scaleY = yRatio;
          self.lineHeight = yRatio;
          self.title.style.lineHeight = String(yRatio);
          self.title.style.transform = "scale(1, " + yRatio + ")";
        }
      });
    }
  };

  TextPressure.prototype._animate = function () {
    var self = this;

    function frame() {
      self.mouse.x += (self.cursor.x - self.mouse.x) / 15;
      self.mouse.y += (self.cursor.y - self.mouse.y) / 15;

      if (self.title) {
        var titleRect = self.title.getBoundingClientRect();
        var maxDist = titleRect.width / 2;

        self.spans.forEach(function (span) {
          var rect = span.getBoundingClientRect();
          var charCenter = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2
          };

          var d = dist(self.mouse, charCenter);
          var wdth = self.width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100;
          var wght = self.weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
          /* Roboto Flex 使用 slnt 轴模拟斜体变化 */
          var slntVal = self.italic ? (-getAttr(d, maxDist, 0, 10)).toFixed(1) : 0;
          var alphaVal = self.alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : 1;

          var settings = "'wght' " + wght + ", 'wdth' " + wdth + ", 'slnt' " + slntVal;

          if (span.style.fontVariationSettings !== settings) {
            span.style.fontVariationSettings = settings;
          }

          if (self.alpha) {
            span.style.opacity = alphaVal;
          }
        });
      }

      self.rafId = requestAnimationFrame(frame);
    }

    frame();
  };

  TextPressure.prototype.destroy = function () {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("touchmove", this._onTouchMove);
    window.removeEventListener("resize", this._onResize);
  };

  /* ---- 初始化封面标题 ---- */
  var coverEl = document.getElementById("cover-text-pressure");
  if (coverEl) {
    new TextPressure(coverEl, {
      text: "My Portfolio",
      fontFamily: "Roboto Flex, sans-serif",
      flex: true,
      alpha: false,
      stroke: false,
      width: true,
      weight: true,
      italic: true,
      textColor: "#222222",
      minFontSize: 48
    });
  }
})();
