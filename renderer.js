const { ipcRenderer } = require('electron');

const petC = document.getElementById('pet');
const ctx  = petC.getContext('2d');
const fxC  = document.getElementById('fx');
const fxCtx= fxC.getContext('2d');
const bubC = document.getElementById('bub');
const bctx = bubC.getContext('2d');

// window: 120x120px
// bub canvas: 30x8 logical → 120x30px display (top area)
// pet canvas: 20x20 logical → 80x80px display (offset left:20px, top:30px)
// fx  canvas: same as pet

let screenW=1920,screenH=1040;
ipcRenderer.send('get-screen-size');
ipcRenderer.on('screen-size',(_,s)=>{screenW=s.width;screenH=s.height;});

let winX=0,winY=0;
ipcRenderer.send('get-window-pos');
ipcRenderer.on('window-pos',(_,p)=>{winX=p.x;winY=p.y;});

function fx(cmd){ipcRenderer.send('fx-cmd',cmd);}

// ── colours ─────────────────────────────────────────────────
const RED='#cc2233',RED2='#aa1122',RED3='#dd4455',RED4='#bb3344';
const HAT='#d4b896',HAT2='#c4a886',HATRIM='#b89878',POM='#f0e0c8';
const EYE='#ff3366',EYEHL='#ffffff',EYEDARK='#cc0033',BLK='#111111';
const BLUSH='#ff5577',WGUN='#4488cc',WGUN2='#2266aa';

// ── bubble drawn on bub canvas ──────────────────────────────
// bub canvas: 120x30 real pixels, no scaling
let bubText='',bubTimer=0;
function showBubble(t,d=110){bubText=t;bubTimer=d;drawBubble();}
function hideBubble(){bubText='';bubTimer=0;bctx.clearRect(0,0,120,30);}
function drawBubble(){
  bctx.clearRect(0,0,120,30);
  if(!bubText)return;
  bctx.font='bold 11px monospace';
  const tw=bctx.measureText(bubText).width;
  const pad=8, bw=Math.min(116,tw+pad*2);
  const bx=Math.round((120-bw)/2);
  const by=4, bh=20;
  // bg
  bctx.fillStyle='#1a0a10';
  bctx.fillRect(bx,by,bw,bh);
  // border
  bctx.strokeStyle='#cc3355';
  bctx.lineWidth=1.5;
  bctx.strokeRect(bx+0.75,by+0.75,bw-1.5,bh-1.5);
  // tail pointing down toward pet
  bctx.fillStyle='#cc3355';
  bctx.beginPath();
  bctx.moveTo(58,by+bh);
  bctx.lineTo(62,by+bh);
  bctx.lineTo(60,by+bh+5);
  bctx.fill();
  // text
  bctx.fillStyle='#ffaacc';
  bctx.textBaseline='middle';
  bctx.fillText(bubText,bx+pad,by+bh/2);
}

// ── helpers ──────────────────────────────────────────────────
function p(x,y,c)     {ctx.fillStyle=c;ctx.fillRect(x,y,1,1);}
function r(x,y,w,h,c) {ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}

function breatheVal(f){return(Math.sin(f/60*Math.PI)*0.5+0.5);}
function blinkVal(f){
  const period=300,phase=f%period,doBlink2=((Math.floor(f/period))%3===0);
  if(phase<6)return phase/6; if(phase<12)return 1-(phase-6)/6;
  if(doBlink2){if(phase>=22&&phase<28)return(phase-22)/6;if(phase>=28&&phase<34)return 1-(phase-28)/6;}
  return 0;
}

function drawFeet(mode,f){
  if(mode==='drag'){
    const s=Math.round(Math.sin(f/15)*1);
    r(4,16,3,1,RED2);r(13,16,3,1,RED2);
    r(3+s,17,3,1,RED2);r(14-s,17,3,1,RED2);
  } else if(mode==='hang'){
    // hanging: feet dangle (swing sideways since body is rotated)
    const s=Math.round(Math.sin(f/25)*1);
    r(4,16,3,1,RED2);r(13,16,3,1,RED2);
    r(4+s,17,2,1,RED2);r(14-s,17,2,1,RED2);
  } else {
    r(4,16,3,1,RED2);r(13,16,3,1,RED2);
    r(3,17,3,1,RED2); r(14,17,3,1,RED2);
  }
  r(6,18,8,1,'#220010');
}
function drawPom(){p(9,0,POM);p(8,1,POM);p(10,1,POM);p(9,2,POM);}

