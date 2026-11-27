const {app,BrowserWindow,shell,session}=require('electron');
const {pathToFileURL}=require('node:url');
const {join}=require('node:path');
const {once}=require('node:events');
let server;
const smoke=process.env.ZAMAKAN_SMOKE==='1';
if(smoke)app.disableHardwareAcceleration();
app.setAppUserModelId('org.zamakan.desktop');
app.whenReady().then(async()=>{
  process.env.HOST='127.0.0.1';process.env.PORT='0';process.env.ZAMAKAN_AUTH_DB=join(app.getPath('userData'),'accounts.sqlite');
  ({server}=await import(pathToFileURL(join(__dirname,'server','index.js')).href));
  if(!server.listening)await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.setPermissionRequestHandler((_wc,_perm,callback)=>callback(false));
  const win=new BrowserWindow({show:!smoke,width:1440,height:900,minWidth:420,minHeight:540,backgroundColor:'#07111e',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.on('will-navigate',(e,url)=>{try{if(new URL(typeof url==='string'?url:url.url).origin!==origin)e.preventDefault();}catch{e.preventDefault();}});
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))shell.openExternal(url).catch(()=>{});return {action:'deny'};});
  await win.loadURL(origin);
  if(smoke){const ok=await win.webContents.executeJavaScript('Boolean(document.querySelector(\'#maptitle\') && document.querySelector(\'[data-tab=fft]\'))');server.close();app.exit(ok?0:2);}
}).catch(e=>{console.error(e);app.exit(1);});
app.on('window-all-closed',()=>{server?.close();app.quit();});
