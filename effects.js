// Canvas effects: interlocking photo fragments and perspective-projected photos.
(() => {
  'use strict';
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const mix = (a, b, t) => a + (b - a) * t;
  const heart = new Path2D('M240 400 C185 335 18 235 24 133 C30 14 180 8 240 102 C300 8 453 14 457 133 C467 235 292 347 240 400 Z');
  function cover(ctx, image, x, y, w, h) {
    if (!image?.naturalWidth) { ctx.fillStyle = '#b77d96'; ctx.fillRect(x, y, w, h); return; }
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function edgeSign(col, row) { return (col + row) % 2 ? 1 : -1; }
  function piecePath(col, row) {
    const p = new Path2D(), x = col * 40, y = row * 40;
    p.moveTo(x, y);
    let s = -edgeSign(col, row);
    p.lineTo(x + 12, y); p.bezierCurveTo(x + 4, y + s * 12, x + 35, y + s * 12, x + 27, y); p.lineTo(x + 40, y);
    s = edgeSign(col + 1, row);
    p.lineTo(x + 40, y + 12); p.bezierCurveTo(x + 40 + s * 12, y + 4, x + 40 + s * 12, y + 35, x + 40, y + 27); p.lineTo(x + 40, y + 40);
    s = -edgeSign(col, row + 1);
    p.lineTo(x + 27, y + 40); p.bezierCurveTo(x + 35, y + 40 + s * 12, x + 4, y + 40 + s * 12, x + 12, y + 40); p.lineTo(x, y + 40);
    s = edgeSign(col, row);
    p.lineTo(x, y + 27); p.bezierCurveTo(x + s * 12, y + 35, x + s * 12, y + 4, x, y + 12); p.closePath();
    return p;
  }
  function createPuzzle(canvas, reduced) {
    canvas.width = 960; canvas.height = 880;
    const ctx = canvas.getContext('2d'); let pieces = [];
    return {
      setImages(images) {
        const source = document.createElement('canvas'); source.width = 960; source.height = 880;
        const c = source.getContext('2d'); c.scale(2, 2); c.clip(heart);
        for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) cover(c, images[(row * 3 + col) % Math.max(1, images.length)], col * 80, row * 88, 80, 88);
        pieces = [];
        for (let row = 0; row < 11; row++) for (let col = 0; col < 12; col++) {
          const image = document.createElement('canvas'); image.width = 136; image.height = 136;
          const p = image.getContext('2d');
          p.scale(2, 2); p.translate(14 - col * 40, 14 - row * 40);
          const outline = piecePath(col, row); p.save(); p.clip(outline); p.drawImage(source, 0, 0, 480, 440); p.restore();
          // Draw the seam only on non-transparent photo pixels.
          p.globalCompositeOperation = 'source-atop'; p.strokeStyle = '#fff1d8'; p.lineWidth = .8; p.stroke(outline);
          // No pixel readback: file:// images must also work in Chrome/Edge.
          const hash = ((col * 73 + row * 151 + 29) % 211) / 211;
          const angle = hash * Math.PI * 2;
          pieces.push({ image, x: col * 40 + 20, y: row * 40 + 20,
            fromX: 240 + Math.cos(angle) * (300 + hash * 220),
            fromY: 210 + Math.sin(angle) * (270 + hash * 160),
            rotation: (hash - .5) * Math.PI * 3, delay: hash * 2.35,
            arc: Math.sin(col * 3 + row) * 85 });
        }
      },
      draw(elapsed) {
        ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 480, 440);
        ctx.strokeStyle = '#f5d4d035'; ctx.lineWidth = 1; ctx.stroke(heart);
        const done = reduced || elapsed > 4.1;
        canvas.closest('button').classList.toggle('puzzle-complete', done);
        for (const piece of pieces) {
          const progress = reduced ? 1 : clamp((elapsed - .18 - piece.delay) / 1.55);
          if (progress <= 0) continue;
          const travel = 1 - (1 - progress) ** 3;
          const arc = Math.sin(progress * Math.PI);
          ctx.save(); ctx.globalAlpha = clamp(progress * 5);
          ctx.translate(mix(piece.fromX, piece.x, travel) + arc * piece.arc, mix(piece.fromY, piece.y, travel) - arc * 40);
          ctx.rotate(piece.rotation * (1 - travel));
          const scale = mix(.35, 1, travel); ctx.scale(scale, scale);
          if (progress < 1) { ctx.shadowColor = '#ffd2dd88'; ctx.shadowBlur = 5; }
          ctx.drawImage(piece.image, -34, -34, 68, 68); ctx.restore();
        }
      }
    };
  }
  // Map a square photo onto two projected triangles, including the fourth corner.
  function triangle(ctx, image, p, uv) {
    const [a, b, c] = p, [u, v, w] = uv;
    const det = u.x * (v.y - w.y) + v.x * (w.y - u.y) + w.x * (u.y - v.y);
    if (Math.abs(det) < .001) return;
    const coefficient = key => [
      (a[key] * (v.y - w.y) + b[key] * (w.y - u.y) + c[key] * (u.y - v.y)) / det,
      (a[key] * (w.x - v.x) + b[key] * (u.x - w.x) + c[key] * (v.x - u.x)) / det,
      (a[key] * (v.x * w.y - w.x * v.y) + b[key] * (w.x * u.y - u.x * w.y) + c[key] * (u.x * v.y - v.x * u.y)) / det
    ];
    const x = coefficient('x'), y = coefficient('y');
    ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.clip();
    ctx.transform(x[0], y[0], x[1], y[1], x[2], y[2]); ctx.drawImage(image, 0, 0); ctx.restore();
  }
  const uv = [{x: 0, y: 0}, {x: 192, y: 0}, {x: 192, y: 192}, {x: 0, y: 192}];
  function quad(ctx, image, points, alpha, outlined = true) {
    if (!image || alpha <= .01) return;
    ctx.globalAlpha = alpha;
    triangle(ctx, image, [points[0], points[1], points[2]], [uv[0], uv[1], uv[2]]);
    triangle(ctx, image, [points[0], points[2], points[3]], [uv[0], uv[2], uv[3]]);
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    if (outlined) { ctx.strokeStyle = '#fff1db66'; ctx.lineWidth = .45; ctx.stroke(); }
  }
  function signedArea(p) { return (p[1].x-p[0].x)*(p[3].y-p[0].y)-(p[1].y-p[0].y)*(p[3].x-p[0].x); }
  function createPhotoWorld(reduced) {
    let textures = [], rotation = 0;
    const tiles = [];
    for (let row = 0; row < 17; row++) {
      const lat = -Math.PI / 2 + (row + .5) * Math.PI / 17;
      const count = Math.max(5, Math.round(40 * Math.cos(lat)));
      for (let col = 0; col < count; col++) {
        const id = tiles.length, hash = ((id * 137 + 43) % 997) / 997;
        tiles.push({lat, lon: col / count * Math.PI * 2, dx: Math.PI / count, dy: Math.PI / 34,
          id, photo: (row * 7 + col), phase: hash * Math.PI * 2,
          cloud: {x: Math.cos(id * 2.39996) * (1.2 + hash * 3.4), y: (hash - .5) * 5.5, z: Math.sin(id * 2.39996) * (1 + hash * 2.4)}});
      }
    }
    function project(point, radius, width, height) {
      const perspective = radius * 5 / Math.max(radius * .8, radius * 5 - point.z);
      return {x: width/2 + point.x * perspective, y: height*.47 + point.y * perspective, z: point.z};
    }
    function sphere(lat, lon, radius) {
      const x = Math.cos(lat)*Math.sin(lon)*radius, y = Math.sin(lat)*radius, z = Math.cos(lat)*Math.cos(lon)*radius;
      return {x, y: y*Math.cos(-.13)-z*Math.sin(-.13), z: y*Math.sin(-.13)+z*Math.cos(-.13)};
    }
    function sphereQuad(tile, spin, radius) {
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>sphere(tile.lat+y*tile.dy,tile.lon+spin+x*tile.dx,radius));
    }
    function base(width, height) { return Math.min(width,height)*(width<600?.37:.34); }
    return {
      setImages(images) {
        textures = images.filter(img=>img.naturalWidth).map(img=>{const texture=document.createElement('canvas');texture.width=texture.height=192;cover(texture.getContext('2d'),img,0,0,192,192);return texture;});
      },
      drawSphere(ctx, {width,height,elapsed,drag}) {
        const radius=base(width,height), progress=reduced?1:smooth(elapsed/2.8);
        rotation=(reduced?.4:elapsed*.16)+drag;
        const glow=ctx.createRadialGradient(width/2,height*.47,radius*.8,width/2,height*.47,radius*1.3);
        glow.addColorStop(0,'#ebcce500');glow.addColorStop(.65,'#eac5df22');glow.addColorStop(1,'#eac5df00');
        ctx.fillStyle=glow;ctx.globalAlpha=progress;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;
        const faces=tiles.map(tile=>{
          const target=sphereQuad(tile,rotation,radius);
          const twist=(1-progress)*2.6, ca=Math.cos(twist),sa=Math.sin(twist);
          const cx=(tile.cloud.x*ca-tile.cloud.z*sa)*radius, cz=(tile.cloud.x*sa+tile.cloud.z*ca)*radius;
          const size=radius*(.1+((tile.id%9)/9)*.12), angle=tile.phase*(1-progress);
          const points=target.map((point,i)=>{
            const sx=(i===0||i===3?-1:1)*size,sy=(i<2?-1:1)*size;
            const cloud={x:cx+sx*Math.cos(angle)-sy*Math.sin(angle),y:tile.cloud.y*radius+sx*Math.sin(angle)+sy*Math.cos(angle),z:cz};
            return project({x:mix(cloud.x,point.x,progress),y:mix(cloud.y,point.y,progress),z:mix(cloud.z,point.z,progress)},radius,width,height);
          });
          return {tile,points,depth:points.reduce((sum,p)=>sum+p.z,0)/4};
        }).sort((a,b)=>a.depth-b.depth);
        for(const face of faces){const front=signedArea(face.points)>0;if(!front&&progress>.97)continue;
          const alpha=front?(.55+.45*progress):(1-progress)*.35;
          quad(ctx,textures[face.tile.photo%Math.max(1,textures.length)],face.points,alpha);
        }
        ctx.globalAlpha=1;
      },
      drawGallery(ctx,{width,height,elapsed,targets}) {
        const radius=base(width,height), progress=reduced?1:smooth(elapsed/2.65);
        const faces=tiles.map(tile=>{
          const source=sphereQuad(tile,rotation,radius).map(p=>project(p,radius,width,height));
          const target=targets[tile.photo%targets.length];
          const end=[{x:target.left,y:target.top},{x:target.right,y:target.top},{x:target.right,y:target.bottom},{x:target.left,y:target.bottom}];
          const arc=Math.sin(progress*Math.PI),angle=tile.phase;
          const points=source.map((p,i)=>({x:mix(p.x,end[i].x,progress)+Math.cos(angle)*arc*radius*.65,y:mix(p.y,end[i].y,progress)+Math.sin(angle)*arc*radius*.65}));
          return {tile,source,points,depth:source.reduce((sum,p)=>sum+p.z,0)/4};
        }).sort((a,b)=>a.depth-b.depth);
        for(const face of faces){const front=signedArea(face.source)>0;const alpha=(front?1:smooth(progress*2))*(1-smooth((progress-.9)/.1));
          const group=face.tile.photo%targets.length;
          quad(ctx,textures[group%Math.max(1,textures.length)],face.points,alpha);
        }
        ctx.globalAlpha=1;
        return progress>=.995;
      }
    };
  }
  window.GiftEffects={createPuzzle,createPhotoWorld,drawPhotoQuad:quad};
})();
