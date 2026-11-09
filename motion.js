// Scroll reveal + subtle parallax. Everything is skipped for visitors who prefer reduced motion.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Reveal on scroll */
const reveals = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));
}

/* Parallax: images drift slightly inside their frames; the case hero drifts down as you scroll.
   Images are scaled up a little so the drift never reveals an empty edge. */
if (!reduceMotion) {
  const SCALE = 1.1;                       // 5% spare on every side
  const heroImg = document.querySelector(".hero img");
  const frames = [...document.querySelectorAll(".shot__frame:not(.shot__frame--flat) img")];   // --flat: slides shown whole, never zoomed
  frames.forEach((img) => img.classList.add("is-parallax"));
  if (heroImg) heroImg.classList.add("is-parallax");

  // [data-drift="0.1"]: element drifts up slower than the page (max 90px), used for the intro and the glow
  const drifts = [...document.querySelectorAll("[data-drift]")];

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;

    drifts.forEach((el) => {
      const y = Math.min(window.scrollY * parseFloat(el.dataset.drift), 90);
      el.style.translate = `0 ${(-y).toFixed(1)}px`;
    });

    if (heroImg) {
      const h = heroImg.parentElement.offsetHeight;
      const max = h * ((SCALE - 1) / 2);
      const y = Math.min(window.scrollY * 0.15, max);
      heroImg.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${SCALE})`;
    }

    frames.forEach((img) => {
      const frame = img.parentElement;
      const r = frame.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;       // off screen
      const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1 .. 1
      const max = r.height * ((SCALE - 1) / 2);
      const y = Math.max(-max, Math.min(max, progress * max));
      img.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${SCALE})`;
    });
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

/* Thumbnail overlay: built from each card's own title and type, so the markup stays simple. */
document.querySelectorAll(".project:not(.project--soon), .card").forEach((card) => {
  const frame = card.querySelector(".shot__frame");
  const title = card.querySelector("h2, h3");
  const type = card.querySelector("p");
  if (!frame || !title) return;
  const o = document.createElement("div");
  o.className = "thumb-hover";
  o.setAttribute("aria-hidden", "true");
  o.innerHTML = `<span class="thumb-hover__title serif"></span><span class="thumb-hover__type"></span>`;
  o.firstChild.textContent = title.textContent;
  o.lastChild.textContent = type ? type.textContent : "";
  frame.appendChild(o);
});

/* Intro: words rise in one after another. Text is split only when motion is allowed. */
if (!reduceMotion) {
  document.querySelectorAll("[data-split]").forEach((el) => {
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span");
            w.className = "word"; w.setAttribute("aria-hidden", "true");
            w.style.animationDelay = `${((document.documentElement.classList.contains("has-curtain") ? 0.75 : 0.08) + i++ * 0.045).toFixed(2)}s`;
            w.textContent = part;
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("accent")) walk(n);
      });
    };
    walk(el);
  });
}

/* Case tagline marquee: "Odeabank" stays put in the left column; only the tagline loops sideways inside its own column.
   Scrolling speeds it up or reverses it. Static when reduced motion is on. */
