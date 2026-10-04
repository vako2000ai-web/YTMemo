export function videoId(value){try{const u=new URL(value);if(u.hostname==='youtu.be')value=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))value=u.searchParams.get('v')||u.pathname.match(/^\/(?:live|shorts)\/([^/]+)/)?.[1];else return null;}catch{}return /^[\w-]{11}$/.test(value||'')?value:null;}
export class YouTubeChat{
 constructor({key=process.env.YOUTUBE_API_KEY,fetcher=fetch,now=Date.now}={}){this.key=key;this.fetcher=fetcher;this.now=now;this.sessions=new Map();}
 async api(resource,params){const url=new URL(`https://www.googleapis.com/youtube/v3/${resource}`);Object.entries({...params,key:this.key}).forEach(([k,v])=>url.searchParams.set(k,v));const response=await this.fetcher(url,{signal:AbortSignal.timeout(10000)});const data=await response.json();if(!response.ok){const reason=data.error?.errors?.[0]?.reason;throw Error(reason==='quotaExceeded'?'Лимит YouTube API исчерпан.':reason==='liveChatEnded'?'Трансляция завершена.':`YouTube API: ${reason||response.status}. Проверьте ключ и доступ к трансляции.`);}return data;}
 async read(id,after){if(!this.key)throw Error('На сервере не задан YOUTUBE_API_KEY. Добавьте ключ YouTube Data API и перезапустите сервер.');
  let s=this.sessions.get(id);if(!s){s={events:[],cursor:0,next:0,page:null,liveChatId:null,seen:new Set(),busy:null,lastUsed:this.now()};this.sessions.set(id,s);}s.lastUsed=this.now();
  if(s.busy)await s.busy;
  else if(this.now()>=s.next){s.busy=this.update(id,s);try{await s.busy;}finally{s.busy=null;}}
  for(const [k,v]of this.sessions)if(this.now()-v.lastUsed>600000&&!v.busy)this.sessions.delete(k);
  return {cursor:s.cursor,messages:after===null?[]:s.events.filter(e=>e.cursor>after),pollAfterMs:Math.max(1000,s.next-this.now())};
 }
 async update(id,s){s.next=this.now()+5000;
  if(!s.liveChatId){const data=await this.api('videos',{part:'liveStreamingDetails',id});s.liveChatId=data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;if(!s.liveChatId)throw Error('У этой трансляции нет активного чата. Проверьте ссылку и запуск эфира.');}
  const initial=!s.page;const data=await this.api('liveChat/messages',{part:'snippet,authorDetails',liveChatId:s.liveChatId,maxResults:200,...(s.page?{pageToken:s.page}:{})});
  for(const m of data.items||[]){if(s.seen.has(m.id))continue;s.seen.add(m.id);if(!initial&&m.snippet?.type==='textMessageEvent'&&m.authorDetails?.channelId){s.events.push({cursor:++s.cursor,text:m.snippet.textMessageDetails?.messageText||'',publishedAt:m.snippet.publishedAt,viewer:{id:m.authorDetails.channelId,name:m.authorDetails.displayName||'Зритель'}});}}
  s.events=s.events.slice(-500);if(s.seen.size>3000)s.seen=new Set((data.items||[]).map(m=>m.id));s.page=data.nextPageToken;s.next=this.now()+Math.max(1000,data.pollingIntervalMillis||5000);
 }
}
