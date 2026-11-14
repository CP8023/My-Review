/* ============================================================
   今日：速记 / 收集箱 / 日复盘 / 到期行动
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const KINDS = ['事件', '想法', '问题', '经验', '待复盘'];
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function timeLabel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const hm = App.pad2(d.getHours()) + ':' + App.pad2(d.getMinutes());
    if (App.ymd(d) === App.ymd(now)) return '今天 ' + hm;
    if (App.ymd(d) === App.addDays(App.ymd(now), -1)) return '昨天 ' + hm;
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function moodButtons(entry) {
    return App.MOODS.map(function (m) {
      const on = entry.mood === m.v;
      return '<button type="button" class="mood' + (on ? ' on' : '') + '" data-mood="' + m.v +
        '" aria-pressed="' + on + '" title="' + m.label + '">' + m.emoji + '</button>';
    }).join('');
  }

  function energyButtons(entry) {
    return [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" class="energy' + (entry.energy >= n ? ' on' : '') +
        '" data-energy="' + n + '" aria-label="精力 ' + n + '"><i></i></button>';
    }).join('');
  }

  function sectionHTML(entry, section) {
    return '' +
      '<section class="card section">' +
        '<div class="section-head">' +
          '<div class="s-title"><h2>' + section.title + '</h2><span class="hint">' + section.hint + '</span></div>' +
          '<span class="counter" data-counter="' + section.key + '">' + App.charCount(entry[section.key]) + ' 字</span>' +
        '</div>' +
        '<textarea class="ta" data-field="' + section.key + '" rows="' + section.rows +
          '" placeholder="' + App.esc(section.ph) + '" data-autosize>' + App.esc(entry[section.key]) + '</textarea>' +
      '</section>';
  }

  function quickCaptureHTML() {
    const kind = App.ui.quickKind;
    const voice = App.voiceSupported ? '<button type="button" class="icon-btn quick-mic" data-act="quick-voice" aria-label="语音输入" title="语音输入">🎙</button>' : '';
    return '' +
      '<section class="card quick-card">' +
        '<div class="quick-head"><h2>速记</h2><span class="hint">先记下来，稍后再整理</span></div>' +
        '<div class="quick-box">' +
          '<textarea id="quickText" class="quick-input" rows="2" maxlength="2000" placeholder="记一条工作事件、想法、问题或经验…（Ctrl + Enter 保存）"></textarea>' +
          voice +
        '</div>' +
        '<div class="quick-foot">' +
          '<div class="kind-row">' +
            KINDS.map(function (k) {
              return '<button type="button" class="chip kind' + (kind === k ? ' on' : '') + '" data-quick-kind="' + k + '">' + k + '</button>';
            }).join('') +
          '</div>' +
          '<button type="button" class="btn primary sm" data-act="quick-save">收进收集箱</button>' +
        '</div>' +
      '</section>';
  }

  function inboxHTML() {
    const notes = App.state.notes;
    if (!notes.length) return '';
    return '' +
      '<details class="card inbox-card" open>' +
        '<summary>' +
          '<span class="inbox-title">收集箱</span>' +
          '<span class="badge">' + notes.length + '</span>' +
          '<span class="hint">整理后转成行动，或删掉</span>' +
        '</summary>' +
        '<div class="inbox-list">' +
          notes.map(function (note) {
            return '' +
              '<div class="inbox-item">' +
                '<div class="inbox-main">' +
                  '<span class="chip kind sm">' + App.esc(note.kind) + '</span>' +
                  '<p class="inbox-text">' + App.esc(note.text) + '</p>' +
                  '<span class="inbox-time">' + timeLabel(note.createdAt) + '</span>' +
                '</div>' +
                '<div class="inbox-actions">' +
                  '<button type="button" class="ghost-btn sm" data-note-to-action="' + note.id + '">转为行动</button>' +
                  '<button type="button" class="text-danger" data-note-del="' + note.id + '">删除</button>' +
                '</div>' +
              '</div>';
          }).join('') +
        '</div>' +
      '</details>';
  }

  function dueHTML() {
    const open = App.openActions().slice().sort(function (a, b) {
      return (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') ||
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
    if (!open.length) return '';
    const overdue = App.overdueActions().length;
    return '' +
      '<section class="card due-card">' +
        '<div class="card-head">' +
          '<h2>行动项</h2>' +
          '<span class="muted">' + (overdue ? overdue + ' 项逾期 · ' : '') + open.length + ' 项待办</span>' +
          '<button type="button" class="ghost-btn sm" data-nav="actions">全部</button>' +
        '</div>' +
        '<div class="due-list">' +
          open.slice(0, 5).map(function (action) { return App.actionRow(action, { compact: true }); }).join('') +
        '</div>' +
      '</section>';
  }

  function reminderHTML(entry) {
    if (App.state.settings.reminderDate === App.todayKey()) return '';
    const overdue = App.overdueActions().length;
    let text = '';
    let action = '';
    if (overdue) {
      text = '有 ' + overdue + ' 项行动逾期了，顺手处理一下。';
      action = '<button type="button" class="ghost-btn sm" data-nav="actions">去看行动</button>';
    } else if (!App.hasContent(entry)) {
      text = '今天还没写复盘。写一句也算。';
      action = '<button type="button" class="ghost-btn sm" data-act="focus-summary">开始写</button>';
    } else {
      return '';
    }
    return '' +
      '<div class="reminder-bar" role="status">' +
        '<span class="reminder-dot" aria-hidden="true"></span>' +
        '<p class="reminder-text">' + text + '</p>' +
        action +
        '<button type="button" class="reminder-close" data-act="dismiss-reminder" aria-label="今天不再提醒">×</button>' +
      '</div>';
  }

  App.renderWrite = function () {
    const date = App.ui.date;
    const entry = App.getEntry(date, true);
    App.currentEntry = entry;
    App.currentReview = null;

    const d = App.parseYmd(date);
    const rel = App.relLabel(date);
    const isToday = date === App.todayKey();
    const prevCount = App.pendingCarry(date).length;
    const totalWords = App.entryCharCount(entry);

    const html = '' +
      '<div class="container">' +
        '<header class="view-head">' +
          '<div class="head-row">' +
            '<div>' +
              '<h1>' + (rel ? rel + '的复盘' : '写复盘') + '</h1>' +
              '<p class="sub">' + (isToday ? '趁今天还没走远，理一理。' : '补记也是一种认真。') + '</p>' +
            '</div>' +
            '<div class="head-tools">' +
              '<span class="head-date">' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + App.WEEK[d.getDay()] + '</span>' +
              '<button type="button" class="btn sm" data-act="new-review">＋ 新建复盘</button>' +
            '</div>' +
          '</div>' +
        '</header>' +
        reminderHTML(entry) +
        quickCaptureHTML() +
        dueHTML() +
        inboxHTML() +
        '<div class="card day-card">' +
          '<div class="day-nav">' +
            '<button type="button" class="icon-btn" data-act="prev-day" aria-label="前一天">' + App.icon('left') + '</button>' +
            '<button type="button" class="day-center" data-act="pick-date" aria-label="选择日期">' +
              '<span class="day-main">' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日</span>' +
              '<span class="day-sub">' + App.WEEK[d.getDay()] + (rel ? ' · ' + rel : '') + '</span>' +
            '</button>' +
            '<button type="button" class="icon-btn" data-act="next-day" aria-label="后一天"' + (isToday ? ' disabled' : '') + '>' + App.icon('right') + '</button>' +
            (isToday ? '' : '<button type="button" class="ghost-btn sm" data-act="today">回到今天</button>') +
            '<input type="date" id="datePicker" class="date-picker" value="' + date + '" max="' + App.todayKey() + '" tabindex="-1" aria-hidden="true">' +
          '</div>' +
          '<div class="day-meta">' +
            '<div class="me-row">' +
              '<span class="me-label">心情</span>' +
              '<div class="mood-row" role="group" aria-label="心情">' + moodButtons(entry) + '</div>' +
              '<span class="me-value" id="moodValue">' + (entry.mood ? App.MOODS[entry.mood - 1].label : '未选') + '</span>' +
            '</div>' +
            '<div class="me-row">' +
              '<span class="me-label">精力</span>' +
              '<div class="energy-row" role="group" aria-label="精力">' + energyButtons(entry) + '</div>' +
              '<span class="me-value" id="energyValue">' + (entry.energy ? App.ENERGY_LABELS[entry.energy] : '未选') + '</span>' +
            '</div>' +
            '<div class="me-row me-row-project">' +
              '<span class="me-label">项目</span>' +
              '<input class="me-project" id="entryProject" list="entryProjects" value="' + App.esc(entry.project) +
                '" placeholder="可选，例如：产品A" maxlength="40" autocomplete="off">' +
              '<datalist id="entryProjects">' +
                App.allProjects().map(function (project) {
                  return '<option value="' + App.esc(project) + '"></option>';
                }).join('') +
              '</datalist>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<section class="card section">' +
          '<div class="section-head">' +
            '<div class="s-title"><h2>一句话总结</h2></div>' +
            '<span class="counter" data-counter="summary">' + App.charCount(entry.summary) + ' 字</span>' +
          '</div>' +
          '<input class="summary-input" data-field="summary" value="' + App.esc(entry.summary) + '" placeholder="如果今天只能留下一句话…" maxlength="80">' +
        '</section>' +
        App.SECTIONS.map(function (section) { return sectionHTML(entry, section); }).join('') +
        '<section class="card section">' +
          '<div class="section-head">' +
            '<div class="s-title"><h2>明日计划</h2><span class="hint">先写下明天最重要的两三件事。</span></div>' +
            '<span class="counter" id="planCounter">' + entry.tomorrow.filter(function (t) { return t.text.trim(); }).length + ' 项</span>' +
          '</div>' +
          (prevCount ? '<button type="button" class="carry-btn" data-act="carry">↩ 带入 ' + prevCount + ' 项昨日未完成的计划</button>' : '') +
          '<div id="planList" class="plan-list"></div>' +
          '<button type="button" class="add-row" data-act="add-plan">＋ 添加一项</button>' +
          '<button type="button" class="ghost-btn sm plan-sync" data-act="plans-to-actions">同步到行动项</button>' +
        '</section>' +
        '<section class="card section">' +
          '<div class="section-head">' +
            '<div class="s-title"><h2>标签</h2><span class="hint">回车添加，方便以后筛选。</span></div>' +
          '</div>' +
          '<div class="tag-editor">' +
            '<div id="tagChips" class="tag-chips"></div>' +
            '<input id="tagInput" class="tag-input" maxlength="16" placeholder="如：项目A、沟通、效率" autocomplete="off">' +
          '</div>' +
        '</section>' +
        '<div class="savebar">' +
          '<div class="save-info">' +
            '<span class="words">共 <strong id="wordTotal">' + totalWords + '</strong> 字</span>' +
            '<span class="status" id="saveStatus">已自动保存</span>' +
          '</div>' +
          '<div class="save-actions">' +
            (App.hasContent(entry) ? '<button type="button" class="text-danger" data-act="delete-entry">删除</button>' : '') +
            '<button type="button" class="btn primary" data-act="save">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('#main').innerHTML = html;
    renderPlans();
    renderTagChips();
    updateCounters();
    global.requestAnimationFrame(function () {
      $$('.ta[data-autosize]').forEach(autosize);
    });
  };

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 76) + 'px';
  }
  App.autosize = autosize;

  function renderPlans() {
    const wrap = $('#planList');
    if (!wrap || !App.currentEntry) return;
    const items = App.currentEntry.tomorrow;
    if (!items.length) {
      wrap.innerHTML = '<p class="plan-empty">还没有计划。写完今天的复盘，顺手想想明天。</p>';
    } else {
      wrap.innerHTML = items.map(function (item, i) {
        return '' +
          '<div class="plan-row' + (item.done ? ' done' : '') + '">' +
            '<button type="button" class="plan-check" data-plan-toggle="' + i + '" aria-pressed="' + item.done + '" aria-label="' + (item.done ? '标记为未完成' : '标记为完成') + '"></button>' +
            '<input class="plan-input" data-plan-text="' + i + '" value="' + App.esc(item.text) + '" placeholder="明天要做的事…" maxlength="200" autocomplete="off">' +
            '<button type="button" class="plan-del" data-plan-del="' + i + '" aria-label="删除这一项">×</button>' +
          '</div>';
      }).join('');
    }
    updateCounters();
  }

  function renderTagChips() {
    const wrap = $('#tagChips');
    if (!wrap || !App.currentEntry) return;
    wrap.innerHTML = App.currentEntry.tags.map(function (tag, i) {
      return '<span class="chip">' + App.esc(tag) + '<button type="button" data-tag-del="' + i + '" aria-label="移除标签 ' + App.esc(tag) + '">×</button></span>';
    }).join('');
  }

  function updateCounters() {
    const entry = App.currentEntry;
    if (!entry) return;
    ['summary'].concat(App.SECTIONS.map(function (s) { return s.key; })).forEach(function (key) {
      const el = $('[data-counter="' + key + '"]');
      if (el) el.textContent = App.charCount(entry[key]) + ' 字';
    });
    const total = $('#wordTotal');
    if (total) total.textContent = App.entryCharCount(entry);
    const planCounter = $('#planCounter');
    if (planCounter) planCounter.textContent = entry.tomorrow.filter(function (t) { return t.text.trim(); }).length + ' 项';
  }

  /* ---------- 速记 ---------- */
  App.quickSave = function () {
    const input = $('#quickText');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      App.toast('先写点什么');
      input.focus();
      return;
    }
    App.state.notes.unshift({
      id: App.uid(),
      text: text.slice(0, 2000),
      kind: App.ui.quickKind,
      createdAt: new Date().toISOString()
    });
    App.persist();
    App.toast('已收进收集箱');
    App.render();
  };

  App.setQuickKind = function (kind) {
    if (KINDS.indexOf(kind) < 0) return;
    App.ui.quickKind = kind;
    $$('[data-quick-kind]').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.quickKind === kind);
    });
  };

  App.noteToAction = function (id) {
    const index = App.state.notes.findIndex(function (note) { return note.id === id; });
    if (index < 0) return;
    const note = App.state.notes[index];
    App.state.actions.unshift({
      id: App.uid(),
      text: note.text.slice(0, 300),
      done: false,
      due: '',
      project: '',
      source: '收集箱',
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    App.state.notes.splice(index, 1);
    App.persist();
    App.toast('已转为行动项');
    App.render();
  };

  App.deleteNote = function (id) {
    App.state.notes = App.state.notes.filter(function (note) { return note.id !== id; });
    App.persist();
    App.toast('已删除');
    App.render();
  };

  /* ---------- 日复盘交互 ---------- */
  App.toggleMood = function (value) {
    const entry = App.currentEntry;
    if (!entry) return;
    entry.mood = entry.mood === value ? 0 : value;
    $$('[data-mood]').forEach(function (btn) {
      const on = Number(btn.dataset.mood) === entry.mood;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on);
    });
    const label = $('#moodValue');
    if (label) label.textContent = entry.mood ? App.MOODS[entry.mood - 1].label : '未选';
    App.touch();
  };

  App.toggleEnergy = function (value) {
    const entry = App.currentEntry;
    if (!entry) return;
    entry.energy = entry.energy === value ? 0 : value;
    $$('[data-energy]').forEach(function (btn) {
      btn.classList.toggle('on', Number(btn.dataset.energy) <= entry.energy && entry.energy > 0);
    });
    const label = $('#energyValue');
    if (label) label.textContent = entry.energy ? App.ENERGY_LABELS[entry.energy] : '未选';
    App.touch();
  };

  App.addPlan = function (focus) {
    if (!App.currentEntry) return;
    if (App.currentEntry.tomorrow.length >= 50) {
      App.toast('最多添加 50 项计划');
      return;
    }
    App.currentEntry.tomorrow.push({ id: App.uid(), text: '', done: false });
    App.touch();
    renderPlans();
    if (focus !== false) {
      const inputs = $$('#planList .plan-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  };

  App.insertPlanAfter = function (index) {
    if (!App.currentEntry) return;
    if (App.currentEntry.tomorrow.length >= 50) {
      App.toast('最多添加 50 项计划');
      return;
    }
    App.currentEntry.tomorrow.splice(index + 1, 0, { id: App.uid(), text: '', done: false });
    App.touch();
    renderPlans();
    const inputs = $$('#planList .plan-input');
    if (inputs[index + 1]) inputs[index + 1].focus();
  };

  App.togglePlan = function (index) {
    const item = App.currentEntry && App.currentEntry.tomorrow[index];
    if (!item) return;
    item.done = !item.done;
    App.touch();
    renderPlans();
  };

  App.deletePlan = function (index) {
    if (!App.currentEntry) return;
    App.currentEntry.tomorrow.splice(index, 1);
    App.touch();
    renderPlans();
  };

  App.carryPlans = function () {
    if (!App.currentEntry) return;
    const carry = App.pendingCarry(App.ui.date);
    if (!carry.length) return;
    carry.forEach(function (text) {
      App.currentEntry.tomorrow.push({ id: App.uid(), text: text, done: false });
    });
    App.touch();
    renderPlans();
    App.toast('已带入 ' + carry.length + ' 项');
  };

  App.plansToActions = function () {
    if (!App.currentEntry) return;
    const due = App.addDays(App.ui.date, 1);
    const items = App.currentEntry.tomorrow.filter(function (item) { return item.text.trim(); });
    if (!items.length) {
      App.toast('还没有计划可以同步');
      return;
    }
    const existing = App.state.actions.map(function (a) { return a.text.trim(); });
    let count = 0;
    items.forEach(function (item) {
      const text = item.text.trim();
      if (existing.indexOf(text) >= 0) return;
      App.state.actions.push({
        id: App.uid(),
        text: text,
        done: item.done,
        due: due,
        project: '',
        source: '日复盘 ' + App.ui.date,
        createdAt: new Date().toISOString(),
        completedAt: null
      });
      count += 1;
    });
    App.persist();
    App.toast(count ? '已加入 ' + count + ' 项行动' : '计划已在行动项里');
  };

  App.addTag = function (raw) {
    if (!App.currentEntry) return;
    const tag = String(raw || '').trim().replace(/^#+/, '');
    if (!tag) return;
    if (tag.length > 16) {
      App.toast('标签最多 16 个字');
      return;
    }
    if (App.currentEntry.tags.indexOf(tag) >= 0) {
      App.toast('这个标签已经有了');
      return;
    }
    if (App.currentEntry.tags.length >= 12) {
      App.toast('最多添加 12 个标签');
      return;
    }
    App.currentEntry.tags.push(tag);
    App.touch();
    renderTagChips();
    const input = $('#tagInput');
    if (input) input.focus();
  };

  App.deleteTag = function (index) {
    if (!App.currentEntry) return;
    App.currentEntry.tags.splice(index, 1);
    App.touch();
    renderTagChips();
    const input = $('#tagInput');
    if (input) input.focus();
  };

  App.deleteCurrentEntry = function () {
    if (!App.currentEntry) return;
    if (!global.confirm('删除 ' + App.ui.date + ' 的这篇复盘？此操作不可撤销。')) return;
    delete App.state.entries[App.ui.date];
    App.currentEntry = null;
    App.dirty = false;
    App.persist();
    App.toast('已删除');
    App.goWrite(App.ui.date);
  };

  App.pendingCarry = function (date) {
    const previous = App.state.entries[App.addDays(date, -1)];
    if (!previous) return [];
    const existing = App.currentEntry
      ? App.currentEntry.tomorrow.map(function (t) { return t.text.trim(); })
      : [];
    return previous.tomorrow
      .filter(function (item) {
        const text = item.text.trim();
        return text && !item.done && existing.indexOf(text) < 0;
      })
      .map(function (item) { return item.text.trim(); });
  };

  App.openDatePicker = function () {
    const picker = $('#datePicker');
    if (!picker) return;
    try {
      if (typeof picker.showPicker === 'function') picker.showPicker();
      else picker.focus();
    } catch (err) {
      picker.focus();
    }
  };
})(window);
