/* About page: hovering the name brings up a round photo that follows the mouse and flips like a coin,
   showing the next photo on each turn. On touch screens a tap on the name shows it beside the name.
   Reduced motion: the photo fades in without flipping. */
(function () {
  const name = document.querySelector("[data-photo-coin]");
  if (!name) return;
  const faces = name.dataset.faces.split(",").map((f) => f.trim()).filter(Boolean);
  if (!faces.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  faces.forEach((src) => { new Image().src = src; });           // preload so flips never show a blank side

  const coin = document.createElement("div");
  coin.className = "photo-coin";
  coin.setAttribute("aria-hidden", "true");
  coin.innerHTML = `<div class="photo-coin__body"><span class="photo-coin__face"></span><span class="photo-coin__face photo-coin__face--back"></span></div>`;
  document.body.appendChild(coin);
  const body = coin.querySelector(".photo-coin__body");
  const [front, back] = coin.querySelectorAll(".photo-coin__face");
  const img = (el, i) => { el.style.backgroundImage = `url("${faces[i % faces.length]}")`; };

  const FLIP_MS = 1100;       // time between flips
  let shown = 0, angle = 0, timer = null, open = false;
  img(front, 0); img(back, 1);

  // load the next photo onto whichever side is facing away
  const prepNext = () => img(shown % 2 === 0 ? back : front, shown + 1);
  function flip() {
    angle += 180; shown++;
    body.style.transform = `rotateY(${angle}deg)`;
    setTimeout(prepNext, 750);
  }

  // follow the mouse with a little lag
  let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
  const size = () => coin.offsetWidth;
  function place() {
    const s = size(), gap = 28;
    let tx = x + gap, ty = y - s - gap / 2;                       // up and to the right of the pointer
    if (tx + s > window.innerWidth - 12) tx = x - s - gap;
    if (ty < 12) ty = y + gap;
    cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
    coin.style.translate = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
    if (open) raf = requestAnimationFrame(place);
  }

  function show() {
    if (open) return;
    open = true;
    if (!reduce) {
      angle += 360;                                               // spin in like a tossed coin
      body.style.transform = `rotateY(${angle}deg)`;
      timer = setInterval(flip, FLIP_MS);
    }
    coin.classList.add("is-open");
    cancelAnimationFrame(raf); raf = requestAnimationFrame(place);
  }
  function hide() {
    if (!open) return;
    open = false;
    clearInterval(timer);
    coin.classList.remove("is-open");
    if (reduce) { shown++; img(front, shown); }                  // a different photo next time
  }

  if (mouse) {
    name.addEventListener("pointerenter", (e) => {
      x = e.clientX; y = e.clientY;
      if (!open) { const s = size(); cx = x + 28; cy = y - s - 14; }   // start at the pointer, not where it last was
      show();
    });
    name.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
    name.addEventListener("pointerleave", hide);
  } else {
    // touch: tap the name to show it above the name, tap anywhere else or scroll to put it away
    const atName = () => {
      const r = name.getBoundingClientRect(), s = size();
      x = Math.min(r.left + r.width / 2, window.innerWidth - s / 2 - 40); y = r.top;
      cx = x + 28; cy = y - s - 14;
    };
    name.addEventListener("click", (e) => { e.stopPropagation(); if (open) hide(); else { atName(); show(); } });
    document.addEventListener("click", hide);
    window.addEventListener("scroll", hide, { passive: true });
  }
})();
