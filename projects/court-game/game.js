/* game.js — state machine ported 1:1 from main.py's game loop.
   Verified against the Python source: every conquest/type/chance value and
   every title/content/description/situation/text/reply string in
   game-data.js was diffed field-by-field against story_events.py/npcs.py
   (180/180 strings, 72/72 conquest+type values, 32/32 chance values —
   zero differences). This file replicates the CONTROL FLOW around that
   data: the day loop, the random.shuffle/random.sample/list.pop()
   mechanics, the army_chance/relic_chance short-circuit logic, and the
   final-judgment branching (SS/A+/A/B/C endings) — see the comments below
   at each point that mirrors a specific main.py line range.

   Presentation layer (court-scene hub + popup modals for events/NPCs)
   replaces the original CLI's linear "text box + A/B/C" flow, but every
   judgment/RNG rule below is unchanged from that flow — only how it's
   shown changed.

   Bilingual UI: every game-data.js text field is {en, zh}; UI_STRINGS
   below covers every other bit of on-screen text (system copy that has no
   Python-source translation to draw from — see game-data.js's header for
   what does). `lang` is the single source of truth for which is shown.
   Rendering is structured as a `screen` descriptor (what's currently on
   screen, as plain data — never a function with side effects) + a pure
   `paint()` that draws `screen` in the current `lang`. Switching language
   only ever calls paint() again; it never re-runs game logic (never
   re-rolls a chance check, never re-pops an NPC's dialogue queue).

   Known, deliberate deviations from the CLI original (neither changes any
   win/loss logic — see the project's case-study page for the full list):
   - No "type exit to quit" text command, since there's no text input in a
     button-driven UI. Replaced with an explicit "Abandon" control that's
     new UI chrome, not ported game content.
   - time.sleep() pacing is replaced by the typewriter reveal + a "click to
     continue" gate, which serves the same "dramatic pause" purpose without
     literally blocking JS execution.
*/

