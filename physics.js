/* JETFALL: deterministic fixed-step stunt simulation. Coordinates: X forward, Y up. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.JetPhysics=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const levels=[
    {name:'半圈之后',tag:'01 / FIRST INVERSION',description:'180° 螺旋出轨 · 宽幅着陆区',padStart:203,padEnd:320,padY:7,fuel:100,minSpeed:18,wind:0,maxLanding:6,theme:0},
    {name:'峡谷快线',tag:'02 / CANYON EXPRESS',description:'更远的断崖 · 更短的落地区',padStart:227,padEnd:299,padY:5,fuel:85,minSpeed:23,wind:0.2,maxLanding:5.5,theme:1},
    {name:'余量之间',tag:'03 / PRECISION RUN',description:'有限燃料 · 精准扶正与点火',padStart:241,padEnd:289,padY:8,fuel:65,minSpeed:25,wind:-0.15,maxLanding:5,theme:2},
    {name:'回头半环',tag:'04 / HALF LOOP',description:'右侧爬升回转 · 倒扣向左飞出',trackType:'halfLoop',exitDirection:-1,padStart:-155,padEnd:-18,padY:7,fuel:100,minSpeed:18,wind:0,maxLanding:6,theme:3}
  ];
  function track(x){const t=clamp((x-68)/78,0,1);const s=t*t*(3-2*t);return {y:2+22*(.7*s+.3*t),roll:Math.PI*s,pitch:x<68?0:Math.atan(22*(.7*6*t*(1-t)+.3)/78),t};}
  // Arc length parameter: lower straight → right-hand semicircle → upper return straight.
  const loopRadius=20,loopEnd=68+Math.PI*loopRadius+30;
  function halfLoop(progress){
    const theta=clamp((progress-68)/loopRadius,0,Math.PI);
    if(progress<=68)return {x:progress,y:2,pitch:0};
    if(progress>=68+Math.PI*loopRadius)return {x:68-(progress-68-Math.PI*loopRadius),y:42,pitch:Math.PI};
    return {x:68+loopRadius*Math.sin(theta),y:22-loopRadius*Math.cos(theta),pitch:theta};
  }
  function create(level=0){return {level,phase:'ready',progress:8,speed:0,x:8,y:2.72,z:0,vx:0,vy:0,vz:0,roll:0,pitch:0,omega:0,fuel:levels[level].fuel,health:100,time:0,airtime:0,distance:0,jet:false,assist:false,bounces:0,events:[],reason:'',stars:0,landingSpeed:0,landingAngle:0,launched:false};}
  function event(s,type,text){s.events.push({type,text});}
  function fail(s,reason){s.phase='crashed';s.reason=reason;s.jet=false;s.assist=false;event(s,'crash',reason);}
  function start(s){if(s.phase==='ready'){s.phase='runway';event(s,'start',levels[s.level].trackType==='halfLoop'?'按住油门，向右侧半环轨道加速':'按住油门，向螺旋轨道加速');}}
  function step(s,input,dt){
    dt=clamp(dt,0,1/30);s.events=[];s.jet=false;s.assist=false;
    if(['ready','crashed','success'].includes(s.phase))return s;
    const l=levels[s.level];s.time+=dt;
    if(s.phase==='runway'||s.phase==='twist'){
      if(l.trackType==='halfLoop'){
        const previous=halfLoop(s.progress);
        s.speed=clamp(s.speed+((input.gas?7.8:-1.1)-(input.brake?13:0)-(s.phase==='twist'?1.8:0)-3.4*Math.sin(previous.pitch))*dt,0,32);
        s.progress=Math.min(loopEnd,s.progress+s.speed*dt);
        const tr=halfLoop(s.progress);s.pitch=tr.pitch;s.roll=tr.pitch;
        s.x=tr.x-.72*Math.sin(tr.pitch);s.y=tr.y+.72*Math.cos(tr.pitch);s.z=0;
        s.vx=s.speed*Math.cos(tr.pitch);s.vy=s.speed*Math.sin(tr.pitch);
        if(s.progress>=68&&s.phase==='runway'){s.phase='twist';event(s,'twist','沿右侧弯道爬升，车头向左回转 180°');}
        if(s.progress>=loopEnd){
          if(s.speed<l.minSpeed){fail(s,'出轨速度不足。保持油门，沿半环加速到上层出口。');return s;}
          s.phase='air';s.launched=true;s.roll=Math.PI;s.pitch=0;s.omega=0;s.vx=-s.speed;s.vy=0;
          event(s,'launch','向左倒扣飞出！松开油门，按 E 扶正，再喷气缓冲');
        }
      }else{
      s.vx=clamp(s.vx+((input.gas?7.8: -1.1)-(input.brake?13:0)-(s.phase==='twist'?1.8:0))*dt,0,32);
      s.x+=s.vx*dt;const tr=track(s.x);s.roll=tr.roll;s.pitch=tr.pitch;
      s.y=tr.y+.72*Math.cos(s.roll);s.z=.72*Math.sin(s.roll);
      if(s.x>=68&&s.phase==='runway'){s.phase='twist';event(s,'twist','轮胎锁定导轨，车身正在翻转 180°');}
      if(s.x>=146){
        if(s.vx<l.minSpeed){fail(s,'出轨速度不足。持续按住油门，在螺旋轨道内继续加速。');return s;}
        s.phase='air';s.launched=true;s.roll=Math.PI;s.omega=0;s.vy=6+s.vx*Math.tan(track(146).pitch);s.y=23.28;s.z=0;
        event(s,'launch','倒扣出轨！先按 E 扶正，再按空格喷气减速');
      }
      }
    }else if(s.phase==='air'){
      s.airtime+=dt;
      let torque=((input.right?1:0)-(input.left?1:0))*6;
      if(input.assist&&s.fuel>0){let error=-angle(s.roll);if(Math.abs(Math.abs(error)-Math.PI)<.01)error=Math.PI;torque=clamp(error*13-s.omega*6,-9,9);s.assist=true;s.fuel=Math.max(0,s.fuel-3.5*dt);}
      s.omega+=(torque-(s.assist?0:1.8*s.omega))*dt;s.roll+=s.omega*dt;
      s.pitch+=(0-s.pitch)*Math.min(1,dt*2.5);
      let lift=0;if(input.gas&&s.fuel>0){s.jet=true;lift=19;s.fuel=Math.max(0,s.fuel-23*dt);}
      s.vy+=(lift*Math.cos(s.roll)-9.81)*dt;
      s.vz+=(lift*Math.sin(s.roll)*.27*(l.exitDirection||1)-s.vz*.8+l.wind)*dt;
      s.vx*=Math.exp(-.015*dt);s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
      const clearance=.72*Math.abs(Math.cos(s.roll))+.9*Math.abs(Math.sin(s.roll));
      const overPad=s.x-1.8>=l.padStart&&s.x+1.8<=l.padEnd&&Math.abs(s.z)<8;
      if(s.vy<0&&s.y-clearance<=l.padY&&overPad){
        const speed=-s.vy,tilt=Math.abs(angle(s.roll))*180/Math.PI;
        s.landingSpeed=speed;s.landingAngle=tilt;
        if(tilt>40){fail(s,'车身侧面或车顶先着地。先扶正，让四个轮胎朝下。');return s;}
        if(speed>9){fail(s,'落地冲击过大（'+speed.toFixed(1)+' m/s）。下落时提前喷气减速。');return s;}
        if((speed>l.maxLanding||tilt>22||Math.abs(s.omega)>1)&&s.bounces<2){s.bounces++;s.health=Math.max(10,s.health-30);s.y=l.padY+clearance+.06;s.vy=Math.max(2,speed*.32);s.omega*=.3;event(s,'bounce','悬挂吸收了撞击！继续扶正，短按喷气缓冲');}
        else if(speed<=l.maxLanding&&tilt<=22&&Math.abs(s.omega)<=1){s.phase='landing';s.y=l.padY+.72;s.vy=0;s.roll=0;s.pitch=0;s.omega=0;s.jet=false;event(s,'touchdown','四轮着地，正在滑行制动');}
        else{fail(s,'连续重落地，悬挂受损。试着更早扶正并分段喷气。');return s;}
      }else if(s.y<l.padY+clearance&&Math.abs(s.x-(l.exitDirection===-1?l.padEnd:l.padStart))<1.8){fail(s,'撞到着陆台前沿。提高出轨速度，或用喷气延长飞行。');}
      if(s.y< -7)fail(s,'落进了峡谷。加足速度出轨，并留燃料缓冲落地。');
      if(l.exitDirection===-1?s.x<l.padStart-38:s.x>l.padEnd+38)fail(s,'飞过了着陆区。减少空中喷气时间，让汽车及时下降。');
      if(Math.abs(s.z)>24)fail(s,'偏离了着陆区。车身扶正后再持续喷气。');
    }else if(s.phase==='landing'){
      const direction=l.exitDirection||1;s.vx=direction*Math.max(0,Math.abs(s.vx)-19*dt);s.x+=s.vx*dt;
      if(direction===1&&s.x+2>l.padEnd){s.x=l.padEnd-2;s.vx=0;}
      if(direction===-1&&s.x-2<l.padStart){s.x=l.padStart+2;s.vx=0;}
      if(Math.abs(s.vx)<.1){s.phase='success';s.stars=1+(s.landingSpeed<=3.5&&s.health===100?1:0)+(s.fuel>=25?1:0);event(s,'success','安全着陆');}
    }
    if(s.time>100)fail(s,'本次试跑超时。重新发车后按住油门加速。');
    return s;
  }
  return {levels,track,halfLoop,loopEnd,create,start,step,angle,clamp};
});
