import {xor, batchMove} from '../_utility/function.js'

/**
 * 技能テーブル用の情報を格納しておくリスト
 * {type, name, value, times, noname}
 * @type {Array}
 * @type 判定の種類\n
 *  - choice : チョイス
 *  - roll : 通常の判定
 *  - dice : 1d3など、振るダイスが直接記述されているもの
 *  - elseRoll : 対抗ロール・正気度ロールなど、判定だが振るダイスが直接記述されているもの
 *  - line : :HP+1, /scene, @face など、そのままチャットに送るもの
 * @name 技能名
 * @value 技能値・判定部分のテキスト
 * @times **繰り返す回数
 * @noname **技能名をチャパレに表示しない設定
*/
const skillList = [];

/**
 * チャパレ用の情報を格納しておくリスト
 * {type, name, value, times, noname}
 * @type {Array}
 * @type 判定の種類\n
 *  - choice : チョイス
 *  - roll : 通常の判定
 *  - dice : 1d3など、振るダイスが直接記述されているもの
 *  - elseRoll : 対抗ロール・正気度ロールなど、判定だが振るダイスが直接記述されているもの
 *  - line : セパレータ, :HP+1, /scene, @face など、そのままチャットに送るもの
 * @name 技能名
 * @value 技能値・判定部分のテキスト
 * @times **繰り返す回数
 * @noname **技能名をチャパレに表示しない設定
 */
const chatList = [];

let settingDic = {};

// middle col
const nameEl   = document.getElementById('name');
const statsEl  = document.getElementById('stats');
const skillsEl = document.getElementById('skills');

// Table
const paramsTable = document.querySelector('#paramsTable tbody');
const statsTable  = document.querySelector('#statsTable tbody');
const elseTable   = document.querySelector('#elseTable tbody');
const skillTable  = document.querySelector('#skillTable tbody');
const chatTable   = document.querySelector('#chatTable tbody');

// event for D&D
const dragEvent = new Map([
  ['dragstart',dragStart2], 
  ['dragenter',switchRow], 
  ['dragover', dragOver],
  ['dragend', dragEnd2]
]);


// -------------------------
//         初期処理
// -------------------------
initProcess();
async function initProcess() {
  const json = await fetch('./setting.json').then(res=>res.json());
  
  nameEl.placeholder   = json.placeholder.name.join('\n');
  statsEl.placeholder  = json.placeholder.stats.join('\n');
  skillsEl.placeholder = json.placeholder.skills.join('\n');
  
  const changeLogTable = document.querySelector('footer table tbody');
  json.changeLog.forEach(log=>addRow(changeLogTable, [log.date, log.version, log.detail]));

  settingDic = structuredClone(json.setting);
  document.getElementById('delChar').value = json.deleteChar;
  
  return;
}


// -------------------------
//     モーダルカード関連
// -------------------------

// 閉じる時：初期化
document.getElementById('modal').addEventListener('beforetoggle', (e) => {
  if (e.newState==='open') return;
  e.currentTarget.querySelector('h2').innerHTML = '';
  e.currentTarget.querySelectorAll('header > :not(h2, button:has(.icon-close))').forEach(el => el.remove());
  e.currentTarget.querySelector('section').innerHTML = '';
  e.currentTarget.querySelector('section').removeAttribute('class');
  e.currentTarget.querySelector('section').removeAttribute('style');
});

// 使い方
document.getElementById('how2use').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('section');
  
  modal.querySelector('h2').textContent = '使い方';
});

// 便利機能
document.getElementById('useful').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('section');
  
  modal.querySelector('h2').textContent = '便利機能';

  const ul = addElement(body, 'ul');
  ul.style.setProperty('width', 'fit-content');
  ul.style.setProperty('justify-self', 'center');
  ul.style.setProperty('font-size', 'calc(1rem - 1px)');

  addElement(ul, 'li', ['ok'], '<span class="greenBold">チャパレ並び替え</span><br>ドラッグ＆ドロップ');
  addElement(ul, 'li', ['ok'], '<span class="greenBold">シークレットダイス（個別）</span><br>チャパレ欄の☑');
  const li3 = addElement(ul, 'li', ['ok']);
  addElement(li3, 'span', ['greenBold'], '出力ON/OFF（個別）');
  const ul2 = addElement(li3, 'ul');
  addElement(ul2, 'li', [], 'パラメータ');
  addElement(ul2, 'li', [], 'ステータス');
  addElement(ul2, 'li', [], 'チャパレ');
  addElement(ul2, 'li', [], '技能名');
  li3.appendChild(document.createTextNode('該当の欄をクリック'));
});

