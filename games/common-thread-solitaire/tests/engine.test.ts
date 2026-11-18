import { describe, expect, test } from 'vitest';
import { GameSession } from '../src/engine/session';
import { campaign, campaignDeals } from '../src/content/campaign.js';
import { solve } from '../src/engine/solver.js';
import { applyAction, cloneState, legalActions } from '../src/engine/rules';
import { dailyLevel, quickLevel } from '../src/engine/generator.js';
import { validateDraft } from '../src/ui/studio';
import { installPlatform, sdk } from '../src/platform/sdk';
import type { LevelDefinition } from '../src/engine/types';

function level(index = 0): LevelDefinition {
  return {...campaign[index], ...campaignDeals[index], key:`test-${index}`, mode:'journey', title:'Test'};
}
describe('original campaign parity', () => {
  test.each(campaign.map((_, index) => index))('level %i remains winnable inside its move budget', index => {
    const session = new GameSession(level(index));
    const solution = solve(session.state, session.cards, session.def.seed, 60);
    expect(solution.solved).toBe(true);
    expect(solution.par).toBeLessThanOrEqual(session.startBudget);
    for (const action of solution.bestPath) expect(session.move(action).ok).toBe(true);
    expect(session.status()).toBe('won');
    expect(session.setsLeft).toBe(0);
  });
});
test('every legal action is accepted and undo restores an independent snapshot', () => {
  const game = new GameSession(level());
  const before = game.save();
  for(const action of legalActions(game.state, game.cards)) {
    expect(game.move(action).ok).toBe(true);
    expect(game.state.moves).toBe(before.state.moves - 1);
    expect(game.undo().ok).toBe(true);
    expect(game.save()).toEqual(before);
  }
  game.move({t:'draw'});
  expect(before.state).not.toEqual(game.state);
  const restored = GameSession.restore(game.save());
  expect(restored.save()).toEqual(game.save());
  restored.move({t:'draw'});
  expect(restored.state).not.toEqual(game.state);
});
test('illegal placements and exhausted moves leave state unchanged', () => {
  const game = new GameSession(level());
  const before = cloneState(game.state);
  expect(applyAction(game.state, game.cards, {t:'move',from:{z:'col',i:0,idx:0},to:{z:'found',i:0}}).ok).toBe(false);
  expect(game.state).toEqual(before);
  game.state.moves = 0;
  expect(game.move({t:'draw'})).toEqual({ok:false,reason:'noMoves'});
});
test('wild cards are reversible and rescued moves persist through undo', () => {
  const game = new GameSession(level());
  game.state.cols[0] = [];
  const count = game.cards.length;
  expect(game.placeWild(0)).toBe(count);
  expect(game.undo()).toEqual({ok:true,wildRefund:true});
  expect(game.cards.length).toBe(count);
  game.move({t:'draw'}); game.addMoves(10); game.undo();
  expect(game.state.moves).toBe(game.startBudget + 10);
});
test('daily puzzle is deterministic and quick-play solver supplies enough moves', () => {
  expect(dailyLevel('2026-11-17')).toEqual(dailyLevel('2026-11-17'));
  for(const tier of ['casual','standard','expert']) {
    const def = quickLevel(tier,1234);
    expect(def.par).toBeGreaterThan(0); expect(def.budget).toBeGreaterThanOrEqual(def.par);
  }
});
test('workshop rejects malformed and oversized imported puzzles', () => {
  const draft = {title:'Test',categories:['days','pasta','beach'],cards:3,seed:9020,multiplier:2};
  expect(validateDraft(draft)).toEqual(draft);
  for(const patch of [{cards:999},{seed:-1},{multiplier:Infinity},{categories:['missing','days','pasta']},{categories:['days','days','days']}]) expect(()=>validateDraft({...draft,...patch})).toThrow();
});
test('reward failures unmute audio and do not award a reward', async () => {
  const states: boolean[] = [];
  sdk.setMuteHook(value=>states.push(value));
  installPlatform({rewarded:async()=>{throw new Error('SDK unavailable');}});
  expect(await sdk.rewarded('test')).toBe(false);
  expect(states).toEqual([true,false]);
  installPlatform({rewarded:async()=>true});
  expect(await sdk.rewarded('test')).toBe(true);
  installPlatform({});
});
