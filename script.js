/* ============================================================
   LoveMeter – Love Compatibility Calculator
   All calculations happen locally in the browser.
   ============================================================ */

(function () {
  "use strict";

  // ---------- DOM references ----------
  const form = document.getElementById("love-form");
  const name1Input = document.getElementById("name1");
  const name2Input = document.getElementById("name2");
  const error1 = document.getElementById("error1");
  const error2 = document.getElementById("error2");
  const calcBtn = document.getElementById("calc-btn");
  const result = document.getElementById("result");
  const resultNames = document.getElementById("result-names");
  const scoreEl = document.getElementById("score");
  const ringFill = document.getElementById("ring-fill");
  const verdictEl = document.getElementById("verdict");
  const messageEl = document.getElementById("message");
  const shareBtn = document.getElementById("share-btn");
  const shareText = document.getElementById("share-text");
  const resetBtn = document.getElementById("reset-btn");
  const toast = document.getElementById("toast");
  const confettiCanvas = document.getElementById("confetti");
  const bgHearts = document.querySelector(".bg-hearts");

  const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
  const NAME_PATTERN = /^[\p{L}\p{M}' .-]+$/u;

  // ---------- Verdict tiers ----------
  const TIERS = [
    {
      min: 90,
      verdict: "Soulmates 💍",
      messages: [
        "This is the kind of connection people write songs about. Hold on tight.",
        "The stars aligned for these two. A truly rare match.",
      ],
    },
    {
      min: 75,
      verdict: "A Perfect Match 💞",
      messages: [
        "Strong chemistry and real understanding. This one has serious potential.",
        "You bring out the best in each other. Keep nurturing it.",
      ],
    },
    {
      min: 60,
      verdict: "Great Chemistry 💘",
      messages: [
        "There is a real spark here. A little effort could turn it into something lasting.",
        "Plenty of warmth and attraction. Communication will take this even further.",
      ],
    },
    {
      min: 45,
      verdict: "Promising Start 💗",
      messages: [
        "A solid foundation with room to grow. Give it time and honesty.",
        "Not bad at all. The best relationships are built, not found.",
      ],
    },
    {
      min: 30,
      verdict: "Friends First 💛",
      messages: [
        "A gentle connection. Maybe friendship is where this truly shines.",
        "There is respect here, even if the fireworks are quiet for now.",
      ],
    },
    {
      min: 0,
      verdict: "Opposites Attract? 🤔",
      messages: [
        "Different wavelengths, but opposites have surprised the world before.",
        "The numbers are shy, but hearts have never cared much for math.",
      ],
    },
  ];

  // ---------- Utilities ----------
  function normalize(name) {
    return name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ");
  }

  function titleCase(name) {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  // FNV-1a 32-bit hash – fast, deterministic and well distributed.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  // Seeded pseudo-random generator (mulberry32).
  function seededRandom(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ---------- Core algorithm ----------
  function calculateLove(rawA, rawB) {
    const a = normalize(rawA);
    const b = normalize(rawB);

    // Order-independent pair key so A+B === B+A.
    const pair = [a, b].sort().join("♥");
    const seed = hash(pair);
    const rand = seededRandom(seed);

    // Shared-letter affinity gives the algorithm some "logic" beyond pure randomness.
    const lettersA = new Set(a.replace(/[^a-z]/g, ""));
    const lettersB = new Set(b.replace(/[^a-z]/g, ""));
    let shared = 0;
    lettersA.forEach((ch) => {
      if (lettersB.has(ch)) shared++;
    });
    const union = new Set([...lettersA, ...lettersB]).size || 1;
    const affinity = shared / union; // 0..1

    // Base score: 35..92 driven by the hash, nudged by affinity.
    const base = 35 + rand() * 57;
    let overall = Math.round(clamp(base + affinity * 12, 10, 99));

    // Same name is a fun edge case.
    if (a === b) overall = 100;

    // Sub-scores orbit the overall score so the breakdown feels coherent.
    function sub() {
      const drift = (rand() - 0.5) * 30;
      return Math.round(clamp(overall + drift, 5, 100));
    }

    const breakdown = {
      chemistry: a === b ? 100 : sub(),
      communication: a === b ? 100 : sub(),
      trust: a === b ? 100 : sub(),
      fun: a === b ? 100 : sub(),
    };

    const tier = TIERS.find((t) => overall >= t.min) || TIERS[TIERS.length - 1];
    const message = tier.messages[Math.floor(rand() * tier.messages.length)];

    return { overall, breakdown, verdict: tier.verdict, message };
  }

  // ---------- Validation ----------
  function validate(input, errorEl, label) {
    const value = input.value.trim();
    let msg = "";
    if (!value) {
      msg = `${label} is required.`;
    } else if (value.length < 2) {
      msg = "Please enter at least 2 characters.";
    } else if (!NAME_PATTERN.test(value)) {
      msg = "Names can only contain letters, spaces, apostrophes and hyphens.";
    }
    errorEl.textContent = msg;
    input.classList.toggle("invalid", Boolean(msg));
    return !msg;
  }

  [name1Input, name2Input].forEach((input, i) => {
    input.addEventListener("input", () => {
      if (input.classList.contains("invalid")) {
        validate(input, i === 0 ? error1 : error2, i === 0 ? "Your name" : "Partner's name");
      }
    });
  });

  // ---------- Animations ----------
  function animateNumber(el, to, duration) {
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(to * eased)}%`;
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderResult(nameA, nameB, data) {
    resultNames.innerHTML = `<strong>${escapeHtml(nameA)}</strong> &amp; <strong>${escapeHtml(nameB)}</strong>`;
    verdictEl.textContent = data.verdict;
    messageEl.textContent = data.message;

    result.hidden = false;
    result.style.animation = "none";
    // Force reflow so the fade-in animation restarts.
    void result.offsetWidth;
    result.style.animation = "";

    // Reset meter & bars before animating in.
    ringFill.style.transition = "none";
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;
    document.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.style.transition = "none";
      bar.style.width = "0%";
    });
    void ringFill.getBoundingClientRect();

    requestAnimationFrame(() => {
      ringFill.style.transition = "";
      ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - data.overall / 100);
      animateNumber(scoreEl, data.overall, 1600);

      Object.entries(data.breakdown).forEach(([key, value], index) => {
        const bar = document.querySelector(`.bar-fill[data-key="${key}"]`);
        const label = document.querySelector(`.bar-value[data-value="${key}"]`);
        setTimeout(() => {
          bar.style.transition = "";
          bar.style.width = `${value}%`;
          animateNumber(label, value, 1200);
        }, 150 * index);
      });
    });

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });

    if (data.overall >= 75) {
      launchConfetti();
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  // ---------- Form submit ----------
  let lastResult = null;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const ok1 = validate(name1Input, error1, "Your name");
    const ok2 = validate(name2Input, error2, "Partner's name");
    if (!ok1 || !ok2) {
      (ok1 ? name2Input : name1Input).focus();
      return;
    }

    const nameA = titleCase(name1Input.value);
    const nameB = titleCase(name2Input.value);

    calcBtn.classList.add("loading");
    calcBtn.disabled = true;

    // Short suspense delay makes the reveal feel earned.
    setTimeout(() => {
      const data = calculateLove(nameA, nameB);
      lastResult = { nameA, nameB, ...data };
      renderResult(nameA, nameB, data);
      calcBtn.classList.remove("loading");
      calcBtn.disabled = false;
      updateUrl(nameA, nameB);
    }, 900);
  });

  resetBtn.addEventListener("click", () => {
    result.hidden = true;
    form.reset();
    [error1, error2].forEach((e) => (e.textContent = ""));
    [name1Input, name2Input].forEach((i) => i.classList.remove("invalid"));
    lastResult = null;
    history.replaceState(null, "", location.pathname);
    name1Input.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---------- Share ----------
  shareBtn.addEventListener("click", async () => {
    if (!lastResult) return;
    const { nameA, nameB, overall, verdict } = lastResult;
    const text = `💖 ${nameA} & ${nameB} scored ${overall}% on LoveMeter – ${verdict}`;
    const url = location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: "LoveMeter", text, url });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast("Result copied to clipboard!");
      shareText.textContent = "Copied!";
      setTimeout(() => (shareText.textContent = "Share result"), 2000);
    } catch (err) {
      showToast("Could not copy. Please copy the link manually.");
    }
  });

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  // ---------- Shareable URLs (?a=Name&b=Name) ----------
  function updateUrl(nameA, nameB) {
    const params = new URLSearchParams({ a: nameA, b: nameB });
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }

  function loadFromUrl() {
    const params = new URLSearchParams(location.search);
    const a = params.get("a");
    const b = params.get("b");
    if (a && b) {
      name1Input.value = a;
      name2Input.value = b;
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  }

  // ---------- Floating background hearts ----------
  function buildBackgroundHearts() {
    if (!bgHearts) return;
    const count = window.innerWidth < 720 ? 12 : 22;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.textContent = "♥";
      span.style.setProperty("--left", `${Math.random() * 100}%`);
      span.style.setProperty("--size", `${14 + Math.random() * 30}px`);
      span.style.setProperty("--duration", `${12 + Math.random() * 14}s`);
      span.style.setProperty("--delay", `${-Math.random() * 20}s`);
      frag.appendChild(span);
    }
    bgHearts.appendChild(frag);
  }

  // ---------- Confetti ----------
  function launchConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = confettiCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = window.innerWidth * dpr;
    confettiCanvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#ff5fa2", "#ff8a5c", "#ffd166", "#ffffff", "#ff3d7f"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      heart: Math.random() < 0.3,
    }));

    const start = performance.now();
    const duration = 3200;

    function drawHeart(x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y + size / 4);
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
      ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
      ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
      ctx.closePath();
      ctx.fill();
    }

    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const fade = elapsed > duration - 600 ? (duration - elapsed) / 600 : 1;
      ctx.globalAlpha = Math.max(0, fade);

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.heart) {
          drawHeart(0, 0, p.w * 1.6);
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      });

      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    requestAnimationFrame(frame);
  }

  // ---------- Init ----------
  buildBackgroundHearts();
  loadFromUrl();
})();
