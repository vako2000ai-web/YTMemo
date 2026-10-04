import {createGame,flipCard,resolveTurn} from './game.js';
export const WAIT_MS=15000;
export const PROMPT='Пожалуйста, выберите два номера карточек';
export function parseChoice(text){
 const match=String(text).trim().match(/^(?:карточки\s*)?(\d{1,2})\s*(?:[,;:+/\-]|\s|и)\s*(\d{1,2})$/i);
 if(!match)return null;const ids=[Number(match[1])-1,Number(match[2])-1];
 return ids.every(i=>i>=0&&i<52)&&ids[0]!==ids[1]?ids:null;
}
export class AutomaticGame{
 constructor({now=()=>performance.now(),random=Math.random,revealMs=3000,waitMs=WAIT_MS,onPrompt=()=>{}}={}){this.now=now;this.random=random;this.revealMs=revealMs;this.waitMs=waitMs;this.onPrompt=onPrompt;this.game=createGame(['Робот'],random);this.phase='idle';this.deadline=0;this.pausedAt=null;this.actor=null;this.result=null;}
 start(){if(this.phase!=='idle')return;this.game.started=true;this.wait();}
 wait(){this.phase='waiting';this.deadline=this.now()+this.waitMs;this.roundStarted=this.now();this.pauseRanges=[];this.actor=null;this.onPrompt();}
 remaining(){return Math.max(0,this.deadline-(this.pausedAt??this.now()));}
 pause(){if(this.pausedAt!==null||['idle','finished'].includes(this.phase))return;this.pausedAt=this.now();this.game.paused=true;}
 resume(){if(this.pausedAt===null)return;const shift=this.now()-this.pausedAt;this.deadline+=shift;this.pauseRanges.push([this.pausedAt,this.now()]);this.pausedAt=null;this.game.paused=false;}
 submit(text,viewer={id:'test-viewer',name:'Тестовый зритель'},publishedAt=this.now()){if(this.phase!=='waiting'||this.pausedAt!==null||this.now()>=this.deadline||!Number.isFinite(publishedAt)||publishedAt<this.roundStarted||publishedAt>=this.deadline||this.pauseRanges.some(([start,end])=>publishedAt>=start&&publishedAt<end))return false;const ids=parseChoice(text);if(!ids||ids.some(id=>this.game.deck[id].matchedBy!==null)||!viewer||!viewer.id||!viewer.name)return false;let actor=this.game.players.findIndex(p=>p.viewerId===viewer.id);if(actor<0){actor=this.game.players.length;this.game.players.push({name:String(viewer.name).slice(0,80),viewerId:String(viewer.id),score:0});}else this.game.players[actor].name=String(viewer.name).slice(0,80);this.choose(ids,actor);return true;}
 choose(ids,actor){this.game.turn=actor;this.actor=actor;ids.forEach(id=>flipCard(this.game,id));this.phase='revealing';this.deadline=this.now()+this.revealMs;}
 tick(){if(this.pausedAt!==null||this.now()<this.deadline)return null;
  if(this.phase==='waiting'){const available=this.game.deck.filter(c=>c.matchedBy===null).map(c=>c.id);const a=available.splice(Math.floor(this.random()*available.length),1)[0];const b=available[Math.floor(this.random()*available.length)];this.choose([a,b],0);return 'robot';}
  if(this.phase==='revealing'){this.result={match:resolveTurn(this.game),actor:this.actor};if(this.game.finished){this.phase='finished';return 'finished';}this.wait();return this.result.match?'match':'miss';}return null;
 }
}
