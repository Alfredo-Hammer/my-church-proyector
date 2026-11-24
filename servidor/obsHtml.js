// Páginas HTML de los overlays para OBS (/obs y /obs/tercio-inferior) y plantillas del Tercio Inferior.
// (Separado de main.js.)

// ── Genera el HTML del overlay OBS ────────────────────────────────────────
function generarObsHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GloryView · OBS Overlay</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
body{font-family:'EB Garamond','Georgia',serif}
#fondo-media{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  opacity:0;transition:opacity .7s ease;
}
#fondo-media.show{opacity:1}
#fondo-media img,#fondo-media video{
  width:100%;height:100%;object-fit:cover;display:block;
}
#fondo-overlay{
  position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(to bottom,rgba(0,0,0,.35) 0%,rgba(0,0,0,.55) 100%);
  opacity:0;transition:opacity .7s ease;
}
#fondo-overlay.show{opacity:1}
#media-content{
  position:fixed;inset:0;z-index:2;pointer-events:none;
  background:#000;opacity:0;transition:opacity .5s ease;
  display:flex;align-items:center;justify-content:center;
}
#media-content.show{opacity:1}
#media-content img,#media-content video{
  width:100%;height:100%;object-fit:contain;display:block;background:#000;
}
#media-content iframe{width:100%;height:100%;border:0;display:block}
body.fondo-oscuro{background:#02050d}
#wrap{
  position:relative;z-index:2;
  width:100%;height:100%;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:5vw 9vw;text-align:center;
  opacity:0;transition:opacity 0.55s ease;
}
#wrap.show{opacity:1}
.ref{
  font-family:'Cinzel','Georgia',serif;
  font-size:clamp(12px,1.9vw,36px);
  font-weight:600;letter-spacing:.22em;text-transform:uppercase;
  color:rgba(220,230,255,.72);
  text-shadow:0 1px 18px rgba(0,0,0,.95),0 0 30px rgba(120,130,255,.4);
  display:flex;align-items:center;justify-content:center;gap:.6em;flex-wrap:wrap;
  margin-bottom:2.2vh;
}
.ref-sep{opacity:0.3;font-weight:400;letter-spacing:0}
.parrafo{
  font-family:'EB Garamond','Georgia',serif;
  font-size:clamp(26px,5.4vw,95px);font-weight:500;line-height:1.38;
  font-style:italic;
  color:#ffffff;word-spacing:.12em;
  text-shadow:0 2px 28px rgba(0,0,0,.92),0 0 50px rgba(80,100,200,.2);
  white-space:pre-line;
}
.timer-msg{
  font-family:'Cinzel',serif;
  font-size:clamp(14px,2.6vw,48px);font-weight:400;letter-spacing:.28em;
  text-transform:uppercase;color:rgba(220,230,255,.65);
  margin:0 auto 2.5vh;width:fit-content;max-width:100%;
  text-shadow:0 2px 20px rgba(0,0,0,.9);
}
/* ── Fondo animado de estrellas (default del temporizador sin fondo propio) ── */
#starfield{
  position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;
  opacity:0;transition:opacity .7s ease;background:#02050d;
}
#starfield.show{opacity:1}
#starfield .nebula{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 120% 120% at 50% 50%,#0d1f42 0%,#010306 75%);
  animation:_nebula 9s ease-in-out infinite;
}
#starfield .core{
  position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:30vmin;height:30vmin;border-radius:50%;
  background:radial-gradient(circle,rgba(100,130,255,.12) 0%,transparent 70%);
}
.streak{position:absolute;left:50%;top:50%;border-radius:50%;transform-origin:left center}
@keyframes _hyper{
  0%{transform:translate(0,0) scaleX(.04);opacity:0}
  8%{opacity:var(--hop)}
  85%{opacity:var(--hop)}
  100%{transform:translate(var(--hdx),var(--hdy)) scaleX(1);opacity:0}
}
@keyframes _nebula{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.85;transform:scale(1.04)}}
/* ── Fondo animado de rayos de luz (fondo seleccionable "Rayo de Luz") ── */
#rayoluz{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .7s ease;background:#04060d}
#rayoluz.show{opacity:1}
#rayoluz .rl-fondo{position:absolute;inset:0;background:radial-gradient(ellipse 100% 85% at 50% 36%,#0c1733 0%,#02040a 72%)}
#rayoluz .rl-rayos1{position:absolute;left:50%;top:36%;width:170vmax;height:170vmax;background:repeating-conic-gradient(rgba(255,224,170,.11) 0deg 2.2deg,transparent 2.2deg 21deg);animation:_rdlg1 100s linear infinite;mix-blend-mode:screen}
#rayoluz .rl-rayos2{position:absolute;left:50%;top:36%;width:150vmax;height:150vmax;background:repeating-conic-gradient(rgba(160,195,255,.07) 0deg 1.6deg,transparent 1.6deg 17deg);animation:_rdlg2 140s linear infinite;mix-blend-mode:screen}
#rayoluz .rl-halo{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);width:42vmin;height:42vmin;border-radius:50%;background:radial-gradient(circle,rgba(255,238,205,.28) 0%,rgba(255,205,150,.10) 45%,transparent 72%);animation:_rdlpulso 7s ease-in-out infinite}
#rayoluz .rl-vineta{position:absolute;inset:0;background:radial-gradient(ellipse 120% 100% at 50% 50%,transparent 55%,rgba(0,0,0,.55) 100%)}
@keyframes _rdlg1{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes _rdlg2{from{transform:translate(-50%,-50%) rotate(360deg)}to{transform:translate(-50%,-50%) rotate(0deg)}}
@keyframes _rdlpulso{0%,100%{opacity:.55}50%{opacity:.9}}
/* ── Fondo animado de lluvia (fondo seleccionable "Lluvia") ── */
#lluvia{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .7s ease;background:#050a12}
#lluvia.show{opacity:1}
#lluvia .lv-fondo{position:absolute;inset:0;background:radial-gradient(ellipse 120% 90% at 50% 0%,#0c1c2e 0%,#030509 78%);animation:_lluvia_niebla 10s ease-in-out infinite}
#lluvia .lv-piso{position:absolute;left:50%;bottom:-8%;transform:translateX(-50%);width:90vw;height:24vh;border-radius:50%;background:radial-gradient(ellipse,rgba(120,170,255,.10) 0%,transparent 72%)}
.gota{position:absolute;top:0;border-radius:999px;background:linear-gradient(to bottom,transparent,rgba(170,215,255,.55),rgba(200,230,255,.8));box-shadow:0 0 6px rgba(170,215,255,.25)}
@keyframes _gota{
  0%{transform:translateY(-15vh);opacity:0}
  8%{opacity:var(--gop)}
  88%{opacity:var(--gop)}
  100%{transform:translateY(115vh);opacity:0}
}
@keyframes _lluvia_niebla{0%,100%{opacity:.55}50%{opacity:.8}}
/* ── Fondo animado de brasas (fondo seleccionable "Brasas") ── */
#brasas{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .7s ease;background:#0a0402}
#brasas.show{opacity:1}
#brasas .br-fondo{position:absolute;inset:0;background:radial-gradient(ellipse 100% 55% at 50% 100%,#4a1503 0%,#0a0402 72%)}
#brasas .br-piso{position:absolute;left:50%;bottom:-10%;transform:translateX(-50%);width:92vw;height:36vh;border-radius:50%;background:radial-gradient(ellipse,rgba(255,120,40,.35) 0%,rgba(255,80,20,.12) 45%,transparent 75%);animation:_fuego_glow 7s ease-in-out infinite}
.brasa{position:absolute;bottom:0;border-radius:50%}
@keyframes _brasa{
  0%{transform:translate(0,8vh) scale(.6);opacity:0}
  10%{opacity:var(--bop)}
  80%{opacity:var(--bop)}
  100%{transform:translate(var(--bdx),-112vh) scale(1.15);opacity:0}
}
@keyframes _fuego_glow{0%,100%{opacity:.65}50%{opacity:.92}}
/* ── Anillo de progreso del temporizador ── */
.timer-ring-wrap{position:relative;width:50vmin;height:50vmin;margin:0 auto}
.timer-ring-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.timer-ring-content{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
}
.timer-ring-num{
  font-family:'Cinzel',serif;font-weight:900;font-size:10vmin;letter-spacing:.04em;
  line-height:1;font-variant-numeric:tabular-nums;color:#e0e7ff;
  transition:color .5s ease;
}
.timer-ring-num .sep{opacity:.85}
.timer-ring-label{
  font-size:1.4vmin;font-weight:600;text-transform:uppercase;letter-spacing:.3em;
  margin-top:2vmin;opacity:.35;color:#e0e7ff;
}
.timer-ring-ya{font-family:'Cinzel',serif;font-weight:900;font-size:9vmin;line-height:1}
</style>
</head>
<body>
<div id="starfield"><div class="nebula"></div><div class="core"></div></div>
<div id="rayoluz"><div class="rl-fondo"></div><div class="rl-rayos1"></div><div class="rl-rayos2"></div><div class="rl-halo"></div><div class="rl-vineta"></div></div>
<div id="lluvia"><div class="lv-fondo"></div><div class="lv-piso"></div></div>
<div id="brasas"><div class="br-fondo"></div><div class="br-piso"></div></div>
<div id="fondo-media"></div>
<div id="fondo-overlay"></div>
<div id="media-content"></div>
<div id="wrap"><div id="content"></div></div>
<script>
const params=new URLSearchParams(location.search);
if(params.get('fondo')==='oscuro')document.body.classList.add('fondo-oscuro');
const SOLO_TEXTO=params.get('solo-texto')==='1';
const SOLO_MULTIMEDIA=params.get('solo-multimedia')==='1';
const BASE=location.origin;
let lastTs=0,lastFondoUrl='',lastTipo='',lastAnimadoId=null,lastMediaKey='';
const wrap=document.getElementById('wrap');
const content=document.getElementById('content');
const fondoMedia=document.getElementById('fondo-media');
const fondoOverlay=document.getElementById('fondo-overlay');
const mediaContent=document.getElementById('media-content');
const starfield=document.getElementById('starfield');
const rayoluz=document.getElementById('rayoluz');
const lluvia=document.getElementById('lluvia');
const brasas=document.getElementById('brasas');
function pad(n){return String(n).padStart(2,'0')}
function fmt(s){const v=Math.max(0,Math.floor(s));return pad(Math.floor(v/60))+':'+pad(v%60)}
function timerColor(s,fin){
  if(fin)return'#10b981';
  if(s<=30)return'#ef4444';
  if(s<=60)return'#f59e0b';
  return'#6366f1';
}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
let starfieldBuilt=false;
function buildStarfield(){
  if(starfieldBuilt)return;
  starfieldBuilt=true;
  const frag=document.createDocumentFragment();
  for(let i=0;i<90;i++){
    const angle=(i/90)*360+(Math.random()-0.5)*4;
    const rad=angle*Math.PI/180;
    const dist=65+Math.random()*55;
    const dx=(Math.cos(rad)*dist).toFixed(2);
    const dy=(Math.sin(rad)*dist).toFixed(2);
    const length=2+Math.random()*14;
    const width=.6+Math.random()*1.1;
    const dur=(0.8+Math.random()*1.6).toFixed(2);
    const delay=(-(Math.random()*3)).toFixed(2);
    const opacity=(0.35+Math.random()*0.55).toFixed(2);
    const warm=Math.random()<0.12;
    const color=warm?'255,210,170':'200,215,255';
    const el=document.createElement('div');
    el.className='streak';
    el.style.cssText='width:'+length+'px;height:'+width+'px;'+
      'margin-left:-'+(length/2)+'px;margin-top:-'+(width/2)+'px;'+
      'background:rgba('+color+','+opacity+');'+
      'box-shadow:0 0 '+(width*3)+'px rgba('+color+',.4);'+
      'transform:rotate('+angle+'deg);'+
      '--hdx:'+dx+'vw;--hdy:'+dy+'vh;--hop:'+opacity+';'+
      'animation:_hyper '+dur+'s '+delay+'s linear infinite';
    frag.appendChild(el);
  }
  starfield.appendChild(frag);
}
let lluviaBuilt=false;
function buildLluvia(){
  if(lluviaBuilt)return;
  lluviaBuilt=true;
  const frag=document.createDocumentFragment();
  for(let i=0;i<90;i++){
    const left=Math.random()*100;
    const length=18+Math.random()*46;
    const width=1+Math.random()*1.6;
    const dur=(3.2+Math.random()*3.4).toFixed(2);
    const delay=(-(Math.random()*5)).toFixed(2);
    const opacity=(0.12+Math.random()*0.32).toFixed(2);
    const el=document.createElement('div');
    el.className='gota';
    el.style.cssText='left:'+left+'%;width:'+width+'px;height:'+length+'px;'+
      '--gop:'+opacity+';'+
      'animation:_gota '+dur+'s '+delay+'s ease-in infinite';
    frag.appendChild(el);
  }
  lluvia.appendChild(frag);
}
let brasasBuilt=false;
function buildBrasas(){
  if(brasasBuilt)return;
  brasasBuilt=true;
  const frag=document.createDocumentFragment();
  for(let i=0;i<55;i++){
    const left=Math.random()*100;
    const size=2+Math.random()*4.5;
    const dur=(7+Math.random()*6).toFixed(2);
    const delay=(-(Math.random()*12)).toFixed(2);
    const drift=((Math.random()-0.5)*14).toFixed(1);
    const opacity=(0.35+Math.random()*0.45).toFixed(2);
    const warm=Math.random()<0.7;
    const color=warm?'255,140,60':'255,205,100';
    const el=document.createElement('div');
    el.className='brasa';
    el.style.cssText='left:'+left+'%;width:'+size+'px;height:'+size+'px;'+
      'background:rgba('+color+',1);'+
      'box-shadow:0 0 '+(size*2.5)+'px rgba('+color+',.8);'+
      '--bdx:'+drift+'vw;--bop:'+opacity+';'+
      'animation:_brasa '+dur+'s '+delay+'s ease-out infinite';
    frag.appendChild(el);
  }
  brasas.appendChild(frag);
}
// Muestra el fondo animado con el id dado
// ('estrellas'|'rayo-de-luz'|'lluvia'|'brasas') y apaga cualquier otro.
// id=null apaga los cuatro.
function mostrarAnimado(id){
  if(id==='estrellas'){buildStarfield();starfield.classList.add('show');}
  else starfield.classList.remove('show');
  if(id==='rayo-de-luz')rayoluz.classList.add('show');
  else rayoluz.classList.remove('show');
  if(id==='lluvia'){buildLluvia();lluvia.classList.add('show');}
  else lluvia.classList.remove('show');
  if(id==='brasas'){buildBrasas();brasas.classList.add('show');}
  else brasas.classList.remove('show');
}
function actualizarFondo(fondo){
  if(SOLO_TEXTO)return; // modo solo texto: fondo siempre transparente

  // Fondos animados (CSS/JS) — su url es un identificador ("animado:x"),
  // no un archivo. Van por un camino separado de <img>/<video>.
  const idAnimado=fondo&&fondo.tipo==='animado'
    ?String(fondo.url||'').replace(/^animado:/,'')
    :null;
  if(idAnimado){
    if(idAnimado===lastAnimadoId)return;
    lastAnimadoId=idAnimado;lastFondoUrl='';
    fondoMedia.innerHTML='';
    fondoMedia.classList.remove('show');
    fondoOverlay.classList.remove('show');
    mostrarAnimado(idAnimado);
    return;
  }
  if(lastAnimadoId){mostrarAnimado(null);lastAnimadoId=null;}

  const url=fondo?.url?BASE+fondo.url:'';
  if(url===lastFondoUrl)return;
  lastFondoUrl=url;
  if(!url){
    fondoMedia.innerHTML='';
    fondoMedia.classList.remove('show');
    fondoOverlay.classList.remove('show');
    return;
  }
  if(fondo.tipo==='video'){
    fondoMedia.innerHTML='<video src="'+url+'" autoplay loop muted playsinline></video>';
  } else {
    fondoMedia.innerHTML='<img src="'+url+'" alt="">';
  }
  fondoMedia.classList.add('show');
  fondoOverlay.classList.add('show');
}
function extractYoutubeId(url){
  const m=String(url||'').match(/(?:youtube\\.com\\/(?:[^/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?/\\s]{11})/);
  return m?m[1]:null;
}
// Multimedia proyectada (imagen/video/YouTube) — capa aparte de fondo-media,
// ya que acá la multimedia ES el contenido (opaca, cubre toda la pantalla),
// no un fondo detrás de texto.
//
// mediaElRef guarda el <video>/<iframe> activo para que
// sincronizarMultimediaConProyector() lo pueda pausar/reanudar/mover al
// mismo punto que el proyector real — si no, este overlay solo "carga y
// suelta" el archivo por su cuenta (autoplay/loop propio), sin enterarse de
// pausas ni de en qué segundo va el proyector real.
let mediaElRef=null;
let ytReadyRef=false;
let lastAppliedSeekTime=0;
let ytHiddenForPause=false;
function actualizarMedia(media){
  const url=media&&media.url?String(media.url):'';
  const tipo=media&&media.tipo?String(media.tipo).toLowerCase():'';
  if(!url||tipo==='audio'){
    mediaContent.classList.remove('show');
    mediaContent.innerHTML='';
    lastMediaKey='';
    mediaElRef=null;ytReadyRef=false;ytHiddenForPause=false;
    return;
  }
  const key=tipo+'|'+url;
  if(key===lastMediaKey){mediaContent.classList.add('show');return;}
  lastMediaKey=key;
  ytReadyRef=false;
  lastAppliedSeekTime=0;
  ytHiddenForPause=false;
  if(tipo==='youtube'){
    const vid=extractYoutubeId(url);
    const src=vid
      ?('https://www.youtube.com/embed/'+vid+'?autoplay=1&mute=1&loop=1&playlist='+vid+'&controls=0&modestbranding=1&rel=0&enablejsapi=1')
      :url;
    mediaContent.innerHTML='<iframe src="'+src+'" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    mediaElRef=mediaContent.querySelector('iframe');
    if(mediaElRef){
      mediaElRef.addEventListener('load',function(){
        ytReadyRef=true;
        try{
          mediaElRef.contentWindow.postMessage(JSON.stringify({event:'listening',id:'obs-youtube-player'}),'*');
        }catch(e){}
      });
    }
  } else if(tipo==='video'){
    mediaContent.innerHTML='<video src="'+url+'" autoplay loop muted playsinline></video>';
    mediaElRef=mediaContent.querySelector('video');
  } else {
    mediaContent.innerHTML='<img src="'+url+'" alt="">';
    mediaElRef=null;
  }
  mediaContent.classList.add('show');
}
function postYT(func,args){
  if(!mediaElRef||!mediaElRef.contentWindow)return;
  try{
    mediaElRef.contentWindow.postMessage(JSON.stringify({event:'command',func:func,args:args||[]}),'*');
  }catch(e){}
}
// Sincroniza el video/YouTube de este overlay contra el estado real del
// proyector (pausa/reanuda, corrige el segundo) — sin esto, el overlay
// arranca siempre desde 0 y no se entera de pausas hechas desde GloryView.
async function sincronizarMultimediaConProyector(){
  if(!mediaElRef)return;
  try{
    const r=await fetch(BASE+'/api/control/multimedia/status?destino=proyector');
    if(!r.ok)return;
    const d=await r.json();
    const status=d&&d.status;
    if(!status)return;
    const paused=Boolean(status.paused);
    const remoteTime=Number(status.currentTime);
    if(mediaElRef.tagName==='VIDEO'){
      if(paused!==mediaElRef.paused){
        if(paused)mediaElRef.pause();else mediaElRef.play().catch(function(){});
      }
      if(Number.isFinite(remoteTime)&&Math.abs(mediaElRef.currentTime-remoteTime)>1.5){
        try{mediaElRef.currentTime=remoteTime;}catch(e){}
      }
    } else if(mediaElRef.tagName==='IFRAME'&&ytReadyRef){
      // YouTube muestra su propia pantalla de "pausado" (título, miniaturas,
      // logo) apenas se pausa vía la API — no se puede tapar con parámetros
      // de URL, así que en vez de dejarlo pausado a la vista, se oculta esta
      // capa (revela el fondo) y se reanuda/resincroniza por detrás antes de
      // volver a mostrarla.
      if(paused&&!ytHiddenForPause){
        ytHiddenForPause=true;
        mediaContent.classList.remove('show');
        postYT('pauseVideo',[]);
      } else if(!paused&&ytHiddenForPause){
        ytHiddenForPause=false;
        postYT('playVideo',[]);
        if(Number.isFinite(remoteTime)){
          lastAppliedSeekTime=remoteTime;
          postYT('seekTo',[remoteTime,true]);
        }
        setTimeout(function(){
          if(!ytHiddenForPause)mediaContent.classList.add('show');
        },350);
      } else if(!paused&&Number.isFinite(remoteTime)&&Math.abs(remoteTime-lastAppliedSeekTime)>3){
        lastAppliedSeekTime=remoteTime;
        postYT('seekTo',[remoteTime,true]);
      }
    }
  }catch(e){}
}
function render(d){
  // Multimedia (imagen/video/YouTube) reemplaza el texto por completo —
  // se resuelve antes que cualquier otra rama.
  const esMultimedia=d.tipo==='multimedia'&&d.media&&d.media.url;
  if(SOLO_MULTIMEDIA){
    wrap.classList.remove('show');
    actualizarMedia(esMultimedia?d.media:null);
    return;
  }
  if(SOLO_TEXTO&&esMultimedia){
    // Modo "solo texto" es para superponer sobre cámara — un video/imagen
    // de fondo completo no tiene sentido ahí, se ignora.
    actualizarMedia(null);
    wrap.classList.remove('show');
    return;
  }
  if(esMultimedia){
    actualizarMedia(d.media);
    wrap.classList.remove('show');
    return;
  }
  actualizarMedia(null);

  // Caso especial preexistente: temporizador sin fondo propio usa el
  // starfield en vez de quedar transparente.
  if(d.tipo==='temporizador'&&!d.fondo&&!SOLO_TEXTO){
    actualizarFondo({tipo:'animado',url:'animado:estrellas'});
  } else {
    actualizarFondo(d.fondo||null);
  }
  if(d.tipo==='vacio'||(!d.parrafo&&d.tipo!=='temporizador')){
    wrap.classList.remove('show');return;
  }
  let html='';
  if(d.tipo==='temporizador'){
    const c=timerColor(d.segundos,d.terminado);
    const total=Number(d.total)||0;
    const progress=total>0?Math.max(0,Math.min(1,d.segundos/total)):0;
    const R=100,CIRC=2*Math.PI*R;
    const dashOffset=(CIRC*(1-progress)).toFixed(2);
    const centro=d.terminado
      ?'<span class="timer-ring-ya" style="color:'+c+'">¡Ya!</span>'
      :'<span class="timer-ring-num">'+pad(Math.floor(d.segundos/60))+
        '<span class="sep" style="color:'+c+'">:</span>'+pad(d.segundos%60)+'</span>'+
       '<span class="timer-ring-label">'+(Math.floor(d.segundos/60)>0?'min : seg':'segundos')+'</span>';
    html=(d.mensaje?'<div class="timer-msg">'+esc(d.mensaje)+'</div>':'')+
      '<div class="timer-ring-wrap">'+
        '<svg class="timer-ring-svg" viewBox="0 0 220 220" style="filter:drop-shadow(0 0 60px '+c+'80)">'+
          '<circle cx="110" cy="110" r="'+R+'" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>'+
          '<circle cx="110" cy="110" r="'+R+'" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round" '+
            'stroke-dasharray="'+CIRC.toFixed(2)+'" stroke-dashoffset="'+dashOffset+'" '+
            'transform="rotate(-90 110 110)" style="transition:stroke-dashoffset 1s linear,stroke .5s ease"/>'+
        '</svg>'+
        '<div class="timer-ring-content">'+centro+'</div>'+
      '</div>';
  } else {
    // Referencia ARRIBA, texto del versículo/himno debajo
    const libro=d.titulo?'<span>'+esc(d.titulo)+'</span>':'';
    const num=d.numero?'<span>'+esc(d.numero)+'</span>':'';
    const sep=(libro&&num)?'<span class="ref-sep">·</span>':'';
    const refHtml=(libro||num)?'<div class="ref">'+libro+sep+num+'</div>':'';
    html=refHtml+'<div class="parrafo">'+esc(d.parrafo).replace(/\\n/g,'<br>')+'</div>';
  }
  content.innerHTML=html;
  wrap.classList.add('show');
}
async function poll(){
  try{
    const r=await fetch(BASE+'/api/proyector/estado');
    if(!r.ok)return;
    const d=await r.json();
    // Actualizar fondo siempre (puede cambiar sin cambiar el contenido)
    actualizarFondo(d.fondo||null);
    if(d.updatedAt!==lastTs){
      lastTs=d.updatedAt;
      // Los ticks del temporizador (mismo tipo, solo cambia el segundo) se
      // actualizan en el lugar sin fade — si no, parpadea cada segundo.
      const esTickTemporizador=d.tipo==='temporizador'&&lastTipo==='temporizador';
      lastTipo=d.tipo;
      if(esTickTemporizador){
        render(d);
      } else {
        wrap.classList.remove('show');
        setTimeout(()=>render(d),480);
      }
    }
  }catch(e){}
}
setInterval(poll,800);poll();
setInterval(sincronizarMultimediaConProyector,1000);
</script>
</body>
</html>`;
}

// ── Plantillas visuales del Tercio Inferior (lower third) ──────────────────
const TERCIO_PLANTILLAS = {
  dorado: {
    nombre: 'Dorado Clásico',
    bg: 'rgba(7,20,40,VAR)',
    bgMedio: 'rgba(10,28,52,VAR2)',
    accent: '#d4af37',
    accentClaro: '#f2d77b',
    cargo: '#e8c766',
    logoBorde: '#d4af37',
    logoFondo: '#0b1f3a',
  },
  esmeralda: {
    nombre: 'Esmeralda',
    bg: 'rgba(5,28,21,VAR)',
    bgMedio: 'rgba(8,40,30,VAR2)',
    accent: '#2fbf8f',
    accentClaro: '#8fe9c9',
    cargo: '#8fe9c9',
    logoBorde: '#2fbf8f',
    logoFondo: '#062219',
  },
  borgona: {
    nombre: 'Borgoña Real',
    bg: 'rgba(32,8,17,VAR)',
    bgMedio: 'rgba(46,12,24,VAR2)',
    accent: '#d4af37',
    accentClaro: '#f2d77b',
    cargo: '#e3a6b5',
    logoBorde: '#d4af37',
    logoFondo: '#210911',
  },
  plata: {
    nombre: 'Plata Elegante',
    bg: 'rgba(21,24,30,VAR)',
    bgMedio: 'rgba(30,34,42,VAR2)',
    accent: '#c9cdd6',
    accentClaro: '#eef0f4',
    cargo: '#c9cdd6',
    logoBorde: '#c9cdd6',
    logoFondo: '#15181e',
  },
};

// ── Diseños (layouts) del Tercio Inferior — independientes del color ───────
const TERCIO_DISENOS = {
  clasico: { nombre: 'Clásico' },
  minimal: { nombre: 'Minimalista' },
  tarjeta: { nombre: 'Tarjeta' },
  banda: { nombre: 'Banda completa' },
  cristal: { nombre: 'Cristal' },
  moderno: { nombre: 'Moderno' },
};

// ── Genera el HTML del overlay dedicado del Tercio Inferior ─────────────────
// Endpoint propio (no comparte el /obs general) para que se agregue como su
// propia fuente de Navegador en OBS, siempre visible, independiente de lo que
// esté pasando en el proyector/anuncios/temporizador.
function generarTercioInferiorHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GloryView · Tercio Inferior</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
#tercio-inferior{
  position:fixed;left:0;bottom:7vh;z-index:10;
  display:flex;align-items:center;
  transform:translateX(-105%);opacity:0;
  transition:transform .7s cubic-bezier(.16,.84,.44,1),opacity .7s ease;
}
#tercio-inferior.hide{transition:transform .6s cubic-bezier(.4,0,.68,.06),opacity .6s ease}
#tercio-inferior.show[data-d]{transform:none;opacity:1}
#ti-logo{
  width:84px;height:84px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;overflow:hidden;
  border:3px solid var(--logo-borde);background:var(--logo-fondo);
  transition:border-color .4s ease,background .4s ease;
}
#ti-logo img{width:100%;height:100%;object-fit:cover}
#ti-bar{position:relative}
#ti-nombre{color:#fff}
#ti-cargo{color:var(--cargo);transition:color .4s ease}
#ti-cargo:empty{display:none}
#ti-nombre:empty{display:none}
#ti-tema{color:rgba(255,255,255,.92);font-style:italic}
#ti-tema:empty{display:none}
#ti-inst{text-transform:uppercase}

/* ── 1. Clásico: logo sobre una franja que se desvanece a la derecha ── */
[data-d="clasico"] #ti-logo{
  margin-left:46px;margin-right:-28px;z-index:2;border-radius:50%;
  box-shadow:0 0 22px var(--accent-glow),0 8px 22px rgba(0,0,0,.5);
}
[data-d="clasico"] #ti-bar{
  width:90vw;padding:17px 0 17px 54px;
  background:linear-gradient(90deg,var(--bg-solid) 0%,var(--bg-mid) 48%,var(--bg-soft) 78%,var(--bg-clear) 100%);
}
[data-d="clasico"] #ti-bar::before{content:"";position:absolute;top:0;left:0;height:2px;width:100%;
  background:linear-gradient(90deg,var(--accent-claro),var(--accent) 38%,transparent 82%)}
[data-d="clasico"] #ti-bar::after{content:"";position:absolute;bottom:0;left:0;height:1px;width:100%;
  background:linear-gradient(90deg,var(--accent-glow),transparent 82%)}
[data-d="clasico"] #ti-nombre{font-family:'Cinzel',serif;font-weight:700;font-size:28px;letter-spacing:.01em;text-shadow:0 2px 10px rgba(0,0,0,.6)}
[data-d="clasico"] #ti-cargo{font-family:'EB Garamond',serif;font-size:16px;letter-spacing:.07em;text-transform:uppercase;margin-top:3px}
[data-d="clasico"] #ti-tema{font-family:'EB Garamond',serif;font-size:19px;margin-top:6px;max-width:70vw}
[data-d="clasico"] #ti-inst{font-family:'EB Garamond',serif;font-size:11.5px;color:rgba(220,230,255,.55);letter-spacing:.17em;margin-top:7px}

/* ── 2. Minimalista: solo texto con una línea de acento, sin fondo ── */
#tercio-inferior[data-d="minimal"]{bottom:8vh;left:46px}
[data-d="minimal"] #ti-logo{width:64px;height:64px;border-width:2px;margin-right:18px;box-shadow:0 4px 16px rgba(0,0,0,.55)}
[data-d="minimal"] #ti-bar{padding:2px 0 2px 18px;max-width:70vw;border-left:4px solid var(--accent)}
[data-d="minimal"] #ti-nombre{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:38px;line-height:1.05;letter-spacing:.02em;text-shadow:0 2px 3px rgba(0,0,0,.9),0 0 18px rgba(0,0,0,.8)}
[data-d="minimal"] #ti-cargo{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:21px;letter-spacing:.1em;text-transform:uppercase;margin-top:2px;text-shadow:0 2px 3px rgba(0,0,0,.9),0 0 14px rgba(0,0,0,.8)}
[data-d="minimal"] #ti-tema{font-family:'EB Garamond',serif;font-size:21px;margin-top:5px;max-width:60vw;text-shadow:0 2px 3px rgba(0,0,0,.9),0 0 14px rgba(0,0,0,.8)}
[data-d="minimal"] #ti-inst{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;letter-spacing:.18em;margin-top:5px;color:rgba(255,255,255,.7);text-shadow:0 1px 3px rgba(0,0,0,.9)}

/* ── 3. Tarjeta: caja compacta con el logo dentro ── */
#tercio-inferior[data-d="tarjeta"]{
  left:46px;bottom:7vh;max-width:72vw;padding:14px 38px 14px 14px;
  background:linear-gradient(135deg,var(--bg-solid),var(--bg-mid));
  border:1px solid var(--accent-glow);border-left:6px solid var(--accent);border-radius:16px;
  box-shadow:0 14px 34px rgba(0,0,0,.5);
}
[data-d="tarjeta"] #ti-logo{width:76px;height:76px;border-radius:14px;margin-right:20px}
[data-d="tarjeta"] #ti-nombre{font-family:'EB Garamond',serif;font-weight:600;font-size:30px;line-height:1.1}
[data-d="tarjeta"] #ti-cargo{font-family:'EB Garamond',serif;font-size:17px;letter-spacing:.06em;text-transform:uppercase;margin-top:3px}
[data-d="tarjeta"] #ti-tema{font-family:'EB Garamond',serif;font-size:18px;margin-top:6px;max-width:50vw}
[data-d="tarjeta"] #ti-inst{font-family:'EB Garamond',serif;font-size:11px;color:rgba(220,230,255,.55);letter-spacing:.17em;margin-top:6px}

/* ── 4. Banda completa: franja de borde a borde, sube desde abajo ── */
#tercio-inferior[data-d="banda"]{
  left:0;right:0;bottom:0;width:100vw;padding:16px 54px;
  background:linear-gradient(90deg,var(--bg-solid),var(--bg-mid) 50%,var(--bg-solid));
  border-top:4px solid var(--accent);
  transform:translateY(105%);
}
[data-d="banda"] #ti-logo{width:72px;height:72px;margin-right:22px;box-shadow:0 0 18px var(--accent-glow)}
[data-d="banda"] #ti-nombre{font-family:'Cinzel',serif;font-weight:700;font-size:30px;letter-spacing:.01em}
[data-d="banda"] #ti-cargo{font-family:'EB Garamond',serif;font-size:18px;letter-spacing:.07em;text-transform:uppercase;margin-top:3px}
[data-d="banda"] #ti-bar{position:static}
[data-d="banda"] #ti-tema{font-family:'EB Garamond',serif;font-size:19px;margin-top:4px;max-width:60vw}
[data-d="banda"] #ti-inst{position:absolute;right:54px;top:50%;transform:translateY(-50%);font-family:'EB Garamond',serif;font-size:13px;letter-spacing:.2em;color:rgba(220,230,255,.6)}

/* ── 5. Cristal: píldora oscura translúcida ── */
#tercio-inferior[data-d="cristal"]{
  left:46px;bottom:8vh;padding:10px 46px 10px 10px;
  background:var(--bg-glass);border:1px solid rgba(255,255,255,.3);border-radius:999px;
  box-shadow:0 10px 30px rgba(0,0,0,.45);
  transform:translateY(28px);
}
[data-d="cristal"] #ti-logo{width:66px;height:66px;margin-right:20px;box-shadow:0 0 14px var(--accent-glow)}
[data-d="cristal"] #ti-nombre{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:30px;line-height:1.05;letter-spacing:.03em}
[data-d="cristal"] #ti-cargo{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:17px;letter-spacing:.12em;text-transform:uppercase;margin-top:1px}
[data-d="cristal"] #ti-tema{font-family:'EB Garamond',serif;font-size:17px;margin-top:2px;max-width:50vw}
[data-d="cristal"] #ti-inst{display:none}

/* ── 6. Moderno: bloques con corte diagonal, estilo transmisión ── */
#tercio-inferior[data-d="moderno"]{left:46px;bottom:8vh;align-items:stretch}
[data-d="moderno"] #ti-logo{width:86px;height:86px;border-radius:0;border:none;background:var(--logo-fondo);margin-right:0;box-shadow:0 8px 22px rgba(0,0,0,.5);padding:6px}
[data-d="moderno"] #ti-logo img{object-fit:contain}
[data-d="moderno"] #ti-bar{display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
[data-d="moderno"] #ti-nombre{
  background:var(--accent);color:var(--logo-fondo);
  font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:36px;line-height:1.05;letter-spacing:.02em;text-transform:uppercase;
  padding:8px 64px 8px 24px;clip-path:polygon(0 0,100% 0,calc(100% - 24px) 100%,0 100%);
}
[data-d="moderno"] #ti-cargo{
  background:var(--bg-solid);color:var(--accent-claro);
  font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:20px;letter-spacing:.12em;text-transform:uppercase;
  padding:6px 52px 6px 24px;clip-path:polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%);
}
[data-d="moderno"] #ti-tema{
  background:rgba(0,0,0,.6);color:#fff;
  font-family:'EB Garamond',serif;font-size:19px;
  padding:6px 40px 6px 24px;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);max-width:60vw;
}
[data-d="moderno"] #ti-inst{display:none}
</style>
</head>
<body>
<div id="tercio-inferior" data-d="clasico">
  <div id="ti-logo"><img id="ti-logo-img" src="" alt=""></div>
  <div id="ti-bar">
    <div id="ti-nombre"></div>
    <div id="ti-cargo"></div>
    <div id="ti-tema"></div>
    <div id="ti-inst"></div>
  </div>
</div>
<script>
const BASE=location.origin;
const PLANTILLAS=${JSON.stringify(TERCIO_PLANTILLAS)};
const DISENOS=${JSON.stringify(TERCIO_DISENOS)};
const el=document.getElementById('tercio-inferior');
const logoImg=document.getElementById('ti-logo-img');
const nombreEl=document.getElementById('ti-nombre');
const cargoEl=document.getElementById('ti-cargo');
const temaEl=document.getElementById('ti-tema');
const instEl=document.getElementById('ti-inst');
let shown=false,lastKey='',lastPlantilla='',lastLogo='',lastInst='';
function aplicarPlantilla(id){
  if(id===lastPlantilla)return;
  lastPlantilla=id;
  const p=PLANTILLAS[id]||PLANTILLAS.dorado;
  const s=el.style;
  s.setProperty('--bg-solid',p.bg.replace('VAR','.97'));
  s.setProperty('--bg-mid',p.bgMedio.replace('VAR2','.95'));
  s.setProperty('--bg-soft',p.bgMedio.replace('VAR2','.45'));
  s.setProperty('--bg-clear',p.bgMedio.replace('VAR2','0'));
  s.setProperty('--bg-glass',p.bg.replace('VAR','.72'));
  s.setProperty('--accent',p.accent);
  s.setProperty('--accent-claro',p.accentClaro);
  s.setProperty('--accent-glow',p.accent+'80');
  s.setProperty('--cargo',p.cargo);
  s.setProperty('--logo-borde',p.logoBorde);
  s.setProperty('--logo-fondo',p.logoFondo);
}
async function poll(){
  try{
    const r=await fetch(BASE+'/api/tercio-inferior/estado');
    if(!r.ok)return;
    const d=await r.json();
    if(d.logoUrl&&d.logoUrl!==lastLogo){lastLogo=d.logoUrl;logoImg.src=d.logoUrl;}
    const instTexto=String(d.nombreIglesia||'GloryView').toUpperCase();
    if(instTexto!==lastInst){lastInst=instTexto;instEl.textContent=instTexto;}
    aplicarPlantilla(d.plantilla||'dorado');
    const diseno=DISENOS[d.diseno]?d.diseno:'clasico';
    if(el.dataset.d!==diseno)el.dataset.d=diseno;
    const activo=Boolean(d.activo);
    const msEntrada=Number(d.duracionEntrada)||700;
    const msSalida=Number(d.duracionSalida)||600;
    if(!activo){
      if(shown){
        el.style.transitionDuration=msSalida+'ms';
        el.classList.add('hide');el.classList.remove('show');shown=false;
      }
      return;
    }
    const key=(d.nombre||'')+'|'+(d.cargo||'')+'|'+(d.tema||'');
    if(key!==lastKey){
      lastKey=key;
      // Sin nombre, el tema/evento ocupa la línea principal
      const soloTema=!d.nombre&&d.tema;
      nombreEl.textContent=soloTema?d.tema:(d.nombre||'');
      cargoEl.textContent=d.cargo||'';
      temaEl.textContent=soloTema?'':(d.tema||'');
    }
    if(!shown){
      el.style.transitionDuration=msEntrada+'ms';
      el.classList.remove('hide');el.classList.add('show');shown=true;
    }
  }catch(e){}
}
setInterval(poll,500);poll();
</script>
</body>
</html>`;
}

module.exports = { generarObsHtml, TERCIO_DISENOS, generarTercioInferiorHtml };
