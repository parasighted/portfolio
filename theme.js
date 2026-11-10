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
const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function lift() { root.classList.add("is-ready"); }
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
    curtain.style.transition = "none";
    curtain.style.transform = "translateY(100%)";
    root.classList.remove("is-ready");
    void curtain.offsetHeight;
    curtain.style.transition = "transform 0.6s cubic-bezier(.77, 0, .18, 1)";
    curtain.style.transform = "translateY(0)";
    curtain.querySelector("span").style.opacity = "1";
    setTimeout(() => { location.href = a.href; }, 620);
  });

  // coming back with the back button (page restored from cache): lift the curtain again
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) { curtain.removeAttribute("style"); curtain.querySelector("span").removeAttribute("style"); root.classList.add("is-ready"); }
  });
} else if (curtain) {
  curtain.remove();
}
