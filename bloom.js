// High-resolution transparent roses supplied by the user; source PNGs stay intact.
(() => {
  'use strict';
  const canvas=document.getElementById('bloom-field'),ctx=canvas.getContext('2d'),intro=document.getElementById('intro');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width=0,height=0,blooms=[],drifting=[],running=false,startTime=0,releaseTime=null,frameId=null;
  let assetsReady=false,loadedImages=0,layers=[];
  let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve;});
  const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
  const assets=[];
  function buildRose(image,crop,contour){
    const sprite=document.createElement('canvas');sprite.width=sprite.height=768;
    const c=sprite.getContext('2d');c.imageSmoothingQuality='high';
    if(contour){c.beginPath();contour.forEach(([x,y],i)=>i?c.lineTo(x*768,y*768):c.moveTo(x*768,y*768));c.closePath();c.clip();}
    const [x,y,w,h]=crop,scale=Math.min(744/w,744/h),dw=w*scale,dh=h*scale;
    c.drawImage(image,x,y,w,h,(768-dw)/2,(768-dh)/2,dw,dh);
    const core=document.createElement('canvas');core.width=core.height=768;
    const k=core.getContext('2d');k.beginPath();k.arc(384,384,168,0,Math.PI*2);k.clip();k.drawImage(sprite,0,0);
    const segments=[];
    for(let i=0;i<8;i++){
      const petal=document.createElement('canvas');petal.width=petal.height=768;
      const p=petal.getContext('2d'),a=i*Math.PI/4-.015,b=(i+1)*Math.PI/4+.015;
      p.beginPath();p.arc(384,384,555,a,b);p.arc(384,384,148,b,a,true);p.closePath();p.clip();p.drawImage(sprite,0,0);segments.push(petal);
    }
    const flakes=[];
    for(const [x,y,w,h] of [[.18,.25,.25,.23],[.55,.19,.26,.24],[.2,.58,.25,.24],[.57,.57,.25,.25]]){
      const f=document.createElement('canvas');f.width=192;f.height=160;const p=f.getContext('2d');
      p.beginPath();p.moveTo(22,115);p.bezierCurveTo(-5,63,24,3,94,9);p.bezierCurveTo(151,-4,190,40,179,88);p.bezierCurveTo(163,139,84,160,22,115);p.closePath();p.clip();
      p.drawImage(sprite,x*768,y*768,w*768,h*768,0,0,192,160);flakes.push(f);
    }
    const asset={sprite,core,segments,flakes,frames:[]};
    // Prepare the costly petal deformation once. Playback blends cached frames.
    for(let i=0;i<18;i++){
      const frame=document.createElement('canvas');frame.width=frame.height=512;
      const f=frame.getContext('2d');f.translate(256,256);
      renderRose(f,asset,512,i/17,0);asset.frames.push(frame);
    }
    asset.core=null;asset.segments=[];assets.push(asset);
  }
  function finishImage(){if(++loadedImages===2){assetsReady=true;buildLayers();startTime=performance.now();resolveReady();}}
  const dew=new Image();dew.onload=()=>{buildRose(dew,[229,270,2683,2472]);finishImage();};dew.onerror=finishImage;dew.src='assets/rose-dew.png';
  const pair=new Image();pair.onload=()=>{
    buildRose(pair,[285,610,1510,1340],[[.12,.03],[.54,0],[.78,.12],[.89,.34],[.99,.55],[.93,.82],[.68,.99],[.36,.99],[.12,.85],[.01,.54],[.02,.26]]);
    buildRose(pair,[1430,140,960,1110],[[.12,0],[.6,.015],[.88,.12],[1,.43],[.96,.71],[.79,.95],[.4,1],[.17,.8],[.03,.46],[0,.15]]);
    finishImage();
  };pair.onerror=finishImage;pair.src='assets/rose-pair.png';
  function layout(){
    width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);
    // Bilinear sampling during motion; high-quality source preparation happens once.
    ctx.imageSmoothingQuality='low';
    const cell=Math.min(170,Math.max(88,Math.min(width,height)*.2)),cols=Math.ceil(width/cell)+2,rows=Math.ceil(height/cell)+2;
    let seed=10202026;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};blooms=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const x=(col-.5)*cell+(row%2?cell*.42:0)+(random()-.5)*cell*.22,y=(row-.5)*cell+(random()-.5)*cell*.22;
      const distance=Math.hypot((x-width/2)/width,(y-height*.48)/height);
      blooms.push({x,y,size:cell*(1.85+random()*.33),index:Math.floor(random()*3),angle:(random()-.5)*1.3,
        delay:distance*.7+random()*.55,speed:.8+random()*.6,spin:(random()-.5)*3,depth:random(),phase:random()*Math.PI*2});
    }
    blooms.sort((a,b)=>b.delay-a.delay);
    drifting=Array.from({length:width<600?20:36},(_,i)=>({x:random(),y:random(),size:16+random()*27,speed:.028+random()*.035,phase:random()*Math.PI*2,spin:(random()-.5)*1.2,index:i%12}));
    if(assetsReady)buildLayers();
  }
  addEventListener('resize',layout);layout();
  function renderRose(target,asset,size,opening,phase){
    if(opening>.995){target.drawImage(asset.sprite,-size/2,-size/2,size,size);return;}
    // Outer sectors unfold independently; fully open roses use the exact full image.
    for(let i=0;i<asset.segments.length;i++){
      const p=ease((opening-.04-(i%3)*.035)/.84),a=(i+.5)*Math.PI/4,offset=(1-p)*size*.105;
      target.save();target.globalAlpha*=clamp(p*4);target.translate(Math.cos(a)*offset,Math.sin(a)*offset);
      target.rotate((1-p)*Math.sin(i*2.4+phase)*.2);target.scale(.68+p*.32,.48+p*.52);
      target.drawImage(asset.segments[i],-size/2,-size/2,size,size);target.restore();
    }
    target.save();const bud=.72+opening*.28;target.scale(bud,bud);target.drawImage(asset.core,-size/2,-size/2,size,size);target.restore();
  }
  function drawRose(asset,size,opening){
    if(opening>.995){ctx.drawImage(asset.sprite,-size/2,-size/2,size,size);return;}
    const position=opening*17,index=Math.floor(position),fraction=position-index,alpha=ctx.globalAlpha;
    ctx.globalAlpha=alpha;ctx.drawImage(asset.frames[index],-size/2,-size/2,size,size);
    if(fraction>.001){ctx.globalAlpha=alpha*fraction;ctx.drawImage(asset.frames[Math.min(17,index+1)],-size/2,-size/2,size,size);}
    ctx.globalAlpha=alpha;
  }
  function buildLayers(){
    if(!assets.length)return;
    const ratio=Math.min(devicePixelRatio||1,1.5);
    layers=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=Math.ceil(width*ratio);c.height=Math.ceil(height*ratio);const p=c.getContext('2d');p.scale(ratio,ratio);return{canvas:c,context:p};});
    blooms.forEach((bloom,i)=>{const p=layers[Math.min(2,Math.floor(i/blooms.length*3))].context;
      p.save();p.translate(bloom.x,bloom.y);p.rotate(bloom.angle);p.drawImage(assets[bloom.index%assets.length].sprite,-bloom.size/2,-bloom.size/2,bloom.size,bloom.size);p.restore();});
  }
  function drawLayers(elapsed){
    const blend=ease((elapsed-5.7)/.6);
    layers.forEach((layer,i)=>{ctx.save();ctx.translate(width/2+Math.sin(elapsed*.6+i)*2*blend,height/2+Math.cos(elapsed*.5+i)*2*blend);
      ctx.rotate(Math.sin(elapsed*.35+i)*.002*blend);ctx.scale(1+.015*blend,1+.015*blend);ctx.drawImage(layer.canvas,-width/2,-height/2,width,height);ctx.restore();});
  }
  function drawLoosePetals(elapsed,released){
    if(!assets.length||reduced)return;
    const visibility=ease((elapsed-.6)/1.5)*(released===null?1:1-ease((released-1.5)/.9));
    for(const p of drifting){
      const flower=assets[Math.floor(p.index/4)%assets.length],image=flower.flakes[p.index%4],time=elapsed+(released===null?0:released*2);
      const x=p.x*width+Math.sin(time*.7+p.phase)*width*.045,y=((p.y+time*p.speed)%1.25)*(height+120)-60;
      ctx.save();ctx.globalAlpha=visibility*(.65+.25*Math.sin(p.phase)**2);ctx.translate(x,y);ctx.rotate(p.phase+time*p.spin);
      ctx.scale(.4+.6*Math.abs(Math.cos(time*1.1+p.phase)),1);ctx.drawImage(image,-p.size/2,-p.size*.42,p.size,p.size*.84);ctx.restore();
    }
  }
  function paint(now){
    if(!running)return;frameId=requestAnimationFrame(paint);if(document.hidden||!assetsReady)return;
    const elapsed=(now-startTime)/1000,released=releaseTime===null?null:(now-releaseTime)/1000;ctx.clearRect(0,0,width,height);if(!assets.length)return;
    if(elapsed>=4.6||reduced)intro.classList.add('bloom-ready');
    if((elapsed>5.7||reduced)&&released===null)drawLayers(reduced?5.7:elapsed);
    else for(const bloom of blooms){
      const p=reduced?1:ease((elapsed-.25-bloom.delay)/3.9);if(p<=0)continue;const spread=.045+.955*p**1.12;
      let x=width/2+(bloom.x-width/2)*spread,y=height*.48+(bloom.y-height*.48)*spread,size=bloom.size*(.045+.955*p),angle=bloom.angle*(.2+.8*p),alpha=clamp(p*8);
      if(released!==null){const out=clamp((released-bloom.depth*.32)/1.9),acceleration=out*out;
        x+=(bloom.x-width/2)*acceleration*1.4+Math.sin(bloom.phase+out*2)*acceleration*width*.1;
        y+=(height*(1+bloom.speed)+bloom.size)*acceleration;angle+=bloom.spin*acceleration;alpha*=1-ease((out-.48)/.52);size*=1+out*.12;
      }else if(!reduced){const sway=1-ease((elapsed-5.1)/.6);x+=Math.sin(elapsed*.6+bloom.phase)*4*p*sway;y+=Math.cos(elapsed*.5+bloom.phase)*3*p*sway;angle+=Math.sin(elapsed*.65+bloom.phase)*.045*p*sway;}
      if(alpha<.005||x+size<0||x-size>width||y+size<0||y-size>height)continue;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);drawRose(assets[bloom.index%assets.length],size,p);ctx.restore();
    }
    drawLoosePetals(elapsed,released);
  }
  window.BloomIntro={ready,start(){cancelAnimationFrame(frameId);intro.classList.remove('bloom-ready');startTime=performance.now();releaseTime=null;running=true;frameId=requestAnimationFrame(paint);},open(){releaseTime=performance.now();},stop(){running=false;cancelAnimationFrame(frameId);}};
})();
