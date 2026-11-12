import { Game } from "./game";
import { TempleAudio } from "./audio";
import { validateName } from "../../server/src/profanity";

const NAME_KEY = "jingxin_dharma_name";

const login = document.getElementById("login")!;
const gameEl = document.getElementById("game")!;
const input = document.getElementById("name-input") as HTMLInputElement;
const err = document.getElementById("login-err")!;
const enter = document.getElementById("enter-btn") as HTMLButtonElement;

const saved = localStorage.getItem(NAME_KEY);
if (saved) input.value = saved;

const params = new URLSearchParams(location.search);
if (params.get("name")) input.value = params.get("name")!;

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void tryEnter();
});
enter.addEventListener("click", () => void tryEnter());
input.focus();

async function tryEnter() {
  const checked = validateName(input.value);
  if (!checked.ok) {
    showErr(checked.reason);
    return;
  }
  enter.disabled = true;
  err.hidden = true;
  const audio = new TempleAudio();
  try {
    await audio.unlock(); // first user gesture — starts BGM
  } catch (e) {
    console.warn("audio unlock", e);
  }
  const game = new Game(audio);
  try {
    await game.connect(checked.name);
    localStorage.setItem(NAME_KEY, checked.name);
    login.hidden = true;
    gameEl.hidden = false;
    // If autoplay was blocked before, a second resume after visible canvas
    void audio.unlock();
  } catch (e: unknown) {
    enter.disabled = false;
    const msg = extractError(e);
    showErr(msg);
  }
}

function showErr(msg: string) {
  err.hidden = false;
  err.textContent = msg;
}

function extractError(e: unknown): string {
  if (!e) return "入寺未成，请稍后再试";
  const anyE = e as { message?: string; code?: number };
  const m = String(anyE.message ?? e);
  if (m.includes("此法号") || m.includes("法号") || m.includes("不宜") || m.includes("汉字")) return m.replace(/^.*?(\d+\s*)?/, "").replace(/^\d+\s*/, "");
  // Colyseus wraps: "400: 法号至少两个字" or "server error: ..."
  const cut = m.replace(/^Error:\s*/i, "");
  const idx = cut.indexOf(": ");
  const tail = idx >= 0 ? cut.slice(idx + 2) : cut;
  return tail || "入寺未成，请稍后再试";
}

// Auto-enter for screenshot / CI
if (params.get("auto") === "1" && input.value) {
  window.setTimeout(() => void tryEnter(), 200);
}
