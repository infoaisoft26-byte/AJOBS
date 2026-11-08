(() => {
  const START = Date.parse('2026-11-07T18:30:00.000Z'); // 12:00 AM IST, 8 Nov 2026
  const END = Date.parse('2026-11-08T18:30:00.000Z');   // 12:00 AM IST, 9 Nov 2026
  const KEY = 'aijobs-diwali-2026-intro-seen';
  const now = Date.now();
  if (now < START || now >= END) return;
  try { if (localStorage.getItem(KEY) === '1') return; localStorage.setItem(KEY, '1'); } catch (_) {}
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const style = document.createElement('style');
  style.textContent = '#aijobs-diwali-intro{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:radial-gradient(ellipse at 50% 72%,#39204c 0%,#120c2d 42%,#030615 100%);color:#fff;display:grid;place-items:center;perspective:1100px;opacity:1;transition:opacity .9s ease;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '#aijobs-diwali-intro *{box-sizing:border-box}#aijobs-diwali-intro.is-leaving{opacity:0;pointer-events:none}#aijobs-diwali-intro canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '#aijobs-diwali-intro .diwali-stars{position:absolute;inset:-30%;background-image:radial-gradient(2px 2px at 20% 30%,#fff 50%,transparent 60%),radial-gradient(1px 1px at 70% 20%,#ffe7a3 50%,transparent 60%),radial-gradient(2px 2px at 85% 65%,#fff 50%,transparent 60%),radial-gradient(1px 1px at 35% 80%,#ffd36b 50%,transparent 60%);background-size:290px 250px;opacity:.55;animation:diwali-drift 18s linear infinite}' +
    '#aijobs-diwali-intro .diwali-halo{position:absolute;width:min(75vw,620px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,173,62,.19),rgba(245,90,120,.07) 42%,transparent 70%);filter:blur(10px);animation:diwali-pulse 3s ease-in-out infinite}' +
    '#aijobs-diwali-intro .diwali-scene{position:relative;z-index:3;width:min(92vw,900px);text-align:center;transform-style:preserve-3d;animation:diwali-arrive 1.2s cubic-bezier(.2,.8,.2,1) both;padding:32px 16px}' +
    '#aijobs-diwali-intro .diwali-brand{font-size:clamp(11px,1.8vw,14px);font-weight:800;letter-spacing:.38em;color:#ffe5ad;text-shadow:0 0 18px #ffb44c;margin-bottom:24px}' +
    '#aijobs-diwali-intro .diwali-title{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(42px,9.5vw,100px);line-height:.98;font-weight:900;letter-spacing:.025em;color:#fff2c9;text-shadow:0 2px 0 #b76b21,0 5px 0 #7a3a22,0 10px 22px rgba(0,0,0,.65),0 0 34px rgba(255,183,69,.9);transform:rotateX(9deg);animation:diwali-title-glow 2.5s ease-in-out infinite alternate}' +
    '#aijobs-diwali-intro .diwali-sub{margin:24px auto 0;max-width:620px;color:#ffe9d0;font-size:clamp(14px,2.5vw,20px);letter-spacing:.07em;text-shadow:0 2px 12px #000}' +
    '#aijobs-diwali-intro .diwali-lamps{display:flex;justify-content:center;gap:clamp(20px,7vw,64px);margin-top:30px;filter:drop-shadow(0 0 16px rgba(255,167,55,.75))}' +
    '#aijobs-diwali-intro .diya{position:relative;width:54px;height:25px;border-radius:0 0 30px 30px;background:linear-gradient(180deg,#ffdf8b,#b84b18);transform:rotateX(-15deg);box-shadow:inset 0 -5px 0 rgba(100,30,10,.25)}' +
    '#aijobs-diwali-intro .diya:before{content:"";position:absolute;width:14px;height:25px;left:20px;top:-25px;border-radius:100% 0 100% 0;transform:rotate(45deg);background:radial-gradient(ellipse at 35% 70%,#fffbd0 0 12%,#ffdc66 35%,#ff7b22 70%,transparent 74%);filter:drop-shadow(0 0 10px #ff9c30);animation:diwali-flame .55s ease-in-out infinite alternate}' +
    '#aijobs-diwali-intro .diwali-rocket{position:absolute;bottom:-120px;width:12px;height:48px;border-radius:8px 8px 4px 4px;background:linear-gradient(90deg,#b92f38,#ffdc80 48%,#b92f38);box-shadow:0 0 16px #ffb34e;z-index:2;animation:diwali-launch 2.8s ease-in infinite}' +
    '#aijobs-diwali-intro .diwali-rocket:before{content:"";position:absolute;top:-10px;left:1px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:12px solid #ffdf9b}#aijobs-diwali-intro .diwali-rocket:after{content:"";position:absolute;bottom:-28px;left:2px;width:8px;height:32px;background:linear-gradient(#fff6a8,rgba(255,113,37,0));filter:blur(3px)}' +
    '#aijobs-diwali-intro .diwali-rocket.r1{left:13%;animation-delay:.2s;--tilt:-13deg}#aijobs-diwali-intro .diwali-rocket.r2{right:15%;animation-delay:1.1s;--tilt:12deg}#aijobs-diwali-intro .diwali-rocket.r3{left:48%;animation-delay:1.8s;--tilt:3deg}' +
    '#aijobs-diwali-intro .diwali-skip{position:absolute;z-index:5;right:18px;top:18px;border:1px solid rgba(255,230,180,.45);border-radius:99px;padding:9px 15px;color:#fff4d8;background:rgba(16,10,35,.5);font-size:12px;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(10px)}' +
    '@keyframes diwali-drift{to{transform:translate3d(8%,5%,0)}}@keyframes diwali-pulse{50%{transform:scale(1.12);opacity:.7}}' +
    '@keyframes diwali-arrive{from{opacity:0;transform:translateY(35px) rotateX(16deg) scale(.88)}to{opacity:1;transform:translateY(0) rotateX(0) scale(1)}}' +
    '@keyframes diwali-title-glow{to{filter:brightness(1.2);transform:rotateX(0) translateZ(28px)}}@keyframes diwali-flame{to{transform:rotate(58deg) scale(.85);filter:drop-shadow(0 0 16px #ffd56b)}}' +
    '@keyframes diwali-launch{0%{transform:translate3d(0,0,0) rotate(var(--tilt));opacity:0}12%{opacity:1}80%{opacity:1}100%{transform:translate3d(35px,-115vh,0) rotate(var(--tilt));opacity:0}}' +
    '@media(max-width:560px){#aijobs-diwali-intro .diwali-brand{letter-spacing:.24em;margin-bottom:18px}#aijobs-diwali-intro .diwali-sub{line-height:1.6}.diya{transform:scale(.82)}}';
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'aijobs-diwali-intro';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'AIJOBS Happy Diwali celebration');
  overlay.innerHTML = '<div class="diwali-stars"></div><div class="diwali-halo"></div><canvas aria-hidden="true"></canvas>' +
    '<div class="diwali-rocket r1"></div><div class="diwali-rocket r2"></div><div class="diwali-rocket r3"></div>' +
    '<button class="diwali-skip" type="button" aria-label="Skip Diwali animation">SKIP ✕</button>' +
    '<section class="diwali-scene"><div class="diwali-brand">AIJOBS • THE FLEX FORCE SERVICES</div>' +
    '<h1 class="diwali-title">HAPPY<br>DIWALI</h1>' +
    '<p class="diwali-sub">May your dreams shine bright and every new beginning bring success, joy &amp; prosperity.</p>' +
    '<div class="diwali-lamps" aria-hidden="true"><span class="diya"></span><span class="diya"></span><span class="diya"></span></div></section>';
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = 0, running = true;
  const bursts = [];
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const colors = ['#ffd166','#ff6b6b','#fff2c6','#b8f7ff','#e6a8ff','#ff9f43'];
  function burst(x, y) {
    const hue = colors[Math.floor(Math.random() * colors.length)];
    const particles = [];
    const count = 46 + Math.floor(Math.random() * 26);
    for (let i=0;i<count;i++) {
      const a = Math.PI * 2 * i / count + Math.random() * .12;
      const speed = 1.1 + Math.random() * 4.1;
      particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,z:.5+Math.random()*.9,life:55+Math.random()*30,size:.8+Math.random()*2});
    }
    bursts.push({particles,color:hue});
  }
  function frame() {
    if (!running) return;
    ctx.clearRect(0,0,w,h);
    if (Math.random() < .055) burst(w*(.12+Math.random()*.76), h*(.12+Math.random()*.46));
    for (let b=bursts.length-1;b>=0;b--) {
      const item=bursts[b];
      for (let i=item.particles.length-1;i>=0;i--) {
        const p=item.particles[i];
        p.x+=p.vx*p.z; p.y+=p.vy*p.z; p.vy+=.025; p.vx*=.986; p.vy*=.986; p.life--;
        if(p.life<=0){item.particles.splice(i,1);continue;}
        ctx.globalAlpha=Math.min(1,p.life/24);ctx.fillStyle=item.color;ctx.shadowBlur=12;ctx.shadowColor=item.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.z,0,Math.PI*2);ctx.fill();
      }
      if(!item.particles.length)bursts.splice(b,1);
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;raf=requestAnimationFrame(frame);
  }
  resize(); window.addEventListener('resize',resize,{passive:true}); frame();
  const finish = () => {
    if (!running) return;
    running=false; cancelAnimationFrame(raf); window.removeEventListener('resize',resize);
    overlay.classList.add('is-leaving');
    setTimeout(()=>{overlay.remove();style.remove();},950);
  };
  overlay.querySelector('.diwali-skip').addEventListener('click',finish);
  setTimeout(finish,9500);
})();