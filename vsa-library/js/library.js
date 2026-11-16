"use strict";
// Tương tác giao diện thư viện; logic ký thật nằm trong 3 module VSign được giữ nguyên.
document.addEventListener("DOMContentLoaded", () => {
  let activeFilter = "all";
  const search = document.getElementById("search");
  const cards = [...document.querySelectorAll(".app-card")];
  const empty = document.getElementById("empty");
  function filterCards() {
    const q = (search?.value || "").trim().toLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const okCategory = activeFilter === "all" || card.dataset.category === activeFilter;
      const okQuery = !q || card.textContent.toLowerCase().includes(q) || (card.dataset.name || "").toLowerCase().includes(q);
      card.hidden = !(okCategory && okQuery);
      if (!card.hidden) shown++;
    });
    if (empty) empty.hidden = shown !== 0;
  }
  document.querySelectorAll(".category").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(x => x.classList.remove("selected"));
    button.classList.add("selected");
    activeFilter = button.dataset.filter || "all";
    filterCards();
  }));
  search?.addEventListener("input", filterCards);
  document.querySelectorAll(".browse-signing").forEach(button => button.addEventListener("click", () => {
    document.getElementById("signing")?.scrollIntoView({behavior:"smooth", block:"center"});
    window.setTimeout(() => document.getElementById("udid")?.focus(), 450);
  }));
  const menu = document.getElementById("menuBtn");
  menu?.addEventListener("click", () => {
    const nav = document.querySelector(".header nav");
    if (nav) nav.classList.toggle("mobile-open");
  });
  document.querySelectorAll(".header nav a").forEach(link => link.addEventListener("click", () => {
    document.querySelector(".header nav")?.classList.remove("mobile-open");
  }));
});
