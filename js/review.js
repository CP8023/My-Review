/* ============================================================
   复盘模板：周 / 月 / 项目 / 事件 / 自由
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  let closeModal = null;

  App.openTemplatePicker = function (project) {
    App.pendingProject = project || '';
    if (closeModal) closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = '' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="tplTitle">' +
        '<div class="modal-head">' +
          '<div><h2 id="tplTitle">新建复盘</h2><p class="hint">选一个模板。字段不多，够用就好。</p></div>' +
          '<button type="button" class="icon-btn" data-modal-close aria-label="关闭">×</button>' +
        '</div>' +
        '<div class="template-grid">' +
          App.TEMPLATES.map(function (tpl) {
            return '<button type="button" class="template-card" data-template="' + tpl.id + '">' +
              '<span class="tpl-icon">' + tpl.icon + '</span>' +
              '<span class="tpl-name">' + tpl.name + '</span>' +
              '<span class="tpl-desc">' + tpl.desc + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="modal-foot">' +
          '<span class="hint">不想从空白开始？</span>' +
          '<button type="button" class="ghost-btn sm" data-draft="week">本周事实草稿</button>' +
          '<button type="button" class="ghost-btn sm" data-draft="month">本月事实草稿</button>' +
        '</div>' +
      '</div>';

    function onKey(ev) {
      if (ev.key === 'Escape') close();
    }
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      closeModal = null;
    }
    closeModal = close;

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay || ev.target.closest('[data-modal-close]')) {
        close();
        return;
      }
      const draft = ev.target.closest('[data-draft]');
      if (draft) {
        close();
        App.generateDraft(draft.dataset.draft);
        return;
      }
      const card = ev.target.closest('[data-template]');
      if (card) {
        close();
        App.createReview(card.dataset.template);
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    global.requestAnimationFrame(function () { overlay.classList.add('show'); });
  };

  App.createReview = function (templateId) {
    App.flushSave();
    const tpl = App.getTemplate(templateId);
    const review = {
      id: App.uid(),
      template: tpl.id,
      title: '',
      date: App.todayKey(),
      project: App.pendingProject || '',
      tags: [],
      values: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tpl.fields.forEach(function (field) { review.values[field.key] = ''; });
    App.pendingProject = '';
    App.state.reviews.unshift(review);
    App.currentReview = review;
    App.currentEntry = null;
    App.ui.reviewId = review.id;
    App.ui.view = 'review';
    App.ui.calMonth = review.date.slice(0, 7);
    App.persist();
    App.render();
    global.requestAnimationFrame(function () {
      const title = $('.review-title');
      if (title) title.focus();
    });
  };

  function periodFacts(start, end) {
    const entries = App.sortedEntries().filter(function (entry) { return entry.date >= start && entry.date <= end; });
    const reviews = App.state.reviews.filter(function (r) { return r.date >= start && r.date <= end; });
    const words = entries.reduce(function (sum, entry) { return sum + App.entryCharCount(entry); }, 0) +
      reviews.reduce(function (sum, r) { return sum + App.reviewCharCount(r); }, 0);
    const moods = entries.filter(function (e) { return e.mood > 0; }).map(function (e) { return e.mood; });
    const energies = entries.filter(function (e) { return e.energy > 0; }).map(function (e) { return e.energy; });
    const avg = function (list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : 0; };
    const doneInPeriod = App.state.actions.filter(function (action) {
      const day = action.completedAt ? String(action.completedAt).slice(0, 10) : '';
      return action.done && day >= start && day <= end;
    }).length;
    const open = App.openActions().length;
    const overdue = App.overdueActions().length;
    const tags = {};
    const bump = function (list) {
      (list || []).forEach(function (tag) { tags[tag] = (tags[tag] || 0) + 1; });
    };
    entries.forEach(function (entry) { bump(entry.tags); });
    reviews.forEach(function (r) { bump(r.tags); });
    const topTags = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 3);
    const moodText = avg(moods) ? avg(moods).toFixed(1) + ' / 5（' + moods.length + ' 天选过心情）' : '这段时间没有选心情';

    return [
      '- 记录：日志 ' + entries.length + ' 篇 · 模板复盘 ' + reviews.length + ' 篇 · 合计 ' + words.toLocaleString('zh-CN') + ' 字',
      '- 心情：' + moodText,
      '- 精力：' + (avg(energies) ? avg(energies).toFixed(1) + ' / 5' : '没有记录'),
      '- 行动：这段时间完成 ' + doneInPeriod + ' 项 · 当前待办 ' + open + ' 项' + (overdue ? '（逾期 ' + overdue + ' 项）' : ''),
      '- 高频标签：' + (topTags.length ? topTags.join('、') : '还没有打标签'),
      '- 区间：' + start + ' ~ ' + end
    ];
  }

  App.generateDraft = function (kind) {
    const week = kind === 'week';
    const tpl = App.getTemplate(week ? 'week' : 'month');
    let start;
    let end;
    let title;
    if (week) {
      const range = App.weekRange(App.todayKey());
      start = range.start;
      end = range.end;
      title = start.slice(5).replace('-', '/') + ' - ' + end.slice(5).replace('-', '/') + ' 周复盘';
    } else {
      const month = App.todayKey().slice(0, 7);
      const range = App.monthRange(month);
      start = range.start;
      end = range.end;
      title = Number(month.slice(5)) + ' 月复盘';
    }

    const facts = periodFacts(start, end);
    const review = {
      id: App.uid(),
      template: tpl.id,
      title: title,
      date: App.todayKey(),
      project: App.pendingProject || '',
      tags: [],
      values: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    App.pendingProject = '';
    tpl.fields.forEach(function (field) { review.values[field.key] = ''; });
    if ('results' in review.values) {
      review.values.results = ['【已自动汇总的事实，剩下的留给你】'].concat(facts).join('\n');
    }

    App.flushSave();
    if (App.pruneEmptyReviews()) App.persist();
    App.state.reviews.unshift(review);
    App.currentReview = review;
    App.currentEntry = null;
    App.ui.reviewId = review.id;
    App.ui.view = 'review';
    App.ui.calMonth = review.date.slice(0, 7);
    App.persist();
    App.render();
    App.toast(week ? '本周事实已填好，写几句就好' : '本月事实已填好，写几句就好');
    global.requestAnimationFrame(function () {
      const box = document.querySelector('[data-review-field="goals"]');
      if (box) { box.focus(); box.scrollIntoView({ block: 'center' }); }
    });
  };

  function fieldHTML(review, field) {
    return '' +
      '<section class="card section">' +
        '<div class="section-head">' +
          '<div class="s-title"><h2>' + field.label + '</h2></div>' +
          '<span class="counter" data-review-counter="' + field.key + '">' +
            App.charCount(review.values[field.key]) + ' 字</span>' +
        '</div>' +
        '<textarea class="ta" data-review-field="' + field.key + '" rows="' + (field.rows || 3) +
          '" placeholder="' + App.esc(field.ph) + '" data-autosize>' + App.esc(review.values[field.key]) + '</textarea>' +
      '</section>';
  }

  function tagChips(review) {
    return review.tags.map(function (tag, i) {
      return '<span class="chip">' + App.esc(tag) +
        '<button type="button" data-review-tag-del="' + i + '" aria-label="移除标签 ' + App.esc(tag) + '">×</button></span>';
    }).join('');
  }

  function linkedActions(review) {
    return App.state.actions.filter(function (action) { return action.reviewId === review.id; });
  }

  App.renderReview = function () {
    const review = App.getReview(App.ui.reviewId);
    if (!review) {
      App.ui.view = 'history';
      App.render();
      return;
    }
    App.currentReview = review;
    App.currentEntry = null;
    const tpl = App.getTemplate(review.template);
    const actions = linkedActions(review);
    const projects = App.allProjects();
    const words = App.reviewCharCount(review);

    $('#main').innerHTML = '' +
      '<div class="container review">' +
        '<div class="review-top">' +
          '<button type="button" class="ghost-btn" data-act="back-history">← 时间线</button>' +
          '<span class="chip kind"><span class="tpl-icon sm">' + tpl.icon + '</span>' + tpl.name + '</span>' +
        '</div>' +
        '<header class="review-head">' +
          '<input class="review-title" data-review-title maxlength="120" value="' + App.esc(review.title) +
            '" placeholder="' + App.esc(tpl.titleHint) + '">' +
          '<div class="review-meta">' +
            '<label class="meta-field"><span>日期</span><input type="date" data-review-date value="' + review.date + '" max="' + App.todayKey() + '"></label>' +
            '<label class="meta-field"><span>项目</span><input data-review-project list="reviewProjects" maxlength="40" value="' +
              App.esc(review.project) + '" placeholder="可选" autocomplete="off"></label>' +
            '<datalist id="reviewProjects">' +
              projects.map(function (p) { return '<option value="' + App.esc(p) + '"></option>'; }).join('') +
            '</datalist>' +
          '</div>' +
        '</header>' +
        tpl.fields.map(function (field) { return fieldHTML(review, field); }).join('') +
        '<section class="card section">' +
          '<div class="section-head">' +
            '<div class="s-title"><h2>标签</h2><span class="hint">回车添加，方便筛选和串联。</span></div>' +
          '</div>' +
          '<div class="tag-editor">' +
            '<div id="reviewTagChips" class="tag-chips">' + tagChips(review) + '</div>' +
            '<input id="reviewTagInput" class="tag-input" maxlength="16" placeholder="如：项目A、沟通、决策" autocomplete="off">' +
          '</div>' +
        '</section>' +
        '<section class="card section">' +
          '<div class="section-head">' +
            '<div class="s-title"><h2>行动项</h2><span class="hint">复盘落在一两件具体的事上。</span></div>' +
            '<span class="counter">' + actions.length + ' 项</span>' +
          '</div>' +
          '<div class="review-actions">' +
            (actions.length
              ? actions.map(function (action) { return App.actionRow(action, {}); }).join('')
              : '<p class="plan-empty">还没有行动项。想清楚下一步，再写一条。</p>') +
            '<div class="review-action-add">' +
              '<input id="reviewActionText" maxlength="300" placeholder="从这篇复盘提炼一件事…" autocomplete="off">' +
              '<input type="date" id="reviewActionDue" aria-label="截止日期">' +
              '<button type="button" class="btn primary sm" data-act="review-add-action">添加</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<div class="savebar">' +
          '<div class="save-info">' +
            '<span class="words">共 <strong id="wordTotal">' + words + '</strong> 字</span>' +
            '<span class="status" id="saveStatus">已自动保存</span>' +
          '</div>' +
          '<div class="save-actions">' +
            '<button type="button" class="text-danger" data-act="delete-review">删除</button>' +
            '<button type="button" class="btn primary" data-act="save">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    global.requestAnimationFrame(function () {
      $$('.ta[data-autosize]').forEach(App.autosize);
    });
  };

  App.updateReviewCounters = function () {
    const review = App.currentReview;
    if (!review) return;
    $$('[data-review-counter]').forEach(function (el) {
      el.textContent = App.charCount(review.values[el.dataset.reviewCounter]) + ' 字';
    });
    const total = $('#wordTotal');
    if (total) total.textContent = App.reviewCharCount(review);
  };

  App.addReviewTag = function (raw) {
    const review = App.currentReview;
    if (!review) return;
    const tag = String(raw || '').trim().replace(/^#+/, '');
    if (!tag) return;
    if (tag.length > 16) {
      App.toast('标签最多 16 个字');
      return;
    }
    if (review.tags.indexOf(tag) >= 0) {
      App.toast('这个标签已经有了');
      return;
    }
    if (review.tags.length >= 12) {
      App.toast('最多添加 12 个标签');
      return;
    }
    review.tags.push(tag);
    App.touch();
    const wrap = $('#reviewTagChips');
    if (wrap) wrap.innerHTML = tagChips(review);
    const input = $('#reviewTagInput');
    if (input) input.focus();
  };

  App.deleteReviewTag = function (index) {
    const review = App.currentReview;
    if (!review) return;
    review.tags.splice(index, 1);
    App.touch();
    const wrap = $('#reviewTagChips');
    if (wrap) wrap.innerHTML = tagChips(review);
    const input = $('#reviewTagInput');
    if (input) input.focus();
  };

  App.addReviewAction = function () {
    const review = App.currentReview;
    if (!review) return;
    const input = $('#reviewActionText');
    const dueEl = $('#reviewActionDue');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      App.toast('先写下要做的事');
      input.focus();
      return;
    }
    const tpl = App.getTemplate(review.template);
    App.state.actions.unshift({
      id: App.uid(),
      text: text,
      done: false,
      due: dueEl && /^\d{4}-\d{2}-\d{2}$/.test(dueEl.value) ? dueEl.value : '',
      project: review.project || '',
      source: (tpl.name + (review.title.trim() ? ' · ' + review.title.trim() : '')).slice(0, 60),
      reviewId: review.id,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    App.persist();
    App.toast('已添加行动');
    App.renderReview();
    global.requestAnimationFrame(function () {
      const next = $('#reviewActionText');
      if (next) next.focus();
    });
  };

  App.deleteReview = function () {
    const review = App.currentReview;
    if (!review) return;
    if (!global.confirm('删除这篇复盘？关联的行动项会保留。')) return;
    App.state.reviews = App.state.reviews.filter(function (r) { return r.id !== review.id; });
    App.state.actions.forEach(function (action) {
      if (action.reviewId === review.id) action.reviewId = '';
    });
    App.currentReview = null;
    App.dirty = false;
    App.persist();
    App.ui.view = 'history';
    App.render();
    App.toast('已删除');
  };

  App.pruneEmptyReviews = function () {
    const keep = [];
    let changed = false;
    App.state.reviews.forEach(function (review) {
      if (!App.reviewHasContent(review)) {
        changed = true;
      } else {
        keep.push(review);
      }
    });
    if (changed) App.state.reviews = keep;
    return changed;
  };
})(window);
