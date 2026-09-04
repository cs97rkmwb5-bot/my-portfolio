/**
 * ClickSpark — vanilla JS port of React Bits ClickSpark
 * Full-page click spark effect
 */
(function () {
  "use strict";

  var config = {
    sparkColor: "#444444",
    sparkSize: 10,
    sparkRadius: 15,
    sparkCount: 8,
    duration: 400,
    easing: "ease-out",
    extraScale: 1.0,
  };

  var canvas = null;
  var ctx = null;
  var sparks = [];
  var animationId = null;

  function easeFunc(t) {
    switch (config.easing) {
      case "linear":
        return t;
      case "ease-in":
        return t * t;
      case "ease-in-out":
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t * (2 - t);
    }
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    var dpr = window.devicePixelRatio || 1;
    var width = window.innerWidth;
    var height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(timestamp) {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    sparks = sparks.filter(function (spark) {
      var elapsed = timestamp - spark.startTime;
      if (elapsed >= config.duration) {
        return false;
      }

      var progress = elapsed / config.duration;
      var eased = easeFunc(progress);
      var distance = eased * config.sparkRadius * config.extraScale;
      var lineLength = config.sparkSize * (1 - eased);

      var x1 = spark.x + distance * Math.cos(spark.angle);
      var y1 = spark.y + distance * Math.sin(spark.angle);
      var x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      var y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      ctx.strokeStyle = config.sparkColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      return true;
    });

    animationId = requestAnimationFrame(draw);
  }

  function handleClick(e) {
    var now = performance.now();
    var i;

    for (i = 0; i < config.sparkCount; i++) {
      sparks.push({
        x: e.clientX,
        y: e.clientY,
        angle: (2 * Math.PI * i) / config.sparkCount,
        startTime: now,
      });
    }
  }

  function init() {
    canvas = document.createElement("canvas");
    canvas.id = "click-spark-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    document.addEventListener("click", handleClick);
    animationId = requestAnimationFrame(draw);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