(function () {
  const tag = document.querySelector(".case-tagline");
  if (reduceMotion || !tag) return;

  const label = tag.textContent.replace(/\s+/g, " ").trim();
  tag.textContent = "";
  tag.classList.add("is-marquee");
  const sr = document.createElement("span");
  sr.className = "sr-only"; sr.textContent = label;           // real text for screen readers
  const track = document.createElement("span");
  track.className = "tagline-track"; track.setAttribute("aria-hidden", "true");
  tag.append(sr, track);

  const unit = () => {
    const u = document.createElement("span");
    u.className = "tagline-unit";
    const a = document.createElement("span"); a.textContent = label;
    u.append(a);
    return u;
  };
  let unitW = 0;
  function build() {
    track.textContent = "";
    const first = unit(); track.appendChild(first);
    unitW = first.getBoundingClientRect().width;
    const copies = Math.ceil((tag.getBoundingClientRect().width * 2) / Math.max(unitW, 1)) + 1;
    for (let i = 0; i < copies; i++) track.appendChild(unit());
  }
  build();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
  window.addEventListener("resize", build);

  const BASE = 36;                 // px per second, drifting left
  let x = 0, last = performance.now(), lastY = window.scrollY, boost = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const dy = window.scrollY - lastY; lastY = window.scrollY;
    boost = Math.max(-60, Math.min(60, boost * 0.9 + dy * 0.9));
    x -= BASE * dt + boost * 0.25;
    if (unitW > 0) x = ((x % unitW) + unitW) % unitW - unitW;
    track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();


/* Play videos: if a file is missing, show a tidy placeholder instead of a broken player. */
document.querySelectorAll(".shot__frame video").forEach((v) => {
  const frame = v.closest(".shot__frame");
  v.addEventListener("error", () => frame && frame.classList.add("is-missing"), { once: true });
});

/* Silent looping videos: play only while on screen. With reduced motion they stay still, with controls unless they sit inside a link. */
document.querySelectorAll("video[data-autoplay]").forEach((v) => {
  if (reduceMotion || !("IntersectionObserver" in window)) { if (!v.closest("a")) v.controls = true; return; }   // no controls inside a link
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
  }, { threshold: 0.5 }).observe(v);
});

/* Before/after comparison: drag anywhere on the image, or use the arrow keys on the (visually hidden) range input. */
document.querySelectorAll("[data-compare]").forEach((root) => {
  const input = document.createElement("input");
  input.type = "range"; input.min = "0"; input.max = "100"; input.value = "50";
  input.className = "sr-only"; input.setAttribute("aria-label", root.dataset.compareLabel || "Reveal light or dark theme");
  const handle = document.createElement("div");
  handle.className = "compare__handle"; handle.setAttribute("aria-hidden", "true");
  handle.innerHTML = `<span class="compare__knob"><svg viewBox="0 0 28 14" width="28" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2 2 7l5 5M21 2l5 5-5 5"/></svg></span>`;
  root.append(input, handle);

  const set = (pct) => {
    const p = Math.max(0, Math.min(100, pct));
    root.style.setProperty("--pos", `${p}%`);
    input.value = String(Math.round(p));
  };
  const fromEvent = (e) => {
    const r = root.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  let dragging = false;
  root.addEventListener("pointerdown", (e) => {
    dragging = true;
    root.setPointerCapture(e.pointerId);
    root.classList.add("is-dragging");
    fromEvent(e);
  });
  root.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
  const end = () => { dragging = false; root.classList.remove("is-dragging"); };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  input.addEventListener("input", () => set(Number(input.value)));
  set(50);
});

/* Carousels: arrows and counter on top of a native scroll-snap track (swipe and trackpad work as is).
   Slides advance on a timer and loop. The timer waits while the carousel is off screen, hovered or keyboard-focused,
   restarts after any manual move, and never runs for visitors who prefer reduced motion. */
const CAROUSEL_DELAY = 5000;

document.querySelectorAll("[data-carousel]").forEach((root) => {
  const track = root.querySelector(".carousel__track");
  const slides = [...track.children];
  const count = root.querySelector(".carousel__count");
  const [prev, next] = root.querySelectorAll(".carousel__btn");
  const index = () => Math.round(track.scrollLeft / (slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0)));
  let elapsed = 0;
  function sync() {
    const i = Math.max(0, Math.min(slides.length - 1, index()));
    count.textContent = `${i + 1} / ${slides.length}`;
  }
  const go = (d) => {
    const i = (index() + d + slides.length) % slides.length;
    track.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
  };
  const move = (d) => { elapsed = 0; go(d); };
  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  track.addEventListener("pointerdown", () => { elapsed = 0; }, { passive: true });
  // With the custom cursor, clicking the left or right half of an image moves back or forward
  track.addEventListener("click", (e) => {
    const frame = e.target.closest(".shot__frame");
    if (!frame || !document.documentElement.classList.contains("has-cursor")) return;
    const r = frame.getBoundingClientRect();
    move(e.clientX < r.left + r.width / 2 ? -1 : 1);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { move(-1); e.preventDefault(); }
    if (e.key === "ArrowRight") { move(1); e.preventDefault(); }
  });
  window.addEventListener("resize", sync);
  sync();

  if (reduceMotion || slides.length < 2) return;

  let hovered = false, inView = false;
  count.setAttribute("aria-live", "off");     // don't announce every automatic change

  root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovered = true; });
  root.addEventListener("pointerleave", () => { hovered = false; });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.5 }).observe(root);

  const TICK = 250;
  setInterval(() => {
    if (hovered || !inView || document.hidden || root.matches(":focus-visible") || root.querySelector(":focus-visible")) return;
    elapsed += TICK;
    if (elapsed >= CAROUSEL_DELAY) { elapsed = 0; go(1); }
  }, TICK);
});

