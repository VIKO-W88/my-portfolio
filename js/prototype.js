const IMG_BASE = "../assets/familyflow/";
const SHEET_SCALE = 0.91; // .sheet { height: 91% } in prototype.css — still used for the
// voice-quick-create screenshot and the Categories/Time-zone/Assign-to popups, which
// remain screenshot-based this round. The New Event row list itself no longer uses this.

// Overlay-style scrollbars (macOS/iOS-like): the thumb is nearly invisible at
// rest and fades in only while the container is actively being scrolled, via
// the ".is-scrolling" class the CSS keys off (see prototype.css). A shared
// per-element timer clears the class ~1s after the last scroll event, rather
// than on scrollend (not yet supported in every engine this needs to run in).
// .home-scroll is excluded — it uses a custom thumb (see
// setupHomeScrollThumb() below) instead of the real scrollbar.
(function setupOverlayScrollbars() {
  const els = document.querySelectorAll(
    ".cal-today-timeline, .cal-overview-list, .ne-scroll, .repeat-scroll"
  );
  els.forEach((el) => {
    let fadeTimer = null;
    el.addEventListener(
      "scroll",
      () => {
        el.classList.add("is-scrolling");
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => el.classList.remove("is-scrolling"), 1000);
      },
      { passive: true }
    );
  });
})();

// Home's scroll thumb is a plain absolutely-positioned bar, not the real
// scrollbar — per an explicit request to make it visually shorter than the
// true content/viewport ratio, which a real scrollbar's thumb size can't be
// overridden to do (it always reflects actual content length). Height is
// set to half the true ratio; position/travel otherwise mirror what a
// native thumb would do, confined to the space below the pinned header.
function updateHomeScrollThumb() {
  const scrollEl = document.getElementById("homeScroll");
  const stickyEl = document.getElementById("homeSticky");
  const thumbEl = document.getElementById("homeScrollThumb");
  if (!scrollEl || !stickyEl || !thumbEl) return;
  const trackHeight = scrollEl.clientHeight;
  const contentHeight = scrollEl.scrollHeight;
  if (trackHeight === 0 || contentHeight <= trackHeight) {
    thumbEl.style.display = "none";
    return;
  }
  thumbEl.style.display = "block";
  const trueRatio = trackHeight / contentHeight;
  const thumbHeight = Math.max(trackHeight * trueRatio * 0.5, 24);
  const maxScroll = contentHeight - trackHeight;
  const progress = maxScroll > 0 ? scrollEl.scrollTop / maxScroll : 0;
  const travel = trackHeight - thumbHeight;
  thumbEl.style.height = thumbHeight + "px";
  thumbEl.style.top = stickyEl.offsetHeight + progress * travel + "px";
}

(function setupHomeScrollThumb() {
  const scrollEl = document.getElementById("homeScroll");
  const thumbEl = document.getElementById("homeScrollThumb");
  let fadeTimer = null;
  scrollEl.addEventListener(
    "scroll",
    () => {
      updateHomeScrollThumb();
      thumbEl.classList.add("is-scrolling");
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => thumbEl.classList.remove("is-scrolling"), 1000);
    },
    { passive: true }
  );
  window.addEventListener("resize", updateHomeScrollThumb);
})();

/* ---------------------------------------------------------------- */
/* Shared DOM helpers                                                */
/* ---------------------------------------------------------------- */

function makeHotspot(l, t, w, h, onClick) {
  const btn = document.createElement("button");
  btn.className = "hotspot";
  btn.style.left = l + "%";
  btn.style.top = t + "%";
  btn.style.width = w + "%";
  btn.style.height = h + "%";
  btn.setAttribute("aria-label", "交互区域");
  btn.addEventListener("click", onClick);
  return btn;
}

// Single real component — no separate mask layer. Sized generously enough to
// reliably cover the screenshot's own baked checkbox artwork underneath, while
// staying well inside the gap to neighboring rows (checked against measured
// row spacing so it can't bleed into the row above/below).
function makeCheckbox(box) {
  const el = document.createElement("div");
  el.className = "proto-checkbox" + (taskChecked[box.taskIndex] ? " checked" : " unchecked");
  el.style.left = box.l + "%";
  el.style.top = box.t + "%";
  el.style.width = box.w + "%";
  el.style.height = box.h + "%";
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    taskChecked[box.taskIndex] = !taskChecked[box.taskIndex];
    el.classList.toggle("checked", taskChecked[box.taskIndex]);
    el.classList.toggle("unchecked", !taskChecked[box.taskIndex]);
  });
  return el;
}

const screenLabelEl = document.getElementById("screenLabel");
function setLabel(text) {
  screenLabelEl.textContent = text;
}

/* ---------------------------------------------------------------- */
/* PAGE layer (full-screen screens: home, calendar, tasks, etc.)     */
/* ---------------------------------------------------------------- */

const pgoto = (target) => ({ type: "goto", target });
const pback = { type: "home" }; // "<" always returns straight to Home (per spec 7.4)
const BACK_ARROW = { l: 4, t: 4.5, w: 11, h: 5.5, action: pback };


const pages = {
  // Home is entirely real HTML now (see renderHomeTop below)
  // — the generic pageImg/hotspots/fabIconPos machinery below is never
  // touched for it, so this entry only needs the label devJump() reads.
  home: {
    label: "首页",
  },
  "home-menu": {
    image: "home-menu.png",
    label: "首页 · 更多菜单",
    hotspots: [{ l: 0, t: 0, w: 100, h: 100, action: pback }],
  },
  // Today and Overview are entirely real HTML now (see calTodayPage /
  // calOverviewPage and their render* functions below) — the generic
  // pageImg/hotspots machinery is never touched for either, so these
  // entries only need the label devJump()/setLabel() read. The month-grid
  // "expanded" view used to be a separate navigable page reached by a fake
  // "goto" hotspot on the drag-handle bar; it's now an in-place expand
  // toggle on the same page (calTodayExpanded/calOverviewExpanded in
  // renderCalendarTodayHeader/renderCalendarOverviewHeader), matching the
  // Figma source where the month grid is a drag-state of one screen, not
  // a separate frame reached by navigation.
  "calendar-today": {
    label: "日历 · 今日",
  },
  "calendar-overview": {
    label: "日历 · 总览",
  },
  // Tasks is entirely real HTML now (see renderTasksPage() below) — the
  // isTasks branch in renderPage() bypasses the generic pageImg/hotspots
  // system entirely, same as home/calendar-today/calendar-overview above.
  tasks: {
    label: "任务",
  },
  // Notification is entirely real HTML now (see renderNotifPage() below) —
  // the isNotif branch in renderPage() bypasses the generic pageImg/hotspots
  // system, same as home/tasks/calendar-today/calendar-overview above.
  notifications: {
    label: "通知",
  },
  members: {
    image: "members.png",
    label: "家庭成员",
    hotspots: [BACK_ARROW],
  },
};

let taskChecked = [true, true, false, false];
let pageStack = [];
let currentPage = "home";

const pageImgEl = document.getElementById("pageImg");
const pageHotspotsEl = document.getElementById("pageHotspots");

// Home's top row (avatar) sits ~11px higher in its own source frame than the
// back-arrow header used by every other page (measured directly: avatar top
// 97px vs. back-arrow circle top ~108px, of 1750). Home is the reference —
// nudge the other pages up to match it instead of moving home again.
// % here is height-relative (this sets pageImgEl's `top`), not the same
// basis as the width-relative padding-top on .home-sticky in prototype.css —
// see the comment there. Was -0.63 (nudged up, landing the baked-in back
// arrow at ~5.5% of screen height — nearly touching the Dynamic Island);
// 3.8 landed it at ~10%, matching Home's avatar clearance, but read as too
// much empty air below the Dynamic Island on tasks/notifications — halved
// to 1.9 to tighten that gap while it's still clear of the island (which
// itself sits at ~1.3% + ~4.4% height, so 1.9% still clears it).
// calendar-today/calendar-overview/tasks/notifications all bypass this now
// (real HTML, own header components) — members is the last page still on
// the generic screenshot system, so it's the only key actually read below.
const PAGE_TOP_OFFSET = {
  members: 1.9,
};

