import "./base.css";
import "./theme.css";
import "./cozy.css";
import { GameApp } from "./ui/app.js";
import { installHome } from "./ui/home";
import type { AppHost } from "./ui/studio";
import { installPlatform } from "./platform/sdk";
import { arkadiumAdapter, type ArkadiumHost } from "./platform/arkadium";

const host = (
  globalThis as typeof globalThis & { ArkadiumGameSdk?: ArkadiumHost }
).ArkadiumGameSdk;
if (host) installPlatform(arkadiumAdapter(host));
const root = document.getElementById("app");
if (!root) throw new Error("Game root not found");
const app = new GameApp(root);
installHome(app as unknown as AppHost);