// チャパレ設定
document.getElementById('diceSetting').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('section');

  modal.querySelector('h2').textContent = 'チャパレ設定';

  body.className = 'settingWrapper';
  body.style.setProperty('width', '22rem');

  addElement(body, 'span', [], 'システム');
  const systemInput = createToggleBtn(body, !settingDic.is6th, {notChecked:'CoC6th', checked:'CoC7th'});

  addElement(body, 'span', [], '判定ダイス');
  const diceSelect = addElement(body, 'select');
  addElement(diceSelect, 'option', [], 'CC',    [['value','CC']]);
  addElement(diceSelect, 'option', [], 'CCB',   [['value','CCB'],['selected', '']]);
  addElement(diceSelect, 'option', [], '1d100', [['value','1d100']]);

  addElement(body, 'span', [], '形式');
  const rollStyleSelect = addElement(body, 'select');
  addElement(rollStyleSelect, 'option', [], 'CCB<=70 【...】',  [['value', '']]);
  addElement(rollStyleSelect, 'option', [], 'sCCB<=70 【...】', [['value', 's']]);
  addElement(rollStyleSelect, 'option', [], 'CCB 【...】@70',   [['value', '@'], ['selected','']]);

  addElement(body, 'span');
  const innerWrapper = addElement(body, 'div', ['settingWrapper'], null, [['style', 'margin: 0;column-gap: 0.5rem;']]);

  addElement(innerWrapper, 'span', [], '単体ダイス');
  const sDiceInput = createToggleBtn(innerWrapper, settingDic.secretSingleDice, {notChecked:'オープン', checked:'シークレット'});

  addElement(innerWrapper, 'span', [], 'choice');
  const sChoiceInput = createToggleBtn(innerWrapper, settingDic.secretChoice, {notChecked:'オープン', checked:'シークレット'});


  // --------------------------
  //       Event Listener
  // --------------------------
  systemInput.addEventListener('change', (e)=>settingDic.is6th = !e.currentTarget.checked);
  diceSelect.addEventListener('change', (e)=>{
    settingDic.dice = e.currentTarget.value;
    rollStyleSelect.children[0].textContent = e.currentTarget.value+'<=70 【...】';
    rollStyleSelect.children[1].textContent = 's'+e.currentTarget.value+'<=70 【...】';
    rollStyleSelect.children[2].textContent = e.currentTarget.value+' 【...】@70';
  });
  rollStyleSelect.addEventListener('change', (e)=>settingDic.rollStyle = e.currentTarget.value);
  sDiceInput.addEventListener('change', (e)=>settingDic.secretSingleDice = e.currentTarget.checked);
  sChoiceInput.addEventListener('change', (e)=>settingDic.secretChoice = e.currentTarget.checked);

  systemInput.addEventListener('change', updateValueTables);
  systemInput.addEventListener('change', createChatList);

  diceSelect.addEventListener     ('change', updateChat);
  rollStyleSelect.addEventListener('change', updateChat);

  sDiceInput.addEventListener  ('change', updateChat);
  sChoiceInput.addEventListener('change', updateChat);
});


// コマ設定
document.getElementById('unitSetting').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('section');

  modal.querySelector('h2').textContent = 'キャラコマ設定';

  body.style.setProperty('max-width', '22rem');

  const div1 = addElement(body, 'div', ['settingWrapper']);

  addElement(div1, 'span', [], 'ステータス');
  const secretToggleBtn = createToggleBtn(div1, settingDic.secretUnit, {notChecked:'公開', checked:'秘匿'});

  addElement(div1, 'span', [], '発言アイコン');
  const invisibleToggleBtn = createToggleBtn(div1, settingDic.invisibleUnit, {notChecked:'表示', checked:'非表示'});

  addElement(div1, 'span', [], 'コマ一覧');
  const hideToggleBtn = createToggleBtn(div1, settingDic.hideUnit, {notChecked:'表示', checked:'非表示'});

  
  addElement(body, 'hr');
  const div2 = addElement(body, 'div', ['settingWrapper']);

  addElement(div2, 'span', [], '発言カラー');
  const colorWrapper = addElement(div2, 'div', [], null, 
    [['style','display: grid;grid-template-columns: auto auto 1fr;gap: 0.5rem;align-items: center;']]);

  const colorEl = addElement(colorWrapper, 'input', [], null, [['type','color']]);
  colorEl.value = settingDic.color;
  const colorTextEl = addElement(colorWrapper, 'input', [], null, 
    [['type','text'],['placeholder','#888888'],['style','background-color: transparent;height: stretch;width: 7ch;']]);
  if (settingDic.color!='#888888') colorTextEl.value = settingDic.color;

  const name = nameEl.value.trim().split('\n')[0].trim();
  const namePreviewEl = addElement(colorWrapper, 'p', ['ccfoliaName'], name || '探索者名');
  namePreviewEl.style.setProperty('color', settingDic.color);

  addElement(div2, 'span', [], 'コマサイズ');
  const unitSizeWrapper = addElement(div2, 'div', [], null, [['style','display: flex;gap: 0.5rem;']]);
  const unitSizeEl = addElement(unitSizeWrapper, 'input', [], null, 
    [['type','range'], ['min',1],['max',30],['value',settingDic.unitSize],['style','flex-grow: 1']]);
  const unitSizeNumEl = addElement(unitSizeWrapper, 'input', [], null, 
    [['type','number'],['min',1],['value',settingDic.unitSize]]);

  addElement(div2, 'span', [], '差分<span style="font-size: smaller;"> (ラベル)</span>');
  const diffEl = addElement(div2, 'textarea');

  
  // --------------------------
  //       Event Listener
  // --------------------------

  secretToggleBtn.addEventListener   ('change', (e)=>settingDic.secretUnit    = e.currentTarget.checked);
  invisibleToggleBtn.addEventListener('change', (e)=>settingDic.invisibleUnit = e.currentTarget.checked);
  hideToggleBtn.addEventListener     ('change', (e)=>settingDic.hideUnit      = e.currentTarget.checked);

  // 発言色
  colorEl.addEventListener('input', (e) => {
    colorTextEl.value = e.currentTarget.value;
    namePreviewEl.style.color = e.currentTarget.value;
  });
  colorTextEl.addEventListener('input', (e) => {
    if (!/^#?[0-9a-fA-F]{6}$/.test(e.currentTarget.value)) return;
    colorEl.value = e.currentTarget.value.padStart(7, "#");
    namePreviewEl.style.color = e.currentTarget.value.padStart(7, "#");
  });
  colorEl.addEventListener('change', (e)=>settingDic.color = e.currentTarget.value);
  colorTextEl.addEventListener('change', (e) => {
    if (!/^#?[0-9a-fA-F]{6}$/.test(e.currentTarget.value)) return;
    settingDic.color = e.currentTarget.value.padStart(7, "#");
  });

  // コマサイズ
  unitSizeEl.addEventListener('input', (e) => {
    unitSizeNumEl.value = e.currentTarget.value;
    settingDic.unitSize = e.currentTarget.value;
  });
  unitSizeNumEl.addEventListener('input', (e) => {
    unitSizeEl.value = e.currentTarget.value;
    settingDic.unitSize = e.currentTarget.value;
  });
  
  // 差分
  diffEl.addEventListener('change', (e) => {
    settingDic.faces = e.currentTarget.value.split('\n').filter(Boolean).map(row=>(row.startsWith('@')?'':'@')+row);
    if(document.querySelector('[name=chatTarget] [value=diff]').checked) createChatList();
  });
});