function renderPage(name) {
  currentPage = name;
  // Reaching any real page always means onboarding is over — every
  // renderPage() call site (init, hotspot nav, back button, drag-home)
  // relies on this instead of remembering to hide the carousel itself.
  carouselEl.classList.add("hidden");
  const isCalToday = name === "calendar-today";
  const isCalOverview = name === "calendar-overview";
  const isHome = name === "home";
  const isTasks = name === "tasks";
  const isNotif = name === "notifications";
  calTodayPageEl.classList.toggle("hidden", !isCalToday);
  calOverviewPageEl.classList.toggle("hidden", !isCalOverview);
  homePageEl.classList.toggle("hidden", !isHome);
  tasksPageEl.classList.toggle("hidden", !isTasks);
  notifPageEl.classList.toggle("hidden", !isNotif);
  appLayerEl.classList.toggle("hidden", isCalToday || isCalOverview || isHome || isTasks || isNotif);
  if (isTasks) {
    setLabel(pages[name].label);
    renderTasksPage();
    if (!fabDragged) {
      fabPos = { left: 77.36, top: 85.07 };
      placeFab();
    }
    updateFabVisibility();
    return;
  }
  if (isNotif) {
    setLabel(pages[name].label);
    renderNotifPage();
    updateFabVisibility(); // Notification isn't in FAB_PAGES, so this just hides it
    return;
  }
  if (isCalToday) {
    setLabel(pages[name].label);
    calTodayExpanded = false; // always land on the collapsed week-strip view
    renderCalendarTodayHeader();
    renderCalendarTodayTimeline();
    if (!fabDragged) {
      fabPos = { left: 78.24, top: 85.47 };
      placeFab();
    }
    updateFabVisibility();
    return;
  }
  if (isCalOverview) {
    setLabel(pages[name].label);
    calOverviewExpanded = false; // always land on the collapsed week-strip view
    renderCalendarOverviewHeader();
    renderCalendarOverviewList();
    if (!fabDragged) {
      fabPos = { left: 75.01, top: 84.8 };
      placeFab();
    }
    updateFabVisibility();
    return;
  }
  if (isHome) {
    setLabel(pages[name].label);
    renderHomeTop();
    if (!fabDragged) {
      fabPos = { left: 77.36, top: 85.07 };
      placeFab();
    }
    updateFabVisibility();
    return;
  }
  const page = pages[name];
  pageImgEl.src = IMG_BASE + page.image;
  // Hotspots/checkboxes are raw percentages against the *unshifted* .app-layer
  // box, same reference frame as the image's own baked content — so the
  // hotspot layer needs the same top shift as the image, or every hotspot
  // and checkbox drifts out of alignment with what's now underneath it.
  // .hotspot-layer's CSS is `inset: 0` (implies bottom:0 too) — overriding
  // only `top` inline leaves bottom pinned, so the box *shrinks* by the
  // offset instead of shifting down, which then rescales every hotspot's %
  // against a shorter box. Explicit height:100% (like .app-layer img already
  // has) keeps its height correct while still moving with `top`.
  const pageTopOffset = (PAGE_TOP_OFFSET[name] || 0) + "%";
  pageImgEl.style.top = pageTopOffset;
  pageHotspotsEl.style.top = pageTopOffset;
  pageHotspotsEl.style.height = "100%";
  setLabel(page.label);
  pageHotspotsEl.innerHTML = "";
  page.hotspots.forEach((h) => {
    pageHotspotsEl.appendChild(
      makeHotspot(h.l, h.t, h.w, h.h, () => {
        if (h.action.type === "goto") {
          pageStack.push(currentPage);
          renderPage(h.action.target);
        } else if (h.action.type === "home") {
          pageStack = [];
          renderPage("home");
        } else if (h.action.type === "openSheet") {
          openSheet();
        } else if (h.action.type === "openAvatar") {
          openAvatarPopover();
        }
      })
    );
  });
  (page.checkboxes || []).forEach((box) => pageHotspotsEl.appendChild(makeCheckbox(box)));
  // The screenshot itself still has its own baked "+" icon drawn in — mask it
  // so only the one real, draggable .fab-add button is ever visible (fixes the
  // "ghosting" from two unaligned plus-icons stacked on top of each other).
  if (page.fabIconPos) {
    const m = page.fabIconPos;
    const mask = document.createElement("div");
    mask.className = "fab-icon-mask";
    mask.style.left = m.l + "%";
    mask.style.top = m.t + "%";
    mask.style.width = m.w + "%";
    mask.style.height = m.h + "%";
    pageHotspotsEl.appendChild(mask);
  }
  if (!fabDragged && page.fabDefaultPos) {
    fabPos = { left: page.fabDefaultPos.left, top: page.fabDefaultPos.top };
    placeFab();
  }
  updateFabVisibility();
}

function goToPage(name) {
  pageStack.push(currentPage);
  renderPage(name);
}

/* ---------------------------------------------------------------- */
/* Avatar popover (Account) — compact card, home page stays visible  */
/* ---------------------------------------------------------------- */

const avatarBackdropEl = document.getElementById("avatarBackdrop");
const avatarPopoverEl = document.getElementById("avatarPopover");
const avatarPopoverImgEl = document.getElementById("avatarPopoverImg");
const avatarPopoverHotspotsEl = document.getElementById("avatarPopoverHotspots");

// account-popover.png is a dedicated crop (576×760px) containing only this card's
// own content, pixel-measured directly from that asset — its container's
// aspect-ratio matches exactly, so these percentages need no further conversion.
function openAvatarPopover() {
  avatarPopoverImgEl.src = IMG_BASE + "account-popover.png";
  avatarPopoverHotspotsEl.innerHTML = "";
  const add = (l, t, w, h, onClick) => avatarPopoverHotspotsEl.appendChild(makeHotspot(l, t, w, h, onClick));
  add(86, 14, 13, 8, closeAvatarPopover); // X close, px(515,120)-(566,171) of 576x760
  add(35, 49, 34, 8, () => {
    // Invite members, px(218,387)-(393,434) of 576x760
    closeAvatarPopover();
    goToPage("members");
  });
  avatarBackdropEl.classList.add("open");
  avatarPopoverEl.classList.add("open");
  updateFabVisibility();
}

function closeAvatarPopover() {
  avatarBackdropEl.classList.remove("open");
  avatarPopoverEl.classList.remove("open");
  updateFabVisibility();
}

/* ---------------------------------------------------------------- */
/* Settings popover — real HTML, sized to its own content (per spec  */
/* section 5: a small popover like Account, not a full-page screen). */
/* ---------------------------------------------------------------- */

const settingsBackdropEl = document.getElementById("settingsBackdrop");
const settingsPopoverEl = document.getElementById("settingsPopover");

const SETTINGS_ROWS = [
  {
    label: "Settings",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#5b3e8e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>',
  },
  {
    label: "Offline pages",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#5b3e8e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="M7 10l5 5 5-5"></path><path d="M4 19h16"></path></svg>',
  },
  {
    label: "Help and support",
    // Bare question mark, no own circle — the row's shared .icon wrapper
    // (border-radius:50%) already draws the circle; this used to be a
    // self-contained help-circle icon (its own <circle> plus the wrapper's
    // border), which doubled up into two concentric rings. The glyph itself
    // was originally sized to sit inside that now-removed r=9 circle, so it
    // read much smaller than the gear/arrow icons beside it (which fill
    // most of the 24x24 box) — scaled 1.8x about the icon's own center to
    // match their visual weight.
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#5b3e8e" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(12,12) scale(1.8) translate(-12,-12)" stroke-width="1.1"><path d="M9.5 9a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 4"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></g></svg>',
  },
];

function openSettingsPopover() {
  if (!settingsPopoverEl.dataset.built) {
    settingsPopoverEl.dataset.built = "1";
    SETTINGS_ROWS.forEach((r) => {
      const row = document.createElement("div");
      row.className = "settings-row";
      row.innerHTML = `<span class="icon">${r.icon}</span><span class="label">${r.label}</span>`;
      settingsPopoverEl.appendChild(row);
    });
  }
  settingsBackdropEl.classList.add("open");
  settingsPopoverEl.classList.add("open");
  updateFabVisibility();
}

function closeSettingsPopover() {
  settingsBackdropEl.classList.remove("open");
  settingsPopoverEl.classList.remove("open");
  updateFabVisibility();
}

/* ---------------------------------------------------------------- */
/* Bottom sheet (New Event) — REAL HTML/CSS, not a screenshot with a */
/* floating hotspot overlay. Every row's click handler is bound      */
/* directly to that row's own DOM element.                           */
/* ---------------------------------------------------------------- */

