/* game-data.js
   Direct port of story_events.py + npcs.py — every id, title, situation,
   option text/reply/conquest/type/chance value is transcribed as-is from
   the Python source (/Users/vikomac/Course/python/), not rewritten or
   simplified. See game.js for the state machine that consumes this data,
   which mirrors main.py's logic 1:1 (including how "type"/"chance" default
   when absent, and the random.shuffle/random.sample/list.pop() mechanics).

   Bilingual fields: every translatable string is {en, zh}. The zh text is
   extracted verbatim from the "# ..." Chinese comments already present in
   story_events.py / npcs.py (the source's own official translation) —
   nothing here was re-translated where a comment already existed. Where
   npcs.py gave only ONE trailing comment per option (covering "text" or
   "reply" loosely, sometimes both at once) rather than one per field, that
   comment was assigned to whichever field it actually describes, and the
   other field was translated fresh to match the same terse, dramatic tone.
   END_DAY_QUOTES and all system/UI text (in game.js) have no source
   comment at all — those are original translations in matching voice.
*/

const STORY_DATA = [
  {
    id: "STORY_01",
    title: { en: "The Glass Shards and the Shadow-Eater", zh: "碎玻璃与食影者" },
    content: {
      en: "The King has smashed every mirror in the palace, claiming his reflection was a spy. He orders you to 'interrogate' the jagged silver shards on the floor to find the traitor.",
      zh: "国王打碎了宫廷里所有的镜子，声称他的倒影是间谍。他命令你“审问”地板上锯齿状的银色碎片以找出叛徒。"
    },
    options: {
      A: {
        text: { en: "Press your bare palms onto the glass to 'listen' to the shadows.", zh: "将赤裸的掌心按在玻璃上以“倾听”阴影。" },
        reply: { en: "Blood stains the silver. The King is delighted by your sacrifice. You find a map of the barracks hidden in the reflection.", zh: "鲜血染红了银片。国王为你表现出的牺牲感到愉悦。你在倒影中发现了一张隐藏的兵营地图。" },
        conquest: 15, type: "army_chance", chance: 0.25
      },
      B: {
        text: { en: "Claim the mirrors were cursed by the Regency and must be melted.", zh: "声称镜子被摄政王诅咒了，必须熔掉。" },
        reply: { en: "The King agrees, eyes widening. You've successfully redirected his paranoia, but the Regent looks at you with cold fury.", zh: "国王瞪大眼睛表示同意。你成功转移了他的偏执，但摄政王正带着冰冷的愤怒注视着你。" },
        conquest: 10, type: "none"
      },
      C: {
        text: { en: "Refuse to speak to inanimate objects.", zh: "拒绝与无生命物体对话。" },
        reply: { en: "The King throws a scepter at your head. 'Useless!' he shrieks. You've lost face in the court.", zh: "国王朝你的头扔来一把权杖。“废物！”他尖叫道。你在朝堂上颜面尽失。" },
        conquest: -15, type: "none"
      }
    }
  },
  {
    id: "STORY_02",
    title: { en: "The Silent Session of the Black Lily", zh: "黑百合的静默会议" },
    content: {
      en: "A Royal Guard stands by the throne, a black lily sewn into his mouth as punishment. The King commands you to translate the 'silence' of the dying man.",
      zh: "一名禁卫军站在王座旁，嘴里缝着一朵黑百合作为惩罚。国王命令你翻译这个濒死之人的“沉默”。"
    },
    options: {
      A: {
        text: { en: "Interpret the silence as a prophecy of the King's divine immortality.", zh: "将沉默解读为国王神圣永生的预言。" },
        reply: { en: "The King purrs in satisfaction. Your flattery buys you influence, but the priests are disgusted.", zh: "国王满意地发出咕噜声。你的奉承为你换取了影响力，但祭司们对此感到恶心。" },
        conquest: 20, type: "none"
      },
      B: {
        text: { en: "Reach into the guard's mouth to retrieve the 'hidden truth'.", zh: "伸手进入卫兵的嘴里以取回“隐藏的真相”。" },
        reply: { en: "Beneath the flower, you find a small, ancient signet ring. A holy relic?!", zh: "在花朵下方，你发现了一个小小的古老印戒。是一件圣器？！" },
        conquest: 5, type: "relic_chance", chance: 0.3
      },
      C: {
        text: { en: "Mock the guard for his inability to serve properly.", zh: "嘲笑卫兵无法正常履行职责。" },
        reply: { en: "The King cackles, but the other guards grip their spears tighter. You are feared, but hated.", zh: "国王咯咯大笑，但其他卫兵握紧了长矛。你令人畏惧，但也令人憎恨。" },
        conquest: 10, type: "none"
      }
    }
  },
  {
    id: "STORY_03",
    title: { en: "The Taxonomy of Royal Breath", zh: "皇室呼吸分类学" },
    content: {
      en: "The new 'Breath Tax' has caused a noble to faint before the King. The King demands you decide the man's fate: is he a tax evader or a loyal subject?",
      zh: "新的“呼吸税”导致一名贵族在国王面前昏倒。国王要求你决定这个人的命运：他是偷税者还是忠臣？"
    },
    options: {
      A: {
        text: { en: "Declare him a traitor and seize his private militia for the Crown.", zh: "宣布他为叛徒，并为皇室征收他的私人武装。" },
        reply: { en: "The King is thrilled. In the chaos, you divert some of those soldiers to your own secret hideout.", zh: "国王欣喜若狂。在混乱中，你将其中一些士兵转移到了你自己的秘密据点。" },
        conquest: 10, type: "army_chance", chance: 0.25
      },
      B: {
        text: { en: "Pay his 'breath debt' with your own prestige to save him.", zh: "用你自己的声望为他偿还“呼吸债”以救他。" },
        reply: { en: "The nobles whisper your name with newfound respect. You are becoming a beacon of hope.", zh: "贵族们带着新的敬意窃窃私语你的名字。你正在成为希望的灯塔。" },
        conquest: 25, type: "none"
      },
      C: {
        text: { en: "Argue that the noble is actually 'saving' air for the King's own lungs.", zh: "辩称这名贵族实际上是在为国王的肺“节省”空气。" },
        reply: { en: "The King is confused by your twisted logic but decides it's brilliant. The noble is spared, but terrified of you.", zh: "国王被你扭曲的逻辑搞糊涂了，但认为这很天才。贵族被赦免了，但对你感到恐惧。" },
        conquest: 15, type: "none"
      }
    }
  },
  {
    id: "STORY_04",
    title: { en: "The Weeping Statues of Sour Wine", zh: "流出酸酒的哭泣雕像" },
    content: {
      en: "The statues of the Founding Kings are weeping fermented wine. The drunk and panicked populace is rioting outside. The King tells you to 'fix the stone kings'.",
      zh: "开国先王的雕像正在流出发酵的酒。城外醉酒而恐慌的民众正在暴乱。国王让你“修理这些石王”。"
    },
    options: {
      A: {
        text: { en: "Bless the wine and declare it a sign of a coming 'Holy War'.", zh: "赐福这些酒并宣布这是即将到来的“圣战”的预兆。" },
        reply: { en: "The crowd goes wild. The fervor is terrifying. You might have just started a crusade.", zh: "人群疯狂了。这种狂热令人恐惧。你可能刚刚开启了一场十字军东征。" },
        conquest: 20, type: "none"
      },
      B: {
        text: { en: "Drink the 'tears' yourself to prove they are harmless.", zh: "自己喝下这些“眼泪”以证明它们是无害的。" },
        reply: { en: "You collapse in a drunken stupor for a day, but the King finds your idiocy highly entertaining.", zh: "你在醉酒的昏睡中倒下了一整天，但国王觉得你的愚蠢行为极具娱乐性。" },
        conquest: -5, type: "none"
      },
      C: {
        text: { en: "Secretly poison the statues' wine to 'purify' the rioters.", zh: "暗中在雕像的酒里下毒以“净化”暴徒。" },
        reply: { en: "The streets go silent. The King is awestruck by your ruthlessness. You've secured a brutal order.", zh: "街道陷入死寂。国王被你的冷酷所折服。你确立了一种残暴的秩序。" },
        conquest: 30, type: "army_chance", chance: 0.2
      }
    }
  },
  {
    id: "STORY_05",
    title: { en: "The Feast of Hollow Loyalty", zh: "虚无忠诚的盛宴" },
    content: {
      en: "At a banquet of empty plates, the King asks you: 'What does loyalty taste like?'",
      zh: "在一场只有空盘子的宴会上，国王问你：“忠诚是什么味道？”"
    },
    options: {
      A: {
        text: { en: "“It tastes like the iron in the blood of your enemies.”", zh: "“它尝起来像敌人血液里的铁锈味。”" },
        reply: { en: "The King gnaws on his own lip. 'Yes... iron. Fetch me the generals!'", zh: "国王啃噬着自己的嘴唇。“没错……铁的味道。把将军们给我叫来！”" },
        conquest: 15, type: "army_chance", chance: 0.25
      },
      B: {
        text: { en: "“It tastes like the incense in the Great Temple.”", zh: "“它尝起来像大庙里的香火味。”" },
        reply: { en: "He points to the high altar. 'Go then, see if the gods agree.'", zh: "他指向高处的祭坛。“那就去吧，看看神灵是否同意。”" },
        conquest: 5, type: "relic_chance", chance: 0.3
      },
      C: {
        text: { en: "“It tastes like nothing, for I have already given you my soul.”", zh: "“它没有任何味道，因为我已将灵魂献祭于你。”" },
        reply: { en: "The King stares into your eyes, mesmerized. He hands you his own golden goblet.", zh: "国王盯着你的眼睛，被迷住了。他递给你他自己的金杯。" },
        conquest: 40, type: "none"
      }
    }
  },
  {
    id: "STORY_06",
    title: { en: "The Hourglass of Leaking Blood", zh: "渗血的沙漏" },
    content: {
      en: "The Regent shows you a timer filled with blood. 'One drop per heartbeat,' he says. 'How do we stop the leak?'",
      zh: "摄政王给你看一个装满血的计时器。“每一次心跳滴落一滴，”他说，“我们要如何止血？”"
    },
    options: {
      A: {
        text: { en: "“By smashing the glass and stopping time itself.”", zh: "“通过打碎玻璃并停止时间本身。”" },
        reply: { en: "The Regent nods slowly. He hands you a key to the armory. 'Make it quick.'", zh: "摄政王缓慢地点了点头。他递给你一把军械库的钥匙。“动作快点。”" },
        conquest: 10, type: "army_chance", chance: 0.3
      },
      B: {
        text: { en: "“By offering a sacrificial heart to refill it.”", zh: "“通过献祭一颗心脏来重新填满它。”" },
        reply: { en: "A dark path. You gain power, but at what cost to your soul?", zh: "一条黑暗的道路。你获得了权力，但你的灵魂付出了什么代价？" },
        conquest: 30, type: "none"
      },
      C: {
        text: { en: "“Let it drain. A new vessel will be needed soon.”", zh: "“让它流干吧。很快就需要一个新的容器了。”" },
        reply: { en: "The Regent’s eyes flash with treasonous hope. 'I like the way you think, conspirator.'", zh: "摄政王的眼中闪过叛逆的希望。“我喜欢你的想法，同谋者。”" },
        conquest: 15, type: "relic_chance", chance: 0.4
      }
    }
  }
];

