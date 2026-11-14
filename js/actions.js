/* ============================================================
   行动项
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function dueLabel(due) {
    const today = App.todayKey();
    if (due === today) return '今天';
    if (due === App.addDays(today, 1)) return '明天';
    if (due === App.addDays(today, -1)) return '昨天';
    const d = App.parseYmd(due);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  App.actionRow = function (action, opts) {
    opts = opts || {};
    const today = App.todayKey();
    const overdue = !action.done && action.due && action.due < today;
    const dateText = action.due ? dueLabel(action.due) : '设日期';
    return '' +
      '<div class="action-row' + (action.done ? ' done' : '') + '" data-action-row="' + action.id + '">' +
        '<button type="button" class="plan-check action-check" data-action-toggle="' + action.id +
          '" aria-pressed="' + action.done + '" aria-label="' + (action.done ? '标记为未完成' : '标记为完成') + '"></button>' +
        '<div class="action-body">' +
          (opts.compact
            ? '<div class="action-text-plain">' + App.esc(action.text) + '</div>'
            : '<input class="action-input" data-action-text="' + action.id + '" value="' + App.esc(action.text) +
              '" maxlength="300" autocomplete="off" aria-label="行动内容">') +
          '<div class="action-meta">' +
            '<button type="button" class="meta-chip' + (overdue ? ' overdue' : '') + (action.due ? '' : ' ghost') +
              '" data-action-date="' + action.id + '">' + (action.due ? '◷ ' + dateText : '◷ 设日期') + '</button>' +
            (action.project ? '<span class="meta-chip plain">' + App.esc(action.project) + '</span>' : '') +
            (action.source && !opts.compact ? '<span class="meta-src">' + App.esc(action.source) + '</span>' : '') +
            '<input type="date" class="date-picker" id="actionDue-' + action.id + '" data-action-due-input="' + action.id +
              '" value="' + (action.due || '') + '" tabindex="-1" aria-hidden="true">' +
          '</div>' +
        '</div>' +
        (opts.compact ? '' : '<button type="button" class="action-del" data-action-del="' + action.id + '" aria-label="删除行动">×</button>') +
      '</div>';
  };

  App.renderActions = function () {
    const stats = App.computeStats();
    const projects = App.allProjects();
    const filter = App.ui.actionFilter;
    const tabs = [['todo', '待办'], ['done', '已完成'], ['all', '全部']];

    $('#main').innerHTML = '' +
      '<div class="container actions">' +
        '<header class="view-head"><h1>行动</h1><p class="sub">复盘之后的下一步。每次留 1–3 件就够。</p></header>' +
        '<div class="action-stats card">' +
          '<div class="as-item"><strong id="asOpen">' + stats.actionOpen + '</strong><span>待办</span></div>' +
          '<div class="as-sep"></div>' +
          '<div class="as-item' + (stats.actionOverdue ? ' warn' : '') + '"><strong id="asOverdue">' + stats.actionOverdue + '</strong><span>逾期</span></div>' +
          '<div class="as-sep"></div>' +
          '<div class="as-item"><strong id="asDoneMonth">' + stats.actionDoneMonth + '</strong><span>本月完成</span></div>' +
        '</div>' +
        '<section class="card action-add-card">' +
          '<input id="actionText" class="action-add-input" maxlength="300" placeholder="下一件要做的事…" autocomplete="off">' +
          '<div class="action-add-row">' +
            '<label class="date-field"><span>截止</span><input type="date" id="actionDue"></label>' +
            '<input id="actionProject" class="project-field" list="projectList" maxlength="40" placeholder="项目（可选）" autocomplete="off">' +
            '<datalist id="projectList">' +
              projects.map(function (p) { return '<option value="' + App.esc(p) + '"></option>'; }).join('') +
            '</datalist>' +
            '<button type="button" class="btn primary sm" data-act="action-add">添加</button>' +
          '</div>' +
        '</section>' +
        '<div class="filter-tabs">' +
          tabs.map(function (tab) {
            return '<button type="button" class="filter-tab' + (filter === tab[0] ? ' on' : '') +
              '" data-action-filter="' + tab[0] + '">' + tab[1] + '</button>';
          }).join('') +
        '</div>' +
        '<div id="actionList"></div>' +
      '</div>';

    renderActionsList();
  };

  function groupHTML(label, actions, opts) {
    if (!actions.length) return '';
    return '' +
      '<div class="action-group">' +
        '<div class="action-group-head"><span>' + label + '</span><span class="muted">' + actions.length + '</span></div>' +
        actions.map(function (action) { return App.actionRow(action, opts); }).join('') +
      '</div>';
  }

  function renderActionsList() {
    const wrap = $('#actionList');
    if (!wrap) return;
    const filter = App.ui.actionFilter;
    const today = App.todayKey();
    const actions = App.state.actions.slice();

    if (!actions.length) {
      wrap.innerHTML = empty('还没有行动项', '在复盘里想清楚之后，把下一步放到这里。');
      return;
    }

    if (filter === 'done') {
      const done = actions.filter(function (a) { return a.done; })
        .sort(function (a, b) { return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); });
      wrap.innerHTML = done.length
        ? groupHTML('已完成', done, {})
        : empty('还没有完成记录', '完成一项后，它会出现在这里。');
      return;
    }

    if (filter === 'all') {
      const open = actions.filter(function (a) { return !a.done; });
      const done = actions.filter(function (a) { return a.done; })
        .sort(function (a, b) { return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); });
      wrap.innerHTML = groupHTML('待办', open, {}) + groupHTML('已完成', done, {});
      return;
    }

    const open = actions.filter(function (a) { return !a.done; });
    const overdue = open.filter(function (a) { return a.due && a.due < today; })
      .sort(function (a, b) { return a.due.localeCompare(b.due); });
    const dueToday = open.filter(function (a) { return a.due === today; });
    const upcoming = open.filter(function (a) { return a.due && a.due > today; })
      .sort(function (a, b) { return a.due.localeCompare(b.due); });
    const someday = open.filter(function (a) { return !a.due; });

    wrap.innerHTML = groupHTML('逾期', overdue, {}) +
      groupHTML('今天', dueToday, {}) +
      groupHTML('接下来', upcoming, {}) +
      groupHTML('没有日期', someday, {}) ||
      empty('待办清空了', '做得不错。去复盘一下，再决定下一步。');
  }

  function empty(title, sub) {
    return '<div class="empty"><div class="empty-ico">✓</div><h3>' + title + '</h3><p>' + sub + '</p></div>';
  }

  App.addActionFromForm = function () {
    const input = $('#actionText');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      App.toast('先写下要做的事');
      input.focus();
      return;
    }
    const dueEl = $('#actionDue');
    const projectEl = $('#actionProject');
    App.state.actions.unshift({
      id: App.uid(),
      text: text,
      done: false,
      due: dueEl && /^\d{4}-\d{2}-\d{2}$/.test(dueEl.value) ? dueEl.value : '',
      project: projectEl ? projectEl.value.trim().slice(0, 40) : '',
      source: '',
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    App.persist();
    input.value = '';
    if (dueEl) dueEl.value = '';
    refreshStats();
    renderActionsList();
    input.focus();
    App.toast('已添加');
  };

  function refreshStats() {
    const stats = App.computeStats();
    const open = $('#asOpen');
    const overdue = $('#asOverdue');
    const doneMonth = $('#asDoneMonth');
    if (open) open.textContent = stats.actionOpen;
    if (overdue) overdue.textContent = stats.actionOverdue;
    if (doneMonth) doneMonth.textContent = stats.actionDoneMonth;
  }

  App.toggleAction = function (id) {
    const action = App.state.actions.find(function (a) { return a.id === id; });
    if (!action) return;
    action.done = !action.done;
    action.completedAt = action.done ? new Date().toISOString() : null;
    App.persist();

    if (App.ui.view === 'actions') {
      refreshStats();
      renderActionsList();
    } else {
      const row = $('[data-action-row="' + id + '"]');
      if (row) {
        row.classList.toggle('done', action.done);
        const check = $('[data-action-toggle="' + id + '"]', row);
        if (check) check.setAttribute('aria-pressed', action.done);
      }
    }
    App.toast(action.done ? '完成一项' : '已恢复为待办');
  };

  App.deleteAction = function (id) {
    const action = App.state.actions.find(function (a) { return a.id === id; });
    if (!action) return;
    if (!global.confirm('删除「' + action.text.slice(0, 20) + '」？')) return;
    App.state.actions = App.state.actions.filter(function (a) { return a.id !== id; });
    App.persist();
    refreshStats();
    renderActionsList();
    App.toast('已删除');
  };

  App.updateActionText = function (id, text) {
    const action = App.state.actions.find(function (a) { return a.id === id; });
    if (!action) return;
    action.text = text;
    App.touch();
  };

  App.setActionDue = function (id, due) {
    const action = App.state.actions.find(function (a) { return a.id === id; });
    if (!action) return;
    action.due = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '';
    App.persist();
    if (App.ui.view === 'actions') {
      refreshStats();
      renderActionsList();
    }
  };

  App.openActionDate = function (id) {
    const input = document.getElementById('actionDue-' + id);
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    } catch (err) {
      input.focus();
    }
  };

  App.setActionFilter = function (filter) {
    if (['todo', 'done', 'all'].indexOf(filter) < 0) return;
    App.ui.actionFilter = filter;
    $$('[data-action-filter]').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.actionFilter === filter);
    });
    renderActionsList();
  };
})(window);
