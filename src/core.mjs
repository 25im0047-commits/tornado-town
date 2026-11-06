export const LEVELS = [
  { xp: 0, name: 'つむじ風', target: '木・街灯', radius: 4.5, scale: 1, speed: 17 },
  { xp: 50, name: '小さな竜巻', target: '車', radius: 6.2, scale: 1.3, speed: 18 },
  { xp: 180, name: '街角の竜巻', target: '家', radius: 8.5, scale: 1.8, speed: 19 },
  { xp: 520, name: '暴風', target: '商店・マンション', radius: 11, scale: 2.3, speed: 20 },
  { xp: 1250, name: '巨大竜巻', target: '高層ビル', radius: 14, scale: 2.9, speed: 21 },
  { xp: 2600, name: 'スーパーセル', target: '時計塔', radius: 18, scale: 3.6, speed: 22 },
];
export const RUN_SECONDS = 150;
export const MAP_LIMIT = 91;
export function levelForXP(xp) {
  let level = 0;
  for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) level = i;
  return level;
}
export function normalizedInput(x, y) {
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}
export function cameraRig(scale, aspect = 16/9) {
  const size = Math.max(1,Math.min(3.6,scale));
  const growth = (size-1)/2.6;
  const narrow = 1+Math.max(0,1-Math.max(.25,aspect))*.35;
  const distance = (26+(size-1)*23)*narrow;
  const pitch = (26+growth*5)*Math.PI/180;
  const horizontal = distance*Math.cos(pitch);
  return { x:horizontal*.5547, y:distance*Math.sin(pitch), z:horizontal*.83205, focusY:size*4.2, distance, pitch };
}
export class GameState {
  constructor(entities = []) {
    this.entities = entities;
    this.totalValue = entities.reduce((sum, e) => sum + e.value, 0);
    this.reset();
  }
  reset() {
    this.x = -61; this.z = 61;
    this.xp = 0; this.level = 0; this.count = 0;
    this.remaining = RUN_SECONDS; this.phase = 'ready';
    this.cooldown = 0; this.boostLeft = 0; this.won = false;
    this.combo = 0; this.maxCombo = 0; this.chainLeft = 0; this.feverLeft = 0; this.feverCount = 0;
    this.collected = new Set();
  }
  get stats() { return LEVELS[this.level]; }
  get absorbRadius() { return this.stats.radius * (this.boostLeft > 0 ? 1.45 : 1) * (this.feverLeft > 0 ? 1.2 : 1); }
  get progress() {
    const next = LEVELS[this.level + 1];
    return next ? Math.min(1, (this.xp - this.stats.xp) / (next.xp - this.stats.xp)) : 1;
  }
  get destroyed() { return this.totalValue ? Math.min(100, this.xp / this.totalValue * 100) : 0; }
  start() { if (this.phase === 'ready') this.phase = 'playing'; }
  pause() { if (this.phase === 'playing' || this.phase === 'free') { this.resumePhase = this.phase; this.phase = 'paused'; } }
  resume() { if (this.phase === 'paused') this.phase = this.resumePhase || 'playing'; }
  freePlay() { if (this.phase === 'ended') this.phase = 'free'; }
  boost() {
    if (!['playing', 'free'].includes(this.phase) || this.cooldown > 0) return false;
    this.boostLeft = 1.5; this.cooldown = 7;
    return true;
  }
  consume(entity, distance) {
    if (!['playing', 'free'].includes(this.phase) || this.collected.has(entity.id)) return false;
    if (entity.tier > this.level + 1 || distance > this.absorbRadius) return false;
    this.collected.add(entity.id);
    this.xp += entity.value; this.count++;
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.chainLeft = 2.5;
    if (this.combo % 20 === 0 && this.feverLeft <= 0) { this.feverLeft = 7; this.feverCount++; }
    this.level = levelForXP(this.xp);
    if (entity.landmark && this.phase === 'playing') {
      this.won = true; this.phase = 'ended';
    }
    return true;
  }
  step(dt, inputX = 0, inputY = 0) {
    if (!['playing', 'free'].includes(this.phase)) return;
    dt = Math.max(0, Math.min(dt, 0.1));
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.boostLeft = Math.max(0, this.boostLeft - dt);
    this.chainLeft = Math.max(0, this.chainLeft - dt);
    this.feverLeft = Math.max(0, this.feverLeft - dt);
    if (this.chainLeft === 0) this.combo = 0;
    const input = normalizedInput(inputX, inputY);
    const speed = this.stats.speed * (this.boostLeft > 0 ? 1.55 : 1) * (this.feverLeft > 0 ? 1.18 : 1);
    // Camera-aligned movement: right = (0.832, -0.555), up = (-0.555, -0.832).
    this.x += (input.x * 0.83205 + input.y * 0.5547) * speed * dt;
    this.z += (-input.x * 0.5547 + input.y * 0.83205) * speed * dt;
    this.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.x));
    this.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.z));
    if (this.phase === 'playing') {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining === 0) this.phase = 'ended';
    }
  }
}
export function seededRandom(seed = 41) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
