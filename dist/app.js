import { BookWorld } from './world.js';
import { StoryAudio } from './audio.js';
const $=id=>document.getElementById(id);
const pages=[
  {
    "title": "What about me?",
    "speaker": "Possum",
    "line": "You get all the attention. I get chased away!",
    "note": "A little child plays with Puppy and Cat. Up on the wall, Possum feels lonely and left out.",
    "action": "Talk to Possum",
    "after": "I wish everyone would notice me, too. But how?",
    "afterNote": "The child rolls a ball with the pets. Possum lowers his head, wishing he could join in."
  },
  {
    "title": "A shiny idea",
    "speaker": "Possum",
    "line": "Ooh! There’s shiny aluminium foil in that bin!",
    "note": "Possum paces along the back wall. Then something catches his eye…",
    "action": "Tap the shiny foil",
    "after": "Maybe if I collect the foil, I can get some attention!",
    "afterNote": "And so, Possum’s secret plan begins."
  },
  {
    "title": "Calling for backup",
    "speaker": "Possum",
    "line": "Hey! Stop playing with my shiny stash!",
    "note": "Poodle Puppy and Cat have found the foil. They think it makes a wonderful toy.",
    "action": "Tap grumpy Possum",
    "after": "I need to call in the security team from Tasmania!",
    "afterNote": "Who could help keep all that precious foil safe?"
  },
  {
    "title": "The fluffy security team",
    "speaker": "The Tasmanian devils",
    "line": "We’ll guard this stash. No paws past this point!",
    "note": "Two friendly little Tasmanian devils guard the silver stash, wearing shiny sheriff badges.",
    "action": "Let Puppy and Cat come closer",
    "after": "Grrr… Hold it right there! Step away from the foil.",
    "afterNote": "The gentle guards give their best little growl. They take their shiny job very seriously."
  },
  {
    "title": "The big reveal",
    "speaker": "The Tasmanian devils",
    "line": "Hang on… the foil stash is empty!",
    "note": "It’s Easter! A little child with a basket spots an egg. Possum’s foil stash is empty.",
    "action": "Tap sparkling Possum",
    "after": "So that’s the plan!",
    "afterNote": "Possum is a giant silver Easter egg! He parades on the wall as Puppy and Cat roll with laughter."
  },
  {
    "title": "The end… and a little more",
    "speaker": "Possum",
    "line": "At last, everyone notices me! It’s even better when we laugh together.",
    "note": "Before you go, here’s a little story quiz.",
    "action": "Try the story quiz",
    "after": "Did you work out my shiny plan?",
    "afterNote": "Choose an answer and find your shining star."
  }
];
const audio=new StoryAudio();let world,ready=false,busy=false,current=-1,reacted=false,earned=false,quizSolved=false,toastTimer;try{earned=localStorage.getItem('possum-star')==='true'}catch{}
function soundUI(){$('sound-text').textContent=audio.started&&!audio.muted?'Sound off':'Sound on';$('sound-icon').textContent=audio.started&&!audio.muted?'♫':'♪';$('sound').setAttribute('aria-pressed',String(audio.started&&!audio.muted));$('sound').setAttribute('aria-label',audio.started&&!audio.muted?'Mute sound':'Enable sound')}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600)}
async function startAudio(){await audio.start();soundUI()}
function lock(value){busy=value;for(const id of ['next','previous','open-book','scene-action'])$(id).disabled=value;$('world').setAttribute('aria-busy',String(value));if(!value){$('next').disabled=!reacted||current===5;$('previous').disabled=current<0;$('open-book').disabled=!ready}}
function displayPage(){
 const p=pages[current];
 $('chapter-number').textContent=String(current+1).padStart(2,'0');
 $('chapter-title').textContent=p.title;
 $('speaker').textContent=p.speaker;
 $('dialogue').textContent=p.line;
 $('story-note').textContent=p.note;
 $('action-text').textContent=p.action;
 $('scene-action').hidden=false;
 $('scene-chip').hidden=false;
 $('previous').setAttribute('aria-label',current===0?'Close the book and return to the shelf':'Previous page');
 $('next').hidden=current===5;
 $('page-track').replaceChildren(...pages.map((_,i)=>{
  const dot=document.createElement('span');
  dot.className='page-dot'+(i===current?' current':i<current?' done':'');
  dot.setAttribute('aria-label',`Page ${i+1}${i===current?', current page':''}`);
  if(i===current)dot.setAttribute('aria-current','step');
  return dot;
 }));
 $('world').setAttribute('aria-label',`Page ${current+1}. ${p.title}. ${p.action}. You can also use the button below.`);
 showSpeech();
}
async function openBook(){
 if(!ready||busy||current!==-1)return;
 lock(true);startAudio();audio.paper();hideSpeech();
 $('app').className='mode-reader';
 $('shelf-note').hidden=true;$('reader').hidden=false;$('footer').hidden=true;
 $('stage-label').textContent='POSSUM TALE';
 $('story-note').textContent='The book opens. A little garden comes to life.';
 $('scene-action').hidden=true;
 await world.open();current=0;reacted=false;
 await world.showPage(0);displayPage();lock(false);
 $('scene-action').focus({preventScroll:true});
}
async function action(){
 if(busy||current<0||reacted||$('reward-overlay').open||$('collection-dialog').open)return;
 lock(true);audio.click();
 if(current===3)audio.growl();
 if(current===1||current===4)audio.sparkle();
 const p=pages[current];
 $('dialogue').textContent=p.after;$('story-note').textContent=p.afterNote;
 await world.react();reacted=true;$('scene-action').hidden=true;lock(false);
 if(current===5){
  $('quiz').hidden=false;$('app').classList.add('quiz-active');
  $('quiz-feedback').textContent='';
  $('quiz').querySelector('button').focus({preventScroll:true});
 }else $('next').focus({preventScroll:true});
}
async function nextPage(direction=1){
 if(busy||current<0||$('reward-overlay').open||$('collection-dialog').open||(direction===1&&(!reacted||current===5)))return;
 if(current===0&&direction===-1)return closeBook();
 lock(true);hideSpeech();$('quiz').hidden=true;$('app').classList.remove('quiz-active');
 $('scene-action').hidden=true;
 const target=current+direction;
 await world.turnPage(target,()=>audio.paper());
 current=target;reacted=false;quizSolved=false;
 displayPage();lock(false);$('scene-action').focus({preventScroll:true});
}
async function closeBook(){
 if(busy||current<0)return;
 lock(true);hideSpeech();$('quiz').hidden=true;$('app').classList.remove('quiz-active');
 $('reward-overlay').close();$('scene-action').hidden=true;$('scene-chip').hidden=true;
 $('story-note').textContent='The garden folds away. Your story will be waiting on the shelf.';
 audio.paper();await world.close();
 current=-1;reacted=false;quizSolved=false;
 $('app').className='mode-library';$('reader').hidden=true;$('footer').hidden=false;$('shelf-note').hidden=false;
 $('stage-label').textContent='THE BOOKSHELF';
 $('world').setAttribute('aria-label','3D picture book. Select Open book to begin.');
 lock(false);$('open-book').focus({preventScroll:true});
}
function showCollection(){audio.click();$('reward-count').textContent=earned?'1':'0';$('treasure-display').innerHTML=`<span class="treasure-star${earned?'':' empty'}" aria-hidden="true">${earned?'★':'☆'}</span>`;$('treasure-description').textContent=earned?'The shining star from Possum’s Shiny Secret. A little treasure for discovering his big idea.':'No treasures yet. Finish the story quiz to discover your shining star.';$('collection-dialog').showModal()}
function confetti(){const colors=['#d8ad58','#b4c38d','#dbb0a0','#e4d7b0'];for(let i=0;i<32;i++){const p=document.createElement('i');p.className='confetti';p.style.cssText=`left:${35+Math.random()*30}%;top:30%;background:${colors[i%4]};--dx:${(Math.random()-.5)*80}vw;animation-delay:${Math.random()*.25}s;`;document.body.append(p);setTimeout(()=>p.remove(),2700)}}
function collect(){if($('collect-star').disabled)return;$('collect-star').disabled=true;earned=true;try{localStorage.setItem('possum-star','true')}catch{}$('reward-count').textContent='1';audio.sparkle();confetti();$('collect-star').classList.add('collected');$('reward-title').textContent='You collected a shining star!';$('reward-description').textContent='It’s now part of your treasure collection.';$('finish').hidden=false;$('finish').focus({preventScroll:true})}
$('open-book').addEventListener('click',openBook);$('scene-action').addEventListener('click',action);$('next').addEventListener('click',()=>nextPage());$('previous').addEventListener('click',()=>nextPage(-1));for(const id of ['brand','shelf-nav','finish'])$(id).addEventListener('click',closeBook);$('sound').addEventListener('click',async()=>{if(!audio.started){if(audio.muted)audio.toggle();await startAudio()}else{audio.toggle();soundUI()}});$('collection-nav').addEventListener('click',showCollection);for(const id of ['close-collection','collection-done'])$(id).addEventListener('click',()=>$('collection-dialog').close());$('collection-dialog').addEventListener('click',e=>{if(e.target===$('collection-dialog')){const r=$('collection-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('collection-dialog').close()}});$('collect-star').addEventListener('click',collect);
for(const button of document.querySelectorAll('[data-answer]'))button.addEventListener('click',()=>{if(quizSolved)return;audio.click();if(button.dataset.answer==='wrong'){$('quiz-feedback').textContent='Try again! Remember what Possum wanted at the start of the story.';return}quizSolved=true;audio.sparkle();$('quiz').hidden=true;$('reward-overlay').showModal();$('reward-title').textContent='That’s right! You found a star!';$('reward-description').textContent='Possum wanted a little attention. Tap the star to collect it!';$('collect-star').disabled=false;$('collect-star').classList.remove('collected');$('finish').hidden=true;$('collect-star').focus({preventScroll:true})});
$('world').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();current===-1?openBook():action()}if(e.key==='ArrowRight'){e.preventDefault();nextPage()}if(e.key==='ArrowLeft'){e.preventDefault();nextPage(-1)}});
let lastSpark=0;document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches||performance.now()-lastSpark<45)return;lastSpark=performance.now();const spark=document.createElement('i');spark.className='cursor-spark';spark.style.left=e.clientX+'px';spark.style.top=e.clientY+'px';document.body.append(spark);setTimeout(()=>spark.remove(),850)});
$('reward-count').textContent=earned?'1':'0';soundUI();
try{world=new BookWorld($('world'),()=>current===-1?openBook():action());world.onFrame=positionSpeech;world.prepareScenes();world.load().then(()=>{ready=true;$('loading').hidden=true;$('open-book').disabled=false}).catch(showError)}catch(e){showError(e)}
function showError(error){$('loading').replaceChildren();const message=document.createElement('p');message.textContent='The 3D book could not open. Please try again in a browser that supports WebGL.';const retry=document.createElement('button');retry.className='primary-button';retry.textContent='Try again';retry.addEventListener('click',()=>location.reload());$('loading').append(message,retry);console.error(error)}
// Keep the reward interaction fully operable with a keyboard.
$('reward-overlay').setAttribute('role','dialog');$('reward-overlay').setAttribute('aria-modal','true');$('reward-overlay').setAttribute('aria-labelledby','reward-title');
$('reward-overlay').addEventListener('keydown',e=>{if(e.key==='Tab'){const buttons=[...$('reward-overlay').querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
// Optional WebMCP: the same guarded transitions as the visible controls.
if(document.modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const state=()=>({ready,busy,page:current+1,title:current<0?'Bookshelf':pages[current].title,reacted,starCollected:earned});const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}};
register({name:'read_story_state',description:'Read the current page, animation state, and collected star.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>state()});
register({name:'navigate_story',description:'Open the book, react to this scene, turn a page after its reaction, go back, or close the book. Waits for animation and returns the visible result.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['open','react','next','previous','close']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||Object.keys(input).length!==1||!['open','react','next','previous','close'].includes(input.action))throw new Error('Choose a valid story action.');if(!ready||busy)throw new Error('Wait for the book to finish loading or animating.');if($('reward-overlay').open||$('collection-dialog').open)throw new Error('Finish or close the current dialog first.');const a=input.action;if(a==='open'&&current!==-1)throw new Error('The book is already open.');if(a!=='open'&&current<0)throw new Error('Open the book first.');if(a==='react'&&reacted)throw new Error('This scene has already reacted. Turn the page to continue.');if(a==='next'&&(!reacted||current===5))throw new Error('React to the current scene before advancing, or complete the ending quiz.');if(a==='open')await openBook();if(a==='react')await action();if(a==='next')await nextPage();if(a==='previous')await nextPage(-1);if(a==='close')await closeBook();return state()}})}

document.addEventListener('pointerdown',e=>{if(!e.target.closest('#sound'))startAudio()},{once:true,passive:true});

// The dialogue stays in a clear band above the book; its tail tracks the speaker.
function showSpeech(){
 $('speech-bubble').hidden=false;$('speech-pointer').removeAttribute('hidden');
 positionSpeech();
}
function hideSpeech(){
 $('speech-bubble').hidden=true;$('speech-pointer').setAttribute('hidden','');
}
function positionSpeech(){
 const bubble=$('speech-bubble');
 if(bubble.hidden||!world?.active)return;
 const anchor=world.speakerAnchor();if(!anchor)return;
 const wrap=$('world').parentElement,canvas=$('world');
 const width=wrap.clientWidth,height=wrap.clientHeight;
 const bw=bubble.offsetWidth,bh=bubble.offsetHeight;
 const short=matchMedia('(min-width:600px) and (max-height:540px)').matches;
 const tx=anchor.x+canvas.offsetLeft,ty=anchor.y+canvas.offsetTop;
 const bx=short?16:Math.min(Math.max(tx-bw*.5,16),width-bw-16);
 bubble.style.transform=`translate3d(${Math.round(bx)}px,0,0)`;
 const top=bubble.offsetTop;
 let d;
 if(short){
  const x=bx+bw,y=top+bh*.6;
  const tipX=Math.max(x+12,tx-8),tipY=Math.max(30,Math.min(ty,height-25));
  // Route the long landscape tail above the characters, then down to its speaker.
  d=`M${x-1},${y-7} C${x+45},20 ${tipX-35},20 ${tipX},${tipY} C${tipX-43},34 ${x+37},34 ${x-1},${y+7} Z`;
 }else{
  const x=Math.max(bx+22,Math.min(tx,bx+bw-22)),y=top+bh-1;
  const tipY=Math.max(y+10,ty-6);
  d=`M${x-8},${y} Q${x-7},${y+18} ${tx},${tipY} Q${x+13},${y+19} ${x+8},${y} Z`;
 }
 $('speech-pointer').setAttribute('viewBox',`0 0 ${width} ${height}`);
 $('speech-tail').setAttribute('d',d);
}
$('reward-overlay').addEventListener('cancel',e=>e.preventDefault());
