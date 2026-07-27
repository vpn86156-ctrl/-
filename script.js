const $ = id => document.getElementById(id);
const coinsEl = $('coins'), gemsEl = $('gems'), levelEl = $('level'), xpFill = $('xpFill'), comboEl = $('combo');
const capy = $('capy'), content = $('content'), toast = $('toast');
const questTitle = $('questTitle'), questText = $('questText'), questFill = $('questFill'), claimQuest = $('claimQuest');
const bossPanel = $('bossPanel'), bossName = $('bossName'), bossText = $('bossText'), bossFill = $('bossFill'), bossHit = $('bossHit');
const rushBtn = $('rushBtn');
const KEY = 'kapiboom-save-v1';
const fmt = n => Math.floor(n).toLocaleString('ru-RU');
const now = () => Date.now();

const base = {
  coins: 0, gems: 0, level: 1, xp: 0, clicks: 0, totalCoins: 0, upgradesBought: 0,
  combo: 1, comboUntil: 0, rushUntil: 0, tab: 'upgrades', activeSkin: 'classic', owned: ['classic'],
  upgrades: { tap: 1, auto: 0, crit: 0, combo: 0, xp: 0 },
  quest: { type: 'clicks', goal: 80, progress: 0, reward: 250, done: false, index: 0 },
  boss: { active: false, hp: 0, max: 0, level: 0, until: 0 },
  last: now()
};
let s = load();
function load(){try{return {...base,...JSON.parse(localStorage.getItem(KEY)||'{}'),upgrades:{...base.upgrades,...(JSON.parse(localStorage.getItem(KEY)||'{}').upgrades||{})}}}catch{return structuredClone(base)}}
function save(){s.last=now();localStorage.setItem(KEY,JSON.stringify(s))}
function toastMsg(t){toast.textContent=t;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1600)}
function gainCoins(n){s.coins+=n;s.totalCoins+=n;addQuest('coins',n)}
function addXp(n){s.xp += n * (1 + s.upgrades.xp * .08);while(s.xp >= xpNeed()){s.xp-=xpNeed();s.level++;s.gems+=2;toastMsg(`Уровень ${s.level}! +2 алмаза`);if(s.level%5===0)spawnBoss()} }
function xpNeed(){return 120 + s.level*55}
function tapPower(){return (1+s.upgrades.tap*1.15) * skin().multi}
function autoPower(){return s.upgrades.auto * 2.5 * skin().multi}
function critChance(){return Math.min(.45, s.upgrades.crit*.025)}
function comboMax(){return 1 + Math.min(9, s.upgrades.combo*.45)}
function skin(){return skins.find(x=>x.id===s.activeSkin)||skins[0]}

const upgrades = [
 {id:'tap',name:'Лапка',desc:'Больше монет за клик',base:35,grow:1.42},
 {id:'auto',name:'Ферма',desc:'Монеты сами каждую секунду',base:90,grow:1.55},
 {id:'crit',name:'Крит',desc:'Шанс большого удара',base:140,grow:1.62},
 {id:'combo',name:'Комбо',desc:'Выше множитель быстрых кликов',base:120,grow:1.5},
 {id:'xp',name:'Опыт',desc:'Быстрее уровни и алмазы',base:160,grow:1.58}
];
const skins = [
 {id:'classic',name:'Классик',icon:' capy ',rarity:'обычный',multi:1},
 {id:'banana',name:'Банановая',icon:'🍌',rarity:'редкий',multi:1.12},
 {id:'ninja',name:'Ниндзя',icon:'🥷',rarity:'эпик',multi:1.28},
 {id:'king',name:'Король',icon:'👑',rarity:'легенда',multi:1.55},
 {id:'cosmo',name:'Космо',icon:'🚀',rarity:'миф',multi:1.9}
];
const quests = [
 {type:'clicks',title:'Разогрев лап',goal:80,reward:300,text:'Сделай клики'},
 {type:'coins',title:'Первый капитал',goal:2500,reward:700,text:'Заработай монеты'},
 {type:'buy',title:'Прокачай базу',goal:5,reward:900,text:'Купи улучшения'},
 {type:'cases',title:'Охота за скином',goal:2,reward:3,text:'Открой кейсы',gems:true},
 {type:'boss',title:'Рейд-босс',goal:1,reward:1600,text:'Победи босса'}
];
function nextQuest(){const q=quests[(s.quest.index+1)%quests.length];s.quest={...q,progress:0,done:false,index:s.quest.index+1}}
function addQuest(type,n=1){if(s.quest.type===type&&!s.quest.done){s.quest.progress+=n;if(s.quest.progress>=s.quest.goal){s.quest.done=true;toastMsg('Квест выполнен!')}}}

