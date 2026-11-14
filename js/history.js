/* ============================================================
   时间线：日历 / 搜索 / 标签筛选 / 随机回顾
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function dailyCard(entry) {
    const d = App.parseYmd(entry.date);
    const mood = App.MOODS.find(function (m) { return m.v === entry.mood; });
    const fallback = (entry.done || '').trim().split('\n')[0];
    const title = (entry.summary || '').trim() || fallback || '这一天没有写总结';
    const tags = entry.tags.slice(0, 4).map(function (tag) {
      return '<span class="chip sm">' + App.esc(tag) + '</span>';
    }).join('');
    return '' +
      '<button type="button" class="entry-card" data-open-date="' + entry.date + '">' +
        '<div class="entry-date"><strong>' + App.pad2(d.getDate()) + '</strong><span>' + (d.getMonth() + 1) + '月 · ' + App.WEEK[d.getDay()] + '</span></div>' +
        '<div class="entry-body">' +
          '<div class="entry-title"><span class="type-badge">日志</span>' + App.esc(title) + '</div>' +
          '<div class="entry-meta">' + (entry.project ? '<span class="entry-project">' + App.esc(entry.project) + '</span> · ' : '') +
            (mood ? mood.emoji + ' ' : '') + App.entryCharCount(entry) + ' 字' +
            (entry.energy ? ' · 精力 ' + entry.energy + '/5' : '') + '</div>' +
          (tags ? '<div class="entry-tags">' + tags + '</div>' : '') +
        '</div>' +
        '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true">' + '<path d="M9 18l6-6-6-6"/>' + '</svg>' +
      '</button>';
  }

  function reviewCard(review) {
    const tpl = App.getTemplate(review.template);
    const d = App.parseYmd(review.date);
    const firstValue = (function () {
      const keys = Object.keys(review.values || {});
      for (let i = 0; i < keys.length; i += 1) {
        const text = String(review.values[keys[i]] || '').trim();
        if (text) return text.split('\n')[0];
      }
      return '';
    })();
    const title = review.title.trim() || firstValue || '未命名复盘';
    const tags = review.tags.slice(0, 4).map(function (tag) {
      return '<span class="chip sm">' + App.esc(tag) + '</span>';
    }).join('');
    return '' +
      '<button type="button" class="entry-card" data-open-review="' + review.id + '">' +
        '<div class="entry-date"><strong>' + App.pad2(d.getDate()) + '</strong><span>' + (d.getMonth() + 1) + '月 · ' + App.WEEK[d.getDay()] + '</span></div>' +
        '<div class="entry-body">' +
          '<div class="entry-title"><span class="type-badge review">' + tpl.name + '</span>' + App.esc(title) + '</div>' +
          '<div class="entry-meta">' + (review.project ? App.esc(review.project) + ' · ' : '') +
            App.reviewCharCount(review) + ' 字</div>' +
          (tags ? '<div class="entry-tags">' + tags + '</div>' : '') +
        '</div>' +
        '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
      '</button>';
  }

  function empty(title, sub, action) {
    return '' +
      '<div class="empty">' +
        '<div class="empty-ico">✳</div>' +
        '<h3>' + title + '</h3><p>' + sub + '</p>' +
        (action || '') +
      '</div>';
  }

  App.renderHistory = function () {
    App.currentEntry = null;
    App.currentReview = null;
    const tags = App.getAllTags().slice(0, 16);
    const projects = App.allProjects();
    const kinds = [['all', '全部'], ['daily', '日志'], ['review', '复盘']];

    $('#main').innerHTML = '' +
      '<div class="container">' +
        '<header class="view-head">' +
          '<div class="head-row">' +
            '<div><h1>时间线</h1><p class="sub">翻一翻走过的日子，也翻一翻想过的事。</p></div>' +
            '<div class="head-tools">' +
              '<button type="button" class="ghost-btn sm" data-act="random-review">随机回顾</button>' +
              '<button type="button" class="btn sm" data-act="new-review">＋ 新建复盘</button>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<div class="card search-card">' +
          '<span class="search-ico">' + App.icon('search') + '</span>' +
          '<input id="searchInput" class="search-input" value="' + App.esc(App.ui.search) +
            '" placeholder="搜索内容、项目或标签…" autocomplete="off">' +
          '<button type="button" class="search-clear" data-act="clear-search" aria-label="清除搜索">×</button>' +
        '</div>' +
        '<div class="filter-row">' +
          '<span class="filter-label">类型</span>' +
          kinds.map(function (kind) {
            return '<button type="button" class="chip filter' + (App.ui.kindFilter === kind[0] ? ' on' : '') +
              '" data-kind-filter="' + kind[0] + '">' + kind[1] + '</button>';
          }).join('') +
          (projects.length
            ? '<select id="projectFilter" class="chip filter project-select" aria-label="按项目筛选">' +
                '<option value="">全部项目</option>' +
                projects.map(function (project) {
                  return '<option value="' + App.esc(project) + '"' +
                    (App.ui.projectFilter === project ? ' selected' : '') + '>' + App.esc(project) + '</option>';
                }).join('') +
              '</select>'
            : '') +
          (tags.length ? '<span class="filter-label" style="margin-left:8px">标签</span>' : '') +
          tags.map(function (item) {
            return '<button type="button" class="chip filter' + (App.ui.tag === item.tag ? ' on' : '') +
              '" data-filter-tag="' + App.esc(item.tag) + '">' + App.esc(item.tag) + '<span>' + item.count + '</span></button>';
          }).join('') +
          '<button type="button" class="ghost-btn sm filter-clear" id="clearFilters" data-act="clear-filters" style="display:none">清除筛选</button>' +
        '</div>' +
        '<div id="historyBody"></div>' +
      '</div>';

    renderBody();
  };

  function renderBody() {
    const body = $('#historyBody');
    if (!body) return;
    const query = App.ui.search.trim().toLowerCase();
    const filtering = !!(query || App.ui.tag || App.ui.kindFilter !== 'all' || App.ui.projectFilter);
    const kind = App.ui.kindFilter;
    const clearBtn = $('#clearFilters');
    if (clearBtn) clearBtn.style.display = filtering ? '' : 'none';

    if (filtering) {
      const results = [];
      if (kind !== 'review') {
        App.sortedEntries().forEach(function (entry) {
          if (App.ui.projectFilter && entry.project !== App.ui.projectFilter) return;
          if (query && App.entryText(entry).indexOf(query) < 0) return;
          if (App.ui.tag && entry.tags.indexOf(App.ui.tag) < 0) return;
          results.push({ date: entry.date, kind: 'daily', item: entry });
        });
      }
      if (kind !== 'daily') {
        App.state.reviews.forEach(function (review) {
          if (App.ui.projectFilter && review.project !== App.ui.projectFilter) return;
          if (query && App.reviewText(review).indexOf(query) < 0) return;
          if (App.ui.tag && review.tags.indexOf(App.ui.tag) < 0) return;
          results.push({ date: review.date, kind: 'review', item: review });
        });
      }
      results.sort(function (a, b) { return b.date.localeCompare(a.date); });

      body.innerHTML = '' +
        '<div class="list-head"><h2>' + (query ? '搜索结果' : '筛选结果') + '</h2>' +
          '<span class="muted">' + results.length + ' 条</span></div>' +
        (results.length
          ? '<div class="entry-list">' + results.map(function (row) {
            return row.kind === 'daily' ? dailyCard(row.item) : reviewCard(row.item);
          }).join('') + '</div>'
          : empty('没有找到相关记录', '换个关键词，或清掉筛选条件试试。'));
      return;
    }

    const monthEntries = App.sortedEntries().filter(function (entry) { return entry.date.indexOf(App.ui.calMonth) === 0; });
    const monthReviews = App.state.reviews.filter(function (review) { return review.date.indexOf(App.ui.calMonth) === 0; });
    const monthCount = monthEntries.length + monthReviews.length;
    const monthRows = monthReviews.map(function (review) { return { date: review.date, kind: 'review', item: review }; })
      .concat(monthEntries.map(function (entry) { return { date: entry.date, kind: 'daily', item: entry }; }))
      .sort(function (a, b) {
        return b.date.localeCompare(a.date) || (a.kind === 'review' ? -1 : 1);
      });

    body.innerHTML = '' +
      calendarHTML() +
      '<div class="list-head"><h2>' + App.monthLabel(App.ui.calMonth) + '</h2><span class="muted">' + monthCount + ' 条</span></div>' +
      (monthCount
        ? '<div class="entry-list">' +
            monthRows.map(function (row) {
              return row.kind === 'review' ? reviewCard(row.item) : dailyCard(row.item);
            }).join('') +
          '</div>'
        : empty('这个月还没有记录', '点日历上的任意一天补写日志，或者新建一篇复盘。',
            '<button type="button" class="btn sm" style="margin-top:10px" data-act="new-review">新建复盘</button>'));
  }

  App.renderHistoryBody = renderBody;
  App.renderDailyCard = dailyCard;
  App.renderReviewCard = reviewCard;

  function calendarHTML() {
    const parts = App.ui.calMonth.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const first = new Date(year, month - 1, 1);
    const days = new Date(year, month, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const today = App.todayKey();
    const currentMonth = today.slice(0, 7);
    let cells = '';

    for (let i = 0; i < offset; i += 1) cells += '<div class="cal-blank"></div>';
    for (let day = 1; day <= days; day += 1) {
      const key = year + '-' + App.pad2(month) + '-' + App.pad2(day);
      const entry = App.state.entries[key];
      const has = entry && App.hasContent(entry);
      const future = key > today;
      cells += '<button type="button" class="cal-day' + (has ? ' has' : '') + (key === today ? ' today' : '') +
        '" data-open-date="' + key + '"' + (future ? ' disabled' : '') + ' aria-label="' + key + '">' +
        '<span>' + day + '</span>' + (has ? '<i class="dot"></i>' : '') + '</button>';
    }

    return '' +
      '<div class="card cal-card">' +
        '<div class="cal-head">' +
          '<button type="button" class="icon-btn" data-act="cal-prev" aria-label="上个月">' + App.icon('left') + '</button>' +
          '<div class="cal-title">' + year + ' 年 ' + month + ' 月</div>' +
          '<button type="button" class="icon-btn" data-act="cal-next" aria-label="下个月"' + (App.ui.calMonth >= currentMonth ? ' disabled' : '') + '>' + App.icon('right') + '</button>' +
          '<button type="button" class="ghost-btn sm" data-act="cal-today">本月</button>' +
        '</div>' +
        '<div class="cal-week">' + ['一', '二', '三', '四', '五', '六', '日'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="cal-grid">' + cells + '</div>' +
        '<div class="cal-legend"><i></i> 有日志的日子 · 点任意日期可补写</div>' +
      '</div>';
  }

  App.shiftMonth = function (n) {
    const parts = App.ui.calMonth.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1 + n, 1);
    const key = d.getFullYear() + '-' + App.pad2(d.getMonth() + 1);
    if (key > App.todayKey().slice(0, 7)) return;
    App.ui.calMonth = key;
    App.renderHistory();
  };

  App.setKindFilter = function (kind) {
    if (['all', 'daily', 'review'].indexOf(kind) < 0) return;
    App.ui.kindFilter = kind;
    $$('[data-kind-filter]').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.kindFilter === kind);
    });
    renderBody();
  };

  App.setTagFilter = function (tag) {
    App.ui.tag = App.ui.tag === tag ? '' : tag;
    App.renderHistory();
  };

  App.clearSearch = function () {
    App.ui.search = '';
    App.renderHistory();
    const input = $('#searchInput');
    if (input) input.focus();
  };

  App.clearFilters = function () {
    App.ui.search = '';
    App.ui.tag = '';
    App.ui.kindFilter = 'all';
    App.ui.projectFilter = '';
    App.renderHistory();
  };

  App.setProjectFilter = function (project) {
    App.ui.projectFilter = project || '';
    renderBody();
  };

  App.randomReview = function () {
    const pool = [];
    App.sortedEntries().forEach(function (entry) { pool.push({ kind: 'daily', item: entry }); });
    App.state.reviews.forEach(function (review) { pool.push({ kind: 'review', item: review }); });
    if (!pool.length) {
      App.toast('还没有可以回顾的内容');
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick.kind === 'daily') {
      App.goWrite(pick.item.date);
    } else {
      App.openReview(pick.item.id);
    }
    App.toast('随机翻到一篇旧记录');
  };
})(window);
