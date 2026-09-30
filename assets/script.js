/**
 * SakuKampus — Praktikum 3 PABWE
 * Fitur: Tab, Expense Tracker, Bookmark Manager, Quiz App
 * Semua data disimpan di localStorage (tanpa backend).
 */

/* 
   UTILITAS UMUM
    */

/** Ambil satu elemen; lempar error jika tidak ada (membantu debugging). */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
  return el;
}
function $all(selector) {
  return document.querySelectorAll(selector);
}

/** Baca JSON dari localStorage; kembalikan fallback jika kosong / rusak. */
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh / diblokir: abaikan agar aplikasi tetap jalan */
  }
}

/** Buat ID unik (fallback jika crypto.randomUUID tidak tersedia). */
function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

/** Tanggal hari ini format YYYY-MM-DD (zona waktu lokal). */
function todayString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Tampilkan / sembunyikan elemen. displayClass = kelas display saat terlihat. */
function setVisible(el, show, displayClass = "block") {
  el.classList.toggle("hidden", !show);
  el.classList.toggle(displayClass, show);
}

/** Tampilkan pesan error form (atau sembunyikan jika message kosong). */
function showError(el, message) {
  el.textContent = message || "";
  el.classList.toggle("hidden", !message);
}

/** Buat elemen dengan class & teks (teks lewat textContent → aman dari XSS). */
function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Buat elemen SVG ikon yang menunjuk ke sprite <symbol> di index.html. */
function svgIcon(name) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", `#icon-${name}`);
  svg.append(use);
  return svg;
}

/** Tombol kecil Ubah / Hapus. */
function actionButton(label, iconName, extraClass, onClick) {
  const btn = el("button", `btn-ghost ${extraClass}`);
  btn.type = "button";
  btn.append(svgIcon(iconName), document.createTextNode(label));
  btn.addEventListener("click", onClick);
  return btn;
}

/* 
   MODAL (dipakai semua fitur)
    */

function openModal(id) {
  const modal = $(`#${id}`);
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}
function closeModal(id) {
  const modal = $(`#${id}`);
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

// Tombol Batal + klik backdrop menutup modal
$all("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});
$all(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", () => closeModal(backdrop.parentElement.id));
});
// Escape menutup modal yang sedang terbuka
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["modal-expense", "modal-bookmark", "modal-delete"].forEach((id) => {
    if (!$(`#${id}`).classList.contains("hidden")) closeModal(id);
  });
});

/** Modal hapus generik: tampilkan label, jalankan callback saat dikonfirmasi. */
let onDeleteConfirm = null;
function askDelete(label, callback) {
  $("#delete-label").textContent = label;
  onDeleteConfirm = callback;
  openModal("modal-delete");
}
$("#delete-confirm").addEventListener("click", () => {
  if (onDeleteConfirm) onDeleteConfirm();
  onDeleteConfirm = null;
  closeModal("modal-delete");
});

/* 
   TAB SWITCHER
    */

/* 
   TAB SWITCHER
   Status tab aktif disimpan & dipulihkan lewat query URL (?tab=expense|bookmark|quiz),
   BUKAN localStorage — supaya bisa dibagikan/dibuka ulang lewat tautan.
   */

const VALID_TABS = ["expense", "bookmark", "quiz"];
const tabButtons = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

/** Baca nilai ?tab= dari URL saat ini; kembalikan "expense" jika tidak valid / tidak ada. */
function getTabFromUrl() {
  const value = new URLSearchParams(location.search).get("tab");
  return VALID_TABS.includes(value) ? value : "expense";
}

/**
 * Aktifkan satu tab, sembunyikan yang lain.
 * updateUrl=true mengganti query string ?tab=... (dipakai saat user klik tab),
 * updateUrl=false dipakai saat inisialisasi awal / navigasi back-forward (URL sudah benar).
 */
