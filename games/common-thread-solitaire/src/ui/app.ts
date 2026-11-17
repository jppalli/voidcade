import { dateKey, loadProfile, loadSession, resetStorage, saveProfile, saveSession } from '../platform/storage';
import type { Profile, Settings } from '../platform/storage';
import type { LevelDef } from '../engine/types';
import { audio } from '../audio/audio';
import { platform, telemetryLog } from '../platform/sdk';
import { coinLine, mockAd, openModal } from './modal';
import { el, icon } from './dom';
import { ICONS } from '../data/icons';
import { JOURNEY_LEVELS, JOURNEY_SEEDS } from '../data/journey';
import { CONFIG, streakTier } from '../config';
import { QUICK_TIERS, dailyLevel, quickLevel, type QuickTier } from '../engine/generator';
import { Game } from '../engine/game';
import { TableView, type TableHost } from './tableView';

const ROOM = {
  name: "The Sunroom",
  blurb: "Rooms of the House · Room 1 of 5"
};
const ROOM_CHESTS = {
  5: {
    coins: 200,
    hints: 0,
    wilds: 1
  },
  10: {
    coins: 500,
    hints: 2,
    wilds: 0
  }
};
export interface PlayOptions {
  levelNumber: number;
  subtitle: string;
  tutorial: boolean;
  nextLabel: string;
  onWin: () => void;
  onNext: () => void;
  onExit: () => void;
}

