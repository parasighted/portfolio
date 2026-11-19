/* About page desk: drag windows by their title bar, close them, reopen them from the chips, tidy up.
   Wide screens only; narrow screens keep the stacked list. */
(function () {
  const main = document.querySelector(".about-desk");
  const desk = main && main.querySelector(".desk");
  if (!desk) return;
  const wins = [...desk.querySelectorAll(".win")];
  const chipsBox = main.querySelector(".desk-chips");
  const wide = window.matchMedia("(min-width: 821px)");

  // Wide screens: lay the windows out on a stage of a fixed design width and scale the whole stage up,
  // so a big monitor shows the same composition as a laptop, just bigger. Past MAX_K the stage widens instead.
  const DESIGN_W = 1360, MAX_K = 1.9;
  const stage = document.createElement("div");
  stage.className = "desk__stage";
  wins.forEach((win) => stage.appendChild(win));
  desk.appendChild(stage);
  let k = 1;
  const stageW = () => desk.clientWidth / k;               // layout width in stage units
  function rescale() {
    k = Math.min(MAX_K, Math.max(1, desk.clientWidth / DESIGN_W));
    stage.style.width = stageW() + "px";
    stage.style.transform = k === 1 ? "" : `scale(${k})`;
  }

  // Tidy layout: three columns, tops of the first row lined up, each window stacked a dot or so below the one above.
  // `at` places a window across the free space in its row: 0 = left edge, 1 = right edge.
  const columns = [
    [{ id: "me", at: 0 }, { id: "free", at: 0 }, { id: "mentor", at: 0 }],
    [{ id: "what", at: 0.45 }, { id: "moments", at: 0.52 }, { id: "music", at: 0.53 }],
    [{ id: "approach", at: 1, w: 390 }, { id: "background", at: 1, w: 390 }, { id: "contact", at: 1, w: 390 }]
  ];
  const PAD = 26;

  let top = wins.length, deskW = DESIGN_W, live = false, moved = false;
  const pos = {};

  // Chips, one per window
  const chips = {};
  wins.forEach((win) => {
    const id = win.dataset.win;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "desk-chip";
    b.setAttribute("aria-pressed", "true");
    b.innerHTML = `<span class="desk-chip__dot" aria-hidden="true"></span>${win.dataset.label}`;
    b.addEventListener("click", () => setOpen(win, win.hidden));
    chipsBox.appendChild(b);
    chips[id] = b;
  });
  const tidyBtn = document.createElement("button");
  tidyBtn.type = "button";
  tidyBtn.className = "desk-chip desk-chip--tidy";
  tidyBtn.textContent = "Tidy up";
  tidyBtn.addEventListener("click", tidy);
  chipsBox.appendChild(tidyBtn);

  const widthOf = (win) => parseFloat(win.style.width) || win.offsetWidth;
  // The desk's dots sit at the centre of each 26px cell, so window corners land on a dot
  const GRID = 26, DOT = GRID / 2;
  const snap = (v) => Math.round((v - DOT) / GRID) * GRID + DOT;
  const snapIn = (v, min, max) => { let s = snap(v); while (s < min) s += GRID; while (s > max && s - GRID >= min) s -= GRID; return s; };
  const place = (win) => { const p = pos[win.dataset.win]; win.style.left = p.x + "px"; win.style.top = p.y + "px"; };
  const front = (win) => { if (+win.style.zIndex !== top) win.style.zIndex = ++top; };

  const snapUp = (v) => Math.ceil((v - DOT) / GRID) * GRID + DOT;
  const byId = Object.fromEntries(wins.map((win) => [win.dataset.win, win]));

  function layout() {
    rescale();
    const W = stageW();
    columns.forEach((col) => {
      let y = snap(PAD);
      col.forEach(({ id, at, w: slot }) => {
        const win = byId[id]; if (!win) return;
        const w = widthOf(win), span = slot || w;             // the right column lines up on its left edge
        const x = PAD + at * (W - 2 * PAD - span);
        pos[id] = { x: snapIn(x, PAD / 2, W - w - PAD / 2), y };
        place(win);
        y = snapUp(y + win.offsetHeight + GRID);
      });
    });
    wins.forEach((win, i) => { win.style.zIndex = i + 1; });
    top = wins.length;
    deskW = W;
    moved = false;
    fitHeight();
  }

  // Tall enough for the lowest window in the tidy layout
  function fitHeight() {
    let h = 0;
    wins.forEach((win) => { if (!win.hidden) h = Math.max(h, pos[win.dataset.win].y + win.offsetHeight); });
    const stageH = Math.max(h + 60, 600);
    stage.style.height = stageH + "px";
    desk.style.height = stageH * k + "px";
  }

  function setOpen(win, open) {
    win.hidden = !open;
    chips[win.dataset.win].setAttribute("aria-pressed", String(open));
    if (open) {
      win.style.animation = "none"; void win.offsetWidth; win.style.animation = "";
      front(win);
    }
  }

  function tidy() {
    wins.forEach((win) => setOpen(win, true));
    layout();
  }

  function startDrag(win, e) {
    if (!live || e.button !== 0 || e.target.closest("button, a")) return;
    e.preventDefault();
    const id = win.dataset.win, w = widthOf(win);
    const start = { mx: e.clientX, my: e.clientY, x: pos[id].x, y: pos[id].y };
    const W = stageW(), H = desk.clientHeight / k;
    win.classList.add("is-drag");
    const move = (ev) => {
      pos[id] = {                                           // pointer moves in screen pixels, windows in stage units
        x: Math.round(Math.max(-w + 80, Math.min(start.x + (ev.clientX - start.mx) / k, W - 80))),
        y: Math.round(Math.max(0, Math.min(start.y + (ev.clientY - start.my) / k, H - 44)))
      };
      place(win);
    };
    const up = () => {
      win.classList.remove("is-drag");
      moved = true;
      // Settle onto the nearest dot
      const p = pos[id];
      pos[id] = { x: snapIn(p.x, -w + 80, W - 80), y: snapIn(p.y, 0, H - 44) };
      win.classList.add("is-snapping");
      place(win);
      setTimeout(() => win.classList.remove("is-snapping"), 220);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  wins.forEach((win) => {
    win.addEventListener("pointerdown", () => { if (live) front(win); });
    win.querySelector(".win__bar").addEventListener("pointerdown", (e) => startDrag(win, e));
    win.querySelector(".win__btn").addEventListener("click", () => {
      setOpen(win, false);
      chips[win.dataset.win].focus();
    });
  });

  // Photo window: click for the next photo
  const photo = desk.querySelector(".win__photo");
  if (photo) {
    const img = photo.querySelector("img"), num = desk.querySelector("[data-photo-num]");
    const faces = photo.dataset.faces.split(",");
    let i = 0;
    faces.forEach((src) => { new Image().src = src; });
    photo.addEventListener("click", () => {
      i = (i + 1) % faces.length;
      img.src = faces[i];
      if (num) num.textContent = i + 1;
    });
  }

  function setLive(on) {
    live = on;
    main.classList.toggle("is-live", on);
    desk.classList.toggle("is-live", on);
    if (on) layout();
    else {
      desk.style.height = stage.style.height = stage.style.width = stage.style.transform = "";
      k = 1;
      wins.forEach((win) => { win.hidden = false; win.style.left = win.style.top = win.style.zIndex = ""; chips[win.dataset.win].setAttribute("aria-pressed", "true"); });
    }
  }

  // Keep windows in proportion when the desk changes width
  window.addEventListener("resize", () => {
    if (!live) return;
    if (!moved) { layout(); return; }                       // untouched desk: redo the tidy layout
    rescale();
    const W = stageW();
    if (Math.abs(W - deskW) >= 4) {                         // stage width only changes outside the scaling range
      wins.forEach((win) => {
        const p = pos[win.dataset.win], w = widthOf(win);
        p.x = snapIn(p.x * W / deskW, 12, W - w - 12);
        place(win);
      });
      deskW = W;
    }
    fitHeight();
  });

  wide.addEventListener("change", (e) => setLive(e.matches));
  setLive(wide.matches);
  // Fonts and images change window heights, so refit once they're in
  const settle = () => { if (live) (moved ? fitHeight : layout)(); };
  if (document.fonts) document.fonts.ready.then(settle);
  window.addEventListener("load", settle);
})();