function switchTab(name, updateUrl = true) {
  if (!panels[name]) name = "expense";

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.setAttribute("aria-selected", String(active));
    btn.classList.toggle("bg-moss-600", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("text-slate-600", !active);
    btn.classList.toggle("hover:bg-moss-50", !active);
  });

  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set("tab", name);
    if (url.search !== location.search) {
      history.pushState({ tab: name }, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Tombol back/forward browser mengikuti perubahan ?tab= di riwayat
window.addEventListener("popstate", () => switchTab(getTabFromUrl(), false));

/* 
   FITUR 1 — EXPENSE TRACKER
    */

const EXPENSE_KEY = "sakukampus-p3-expenses";
const CATEGORIES = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Pendidikan", "Gaji / Kiriman", "Lainnya"];

let expenses = readStorage(EXPENSE_KEY, []);
let editingExpenseId = null;

const exForm = $("#expense-form");
const exTitle = $("#ex-title");
const exCategory = $("#ex-category");
const exAmount = $("#ex-amount");
const exType = $("#ex-type");
const exDate = $("#ex-date");
const exError = $("#ex-error");
const exSearch = $("#ex-search");
const exFilterType = $("#ex-filter-type");
const exFilterCategory = $("#ex-filter-category");
const exSort = $("#ex-sort");
const exList = $("#ex-list");
const exEmpty = $("#ex-empty");

const exEditForm = $("#ex-edit-form");
const exEditTitle = $("#ex-edit-title");
const exEditCategory = $("#ex-edit-category");
const exEditType = $("#ex-edit-type");
const exEditAmount = $("#ex-edit-amount");
const exEditDate = $("#ex-edit-date");
const exEditError = $("#ex-edit-error");

/** Isi <select> kategori (form tambah, form ubah, dan filter). */
function fillCategoryOptions() {
  [exCategory, exEditCategory].forEach((select) => {
    CATEGORIES.forEach((c) => select.append(new Option(c, c)));
  });
  exFilterCategory.append(new Option("Semua kategori", "all"));
  CATEGORIES.forEach((c) => exFilterCategory.append(new Option(c, c)));
}

function saveExpenses() {
  writeStorage(EXPENSE_KEY, expenses);
}

/**
 * Validasi data transaksi. Mengembalikan { error } atau { data }.
 * Aturan: semua field wajib, jumlah harus angka valid > 0.
 */
function validateExpense(title, category, amountRaw, type, date) {
  title = title.trim();
  if (!title) return { error: "Judul wajib diisi." };
  if (!category) return { error: "Pilih kategori transaksi." };
  if (String(amountRaw).trim() === "") return { error: "Jumlah wajib diisi." };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Jumlah harus berupa angka lebih dari 0." };
  if (!date) return { error: "Tanggal wajib diisi." };
  return { data: { title, category, amount, type, date } };
}

/** Hitung dan tampilkan total pemasukan, pengeluaran, dan saldo. */
function renderSummary() {
  const income = expenses.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = expenses.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  $("#sum-income").textContent = rupiah.format(income);
  $("#sum-expense").textContent = rupiah.format(expense);
  $("#sum-balance").textContent = rupiah.format(income - expense);
}

/** Terapkan pencarian + filter + sorting, lalu kembalikan array hasil. */
function getVisibleExpenses() {
  const query = exSearch.value.trim().toLowerCase();
  const type = exFilterType.value;
  const category = exFilterCategory.value;

  const items = expenses.filter((t) => {
    if (query && !t.title.toLowerCase().includes(query)) return false;
    if (type !== "all" && t.type !== type) return false;
    if (category !== "all" && t.category !== category) return false;
    return true;
  });

  items.sort((a, b) => {
    switch (exSort.value) {
      case "oldest":
        return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      default: // newest
        return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
    }
  });
  return items;
}

/** Format tanggal YYYY-MM-DD → "5 Mei 2026". */
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function renderExpenses() {
  renderSummary();
  exList.innerHTML = "";

  // Empty state jika belum ada data sama sekali
  setVisible(exEmpty, expenses.length === 0, "flex");
  if (expenses.length === 0) return;

  const items = getVisibleExpenses();
  if (items.length === 0) {
    exList.append(el("li", "rounded-xl bg-moss-50 px-4 py-3 text-sm text-slate-600", "Tidak ada transaksi yang cocok dengan pencarian atau filter."));
    return;
  }

  items.forEach((t) => {
    const isIncome = t.type === "income";
    const li = el("li", "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-moss-100 px-4 py-3");

    const info = el("div", "flex-1 min-w-0");
    info.append(el("p", "font-semibold truncate", t.title));

    const meta = el("div", "mt-1 flex flex-wrap items-center gap-2 text-xs");
    meta.append(
      el("span", `rounded-md px-2 py-0.5 font-semibold ${isIncome ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`, isIncome ? "Pemasukan" : "Pengeluaran"),
      el("span", "rounded-md bg-moss-100 px-2 py-0.5 font-medium text-moss-800", t.category),
      el("span", "text-slate-600", formatDate(t.date))
    );
    info.append(meta);

    const amount = el(
      "p",
      `font-display font-bold sm:text-right shrink-0 ${isIncome ? "text-emerald-700" : "text-rose-700"}`,
      `${isIncome ? "+" : "−"}${rupiah.format(t.amount)}`
    );

    const actions = el("div", "flex gap-1.5 shrink-0");
    actions.append(
      actionButton("Ubah", "pencil", "", () => openExpenseEdit(t.id)),
      actionButton("Hapus", "trash", "text-rose-700", () =>
        askDelete(`"${t.title}"`, () => {
          expenses = expenses.filter((x) => x.id !== t.id);
          saveExpenses();
          renderExpenses();
        })
      )
    );

    li.append(info, amount, actions);
    exList.append(li);
  });
}

/** Tambah transaksi baru. */
exForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = validateExpense(exTitle.value, exCategory.value, exAmount.value, exType.value, exDate.value);
  if (result.error) {
    showError(exError, result.error);
    return;
  }
  showError(exError, "");
  expenses.push({ id: newId(), createdAt: Date.now(), ...result.data });
  saveExpenses();
  exForm.reset();
  exDate.value = todayString();
  renderExpenses();
  exTitle.focus();
});

