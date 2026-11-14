/* ============================================================
   数据层：常量、存储、日期与统计辅助
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'work-review-v1';
  const VERSION = '1.1.1';
  const TEXT_FIELDS = ['summary', 'done', 'wins', 'issues', 'lessons'];

  const MOODS = [
    { v: 1, emoji: '😫', label: '很糟' },
    { v: 2, emoji: '😕', label: '疲惫' },
    { v: 3, emoji: '😐', label: '一般' },
    { v: 4, emoji: '🙂', label: '不错' },
    { v: 5, emoji: '😄', label: '很好' }
  ];

  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const ENERGY_LABELS = ['', '疲惫', '偏低', '一般', '充沛', '满格'];

  const SECTIONS = [
    {
      key: 'done',
      title: '今天完成了什么',
      hint: '写下做完的事，哪怕很小。',
      rows: 4,
      ph: '例：完成了季度复盘初稿；推进了 A 项目的接口联调…'
    },
    {
      key: 'wins',
      title: '收获与亮点',
      hint: '哪件事做得好？学到了什么？',
      rows: 3,
      ph: '例：主动同步了风险，避免了一次返工…'
    },
    {
      key: 'issues',
      title: '问题与卡点',
      hint: '哪里卡住了？有什么没做好？',
      rows: 3,
      ph: '例：需求理解有偏差，下午才对齐…'
    },
    {
      key: 'lessons',
      title: '反思与改进',
      hint: '为什么会这样？下次怎么做？',
      rows: 3,
      ph: '例：接到任务先复述一遍目标，再动手…'
    }
  ];

  const TEMPLATES = [
    {
      id: 'week',
      name: '周复盘',
      icon: '🗓️',
      desc: '回看一周的目标、成果与阻碍。',
      titleHint: '给这一周起个标题',
      fields: [
        { key: 'goals', label: '本周目标', ph: '原本想完成什么？', rows: 3 },
        { key: 'results', label: '关键成果', ph: '完成了什么？有什么进展？', rows: 4 },
        { key: 'blocks', label: '阻碍与问题', ph: '什么拖慢了进度？', rows: 3 },
        { key: 'lessons', label: '经验与教训', ph: '有什么值得记住的？', rows: 3 },
        { key: 'next', label: '下周计划', ph: '下周最重要的三件事…', rows: 3 }
      ]
    },
    {
      id: 'month',
      name: '月复盘',
      icon: '🌙',
      desc: '看趋势，找重复出现的问题。',
      titleHint: '给这个月起个标题',
      fields: [
        { key: 'goals', label: '本月主题', ph: '这个月想把力气花在哪？', rows: 2 },
        { key: 'results', label: '关键成果', ph: '最有价值的几件事…', rows: 4 },
        { key: 'time', label: '时间去向', ph: '时间主要花在了哪里？', rows: 3 },
        { key: 'repeat', label: '重复出现的问题', ph: '哪些问题又出现了？', rows: 3 },
        { key: 'next', label: '下月计划', ph: '下个月的主线是什么？', rows: 3 }
      ]
    },
    {
      id: 'project',
      name: '项目复盘',
      icon: '📦',
      desc: '一个项目的完整回看。',
      titleHint: '项目名称',
      fields: [
        { key: 'background', label: '背景', ph: '为什么做这件事？', rows: 3 },
        { key: 'goal', label: '目标', ph: '原本要达成什么？', rows: 2 },
        { key: 'result', label: '结果', ph: '实际结果如何？', rows: 3 },
        { key: 'gap', label: '差距', ph: '和目标的差距是什么？', rows: 2 },
        { key: 'reason', label: '原因分析', ph: '为什么会有这个结果？', rows: 3 },
        { key: 'reusable', label: '可复用经验', ph: '下次可以怎么用？', rows: 3 },
        { key: 'next', label: '后续行动', ph: '接下来要做什么？', rows: 2 }
      ]
    },
    {
      id: 'event',
      name: '事件复盘',
      icon: '⚡',
      desc: '一件事，想清楚就放下。',
      titleHint: '发生了什么',
      fields: [
        { key: 'fact', label: '事实', ph: '客观发生了什么？', rows: 3 },
        { key: 'feeling', label: '感受', ph: '当时的情绪是什么？', rows: 2 },
        { key: 'analysis', label: '分析', ph: '为什么会这样？', rows: 3 },
        { key: 'conclusion', label: '结论', ph: '我学到了什么？', rows: 2 },
        { key: 'next', label: '下次怎么做', ph: '再遇到类似情况…', rows: 2 }
      ]
    },
    {
      id: 'free',
      name: '自由复盘',
      icon: '✳️',
      desc: '不套模板，写你想写的。',
      titleHint: '标题',
      fields: [
        { key: 'free', label: '正文', ph: '想到哪写到哪…', rows: 8 }
      ]
    }
  ];

  /* ---------- 日期 ---------- */
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function ymd(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseYmd(s) {
    const parts = String(s).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayKey() {
    return ymd(new Date());
  }

  function addDays(key, n) {
    const d = parseYmd(key);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }

  function relLabel(key) {
    const today = todayKey();
    if (key === today) return '今天';
    if (key === addDays(today, -1)) return '昨天';
    if (key === addDays(today, -2)) return '前天';
    return '';
  }

  function monthLabel(monthKey) {
    const parts = String(monthKey).split('-').map(Number);
    return parts[0] + ' 年 ' + parts[1] + ' 月';
  }

  /* ---------- 文本 ---------- */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function charCount(text) {
    return String(text || '').replace(/\s/g, '').length;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- 条目 ---------- */
  function blankEntry(date) {
    const now = new Date().toISOString();
    return {
      date: date,
      mood: 0,
      energy: 0,
      project: '',
      summary: '',
      done: '',
      wins: '',
      issues: '',
      lessons: '',
      tomorrow: [],
      tags: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function normalizeEntry(raw, date) {
    const entry = blankEntry(date);
    if (!raw || typeof raw !== 'object') return entry;

    TEXT_FIELDS.forEach(function (field) {
      if (typeof raw[field] === 'string') entry[field] = raw[field].slice(0, 20000);
    });
    if (typeof raw.mood === 'number' && raw.mood >= 0 && raw.mood <= 5) entry.mood = Math.round(raw.mood);
    if (typeof raw.energy === 'number' && raw.energy >= 0 && raw.energy <= 5) entry.energy = Math.round(raw.energy);
    if (typeof raw.project === 'string') entry.project = raw.project.trim().slice(0, 40);

    if (Array.isArray(raw.tomorrow)) {
      entry.tomorrow = raw.tomorrow.slice(0, 50).map(function (item) {
        if (typeof item === 'string') return { id: uid(), text: item.slice(0, 300), done: false };
        return {
          id: (item && item.id) || uid(),
          text: String((item && item.text) || '').slice(0, 300),
          done: !!(item && item.done)
        };
      });
    }

    if (Array.isArray(raw.tags)) {
      entry.tags = raw.tags
        .filter(function (tag) { return typeof tag === 'string' && tag.trim(); })
        .map(function (tag) { return tag.trim().slice(0, 20); })
        .slice(0, 12);
    }

    if (raw.createdAt) entry.createdAt = raw.createdAt;
    if (raw.updatedAt) entry.updatedAt = raw.updatedAt;
    return entry;
  }

  function hasContent(entry) {
    if (!entry) return false;
    if (entry.mood > 0 || entry.energy > 0) return true;
    if (TEXT_FIELDS.some(function (field) { return String(entry[field] || '').trim(); })) return true;
    if ((entry.tags || []).length) return true;
    return (entry.tomorrow || []).some(function (item) { return String(item.text || '').trim(); });
  }

  function entryCharCount(entry) {
    if (!entry) return 0;
    let total = TEXT_FIELDS.reduce(function (sum, field) {
      return sum + charCount(entry[field]);
    }, 0);
    total += (entry.tomorrow || []).reduce(function (sum, item) {
      return sum + charCount(item.text);
    }, 0);
    return total;
  }

  function entryText(entry) {
    const parts = TEXT_FIELDS.map(function (field) { return entry[field] || ''; });
    parts.push((entry.tomorrow || []).map(function (item) { return item.text; }).join(' '));
    parts.push((entry.tags || []).join(' '));
    parts.push(entry.project || '');
    return parts.join(' ').toLowerCase();
  }

  /* ---------- 复盘 / 收集箱 / 行动 ---------- */
  function getTemplate(id) {
    for (let i = 0; i < TEMPLATES.length; i += 1) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return TEMPLATES[TEMPLATES.length - 1];
  }

  function reviewCharCount(review) {
    if (!review) return 0;
    let total = charCount(review.title);
    const values = review.values || {};
    Object.keys(values).forEach(function (key) {
      total += charCount(values[key]);
    });
    return total;
  }

  function reviewText(review) {
    const values = review.values || {};
    return [review.title || '', review.project || '', (review.tags || []).join(' ')]
      .concat(Object.keys(values).map(function (key) { return values[key] || ''; }))
      .join(' ')
      .toLowerCase();
  }

  function reviewLabel(review) {
    const tpl = getTemplate(review && review.template);
    return tpl.name;
  }

  function reviewHasContent(review) {
    if (!review) return false;
    if (String(review.title || '').trim()) return true;
    if (String(review.project || '').trim()) return true;
    if ((review.tags || []).length) return true;
    const values = review.values || {};
    return Object.keys(values).some(function (key) {
      return String(values[key] || '').trim();
    });
  }

  function actionIsOpen(action) {
    return !action.done;
  }

  function normalizeReview(raw) {
    if (!raw || typeof raw !== 'object' || !raw.id) return null;
    const tpl = getTemplate(raw.template);
    const source = raw.values && typeof raw.values === 'object' ? raw.values : {};
    const values = {};
    tpl.fields.forEach(function (field) {
      values[field.key] = typeof source[field.key] === 'string' ? source[field.key].slice(0, 20000) : '';
    });
    return {
      id: String(raw.id),
      template: tpl.id,
      title: String(raw.title || '').slice(0, 120),
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayKey(),
      project: String(raw.project || '').slice(0, 40),
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter(function (t) { return typeof t === 'string' && t.trim(); })
          .map(function (t) { return t.trim().slice(0, 20); }).slice(0, 12)
        : [],
      values: values,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function normalizeNote(raw) {
    if (!raw || typeof raw !== 'object' || !raw.id) return null;
    const text = String(raw.text || '').trim();
    if (!text) return null;
    return {
      id: String(raw.id),
      text: text.slice(0, 2000),
      kind: ['事件', '想法', '问题', '经验', '待复盘'].indexOf(raw.kind) >= 0 ? raw.kind : '事件',
      createdAt: raw.createdAt || new Date().toISOString()
    };
  }

  function normalizeAction(raw) {
    if (!raw || typeof raw !== 'object' || !raw.id) return null;
    const text = String(raw.text || '').trim();
    if (!text) return null;
    return {
      id: String(raw.id),
      text: text.slice(0, 300),
      done: !!raw.done,
      due: /^\d{4}-\d{2}-\d{2}$/.test(raw.due) ? raw.due : '',
      project: String(raw.project || '').slice(0, 40),
      source: String(raw.source || '').slice(0, 60),
      reviewId: String(raw.reviewId || '').slice(0, 60),
      createdAt: raw.createdAt || new Date().toISOString(),
      completedAt: raw.completedAt || null
    };
  }

  /* ---------- 应用状态 ---------- */
  const App = {
    KEY: KEY,
    VERSION: VERSION,
    TEXT_FIELDS: TEXT_FIELDS,
    MOODS: MOODS,
    WEEK: WEEK,
    ENERGY_LABELS: ENERGY_LABELS,
    SECTIONS: SECTIONS,
    TEMPLATES: TEMPLATES,

    state: {
      version: 2,
      entries: {},
      reviews: [],
      notes: [],
      actions: [],
      settings: { theme: 'auto', lastExportAt: null, reminderDate: '' }
    },
    ui: {
      view: 'write',
      date: todayKey(),
      search: '',
      tag: '',
      calMonth: todayKey().slice(0, 7),
      reviewId: null,
      actionFilter: 'todo',
      kindFilter: 'all',
      projectFilter: '',
      projectSelected: '',
      renamingProject: false,
      quickKind: '事件'
    },
    currentEntry: null,
    dirty: false,
    saveTimer: null,
    lastSavedAt: null,
    installPrompt: null,

    pad2: pad2,
    ymd: ymd,
    parseYmd: parseYmd,
    todayKey: todayKey,
    addDays: addDays,
    relLabel: relLabel,
    monthLabel: monthLabel,
    esc: esc,
    charCount: charCount,
    uid: uid,
    blankEntry: blankEntry,
    normalizeEntry: normalizeEntry,
    hasContent: hasContent,
    entryCharCount: entryCharCount,
    entryText: entryText,
    getTemplate: getTemplate,
    reviewCharCount: reviewCharCount,
    reviewText: reviewText,
    reviewLabel: reviewLabel,
    reviewHasContent: reviewHasContent,
    normalizeReview: normalizeReview,
    normalizeNote: normalizeNote,
    normalizeAction: normalizeAction,

    getReview: function (id) {
      const list = App.state.reviews;
      for (let i = 0; i < list.length; i += 1) {
        if (list[i].id === id) return list[i];
      }
      return null;
    },

    allProjects: function () {
      const seen = {};
      Object.keys(App.state.entries).forEach(function (key) {
        const project = App.state.entries[key].project;
        if (project) seen[project] = true;
      });
      App.state.reviews.forEach(function (r) { if (r.project) seen[r.project] = true; });
      App.state.actions.forEach(function (a) { if (a.project) seen[a.project] = true; });
      return Object.keys(seen).sort();
    },

    projectStats: function () {
      const stats = {};
      function bucket(name) {
        name = String(name || '').trim();
        if (!name) return null;
        if (!stats[name]) {
          stats[name] = { name: name, days: 0, reviews: 0, actions: 0, openActions: 0, doneActions: 0, words: 0 };
        }
        return stats[name];
      }
      App.sortedEntries().forEach(function (entry) {
        const b = bucket(entry.project);
        if (b) { b.days += 1; b.words += entryCharCount(entry); }
      });
      App.state.reviews.forEach(function (review) {
        const b = bucket(review.project);
        if (b) b.reviews += 1;
      });
      App.state.actions.forEach(function (action) {
        const b = bucket(action.project);
        if (b) {
          b.actions += 1;
          if (action.done) b.doneActions += 1;
          else b.openActions += 1;
        }
      });
      return Object.keys(stats).map(function (key) { return stats[key]; })
        .sort(function (a, b) {
          return (b.days + b.reviews + b.actions) - (a.days + a.reviews + a.actions) || a.name.localeCompare(b.name);
        });
    },

    renameProject: function (from, to) {
      from = String(from || '').trim();
      to = String(to || '').trim().slice(0, 40);
      if (!from || !to || from === to) return 0;
      let changed = 0;
      Object.keys(App.state.entries).forEach(function (key) {
        const entry = App.state.entries[key];
        if (entry.project === from) { entry.project = to; changed += 1; }
      });
      App.state.reviews.forEach(function (review) {
        if (review.project === from) { review.project = to; changed += 1; }
      });
      App.state.actions.forEach(function (action) {
        if (action.project === from) { action.project = to; changed += 1; }
      });
      if (changed) App.persist();
      return changed;
    },

    weekRange: function (dateKey) {
      const d = parseYmd(dateKey || todayKey());
      const dow = (d.getDay() + 6) % 7;
      const start = addDays(ymd(d), -dow);
      return { start: start, end: addDays(start, 6) };
    },

    monthRange: function (monthKey) {
      const parts = String(monthKey || todayKey().slice(0, 7)).split('-').map(Number);
      const days = new Date(parts[0], parts[1], 0).getDate();
      return {
        start: monthKey + '-01',
        end: monthKey + '-' + pad2(days)
      };
    },

    openActions: function () {
      return App.state.actions.filter(actionIsOpen);
    },

    todayActions: function () {
      const today = todayKey();
      return App.state.actions.filter(function (action) {
        return !action.done && action.due && action.due <= today;
      });
    },

    overdueActions: function () {
      const today = todayKey();
      return App.state.actions.filter(function (action) {
        return !action.done && action.due && action.due < today;
      });
    },

    getEntry: function (date, create) {
      let entry = App.state.entries[date];
      if (!entry && create) {
        entry = blankEntry(date);
        App.state.entries[date] = entry;
      }
      return entry || null;
    },

    sortedEntries: function () {
      return Object.keys(App.state.entries)
        .map(function (key) { return App.state.entries[key]; })
        .filter(hasContent)
        .sort(function (a, b) { return b.date.localeCompare(a.date); });
    },

    getAllTags: function () {
      const counts = {};
      App.sortedEntries().forEach(function (entry) {
        entry.tags.forEach(function (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      App.state.reviews.forEach(function (review) {
        (review.tags || []).forEach(function (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      return Object.keys(counts)
        .map(function (tag) { return { tag: tag, count: counts[tag] }; })
        .sort(function (a, b) { return b.count - a.count || a.tag.localeCompare(b.tag); });
    },

    pruneEmptyEntries: function () {
      let changed = false;
      Object.keys(App.state.entries).forEach(function (key) {
        if (!hasContent(App.state.entries[key])) {
          delete App.state.entries[key];
          changed = true;
        }
      });
      return changed;
    },

    persist: function () {
      try {
        global.localStorage.setItem(KEY, JSON.stringify(App.state));
        return true;
      } catch (err) {
        if (App.toast) App.toast('保存失败：浏览器存储空间可能已满');
        return false;
      }
    },

    computeStats: function () {
      const entries = App.sortedEntries();
      const today = todayKey();
      const month = today.slice(0, 7);
      const monthEntries = entries.filter(function (entry) { return entry.date.indexOf(month) === 0; });
      const moodEntries = entries.filter(function (entry) { return entry.mood > 0; });
      const monthMoodEntries = monthEntries.filter(function (entry) { return entry.mood > 0; });
      const words = entries.reduce(function (sum, entry) { return sum + entryCharCount(entry); }, 0);

      const reviews = App.state.reviews.slice();
      const actions = App.state.actions.slice();
      const doneActions = actions.filter(function (action) { return action.done; });
      const completedInMonth = doneActions.filter(function (action) {
        return action.completedAt && action.completedAt.slice(0, 7) === month;
      });
      const reviewByType = {};
      reviews.forEach(function (review) {
        reviewByType[review.template] = (reviewByType[review.template] || 0) + 1;
      });

      let streak = 0;
      let cursor = hasContent(App.state.entries[today]) ? today : addDays(today, -1);
      let guard = 0;
      while (hasContent(App.state.entries[cursor]) && guard < 10000) {
        streak += 1;
        cursor = addDays(cursor, -1);
        guard += 1;
      }

      return {
        total: entries.length,
        words: words,
        monthCount: monthEntries.length,
        streak: streak,
        avgMood: moodEntries.length
          ? moodEntries.reduce(function (sum, entry) { return sum + entry.mood; }, 0) / moodEntries.length
          : 0,
        monthAvgMood: monthMoodEntries.length
          ? monthMoodEntries.reduce(function (sum, entry) { return sum + entry.mood; }, 0) / monthMoodEntries.length
          : 0,
        dailyCount: entries.length,
        reviewCount: reviews.length,
        reviewWords: reviews.reduce(function (sum, review) { return sum + reviewCharCount(review); }, 0),
        reviewByType: reviewByType,
        actionTotal: actions.length,
        actionDone: doneActions.length,
        actionOpen: actions.length - doneActions.length,
        actionOverdue: App.overdueActions().length,
        actionToday: App.todayActions().length,
        actionDoneMonth: completedInMonth.length,
        actionRate: actions.length ? doneActions.length / actions.length : 0
      };
    },

    lastDays: function (n) {
      const out = [];
      const today = todayKey();
      for (let i = n - 1; i >= 0; i -= 1) {
        const date = addDays(today, -i);
        const entry = App.state.entries[date];
        const real = entry && hasContent(entry) ? entry : null;
        out.push({ date: date, mood: real ? real.mood : 0, energy: real ? real.energy : 0 });
      }
      return out;
    }
  };

  /* ---------- 启动时读取 ---------- */
  function load() {
    let raw = null;
    try {
      raw = global.localStorage.getItem(KEY);
    } catch (err) {
      raw = null;
    }
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          let entries = data.entries;
          if (Array.isArray(entries)) {
            const map = {};
            entries.forEach(function (entry) {
              if (entry && entry.date) map[entry.date] = entry;
            });
            entries = map;
          }
          if (entries && typeof entries === 'object') {
            Object.keys(entries).forEach(function (key) {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
              const normalized = normalizeEntry(entries[key], key);
              if (hasContent(normalized)) App.state.entries[key] = normalized;
            });
          }
          if (Array.isArray(data.reviews)) {
            data.reviews.forEach(function (raw) {
              const review = normalizeReview(raw);
              if (review && reviewHasContent(review)) App.state.reviews.push(review);
            });
          }
          if (Array.isArray(data.notes)) {
            data.notes.forEach(function (raw) {
              const note = normalizeNote(raw);
              if (note) App.state.notes.push(note);
            });
          }
          if (Array.isArray(data.actions)) {
            data.actions.forEach(function (raw) {
              const action = normalizeAction(raw);
              if (action) App.state.actions.push(action);
            });
          }
          const settings = data.settings;
          if (settings && typeof settings === 'object') {
            App.state.settings.theme = ['auto', 'light', 'dark'].indexOf(settings.theme) >= 0 ? settings.theme : 'auto';
            App.state.settings.lastExportAt = typeof settings.lastExportAt === 'string' ? settings.lastExportAt : null;
            App.state.settings.reminderDate = typeof settings.reminderDate === 'string' ? settings.reminderDate : '';
          }
        }
      } catch (err) {
        /* 数据损坏时不覆盖原内容，保持空白启动 */
      }
    }
    App.pruneEmptyEntries();
  }

  load();

  /* ---------- 图标 ---------- */
  App.icon = function (name, cls) {
    const paths = {
      left: '<path d="M15 18l-6-6 6-6"/>',
      right: '<path d="M9 18l6-6-6-6"/>',
      chevron: '<path d="M9 18l6-6-6-6"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'
    };
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  };

  global.Review = App;
})(window);