const sheetBackdropEl = document.getElementById("sheetBackdrop");
const sheetEl = document.getElementById("sheet");
const neScrollEl = document.getElementById("neScroll");
const neCloseEl = document.getElementById("neClose");
const neConfirmEl = document.getElementById("neConfirm");
const neDateRowEl = document.getElementById("neDateRow");
const neDateExpandEl = document.getElementById("neDateExpand");
const neDateChevronEl = document.getElementById("neDateChevron");
const neDateValueEl = document.getElementById("neDateValue");
const neTimeRowEl = document.getElementById("neTimeRow");
const neTimeExpandEl = document.getElementById("neTimeExpand");
const neTimeChevronEl = document.getElementById("neTimeChevron");
const neTimeValueEl = document.getElementById("neTimeValue");
const neTimezoneRowEl = document.getElementById("neTimezoneRow");
const neRepeatRowEl = document.getElementById("neRepeatRow");
const neRepeatValueEl = document.getElementById("neRepeatValue");
const neTaskRowEl = document.getElementById("neTaskRow");
const neDetailsRowEl = document.getElementById("neDetailsRow");
const neAssignRowEl = document.getElementById("neAssignRow");
const micFabEl = document.getElementById("micFab");
const repeatBackdropEl = document.getElementById("repeatBackdrop");
const repeatPopupEl = document.getElementById("repeatPopup");
const voiceLayerEl = document.getElementById("voiceLayer");
const sheetImgEl = document.getElementById("sheetImg");
const sheetHotspotsEl = document.getElementById("sheetHotspots");

let sheetOpen = false;
let dateOpen = false;
let timeOpen = false;
let voiceOpen = false;

function sheetBox(raw) {
  return { l: raw.l, t: raw.t / SHEET_SCALE, w: raw.w, h: raw.h / SHEET_SCALE };
}

function openSheet() {
  sheetOpen = true;
  dateOpen = false;
  timeOpen = false;
  voiceOpen = false;
  neDateExpandEl.classList.remove("open");
  neDateChevronEl.classList.remove("down");
  neTimeExpandEl.classList.remove("open");
  neTimeChevronEl.classList.remove("down");
  voiceLayerEl.classList.remove("active");
  neScrollEl.scrollTop = 0;
  updateMicVisibility();
  setLabel("新建事件");
  sheetBackdropEl.classList.add("open");
  sheetEl.classList.add("open");
  updateFabVisibility();
}

function closeSheet() {
  sheetOpen = false;
  closePopup();
  closeRepeatPopup();
  updateFabVisibility();
  sheetBackdropEl.classList.remove("open");
  sheetEl.classList.remove("open");
}

function updateMicVisibility() {
  micFabEl.classList.toggle("active", sheetOpen && !dateOpen && !timeOpen && !voiceOpen);
}

function toggleDateExpand() {
  dateOpen = !dateOpen;
  if (dateOpen) {
    timeOpen = false;
    neTimeExpandEl.classList.remove("open");
    neTimeChevronEl.classList.remove("down");
    if (!dateBuilt) buildDateGrid();
    updateDateValue();
  }
  neDateExpandEl.classList.toggle("open", dateOpen);
  neDateChevronEl.classList.toggle("down", dateOpen);
  updateMicVisibility();
}

function toggleTimeExpand() {
  timeOpen = !timeOpen;
  if (timeOpen) {
    dateOpen = false;
    neDateExpandEl.classList.remove("open");
    neDateChevronEl.classList.remove("down");
    if (!wheelBuilt) buildWheel();
  }
  neTimeExpandEl.classList.toggle("open", timeOpen);
  neTimeChevronEl.classList.toggle("down", timeOpen);
  updateMicVisibility();
}

neCloseEl.addEventListener("click", closeSheet);
neConfirmEl.addEventListener("click", closeSheet);
neDateRowEl.addEventListener("click", toggleDateExpand);
neTimeRowEl.addEventListener("click", toggleTimeExpand);
neTimezoneRowEl.addEventListener("click", openTimezonePopup);
neRepeatRowEl.addEventListener("click", openRepeatPopup);
neTaskRowEl.addEventListener("click", openCategoryTypePopup);
neDetailsRowEl.addEventListener("click", openCategoryDetailsPopup);
// neAssignRowEl's click is bound further down, once assignPopup/openAssignPopup exist.

/* ---------------------------------------------------------------- */
/* Real inline date picker (September 2025)                          */
/* ---------------------------------------------------------------- */

let dateBuilt = false;
let selectedDay = 9;
const dateWeekdayRowEl = document.getElementById("dateWeekdayRow");
const dateDayGridEl = document.getElementById("dateDayGrid");

const DATE_CELLS = [
  { day: null },
  { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 },
  { day: 7 }, { day: 8 }, { day: 9 }, { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 },
  { day: 14 }, { day: 15 }, { day: 16 }, { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 },
  { day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 },
  { day: 28 }, { day: 29 }, { day: 30 },
  { day: 1, other: true }, { day: 2, other: true }, { day: 3, other: true }, { day: 4, other: true },
];

function buildDateGrid() {
  dateBuilt = true;
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d) => {
    const span = document.createElement("span");
    span.textContent = d;
    dateWeekdayRowEl.appendChild(span);
  });
  DATE_CELLS.forEach((cell) => {
    const wrap = document.createElement("div");
    wrap.className = "day-cell" + (cell.other ? " other-month" : "");
    if (cell.day !== null) {
      const span = document.createElement("span");
      span.textContent = cell.day;
      wrap.appendChild(span);
      if (!cell.other) {
        wrap.addEventListener("click", () => {
          selectedDay = cell.day;
          refreshDateGrid();
          updateDateValue();
        });
      }
    }
    dateDayGridEl.appendChild(wrap);
  });
  refreshDateGrid();
}

function refreshDateGrid() {
  Array.from(dateDayGridEl.children).forEach((wrap, i) => {
    const cell = DATE_CELLS[i];
    wrap.classList.toggle("selected", !cell.other && cell.day === selectedDay);
  });
}

function updateDateValue() {
  neDateValueEl.textContent = `Sep ${selectedDay}, 2025`;
}

/* ---------------------------------------------------------------- */
/* Time scroll-wheel (real drag + inertia, real inline content)      */
/* ---------------------------------------------------------------- */

let wheelBuilt = false;
const wheelHourEl = document.getElementById("wheelHour");
const wheelMinuteEl = document.getElementById("wheelMinute");
const wheelAmpmEl = document.getElementById("wheelAmpm");

const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const WHEEL_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const WHEEL_AMPM = ["AM", "PM"];

function fillWheelCol(el, items, defaultIndex) {
  el.innerHTML = "";
  el.appendChild(Object.assign(document.createElement("div"), { className: "wheel-spacer" }));
  items.forEach((v) => {
    const item = document.createElement("div");
    item.className = "wheel-item";
    item.textContent = v;
    el.appendChild(item);
  });
  el.appendChild(Object.assign(document.createElement("div"), { className: "wheel-spacer" }));
  requestAnimationFrame(() => {
    const itemH = el.clientHeight / 3;
    el.scrollTop = defaultIndex * itemH;
  });
}

function buildWheel() {
  wheelBuilt = true;
  fillWheelCol(wheelHourEl, WHEEL_HOURS, 0);
  fillWheelCol(wheelMinuteEl, WHEEL_MINUTES, 9);
  fillWheelCol(wheelAmpmEl, WHEEL_AMPM, 1);
  [wheelHourEl, wheelMinuteEl, wheelAmpmEl].forEach(makeWheelDraggable);
  updateTimeValue();
}

function nearestIndex(el) {
  const itemH = el.clientHeight / 3;
  return itemH ? Math.round(el.scrollTop / itemH) : 0;
}

function updateTimeValue() {
  const h = WHEEL_HOURS[Math.min(nearestIndex(wheelHourEl), WHEEL_HOURS.length - 1)] ?? 1;
  const m = WHEEL_MINUTES[Math.min(nearestIndex(wheelMinuteEl), WHEEL_MINUTES.length - 1)] ?? "00";
  const ap = WHEEL_AMPM[Math.min(nearestIndex(wheelAmpmEl), WHEEL_AMPM.length - 1)] ?? "AM";
  neTimeValueEl.textContent = `${h}:${m} ${ap}`;
}

// Native overflow:scroll only responds to touch/trackpad gestures, not a plain
// mouse click-drag — so on desktop the wheel looked "stuck". Drive scrollTop by
// hand from pointer events, then apply a short momentum decay and snap on release.
function makeWheelDraggable(el) {
  let dragging = false;
  let startY = 0;
  let startTop = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;

  el.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    startTop = el.scrollTop;
    lastY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    el.style.scrollSnapType = "none";
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    el.scrollTop = startTop - (e.clientY - startY);
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastT = now;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    let v = -velocity * 16;
    const step = () => {
      if (Math.abs(v) > 0.5) {
        el.scrollTop += v;
        v *= 0.92;
        requestAnimationFrame(step);
      } else {
        el.style.scrollSnapType = "y mandatory";
        const itemH = el.clientHeight / 3;
        el.scrollTo({ top: Math.round(el.scrollTop / itemH) * itemH, behavior: "smooth" });
        updateTimeValue();
      }
    };
    requestAnimationFrame(step);
    updateTimeValue();
  };
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
}

