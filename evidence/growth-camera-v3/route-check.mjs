import { readFile,writeFile } from 'node:fs/promises';
import { GameState as OldGame } from './baseline-core.mjs';
import { GameState as NewGame,LEVELS } from '../../src/core.mjs';
const entities=JSON.parse(await readFile(new URL('./entities.json',import.meta.url),'utf8'));
function run(Game){
  const game=new Game(entities);game.start();let time=0;const milestones=[];
  for(let frame=0;frame<150*20&&game.phase==='playing';frame++){
    if(game.cooldown<=0)game.boost();
    let closest=null,distance=Infinity;
    for(const e of entities){
      if(game.collected.has(e.id)||e.tier>game.level+1)continue;
      const d=Math.hypot(e.x-game.x,e.z-game.z);
      if(game.level===5&&e.landmark){closest=e;distance=d;break;}
      if(d<distance){closest=e;distance=d;}
    }
    if(!closest)break;
    const dx=(closest.x-game.x)/Math.max(distance,.001),dz=(closest.z-game.z)/Math.max(distance,.001);
    game.step(.05,dx*.83205-dz*.5547,dx*.5547+dz*.83205);time+=.05;
    let taken=0;
    for(const e of entities){
      const before=game.level;
      if(game.consume(e,Math.hypot(e.x-game.x,e.z-game.z))){
        taken++;
        if(game.level!==before)milestones.push({level:game.level+1,time:+time.toFixed(2),xp:game.xp,count:game.count});
        if(taken>=5||game.phase!=='playing')break;
      }
    }
  }
  return {won:game.won,time:+time.toFixed(2),xp:game.xp,count:game.count,destroyed:+game.destroyed.toFixed(1),milestones};
}
const capacity=LEVELS.slice(1).map((level,i)=>({unlockLevel:i+2,needed:level.xp,available:entities.filter(e=>e.tier<=i+1).reduce((s,e)=>s+e.value,0)}));
const result={capacity,baseline:run(OldGame),candidate:run(NewGame),method:'Deterministic nearest eligible object, normal movement, boosts when ready; simulation, not human play.'};
await writeFile(new URL('./balance-checks.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({baselineSeconds:result.baseline.time,adjustedSeconds:result.candidate.time,reachable:result.candidate.won}));
