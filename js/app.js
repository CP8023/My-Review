/* ============================================================
   应用外壳：路由、自动保存、事件、PWA
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  let searchTimer = null;
  let toastTimer = null;

  /* ---------------- 提示 ---------------- */
  App.toast = function (message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  };

  /* ---------------- 保存 ---------------- */
  App.setSaveStatus = function (kind) {
    const el = $('#saveStatus');
    if (!el) return;
    if (kind === 'saving') {
      el.textContent = '正在保存…';
      el.classList.add('saving');
      return;
    }
    el.classList.remove('saving');
    if (kind === 'saved' && App.lastSavedAt) {
      const d = App.lastSavedAt;
      el.textContent = '已保存 ' + App.pad2(d.getHours()) + ':' + App.pad2(d.getMinutes());
    } else {
      el.textContent = '已自动保存';
    }
  };

  App.touch = function () {
    App.dirty = true;
    App.setSaveStatus('saving');
    clearTimeout(App.saveTimer);
    App.saveTimer = setTimeout(App.flushSave, 600);
  };

  App.flushSave = function () {
    clearTimeout(App.saveTimer);
    App.saveTimer = null;
    if (!App.dirty) return;
    const now = new Date().toISOString();
    if (App.currentEntry) App.currentEntry.updatedAt = now;
    if (App.currentReview) App.currentReview.updatedAt = now;
    if (App.persist()) {
      App.dirty = false;
      App.lastSavedAt = new Date();
      App.setSaveStatus('saved');
    }
  };

  /* ---------------- 主题 ---------------- */
  const darkQuery = global.matchMedia('(prefers-color-scheme: dark)');

  App.applyTheme = function () {
    const pref = App.state.settings.theme || 'auto';
    const resolved = pref === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : pref;
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#14171a' : '#2F5D50');
  };

  if (typeof darkQuery.addEventListener === 'function') {
    darkQuery.addEventListener('change', function () {
      if ((App.state.settings.theme || 'auto') === 'auto') App.applyTheme();
    });
  }

  /* ---------------- 路由 ---------------- */
  function navView() {
    if (App.ui.view === 'review') return 'history';
    return App.ui.view;
  }

  function updateNav() {
    const active = navView();
    $$('[data-nav]').forEach(function (btn) {
      const on = btn.dataset.nav === active;
      btn.classList.toggle('on', on);
      if (on) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    const mini = $('#streakMini');
    if (mini) {
      const stats = App.computeStats();
      mini.innerHTML = stats.streak > 0
        ? '<span class="flame">✳</span> 已连续记录 <strong>' + stats.streak + '</strong> 天'
        : '<span class="flame">✳</span> 今天写一句就开始';
    }
  }

  App.render = function () {
    const main = $('#main');
    if (!main) return;
    if (App.ui.view === 'write') App.renderWrite();
    else if (App.ui.view === 'history') App.renderHistory();
    else if (App.ui.view === 'review') App.renderReview();
    else if (App.ui.view === 'actions') App.renderActions();
    else if (App.ui.view === 'projects') App.renderProjects();
    else if (App.ui.view === 'stats') App.renderStats();
    else App.renderSettings();

    updateNav();
    main.classList.remove('view-enter');
    void main.offsetWidth;
    main.classList.add('view-enter');
    global.scrollTo(0, 0);
  };

  App.switchView = function (view) {
    if (view === App.ui.view) return;
    App.flushSave();
    let pruned = false;
    if (App.ui.view === 'write') pruned = App.pruneEmptyEntries();
    if (App.ui.view === 'review') pruned = App.pruneEmptyReviews() || pruned;
    if (pruned) App.persist();
    App.currentEntry = null;
    App.currentReview = null;
    App.ui.view = view;
    App.render();
  };

  App.goWrite = function (date) {
    App.flushSave();
    if (App.pruneEmptyEntries()) App.persist();
    App.currentEntry = null;
    App.currentReview = null;
    App.ui.date = date;
    App.ui.view = 'write';
    App.ui.calMonth = date.slice(0, 7);
    App.render();
  };

  App.openReview = function (id) {
    App.flushSave();
    if (App.pruneEmptyReviews()) App.persist();
    App.currentEntry = null;
    App.currentReview = null;
    App.ui.reviewId = id;
    App.ui.view = 'review';
    const review = App.getReview(id);
    if (review) App.ui.calMonth = review.date.slice(0, 7);
    App.render();
  };

  App.shiftDay = function (n) {
    const next = App.addDays(App.ui.date, n);
    if (next > App.todayKey()) return;
    App.goWrite(next);
  };

  /* ---------------- 语音速记（可选） ---------------- */
  const SpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
  App.voiceSupported = !!SpeechRecognition;

  App.startVoice = function () {
    if (!SpeechRecognition) {
      App.toast('当前浏览器不支持语音输入');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        const input = $('#quickText');
        if (input) {
          input.value = input.value ? input.value + ' ' + text : text;
          input.focus();
        }
      };
      recognition.onerror = function () {
        App.toast('语音识别没有成功，可以手动输入');
      };
      recognition.start();
      App.toast('在听…');
    } catch (err) {
      App.toast('语音识别没有成功');
    }
  };

  /* ---------------- 事件：导航 ---------------- */
  document.addEventListener('click', function (ev) {
    const nav = ev.target.closest('[data-nav]');
    if (nav) {
      App.switchView(nav.dataset.nav);
    }
  });

  /* ---------------- 事件：点击 ---------------- */
  $('#main').addEventListener('click', function (ev) {
    const actEl = ev.target.closest('[data-act]');
    if (actEl) {
      const act = actEl.dataset.act;
      switch (act) {
        case 'prev-day': App.shiftDay(-1); return;
        case 'next-day': App.shiftDay(1); return;
        case 'today': App.goWrite(App.todayKey()); return;
        case 'pick-date': App.openDatePicker(); return;
        case 'save': App.flushSave(); App.toast('已保存'); return;
        case 'delete-entry': App.deleteCurrentEntry(); return;
        case 'add-plan': App.addPlan(); return;
        case 'carry': App.carryPlans(); return;
        case 'plans-to-actions': App.plansToActions(); return;
        case 'quick-save': App.quickSave(); return;
        case 'quick-voice': App.startVoice(); return;
        case 'new-review': App.openTemplatePicker(); return;
        case 'focus-summary':
          const summaryInput = document.querySelector('[data-field="summary"]');
          if (summaryInput) {
            summaryInput.focus();
            if (typeof summaryInput.setSelectionRange === 'function') {
              const len = summaryInput.value.length;
              summaryInput.setSelectionRange(len, len);
            }
            summaryInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
          return;
        case 'dismiss-reminder':
          App.state.settings.reminderDate = App.todayKey();
          App.persist();
          App.render();
          return;
        case 'draft-week': App.generateDraft('week'); return;
        case 'draft-month': App.generateDraft('month'); return;
        case 'project-select': App.selectProject(actEl.dataset.project); return;
        case 'project-timeline': App.showProjectInTimeline(); return;
        case 'project-rename': App.startProjectRename(); return;
        case 'project-rename-cancel': App.renderProjects(); return;
        case 'project-rename-save': App.saveProjectRename(); return;
        case 'project-action-add': App.addProjectAction(); return;
        case 'project-new-review': App.openTemplatePicker(App.ui.projectSelected); return;
        case 'random-review': App.randomReview(); return;
        case 'back-history': App.switchView('history'); return;
        case 'delete-review': App.deleteReview(); return;
        case 'review-add-action': App.addReviewAction(); return;
        case 'action-add': App.addActionFromForm(); return;
        case 'cal-prev': App.shiftMonth(-1); return;
        case 'cal-next': App.shiftMonth(1); return;
        case 'cal-today':
          App.ui.calMonth = App.todayKey().slice(0, 7);
          App.renderHistory();
          return;
        case 'clear-search': App.clearSearch(); return;
        case 'clear-filters': App.clearFilters(); return;
        case 'export-json': App.exportJSON(); return;
        case 'export-md': App.exportMarkdown(); return;
        case 'export-csv': App.exportCSV(); return;
        case 'import':
          const fileInput = $('#importFile');
          if (fileInput) fileInput.click();
          return;
        case 'clear-all': App.clearAll(); return;
        case 'install': App.install(); return;
        default: return;
      }
    }

    const moodBtn = ev.target.closest('[data-mood]');
    if (moodBtn) { App.toggleMood(Number(moodBtn.dataset.mood)); return; }

    const energyBtn = ev.target.closest('[data-energy]');
    if (energyBtn) { App.toggleEnergy(Number(energyBtn.dataset.energy)); return; }

    const planToggle = ev.target.closest('[data-plan-toggle]');
    if (planToggle) { App.togglePlan(Number(planToggle.dataset.planToggle)); return; }

    const planDel = ev.target.closest('[data-plan-del]');
    if (planDel) { App.deletePlan(Number(planDel.dataset.planDel)); return; }

    const tagDel = ev.target.closest('[data-tag-del]');
    if (tagDel) { App.deleteTag(Number(tagDel.dataset.tagDel)); return; }

    const reviewTagDel = ev.target.closest('[data-review-tag-del]');
    if (reviewTagDel) { App.deleteReviewTag(Number(reviewTagDel.dataset.reviewTagDel)); return; }

    const quickKind = ev.target.closest('[data-quick-kind]');
    if (quickKind) { App.setQuickKind(quickKind.dataset.quickKind); return; }

    const noteToAction = ev.target.closest('[data-note-to-action]');
    if (noteToAction) { App.noteToAction(noteToAction.dataset.noteToAction); return; }

    const noteDel = ev.target.closest('[data-note-del]');
    if (noteDel) { App.deleteNote(noteDel.dataset.noteDel); return; }

    const openDate = ev.target.closest('[data-open-date]');
    if (openDate) { App.goWrite(openDate.dataset.openDate); return; }

    const openReview = ev.target.closest('[data-open-review]');
    if (openReview) { App.openReview(openReview.dataset.openReview); return; }

    const kindFilter = ev.target.closest('[data-kind-filter]');
    if (kindFilter) { App.setKindFilter(kindFilter.dataset.kindFilter); return; }

    const tagFilter = ev.target.closest('[data-filter-tag]');
    if (tagFilter) { App.setTagFilter(tagFilter.dataset.filterTag); return; }

    const themeChoice = ev.target.closest('[data-theme-choice]');
    if (themeChoice) { App.setTheme(themeChoice.dataset.themeChoice); return; }

    const actionToggle = ev.target.closest('[data-action-toggle]');
    if (actionToggle) { App.toggleAction(actionToggle.dataset.actionToggle); return; }

    const actionDel = ev.target.closest('[data-action-del]');
    if (actionDel) { App.deleteAction(actionDel.dataset.actionDel); return; }

    const actionDate = ev.target.closest('[data-action-date]');
    if (actionDate) { App.openActionDate(actionDate.dataset.actionDate); return; }

    const actionFilter = ev.target.closest('[data-action-filter]');
    if (actionFilter) { App.setActionFilter(actionFilter.dataset.actionFilter); return; }
  });

  /* ---------------- 事件：输入 ---------------- */
  $('#main').addEventListener('input', function (ev) {
    const el = ev.target;

    if (el.id === 'searchInput') {
      App.ui.search = el.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(App.renderHistoryBody, 140);
      return;
    }

    if (App.currentEntry && el.dataset.field && App.TEXT_FIELDS.indexOf(el.dataset.field) >= 0) {
      App.currentEntry[el.dataset.field] = el.value;
      App.touch();
      updateEntryCounter(el.dataset.field);
      if (el.tagName === 'TEXTAREA') App.autosize(el);
      return;
    }

    if (App.currentEntry && el.id === 'entryProject') {
      App.currentEntry.project = el.value.slice(0, 40);
      App.touch();
      return;
    }

    if (App.currentEntry && 'planText' in el.dataset) {
      const item = App.currentEntry.tomorrow[Number(el.dataset.planText)];
      if (item) {
        item.text = el.value;
        App.touch();
        updatePlanCounter();
      }
      return;
    }

    if (App.currentReview) {
      if (el.hasAttribute('data-review-title')) {
        App.currentReview.title = el.value;
        App.touch();
        return;
      }
      if (el.hasAttribute('data-review-project')) {
        App.currentReview.project = el.value;
        App.touch();
        return;
      }
      if (el.dataset.reviewField) {
        App.currentReview.values[el.dataset.reviewField] = el.value;
        App.touch();
        const counter = document.querySelector('[data-review-counter="' + el.dataset.reviewField + '"]');
        if (counter) counter.textContent = App.charCount(el.value) + ' 字';
        const total = document.getElementById('wordTotal');
        if (total) total.textContent = App.reviewCharCount(App.currentReview);
        if (el.tagName === 'TEXTAREA') App.autosize(el);
        return;
      }
    }

    if ('actionText' in el.dataset) {
      App.updateActionText(el.dataset.actionText, el.value);
    }
  });

  function updateEntryCounter(field) {
    const el = document.querySelector('[data-counter="' + field + '"]');
    if (el) el.textContent = App.charCount(App.currentEntry[field]) + ' 字';
    const total = document.getElementById('wordTotal');
    if (total) total.textContent = App.entryCharCount(App.currentEntry);
  }

  function updatePlanCounter() {
    const el = document.getElementById('planCounter');
    if (!el) return;
    el.textContent = App.currentEntry.tomorrow.filter(function (t) { return t.text.trim(); }).length + ' 项';
    const total = document.getElementById('wordTotal');
    if (total) total.textContent = App.entryCharCount(App.currentEntry);
  }

  /* ---------------- 事件：change ---------------- */
  $('#main').addEventListener('change', function (ev) {
    const el = ev.target;

    if (el.id === 'datePicker') {
      const value = el.value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== App.ui.date) {
        if (value > App.todayKey()) {
          App.toast('不能记录未来的日期');
          return;
        }
        App.goWrite(value);
      }
      return;
    }

    if (el.hasAttribute('data-review-date') && App.currentReview) {
      let value = /^\d{4}-\d{2}-\d{2}$/.test(el.value) ? el.value : App.currentReview.date;
      if (value > App.todayKey()) {
        value = App.todayKey();
        el.value = value;
        App.toast('不能记录未来的日期');
      }
      App.currentReview.date = value;
      App.touch();
      return;
    }

    if (el.id === 'projectFilter') {
      App.setProjectFilter(el.value);
      return;
    }

    if ('actionDueInput' in el.dataset) {
      App.setActionDue(el.dataset.actionDueInput, el.value);
      return;
    }

    if (el.id === 'importFile') {
      App.handleImport(el.files && el.files[0]);
      el.value = '';
    }
  });

  /* ---------------- 事件：键盘 ---------------- */
  $('#main').addEventListener('keydown', function (ev) {
    if (ev.target.id === 'tagInput') {
      if (ev.key === 'Enter' || ev.key === ',' || ev.key === '，') {
        ev.preventDefault();
        App.addTag(ev.target.value);
        ev.target.value = '';
      } else if (ev.key === 'Backspace' && !ev.target.value && App.currentEntry && App.currentEntry.tags.length) {
        App.deleteTag(App.currentEntry.tags.length - 1);
      }
      return;
    }

    if (ev.target.id === 'reviewTagInput') {
      if (ev.key === 'Enter' || ev.key === ',' || ev.key === '，') {
        ev.preventDefault();
        App.addReviewTag(ev.target.value);
        ev.target.value = '';
      } else if (ev.key === 'Backspace' && !ev.target.value && App.currentReview && App.currentReview.tags.length) {
        App.deleteReviewTag(App.currentReview.tags.length - 1);
      }
      return;
    }

    if (ev.target.id === 'projectActionText' && ev.key === 'Enter') {
      ev.preventDefault();
      App.addProjectAction();
      return;
    }

    if (ev.target.id === 'projectRenameInput') {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        App.saveProjectRename();
      } else if (ev.key === 'Escape') {
        App.ui.renamingProject = false;
        App.renderProjects();
      }
      return;
    }

    if (ev.target.id === 'quickText' && (ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      App.quickSave();
      return;
    }

    if (ev.target.id === 'actionText' && ev.key === 'Enter') {
      ev.preventDefault();
      App.addActionFromForm();
      return;
    }

    if (ev.target.id === 'reviewActionText' && ev.key === 'Enter') {
      ev.preventDefault();
      App.addReviewAction();
      return;
    }

    if ('planText' in ev.target.dataset && ev.key === 'Enter') {
      ev.preventDefault();
      App.insertPlanAfter(Number(ev.target.dataset.planText));
    }
  });

  document.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && String(ev.key).toLowerCase() === 's') {
      ev.preventDefault();
      if (App.ui.view === 'write' || App.ui.view === 'review') {
        App.flushSave();
        App.toast('已保存');
      }
      return;
    }
    if (App.ui.view === 'write' && ev.altKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      ev.preventDefault();
      App.shiftDay(ev.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  /* ---------------- 生命周期 & PWA ---------------- */
  global.addEventListener('beforeunload', function () { App.flushSave(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') App.flushSave();
  });

  global.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    App.installPrompt = ev;
    if (App.ui.view === 'settings') App.renderSettings();
  });

  global.addEventListener('appinstalled', function () {
    App.installPrompt = null;
    App.toast('已安装到桌面');
  });

  if ('serviceWorker' in global.navigator && /^https?:$/.test(global.location.protocol)) {
    global.addEventListener('load', function () {
      global.navigator.serviceWorker.register('./sw.js').catch(function () { /* 离线缓存失败不影响使用 */ });
    });
  }

  /* ---------------- 启动 ---------------- */
  App.applyTheme();
  if (!App.ui.kindFilter) App.ui.kindFilter = 'all';
  App.render();
})(window);