/* ---------------------------------------------------------------- */
/* Repeat dropdown — now a real, scrollable text list                */
/* ---------------------------------------------------------------- */

const REPEAT_OPTIONS = [
  "Never", "Daily", "Weekdays", "Weekends", "Weekly", "Fortnightly",
  "Monthly", "Every 3 days", "Every 3 Months", "Every 6 Months", "Yearly", "Custom",
];
let selectedRepeat = "Never";
const repeatScrollEl = document.getElementById("repeatScroll");

function buildRepeatList() {
  repeatScrollEl.innerHTML = "";
  REPEAT_OPTIONS.forEach((opt) => {
    const item = document.createElement("div");
    item.className = "repeat-item" + (opt === selectedRepeat ? " selected" : "");
    const check = document.createElement("span");
    check.className = "repeat-check";
    const label = document.createElement("span");
    label.textContent = opt;
    item.appendChild(check);
    item.appendChild(label);
    item.addEventListener("click", () => {
      selectedRepeat = opt;
      neRepeatValueEl.textContent = opt;
      closeRepeatPopup();
    });
    repeatScrollEl.appendChild(item);
  });
}

function openRepeatPopup() {
  buildRepeatList();
  repeatBackdropEl.classList.add("open");
  repeatPopupEl.classList.add("open");
}
function closeRepeatPopup() {
  repeatBackdropEl.classList.remove("open");
  repeatPopupEl.classList.remove("open");
}

/* ---------------------------------------------------------------- */
/* Voice quick-create (still the source screenshot for this piece)   */
/* ---------------------------------------------------------------- */

const VOICE_CLOSE_RAW = { l: 4, t: 8.5, w: 10, h: 5.5 };
const VOICE_CONFIRM_RAW = { l: 82, t: 8, w: 14, h: 6 };

function openVoice() {
  voiceOpen = true;
  sheetImgEl.src = IMG_BASE + "new-event-voice.png";
  sheetHotspotsEl.innerHTML = "";
  const add = (raw, onClick) => {
    const b = sheetBox(raw);
    sheetHotspotsEl.appendChild(makeHotspot(b.l, b.t, b.w, b.h, onClick));
  };
  add(VOICE_CLOSE_RAW, closeVoice);
  add(VOICE_CONFIRM_RAW, closeSheet);
  add({ l: 13, t: 85, w: 13, h: 6.5 }, closeSheet);
  add({ l: 71, t: 85, w: 14, h: 6.5 }, closeVoice);
  voiceLayerEl.classList.add("active");
  updateMicVisibility();
}

function closeVoice() {
  voiceOpen = false;
  voiceLayerEl.classList.remove("active");
  updateMicVisibility();
}

micFabEl.addEventListener("click", openVoice);

/* ---------------------------------------------------------------- */
/* Popup panel (Categories · Task type / Categories · Details /      */
/* Time Zone / Assign to) — real HTML now, same .assign-popup panel  */
/* pattern shared by all four (one .cal-back-btn header style, one   */
/* shared backdrop). Was a screenshot + invisible hotspot layer.     */
/* ---------------------------------------------------------------- */

const popupBackdropEl = document.getElementById("popupBackdrop");
const categoryTypePopupEl = document.getElementById("categoryTypePopup");
const categoryTypeListEl = document.getElementById("categoryTypeList");
const categoryDetailsPopupEl = document.getElementById("categoryDetailsPopup");
const placesToggleEl = document.getElementById("placesToggle");
const timezonePopupEl = document.getElementById("timezonePopup");
const timezoneListEl = document.getElementById("timezoneList");

// Every panel this shared backdrop/flag can belong to — closePopup() doesn't
// need to know which one is actually open, just remove "open" from all of
// them (idempotent: a panel that wasn't open has nothing to remove).
const ALL_POPUP_PANELS = [categoryTypePopupEl, categoryDetailsPopupEl, timezonePopupEl];

let popupOpen = false;
let selectedCategory = "task"; // 'task' | 'event'
let placesOn = false;

const CATEGORY_TYPE_ROWS = [
  { key: "task", label: "Task", icon: "ico-list" },
  { key: "event", label: "Event", icon: "ico-calendar" },
];

function renderCategoryTypeList() {
  categoryTypeListEl.innerHTML = "";
  CATEGORY_TYPE_ROWS.forEach((r) => {
    const row = document.createElement("div");
    row.className = "cat-row" + (selectedCategory === r.key ? " selected" : "");
    row.innerHTML = `<span class="cat-row-icon ${r.icon}"></span><span class="cat-row-label">${r.label}</span><span class="cat-row-check"></span>`;
    row.addEventListener("click", () => {
      selectedCategory = r.key;
      closePopup();
    });
    categoryTypeListEl.appendChild(row);
  });
  // "Add Category" is decorative in the source design (no destination to add
  // a new category to) — kept as a non-interactive row, not wired to a click.
  const addRow = document.createElement("div");
  addRow.className = "cat-row";
  addRow.style.cursor = "default";
  addRow.innerHTML = `<span class="cat-row-icon ico-add"></span><span class="cat-row-label">Add Category</span>`;
  categoryTypeListEl.appendChild(addRow);
}

function openCategoryTypePopup() {
  popupOpen = true;
  renderCategoryTypeList();
  popupBackdropEl.classList.add("open");
  categoryTypePopupEl.classList.add("open");
}

function openCategoryDetailsPopup() {
  popupOpen = true;
  placesToggleEl.classList.toggle("on", placesOn);
  popupBackdropEl.classList.add("open");
  categoryDetailsPopupEl.classList.add("open");
}

placesToggleEl.addEventListener("click", () => {
  placesOn = !placesOn;
  placesToggleEl.classList.toggle("on", placesOn);
});

const TIMEZONE_OPTIONS = [
  { name: "Sydney, Australia", offset: "Eastern Australia Time (GMT+11)" },
  { name: "Sydney, Canada", offset: "Atlantic Time (GMT-4)" },
];

function renderTimezoneList() {
  if (timezoneListEl.dataset.built) return; // static mock data, build once
  timezoneListEl.dataset.built = "1";
  TIMEZONE_OPTIONS.forEach((tz) => {
    const row = document.createElement("div");
    row.className = "tz-row";
    row.innerHTML = `<div class="tz-row-name">${tz.name}</div><div class="tz-row-offset">${tz.offset}</div>`;
    row.addEventListener("click", () => {
      neTimezoneRowEl.querySelector(".ne-row-value").textContent = tz.name;
      closePopup();
    });
    timezoneListEl.appendChild(row);
  });
}

function openTimezonePopup() {
  popupOpen = true;
  renderTimezoneList();
  popupBackdropEl.classList.add("open");
  timezonePopupEl.classList.add("open");
}

function closePopup() {
  popupOpen = false;
  popupBackdropEl.classList.remove("open");
  ALL_POPUP_PANELS.forEach((el) => el.classList.remove("open"));
  assignPopupEl.classList.remove("open");
}

document.getElementById("categoryTypeBackBtn").addEventListener("click", closePopup);
document.getElementById("categoryDetailsBackBtn").addEventListener("click", closePopup);
document.getElementById("timezoneBackBtn").addEventListener("click", closePopup);

/* click outside to dismiss */
popupBackdropEl.addEventListener("click", closePopup);

/* ---------------------------------------------------------------- */
/* Assign To — real DOM rows, bound directly like the New Event form */
/* ---------------------------------------------------------------- */

const assignPopupEl = document.getElementById("assignPopup");
const assignBackBtnEl = document.getElementById("assignBackBtn");
const assignListEl = document.getElementById("assignList");

const ASSIGN_MEMBERS = [
  { key: "zboh", name: "Z Boh", role: "You" },
  { key: "viw", name: "VI W", role: "Mon" },
  { key: "whao", name: "W Hao", role: "Kid" },
];
let assignedMembers = { zboh: true, viw: false, whao: false };

function openAssignPopup() {
  popupOpen = true;
  assignListEl.innerHTML = "";
  ASSIGN_MEMBERS.forEach((m) => {
    const row = document.createElement("div");
    row.className = "assign-row" + (assignedMembers[m.key] ? " selected" : "");
    row.innerHTML =
      `<div class="assign-avatar">${m.name[0]}</div>` +
      `<div class="assign-info"><div class="assign-name">${m.name}</div><div class="assign-role">${m.role}</div></div>` +
      `<span class="assign-check"></span>`;
    row.addEventListener("click", () => {
      assignedMembers[m.key] = !assignedMembers[m.key];
      row.classList.toggle("selected", assignedMembers[m.key]);
    });
    assignListEl.appendChild(row);
  });
  popupBackdropEl.classList.add("open");
  assignPopupEl.classList.add("open");
}

