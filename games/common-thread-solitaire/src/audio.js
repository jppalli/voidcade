var PENTATONIC = [0, 2, 4, 7, 9];
var frequency = (t) => 261.63 * Math.pow(2, t / 12);
class AudioEngine {
  ctx = null;
  master;
  buses;
  sfxOn = !0;
  musicOn = !0;
  adMuted = !1;
  musicTimer = null;
  beat = 0;
  voices = 0;
  noiseBuf = null;
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    let t = window.AudioContext || window.webkitAudioContext;
    if (!t) return;
    let e = new t();
    ((this.ctx = e),
      (this.master = e.createGain()),
      (this.master.gain.value = 0.9));
    let s = e.createDynamicsCompressor();
    ((s.threshold.value = -14),
      (s.ratio.value = 3),
      this.master.connect(s).connect(e.destination));
    let o = (r) => {
      let l = e.createGain();
      return ((l.gain.value = r), l.connect(this.master), l);
    };
    this.buses = {
      ui: o(0.8),
      fx: o(0.75),
      handling: o(0.55),
      music: o(0),
    };
    let a = e.sampleRate * 0.5;
    this.noiseBuf = e.createBuffer(1, a, e.sampleRate);
    let i = this.noiseBuf.getChannelData(0);
    for (let r = 0; r < a; r++) i[r] = Math.random() * 2 - 1;
    this.applyMusic();
  }
  setSfx(t) {
    this.sfxOn = t;
  }
  setMusic(t) {
    ((this.musicOn = t), this.applyMusic());
  }
  setAdMute(t) {
    if (((this.adMuted = t), this.ctx))
      this.master.gain.setTargetAtTime(t ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }
  applyMusic() {
    if (!this.ctx) return;
    let t = this.ctx.currentTime;
    if (
      (this.buses.music.gain.setTargetAtTime(this.musicOn ? 0.32 : 0, t, 0.4),
      this.musicOn && this.musicTimer === null)
    )
      this.musicTimer = window.setInterval(() => this.musicTick(), 940);
    if (!this.musicOn && this.musicTimer !== null)
      (clearInterval(this.musicTimer), (this.musicTimer = null));
  }
  duck() {
    if (!this.ctx || !this.musicOn) return;
    let t = this.buses.music.gain,
      e = this.ctx.currentTime;
    (t.cancelScheduledValues(e),
      t.setTargetAtTime(0.13, e, 0.03),
      t.setTargetAtTime(0.32, e + 0.9, 0.5));
  }
  ok(t) {
    return (
      !!this.ctx &&
      !this.adMuted &&
      (t === "music" ? this.musicOn : this.sfxOn) &&
      this.voices < 12
    );
  }
  tone(
    t,
    e,
    {
      dur: s = 0.5,
      vol: o = 0.3,
      type: a = "sine",
      delay: i = 0,
      overtone: r = 0.25,
      attack: l = 0.005,
    } = {},
  ) {
    if (!this.ok(e)) return;
    let c = this.ctx,
      d = c.currentTime + i,
      u = c.createGain();
    (u.gain.setValueAtTime(0, d),
      u.gain.linearRampToValueAtTime(o, d + l),
      u.gain.exponentialRampToValueAtTime(0.0001, d + s));
    let p = c.createOscillator();
    if (((p.type = a), (p.frequency.value = t), p.connect(u), r > 0)) {
      let x = c.createOscillator(),
        f = c.createGain();
      ((f.gain.value = r),
        (x.frequency.value = t * 4),
        x.connect(f).connect(u),
        x.start(d),
        x.stop(d + s * 0.4));
    }
    (u.connect(this.buses[e]),
      p.start(d),
      p.stop(d + s + 0.05),
      this.voices++,
      (p.onended = () => {
        this.voices--;
      }));
  }
  noise(
    t,
    {
      dur: e = 0.12,
      vol: s = 0.25,
      freq: o = 2500,
      q: a = 0.8,
      sweepTo: i = 0,
      delay: r = 0,
    } = {},
  ) {
    if (!this.ok(t) || !this.noiseBuf) return;
    let l = this.ctx,
      c = l.currentTime + r,
      d = l.createBufferSource();
    d.buffer = this.noiseBuf;
    let u = l.createBiquadFilter();
    if (
      ((u.type = "bandpass"),
      u.frequency.setValueAtTime(o, c),
      (u.Q.value = a),
      i)
    )
      u.frequency.exponentialRampToValueAtTime(i, c + e);
    let p = l.createGain();
    (p.gain.setValueAtTime(s, c),
      p.gain.exponentialRampToValueAtTime(0.0001, c + e),
      d.connect(u).connect(p).connect(this.buses[t]),
      d.start(c, Math.random() * 0.3),
      d.stop(c + e + 0.02),
      this.voices++,
      (d.onended = () => {
        this.voices--;
      }));
  }
  r(t) {
    return 1 + (Math.random() * 2 - 1) * t;
  }
  pick() {
    this.noise("handling", {
      dur: 0.06,
      vol: 0.18 * this.r(0.15),
      freq: 3200 * this.r(0.1),
    });
  }
  place() {
    (this.noise("handling", {
      dur: 0.08,
      vol: 0.22,
      freq: 1400 * this.r(0.1),
    }),
      this.tone(180 * this.r(0.04), "handling", {
        dur: 0.09,
        vol: 0.18,
        overtone: 0,
      }));
  }
  flip() {
    this.noise("handling", {
      dur: 0.14,
      vol: 0.14,
      freq: 1800,
      sweepTo: 4200,
    });
  }
  draw() {
    this.noise("handling", {
      dur: 0.16,
      vol: 0.18,
      freq: 1200,
      sweepTo: 3500,
    });
  }
  recycle() {
    for (let t = 0; t < 4; t++)
      this.noise("handling", {
        dur: 0.08,
        vol: 0.12,
        freq: 2000 + t * 300,
        delay: t * 0.05,
      });
  }
  score(t, e = 1) {
    let s = Math.min(9, Math.floor(t * 9)),
      o = PENTATONIC[s % 5] + 12 * Math.floor(s / 5) + 12;
    for (let a = 0; a < Math.min(e, 4); a++)
      this.tone(frequency(o + a * 2), "fx", {
        dur: 0.45,
        vol: 0.22,
        delay: a * 0.07,
        overtone: 0.18,
      });
  }
  seat() {
    (this.tone(frequency(7), "fx", {
      dur: 0.35,
      vol: 0.2,
      overtone: 0.1,
    }),
      this.tone(frequency(12), "fx", {
        dur: 0.4,
        vol: 0.16,
        delay: 0.06,
      }));
  }
  complete() {
    (this.duck(),
      [12, 16, 19, 24].forEach((t, e) =>
        this.tone(frequency(t), "fx", {
          dur: 0.9,
          vol: 0.2,
          delay: e * 0.08,
          overtone: 0.3,
          type: "triangle",
        }),
      ));
    for (let t = 0; t < 6; t++)
      this.tone(frequency(31 + (t % 3) * 2) * this.r(0.01), "fx", {
        dur: 0.25,
        vol: 0.05,
        delay: 0.3 + t * 0.05,
        overtone: 0,
      });
  }
  error() {
    (this.duck(),
      this.tone(140, "ui", {
        dur: 0.16,
        vol: 0.28,
        overtone: 0,
        type: "triangle",
      }),
      this.noise("ui", {
        dur: 0.05,
        vol: 0.12,
        freq: 900,
      }));
  }
  click() {
    this.tone(frequency(19), "ui", {
      dur: 0.06,
      vol: 0.08,
      overtone: 0,
    });
  }
  coin() {
    (this.tone(frequency(28), "ui", {
      dur: 0.15,
      vol: 0.12,
      overtone: 0.1,
    }),
      this.tone(frequency(33), "ui", {
        dur: 0.25,
        vol: 0.12,
        delay: 0.08,
        overtone: 0.1,
      }));
  }
  lowMoves() {
    (this.duck(),
      this.tone(frequency(9), "ui", {
        dur: 0.5,
        vol: 0.14,
        type: "triangle",
      }),
      this.tone(frequency(4), "ui", {
        dur: 0.6,
        vol: 0.12,
        delay: 0.18,
        type: "triangle",
      }));
  }
  hint() {
    (this.tone(frequency(24), "ui", {
      dur: 0.3,
      vol: 0.1,
    }),
      this.tone(frequency(28), "ui", {
        dur: 0.3,
        vol: 0.1,
        delay: 0.1,
      }));
  }
  win() {
    (this.duck(),
      [0, 4, 7, 12, 16].forEach((t, e) =>
        this.tone(frequency(t + 12), "fx", {
          dur: 1.2,
          vol: 0.2,
          delay: e * 0.13,
          type: "triangle",
          overtone: 0.3,
        }),
      ),
      [0, 7, 12].forEach((t) =>
        this.tone(frequency(t), "fx", {
          dur: 2.2,
          vol: 0.1,
          delay: 0.65,
          type: "sine",
          overtone: 0,
        }),
      ));
  }
  outOfMoves() {
    (this.duck(),
      [7, 4, 0].forEach((t, e) =>
        this.tone(frequency(t), "ui", {
          dur: 0.6,
          vol: 0.14,
          delay: e * 0.16,
          type: "triangle",
        }),
      ));
  }
  musicTick() {
    if (!this.ok("music")) return;
    let e = [0, -3, 5, 7][Math.floor(this.beat / 8) % 4];
    if (this.beat % 8 === 0)
      [0, 7, 16].forEach((s) =>
        this.tone(frequency(e + s - 12), "music", {
          dur: 7.5,
          vol: 0.06,
          attack: 1.2,
          overtone: 0,
          type: "sine",
        }),
      );
    if (Math.random() < 0.62) {
      let s = PENTATONIC[Math.floor(Math.random() * 5)];
      this.tone(frequency(e + s + 12), "music", {
        dur: 1.6,
        vol: 0.09,
        overtone: 0.12,
        type: "triangle",
      });
    }
    this.beat++;
  }
}
var audio = new AudioEngine();
export { PENTATONIC, frequency, AudioEngine, audio };