/** Buka modal ubah dengan data transaksi terpilih. */
function openExpenseEdit(id) {
  const t = expenses.find((x) => x.id === id);
  if (!t) return;
  editingExpenseId = id;
  exEditTitle.value = t.title;
  exEditCategory.value = t.category;
  exEditType.value = t.type;
  exEditAmount.value = t.amount;
  exEditDate.value = t.date;
  showError(exEditError, "");
  openModal("modal-expense");
  exEditTitle.focus();
}

/** Simpan perubahan dari modal. */
exEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = validateExpense(exEditTitle.value, exEditCategory.value, exEditAmount.value, exEditType.value, exEditDate.value);
  if (result.error) {
    showError(exEditError, result.error);
    return;
  }
  const t = expenses.find((x) => x.id === editingExpenseId);
  if (t) Object.assign(t, result.data);
  saveExpenses();
  renderExpenses();
  closeModal("modal-expense");
});

[exSearch, exFilterType, exFilterCategory, exSort].forEach((control) => {
  control.addEventListener(control === exSearch ? "input" : "change", renderExpenses);
});

fillCategoryOptions();
exDate.value = todayString();
renderExpenses();

/* 
   FITUR 2 — BOOKMARK MANAGER
    */

const BOOKMARK_KEY = "sakukampus-p3-bookmarks";

let bookmarks = readStorage(BOOKMARK_KEY, []);
let editingBookmarkId = null;

const bmForm = $("#bm-form");
const bmTitle = $("#bm-title");
const bmUrl = $("#bm-url");
const bmCategory = $("#bm-category");
const bmNote = $("#bm-note");
const bmError = $("#bm-error");
const bmSearch = $("#bm-search");
const bmSort = $("#bm-sort");
const bmList = $("#bm-list");
const bmEmpty = $("#bm-empty");

const bmEditForm = $("#bm-edit-form");
const bmEditTitle = $("#bm-edit-title");
const bmEditUrl = $("#bm-edit-url");
const bmEditCategory = $("#bm-edit-category");
const bmEditNote = $("#bm-edit-note");
const bmEditError = $("#bm-edit-error");

function saveBookmarks() {
  writeStorage(BOOKMARK_KEY, bookmarks);
}

/** URL valid = diawali http:// atau https:// lalu ada host, tanpa spasi. */
function isValidUrl(value) {
  if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(value)) return false;
  try {
    new URL(value); // pastikan parser URL juga setuju
    return true;
  } catch {
    return false;
  }
}

