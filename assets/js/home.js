document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const progressBar = document.querySelector(".scroll-progress span");
  let scrollFrame = null;

  const updateScrollProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    if (progressBar) {
      progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    }
    scrollFrame = null;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollProgress);
    },
    { passive: true }
  );
  updateScrollProgress();

  if (!reducedMotion) {
    const sparkColors = ["#dc6046", "#7368df", "#5271e8", "#82b697", "#e7b557"];
    let lastSparkAt = 0;

    window.addEventListener(
      "pointermove",
      (event) => {
        const now = performance.now();
        if (event.pointerType === "touch" || now - lastSparkAt < 70) return;
        lastSparkAt = now;

        const spark = document.createElement("span");
        spark.className = "cursor-spark";
        spark.style.left = `${event.clientX}px`;
        spark.style.top = `${event.clientY}px`;
        spark.style.background =
          sparkColors[Math.floor(Math.random() * sparkColors.length)];
        document.body.appendChild(spark);
        spark.addEventListener("animationend", () => spark.remove(), { once: true });
      },
      { passive: true }
    );
  }

  const photoFilters = document.querySelectorAll(".photo-filter");
  const travelPhotos = document.querySelectorAll(".travel-photo");

  photoFilters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      photoFilters.forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      travelPhotos.forEach((photo) => {
        const location = photo.dataset.location;
        const show = filter === "all" || location === filter;
        photo.classList.toggle("photo-hidden", !show);
      });
    });
  });

  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((element) => revealObserver.observe(element));

  const heroVisual = document.querySelector(".hero-visual");
  const profileCircle = document.querySelector(".profile-circle-new");
  const orbitOne = document.querySelector(".orbit-one");
  const orbitTwo = document.querySelector(".orbit-two");
  const floatingIcons = document.querySelectorAll(".love-chip");

  if (
    heroVisual &&
    !reducedMotion
  ) {
    heroVisual.addEventListener("mousemove", (event) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      if (profileCircle) {
        profileCircle.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
      }
      if (orbitOne) {
        orbitOne.style.transform = `translate(${x * -8}px, ${y * -8}px)`;
      }
      if (orbitTwo) {
        orbitTwo.style.transform = `translate(${x * -14}px, ${y * -14}px)`;
      }

      floatingIcons.forEach((icon, index) => {
        const strength = 10 + index * 3;
        icon.style.setProperty("--mx", `${x * strength}px`);
        icon.style.setProperty("--my", `${y * strength}px`);
      });
    });

    heroVisual.addEventListener("mouseleave", () => {
      if (profileCircle) profileCircle.style.transform = "";
      if (orbitOne) orbitOne.style.transform = "";
      if (orbitTwo) orbitTwo.style.transform = "";
      floatingIcons.forEach((icon) => {
        icon.style.setProperty("--mx", "0px");
        icon.style.setProperty("--my", "0px");
      });
    });
  }

  const lightbox = document.getElementById("photoLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxLocation = document.getElementById("lightboxLocation");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const closeButton = document.querySelector(".lightbox-close");
  const prevButton = document.querySelector(".lightbox-prev");
  const nextButton = document.querySelector(".lightbox-next");

  let currentPhotoIndex = 0;
  let lightboxTrigger = null;

  function getVisiblePhotos() {
    return Array.from(travelPhotos).filter(
      (photo) => !photo.classList.contains("photo-hidden")
    );
  }

  function showPhoto(index) {
    const visiblePhotos = getVisiblePhotos();
    if (!visiblePhotos.length || !lightboxImage) return;

    if (index < 0) index = visiblePhotos.length - 1;
    if (index >= visiblePhotos.length) index = 0;

    currentPhotoIndex = index;
    const selectedPhoto = visiblePhotos[index];
    const image = selectedPhoto.querySelector("img");
    const title = selectedPhoto.querySelector("h3");
    const caption = selectedPhoto.querySelector("figcaption");

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;

    if (lightboxLocation) {
      lightboxLocation.textContent = title ? title.textContent : "";
    }
    if (lightboxCaption) {
      lightboxCaption.textContent = caption ? caption.textContent : "";
    }
  }

  function openLightbox(photo) {
    if (!lightbox) return;

    const visiblePhotos = getVisiblePhotos();
    currentPhotoIndex = visiblePhotos.indexOf(photo);
    lightboxTrigger = photo;
    showPhoto(currentPhotoIndex);

    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeButton?.focus();
  }

  travelPhotos.forEach((photo) => {
    photo.addEventListener("click", () => openLightbox(photo));
    photo.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(photo);
      }
    });
  });

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    lightboxTrigger?.focus();
  }

  closeButton?.addEventListener("click", closeLightbox);
  prevButton?.addEventListener("click", () => showPhoto(currentPhotoIndex - 1));
  nextButton?.addEventListener("click", () => showPhoto(currentPhotoIndex + 1));

  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox?.classList.contains("open")) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showPhoto(currentPhotoIndex - 1);
    if (event.key === "ArrowRight") showPhoto(currentPhotoIndex + 1);

    if (event.key === "Tab") {
      const controls = [closeButton, prevButton, nextButton].filter(Boolean);
      const currentIndex = controls.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + controls.length) % controls.length;
      event.preventDefault();
      controls[nextIndex].focus();
    }
  });

  const LASTFM_API_KEY = "3ae8552b3253e17384123295925b43ed";
  const LASTFM_USERNAME = "Truemide";
  const trackGrid = document.getElementById("trackGrid");
  const musicStatusText = document.getElementById("musicStatusText");

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  async function loadRecentTracks() {
    if (!trackGrid) return;

    try {
      const endpoint =
        "https://ws.audioscrobbler.com/2.0/" +
        "?method=user.getrecenttracks" +
        `&user=${encodeURIComponent(LASTFM_USERNAME)}` +
        `&api_key=${encodeURIComponent(LASTFM_API_KEY)}` +
        "&format=json" +
        "&limit=6";

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Could not load Last.fm data");

      const data = await response.json();
      const tracks = [].concat(data?.recenttracks?.track || []).slice(0, 6);
      if (!tracks.length) throw new Error("No recent tracks");

      const anyLive = tracks.some((track) => track["@attr"]?.nowplaying === "true");
      if (musicStatusText) {
        musicStatusText.textContent = anyLive ? "Listening now" : "Recently played";
      }

      trackGrid.innerHTML = tracks
        .map((track) => {
          const live = track["@attr"]?.nowplaying === "true";
          const name = track.name || "Unknown track";
          const artist = track.artist?.["#text"] || "Unknown artist";
          const artwork =
            track.image?.find((image) => image.size === "extralarge")?.["#text"] ||
            track.image?.find((image) => image.size === "large")?.["#text"] ||
            "";
          const href =
            "https://music.apple.com/us/search?term=" +
            encodeURIComponent(`${name} ${artist}`);

          return `
            <a class="track-card${live ? " is-live" : ""}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
              <img src="${escapeHtml(artwork)}" alt="" />
              <div>
                <h3>${escapeHtml(name)}</h3>
                <p>${escapeHtml(artist)}</p>
                <span>${live ? "Playing now" : "Open in Apple Music"}</span>
              </div>
            </a>
          `;
        })
        .join("");
    } catch (error) {
      console.error("Last.fm error:", error);
      if (musicStatusText) musicStatusText.textContent = "Music unavailable right now";
      trackGrid.innerHTML =
        '<p class="listening-status">Couldn’t load tracks. Check back in a minute.</p>';
    }
  }

  loadRecentTracks();
  window.setInterval(loadRecentTracks, 60000);

  const stage = document.getElementById("gameStage");
  const timeEl = document.getElementById("gameTime");
  const scoreEl = document.getElementById("gameScore");
  const feedbackEl = document.getElementById("gameFeedback");
  const startBtn = document.getElementById("gameStart");
  const againBtn = document.getElementById("gameAgain");
  const coffee = "☕";
  const decoys = ["🎧", "⚽", "✨", "📦", "🌙", "📎"];
  let score = 0;
  let remaining = 20;
  let playing = false;
  let spawnTimer = null;
  let clockTimer = null;

  const formatTime = (value) => `0:${String(value).padStart(2, "0")}`;

  const clearBits = () => {
    stage?.querySelectorAll(".game-bit").forEach((bit) => bit.remove());
  };

  const stopGame = (message) => {
    playing = false;
    window.clearInterval(spawnTimer);
    window.clearInterval(clockTimer);
    if (feedbackEl) feedbackEl.textContent = message;
    if (startBtn) startBtn.hidden = true;
    if (againBtn) againBtn.hidden = false;
  };

  const spawnBit = () => {
    if (!playing || !stage) return;

    const bit = document.createElement("button");
    bit.type = "button";
    bit.className = "game-bit";
    bit.textContent = Math.random() < 0.42
      ? coffee
      : decoys[Math.floor(Math.random() * decoys.length)];
    bit.style.left = `${8 + Math.random() * 78}%`;
    bit.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    bit.addEventListener("click", (event) => {
      event.preventDefault();
      if (!playing || bit.classList.contains("is-caught")) return;
      bit.classList.add("is-caught");
      if (bit.textContent === coffee) {
        score += 1;
        if (feedbackEl) feedbackEl.textContent = "Nice catch.";
      } else {
        score = Math.max(0, score - 1);
        if (feedbackEl) feedbackEl.textContent = "Not coffee.";
      }
      if (scoreEl) scoreEl.textContent = `${score} cup${score === 1 ? "" : "s"}`;
      window.setTimeout(() => bit.remove(), 180);
    });
    bit.addEventListener("animationend", () => {
      if (!bit.classList.contains("is-caught")) bit.remove();
    });
    stage.appendChild(bit);
  };

  const startGame = () => {
    score = 0;
    remaining = 20;
    playing = true;
    clearBits();
    if (scoreEl) scoreEl.textContent = "0 cups";
    if (timeEl) timeEl.textContent = formatTime(remaining);
    if (feedbackEl) feedbackEl.textContent = "Cups only.";
    if (startBtn) startBtn.hidden = true;
    if (againBtn) againBtn.hidden = true;
    spawnBit();
    spawnTimer = window.setInterval(spawnBit, 650);
    clockTimer = window.setInterval(() => {
      remaining -= 1;
      if (timeEl) timeEl.textContent = formatTime(remaining);
      if (remaining <= 0) {
        stopGame(
          score >= 8
            ? "You kept the studio caffeinated."
            : "Warm-up round. Try again."
        );
      }
    }, 1000);
  };

  startBtn?.addEventListener("click", startGame);
  againBtn?.addEventListener("click", startGame);
});

