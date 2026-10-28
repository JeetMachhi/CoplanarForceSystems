const $=s=>document.querySelector(s), rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
const n2=v=>(Math.abs(v)<0.005?0:v).toFixed(2).replace('-','\u2212');
const NS='http://www.w3.org/2000/svg';

/* ---------- core maths ---------- */
function solve(fs,conc){
  const rows=fs.map((f,i)=>{
    const fx=f.F*Math.cos(rad(f.a)), fy=f.F*Math.sin(rad(f.a));
    const x=conc?0:f.x, y=conc?0:f.y;
    return {i:i+1,F:f.F,a:f.a,x,y,fx,fy,m:x*fy-y*fx};
  });
  const sx=rows.reduce((s,r)=>s+r.fx,0), sy=rows.reduce((s,r)=>s+r.fy,0), sm=rows.reduce((s,r)=>s+r.m,0);
  const R=Math.hypot(sx,sy), th=(deg(Math.atan2(sy,sx))+360)%360, alpha=deg(Math.atan2(Math.abs(sy),Math.abs(sx)));
  const quad=sx>=0&&sy>=0?'I':sx<0&&sy>=0?'II':sx<0?'III':'IV';
  let status='resultant';
  if(R<1e-6) status=(!conc&&Math.abs(sm)>1e-6)?'couple':'equilibrium';
  let start=null;
  if(status==='resultant'){
    if(conc||Math.abs(sm)<1e-9) start=[0,0];
    else if(Math.abs(sy)>1e-6) start=[sm/sy,0];
    else start=[0,-sm/sx];
  }
  return {rows,sx,sy,sm,R,th,alpha,quad,status,start,conc};
}