// Import CCFOLIA unit Btn
document.getElementById('importUnit').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  const body = modal.querySelector('section');
  modal.querySelector('h2').textContent = 'ココフォリアコマをインポート';
  const textarea = addElement(body, 'textarea', [], null, [['style', 'width: 20rem;max-height: 20rem;']]);
  textarea.addEventListener('change', importUnit);
});


statsEl.addEventListener ('input',  updateValueTables);
statsEl.addEventListener ('change', createChatList);
skillsEl.addEventListener('input',  createSkillList);
skillsEl.addEventListener('change', createChatList);

// clear
document.getElementById('clear').addEventListener('click', clearTextarea);

// 消去する文字
document.getElementById('delChar').addEventListener('change', updateValueTables);
document.getElementById('delChar').addEventListener('change', createSkillList);
document.getElementById('delChar').addEventListener('change', createChatList);

// チャットターゲット
document.querySelectorAll('[name=chatTarget] input[type=checkbox]').forEach(input => input.addEventListener('change', createChatList));

// テーブル：✔切り替え
[...paramsTable.children].forEach(row => row.addEventListener('click', (e) => {
  toggleSecretCheckbox(e);
  const i = chatList.findIndex(el=>el.name.startsWith(e.currentTarget.children[1].innerText));
  if (i>-1)  batchMove(chatTable.children[i],'↓↓').checked = batchMove(e.currentTarget,'↓↓').checked;
}));

[...statsTable.children].forEach(row => row.addEventListener('click', (e) => {
  toggleSecretCheckbox(e);
  if (e.currentTarget.children[1].innerText=='SAN') {
    const i = chatList.findIndex(el=>String(el.value).startsWith('1d100<={SAN}'));
    if (i>-1)  batchMove(chatTable.children[i],'↓↓').checked = batchMove(e.currentTarget,'↓↓').checked;
  }
}));

// パラメータ・ステータス追加
document.querySelectorAll('button:has(>.icon-plus)').forEach(button => 
  button.addEventListener('click', (e)=> {
    const tbody = e.currentTarget.closest('table').querySelector('tbody');
    const row = addRow(tbody, 3, 1, true);
    row.draggable = true;
    dragEvent.forEach((value,key) => {
      if (typeof(value)=='function') row.addEventListener(key,value);
      else value.forEach(val=>row.addEventListener(key,val));
    });
  })
);
document.querySelectorAll('button:has(>.icon-minus)').forEach(button=>
  button.addEventListener('click', (e)=> {
    const target = e.currentTarget.closest('table').querySelector('tbody > :last-child');
    if (target.draggable) target.remove();
  })
);

// copy to Clipboard
document.getElementById('exUnit').addEventListener('click', exportUnit);
document.getElementById('exChat').addEventListener('click', (e)=>copy2clipboard(e.currentTarget, getChatpalette()));


// ----------------------------
//          メイン処理
// ----------------------------
/**
 * statsEL --> status table
 */
