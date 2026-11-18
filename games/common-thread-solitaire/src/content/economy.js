var economy = {
  startCoins: 500,
  startHints: 3,
  startWilds: 1,
  winBase: 50,
  dailyBase: 100,
  perMoveLeft: 2,
  freeUndosPerLevel: 3,
  undoCost: 100,
  hintCost: 150,
  wildCost: 300,
  rescueCost: 500,
  rescueMoves: 10,
  maxRescues: 5,
  archiveCost: 150,
  freeCoinsAd: 100,
  freeCoinsAdPerSession: 5,
  wildUnlockLevel: 5,
  streak: [
    {
      wins: 10,
      moves: 8,
      coinBonus: 0.25,
    },
    {
      wins: 5,
      moves: 5,
      coinBonus: 0.1,
    },
    {
      wins: 3,
      moves: 3,
      coinBonus: 0,
    },
  ],
  dailyChests: [
    {
      days: 7,
      label: "Bronze bundle",
      coins: 250,
      hints: 1,
      wilds: 1,
    },
    {
      days: 15,
      label: "Silver bundle",
      coins: 600,
      hints: 2,
      wilds: 1,
    },
    {
      days: 0,
      label: "Full Quilt",
      coins: 1500,
      hints: 2,
      wilds: 2,
    },
  ],
  interstitialCooldownSec: 180,
  rewardedGraceSec: 120,
  noInterstitialBeforeLevel: 4,
};
function streakBonus(t) {
  return economy.streak.find((e) => t >= e.wins) ?? null;
}
export { economy, streakBonus };
