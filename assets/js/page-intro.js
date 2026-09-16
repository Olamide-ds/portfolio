(() => {
  if (window.__OLA_PAGE_INTRO__) return;
  window.__OLA_PAGE_INTRO__ = true;

  const STORAGE_KEY = "ola-intro-seen-v3";
  const forceIntro = new URLSearchParams(window.location.search).has("intro");
  const intro = document.getElementById("olaIntro");
  const textElement = document.getElementById("olaIntroText");
  const introActions = intro?.querySelector(".ola-intro-actions");
  const soundButton = intro?.querySelector(".intro-start-sound");
  const quietButton = intro?.querySelector(".intro-start-quiet");

  if (!intro || !textElement) return;
  document.body.classList.add("site-entering");
  textElement.textContent = "";

  const phrases = [
    "I spot the real problem.",
    "I shape the product.",
    "Then I build it.",
  ];

  const finishIntro = () => {
    intro.classList.add("is-gone");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.remove("site-entering");
    document.body.classList.add("site-ready");
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // The intro can still run when storage is unavailable.
    }
  };

  let alreadySeen = false;
  try {
    alreadySeen = Boolean(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    alreadySeen = false;
  }

  if (alreadySeen && !forceIntro) {
    finishIntro();
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion) {
    textElement.textContent = phrases.join(" ");
    introActions?.classList.add("is-hidden");
    intro.classList.add("is-approaching", "is-inside", "is-typing");
    window.setTimeout(finishIntro, 900);
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let soundEnabled = false;

  const prepareAudio = async () => {
    try {
      audioContext = audioContext || (AudioContext ? new AudioContext() : null);
      await audioContext?.resume();
      soundEnabled = audioContext?.state === "running";
    } catch {
      soundEnabled = false;
    }
  };

  const playKeystroke = (character) => {
    if (
      !soundEnabled ||
      !audioContext ||
      audioContext.state !== "running" ||
      character === " "
    ) {
      return;
    }

    const duration = character === "." ? 0.055 : 0.028;
    const sampleCount = Math.ceil(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      const envelope = 1 - index / sampleCount;
      samples[index] = (Math.random() * 2 - 1) * envelope;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = character === "." ? 420 : 950 + Math.random() * 260;
    filter.Q.value = 0.8;

    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(character === "." ? 0.045 : 0.032, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(now);
  };

  /* Display waking up: a soft click, then a low hum settling in. */
  const playPowerOn = () => {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;

    const now = audioContext.currentTime;

    const clickDuration = 0.05;
    const clickSamples = Math.ceil(audioContext.sampleRate * clickDuration);
    const clickBuffer = audioContext.createBuffer(1, clickSamples, audioContext.sampleRate);
    const clickData = clickBuffer.getChannelData(0);

    for (let index = 0; index < clickSamples; index += 1) {
      clickData[index] = (Math.random() * 2 - 1) * (1 - index / clickSamples);
    }

    const click = audioContext.createBufferSource();
    const clickFilter = audioContext.createBiquadFilter();
    const clickGain = audioContext.createGain();

    click.buffer = clickBuffer;
    clickFilter.type = "bandpass";
    clickFilter.frequency.value = 1600;
    clickGain.gain.setValueAtTime(0.05, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + clickDuration);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(audioContext.destination);
    click.start(now);

    const humDuration = 1.1;
    const hum = audioContext.createOscillator();
    const humGain = audioContext.createGain();

    hum.type = "sine";
    hum.frequency.setValueAtTime(58, now);
    hum.frequency.exponentialRampToValueAtTime(96, now + 0.45);
    humGain.gain.setValueAtTime(0.0001, now);
    humGain.gain.exponentialRampToValueAtTime(0.05, now + 0.3);
    humGain.gain.exponentialRampToValueAtTime(0.0001, now + humDuration);

    hum.connect(humGain);
    humGain.connect(audioContext.destination);
    hum.start(now);
    hum.stop(now + humDuration);
  };

  let phraseIndex = 0;
  let started = false;

  /* After the last line, keep walking through the glass into the page. */
  const enterSite = () => {
    intro.classList.add("is-entering");
    window.setTimeout(finishIntro, 880);
  };

  const typePhrase = () => {
    if (phraseIndex >= phrases.length) {
      window.setTimeout(enterSite, 380);
      return;
    }

    const phrase = phrases[phraseIndex];
    let characterIndex = 0;
    textElement.textContent = "";

    const typeCharacter = () => {
      if (characterIndex < phrase.length) {
        const character = phrase[characterIndex];
        textElement.textContent += character;
        playKeystroke(character);
        characterIndex += 1;
        const pause =
          character === " " ? 64 :
          [".", ",", "—"].includes(character) ? 150 :
          48 + Math.random() * 28;
        window.setTimeout(typeCharacter, pause);
        return;
      }

      phraseIndex += 1;
      window.setTimeout(typePhrase, phraseIndex < phrases.length ? 360 : 0);
    };

    typeCharacter();
  };

  const startIntro = async (withSound) => {
    if (started) return;
    started = true;

    soundButton?.setAttribute("disabled", "");
    quietButton?.setAttribute("disabled", "");

    if (withSound) {
      await prepareAudio();
    }

    introActions?.classList.add("is-hidden");
    intro.classList.add("is-approaching");
    playPowerOn();

    window.setTimeout(() => {
      intro.classList.add("is-inside");
    }, 720);

    window.setTimeout(() => {
      intro.classList.add("is-typing");
      typePhrase();
    }, 1080);
  };

  soundButton?.addEventListener("click", () => startIntro(true));
  quietButton?.addEventListener("click", () => startIntro(false));

  soundButton?.focus();
})();