let eyeX=0.5,eyeY=0.5;
function drawEyes(f,ex,ey,face){
  eyeX+=(ex-eyeX)*0.05;eyeY+=(ey-eyeY)*0.05;
  const lx=4,rx=12,ey0=7;
  if(face==='grabbed'){
    p(lx+1,ey0,BLK);p(lx+2,ey0+1,BLK);p(lx+1,ey0+2,BLK);
    p(rx+1,ey0,BLK);p(rx,ey0+1,BLK);p(rx+1,ey0+2,BLK);
    r(7,12,6,1,RED2);return;
  }
  if(face==='sleeping'){r(lx,ey0+3,4,1,RED2);r(rx,ey0+3,4,1,RED2);p(17,4,'#ffaacc');p(18,2,'#ffaacc');return;}
  if(face==='poked'){
    p(lx,ey0,BLK);p(lx+2,ey0,BLK);p(lx+1,ey0+1,BLK);p(lx,ey0+2,BLK);p(lx+2,ey0+2,BLK);
    p(rx,ey0,BLK);p(rx+2,ey0,BLK);p(rx+1,ey0+1,BLK);p(rx,ey0+2,BLK);p(rx+2,ey0+2,BLK);
    r(7,13,6,1,RED2);return;
  }
  if(face==='ink'){r(lx,ey0,4,4,EYE);r(rx,ey0,4,4,EYE);r(lx+1,ey0+1,2,2,BLK);r(rx+1,ey0+1,2,2,BLK);p(lx+1,ey0+1,EYEHL);p(rx+1,ey0+1,EYEHL);return;}
  if(face==='watergun'){r(lx,ey0+1,4,1,BLK);r(rx,ey0+1,4,1,BLK);r(7,12,6,1,RED2);p(7,11,RED2);p(12,11,RED2);return;}
  if(face==='rock'){r(lx,ey0+1,4,2,EYE);r(rx,ey0+1,4,2,EYE);r(lx+1,ey0+1,2,2,BLK);r(rx+1,ey0+1,2,2,BLK);p(lx+1,ey0+1,EYEHL);p(rx+1,ey0+1,EYEHL);return;}
  if(face==='happy'){
    p(lx+1,ey0,BLK);p(lx,ey0+1,BLK);p(lx+2,ey0+1,BLK);
    p(rx+1,ey0,BLK);p(rx,ey0+1,BLK);p(rx+2,ey0+1,BLK);
    r(7,12,6,1,RED2);p(7,11,RED2);p(12,11,RED2);return;
  }
  r(lx,ey0,4,4,EYE);r(rx,ey0,4,4,EYE);
  r(lx,ey0,4,1,EYEDARK);r(lx,ey0+3,4,1,EYEDARK);r(lx,ey0,1,4,EYEDARK);r(lx+3,ey0,1,4,EYEDARK);
  r(rx,ey0,4,1,EYEDARK);r(rx,ey0+3,4,1,EYEDARK);r(rx,ey0,1,4,EYEDARK);r(rx+3,ey0,1,4,EYEDARK);
  const cl=v=>Math.max(-1,Math.min(1,v));
  const pox=cl(Math.round((eyeX-0.5)*1.5)),poy=cl(Math.round((eyeY-0.5)*1.5));
  r(lx+1+pox,ey0+1+poy,2,2,BLK);r(rx+1+pox,ey0+1+poy,2,2,BLK);
  p(lx+1,ey0+1,EYEHL);p(rx+1,ey0+1,EYEHL);
  const bv=blinkVal(f);
  if(bv>0){const cov=Math.min(4,Math.round(bv*5));if(cov>=1){r(lx,ey0,4,cov,RED);r(rx,ey0,4,cov,RED);r(lx,ey0+cov-1,4,1,RED4);r(rx,ey0+cov-1,4,1,RED4);}}
}