function updateValueTables () {
  console.log('❚ updateValueTables');

  // データ格納用のMap
  const props = new Map();

  // status欄のテキストを取得・整形
  const text = [
    [/　/g,' '], 
    [/\n/g,''], 
    [/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);}]
  ].reduce((acc,cur) => acc.replaceAll(cur[0],cur[1]), statsEl.value);
  

  // -------------------
  //   値の取得・格納
  // -------------------
  // 能力値・DB
  ['STR','CON','POW','DEX','APP','SIZ','INT','EDU'].forEach(key => {
    const value = text.match(new RegExp(`${key}\\W*(\\d+)`,'i'))?.[1] || null;
    props.set(key, value);
  });
  props.set('DB',  text.match(/(?:DB|ダメージ・?ボーナス)\W*([-D\d]+)/i)?.[1].toLowerCase() || null);
  if(!props.get('DB') && props.get('STR') && props.get('SIZ')) {
    const sum = (props.get('STR') + props.get('SIZ')) / (settingDic.is6th ? 1 : 5);
    if      (sum<=16)           props.set('DB', '-1d4');
    else if (sum>16 && sum<=24) props.set('DB', 0);
    else if (sum>24 && sum<=32) props.set('DB', '1d4');
    else if (sum>32 && sum<=40) props.set('DB', '1d6');
    else if (sum>40 && sum<=48) props.set('DB', '2d6');
  }

  // HP・MP・SAN
  let hp  = parseInt(text.match(/(?:HP|耐久力?)\D*(\d+)/i)?.[1]) || null;
  if (!hp && props.get('CON') && props.get('SIZ')) {
    const sum = props.get('CON')+props.get('SIZ');
    hp = settingDic.is6th ? Math.ceil(sum/2) : Math.floor(sum/10);
  }
  const mp  = parseInt(text.match(/(?:MP|マジック・?ポイント)\D*(\d+)/i)?.[1]) || props.get('POW')/(settingDic.is6th?1:5) || null;
  const san = parseInt(text.match(/(?:SAN値?|正気度)\D*(\d+)/i)?.[1])         || props.get('POW')*(settingDic.is6th?5:1) || null;

  // アイデア・幸運・知識
  const ide  = parseInt(text.match(/(?:ID[AE]|アイディ?ア)\D*(\d+)/i)?.[1]) || props.get('INT')*(settingDic.is6th?5:1) || null;
  const luck = parseInt(text.match(/(?:LUCK|幸運)\D*(\d+)/i)?.[1]) || (props.get('POW')&&settingDic.is6th ? props.get('POW')*5 : null);
  const know = parseInt(text.match(/(?:KNOW|知識)\D*(\d+)/i)?.[1]) || props.get('EDU')*(settingDic.is6th?5:1) || null;


  // -------------------
  //   テーブルへの反映
  // -------------------
  props.values().forEach((value,i) => paramsTable.children[i].lastElementChild.textContent = value);

  statsTable.children[0].lastElementChild.innerText = hp;
  statsTable.children[1].lastElementChild.innerText = mp;
  statsTable.children[2].lastElementChild.innerText = san;
  
  elseTable.children[0].lastElementChild.innerText = ide;
  elseTable.children[1].lastElementChild.innerText = luck;
  elseTable.children[2].lastElementChild.innerText = know;

  return;
}

/**
 * skillsEL --> skill list --> skill table
 */
