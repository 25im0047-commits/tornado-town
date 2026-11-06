class ArcadeAudio {
  constructor(){this.enabled=true;this.ctx=null;this.gain=null;this.wind=null;this.voices=new Set();this.nextBeat=0;this.beat=0;this.lastPickup=-1;this.lastImpact=-1;}
  init(){
    if(this.ctx){this.ctx.resume();this.gain.gain.setTargetAtTime(this.enabled?.62:0,this.ctx.currentTime,.04);return;}
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;this.ctx=new Audio();const c=this.ctx;
      this.gain=c.createGain();this.gain.gain.value=this.enabled?.62:0;
      const compressor=c.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=16;compressor.ratio.value=6;compressor.attack.value=.003;compressor.release.value=.15;
      this.gain.connect(compressor);compressor.connect(c.destination);
      this.music=c.createGain();this.music.gain.value=0;this.music.connect(this.gain);
      this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const src=c.createBufferSource();src.buffer=this.noise;src.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;
      this.wind=c.createGain();this.wind.gain.value=0;src.connect(filter);filter.connect(this.wind);this.wind.connect(this.gain);src.start();
    }catch{this.enabled=false;this.ctx=null;}
  }
  track(node,cleanup=[]){this.voices.add(node);node.onended=()=>{this.voices.delete(node);node.disconnect();for(const n of cleanup)n.disconnect();};}
  mute(value){this.enabled=!value;if(this.enabled)this.init();if(this.ctx)this.gain.gain.setTargetAtTime(this.enabled?.62:0,this.ctx.currentTime,.025);}
  reset(){for(const n of this.voices){try{n.stop();}catch{}}this.voices.clear();this.beat=0;this.nextBeat=0;this.lastPickup=this.lastImpact=-1;}
  setWind(value){const target=this.enabled?value*.25:0;if(this.wind&&this.ctx&&target!==this.lastWind){this.wind.gain.setTargetAtTime(target,this.ctx.currentTime,.1);this.lastWind=target;}}
  tone(freq,duration=.15,vol=.15,slide=1,type='sine',at=0,music=false){
    if(!this.enabled||!this.ctx||this.voices.size>=40)return;
    const c=this.ctx,t=at||c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;
    o.frequency.setValueAtTime(Math.max(20,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,vol),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(music?this.music:this.gain);this.track(o,[g]);o.start(t);o.stop(t+duration+.025);
  }
  noiseHit(duration,volume,freq=900,at=0,music=false){
    if(!this.enabled||!this.ctx||this.voices.size>=40)return;
    const c=this.ctx,t=at||c.currentTime,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noise;f.type='bandpass';f.frequency.setValueAtTime(freq,t);f.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.3),t+duration);f.Q.value=.6;
    g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(music?this.music:this.gain);this.track(s,[f,g]);s.start(t);s.stop(t+duration+.02);
  }
  pickup(tier,combo){
    if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime;
    if(t-this.lastPickup>.035){const scale=[0,3,5,7,10,12,15,17];const note=scale[Math.min(7,Math.floor(combo/3))];this.tone(330*Math.pow(2,note/12),.115,.11,1.08,'triangle');this.lastPickup=t;}
    if(tier>=3&&t-this.lastImpact>.12){this.tone(tier>=5?62:94,.25,.28,.25,'sine');this.noiseHit(.18,.15,tier>=5?420:850);this.lastImpact=t;}
  }
  gust(){this.noiseHit(.55,.33,1400);this.tone(170,.35,.2,.2,'sawtooth');}
  levelUp(){if(!this.ctx)return;const t=this.ctx.currentTime;[523.25,659.25,783.99,1046.5].forEach((n,i)=>this.tone(n,.25,.17,1.01,'triangle',t+i*.075));this.noiseHit(.19,.16,1500);}
  fever(){if(!this.ctx)return;const t=this.ctx.currentTime;[330,440,523,660,880].forEach((n,i)=>this.tone(n,.28,.18,1.02,'square',t+i*.055));this.tone(65,.45,.3,.4);}
  win(){if(!this.ctx)return;const t=this.ctx.currentTime;[523,659,784,1046,1318,1568].forEach((n,i)=>this.tone(n,.32,.18,1,'triangle',t+i*.10));this.noiseHit(.45,.2,1800,t+.3);}
  tick(active,fever=false){
    if(!this.ctx)return;const c=this.ctx;
    const musicVolume=active&&this.enabled?.32:0;
    if(musicVolume!==this.lastMusic){this.music.gain.setTargetAtTime(musicVolume,c.currentTime,.06);this.lastMusic=musicVolume;}
    if(!active||!this.enabled){this.nextBeat=c.currentTime+.05;return;}
    if(this.nextBeat<c.currentTime-.15)this.nextBeat=c.currentTime+.02;
    const bpm=fever?158:140,stepTime=60/bpm/4;
    const melody=[0,12,7,15,12,7,3,10,0,7,12,19,15,12,10,7];
    let scheduled=0;
    while(this.nextBeat<c.currentTime+.10&&scheduled++<5){
      const t=this.nextBeat,s=this.beat%16,root=this.beat%64<32?130.81:103.83;
      if(s%4===0){this.tone(120,.14,.7,.28,'sine',t,true);this.tone(root/2,.16,.32,1,'triangle',t,true);}
      if(s===4||s===12)this.noiseHit(.095,.29,1700,t,true);
      if(s%2===0)this.noiseHit(.025,.13,6500,t,true);
      this.tone(root*2*Math.pow(2,melody[s]/12),fever?.13:.10,fever?.20:.14,1,'triangle',t,true);
      this.nextBeat+=stepTime;this.beat++;
    }
  }
}
