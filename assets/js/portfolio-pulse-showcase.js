(function () {
  function scalePortfolioPulseShowcases() {
    document.querySelectorAll(".featured-image-wrap--pulse").forEach((wrap) => {
      const showcase = wrap.querySelector(".pp-showcase");
      if (!showcase) return;
      const scale = Math.min(wrap.clientWidth / 920, wrap.clientHeight / 580);
      showcase.style.setProperty("--pp-scale", scale.toFixed(4));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scalePortfolioPulseShowcases);
  } else {
    scalePortfolioPulseShowcases();
  }

  window.addEventListener("resize", scalePortfolioPulseShowcases);
})();
