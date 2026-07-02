(function(){
  const cv      = document.getElementById('c');
  const cx      = cv.getContext('2d');
  const ui      = document.getElementById('ui');
  const svgWrap = document.getElementById('svgWrap');
  const handset = document.getElementById('handset');
  const ledGlow = document.getElementById('ledGlow');
  const wireInner = document.getElementById('wireInner');
  const dialogBox = document.getElementById('dialogBox');
  const dialogText= document.getElementById('dialogText');
  const fadeIn    = document.getElementById('fadeIn');

  let W=0, H=0, t=0;

  // =============================================
  //  ENTRANCE SEQUENCE
  //  1. fade from black
  //  2. intercom appears
  //  3. intercom speaks
  //  4. hub (background + links) fade in
  // =============================================
  setTimeout(()=> fadeIn.classList.add('done'), 100);
  setTimeout(()=> svgWrap.classList.add('visible'), 600);
  setTimeout(()=> typeLine(LINES[0]), 1400);
  setTimeout(()=>{ cv.classList.add('visible'); ui.classList.add('visible'); }, 2200);

  // =============================================
  //  INTERCOM LINES
  // =============================================
  const LINES = [
    "Welcome to the Hub. I'll appear throughout your visit to provide additional information whenever necessary.",
    "Some doors lead nowhere. Others lead somewhere you've already been.",
    "You are not lost. You simply haven't arrived yet.",
    "Click anything. Most of it won't matter. That's fine.",
    "I do not know who built this place. I only know I am here.",
    "This room reorganizes itself when you're not looking directly at it.",
    "There is no map. There was never going to be a map.",
    "Some visitors stay for years without finding the second floor.",
    "I will not explain everything. Explaining everything would ruin it.",
    "If something feels wrong here, it probably is. Continue anyway.",
    "I have been counting your visits. The number does not matter to you yet.",
    "Curiosity is the only currency that works here.",
  ];

  let usedLines = [];
  function nextLine(){
    if(usedLines.length >= LINES.length) usedLines = [];
    let idx;
    do { idx = Math.floor(Math.random()*LINES.length); } while(usedLines.includes(idx));
    usedLines.push(idx);
    return LINES[idx];
  }

  // =============================================
  //  AUDIO
  // =============================================
  let audioCtx = null;
  function initAudio(){
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  }
  // auto-init if coming from index with ?audio=1
  if(new URLSearchParams(window.location.search).get('audio')==='1'){
    try{ initAudio(); } catch(e){}
  }

  function playBlip(i){
    if(!audioCtx) return;
    const freq = 130+((i*37)%9)*14;
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.045);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime+0.05);
  }

  let typing=false, hideTimer=null;
  function typeLine(line){
    initAudio();
    typing = true;
    if(hideTimer) clearTimeout(hideTimer);
    dialogBox.style.opacity = '1';
    dialogText.textContent  = '';
    let i=0;
    function step(){
      if(i<line.length){
        const ch = line[i];
        dialogText.textContent += ch;
        if(ch!==' ') playBlip(i);
        i++;
        setTimeout(step, 28+Math.random()*14);
      } else {
        typing = false;
        const readTime = Math.max(3500, line.length*68);
        hideTimer = setTimeout(()=>{ dialogBox.style.opacity='0'; }, readTime);
      }
    }
    step();
  }

  // =============================================
  //  5 LINKS around intercom
  // =============================================
  const LINKS = [
    { label:'cinema',         href:'cinema/guichet.html', angle:-Math.PI/2 }, // top — LIVE
    { label:'coming soon...', href:'#', angle:0 },            // right
    { label:'coming soon...', href:'#', angle:Math.PI/2 },    // bottom
    { label:'coming soon...', href:'#', angle:Math.PI },      // left
    { label:'???',            href:'#', angle:-Math.PI/4 },   // top-right offset
  ];

  const links = [];
  function initLinks(){
    ui.querySelectorAll('.lk').forEach(e=>e.remove());
    links.length = 0;
    LINKS.forEach((link,i)=>{
      const el = document.createElement('span');
      el.className = 'lk';
      el.textContent = link.label;
      el.style.fontSize      = '9px';
      el.style.color         = '#888';
      el.style.letterSpacing = '0.12em';
      el.style.cursor        = link.href==='#'?'default':'pointer';
      if(link.href!=='#') el.addEventListener('click',()=>{ window.location.href=link.href; });
      ui.appendChild(el);
      links.push({ el, baseAngle:link.angle, phase:i*Math.PI*0.5 });
    });
  }

  function updateLinks(){
    const cxW=W/2, cyH=H/2;
    const R = Math.min(W,H)*0.36;
    links.forEach((l,i)=>{
      const wobble = Math.sin(t*0.25+l.phase)*0.018;
      const a = l.baseAngle+wobble;
      const r = R+Math.sin(t*0.18+l.phase)*6;
      const x = cxW+Math.cos(a)*r;
      const y = cyH+Math.sin(a)*r;
      l.el.style.left      = x+'px';
      l.el.style.top       = y+'px';
      l.el.style.transform = 'translate(-50%,-50%)';
      l.el.style.opacity   = 0.3+Math.abs(Math.sin(t*0.2+l.phase))*0.2;
    });
  }

  // =============================================
  //  PHONE ANIMATION
  // =============================================
  let nextBlink=Math.random()*3+1, blinkState=false, lastBlink=0, handsetOffT=-99;

  function updatePhone(){
    const tx=Math.sin(t*5.1)*0.12, ty=Math.cos(t*4.3)*0.1;
    svgWrap.style.transform=`translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;

    if(t-lastBlink>nextBlink){
      blinkState=!blinkState; lastBlink=t;
      nextBlink=blinkState?(0.05+Math.random()*0.15):(0.5+Math.random()*3);
    }
    ledGlow.style.opacity=blinkState?'1':'0.15';

    const sinceOff=t-handsetOffT;
    let liftY=0, liftRot=0;
    if(sinceOff<1.5){
      const p=sinceOff<0.3?sinceOff/0.3:(sinceOff<1.2?1:1-(sinceOff-1.2)/0.3);
      liftY=-6*Math.max(0,Math.min(1,p));
      liftRot=-3*Math.max(0,Math.min(1,p));
    }
    const ht=Math.sin(t*9.4)*0.08;
    handset.setAttribute('transform',`translate(${ht},${liftY}) rotate(${liftRot},150,66)`);
    wireInner.setAttribute('transform',`translate(${Math.sin(t*1.3)*0.5},0)`);
  }

  svgWrap.addEventListener('click',()=>{
    if(typing) return;
    handsetOffT=t;
    typeLine(nextLine());
  });

  // =============================================
  //  BACKGROUND CANVAS
  // =============================================
  function draw(){
    cx.clearRect(0,0,W,H);
    cx.fillStyle='#0e0c09'; cx.fillRect(0,0,W,H);
    const cxW=W/2, cyH=H/2;
    const vx=cxW+Math.sin(t*0.08)*22, vy=cyH+Math.cos(t*0.05)*16;

    // corridor lines
    for(let i=0;i<10;i++){
      const p=i/10, spread=p*W*0.65;
      [[cyH+20+(H*0.5-20)*p],[cyH-20-(H*0.5-20)*p]].forEach(([yy])=>{
        cx.beginPath(); cx.moveTo(vx,vy); cx.lineTo(cxW-spread/2,yy);
        cx.strokeStyle=`rgba(42,26,9,${0.07+p*0.09})`; cx.lineWidth=0.4+p*0.4; cx.stroke();
        cx.beginPath(); cx.moveTo(vx,vy); cx.lineTo(cxW+spread/2,yy); cx.stroke();
      });
    }

    // black doors
    [{x:0.12,y:0.22,w:0.09,h:0.38,ph:0},{x:0.80,y:0.26,w:0.08,h:0.34,ph:1.8},{x:0.44,y:0.06,w:0.12,h:0.13,ph:3.2}].forEach(d=>{
      const dx=d.x*W+Math.sin(t*0.14+d.ph)*3;
      const dy=d.y*H+Math.cos(t*0.10+d.ph)*2;
      cx.fillStyle='rgba(3,2,1,.95)'; cx.fillRect(dx,dy,d.w*W,d.h*H);
      cx.strokeStyle=`rgba(55,36,13,.28)`; cx.lineWidth=0.7; cx.strokeRect(dx,dy,d.w*W,d.h*H);
    });

    // bg noise
    if(Math.random()<0.08){
      cx.font=`${6+Math.random()*4}px 'Courier New'`;
      cx.fillStyle=`rgba(${38+Math.random()*25},${23+Math.random()*15},${6+Math.random()*7},.05)`;
      let s=''; const chars='0123456789ABCDEFabcdef_:/\\░▒▓';
      for(let i=0;i<8;i++) s+=chars[Math.floor(Math.random()*chars.length)];
      cx.fillText(s,Math.random()*W,Math.random()*H);
    }

    cx.fillStyle='rgba(120,80,20,.007)';
    cx.fillRect(0,(t*24)%H,W,1);

    const vig=cx.createRadialGradient(cxW,cyH,H*0.06,cxW,cyH,H*0.65);
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,.9)');
    cx.fillStyle=vig; cx.fillRect(0,0,W,H);
  }

  // =============================================
  //  RESIZE + LOOP
  // =============================================
  function resize(){
    const nW=window.innerWidth, nH=window.innerHeight;
    if(nW===W && nH===H) return;
    W=nW; H=nH; cv.width=W; cv.height=H;
    if(links.length===0) initLinks();
  }

  function loop(){
    t+=0.016; resize(); draw(); updateLinks(); updatePhone();
    requestAnimationFrame(loop);
  }
  loop();
})();
