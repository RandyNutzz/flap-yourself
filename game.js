/* ══ GAME ══ */
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ── State ──────────────────────────────────────────────
let gSt   = 'wait';   // 'wait' | 'run' | 'dead'
let score = 0, best = 0;
let bird, pipes, parts, gStars, bgOff, fc, animId;
let bobT  = 0;        // idle bob timer

const tGlow = {
  pixel:'#5b8dee', cyberpunk:'#ff00ff', space:'#6633ff',
  forest:'#4a7c2a', ocean:'#0099ff',   sunset:'#ff6600'
};
const TH = {
  pixel:    {sky:['#1a0a2e','#16213e','#0f3460'],gr:'#3d2b1f',gt:'#5c3d2e',pb:'#2d6a2d',pc2:'#1a4a1a',pg:'rgba(0,200,0,.3)',  tc:'#00ff00',pc:['#ffff00','#ff8800','#ff4400'],bg:pxBg},
  cyberpunk:{sky:['#0a0015','#120025','#1a003a'],gr:'#0d0d1a',gt:'#ff00ff',pb:'#1a1a3a',pc2:'#ff00ff',pg:'rgba(255,0,255,.4)', tc:'#00ffff',pc:['#ff00ff','#00ffff','#ffff00'],bg:cpBg},
  space:    {sky:['#000005','#00000f','#000520'],gr:'#111122',gt:'#6633ff',pb:'#223344',pc2:'#6633ff',pg:'rgba(102,51,255,.4)',tc:'#aaccff',pc:['#aaccff','#ffaaff','#fff'],   bg:spBg},
  forest:   {sky:['#0d1f0d','#1a3d1a','#2d5a2d'],gr:'#2d1a0a',gt:'#4a7c2a',pb:'#1a4a1a',pc2:'#4a7c2a',pg:'rgba(74,124,42,.4)', tc:'#aaff77',pc:['#aaff77','#ffdd44','#88ff44'],bg:frBg},
  ocean:    {sky:['#000d1a','#001a33','#00264d'],gr:'#001a33',gt:'#0066cc',pb:'#003366',pc2:'#0099ff',pg:'rgba(0,153,255,.4)', tc:'#00ccff',pc:['#00ccff','#fff','#aaddff'],  bg:ocBg},
  sunset:   {sky:['#1a0505','#3d1010','#7a2020'],gr:'#2d1a0a',gt:'#ff6600',pb:'#4a1a00',pc2:'#ff6600',pg:'rgba(255,102,0,.4)', tc:'#ffaa44',pc:['#ff6600','#ffaa00','#ffdd00'],bg:ssBg}
};

function startFresh(){
  cancelAnimationFrame(animId);
  const g = tGlow[currentTheme];
  canvas.style.borderColor = 'transparent';
  canvas.style.boxShadow   = `0 0 40px ${g}44`;
  bird  = {x:80, y:H/2, vy:0, r:22, ang:0, flap:0};
  pipes = []; parts = []; bgOff = 0; fc = 0; score = 0; bobT = 0;
  gSt   = 'wait';
  updateUI();
  gStars = Array.from({length:80}, ()=>({
    x:Math.random()*W, y:Math.random()*H,
    r:Math.random()*2+.4, tw:Math.random()*Math.PI*2, sp:Math.random()*.5+.2
  }));
  animId = requestAnimationFrame(loop);
}

// ── Input ──────────────────────────────────────────────
function flap(){
  if(gSt === 'wait'){
    gSt = 'run';
    bird.vy = -8;
    bird.flap = 1;
    mkParts(bird.x, bird.y, 5);
    sFlap();
    return;
  }
  if(gSt === 'run'){
    bird.vy = -8;
    bird.flap = 1;
    mkParts(bird.x, bird.y, 5);
    sFlap();
    return;
  }
  if(gSt === 'dead'){
    startFresh();
  }
}

// ── Input: attach to gameScreen, not canvas ─────────────
// This way the Play button click (which is in menuScreen) 
// physically cannot trigger game input.
const gameScreen = document.getElementById('gameScreen');

gameScreen.addEventListener('click',      ()=> flap());
gameScreen.addEventListener('touchstart', e => { e.preventDefault(); flap(); });
document.addEventListener('keydown', e => {
  if(e.code === 'Space' || e.code === 'ArrowUp'){
    e.preventDefault();
    if(!gameScreen.classList.contains('off')) flap();
  }
});

// Play button is inside menuScreen — click cannot reach gameScreen
document.getElementById('playBtn').addEventListener('click', launch);

// ── Helpers ────────────────────────────────────────────
function spawnPipe(){
  const gap=155, minY=80, maxY=H-130-gap;
  pipes.push({x:W+40, th:minY+Math.random()*(maxY-minY), gap, ok:false, w:58});
}