assignBackBtnEl.addEventListener("click", closePopup);
neAssignRowEl.addEventListener("click", openAssignPopup);
avatarBackdropEl.addEventListener("click", closeAvatarPopover);
settingsBackdropEl.addEventListener("click", closeSettingsPopover);
repeatBackdropEl.addEventListener("click", closeRepeatPopup);

/* ---------------------------------------------------------------- */
/* Onboarding carousel                                               */
/* ---------------------------------------------------------------- */

const carouselEl = document.getElementById("carousel");
const carouselTrackEl = document.getElementById("carouselTrack");
const carouselHotspotsEl = document.getElementById("carouselHotspots");
const appLayerEl = document.getElementById("appLayer");

/* ---------------------------------------------------------------- */
/* Calendar · Today — real HTML 24-hour timeline                     */
/* Header stays a cropped screenshot; the schedule below it is a     */
/* genuine scrollable grid with event cards positioned by real time  */
/* (minutes-from-midnight → px), not a static image.                 */
/* ---------------------------------------------------------------- */

const calTodayPageEl = document.getElementById("calTodayPage");
const calTodayHeaderBoxEl = document.getElementById("calTodayHeaderBox");
const calTodayTimelineEl = document.getElementById("calTodayTimeline");

const CAL_HOUR_H = 56; // px per hour row, matches .cal-today-hour-row height
const CAL_ALLDAY_H = 64; // px, matches .cal-today-allday height

// The drag-handle bar under the week strip expands it into a full month
// grid, in place — same page, same real timeline below, no navigation (per
// the Figma source, where the month grid is a drag-state of one "Calendar"
// frame, not a separate destination).
let calTodayExpanded = false;
let calOverviewExpanded = false;

// December mock month grid, shared by both Calendar headers' week-strip /
// expanded month view (buildCalHeader() below) — matches the Figma
// reference: Dec 1 falls on a Monday, "today" is the highlighted Fri Dec 5
// cell. { day, other } entries are next-month overflow days (greyed out,
// not clickable), same convention as DATE_CELLS in the New Event date
// picker above, which this reuses the .date-weekday-row/.date-day-grid/
// .day-cell CSS from rather than building a second grid component.
const CAL_TODAY_DAY = 5;
const CAL_MONTH_CELLS = [
  null, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31,
  { day: 1, other: true }, { day: 2, other: true }, { day: 3, other: true },
];

function buildCalWeekGrid(containerEl, expanded) {
  containerEl.innerHTML = "";
  const weekdayRow = document.createElement("div");
  weekdayRow.className = "date-weekday-row";
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d) => {
    const span = document.createElement("span");
    span.textContent = d;
    weekdayRow.appendChild(span);
  });
  containerEl.appendChild(weekdayRow);

  const grid = document.createElement("div");
  grid.className = "date-day-grid";
  (expanded ? CAL_MONTH_CELLS : CAL_MONTH_CELLS.slice(0, 7)).forEach((cell) => {
    const other = !!(cell && typeof cell === "object");
    const day = other ? cell.day : cell;
    const wrap = document.createElement("div");
    wrap.className = "day-cell" + (other ? " other-month" : "");
    if (day !== null) {
      const span = document.createElement("span");
      span.textContent = day;
      wrap.appendChild(span);
      if (!other && day === CAL_TODAY_DAY) wrap.classList.add("selected");
    }
    grid.appendChild(wrap);
  });
  containerEl.appendChild(grid);
}

// Builds one Calendar page's header (back arrow / title / tabs / week strip
// / drag-handle) — real DOM now, not a screenshot crop, so its text can take
// the iOS system font (a baked-in image never could). Button listeners are
// attached once (dataset.built guard, same convention as Home/New Event's
// real-HTML sections) since these are persistent elements, not a
// hotspot-layer that gets its innerHTML wiped and rebuilt on every visit —
// re-attaching on every renderPage() call would stack duplicate listeners.
function buildCalHeader(idPrefix, activeTab, expanded, onToggleExpand) {
  const boxEl = document.getElementById(idPrefix + "HeaderBox");
  const tabToday = document.getElementById(idPrefix + "TabToday");
  const tabOverview = document.getElementById(idPrefix + "TabOverview");
  const weekEl = document.getElementById(idPrefix + "Week");

  if (!boxEl.dataset.built) {
    boxEl.dataset.built = "1";
    document.getElementById(idPrefix + "BackBtn").addEventListener("click", () => {
      pageStack = [];
      renderPage("home");
    });
    if (activeTab !== "today") {
      tabToday.addEventListener("click", () => {
        pageStack.push(currentPage);
        renderPage("calendar-today");
      });
    }
    if (activeTab !== "overview") {
      tabOverview.addEventListener("click", () => {
        pageStack.push(currentPage);
        renderPage("calendar-overview");
      });
    }
    document.getElementById(idPrefix + "DragHandle").addEventListener("click", onToggleExpand);
  }
  tabToday.classList.toggle("active", activeTab === "today");
  tabOverview.classList.toggle("active", activeTab === "overview");
  buildCalWeekGrid(weekEl, expanded);
}

function renderCalendarTodayHeader() {
  buildCalHeader("calToday", "today", calTodayExpanded, () => {
    calTodayExpanded = !calTodayExpanded;
    buildCalWeekGrid(document.getElementById("calTodayWeek"), calTodayExpanded);
  });
}

// minutes-from-midnight for each event, taken directly from the Figma source
// ("Creative Coding, Lecture" 9:10–11:45am, "Management Event" 13:30–16:20).
const CAL_TODAY_EVENTS = [
  {
    startMin: 9 * 60 + 10,
    endMin: 11 * 60 + 45,
    title: "Creative Coding, Lecture",
    time: "9:10 - 11:45am",
    who: "Z Boh",
    avatar: "avatar-zboh.png",
    bg: "#e0dcef",
  },
  {
    startMin: 13 * 60 + 30,
    endMin: 16 * 60 + 20,
    title: "Management Event",
    time: "13:30 - 16:20 pm",
    who: "VI W",
    avatar: "avatar-viw.png",
    bg: "#f6bd60",
  },
  {
    startMin: 19 * 60,
    endMin: 20 * 60,
    title: "Group meeting",
    time: "19:00 - 20:00",
    who: "W Hao",
    avatar: "avatar-whao.png",
    bg: "#bfe3c4",
  },
];

function calTodayHourLabel(hour) {
  if (hour <= 12) return (hour === 0 ? 12 : hour) + " am";
  return hour + " pm";
}

// Nothing is ever scheduled before the 9:10am event in this mock data, so the
// 12am–8am stretch collapses into one compact band instead of 8 full-height
// empty rows — that's what puts "All day" and the first event on screen
// together without scrolling. Hours from CAL_COLLAPSE_END_HOUR on stay at the
// normal CAL_HOUR_H so real event timing still reads accurately.
const CAL_COLLAPSE_END_HOUR = 8;
const CAL_COLLAPSED_H = 44; // px, total height of the whole collapsed band

function calTodayYForMinute(min) {
  const hour = min / 60;
  if (hour <= CAL_COLLAPSE_END_HOUR) return (hour / CAL_COLLAPSE_END_HOUR) * CAL_COLLAPSED_H;
  return CAL_COLLAPSED_H + (hour - CAL_COLLAPSE_END_HOUR) * CAL_HOUR_H;
}

function renderCalendarTodayTimeline() {
  if (calTodayTimelineEl.dataset.built) return; // static mock data, build once
  calTodayTimelineEl.dataset.built = "1";

  // Sticky (see .cal-today-allday position:sticky) — stays pinned to the top
  // of the scrollable timeline as the hour grid scrolls underneath it.
  const allday = document.createElement("div");
  allday.className = "cal-today-allday";
  allday.innerHTML =
    '<div class="cal-today-allday-label">All day</div>' +
    '<div class="cal-today-allday-banner"><div class="bar"></div><div class="txt">Sign the document</div></div>';
  calTodayTimelineEl.appendChild(allday);

  const grid = document.createElement("div");
  grid.className = "cal-today-grid";
  grid.style.height = calTodayYForMinute(24 * 60) + "px";

  const collapsed = document.createElement("div");
  collapsed.className = "cal-today-collapsed";
  collapsed.style.height = CAL_COLLAPSED_H + "px";
  collapsed.innerHTML = '<span class="cal-today-collapsed-label">12 – 8 AM</span>';
  grid.appendChild(collapsed);

  for (let hour = CAL_COLLAPSE_END_HOUR; hour < 24; hour++) {
    const row = document.createElement("div");
    row.className = "cal-today-hour-row";
    row.innerHTML = `<span class="hour-label">${calTodayHourLabel(hour)}</span>`;
    grid.appendChild(row);
  }

  CAL_TODAY_EVENTS.forEach((ev) => {
    const top = calTodayYForMinute(ev.startMin);
    const height = calTodayYForMinute(ev.endMin) - top;
    const card = document.createElement("div");
    card.className = "cal-today-event";
    card.style.top = top + 2 + "px";
    card.style.height = Math.max(height - 4, 30) + "px";
    card.style.background = ev.bg;
    card.innerHTML =
      '<div class="bar"></div>' +
      `<div class="title">${ev.title}</div>` +
      `<div class="time">${ev.time}</div>` +
      `<div class="who"><img src="${IMG_BASE}${ev.avatar}" alt="">${ev.who}</div>`;
    grid.appendChild(card);
  });

  calTodayTimelineEl.appendChild(grid);
}

