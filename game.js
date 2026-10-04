export const countries = [
 ['fr','Франция'],['de','Германия'],['it','Италия'],['jp','Япония'],['ua','Украина'],['pl','Польша'],['nl','Нидерланды'],['be','Бельгия'],['ie','Ирландия'],['ro','Румыния'],['at','Австрия'],['bg','Болгария'],['hu','Венгрия'],['ee','Эстония'],['lt','Литва'],['lv','Латвия'],['id','Индонезия'],['ng','Нигерия'],['se','Швеция'],['fi','Финляндия'],['dk','Дания'],['ch','Швейцария'],['bd','Бангладеш'],['es','Испания'],['cz','Чехия'],['gr','Греция']
];
export function createGame(names=['Алиса','Михаил'], random=Math.random){
 const deck=countries.flatMap(([code,name])=>[{code,name},{code,name}]);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return {deck:deck.map((c,i)=>({...c,id:i,matchedBy:null})),players:names.map(name=>({name,score:0})),turn:0,selected:[],moves:0,pairs:0,elapsed:0,started:false,paused:false,finished:false};
}
export function flipCard(game,id){
 if(game.paused||game.finished||game.selected.length>=2||!game.deck[id]||game.deck[id].matchedBy!==null||game.selected.includes(id))return false;
 game.started=true;game.selected.push(id);if(game.selected.length===2)game.moves++;return true;
}
export function resolveTurn(game){
 if(game.selected.length!==2)return null;
 const [a,b]=game.selected.map(i=>game.deck[i]);const match=a.code===b.code;
 if(match){a.matchedBy=b.matchedBy=game.turn;game.players[game.turn].score++;game.pairs++;game.finished=game.pairs===26;}
 else game.turn=(game.turn+1)%game.players.length;
 game.selected=[];return match;
}