function drawPet(f,ex,ey,state,hangMode,isDragging,subT){
  ctx.clearRect(0,0,20,20);
  fxCtx.clearRect(0,0,20,20);
  let face=isDragging?'grabbed':state;
  // reset transform unconditionally first
  ctx.setTransform(1,0,0,1,0,0);
  const doRot=hangMode==='left'||hangMode==='right';
  if(doRot){
    ctx.translate(10,10);
    ctx.rotate(hangMode==='left'?Math.PI/2:-Math.PI/2);
    ctx.translate(-10,-10);
  }
  const chestUp=(isDragging||state==='hanging')?0:(breatheVal(f)>0.65?1:0);
  drawFeet(isDragging?'drag':(state==='hanging'?'hang':'normal'),f);
  const bt=6-chestUp;
  r(3,bt,14,10+chestUp,RED);r(5,bt,10,10+chestUp,RED);r(3,10,14,5,RED);
  r(5,bt,5,3,RED3);r(4,14,12,2,RED2);r(3,13,14,2,RED2);
  p(4,11,BLUSH);p(5,11,BLUSH);p(14,11,BLUSH);p(15,11,BLUSH);
  r(4,2,12,3,HAT);r(3,4,14,2,HAT2);r(2,5,16,2,HATRIM);r(3,3,14,1,'#dcc898');
  drawPom();

  if(isDragging){
    const fl=Math.round(Math.sin(f/8)*1);
    r(0,9+fl,3,2,RED);r(17,9-fl,3,2,RED);
    if(f%30<18){p(17,5,'#aaddff');p(17,6,'#aaddff');p(16,6,'#aaddff');}
    r(7,12,6,1,RED2);
  } else if(state==='watergun'){
    r(0,12,3,2,RED);r(15,8,3,2,RED);
    r(17,7,3,2,WGUN);r(17,9,1,1,WGUN2);r(19,8,1,1,WGUN2);
    r(7,12,6,1,RED2);p(7,11,RED2);p(12,11,RED2);
  } else if(state==='ink'){
    face='ink';
    if(subT<40){const pf=Math.round(Math.sin(subT/40*Math.PI));r(3,9-pf,14,7+pf*2,RED);}
    r(0,9,3,2,RED);r(17,9,3,2,RED);r(7,12,6,1,RED2);
  } else if(state==='rock'){
    face='rock';r(0,8,3,2,RED);r(17,8,3,2,RED);r(7,12,6,1,RED2);
  } else if(state==='hanging'){
    // grip hands
    r(0,12,3,2,RED);r(17,12,3,2,RED);r(7,12,6,1,RED2);
  } else if(state==='happy'){
    r(0,9,3,2,RED);r(17,9,3,2,RED);p(0,8,RED);p(19,8,RED);
    r(7,12,6,1,RED2);p(7,11,RED2);p(12,11,RED2);
  } else {
    r(0,12,3,2,RED);r(17,12,3,2,RED);
    if(state!=='poked')r(7,12,6,1,RED2);
  }
  drawEyes(f,ex,ey,face);
  // restore transform and draw grip marks
  if(doRot){
    ctx.setTransform(1,0,0,1,0,0);
    if(hangMode==='left'){r(0,4,2,2,RED2);r(0,13,2,2,RED2);}
    else{r(18,4,2,2,RED2);r(18,13,2,2,RED2);}
  }
}

// ── state ────────────────────────────────────────────────────
let state='idle',frame=0,stateTimer=0,subTimer=0;
let sleepTimer=0,clickCount=0,clickTimer=0;
let isDragging=false,lastMX=0,lastMY=0;
let hangMode='none',wanderTimer=500,teleported=false;

const msgs=['...','(´・ω・`)','Killua?','(*´ω`*)','Hi!','Hm?','Nom'];
const grabMsgs=['Eeek!','(>_<)','Hey!!','Noooo','(≧口≦)'];
function setState(s){state=s;subTimer=0;teleported=false;}

