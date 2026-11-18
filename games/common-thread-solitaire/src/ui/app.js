import {
  loadProfile,
  saveProfile,
  dateKey,
  loadSession,
  saveSession,
  resetProgress,
} from "../storage.js";
import { audio } from "../audio.js";
import { sdk, telemetry } from "../platform/sdk.js";
import { mockAd, element, icon, modal, coinLine } from "../ui/dom.js";
import { icons } from "../assets.js";
import { campaign, campaignDeals } from "../content/campaign.js";
import { economy, streakBonus } from "../content/economy.js";
import { dailyLevel, difficulties, quickLevel } from "../engine/generator.js";
import { GameSession } from "../engine/session.js";
import { GameBoard } from "../ui/board.js";

var room = {
    name: "The Sunroom",
    blurb: "Rooms of the House · Room 1 of 5",
  },
  chests = {
    5: {
      coins: 200,
      hints: 0,
      wilds: 1,
    },
    10: {
      coins: 500,
      hints: 2,
      wilds: 0,
    },
  };
class GameApp {
  root;
  profile;
  board = null;
  constructor(t) {
    if (
      ((this.root = t),
      (this.profile = loadProfile()),
      audio.setSfx(this.profile.settings.sfx),
      audio.setMusic(this.profile.settings.music),
      sdk.setAdPresenter(mockAd),
      sdk.setMuteHook((e) => audio.setAdMute(e)),
      document.body.classList.toggle(
        "large-print",
        this.profile.settings.largePrint,
      ),
      window.addEventListener("pointerdown", () => audio.unlock(), {
        once: !0,
      }),
      window.addEventListener("keydown", () => audio.unlock(), {
        once: !0,
      }),
      /[?&]debug=1/.test(location.search))
    )
      (this.debugPanel(), (window.__ct = this));
    (sdk.gameReady(), this.title());
  }
  save() {
    saveProfile(this.profile);
  }
  clear() {
    (this.board?.destroy(),
      (this.board = null),
      (this.root.innerHTML = ""),
      document.querySelectorAll(".scrim").forEach((t) => t.remove()));
  }
  topbar(t, e) {
    return element(
      "div",
      {
        class: "topbar",
      },
      e
        ? element("button", {
            class: "iconbtn",
            "aria-label": "Back",
            html: icons.home,
            onclick: () => {
              (audio.click(), e());
            },
          })
        : null,
      element("h2", {}, t),
      element("div", {
        class: "spacer",
      }),
      element(
        "div",
        {
          class: "coins",
        },
        icon("coin", ""),
        element("span", {}, String(this.profile.coins)),
      ),
      element("button", {
        class: "iconbtn",
        "aria-label": "Settings",
        html: icons.gear,
        onclick: () => this.settings(),
      }),
    );
  }
  title() {
    this.clear();
    let t = this.profile,
      e = Math.min(t.journeyLevel, campaign.length),
      s = dateKey(),
      o = t.daily[s]?.done,
      a = element(
        "div",
        {
          class: "fan",
          "aria-hidden": "true",
        },
        ...[
          ["Waltz", -24, "#FFFDF8"],
          ["TEA TIME", -8, "#F1DFBF"],
          ["Scone", 8, "#FFFDF8"],
          ["", 24, "#B5452B"],
        ].map(([r, l, c]) =>
          element(
            "div",
            {
              class: "mini",
              style: {
                transform: `translateX(-50%) rotate(${l}deg)`,
                background: String(c),
                color: "#1F2933",
                border:
                  c === "#F1DFBF" ? "2px dashed #E8A33D" : "1px solid #E4DDD0",
              },
            },
            String(r),
          ),
        ),
      ),
      i = element(
        "div",
        {
          class: "screen linen",
        },
        this.topbar(""),
        element("div", {
          class: "logo",
          html: logo,
          role: "img",
          "aria-label": "Common Thread Solitaire",
        }),
        element(
          "p",
          {
            class: "tagline",
          },
          "Find the common thread.",
        ),
        a,
        element(
          "div",
          {
            class: "menu",
            style: {
              marginTop: "22px",
            },
          },
          element(
            "button",
            {
              class: "btn",
              onclick: () => {
                (audio.unlock(), audio.click(), this.journey());
              },
            },
            icon("play"),
            element(
              "span",
              {},
              `Play · Level ${e}`,
              element("small", {}, room.name),
            ),
          ),
          element(
            "button",
            {
              class: "dailycard",
              onclick: () => {
                (audio.unlock(), audio.click(), this.daily());
              },
            },
            icon("calendar", ""),
            element(
              "span",
              {},
              element("b", {}, "Daily Puzzle"),
              o ? "Stitched today — see your quilt" : "A fresh deal every day",
            ),
          ),
          element(
            "button",
            {
              class: "btn blue",
              onclick: () => {
                (audio.unlock(), audio.click(), this.quick());
              },
            },
            icon("shuffle"),
            "Quick Play",
          ),
          element(
            "button",
            {
              class: "btn light",
              onclick: () => this.howTo(),
            },
            "How to play",
          ),
        ),
        element(
          "p",
          {
            class: "footnote",
          },
          "Vertical slice v0.1 · Arkadium · Ads and cloud save are simulated",
        ),
      );
    this.root.append(i);
  }
  journey() {
    this.clear();
    let t = this.profile,
      e = element("div", {
        class: "path",
      }),
      s = campaign.length * 110;
    ((e.innerHTML = `<svg class="thread" viewBox="0 0 420 ${s}" preserveAspectRatio="none"><path d="${campaign.map((o, a) => (a === 0 ? "M120 42" : `C${(a - 1) % 2 ? 300 : 120} ${a * 110 - 20} ${a % 2 ? 300 : 120} ${a * 110 - 20} ${a % 2 ? 300 : 120} ${a * 110 + 42}`)).join(" ")}" fill="none" stroke="#E8A33D" stroke-width="4" stroke-dasharray="10 8" opacity=".75"/></svg>`),
      campaign.forEach((o, a) => {
        let i = o.n,
          r = i <= t.journeyLevel || t.settings.reviewMode,
          l = i < t.journeyLevel || t.journeyStars[`j${i}`] !== void 0,
          c = !r
            ? "locked"
            : i === t.journeyLevel
              ? "current"
              : l
                ? "done"
                : "",
          d = element(
            "button",
            {
              class: `node ${c}`,
              style: {
                transform: `translateX(${a % 2 ? 90 : -90}px)`,
              },
              "aria-label": `Level ${i}${!r ? ", locked" : l ? ", complete" : ""}. ${o.teaches}`,
              title: o.teaches,
              onclick: () => {
                if (!r) {
                  audio.error();
                  return;
                }
                (audio.click(), this.startJourney(i));
              },
            },
            r
              ? String(i)
              : element("i", {
                  class: "lk",
                  html: icons.lock,
                }),
            o.chest
              ? element("i", {
                  class: "chest",
                  html: icons.chest,
                })
              : null,
            t.journeyStars[`j${i}`] !== void 0
              ? element(
                  "span",
                  {
                    class: "best",
                  },
                  `best: ${t.journeyStars[`j${i}`]} left`,
                )
              : null,
          );
        e.append(d);
      }),
      this.root.append(
        element(
          "div",
          {
            class: "screen linen",
          },
          this.topbar("Journey", () => this.title()),
          element(
            "div",
            {
              class: "room",
            },
            element("h3", {}, room.name),
            element("p", {}, room.blurb),
          ),
          e,
          element(
            "p",
            {
              class: "footnote",
            },
            "The Kitchen Table, The Library, The Garden Porch and The Attic are coming in production.",
          ),
        ),
      ));
  }
  journeyDef(t) {
    let e = campaign[t - 1],
      s = campaignDeals[t - 1];
    return {
      key: `j${t}`,
      mode: "journey",
      title: `Level ${t}`,
      board: e.board,
      sets: e.sets,
      mu: e.mu,
      seed: s.seed,
      par: s.par,
      budget: s.budget,
    };
  }
  startJourney(t) {
    let e = this.journeyDef(t);
    this.play(e, {
      levelNumber: t,
      subtitle: `${room.name} · ${campaign[t - 1].teaches}`,
      tutorial: t === 1 && !this.profile.tutorialDone,
      nextLabel:
        t < campaign.length ? `Next · Level ${t + 1}` : "Back to the Journey",
      onWin: () => {
        let s = this.profile,
          o = s.journeyStars[e.key],
          a = o === void 0;
        if (
          ((s.journeyStars[e.key] = Math.max(o ?? 0, this.board.s.state.moves)),
          t >= s.journeyLevel)
        )
          s.journeyLevel = Math.min(t + 1, campaign.length + 1);
        if (t === 1) s.tutorialDone = !0;
        this.save();
        let i = chests[t];
        if (i && a)
          ((s.coins += i.coins),
            (s.hints += i.hints),
            (s.wilds += i.wilds),
            this.save(),
            audio.coin(),
            sdk.track("chest_claim", {
              source: `journey_${t}`,
            }),
            modal({
              title: "Room chest!",
              body: element(
                "div",
                {},
                element(
                  "p",
                  {},
                  t === 5
                    ? "You unlocked the Wild Thread. It sits on any column and takes cards from any set."
                    : "You finished The Sunroom. More rooms are on the way.",
                ),
                element(
                  "p",
                  {},
                  coinLine(`+${i.coins}`),
                  i.wilds ? `  · +${i.wilds} Wild Thread` : "",
                  i.hints ? `  · +${i.hints} Hints` : "",
                ),
              ),
              buttons: [
                {
                  label: "Lovely",
                },
              ],
            }));
      },
      onNext: () => {
        if (t < campaign.length) this.startJourney(t + 1);
        else this.journey();
      },
      onExit: () => this.journey(),
    });
  }
  daily() {
    this.clear();
    let t = this.profile,
      e = new Date(),
      s = e.getFullYear(),
      o = e.getMonth(),
      a = new Date(s, o + 1, 0).getDate(),
      i = new Date(s, o, 1).getDay(),
      r = `${s}-${String(o + 1).padStart(2, "0")}`,
      l = Array.from(
        {
          length: a,
        },
        (f, w) => t.daily[`${r}-${String(w + 1).padStart(2, "0")}`]?.done,
      ).filter(Boolean).length,
      c = element(
        "div",
        {
          class: "quilt",
          role: "grid",
          "aria-label": "Monthly quilt",
        },
        ...["S", "M", "T", "W", "T", "F", "S"].map((f) =>
          element(
            "div",
            {
              class: "dow",
            },
            f,
          ),
        ),
      );
    for (let f = 0; f < i; f++)
      c.append(
        element("div", {
          class: "patch blank",
        }),
      );
    for (let f = 1; f <= a; f++) {
      let w = `${r}-${String(f).padStart(2, "0")}`,
        k = t.daily[w]?.done,
        T = f === e.getDate(),
        P = f > e.getDate(),
        O = k ? `done f${(f * 7) % 6}` : T ? "today" : P ? "future" : "missed";
      c.append(
        element(
          "button",
          {
            class: `patch ${O}`,
            "aria-label": `${w}${k ? ", stitched" : T ? ", today" : P ? ", not yet" : ", missed — replay"}`,
            onclick: () => this.dailyTap(w, f, e.getDate(), !!k, P),
          },
          String(f),
        ),
      );
    }
    let d = economy.dailyChests.map((f, w) => ({
        ...f,
        need: f.days || a,
        i: w,
      })),
      u = t.dailyChests[r] ?? [],
      p = element(
        "div",
        {
          class: "mtrack",
        },
        element("b", {
          style: {
            width: `${Math.min(100, (l / a) * 100)}%`,
          },
        }),
        ...d.map((f) => {
          let w = l >= f.need && !u.includes(f.i);
          return element(
            "button",
            {
              class: `mstop ${w ? "ready" : ""} ${u.includes(f.i) ? "claimed" : ""}`,
              style: {
                left: `${(f.need / a) * 100}%`,
              },
              "aria-label": `${f.label}: ${f.need} days${w ? ", ready to open" : ""}`,
              onclick: () => this.claimChest(r, f.i, w, f),
            },
            element("i", {
              html: icons.chest,
            }),
            element("span", {}, f.days ? `${f.need} days` : "Full quilt"),
          );
        }),
      ),
      x = t.daily[dateKey()]?.done;
    this.root.append(
      element(
        "div",
        {
          class: "screen linen",
        },
        this.topbar("Daily Puzzle", () => this.title()),
        element(
          "div",
          {
            class: "quiltwrap",
          },
          element(
            "h3",
            {},
            e.toLocaleString(void 0, {
              month: "long",
              year: "numeric",
            }),
          ),
          element(
            "p",
            {
              style: {
                textAlign: "center",
                margin: "0 0 6px",
                color: "var(--thread-light)",
              },
            },
            `Every puzzle you solve stitches a patch into this month's quilt. ${l} of ${a} stitched.`,
          ),
          element(
            "div",
            {
              class: "milestones",
            },
            p,
          ),
          c,
          element(
            "div",
            {
              class: "legend",
            },
            element(
              "span",
              {},
              "Dashed: missed — yesterday is free, older days cost 1 video or 150 coins",
            ),
          ),
          element(
            "div",
            {
              class: "menu",
              style: {
                margin: "16px auto 0",
              },
            },
            x
              ? element(
                  "button",
                  {
                    class: "btn light",
                    disabled: !0,
                  },
                  "Today is stitched — see you tomorrow",
                )
              : element(
                  "button",
                  {
                    class: "btn",
                    onclick: () => this.startDaily(dateKey()),
                  },
                  icon("play"),
                  "Play today's puzzle",
                ),
          ),
        ),
      ),
    );
  }
  dailyTap(t, e, s, o, a) {
    if (a) {
      audio.error();
      return;
    }
    if (o) {
      this.toastScreen("Already stitched into your quilt.");
      return;
    }
    if (e === s || e === s - 1) {
      this.startDaily(t);
      return;
    }
    let i = this.profile;
    modal({
      title: "Replay a missed day",
      body: "Older days can be unlocked to finish your quilt.",
      buttons: [
        {
          label: "Watch a video",
          kind: "blue",
          icon: "ad",
          onClick: async () => {
            if (await sdk.rewarded("daily_archive")) this.startDaily(t);
          },
        },
        {
          label: element(
            "span",
            {
              class: "coinline",
            },
            `Unlock for ${economy.archiveCost}`,
            icon("coin", ""),
          ),
          kind: "gold",
          disabled: i.coins < economy.archiveCost,
          onClick: () => {
            ((i.coins -= economy.archiveCost), this.save(), this.startDaily(t));
          },
        },
        {
          label: "Not now",
          kind: "ghost",
        },
      ],
    });
  }
  claimChest(t, e, s, o) {
    if (!s) {
      this.toastScreen(`${o.label}: stitch ${o.need} days this month to open.`);
      return;
    }
    let a = this.profile;
    ((a.coins += o.coins),
      (a.hints += o.hints),
      (a.wilds += o.wilds),
      (a.dailyChests[t] = [...(a.dailyChests[t] ?? []), e]),
      this.save(),
      audio.coin(),
      sdk.track("chest_claim", {
        source: `daily_${e}`,
      }),
      modal({
        title: o.label,
        body: element(
          "p",
          {},
          coinLine(`+${o.coins}`),
          `  · +${o.hints} Hints · +${o.wilds} Wild Thread`,
        ),
        buttons: [
          {
            label: "Lovely",
            onClick: () => this.daily(),
          },
        ],
      }));
  }
  startDaily(t) {
    let e = dailyLevel(t);
    this.play(e, {
      levelNumber: 0,
      subtitle: t === dateKey() ? "Today's puzzle" : `Puzzle for ${t}`,
      tutorial: !1,
      nextLabel: "See my quilt",
      onWin: () => {
        ((this.profile.daily[t] = {
          done: !0,
          movesLeft: this.board.s.state.moves,
        }),
          this.save(),
          sdk.track("daily_complete", {
            date: t,
          }));
      },
      onNext: () => this.daily(),
      onExit: () => this.daily(),
    });
  }
  quick() {
    this.clear();
    let t = {
        casual: ["Six sets, roomy move budget, no tricky double meanings.", 1],
        standard: ["Nine sets. A steady, satisfying table.", 2],
        expert: ["Twelve sets and tight moves. Plan every stack.", 3],
      },
      e = element(
        "div",
        {
          class: "tiers",
        },
        ...Object.keys(difficulties).map((s) =>
          element(
            "button",
            {
              class: "tier",
              onclick: () => {
                (audio.click(), this.startQuick(s));
              },
            },
            element(
              "div",
              {
                class: "dots3",
              },
              ...[1, 2, 3].map((o) =>
                element("span", {
                  class: o <= t[s][1] ? "on" : "",
                }),
              ),
            ),
            element(
              "div",
              {},
              element("b", {}, difficulties[s].label),
              t[s][0],
            ),
            element("i", {
              class: "go",
              html: icons.play,
            }),
          ),
        ),
      );
    this.root.append(
      element(
        "div",
        {
          class: "screen linen",
        },
        this.topbar("Quick Play", () => this.title()),
        element(
          "p",
          {
            style: {
              color: "var(--thread-light)",
              maxWidth: "520px",
              textAlign: "center",
            },
          },
          "A fresh deal every time. Every deal is checked by our solver, so it can always be won without helpers.",
        ),
        e,
      ),
    );
  }
  startQuick(t) {
    let e = quickLevel(t, (Math.random() * 2147483648) >>> 0);
    this.play(e, {
      levelNumber: 0,
      subtitle: `${e.sets.length} sets`,
      tutorial: !1,
      nextLabel: "New deal",
      onWin: () => {},
      onNext: () => this.startQuick(t),
      onExit: () => this.quick(),
    });
  }
  play(t, e) {
    this.clear();
    let s = loadSession(),
      o;
    if (s && s.def.key === t.key) o = GameSession.restore(s);
    else {
      let i = streakBonus(this.profile.streak);
      ((o = new GameSession(t, i?.moves ?? 0)),
        this.profile.stats.gamesStarted++,
        this.save(),
        sdk.track("level_start", {
          key: t.key,
          mode: t.mode,
          budget: o.startBudget,
          par: t.par,
          streakBonus: i?.moves ?? 0,
        }));
    }
    let a = {
      profile: this.profile,
      save: () => this.save(),
      saveSession: () => saveSession(o.save()),
      clearSession: () => saveSession(null),
      levelNumber: e.levelNumber,
      title: t.title,
      subtitle: e.subtitle,
      tutorial: e.tutorial,
      nextLabel: e.nextLabel,
      onExit: () => e.onExit(),
      onWin: () => e.onWin(),
      onRetry: () => {
        (saveSession(null), this.play(t, e));
      },
      onNext: async () => {
        (await sdk.interstitial("next_level", e.levelNumber), e.onNext());
      },
    };
    if (
      ((this.board = new GameBoard(this.root, o, a)),
      o.bonusMoves && o.history.length === 0)
    )
      this.board.toast(`Win streak bonus: +${o.bonusMoves} moves`);
    if (e.tutorial && o.history.length === 0) this.howTo();
  }
  howTo() {
    let t = (e, s) =>
      element(
        "div",
        {
          class: "step",
        },
        element(
          "span",
          {
            class: "n",
          },
          e,
        ),
        element("span", {}, s),
      );
    modal({
      title: "How to play",
      body: element(
        "div",
        {
          class: "howto",
        },
        t(
          "1",
          "Floral cards name each category. Place one in the set slots to start a set.",
        ),
        t(
          "2",
          "Add every word or picture that shares its thread. A full set ties off and frees the slot.",
        ),
        t(
          "3",
          "Stack matching cards in the columns — a whole stack moves for 1 move.",
        ),
        t(
          "4",
          "Every action costs 1 move. Clear all sets before you run out. No timers, ever.",
        ),
      ),
      buttons: [
        {
          label: "Let's play",
        },
      ],
    });
  }
  settings() {
    let e = this.profile.settings,
      s = (o, a, i, r) => {
        let l = element("button", {
          class: "switch",
          role: "switch",
          "aria-checked": String(e[i]),
          "aria-label": o,
        });
        return (
          l.addEventListener("click", () => {
            ((e[i] = !e[i]),
              l.setAttribute("aria-checked", String(e[i])),
              r?.(),
              this.save(),
              sdk.track("settings_change", {
                [i]: e[i],
              }));
          }),
          element(
            "div",
            {
              class: "toggle",
            },
            element("span", {}, o, element("small", {}, a)),
            l,
          )
        );
      };
    modal({
      title: "Settings",
      body: element(
        "div",
        {},
        s("Sound effects", "Card taps, chimes and cues", "sfx", () =>
          audio.setSfx(e.sfx),
        ),
        s("Music", "Gentle background music", "music", () => {
          (audio.unlock(), audio.setMusic(e.music));
        }),
        s("Large print", "Bigger words on every card", "largePrint", () =>
          document.body.classList.toggle("large-print", e.largePrint),
        ),
        s(
          "Reduce motion",
          "Quick fades instead of flights and sparkles",
          "reducedMotion",
        ),
        s("Left-handed (phone)", "Deck on the left in portrait", "leftHanded"),
        s(
          "Review mode",
          "Stakeholder review: unlock all levels and the Wild Thread",
          "reviewMode",
        ),
        element(
          "div",
          {
            class: "toggle",
          },
          element(
            "span",
            {},
            "Reset progress",
            element("small", {}, "Start fresh with 500 coins"),
          ),
          element(
            "button",
            {
              class: "btn light",
              style: {
                minHeight: "40px",
                padding: "6px 14px",
                fontSize: "15px",
              },
              onclick: () => {
                (resetProgress(), location.reload());
              },
            },
            "Reset",
          ),
        ),
        element(
          "p",
          {
            style: {
              fontSize: "13px",
              color: "var(--ink-2)",
              margin: "12px 0 0",
            },
          },
          "Add ?debug=1 to the address to see the telemetry stream. Add ?plus=1 to simulate an Arkadium Plus member (no interstitials).",
        ),
      ),
      buttons: [
        {
          label: "Done",
          onClick: () => {
            if (!this.board) this.title();
          },
        },
      ],
    });
  }
  toastScreen(t) {
    let e = element(
      "div",
      {
        class: "toast on",
        style: {
          position: "fixed",
        },
      },
      t,
    );
    (document.body.append(e), setTimeout(() => e.remove(), 2200));
  }
  debugPanel() {
    let t = element(
      "div",
      {
        class: "debug",
        "aria-hidden": "true",
      },
      "telemetry (mock SDK)",
    );
    (document.body.append(t),
      sdk.onTelemetry((e) => {
        t.prepend(
          element(
            "div",
            {},
            `${new Date(e.t).toLocaleTimeString()} ${e.name} ${JSON.stringify(e.props)}`,
          ),
        );
      }),
      telemetry.forEach((e) =>
        t.prepend(element("div", {}, `${e.name} ${JSON.stringify(e.props)}`)),
      ));
  }
}
var logo = `<svg viewBox="0 0 560 170" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(18 14)">
    <rect x="6" y="0" width="74" height="16" rx="5" fill="#C9A66B" stroke="#3B2A17" stroke-width="3"/>
    <rect x="6" y="104" width="74" height="16" rx="5" fill="#C9A66B" stroke="#3B2A17" stroke-width="3"/>
    <rect x="16" y="16" width="54" height="88" fill="#E8A33D" stroke="#3B2A17" stroke-width="3"/>
    <g stroke="#9A6614" stroke-width="2.5" opacity=".8"><path d="M16 30l54 6M16 46l54 6M16 62l54 6M16 78l54 6M16 94l54 6"/></g>
  </g>
  <path d="M88 108 C 140 150, 200 120, 250 140 S 420 160, 540 132" fill="none" stroke="#E8A33D" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 9"/>
  <text x="112" y="74" font-family="Fraunces, Georgia, serif" font-weight="800" font-size="62" fill="#FFF8EC">Common Thread</text>
  <text x="116" y="116" font-family="'Atkinson Hyperlegible', Arial, sans-serif" font-weight="700" font-size="25" letter-spacing="13" fill="#FCE7B8">SOLITAIRE</text>
</svg>`;
export { room, chests, GameApp, logo };