/* ---------- diagram ---------- */
function draw(svg,fs,res,o={}){
  const conc=res.conc, maxF=Math.max(1,...fs.map(f=>f.F)), Lmax=4;
  const segs=fs.map((f,i)=>{
    const x0=conc?0:f.x,y0=conc?0:f.y,L=f.F/maxF*Lmax;
    return {x0,y0,x1:x0+L*Math.cos(rad(f.a)),y1:y0+L*Math.sin(rad(f.a)),c:'var(--blue)',t:`F${i+1} = ${f.F} N`};
  });
  if(res.status==='resultant'&&!o.hideR){
    const L=Math.min(res.R/maxF*Lmax,Lmax*2.2),[x0,y0]=res.start;
    segs.push({x0,y0,x1:x0+L*res.sx/res.R,y1:y0+L*res.sy/res.R,c:'var(--red)',t:`R = ${n2(res.R)} N`,w:3});
  }
  let xs=[0],ys=[0];segs.forEach(s=>{xs.push(s.x0,s.x1);ys.push(s.y0,s.y1)});
  let x0=Math.min(...xs)-2,x1=Math.max(...xs)+2,y0=Math.min(...ys)-2,y1=Math.max(...ys)+2;
  const sp=Math.max(x1-x0,y1-y0,6),cx=(x0+x1)/2,cy=(y0+y1)/2;
  const vx=cx-sp/2,vy=cy-sp/2, fx=sp*0.035;
  const Y=y=>-y; // flip so +y is up
  let h='';
  const lo=Math.floor(vx),hi=Math.ceil(vx+sp),lo2=Math.floor(vy),hi2=Math.ceil(vy+sp);
  if(sp<=24){for(let i=lo;i<=hi;i++)h+=`<line x1="${i}" y1="${-hi2}" x2="${i}" y2="${-lo2}" stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    for(let j=lo2;j<=hi2;j++)h+=`<line x1="${lo}" y1="${-j}" x2="${hi}" y2="${-j}" stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke"/>`}
  h+=`<line x1="${lo}" y1="0" x2="${hi}" y2="0" stroke="var(--mute)" stroke-width="1.5" vector-effect="non-scaling-stroke"/><line x1="0" y1="${-hi2}" x2="0" y2="${-lo2}" stroke="var(--mute)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
  h+=`<text x="${vx+sp-fx*2}" y="${-fx*0.8}" font-size="${fx*1.3}" fill="var(--mute)">x</text><text x="${fx*0.8}" y="${-(vy+sp)+fx*1.8}" font-size="${fx*1.3}" fill="var(--mute)">y</text>`;
  segs.forEach(s=>{
    const dx=s.x1-s.x0,dy=s.y1-s.y0,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,hd=fx*1.6;
    const bx=s.x1-ux*hd,by=s.y1-uy*hd;
    h+=`<g stroke="${s.c}" fill="${s.c}"><line x1="${s.x0}" y1="${Y(s.y0)}" x2="${bx}" y2="${Y(by)}" stroke-width="${s.w||2}" vector-effect="non-scaling-stroke"/>`+
       `<polygon stroke="none" points="${s.x1},${Y(s.y1)} ${bx-uy*hd*.4},${Y(by+ux*hd*.4)} ${bx+uy*hd*.4},${Y(by-ux*hd*.4)}"/></g>`+
       `<text text-anchor="${ux<-.3?'end':ux>.3?'start':'middle'}" x="${s.x1+ux*fx*1.2}" y="${Y(s.y1+uy*fx*1.2)+(uy>0?-fx*.3:fx*1.1)}" font-size="${fx*1.3}" font-weight="700" fill="${s.c}">${s.t}</text>`;
  });
  fs.forEach((f,i)=>{
    const ox=conc?0:f.x,oy=conc?0:f.y,r=fx*(3+(i%3)*1.4),a=((f.a%360)+360)%360;
    if(o.comps){const s=segs[i];h+=`<polyline points="${s.x0},${Y(s.y0)} ${s.x1},${Y(s.y0)} ${s.x1},${Y(s.y1)}" fill="none" stroke="var(--blue)" stroke-dasharray="${fx*.6} ${fx*.5}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`}
    h+=`<circle cx="${ox}" cy="${Y(oy)}" r="${fx*.45}" fill="var(--ink)"/>`;
    if(o.coords&&!conc)h+=`<text x="${ox+fx*.8}" y="${Y(oy)+fx*2}" font-size="${fx*1.1}" fill="var(--mute)">(${f.x}, ${f.y})</text>`;
    if(o.arcs&&a>0){
      const t=rad(a),pt=(q,rr)=>`${ox+rr*Math.cos(q)} ${Y(oy+rr*Math.sin(q))}`;
      h+=`<line x1="${ox}" y1="${Y(oy)}" x2="${ox+r*1.5}" y2="${Y(oy)}" stroke="var(--mute)" stroke-dasharray="${fx*.5} ${fx*.4}" stroke-width="1" vector-effect="non-scaling-stroke"/>`+
      `<path d="M ${pt(0,r)} A ${r} ${r} 0 ${a>180?1:0} 0 ${pt(t,r)}" fill="none" stroke="var(--mute)" stroke-width="1" vector-effect="non-scaling-stroke"/>`+
      `<text x="${ox+(r+fx*1.2)*Math.cos(t/2)-fx}" y="${Y(oy+(r+fx*1.2)*Math.sin(t/2))+fx*.4}" font-size="${fx*1.1}" fill="var(--mute)">${f.a}°</text>`;
    }
  });
  svg.setAttribute('viewBox',`${vx} ${-(vy+sp)} ${sp} ${sp}`);
  svg.innerHTML=h;
}

