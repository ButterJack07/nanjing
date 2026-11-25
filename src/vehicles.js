import * as THREE from 'three';
import { findRoute } from './world.js';

export function createVehicles(world, scene) {
  const vehicles=[], passengers=[], busStops=[
    {name:'鼓楼公交场',x:140,z:-660},{name:'鼓楼',x:-46,z:-760},{name:'珠江路',x:-46,z:-420},
    {name:'新街口',x:-46,z:70},{name:'大行宫',x:500,z:36},{name:'大行宫公交场',x:790,z:140},
  ];
  const {box,label,material}=world;
  function person(color='#b4c39c') {
    const group=new THREE.Group();box(.5,.8,.35,color,0,1.1,0,group);box(.35,.4,.35,'#c69475',0,1.72,0,group);
    for(const side of [-1,1])box(.19,.7,.24,'#3f5661',side*.14,.4,0,group);scene.add(group);return group;
  }
  function create(type,x,z,color='#c3d5a7',options={}) {
    const bus=type==='bus',train=type==='metro',w=bus?2.9:train?3:2.1,d=bus?11:train?24:4.6,h=bus?3.2:train?3.4:1.6;
    const group=new THREE.Group();group.position.set(x,.15,z);scene.add(group);
    // Open body and transparent windows let passengers remain visibly inside.
    box(w,.6,d,color,0,.8,0,group);box(w,.18,d,color,0,h+.1,0,group);
    for(const side of [-1,1]) {
      box(.12,.65,d,color,side*w/2,1.3,0,group);
      for(let zz=-d/2+.5;zz<d/2;zz+=bus||train?2:1.4)box(.12,h-1.5,.12,color,side*w/2,h/2+.7,zz,group);
      box(.06,h-1.6,d-.4,'#6b9ca2',side*w/2,h/2+.75,0,group,{transparent:true,opacity:.25,depthWrite:false});
    }
    box(w-.2,h-1.4,.1,'#45717a',0,h/2+.65,-d/2,group,{transparent:true,opacity:.5});
    const wheels=[];
    if(!train)for(const side of [-1,1])for(const zz of [-d*.32,d*.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(bus?.6:.43,bus?.6:.43,.24,12),material('#263235'));wheel.rotation.z=Math.PI/2;wheel.position.set(side*w/2,.5,zz);group.add(wheel);wheels.push(wheel)}
    if(type==='van')box(w,.9,2.7,color,0,1.6,.8,group);
    if(type==='pickup')box(w,.4,1.7,color,0,1.4,1.3,group);
    const door=box(.14,bus||train?2.5:1,1.5,'#678b91',w/2+.05,bus||train?1.7:1.2,bus?-3.5:0,group,{transparent:true,opacity:.55});
    if(bus||train){label(train?'南京地铁 · COAST METRO':'01 · 南京公交',0,h-.2,-d/2-.08,w-.2,group);for(let zz=-d/2+2;zz<d/2-1;zz+=1.5)for(const side of [-1,1])box(.65,.4,.7,'#719088',side*(w/2-.55),.9,zz,group)}
    if(type==='police'){box(1.5,.2,.4,'#344b51',0,1.9,0,group);box(.6,.2,.35,'#db787a',-.4,2.1,0,group,{emissive:'#ff3333',emissiveIntensity:1});box(.6,.2,.35,'#758edb',.4,2.1,0,group,{emissive:'#334dff',emissiveIntensity:1})}
    const value={type,group,w,d,h,wheels,door,speed:0,yaw:0,shared:false,stolen:false,ai:false,route:[],routeIndex:0,passengers:[],doors:0,damage:0,...options};vehicles.push(value);return value;
  }
  const starter=create('sport',13,22,'#d7e69c',{shared:true});
  for(let i=0;i<34;i++){
    const road=world.roads[(i*7+11)%world.roads.length],t=.2+(i%5)*.13,side=i%2?1:-1;
    const x=road.a.x+(road.b.x-road.a.x)*t+Math.cos(road.angle)*(road.width/2-2)*side,z=road.a.z+(road.b.z-road.a.z)*t-Math.sin(road.angle)*(road.width/2-2)*side;
    const car=create(['sedan','sport','van','pickup'][i%4],x,z,['#bec8b9','#bd9488','#9fb8be','#d5c8a3'][i%4]);car.yaw=road.angle+(side>0?Math.PI:0);car.group.rotation.y=car.yaw;
  }
  for(let i=0;i<12;i++){
    const start=world.nodes[(i*3)%world.nodes.length],end=world.nodes[(i*7+12)%world.nodes.length];
    create(['sedan','van','pickup'][i%3],start.x,start.z,['#acbeb7','#d1bfa0','#a98a83'][i%3],{ai:true,route:findRoute(world,start,end),routeIndex:1});
  }
  for(const [index,stop]of busStops.entries()){
    const vertical=index<3||index===5;stop.vertical=vertical;
    const sx=stop.x+(vertical?25:0),sz=stop.z+(vertical?0:25);stop.waiting=[];
    box(vertical?14:32,.18,vertical?32:14,'#c1beab',sx,.1,sz);box(vertical?8:34,.1,vertical?34:8,'#536165',stop.x+(vertical?15:0),.12,stop.z+(vertical?0:15));
    box(9,.2,3,'#3e5659',sx,3.1,sz);for(const dx of [-4,4])box(.16,3,.16,'#8b9d99',sx+dx,1.5,sz);
    box(8,2.5,.1,'#729b9d',sx,1.5,sz+1,scene,{transparent:true,opacity:.4});box(6,.2,1,'#927d60',sx,.8,sz);label(`01 · ${stop.name}`,sx,3.6,sz,12);
    stop.curb={x:sx,z:sz};
    for(let i=0;i<6;i++){const group=person(['#b5c49d','#d0b99b','#b89994'][i%3]);group.position.set(sx-3+i,0,sz+3);const p={group,state:'waiting',stop:index,target:null,bus:null};passengers.push(p);stop.waiting.push(p)}
  }
  const serviceBus=create('bus',128,-650,'#c4d8a4',{shared:true});create('bus',152,-668,'#d4c19d');create('bus',808,128,'#9bbdc3');
  const routeBus=create('bus',140,-660,'#b8d2b1',{ai:true,busRoute:true,nextStop:0,direction:1,dwell:0});
  const routeBus2=create('bus',790,140,'#a7c7c2',{ai:true,busRoute:true,nextStop:5,direction:-1,dwell:0});
  function openDoors(bus,index){
    bus.doors=1;bus.door.visible=false;
    for(const p of bus.passengers.splice(0,Math.min(3,bus.passengers.length))){scene.attach(p.group);p.state='alighting';p.group.position.copy(bus.group.position);p.target=new THREE.Vector3(busStops[index].curb.x+7,0,busStops[index].curb.z+4)}
    for(const p of busStops[index].waiting.splice(0,4)){p.state='boarding';p.bus=bus;p.target=new THREE.Vector3(bus.group.position.x+Math.cos(bus.yaw)*2.2,0,bus.group.position.z-Math.sin(bus.yaw)*2.2)}
  }
  function moveRoute(v,dt,speed=13){
    const target=v.route[v.routeIndex];if(!target)return true;const p=v.group.position,dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
    if(distance<1.2){v.routeIndex++;return v.routeIndex>=v.route.length}
    const desired=Math.atan2(-dx,-dz);v.yaw+=Math.atan2(Math.sin(desired-v.yaw),Math.cos(desired-v.yaw))*Math.min(1,dt*3);v.group.rotation.y=v.yaw;
    const step=Math.min(distance,speed*dt);p.x+=dx/distance*step;p.z+=dz/distance*step;v.speed=speed;return false;
  }
  let spawnTimer=0;
  function update(dt,player,driven,ridden){
    for(const v of vehicles){
      if(!v.ai||v===driven||v.type==='metro'||v.type==='police'||v.type==='taxi')continue;
      if(v.busRoute){
        if(v.dwell>0){v.speed=0;v.dwell-=dt;if(v.dwell<=0){v.doors=0;v.door.visible=true;v.nextStop+=v.direction;if(v.nextStop>=busStops.length||v.nextStop<0){v.direction*=-1;v.nextStop+=v.direction*2}v.route=findRoute(world,v.group.position,busStops[v.nextStop]);v.route.push(busStops[v.nextStop]);v.routeIndex=0}continue}
        if(!v.route.length){v.route=findRoute(world,v.group.position,busStops[v.nextStop]);v.route.push(busStops[v.nextStop]);v.routeIndex=0}
        if(moveRoute(v,dt,15)){v.route=[];v.dwell=12;openDoors(v,v.nextStop)}
      }else{
        if(v!==ridden&&Math.hypot(v.group.position.x-player.x,v.group.position.z-player.z)<7)continue;
        if(moveRoute(v,dt,12)){v.route=findRoute(world,v.group.position,world.nodes[Math.floor(Math.random()*world.nodes.length)]);v.routeIndex=1}
      }
      v.wheels.forEach(w=>w.rotation.x-=v.speed*dt);
    }
    for(const p of passengers){if(!p.target)continue;const delta=p.target.clone().sub(p.group.position);delta.y=0;if(delta.length()<.4){p.target=null;if(p.state==='boarding'){p.state='riding';p.bus.group.attach(p.group);const seat=p.bus.passengers.length;p.group.position.set(seat%2?.9:-.9,.45,2.5-Math.floor(seat/2)*1.4);p.group.rotation.y=0;p.bus.passengers.push(p)}else{p.state='done';p.group.visible=false}}else{delta.normalize();p.group.position.addScaledVector(delta,dt*2);p.group.rotation.y=Math.atan2(-delta.x,-delta.z)}}
    spawnTimer+=dt;if(spawnTimer>25){spawnTimer=0;for(const stop of busStops)if(stop.waiting.length<4){const group=person('#c9b997');group.position.set(stop.curb.x,0,stop.curb.z+3);const p={group,state:'waiting',target:null,bus:null};passengers.push(p);stop.waiting.push(p)}}
  }
  return {vehicles,passengers,busStops,serviceBus,create,person,update,moveRoute,openDoors,starter};
}