function click(e){
 const fast = now() < s.comboUntil; s.combo = fast ? Math.min(comboMax(), s.combo+.08) : 1; s.comboUntil = now()+1200+s.upgrades.combo*90;
 let amount = tapPower()*s.combo*(now()<s.rushUntil?4:1); let crit=false;
 if(Math.random()<critChance()){amount*=5;crit=true}
 gainCoins(amount); addXp(5); s.clicks++; addQuest('clicks',1);
 if(s.boss.active) damageBoss(amount*.28);
 pop(e.clientX||innerWidth/2,e.clientY||innerHeight/2,`${crit?'КРИТ ':''}+${fmt(amount)}`);
 capy.classList.add('hit');setTimeout(()=>capy.classList.remove('hit'),80);save();render();
}
function pop(x,y,t){const el=document.createElement('div');el.className='float';el.textContent=t;el.style.left=x+'px';el.style.top=y+'px';document.body.append(el);setTimeout(()=>el.remove(),800)}
function cost(u){return Math.floor(u.base*Math.pow(u.grow,s.upgrades[u.id]||0))}
function buy(id){const u=upgrades.find(x=>x.id===id),c=cost(u);if(s.coins<c)return toastMsg('Не хватает монет');s.coins-=c;s.upgrades[id]++;s.upgradesBought++;addQuest('buy',1);toastMsg('Улучшено!');save();render()}
function openCase(){if(s.gems<5)return toastMsg('Нужно 5 алмазов');s.gems-=5;addQuest('cases',1);let roll=Math.random(),pool=roll<.03?['cosmo']:roll<.13?['king']:roll<.35?['ninja']:roll<.68?['banana']:['classic'];let got=pool[Math.floor(Math.random()*pool.length)];if(!s.owned.includes(got)){s.owned.push(got);toastMsg(`Новый скин: ${skins.find(x=>x.id===got).name}!`)}else{let refund=got==='classic'?1:got==='banana'?2:got==='ninja'?4:8;s.gems+=refund;toastMsg(`Дубликат: +${refund} алм.`)}save();render()}
function spawnBoss(){s.boss={active:true,level:s.level,max:900+s.level*260,hp:900+s.level*260,until:now()+45000};toastMsg('Появился босс!')}
function damageBoss(d){if(!s.boss.active)return;s.boss.hp-=d;if(s.boss.hp<=0){s.boss.active=false;gainCoins(1800+s.level*350);s.gems+=5;addQuest('boss',1);toastMsg('Босс побеждён! +5 алмазов')}}
function bossAttack(){if(!s.boss.active)return;damageBoss(tapPower()*10*(now()<s.rushUntil?2:1));save();render()}
function rush(){if(s.gems<3)return toastMsg('Нужно 3 алмаза');s.gems-=3;s.rushUntil=now()+15000;toastMsg('БУМ-режим x4 на 15 сек!');save();render()}
function reset(){if(confirm('Точно сбросить весь прогресс?')){localStorage.removeItem(KEY);s=load();render()}}

