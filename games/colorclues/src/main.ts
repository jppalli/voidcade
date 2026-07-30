import "@fontsource-variable/nunito";
import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/800.css";
import "./styles.css";
import { initAudio } from "./audio/sound";
import { devHandle, showTitle } from "./ui/screens";

initAudio();
showTitle();

// Stops iOS from zooming on the rapid taps this game encourages.
document.addEventListener("dblclick", (ev) => ev.preventDefault(), { passive: false });

(window as unknown as Record<string, unknown>).__clues = devHandle();