// ── drag ─────────────────────────────────────────────────────
// ── drag: only active when NOT hanging ───────────────────────
petC.addEventListener('mousedown',e=>{
  // if hanging, mousedown starts a drag-off-wall (hangMode cleared first)
  if(hangMode!=='none'){
    // clear hang state BEFORE drag starts so rotation is gone
    hangMode='none';
    setState('idle');
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,20,20);
  }
  if(state==='sleeping'){setState('idle');sleepTimer=0;}
  if(['watergun','ink','rock'].includes(state)){setState('idle');fx({type:'clearRocks'});}
  isDragging=true;petC.style.cursor='grabbing';
  lastMX=e.screenX;lastMY=e.screenY;
  ipcRenderer.send('drag-lock',true);
  showBubble(grabMsgs[Math.floor(Math.random()*grabMsgs.length)],999);
  e.preventDefault();
});
window.addEventListener('mousemove',e=>{
  if(!isDragging)return;
  const dx=e.screenX-lastMX,dy=e.screenY-lastMY;
  lastMX=e.screenX;lastMY=e.screenY;
  if(dx||dy)ipcRenderer.send('move-window-by',dx,dy);
});
window.addEventListener('mouseup',()=>{
  if(!isDragging)return;
  isDragging=false;petC.style.cursor='grab';
  hideBubble();
  ipcRenderer.send('drag-lock',false);
  ipcRenderer.send('drag-end');
});
let hangJustSet=0;
ipcRenderer.on('drag-end-result',(_,result)=>{
  if(result==='left'||result==='right'){
    hangMode=result;setState('hanging');showBubble('Peek!',130);
    hangJustSet=Date.now();
  } else {
    // landed on ground after drag - hangMode already 'none' from mousedown
    hangMode='none';setState('idle');
  }
  setTimeout(()=>ipcRenderer.send('get-window-pos'),80);
});

// ── click: only jump-off when hanging, ignore drag clicks ─────
petC.addEventListener('click',e=>{
  if(isDragging)return;
  // when hanging: single click = jump to centre (NOT drag)
  if(hangMode!=='none'){
    if(Date.now()-hangJustSet<700) return; // ignore accidental click after drag-to-wall
    // already cleared by mousedown if they dragged, but handle pure click case:
    hangMode='none';
    setState('idle');
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,20,20);
    ipcRenderer.send('jump-off-wall');
    setTimeout(()=>{setState('happy');stateTimer=65;showBubble('(*´▽`*)',90);},200);
    return;
  }
  clickCount++;clickTimer=80;
  if(clickCount>=5){setState('poked');stateTimer=70;showBubble('(╭_╭)',110);clickCount=0;}
  else{setState('happy');stateTimer=70;showBubble(msgs[Math.floor(Math.random()*msgs.length)],90);}
});

// ── right-click: quit with ink animation ─────────────────────
petC.addEventListener('contextmenu', e => {
  e.preventDefault();
  if(state==='quitting') return;
  state='quitting'; subTimer=0;
  showBubble('Bye~', 999);
  // ink burst then quit
  setTimeout(()=>{
    fx({type:'ink', x:winX+60, y:winY+70});
    petC.style.opacity='0';
  }, 400);
  setTimeout(()=>{
    ipcRenderer.send('quit-app');
  }, 1400);
});

// ── right-click: quit with ink animation ────────────────────
petC.addEventListener('contextmenu', e => {
  e.preventDefault();
  if(state==='quitting') return;
  // trigger ink burst then quit
  state='quitting';
  subTimer=0;
  showBubble('Bye~', 999);
  fx({type:'ink', x:winX+60, y:winY+70});
  setTimeout(()=>{
    petC.style.opacity='0';
    fx({type:'ink', x:winX+60, y:winY+70}); // second burst
  }, 300);
  setTimeout(()=>{
    ipcRenderer.send('quit-app');
  }, 800);
});

