const { app, BrowserWindow, screen, ipcMain } = require('electron');
let win, fxWin;

// Window: 120x120px
// pet canvas: left:20px top:30px, 80x80px display
// body hit area in window coords: ~x28-92, y54-98
const HIT_X=28, HIT_Y=54, HIT_W=64, HIT_H=44;

let mouseOver=false, dragLocked=false, tickTimer=null;

function normalizeCoord(v){
  return Object.is(v,-0)?0:v;
}

function getWorkArea(){
  const display=screen.getPrimaryDisplay();
  const size=display&&display.workAreaSize?display.workAreaSize:{width:1920,height:1040};
  return {
    width:Number.isFinite(size.width)?size.width:1920,
    height:Number.isFinite(size.height)?size.height:1040,
  };
}

function getSafeWindowPos(){
  if(!win||win.isDestroyed()) return {x:0,y:0};
  const[x,y]=win.getPosition();
  return {
    x:Number.isFinite(x)?normalizeCoord(x):0,
    y:Number.isFinite(y)?normalizeCoord(y):0,
  };
}

function clampWindowPos(x,y){
  const current=getSafeWindowPos();
  const {width,height}=getWorkArea();
  const safeX=Number.isFinite(x)?x:current.x;
  const safeY=Number.isFinite(y)?y:current.y;
  return {
    x:normalizeCoord(Math.round(Math.max(-60,Math.min(width-60,safeX)))),
    y:normalizeCoord(Math.round(Math.max(-30,Math.min(height-100,safeY)))),
  };
}

function moveWindowTo(x,y){
  if(!win||win.isDestroyed()) return getSafeWindowPos();
  const next=clampWindowPos(x,y);
  try{
    win.setPosition(next.x,next.y,false);
    return next;
  }catch(err){
    console.warn('Ignoring invalid window position request:', {x,y,next,error:err&&err.message});
    return getSafeWindowPos();
  }
}

function startTick(){
  if(tickTimer) return;
  tickTimer=setInterval(()=>{
    if(!win||win.isDestroyed()) return;
    const c=screen.getCursorScreenPoint();
    const b=win.getBounds();
    const over=c.x>=b.x+HIT_X&&c.x<=b.x+HIT_X+HIT_W
             &&c.y>=b.y+HIT_Y&&c.y<=b.y+HIT_Y+HIT_H;
    if(!dragLocked&&over!==mouseOver){
      mouseOver=over;
      win.setIgnoreMouseEvents(!over,{forward:true});
    }
  },50);
}

app.whenReady().then(()=>{
  const {width,height}=screen.getPrimaryDisplay().workAreaSize;

  fxWin=new BrowserWindow({
    width,height,x:0,y:0,
    transparent:true,frame:false,alwaysOnTop:true,skipTaskbar:true,
    resizable:false,hasShadow:false,focusable:false,
    webPreferences:{nodeIntegration:true,contextIsolation:false},
  });
  fxWin.loadFile('fx.html');
  fxWin.showInactive();
  fxWin.setIgnoreMouseEvents(true,{forward:true});
  fxWin.setAlwaysOnTop(true,'screen-saver');

  win=new BrowserWindow({
    width:120,height:120,
    x:Math.floor(width/2-60),
    y:Math.floor(height-160),
    transparent:true,frame:false,alwaysOnTop:true,skipTaskbar:true,
    resizable:false,hasShadow:false,focusable:false,
    webPreferences:{nodeIntegration:true,contextIsolation:false},
  });
  win.loadFile('index.html');
  win.showInactive();
  win.setIgnoreMouseEvents(true,{forward:true});
  win.setAlwaysOnTop(true,'screen-saver');
  setInterval(()=>{if(win&&!win.isDestroyed())win.moveTop();},30000);
  startTick();
});

app.on('window-all-closed',()=>app.quit());

ipcMain.on('move-window-by',(e,dx,dy)=>{
  if(!win||win.isDestroyed())return;
  const stepX=Number(dx),stepY=Number(dy);
  if(!Number.isFinite(stepX)||!Number.isFinite(stepY)) return;
  const b=win.getBounds();
  moveWindowTo(b.x+stepX,b.y+stepY);
});

ipcMain.on('set-window-pos',(e,x,y)=>{
  if(!win||win.isDestroyed())return;
  const targetX=Number(x),targetY=Number(y);
  if(!Number.isFinite(targetX)||!Number.isFinite(targetY)){
    e.reply('window-pos',getSafeWindowPos());
    return;
  }
  e.reply('window-pos',moveWindowTo(targetX,targetY));
});

ipcMain.on('drag-lock',(e,locked)=>{
  dragLocked=!!locked;
  if(locked){win.setFocusable(true);win.setIgnoreMouseEvents(false);}
  else{win.setFocusable(false);mouseOver=false;win.setIgnoreMouseEvents(true,{forward:true});}
});

ipcMain.on('drag-end',(e)=>{
  if(!win||win.isDestroyed())return;
  const b=win.getBounds();
  const {width}=getWorkArea();
  const SNAP=40;
  let result='none';
  // left wall: position so half body sticks out (body is 80px wide, centre at 60px in window)
  // half out = window x so that body centre (x=60) aligns with screen edge x=0 → winX = -60
  // but let's use -40 so a bit more is visible
  if(b.x<SNAP){
    moveWindowTo(-50,b.y);
    result='left';
  } else if(b.x+120>width-SNAP){
    // right wall: window right edge at screen right → winX = width-120, but want half body in
    moveWindowTo(width-70,b.y);
    result='right';
  }
  e.reply('drag-end-result',result);
});

// Jump off wall: move window back to ground centre
ipcMain.on('jump-off-wall',(e)=>{
  if(!win||win.isDestroyed())return;
  const {width,height}=getWorkArea();
  // land near current Y but on ground, X somewhere in middle
  const nx=Math.floor(width/2-60);
  const ny=Math.floor(height-160);
  e.reply('window-pos',moveWindowTo(nx,ny));
});

ipcMain.on('get-screen-size',(e)=>{
  const {width,height}=getWorkArea();
  e.reply('screen-size',{width,height});
});
ipcMain.on('get-window-pos',(e)=>{
  if(win&&!win.isDestroyed())e.reply('window-pos',getSafeWindowPos());
});
ipcMain.on('fx-cmd',(e,data)=>{
  if(fxWin&&!fxWin.isDestroyed())fxWin.webContents.send('fx-cmd',data);
});
ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('get-cursor',(e)=>{
  e.reply('cursor-pos',screen.getCursorScreenPoint());
});