function mkParts(x,y,n){
  const c = TH[currentTheme].pc;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, spd=Math.random()*4+1;
    parts.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,
      life:1,dec:.04+Math.random()*.03,col:c[~~(Math.random()*c.length)],sz:Math.random()*4+2});
  }
}

function updateUI(){
  document.getElementById('scoreTxt').textContent = score;
  document.getElementById('bestTxt').textContent  = best;
}

// ── Collision ──────────────────────────────────────────
// Check BEFORE moving so fast speed can't skip through
function hitTest(){
  // Ground / ceiling
  if(bird.y + bird.r >= H-40) return true;
  if(bird.y - bird.r <= 0)    return true;
  // Pipes — 2px leniency so it feels fair
  const leniency = 2;
  for(const p of pipes){
    if(bird.x + bird.r - leniency <= p.x)         continue; // not reached yet
    if(bird.x - bird.r + leniency >= p.x + p.w)   continue; // already passed
    // In X range — check Y
    if(bird.y - bird.r + leniency < p.th)          return true; // hit top pipe
    if(bird.y + bird.r - leniency > p.th + p.gap)  return true; // hit bottom pipe
  }
  return false;
}

// ── Backgrounds ────────────────────────────────────────
function skyG(cols){
  const g=ctx.createLinearGradient(0,0,0,H);
  cols.forEach((c,i,a)=>g.addColorStop(i/(a.length-1),c));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
function pxBg(){skyG(TH.pixel.sky);ctx.fillStyle='#fff';for(const s of gStars){const tw=.5+.5*Math.sin(s.tw+fc*.03);ctx.globalAlpha=tw*.75;ctx.fillRect(~~s.x,~~s.y,Math.ceil(s.r),Math.ceil(s.r));}ctx.globalAlpha=1;ctx.fillStyle='#0d2b0d';for(let x=0;x<W;x+=16){const h=20+15*Math.sin((x+bgOff*.5)*.05);ctx.fillRect(x,H-60-h,16,h+4);}}
function cpBg(){skyG(TH.cyberpunk.sky);ctx.strokeStyle='rgba(255,0,255,.09)';ctx.lineWidth=1;for(let y=H-40;y>H/2;y-=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}for(let x=-(bgOff%40);x<W;x+=40){ctx.beginPath();ctx.moveTo(x,H/2);ctx.lineTo(W/2+(x-W/2)*2,H-40);ctx.stroke();}ctx.fillStyle='#0d001a';for(let x=0;x<W;x+=30){const h=40+60*Math.abs(Math.sin(x*.1));ctx.fillRect(x,H-60-h,27,h+4);for(let wy=H-60-h+5;wy<H-60;wy+=10)for(let wx=x+4;wx<x+24;wx+=8)if(Math.random()>.7){ctx.fillStyle=Math.random()>.5?'rgba(255,0,255,.4)':'rgba(0,255,255,.25)';ctx.fillRect(wx,wy,4,5);}ctx.fillStyle='#0d001a';}for(let y=0;y<H;y+=4){ctx.fillStyle='rgba(0,0,0,.03)';ctx.fillRect(0,y,W,2);}}
function spBg(){ctx.fillStyle='#000008';ctx.fillRect(0,0,W,H);const n=ctx.createRadialGradient(W*.3,H*.4,10,W*.3,H*.4,200);n.addColorStop(0,'rgba(102,0,204,.1)');n.addColorStop(1,'transparent');ctx.fillStyle=n;ctx.fillRect(0,0,W,H);for(const s of gStars){const tw=.4+.6*Math.abs(Math.sin(s.tw+fc*.02));ctx.beginPath();ctx.arc(s.x,s.y,s.r*tw,0,Math.PI*2);ctx.fillStyle=`rgba(200,220,255,${tw*.9})`;ctx.fill();}const pl=ctx.createRadialGradient(W-50,70,5,W-50,70,40);pl.addColorStop(0,'rgba(180,100,255,.8)');pl.addColorStop(.7,'rgba(80,0,160,.65)');pl.addColorStop(1,'transparent');ctx.fillStyle=pl;ctx.fillRect(0,0,W,H);}
function frBg(){skyG(TH.forest.sky);for(const s of gStars){const tw=.5+.5*Math.sin(s.tw+fc*.05);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(180,255,100,${tw*.5})`;ctx.fill();}ctx.fillStyle='#0a1f0a';for(let x=-((bgOff*.3)%60);x<W+60;x+=28){const h=80+40*Math.abs(Math.sin(x*.15));ctx.fillRect(x+10,H-60-h,8,h);ctx.beginPath();ctx.arc(x+14,H-60-h,22,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#152b15';for(let x=-((bgOff*.6)%40);x<W+40;x+=20){const h=50+30*Math.abs(Math.sin(x*.2+1));ctx.fillRect(x+7,H-60-h,6,h);ctx.beginPath();ctx.arc(x+10,H-60-h,15,0,Math.PI*2);ctx.fill();}}
function ocBg(){skyG(TH.ocean.sky);for(const s of gStars){const tw=.3+.7*Math.abs(Math.sin(s.tw+fc*.04));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,200,255,${tw*.4})`;ctx.fill();}for(let l=3;l>=1;l--){ctx.beginPath();ctx.moveTo(0,H-50);for(let x=0;x<=W;x+=4)ctx.lineTo(x,H-50+8*Math.sin((x+bgOff*l*.5)*.04+l)+4*Math.sin((x+bgOff)*.08));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fillStyle=`rgba(0,${60+l*30},${100+l*30},.28)`;ctx.fill();}}
function ssBg(){skyG(TH.sunset.sky);const sun=ctx.createRadialGradient(W/2,H*.55,5,W/2,H*.55,80);sun.addColorStop(0,'rgba(255,200,50,.85)');sun.addColorStop(.5,'rgba(255,100,0,.45)');sun.addColorStop(1,'transparent');ctx.fillStyle=sun;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2,H*.55);for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2+fc*.003;ctx.strokeStyle='rgba(255,180,0,.07)';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*200,Math.sin(a)*200);ctx.stroke();}ctx.restore();ctx.fillStyle='#200808';ctx.beginPath();ctx.moveTo(0,H-60);for(let x=0;x<=W;x+=8)ctx.lineTo(x,H-60-50*Math.abs(Math.sin(x*.035+.5)));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();}

