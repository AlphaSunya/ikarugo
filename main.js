const { app, BrowserWindow, screen, ipcMain } = require('electron');
let win, fxWin;

// Window: 120x120px
// pet canvas: left:20px top:30px, 80x80px display
// body hit area in window coords: ~x28-92, y54-98
const HIT_X=28, HIT_Y=54, HIT_W=64, HIT_H=44;

let mouseOver=false, dragLocked=false, tickTimer=null;

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
  if(!win)return;
  const b=win.getBounds();
  const {width,height}=screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(
    Math.round(Math.max(-60,Math.min(width-60,b.x+dx))),
    Math.round(Math.max(-30,Math.min(height-100,b.y+dy))),
    false
  );
});

ipcMain.on('drag-lock',(e,locked)=>{
  dragLocked=!!locked;
  if(locked){win.setFocusable(true);win.setIgnoreMouseEvents(false);}
  else{win.setFocusable(false);mouseOver=false;win.setIgnoreMouseEvents(true,{forward:true});}
});

ipcMain.on('drag-end',(e)=>{
  if(!win)return;
  const b=win.getBounds();
  const {width}=screen.getPrimaryDisplay().workAreaSize;
  const SNAP=40;
  let result='none';
  // left wall: position so half body sticks out (body is 80px wide, centre at 60px in window)
  // half out = window x so that body centre (x=60) aligns with screen edge x=0 → winX = -60
  // but let's use -40 so a bit more is visible
  if(b.x<SNAP){
    win.setPosition(-50,b.y,false);
    result='left';
  } else if(b.x+120>width-SNAP){
    // right wall: window right edge at screen right → winX = width-120, but want half body in
    win.setPosition(width-70,b.y,false);
    result='right';
  }
  e.reply('drag-end-result',result);
});

// Jump off wall: move window back to ground centre
ipcMain.on('jump-off-wall',(e)=>{
  if(!win)return;
  const {width,height}=screen.getPrimaryDisplay().workAreaSize;
  const b=win.getBounds();
  // land near current Y but on ground, X somewhere in middle
  const nx=Math.floor(width/2-60);
  const ny=Math.floor(height-160);
  win.setPosition(nx,ny,false);
  const[rx,ry]=win.getPosition();
  e.reply('window-pos',{x:rx,y:ry});
});

ipcMain.on('get-screen-size',(e)=>{
  const {width,height}=screen.getPrimaryDisplay().workAreaSize;
  e.reply('screen-size',{width,height});
});
ipcMain.on('get-window-pos',(e)=>{
  if(win){const[x,y]=win.getPosition();e.reply('window-pos',{x,y});}
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

ipcMain.on('quit-app', () => {
  app.quit();
});
