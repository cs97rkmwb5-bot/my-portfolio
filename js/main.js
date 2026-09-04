/**
 * 金秋竹 · 国风动画 AIGC 设计作品集
 * 交互：锚点导航、滚动高亮、图片放大、邮箱复制
 */

(function () {
  "use strict";

  /* ---- DOM 引用 ---- */
  const navLinks = document.querySelectorAll(".site-nav__link");
  const sections = document.querySelectorAll("section[id]");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const videoLightbox = document.getElementById("video-lightbox");
  const lightboxVideo = document.getElementById("lightbox-video");
  const zoomImages = document.querySelectorAll(".img-zoom");
  const videoPlayTriggers = document.querySelectorAll(".video-play");
  const copyEmailBtn = document.getElementById("copy-email");

  /* ---- 平滑锚点跳转（补偿固定导航高度） ---- */
  const NAV_OFFSET = 88;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const offset = href === "#about" ? 0 : NAV_OFFSET;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  /* ---- 滚动时高亮当前导航项 ---- */
  function updateActiveNav() {
    let current = "";

    sections.forEach(function (section) {
      const sectionTop = section.offsetTop - NAV_OFFSET - 80;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    /* 项目详情屏内滚动时，高亮「项目详情集」 */
    const detailIds = ["project-details", "project-spdb", "project-pantum", "project-scau"];
    if (detailIds.indexOf(current) !== -1) {
      current = "project-details";
    }

    if (!current && window.scrollY < 120) {
      current = "cover";
    }

    navLinks.forEach(function (link) {
      const href = link.getAttribute("href");
      if (href === "#" + current) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

  /* ---- 图片全屏预览 ---- */
  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  window.openImageLightbox = openLightbox;
  window.closeImageLightbox = closeLightbox;

  zoomImages.forEach(function (img) {
    img.addEventListener("click", function (e) {
      e.stopPropagation();
      openLightbox(img.src, img.alt);
    });
  });

  if (lightbox) {
    lightbox.addEventListener("click", closeLightbox);
  }

  /* ---- 视频全屏播放 ---- */
  function openVideoLightbox(src) {
    if (!videoLightbox || !lightboxVideo) return;
    lightboxVideo.src = src;
    videoLightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    lightboxVideo.play().catch(function () {});
  }

  function closeVideoLightbox() {
    if (!videoLightbox || !lightboxVideo) return;
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.load();
    videoLightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function startVideo(btn) {
    const src = btn.dataset.video;
    if (!src) return;

    const inline = btn.classList.contains("video-play--inline")
      ? btn.querySelector("video.video-play__preview")
      : null;
    if (inline) {
      if (btn.classList.contains("is-playing")) return;
      btn.classList.add("is-playing");
      btn.removeAttribute("role");
      btn.removeAttribute("tabindex");
      inline.setAttribute("controls", "controls");
      inline.muted = false;
      const playPromise = inline.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function () {
          openVideoLightbox(src);
        });
      }
      return;
    }

    openVideoLightbox(src);
  }

  videoPlayTriggers.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      startVideo(btn);
    });
    btn.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      startVideo(btn);
    });
  });

  if (videoLightbox) {
    videoLightbox.addEventListener("click", function (e) {
      if (e.target === videoLightbox) closeVideoLightbox();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeLightbox();
      closeVideoLightbox();
      setAvatarOpen(false);
    }
  });

  /* ---- 头像介绍弹窗 ---- */
  var avatarWrap = document.getElementById("avatar-wrap");
  var avatarTrigger = avatarWrap ? avatarWrap.querySelector(".avatar-trigger") : null;
  var avatarCard = document.getElementById("avatar-card");

  function setAvatarOpen(open) {
    if (!avatarWrap || !avatarTrigger || !avatarCard) return;
    avatarWrap.classList.toggle("is-open", open);
    avatarTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    avatarCard.setAttribute("aria-hidden", open ? "false" : "true");
  }

  if (avatarWrap) {
    avatarWrap.addEventListener("mouseenter", function () {
      setAvatarOpen(true);
    });
    avatarWrap.addEventListener("mouseleave", function () {
      setAvatarOpen(false);
    });
  }

  /* ---- 复制邮箱 ---- */
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener("click", function () {
      const email = copyEmailBtn.dataset.email || copyEmailBtn.textContent.trim();

      navigator.clipboard.writeText(email).then(function () {
        copyEmailBtn.classList.add("is-copied");
        const original = copyEmailBtn.innerHTML;
        copyEmailBtn.innerHTML = "Copied ✓";
        setTimeout(function () {
          copyEmailBtn.classList.remove("is-copied");
          copyEmailBtn.innerHTML = original;
        }, 2000);
      }).catch(function () {
        /* 降级：选中文本 */
        const range = document.createRange();
        range.selectNodeContents(copyEmailBtn);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
    });
  }
})();