const NPC_DATA = {
  "The Regent": {
    name: { en: "The Regent", zh: "摄政王" },
    description: { en: "The shadow behind the throne, smelling of old parchment and betrayal.", zh: "王座后的阴影，散发着旧羊皮纸和背叛的气息。" },
    dialogues: [
      {
        situation: { en: "He is burning documents in a silver bowl.", zh: "他正把文件丢进银碗里焚烧。" },
        options: {
          A: { text: { en: "Help him stoke the fire.", zh: "帮他添柴。" }, reply: { en: "“History is what we burn, not what we write,” he whispers.", zh: "“历史是我们焚烧的东西，从不是我们书写的东西，”他低语道。" }, conquest: 10, type: "army_chance", chance: 0.2 },
          B: { text: { en: "Ask what he’s hiding.", zh: "追问他在隐瞒什么。" }, reply: { en: "“Your innocence,” he sneers.", zh: "“你的天真，”他讥讽道。" }, conquest: -5, type: "none" },
          C: { text: { en: "Steal a half-burnt page.", zh: "偷走一页残页。" }, reply: { en: "It's a list of names. Some are already crossed out in blood.", zh: "那是一份名单，其中几个名字已被血迹划去。" }, conquest: 5, type: "army_chance", chance: 0.3 }
        }
      },
      {
        situation: { en: "He is staring at a map of the border with a tired expression.", zh: "他疲惫地盯着边境地图。" },
        options: {
          A: { text: { en: "Suggest a pre-emptive strike.", zh: "提议先发制人。" }, reply: { en: "He sighs. 'War is expensive, but so is peace.'", zh: "他叹了口气。“战争很贵，可和平也不便宜。”" }, conquest: 15, type: "army_chance", chance: 0.4 },
          B: { text: { en: "Suggest more fortifications.", zh: "提议加固城墙。" }, reply: { en: "“Walls only make the prison look official.”", zh: "“高墙只会让监狱看起来更名正言顺。”" }, conquest: 5, type: "none" },
          C: { text: { en: "Spill wine on the map.", zh: "把酒洒在地图上。" }, reply: { en: "He stares at the red stain. 'A prophetic accident.'", zh: "他盯着那片红色的污渍。“一场充满预兆的意外。”" }, conquest: 20, type: "none" }
        }
      },
      {
        situation: { en: "The Regent asks you if the King is truly mad.", zh: "摄政王问你国王是否真的疯了。" },
        options: {
          A: { text: { en: "“He is a god among men.”", zh: "“他是人间之神。”" }, reply: { en: "The Regent looks at you with profound pity.", zh: "摄政王用无比怜悯的眼神看着你。" }, conquest: 5, type: "none" },
          B: { text: { en: "“He is a broken mirror.”", zh: "“他是一面破碎的镜子。”" }, reply: { en: "“And we are all bleeding from the shards.”", zh: "“而我们都在被碎片割伤流血。”" }, conquest: 20, type: "none" },
          C: { text: { en: "“The madness is infectious, isn't it?”", zh: "“疯病是会传染的，对吧？”" }, reply: { en: "He leans in. 'I’ve been sick for years, friend.'", zh: "他凑近你。“朋友，我已经病了很多年了。”" }, conquest: 15, type: "army_chance", chance: 0.2 }
        }
      }
    ]
  },
  "The High Priest": {
    name: { en: "The High Priest", zh: "大祭司" },
    description: { en: "Blindfolded with silk, he claims to see the King's soul.", zh: "蒙着丝绸，自称能看见国王的灵魂。" },
    dialogues: [
      {
        situation: { en: "He is blessing a pile of rusted swords.", zh: "他正在加持一堆生锈的长剑。" },
        options: {
          A: { text: { en: "Offer your blood for the blessing.", zh: "用血献祭。" }, reply: { en: "The rusted steel hums with a terrifying divine connection.", zh: "生锈的钢刃嗡鸣，与神灵建立起令人战栗的联系。" }, conquest: 5, type: "relic_chance", chance: 0.4 },
          B: { text: { en: "Ask if the gods still listen.", zh: "询问神是否还在倾听。" }, reply: { en: "“They listen, but they only answer in screams.”", zh: "“他们在听，但只用尖叫回应。”" }, conquest: 10, type: "none" },
          C: { text: { en: "Steal a candle from the altar.", zh: "从祭坛偷走一支蜡烛。" }, reply: { en: "The flame never goes out, even in the wind.", zh: "即使在风中，那烛火也从未熄灭。" }, conquest: 0, type: "relic_chance", chance: 0.2 }
        }
      },
      {
        situation: { en: "He is whipping himself in the dark cathedral.", zh: "他正在黑暗的大教堂里自省。" },
        options: {
          A: { text: { en: "Join the ritual.", zh: "加入仪式。" }, reply: { en: "“Pain is the only currency the heavens accept.”", zh: "“痛苦是天堂唯一承认的货币。”" }, conquest: 25, type: "none" },
          B: { text: { en: "Stop his hand.", zh: "阻止他。" }, reply: { en: "He screams at you for interrupting his ecstasy.", zh: "他因你打断了他的狂喜而对你厉声尖叫。" }, conquest: -20, type: "none" },
          C: { text: { en: "Watch in silence.", zh: "保持沉默。" }, reply: { en: "He hands you a blood-stained relic afterward.", zh: "事后他递给你一件沾血的圣器。" }, conquest: 10, type: "relic_chance", chance: 0.5 }
        }
      },
      {
        situation: { en: "He asks for a donation for the new 'Golden Idol'.", zh: "他为新的金像募集捐款。" },
        options: {
          A: { text: { en: "Give him your gold teeth.", zh: "给他金牙。" }, reply: { en: "“Your devotion is... metallic. Good.”", zh: "“你的虔诚……很有金属质感。很好。”" }, conquest: 15, type: "none" },
          B: { text: { en: "Promise him the King's crown.", zh: "许诺国王的皇冠。" }, reply: { en: "He gasps at your heresy, then whispers, 'Tell me more.'", zh: "他因你的异端之言倒吸一口气，随即低语：“再多说一些。”" }, conquest: 5, type: "relic_chance", chance: 0.3 },
          C: { text: { en: "Spit on the idol.", zh: "唾弃神像。" }, reply: { en: "You are dragged out by monks, but the crowd cheers your bravery.", zh: "你被僧侣拖了出去，但人群为你的勇气欢呼。" }, conquest: 20, type: "none" }
        }
      }
    ]
  },
  "The Old General": {
    name: { en: "The Old General", zh: "老将军" },
    description: { en: "An iron-clad giant with more scars than skin.", zh: "铁甲巨汉，伤疤比皮肤还多。" },
    dialogues: [
      {
        situation: { en: "He is sharpening an axe that is too heavy to lift.", zh: "他正在磨一把重得提不起来的斧头。" },
        options: {
          A: { text: { en: "Test the edge with your finger.", zh: "用手指试刃。" }, reply: { en: "“Careful, child. This axe has forgotten who it serves.”", zh: "“小心，孩子。这把斧头已经忘了自己该效忠谁。”" }, conquest: 10, type: "army_chance", chance: 0.3 },
          B: { text: { en: "Bring him a whetstone.", zh: "递上磨刀石。" }, reply: { en: "He nods in silence. The metal screams against the stone.", zh: "他默默点头。金属摩擦石面，发出尖锐的嘶鸣。" }, conquest: 15, type: "none" },
          C: { text: { en: "Tell him the axe is obsolete.", zh: "说斧头过时了。" }, reply: { en: "He laughs. 'So am I. That’s why we’re dangerous.'", zh: "他大笑。“我也是。所以我们才危险。”" }, conquest: 10, type: "army_chance", chance: 0.5 }
        }
      },
      {
        situation: { en: "The General is drinking alone, mourning fallen soldiers.", zh: "将军独自饮酒，哀悼阵亡士兵。" },
        options: {
          A: { text: { en: "Drink to the dead.", zh: "为死者干杯。" }, reply: { en: "He pours half the jar on the floor. 'For them.'", zh: "他将半罐酒倒在地上。“敬他们。”" }, conquest: 20, type: "none" },
          B: { text: { en: "Tell him to forget the past.", zh: "让他忘记过去。" }, reply: { en: "He throws the jar at your feet. 'The past is my only armor.'", zh: "他把酒罐砸在你脚边。“过去是我唯一的铠甲。”" }, conquest: -10, type: "none" },
          C: { text: { en: "Recruit his veterans.", zh: "招募老兵。" }, reply: { en: "“They only follow ghosts. Are you a ghost yet?”", zh: "“他们只追随亡魂。你已经是亡魂了吗？”" }, conquest: 5, type: "army_chance", chance: 0.4 }
        }
      },
      {
        situation: { en: "He asks if you've ever killed a man you liked.", zh: "他问你有没有杀过你喜欢的人。" },
        options: {
          A: { text: { en: "“Every day, in my heart.”", zh: "“每天都在心里杀。”" }, reply: { en: "He pats your shoulder with a heavy, metallic hand.", zh: "他用沉重的铁甲之手拍了拍你的肩膀。" }, conquest: 15, type: "army_chance", chance: 0.2 },
          B: { text: { en: "“Never.”", zh: "“从未。”" }, reply: { en: "“Then you haven't lived yet. Or you're a liar.”", zh: "“那你还没真正活过。要么，你在说谎。”" }, conquest: 0, type: "none" },
          C: { text: { en: "“I am planning to.”", zh: "“正打算杀。”" }, reply: { en: "His eyes light up. 'I recognize that look.'", zh: "他眼睛一亮。“我认得这种眼神。”" }, conquest: 10, type: "army_chance", chance: 0.3 }
        }
      }
    ]
  },
  "The Exiled Princess": {
    name: { en: "The Exiled Princess", zh: "流亡公主" },
    description: { en: "Dressed in rags, but her eyes demand a throne.", zh: "衣衫褴褛，但眼神中透着对王座的渴望。" },
    dialogues: [
      {
        situation: { en: "She is feeding rats in the palace dungeon.", zh: "她在宫廷地牢里喂老鼠。" },
        options: {
          A: { text: { en: "Bring her actual food.", zh: "带真正的食物给她。" }, reply: { en: "“The rats have better secrets than the nobles anyway.”", zh: "“反正老鼠的秘密也比那些贵族们的更有价值。”" }, conquest: 25, type: "none" },
          B: { text: { en: "Ask for her claim to the throne.", zh: "询问她的继承权。" }, reply: { en: "“My claim is written in the King's nightmares.”", zh: "“我的继承权，写在国王的噩梦里。”" }, conquest: 10, type: "relic_chance", chance: 0.3 },
          C: { text: { en: "Report her to the King.", zh: "举报她。" }, reply: { en: "The King ignores you, but the Princess marks your face.", zh: "国王没有理会你，但公主记住了你的脸。" }, conquest: -15, type: "none" }
        }
      },
      {
        situation: { en: "She shows you a hidden passage in the laundry room.", zh: "她展示洗衣房里的密道。" },
        options: {
          A: { text: { en: "Use it to smuggle out gold.", zh: "利用密道走私黄金。" }, reply: { en: "You get the gold, but lose her trust.", zh: "你得到了黄金，却失去了她的信任。" }, conquest: -10, type: "relic_chance", chance: 0.5 },
          B: { text: { en: "Use it to contact the rebels.", zh: "利用密道联系反抗军。" }, reply: { en: "“They are waiting for a spark. Are you it?”", zh: "“他们在等一颗火星。你是吗？”" }, conquest: 15, type: "army_chance", chance: 0.3 },
          C: { text: { en: "Seal the passage.", zh: "封死密道。" }, reply: { en: "Safety first, but you feel smaller somehow.", zh: "安全第一，可你莫名觉得自己渺小了几分。" }, conquest: 5, type: "none" }
        }
      },
      {
        situation: { en: "She asks for your loyalty.", zh: "她向你索要忠诚。" },
        options: {
          A: { text: { en: "Give her your ring.", zh: "给她你的戒指。" }, reply: { en: "She swallows it. 'Now it is safe.'", zh: "她将戒指吞下。“现在，它安全了。”" }, conquest: 20, type: "none" },
          B: { text: { en: "Ask what's in it for you.", zh: "跟她讨价还价。" }, reply: { en: "“A grave next to mine in the royal tomb.”", zh: "“皇陵里，我墓穴旁的一席之地。”" }, conquest: 5, type: "relic_chance", chance: 0.4 },
          C: { text: { en: "Laugh in her face.", zh: "当面嘲笑她。" }, reply: { en: "She smiles back. It's the most terrifying thing you've seen.", zh: "她报以微笑——那是你见过最可怕的事。" }, conquest: -5, type: "none" }
        }
      }
    ]
  },
  "The Shadow Merchant": {
    name: { en: "The Shadow Merchant", zh: "神秘商人" },
    description: { en: "A man whose face is hidden by a cloud of black flies.", zh: "脸部被一群黑蝇遮住的男人。" },
    dialogues: [
      {
        situation: { en: "He offers a 'Mystery Box' for 10 Conquest points.", zh: "他用10点征服值向你兜售一只神秘盒子。" },
        options: {
          A: { text: { en: "Buy it.", zh: "买下它。" }, reply: { en: "Inside is either a dead bird or a master key.", zh: "盒子里要么是一只死鸟，要么是一把万能钥匙。" }, conquest: -10, type: "relic_chance", chance: 0.5 },
          B: { text: { en: "Threaten him.", zh: "威胁他。" }, reply: { en: "The flies swarm your throat. You choke on shadows.", zh: "苍蝇涌向你的喉咙，你被阴影呛住。" }, conquest: -20, type: "none" },
          C: { text: { en: "Ignore him.", zh: "无视他。" }, reply: { en: "He vanishes, leaving the smell of sulfur.", zh: "他消失了，只留下一股硫磺味。" }, conquest: 0, type: "none" }
        }
      },
      {
        situation: { en: "He wants to trade 'Army' for 'Relic'.", zh: "他想用「军队」换「圣器」。" },
        options: {
          A: { text: { en: "Trade if you have an Army.", zh: "若你有军队，达成交易。" }, reply: { en: "“A fair price for a soul,” he chuckles.", zh: "“为灵魂开出的公道价，”他轻笑道。" }, conquest: 10, type: "relic_chance", chance: 1.0 },
          B: { text: { en: "Trade if you have a Relic.", zh: "若你有圣器，达成交易。" }, reply: { en: "“Steel is heavier than gold. Good choice.”", zh: "“钢铁比黄金更沉。明智的选择。”" }, conquest: 10, type: "army_chance", chance: 1.0 },
          C: { text: { en: "Refuse.", zh: "拒绝。" }, reply: { en: "“Possessions are just anchors, friend.”", zh: "“占有之物，不过是拖累你的锚，朋友。”" }, conquest: 5, type: "none" }
        }
      },
      {
        situation: { en: "He asks to borrow your shadow for an hour.", zh: "他想借走你的影子，为期一个钟头。" },
        options: {
          A: { text: { en: "Agree.", zh: "同意。" }, reply: { en: "You feel cold. Very cold. But you find a bag of coins later.", zh: "你感到寒冷，彻骨的寒冷。但之后你发现了一袋钱币。" }, conquest: 20, type: "none" },
          B: { text: { en: "Refuse.", zh: "拒绝。" }, reply: { en: "“You’re attached to it? How sentimental.”", zh: "“你还舍不得它？真多愁善感。”" }, conquest: 5, type: "none" },
          C: { text: { en: "Try to buy HIS shadow.", zh: "反过来想买他的影子。" }, reply: { en: "He laughs. 'I haven't had one of those in centuries.'", zh: "他大笑。“我已经好几个世纪没有影子了。”" }, conquest: 10, type: "relic_chance", chance: 0.3 }
        }
      }
    ]
  },
  "The Mad Seer": {
    name: { en: "The Mad Seer", zh: "疯预言家" },
    description: { en: "He eats glass and speaks in two voices at once.", zh: "吃玻璃，同时用两种声音说话。" },
    dialogues: [
      {
        situation: { en: "He screams that the sun will never rise again.", zh: "他尖叫着，说太阳再也不会升起。" },
        options: {
          A: { text: { en: "Believe him.", zh: "相信他。" }, reply: { en: "“Then let us dance in the dark!”", zh: "“那就让我们在黑暗中起舞吧！”" }, conquest: 20, type: "none" },
          B: { text: { en: "Slap him.", zh: "打他一巴掌。" }, reply: { en: "He spits a tooth at you. 'It's still coming!'", zh: "他朝你吐出一颗牙。“它还是会来的！”" }, conquest: -10, type: "none" },
          C: { text: { en: "Ask for the date of the King's death.", zh: "询问国王的死期。" }, reply: { en: "He draws a circle in the dirt. 'You are standing on it.'", zh: "他在泥地上画了一个圈。“你正站在上面。”" }, conquest: 10, type: "relic_chance", chance: 0.2 }
        }
      },
      {
        situation: { en: "He offers you a 'Eye of the Future'.", zh: "他递给你一只「未来之眼」。" },
        options: {
          A: { text: { en: "Eat it.", zh: "吃掉它。" }, reply: { en: "Everything turns purple. You see the barracks burning.", zh: "一切都变成了紫色。你看见兵营正在燃烧。" }, conquest: 10, type: "army_chance", chance: 0.4 },
          B: { text: { en: "Keep it in a jar.", zh: "把它装进罐子里。" }, reply: { en: "It blinks at you every night. Creepy.", zh: "它每晚都朝你眨眼。渗人。" }, conquest: 0, type: "relic_chance", chance: 0.3 },
          C: { text: { en: "Throw it away.", zh: "把它扔掉。" }, reply: { en: "“Fate is a boomerang, you fool!”", zh: "“命运是回旋镖，蠢货！”" }, conquest: -5, type: "none" }
        }
      },
      {
        situation: { en: "He asks which voice of his you like better.", zh: "他问你更喜欢他的哪一种声音。" },
        options: {
          A: { text: { en: "The high, screeching one.", zh: "高亢尖叫的那个。" }, reply: { en: "“That’s the angel. He hates you.”", zh: "“那是天使的声音。他恨你。”" }, conquest: 10, type: "none" },
          B: { text: { en: "The low, rumbling one.", zh: "低沉隆隆的那个。" }, reply: { en: "“That’s the dirt. It’s hungry for you.”", zh: "“那是泥土的声音。它渴望着你。”" }, conquest: 10, type: "none" },
          C: { text: { en: "“I hear only silence.”", zh: "“我只听到沉默。”" }, reply: { en: "He stops moving. 'Then you are already dead.'", zh: "他停止了动作。“那你已经死了。”" }, conquest: 30, type: "none" }
        }
      }
    ]
  }
};

const END_DAY_QUOTES = [
  { en: "Another day survived in chaos and desolation. May tomorrow be kinder...", zh: "又一天，在混乱与荒芜中侥幸活了下来。愿明天能仁慈一些……" },
  { en: "The palace bells toll heavily. The night feels longer than before.", zh: "宫殿的钟声沉重地响起。今夜，似乎比往常更漫长。" },
  { en: "You close your eyes, the whispers of traitors still echoing in your ears.", zh: "你闭上双眼，叛徒的低语仍在耳边回荡不去。" },
  { en: "The embers in the hearth flicker. The dangerous game continues.", zh: "壁炉里的余烬明灭不定。这场危险的游戏，仍在继续。" }
];
