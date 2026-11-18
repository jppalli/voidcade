import { icons } from "../assets.js";
import { audio } from "../audio.js";

function element(t, e = {}, ...s) {
  let o = document.createElement(t);
  for (let [a, i] of Object.entries(e)) {
    if (i === void 0 || i === null || i === !1) continue;
    if (a === "class") o.className = String(i);
    else if (a === "html") o.innerHTML = String(i);
    else if (a.startsWith("on") && typeof i === "function")
      o.addEventListener(a.slice(2).toLowerCase(), i);
    else if (a === "style" && typeof i === "object") Object.assign(o.style, i);
    else o.setAttribute(a, i === !0 ? "" : String(i));
  }
  for (let a of s)
    if (a !== null && a !== void 0 && a !== !1)
      o.append(a instanceof Node ? a : document.createTextNode(a));
  return o;
}
var icon = (t, e = "ico") =>
  element("i", {
    class: e,
    html: icons[t] ?? "",
  });
function announce(t) {
  let e = document.getElementById("sr");
  if (e) ((e.textContent = ""), setTimeout(() => (e.textContent = t), 30));
}
function modal(t) {
  let e = document.activeElement,
    s = () => {
      (c.remove(),
        document.removeEventListener("keydown", o, !0),
        t.onClose?.(),
        e?.focus?.());
    },
    o = (d) => {
      if (d.key === "Escape" && t.dismissible !== !1)
        (d.stopPropagation(), s());
    },
    a = element(
      "div",
      {
        class: "mh",
        id: "mh",
      },
      t.title,
      t.dismissible !== !1
        ? element("button", {
            class: "close",
            "aria-label": "Close",
            html: icons.close,
            onclick: () => {
              (audio.click(), s());
            },
          })
        : null,
    ),
    i = t.body
      ? element(
          "div",
          {
            class: "mb",
          },
          typeof t.body === "string"
            ? element(
                "p",
                {
                  style: {
                    margin: "0",
                  },
                },
                t.body,
              )
            : t.body,
        )
      : null,
    r = element("div", {
      class: "mf",
    });
  for (let d of t.buttons ?? []) {
    let u = element(
      "button",
      {
        class: `btn ${d.kind ?? ""}`,
        disabled: d.disabled,
      },
      d.icon ? icon(d.icon) : null,
      d.label,
    );
    (u.addEventListener("click", async () => {
      audio.click();
      let p = await d.onClick?.();
      if (!d.keepOpen && p !== !1) s();
    }),
      r.append(u));
  }
  let l = element(
      "div",
      {
        class: "modal",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "mh",
      },
      a,
      i,
      r,
    ),
    c = element(
      "div",
      {
        class: "scrim",
      },
      l,
    );
  return (
    c.addEventListener("pointerdown", (d) => {
      if (d.target === c && t.dismissible !== !1) s();
    }),
    document.addEventListener("keydown", o, !0),
    document.body.append(c),
    r.querySelector("button:not([disabled])")?.focus(),
    s
  );
}
function coinLine(t) {
  return element(
    "span",
    {
      class: "coinline",
    },
    icon("coin", ""),
    String(t),
  );
}
function mockAd(t) {
  return new Promise((e) => {
    let s = t === "rewarded" ? 4 : 3,
      o = element(
        "div",
        {
          class: "cd",
        },
        String(s),
      ),
      a = element(
        "button",
        {
          class: "btn ghost",
          style: {
            color: "#ccc",
          },
        },
        t === "rewarded" ? "Close (no reward)" : "Skip",
      ),
      i = element(
        "div",
        {
          class: "adscrim",
          role: "dialog",
          "aria-label": "Advertisement",
        },
        element(
          "div",
          {},
          element(
            "div",
            {
              class: "adbox",
            },
            element(
              "span",
              {
                class: "tag",
              },
              "AD",
            ),
            element(
              "div",
              {},
              o,
              element(
                "div",
                {},
                t === "rewarded" ? "Rewarded video" : "Advertisement",
              ),
            ),
          ),
          element(
            "p",
            {},
            "Mock ad for the vertical slice. On Arkadium.com the Arkadium SDK plays a real video here.",
          ),
          a,
        ),
      );
    document.body.append(i);
    let r = setInterval(() => {
      if ((s--, (o.textContent = String(Math.max(s, 0))), s <= 0))
        (clearInterval(r), i.remove(), e(!0));
    }, 1000);
    a.addEventListener("click", () => {
      (clearInterval(r), i.remove(), e(t === "interstitial"));
    });
  });
}
var moveErrors = {
  onCategory: "Category cards only collect in the top row.",
  mismatch: "Those two don't share a thread.",
  needCategory: "Start a set with a category card.",
  wrongSet: "That card belongs to a different set.",
  slotBusy: "That slot is in use — finish its set first.",
  notMovable: "That card is tucked under others.",
  noMoves: "You are out of moves.",
  slotsFull: "All the slots are busy — finish a set to free one.",
  covered: "That card is tucked under others.",
};
export { element, icon, announce, modal, coinLine, mockAd, moveErrors };