/* Lightbox: [data-lightbox] opens its image in a full-window popup. Closes with the cross, Esc or a click outside the image.
   A plain fixed layer rather than <dialog>, so the custom cursor can stay above it. */
(() => {
  const triggers = document.querySelectorAll("[data-lightbox]");
  if (!triggers.length) return;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Expanded image");
  box.hidden = true;
  box.innerHTML = `<div class="lightbox__scroll"><img alt=""></div><button class="lightbox__close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>`;
  document.body.appendChild(box);
  const img = box.querySelector("img");
  const closeBtn = box.querySelector(".lightbox__close");
  let opener = null;
  const close = () => {
    if (box.hidden) return;
    box.hidden = true;
    document.documentElement.classList.remove("lightbox-open");
    if (opener) opener.focus({ preventScroll: true });
  };
  triggers.forEach((t) => t.addEventListener("click", () => {
    const source = t.querySelector("img");
    img.src = source.currentSrc || source.src;
    img.alt = source.alt;
    opener = t;
    box.hidden = false;
    box.querySelector(".lightbox__scroll").scrollLeft = 0;
    document.documentElement.classList.add("lightbox-open");
    closeBtn.focus({ preventScroll: true });
  }));
  closeBtn.addEventListener("click", close);
  box.addEventListener("click", (e) => { if (e.target !== img) close(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "Tab") e.preventDefault();   // the cross is the only control
  });
})();

/* Custom cursor: a dot that follows the mouse and shrinks over anything clickable. It says "View project" or "Coming soon" over home tiles,
   and "Previous" or "Next" over carousel images. Its colour follows what's behind it, so it shows on very light and very dark images.
   Touch screens and forced-colours mode keep their normal behaviour. If this script fails, the normal cursor stays. */
