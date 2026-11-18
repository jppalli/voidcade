import { illustrations, icons } from "../assets.js";
import { openStudio, type AppHost } from "./studio";

export function installHome(app: AppHost) {
  app.title = () => {
    app.clear();
    const level = Math.min(app.profile.journeyLevel, 10);
    const screen = document.createElement("main");
    screen.className = "screen cozy-home";
    screen.innerHTML = `
      <header class="garden-hud">
        <div class="pocket-coins" aria-label="${app.profile.coins} coins"><i>${icons.coin}</i><b>${app.profile.coins}</b></div>
        <div class="garden-tools"><button class="round-tool" data-how><b aria-hidden="true">?</b><span>How to play</span></button><button class="round-tool" data-settings><i>${icons.gear}</i><span>Settings</span></button></div>
      </header>
      <div class="garden-menu">
        <div class="title-flourish" aria-hidden="true">✦ <i>${icons.spool}</i> ✦</div>
        <h1 class="game-title">Common<span>Thread</span></h1>
        <div class="title-ribbon">S O L I T A I R E</div>
        <p class="garden-tagline">Match words and pictures. Find what belongs together.</p>
        <div class="garden-fan" aria-hidden="true">
          <div class="garden-card card-flower"><span>In the garden</span><i>${illustrations.tulip}</i><b>Tulip</b></div>
          <div class="garden-card card-tea"><span>Tea time</span><i>${illustrations.teapot}</i><b>A little comfort</b></div>
          <div class="garden-card card-fruit"><span>Freshly picked</span><i>${illustrations.lemon}</i><b>Lemon</b></div>
          <span class="fan-spark spark-one">✦</span><span class="fan-spark spark-two">✧</span>
        </div>
        <button class="garden-play" data-play><i>${icons.play}</i><span>Play level ${level}<small>Continue your journey</small></span></button>
        <nav class="garden-activities" aria-label="More ways to play">
          <button class="activity daily-activity" data-daily><i>${icons.calendar}</i><span>Daily puzzle</span><small>Today's challenge</small></button>
          <button class="activity journey-activity" data-journey><i>${illustrations.wateringcan}</i><span>Choose a level</span><small>Your journey</small></button>
          <button class="activity quick-activity" data-quick><i>${icons.shuffle}</i><span>Quick play</span><small>Start a new puzzle</small></button>
        </nav>
      </div>
      <footer class="garden-footer"><span>No timer. Play at your own pace.</span><button data-studio>${icons.needle} Create a puzzle</button></footer>
      <div class="garden-motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`;
    app.root.append(screen);
    const action = (name: string, callback: () => void) => {
      screen.querySelector<HTMLButtonElement>(`[data-${name}]`)!.onclick =
        callback;
    };
    action("play", () => app.startJourney(level));
    action("daily", () => app.daily());
    action("quick", () => app.quick());
    action("journey", () => app.journey());
    action("how", () => app.howTo());
    action("settings", () => app.settings());
    action("studio", () => openStudio(app));
  };
  app.title();
}