/* ---------------------------------------------------------------- */
/* Calendar · Overview — real HTML day-by-day agenda                 */
/* Different layout from Today (see figma-Familyflow/Calendar         */
/* over.png): grouped by day, each day either lists its events or     */
/* shows "Nothing planned" — not the same hour-grid component.        */
/* ---------------------------------------------------------------- */

const calOverviewPageEl = document.getElementById("calOverviewPage");
const calOverviewHeaderBoxEl = document.getElementById("calOverviewHeaderBox");
const calOverviewListEl = document.getElementById("calOverviewList");

// calOverviewExpanded is declared above, alongside calTodayExpanded.

function renderCalendarOverviewHeader() {
  buildCalHeader("calOverview", "overview", calOverviewExpanded, () => {
    calOverviewExpanded = !calOverviewExpanded;
    buildCalWeekGrid(document.getElementById("calOverviewWeek"), calOverviewExpanded);
  });
}

const OVERVIEW_DAYS = [
  {
    label: "Today - Friday 5 December",
    events: [
      { allDay: true, title: "Sign the document", bg: "#5b3e8e", text: "#fff", avatar: "avatar-me.png" },
      {
        time: "9:10 am",
        timeEnd: "11:45 am",
        title: "Creative Coding, Lecture",
        bg: "#e0dcef",
        text: "#222",
        avatar: "avatar-zboh.png",
      },
      {
        time: "13:30 pm",
        timeEnd: "16:20 pm",
        title: "Management Event",
        bg: "#f6bd60",
        text: "#222",
        avatar: "avatar-viw.png",
      },
      {
        time: "19:00 pm",
        timeEnd: "20:00 pm",
        title: "Group meeting",
        bg: "#96b877",
        text: "#222",
        avatar: "avatar-whao.png",
      },
    ],
  },
  { label: "Saturday 6 December", events: [] },
  { label: "Sunday 7 December", events: [] },
  { label: "Monday 8 December", events: [] },
  { label: "Tuesday 9 December", events: [] },
  { label: "Wednesday 10 December", events: [] },
  { label: "Thursday 11 December", events: [] },
];

function renderCalendarOverviewList() {
  if (calOverviewListEl.dataset.built) return; // static mock data, build once
  calOverviewListEl.dataset.built = "1";

  OVERVIEW_DAYS.forEach((day) => {
    const header = document.createElement("div");
    header.className = "cal-overview-day-header";
    header.textContent = day.label;
    calOverviewListEl.appendChild(header);

    if (day.events.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cal-overview-empty";
      empty.textContent = "Nothing planned";
      calOverviewListEl.appendChild(empty);
      return;
    }

    day.events.forEach((ev) => {
      const row = document.createElement("div");
      row.className = "cal-overview-event-row";
      const timeHtml = ev.allDay
        ? "All day"
        : `${ev.time}<span class="end">${ev.timeEnd}</span>`;
      row.innerHTML =
        `<div class="cal-overview-event-time">${timeHtml}</div>` +
        `<div class="cal-overview-event-bar" style="background:${ev.bg};color:${ev.text}">` +
        `<div class="bar"></div>` +
        `<div class="title">${ev.title}</div>` +
        `<img src="${IMG_BASE}${ev.avatar}" alt="">` +
        `</div>`;
      calOverviewListEl.appendChild(row);
    });
  });
}

/* ---------------------------------------------------------------- */
/* Home — real HTML top section                                      */
/* Avatar / invite / menu / stat cards / upcoming events are genuine  */
/* DOM elements with their own click handlers now, not a screenshot   */
/* with an invisible hotspot layer on top.                            */
/* ---------------------------------------------------------------- */

const homePageEl = document.getElementById("homePage");
const homeStickyEl = document.getElementById("homeSticky");
const homeScrollEl = document.getElementById("homeScroll");

const HOME_ICONS = {
  clipboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="18" rx="2"></rect><rect x="9" y="2" width="6" height="4" rx="1"></rect></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="16" y1="2" x2="16" y2="6"></line></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="6" r="1"></circle><line x1="8" y1="6" x2="21" y2="6"></line><circle cx="4" cy="12" r="1"></circle><line x1="8" y1="12" x2="21" y2="12"></line><circle cx="4" cy="18" r="1"></circle><line x1="8" y1="18" x2="21" y2="18"></line></svg>',
  // The second (right) head used to be a single open arc (M16 8a3 3 0 110-6)
  // — one arc between two diametrically-opposite points draws a half circle,
  // not a closed loop, so it rendered as a broken "C" instead of a head.
  // Fixed the same way the first head is built: two arcs + z to actually
  // close the circle.
  people:
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11a3 3 0 100-6 3 3 0 000 6z"></path><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path><path d="M16 8a3 3 0 100-6 3 3 0 000 6z"></path><path d="M14.5 14.2c2-.1 3.8 1 4.9 2.6.4.6.6 1.4.6 2.2v1"></path></svg>',
  invite:
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"></circle><path d="M3 19c0-3 2.7-5.4 6-5.4s6 2.4 6 5.4"></path><line x1="17" y1="8" x2="17" y2="14"></line><line x1="14" y1="11" x2="20" y2="11"></line></svg>',
};

const HOME_CARDS = [
  { icon: "clipboard", num: 7, label: "Today", goto: "calendar-today" },
  // "Calendar" card opens the Overview tab (day-by-day agenda), not Today's
  // hour grid — was wrongly pointed at calendar-today before.
  { icon: "calendar", num: 2, label: "Calendar", goto: "calendar-overview" },
  { icon: "list", num: 4, label: "Tasks", goto: "tasks" },
  { icon: "people", num: 0, label: "Notification", goto: "notifications" },
];

const HOME_EVENTS = [
  { avatar: "avatar-whao.png", name: "W Hao", title: "Zoom online meeting", time: "7:00-7:30 am" },
  { avatar: "avatar-viw.png", name: "VI W", title: "School Parents' Meeting", time: "13:00-15:30 pm" },
];

const HOME_TASKS = [
  "Book Museum Admission Tickets",
  "Taking documents requiring signature home",
  "Taking delivery of a parcel",
  "Picking up cold medicine on the way home from work",
];

// Inline (in-flow) checkbox for the Home Tasks card — unlike makeCheckbox()
// above, this isn't absolutely positioned over a screenshot, so a row with
// wrapped text just grows taller instead of the checkbox drifting off its
// label.
function makeInlineTaskCheckbox(taskIndex) {
  const el = document.createElement("span");
  el.className = "home-task-checkbox" + (taskChecked[taskIndex] ? " checked" : " unchecked");
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    taskChecked[taskIndex] = !taskChecked[taskIndex];
    el.classList.toggle("checked", taskChecked[taskIndex]);
    el.classList.toggle("unchecked", !taskChecked[taskIndex]);
  });
  return el;
}

