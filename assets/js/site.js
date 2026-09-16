document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const navigation = document.getElementById("siteNav");
  const timeEl = document.getElementById("localTime");

  if (timeEl) {
    const tick = () => {
      timeEl.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Chicago",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
    };

    tick();
    window.setInterval(tick, 30000);
  }

  if (!header || !toggle || !navigation) return;

  const closeMenu = () => {
    header.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  };

  toggle.addEventListener("click", () => {
    const open = !header.classList.contains("nav-open");
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      toggle.focus();
    }
  });

  window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });

  const sectionLinks = [...navigation.querySelectorAll("a[data-section]")];
  const sections = sectionLinks
    .map((link) => document.getElementById(link.dataset.section))
    .filter(Boolean);

  const setActiveLink = (id) => {
    sectionLinks.forEach((link) => {
      const on = link.dataset.section === id;
      link.classList.toggle("is-active", on);
      if (on) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if (sections.length) {
    const updateSpy = () => {
      const marker = Math.min(140, window.innerHeight * 0.28);
      let currentId = sections[0].id;

      sections.forEach((section) => {
        if (section.getBoundingClientRect().top - marker <= 0) {
          currentId = section.id;
        }
      });

      setActiveLink(currentId);
    };

    window.addEventListener("scroll", updateSpy, { passive: true });
    window.addEventListener("resize", updateSpy);
    updateSpy();

    sectionLinks.forEach((link) => {
      link.addEventListener("click", () => {
        setActiveLink(link.dataset.section);
      });
    });
  }
});
