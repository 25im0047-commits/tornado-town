class ArcadeFX {
  constructor(canvas, reduced = false) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reduced = reduced;
    this.colors = ['#ffdf27','#ff713a','#45efff','#ffffff','#ff53bb'];
    this.reset(); this.resize();
  }
  reset() { this.particles = []; this.words = []; this.trauma = 0; this.zoom = 0; this.rush = 0; this.time = 0; this.wordCooldown = 0; }
  resize() {
    this.w = innerWidth; this.h = innerHeight; const ratio = Math.min(devicePixelRatio || 1,1.5);
    this.canvas.width = Math.round(this.w*ratio); this.canvas.height = Math.round(this.h*ratio);
    this.ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  punch(amount = .3) { this.trauma = Math.min(1,this.trauma+amount); this.zoom = Math.min(1,this.zoom+amount*.85); this.rush = Math.min(1,this.rush+amount*.7); }
  particlesAt(x,y,n=12,power=1) {
    const count = this.reduced ? Math.min(5,n) : n;
    for(let i=0;i<count;i++) {
      const angle = Math.random()*Math.PI*2, speed = (60+Math.random()*220)*power;
      this.particles.push({ x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-70,life:.35+Math.random()*.5,size:3+Math.random()*8,color:this.colors[i%this.colors.length],angle,spin:Math.random()*8-4,star:i%4===0 });
    }
    if(this.particles.length>320)this.particles.splice(0,this.particles.length-320);
  }
  word(text,x,y,size=34,color='#ffe431',life=.85) {
    this.words.push({text,x,y,size,color,life,max:life,angle:(Math.random()-.5)*.28});
    if(this.words.length>22)this.words.shift();
  }
  hit(tier,value,combo,x,y,bannerActive=false) {
    x=Math.max(this.w*.15,Math.min(this.w*.85,x)); y=Math.max(this.h*.25,Math.min(this.h*.73,y));
    this.punch(tier>=3?.34+tier*.025:.065);
    this.particlesAt(x,y,tier>=3?22:8,tier>=3?1.3:.6);
    this.word(`+${value}`,x+(Math.random()-.5)*55,y,Math.min(44,24+tier*3),'#fff531',.8);
    if(tier>=3&&this.wordCooldown<=0&&!bannerActive) {
      this.word(tier>=5?'ズゴォォ!!':tier>=4?'バキバキッ!!':'バキィッ!!',x+(x<this.w/2?65:-65),y-48,Math.min(this.w*.085,42+tier*4),tier>=5?'#ff8044':'#fff5dd',.75);
      this.wordCooldown=.24;
    }
    if(combo>=5&&combo%5===0) {
      this.particlesAt(this.w*.5,this.h*.66,18,1);
      this.punch(.14);
    }
  }
  celebrate(kind) {
    this.punch(kind==='win'?1:.85); this.rush=1;
    this.particlesAt(this.w*.5,this.h*.46,kind==='win'?105:65,1.6);
  }
  update(dt) {
    this.time+=dt;this.trauma*=Math.exp(-dt*7);this.zoom*=Math.exp(-dt*8);this.rush=Math.max(0,this.rush-dt*1.8);this.wordCooldown-=dt;
    for(const p of this.particles){p.life-=dt;if(!this.reduced){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.angle+=p.spin*dt;}}
    for(const p of this.words){p.life-=dt;if(!this.reduced)p.y-=dt*43;}
    this.particles=this.particles.filter(p=>p.life>0);this.words=this.words.filter(p=>p.life>0);
  }
  draw({active=false,boost=false,fever=false}={}) {
    const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);
    const strength = active ? Math.max(this.rush,boost?.75:0,fever?.42:0) : this.rush;
    if(strength>.015&&!this.reduced) {
      c.save();c.translate(w*.5,h*.53);
      const inner=Math.min(w,h)*.46,outer=Math.hypot(w,h)*.8;
      for(let i=0;i<56;i++) {
        const a=i/56*Math.PI*2+Math.sin(i*13.4)*.015;
        const pulse=.5+.5*Math.sin(this.time*16+i*7);
        const r=inner*(.85+pulse*.36),width=(i%3===0?.025:.008)*strength;
        c.beginPath();c.moveTo(Math.cos(a-width)*outer,Math.sin(a-width)*outer);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(a+width)*outer,Math.sin(a+width)*outer);c.closePath();
        c.fillStyle=i%3===0?`rgba(17,23,40,${strength*.6})`:`rgba(255,249,203,${strength*.75})`;c.fill();
      }
      c.restore();
      const glow=c.createRadialGradient(w*.5,h*.53,Math.min(w,h)*.27,w*.5,h*.53,Math.hypot(w,h)*.6);
      glow.addColorStop(0,'rgba(255,197,15,0)');glow.addColorStop(1,`rgba(${fever?'255,115,25':'255,222,65'},${strength*.24})`);c.fillStyle=glow;c.fillRect(0,0,w,h);
    }
    for(const p of this.particles) {
      c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.globalAlpha=Math.min(1,p.life*4);c.fillStyle=p.color;c.strokeStyle='#15223a';c.lineWidth=1.5;
      if(p.star){c.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-Math.PI/2,r=p.size*(j%2?.42:1);j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.stroke();c.fill();}
      else{c.fillRect(-p.size/2,-p.size/2,p.size,p.size*.6);}
      c.restore();
    }
    for(const p of this.words) {
      const progress=1-p.life/p.max,scale=this.reduced?1:progress<.17?.65+progress/.17*.55:1.2-(progress-.17)*.3;
      c.save();c.translate(p.x,p.y);c.rotate(this.reduced?0:p.angle);c.scale(scale,scale);c.globalAlpha=Math.min(1,p.life*5);
      c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.font=`900 ${p.size}px "Hiragino Sans","Arial Black",system-ui,sans-serif`;
      c.strokeStyle='#142033';c.lineWidth=Math.max(5,p.size*.16);c.strokeText(p.text,0,3);c.fillStyle=p.color;c.fillText(p.text,0,0);c.restore();
    }
    this.canvas.dataset.particles=this.particles.length;this.canvas.dataset.words=this.words.length;this.canvas.dataset.shake=this.trauma.toFixed(3);
    this.canvas.dataset.rays=(!this.reduced&&strength>.015?'active':'off');
  }
}