export class App {
  root: HTMLElement;
  profile: Profile;
  board: TableView | null = null;
  constructor(t: HTMLElement) {
    if (this.root = t, this.profile = loadProfile(), audio.setSfx(this.profile.settings.sfx), audio.setMusic(this.profile.settings.music), platform.setAdPresenter(mockAd), platform.setMuteHook(e => audio.setAdMute(e)), document.body.classList.toggle("large-print", this.profile.settings.largePrint), window.addEventListener("pointerdown", () => audio.unlock(), {
      once: true
    }), window.addEventListener("keydown", () => audio.unlock(), {
      once: true
    }), /[?&]debug=1/.test(location.search)) {
      this.debugPanel();
      (window as any).__ct = this;
    }
    platform.gameReady();
    this.title();
  }
  save() {
    saveProfile(this.profile);
  }
  clear() {
    this.board?.destroy();
    this.board = null;
    this.root.innerHTML = "";
    document.querySelectorAll(".scrim").forEach(t => t.remove());
  }
  topbar(t: string, e?: () => void) {
    return el("div", {
      class: "topbar"
    }, e ? el("button", {
      class: "iconbtn",
      "aria-label": "Back",
      html: ICONS.home,
      onclick: () => {
        audio.click();
        e();
      }
    }) : null, el("h2", {}, t), el("div", {
      class: "spacer"
    }), el("div", {
      class: "coins"
    }, icon("coin", ""), el("span", {}, String(this.profile.coins))), el("button", {
      class: "iconbtn",
      "aria-label": "Settings",
      html: ICONS.gear,
      onclick: () => this.settings()
    }));
  }
  title() {
    this.clear();
    let t = this.profile,
      e = Math.min(t.journeyLevel, JOURNEY_LEVELS.length),
      s = dateKey(),
      o = t.daily[s]?.done,
      a = el("div", {
        class: "fan",
        "aria-hidden": "true"
      }, ...[["Waltz", -24, "#FFFDF8"], ["TEA TIME", -8, "#F1DFBF"], ["Scone", 8, "#FFFDF8"], ["", 24, "#B5452B"]].map(([r, l, c]) => el("div", {
        class: "mini",
        style: {
          transform: `translateX(-50%) rotate(${l}deg)`,
          background: String(c),
          color: "#1F2933",
          border: c === "#F1DFBF" ? "2px dashed #E8A33D" : "1px solid #E4DDD0"
        }
      }, String(r)))),
      i = el("div", {
        class: "screen linen"
      }, this.topbar(""), el("div", {
        class: "logo",
        html: LOGO_SVG,
        role: "img",
        "aria-label": "Common Thread Solitaire"
      }), el("p", {
        class: "tagline"
      }, "Find the common thread."), a, el("div", {
        class: "menu",
        style: {
          marginTop: "22px"
        }
      }, el("button", {
        class: "btn",
        onclick: () => {
          audio.unlock();
          audio.click();
          this.journey();
        }
      }, icon("play"), el("span", {}, `Play · Level ${e}`, el("small", {}, ROOM.name))), el("button", {
        class: "dailycard",
        onclick: () => {
          audio.unlock();
          audio.click();
          this.daily();
        }
      }, icon("calendar", ""), el("span", {}, el("b", {}, "Daily Puzzle"), o ? "Stitched today — see your quilt" : "A fresh deal every day")), el("button", {
        class: "btn blue",
        onclick: () => {
          audio.unlock();
          audio.click();
          this.quick();
        }
      }, icon("shuffle"), "Quick Play"), el("button", {
        class: "btn light",
        onclick: () => this.howTo()
      }, "How to play")), el("p", {
        class: "footnote"
      }, "Vertical slice v0.1 · Arkadium · Ads and cloud save are simulated"));
    this.root.append(i);
  }
  journey() {
    this.clear();
    let t = this.profile,
      e = el("div", {
        class: "path"
      }),
      s = JOURNEY_LEVELS.length * 110;
    e.innerHTML = `<svg class="thread" viewBox="0 0 420 ${s}" preserveAspectRatio="none"><path d="${JOURNEY_LEVELS.map((o, a) => a === 0 ? "M120 42" : `C${(a - 1) % 2 ? 300 : 120} ${a * 110 - 20} ${a % 2 ? 300 : 120} ${a * 110 - 20} ${a % 2 ? 300 : 120} ${a * 110 + 42}`).join(" ")}" fill="none" stroke="#E8A33D" stroke-width="4" stroke-dasharray="10 8" opacity=".75"/></svg>`;
    JOURNEY_LEVELS.forEach((o, a) => {
      let i = o.n,
        r = i <= t.journeyLevel || t.settings.reviewMode,
        l = i < t.journeyLevel || t.journeyStars[`j${i}`] !== undefined,
        c = !r ? "locked" : i === t.journeyLevel ? "current" : l ? "done" : "",
        d = el("button", {
          class: `node ${c}`,
          style: {
            transform: `translateX(${a % 2 ? 90 : -90}px)`
          },
          "aria-label": `Level ${i}${!r ? ", locked" : l ? ", complete" : ""}. ${o.teaches}`,
          title: o.teaches,
          onclick: () => {
            if (!r) {
              audio.error();
              return;
            }
            audio.click();
            this.startJourney(i);
          }
        }, r ? String(i) : el("i", {
          class: "lk",
          html: ICONS.lock
        }), o.chest ? el("i", {
          class: "chest",
          html: ICONS.chest
        }) : null, t.journeyStars[`j${i}`] !== undefined ? el("span", {
          class: "best"
        }, `best: ${t.journeyStars[`j${i}`]} left`) : null);
      e.append(d);
    });
    this.root.append(el("div", {
      class: "screen linen"
    }, this.topbar("Journey", () => this.title()), el("div", {
      class: "room"
    }, el("h3", {}, ROOM.name), el("p", {}, ROOM.blurb)), e, el("p", {
      class: "footnote"
    }, "The Kitchen Table, The Library, The Garden Porch and The Attic are coming in production.")));
  }
  journeyDef(t: number): LevelDef {
    let e = JOURNEY_LEVELS[t - 1],
      s = JOURNEY_SEEDS[t - 1];
    return {
      key: `j${t}`,
      mode: "journey",
      title: `Level ${t}`,
      board: e.board,
      sets: e.sets,
      mu: e.mu,
      seed: s.seed,
      par: s.par,
      budget: s.budget
    };
  }
  startJourney(t: number) {
    let e = this.journeyDef(t);
    this.play(e, {
      levelNumber: t,
      subtitle: `${ROOM.name} · ${JOURNEY_LEVELS[t - 1].teaches}`,
      tutorial: t === 1 && !this.profile.tutorialDone,
      nextLabel: t < JOURNEY_LEVELS.length ? `Next · Level ${t + 1}` : "Back to the Journey",
      onWin: () => {
        let s = this.profile,
          o = s.journeyStars[e.key],
          a = o === undefined;
        if (s.journeyStars[e.key] = Math.max(o ?? 0, this.board!.s.state.moves), t >= s.journeyLevel) s.journeyLevel = Math.min(t + 1, JOURNEY_LEVELS.length + 1);
        if (t === 1) s.tutorialDone = true;
        this.save();
        let i = ROOM_CHESTS[t];
        if (i && a) {
          s.coins += i.coins;
          s.hints += i.hints;
          s.wilds += i.wilds;
          this.save();
          audio.coin();
          platform.track("chest_claim", {
            source: `journey_${t}`
          });
          openModal({
            title: "Room chest!",
            body: el("div", {}, el("p", {}, t === 5 ? "You unlocked the Wild Thread. It sits on any column and takes cards from any set." : "You finished The Sunroom. More rooms are on the way."), el("p", {}, coinLine(`+${i.coins}`), i.wilds ? `  · +${i.wilds} Wild Thread` : "", i.hints ? `  · +${i.hints} Hints` : "")),
            buttons: [{
              label: "Lovely"
            }]
          });
        }
      },
      onNext: () => {
        if (t < JOURNEY_LEVELS.length) this.startJourney(t + 1);else this.journey();
      },
      onExit: () => this.journey()
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
      l = Array.from({
        length: a
      }, (f, w) => t.daily[`${r}-${String(w + 1).padStart(2, "0")}`]?.done).filter(Boolean).length,
      c = el("div", {
        class: "quilt",
        role: "grid",
        "aria-label": "Monthly quilt"
      }, ...["S", "M", "T", "W", "T", "F", "S"].map(f => el("div", {
        class: "dow"
      }, f)));
    for (let f = 0; f < i; f++) c.append(el("div", {
      class: "patch blank"
    }));
    for (let f = 1; f <= a; f++) {
      let w = `${r}-${String(f).padStart(2, "0")}`,
        k = t.daily[w]?.done,
        T = f === e.getDate(),
        P = f > e.getDate(),
        O = k ? `done f${f * 7 % 6}` : T ? "today" : P ? "future" : "missed";
      c.append(el("button", {
        class: `patch ${O}`,
        "aria-label": `${w}${k ? ", stitched" : T ? ", today" : P ? ", not yet" : ", missed — replay"}`,
        onclick: () => this.dailyTap(w, f, e.getDate(), !!k, P)
      }, String(f)));
    }
    let d = CONFIG.dailyChests.map((f, w) => ({
        ...f,
        need: f.days || a,
        i: w
      })),
      u = t.dailyChests[r] ?? [],
      p = el("div", {
        class: "mtrack"
      }, el("b", {
        style: {
          width: `${Math.min(100, l / a * 100)}%`
        }
      }), ...d.map(f => {
        let w = l >= f.need && !u.includes(f.i);
        return el("button", {
          class: `mstop ${w ? "ready" : ""} ${u.includes(f.i) ? "claimed" : ""}`,
          style: {
            left: `${f.need / a * 100}%`
          },
          "aria-label": `${f.label}: ${f.need} days${w ? ", ready to open" : ""}`,
          onclick: () => this.claimChest(r, f.i, w, f)
        }, el("i", {
          html: ICONS.chest
        }), el("span", {}, f.days ? `${f.need} days` : "Full quilt"));
      })),
      x = t.daily[dateKey()]?.done;
    this.root.append(el("div", {
      class: "screen linen"
    }, this.topbar("Daily Puzzle", () => this.title()), el("div", {
      class: "quiltwrap"
    }, el("h3", {}, e.toLocaleString(undefined, {
      month: "long",
      year: "numeric"
    })), el("p", {
      style: {
        textAlign: "center",
        margin: "0 0 6px",
        color: "var(--thread-light)"
      }
    }, `Every puzzle you solve stitches a patch into this month's quilt. ${l} of ${a} stitched.`), el("div", {
      class: "milestones"
    }, p), c, el("div", {
      class: "legend"
    }, el("span", {}, "Dashed: missed — yesterday is free, older days cost 1 video or 150 coins")), el("div", {
      class: "menu",
      style: {
        margin: "16px auto 0"
      }
    }, x ? el("button", {
      class: "btn light",
      disabled: true
    }, "Today is stitched — see you tomorrow") : el("button", {
      class: "btn",
      onclick: () => this.startDaily(dateKey())
    }, icon("play"), "Play today's puzzle")))));
  }
  dailyTap(t: string, e: number, s: number, o: boolean, a: boolean) {
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
    openModal({
      title: "Replay a missed day",
      body: "Older days can be unlocked to finish your quilt.",
      buttons: [{
        label: "Watch a video",
        kind: "blue",
        icon: "ad",
        onClick: async () => {
          if (await platform.rewarded("daily_archive")) this.startDaily(t);
        }
      }, {
        label: el("span", {
          class: "coinline"
        }, `Unlock for ${CONFIG.archiveCost}`, icon("coin", "")),
        kind: "gold",
        disabled: i.coins < CONFIG.archiveCost,
        onClick: () => {
          i.coins -= CONFIG.archiveCost;
          this.save();
          this.startDaily(t);
        }
      }, {
        label: "Not now",
        kind: "ghost"
      }]
    });
  }
  claimChest(t: string, e: number, s: boolean, o: { label: string; need: number; coins: number; hints: number; wilds: number }) {
    if (!s) {
      this.toastScreen(`${o.label}: stitch ${o.need} days this month to open.`);
      return;
    }
    let a = this.profile;
    a.coins += o.coins;
    a.hints += o.hints;
    a.wilds += o.wilds;
    a.dailyChests[t] = [...(a.dailyChests[t] ?? []), e];
    this.save();
    audio.coin();
    platform.track("chest_claim", {
      source: `daily_${e}`
    });
    openModal({
      title: o.label,
      body: el("p", {}, coinLine(`+${o.coins}`), `  · +${o.hints} Hints · +${o.wilds} Wild Thread`),
      buttons: [{
        label: "Lovely",
        onClick: () => this.daily()
      }]
    });
  }
  startDaily(t: string) {
    let e = dailyLevel(t);
    this.play(e, {
      levelNumber: 0,
      subtitle: t === dateKey() ? "Today's puzzle" : `Puzzle for ${t}`,
      tutorial: false,
      nextLabel: "See my quilt",
      onWin: () => {
        this.profile.daily[t] = {
          done: true,
          movesLeft: this.board!.s.state.moves
        };
        this.save();
        platform.track("daily_complete", {
          date: t
        });
      },
      onNext: () => this.daily(),
      onExit: () => this.daily()
    });
  }
  quick() {
    this.clear();
    let t: Record<QuickTier, [string, number]> = {
        casual: ["Six sets, roomy move budget, no tricky double meanings.", 1],
        standard: ["Nine sets. A steady, satisfying table.", 2],
        expert: ["Twelve sets and tight moves. Plan every stack.", 3]
      },
      e = el("div", {
        class: "tiers"
      }, ...(Object.keys(QUICK_TIERS) as QuickTier[]).map(s => el("button", {
        class: "tier",
        onclick: () => {
          audio.click();
          this.startQuick(s);
        }
      }, el("div", {
        class: "dots3"
      }, ...[1, 2, 3].map(o => el("span", {
        class: o <= t[s][1] ? "on" : ""
      }))), el("div", {}, el("b", {}, QUICK_TIERS[s].label), t[s][0]), el("i", {
        class: "go",
        html: ICONS.play
      }))));
    this.root.append(el("div", {
      class: "screen linen"
    }, this.topbar("Quick Play", () => this.title()), el("p", {
      style: {
        color: "var(--thread-light)",
        maxWidth: "520px",
        textAlign: "center"
      }
    }, "A fresh deal every time. Every deal is checked by our solver, so it can always be won without helpers."), e));
  }
  startQuick(t: QuickTier) {
    let e = quickLevel(t, Math.random() * 2147483648 >>> 0);
    this.play(e, {
      levelNumber: 0,
      subtitle: `${e.sets.length} sets`,
      tutorial: false,
      nextLabel: "New deal",
      onWin: () => {},
      onNext: () => this.startQuick(t),
      onExit: () => this.quick()
    });
  }
  play(t: LevelDef, e: PlayOptions) {
    this.clear();
    let s = loadSession(),
      o: Game;
    if (s && s.def.key === t.key) o = Game.restore(s);else {
      let i = streakTier(this.profile.streak);
      o = new Game(t, i?.moves ?? 0);
      this.profile.stats.gamesStarted++;
      this.save();
      platform.track("level_start", {
        key: t.key,
        mode: t.mode,
        budget: o.startBudget,
        par: t.par,
        streakBonus: i?.moves ?? 0
      });
    }
    let a: TableHost = {
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
        saveSession(null);
        this.play(t, e);
      },
      onNext: async () => {
        await platform.interstitial("next_level", e.levelNumber);
        e.onNext();
      }
    };
    if (this.board = new TableView(this.root, o, a), o.bonusMoves && o.history.length === 0) this.board!.toast(`Win streak bonus: +${o.bonusMoves} moves`);
    if (e.tutorial && o.history.length === 0) this.howTo();
  }
  howTo() {
    let t = (e, s) => el("div", {
      class: "step"
    }, el("span", {
      class: "n"
    }, e), el("span", {}, s));
    openModal({
      title: "How to play",
      body: el("div", {
        class: "howto"
      }, t("1", "Kraft tags are category cards. Place one in the top row to start a set."), t("2", "Add every word or picture that shares its thread. A full set ties off and frees the slot."), t("3", "Stack matching cards in the columns — a whole stack moves for 1 move."), t("4", "Every action costs 1 move. Clear all sets before you run out. No timers, ever.")),
      buttons: [{
        label: "Let's play"
      }]
    });
  }
  settings() {
    let e = this.profile.settings,
      s = (o: string, a: string, i: keyof Settings, r?: () => void) => {
        let l = el("button", {
          class: "switch",
          role: "switch",
          "aria-checked": String(e[i]),
          "aria-label": o
        });
        l.addEventListener("click", () => {
          e[i] = !e[i];
          l.setAttribute("aria-checked", String(e[i]));
          r?.();
          this.save();
          platform.track("settings_change", {
            [i]: e[i]
          });
        });
        return el("div", {
          class: "toggle"
        }, el("span", {}, o, el("small", {}, a)), l);
      };
    openModal({
      title: "Settings",
      body: el("div", {}, s("Sound effects", "Card taps, chimes and cues", "sfx", () => audio.setSfx(e.sfx)), s("Music", "Gentle background music", "music", () => {
        audio.unlock();
        audio.setMusic(e.music);
      }), s("Large print", "Bigger words on every card", "largePrint", () => document.body.classList.toggle("large-print", e.largePrint)), s("Reduce motion", "Quick fades instead of flights and sparkles", "reducedMotion"), s("Left-handed (phone)", "Deck on the left in portrait", "leftHanded"), s("Review mode", "Stakeholder review: unlock all levels and the Wild Thread", "reviewMode"), el("div", {
        class: "toggle"
      }, el("span", {}, "Reset progress", el("small", {}, "Start fresh with 500 coins")), el("button", {
        class: "btn light",
        style: {
          minHeight: "40px",
          padding: "6px 14px",
          fontSize: "15px"
        },
        onclick: () => {
          resetStorage();
          location.reload();
        }
      }, "Reset")), el("p", {
        style: {
          fontSize: "13px",
          color: "var(--ink-2)",
          margin: "12px 0 0"
        }
      }, "Add ?debug=1 to the address to see the telemetry stream. Add ?plus=1 to simulate an Arkadium Plus member (no interstitials).")),
      buttons: [{
        label: "Done",
        onClick: () => {
          if (!this.board) this.title();
        }
      }]
    });
  }
  toastScreen(t: string) {
    let e = el("div", {
      class: "toast on",
      style: {
        position: "fixed"
      }
    }, t);
    document.body.append(e);
    setTimeout(() => e.remove(), 2200);
  }
  debugPanel() {
    let t = el("div", {
      class: "debug",
      "aria-hidden": "true"
    }, "telemetry (mock SDK)");
    document.body.append(t);
    platform.onTelemetry(e => {
      t.prepend(el("div", {}, `${new Date(e.t).toLocaleTimeString()} ${e.name} ${JSON.stringify(e.props)}`));
    });
    telemetryLog.forEach(e => t.prepend(el("div", {}, `${e.name} ${JSON.stringify(e.props)}`)));
  }
}
const LOGO_SVG = `<svg viewBox="0 0 560 170" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(18 14)">
    <rect x="6" y="0" width="74" height="16" rx="5" fill="#C9A66B" stroke="#3B2A17" stroke-width="3"/>
    <rect x="6" y="104" width="74" height="16" rx="5" fill="#C9A66B" stroke="#3B2A17" stroke-width="3"/>
    <rect x="16" y="16" width="54" height="88" fill="#E8A33D" stroke="#3B2A17" stroke-width="3"/>
    <g stroke="#9A6614" stroke-width="2.5" opacity=".8"><path d="M16 30l54 6M16 46l54 6M16 62l54 6M16 78l54 6M16 94l54 6"/></g>
  </g>
  <path d="M88 108 C 140 150, 200 120, 250 140 S 420 160, 540 132" fill="none" stroke="#E8A33D" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 9"/>
  <text x="112" y="74" font-family="'Fraunces Variable', Fraunces, Georgia, serif" font-weight="800" font-size="62" textLength="436" lengthAdjust="spacingAndGlyphs" fill="#FFF8EC">Common Thread</text>
  <text x="116" y="116" font-family="'Atkinson Hyperlegible', Arial, sans-serif" font-weight="700" font-size="25" letter-spacing="13" fill="#FCE7B8">SOLITAIRE</text>
</svg>`;
const appRoot = document.getElementById("app");
if (appRoot) new App(appRoot);
