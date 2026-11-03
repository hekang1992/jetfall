const assert=require('node:assert/strict');
const P=require('../../physics.js');
let checks=0;function ok(test,msg){assert.ok(test,msg);checks++;}
function run(level,control,limit=18000){const s=P.create(level);P.start(s);const events=[];for(let i=0;i<limit&&!['success','crashed'].includes(s.phase);i++){P.step(s,control(s),1/120);events.push(...s.events.map(e=>e.type));}return {s,events};}
for(let level=0;level<3;level++){
 let observedInverted=false;const path=[];
 const {s,events}=run(level,s=>{if(s.phase==='twist')path.push([s.x,s.roll,s.y]);if(s.phase==='air'&&!observedInverted){ok(Math.abs(s.roll-Math.PI)<.01,'exit is wheels up');observedInverted=true;}
 const height=Math.max(0,s.y-P.levels[level].padY-.72);const desired=-Math.sqrt(2*5*height+4);return {gas:s.phase!=='air'||(Math.abs(P.angle(s.roll))<.25&&s.vy<desired),assist:s.phase==='air'};});
 console.log('PILOT',level+1,JSON.stringify({phase:s.phase,time:s.time,x:s.x,fuel:s.fuel,roll:s.roll,stars:s.stars,landingSpeed:s.landingSpeed,events,reason:s.reason}));
 ok(path.length>100,'visible continuous twist');ok(path[0][1]<.02&&path.at(-1)[1]>3.13,'track rolls from 0 to 180');ok(path.every((p,i)=>!i||p[1]>=path[i-1][1]),'continuous increasing roll');ok(s.phase==='success','normal control input completes level '+level);ok(s.launched,'success requires inverted launch');ok(events.includes('twist')&&events.includes('launch')&&events.includes('touchdown'),'full route observed');ok(s.fuel>0,'pilot has fuel left');ok(s.landingSpeed<=P.levels[level].maxLanding,'touchdown within limit');
}
const uncorrected=run(0,s=>({gas:s.phase!=='air'}));ok(uncorrected.s.phase==='crashed','upside down touchdown fails');ok(uncorrected.s.reason.includes('车身')||uncorrected.s.reason.includes('冲击'),'failure has concrete reason');
const noJets=run(0,s=>({gas:s.phase!=='air',assist:s.phase==='air'}));ok(noJets.s.phase==='crashed','no lift hard landing fails');
const insufficient=P.create(0);P.start(insufficient);insufficient.phase='twist';insufficient.x=145.99;insufficient.vx=10;P.step(insufficient,{},1/60);ok(insufficient.phase==='crashed'&&insufficient.reason.includes('速度不足'),'slow track exit fails clearly');
const zero=P.create(0);zero.phase='air';zero.x=230;zero.y=15;zero.roll=0;zero.fuel=0;P.step(zero,{gas:true,assist:true},1/120);ok(zero.phase==='air'&&!zero.jet,'fuel empty is not instant death');ok(zero.vy<0,'gravity with no fuel');
const bounce=P.create(0);Object.assign(bounce,{phase:'air',x:240,y:7.73,roll:0,vy:-7,vx:20});P.step(bounce,{},1/120);ok(bounce.phase==='air'&&bounce.bounces===1&&bounce.health===70&&bounce.vy>0,'moderate impact bounces with damage');
const soft=P.create(0);Object.assign(soft,{phase:'air',x:240,y:7.73,roll:.1,vy:-2,vx:20});P.step(soft,{},1/120);ok(soft.phase==='landing','upright soft landing accepted');
const roof=P.create(0);Object.assign(roof,{phase:'air',x:240,y:7.73,roll:Math.PI,vy:-2,vx:20});P.step(roof,{},1/120);ok(roof.phase==='crashed','roof contact fails even slow');
const overshoot=P.create();Object.assign(overshoot,{phase:'air',x:359,y:30,vx:25});P.step(overshoot,{},1/60);ok(overshoot.phase==='crashed','overshooting pad ends run');
const ready=P.create();P.step(ready,{gas:true},.01);ok(ready.phase==='ready'&&ready.x===8,'ready waits for start');
const reset=P.create(2);ok(reset.phase==='ready'&&reset.fuel===65&&reset.roll===0,'restart restores ground start');
console.log('PASS',checks,'meaningful simulation checks');