function createSkillList () {
  console.log('❚ createSkillList');
  skillList.splice(0);
  // skillList = [];

  // -----------------------
  // skillsELの値を取得・整形
  // -----------------------
  const baseArr =  [
    [/　/g, ' '],
    [/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);}],
    [new RegExp(`[${document.getElementById('delChar').value}]`,'g'), ''],
    [/_/g, ' '],
  ]
  .reduce((acc,cur) => acc.replaceAll(cur[0],cur[1]), skillsEl.value)
  .split(/\n|%/)
  .filter(Boolean);
  
  // -----------------------
  //     skillList 作成
  // -----------------------
  // (?(?:{?DB}?|\d+D\d+|\d+|{.+?}))?
  const b = '\\(?(?:\\{?DB\\}?|\\d+D\\d+|\\d+|\\{.+?\\})\\)?';  // db,1d3,2,{...}
  const dicePattern = `${b}(?:[-+*/]${b})*`;

  baseArr.forEach(base => {
    const dic = {type:null, name:'', value:null, times:null, noname:false};
    // let dic, times;

    // 複数回ロール
    if (/^(?:x|rep|repeat)\d+/.test(base)) {
      times = parseInt(base.match(/^(?:x|rep|repeat)(\d+)/i)[1]);
      base = base.replace(/(?:x|rep|repeat)\d+ */i,'');
      dic.times = times;
    }
    
    // ---------------------
    
    // command
    if (/^@|^:|^\/(?:scene|save|load|pdf|var|play|roll-table|omikuji)/i.test(base)) {
      dic.type = 'line';
      dic.value = base;
      // dic = {type:'line', name:'', value:base};

    // choice
    } else if (base.indexOf('choice') > -1) {
      const choice = base.match(/choice\d*(?:\[.+\]|\(.+\)| .+)/i)?.[0];
      if (!choice) return;
      dic.type = 'choice';
      dic.name = base.replace(choice,'');
      dic.value = choice;
      // dic = {type:'choice', name:base.replace(choice,''), value:choice};

    } else if (base.indexOf('チョイス') > -1) {
      const arr = base.match(/チョイス(\d*) *(.+)/i);
      if (!arr) return;
      const [choice, cTimes, option] = arr.slice(0,3);
      const value = `choice${cTimes}[${option.split(/[,、， ]/).filter(Boolean).join(',')}]`;
      dic.type = 'choice';
      dic.name = base.replace(choice,'');
      dic.value = value;
      // dic = {type:'choice', name:base.replace(choice,''), value:value};

    // 組み合わせロール
    } else if (/CBR/i.test(base)) {
      const [value,value1,value2] = base.match(/CBRB?\D*(\d+)\D+(\d+)\)?/i).slice(0,3);
      dic.type = 'elseRoll';
      dic.name = base.replace(value,'');
      dic.value = `CBR(${value1},${value2})`;
      // dic = {type:'elseRoll', name:base.replace(value,''), value:`CBR(${value1},${value2})`};
      
    // 対抗ロール
    } else if (/RES/i.test(base)) {
      const [value,value1,value2] = base.match(/RESB?\D*(\d+)\D+(\d+)\)?/i).slice(0,3);
      dic.type='elseRoll';
      dic.name = base.replace(value,'');
      dic.value - `RES(${value1}-${value2})`;
      // dic = {type:'elseRoll', name:base.replace(value,''), value:`RES(${value1}-${value2})`};

    // CCB<=70 skill
    } else if (/(?:1d100|CCB?)<=/i.test(base)) {
      const arr = base.match(new RegExp(`<=(${dicePattern}) *(.*)`,'i'));
      dic.type = 'roll';
      dic.name = arr[2];
      dic.value = arr[1];
      // dic = {type:'roll', name:arr[2], value:arr[1]};
      
    // CCB skill @70
    } else if (/(?:1d100|CCB?).*@\d+$/i.test(base)) {
      const arr = base.match(/(?:1d100|CCB?) *(.*) *@(\d+)$/i);
      dic.type = 'roll';
      dic.name = arr[1];
      dic.value = arr[2];
      // dic = {type:'roll', name:arr[1], value:arr[2]};

    // 1d3
    } else if (/\dD\d/i.test(base)) {
      let value = base.match(new RegExp(dicePattern,'i'))[0];
      const name = base.replace(value,'');
      value = value.replace(/\/1$/i,'').replace(/\{?db\}?/gi,'{DB}');
      dic.type = 'dice';
      dic.name = name;
      dic.value = value;
      // dic = {type:'dice', name:name, value:value};

    // skill 70
    } else {
      const arr = base.match(new RegExp(`(.*?)(${dicePattern})\\D*$`,'i'));
      if (!arr) {
        console.log(`Not add to chat-palette : ${base}`);
        return;
      }
      dic.type = 'roll';
      dic.name = arr[1];
      dic.value = arr[2];
      // dic = {type:'roll', name:arr[1], value:arr[2]};
    }

    // if(times)  dic.times = times;
    dic.name = dic.name.replace(/[()]/g, function(s){return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);}).trim();
    skillList.push(dic);
  });

  // -----------------------
  //    skillTableの更新
  // -----------------------
  skillTable.innerHTML='';
  if (!skillList.length) {
    for (let i=0; i<6; i++) {
      const row = addRow(skillTable, 2, 0);
      row.style.height = '1.5rem';
    }
    return;
  }
  skillList.forEach(dic => {
    const row = addRow(skillTable, 2, 0);
    row.children[0].innerText = (dic.times ? `x${dic.times} ` : '') + dic.name;
    row.children[1].innerText = dic.value;

    // 技能名をクリックでチャット欄の技能名表示を切り替える
    // skillListとchatListで参照しているdicが同じなため、skillListだけ切り替えればOK
    row.children[0].addEventListener('click', (e) => {
      const i = e.currentTarget.parentElement.sectionRowIndex;
      if (e.currentTarget.style.color) {
        e.currentTarget.style.color = null;
        e.currentTarget.style.textDecoration = null;
        skillList[i].noname = false;
      } else {
        e.currentTarget.style.color = 'rgb(0 0 0 /0.33)';
        e.currentTarget.style.textDecoration = 'line-through';
        skillList[i].noname = true;
      }
      updateChat();
    });
  });

  return;
}

/**
 * status table, skill list --> chat list --> chat table
 */