function renderHomeTop() {
  if (homeStickyEl.dataset.built) return; // static mock data, build once
  homeStickyEl.dataset.built = "1";

  // Account row only: pinned via .home-sticky (position:sticky), along with
  // the gap below it — the 4 stat cards scroll away with everything else.
  const header = document.createElement("div");
  header.className = "home-header-row";
  header.innerHTML =
    `<img class="home-avatar" src="${IMG_BASE}avatar-me.png" alt="账户头像">` +
    `<div class="home-header-right">` +
    `<div class="home-invite">${HOME_ICONS.invite}</div>` +
    `<div class="home-menu-dots">···</div>` +
    `</div>`;
  header.querySelector(".home-avatar").addEventListener("click", openAvatarPopover);
  header.querySelector(".home-invite").addEventListener("click", () => goToPage("members"));
  header.querySelector(".home-menu-dots").addEventListener("click", openSettingsPopover);
  homeStickyEl.appendChild(header);

  const cards = document.createElement("div");
  cards.className = "home-cards";
  HOME_CARDS.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "home-card";
    btn.innerHTML =
      `<div class="row1">${HOME_ICONS[c.icon]}<span class="num">${c.num}</span></div>` +
      `<div class="label">${c.label}</div>`;
    btn.addEventListener("click", () => goToPage(c.goto));
    cards.appendChild(btn);
  });
  homeScrollEl.appendChild(cards);

  const label = document.createElement("div");
  label.className = "home-upcoming-label";
  label.textContent = "Upcoming Event(s)";
  homeScrollEl.appendChild(label);

  HOME_EVENTS.forEach((ev) => {
    const row = document.createElement("div");
    row.className = "home-event-row";
    row.innerHTML =
      `<img class="home-event-avatar" src="${IMG_BASE}${ev.avatar}" alt="">` +
      `<div class="home-event-info"><div class="home-event-name">${ev.name}</div><div class="home-event-title">${ev.title}</div></div>` +
      `<div class="home-event-time">${ev.time}</div>`;
    homeScrollEl.appendChild(row);
  });

  const tasksLabel = document.createElement("div");
  tasksLabel.className = "home-tasks-label";
  tasksLabel.textContent = "Task(s)";
  homeScrollEl.appendChild(tasksLabel);

  const tasksCard = document.createElement("div");
  tasksCard.className = "home-tasks-card";
  HOME_TASKS.forEach((text, i) => {
    if (i > 0) {
      const divider = document.createElement("div");
      divider.className = "home-task-divider";
      tasksCard.appendChild(divider);
    }
    const row = document.createElement("div");
    row.className = "home-task-row";
    row.appendChild(makeInlineTaskCheckbox(i));
    const span = document.createElement("span");
    span.className = "home-task-text";
    span.textContent = text;
    row.appendChild(span);
    tasksCard.appendChild(row);
  });
  homeScrollEl.appendChild(tasksCard);

  updateHomeScrollThumb();
}

/* ---------------------------------------------------------------- */
/* Tasks page — real HTML, reuses HOME_TASKS/taskChecked/             */
/* makeInlineTaskCheckbox from Home above (same data, same checkbox   */
/* look — matches the earlier requirement that Tasks' checkbox layout */
/* match Home's exactly, now true by construction, not measurement).  */
/* ---------------------------------------------------------------- */

const tasksPageEl = document.getElementById("tasksPage");
const tasksListEl = document.getElementById("tasksList");

function renderTasksPage() {
  if (tasksListEl.dataset.built) return; // static mock data, build once
  tasksListEl.dataset.built = "1";

  document.getElementById("tasksBackBtn").addEventListener("click", () => {
    pageStack = [];
    renderPage("home");
  });

  HOME_TASKS.forEach((text, i) => {
    const row = document.createElement("div");
    row.className = "tasks-row";
    row.appendChild(makeInlineTaskCheckbox(i));
    const span = document.createElement("span");
    span.className = "tasks-row-text";
    span.textContent = text;
    row.appendChild(span);
    tasksListEl.appendChild(row);
  });
}

/* ---------------------------------------------------------------- */
/* Notification page — real HTML, was a full screenshot with only an */
/* invisible back-arrow hotspot over it (no real button at all).      */
/* ---------------------------------------------------------------- */

const notifPageEl = document.getElementById("notifPage");
const notifListEl = document.getElementById("notifList");

// Two rows reuse Home's Z Boh / W Hao avatars once already extracted for
// this app (avatar-zboh.png, per the Figma source, is actually the "invited
// you to a event" silhouette photo, not the beanie-hat one — see the two new
// crops below for the two rows that needed a photo not already on disk).
const NOTIF_ITEMS = [
  {
    avatar: "avatar-zboh-comment.png",
    text: "Z Boh commented in parental meeting(Event)",
    secondary: "Remember to bring a pen.",
    date: "4 Dec",
  },
  {
    avatar: "avatar-viw.png",
    text: "VI W reacted in parental meeting(Event)",
    secondary: "OK~",
    date: "4 Dec",
  },
  {
    avatar: "avatar-viw.png",
    text: "VI W @ you in parental meeting(Event)",
    secondary: "Time changed !!!",
    date: "4 Dec",
  },
  {
    avatar: "avatar-zboh.png",
    text: "Z Boh invited you to a event",
    date: "1 Dec",
    chip: "Dinner Meeting Location",
  },
  {
    avatar: "avatar-whao-invite.png",
    text: "W Hao invited you to a event",
    date: "26 Nov",
    chip: "Check my event time",
  },
  {
    avatar: "avatar-zboh.png",
    text: "Z Boh invited you to a event",
    date: "18 Nov",
    chip: "Lecture 4 - Containers",
  },
];

function renderNotifPage() {
  if (notifListEl.dataset.built) return; // static mock data, build once
  notifListEl.dataset.built = "1";

  document.getElementById("notifBackBtn").addEventListener("click", () => {
    pageStack = [];
    renderPage("home");
  });

  NOTIF_ITEMS.forEach((item) => {
    const row = document.createElement("div");
    row.className = "notif-row";

    const avatar = document.createElement("img");
    avatar.className = "notif-avatar";
    avatar.src = IMG_BASE + item.avatar;
    avatar.alt = "";
    row.appendChild(avatar);

    const body = document.createElement("div");
    body.className = "notif-body";

    const topRow = document.createElement("div");
    topRow.className = "notif-top-row";
    const text = document.createElement("div");
    text.className = "notif-text";
    text.textContent = item.text;
    topRow.appendChild(text);
    if (item.chip) {
      // Invite rows: date sits inline with the text, up top.
      const date = document.createElement("div");
      date.className = "notif-date";
      date.textContent = item.date;
      topRow.appendChild(date);
    }
    body.appendChild(topRow);

    if (item.chip) {
      const chip = document.createElement("div");
      chip.className = "notif-chip";
      chip.innerHTML = `<span class="notif-chip-icon"></span><span class="notif-chip-text">${item.chip}</span>`;
      body.appendChild(chip);
    } else {
      const secondary = document.createElement("div");
      secondary.className = "notif-secondary";
      secondary.textContent = item.secondary;
      body.appendChild(secondary);

      const dateRow = document.createElement("div");
      dateRow.className = "notif-secondary-row";
      const date = document.createElement("div");
      date.className = "notif-date";
      date.textContent = item.date;
      dateRow.appendChild(date);
      body.appendChild(dateRow);
    }

    row.appendChild(body);
    notifListEl.appendChild(row);
  });
}

let carouselIndex = 0;
let dragStartX = 0;
let dragDeltaX = 0;
let dragging = false;

function updateCarousel() {
  carouselTrackEl.style.transform = `translateX(-${carouselIndex * 100}%)`;
}

function carouselNextOrFinish() {
  if (carouselIndex < 2) {
    carouselIndex++;
    updateCarousel();
  } else {
    finishOnboarding();
  }
}

function finishOnboarding() {
  carouselEl.classList.add("hidden");
  appLayerEl.classList.remove("hidden");
  pageStack = [];
  renderPage("home");
}

function setupCarouselDrag() {
  carouselTrackEl.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    carouselTrackEl.classList.add("dragging");
    carouselTrackEl.setPointerCapture(e.pointerId);
  });
  carouselTrackEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dragDeltaX = e.clientX - dragStartX;
    const pct = (dragDeltaX / carouselTrackEl.clientWidth) * 100;
    carouselTrackEl.style.transform = `translateX(calc(-${carouselIndex * 100}% + ${pct}%))`;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    carouselTrackEl.classList.remove("dragging");
    const threshold = carouselTrackEl.clientWidth * 0.15;
    if (dragDeltaX < -threshold && carouselIndex < 2) carouselIndex++;
    else if (dragDeltaX > threshold && carouselIndex > 0) carouselIndex--;
    updateCarousel();
  };
  carouselTrackEl.addEventListener("pointerup", endDrag);
  carouselTrackEl.addEventListener("pointercancel", endDrag);
}

// Precise (color-detected) bounds, not padded-for-safety boxes:
// Skip text px(87,122)-(141,153), Continue pill px(64,1347)-(755,1482),
// Sign-in pill px(64,1495)-(755,1630), all of 832x1750.
function setupCarouselHotspots() {
  carouselHotspotsEl.innerHTML = "";
  carouselHotspotsEl.appendChild(makeHotspot(8, 5, 11, 5.5, finishOnboarding)); // Skip (small touch-padding around bare text only)
  carouselHotspotsEl.appendChild(makeHotspot(7.7, 77.0, 83.1, 7.7, carouselNextOrFinish)); // Continue / Get Started pill
  carouselHotspotsEl.appendChild(makeHotspot(7.7, 85.4, 83.1, 7.7, finishOnboarding)); // Sign in pill
}

/* ---------------------------------------------------------------- */
/* Gesture: swipe down on the sheet to dismiss it                    */
/* ---------------------------------------------------------------- */

