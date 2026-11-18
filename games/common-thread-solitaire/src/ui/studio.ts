import categories from "../content/categories.json";
import { generateLevel } from "../engine/generator.js";
import type { LevelDefinition } from "../engine/types";
export interface AppHost {
  root: HTMLElement;
  profile: {
    journeyLevel: number;
    coins: number;
    stats: { wins: number };
    daily: Record<string, { done: boolean }>;
  };
  clear(): void;
  title(): void;
  startJourney(level: number): void;
  journey(): void;
  daily(): void;
  quick(): void;
  howTo(): void;
  settings(): void;
  play(
    def: LevelDefinition,
    options: {
      levelNumber: number;
      subtitle: string;
      tutorial: boolean;
      nextLabel: string;
      onWin(): void;
      onNext(): void;
      onExit(): void;
    },
  ): void;
}
const STORAGE_KEY = "commonthread.workshop.v1";
interface Draft {
  title: string;
  categories: string[];
  cards: number;
  seed: number;
  multiplier: number;
}
const initial: Draft = {
  title: "A little afternoon",
  categories: ["days", "pasta", "beach"],
  cards: 3,
  seed: 9020,
  multiplier: 2,
};
export function validateDraft(value: unknown): Draft {
  if (!value || typeof value !== "object")
    throw new Error("Expected a workshop JSON object.");
  const draft = value as Draft;
  if (
    typeof draft.title !== "string" ||
    !draft.title.trim() ||
    draft.title.length > 60
  )
    throw new Error("Use a title between 1 and 60 characters.");
  if (
    !Array.isArray(draft.categories) ||
    draft.categories.length < 3 ||
    draft.categories.length > 12 ||
    new Set(draft.categories).size !== draft.categories.length ||
    draft.categories.some((id) => !categories.some((c) => c.id === id))
  )
    throw new Error("Choose 3–12 different categories from the library.");
  if (!Number.isInteger(draft.cards) || draft.cards < 3 || draft.cards > 8)
    throw new Error("Use 3–8 cards per set.");
  if (
    !Number.isInteger(draft.seed) ||
    draft.seed < 0 ||
    draft.seed > 2147483647
  )
    throw new Error("Seed must be a whole number from 0 to 2147483647.");
  if (
    !Number.isFinite(draft.multiplier) ||
    draft.multiplier < 1 ||
    draft.multiplier > 3
  )
    throw new Error("Move allowance must be between 1× and 3×.");
  return draft;
}
export function openStudio(app: AppHost) {
  app.clear();
  let draft = structuredClone(initial);
  try {
    draft = validateDraft(
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"),
    );
  } catch {
    /* first use */
  }
  const screen = document.createElement("section");
  screen.className = "screen linen studio";
  screen.innerHTML = `<header class="studio-header"><button class="text-button" data-home>← Back to the table</button><span class="eyebrow">THE WORKSHOP</span></header>
    <div class="studio-intro"><h1>Make it your own.</h1><p>Pick a few common threads. We’ll find a deal you can finish.</p></div>
    <form class="studio-layout"><div class="studio-controls">
    <label>Puzzle title<input name="title" maxlength="60" required></label>
    <div class="field-pair"><label>Cards per set<input name="cards" type="number" min="3" max="8" required></label><label>Deal seed<input name="seed" type="number" min="0" max="2147483647" required></label></div>
    <label>Move allowance<select name="multiplier"><option value="1.3">Focused · 1.3× solution</option><option value="1.75">Balanced · 1.75× solution</option><option value="2">Relaxed · 2× solution</option><option value="3">Room to explore · 3× solution</option></select></label>
    <p class="studio-note">The solver checks every deal. The same seed and settings make the same puzzle. Larger sets use as many items as the category contains.</p>
    <button class="btn gold" type="submit">Play-test this puzzle <span>↗</span></button>
    <div class="studio-actions"><button type="button" class="text-button" data-export>Export JSON ↓</button><label class="text-button import-label">Import JSON ↑<input type="file" accept="application/json,.json" data-import></label></div>
    <p role="status" class="studio-status"></p></div>
    <fieldset class="category-library"><legend>Choose your threads <span data-count></span></legend><div class="category-options"></div></fieldset></form>`;
  app.root.append(screen);
  screen.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () =>
    app.title();
  const form = screen.querySelector("form")!;
  const fields = form.elements;
  const status = screen.querySelector<HTMLElement>("[role=status]")!;
  const field = (name: string) => fields.namedItem(name) as HTMLInputElement;
  const options = screen.querySelector(".category-options")!;
  for (const category of categories) {
    const label = document.createElement("label");
    label.className = "category-choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "category";
    checkbox.value = category.id;
    const text = document.createElement("span");
    text.textContent = category.title;
    const count = document.createElement("small");
    count.textContent = `${category.items.length} ${category.modality === "pic" ? "pictures" : "words"}`;
    label.append(checkbox, text, count);
    options.append(label);
  }
  const updateCount = () => {
    screen.querySelector("[data-count]")!.textContent =
      `${form.querySelectorAll("[name=category]:checked").length} / 12`;
  };
  const fill = () => {
    for (const name of ["title", "cards", "seed", "multiplier"] as const)
      field(name).value = String(draft[name]);
    form
      .querySelectorAll<HTMLInputElement>("[name=category]")
      .forEach(
        (input) => (input.checked = draft.categories.includes(input.value)),
      );
    updateCount();
  };
  const read = () =>
    validateDraft({
      title: field("title").value.trim(),
      cards: Number(field("cards").value),
      seed: Number(field("seed").value),
      multiplier: Number(field("multiplier").value),
      categories: [
        ...form.querySelectorAll<HTMLInputElement>("[name=category]:checked"),
      ].map((input) => input.value),
    });
  form.onchange = () => {
    updateCount();
    try {
      draft = read();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      status.textContent = "Draft saved on this device.";
    } catch (error) {
      status.textContent = (error as Error).message;
    }
  };
  fill();
  screen.querySelector<HTMLButtonElement>("[data-export]")!.onclick = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(read(), null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "common-thread-puzzle.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      status.textContent = (error as Error).message;
    }
  };
  screen.querySelector<HTMLInputElement>("[data-import]")!.onchange = async (
    event,
  ) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.size > 100_000)
        throw new Error("Please use a workshop JSON file under 100 KB.");
      draft = validateDraft(JSON.parse(await file.text()));
      fill();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      status.textContent = "Puzzle imported. Ready to play-test.";
    } catch (error) {
      status.textContent = (error as Error).message;
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>("[type=submit]")!;
    try {
      draft = read();
      button.disabled = true;
      status.textContent = "Finding a solvable deal…";
      await new Promise((resolve) => setTimeout(resolve, 40));
      const level = generateLevel({
        key: `custom-${JSON.stringify(draft)}`,
        mode: "custom",
        title: draft.title,
        board: draft.categories.length <= 5 ? 3 : 4,
        sets: draft.categories.map((cat) => ({ cat, n: draft.cards })),
        mu: draft.multiplier,
        seedStart: draft.seed,
        attempts: 24,
        maxTries: 80,
      }) as LevelDefinition;
      app.play(level, {
        levelNumber: 0,
        subtitle: "Workshop · your own creation",
        tutorial: false,
        nextLabel: "Back to workshop",
        onWin() {},
        onNext: () => openStudio(app),
        onExit: () => openStudio(app),
      });
    } catch (error) {
      status.textContent = (error as Error).message;
      button.disabled = false;
    }
  };
}
