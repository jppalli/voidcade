import { sdk } from "../platform/sdk.js";
import {
  element,
  icon,
  announce,
  moveErrors,
  modal,
  coinLine,
} from "../ui/dom.js";
import { icons, illustrations } from "../assets.js";
import { audio } from "../audio.js";
import {
  movableStart,
  sourceCards,
  destinationError,
  isItem,
} from "../engine/rules.js";
import { economy, streakBonus } from "../content/economy.js";

class GameBoard {
  root;
  table;
  s;
  host;
  els = new Map();
  slotEls = {
    found: [],
    cols: [],
    stock: null,
  };
  L;
  pos = new Map();
  hud;
  toastEl;
  coachEl = null;
  bannerEl = null;
  stockCount;
  portLabel;
  zoneLabels = {};
  focusRing;
  busy = !1;
  ended = !1;
  wildMode = !1;
  hintTimer = 0;
  toastTimer = 0;
  activeHint = null;
  drag = null;
  focus = {
    stop: 0,
    depth: 0,
  };
  ro;
  keyH = (t) => this.onKey(t);
  constructor(t, e, s) {
    if (
      ((this.root = t),
      (this.s = e),
      (this.host = s),
      this.build(),
      (this.ro = new ResizeObserver(() => this.relayout())),
      this.ro.observe(this.root),
      document.addEventListener("keydown", this.keyH),
      this.relayout(),
      sdk.gameplayStart(),
      s.tutorial)
    )
      setTimeout(() => this.updateCoach(), 400);
  }
  destroy() {
    (this.ro.disconnect(),
      document.removeEventListener("keydown", this.keyH),
      sdk.gameplayStop(),
      clearTimeout(this.hintTimer));
  }
  build() {
    let t = this.host.profile;
    this.root.innerHTML = "";
    let e = element("div", {
        class: "game linen" + (t.settings.reducedMotion ? " reduced" : ""),
      }),
      s = element(
        "div",
        {
          class: "moves",
          role: "status",
          "aria-label": "Moves left",
        },
        element("b", {}, "0"),
        element("span", {}, "moves"),
      ),
      o = element(
        "div",
        {
          class: "coins",
          "aria-label": "Coins",
        },
        icon("coin", ""),
        element("span", {}, String(t.coins)),
      ),
      a = element("span", {
        class: "streak",
        title: "Win streak",
      }),
      i = element("button", {
        class: "iconbtn",
        "aria-label": "Sound on/off",
        html: t.settings.sfx ? icons.sound : icons.mute,
        onclick: () => this.toggleSound(),
      }),
      r = element(
        "header",
        {
          class: "hud",
        },
        element("button", {
          class: "iconbtn",
          "aria-label": "Menu",
          html: `${icons.home}<span>Menu</span>`,
          onclick: () => this.pauseMenu(),
        }),
        element(
          "div",
          {
            class: "lvl",
          },
          this.host.title,
          " ",
          a,
          element("small", {}, this.host.subtitle),
        ),
        s,
        element("div", {
          class: "spacer",
        }),
        o,
        i,
      ),
      l = (k, T, P, O) =>
        element(
          "button",
          {
            class: "booster",
            "aria-label": `${T} (${O})`,
            onclick: () => {
              (audio.unlock(), P());
            },
          },
          icon(k),
          element("span", {}, T),
          element("span", {
            class: "tag",
          }),
        ),
      c = l("undo", "Undo", () => this.useUndo(), "Z"),
      d = l("hint", "Hint", () => this.useHint(), "H"),
      u = l("wild", "Wild", () => this.useWild(), "W"),
      p = element(
        "div",
        {
          class: "setsleft",
        },
        "Sets left",
        element("b", {}, "0"),
      ),
      x = element(
        "aside",
        {
          class: "rail",
          "aria-label": "Helpers",
        },
        c,
        d,
        u,
        p,
      );
    ((this.table = element("div", {
      class: "table",
      tabindex: "0",
      "aria-label":
        "Card table. Use arrow keys to move between piles, Enter to play.",
    })),
      e.append(r, x, this.table),
      this.root.append(e),
      (this.hud = {
        moves: s,
        coins: o,
        streak: a,
        sets: p,
        undo: c,
        hint: d,
        wild: u,
        sound: i,
      }));
    let { F: f, C: w } = {
      F: this.s.state.found.length,
      C: this.s.state.cols.length,
    };
    for (let k = 0; k < f; k++) {
      let T = element(
        "div",
        {
          class: "slot found",
          "aria-label": `Set slot ${k + 1}`,
        },
        element("i", {
          class: "wm",
          html: icons.spool,
        }),
        element(
          "span",
          {
            class: "lbl",
          },
          "Category",
        ),
      );
      (this.slotEls.found.push(T), this.table.append(T));
    }
    for (let k = 0; k < w; k++) {
      let T = element("div", {
        class: "slot col",
      });
      (this.slotEls.cols.push(T), this.table.append(T));
    }
    ((this.slotEls.stock = element(
      "div",
      {
        class: "slot stock",
        "aria-label": "Deck",
      },
      element("i", {
        class: "ico",
        html: icons.shuffle,
      }),
    )),
      this.table.append(this.slotEls.stock),
      (this.stockCount = element("div", {
        class: "stockcount",
      })),
      this.table.append(this.stockCount),
      (this.portLabel = element("div", {
        class: "portlabel",
      })),
      this.table.append(this.portLabel),
      (this.focusRing = element("div", {
        class: "focusring",
      })),
      this.table.append(this.focusRing),
      (this.toastEl = element("div", {
        class: "toast",
        role: "status",
      })),
      this.table.append(this.toastEl),
      this.table.addEventListener("pointerdown", (k) => this.onDown(k)),
      this.table.addEventListener("pointermove", (k) => this.onMoveP(k)),
      this.table.addEventListener("pointerup", (k) => this.onUp(k)),
      this.table.addEventListener("pointercancel", () => this.cancelDrag()));
    for (const [key, text] of Object.entries({ found: "Collect matching sets", cols: "Arrange your cards", stock: "Draw a card", waste: "Drawn cards" })) {
      const label = element("div", { class: `board-zone-label zone-${key}`, "aria-hidden": "true" }, text);
      this.zoneLabels[key] = label;
      this.table.append(label);
    }
  }
  relayout() {
    let t = this.table.clientWidth,
      e = this.table.clientHeight;
    if (!t || !e) return;
    let s = this.root.clientWidth / this.root.clientHeight < 1.15,
      o = this.root.querySelector(".game");
    (o.classList.toggle("port", s), o.classList.toggle("land", !s));
    let a = this.table.clientWidth,
      i = this.table.clientHeight;
    this.L = this.computeLayout(s, a || t, i || e);
    let { cw: r, ch: l } = this.L,
      c = this.host.profile.settings.largePrint ? 1.2 : 1;
    (this.table.style.setProperty("--cw", `${r}px`),
      this.table.style.setProperty("--ch", `${l}px`),
      this.table.style.setProperty(
        "--fs-word",
        `${Math.max(19, r * 0.215 * c)}px`,
      ),
      this.table.style.setProperty(
        "--fs-hdr",
        `${Math.max(15, r * 0.16 * c)}px`,
      ),
      this.L.found.forEach((d, u) =>
        this.place(this.slotEls.found[u], d.x, d.y),
      ),
      this.L.cols.forEach((d, u) => {
        let p = this.slotEls.cols[u];
        this.place(p, d.x, d.y);
      }),
      this.place(this.slotEls.stock, this.L.stock.x, this.L.stock.y),
      this.render());
    for (const key of ["found", "cols", "stock", "waste"]) {
      const anchor = key === "found" || key === "cols" ? this.L[key][0] : this.L[key];
      const label = this.zoneLabels[key];
      label.style.width = `${key === "found" || key === "cols" ? this.L.cols.length * r + (this.L.cols.length - 1) * this.L.gap : r}px`;
      label.textContent = key === "found" ? `Collect sets · ${this.s.setsLeft} left` : key === "waste" && s ? "Drawn" : key === "stock" && s ? "Draw" : { cols: "Arrange your cards", stock: "Draw a card", waste: "Drawn cards" }[key];
      this.place(label, anchor.x, anchor.y - 27);
    }
  }
  computeLayout(t, e, s) {
    let o = this.s.state.cols.length,
      a = 1.38;
    // On tablets and wide windows, put the draw piles beside the board.
    // Three vertical rows unnecessarily shrink cards in these viewports.
    if (!t || e >= 620) {
      let z = Math.max(28, e * 0.02),
        j = (e - 2 * z) / (o + 1.45 + 0.12 * o),
        Vt = (s - 2 * z - 36) / 3.45,
        H = Math.floor(Math.min(j, Vt, 240)),
        et = Math.round(H * 1.38),
        st = Math.round(H * 0.12),
        pt = e - z - H,
        Yt = pt - z - H * 0.35,
        wt = z + (Yt - (o * H + (o - 1) * st)) / 2,
        Kt = Math.max(38, Math.round(et * 0.15)),
        Jt = Array.from(
          {
            length: o,
          },
          (Xt, ft) => ({
            x: wt + ft * (H + st),
            y: z,
          }),
        ),
        ut = z + et + Kt,
        Qt = Array.from(
          {
            length: o,
          },
          (Xt, ft) => ({
            x: wt + ft * (H + st),
            y: ut,
          }),
        );
      return {
        port: false,
        cw: H,
        ch: et,
        W: e,
        H: s,
        found: Jt,
        cols: Qt,
        stock: {
          x: pt,
          y: z,
        },
        waste: {
          x: pt,
          y: ut,
          dx: 0,
          dy: et * 0.2,
        },
        tabTop: ut,
        gap: st,
        label: {
          x: 0,
          y: 0,
        },
      };
    }
    let i = Math.max(12, e * 0.025),
      r = Math.max(5, Math.round(e * 0.016)),
      l = (e - 2 * i - (o - 1) * r) / o,
      c = (s - 60 - 64) / 4.8,
      d = Math.floor(Math.min(l, c, 220)),
      u = Math.round(d * 1.38),
      p = Math.max(32, Math.round(u * 0.1)),
      x = o * d + (o - 1) * r,
      f = (e - x) / 2,
      w = this.host.profile.settings.leftHanded,
      k = w ? f : f + x - d,
      T = w ? k + d + r : k - r - d,
      P = Array.from(
        {
          length: o,
        },
        (z, j) => ({
          x: f + j * (d + r),
          y: 30 + u + p,
        }),
      ),
      O = 30 + 2 * (u + p),
      qt = Array.from(
        {
          length: o,
        },
        (z, j) => ({
          x: f + j * (d + r),
          y: O,
        }),
      );
    return {
      port: t,
      cw: d,
      ch: u,
      W: e,
      H: s,
      found: P,
      cols: qt,
      stock: {
        x: k,
        y: 30,
      },
      waste: {
        x: T,
        y: 30,
        dx: (w ? 1 : -1) * d * 0.3,
        dy: 0,
      },
      tabTop: O,
      gap: r,
      label: {
        x: w ? f + x - d * 1.2 : f,
        y: i + u * 0.25,
      },
    };
  }
  place(t, e, s) {
    t.style.transform = `translate3d(${e}px, ${s}px, 0)`;
  }
  computePositions() {
    let { L: t } = this,
      e = this.s.state,
      s = new Map(),
      o = t.H - t.tabTop - Math.max(8, t.ch * 0.06);
    (e.cols.forEach((i, r) => {
      let l = t.ch * 0.21,
        c = t.ch * 0.1,
        d = 0;
      for (let x = 0; x < i.length - 1; x++) d += i[x].up ? l : c;
      let u = d + t.ch > o && d > 0 ? Math.max(0.35, (o - t.ch) / d) : 1,
        p = t.cols[r].y;
      i.forEach((x, f) => {
        (s.set(x.id, {
          x: t.cols[r].x,
          y: p,
          z: 200 + f,
        }),
          (p += (x.up ? l : c) * u));
      });
    }),
      e.stock.forEach((i, r) => {
        let l = Math.min(3, Math.floor(r / 8));
        s.set(i, {
          x: t.stock.x - l,
          y: t.stock.y - l,
          z: 20 + r,
        });
      }));
    let a = e.waste.length;
    if (t.port)
      e.waste.forEach((i, r) => {
        let l = Math.min(2, a - 1 - r);
        s.set(i, {
          x: t.waste.x + t.waste.dx * l,
          y: t.waste.y,
          z: 100 + r,
        });
      });
    else
      e.waste.forEach((i, r) => {
        let l = Math.min(2, a - 1 - r),
          c = Math.min(a, 3) - 1 - l;
        s.set(i, {
          x: t.waste.x,
          y: t.waste.y + t.waste.dy * c,
          z: 100 + r,
        });
      });
    return (
      e.found.forEach((i, r) => {
        if (i)
          s.set(i.catCard, {
            x: t.found[r].x,
            y: t.found[r].y,
            z: 150,
          });
      }),
      s
    );
  }
  cardEl(t) {
    let e = this.els.get(t.id);
    if (e) return e;
    let s = Math.max(...t.label.split(" ").map((r) => r.length)),
      o =
        s <= 6
          ? 1
          : s <= 7
            ? 0.94
            : s <= 8
              ? 0.87
              : s <= 9
                ? 0.8
                : s <= 10
                  ? 0.74
                  : 0.68,
      a =
        Math.min(1, 9 / Math.max(9, t.label.length)) *
        (t.kind === "cat" ? 0.92 : 1),
      i;
    if (t.kind === "word")
      i = element(
        "div",
        {
          class: "face",
        },
        element("span", {
          class: "dots",
        }),
        element(
          "div",
          {
            class: "hdr",
            style: {
              fontSize: `calc(var(--fs-hdr) * ${a})`,
            },
          },
          t.label,
        ),
        element(
          "div",
          {
            class: "ctr",
            style: {
              fontSize: `calc(var(--fs-word) * ${o})`,
            },
          },
          t.label,
        ),
      );
    else if (t.kind === "pic")
      i = element(
        "div",
        {
          class: "face",
        },
        element(
          "div",
          {
            class: "hdr",
          },
          element("i", {
            html: illustrations[t.icon] ?? "",
          }),
        ),
        element("div", {
          class: "ctr",
          html: illustrations[t.icon] ?? "",
        }),
        element("span", { class: "picture-label" }, t.label),
      );
    else if (t.kind === "cat")
      i = element(
        "div",
        {
          class: "face",
        },
        element(
          "div",
          {
            class: "hdr",
            style: {
              fontSize: `calc(var(--fs-hdr) * ${a})`,
            },
          },
          element("span", {}, t.label),
          element("i", {
            html: icons.spool,
          }),
        ),
        element(
          "div",
          {
            class: "ctr",
          },
          element("i", {
            class: "spool",
            html: illustrations[t.icon] ?? illustrations.leaf,
          }),
          element(
            "div",
            {
              class: "title",
              style: {
                fontSize: `calc(var(--fs-word) * ${o * 0.92})`,
              },
            },
            t.label,
          ),
          element(
            "div",
            {
              class: "cnt",
            },
            `${t.total} cards`,
          ),
        ),
        element(
          "div",
          {
            class: "bar",
          },
          element("b", {
            style: {
              width: "0%",
            },
          }),
        ),
      );
    else
      i = element(
        "div",
        {
          class: "face",
        },
        element(
          "div",
          {
            class: "hdr",
          },
          "WILD",
        ),
        element(
          "div",
          {
            class: "ctr",
          },
          element("i", {
            html: icons.needle,
          }),
          element(
            "b",
            {
              style: {
                fontSize: "var(--fs-hdr)",
              },
            },
            "WILD THREAD",
          ),
        ),
      );
    return (
      (e = element(
        "div",
        {
          class: `card k-${t.kind} down`,
          "data-id": String(t.id),
        },
        element(
          "div",
          {
            class: "inner",
          },
          i,
          element("div", {
            class: "back",
          }),
        ),
      )),
      e.setAttribute("aria-label", this.describe(t)),
      this.els.set(t.id, e),
      this.table.append(e),
      e
    );
  }
  describe(t) {
    if (t.kind === "cat") return `Category card ${t.label}, ${t.total} cards`;
    if (t.kind === "wild") return "Wild Thread";
    return t.kind === "pic" ? `Picture: ${t.label}` : t.label;
  }
  render(t) {
    if (!this.L) return;
    let e = this.s.state,
      s = this.computePositions();
    this.pos = s;
    let o = new Set(s.keys()),
      a = e.waste.length;
    for (let [i, r] of s) {
      let l = this.s.cards[i],
        c = this.cardEl(l);
      c.classList.remove("gone", "tieoff", "hint", "selected");
      let d = !0,
        u = !1,
        p = this.locate(i);
      if (p.z === "stock") d = !1;
      if (p.z === "col") {
        let f = e.cols[p.i];
        ((d = f[p.idx].up), (u = p.idx < f.length - 1));
      }
      if (p.z === "waste") u = p.k < a - 1;
      (c.classList.toggle(
        "side",
        p.z === "waste" && this.L.port && p.k < a - 1,
      ),
        c.classList.toggle("down", !d),
        c.classList.toggle("covered", u && d),
        c.classList.toggle("seated", p.z === "found"));
      let x =
        p.z === "stock" ||
        (p.z === "waste" && p.k === a - 1) ||
        (p.z === "col" && d && p.idx >= movableStart(e, this.s.cards, p.i));
      if ((c.classList.toggle("nomove", !x), p.z === "found")) {
        let f = e.found[p.i];
        ((c.querySelector(".cnt").textContent = `${f.count}/${f.total}`),
          (c.querySelector(".bar > b").style.width =
            `${(f.count / f.total) * 100}%`));
      } else if (l.kind === "cat")
        c.querySelector(".cnt").textContent = `${l.total} cards`;
      if (((c.style.zIndex = String(r.z)), !this.drag?.ids.includes(i)))
        this.place(c, r.x, r.y);
    }
    for (let [i, r] of this.els) {
      if (o.has(i) || r.classList.contains("gone")) continue;
      let l = t?.scored?.ids.includes(i) ? t.scored.found : t?.clearedFound;
      if (l !== void 0 && this.L.found[l]) {
        let c = this.L.found[l];
        if (
          ((r.style.zIndex = "400"),
          r.classList.remove("covered"),
          this.place(r, c.x, c.y),
          this.s.cards[i]?.kind === "cat")
        )
          r.classList.add("tieoff");
        setTimeout(() => r.classList.add("gone"), 60);
      } else r.classList.add("gone");
      setTimeout(() => {
        if (!s.has(i)) (r.remove(), this.els.delete(i));
      }, 900);
    }
    if (
      ((this.stockCount.textContent = String(e.stock.length)),
      this.place(
        this.stockCount,
        Math.min(this.L.stock.x + this.L.cw - 22, this.L.W - 36),
        Math.max(2, this.L.stock.y - 10),
      ),
      (this.stockCount.style.display = e.stock.length ? "" : "none"),
      (this.slotEls.stock.innerHTML = e.stock.length
        ? ""
        : e.waste.length
          ? `<i class="ico">${icons.shuffle}</i>`
          : ""),
      this.slotEls.stock.setAttribute(
        "aria-label",
        e.stock.length
          ? `Deck, ${e.stock.length} cards. Draw costs 1 move.`
          : e.waste.length
            ? "Turn the pile back over (1 move)"
            : "Deck empty",
      ),
      this.L.port)
    )
      ((this.portLabel.style.display = ""),
        (this.portLabel.innerHTML = `Sets left<b>${this.s.setsLeft}/${this.s.totalSets}</b>`),
        this.place(this.portLabel, this.L.label.x, this.L.label.y));
    else this.portLabel.style.display = "none";
    (this.updateHud(), this.updateFocusRing());
  }
  locate(t) {
    let e = this.s.state;
    for (let a = 0; a < e.cols.length; a++) {
      let i = e.cols[a].findIndex((r) => r.id === t);
      if (i >= 0)
        return {
          z: "col",
          i: a,
          idx: i,
        };
    }
    let s = e.waste.indexOf(t);
    if (s >= 0)
      return {
        z: "waste",
        k: s,
      };
    if (e.stock.includes(t))
      return {
        z: "stock",
      };
    let o = e.found.findIndex((a) => a?.catCard === t);
    if (o >= 0)
      return {
        z: "found",
        i: o,
      };
    return null;
  }
  updateHud() {
    this.zoneLabels.found.textContent = `Collect sets · ${this.s.setsLeft} left`;
    let t = this.host.profile,
      e = this.s.state,
      s = this.hud.moves;
    ((s.firstChild.textContent = String(e.moves)),
      s.classList.toggle("warn", e.moves <= 10 && e.moves > 5),
      s.classList.toggle("crit", e.moves <= 5),
      (this.hud.coins.lastChild.textContent = String(t.coins)),
      (this.hud.streak.innerHTML =
        t.streak >= 2
          ? `${(icons.flame ?? "").replace("<svg", '<svg style="width:18px;height:18px"')}${t.streak}`
          : ""),
      (this.hud.sets.lastChild.textContent = `${this.s.setsLeft}/${this.s.totalSets}`));
    let o = (a, i, r) => {
      let l = a.querySelector(".tag");
      if (i > 0) ((l.className = "tag"), (l.textContent = String(i)));
      else
        ((l.className = "tag price"),
          (l.innerHTML = `<i>${icons.coin}</i>${r}`));
    };
    (o(this.hud.undo, this.s.freeUndos, economy.undoCost),
      o(this.hud.hint, t.hints, economy.hintCost),
      o(this.hud.wild, t.wilds, economy.wildCost),
      this.hud.wild.classList.toggle("locked", !this.wildUnlocked()),
      this.hud.wild.classList.toggle("active", this.wildMode));
  }
  wildUnlocked() {
    let t = this.host.profile;
    return t.journeyLevel >= economy.wildUnlockLevel || t.settings.reviewMode;
  }
  doMove(t, e = !1) {
    if (this.busy || this.ended) return !1;
    this.clearHint();
    let s = this.s.state.moves,
      o = this.s.move(t);
    if (!o.ok) {
      if (!e) this.reject(o.reason, t);
      return !1;
    }
    if (t.t === "draw")
      (audio.draw(), announce(`Drew ${this.s.cards[o.moved[0]].label}.`));
    else if (t.t === "recycle")
      (audio.recycle(), announce("Deck turned over."));
    else if (o.clearedCat)
      (audio.score(1, o.scored.ids.length),
        setTimeout(() => audio.complete(), 180));
    else if (o.scored) {
      let a = this.s.state.found[o.scored.found];
      (audio.score(a.count / a.total, o.scored.ids.length),
        announce(
          `${a.count} of ${a.total} in ${this.s.cards[a.catCard].label}.`,
        ));
    } else if (t.t === "move" && t.to.z === "found")
      (audio.seat(),
        announce(`Started the ${this.s.cards[o.moved[0]].label} set.`));
    else audio.place();
    if (o.flipped?.length) setTimeout(() => audio.flip(), 120);
    if (o.scored && o.scored.ids.length > this.host.profile.stats.biggestBatch)
      this.host.profile.stats.biggestBatch = o.scored.ids.length;
    if (o.clearedCat)
      (this.host.profile.stats.setsCleared++,
        announce(
          `Set complete: ${this.s.cards.find((a) => a.kind === "cat" && a.cat === o.clearedCat).label}!`,
        ));
    if ((this.render(o), o.clearedFound !== void 0))
      this.sparkle(o.clearedFound);
    if (
      (sdk.track("move", {
        type: t.t === "move" ? `${t.from.z}->${t.to.z}` : t.t,
        batch: o.scored?.ids.length ?? o.moved?.length ?? 0,
        movesLeft: this.s.state.moves,
      }),
      s > 5 && this.s.state.moves === 5)
    )
      audio.lowMoves();
    return (
      this.host.saveSession(),
      this.afterMove(o.clearedCat ? 520 : 280),
      !0
    );
  }
  afterMove(t) {
    let e = this.s.status();
    if (e === "play") {
      if (this.host.tutorial) this.updateCoach();
      return;
    }
    ((this.busy = !0),
      setTimeout(() => {
        if (((this.busy = !1), e === "won")) this.win();
        else if (e === "out") this.outOfMoves();
        else if (e === "deadlock") this.deadlock();
      }, t));
  }
  reject(t, e, s) {
    (audio.error(), this.toast(moveErrors[t]));
    let o =
      s ??
      (e && e.t === "move"
        ? (sourceCards(this.s.state, this.s.cards, e.from) ?? [])
        : []);
    for (let a of o) {
      let i = this.els.get(a);
      if (i)
        (i.classList.remove("shake"), i.offsetWidth, i.classList.add("shake"));
    }
    if (e?.t === "move" && e.to.z === "found" && t === "needCategory") {
      let a = this.slotEls.found[e.to.i];
      (a?.classList.add("target-ok"),
        setTimeout(() => a?.classList.remove("target-ok"), 600));
    }
    sdk.track("invalid_move", {
      reason: t,
    });
  }
  toast(t) {
    ((this.toastEl.textContent = t),
      this.toastEl.classList.add("on"),
      announce(t),
      clearTimeout(this.toastTimer),
      (this.toastTimer = window.setTimeout(
        () => this.toastEl.classList.remove("on"),
        2400,
      )));
  }
  sparkle(t) {
    if (this.host.profile.settings.reducedMotion) return;
    let e = this.L.found[t],
      s = e.x + this.L.cw / 2,
      o = e.y + this.L.ch / 2,
      a = ["#E8A33D", "#FCE7B8", "#5E9C76", "#D9503F", "#3F7FC1"];
    for (let i = 0; i < 18; i++) {
      let r = (i / 18) * Math.PI * 2,
        l = this.L.cw * (0.7 + Math.random() * 0.6),
        c = element("div", {
          class: "spark",
          style: {
            left: `${s}px`,
            top: `${o}px`,
            background: a[i % a.length],
            ["--dx"]: `${Math.cos(r) * l}px`,
            ["--dy"]: `${Math.sin(r) * l}px`,
          },
        });
      (c.style.setProperty("--dx", `${Math.cos(r) * l}px`),
        c.style.setProperty("--dy", `${Math.sin(r) * l}px`),
        this.table.append(c),
        setTimeout(() => c.remove(), 900));
    }
  }
  smartMove(t) {
    let e = this.s.state,
      s = this.s.cards,
      o = sourceCards(e, s, t);
    if (!o) {
      this.reject("covered");
      return;
    }
    let a = s[o[0]],
      i = (d) => !destinationError(e, s, t, o, d),
      r = [];
    (e.found.forEach((d, u) => {
      if (d && isItem(a) && d.cat === a.cat)
        r.push({
          z: "found",
          i: u,
        });
    }),
      e.found.forEach((d, u) => {
        if (!d && a.kind === "cat")
          r.push({
            z: "found",
            i: u,
          });
      }),
      e.cols.forEach((d, u) => {
        let p = d[d.length - 1];
        if (p && isItem(s[p.id]) && s[p.id].cat === a.cat)
          r.push({
            z: "col",
            i: u,
          });
      }),
      e.cols.forEach((d, u) => {
        let p = d[d.length - 1];
        if (p && s[p.id].kind === "wild")
          r.push({
            z: "col",
            i: u,
          });
      }));
    let l = t.z === "col" && t.idx === 0;
    if (!l)
      e.cols.forEach((d, u) => {
        if (!d.length)
          r.push({
            z: "col",
            i: u,
          });
      });
    let c = r.find(i);
    if (c) {
      this.doMove({
        t: "move",
        from: t,
        to: c,
      });
      return;
    }
    if (l) {
      this.toast("That card already has a column to itself.");
      return;
    }
    if (a.kind === "cat") this.reject("slotsFull", void 0, o);
    else if (!e.found.some((d) => d && d.cat === a.cat))
      this.reject("needCategory", void 0, o);
    else this.reject("mismatch", void 0, o);
  }
  onStock() {
    if (this.busy || this.ended) return;
    let t = this.s.state;
    if (t.stock.length)
      this.doMove({
        t: "draw",
      });
    else if (t.waste.length)
      this.doMove({
        t: "recycle",
      });
  }
  hit(t) {
    let e = t.target.closest(".card");
    return e ? Number(e.dataset.id) : null;
  }
  localXY(t) {
    let e = this.table.getBoundingClientRect();
    return {
      x: t.clientX - e.left,
      y: t.clientY - e.top,
    };
  }
  onDown(t) {
    if ((audio.unlock(), this.busy || this.ended || t.button > 0)) return;
    let { x: e, y: s } = this.localXY(t),
      o = this.hit(t);
    if (this.wildMode) {
      this.placeWildAt(e);
      return;
    }
    let a = this.activeHint,
      i = t.target.closest(".hint");
    if (a && a.t === "move" && i) {
      let d = o !== null ? this.locate(o) : null;
      if (!(
        d &&
        ((d.z === "waste" && a.from.z === "waste") ||
          (d.z === "col" && a.from.z === "col" && d.i === a.from.i))
      )) {
        this.doMove(a);
        return;
      }
    }
    if (o === null) {
      if (this.inRect(e, s, this.L.stock)) this.onStock();
      return;
    }
    let r = this.locate(o);
    if (!r) return;
    if (r.z === "stock") {
      this.onStock();
      return;
    }
    if (r.z === "found") return;
    let l;
    if (r.z === "waste") {
      if (r.k !== this.s.state.waste.length - 1) return;
      l = {
        z: "waste",
      };
    } else
      l = {
        z: "col",
        i: r.i,
        idx: r.idx,
      };
    let c = sourceCards(this.s.state, this.s.cards, l);
    if (!c) {
      let d = r.z === "col" ? this.s.state.cols[r.i][r.idx] : null;
      if (d && d.up) this.reject("covered", void 0, [o]);
      return;
    }
    ((this.drag = {
      ids: c,
      src: l,
      x0: e,
      y0: s,
      started: !1,
      valid: [],
      pointerId: t.pointerId,
      loc: r,
    }),
      this.table.setPointerCapture(t.pointerId));
  }
  onMoveP(t) {
    let e = this.drag;
    if (!e || t.pointerId !== e.pointerId) return;
    let { x: s, y: o } = this.localXY(t),
      a = s - e.x0,
      i = o - e.y0;
    if (!e.started) {
      if (Math.hypot(a, i) < 6) return;
      ((e.started = !0),
        audio.pick(),
        (e.valid = [
          ...this.s.state.found.map((r, l) => ({
            z: "found",
            i: l,
          })),
          ...this.s.state.cols.map((r, l) => ({
            z: "col",
            i: l,
          })),
        ].filter(
          (r) => !destinationError(this.s.state, this.s.cards, e.src, e.ids, r),
        )));
      for (let r of e.valid) this.targetEl(r)?.classList.add("target-ok");
      e.ids.forEach((r, l) => {
        let c = this.els.get(r);
        (c.classList.add("dragging"), (c.style.zIndex = String(1000 + l)));
      });
    }
    e.ids.forEach((r) => {
      let l = this.pos.get(r);
      this.place(this.els.get(r), l.x + a, l.y + i - 4);
    });
  }
  onUp(t) {
    let e = this.drag;
    if (!e || t.pointerId !== e.pointerId) return;
    this.drag = null;
    try {
      this.table.releasePointerCapture(t.pointerId);
    } catch {}
    if (!e.started) {
      let r = this.activeHint;
      if (
        r &&
        r.t === "move" &&
        e.ids.some((l) => this.els.get(l)?.classList.contains("hint"))
      ) {
        this.doMove(r);
        return;
      }
      this.smartMove(e.src);
      return;
    }
    this.endDragVisuals(e.ids);
    let { x: s, y: o } = this.localXY(t),
      a = this.dropTarget(s, o, e.ids.length);
    if (!a) {
      this.render();
      return;
    }
    let i = {
      t: "move",
      from: e.src,
      to: a,
    };
    if (!this.doMove(i)) this.render();
  }
  cancelDrag() {
    if (this.drag)
      (this.endDragVisuals(this.drag.ids), (this.drag = null), this.render());
  }
  endDragVisuals(t) {
    (t.forEach((e) => this.els.get(e)?.classList.remove("dragging")),
      this.table
        .querySelectorAll(".target-ok")
        .forEach((e) => e.classList.remove("target-ok")));
  }
  inRect(t, e, s, o = 0, a = this.L.ch) {
    return (
      t >= s.x - o &&
      t <= s.x + this.L.cw + o &&
      e >= s.y - 8 &&
      e <= s.y + a + 8
    );
  }
  dropTarget(t, e, s) {
    let o = this.L.gap / 2;
    for (let a = 0; a < this.L.found.length; a++)
      if (this.inRect(t, e, this.L.found[a], o))
        return {
          z: "found",
          i: a,
        };
    for (let a = 0; a < this.L.cols.length; a++)
      if (this.inRect(t, e, this.L.cols[a], o, this.L.H))
        return {
          z: "col",
          i: a,
        };
    return null;
  }
  targetEl(t) {
    if (t.z === "found") return this.slotEls.found[t.i];
    let e = this.s.state.cols[t.i];
    return e.length ? this.els.get(e[e.length - 1].id) : this.slotEls.cols[t.i];
  }
  paywall(t, e) {
    let s = this.host.profile,
      o = {
        undo: {
          t: "One more undo?",
          cost: economy.undoCost,
          body: `You've used your ${economy.freeUndosPerLevel} free undos for this level.`,
        },
        hint: {
          t: "Need a hint?",
          cost: economy.hintCost,
          body: "A hint lights up a good next move. It costs no moves.",
        },
        wild: {
          t: "Get a Wild Thread",
          cost: economy.wildCost,
          body: "A Wild Thread sits on any column and accepts cards from any set.",
        },
      }[t];
    (sdk.track("booster_paywall", {
      kind: t,
    }),
      modal({
        title: o.t,
        body: element(
          "div",
          {},
          element(
            "p",
            {
              style: {
                margin: "0 0 8px",
              },
            },
            o.body,
          ),
          element(
            "p",
            {
              style: {
                margin: 0,
                color: "var(--ink-2)",
                fontSize: "15px",
              },
            },
            "You have ",
            coinLine(s.coins),
          ),
        ),
        buttons: [
          {
            label: "Watch a video · free",
            kind: "blue",
            icon: "ad",
            onClick: async () => {
              if (await sdk.rewarded(t)) e();
              else
                this.toast(
                  "No video right now — try again soon, or use coins.",
                );
            },
          },
          {
            label: element(
              "span",
              {
                class: "coinline",
              },
              `Use ${o.cost}`,
              icon("coin", ""),
            ),
            kind: "gold",
            disabled: s.coins < o.cost,
            onClick: () => {
              ((s.coins -= o.cost),
                audio.coin(),
                this.host.save(),
                sdk.track("coins_spend", {
                  kind: t,
                  amount: o.cost,
                }),
                e());
            },
          },
          {
            label: "Not now",
            kind: "ghost",
          },
        ],
      }));
  }
  useUndo() {
    if (this.busy || this.ended) return;
    if (!this.s.canUndo()) {
      this.toast("Nothing to undo yet.");
      return;
    }
    let t = () => {
      if (this.s.undo().wildRefund)
        (this.host.profile.wilds++, this.host.save());
      if (
        (audio.place(),
        this.render(),
        this.host.saveSession(),
        announce("Move undone."),
        sdk.track("booster_use", {
          kind: "undo",
        }),
        this.host.tutorial)
      )
        this.updateCoach();
    };
    if (this.s.freeUndos > 0) (this.s.freeUndos--, t());
    else this.paywall("undo", () => t());
  }
  useHint() {
    if (this.busy || this.ended) return;
    let t = this.s.hint();
    if (!t) {
      this.toast("No moves to suggest — try Undo or a Wild Thread.");
      return;
    }
    let e = this.host.profile,
      s = () => {
        (this.s.hints++,
          this.showHint(t),
          audio.hint(),
          sdk.track("booster_use", {
            kind: "hint",
          }));
      };
    if (e.hints > 0) (e.hints--, this.host.save(), s());
    else this.paywall("hint", () => s());
  }
  showHint(t, e = !1) {
    (this.clearHint(), (this.activeHint = t));
    let s = (o) => o?.classList.add("hint");
    if (t.t !== "move") {
      s(this.slotEls.stock);
      let o = this.s.state.stock[this.s.state.stock.length - 1];
      if (o !== void 0) s(this.els.get(o));
    } else
      ((sourceCards(this.s.state, this.s.cards, t.from) ?? []).forEach((o) =>
        s(this.els.get(o)),
      ),
        s(this.targetEl(t.to)));
    if (!e) this.hintTimer = window.setTimeout(() => this.clearHint(), 3500);
  }
  clearHint() {
    (clearTimeout(this.hintTimer),
      (this.activeHint = null),
      this.table
        .querySelectorAll(".hint")
        .forEach((t) => t.classList.remove("hint")));
  }
  useWild() {
    if (this.busy || this.ended) return;
    if (!this.wildUnlocked()) {
      this.toast(`Wild Thread unlocks at Level ${economy.wildUnlockLevel}.`);
      return;
    }
    if (this.wildMode) {
      this.exitWildMode();
      return;
    }
    let t = this.s.state.cols
      .map((o, a) => a)
      .filter((o) => this.s.canPlaceWild(o));
    if (!t.length) {
      this.toast(
        "A Wild Thread needs a word or picture card on top of a column.",
      );
      return;
    }
    let e = this.host.profile,
      s = () => {
        ((this.wildMode = !0),
          this.updateHud(),
          t.forEach((o) =>
            this.targetEl({
              z: "col",
              i: o,
            })?.classList.add("target-ok"),
          ),
          (this.bannerEl = element(
            "div",
            {
              class: "banner",
            },
            "Tap a column for your Wild Thread",
            element(
              "button",
              {
                onclick: (o) => {
                  (o.stopPropagation(), this.exitWildMode());
                },
              },
              "Cancel",
            ),
          )),
          this.table.append(this.bannerEl));
      };
    if (e.wilds > 0) s();
    else
      this.paywall("wild", () => {
        (e.wilds++, this.host.save(), s());
      });
  }
  exitWildMode() {
    ((this.wildMode = !1),
      this.bannerEl?.remove(),
      (this.bannerEl = null),
      this.table
        .querySelectorAll(".target-ok")
        .forEach((t) => t.classList.remove("target-ok")),
      this.updateHud());
  }
  placeWildAt(t) {
    let e = this.L.cols.findIndex(
      (o) => t >= o.x - this.L.gap / 2 && t <= o.x + this.L.cw + this.L.gap / 2,
    );
    if (e < 0 || !this.s.canPlaceWild(e)) {
      this.toast("Pick a column with a word or picture card on top.");
      return;
    }
    if (this.s.placeWild(e) === null) return;
    (this.host.profile.wilds--,
      this.host.save(),
      this.exitWildMode(),
      audio.seat(),
      this.render(),
      this.host.saveSession(),
      sdk.track("booster_use", {
        kind: "wild",
      }),
      announce("Wild Thread placed. Any word or picture card can go on it."));
  }
  stops() {
    let t = [
      {
        kind: "stock",
        i: 0,
      },
      {
        kind: "waste",
        i: 0,
      },
    ];
    return (
      this.s.state.found.forEach((e, s) =>
        t.push({
          kind: "found",
          i: s,
        }),
      ),
      this.s.state.cols.forEach((e, s) =>
        t.push({
          kind: "col",
          i: s,
        }),
      ),
      t
    );
  }
  onKey(t) {
    if (document.querySelector(".scrim, .adscrim")) return;
    let e = t.key.toLowerCase();
    if (e === "h") {
      this.useHint();
      return;
    }
    if (e === "z" || e === "backspace") {
      (t.preventDefault(), this.useUndo());
      return;
    }
    if (e === "w") {
      this.useWild();
      return;
    }
    if (e === "escape") {
      if (this.wildMode) this.exitWildMode();
      else this.pauseMenu();
      return;
    }
    if (e === "d") {
      this.onStock();
      return;
    }
    let s = this.stops();
    if (
      [
        "arrowleft",
        "arrowright",
        "tab",
        "arrowup",
        "arrowdown",
        "enter",
        " ",
      ].includes(e)
    ) {
      if (
        document.activeElement !== this.table &&
        !this.table.contains(document.activeElement)
      ) {
        if (e === "tab") return;
        this.table.focus();
      }
      if (
        (t.preventDefault(), e === "arrowright" || (e === "tab" && !t.shiftKey))
      )
        ((this.focus.stop = (this.focus.stop + 1) % s.length),
          (this.focus.depth = 0));
      if (e === "arrowleft" || (e === "tab" && t.shiftKey))
        ((this.focus.stop = (this.focus.stop - 1 + s.length) % s.length),
          (this.focus.depth = 0));
      let o = s[this.focus.stop];
      if (o.kind === "col" && (e === "arrowup" || e === "arrowdown")) {
        let a = this.s.state.cols[o.i],
          i = movableStart(this.s.state, this.s.cards, o.i),
          r = i < 0 ? 0 : a.length - 1 - i;
        this.focus.depth = Math.max(
          0,
          Math.min(r, this.focus.depth + (e === "arrowup" ? 1 : -1)),
        );
      }
      if (e === "enter" || e === " ") {
        if (this.wildMode && o.kind === "col") {
          this.placeWildAt(this.L.cols[o.i].x + 1);
          return;
        }
        if (o.kind === "stock") this.onStock();
        else if (o.kind === "waste") {
          if (this.s.state.waste.length)
            this.smartMove({
              z: "waste",
            });
        } else if (o.kind === "col") {
          let a = this.s.state.cols[o.i];
          if (a.length)
            this.smartMove({
              z: "col",
              i: o.i,
              idx: a.length - 1 - this.focus.depth,
            });
        }
        this.focus.depth = 0;
      }
      this.updateFocusRing(!0);
    }
  }
  updateFocusRing(t = !1) {
    if (t) this.focusRing.classList.add("on");
    if (!this.focusRing.classList.contains("on") || !this.L) return;
    let e = this.stops()[this.focus.stop],
      { cw: s, ch: o } = this.L,
      a = 0,
      i = 0,
      r = o,
      l = "";
    if (e.kind === "stock")
      ((a = this.L.stock.x),
        (i = this.L.stock.y),
        (l = `Deck, ${this.s.state.stock.length} cards`));
    else if (e.kind === "waste") {
      let c = this.s.state.waste[this.s.state.waste.length - 1],
        d = c !== void 0 ? this.pos.get(c) : null;
      ((a = d?.x ?? this.L.waste.x),
        (i = d?.y ?? this.L.waste.y),
        (l =
          c !== void 0
            ? `Drawn card: ${this.describe(this.s.cards[c])}`
            : "Drawn pile empty"));
    } else if (e.kind === "found") {
      ((a = this.L.found[e.i].x), (i = this.L.found[e.i].y));
      let c = this.s.state.found[e.i];
      l = c
        ? `${this.s.cards[c.catCard].label} set, ${c.count} of ${c.total}`
        : "Empty set slot";
    } else {
      let c = this.s.state.cols[e.i],
        d = Math.max(0, c.length - 1 - this.focus.depth),
        u = c[d]?.id,
        p = u !== void 0 ? this.pos.get(u) : null;
      ((a = p?.x ?? this.L.cols[e.i].x), (i = p?.y ?? this.L.cols[e.i].y));
      let x = c.length ? this.pos.get(c[c.length - 1].id) : null;
      ((r = x ? x.y + o - i : o),
        (l =
          u !== void 0
            ? `Column ${e.i + 1}: ${c
                .slice(d)
                .map((f) => this.describe(this.s.cards[f.id]))
                .join(", ")}`
            : `Column ${e.i + 1}, empty`));
    }
    if (
      (Object.assign(this.focusRing.style, {
        left: `${a - 5}px`,
        top: `${i - 5}px`,
        width: `${s + 10}px`,
        height: `${r + 10}px`,
      }),
      t)
    )
      announce(l);
  }
  updateCoach() {
    if (!this.host.tutorial || this.ended) return;
    let t = this.s.hint(),
      e = "Tap the glowing card.";
    if (!t) e = "Use Undo to step back.";
    else if (t.t === "draw")
      e =
        "Need more cards? Tap the deck to draw one. Every action costs 1 move.";
    else if (t.t === "recycle")
      e = "The deck is empty. Tap it to turn the drawn pile back over.";
    else if (t.to.z === "found" && !this.s.state.found[t.to.i])
      e =
        "This floral card names a category. Tap it to start a set in the set slots.";
    else if (t.to.z === "found")
      e =
        "This card shares the thread. Tap it to add it to its set. Fill a set to clear it.";
    else if (t.to.z === "col")
      e =
        "Cards from the same set can stack. A whole stack moves for just 1 move.";
    if (
      this.s.state.cleared.length &&
      t?.t === "move" &&
      t.to.z === "found" &&
      this.s.state.found[t.to.i]
    )
      e = "Set complete frees the slot. Keep going — add the next card.";
    if (!this.coachEl)
      ((this.coachEl = element(
        "div",
        {
          class: "coach",
          role: "note",
        },
        element("i", {
          class: "ci",
          html: icons.spool,
        }),
        element("span", {}),
      )),
        this.table.append(this.coachEl));
    if (((this.coachEl.lastChild.textContent = e), t)) this.showHint(t, !0);
    sdk.track("tutorial_step", {
      step: this.s.state.movesUsed,
      hint: t?.t ?? "none",
    });
  }
  toggleSound() {
    let t = this.host.profile;
    ((t.settings.sfx = !t.settings.sfx),
      (t.settings.music = t.settings.sfx),
      audio.unlock(),
      audio.setSfx(t.settings.sfx),
      audio.setMusic(t.settings.music),
      this.host.save(),
      (this.hud.sound.innerHTML = t.settings.sfx
        ? (icons.sound ?? "")
        : (icons.mute ?? "")));
  }
  pauseMenu() {
    (sdk.gameplayStop(),
      modal({
        title: "Paused",
        body: "Take your time. Your table is saved.",
        onClose: () => sdk.gameplayStart(),
        buttons: [
          {
            label: "Resume",
            icon: "play",
          },
          {
            label: "Restart level",
            kind: "gold",
            onClick: () => {
              ((this.host.profile.streak = 0),
                this.host.save(),
                sdk.track("level_restart", {}),
                this.host.onRetry());
            },
          },
          {
            label: "Home",
            kind: "light",
            icon: "home",
            onClick: () => {
              this.host.onExit();
            },
          },
        ],
      }));
  }
  outOfMoves() {
    (sdk.gameplayStop(), audio.outOfMoves());
    let t =
        this.s.cards.filter((i) => isItem(i)).length -
        this.countScoredOrCleared(),
      e = this.host.profile,
      s = this.s.rescues < economy.maxRescues;
    sdk.track("rescue_offer", {
      rescue: this.s.rescues + 1,
    });
    let o = () => {
        (this.s.rescues++,
          this.s.addMoves(economy.rescueMoves),
          this.render(),
          this.host.saveSession(),
          sdk.track("rescue_accept", {
            n: this.s.rescues,
          }),
          sdk.gameplayStart(),
          this.toast(`+${economy.rescueMoves} moves. You've got this.`));
      },
      a = element(
        "div",
        {},
        element(
          "p",
          {
            style: {
              margin: "0 0 10px",
            },
          },
          `You're ${t} card${t === 1 ? "" : "s"} from finishing, with ${this.s.setsLeft} set${this.s.setsLeft === 1 ? "" : "s"} to go.`,
        ),
        s
          ? element(
              "p",
              {
                style: {
                  margin: 0,
                  color: "var(--ink-2)",
                  fontSize: "15px",
                },
              },
              `Extra moves ${this.s.rescues + 1} of ${economy.maxRescues} · You have `,
              coinLine(e.coins),
            )
          : element("p", {}, "That was the last top-up for this attempt."),
      );
    modal({
      title: "Out of moves",
      body: a,
      dismissible: !1,
      buttons: s
        ? [
            {
              label: `Watch a video · +${economy.rescueMoves} moves`,
              kind: "blue",
              icon: "ad",
              onClick: async () => {
                if (await sdk.rewarded("rescue")) o();
                else
                  (this.toast("No video right now — try coins or try again."),
                    this.outOfMoves());
              },
            },
            {
              label: element(
                "span",
                {
                  class: "coinline",
                },
                `+${economy.rescueMoves} moves for ${economy.rescueCost}`,
                icon("coin", ""),
              ),
              kind: "gold",
              disabled: e.coins < economy.rescueCost,
              onClick: () => {
                ((e.coins -= economy.rescueCost),
                  audio.coin(),
                  this.host.save(),
                  o());
              },
            },
            {
              label: "Try again",
              kind: "ghost",
              onClick: () => this.fail(),
            },
          ]
        : [
            {
              label: "Try again",
              onClick: () => this.fail(),
            },
            {
              label: "Home",
              kind: "light",
              onClick: () => {
                this.fail(!0);
              },
            },
          ],
    });
  }
  countScoredOrCleared() {
    let t = 0;
    for (let e of this.s.state.found) if (e) t += e.count;
    for (let e of this.s.state.cleared)
      t += this.s.cards.filter((s) => isItem(s) && s.cat === e).length;
    return t;
  }
  fail(t = !1) {
    this.ended = !0;
    let e = this.host.profile;
    if (
      (sdk.track("level_fail", {
        key: this.s.def.key,
        rescues: this.s.rescues,
        setsLeft: this.s.setsLeft,
      }),
      (e.streak = 0),
      this.host.save(),
      this.host.clearSession(),
      t)
    )
      this.host.onExit();
    else this.host.onRetry();
  }
  deadlock() {
    sdk.track("deadlock", {
      key: this.s.def.key,
    });
    let t = [
      {
        label: "Undo last move",
        icon: "undo",
        onClick: () => this.useUndo(),
      },
      ...(this.wildUnlocked()
        ? [
            {
              label: "Use a Wild Thread",
              kind: "blue",
              icon: "wild",
              onClick: () => this.useWild(),
            },
          ]
        : []),
      {
        label: "Restart (free)",
        kind: "light",
        onClick: () => {
          (this.host.clearSession(), this.host.onRetry());
        },
      },
    ];
    modal({
      title: "No moves on the table",
      body: "Nothing can be played right now. Step back, place a Wild Thread, or start this deal fresh.",
      buttons: t,
    });
  }
  win() {
    ((this.ended = !0), sdk.gameplayStop(), audio.win());
    let t = this.host.profile;
    (t.streak++,
      (t.bestStreak = Math.max(t.bestStreak, t.streak)),
      t.stats.wins++);
    let e = streakBonus(t.streak),
      s = this.s.payout(e?.coinBonus ?? 0);
    if (
      ((t.coins += s),
      this.host.save(),
      this.host.clearSession(),
      sdk.track("level_win", {
        key: this.s.def.key,
        movesLeft: this.s.state.moves,
        movesUsed: this.s.state.movesUsed,
        par: this.s.def.par,
        rescues: this.s.rescues,
        hints: this.s.hints,
        payout: s,
      }),
      this.coachEl)
    )
      (this.coachEl.remove(), (this.coachEl = null));
    this.clearHint();
    let o = !1,
      a = element("b", {}, `+${s}`),
      i = element(
        "div",
        {},
        element(
          "div",
          {
            class: "stats",
          },
          element(
            "div",
            {
              class: "stat",
            },
            element("b", {}, String(this.s.state.moves)),
            element("span", {}, "moves left"),
          ),
          element(
            "div",
            {
              class: "stat",
            },
            element("b", {}, String(this.s.totalSets)),
            element("span", {}, "sets tied off"),
          ),
          element(
            "div",
            {
              class: "stat",
            },
            element(
              "span",
              {
                class: "coinline",
                style: {
                  fontSize: "26px",
                },
              },
              icon("coin", ""),
              a,
            ),
            element(
              "span",
              {},
              e?.coinBonus
                ? `coins (+${Math.round(e.coinBonus * 100)}% streak)`
                : "coins",
            ),
          ),
          element(
            "div",
            {
              class: "stat",
            },
            element("b", {}, String(t.streak)),
            element("span", {}, "win streak"),
          ),
        ),
        element(
          "p",
          {
            style: {
              margin: "4px 0 0",
              fontSize: "15px",
              color: "var(--ink-2)",
            },
          },
          this.nextStreakText(t.streak),
        ),
      ),
      r = modal({
        title: this.host.tutorial ? "You've got it!" : "Nicely done!",
        body: i,
        dismissible: !1,
        buttons: [
          {
            label: "Double coins · watch a video",
            kind: "blue",
            icon: "ad",
            keepOpen: !0,
            onClick: async () => {
              if (o) return;
              if (await sdk.rewarded("double_coins"))
                ((o = !0),
                  (t.coins += s),
                  this.host.save(),
                  (a.textContent = `+${s * 2}`),
                  audio.coin(),
                  this.updateHud(),
                  document
                    .querySelector(".modal .btn.blue")
                    ?.setAttribute("disabled", ""));
            },
          },
          {
            label: this.host.nextLabel,
            icon: "play",
            onClick: () => {
              (r(), this.host.onWin(s, o), this.host.onNext());
            },
          },
          {
            label: "Home",
            kind: "light",
            onClick: () => {
              (this.host.onWin(s, o), this.host.onExit());
            },
          },
        ],
      });
    this.updateHud();
  }
  nextStreakText(t) {
    let e = [...economy.streak].reverse().find((s) => s.wins > t);
    if (!e)
      return "Top streak bonus active: +8 moves and +25% coins every level.";
    return `${e.wins - t} more win${e.wins - t === 1 ? "" : "s"} in a row for +${e.moves} bonus moves${e.coinBonus ? ` and +${Math.round(e.coinBonus * 100)}% coins` : ""}.`;
  }
}
export { GameBoard };
