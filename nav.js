// Fixed nav: stays transparent (white text) over a case hero, keeps a transparent background and switches to purple text everywhere else.
const nav = document.querySelector(".nav");
const hero = document.querySelector(".hero");

function updateNav() {
  const overHero = hero && hero.getBoundingClientRect().bottom > nav.offsetHeight;
  nav.classList.toggle("nav--light", Boolean(hero) && overHero);
  nav.classList.toggle("is-solid", window.scrollY > 4 && !overHero);
}

updateNav();
window.addEventListener("scroll", updateNav, { passive: true });
window.addEventListener("resize", updateNav);
