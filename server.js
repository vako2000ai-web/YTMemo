import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {YouTubeChat,videoId} from './youtube-chat.js';
import {config,publicConfig} from './config.js';
import {DonationFeed,validSignature,validToken} from './donation-feed.js';
import {DonationAlerts} from './donationalerts.js';
const chat=new YouTubeChat({key:process.env.YOUTUBE_API_KEY||config.youtube.apiKey});
const root = path.dirname(fileURLToPath(import.meta.url));
const donationFeed=new DonationFeed(config.donations,process.env.DONATION_LEDGER_PATH||path.join(root,'donation-ledger.json'));
const webhookSecret=process.env.DONATION_WEBHOOK_SECRET||config.donations.webhookSecret;
const overlayToken=process.env.DONATION_OVERLAY_TOKEN||config.donations.overlayToken;
const donationAlerts=config.donations.provider==='donationalerts'?new DonationAlerts({feed:donationFeed,options:{...config.donationAlerts,accessToken:process.env.DONATIONALERTS_ACCESS_TOKEN||config.donationAlerts.accessToken,refreshToken:process.env.DONATIONALERTS_REFRESH_TOKEN||config.donationAlerts.refreshToken,clientId:process.env.DONATIONALERTS_CLIENT_ID||config.donationAlerts.clientId,clientSecret:process.env.DONATIONALERTS_CLIENT_SECRET||config.donationAlerts.clientSecret},authFile:process.env.DONATIONALERTS_AUTH_PATH||path.join(root,'donationalerts-auth.json'),stateFile:process.env.DONATIONALERTS_STATE_PATH||path.join(root,'donationalerts-state.json')}):null;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/donations/')){
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
    const error=(status,message)=>{res.writeHead(status);res.end(JSON.stringify({error:message}));};
    if(!config.donations.enabled){error(503,'Приём реальных донатов выключен в config.json. Тестовые эффекты доступны без подключения.');return;}
    if(url.pathname==='/api/donations/donationalerts/authorize'&&req.method==='POST'){
      if(!validToken(req.headers.authorization,overlayToken)){error(401,'Введите токен подключения бонусов из config.json.');return;}
      if(!donationAlerts){error(400,'Выберите donations.provider: donationalerts в config.json.');return;}
      if(req.headers.origin!==new URL(config.donationAlerts.redirectUrl).origin){error(400,'Откройте игру по тому же адресу, который указан в donationAlerts.redirectUrl.');return;}
      try{const auth=donationAlerts.authRequest();const secure=config.donationAlerts.redirectUrl.startsWith('https:')?'; Secure':'';res.setHeader('Set-Cookie',`memo_da_state=${auth.state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/api/donations/donationalerts/callback${secure}`);res.end(JSON.stringify({authorizationUrl:auth.url}));}catch(e){error(400,e.message);}return;
    }
    if(url.pathname==='/api/donations/donationalerts/callback'&&req.method==='GET'){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
      const state=url.searchParams.get('state');const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('memo_da_state='))?.slice('memo_da_state='.length);
      let message='DonationAlerts подключён. Закройте эту вкладку и вернитесь в игру.';
      try{if(!donationAlerts)throw Error('DonationAlerts не выбран в настройках.');if(url.searchParams.has('error'))throw Error('Доступ DonationAlerts не разрешён. Вернитесь в игру и повторите вход.');await donationAlerts.completeAuth({state,cookie,code:url.searchParams.get('code')});}catch(e){res.statusCode=400;message=e.message;}
      res.setHeader('Set-Cookie','memo_da_state=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/api/donations/donationalerts/callback');const safe=message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));res.end(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DonationAlerts · Мемо</title><body style="font:18px Arial;background:#142027;color:#b6e3b9;padding:40px;line-height:1.7"><h1>Мемо × DonationAlerts</h1><p>${safe}</p></body></html>`);return;
    }
    if(url.pathname==='/api/donations/events'&&req.method==='GET'){
      if(!validToken(req.headers.authorization,overlayToken)){error(401,'Укажите правильный токен подключения донат-бонусов.');return;}
      const raw=url.searchParams.get('after');try{const provider=donationAlerts?await donationAlerts.poll():null;res.end(JSON.stringify({...donationFeed.read(raw===null?null:Number(raw)),provider}));}catch(e){error(400,e.message);}return;
    }
    if(url.pathname==='/api/donations/webhook'&&req.method==='POST'){
      if(!webhookSecret){error(503,'На сервере не настроен секрет проверки донатов.');return;}
      try{const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>16384){error(413,'Сообщение слишком большое.');return;}chunks.push(chunk);}const body=Buffer.concat(chunks);if(!validSignature(body,req.headers['x-donation-signature'],webhookSecret)){error(401,'Неверная подпись доната.');return;}const result=donationFeed.receive(JSON.parse(body.toString('utf8')));res.end(JSON.stringify({ok:true,...result}));}catch(e){error(400,e.message);}return;
    }
    error(405,'Метод или адрес не поддерживается.');return;
  }
  if(url.pathname==='/api/config'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(publicConfig));return;}
  if(url.pathname==='/api/chat'){
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
    const id=videoId(url.searchParams.get('video'));const raw=url.searchParams.get('after');const after=raw===null?null:Number(raw);
    if(!id||after!==null&&(!Number.isSafeInteger(after)||after<0)){res.writeHead(400);res.end(JSON.stringify({error:'Укажите корректную ссылку на трансляцию.'}));return;}
    try{res.end(JSON.stringify(await chat.read(id,after)));}catch(e){res.writeHead(503);res.end(JSON.stringify({error:e.message}));}return;
  }
  if(!['/','/index.html','/app.js','/game.js','/automatic.js','/donations.js','/themes.js','/style.css'].includes(url.pathname)&&!/^\/assets\/[a-z]{2}\.svg$/.test(url.pathname)){res.writeHead(404);res.end('Not found');return;}
  let target;
  try { target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400);res.end();return;}
  if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end();return;}
  if(target===root||fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
}).listen(Number(process.env.PORT)||config.server.port,config.server.host,()=>console.log(`Memo World: http://localhost:${Number(process.env.PORT)||config.server.port}`));
