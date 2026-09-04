/**
 * IconCursor — TextCursor 原生 JS 移植版
 * 在个人简介工具区，鼠标移动时拖尾显示软件图标
 */

(function () {
  "use strict";

  /**
   * @param {HTMLElement} container
   * @param {Object} options
   */
  function IconCursor(container, options) {
    this.container = container;
    this.inner = container.querySelector(".text-cursor-inner");
    this.icons = options.icons || [];
    this.spacing = options.spacing || 80;
    this.followMouseDirection = options.followMouseDirection !== false;
    this.randomFloat = options.randomFloat !== false;
    this.exitDuration = (options.exitDuration || 0.3) * 1000;
    this.removalInterval = options.removalInterval || 20;
    this.maxPoints = options.maxPoints || 10;
    this.trail = [];
    this.idCounter = 0;
    this.iconIndex = 0;
    this.lastMoveTime = Date.now();

    this._onMouseMove = this._onMouseMove.bind(this);
    container.addEventListener("mousemove", this._onMouseMove);

    this._removalTimer = setInterval(function () {
      if (Date.now() - this.lastMoveTime > 100 && this.trail.length > 0) {
        this._removeOldest();
      }
    }.bind(this), this.removalInterval);
  }

  IconCursor.prototype._getNextIcon = function () {
    var icon = this.icons[this.iconIndex % this.icons.length];
    this.iconIndex += 1;
    return icon;
  };

  IconCursor.prototype._createRandomData = function () {
    if (!this.randomFloat) return { randomX: 0, randomY: 0, randomRotate: 0 };
    return {
      randomX: Math.random() * 10 - 5,
      randomY: Math.random() * 10 - 5,
      randomRotate: Math.random() * 10 - 5
    };
  };

  IconCursor.prototype._removeOldest = function () {
    var item = this.trail.shift();
    if (!item) return;

    item.el.classList.remove("is-visible");
    item.el.classList.add("is-exiting");

    setTimeout(function () {
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
    }, this.exitDuration);
  };

  IconCursor.prototype._addPoint = function (x, y, angle) {
    var random = this._createRandomData();
    var iconSrc = this._getNextIcon();
    var el = document.createElement("div");

    el.className = "text-cursor-item";
    if (this.randomFloat) el.classList.add("text-cursor-item--float");

    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.setProperty("--base-rotate", angle + "deg");
    el.style.setProperty("--rx", random.randomX + "px");
    el.style.setProperty("--ry", random.randomY + "px");
    el.style.setProperty("--rr", random.randomRotate + "deg");

    var img = document.createElement("img");
    img.src = iconSrc;
    img.alt = "";
    img.className = "text-cursor-item__img";
    img.draggable = false;
    el.appendChild(img);

    this.inner.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("is-visible");
    });

    this.trail.push({ id: this.idCounter++, el: el });

    while (this.trail.length > this.maxPoints) {
      this._removeOldest();
    }
  };

  IconCursor.prototype._onMouseMove = function (e) {
    var rect = this.container.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    var self = this;

    if (this.trail.length === 0) {
      this._addPoint(mouseX, mouseY, 0);
    } else {
      var last = this.trail[this.trail.length - 1];
      var lastX = parseFloat(last.el.style.left);
      var lastY = parseFloat(last.el.style.top);
      var dx = mouseX - lastX;
      var dy = mouseY - lastY;
      var distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= this.spacing) {
        var rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        var computedAngle = this.followMouseDirection ? rawAngle : 0;
        var steps = Math.floor(distance / this.spacing);

        for (var i = 1; i <= steps; i++) {
          var t = (this.spacing * i) / distance;
          var newX = lastX + dx * t;
          var newY = lastY + dy * t;
          this._addPoint(newX, newY, computedAngle);
        }
      }
    }

    this.lastMoveTime = Date.now();
  };

  /* ---- 初始化：个人简介工具区 ---- */
  var toolsArea = document.getElementById("about-tools-cursor");
  if (toolsArea) {
    new IconCursor(toolsArea, {
      icons: [
        "assets/images/tools/capcut.png",
        "assets/images/tools/procreate.png",
        "assets/images/tools/photoshop.png",
        "assets/images/tools/figma.png",
        "assets/images/tools/cursor.png"
      ],
      spacing: 80,
      followMouseDirection: true,
      randomFloat: true,
      exitDuration: 0.3,
      removalInterval: 20,
      maxPoints: 10
    });
  }
})();