/* ---------- solution write-up ---------- */
function solution(res){
  const c=res.conc;
  let h=`<h2>Solution</h2><div class="scroll"><table><tr><th>Force</th><th>F (N)</th><th>θ (°)</th>${c?'':'<th>x (m)</th><th>y (m)</th>'}<th>Fx = F cos θ</th><th>Fy = F sin θ</th>${c?'':'<th>M<sub>O</sub> = x·Fy − y·Fx</th>'}</tr>`;
  res.rows.forEach(r=>{h+=`<tr><td>F${r.i}</td><td>${r.F}</td><td>${r.a}</td>${c?'':`<td>${r.x}</td><td>${r.y}</td>`}<td>${n2(r.fx)}</td><td>${n2(r.fy)}</td>${c?'':`<td>${n2(r.m)}</td>`}</tr>`});
  h+=`<tr class="sum"><td>Sum</td><td></td><td></td>${c?'':'<td></td><td></td>'}<td>${n2(res.sx)}</td><td>${n2(res.sy)}</td>${c?'':`<td>${n2(res.sm)}</td>`}</tr></table></div>`;
  h+=`<div class="res"><div><b>${n2(res.sx)} N</b><span>ΣFx</span></div><div><b>${n2(res.sy)} N</b><span>ΣFy</span></div>`;
  if(res.status==='resultant') h+=`<div><b>${n2(res.R)} N</b><span>Resultant R</span></div><div><b>${n2(res.th)}°</b><span>Direction θ from +x</span></div>`;
  if(!c) h+=`<div><b>${n2(res.sm)} N·m</b><span>ΣM<sub>O</sub> (counter-clockwise +)</span></div>`;
  h+=`</div><div class="work">`;
  h+=`<p>ΣFx = ${res.rows.map(r=>n2(r.fx)).join(' + ').replace(/\+ \u2212/g,'− ')} = <b>${n2(res.sx)} N</b></p>`;
  h+=`<p>ΣFy = ${res.rows.map(r=>n2(r.fy)).join(' + ').replace(/\+ \u2212/g,'− ')} = <b>${n2(res.sy)} N</b></p>`;
  if(res.status==='equilibrium') h+=`<p><b>R = 0 and ΣM = 0, so the system is in equilibrium.</b></p>`;
  else if(res.status==='couple') h+=`<p>R = 0 but ΣM<sub>O</sub> = ${n2(res.sm)} N·m, so the system reduces to a <b>pure couple</b> of ${n2(Math.abs(res.sm))} N·m ${res.sm>0?'counter-clockwise':'clockwise'}.</p>`;
  else{
    h+=`<p>R = √(ΣFx² + ΣFy²) = √(${n2(res.sx)}² + ${n2(res.sy)}²) = <b>${n2(res.R)} N</b></p>`;
    h+=`<p>α = tan⁻¹(|ΣFy| / |ΣFx|) = tan⁻¹(${n2(Math.abs(res.sy))} / ${n2(Math.abs(res.sx))}) = ${n2(res.alpha)}°</p>`;
    h+=`<p>ΣFx is ${res.sx>=0?'positive':'negative'} and ΣFy is ${res.sy>=0?'positive':'negative'}, so R lies in quadrant ${res.quad}: θ = <b>${n2(res.th)}°</b> from the +x axis, which is ${n2(res.alpha)}° ${res.sy>=0?'above':'below'} the ${res.sx>=0?'+x':'−x'} axis.</p>`;
    if(!c){
      if(Math.abs(res.sm)<1e-9) h+=`<p>ΣM<sub>O</sub> = 0, so R acts through the origin.</p>`;
      else{
        h+=`<p>Varignon’s theorem: R<sub>x</sub>·(−y) + R<sub>y</sub>·x = ΣM<sub>O</sub>.</p>`;
        if(Math.abs(res.sy)>1e-6) h+=`<p>At y = 0: x = ΣM<sub>O</sub> / ΣFy = ${n2(res.sm)} / ${n2(res.sy)} = <b>${n2(res.sm/res.sy)} m</b> (x-intercept of the line of action)</p>`;
        if(Math.abs(res.sx)>1e-6) h+=`<p>At x = 0: y = −ΣM<sub>O</sub> / ΣFx = ${n2(-res.sm/res.sx)} m (y-intercept)</p>`;
      }
    }
  }
  return h+'</div>';
}

/* ---------- solver tab ---------- */
let forces=[{F:50,a:30,x:0,y:0},{F:80,a:135,x:2,y:1},{F:60,a:300,x:-1,y:3}];
function renderInputs(){
  const c=$('#conc').checked;
  let h=`<tr><th>#</th><th>F (N)</th><th>θ (°)</th>${c?'':'<th>x (m)</th><th>y (m)</th>'}<th></th></tr>`;
  forces.forEach((f,i)=>{h+=`<tr><td>F${i+1}</td><td><input type="number" step="any" data-i="${i}" data-k="F" value="${f.F}" aria-label="Force ${i+1} magnitude"></td><td><input type="number" step="any" data-i="${i}" data-k="a" value="${f.a}" aria-label="Force ${i+1} angle"></td>${c?'':`<td><input type="number" step="any" data-i="${i}" data-k="x" value="${f.x}" aria-label="Force ${i+1} x"></td><td><input type="number" step="any" data-i="${i}" data-k="y" value="${f.y}" aria-label="Force ${i+1} y"></td>`}<td><button class="btn x" data-del="${i}" aria-label="Remove force ${i+1}">✕</button></td></tr>`});
  $('#ftab').innerHTML=h;
}
function update(){
  const c=$('#conc').checked;
  if(!forces.length){$('#out1').innerHTML='<h2>Solution</h2><p>Add a force to start.</p>';$('#svg1').innerHTML='';return}
  const res=solve(forces,c);draw($('#svg1'),forces,res,{arcs:1,coords:!c});$('#out1').innerHTML=solution(res);
}
$('#ftab').addEventListener('input',e=>{const t=e.target;if(t.dataset.i!==undefined){forces[+t.dataset.i][t.dataset.k]=parseFloat(t.value)||0;update()}});
$('#ftab').addEventListener('click',e=>{const d=e.target.dataset.del;if(d!==undefined){forces.splice(+d,1);renderInputs();update()}});
$('#add').onclick=()=>{forces.push({F:10,a:0,x:0,y:0});renderInputs();update()};
$('#clear').onclick=()=>{forces=[];renderInputs();update()};
$('#conc').onchange=()=>{renderInputs();update()};