/** Validasi data bookmark → { error } atau { data }. */
function validateBookmark(title, url, category, note) {
  title = title.trim();
  url = url.trim();
  category = category.trim();
  note = note.trim();
  if (!title) return { error: "Nama bookmark wajib diisi." };
  if (!url) return { error: "URL wajib diisi." };
  if (!isValidUrl(url)) return { error: "URL harus diawali http:// atau https:// dan berformat benar." };
  if (!category) return { error: "Kategori wajib diisi." };
  return { data: { title, url, category, note } };
}

function getVisibleBookmarks() {
  const query = bmSearch.value.trim().toLowerCase();
  const items = bookmarks.filter(
    (b) => !query || [b.title, b.url, b.category].some((field) => field.toLowerCase().includes(query))
  );

  items.sort((a, b) => {
    switch (bmSort.value) {
      case "title-asc":
        return a.title.localeCompare(b.title, "id");
      case "title-desc":
        return b.title.localeCompare(a.title, "id");
      default: // newest
        return b.createdAt - a.createdAt;
    }
  });
  return items;
}

function renderBookmarks() {
  bmList.innerHTML = "";
  setVisible(bmEmpty, bookmarks.length === 0, "flex");
  if (bookmarks.length === 0) return;

  const items = getVisibleBookmarks();
  if (items.length === 0) {
    bmList.append(el("li", "sm:col-span-2 rounded-xl bg-moss-50 px-4 py-3 text-sm text-slate-600", "Tidak ada bookmark yang cocok dengan pencarian."));
    return;
  }

  items.forEach((b) => {
    const li = el("li", "flex flex-col rounded-xl border border-moss-100 p-4");

    // Judul = tautan yang dibuka di tab baru
    const link = el("a", "font-display font-bold text-moss-700 hover:underline break-words", b.title);
    link.href = b.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const urlLink = el("a", "mt-0.5 text-xs text-slate-600 hover:underline break-all", b.url);
    urlLink.href = b.url;
    urlLink.target = "_blank";
    urlLink.rel = "noopener noreferrer";

    const tag = el("span", "mt-2 self-start rounded-md bg-moss-100 px-2 py-0.5 text-xs font-medium text-moss-800", b.category);

    li.append(link, urlLink, tag);
    if (b.note) li.append(el("p", "mt-2 text-sm text-slate-600", b.note));

    const actions = el("div", "mt-3 flex gap-1.5 pt-1");
    actions.append(
      actionButton("Ubah", "pencil", "", () => openBookmarkEdit(b.id)),
      actionButton("Hapus", "trash", "text-rose-700", () =>
        askDelete(`"${b.title}"`, () => {
          bookmarks = bookmarks.filter((x) => x.id !== b.id);
          saveBookmarks();
          renderBookmarks();
        })
      )
    );
    li.append(actions);
    bmList.append(li);
  });
}

bmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = validateBookmark(bmTitle.value, bmUrl.value, bmCategory.value, bmNote.value);
  if (result.error) {
    showError(bmError, result.error);
    return;
  }
  showError(bmError, "");
  bookmarks.push({ id: newId(), createdAt: Date.now(), ...result.data });
  saveBookmarks();
  bmForm.reset();
  renderBookmarks();
  bmTitle.focus();
});

function openBookmarkEdit(id) {
  const b = bookmarks.find((x) => x.id === id);
  if (!b) return;
  editingBookmarkId = id;
  bmEditTitle.value = b.title;
  bmEditUrl.value = b.url;
  bmEditCategory.value = b.category;
  bmEditNote.value = b.note;
  showError(bmEditError, "");
  openModal("modal-bookmark");
  bmEditTitle.focus();
}

bmEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = validateBookmark(bmEditTitle.value, bmEditUrl.value, bmEditCategory.value, bmEditNote.value);
  if (result.error) {
    showError(bmEditError, result.error);
    return;
  }
  const b = bookmarks.find((x) => x.id === editingBookmarkId);
  if (b) Object.assign(b, result.data);
  saveBookmarks();
  renderBookmarks();
  closeModal("modal-bookmark");
});