function createChatList() {
  chatList.splice(0);
  // chatList = [];
  
  // -----------------------
  //     chatList 作成
  // -----------------------
  const chatTargets = Array.from(document.querySelectorAll('[name=chatTarget] input:checked'), el=>el.value);
  chatTargets.forEach(chatTarget => {
    switch (chatTarget) {
      // 差分
      case 'diff':
        if (settingDic.faces.length==0)  break;
        settingDic.faces.forEach(face => chatList.push({type:'line', name:'', value:face}));
        chatList.push({type:'line', name:'', value:'==========='});
        break;
        
      // 正気度ロール
      case 'sanc':
        if(!statsTable.children[2].lastElementChild.innerText)  break;
        chatList.push({type:'elseRoll', name:'正気度ロール', value:'1d100<={SAN}'});
        break;

      // アイデア・幸運・知識
      case 'ide':
        [...elseTable.children].forEach(row => {
          const value = row.lastElementChild.innerText;
          if(value) chatList.push({type:'roll', name:row.firstElementChild.innerText, value:value});
        })
        if (settingDic.is6th) break;
        const i = chatList.findIndex(e => e.name=='幸運');
        if (i>-1)  chatList[i].value='{幸運}';
        break;

      // 技能・判定
      case 'skill':
        chatList.push(...skillList);
        break;

      // 倍数ロール
      case 'stats':
        if ([...paramsTable.children].slice(0,8).filter(e => e.lastElementChild.innerText).length>0)
          chatList.push({type:'line', name:'', value:'==========='});
        
        [...paramsTable.children].slice(0,8).forEach(row => {
          const value = row.lastElementChild.innerText;
          if (value) {
            const key = row.children[1].innerText;
            const end = settingDic.is6th?'*5':'';
            chatList.push({type:'roll', name:`${key}${end}`, value:`{${key}}${end}`});
          }
        });
        break;
    }
  })
  console.log('❚ createChatList\n', chatList);

  // -----------------------
  //     chatTableに反映
  // -----------------------
  chatTable.innerHTML = '';
  if (!chatList.length) {
    for (let i=0; i<17; i++) {
      const row = addRow(chatTable,3);
      row.style.height = '1.5rem';
    }
  }
  for (let i=0; i<chatList.length; i++) {
    const row = addRow(chatTable, 3, -1);
    row.draggable = true;
    new Map([
      ['dragstart',dragStart2], ['dragenter',switchRowDic], ['dragover',dragOver], ['dragend',dragEnd2]
    ])
      .forEach((value,key) => row.addEventListener(key,value));
    
    const cell1 = row.children[0];
    const cell2 = row.children[1];
    const cell3 = row.children[2];
  
    const rCheck = document.createElement('input');
    const sCheck = document.createElement('input');
    rCheck.type = 'checkbox';
    sCheck.type = 'checkbox';
    cell1.appendChild(rCheck);
    cell2.appendChild(sCheck);
  
    cell2.addEventListener('click', () => {
      const text = cell3.innerText;
      cell3.innerText = text.charAt(0)=='s' ? text.substring(1,) : `s${text}`;
    });
    cell3.addEventListener('click',toggleSecretCheckbox);
  };

  updateChat();
  return;
}

/**
 * chat list --> chat table
 */
function updateChat() {
  console.log('❚ updateChat');
  
  chatList.forEach((dic,i) => {
    const name = !dic.noname && dic.name ? ` 【${dic.name}】` : '';
    const times = dic.times ? `x${dic.times} ` : '';
    const secret = chatTable.children[i].children[1].firstElementChild.checked;
    const cell3  = chatTable.children[i].lastElementChild;

    if (settingDic.rollStyle=='@' && /STR|CON|POW|DEX|APP|SIZ|INT|EDU/.test(dic.value)) {
      const key = dic.value.match(/\{(.*)\}/)[1];
      const val = parseInt([...paramsTable.children].filter(e => e.children[1].innerText==key)[0].lastElementChild.innerText);
      cell3.innerText = `${times}${secret ? 's' : ''}${settingDic.dice}${name} @${val*(settingDic.is6th?5:1)}`;
      return;
    }
  
    if (settingDic.rollStyle=='@' && dic.name=='幸運' && !settingDic.is6th) {
      const luck = elseTable.children[1].lastElementChild.innerText;
      cell3.innerText = `${times}${secret ? 's' : ''}${settingDic.dice}${name} @${luck}`;
      return;
    }
  
    const func = (dic) => {
      switch (dic.type) {
        case 'line':
          return times + dic.value;
        case 'dice':
          return times + (xor(secret, settingDic.secretSingleDice) ? 's' : '') + dic.value + name;
        case 'choice':
          return times + (xor(secret, settingDic.secretChoice) ? 's' : '') + dic.value + name;
        case 'elseRoll':
          if      (settingDic.dice=='CC')  dic.value = dic.value.replace(/(CBR|RES)B/i,'$1');
          else if (settingDic.dice=='CCB') dic.value = dic.value.replace(/(CBR|RES)([^B])/i,'$1B$2');
          return times + (xor(settingDic.rollStyle=='s',secret) ? 's' : '') + dic.value + name;
        case 'roll':
          if (settingDic.rollStyle=='@') return `${times}${secret ? 's' : ''}${settingDic.dice}${name} @${dic.value}`;
          else return `${times}${xor(settingDic.rollStyle=='s',secret) ? 's' : ''}${settingDic.dice}<=${dic.value}${name}`;
      }
    };
    cell3.textContent = func(dic);
  });
  return;
}

