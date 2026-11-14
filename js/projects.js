/* ============================================================
   项目：按项目聚合日志 / 复盘 / 行动
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  function stat(label, value, unit, note) {
    return '' +
      '<div class="card stat">' +
        '<span class="stat-label">' + label + '</span>' +
        '<div class="stat-value">' + value + '<small>' + unit + '</small></div>' +
        '<span class="stat-note">' + note + '</span>' +
      '</div>';
  }

  function currentName(stats) {
    const selected = App.ui.projectSelected;
    for (let i = 0; i < stats.length; i += 1) {
      if (stats[i].name === selected) return selected;
    }
    return stats.length ? stats[0].name : '';
  }

  function actionAddHTML(name) {
    return '' +
      '<div class="review-action-add">' +
        '<input id="projectActionText" maxlength="300" placeholder="给「' + App.esc(name) + '」加一件事…" autocomplete="off">' +
        '<button type="button" class="btn primary sm" data-act="project-action-add">添加</button>' +
      '</div>';
  }

  function section(title, countText, body) {
    return '' +
      '<section class="card">' +
        '<div class="card-head"><h2>' + title + '</h2><span class="muted">' + countText + '</span></div>' +
        body +
      '</section>';
  }

  App.renderProjects = function () {
    App.currentEntry = null;
    App.currentReview = null;
    const stats = App.projectStats();

    if (!stats.length) {
      $('#main').innerHTML = '' +
        '<div class="container">' +
          '<header class="view-head"><h1>项目</h1>' +
            '<p class="sub">把同一摊事的日志、复盘和行动放在一起看。</p></header>' +
          '<div class="empty">' +
            '<div class="empty-ico">✳</div>' +
            '<h3>还没有项目</h3>' +
            '<p>在今日复盘的「项目」里填一个名字，或在模板复盘里选个项目，这里就会自动把相关记录聚起来。</p>' +
            '<div class="empty-actions">' +
              '<button type="button" class="btn sm" data-nav="write">去写今天的日志</button>' +
              '<button type="button" class="ghost-btn sm" data-act="new-review">新建复盘</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }

    const name = currentName(stats);
    App.ui.projectSelected = name;

    const entries = App.sortedEntries().filter(function (entry) { return entry.project === name; });
    const reviews = App.state.reviews.filter(function (r) { return r.project === name; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    const actions = App.state.actions.filter(function (a) { return a.project === name; });
    const open = actions.filter(function (a) { return !a.done; }).sort(function (a, b) {
      return (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') ||
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
    const done = actions.filter(function (a) { return a.done; });
    const today = App.todayKey();
    const overdue = open.filter(function (a) { return a.due && a.due < today; }).length;
    const lastDay = entries.length ? entries[0].date : (reviews.length ? reviews[0].date : '');
    const renaming = App.ui.renamingProject === true;

    const chips = stats.map(function (item) {
      const total = item.days + item.reviews + item.actions;
      return '<button type="button" class="chip filter' + (item.name === name ? ' on' : '') +
        '" data-act="project-select" data-project="' + App.esc(item.name) + '">' +
        App.esc(item.name) + '<span>' + total + '</span></button>';
    }).join('');

    const titleHTML = renaming
      ? '<div class="project-rename">' +
          '<input id="projectRenameInput" maxlength="40" value="' + App.esc(name) + '" autocomplete="off">' +
          '<button type="button" class="btn primary sm" data-act="project-rename-save">保存</button>' +
          '<button type="button" class="ghost-btn sm" data-act="project-rename-cancel">取消</button>' +
        '</div>'
      : '<div class="project-title-row">' +
          '<h2 class="project-title">' + App.esc(name) + '</h2>' +
          '<button type="button" class="ghost-btn sm" data-act="project-rename">重命名</button>' +
        '</div>';

    $('#main').innerHTML = '' +
      '<div class="container projects">' +
        '<header class="view-head">' +
          '<div class="head-row">' +
            '<div><h1>项目</h1><p class="sub">把同一摊事的日志、复盘和行动放在一起看。</p></div>' +
            '<div class="head-tools">' +
              '<button type="button" class="ghost-btn sm" data-act="project-timeline">在时间线查看</button>' +
              '<button type="button" class="btn sm" data-act="project-new-review">＋ 新建复盘</button>' +
            '</div>' +
          '</div>' +
        '</header>' +

        '<div class="filter-row project-chips">' + chips + '</div>' +

        '<div class="project-detail">' +
          titleHTML +
          '<p class="project-sub muted">' +
            (lastDay ? '最近记录 ' + lastDay : '还没有该项目的记录') +
            ' · 日志 ' + entries.length + ' 天 · 复盘 ' + reviews.length + ' 篇 · 行动 ' + actions.length + ' 项' +
          '</p>' +
        '</div>' +

        '<div class="stat-grid">' +
          stat('日志', entries.length, '天', entries.length ? '共 ' + entries.reduce(function (sum, e) { return sum + App.entryCharCount(e); }, 0) + ' 字' : '还没写') +
          stat('复盘', reviews.length, '篇', '周 / 月 / 事件等模板') +
          stat('行动', actions.length, '项', done.length + ' 项已完成') +
          stat('待办', open.length, '项', open.length ? (overdue ? '其中 ' + overdue + ' 项逾期' : '都还没有到期') : '没有欠着的事') +
        '</div>' +

        section('行动项', open.length ? open.length + ' 待办 · ' + done.length + ' 已完成' : (done.length ? '全部完成' : '还没有行动'),
          (open.length || done.length
            ? '<div class="due-list">' + open.slice(0, 6).map(function (a) { return App.actionRow(a, { compact: true }); }).join('') +
                (open.length > 6 ? '<p class="hint soft">还有 ' + (open.length - 6) + ' 项待办，去「行动」页看全部。</p>' : '') +
              '</div>' +
              (done.length ? '<details class="done-fold"><summary>已完成 ' + done.length + ' 项</summary><div class="due-list">' +
                done.slice(0, 6).map(function (a) { return App.actionRow(a, { compact: true }); }).join('') + '</div></details>' : '')
            : '<p class="plan-empty">这个项目还没有行动项。</p>') +
          actionAddHTML(name)) +

        section('复盘', reviews.length + ' 篇',
          reviews.length
            ? '<div class="entry-list">' + reviews.slice(0, 5).map(App.renderReviewCard).join('') + '</div>' +
              (reviews.length > 5 ? '<p class="hint soft">还有 ' + (reviews.length - 5) + ' 篇，在时间线里看全部。</p>' : '')
            : '<p class="plan-empty">还没有模板复盘挂在「' + App.esc(name) + '」下。</p>') +

        section('日志', entries.length + ' 天',
          entries.length
            ? '<div class="entry-list">' + entries.slice(0, 5).map(App.renderDailyCard).join('') + '</div>' +
              (entries.length > 5 ? '<p class="hint soft">还有 ' + (entries.length - 5) + ' 天，在时间线里看全部。</p>' : '')
            : '<p class="plan-empty">还没有给这一天打上这个项目。</p>') +
      '</div>';

    if (renaming) {
      const input = $('#projectRenameInput');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  };

  App.selectProject = function (name) {
    if (!name) return;
    App.ui.projectSelected = name;
    App.ui.renamingProject = false;
    if (App.ui.view === 'projects') App.renderProjects();
    else App.switchView('projects');
  };

  App.startProjectRename = function () {
    App.ui.renamingProject = true;
    App.renderProjects();
  };

  App.saveProjectRename = function () {
    const input = $('#projectRenameInput');
    const from = App.ui.projectSelected;
    const to = input ? String(input.value).trim().slice(0, 40) : '';
    if (!to) {
      App.toast('项目名不能为空');
      if (input) input.focus();
      return;
    }
    App.ui.renamingProject = false;
    if (to === from) {
      App.renderProjects();
      return;
    }
    const changed = App.renameProject(from, to);
    App.ui.projectSelected = to;
    App.renderProjects();
    App.toast(changed ? '已重命名，同步更新了 ' + changed + ' 条记录' : '项目名已更新');
  };

  App.showProjectInTimeline = function () {
    const name = App.ui.projectSelected;
    if (!name) {
      App.switchView('history');
      return;
    }
    App.ui.search = '';
    App.ui.tag = '';
    App.ui.kindFilter = 'all';
    App.ui.projectFilter = name;
    if (App.ui.view === 'history') App.renderHistory();
    else App.switchView('history');
    App.toast('已按项目「' + name + '」筛选时间线');
  };

  App.addProjectAction = function () {
    const input = $('#projectActionText');
    const name = App.ui.projectSelected;
    if (!input || !name) return;
    const text = input.value.trim();
    if (!text) {
      App.toast('先写下要做的事');
      input.focus();
      return;
    }
    App.state.actions.unshift({
      id: App.uid(),
      text: text,
      done: false,
      due: '',
      project: name,
      source: '项目 · ' + name,
      reviewId: '',
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    App.persist();
    App.renderProjects();
    App.toast('已添加行动');
    global.requestAnimationFrame(function () {
      const next = $('#projectActionText');
      if (next) next.focus();
    });
  };
})(window);
