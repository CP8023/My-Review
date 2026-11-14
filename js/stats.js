/* ============================================================
   洞察 & 设置
   ============================================================ */
(function (global) {
  'use strict';

  const App = global.Review;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- 洞察 ---------------- */

  function statCard(label, value, unit, note) {
    return '' +
      '<div class="card stat">' +
        '<span class="stat-label">' + label + '</span>' +
        '<div class="stat-value">' + value + '<small>' + unit + '</small></div>' +
        '<span class="stat-note">' + note + '</span>' +
      '</div>';
  }

  function activityCounts() {
    const counts = {};
    App.sortedEntries().forEach(function (entry) {
      counts[entry.date] = (counts[entry.date] || 0) + 1;
    });
    App.state.reviews.forEach(function (review) {
      counts[review.date] = (counts[review.date] || 0) + 1;
    });
    return counts;
  }

  function heatmapHTML() {
    const counts = activityCounts();
    const today = App.todayKey();
    const todayDate = App.parseYmd(today);
    const dow = (todayDate.getDay() + 6) % 7;
    const start = App.addDays(today, -(dow + 11 * 7));
    let weeks = '';

    for (let w = 0; w < 12; w += 1) {
      let cells = '';
      for (let d = 0; d < 7; d += 1) {
        const key = App.addDays(start, w * 7 + d);
        const count = counts[key] || 0;
        const level = count ? ' l' + Math.min(count, 3) : '';
        const future = key > today ? ' future' : '';
        const todayCls = key === today ? ' today' : '';
        cells += '<div class="hm-cell' + level + future + todayCls + '" title="' + key + ' · ' + count + ' 条"></div>';
      }
      weeks += '<div class="hm-week">' + cells + '</div>';
    }

    return '' +
      '<div class="heatmap">' +
        '<div class="hm-weekdays"><span>一</span><span>三</span><span>五</span><span>日</span></div>' +
        '<div class="hm-grid">' + weeks + '</div>' +
      '</div>' +
      '<div class="hm-legend"><span>少</span><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>多</span></div>';
  }

  function moodChartSVG(days) {
    const W = 680;
    const H = 172;
    const padL = 24;
    const padR = 10;
    const padT = 14;
    const padB = 24;
    const innerH = H - padT - padB;
    const step = (W - padL - padR) / (days.length - 1);

    const points = days.map(function (day, i) {
      return {
        date: day.date,
        mood: day.mood,
        x: padL + i * step,
        y: day.mood ? padT + (5 - day.mood) * (innerH / 4) : null
      };
    });

    let grid = '';
    [1, 3, 5].forEach(function (level) {
      const y = padT + (5 - level) * (innerH / 4);
      grid += '<line class="chart-grid" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>';
    });

    const segments = [];
    let current = [];
    points.forEach(function (point) {
      if (point.y == null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push(point);
      }
    });
    if (current.length) segments.push(current);

    const lines = segments.map(function (segment) {
      if (segment.length < 2) return '';
      const d = segment.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
      return '<path class="chart-line" d="' + d + '"/>';
    }).join('');

    const dots = points.filter(function (p) { return p.y != null; }).map(function (p) {
      return '<circle class="chart-dot" cx="' + p.x + '" cy="' + p.y + '" r="4.2"><title>' +
        p.date + ' · 心情 ' + p.mood + '/5</title></circle>';
    }).join('');

    const labels = points.map(function (p, i) {
      if (i % 2 !== 0 && i !== points.length - 1) return '';
      const day = Number(p.date.slice(8));
      return '<text class="chart-axis" x="' + p.x + '" y="' + (H - 5) + '" text-anchor="middle">' + day + '</text>';
    }).join('');

    return '<svg class="mood-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="近 14 天心情曲线">' +
      grid + lines + dots + labels + '</svg>';
  }

  App.renderStats = function () {
    const stats = App.computeStats();
    const days = App.lastDays(14);
    const tagList = App.getAllTags().slice(0, 8);
    const maxTag = tagList.length ? tagList[0].count : 1;
    const projectList = App.projectStats();
    const maxProject = projectList.length
      ? Math.max(1, projectList[0].days + projectList[0].reviews + projectList[0].actions)
      : 1;
    const hasMood = days.some(function (day) { return day.mood; });

    const totalWords = stats.words + stats.reviewWords;
    const totalDocs = stats.dailyCount + stats.reviewCount;

    const typeRows = App.TEMPLATES.map(function (tpl) {
      const count = stats.reviewByType[tpl.id] || 0;
      if (!count) return '';
      return '<div class="tag-stat"><div class="tag-stat-top"><span>' + tpl.icon + ' ' + tpl.name +
        '</span><span class="muted">' + count + ' 篇</span></div>' +
        '<div class="bar"><i style="width:' + Math.round(count / stats.reviewCount * 100) + '%"></i></div></div>';
    }).join('');

    $('#main').innerHTML = '' +
      '<div class="container stats">' +
        '<header class="view-head"><h1>洞察</h1><p class="sub">不是为了比较，只是为了看清自己的节奏。</p></header>' +
        '<div class="stat-grid">' +
          statCard('连续记录', stats.streak, '天', '从今天往回数') +
          statCard('复盘总数', totalDocs, '篇', '日志 ' + stats.dailyCount + ' · 模板 ' + stats.reviewCount) +
          statCard('行动完成率', Math.round(stats.actionRate * 100), '%', stats.actionDone + ' / ' + stats.actionTotal + ' 已完成') +
          statCard('累计字数', totalWords.toLocaleString('zh-CN'), '字', '不含标签') +
        '</div>' +
        '<section class="card chart-card">' +
          '<div class="card-head"><h2>记录热力图</h2><span class="muted">近 12 周 · ' + totalDocs + ' 条</span></div>' +
          heatmapHTML() +
        '</section>' +
        '<section class="card chart-card">' +
          '<div class="card-head"><h2>近 14 天心情</h2>' +
            '<span class="muted">' + (hasMood ? '平均 ' + stats.avgMood.toFixed(1) + ' / 5' : '还没有心情记录') + '</span></div>' +
          (hasMood ? moodChartSVG(days) : '<p class="chart-empty">写几篇日复盘，选一下心情，这里会出现你的曲线。</p>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><h2>复盘类型</h2><span class="muted">' + stats.reviewCount + ' 篇</span></div>' +
          (stats.reviewCount ? '<div class="tag-stats">' + typeRows + '</div>' : '<p class="hint">还没有模板复盘。周复盘或项目复盘，选一个开始。</p>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><h2>常用标签</h2><span class="muted">' + tagList.length + ' 个</span></div>' +
          (tagList.length
            ? '<div class="tag-stats">' + tagList.map(function (item) {
              return '<div class="tag-stat"><div class="tag-stat-top"><span>' + App.esc(item.tag) +
                '</span><span class="muted">' + item.count + '</span></div>' +
                '<div class="bar"><i style="width:' + Math.round(item.count / maxTag * 100) + '%"></i></div></div>';
            }).join('') + '</div>'
            : '<p class="hint">还没有标签。在复盘里加几个，方便以后找。</p>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><h2>项目分布</h2><span class="muted">' + projectList.length + ' 个</span></div>' +
          (projectList.length
            ? '<div class="tag-stats">' + projectList.slice(0, 8).map(function (item) {
              const total = item.days + item.reviews + item.actions;
              return '<button type="button" class="tag-stat tag-stat-btn" data-act="project-select" data-project="' +
                App.esc(item.name) + '">' +
                '<div class="tag-stat-top"><span>' + App.esc(item.name) + '</span>' +
                  '<span class="muted">' + total + ' 条 · 日志 ' + item.days + ' · 复盘 ' + item.reviews +
                  ' · 行动 ' + item.actions + '</span></div>' +
                '<div class="bar"><i style="width:' + Math.round(total / maxProject * 100) + '%"></i></div></button>';
            }).join('') + '</div>'
            : '<p class="hint">还没有项目。给日志或复盘填上项目名，这里会按项目汇总。</p>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><h2>这个月</h2></div>' +
          '<div class="kv"><span>日志</span><strong>' + stats.monthCount + ' 天</strong></div>' +
          '<div class="kv"><span>本月完成行动</span><strong>' + stats.actionDoneMonth + ' 项</strong></div>' +
          '<div class="kv"><span>本月平均心情</span><strong>' + (stats.monthAvgMood ? stats.monthAvgMood.toFixed(1) + ' / 5' : '—') + '</strong></div>' +
          '<div class="kv"><span>平均每篇</span><strong>' + (totalDocs ? Math.round(totalWords / totalDocs) : 0) + ' 字</strong></div>' +
          '<p class="hint soft">记录本身就是一种复盘。哪怕只写一句。</p>' +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><h2>一键汇总</h2><span class="muted">事实自动生成</span></div>' +
          '<p class="hint">把这段时间的记录、心情和行动自动填进复盘草稿，只把思考留给你。</p>' +
          '<div class="btn-row" style="margin-top:12px">' +
            '<button type="button" class="btn sm" data-act="draft-week">生成本周复盘草稿</button>' +
            '<button type="button" class="btn sm" data-act="draft-month">生成本月复盘草稿</button>' +
          '</div>' +
        '</section>' +
      '</div>';
  };

  /* ---------------- 设置 ---------------- */

  function fmtDate(iso) {
    if (!iso) return '从未导出';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '从未导出';
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 ' +
      App.pad2(d.getHours()) + ':' + App.pad2(d.getMinutes());
  }

  function storageKB() {
    try {
      return Math.max(1, Math.round(JSON.stringify(App.state).length / 1024));
    } catch (err) {
      return 0;
    }
  }

  function standalone() {
    return global.matchMedia('(display-mode: standalone)').matches || global.navigator.standalone === true;
  }

  App.renderSettings = function () {
    const theme = App.state.settings.theme || 'auto';
    const stats = App.computeStats();
    const themes = [['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']];
    const backupOld = !App.state.settings.lastExportAt ||
      (Date.now() - new Date(App.state.settings.lastExportAt).getTime()) > 14 * 24 * 3600 * 1000;

    $('#main').innerHTML = '' +
      '<div class="container settings">' +
        '<header class="view-head"><h1>设置</h1><p class="sub">没有账号，没有服务器。数据都在你的设备上。</p></header>' +

        '<section class="card settings-card">' +
          '<h2>外观</h2>' +
          '<div class="segmented" role="group" aria-label="主题">' +
            themes.map(function (item) {
              return '<button type="button" class="' + (theme === item[0] ? 'on' : '') +
                '" data-theme-choice="' + item[0] + '">' + item[1] + '</button>';
            }).join('') +
          '</div>' +
        '</section>' +

        '<section class="card settings-card">' +
          '<h2>数据备份</h2>' +
          '<p class="hint">记录保存在浏览器本地。清理浏览器数据会丢失，请定期导出，存到网盘或本地文件夹。</p>' +
          '<div class="btn-row" style="margin-top:14px">' +
            '<button type="button" class="btn" data-act="export-json">导出备份 (JSON)</button>' +
            '<button type="button" class="btn" data-act="export-md">导出 Markdown</button>' +
            '<button type="button" class="btn" data-act="export-csv">行动项 CSV</button>' +
            '<button type="button" class="btn" data-act="import">导入备份</button>' +
          '</div>' +
          '<p class="tiny' + (backupOld ? ' warn-text' : '') + '">上次导出：' + fmtDate(App.state.settings.lastExportAt) +
            (backupOld ? ' · 建议每周备份一次' : '') + '</p>' +
          '<input type="file" id="importFile" accept="application/json,.json" hidden>' +
        '</section>' +

        '<section class="card settings-card">' +
          '<h2>存储</h2>' +
          '<div class="kv"><span>已用空间</span><strong>' + storageKB() + ' KB</strong></div>' +
          '<div class="kv"><span>日复盘</span><strong>' + stats.dailyCount + ' 天</strong></div>' +
          '<div class="kv"><span>模板复盘</span><strong>' + stats.reviewCount + ' 篇</strong></div>' +
          '<div class="kv"><span>行动项</span><strong>' + stats.actionTotal + ' 项 · ' + stats.actionOpen + ' 待办</strong></div>' +
          '<div class="kv"><span>收集箱</span><strong>' + App.state.notes.length + ' 条</strong></div>' +
        '</section>' +

        (standalone()
          ? '<section class="card settings-card"><h2>安装</h2><p class="hint">已经在独立应用模式下运行。数据与浏览器共用同一份本地存储。</p></section>'
          : '<section class="card settings-card"><h2>安装到桌面</h2>' +
            '<p class="hint">装成应用后可以像普通软件一样打开，离线也能用。' +
            (App.installPrompt ? '' : '如果没有安装按钮，可在浏览器菜单里选择「安装应用 / 添加到主屏幕」。') + '</p>' +
            (App.installPrompt ? '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn primary" data-act="install">安装应用</button></div>' : '') +
            '</section>') +

        '<section class="card settings-card about">' +
          '<h2>关于</h2>' +
          '<p class="ver">工作复盘 v' + App.VERSION + ' · 单机版</p>' +
          '<p>没有账号、没有服务器、没有埋点。' +
            '你的记录只保存在本机浏览器里，随时可以导出带走。</p>' +
          '<p class="hint" style="margin-top:10px">快捷键：Ctrl / ⌘ + S 保存 · Alt + ← → 切换日期</p>' +
          '<button type="button" class="text-danger" data-act="clear-all" style="margin-top:14px">清空所有数据</button>' +
        '</section>' +

        '<p class="shortcuts">数据不会离开这台设备 · 版本 ' + App.VERSION + '</p>' +
      '</div>';
  };

  App.setTheme = function (theme) {
    if (['auto', 'light', 'dark'].indexOf(theme) < 0) return;
    App.state.settings.theme = theme;
    App.persist();
    App.applyTheme();
    App.renderSettings();
  };

  /* ---------------- 导出 ---------------- */

  function stamp() {
    const d = new Date();
    return App.ymd(d).replace(/-/g, '') + '-' + App.pad2(d.getHours()) + App.pad2(d.getMinutes());
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  App.download = download;

  function markExported() {
    App.state.settings.lastExportAt = new Date().toISOString();
    App.persist();
  }

  App.exportJSON = function () {
    const payload = {
      app: 'work-review',
      version: 2,
      exportedAt: new Date().toISOString(),
      entries: App.state.entries,
      reviews: App.state.reviews,
      notes: App.state.notes,
      actions: App.state.actions,
      settings: { theme: App.state.settings.theme }
    };
    download('工作复盘备份-' + stamp() + '.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    markExported();
    App.renderSettings();
    App.toast('备份已导出');
  };

  function sectionText(label, text) {
    text = String(text || '').trim();
    if (!text) return '';
    return '\n### ' + label + '\n\n' + text + '\n';
  }

  function buildMarkdown() {
    const lines = ['# 工作复盘', '', '> 导出于 ' + new Date().toLocaleString('zh-CN'), ''];
    const entries = App.sortedEntries();
    if (entries.length) {
      lines.push('## 日复盘', '');
      entries.forEach(function (entry) {
        const d = App.parseYmd(entry.date);
        lines.push('### ' + entry.date + ' ' + App.WEEK[d.getDay()], '');
        if (entry.mood) lines.push('- 心情：' + entry.mood + '/5');
        if (entry.energy) lines.push('- 精力：' + entry.energy + '/5');
        if (entry.project) lines.push('- 项目：' + entry.project);
        if (entry.tags.length) lines.push('- 标签：' + entry.tags.join('、'));
        lines.push('');
        if (entry.summary.trim()) lines.push('**' + entry.summary.trim() + '**', '');
        lines.push(sectionText('今天完成了什么', entry.done));
        lines.push(sectionText('收获与亮点', entry.wins));
        lines.push(sectionText('问题与卡点', entry.issues));
        lines.push(sectionText('反思与改进', entry.lessons));
        const plans = entry.tomorrow.filter(function (item) { return item.text.trim(); });
        if (plans.length) {
          lines.push('### 明日计划', '');
          plans.forEach(function (item) {
            lines.push('- [' + (item.done ? 'x' : ' ') + '] ' + item.text.trim());
          });
          lines.push('');
        }
        lines.push('---', '');
      });
    }

    const reviews = App.state.reviews.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    if (reviews.length) {
      lines.push('## 模板复盘', '');
      reviews.forEach(function (review) {
        const tpl = App.getTemplate(review.template);
        const d = App.parseYmd(review.date);
        lines.push('### [' + tpl.name + '] ' + (review.title || '未命名') + ' · ' + review.date + ' ' + App.WEEK[d.getDay()], '');
        if (review.project) lines.push('- 项目：' + review.project);
        if (review.tags.length) lines.push('- 标签：' + review.tags.join('、'));
        lines.push('');
        tpl.fields.forEach(function (field) {
          lines.push(sectionText(field.label, review.values[field.key]));
        });
        lines.push('---', '');
      });
    }

    if (App.state.actions.length) {
      lines.push('## 行动项', '');
      lines.push('| 状态 | 行动 | 截止 | 项目 | 来源 |');
      lines.push('| --- | --- | --- | --- | --- |');
      App.state.actions.forEach(function (action) {
        lines.push('| ' + (action.done ? '已完成' : '待办') + ' | ' + action.text.replace(/\|/g, '\\|') +
          ' | ' + (action.due || '') + ' | ' + (action.project || '') + ' | ' + (action.source || '') + ' |');
      });
      lines.push('');
    }

    if (App.state.notes.length) {
      lines.push('## 收集箱', '');
      App.state.notes.forEach(function (note) {
        lines.push('- [' + note.kind + '] ' + note.text);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  App.exportMarkdown = function () {
    download('工作复盘-' + stamp() + '.md', buildMarkdown(), 'text/markdown;charset=utf-8');
    markExported();
    App.renderSettings();
    App.toast('Markdown 已导出');
  };

  App.exportCSV = function () {
    const rows = [['状态', '行动', '截止日期', '项目', '来源', '创建时间', '完成时间']];
    App.state.actions.forEach(function (action) {
      rows.push([
        action.done ? '已完成' : '待办',
        action.text,
        action.due || '',
        action.project || '',
        action.source || '',
        action.createdAt ? action.createdAt.slice(0, 10) : '',
        action.completedAt ? action.completedAt.slice(0, 10) : ''
      ]);
    });
    const csv = '\ufeff' + rows.map(function (row) {
      return row.map(function (cell) {
        const text = String(cell == null ? '' : cell).replace(/"/g, '""');
        return '"' + text + '"';
      }).join(',');
    }).join('\r\n');
    download('工作复盘-行动项-' + stamp() + '.csv', csv, 'text/csv;charset=utf-8');
    App.toast('CSV 已导出');
  };

  /* ---------------- 导入 ---------------- */

  App.handleImport = function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      let data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (err) {
        App.toast('文件不是有效的 JSON');
        return;
      }
      if (!data || typeof data !== 'object') {
        App.toast('备份内容为空');
        return;
      }

      const entries = data.entries && typeof data.entries === 'object' ? data.entries : {};
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      const notes = Array.isArray(data.notes) ? data.notes : [];
      const actions = Array.isArray(data.actions) ? data.actions : [];
      const entryCount = Object.keys(entries).length;

      if (!entryCount && !reviews.length && !notes.length && !actions.length) {
        App.toast('备份里没有可导入的数据');
        return;
      }
      if (!global.confirm('将合并导入 ' + entryCount + ' 天日志、' + reviews.length + ' 篇复盘、' +
        actions.length + ' 项行动。相同日期或条目以备份为准，继续？')) {
        return;
      }

      let imported = 0;
      Object.keys(entries).forEach(function (key) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        const entry = App.normalizeEntry(entries[key], key);
        if (App.hasContent(entry)) {
          App.state.entries[key] = entry;
          imported += 1;
        }
      });

      const reviewIds = {};
      App.state.reviews.forEach(function (r) { reviewIds[r.id] = true; });
      reviews.forEach(function (raw) {
        const review = App.normalizeReview(raw);
        if (!review) return;
        const index = App.state.reviews.findIndex(function (r) { return r.id === review.id; });
        if (index >= 0) App.state.reviews[index] = review;
        else App.state.reviews.push(review);
        imported += 1;
      });

      const noteIds = {};
      App.state.notes.forEach(function (n) { noteIds[n.id] = true; });
      notes.forEach(function (raw) {
        const note = App.normalizeNote(raw);
        if (!note || noteIds[note.id]) return;
        App.state.notes.push(note);
        noteIds[note.id] = true;
        imported += 1;
      });

      const actionIds = {};
      App.state.actions.forEach(function (a) { actionIds[a.id] = true; });
      actions.forEach(function (raw) {
        const action = App.normalizeAction(raw);
        if (!action) return;
        const index = App.state.actions.findIndex(function (a) { return a.id === action.id; });
        if (index >= 0) App.state.actions[index] = action;
        else App.state.actions.push(action);
        actionIds[action.id] = true;
        imported += 1;
      });

      App.persist();
      $('#importFile') && ($('#importFile').value = '');
      App.render();
      App.toast('已导入 ' + imported + ' 条记录');
    };
    reader.onerror = function () {
      App.toast('读取文件失败');
    };
    reader.readAsText(file, 'utf-8');
  };

  App.clearAll = function () {
    if (!global.confirm('确定要清空所有复盘、行动和收集箱吗？')) return;
    if (!global.confirm('再次确认：清空后无法恢复。建议先导出备份。')) return;
    App.state.entries = {};
    App.state.reviews = [];
    App.state.notes = [];
    App.state.actions = [];
    App.currentEntry = null;
    App.currentReview = null;
    App.dirty = false;
    App.persist();
    App.render();
    App.toast('已清空所有数据');
  };

  App.install = function () {
    if (!App.installPrompt) return;
    App.installPrompt.prompt();
    App.installPrompt.userChoice.then(function () {
      App.installPrompt = null;
      App.renderSettings();
    });
  };
})(window);