bmSearch.addEventListener("input", renderBookmarks);
bmSort.addEventListener("change", renderBookmarks);

renderBookmarks();

/* 
   FITUR 3 — QUIZ APP
    */

const QUIZ_KEY = "sakukampus-p3-quiz-high";
const SECONDS_PER_QUESTION = 20;

/** Bank soal: array of object { question, options, answer (index) }. */
const QUESTIONS = [
  {
    question: "Tag HTML5 semantik mana yang cocok untuk menampung menu navigasi utama?",
    options: ["<div>", "<nav>", "<section>", "<span>"],
    answer: 1,
  },
  {
    question: "Method array mana yang menghasilkan array baru berisi elemen yang lolos suatu kondisi?",
    options: ["map()", "push()", "filter()", "find()"],
    answer: 2,
  },
  {
    question: "Apa hasil dari typeof \"42\" di JavaScript?",
    options: ["number", "string", "undefined", "object"],
    answer: 1,
  },
  {
    question: "Method mana yang dipakai untuk mengubah object JavaScript menjadi teks JSON?",
    options: ["JSON.parse()", "JSON.stringify()", "JSON.convert()", "Object.toJSON()"],
    answer: 1,
  },
  {
    question: "Properti CSS apa yang dipakai untuk mengubah jarak di DALAM batas sebuah elemen?",
    options: ["margin", "border", "padding", "gap"],
    answer: 2,
  },
  {
    question: "Manakah cara yang benar untuk menyimpan data ke localStorage?",
    options: [
      "localStorage.save(\"k\", \"v\")",
      "localStorage.setItem(\"k\", \"v\")",
      "localStorage.put(\"k\", \"v\")",
      "localStorage.add(\"k\", \"v\")",
    ],
    answer: 1,
  },
  {
    question: "Apa perbedaan utama === dan == di JavaScript?",
    options: [
      "=== membandingkan nilai dan tipe, == boleh mengonversi tipe",
      "=== hanya untuk angka",
      "Tidak ada perbedaan",
      "== membandingkan nilai dan tipe, === boleh mengonversi tipe",
    ],
    answer: 0,
  },
  {
    question: "Atribut apa yang sebaiknya menyertai target=\"_blank\" agar tautan lebih aman?",
    options: ["rel=\"noopener noreferrer\"", "type=\"secure\"", "download", "rel=\"stylesheet\""],
    answer: 0,
  },
];

// State kuis
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let quizTimeLeft = SECONDS_PER_QUESTION;
let quizTimerId = null;

const quizStart = $("#quiz-start");
const quizPlay = $("#quiz-play");
const quizResult = $("#quiz-result");
const quizQuestion = $("#quiz-question");
const quizOptions = $("#quiz-options");
const quizFeedback = $("#quiz-feedback");
const quizNext = $("#quiz-next");
const quizTimer = $("#quiz-timer");

/** Ambil skor terbaik; null jika belum pernah main. */
function getHighScore() {
  return readStorage(QUIZ_KEY, null);
}
function showHighScore() {
  const high = getHighScore();
  $("#quiz-high").textContent = high === null ? "Belum ada" : `${high} / ${QUESTIONS.length}`;
}

/** Tampilkan satu "layar" kuis: start | play | result. */
function showQuizScreen(name) {
  quizStart.classList.toggle("hidden", name !== "start");
  quizPlay.classList.toggle("hidden", name !== "play");
  quizResult.classList.toggle("hidden", name !== "result");
}

function stopTimer() {
  clearInterval(quizTimerId);
  quizTimerId = null;
}

/** Mulai timer per soal; jika habis dianggap salah. */
function startTimer() {
  stopTimer();
  quizTimeLeft = SECONDS_PER_QUESTION;
  quizTimer.textContent = String(quizTimeLeft);
  quizTimerId = setInterval(() => {
    quizTimeLeft -= 1;
    quizTimer.textContent = String(quizTimeLeft);
    if (quizTimeLeft <= 0) answerQuestion(-1); // -1 = waktu habis
  }, 1000);
}

