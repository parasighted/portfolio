/* Password screen for protected case pages (STC, Norwegian Public Roads, Odeabank).
   A page opts in with <html data-lock>; the inline head script adds .is-locked before paint.
   One correct password unlocks every protected page on this device.
   This only hides the page in the browser: the HTML and images are still public. */
(function () {
  const root = document.documentElement;
  if (!root.classList.contains("is-locked")) return;

  const HASH = "1c10c7b65f519db057a9e76425c227fdde6779fd9e2231e492382468cab94033";
  const KEY = "case-access";
  const title = document.querySelector(".case-title")?.textContent.trim() || "This project";

  const gate = document.createElement("div");
  gate.className = "lock";
  gate.innerHTML = `
    <div class="lock__inner">
      <p class="lock__label">Password protected</p>
      <h1 class="lock__title serif">${title}</h1>
      <p class="lock__text">Enter the password to view this case study, or <a href="about.html">get in touch</a> for access.</p>
      <form class="lock__form" novalidate>
        <label class="lock__field">
          <span class="sr-only">Password</span>
          <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
        </label>
        <button type="submit" class="lock__submit">Unlock <span aria-hidden="true">→</span></button>
      </form>
      <p class="lock__error" role="alert" aria-live="assertive"></p>
      <a class="lock__back" href="index.html#work"><span aria-hidden="true">←</span> Back to work</a>
    </div>`;
  (document.querySelector(".page") || document.body).prepend(gate);   // inside .page so it shares the nav's stacking context

  const form = gate.querySelector("form");
  const input = gate.querySelector("input");
  const error = gate.querySelector(".lock__error");
  const page = document.querySelector(".page");
  // keep the hidden case out of the tab order and screen readers, but leave the nav usable
  const hidden = page ? [...page.children].filter((el) => el !== gate && !el.classList.contains("nav")) : [];
  hidden.forEach((el) => (el.inert = true));

  const sha256 = async (text) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  function unlock() {
    hidden.forEach((el) => (el.inert = false));
    gate.classList.add("is-leaving");
    root.classList.remove("is-locked");
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event("scroll"));        // nav.js re-checks its colour over the hero
    setTimeout(() => gate.remove(), 700);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) { input.focus(); return; }
    if ((await sha256(value)) === HASH) {
      try { localStorage.setItem(KEY, HASH); } catch (err) {}
      unlock();
    } else {
      error.textContent = "That password isn’t right. Try again.";
      form.classList.remove("is-wrong");
      void form.offsetWidth;
      form.classList.add("is-wrong");
      input.select();
    }
  });
  input.addEventListener("input", () => { error.textContent = ""; });

  // focus once the curtain has lifted
  setTimeout(() => input.focus({ preventScroll: true }), root.classList.contains("has-curtain") ? 900 : 0);
})();