function setupSheetSwipeDown() {
  // Do not call setPointerCapture (or start transforming) on plain pointerdown —
  // the header's X / confirm buttons live in this same top strip, and capturing
  // the pointer immediately would swallow their click events. Only commit to
  // "this is a drag" once movement clears a small threshold.
  let tracking = false;
  let dragging = false;
  let startY = 0;
  let deltaY = 0;
  let sheetHeightPx = 0;
  let pointerId = null;

  sheetEl.addEventListener("pointerdown", (e) => {
    // Scope strictly to the header element itself (not "top N px of the sheet") —
    // popups/repeat/voice are also full-size children of .sheet, and a pixel
    // guess could overlap their own back buttons depending on viewport size,
    // silently capturing the pointer before those clicks register.
    if (!e.target.closest(".ne-header")) return;
    const rect = sheetEl.getBoundingClientRect();
    tracking = true;
    dragging = false;
    startY = e.clientY;
    deltaY = 0;
    sheetHeightPx = rect.height;
    pointerId = e.pointerId;
  });

  sheetEl.addEventListener("pointermove", (e) => {
    if (!tracking) return;
    const dy = e.clientY - startY;
    if (!dragging) {
      if (dy < 8) return; // still within click tolerance, not a drag yet
      dragging = true;
      sheetEl.style.transition = "none";
      sheetEl.setPointerCapture(pointerId);
    }
    deltaY = Math.max(0, dy);
    sheetEl.style.transform = `translateY(${deltaY}px)`;
  });

  const endDrag = () => {
    tracking = false;
    if (!dragging) return;
    dragging = false;
    sheetEl.style.transition = "";
    sheetEl.style.transform = "";
    if (deltaY > sheetHeightPx * 0.2) closeSheet();
  };
  sheetEl.addEventListener("pointerup", endDrag);
  sheetEl.addEventListener("pointercancel", endDrag);
}
setupSheetSwipeDown();

/* ---------------------------------------------------------------- */
/* Gesture: edge-swipe from the left to go back (page mode only)     */
/* ---------------------------------------------------------------- */

function setupEdgeSwipeBack() {
  let active = false;
  let startX = 0;
  let startY = 0;

  appLayerEl.addEventListener("pointerdown", (e) => {
    const rect = appLayerEl.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width * 0.08) return;
    if (currentPage === "home" || sheetOpen || popupOpen) return;
    active = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  appLayerEl.addEventListener("pointerup", (e) => {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = Math.abs(e.clientY - startY);
    if (dx > 60 && dy < 60) {
      pageStack = [];
      renderPage("home");
    }
  });
  appLayerEl.addEventListener("pointercancel", () => {
    active = false;
  });
}
setupEdgeSwipeBack();

/* ---------------------------------------------------------------- */
/* Draggable "+" FAB (Home, Calendar, Tasks)                         */
/* ---------------------------------------------------------------- */

const fabAddEl = document.getElementById("fabAdd");
const phoneScreenEl = document.getElementById("phoneScreen");
const FAB_PAGES = new Set(["home", "calendar-today", "calendar-overview", "tasks"]);

// Position persists across page changes and drags — it's one floating button,
// not a per-page hotspot. Starts where Home's "+" sits. Until the user drags
// it themselves, it re-snaps to each page's own baked-icon spot on arrival
// (see fabDefaultPos below) so it exactly covers that page's mask with no
// gap — once dragged, the user's placement is respected everywhere.
let fabPos = { left: 77.4, top: 86.8 };
let fabDragged = false;

function placeFab() {
  fabAddEl.style.left = fabPos.left + "%";
  fabAddEl.style.top = fabPos.top + "%";
}
placeFab();

function updateFabVisibility() {
  const show =
    FAB_PAGES.has(currentPage) &&
    carouselEl.classList.contains("hidden") &&
    !sheetOpen &&
    !avatarPopoverEl.classList.contains("open");
  fabAddEl.classList.toggle("visible", show);
}

(function setupFabDrag() {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startLeftPx = 0;
  let startTopPx = 0;

  fabAddEl.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    const screenRect = phoneScreenEl.getBoundingClientRect();
    const fabRect = fabAddEl.getBoundingClientRect();
    startLeftPx = fabRect.left - screenRect.left;
    startTopPx = fabRect.top - screenRect.top;
    fabAddEl.setPointerCapture(e.pointerId);
  });

  fabAddEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      moved = true;
      fabDragged = true;
      fabAddEl.classList.add("dragging");
    }
    if (!moved) return;
    const screenRect = phoneScreenEl.getBoundingClientRect();
    const fabSize = fabAddEl.getBoundingClientRect().width;
    const newLeftPx = Math.max(0, Math.min(startLeftPx + dx, screenRect.width - fabSize));
    const newTopPx = Math.max(0, Math.min(startTopPx + dy, screenRect.height - fabSize));
    fabPos.left = (newLeftPx / screenRect.width) * 100;
    fabPos.top = (newTopPx / screenRect.height) * 100;
    placeFab();
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    fabAddEl.classList.remove("dragging");
    if (!moved) openSheet(); // a plain tap (no real drag movement) opens New Event
  };
  fabAddEl.addEventListener("pointerup", endDrag);
  fabAddEl.addEventListener("pointercancel", endDrag);
})();

/* ---------------------------------------------------------------- */
/* Global controls                                                   */
/* ---------------------------------------------------------------- */

const shellEl = document.getElementById("phoneShell");
const debugToggle = document.getElementById("debugToggle");
const backBtn = document.getElementById("backBtn");
const resetBtn = document.getElementById("resetBtn");

function goBack() {
  if (repeatPopupEl.classList.contains("open")) {
    closeRepeatPopup();
    return;
  }
  if (popupOpen) {
    closePopup();
    return;
  }
  if (avatarPopoverEl.classList.contains("open")) {
    closeAvatarPopover();
    return;
  }
  if (sheetOpen) {
    if (voiceOpen) closeVoice();
    else if (dateOpen) toggleDateExpand();
    else if (timeOpen) toggleTimeExpand();
    else closeSheet();
    return;
  }
  if (!carouselEl.classList.contains("hidden")) {
    if (carouselIndex > 0) {
      carouselIndex--;
      updateCarousel();
    }
    return;
  }
  if (currentPage !== "home") {
    pageStack = [];
    renderPage("home");
  }
}

backBtn.addEventListener("click", goBack);
resetBtn.addEventListener("click", () => {
  closeSheet();
  closePopup();
  closeAvatarPopover();
  closeRepeatPopup();
  pageStack = [];
  carouselIndex = 0;
  updateCarousel();
  carouselEl.classList.remove("hidden");
  appLayerEl.classList.add("hidden");
  calTodayPageEl.classList.add("hidden");
  homePageEl.classList.add("hidden");
  calOverviewPageEl.classList.add("hidden");
  fabPos = { left: 77.4, top: 86.8 };
  fabDragged = false;
  placeFab();
  updateFabVisibility();
});
debugToggle.addEventListener("change", () => {
  shellEl.classList.toggle("debug-on", debugToggle.checked);
});

/* ---------------------------------------------------------------- */
/* Init                                                               */
/* ---------------------------------------------------------------- */

setupCarouselDrag();
setupCarouselHotspots();
updateCarousel();
renderPage("home");
setLabel("引导页 1/3");

// Dev/test shortcut: open with e.g. #home, #tasks, #sheet, #sheet-date,
// #sheet-time to jump straight to that state (skips onboarding automatically).
// Harmless for normal use — only acts on a matching hash.
(function devJump() {
  let h = location.hash.replace("#", "");
  if (!h) return;
  const debug = h.endsWith("-debug");
  if (debug) h = h.slice(0, -"-debug".length);
  if (h === "sheet") {
    finishOnboarding();
    openSheet();
  } else if (h === "sheet-date") {
    finishOnboarding();
    openSheet();
    toggleDateExpand();
  } else if (h === "sheet-time") {
    finishOnboarding();
    openSheet();
    toggleTimeExpand();
  } else if (h === "sheet-details") {
    finishOnboarding();
    openSheet();
    openCategoryDetailsPopup();
  } else if (h === "settings") {
    finishOnboarding();
    goToPage("home");
    openSettingsPopover();
  } else if (h === "calendar-overview-scrolled") {
    finishOnboarding();
    goToPage("calendar-overview");
    calOverviewListEl.scrollTop = 900;
  } else if (h === "calendar-today-scrolled") {
    finishOnboarding();
    goToPage("calendar-today");
    calTodayTimelineEl.scrollTop = 1030;
  } else if (pages[h]) {
    finishOnboarding();
    if (h !== "home") goToPage(h);
  }
  if (debug) {
    debugToggle.checked = true;
    shellEl.classList.add("debug-on");
  }
})();