/** Render soal aktif berdasarkan state (quizIndex). */
function renderQuestion() {
  const q = QUESTIONS[quizIndex];
  quizAnswered = false;

  $("#quiz-number").textContent = String(quizIndex + 1);
  $("#quiz-progress").style.width = `${(quizIndex / QUESTIONS.length) * 100}%`;
  quizQuestion.textContent = q.question;
  quizOptions.innerHTML = "";
  quizFeedback.classList.add("hidden");
  quizNext.classList.add("hidden");
  quizNext.textContent = quizIndex === QUESTIONS.length - 1 ? "Lihat hasil" : "Soal berikutnya";

  q.options.forEach((text, i) => {
    const li = document.createElement("li");
    const btn = el("button", "w-full text-left rounded-lg border border-moss-100 bg-white px-4 py-3 text-sm font-medium hover:bg-moss-50 transition", text);
    btn.type = "button";
    btn.dataset.index = String(i);
    btn.addEventListener("click", () => answerQuestion(i));
    li.append(btn);
    quizOptions.append(li);
  });

  startTimer();
}

/** Nilai jawaban: bandingkan dengan kunci, update skor, beri feedback. */
function answerQuestion(choice) {
  if (quizAnswered) return;
  quizAnswered = true;
  stopTimer();

  const q = QUESTIONS[quizIndex];
  const correct = choice === q.answer;
  if (correct) quizScore += 1;

  // Tandai jawaban benar / salah, kunci semua tombol
  quizOptions.querySelectorAll("button").forEach((btn) => {
    const i = Number(btn.dataset.index);
    btn.disabled = true;
    btn.classList.remove("hover:bg-moss-50");
    if (i === q.answer) btn.classList.add("border-emerald-500", "bg-emerald-50", "text-emerald-900");
    else if (i === choice) btn.classList.add("border-rose-500", "bg-rose-50", "text-rose-900");
    else btn.classList.add("opacity-60");
  });

  let message;
  if (correct) message = "Benar!";
  else if (choice === -1) message = `Waktu habis. Jawaban yang benar: ${q.options[q.answer]}`;
  else message = `Salah. Jawaban yang benar: ${q.options[q.answer]}`;

  quizFeedback.textContent = message;
  quizFeedback.className = `rounded-xl border px-4 py-3 text-sm ${
    correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
  }`;
  quizNext.classList.remove("hidden");
  quizNext.focus();
}

/** Selesai: tampilkan skor & perbarui high score bila lebih baik. */
function finishQuiz() {
  stopTimer();
  const total = QUESTIONS.length;
  const high = getHighScore();

  let note = "Coba lagi untuk skor lebih tinggi.";
  if (quizScore === total) note = "Sempurna!";
  if (high === null || quizScore > high) {
    writeStorage(QUIZ_KEY, quizScore);
    note = "Skor terbaik baru! " + (quizScore === total ? "Sempurna!" : "");
  }

  $("#quiz-score").textContent = String(quizScore);
  $("#quiz-max").textContent = String(total);
  $("#quiz-result-note").textContent = note.trim();
  showHighScore();
  showQuizScreen("result");
}

/** Reset state lalu mulai dari soal pertama. */
function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  showQuizScreen("play");
  renderQuestion();
}

quizNext.addEventListener("click", () => {
  quizIndex += 1;
  if (quizIndex >= QUESTIONS.length) finishQuiz();
  else renderQuestion();
});
$("#quiz-start-btn").addEventListener("click", startQuiz);
$("#quiz-restart").addEventListener("click", startQuiz);

$("#quiz-total").textContent = String(QUESTIONS.length);
$("#quiz-count").textContent = String(QUESTIONS.length);
showHighScore();
showQuizScreen("start");

/* 
   INISIALISASI — pulihkan tab dari query URL (?tab=...), atau "expense" jika tidak ada
    */

const initialTab = getTabFromUrl();
switchTab(initialTab, false); // false: jangan pushState dulu, cukup tampilkan panelnya

// Normalisasi URL agar selalu mencantumkan ?tab=... (replaceState: tidak menambah riwayat back).
const normalizedUrl = new URL(location.href);
normalizedUrl.searchParams.set("tab", initialTab);
if (normalizedUrl.search !== location.search) {
  history.replaceState({ tab: initialTab }, "", `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`);
}
