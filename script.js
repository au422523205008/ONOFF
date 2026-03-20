import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "./firebase.js";

/* ------------------ HELPERS ------------------ */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
  try {
    if (!timestamp) return "";
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return "";
  }
}

function getSelectedRating(form) {
  const checked = form.querySelector('input[name="rating"]:checked');
  return checked ? Number(checked.value) : 0;
}

function setHelp(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
}

/* ------------------ VALIDATION ------------------ */

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
    setHelp(document.getElementById("nameHelp"), "Enter at least 2 characters.");
    ok = false;
  }
  if (!classType) {
    setHelp(document.getElementById("classHelp"), "Select a class.");
    ok = false;
  }
  if (!rating) {
    setHelp(document.getElementById("ratingHelp"), "Select rating.");
    ok = false;
  }
  if (message.length < 8) {
    setHelp(document.getElementById("messageHelp"), "Minimum 8 characters.");
    ok = false;
  }

  return {
    ok,
    data: { name, classType, rating, message }
  };
}

/* ------------------ FIREBASE ------------------ */

async function loadReviews() {
  const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function saveReview(review) {
  await addDoc(collection(db, "reviews"), review);
}

/* ------------------ UI RENDER ------------------ */

function renderReviews(reviews) {
  const list = document.getElementById("reviewList");
  const template = document.getElementById("reviewTemplate");
  const count = document.getElementById("reviewCount");

  if (!list || !template) return;

  list.innerHTML = "";

  if (count) {
    count.textContent = reviews.length
      ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}`
      : "No reviews yet";
  }

  if (!reviews.length) {
    list.innerHTML = `<div class="muted">No reviews yet. Be the first!</div>`;
    return;
  }

  for (const r of reviews) {
    const node = template.content.cloneNode(true);

    node.querySelector(".review-name").innerHTML = escapeHtml(r.name || "Anonymous");
    node.querySelector(".review-meta").textContent =
      `${r.classType || "Class"} • ${formatDate(r.createdAt)}`;

    const rating = Math.max(1, Math.min(5, Number(r.rating || 5)));
    node.querySelector(".review-stars").textContent =
      "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);

    node.querySelector(".review-message").innerHTML = escapeHtml(r.message || "");

    list.appendChild(node);
  }
}

/* ------------------ SMS ------------------ */

function buildSmsHref({ toNumbers, body }) {
  const numbers = toNumbers.join(",");
  const encoded = encodeURIComponent(body);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return `sms:${numbers}${isiOS ? "&" : "?"}body=${encoded}`;
}

async function trySendFeedbackSms(review) {
  const body = `
Onoff Dance Studio Feedback
Name: ${review.name}
Class: ${review.classType}
Rating: ${review.rating}/5
Message: ${review.message}
`;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isMobile) {
    alert("Open your phone and send SMS manually.");
    return;
  }

  window.location.href = buildSmsHref({
    toNumbers: ["8870356852", "9941878870"],
    body
  });
}

/* ------------------ MAIN ------------------ */

async function main() {
  const form = document.getElementById("reviewForm");

  // Load reviews from Firebase
  const reviews = await loadReviews();
  renderReviews(reviews);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const { ok, data } = validate(form);
      if (!ok) return;

      const newReview = {
        ...data,
        createdAt: serverTimestamp()
      };

      // Save to Firebase
      await saveReview(newReview);

      // Reload reviews
      const updated = await loadReviews();
      renderReviews(updated);

      form.reset();

      // Optional SMS
      trySendFeedbackSms(data);
    });
  }
}

document.addEventListener("DOMContentLoaded", main);