// ── Draw helpers ───────────────────────────────────────
function drawPipe(p){
  const t=TH[currentTheme];
  ctx.shadowColor=t.pg; ctx.shadowBlur=10;
  const g=ctx.createLinearGradient(p.x,0,p.x+p.w,0);
  g.addColorStop(0,t.pc2); g.addColorStop(.5,t.pb); g.addColorStop(1,t.pc2);
  ctx.fillStyle=g;
  ctx.fillRect(p.x,  0,       p.w, p.th);            // top pipe body
  ctx.fillStyle=t.pc2;
  ctx.fillRect(p.x-4,p.th-14, p.w+8,14);             // top cap
  ctx.fillStyle=g;
  ctx.fillRect(p.x,  p.th+p.gap, p.w, H-(p.th+p.gap)); // bot pipe body
  ctx.fillStyle=t.pc2;
  ctx.fillRect(p.x-4,p.th+p.gap, p.w+8,14);          // bot cap
  ctx.shadowBlur=0;
}

function drawBird(){
  const b=bird, t=TH[currentTheme];
  if(gSt==='run'){
    const tgt=Math.min(Math.max(b.vy*.06,-.5),1.2);
    b.ang += (tgt-b.ang)*.15;
  }
  ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.ang);
  if(userImage){
    ctx.shadowColor=t.pc[0]; ctx.shadowBlur=14+(b.flap>0?10:0);
    ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.clip();
    const s=Math.min(userImage.width,userImage.height);
    ctx.drawImage(userImage,(userImage.width-s)/2,(userImage.height-s)/2,s,s,-b.r,-b.r,b.r*2,b.r*2);
    ctx.shadowBlur=0;
  } else {
    ctx.shadowColor=t.tc; ctx.shadowBlur=8;
    ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.ellipse(0,0,20,15,0,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.rotate(b.flap>0?-.5:.3);
    ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.ellipse(-4,-6,12,6,-.4,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(8,-5,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(9,-6,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff8800'; ctx.beginPath(); ctx.moveTo(16,-3); ctx.lineTo(24,0); ctx.lineTo(16,3); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.restore();
  if(b.flap>0) b.flap-=.1;
}

function drawGround(){
  const t=TH[currentTheme];
  ctx.fillStyle=t.gr; ctx.fillRect(0,H-40,W,40);
  ctx.fillStyle=t.gt; ctx.fillRect(0,H-40,W,6);
  ctx.fillStyle='rgba(255,255,255,.1)';
  for(let x=-(bgOff%40);x<W;x+=40) ctx.fillRect(x,H-38,20,3);
}

function drawHUD(){
  const t=TH[currentTheme];
  ctx.fillStyle=t.tc; ctx.font='15px "DM Mono"';
  ctx.textAlign='center'; ctx.shadowColor=t.tc; ctx.shadowBlur=10;
  ctx.fillText(score,W/2,38); ctx.shadowBlur=0; ctx.textAlign='left';
}

function drawWait(){
  const t=TH[currentTheme];
  const pulse=.65+.35*Math.abs(Math.sin(fc*.05));
  ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(W/2-150,H/2-72,300,138);
  ctx.strokeStyle=t.tc; ctx.lineWidth=1; ctx.globalAlpha=pulse;
  ctx.strokeRect(W/2-150,H/2-72,300,138); ctx.globalAlpha=1;
  ctx.textAlign='center';
  ctx.fillStyle=t.tc; ctx.font='bold 13px "DM Sans"';
  ctx.shadowColor=t.tc; ctx.shadowBlur=8;
  ctx.fillText('GET READY',W/2,H/2-38); ctx.shadowBlur=0;
  ctx.fillStyle='#ccc'; ctx.font='bold 11px "DM Sans"';
  ctx.fillText('Click · Tap · Space to flap',W/2,H/2-10);
  ctx.fillStyle='#555'; ctx.font='10px "DM Sans"';
  ctx.fillText(userImage?'Your photo is the bird 🐦':'Default bird in use',W/2,H/2+10);
  ctx.fillText('Avoid pipes and the ground',W/2,H/2+30);
  ctx.textAlign='left';
}

function drawDead(){
  const t=TH[currentTheme];
  ctx.fillStyle='rgba(0,0,0,.68)'; ctx.fillRect(W/2-150,H/2-82,300,158);
  ctx.strokeStyle='#ff5c5c'; ctx.lineWidth=1.5;
  ctx.strokeRect(W/2-150,H/2-82,300,158);
  ctx.textAlign='center';
  ctx.fillStyle='#ff5c5c'; ctx.font='bold 14px "DM Sans"';
  ctx.shadowColor='#ff5c5c'; ctx.shadowBlur=10;
  ctx.fillText('Game Over',W/2,H/2-50); ctx.shadowBlur=0;
  if(score>0 && score===best){
    ctx.fillStyle='#f5c542'; ctx.font='bold 10px "DM Sans"';
    ctx.shadowColor='#f5c542'; ctx.shadowBlur=6;
    ctx.fillText('New Best!',W/2,H/2-28); ctx.shadowBlur=0;
  }
  ctx.fillStyle=t.tc; ctx.font='bold 11px "DM Mono"';
  ctx.shadowColor=t.tc; ctx.shadowBlur=5;
  ctx.fillText('Score  '+score,W/2,H/2-4);
  ctx.fillText('Best   '+best, W/2,H/2+16); ctx.shadowBlur=0;
  ctx.fillStyle='#555'; ctx.font='10px "DM Sans"';
  ctx.fillText('Tap or click to try again',W/2,H/2+42);
  ctx.fillText('Menu to change settings',  W/2,H/2+60);
  ctx.textAlign='left';
}

// ── Main loop ──────────────────────────────────────────
function loop(){
  fc++;
  TH[currentTheme].bg();
  drawGround();

  if(gSt === 'wait'){
    // Gentle idle bob — does NOT affect actual y used in physics
    bobT += 0.055;
    bird.y   = H/2 + Math.sin(bobT)*7;
    bird.ang = Math.sin(bobT)*.1;
  }

  if(gSt === 'run'){
    bgOff += 2.5;

    // Physics
    bird.vy += 0.45;                        // gravity
    bird.vy  = Math.min(bird.vy, 14);       // terminal velocity clamp
    bird.y  += bird.vy;

    // Collision — check EVERY frame, no cooldown suppression on consecutive frames
    if(hitTest()){
      gSt = 'dead';
      mkParts(bird.x, bird.y, 28);
      sHit(); sDie();
    }

    // Pipes
    if(fc % 88 === 0) spawnPipe();
    for(let i=pipes.length-1; i>=0; i--){
      pipes[i].x -= 2.5;
      if(!pipes[i].ok && pipes[i].x + pipes[i].w < bird.x){
        score++; best=Math.max(best,score);
        pipes[i].ok = true;
        mkParts(bird.x+40, bird.y, 14);
        updateUI(); sScore();
      }
      if(pipes[i].x + pipes[i].w < -20) pipes.splice(i,1);
    }

    // Particles
    for(let i=parts.length-1; i>=0; i--){
      const p=parts[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=.15; p.life-=p.dec;
      if(p.life<=0) parts.splice(i,1);
    }
  }

  // Draw
  for(const p of pipes) drawPipe(p);
  for(const p of parts){
    ctx.globalAlpha=p.life; ctx.fillStyle=p.col;
    ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
  }
  ctx.globalAlpha=1;
  drawBird(); drawHUD();
  if(gSt==='wait') drawWait();
  if(gSt==='dead') drawDead();

  animId = requestAnimationFrame(loop);
}