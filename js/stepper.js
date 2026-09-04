(function () {
  "use strict";

  function setIndicator(btn, status, index) {
    btn.classList.toggle("is-active", status === "active");
    btn.classList.toggle("is-complete", status === "complete");
    btn.classList.toggle("is-inactive", status === "inactive");
    var inner = btn.querySelector(".step-indicator-inner");
    if (!inner) return;
    if (status === "complete") {
      inner.innerHTML = '<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="#f8f8f6" stroke-width="2.4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    } else if (status === "active") {
      inner.innerHTML = '<span class="active-dot"></span>';
    } else {
      inner.textContent = String(index + 1);
    }
  }

  function initStepper(root) {
    var panels = Array.prototype.slice.call(root.querySelectorAll(".step-panel"));
    var indicators = Array.prototype.slice.call(root.querySelectorAll(".step-indicator"));
    var connectors = Array.prototype.slice.call(root.querySelectorAll(".step-connector"));
    var backBtn = root.querySelector(".back-button");
    var nextBtn = root.querySelector(".next-button");
    var footerNav = root.querySelector(".footer-nav");
    var total = panels.length;
    var current = 1;

    function render() {
      panels.forEach(function (panel, i) {
        panel.classList.toggle("is-active", i + 1 === current);
      });
      indicators.forEach(function (btn, i) {
        var step = i + 1;
        var status = current === step ? "active" : current < step ? "inactive" : "complete";
        setIndicator(btn, status, i);
      });
      connectors.forEach(function (line, i) {
        line.classList.toggle("is-complete", current > i + 1);
      });
      if (backBtn) {
        backBtn.classList.toggle("is-hidden", current === 1);
      }
      if (footerNav) {
        footerNav.classList.toggle("is-first", current === 1);
      }
      if (nextBtn) {
        nextBtn.textContent = current === total ? "Complete" : "Next";
      }
    }

    function goTo(step) {
      if (step < 1) return;
      if (step > total) {
        current = 1;
        render();
        return;
      }
      current = step;
      render();
    }

    if (backBtn) {
      backBtn.addEventListener("click", function () {
        if (current > 1) goTo(current - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(current + 1);
      });
    }
    indicators.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        goTo(i + 1);
      });
    });

    render();
  }

  document.querySelectorAll("[data-stepper]").forEach(initStepper);
})();
