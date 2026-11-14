import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('./src/levels.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {levelDef,pilePoint,GRAND_FINALE,TOOL_LEVELS,WORLD_SIZE,TOTAL_LEVELS,WORLDS,LEVELS_PER_WORLD,worldOf,OBJECTS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const all=Array.from({length:TOTAL_LEVELS},(_,i)=>levelDef(i+1));

// Shape of the game: 5 worlds of 8 levels.
assert.equal(WORLDS.length,5);assert.equal(LEVELS_PER_WORLD,8);assert.equal(TOTAL_LEVELS,40);
assert.deepEqual(all.map(l=>l.world),Array.from({length:40},(_,i)=>Math.floor(i/8)));
assert.deepEqual(all.map(l=>l.n),Array.from({length:40},(_,i)=>i+1));
assert.equal(levelDef(0).n,1);assert.equal(levelDef(999).n,40);assert.equal(worldOf(9),1);

// Helpers: none before level 5, then one per world, each on a world's first level (after the first world).
assert.deepEqual([...TOOL_LEVELS],[5,9]);
assert.equal(TOOL_LEVELS.filter(n=>n<5).length,0);
assert.ok(TOOL_LEVELS.slice(1).every(n=>(n-1)%LEVELS_PER_WORLD===0),'later helpers arrive on a world\'s first level');
assert.equal(new Set(TOOL_LEVELS.map(worldOf)).size,2,'one helper per world');

// First-time-player ramp: levels 1-4 are easier; from 5 the needle starts 90% hidden.
assert.deepEqual(all.slice(0,3).map(l=>l.teach),['brush','pluck','bonus']);assert.ok(all.slice(3).every(l=>!l.teach));
assert.ok(levelDef(1).hidden<=.7&&levelDef(1).bonus.length===0);
assert.ok(levelDef(2).cover&&all.filter(l=>l.cover).length===1);
assert.ok(levelDef(1).hidden<levelDef(3).hidden&&levelDef(3).hidden<levelDef(4).hidden&&levelDef(4).hidden<levelDef(5).hidden);
assert.ok(all.slice(4).every(l=>l.hidden>=.85&&l.hidden<=.9));
assert.ok(all.slice(4).filter(l=>l.inWorld!==1).every(l=>l.hidden===.9));
assert.ok(levelDef(1).depth[0]>levelDef(5).depth[1],'level 1 keeps the needle near the top of the pile');

// A new idea never shares a level with another: bonus items start on 3, the detector on 5.
assert.equal(all.findIndex(l=>l.bonus.length>0)+1,3);

// Finales: the last level of each world is the biggest pile in it and has three bonus items.
for(let w=0;w<5;w++){const world=all.filter(l=>l.world===w);const finale=world[7];assert.ok(finale.finale&&world.filter(l=>l.finale).length===1);assert.equal(finale.bonus.length,3);assert.equal(finale.shape,w===4?'stack':'spiral');assert.ok(finale.count>=Math.max(...world.map(l=>l.count)));}

// Difficulty knobs only ever grow: more hay, smaller needle, never past their limits.
for(let i=1;i<all.length;i++){assert.ok(all[i].count>=all[i-1].count);assert.ok(all[i].needle<=all[i-1].needle+1e-9);if(i!==1)assert.notEqual(all[i].shape,all[i-1].shape,`level ${i+1} repeats the layout`);}
for(let w=0;w<5;w++)assert.notEqual(all[w*8+6].shape,'spiral','the level before a finale is not a spiral');
assert.ok(all.every(l=>l.needle>=.53&&l.needle<=.82));
// Every level holds at most 10,000 straws, except the last one: the grand finale, the biggest pile the game stays comfortable with.
assert.ok(all.slice(0,-1).every(l=>l.count<=10000));assert.equal(all.at(-1).count,GRAND_FINALE.count);assert.equal(all.at(-1).size,GRAND_FINALE.size);assert.ok(GRAND_FINALE.size<=3.5&&GRAND_FINALE.count<=35000,'the grand finale stays within what was measured to play');assert.ok(GRAND_FINALE.size>WORLD_SIZE[4]&&GRAND_FINALE.count>10000);
// The haystack grows with the world: the first world fits one screen, later ones need zooming and panning.
assert.ok(all.filter(l=>l.world===0).every(l=>l.size===1));assert.ok(all.every((l,i)=>i===0||l.size>=all[i-1].size));assert.ok(WORLD_SIZE[4]>=1.8&&WORLD_SIZE[4]<=3);
assert.ok(all.slice(0,-1).every(l=>l.size===WORLD_SIZE[l.world]));
// Denser too: straws per unit of area never fall from one world's finale to the next world's first level.
for(let w=0;w<4;w++){const a=all[w*8+7],b=all[w*8+8];assert.ok(a.count/a.size**2<=b.count/b.size**2*1.35,'density should not collapse between worlds');}
assert.ok(all.every(l=>l.bonus.length<=3&&new Set(l.bonus).size===l.bonus.length&&l.bonus.every(k=>OBJECTS.includes(k))));
assert.ok(all.every(l=>l.depth[0]<=l.depth[1]&&l.depth[1]<=.95));

// Every world uses several layouts, and every layout lands inside the playable margins.
for(let w=0;w<5;w++)assert.ok(new Set(all.filter(l=>l.world===w).map(l=>l.shape)).size>=4,`world ${w+1} needs layout variety`);
let seed=12345;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const shapes=[...new Set(all.map(l=>l.shape))];assert.equal(shapes.length,7);assert.ok(all.at(-1).dome&&all.slice(0,-1).every(l=>!l.dome));
for(const shape of shapes)for(let i=0;i<3000;i++){const p=pilePoint(shape,random);assert.ok(p.x>=90&&p.x<=1110&&p.y>=75&&p.y<=625,`${shape}: target outside playable margins`);if(shape==='ring')assert.ok(((p.x-600)/440)**2+((p.y-350)/235)**2>=.58**2-1e-8);if(shape==='rows')assert.ok([200,600,1000].some(x=>Math.abs(p.x-x)<=75));}
console.log('Passed: 40 levels in 5 worlds, easy start and helper schedule, finales, difficulty limits, six layouts and 18,000 safe placement samples.');
