export const DEFAULT_DONATIONS={currency:'USD',hintAmount:1,nameAmount:5,revealAllAmount:9.99,hintSeconds:8,revealAllSeconds:8,nameRotationSeconds:5};
export function donationReward(event,options=DEFAULT_DONATIONS){
 const config={...DEFAULT_DONATIONS,...options};
 if(!event||typeof event.id!=='string'||!event.id.trim()||event.id.length>200||typeof event.name!=='string'||!event.name.trim()||event.name.length>80||!Number.isFinite(event.amount)||event.amount<=0||event.currency!==config.currency)return null;
 const reward=event.reward||(event.amount>=config.revealAllAmount?'revealAll':event.amount>=config.nameAmount?'name':event.amount>=config.hintAmount?'hint':null);
 if(reward==='revealAll'&&event.amount>=config.revealAllAmount)return {id:event.id,name:event.name.trim(),reward:'revealAll',amount:event.amount,currency:event.currency};
 if(reward==='name'&&event.amount>=config.nameAmount)return {id:event.id,name:event.name.trim(),reward:'name',amount:event.amount,currency:event.currency};
 if(reward==='hint'&&event.amount>=config.hintAmount){const card=event.card??Number(String(event.message||'').match(/(?:карта|card)\s*[:#]?\s*(\d{1,2})(?!\d)/i)?.[1]);if(event.card!==undefined&&event.card!==null&&(!Number.isInteger(card)||card<1||card>52))return null;return {id:event.id,name:event.name.trim(),reward:'hint',card:Number.isInteger(card)&&card>=1&&card<=52?card:null,amount:event.amount,currency:event.currency};}
 return null;
}
export class DonationEffects{
 constructor(controller,options={}){this.controller=controller;this.options={...DEFAULT_DONATIONS,...options};this.seen=new Set();this.names=[];this.queue=[];this.active=null;this.nextGame=[];this.sequence=0;}
 receive(event){const reward=donationReward(event,this.options);if(!reward)return {ok:false,reason:'Проверьте имя, валюту, сумму и номер карты.'};if(this.seen.has(reward.id))return {ok:false,reason:'Этот донат уже обработан.'};this.seen.add(reward.id);if(this.controller.phase==='finished'){this.nextGame.push(reward);return {ok:true,reward:reward.reward,name:reward.name,deferred:true};}
  if(reward.reward==='name'){if(!this.names.includes(reward.name))this.names.push(reward.name);return {ok:true,reward:'name',name:reward.name};}
  this.queue.push(reward);this.tick();return {ok:true,reward:reward.reward,name:reward.name};
 }
 displayName(now=this.controller.now()){return this.names.length?this.names[Math.floor(now/(this.options.nameRotationSeconds*1000))%this.names.length]:'';}
 tick(){const c=this.controller;if(c.phase==='finished'){this.nextGame.push(...this.queue);this.queue=[];return null;}if(this.active){if(c.pausedAt!==null)return null;if(c.now()<c.deadline)return null;const completed=this.active;this.active=null;c.wait();return {type:completed.reward==='revealAll'?'reveal-all-ended':'hint-ended',...completed};}
  if(c.phase!=='waiting'||c.pausedAt!==null||!this.queue.length)return null;
  const reward=this.queue.shift();
  if(reward.reward==='revealAll'){this.active={name:reward.name,reward:'revealAll'};c.phase='peek';c.deadline=c.now()+this.options.revealAllSeconds*1000;this.sequence++;return {type:'reveal-all-started',...this.active};}
  const available=c.game.deck.filter(card=>card.matchedBy===null);const selected=available.find(card=>card.id===reward.card-1)||available[Math.floor(c.random()*available.length)];if(!selected)return null;const pair=available.find(card=>card.code===selected.code&&card.id!==selected.id);this.active={name:reward.name,reward:'hint',card:selected.id,pair:pair.id,fallback:reward.card!==null&&selected.id!==reward.card-1};c.phase='hint';c.deadline=c.now()+this.options.hintSeconds*1000;this.sequence++;return {type:'hint-started',...this.active};
 }
}
