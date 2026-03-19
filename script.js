const STORAGE_KEY = "onoff_dance_studio_reviews_v1";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}

function loadReviews() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReviews(reviews) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function getSelectedRating(form) {
  const checked = form.querySelector('input[name="rating"]:checked');
  return checked ? Number(checked.value) : 0;
}

function setHelp(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
}

function validate(form) {
  const name = form.name.value.trim();
  const classType = form.classType.value;
  const message = form.message.value.trim();
  const rating = getSelectedRating(form);

  let ok = true;

  setHelp(document.getElementById("nameHelp"), "");
  setHelp(document.getElementById("classHelp"), "");
  setHelp(document.getElementById("ratingHelp"), "");
  setHelp(document.getElementById("messageHelp"), "");

  if (name.length < 2) {
    setHelp(document.getElementById("nameHelp"), "Please enter your name (min 2 characters).");
    ok = false;
  }
  if (!classType) {
    setHelp(document.getElementById("classHelp"), "Please select a class.");
    ok = false;
  }
  if (!rating) {
    setHelp(document.getElementById("ratingHelp"), "Please choose a rating.");
    ok = false;
  }
  if (message.length < 8) {
    setHelp(document.getElementById("messageHelp"), "Please write at least 8 characters of feedback.");
    ok = false;
  }

  return {
    ok,
    data: {
      name,
      classType,
      rating,
      message,
    },
  };
}

function renderReviews(reviews) {
  const list = document.getElementById("reviewList");
  const template = document.getElementById("reviewTemplate");
  const count = document.getElementById("reviewCount");
  if (!list || !template) return;

  list.innerHTML = "";

  const total = reviews.length;
  if (count) count.textContent = total ? `${total} review${total === 1 ? "" : "s"}` : "No reviews yet";

  if (!total) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No reviews yet. Be the first to share your experience.";
    list.appendChild(empty);
    return;
  }

  for (const r of reviews) {
    const node = template.content.cloneNode(true);
    const nameEl = node.querySelector(".review-name");
    const metaEl = node.querySelector(".review-meta");
    const starsEl = node.querySelector(".review-stars");
    const msgEl = node.querySelector(".review-message");

    const safeName = escapeHtml(r.name || "Anonymous");
    const safeClass = escapeHtml(r.classType || "Class");
    const safeMsg = escapeHtml(r.message || "");
    const rating = Math.max(1, Math.min(5, Number(r.rating || 0))) || 5;

    if (nameEl) nameEl.innerHTML = safeName;
    if (metaEl) metaEl.textContent = `${safeClass} • ${formatDate(r.createdAt || "")}`;
    if (starsEl) starsEl.textContent = "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);
    if (msgEl) msgEl.innerHTML = safeMsg;

    list.appendChild(node);
  }
}

function wireSmoothAnchors() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.pushState(null, "", href);
  });
}

/** NEW: SMS helpers (opens SMS app with prefilled message) */
function buildSmsHref({ toNumbers, body }) {
  const numbers = (toNumbers || []).map((n) => String(n).replace(/\D/g, "")).filter(Boolean);
  const to = numbers.join(",");
  const encodedBody = encodeURIComponent(body || "");

  // iOS uses `&body=`, most Android browsers accept `?body=`.
  const ua = navigator.userAgent || "";
  const isiOS = /iPhone|iPad|iPod/i.test(ua);
  const sep = isiOS ? "&" : "?";

  return `sms:${to}${sep}body=${encodedBody}`;
}

async function trySendFeedbackSms(review) {
  const toNumbers = ["8870356852", "9941878870"];

  const lines = [
    "Onoff Dance Studio - New Feedback",
    `Name: ${review?.name || ""}`,
    `Class: ${review?.classType || ""}`,
    `Rating: ${review?.rating || ""}/5`,
    `Message: ${review?.message || ""}`,
  ];
  const body = lines.join("\n").trim();

  // Desktop fallback (SMS link won't work reliably)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  if (!isMobile) {
    try {
      await navigator.clipboard.writeText(body);
      alert("Feedback copied. Open Messages and send it to 8870356852, 9941878870.");
    } catch {
      alert(`Copy and send to 8870356852, 9941878870:\n\n${body}`);
    }
    return;
  }

  // Opens SMS composer (user taps Send)
  window.location.href = buildSmsHref({ toNumbers, body });
}

function main() {
  const form = document.getElementById("reviewForm");
  const clearBtn = document.getElementById("clearAllBtn");

  const reviews = loadReviews();
  renderReviews(reviews);
  wireSmoothAnchors();

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const { ok, data } = validate(form);
      if (!ok) return;

      // UPDATED: create newReview, save, then open SMS composer
      const newReview = {
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        ...data,
        createdAt: new Date().toISOString(),
      };

      const next = [newReview, ...loadReviews()].slice(0, 50);

      saveReviews(next);
      renderReviews(next);
      form.reset();

      void trySendFeedbackSms(newReview);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const current = loadReviews();
      if (!current.length) return;
      const ok = confirm("Clear all saved reviews on this device?");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      renderReviews([]);
    });
  }
}

document.addEventListener("DOMContentLoaded", main);