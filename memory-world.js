// A perspective-projected 3D scene: volumetric flower, orbiting photo planes,
// text planes, a glowing sun and spiral galaxy stars.
(() => {
  'use strict';
  window.createMemoryWorld = ({reduced,wishes}) => {
    let seed=20102026;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const clamp=n=>Math.max(0,Math.min(1,n));
    const points=Array.from({length:2700},()=>({angle:random()*Math.PI*2,r:Math.sqrt(random()),depth:(random()-.5)*.065,phase:random()*Math.PI*2,size:.6+random()*1.1}));
    const satellites=Array.from({length:58},(_,i)=>({angle:random()*Math.PI*2,radius:.38+random()*.68,y:(random()-.5)*1.2,phase:random()*Math.PI*2,index:i,photo:i%3===0}));
    const stars=Array.from({length:340},()=>({x:(random()-.5)*3,y:(random()-.5)*2,z:(random()-.5)*3,phase:random()*6.28}));
    const galaxy=Array.from({length:560},(_,i)=>({radius:.045+Math.sqrt(random())*.32,arm:i%3,scatter:(random()-.5)*.65,depth:(random()-.5)*.014,phase:random()*Math.PI*2,size:.6+random()*1.1}));
    let textures=[],yaw=0,pitch=0,aimX=0,aimY=0,viewX=0,viewY=0,zoom=1;
    const glow=document.createElement('canvas');glow.width=glow.height=32;
    const g=glow.getContext('2d'),gradient=g.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,'#fff5ff');gradient.addColorStop(.18,'#efb8ffdd');gradient.addColorStop(.4,'#bd76ee55');gradient.addColorStop(1,'#b75edc00');g.fillStyle=gradient;g.fillRect(0,0,32,32);
    const starLights=['#ffe6b2','#e3c4ff','#badaff'].map(color=>{
      const image=document.createElement('canvas');image.width=image.height=24;
      const p=image.getContext('2d'),light=p.createRadialGradient(12,12,0,12,12,12);
      light.addColorStop(0,'#ffffff');light.addColorStop(.12,color);light.addColorStop(.35,color+'88');light.addColorStop(1,color+'00');p.fillStyle=light;p.fillRect(0,0,24,24);return image;
    });
    // Cache the sun's photosphere and corona once, rather than blurring each frame.
    const sunTexture=document.createElement('canvas');sunTexture.width=sunTexture.height=256;
    const s=sunTexture.getContext('2d'),corona=s.createRadialGradient(128,128,0,128,128,128);
    corona.addColorStop(0,'#fffde8ff');corona.addColorStop(.22,'#fff2adff');corona.addColorStop(.31,'#ffce6bd9');
    corona.addColorStop(.48,'#ff9b4a58');corona.addColorStop(.72,'#ff84521c');corona.addColorStop(1,'#ff6a3000');s.fillStyle=corona;s.fillRect(0,0,256,256);
    const surface=s.createRadialGradient(119,117,0,128,128,34);
    surface.addColorStop(0,'#ffffef');surface.addColorStop(.6,'#fff1ad');surface.addColorStop(1,'#ffb334');s.fillStyle=surface;s.beginPath();s.arc(128,128,34,0,Math.PI*2);s.fill();
    function rotate(p,yaw,pitch){const x=p.x*Math.cos(yaw)+p.z*Math.sin(yaw),z=-p.x*Math.sin(yaw)+p.z*Math.cos(yaw);return{x,y:p.y*Math.cos(pitch)-z*Math.sin(pitch),z:p.y*Math.sin(pitch)+z*Math.cos(pitch)};}
    return {
      setImages(images){textures=images.filter(i=>i.naturalWidth).map(image=>{const c=document.createElement('canvas');c.width=c.height=192;const p=c.getContext('2d'),s=Math.max(192/image.naturalWidth,192/image.naturalHeight),w=192/s,h=192/s;p.drawImage(image,(image.naturalWidth-w)/2,(image.naturalHeight-h)/2,w,h,0,0,192,192);return c;});},
      drag(dx,dy){yaw+=dx*.005;pitch=Math.max(-.8,Math.min(.8,pitch+dy*.004));},
      aim(x,y){aimX=x;aimY=y;},
      zoom(delta){zoom=Math.max(.7,Math.min(1.5,zoom-delta*.0006));},
      reset(){yaw=0;pitch=0;zoom=1;},
      draw(ctx,{width,height,t,elapsed,opacity=1}){
        const unit=Math.min(width,height)*zoom,entrance=(reduced?1:clamp(elapsed/1.5))*opacity;
        viewX+=(aimX-viewX)*.065;viewY+=(aimY-viewY)*.065;
        const cyaw=yaw+viewX*.13,cpitch=pitch+viewY*.09;
        const project=raw=>{const p=rotate(raw,cyaw,cpitch),s=3.6/Math.max(.8,3.6-p.z);return{x:width/2+p.x*unit*s,y:height*.47+p.y*unit*s,z:p.z,s};};
        const list=[];
        for(const star of stars){const p=project(star);list.push({kind:'star',p,phase:star.phase});}
        // Three spiral arms surround the sun with depth.
        for(const star of galaxy){
          const a=star.arm*Math.PI*2/3+star.radius*15+star.scatter+(reduced?0:t*.024/(.2+star.radius));
          list.push({kind:'galaxy',p:project({x:Math.cos(a)*star.radius,y:.335+Math.sin(a)*star.radius*.18+star.depth,z:Math.sin(a)*star.radius*.72}),phase:star.phase,size:star.size,color:star.arm});
        }
        list.push({kind:'sun',p:project({x:0,y:.335,z:.012})});
        // Curved petals and a real thickness along Z form a rotating 3D flower.
        const spin=reduced?0:t*.15;
        for(const point of points){
          const a=point.angle,r=(.53+.47*Math.cos(a*5))*point.r*.245;
          const raw={x:Math.cos(a)*r,y:Math.sin(a)*r,z:Math.sin(point.r*Math.PI)*.09+Math.cos(a*5)*point.r*.035+point.depth};
          const turned=rotate(raw,Math.sin(spin*.55)*.43,Math.sin(spin*.7)*.23-.15);
          const twist=spin*.24,world={x:turned.x*Math.cos(twist)-turned.y*Math.sin(twist),y:turned.x*Math.sin(twist)+turned.y*Math.cos(twist)-.1,z:turned.z};
          list.push({kind:'particle',p:project(world),phase:point.phase,size:point.size});
        }
        // Orbiting cards keep their own plane orientations and pass behind the flower.
        for(const item of satellites){
          const a=item.angle+(reduced?0:t*(item.index%2?-.035:.026));
          const center={x:Math.cos(a)*item.radius*(width/height>1?1.15:.75),y:item.y+Math.sin(t*.23+item.phase)*.025,z:Math.sin(a)*item.radius*.9};
          const p=project(center);if(!item.photo){list.push({kind:'text',p,center,index:item.index});continue;}
          const half=.032+(item.index%5)*.006,tilt=Math.sin(a)*.35,roll=Math.sin(item.phase+t*.1)*.1;
          const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{
            const xx=x*half,yy=y*half*1.16,local={x:xx*Math.cos(roll)-yy*Math.sin(roll),y:xx*Math.sin(roll)+yy*Math.cos(roll),z:0};
            const v=rotate(local,tilt,Math.cos(item.phase)*.12);return project({x:center.x+v.x,y:center.y+v.y,z:center.z+v.z});
          });
          list.push({kind:'photo',p,corners,index:item.index});
        }
        list.sort((a,b)=>a.p.z-b.p.z);
        for(const item of list){
          const p=item.p;if(p.x<-250||p.x>width+250||p.y<-150||p.y>height+150)continue;
          const depth=clamp((p.z+1.1)/2.2),alpha=entrance*(.3+.7*depth);
          if(item.kind==='particle'){
            const size=(1.6+item.size)*p.s;ctx.globalAlpha=entrance*(.55+.35*Math.sin(t*1.4+item.phase)**2);ctx.drawImage(glow,p.x-size*1.7,p.y-size*1.7,size*3.4,size*3.4);
          }else if(item.kind==='galaxy'){
            const size=(1.8+item.size)*p.s;ctx.globalAlpha=entrance*(.25+.45*Math.sin(t*.8+item.phase)**2);ctx.drawImage(starLights[item.color],p.x-size*1.8,p.y-size*1.8,size*3.6,size*3.6);
          }else if(item.kind==='sun'){
            const radius=unit*.105*p.s,pulse=reduced?1:1+Math.sin(t*1.5)*.025;
            ctx.globalAlpha=entrance;ctx.drawImage(sunTexture,p.x-radius*pulse,p.y-radius*pulse,radius*2*pulse,radius*2*pulse);
          }else if(item.kind==='photo'){
            window.GiftEffects.drawPhotoQuad(ctx,textures[item.index%Math.max(1,textures.length)],item.corners,alpha);
          }else if(item.kind==='text'){
            const right=project({x:item.center.x+.1,y:item.center.y,z:item.center.z}),down=project({x:item.center.x,y:item.center.y+.1,z:item.center.z});
            ctx.save();ctx.globalAlpha=alpha;ctx.transform((right.x-p.x)/(.1*unit),(right.y-p.y)/(.1*unit),(down.x-p.x)/(.1*unit),(down.y-p.y)/(.1*unit),p.x,p.y);
            ctx.font=`${Math.max(8,Math.min(14,unit*.016))}px Georgia`;ctx.textAlign='center';ctx.fillStyle='#f5cfea';ctx.shadowColor='#b866c9';ctx.shadowBlur=5;ctx.fillText(wishes[item.index%wishes.length],0,0);ctx.restore();
          }else{ctx.globalAlpha=entrance*(.15+.25*Math.sin(t*.4+item.phase)**2);ctx.fillStyle='#e1bce9';ctx.fillRect(p.x,p.y,p.s,p.s);}
        }
        ctx.globalAlpha=1;
      }
    };
  };
})();
