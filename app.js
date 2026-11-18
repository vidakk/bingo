const STORAGE_KEY = "skupstinski-bingo";
const SIZE = 25;
const CENTER = 12;

const LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

const STAR = `
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <polygon points="50,4 63,36 97,36 70,58 80,92 50,72 20,92 30,58 3,36 37,36"></polygon>
  </svg>
`;

const cardEl = document.querySelector("#card");
const bannerEl = document.querySelector("#banner");
const statusEl = document.querySelector("#status");
const poolEl = document.querySelector("#pool");

let state = load();

poolEl.textContent = String(THEMES.length);

document.querySelector("#new-card").addEventListener("click", () => {
  const userMarks = state.marked.filter(Boolean).length - 1;
  if (userMarks > 0 && !window.confirm("Napraviti novi listić? Trenutne oznake se brišu.")) {
    return;
  }
  state = freshCard();
  save(state);
  render();
});

document.querySelector("#clear-marks").addEventListener("click", () => {
  state.marked = Array(SIZE).fill(false);
  state.marked[CENTER] = true;
  save(state);
  render();
});

document.querySelector("#print").addEventListener("click", () => {
  window.print();
});

cardEl.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-index]");
  if (!cell || cell.dataset.free === "true") return;
  toggle(Number(cell.dataset.index));
});

cardEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const cell = event.target.closest("[data-index]");
  if (!cell || cell.dataset.free === "true") return;
  event.preventDefault();
  toggle(Number(cell.dataset.index));
});

render();

function toggle(index) {
  state.marked[index] = !state.marked[index];
  save(state);
  render();
}

function freshCard() {
  if (THEMES.length < 24) {
    throw new Error("Treba bar 24 teme za listić.");
  }
  const picked = shuffle(THEMES).slice(0, 24);
  const squares = [];
  let cursor = 0;
  for (let i = 0; i < SIZE; i += 1) {
    squares.push(i === CENTER ? null : picked[cursor]);
    if (i !== CENTER) cursor += 1;
  }
  const marked = Array(SIZE).fill(false);
  marked[CENTER] = true;
  return { squares, marked };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshCard();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.squares) || data.squares.length !== SIZE) return freshCard();
    if (!Array.isArray(data.marked) || data.marked.length !== SIZE) return freshCard();
    const themesOk = data.squares.every((square, index) => {
      if (index === CENTER) return square === null;
      return typeof square === "string" && square.length > 0;
    });
    if (!themesOk) return freshCard();
    data.marked = data.marked.map(Boolean);
    data.marked[CENTER] = true;
    data.squares[CENTER] = null;
    return data;
  } catch {
    return freshCard();
  }
}

function save(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function winningCells(marked) {
  const win = new Set();
  let count = 0;
  LINES.forEach((line) => {
    if (line.every((index) => marked[index])) {
      count += 1;
      line.forEach((index) => win.add(index));
    }
  });
  return { count, win };
}

function lineLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} linija`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} linije`;
  return `${count} linija`;
}

function render() {
  const { count, win } = winningCells(state.marked);
  const userMarks = state.marked.filter(Boolean).length - 1;

  cardEl.innerHTML = state.squares
    .map((square, index) => {
      const classes = ["cell"];
      if (index === CENTER) classes.push("free");
      if (state.marked[index]) classes.push("marked");
      if (win.has(index)) classes.push("win");

      if (index === CENTER) {
        return `<div class="${classes.join(" ")}" data-index="${index}" data-free="true" role="img" aria-label="Slobodno polje">${STAR}</div>`;
      }

      return `<button type="button" class="${classes.join(" ")}" data-index="${index}" aria-pressed="${state.marked[index] ? "true" : "false"}"><span>${escapeHtml(square)}</span></button>`;
    })
    .join("");

  statusEl.textContent = `Označeno ${userMarks} od 24`;

  if (count > 0) {
    bannerEl.hidden = false;
    bannerEl.textContent = `BINGO · ${lineLabel(count)}`;
  } else {
    bannerEl.hidden = true;
    bannerEl.textContent = "";
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
