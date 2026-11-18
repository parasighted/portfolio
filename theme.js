// Dark mode toggle + page curtain transition.
const root = document.documentElement;

/* ---- Theme ---- */
const toggle = document.querySelector(".theme-toggle");
function syncToggle() {
  const dark = root.dataset.theme === "dark";
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}
syncToggle();
if (toggle) toggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.classList.add("theme-anim");                 // fade colours instead of snapping
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
  syncToggle();
  setTimeout(() => root.classList.remove("theme-anim"), 600);
});

/* ---- Page curtain ---- */
const curtain = document.querySelector(".page-curtain");
const bands = curtain ? [...curtain.querySelectorAll("i")] : [];
const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// once lifted, take the curtain out of the layout: iPhone Safari tints its toolbars from fixed layers at the screen edge
let hideTimer;
function hideCurtain() { clearTimeout(hideTimer); hideTimer = setTimeout(() => { curtain.style.display = "none"; }, 800); }
function lift() { root.classList.add("is-ready"); if (curtain) hideCurtain(); }
if (curtain && !noMotion) {
  // lift once the page is ready (or after 1.2s at the latest)
  const ready = new Promise((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", r, { once: true })));
  Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(() => requestAnimationFrame(lift));

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;                          // external links go straight through
    if (url.pathname === location.pathname && url.hash) return;           // in-page anchors
    if (url.href === location.href) return;
    e.preventDefault();
    try { sessionStorage.setItem("curtain", "1"); } catch (err) {}   // only page-to-page visits get the curtain, not the first load
    root.classList.add("has-curtain");
    clearTimeout(hideTimer);
    curtain.style.display = "";
    root.classList.remove("is-ready");
    // bands sweep in from the left, one after another
    bands.forEach((b, i) => {
      b.style.transition = "none";
      b.style.transformOrigin = "left center";
      b.style.transform = "scaleX(0)";
      void b.offsetWidth;
      b.style.transition = `transform 0.5s cubic-bezier(.16, 1, .3, 1) ${i * 0.05}s`;
      b.style.transform = "scaleX(1)";
    });
    setTimeout(() => { location.href = a.href; }, 560);
  });

  // coming back with the back button (page restored from cache): lift the curtain again
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) { curtain.removeAttribute("style"); bands.forEach((b) => b.removeAttribute("style")); lift(); }
  });
} else if (curtain) {
  curtain.remove();
}