(function () {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(forced-colors: active)").matches) return;
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `<span class="cursor__dot"></span><span class="cursor__label serif"></span>`;
  document.body.appendChild(cursor);
  const label = cursor.querySelector(".cursor__label");

  const CLICKABLE = "a, button, input, select, textarea, label, summary, video, [role='button'], .compare";
  const TILE = ".project:not(.project--soon) .shot__frame";
  const SLIDE = "[data-carousel] .shot__frame";
  const SOON = ".project--soon .shot__frame";
  const ZOOM = "[data-lightbox]";
  const FOLLOW = 0.35;          // share of the remaining distance covered each frame
  const LIGHT_LUMINANCE = 0.27; // above this, purple text has more contrast than white
  let x = 0, y = 0, tx = 0, ty = 0, started = false, queued = false;
  const place = () => { cursor.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`; };
  function frame() {
    x += (tx - x) * FOLLOW;
    y += (ty - y) * FOLLOW;
    place();
    requestAnimationFrame(frame);
  }

  // Each image is drawn once to a tiny canvas, so checking what's under the label is cheap
  const SAMPLE = 48;
  const samples = new WeakMap();
  function pixels(img) {
    if (samples.has(img)) return samples.get(img);
    let data = null;
    try {
      const c = document.createElement("canvas");
      c.width = c.height = SAMPLE;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      data = g.getImageData(0, 0, SAMPLE, SAMPLE).data;
    } catch (e) { /* unreadable image: treated as dark */ }
    if (data || img.complete) samples.set(img, data);
    return data;
  }
  function isLightUnder(img, left, right, top, bottom) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    const data = pixels(img);
    if (!data) return false;
    const r = img.parentElement.getBoundingClientRect();
    const scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);   // object-fit: cover
    const shownW = r.width / (img.naturalWidth * scale), shownH = r.height / (img.naturalHeight * scale);
    const toX = (v) => (0.5 + ((v - r.left) / r.width - 0.5) * shownW) * SAMPLE;
    const toY = (v) => (0.5 + ((v - r.top) / r.height - 0.5) * shownH) * SAMPLE;
    const clamp = (v) => Math.max(0, Math.min(SAMPLE - 1, Math.round(v)));
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    let sum = 0, n = 0;
    for (let py = clamp(toY(top)); py <= clamp(toY(bottom)); py++) {
      for (let px = clamp(toX(left)); px <= clamp(toX(right)); px++) {
        const o = (py * SAMPLE + px) * 4;
        sum += 0.2126 * lin(data[o]) + 0.7152 * lin(data[o + 1]) + 0.0722 * lin(data[o + 2]);
        n++;
      }
    }
    return n > 0 && sum / n > LIGHT_LUMINANCE;
  }

  function update() {
    queued = false;
    const el = document.elementFromPoint(tx, ty);
    if (!el) return;
    const slide = el.closest(SLIDE);
    const soon = !slide && el.closest(SOON);
    const tile = !slide && !soon && el.closest(TILE);
    const back = slide && tx < slide.getBoundingClientRect().left + slide.getBoundingClientRect().width / 2;
    const text = slide ? (back ? "Previous" : "Next") : soon ? "Coming soon" : tile ? (tile.closest(".project")?.dataset.cursor || "View project") : el.closest(ZOOM) ? "Expand" : "";
    if (text && label.textContent !== text) label.textContent = text;
    const flipped = slide ? back : tx > window.innerWidth - 190;   // keep labels on screen near the right edge

    // Pick the colour that reads best on what's actually behind the cursor
    let tone = "";                                 // "" = the theme's own colour, over the page itself
    if (tile || el.closest(".more .card")) tone = "dark";   // these sit under a dark layer on hover
    else {
      const compare = el.closest(".compare");
      // The nav floats over images, so look underneath it too
      const under = el.closest(".nav") && document.elementsFromPoint(tx, ty).find((n) => n.closest(".shot__frame, .hero"));
      const host = slide || soon || compare || el.closest(".shot__frame, .hero") || (under && under.closest(".shot__frame, .hero"));
      let img = host && host.querySelector("img");
      if (compare) {                                        // whichever side of the divider the cursor is on
        const r = compare.getBoundingClientRect();
        const split = r.left + r.width * (parseFloat(compare.style.getPropertyValue("--pos")) || 50) / 100;
        img = compare.querySelector(tx < split ? ".compare__top img" : ":scope > img");
      }
      if (img && img.complete && img.naturalWidth) {
        const reach = text ? label.offsetWidth + 34 : 12;
        const leftward = text && flipped;
        const light = isLightUnder(img, leftward ? tx - reach : tx - 12, leftward ? tx + 12 : text ? tx + reach : tx + 12, ty - (text ? 20 : 12), ty + (text ? 20 : 12));
        tone = light ? "light" : "dark";
      }
      else if (host && host.dataset.tone) tone = host.dataset.tone;   // videos: no image to read, so the page says
    }
    cursor.classList.toggle("is-labelled", !!text);
    cursor.classList.toggle("is-soon", !!soon);
    cursor.classList.toggle("is-on-light", tone === "light");
    cursor.classList.toggle("is-on-dark", tone === "dark");
    cursor.classList.toggle("is-small", !text && !!el.closest(CLICKABLE));
    cursor.classList.toggle("is-flipped", flipped);
  }
  const queue = () => { if (started && !queued) { queued = true; requestAnimationFrame(update); } };

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if (!started) {
      started = true; x = tx; y = ty;
      document.documentElement.classList.add("has-cursor");
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    if (reduceMotion) { x = tx; y = ty; place(); }
    cursor.classList.add("is-visible");
    queue();
  }, { passive: true });
  window.addEventListener("scroll", queue, { passive: true, capture: true });   // the page or a carousel moved under the mouse
  document.documentElement.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
})();