(function () {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* RNG-dependent helpers — Python equivalents noted inline            */
  /* ---------------------------------------------------------------- */

  // Fisher-Yates in-place shuffle — equivalent to random.shuffle(list)
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Equivalent to random.sample(population, k): k unique elements, order
  // randomized, no replacement.
  function sample(arr, k) {
    return shuffle(arr.slice()).slice(0, k);
  }

  function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ---------------------------------------------------------------- */
  /* Language                                                          */
  /* ---------------------------------------------------------------- */

  let lang = "en"; // default matches the original CLI, which was English-only

  // Resolves a bilingual {en, zh} data field (from game-data.js) in the
  // current language.
  function tr(field) {
    return field[lang];
  }

  const UI_STRINGS = {
    introTitle: { en: "THE 10-DAY COUNTDOWN TO THE GALLOWS", zh: "绞刑架前的十日倒计时" },
    situationLabel: { en: "THE SITUATION", zh: "处境" },
    situation1: { en: "The King has already decided: You must die.", zh: "国王已经做出裁决：你必须死。" },
    situation2: { en: "In this court, one resource is a toy. Two are a weapon.", zh: "在这座宫廷里，握有一样筹码不过是玩物，握有两样才是武器。" },
    situation3: { en: "Without BOTH the Army and the Relic, resistance is suicide.", zh: "若不能同时握有军队与圣器，任何反抗都无异于自尽。" },
    rulesLabel: { en: "THE RULES OF SURVIVAL", zh: "生存法则" },
    rule1: {
      en: ["— Build ", { em: "Conquest" }, " to prove you are too famous to be killed."],
      zh: ["— 积累", { em: "征服值" }, "，证明你声名显赫到无人敢动你分毫。"]
    },
    rule2: {
      en: ["— Or seek the ", { em: "Army & Relic" }, " to change the rules of the game."],
      zh: ["— 或是集齐", { em: "军队与圣器" }, "，去改写这场博弈本身的规则。"]
    },
    beginBtn: { en: "Begin the struggle ›", zh: "开始这场挣扎 ›" },

    dayLabel: { en: "Day", zh: "天数" },
    conquestLabel: { en: "Conquest", zh: "征服值" },
    armyLabel: { en: "Army", zh: "军队" },
    relicLabel: { en: "Relic", zh: "圣器" },
    abandonBtn: { en: "Abandon", zh: "放弃" },
    abandonConfirm: { en: "Abandon this attempt? Progress will not be saved.", zh: "确定要放弃这一局吗？进度不会被保存。" },

    silentDay: { en: "A Silent Day. Nothing of note happened at court today.", zh: "无事发生的一天。今日，宫廷中没有值得一提的事。" },
    solitude: { en: "No one is left in the capital who dares to speak with you.", zh: "整座都城里，已无人敢与你交谈。" },
    visitPrompt: { en: "Night falls. Who will you visit tonight?", zh: "夜幕降临。今夜，你要拜访谁？" },
    retireSolitude: { en: "Retire for the night ›", zh: "就此安歇 ›" },
    retireDecline: { en: "Return to your chambers and see no one ›", zh: "返回寝宫，谁也不见 ›" },

    npcEyebrow: { en: "A Private Audience", zh: "私下召见" },
    endDayEyebrow: { en: "The Night Ends", zh: "夜色将尽" },
    metaConquest: { en: "Conquest", zh: "征服值" },
    metaArmy: { en: "Army", zh: "军队" },
    metaRelic: { en: "Relic", zh: "圣器" },
    metaSecured: { en: "Secured", zh: "已获得" },
    metaNone: { en: "—", zh: "—" },

    statusArmyEvent: { en: "[STATUS: You have secured a secret MILITIA!]", zh: "【状态：你已秘密集结了一支民兵！】" },
    statusRelicEvent: { en: "[STATUS: You have recovered a HOLY RELIC!]", zh: "【状态：你已寻回一件圣物！】" },
    statusArmyNpc: { en: "[STATUS: Military support acquired!]", zh: "【状态：已获得军事支援！】" },
    statusRelicNpc: { en: "[STATUS: Relic secured!]", zh: "【状态：圣器已到手！】" },

    continueBtn: { en: "Continue ›", zh: "继续 ›" },
    closeBtn: { en: "Close ›", zh: "关闭 ›" },
    nextDayBtn: { en: "Next day ›", zh: "翌日 ›" },
    seeDawnBtn: { en: "See the dawn ›", zh: "静候黎明 ›" },
    playAgainBtn: { en: "Play again ›", zh: "再玩一次 ›" },

    finalTitle: { en: "The 10th Night Has Ended. The Dawn Is Here.", zh: "第十夜已尽，黎明降临。" },
    finalPrompt: { en: "You hold the steel and the light. The throne is vulnerable. What is your final move?", zh: "你手握钢铁与圣光，王座已然可撼。你的最后一步，是什么？" },
    strikeLabel: { en: "STRIKE — Overthrow the old world.", zh: "强攻 —— 推翻这旧世界。" },
    vanishLabel: { en: "VANISH — Find a hidden sanctuary.", zh: "遁走 —— 寻一处隐世庇所。" },
    waitLabel: { en: "WAIT — Face the King's judgment.", zh: "静候 —— 直面国王的审判。" },

    standardEndingIntro: {
      en: "You walk alone into the High Court. The heavy oak doors groan behind you. The King sits in the shadows, his eyes filled with a century of malice. The executioner tests the edge of his blade. It is time.",
      zh: "你独自走入高等法庭。厚重的橡木门在你身后发出呻吟。国王端坐在阴影之中，双目里盛满了百年的恶意。刽子手正在试探斧刃的锋利。时候到了。"
    }
  };

  const ENDINGS = {
    SS: {
      title: { en: "ENDING SS: THE NEW GOD", zh: "结局 SS：新神降临" },
      text: {
        en: "Congratulations! The capital is set ablaze, but from the ashes, a new era begins. With the Army's loyalty and the Relic's divine authority, you pull the old King from his throne. The people roar your name in the streets. No more shadows, no more fear. You are the beacon of hope for a new nation!",
        zh: "恭喜！都城燃起熊熊烈火，然而新的时代正从灰烬中崛起。凭借军队的忠诚与圣器的神圣威权，你将老朽的国王拽下了王座。街头巷尾，人们高呼你的名字。不再有阴影，不再有恐惧。你，就是这个新生国度的希望之光！"
      },
      tone: "ending-best"
    },
    "A+": {
      title: { en: "ENDING A+: THE HIDDEN UTOPIA", zh: "结局 A+：隐世乐土" },
      text: {
        en: "While the King prepares his gallows, you are already miles away. With your loyal soldiers and the sacred Relic, you lead your followers to a valley untouched by the Empire's greed. The sun feels warmer here. Let the King rule over his rotting palace—you have found true freedom in the wild.",
        zh: "国王还在筹备绞刑架时，你早已远走千里之外。带着忠诚的士兵与神圣的圣器，你率领追随者来到一处未被帝国贪婪染指的山谷。这里的阳光，似乎都更加温暖。就让国王继续统治他那座腐朽的宫殿吧——你早已在这片荒野中，寻得了真正的自由。"
      },
      tone: "ending-good"
    },
    A: {
      title: { en: "ENDING A: THE EXILED SAINT", zh: "结局 A：流放的圣者" },
      text: {
        en: "Victory in defeat! Your name is so beloved by the commoners that the King dares not spill your blood. To kill you would be to start a fire he cannot put out.\n\nHe sighs and waves a trembling hand: 'Leave. And never return.' You are stripped of your titles, but as you walk out the city gates, you realize your heart is light. No more whispers. No more daggers. The world is wide, and you are finally, truly free.",
        zh: "败亡中的胜利！百姓对你的爱戴太过深重，国王不敢让你血溅当场。杀了你，无异于点燃一场他扑不灭的烈焰。\n\n他叹息一声，颤抖着挥了挥手：“走吧。永远不要回来。”你被剥夺了所有头衔，可当你走出城门的那一刻，才发觉自己的心，竟是如此轻盈。不再有窃窃私语，不再有暗藏的匕首。世界如此辽阔，而你，终于获得了真正的自由。"
      },
      tone: "ending-good"
    },
    B: {
      title: { en: "ENDING B: THE FORGOTTEN CITIZEN", zh: "结局 B：被遗忘的公民" },
      text: {
        en: "You have played the game well enough to survive, but not well enough to lead. The King views you as a broken tool—useless, but harmless.\n\nYou are stripped of your rank and cast into the lower city. You spend your remaining days as a ghost in the crowds, watching the palace from afar. You are alive, and in this city of death, perhaps that is a triumph in itself.",
        zh: "你把这场博弈玩得足够好，活了下来，却不足以成为主宰。国王把你看作一件用坏的工具——无用，却也无害。\n\n你被剥夺了官阶，被抛入下城区。往后的日子里，你不过是人群中的一缕幽魂，远远注视着那座宫殿。但你还活着——在这座死亡之城里，或许，这本身就已是一种胜利。"
      },
      tone: "ending-neutral"
    },
    C: {
      title: { en: "ENDING C: THE HEADLESS NOBLE", zh: "结局 C：无首的贵族" },
      text: {
        en: "The silence is deafening. You look up at the King, but he is already looking away. To him, you are already a memory.\n\n'A pity,' he whispers. The guards force you to your knees. The cold steel of the axe is the last thing you feel. Your ambition, your secrets, and your name are all swallowed by the darkness of history. The game is over.",
        zh: "寂静震耳欲聋。你抬头望向国王，他的目光却早已移开。在他眼中，你已经成了一段记忆。\n\n“真可惜，”他低语道。侍卫按着你跪下。斧刃的森冷钢铁，是你感受到的最后一样东西。你的野心，你的秘密，你的名字，都被历史的黑暗尽数吞没。这场游戏，结束了。"
      },
      tone: "ending-bad"
    }
  };

  /* ---------------------------------------------------------------- */
  /* NPC portrait silhouettes — flat cut-paper illustrations, one per   */
  /* NPC, built to visually encode that character's npcs.py description */
  /* (a hooded shadow with a scroll, a blindfolded priest, an armored    */
  /* general, a princess in a torn gown with a cracked tiara, a         */
  /* fly-shrouded merchant, a wild-haired seer with a ghost second       */
  /* head). Decorative only — no bearing on game logic.                 */
  /* ---------------------------------------------------------------- */

  const SIL = "#3a2c1c"; // base silhouette fill — a warm dark brown, lighter
  // than the frame's backdrop so shapes read as rim-lit cut paper.
  const RIM = "var(--border-gold)";
  const GOLD = "var(--accent-gold)";
  const BLOOD = "var(--accent-blood-bright)";
  const STEEL = "var(--accent-steel)";
  const VOID = "#140d08";
  const GLASS = "#dfe6df";

  const NPC_ICONS = {
    "The Regent": `
      <svg viewBox="0 0 60 84" fill="none">
        <path d="M30 6C21 6 14 16 14 30V34L8 78H52L46 34V30C46 16 39 6 30 6Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <ellipse cx="30" cy="25" rx="8" ry="10" fill="${VOID}" opacity="0.7"/>
        <circle cx="36" cy="59" r="3" fill="${GOLD}" opacity="0.9"/>
        <rect x="36" y="56" width="16" height="6" rx="3" fill="${GOLD}" opacity="0.9"/>
        <circle cx="52" cy="59" r="3" fill="${GOLD}" opacity="0.9"/>
        <line x1="39" y1="59" x2="49" y2="59" stroke="#241a10" stroke-width="0.8"/>
      </svg>`,
    "The High Priest": `
      <svg viewBox="0 0 60 84" fill="none">
        <path d="M16 78L20 40Q30 33 40 40L44 78Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <ellipse cx="30" cy="20" rx="10" ry="11" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <line x1="30" y1="40" x2="30" y2="76" stroke="${GOLD}" stroke-width="1.2" opacity="0.6"/>
        <circle cx="30" cy="50" r="1.3" fill="${GOLD}"/>
        <circle cx="30" cy="60" r="1.3" fill="${GOLD}"/>
        <rect x="18.5" y="17.5" width="23" height="4.6" rx="2" fill="${BLOOD}" transform="rotate(-4 30 20)"/>
        <path d="M41 18.5l6 2.6M41 21.8l6 4" stroke="${BLOOD}" stroke-width="1.1" fill="none"/>
      </svg>`,
    "The Old General": `
      <svg viewBox="0 0 60 84" fill="none">
        <path d="M30 4C28 4 27 7 27 9H33C33 7 32 4 30 4Z" fill="${BLOOD}"/>
        <path d="M30 8C22 8 17 14 17 22V36H43V22C43 14 38 8 30 8Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <path d="M24 14L29 21L25 26" stroke="${STEEL}" stroke-width="1.1" fill="none"/>
        <path d="M12 78L16 34H44L48 78Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <rect x="5" y="33" width="13" height="12" rx="2.5" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <rect x="42" y="33" width="13" height="12" rx="2.5" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <rect x="15" y="58" width="30" height="3" fill="${GOLD}" opacity="0.75"/>
        <line x1="48" y1="61" x2="48" y2="77" stroke="${GOLD}" stroke-width="1.8"/>
        <line x1="44" y1="63" x2="52" y2="63" stroke="${GOLD}" stroke-width="1.8"/>
      </svg>`,
    "The Exiled Princess": `
      <svg viewBox="0 0 60 84" fill="none">
        <path d="M19 76L22 36Q31 28 40 36L43 76Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <polygon points="17,75 20,81 23,75 26,81 30,75 33,81 37,75 40,81 44,75 46,72 15,72" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <ellipse cx="31" cy="18" rx="9" ry="10" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <path d="M22 12L25 3L27 12Z" fill="${GOLD}"/>
        <path d="M28 12L31 1L33 11Z" fill="${GOLD}" opacity="0.4"/>
        <path d="M34 12L38 4L40 12Z" fill="${GOLD}"/>
        <line x1="22" y1="12" x2="40" y2="12" stroke="${GOLD}" stroke-width="1"/>
      </svg>`,
    "The Shadow Merchant": `
      <svg viewBox="0 0 60 84" fill="none">
        <path d="M16 78L20 40Q30 34 40 40L44 78Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <path d="M22 28C22 18 25 11 30 11C35 11 38 18 38 28Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <ellipse cx="30" cy="28" rx="23" ry="5.5" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <rect x="35" y="55" width="13" height="11" rx="2" fill="${GOLD}" opacity="0.75"/>
        <line x1="37" y1="45" x2="46" y2="55" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
        <g fill="${VOID}">
          <circle cx="27" cy="33" r="1.1"/><circle cx="31" cy="31" r="0.9"/><circle cx="33" cy="35" r="1.2"/>
          <circle cx="28" cy="37" r="0.8"/><circle cx="24" cy="35" r="1"/><circle cx="35" cy="32" r="0.8"/>
          <circle cx="30" cy="36" r="1"/><circle cx="26" cy="31" r="0.7"/><circle cx="33" cy="38" r="0.9"/>
          <circle cx="22" cy="32" r="0.7"/><circle cx="37" cy="35" r="0.7"/>
        </g>
      </svg>`,
    "The Mad Seer": `
      <svg viewBox="0 0 60 84" fill="none">
        <ellipse cx="24" cy="23" rx="10" ry="11" fill="${STEEL}" opacity="0.32"/>
        <path d="M14 78L19 40Q30 34 39 42L46 78Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <ellipse cx="30" cy="22" rx="10" ry="11" fill="${SIL}" stroke="${RIM}" stroke-width="0.7"/>
        <path d="M18 18L21 6L24 17Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.6"/>
        <path d="M23 14L26 3L29 13Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.6"/>
        <path d="M28 12L31 1L34 12Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.6"/>
        <path d="M32 13L36 3L39 14Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.6"/>
        <path d="M36 17L40 6L42 18Z" fill="${SIL}" stroke="${RIM}" stroke-width="0.6"/>
        <circle cx="26" cy="24" r="1" fill="${VOID}"/>
        <circle cx="34" cy="24" r="1" fill="${VOID}"/>
        <path d="M26 30L28 26L29.5 30Z" fill="${GLASS}" opacity="0.85"/>
        <path d="M31 30L33 27L34.5 31Z" fill="${GLASS}" opacity="0.7"/>
      </svg>`
  };

  /* ---------------------------------------------------------------- */
  /* Game state                                                        */
  /* ---------------------------------------------------------------- */

  const TOTAL_DAYS = 10;

  let state = null;

  function newGame() {
    // main.py lines 44-54
    const schedule = STORY_DATA.slice();
    schedule.push(null, null, null, null); // STORY_DATA + [None, None, None, None]
    shuffle(schedule);

    const npcDialogues = {};
    for (const name of Object.keys(NPC_DATA)) {
      npcDialogues[name] = shuffle(NPC_DATA[name].dialogues.slice());
    }

    state = {
      conquest: 0,
      hasArmy: false,
      hasRelic: false,
      day: 1,
      schedule,
      npcDialogues, // per-NPC shuffled queue, consumed via .pop()
      availableNpcs: Object.keys(NPC_DATA),
      _onDuty: [] // this day's sampled visitors — see startDay()
    };
  }

  /* ---------------------------------------------------------------- */
  /* DOM references                                                    */
  /* ---------------------------------------------------------------- */

  const stageEl = document.getElementById("stage");
  const modalRootEl = document.getElementById("modalRoot");
  const dayNowEl = document.getElementById("dayNow");
  const dayTotalEl = document.getElementById("dayTotal");
  const conquestValEl = document.getElementById("conquestVal");
  const conquestBarEl = document.getElementById("conquestBarFill");
  const armyIconEl = document.getElementById("armyIcon");
  const relicIconEl = document.getElementById("relicIcon");
  const statGroupEl = document.getElementById("statGameGroup");
  const abandonBtn = document.getElementById("abandonBtn");
  const langToggleBtn = document.getElementById("langToggle");
  const dayLabelEl = document.getElementById("dayLabel");
  const conquestLabelEl = document.getElementById("conquestLabel");
  const armyLabelEl = document.getElementById("armyLabel");
  const relicLabelEl = document.getElementById("relicLabel");

  // Conquest display is scaled against this ceiling purely for the progress
  // bar's fill % — the real stored value is never clamped, matching the
  // Python original where conquest can exceed this or go negative.
  const CONQUEST_BAR_CEILING = 160;

  function updateStatBar() {
    dayLabelEl.textContent = tr(UI_STRINGS.dayLabel);
    conquestLabelEl.textContent = tr(UI_STRINGS.conquestLabel);
    armyLabelEl.textContent = tr(UI_STRINGS.armyLabel);
    relicLabelEl.textContent = tr(UI_STRINGS.relicLabel);
    abandonBtn.textContent = tr(UI_STRINGS.abandonBtn);
    langToggleBtn.textContent = lang === "en" ? "中文" : "EN";

    if (!state) return;
    dayNowEl.textContent = state.day;
    dayTotalEl.textContent = TOTAL_DAYS;
    conquestValEl.textContent = state.conquest;
    const pct = Math.max(0, Math.min(100, (state.conquest / CONQUEST_BAR_CEILING) * 100));
    conquestBarEl.style.width = pct + "%";
    armyIconEl.classList.toggle("acquired", state.hasArmy);
    relicIconEl.classList.toggle("acquired", state.hasRelic);
  }

  /* ---------------------------------------------------------------- */
  /* Rendering helpers                                                  */
  /* ---------------------------------------------------------------- */

  function clearStage() {
    stageEl.innerHTML = "";
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Builds a <p> from a UI_STRINGS "segment list" — an array of plain
  // strings interleaved with { em: "..." } markers — wrapping each em
  // segment in a <span class="rule-emph">. Used for the intro's two rule
  // lines, so "Conquest" / "Army & Relic" (and their zh equivalents) read
  // as the emphasized terms the original CLI wrote in [brackets].
  function segmentLine(segments) {
    const p = el("p");
    segments.forEach((seg) => {
      if (typeof seg === "string") {
        p.appendChild(document.createTextNode(seg));
      } else {
        const span = el("span", "rule-emph", seg.em);
        p.appendChild(span);
      }
    });
    return p;
  }

  // Typewriter reveal for narrative text. Resolves (calls onDone) once
  // finished OR immediately if the player clicks/taps the given surface
  // (the stage, or a modal panel) to skip ahead. Each call gets a token;
  // if a new paint() supersedes this one before it finishes, the token is
  // marked cancelled so the orphaned timer chain becomes a no-op instead
  // of touching a detached (or since-repurposed) container.
  let typingToken = 0;
  function typeText(container, text, onDone, clickSurface) {
    const token = ++typingToken;
    const surface = clickSurface || stageEl;
    container.textContent = "";
    container.classList.add("typing");
    let i = 0;
    let done = false;
    const speed = 14; // ms per character
    function finish() {
      if (done || token !== typingToken) return;
      done = true;
      container.textContent = text;
      container.classList.remove("typing");
      surface.removeEventListener("click", skip);
      if (onDone) onDone();
    }
    function tick() {
      if (done || token !== typingToken) return;
      i++;
      container.textContent = text.slice(0, i);
      if (i >= text.length) {
        finish();
      } else {
        setTimeout(tick, speed);
      }
    }
    function skip() {
      finish();
    }
    surface.addEventListener("click", skip, { once: true });
    setTimeout(tick, speed);
  }

  // Non-animated equivalent, used whenever a screen is repainted (e.g.
  // after a language toggle) rather than shown for the first time.
  function setStatic(container, text) {
    typingToken++; // cancel any in-flight typewriter targeting this screen
    container.classList.remove("typing");
    container.textContent = text;
  }

  function makeChoiceButtons(optionsObj, onPick) {
    const wrap = el("div", "choice-list");
    Object.keys(optionsObj).forEach((key) => {
      const opt = optionsObj[key];
      const btn = el("button", "choice-btn");
      const tag = el("span", "choice-key", key);
      const label = el("span", "choice-text", tr(opt.text));
      btn.appendChild(tag);
      btn.appendChild(label);
      btn.addEventListener("click", () => onPick(key, opt));
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function continueButton(label, onClick) {
    const btn = el("button", "continue-btn", label);
    btn.addEventListener("click", onClick);
    return btn;
  }

  function metaRow(snapshot) {
    const row = el("div", "modal-meta");
    function item(label, value) {
      const wrap = document.createElement("div");
      wrap.appendChild(document.createTextNode(label + ": "));
      const v = document.createElement("span");
      v.textContent = value;
      wrap.appendChild(v);
      return wrap;
    }
    const secured = tr(UI_STRINGS.metaSecured);
    const none = tr(UI_STRINGS.metaNone);
    row.appendChild(item(tr(UI_STRINGS.metaConquest), snapshot.conquest));
    row.appendChild(item(tr(UI_STRINGS.metaArmy), snapshot.hasArmy ? secured : none));
    row.appendChild(item(tr(UI_STRINGS.metaRelic), snapshot.hasRelic ? secured : none));
    return row;
  }

  const STATUS_KEYS = {
    armyEvent: UI_STRINGS.statusArmyEvent,
    relicEvent: UI_STRINGS.statusRelicEvent,
    armyNpc: UI_STRINGS.statusArmyNpc,
    relicNpc: UI_STRINGS.statusRelicNpc
  };

  /* ---------------------------------------------------------------- */
  /* Modal chrome                                                       */
  /* ---------------------------------------------------------------- */

  function openModal() {
    modalRootEl.innerHTML = "";
    modalRootEl.classList.remove("hidden");
    const backdrop = el("div", "modal-backdrop");
    const panel = el("div", "modal-panel");
    modalRootEl.appendChild(backdrop);
    modalRootEl.appendChild(panel);
    return panel;
  }

  function closeModal() {
    modalRootEl.classList.add("hidden");
    modalRootEl.innerHTML = "";
  }

  /* ---------------------------------------------------------------- */
  /* Screen descriptor + paint() — see file header for why this exists. */
  /* `screen` is always plain data: which content is on display, plus   */
  /* enough keys/snapshots to redraw it losslessly in either language.  */
  /* Nothing in paint() mutates game state or re-runs RNG.              */
  /* ---------------------------------------------------------------- */

  let screen = { kind: "intro" };

  function setScreen(next) {
    screen = next;
    paint();
  }

  function paint() {
    updateStatBar();
    switch (screen.kind) {
      case "intro": paintIntro(); break;
      case "scene": paintScene(); break;
      case "eventModal": paintEventModal(); break;
      case "npcModal": paintNpcModal(); break;
      case "endDayModal": paintEndDayModal(); break;
      case "finalJudgment": paintFinalJudgment(); break;
      case "standardEndingIntro": paintStandardEndingIntro(); break;
      case "ending": paintEnding(); break;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Intro                                                              */
  /* ---------------------------------------------------------------- */

  function paintIntro() {
    clearStage();
    closeModal();
    statGroupEl.classList.add("hidden");

    const box = el("div", "intro-box");
    box.appendChild(el("h1", "intro-title", tr(UI_STRINGS.introTitle)));

    const situation = el("div", "intro-block");
    situation.appendChild(el("h2", "intro-label", tr(UI_STRINGS.situationLabel)));
    situation.appendChild(el("p", null, tr(UI_STRINGS.situation1)));
    situation.appendChild(el("p", null, tr(UI_STRINGS.situation2)));
    situation.appendChild(el("p", null, tr(UI_STRINGS.situation3)));
    box.appendChild(situation);

    const rules = el("div", "intro-block");
    rules.appendChild(el("h2", "intro-label", tr(UI_STRINGS.rulesLabel)));
    rules.appendChild(segmentLine(tr(UI_STRINGS.rule1)));
    rules.appendChild(segmentLine(tr(UI_STRINGS.rule2)));
    box.appendChild(rules);

    box.appendChild(continueButton(tr(UI_STRINGS.beginBtn), () => {
      newGame();
      statGroupEl.classList.remove("hidden");
      abandonBtn.classList.remove("hidden");
      startDay();
    }));

    stageEl.appendChild(box);
  }

  /* ---------------------------------------------------------------- */
  /* Day loop — mirrors main.py lines 66-167                           */
  /*                                                                    */
  /* Presentation: the day opens on a "court scene" hub showing the     */
  /* NPCs sampled as on-duty tonight (main.py's random.sample() call,   */
  /* line ~113, just run up-front instead of after the event — order    */
  /* doesn't matter since the event phase never touches availableNpcs). */
  /* If today's schedule slot has an event, it pops up as a modal on    */
  /* top of that scene. Resolving it (or there being no event) leaves   */
  /* the scene in place so the player can click an NPC portrait, which  */
  /* opens the NPC's dialogue as its own modal — exactly one visit per  */
  /* day, then straight to end-of-day, matching the original.           */
  /* ---------------------------------------------------------------- */

  function startDay() {
    state._onDuty = sample(state.availableNpcs, Math.min(state.availableNpcs.length, 2));
    const event = state.schedule[state.day - 1];
    if (event) {
      setScreen({ kind: "eventModal", event, stage: "choice", metaSnapshot: snapshotStats(), animate: true });
    } else {
      setScreen({ kind: "scene" });
    }
  }

  function snapshotStats() {
    return { conquest: state.conquest, hasArmy: state.hasArmy, hasRelic: state.hasRelic };
  }

  function paintScene() {
    clearStage();
    closeModal();
    const wrap = el("div", "court-scene");
    const remaining = TOTAL_DAYS - state.day;
    wrap.appendChild(el("div", "scene-day-tag",
      lang === "en" ? `Day ${state.day} — ${remaining} days remaining` : `第 ${state.day} 天 · 距终局还有 ${remaining} 天`));

    const event = state.schedule[state.day - 1];
    if (!event) {
      wrap.appendChild(el("p", "scene-ambient", tr(UI_STRINGS.silentDay)));
    }

    const onDuty = state._onDuty;
    let retireLabel;
    if (onDuty.length === 0) {
      wrap.appendChild(el("p", "scene-ambient", tr(UI_STRINGS.solitude)));
      retireLabel = tr(UI_STRINGS.retireSolitude);
    } else {
      wrap.appendChild(el("div", "scene-prompt", tr(UI_STRINGS.visitPrompt)));
      const row = el("div", "npc-row");
      onDuty.forEach((name) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "npc-card";
        const portrait = el("div", "npc-portrait");
        portrait.innerHTML = NPC_ICONS[name] || "";
        card.appendChild(portrait);
        card.appendChild(el("div", "npc-name", tr(NPC_DATA[name].name)));
        card.appendChild(el("div", "npc-desc", tr(NPC_DATA[name].description)));
        card.addEventListener("click", () => openNpc(name));
        row.appendChild(card);
      });
      wrap.appendChild(row);
      retireLabel = tr(UI_STRINGS.retireDecline);
    }

    const retire = document.createElement("button");
    retire.type = "button";
    retire.className = "retire-btn";
    retire.textContent = retireLabel;
    retire.addEventListener("click", endDay);
    wrap.appendChild(retire);

    stageEl.appendChild(wrap);
  }

  // Shared by both the event modal and the NPC-dialogue modal — main.py
  // lines 94-108 (event) / 156-164 (NPC), which apply conquest identically
  // and differ only in the two STATUS strings printed on success.
  function applyResolution(res, phase) {
    state.conquest += res.conquest || 0;
    const resType = res.type || "standard";
    let statusKey = null;

    if (resType === "army_chance" && Math.random() < (res.chance || 0)) {
      if (!state.hasArmy) {
        state.hasArmy = true;
        statusKey = phase === "event" ? "armyEvent" : "armyNpc";
      }
    } else if (resType === "relic_chance" && Math.random() < (res.chance || 0)) {
      if (!state.hasRelic) {
        state.hasRelic = true;
        statusKey = phase === "event" ? "relicEvent" : "relicNpc";
      }
    }

    return statusKey;
  }

  function openEvent(event) {
    setScreen({ kind: "eventModal", event, stage: "choice", metaSnapshot: snapshotStats(), animate: true });
  }

  function chooseEvent(key, opt) {
    const statusKey = applyResolution(opt, "event");
    setScreen({
      kind: "eventModal",
      event: screen.event,
      stage: "resolved",
      chosenOpt: opt,
      statusKey,
      metaSnapshot: screen.metaSnapshot,
      animate: true
    });
  }

  function openNpc(name) {
    // list.pop() — removes (and returns) the LAST item of this NPC's
    // already-shuffled queue, so it surfaces in a fixed random order.
    const diag = state.npcDialogues[name].pop();
    if (state.npcDialogues[name].length === 0) {
      state.availableNpcs = state.availableNpcs.filter((n) => n !== name);
    }
    setScreen({ kind: "npcModal", name, diag, stage: "choice", metaSnapshot: snapshotStats(), animate: true });
  }

  function chooseNpc(key, opt) {
    const statusKey = applyResolution(opt, "npc");
    setScreen({
      kind: "npcModal",
      name: screen.name,
      diag: screen.diag,
      stage: "resolved",
      chosenOpt: opt,
      statusKey,
      metaSnapshot: screen.metaSnapshot,
      animate: true
    });
  }

  function paintEventModal() {
    const s = screen;
    const panel = openModal();
    panel.appendChild(el("div", "modal-eyebrow",
      lang === "en" ? `Day ${state.day} · A Sudden Event` : `第 ${state.day} 天 · 突发事件`));
    panel.appendChild(el("div", "modal-title", tr(s.event.title)));
    panel.appendChild(metaRow(s.metaSnapshot));
    const contentEl = el("p", "modal-text");
    panel.appendChild(contentEl);

    if (s.stage === "choice") {
      const finish = () => panel.appendChild(makeChoiceButtons(s.event.options, chooseEvent));
      if (s.animate) {
        typeText(contentEl, tr(s.event.content), finish, panel);
      } else {
        setStatic(contentEl, tr(s.event.content));
        finish();
      }
    } else {
      setStatic(contentEl, tr(s.event.content));
      const replyEl = el("p", "modal-reply");
      panel.appendChild(replyEl);
      const finish = () => {
        if (s.statusKey) panel.appendChild(el("p", "status-msg", tr(STATUS_KEYS[s.statusKey])));
        // Staying on the scene afterwards — the player still needs to
        // visit an NPC or retire, exactly like main.py always running the
        // event phase before the NPC phase.
        panel.appendChild(continueButton(tr(UI_STRINGS.continueBtn), () => setScreen({ kind: "scene" })));
      };
      if (s.animate) {
        typeText(replyEl, tr(s.chosenOpt.reply), finish, panel);
      } else {
        setStatic(replyEl, tr(s.chosenOpt.reply));
        finish();
      }
    }
  }

  function paintNpcModal() {
    const s = screen;
    const panel = openModal();
    panel.appendChild(el("div", "modal-eyebrow", tr(UI_STRINGS.npcEyebrow)));
    panel.appendChild(el("div", "modal-title", tr(NPC_DATA[s.name].name)));
    panel.appendChild(metaRow(s.metaSnapshot));
    const p = el("p", "modal-text");
    panel.appendChild(p);

    if (s.stage === "choice") {
      const finish = () => panel.appendChild(makeChoiceButtons(s.diag.options, chooseNpc));
      if (s.animate) {
        typeText(p, tr(s.diag.situation), finish, panel);
      } else {
        setStatic(p, tr(s.diag.situation));
        finish();
      }
    } else {
      setStatic(p, tr(s.diag.situation));
      const replyEl = el("p", "modal-reply");
      panel.appendChild(replyEl);
      const finish = () => {
        if (s.statusKey) panel.appendChild(el("p", "status-msg", tr(STATUS_KEYS[s.statusKey])));
        // A visit always ends the day, matching main.py's single
        // NPC-interaction-per-day flow.
        panel.appendChild(continueButton(tr(UI_STRINGS.continueBtn), endDay));
      };
      if (s.animate) {
        typeText(replyEl, tr(s.chosenOpt.reply), finish, panel);
      } else {
        setStatic(replyEl, tr(s.chosenOpt.reply));
        finish();
      }
    }
  }

  /* --- End of day — main.py line 166 --- */

  function endDay() {
    const isLastDay = state.day >= TOTAL_DAYS;
    setScreen({ kind: "endDayModal", quote: randChoice(END_DAY_QUOTES), isLastDay, animate: true });
  }

  function paintEndDayModal() {
    const s = screen;
    const panel = openModal();
    panel.appendChild(el("div", "modal-eyebrow", tr(UI_STRINGS.endDayEyebrow)));
    const p = el("p", "modal-text story-quote");
    panel.appendChild(p);
    const finish = () => {
      panel.appendChild(continueButton(tr(s.isLastDay ? UI_STRINGS.seeDawnBtn : UI_STRINGS.nextDayBtn), () => {
        if (s.isLastDay) {
          decideFinal();
        } else {
          state.day += 1;
          startDay();
        }
      }));
    };
    if (s.animate) {
      typeText(p, tr(s.quote), finish, panel);
    } else {
      setStatic(p, tr(s.quote));
      finish();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Final judgment — main.py lines 169-252                            */
  /* ---------------------------------------------------------------- */

  function decideFinal() {
    if (state.hasArmy && state.hasRelic) {
      setScreen({ kind: "finalJudgment", animate: true });
    } else {
      setScreen({ kind: "standardEndingIntro", animate: true });
    }
  }

  function paintFinalJudgment() {
    const s = screen;
    clearStage();
    closeModal();
    const card = el("div", "story-card");
    card.appendChild(el("div", "story-title", tr(UI_STRINGS.finalTitle)));
    stageEl.appendChild(card);
    const p = el("p", "story-content");
    card.appendChild(p);

    const finish = () => {
      const list = el("div", "choice-list");
      const acts = [
        { key: "1", labelKey: UI_STRINGS.strikeLabel },
        { key: "2", labelKey: UI_STRINGS.vanishLabel },
        { key: "3", labelKey: UI_STRINGS.waitLabel }
      ];
      acts.forEach((a) => {
        const btn = el("button", "choice-btn");
        btn.appendChild(el("span", "choice-key", a.key));
        btn.appendChild(el("span", "choice-text", tr(a.labelKey)));
        btn.addEventListener("click", () => handleFinalAct(a.key));
        list.appendChild(btn);
      });
      card.appendChild(list);
    };
    if (s.animate) {
      typeText(p, tr(UI_STRINGS.finalPrompt), finish, stageEl);
    } else {
      setStatic(p, tr(UI_STRINGS.finalPrompt));
      finish();
    }
  }

  function handleFinalAct(act) {
    if (act === "1") {
      setScreen({ kind: "ending", endingKey: "SS" });
    } else if (act === "2") {
      setScreen({ kind: "ending", endingKey: "A+" });
    } else {
      // "3. WAIT" does NOT auto-resolve — it falls through to the standard
      // conquest-threshold ending, exactly like main.py (only 1 and 2 exit
      // early; 3 just breaks out of that while-loop into the code below).
      setScreen({ kind: "standardEndingIntro", animate: true });
    }
  }

  function paintStandardEndingIntro() {
    const s = screen;
    clearStage();
    closeModal();
    const card = el("div", "story-card");
    const p = el("p", "story-content");
    card.appendChild(p);
    stageEl.appendChild(card);

    const finish = () => {
      let key;
      if (state.conquest >= 140) key = "A";
      else if (state.conquest >= 80) key = "B";
      else key = "C";
      setScreen({ kind: "ending", endingKey: key });
    };
    if (s.animate) {
      typeText(p, tr(UI_STRINGS.standardEndingIntro), finish, stageEl);
    } else {
      // A mere language-toggle repaint must not re-trigger the ending
      // transition — only the first (animated) pass does that.
      setStatic(p, tr(UI_STRINGS.standardEndingIntro));
    }
  }

  function paintEnding() {
    const s = screen;
    clearStage();
    closeModal();
    const ending = ENDINGS[s.endingKey];
    const card = el("div", `story-card ending-card ${ending.tone}`);
    card.appendChild(el("div", "ending-title", tr(ending.title)));
    tr(ending.text).split("\n\n").forEach((para) => {
      card.appendChild(el("p", "story-content", para));
    });
    const restart = el("button", "continue-btn", tr(UI_STRINGS.playAgainBtn));
    restart.addEventListener("click", () => setScreen({ kind: "intro" }));
    card.appendChild(restart);
    stageEl.appendChild(card);
  }

  /* ---------------------------------------------------------------- */
  /* Abandon control — replaces the CLI's "type exit to quit"          */
  /* ---------------------------------------------------------------- */

  abandonBtn.addEventListener("click", () => {
    if (confirm(tr(UI_STRINGS.abandonConfirm))) {
      setScreen({ kind: "intro" });
    }
  });

  /* ---------------------------------------------------------------- */
  /* Language toggle                                                    */
  /* ---------------------------------------------------------------- */

  langToggleBtn.addEventListener("click", () => {
    lang = lang === "en" ? "zh" : "en";
    // Repainting the current screen must not replay typewriter animation
    // or re-trigger any onDone transition — see setStatic()/the "animate"
    // flag threaded through every screen above.
    screen = Object.assign({}, screen, { animate: false });
    paint();
  });

  paint();
})();
