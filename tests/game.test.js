import test from 'node:test';
import assert from 'node:assert/strict';
import {countries,createGame,flipCard,resolveTurn} from '../game.js';
test('52 cards contain exactly two copies of each of 26 flags',()=>{
 const game=createGame();assert.equal(game.deck.length,52);assert.equal(countries.length,26);
 for(const [code]of countries)assert.equal(game.deck.filter(c=>c.code===code).length,2);
 assert.deepEqual(game.deck.map(c=>c.id),Array.from({length:52},(_,i)=>i));
});
test('match awards a pair and keeps the current player',()=>{
 const game=createGame();const pair=game.deck.filter(c=>c.code===game.deck[0].code);
 pair.forEach(c=>assert.equal(flipCard(game,c.id),true));assert.equal(flipCard(game,3),false);
 assert.equal(resolveTurn(game),true);assert.equal(game.turn,0);assert.equal(game.players[0].score,1);assert.equal(game.pairs,1);assert.equal(game.moves,1);assert.equal(flipCard(game,pair[0].id),false);
});
test('mismatch closes cards at the same positions and advances turn',()=>{
 const game=createGame();const other=game.deck.find(c=>c.code!==game.deck[0].code);const before=game.deck.map(c=>c.code);
 flipCard(game,0);flipCard(game,other.id);assert.equal(resolveTurn(game),false);assert.equal(game.turn,1);assert.deepEqual(game.selected,[]);assert.deepEqual(game.deck.map(c=>c.code),before);
 flipCard(game,0);flipCard(game,other.id);resolveTurn(game);assert.equal(game.turn,0);
});
test('paused, duplicate and invalid selections cannot change game',()=>{
 const game=createGame();game.paused=true;assert.equal(flipCard(game,0),false);game.paused=false;
 assert.equal(flipCard(game,52),false);assert.equal(flipCard(game,0),true);assert.equal(flipCard(game,0),false);assert.equal(resolveTurn(game),null);assert.equal(game.moves,0);
});
test('complete game has 26 scored pairs and cannot be played further',()=>{
 const game=createGame(['Один']);for(const [code]of countries){for(const c of game.deck.filter(c=>c.code===code))flipCard(game,c.id);resolveTurn(game);}
 assert.equal(game.finished,true);assert.equal(game.players[0].score,26);assert.equal(game.pairs,26);assert.equal(game.moves,26);assert.equal(flipCard(game,0),false);
});
test('single player keeps turn after a mismatch',()=>{const g=createGame(['Один']);flipCard(g,0);flipCard(g,g.deck.find(c=>c.code!==g.deck[0].code).id);resolveTurn(g);assert.equal(g.turn,0);});
