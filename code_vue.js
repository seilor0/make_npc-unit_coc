const { createApp, ref, computed, watch, onMounted } = Vue;


const rootApp = createApp({
  setup() {
    let id = 0;

    const is6th = ref(true);

    const settingDic = ref({});

    const chatTargets = ref([
      { id: id++, name: '差分', value: true },
      { id: id++, name: 'SANc', value: false },
      { id: id++, name: '知識etc.', value: true },
      { id: id++, name: '技能', value: true },
      { id: id++, name: 'ステ*5', value: true },
    ]);

    const defStats = ref({
      params: new Map([
        ['STR', { id: id++, value: null, del: false }],
        ['CON', { id: id++, value: null, del: false }],
        ['POW', { id: id++, value: null, del: false }],
        ['DEX', { id: id++, value: null, del: false }],
        ['APP', { id: id++, value: null, del: false }],
        ['SIZ', { id: id++, value: null, del: false }],
        ['INT', { id: id++, value: null, del: false }],
        ['EDU', { id: id++, value: null, del: false }],
        ['DB',  { id: id++, value: null, del: false }],
      ]),
      stats: new Map([
        ['HP',  { id: id++, value: null, del: false }],
        ['MP',  { id: id++, value: null, del: false }],
        ['SAN', { id: id++, value: null, del: false }],
      ]),
      else: new Map([
        ['アイデア', { id: id++, value: null }],
        ['幸運', { id: id++, value: null }],
        ['知識', { id: id++, value: null }],
      ]),
    });

    const exStats = ref({ params: [], stats: [] });
    function addRow(key)    { exStats.value[key].push({ id: id++, title: null, value: null }); }
    function deleteRow(key) { exStats.value[key].pop(); }


    /**
     * 技能テーブル用の情報を格納しておくリスト
     * { id, type, name, value, times, noname }
     * @type {Array}
     * @type 判定の種類\n
     *  - choice : チョイス
     *  - roll : 通常の判定
     *  - dice : 1d3など、振るダイスが直接記述されているもの
     *  - elseRoll : 対抗ロール・正気度ロールなど、判定だが振るダイスが直接記述されているもの
     *  - line : :HP+1, /scene, \@face など、そのままチャットに送るもの
     * @name 技能名
     * @value 技能値・判定部分のテキスト
     * @times **繰り返す回数
     * @noname **技能名をチャパレに表示しない設定
    */
    const skillList = ref([]);
    /**
     * {secret, del, text, times}
     */
    const refChatList = ref([]);
    
    const chatList = computed(() => {
      // まずはdic形式で情報を集める
      /**
       * チャパレ用の情報を格納しておくリスト
       * { id, type, name?, value, times?, noname? }
       * @type {Array}
       * @type 判定の種類\n
       *  - choice : チョイス
       *  - roll : 通常の判定
       *  - dice : 1d3など、振るダイスが直接記述されているもの
       *  - elseRoll : 対抗ロール・正気度ロールなど、判定だが振るダイスが直接記述されているもの
       *  - line : セパレータ, :HP+1, /scene, \@face など、そのままチャットに送るもの
       * @name 技能名
       * @value 技能値・判定部分のテキスト
       * @times **繰り返す回数
       * @noname **技能名をチャパレに表示しない設定
       */
      const rawDicArr = [];
      chatTargets.value
        .filter(dic => dic.value)
        .map(dic => dic.name)
        .forEach(chatTarget => {

          // 差分
          if (chatTarget == '差分') {
            if (!settingDic.value.faces?.length) return;
            settingDic.value.faces.forEach(face => rawDicArr.push({ id: id++, type: 'line', value: face }));
            rawDicArr.push({ id: id++, type: 'line', value: '===========' });


          // 正気度ロール
          } else if (chatTarget == 'SANc') {
            if (!defStats.value.stats.get('SAN').value) return;
            rawDicArr.push({ id: id++, type: 'elseRoll', name: '正気度ロール', value: '1d100<={SAN}' });


          // アイデア・幸運・知識
          } else if (chatTarget == '知識etc.') {
            defStats.value.else.forEach((dic, key) => {
              if (!dic.value) return;
              if (key=='幸運' && !is6th.value && settingDic.value.rollStyle!='@') rawDicArr.push({ type: 'roll', name: '幸運', value: '{幸運}' });
              else rawDicArr.push({ id: id++, type: 'roll', name: key, value: dic.value });
            });

          // 技能・判定
          } else if (chatTarget == '技能') {
            rawDicArr.push(...skillList.value);


          // 倍数ロール
          } else if (chatTarget == 'ステ*5') {
            if (defStats.value.params.entries().find(row => row[1].value && !row[1].del && row[0]!='DB'))
              rawDicArr.push({ id: id++, type: 'line', value: '===========' });
            
            defStats.value.params.forEach((dic, key) => {
              if (key=='DB') return;
              if (!dic.value || dic.del) return;
              const end = is6th.value ? '*5' : '';
              const value = settingDic.value.rollStyle=='@' ? dic.value * (is6th.value?5:1) : `{${key}}${end}`;
              rawDicArr.push({id: id++, type: 'roll', name: `${key}${end}`, value: value});
            });
          }
        });

      // 集めた情報をチャパレ形式に変換
      /**
       * {secret, del, text, times}
       */
      const chatDicArr = rawDicArr.map(dic => {
        const result = {del:false, secret:false, text:'', times:''};
        
        if (
          dic.type==='dice'     && settingDic.value.secretSingleDice     ||
          dic.type==='choice'   && settingDic.value.secretChoice         ||
          dic.type==='roll'     && settingDic.value.rollStyle==='secret' ||
          dic.type==='elseRoll' && settingDic.value.rollStyle==='secret'
        ) result.secret = true;

        const dic2text = (dic) => {
          const name = dic.name && !dic.noname ? ` 【${dic.name}】` : '';
          switch (dic.type) {
            case 'line':
              return dic.value;
            case 'dice':
              return `${dic.value}${name}`;
            case 'choice':
              return `${dic.value}${name}`;
            case 'elseRoll':
              if      (settingDic.value.dice=='CC')  dic.value = dic.value.replace(/(CBR|RES)B/i,'$1');
              else if (settingDic.value.dice=='CCB') dic.value = dic.value.replace(/(CBR|RES)([^B])/i,'$1B$2');
              return `${dic.value}${name}`;
            case 'roll':
              if (settingDic.value.rollStyle=='@') return `${settingDic.value.dice}${name} @${dic.value}`;
              else return `${settingDic.value.dice}<=${dic.value}${name}`;
          }
        };
        result.text = dic2text(dic);
        result.times = dic.times ? `x${dic.times} ` : '';

        return result;
      });

      return chatDicArr;
    });
    watch(chatList, () => refChatList.value = chatList.value);


    const fillBlank_skill = computed(() => {
      const max = 6 - skillList.value.length;
      if (max < 1) return [];
      else return Array(max).fill(0);
    });

    const fillBlank_chat = computed(() => {
      const max = 17 - chatList.value.length;
      if (max < 1) return [];
      else return Array(max).fill(0);
    });


    function updateDefStats () {
      // status欄のテキストを取得・整形
      const text = [
        [/　/g, ' '],
        [/\n/g, ''],
        [/[！-｝]/g, function (s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); }]
      ].reduce((acc, cur) => acc.replaceAll(cur[0], cur[1]), document.getElementById('stats').value);

      // 能力値
      ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU'].forEach(key => {
        const value = parseInt(text.match(new RegExp(`${key}\\W*(\\d+)`, 'i'))?.[1]) || null;
        defStats.value.params.get(key).value = value;
      });

      // DB
      let db = text.match(/(?:DB|ダメージ・?ボーナス)\W*([-D\d]+)/i)?.[1].toLowerCase() || null;
      if (
        !db &&
        defStats.value.params.get('STR').value &&
        defStats.value.params.get('SIZ').value
      ) {
        const sum = (
          defStats.value.params.get('STR').value +
          defStats.value.params.get('SIZ').value
        ) / (is6th.value ? 1 : 5);

        if (sum <= 16) db = '-1d4';
        else if (sum > 16 && sum <= 24) db = 0;
        else if (sum > 24 && sum <= 32) db = '1d4';
        else if (sum > 32 && sum <= 40) db = '1d6';
        else if (sum > 40 && sum <= 48) db = '2d6';
      }
      defStats.value.params.get('DB').value = db;


      // HP・MP・SAN
      let hp = parseInt(text.match(/(?:HP|耐久力?)\D*(\d+)/i)?.[1]) || null;
      if (
        !hp &&
        defStats.value.params.get('CON').value &&
        defStats.value.params.get('SIZ').value
      ) {
        const sum = defStats.value.params.get('CON').value + defStats.value.params.get('SIZ').value;
        hp = is6th.value ? Math.ceil(sum / 2) : Math.floor(sum / 10);
      }

      const mp = parseInt(text.match(/(?:MP|マジック・?ポイント)\D*(\d+)/i)?.[1]) ||
        defStats.value.params.get('POW').value / (is6th.value ? 1 : 5) || null;

      const san = parseInt(text.match(/(?:SAN値?|正気度)\D*(\d+)/i)?.[1]) ||
        defStats.value.params.get('POW').value * (is6th.value ? 5 : 1) || null;


      // アイデア・幸運・知識
      const idea = parseInt(text.match(/(?:ID[AE]|アイディ?ア)\D*(\d+)/i)?.[1]) ||
        defStats.value.params.get('INT').value * (is6th.value ? 5 : 1) || null;

      const luck = parseInt(text.match(/(?:LUCK|幸運)\D*(\d+)/i)?.[1]) ||
        (is6th.value ? defStats.value.params.get('POW').value * 5 : null) || null;

      const know = parseInt(text.match(/(?:KNOW|知識)\D*(\d+)/i)?.[1]) ||
        defStats.value.params.get('EDU').value * (is6th.value ? 5 : 1) || null;

      defStats.value.stats.get('HP').value = hp;
      defStats.value.stats.get('MP').value = mp;
      defStats.value.stats.get('SAN').value = san;

      defStats.value.else.get('アイデア').value = idea;
      defStats.value.else.get('幸運').value = luck;
      defStats.value.else.get('知識').value = know;
    }

    function updateSkillList () {
      skillList.value.splice(0);

      const baseArr = [
        [/　/g, ' '],
        [/[！-｝]/g, function (s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); }],
        [new RegExp(`[${settingDic.value.delChar}]`, 'g'), ''],
        [/_/g, ' '],
      ]
        .reduce((acc, cur) => acc.replaceAll(cur[0], cur[1]), document.getElementById('skills').value)
        .split(/\n|%/)
        .filter(Boolean);

      // (?{?DB}?|\d+D\d+|\d+|{.+?})?
      const b = '\\(?(?:\\{?DB\\}?|\\d+D\\d+|\\d+|\\{.+?\\})\\)?';  // db,1d3,2,{...}
      const dicePattern = `${b}(?:[-+*/]${b})*`;

      baseArr.forEach(base => {
        const dic = { id: id++, type: null, name: '', value: null, times: null, noname: false };

        // 複数回ロール
        if (/^(?:x|rep|repeat)\d+/i.test(base)) {
          dic.times = parseInt(base.match(/^(?:x|rep|repeat)(\d+)/i)[1]);
          base = base.replace(/(?:x|rep|repeat)\d+ */i, '');
        }

        // ---------------------

        // command
        if (/^@|^:|^\/(?:scene|save|load|pdf|var|play|roll-table|omikuji)/i.test(base)) {
          dic.type = 'line';
          dic.value = base;

          // choice
        } else if (base.indexOf('choice') > -1) {
          const choice = base.match(/choice\d*(?:\[.+\]|\(.+\)| .+)/i)?.[0];
          if (!choice) return;
          dic.type = 'choice';
          dic.name = base.replace(choice, '');
          dic.value = choice;

        } else if (base.indexOf('チョイス') > -1) {
          const arr = base.match(/チョイス(\d*) *(.+)/i);
          if (!arr) return;
          const [choice, cTimes, option] = arr.slice(0, 3);
          const value = `choice${cTimes}[${option.split(/[,、， ]/).filter(Boolean).join(',')}]`;
          dic.type = 'choice';
          dic.name = base.replace(choice, '').trim();
          dic.value = value;

          // 組み合わせロール
        } else if (/CBR/i.test(base)) {
          const [value, value1, value2] = base.match(/CBRB?\D*(\d+)\D+(\d+)\)?/i).slice(0, 3);
          dic.type = 'elseRoll';
          dic.name = base.replace(value, '');
          dic.value = `CBR(${value1},${value2})`;

          // 対抗ロール
        } else if (/RES/i.test(base)) {
          const [value, value1, value2] = base.match(/RESB?\D*(\d+)\D+(\d+)\)?/i).slice(0, 3);
          dic.type = 'elseRoll';
          dic.name = base.replace(value, '');
          dic.value - `RES(${value1}-${value2})`;

          // CCB<=70 skill
        } else if (/(?:1d100|CCB?)<=/i.test(base)) {
          const arr = base.match(new RegExp(`<=(${dicePattern}) *(.*)`, 'i'));
          dic.type = 'roll';
          dic.name = arr[2];
          dic.value = arr[1];

          // CCB skill @70
        } else if (/(?:1d100|CCB?).*@\d+$/i.test(base)) {
          const arr = base.match(/(?:1d100|CCB?) *(.*) *@(\d+)$/i);
          dic.type = 'roll';
          dic.name = arr[1];
          dic.value = arr[2];

          // 1d3
        } else if (/\dD\d/i.test(base)) {
          let value = base.match(new RegExp(dicePattern, 'i'))[0];
          const name = base.replace(value, '');
          value = value.replace(/\/1$/i, '').replace(/\{?db\}?/gi, '{DB}');
          dic.type = 'dice';
          dic.name = name;
          dic.value = value;

          // skill 70
        } else {
          const arr = base.match(new RegExp(`(.*?)(${dicePattern})\\D*$`, 'i'));
          if (!arr) {
            console.log(`Not add to chat-palette : ${base}`);
            return;
          }
          dic.type = 'roll';
          dic.name = arr[1];
          dic.value = arr[2];
        }

        dic.name = [['(', '（'], [')', '）']].reduce((acc, cur) => acc.replaceAll(cur[0], cur[1]), dic.name);
        skillList.value.push(dic);
      });
    }


    // -----------------
    //    to switch
    // -----------------
    const dragIndex = ref(null);
    const dragTarget = ref(null)
    const dragStart = (index, target) => { 
      dragIndex.value = index; 
      dragTarget.value = target;
    };
    const dragEnter = (index, target) => {
      if (target !== dragTarget.value) return;
      if (index === dragIndex) return;
      const deleteElement = dragTarget.value.splice(dragIndex.value, 1)[0];
      dragTarget.value.splice(index, 0, deleteElement);
      dragIndex.value = index;
    };
    const dragEnd = () => { 
      dragIndex.value = null; 
      dragTarget.value = null;
    };


    // -----------------
    //     to test
    // -----------------
    function toTest () {
      document.getElementById('stats').value = 
`STR 8 ... EDU 15
HP 12  MP 30  SAN 10  DB +1D4
アイデア 75  幸運 60  知識 75`;

      document.getElementById('skills').value = 
`・目星70% 聞き耳40% 図書館25%
・CCB<=50 こぶし（パンチ）
・1d4+db/2
・キック　50% / 1d6+db / 1R1回
・@happy`;

      updateDefStats();
      updateSkillList();
    }


    onMounted(async () => {
      const json = await fetch('./setting.json').then(res => res.json());

      settingDic.value = json.setting;

      document.getElementById('name').placeholder = json.placeholder.name.join('\n');
      document.getElementById('stats').placeholder = json.placeholder.stats.join('\n');
      document.getElementById('skills').placeholder = json.placeholder.skills.join('\n');

      document.querySelector('footer table tbody').innerHTML = json.changeLog
        .reduce((acc, cur) => acc += `<tr><td>${cur.date}</td><td>${cur.version}</td><td>${cur.detail}</td></tr>`, '');
    });


    return {
      is6th,
      settingDic,
      chatTargets,

      defStats,
      exStats,

      skillList,
      refChatList,

      fillBlank_skill,
      fillBlank_chat,

      addRow,
      deleteRow,

      updateDefStats,
      updateSkillList,

      dragIndex,
      dragTarget,
      dragStart,
      dragEnter,
      dragEnd,

      toTest,
    }
  }
});
rootApp.mount('#root');