/* ---------- tabs ---------- */
function tab(n){
  [['#t1','#solver'],['#t2','#practice']].forEach(([t,p],i)=>{$(t).setAttribute('aria-selected',i===n);$(p).hidden=i!==n});
  if(n===0)update();
}
$('#t1').onclick=()=>tab(0);$('#t2').onclick=()=>{tab(1);if(!cur)generate()};

/* ---------- question generator ---------- */
let cur=null;
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function generate(){
  const type=$('#qtype').value;let n=+$('#qn').value||rnd(2,4);
  const conc=type==='conc'?true:type==='non'?false:Math.random()<.5;
  const angs=[];
  while(angs.length<n){const a=rnd(0,23)*15;if(!angs.includes(a))angs.push(a)}
  const fs=angs.map(a=>({F:rnd(2,10)*10,a,x:conc?0:rnd(-3,4),y:conc?0:rnd(-3,4)}));
  cur={fs,conc,res:solve(fs,conc)};
  if(cur.res.R<1)return generate();
  let q=`<p>${conc?'The following concurrent forces act at the origin O':'The following forces act on a rigid body, each at the point shown'}.</p><ul>`;
  fs.forEach((f,i)=>{q+=`<li>F${i+1} = ${f.F} N at ${f.a}° from the +x axis${conc?'':`, applied at (${f.x}, ${f.y}) m`}</li>`});
  q+=`</ul><p>Find ΣFx, ΣFy, the magnitude and direction θ (0° to 360°, counter-clockwise from +x) of the resultant${conc?'.':', and the moment ΣM<sub>O</sub> about the origin.'}</p>`;
  $('#qtext').innerHTML=q;
  const fields=[['fx','ΣFx (N)'],['fy','ΣFy (N)'],['r','Resultant R (N)'],['th','Direction θ (°)']];
  if(!conc)fields.push(['m','ΣM_O (N·m)']);
  $('#ans').innerHTML=fields.map(([k,l])=>`<div><label for="a_${k}">${l}</label><input id="a_${k}" type="number" step="any"><div class="fb" id="f_${k}"></div></div>`).join('');
  $('#out2').hidden=true;
  draw($('#svg2'),fs,cur.res,{hideR:1,arcs:1,coords:!conc});
}
$('#gen').onclick=generate;
$('#check').onclick=()=>{
  const r=cur.res,exp={fx:r.sx,fy:r.sy,r:r.R,th:r.th,m:r.sm};
  Object.keys(exp).forEach(k=>{
    const el=$('#a_'+k);if(!el)return;
    const fb=$('#f_'+k),v=parseFloat(el.value);
    if(isNaN(v)){fb.className='fb';fb.textContent='Enter a value.';return}
    let ok;
    if(k==='th'){const d=Math.abs(((v-exp.th)%360+540)%360-180);ok=d<=0.6}
    else ok=Math.abs(v-exp[k])<=Math.max(0.6,Math.abs(exp[k])*0.01);
    fb.className='fb '+(ok?'good':'bad');
    fb.textContent=ok?'Correct':'Not quite. Check signs and quadrant.';
  });
};
$('#reveal').onclick=()=>{const o=$('#out2');o.hidden=false;o.innerHTML=solution(cur.res);draw($('#svg2'),cur.fs,cur.res,{arcs:1,coords:!cur.conc,comps:1});o.scrollIntoView({behavior:'smooth',block:'nearest'})};
$('#toSolver').onclick=()=>{forces=cur.fs.map(f=>({...f}));$('#conc').checked=cur.conc;renderInputs();tab(0)};

renderInputs();update();
