import fs from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {donationReward} from './donations.js';
export const DA_SCOPE='oauth-donation-index';
const API='https://www.donationalerts.com';
function writePrivate(file,data){if(!file)return;fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file);}
function numericId(value){if(typeof value==='number'&&(!Number.isSafeInteger(value)||value<0))return null;const text=String(value??'');return /^\d{1,30}$/.test(text)?text:null;}
function flagged(value){return value===true||value===1||value==='1'||value==='true';}
export function normalizeDonationAlerts(row,options){
 if(!row||row.name!=='donation'||[row.is_test,row.test,row.is_fake].some(flagged))return null;
 const id=numericId(row.id);if(!id)return null;
 const amount=typeof row.amount==='number'?row.amount:typeof row.amount==='string'&&/^\d+(?:\.\d+)?$/.test(row.amount)?Number(row.amount):NaN;
 return donationReward({id:'donationalerts:'+id,name:typeof row.username==='string'&&row.username.trim()?row.username.trim().slice(0,80):'Аноним',amount,currency:row.currency,message:row.message_type==='audio'?'':String(row.message||'')},options);
}
export class DonationAlerts{
 constructor({options={},feed,fetcher=fetch,now=Date.now,authFile=null,stateFile=null}={}){
  this.options={pollSeconds:5,retrySeconds:30,maxPages:20,accessToken:'',refreshToken:'',clientId:'',clientSecret:'',redirectUrl:'http://localhost:3000/api/donations/donationalerts/callback',...options};this.feed=feed;this.fetcher=fetcher;this.now=now;this.authFile=authFile;this.stateFile=stateFile;this.nextPoll=0;this.pending=null;this.states=new Map();this.source=createHash('sha256').update(JSON.stringify([this.options.clientId,this.options.accessToken,this.options.refreshToken])).digest('hex');
  this.auth={accessToken:this.options.accessToken,refreshToken:this.options.refreshToken,expiresAt:0};this.lastId=null;
  if(authFile&&fs.existsSync(authFile)){const saved=JSON.parse(fs.readFileSync(authFile,'utf8'));if(saved.source===this.source)this.auth=saved.auth;}
  if(stateFile&&fs.existsSync(stateFile)){const saved=JSON.parse(fs.readFileSync(stateFile,'utf8'));if(saved.source===this.source)this.lastId=numericId(saved.lastId);}
  this.info={name:'DonationAlerts',state:this.auth.accessToken?'waiting':'needs-authorization',message:this.auth.accessToken?'DonationAlerts: ожидание первого опроса':'DonationAlerts: подключите аккаунт или задайте OAuth access token.',lastCheck:null,skipped:0};
 }
 status(){return {...this.info};}
 authRequest(){if(!this.options.clientId||!this.options.clientSecret)throw Error('Для входа заполните donationAlerts.clientId и clientSecret в config.json.');const state=randomBytes(32).toString('hex');for(const [key,expires]of this.states)if(expires<this.now())this.states.delete(key);this.states.set(state,this.now()+600000);const url=new URL(API+'/oauth/authorize');Object.entries({client_id:this.options.clientId,redirect_uri:this.options.redirectUrl,response_type:'code',scope:DA_SCOPE,state}).forEach(([k,v])=>url.searchParams.set(k,v));return {url:url.toString(),state};}
 async completeAuth({state,cookie,code}){const expires=this.states.get(state);if(!state||state!==cookie||!expires||expires<this.now())throw Error('Сеанс входа истёк или не совпадает. Снова нажмите «Войти в DonationAlerts».');this.states.delete(state);if(!code||typeof code!=='string')throw Error('DonationAlerts не выдал код авторизации.');await this.tokens({grant_type:'authorization_code',code,redirect_uri:this.options.redirectUrl});this.checkpoint(null);this.nextPoll=0;this.info.state='waiting';this.info.message='DonationAlerts авторизован. Ожидаем новые донаты.';}
 async tokens(params){let response;try{response=await this.fetcher(API+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:new URLSearchParams({...params,client_id:this.options.clientId,client_secret:this.options.clientSecret}),signal:AbortSignal.timeout(10000),redirect:'error'});}catch{throw Error('Не удалось связаться с сервером авторизации DonationAlerts.');}
  if(!response.ok)throw Error('DonationAlerts отклонил авторизацию. Проверьте OAuth client ID, secret и redirect URL; при необходимости войдите заново.');const data=await response.json();if(typeof data.access_token!=='string'||!data.access_token)throw Error('DonationAlerts не вернул access token.');if(data.token_type&&data.token_type.toLowerCase()!=='bearer')throw Error('DonationAlerts вернул неподдерживаемый тип токена.');this.auth={accessToken:data.access_token,refreshToken:typeof data.refresh_token==='string'?data.refresh_token:this.auth.refreshToken,expiresAt:Number.isFinite(data.expires_in)&&data.expires_in>0?this.now()+data.expires_in*1000:0};writePrivate(this.authFile,{source:this.source,auth:this.auth});
 }
 async refresh(){if(!this.auth.refreshToken||!this.options.clientId||!this.options.clientSecret)throw Error('Токен DonationAlerts истёк. Снова войдите через кнопку или настройте refreshToken и OAuth client credentials.');await this.tokens({grant_type:'refresh_token',refresh_token:this.auth.refreshToken,scope:DA_SCOPE});}
 async page(number,retried=false){if(!this.auth.accessToken)throw Error('DonationAlerts: войдите в аккаунт через кнопку или задайте OAuth access token с правом oauth-donation-index.');if(!retried&&this.auth.expiresAt&&this.auth.expiresAt<=this.now()+30000)await this.refresh();const url=new URL(API+'/api/v1/alerts/donations');url.searchParams.set('page',number);let response;try{response=await this.fetcher(url,{headers:{Authorization:'Bearer '+this.auth.accessToken,Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});}catch{throw Error('DonationAlerts недоступен. Подключение будет повторено автоматически.');}
  if(response.status===401&&!retried){await this.refresh();return this.page(number,true);}if(response.status===429){const retry=Number(response.headers?.get('retry-after'));const err=Error('DonationAlerts ограничил частоту запросов. Ожидаем повторного подключения.');err.retryMs=Number.isFinite(retry)&&retry>0?Math.min(retry,600)*1000:this.options.retrySeconds*1000;throw err;}
  if(response.status===401)throw Error('Токен DonationAlerts недействителен. Снова войдите в аккаунт через кнопку.');if(response.status===403)throw Error('DonationAlerts: у токена нет права oauth-donation-index. Войдите заново с разрешением читать донаты.');if(!response.ok)throw Error(`DonationAlerts временно вернул ошибку ${response.status}. Подключение будет повторено.`);const data=await response.json();if(!Array.isArray(data.data))throw Error('DonationAlerts вернул неожиданный формат списка донатов.');return data;
 }
 checkpoint(id){writePrivate(this.stateFile,{source:this.source,lastId:id});this.lastId=id;}
 poll(){if(this.pending)return this.pending;if(this.now()<this.nextPoll)return Promise.resolve(this.status());this.pending=this.update().catch(error=>{this.info.state='error';this.info.message=error.message;this.nextPoll=this.now()+(error.retryMs||this.options.retrySeconds*1000);return this.status();}).finally(()=>this.pending=null);return this.pending;}
 async update(){const collected=[];let highest=this.lastId===null?0n:BigInt(this.lastId),previous=null;let baseline=this.lastId===null;let stopped=false;
  for(let page=1;page<=this.options.maxPages;page++){const result=await this.page(page);const rows=result.data;let boundary=false;
   for(const row of rows){const id=numericId(row.id);if(!id)throw Error('DonationAlerts вернул некорректный ID доната.');const number=BigInt(id);if(previous!==null&&number>previous)throw Error('Порядок истории DonationAlerts изменился. Обработка приостановлена, чтобы не пропустить донаты.');previous=number;if(number>highest)highest=number;if(!baseline&&number>BigInt(this.lastId))collected.push(row);else boundary=true;}
   if(baseline||boundary||!result.links?.next){stopped=true;break;}
  }
  if(!stopped)throw Error('Новых донатов больше лимита страниц. Увеличьте donationAlerts.maxPages; события пока не пропущены.');
  let skipped=0;for(const row of collected.reverse()){const event=normalizeDonationAlerts(row,this.feed.options);if(event)this.feed.receive(event);else skipped++;}
  this.checkpoint(String(highest));this.info={name:'DonationAlerts',state:'connected',message:baseline?'DonationAlerts подключён. Старая история пропущена; ждём новые донаты.':'DonationAlerts подключён',lastCheck:new Date(this.now()).toISOString(),skipped:this.info.skipped+skipped};this.nextPoll=this.now()+this.options.pollSeconds*1000;return this.status();
 }
}