// ── eye tracking ─────────────────────────────────────────────
let eyeTX=0.5,eyeTY=0.5;
function updateEyes(){
  ipcRenderer.send('get-cursor');
}
ipcRenderer.on('cursor-pos',(_,c)=>{
  // pet centre in screen coords: window left+20(offset)+40(half) = +60, top+30+40 = +70
  const pcx=winX+60,pcy=winY+70;
  const ang=Math.atan2(c.y-pcy,c.x-pcx);
  eyeTX=(Math.cos(ang)+1)/2;eyeTY=(Math.sin(ang)+1)/2;
});

function triggerNextIdle(){
  const pick=['watergun','ink','rock'][Math.floor(Math.random()*3)];
  if(pick==='watergun'){setState('watergun');showBubble('Pew pew!',180);}
  else if(pick==='ink'){setState('ink');showBubble('...',55);}
  else if(pick==='rock'){setState('rock');showBubble('Hmm...',140);}
}

let wTimer=500;
function tick(){
  requestAnimationFrame(tick);
  frame++;
  if(frame%3===0)updateEyes();

  if(bubTimer>0&&!isDragging){bubTimer--;if(bubTimer===0)hideBubble();}
  if(clickTimer>0){clickTimer--;if(clickTimer===0)clickCount=0;}
  if(stateTimer>0){stateTimer--;if(stateTimer===0&&!['hanging','watergun','ink','rock'].includes(state))setState('idle');}
  if(!isDragging&&state!=='sleeping')sleepTimer++;
  if(sleepTimer>600&&state==='idle')setState('sleeping');
  subTimer++;

  if(state==='watergun'){
    if(subTimer>240){setState('idle');showBubble('Hehe~',80);}
    // gun tip: pet canvas left:20px in window, gun at x17 logical = 68px in pet = 88px in window
    // window x + 88 = screen x of gun tip; y: top:30 + y8 logical = 62px in window
    else if(subTimer>20&&subTimer<220&&frame%8===0)
      fx({type:'drops',x:winX+88,y:winY+62});
  }
  if(state==='ink'){
    // pet centre: winX+60, winY+70
    if(subTimer===60){fx({type:'ink',x:winX+60,y:winY+70});showBubble('💨',75);}
    const hide=subTimer>60&&subTimer<120;
    petC.style.opacity=hide?'0':'1';
    if(!teleported&&subTimer===90){
      teleported=true;
      const minD=300;let nx,tries=0;
      do{nx=30+Math.random()*(screenW-150);tries++;}
      while(Math.abs(nx-winX)<minD&&tries<40);
      const dy=(screenH-160)-winY;
      const dx=nx-winX;
      ipcRenderer.send('move-window-by',dx,dy);
      setTimeout(()=>ipcRenderer.send('get-window-pos'),100);
    }
    if(subTimer===120)fx({type:'popInk',x:winX+60,y:winY+70});
    if(subTimer>160){petC.style.opacity='1';setState('idle');showBubble('(*´▽`*)',100);}
  }
  if(state==='rock'){
    // petX/petY for rock fx: screen position of pet canvas top-left
    fx({type:'rocks',petX:winX+20,petY:winY+30,subT:subTimer});
    if(subTimer===180)showBubble('(｀・ω・´)',120);
    if(subTimer>240){setState('idle');fx({type:'clearRocks'});}
  }

  if(!isDragging&&hangMode==='none'&&state==='idle'){
    wTimer--;
    if(wTimer<=0){
      wTimer=400+Math.floor(Math.random()*450);
      const rr=Math.random();
      if(rr<0.18){
        const n=Math.random()<0.5?-1:1;
        ipcRenderer.send('move-window-by',n*(50+Math.random()*90),0);
        setTimeout(()=>ipcRenderer.send('get-window-pos'),100);
      } else if(rr<0.38){
        setState('happy');stateTimer=65;showBubble(msgs[Math.floor(Math.random()*msgs.length)],85);
      } else triggerNextIdle();
    }
  }

  drawPet(frame,eyeTX,eyeTY,state,hangMode,isDragging,subTimer);
}
requestAnimationFrame(tick);