let importedUnit;
async function importUnit (e) {
  console.log('❚ importUnit');
  if (!e.currentTarget.value)  return;
  const unit = JSON.parse(e.currentTarget.value);
  if (unit.kind!='character')  return;
  
  // initialize
  [...paramsTable.children].forEach(row => {
    if (row.draggable) row.remove();
    else row.querySelector(':first-child > input[type=checkbox]').checked = false;
  });
  [...statsTable.children].forEach(row => {
    if (row.draggable) row.remove();
    else row.querySelector(':first-child > input[type=checkbox]').checked = false;
  });
  

  importedUnit = unit.data;
  console.log('imported unit : \n', importedUnit);

  // unit setting
  const json = await fetch('./setting.json').then(res=>res.json());
  settingDic.color    = unit.data.color.toLowerCase() || json.setting.color;
  settingDic.unitSize = unit.data.width || json.setting.unitSize;
  settingDic.faces    = unit.data.faces.map(e => e.label).filter(Boolean) || json.setting.faces;

  settingDic.secretUnit    = unit.data.secret     || json.setting.secretUnit;
  settingDic.invisibleUnit = unit.data.invisible  || json.setting.invisibleUnit;
  settingDic.hideUnit      = unit.data.hideStatus || json.setting.hideUnit;

  // name & memo
  nameEl.value = `${unit.data.name}\n${unit.data.memo}`.trim();

  // params, status
  statsEl.value = '';
  if (unit.data.params) {
    statsEl.value += unit.data.params.map(e => `${e.label}  ${e.value}`).join('\t')+'\n';

    const defParams = new Set(['STR','CON','POW','DEX','APP','SIZ','INT','EDU','DB']);
    const extraParams = unit.data.params.filter(e => !defParams.has(e.label));
    extraParams.forEach(param => {
      const row = addRow(paramsTable, 3, 1, true);
      row.draggable = true;
      dragEvent.forEach((value,key) => {
        if (typeof(value)=='function') row.addEventListener(key,value);
        else value.forEach(val=>row.addEventListener(key,val));
      });
      row.children[1].textContent = param.label;
      row.children[2].textContent = param.value;
    });
  }
  if (unit.data.status) {
    statsEl.value += unit.data.status.map(e => `${e.label}  ${e.max||e.value}`).join('\t');
    const defStats = new Set(['HP','MP','SAN','幸運']);
    const extraStats = unit.data.status.filter(e => !defStats.has(e.label));
    extraStats.forEach(stat => {
      const row = addRow(statsTable, 3, 1, true);
      row.draggable = true;
      dragEvent.forEach((value,key) => {
        if (typeof(value)=='function') row.addEventListener(key,value);
        else value.forEach(val=>row.addEventListener(key,val));
      });
      row.children[1].innerText = stat.label;
      row.children[2].innerText = stat.value;
      if (stat.max) row.children[2].innerText += '/' + stat.max;
    });
  }
  
  // commands
  {
    const arr = [];
    let matchArr = unit.data.commands.match(/(\d+).*アイディ?ア|アイディ?ア.*@(\d+)/);
    if(matchArr) arr.push(`アイデア  ${matchArr[1]||matchArr[2]}`);

    matchArr = unit.data.commands.match(/(\d+).*幸運|幸運.*@(\d+)/);
    if(matchArr) arr.push(`幸運  ${matchArr[1]||matchArr[2]}`);
    
    matchArr = unit.data.commands.match(/(\d+).*知識|知識.*@(\d+)/);
    if(matchArr) arr.push(`知識  ${matchArr[1]||matchArr[2]}`);

    statsEl.value += (arr.length ? '\n' : '') + arr.join('\t');
  }

  skillsEl.value = [
    [/^.*<=\{.*\}.*$/mg, ''], 
    [/^.*(?:アイディ?ア|幸運|知識).*$/mg, ''], 
    [' ', '_']
  ]
  .reduce((acc,cur) => acc.replaceAll(cur[0],cur[1]), unit.data.commands)
  .trim();

  updateValueTables();
  createSkillList();
  createChatList();
}


function clearTextarea () {
  importedUnit = null;
  nameEl.value   = '';
  statsEl.value  = '';
  skillsEl.value = '';
  updateValueTables();
  createSkillList();
  createChatList();
}



// ----------------------------
//             関数
// ----------------------------

// EventListener
function toggleSecretCheckbox (e)  {
  const input = batchMove(e.target,'↑↓↓');
  input.checked = !input.checked;
}

let dragIndex = null;
function dragStart2 (e) {
  dragIndex = e.currentTarget.sectionRowIndex;
  e.currentTarget.classList.add('dragging');
}
function dragEnd2 (e) {
  dragIndex = null;
  e.currentTarget.classList.remove('dragging');
}

function switchRow (e) {
  if (e.currentTarget.sectionRowIndex===dragIndex) return;
  const index = e.currentTarget.sectionRowIndex;
  const parent = e.currentTarget.parentElement;
  const deleteElement = parent.children[dragIndex];

  deleteElement.remove();

  const target = parent.children[index];
  if (target) target.before(deleteElement);
  else parent.appendChild(deleteElement);

  dragIndex = index;
}

function switchRowDic (e) {
  if (e.currentTarget.sectionRowIndex===dragIndex) return;
  const index = e.currentTarget.sectionRowIndex;
  const parent = e.currentTarget.parentElement;
  
  const deleteElement = parent.children[dragIndex];
  deleteElement.remove();
  const deleteDic = chatList.splice(dragIndex, 1);

  const target = parent.children[index];
  if (target) target.before(deleteElement);
  else parent.appendChild(deleteElement);

  chatList.splice(index, 0, ...deleteDic);

  dragIndex = index;
}