function render(){
 coinsEl.textContent=fmt(s.coins);gemsEl.textContent=fmt(s.gems);levelEl.textContent=s.level;xpFill.style.width=Math.min(100,s.xp/xpNeed()*100)+'%';
 comboEl.textContent=`Комбо x${s.combo.toFixed(1)}${now()<s.rushUntil?' · БУМ':''}`;
 questTitle.textContent=s.quest.title||'Квест';questText.textContent=`${s.quest.text}: ${Math.min(Math.floor(s.quest.progress),s.quest.goal)}/${s.quest.goal}. Награда: ${s.quest.reward}${s.quest.gems?' алм.':' мон.'}`;questFill.style.width=Math.min(100,s.quest.progress/s.quest.goal*100)+'%';claimQuest.disabled=!s.quest.done;
 if(s.boss.active&&now()>s.boss.until){s.boss.active=false;toastMsg('Босс ушёл')}
 bossPanel.classList.toggle('active',s.boss.active);bossName.textContent=s.boss.active?`Босс ур. ${s.boss.level}`:'Плюшевый босс';bossText.textContent=s.boss.active?'Бей кликами или кнопкой атаки. Победа даёт монеты и алмазы.':'Появляется каждые 5 уровней.';bossFill.style.width=s.boss.active?Math.max(0,s.boss.hp/s.boss.max*100)+'%':'0%';
 renderTab();
}
function renderTab(){
 if(s.tab==='upgrades')content.innerHTML=`<div class="grid">${upgrades.map(u=>`<article class="card"><b>${u.name} · ${s.upgrades[u.id]}</b><span>${u.desc}</span><small>Цена: ${fmt(cost(u))}</small><button class="primary" onclick="buy('${u.id}')">Купить</button></article>`).join('')}</div>`;
 if(s.tab==='cases')content.innerHTML=`<div class="grid"><article class="card"><b>Сочный кейс</b><span>Цена 5 алмазов. Шанс: редкий, эпик, легенда, миф.</span><small>Скины дают множитель монет</small><button class="primary" onclick="openCase()">Открыть</button></article><article class="card"><b>Бум-режим</b><span>15 секунд x4 монет. Цена 3 алмаза.</span><small>Лучше использовать на боссе</small><button class="primary" onclick="rush()">Запустить</button></article></div>`;
 if(s.tab==='skins')content.innerHTML=`<div class="grid">${skins.map(sk=>`<article class="card skin"><div class="skin-icon">${sk.icon}</div><b>${sk.name}</b><span>${sk.rarity} · x${sk.multi}</span><button class="${s.activeSkin===sk.id?'secondary':'primary'}" ${s.owned.includes(sk.id)?`onclick="equip('${sk.id}')"`:'disabled'}>${s.owned.includes(sk.id)?(s.activeSkin===sk.id?'Надет':'Надеть'):'Закрыт'}</button></article>`).join('')}</div>`;
 if(s.tab==='stats')content.innerHTML=`<div class="grid"><article class="card"><b>${fmt(s.clicks)}</b><span>Всего кликов</span></article><article class="card"><b>${fmt(s.totalCoins)}</b><span>Всего монет</span></article><article class="card"><b>${s.owned.length}/${skins.length}</b><span>Скинов открыто</span></article><article class="card"><b>${autoPower().toFixed(1)}/сек</b><span>Авто-доход</span></article></div>`;
}
function equip(id){if(!s.owned.includes(id))return;s.activeSkin=id;toastMsg('Скин надет');save();render()}
function tick(){const dt=Math.min(3,(now()-s.last)/1000);if(autoPower()>0)gainCoins(autoPower()*dt*(now()<s.rushUntil?4:1));s.last=now();if(now()>s.comboUntil)s.combo=Math.max(1,s.combo-.05);save();render();}
setInterval(tick,1000);
capy.addEventListener('pointerdown',click);bossHit.onclick=bossAttack;rushBtn.onclick=rush;claimQuest.onclick=()=>{if(!s.quest.done)return;if(s.quest.gems)s.gems+=s.quest.reward;else gainCoins(s.quest.reward);nextQuest();save();render()};$('resetBtn').onclick=reset;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');s.tab=b.dataset.tab;save();render()});
window.buy=buy;window.openCase=openCase;window.rush=rush;window.equip=equip;
render();
