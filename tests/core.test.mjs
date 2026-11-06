import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, LEVELS, MAP_LIMIT, normalizedInput } from '../src/core.mjs';
const e = (id, tier, value, landmark = false) => ({ id, tier, value, landmark });
test('absorption rejects locked, out-of-range, and duplicate objects', () => {
  const g = new GameState(); g.start();
  assert.equal(g.consume(e(0, 2, 6), 0), false);
  assert.equal(g.consume(e(1, 1, 2), 100), false);
  assert.equal(g.consume(e(1, 1, 2), 0), true);
  assert.equal(g.consume(e(1, 1, 2), 0), false);
  assert.equal(g.xp, 2); assert.equal(g.count, 1);
});
test('progression unlocks every tier and the tower ends the run', () => {
  const g = new GameState(); g.start();
  for (let i = 1; i < LEVELS.length; i++) {
    assert.equal(g.consume(e(i, i, LEVELS[i].xp - g.xp), 0), true);
    assert.equal(g.level, i); assert.equal(g.progress, i === 5 ? 1 : 0);
  }
  assert.equal(g.consume(e(99, 6, 300, true), 0), true);
  assert.equal(g.phase, 'ended'); assert.equal(g.won, true);
});
test('pause freezes time, movement, and cooldown; resume restores them', () => {
  const g = new GameState(); g.start(); g.boost(); g.pause();
  const before = [g.x, g.z, g.remaining, g.cooldown];
  g.step(0.1, 1, 1);
  assert.deepEqual([g.x, g.z, g.remaining, g.cooldown], before);
  assert.equal(g.consume(e(0, 1, 2), 0), false);
  g.resume(); g.step(0.1, 1, 0);
  assert.ok(g.x > before[0]); assert.ok(g.remaining < before[2]);
});
test('diagonal input is normalized and long steps cannot teleport', () => {
  assert.ok(Math.abs(Math.hypot(...Object.values(normalizedInput(1, 1))) - 1) < 1e-10);
  const g = new GameState(); g.start(); const x = g.x, z = g.z;
  g.step(100, 1, 1);
  assert.ok(Math.hypot(g.x - x, g.z - z) <= g.stats.speed * 0.10001);
  for (let i = 0; i < 300; i++) g.step(0.1, 1, 1);
  assert.ok(Math.abs(g.x) <= MAP_LIMIT && Math.abs(g.z) <= MAP_LIMIT);
});
test('timeout and restart preserve a playable, clean new round', () => {
  const entities = [e(1, 1, 5), e(2, 1, 5)];
  const g = new GameState(entities); g.start(); g.consume(entities[0], 0);
  assert.equal(g.destroyed, 50);
  g.remaining = 0.05; g.step(0.1); assert.equal(g.phase, 'ended');
  g.freePlay(); assert.equal(g.phase, 'free'); g.pause(); g.resume(); assert.equal(g.phase, 'free');
  g.reset(); assert.equal(g.count, 0); assert.equal(g.level, 0); assert.equal(g.collected.size, 0);
  assert.equal(g.phase, 'ready'); assert.equal(g.remaining, 150);
});

test('twenty valid consecutive pickups start fever without inflating destruction credit', () => {
  const entities=Array.from({length:25},(_,i)=>e(i,1,1));
  const g=new GameState(entities);g.start();
  for(let i=0;i<20;i++)assert.equal(g.consume(entities[i],0),true);
  assert.equal(g.combo,20);assert.equal(g.maxCombo,20);assert.equal(g.feverLeft,7);assert.equal(g.feverCount,1);
  assert.equal(g.xp,20);assert.equal(g.destroyed,80);
  const before=g.combo;assert.equal(g.consume(entities[0],0),false);assert.equal(g.combo,before);
  assert.equal(g.consume(e(100,6,100),0),false);assert.equal(g.combo,before);
  const beyondNormal=g.stats.radius*1.1;
  assert.equal(g.consume(entities[20],beyondNormal),true);
});

test('combo expires, fever has a bounded duration, and pause freezes both clocks', () => {
  const g=new GameState();g.start();
  for(let i=0;i<20;i++)g.consume(e(i,1,1),0);
  g.pause();const timers=[g.chainLeft,g.feverLeft,g.remaining];g.step(.1,1,0);
  assert.deepEqual([g.chainLeft,g.feverLeft,g.remaining],timers);
  g.resume();for(let i=0;i<30;i++)g.step(.1);
  assert.equal(g.combo,0);assert.equal(g.maxCombo,20);assert.ok(g.feverLeft>3.9&&g.feverLeft<4.1);
  for(let i=0;i<42;i++)g.step(.1);
  assert.equal(g.feverLeft,0);assert.equal(g.absorbRadius,g.stats.radius);
  assert.equal(g.consume(e(30,1,1),g.stats.radius*1.1),false);
  assert.equal(g.consume(e(30,1,1),0),true);assert.equal(g.combo,1);
  g.reset();assert.equal(g.combo,0);assert.equal(g.maxCombo,0);assert.equal(g.feverCount,0);assert.equal(g.feverLeft,0);
});