function dragOver  (e) {e.preventDefault()};



// else
function getChatpalette() {
  return [...chatTable.children]
    .filter(row => !row.querySelector('& > :first-child > input:checked'))
    .map(row => row.lastElementChild.textContent)
    .join('\n').trim();
}

function exportUnit(event) {
  const unit = { 
    kind: 'character',
    data: {
      name: nameEl.value.trim().split('\n')[0].trim(),
      initiative: parseInt(paramsTable.children[3].lastElementChild.innerText) || 0,
      width: parseInt(settingDic.unitSize),
      color: settingDic.color,
      memo:  nameEl.value.replace(/.+\n/,'').trim(),
      commands: getChatpalette(),
      params: [],
      status: [],
      faces:  [],
      secret:     settingDic.secretUnit,
      invisible:  settingDic.invisibleUnit,
      hideStatus: settingDic.hideUnit
    }
  };
  
  // params
  [...paramsTable.children].forEach((row,i) => {
    if (row.querySelector('& > :first-child > input[type=checkbox]')?.checked) return;
    if (i < 9) {
      const val = row.lastElementChild.textContent;
      if (val) unit.data.params.push({label:row.children[1].textContent, value:val});
    } else {
      if (!row.textContent) return;
      unit.data.params.push({label: row.children[1].textContent, value: row.lastElementChild.textContent});
    }
  });

  // stats
  [...statsTable.children].forEach((row,i) => {
    if (row.querySelector('& > :first-child > input[type=checkbox]')?.checked) return;
    if (i < 3) {
      const val = parseInt(row.lastElementChild.textContent);
      if (val) unit.data.status.push({label:row.children[1].innerText, value:val, max:val});
    } else {
      if (!row.textContent) return;
      const label = row.children[1].textContent;
      const key = row.lastElementChild.textContent.split('/');
      if (key.length==1) unit.data.status.push({label:label, value:parseInt(key[0])});
      else               unit.data.status.push({label:label, value:parseInt(key[0]), max:parseInt(key[1])});
    }
  });
  if (!settingDic.is6th) {
    const luck = parseInt(elseTable.children[1].lastElementChild.innerText);
    if (luck) unit.data.status.push({label:'幸運', value:luck, max:luck});
  }


  if (settingDic.faces.length) settingDic.faces.forEach(row => unit.data.faces.push({iconUrl:null, label:row}));
  if (importedUnit?.externalUrl) unit.data.externalUrl = importedUnit.externalUrl;
  if (importedUnit?.iconUrl) unit.data.iconUrl = importedUnit.iconUrl;
  if (importedUnit?.faces) {
    importedUnit.faces.forEach(face => {
      const i = unit.data.faces.findIndex(e => e.label===face.label);
      if(i>-1) unit.data.faces[i].iconUrl = face.iconUrl;
    });
  }
  console.log(unit);
  copy2clipboard(event.currentTarget, JSON.stringify(unit));
  return unit;
}

function copy2clipboard(element, text) {
  const defText = element.innerText;
	navigator.clipboard.writeText(text);
	element.innerText = 'Copied!';
	setTimeout(() => element.innerText=defText, 1000);
}

function addElement (parent, tag, classList=[], innerHtml=null, attributes=[]) {
  const element = document.createElement(tag);
  if (classList.length) element.classList.add(...classList);
  if (innerHtml) element.innerHTML = innerHtml;
  if (attributes) attributes.forEach(attribute => element.setAttribute(attribute[0], attribute[1]));
  
  parent.appendChild(element);
  return element;
};

function createToggleBtn (parent, checked=false, text=null, id=null) {
  const label = addElement(parent, 'label', ['toggle-button']);
  const input = addElement(label, 'input', [], null, [['type','checkbox']]);
  input.checked = checked || false;
  if (id) input.id = id;
  addElement(label, 'span', ['slider']);
  if (typeof(text)==='string') label.appendChild(document.createTextNode(text));
  else if (typeof(text)==='object') {
    addElement(label, 'span', ['checked'], text.checked);
    addElement(label, 'span', ['not-checked'], text.notChecked);
  }
  return input;
};

/**
 * 指定のテーブルに行を追加する関数
 * @param {HTMLTableSectionElement} parent 行を追加するエレメント(theader or tbody)
 * @param {Array || Int} content 追加する内容(forEach持ち) or 列数
 * @param {Number} thCol ヘッダーにする列の列数 デフォルトは-1(ヘッダーセルを作らない)
 * @param {Boolean} editable デフォルトfalse
\ * @returns {HTMLTableRowElement} 追加した行エレメント
 */
function addRow(parent, content, thCol=-1, editable=false) {
  if (!parent || !content) return;
  const row = document.createElement('tr');

  if (Number.isInteger(content)) content = Array(content).fill(null);
  content.forEach((value,i) => {
    const cell = document.createElement(i==thCol ? 'th' : 'td');
    cell.innerHTML = value ?? null;  // nullとundefinedだけ空にする
    if (editable)  cell.contentEditable = 'plaintext-only';
    row.appendChild(cell);
  });

  parent.appendChild(row);
  return row;
}
