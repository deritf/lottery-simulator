// assets/js/app/mobile-nav.js

export function initMobileNav() {
  const topbar = document.querySelector(".topbar");
  const toggle = document.getElementById("nav-toggle");
  const overlay = document.getElementById("nav-overlay");
  const nav = document.getElementById("nav-games");

  if (!topbar || !toggle || !overlay || !nav) return;

  const root = document.documentElement;

  let lockedScrollY = 0;

  const setOpenVars = () => {
    const h = nav.scrollHeight || nav.offsetHeight || 0;
    root.style.setProperty("--mobile-nav-open-height", `${h}px`);
  };

  const lockScroll = () => {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;

    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  };

  const unlockScroll = () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";

    window.scrollTo(0, lockedScrollY);
  };

  const close = () => {
    topbar.classList.remove("is-nav-open");
    document.body.classList.remove("is-nav-open");
    root.classList.remove("is-nav-open");

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
    overlay.hidden = true;

    root.style.setProperty("--mobile-nav-open-height", "0px");

    unlockScroll();
  };

  const open = () => {
    topbar.classList.add("is-nav-open");
    document.body.classList.add("is-nav-open");
    root.classList.add("is-nav-open");

    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
    overlay.hidden = false;

    lockScroll();

    requestAnimationFrame(() => {
      setOpenVars();
      requestAnimationFrame(() => setOpenVars());
    });
  };

  toggle.addEventListener("click", () => {
    const isOpen = topbar.classList.contains("is-nav-open");
    isOpen ? close() : open();
  });

  overlay.addEventListener("click", close);

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-games__item");
    if (btn) {
      setTimeout(close, 150);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && topbar.classList.contains("is-nav-open")) {
      close();
    }
  });

  const mq = window.matchMedia("(min-width: 901px)");
  const handleMediaChange = (ev) => {
    if (ev.matches && topbar.classList.contains("is-nav-open")) {
      close();
    }
  };

  if (mq.addEventListener) {
    mq.addEventListener("change", handleMediaChange);
  } else if (mq.addListener) {
    mq.addListener(handleMediaChange);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    if (topbar.classList.contains("is-nav-open")) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        requestAnimationFrame(() => setOpenVars());
      }, 100);
    }
  });

  close();
}
