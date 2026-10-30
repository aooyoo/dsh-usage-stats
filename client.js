window.__ModuleLoader__.load({
  id: '@local/dsh-usage-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Sidebar entry id; the sidebar button and the main panel share it. */
    const PANEL_ID = 'usage-stats'
    /** Locale namespace owned by this plugin. */
    const NS = 'usage-stats'
    /**
     * Document-relative routes served by this plugin's Host half, in order:
     * Connection's authenticated Fetch route, then its plain web fallback.
     */
    const ROUTES = ['api/usage.stats', 'usage-stats.json']

    const DICTS = {
      en: {
        'nav.label': 'Usage',
        'panel.title': 'Usage statistics',
        'panel.subtitle': 'Token usage folded from every session log',
        'action.refresh': 'Refresh',
        'action.retry': 'Retry',
        'range.7': '7 days',
        'range.30': '30 days',
        'range.90': '90 days',
        'range.all': 'All time',
        'status.loading': 'Reading session logs…',
        'status.failed': 'Could not load usage data',
        'status.empty': 'No usage recorded yet. Send a message and come back.',
        'card.total': 'Total tokens',
        'card.input': 'Input',
        'card.output': 'Output',
        'card.cacheRead': 'Cached input',
        'card.requests': 'Requests',
        'card.sessions': 'Sessions',
        'chart.title': 'Daily totals',
        'chart.hint': 'Tokens per day',
        'models.title': 'By model',
        'models.empty': 'No model reported usage yet.',
        'sessions.title': 'By session',
        'sessions.empty': 'No session reported usage yet.',
        'column.model': 'Model',
        'column.session': 'Session',
        'column.requests': 'Requests',
        'column.input': 'Input',
        'column.output': 'Output',
        'column.cacheRead': 'Cache read',
        'column.total': 'Total',
        'column.activity': 'Last activity',
        'session.untitled': 'Untitled session',
        'session.running': 'Running',
        'footer.generated': 'Updated {time} · {sessions} of {total} sessions with usage',
        'footer.truncated': 'Showing the {limit} largest sessions.',
      },
      zh: {
        'nav.label': '用量统计',
        'panel.title': '用量统计',
        'panel.subtitle': '从全部会话日志汇总的 Token 用量',
        'action.refresh': '刷新',
        'action.retry': '重试',
        'range.7': '近 7 天',
        'range.30': '近 30 天',
        'range.90': '近 90 天',
        'range.all': '全部',
        'status.loading': '正在读取会话日志…',
        'status.failed': '无法加载用量数据',
        'status.empty': '还没有记录用量。先发一条消息再回来看看。',
        'card.total': '总 Token',
        'card.input': '输入',
        'card.output': '输出',
        'card.cacheRead': '缓存命中',
        'card.requests': '请求次数',
        'card.sessions': '会话数',
        'chart.title': '每日用量',
        'chart.hint': '每天的 Token 总数',
        'models.title': '按模型',
        'models.empty': '还没有模型上报用量。',
        'sessions.title': '按会话',
        'sessions.empty': '还没有会话上报用量。',
        'column.model': '模型',
        'column.session': '会话',
        'column.requests': '请求',
        'column.input': '输入',
        'column.output': '输出',
        'column.cacheRead': '缓存读',
        'column.total': '合计',
        'column.activity': '最近活动',
        'session.untitled': '未命名会话',
        'session.running': '运行中',
        'footer.generated': '更新于 {time} · {sessions}/{total} 个会话有用量',
        'footer.truncated': '仅显示用量最大的 {limit} 个会话。',
      },
    }

    const CSS = `
.dsh-usage-root { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); }
.dsh-usage-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 28px 12px; }
.dsh-usage-title { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.01em; }
.dsh-usage-sub { margin-top: 3px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsh-usage-actions { display: flex; align-items: center; gap: 6px; flex: none; }
.dsh-usage-button { font: inherit; font-size: 12px; line-height: 20px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsh-usage-button:hover { border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }
.dsh-usage-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dsh-usage-button[aria-pressed="true"] { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.dsh-usage-button:disabled { opacity: 0.55; cursor: default; }
.dsh-usage-body { flex: 1; min-height: 0; overflow: auto; padding: 4px 28px 28px; display: flex; flex-direction: column; gap: 14px; }
.dsh-usage-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.dsh-usage-card { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 10px; padding: 12px 14px; }
.dsh-usage-card-label { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsh-usage-card-value { margin-top: 6px; font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dsh-usage-card-value.is-accent { color: var(--dsw-alias-brand-primary); }
.dsh-usage-section { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 12px; padding: 14px 16px; }
.dsh-usage-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.dsh-usage-section-title { font-size: 13px; font-weight: 600; }
.dsh-usage-section-hint { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsh-usage-chart { display: flex; align-items: flex-end; gap: 4px; height: 128px; padding-top: 4px; }
.dsh-usage-bar { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.dsh-usage-bar-fill { background: var(--dsw-alias-brand-primary); border-radius: 3px 3px 0 0; min-height: 2px; }
.dsh-usage-bar:hover .dsh-usage-bar-fill { opacity: 0.75; }
.dsh-usage-axis { display: flex; gap: 4px; margin-top: 6px; }
.dsh-usage-axis span { flex: 1 1 0; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-secondary); text-align: center; white-space: nowrap; overflow: hidden; }
.dsh-usage-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dsh-usage-table th { text-align: left; font-weight: 500; color: var(--dsw-alias-label-secondary); padding: 6px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); white-space: nowrap; }
.dsh-usage-table td { padding: 7px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); vertical-align: top; }
.dsh-usage-table tbody tr:last-child td { border-bottom: none; }
.dsh-usage-table tbody tr:hover td { background: var(--dsw-alias-bg-layer-2); }
.dsh-usage-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dsh-usage-scroll { max-height: 340px; overflow: auto; margin: 0 -8px; padding: 0 8px; }
.dsh-usage-cell-title { display: block; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-usage-cell-meta { display: block; margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-secondary); max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-usage-tag { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 999px; font-size: 10px; line-height: 16px; color: var(--dsw-alias-state-success-primary); border: 1px solid var(--dsw-alias-state-success-primary); }
.dsh-usage-status { padding: 18px 2px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsh-usage-status.is-error { color: var(--dsw-alias-state-error-primary); }
.dsh-usage-foot { font-size: 11px; color: var(--dsw-alias-label-secondary); padding: 0 2px 4px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
`

    /** Compact token count for dense tables. */
    function formatTokens(value) {
      const number = typeof value === 'number' && isFinite(value) ? value : 0
      if (number >= 1e9) return `${trimZero(number / 1e9)}B`
      if (number >= 1e6) return `${trimZero(number / 1e6)}M`
      if (number >= 1e4) return `${trimZero(number / 1e3)}K`
      return String(Math.round(number))
    }

    function trimZero(value) {
      const fixed = value >= 100 ? value.toFixed(0) : value.toFixed(2)
      return fixed.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1')
    }

    /** `YYYY-MM-DD` to a short month-day label. */
    function shortDay(day) {
      return typeof day === 'string' && day.length === 10 ? day.slice(5) : day
    }

    /** Local clock time of a timestamp. */
    function formatTime(time) {
      if (!time) return '—'
      const date = new Date(time)
      const pad = (part) => `${part}`.padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** Basename of a workspace path. */
    function baseName(path) {
      if (typeof path !== 'string' || !path) return ''
      const parts = path.replace(/[\\/]+$/, '').split(/[\\/]/)
      return parts[parts.length - 1] || path
    }

    /** First day key kept for a range selection. */
    function rangeStart(range) {
      if (range === 'all') return null
      const days = Number(range)
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - (days - 1))
      const pad = (part) => `${part}`.padStart(2, '0')
      return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    }

    /**
     * The one definition of a token total: providers report cache reads outside
     * the prompt count, so the components are summed rather than one opaque field.
     */
    function tokenTotal(tokens) {
      if (!tokens) return 0
      return (tokens.input || 0) + (tokens.output || 0) + (tokens.cacheRead || 0) + (tokens.cacheWrite || 0)
    }

    function emptyUsage() {
      return { requests: 0, input: 0, output: 0, cacheRead: 0, total: 0 }
    }

    function addDay(target, day) {
      target.requests += day.requests || 0
      target.input += day.tokens.input || 0
      target.output += day.tokens.output || 0
      target.cacheRead += day.tokens.cacheRead || 0
      target.total += tokenTotal(day.tokens)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const disposers = []
        for (const locale of Object.keys(DICTS)) {
          disposers.push(ctx.locale.register(NS, locale, DICTS[locale]))
        }
        ctx.effect(() => () => {
          for (const dispose of disposers) {
            try {
              dispose()
            } catch {
              // The locale service already withdrew this dictionary.
            }
          }
        })

        const t = ctx.locale.bind(NS)

        /** Follow the active locale so rendered text follows a language switch. */
        function useTranslate() {
          const [, setRevision] = React.useState(0)
          React.useEffect(() => ctx.locale.subscribe(() => setRevision((value) => value + 1)), [])
          return t
        }

        /** Sidebar button glyph: three rising bars over a baseline. */
        function UsageIcon(props) {
          const size = typeof props.size === 'number' && props.size > 0 ? props.size : 16
          return h(
            'svg',
            {
              viewBox: '0 0 24 24',
              width: size,
              height: size,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: props.active ? 2 : 1.7,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
              focusable: false,
              style: { display: 'block' },
            },
            h('path', { d: 'M4 20h16' }),
            h('path', { d: 'M7 20v-6' }),
            h('path', { d: 'M12 20V7' }),
            h('path', { d: 'M17 20v-9' }),
          )
        }

        /** The main panel: summary cards, a daily chart, and two breakdown tables. */
        function UsagePanel() {
          const translate = useTranslate()
          const [range, setRange] = React.useState('30')
          const [request, setRequest] = React.useState({ token: 0, refresh: false })
          const [state, setState] = React.useState({ status: 'loading' })

          /** Read the snapshot from the first transport route that answers. */
          const load = async (signal) => {
            let lastError = null
            for (const candidate of ROUTES) {
              let url
              try {
                url = new URL(candidate, document.baseURI)
              } catch {
                url = new URL(candidate, window.location.href)
              }
              if (request.refresh) url.searchParams.set('refresh', '1')
              let response
              try {
                response = await fetch(url.toString(), {
                  headers: { accept: 'application/json' },
                  credentials: 'same-origin',
                  signal,
                })
              } catch (error) {
                if (signal.aborted) throw error
                lastError = error
                continue
              }
              if (response.status === 404) {
                lastError = new Error(`${response.status} ${url.pathname}`)
                continue
              }
              if (!response.ok) {
                const detail = await response.text().catch(() => '')
                throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`)
              }
              return response.json()
            }
            throw lastError || new Error('no usage route answered')
          }

          React.useEffect(() => {
            let cancelled = false
            const controller = new AbortController()
            setState((previous) => (previous.status === 'ready' ? { ...previous, busy: true } : { status: 'loading' }))
            load(controller.signal)
              .then((value) => {
                if (cancelled) return
                setState({ status: 'ready', value, busy: false })
              })
              .catch((error) => {
                if (cancelled || (error && error.name === 'AbortError')) return
                setState({ status: 'error', message: error && error.message ? error.message : String(error) })
              })
            return () => {
              cancelled = true
              controller.abort()
            }
          }, [request])

          const reload = (refresh) => setRequest((previous) => ({ token: previous.token + 1, refresh }))
          const value = state.value

          const start = rangeStart(range)
          const allDays = value && Array.isArray(value.days) ? value.days : []
          const days = start ? allDays.filter((day) => day.day >= start) : allDays
          const chartDays = range === 'all' ? allDays.slice(-30) : days

          const usage = emptyUsage()
          if (range === 'all' && value) {
            usage.requests = value.totals.requests || 0
            usage.input = value.totals.tokens.input || 0
            usage.output = value.totals.tokens.output || 0
            usage.cacheRead = value.totals.tokens.cacheRead || 0
            usage.total = tokenTotal(value.totals.tokens)
          } else {
            for (const day of days) addDay(usage, day)
          }
          const used = value && Array.isArray(value.sessions) ? value.sessions : []
          // A Host that omits per-session days cannot narrow the count, so every
          // session with usage is reported instead of none.
          const inRange = (entry) =>
            !start || !Array.isArray(entry.days) || entry.days.some((day) => day >= start)
          const activeSessions =
            range === 'all' && value
              ? value.totals.sessions || 0
              : used.filter((entry) => entry.requests > 0 && inRange(entry)).length

          const rangeButtons = ['7', '30', '90', 'all'].map((key) =>
            h(
              'button',
              {
                key,
                type: 'button',
                className: 'dsh-usage-button',
                'aria-pressed': range === key ? 'true' : 'false',
                onClick: () => setRange(key),
              },
              translate(`range.${key}`),
            ),
          )

          const head = h(
            'div',
            { className: 'dsh-usage-head' },
            h(
              'div',
              null,
              h('h2', { className: 'dsh-usage-title' }, translate('panel.title')),
              h('div', { className: 'dsh-usage-sub' }, translate('panel.subtitle')),
            ),
            h(
              'div',
              { className: 'dsh-usage-actions' },
              rangeButtons,
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-usage-button',
                  onClick: () => reload(true),
                  disabled: state.status === 'loading' || state.busy === true,
                  'aria-busy': state.status === 'loading' || state.busy === true ? 'true' : 'false',
                },
                translate('action.refresh'),
              ),
            ),
          )

          return h(
            'div',
            { className: 'dsh-usage-root' },
            h('style', null, CSS),
            head,
            h(
              'div',
              { className: 'dsh-usage-body' },
              state.status === 'loading' ? h('div', { className: 'dsh-usage-status', role: 'status' }, translate('status.loading')) : null,
              state.status === 'error'
                ? h(
                    'div',
                    { className: 'dsh-usage-status is-error', role: 'alert' },
                    `${translate('status.failed')}: ${state.message}`,
                    h('div', { style: { marginTop: '10px' } }, h(
                      'button',
                      { type: 'button', className: 'dsh-usage-button', onClick: () => reload(true) },
                      translate('action.retry'),
                    )),
                  )
                : null,
              value && value.totals.requests === 0
                ? h('div', { className: 'dsh-usage-status' }, translate('status.empty'))
                : null,
              value && value.totals.requests > 0
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'dsh-usage-cards' },
                      card(translate('card.total'), formatTokens(usage.total), true),
                      card(translate('card.input'), formatTokens(usage.input)),
                      card(translate('card.output'), formatTokens(usage.output)),
                      card(translate('card.cacheRead'), formatTokens(usage.cacheRead)),
                      card(translate('card.requests'), String(usage.requests)),
                      card(translate('card.sessions'), String(activeSessions)),
                    ),
                    chartSection(translate, chartDays),
                    modelSection(translate, value.models || []),
                    sessionSection(translate, value.sessions || []),
                    h(
                      'div',
                      { className: 'dsh-usage-foot' },
                      h(
                        'span',
                        null,
                        translate('footer.generated')
                          .replace('{time}', formatTime(value.generatedAt))
                          .replace('{sessions}', String(value.totals.sessions || 0))
                          .replace('{total}', String(value.totals.sessionsTotal || 0)),
                      ),
                      (value.sessions || []).length >= 200 ? h('span', null, translate('footer.truncated').replace('{limit}', String((value.sessions || []).length))) : null,
                    ),
                  )
                : null,
            ),
          )
        }

        function card(label, value, accent) {
          return h(
            'div',
            { className: 'dsh-usage-card', key: label },
            h('div', { className: 'dsh-usage-card-label' }, label),
            h('div', { className: accent ? 'dsh-usage-card-value is-accent' : 'dsh-usage-card-value' }, value),
          )
        }

        function chartSection(translate, days) {
          const peak = days.reduce((max, day) => Math.max(max, tokenTotal(day.tokens)), 0)
          const bars = days.map((day) =>
            h(
              'div',
              { className: 'dsh-usage-bar', key: day.day, title: `${day.day} · ${formatTokens(tokenTotal(day.tokens))} tokens · ${day.requests} requests` },
              h('div', {
                className: 'dsh-usage-bar-fill',
                style: { height: peak > 0 ? `${Math.max(2, Math.round((tokenTotal(day.tokens) / peak) * 100))}%` : '2px' },
              }),
            ),
          )
          const axis = days.map((day) => h('span', { key: day.day }, shortDay(day.day)))
          return h(
            'section',
            { className: 'dsh-usage-section' },
            h(
              'div',
              { className: 'dsh-usage-section-head' },
              h('div', { className: 'dsh-usage-section-title' }, translate('chart.title')),
              h('div', { className: 'dsh-usage-section-hint' }, translate('chart.hint')),
            ),
            days.length === 0
              ? h('div', { className: 'dsh-usage-status' }, translate('status.empty'))
              : h(
                  React.Fragment,
                  null,
                  h('div', { className: 'dsh-usage-chart' }, bars),
                  h('div', { className: 'dsh-usage-axis' }, axis),
                ),
          )
        }

        function modelSection(translate, models) {
          const rows = models.map((entry) =>
            h(
              'tr',
              { key: `${entry.provider}/${entry.model}` },
              h('td', null, h('span', { className: 'dsh-usage-cell-title' }, entry.model), h('span', { className: 'dsh-usage-cell-meta' }, entry.provider)),
              h('td', { className: 'dsh-usage-num' }, String(entry.requests)),
              h('td', { className: 'dsh-usage-num' }, formatTokens(entry.tokens.input)),
              h('td', { className: 'dsh-usage-num' }, formatTokens(entry.tokens.output)),
              h('td', { className: 'dsh-usage-num' }, formatTokens(entry.tokens.cacheRead)),
              h('td', { className: 'dsh-usage-num' }, formatTokens(tokenTotal(entry.tokens))),
            ),
          )
          return h(
            'section',
            { className: 'dsh-usage-section' },
            h('div', { className: 'dsh-usage-section-head' }, h('div', { className: 'dsh-usage-section-title' }, translate('models.title'))),
            models.length === 0
              ? h('div', { className: 'dsh-usage-status' }, translate('models.empty'))
              : h(
                  'table',
                  { className: 'dsh-usage-table' },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      null,
                      h('th', null, translate('column.model')),
                      h('th', { className: 'dsh-usage-num' }, translate('column.requests')),
                      h('th', { className: 'dsh-usage-num' }, translate('column.input')),
                      h('th', { className: 'dsh-usage-num' }, translate('column.output')),
                      h('th', { className: 'dsh-usage-num' }, translate('column.cacheRead')),
                      h('th', { className: 'dsh-usage-num' }, translate('column.total')),
                    ),
                  ),
                  h('tbody', null, rows),
                ),
          )
        }

        function sessionSection(translate, sessions) {
          const rows = sessions
            .filter((entry) => entry.requests > 0)
            .map((entry) =>
              h(
                'tr',
                { key: entry.id },
                h(
                  'td',
                  null,
                  h(
                    'span',
                    { className: 'dsh-usage-cell-title', title: entry.title || entry.id },
                    entry.title || translate('session.untitled'),
                    entry.running ? h('span', { className: 'dsh-usage-tag' }, translate('session.running')) : null,
                  ),
                  h('span', { className: 'dsh-usage-cell-meta', title: entry.cwd || entry.id }, baseName(entry.cwd) || entry.id),
                ),
                h('td', { className: 'dsh-usage-num' }, String(entry.requests)),
                h('td', { className: 'dsh-usage-num' }, formatTokens(entry.tokens.input)),
                h('td', { className: 'dsh-usage-num' }, formatTokens(entry.tokens.output)),
                h('td', { className: 'dsh-usage-num' }, formatTokens(entry.tokens.cacheRead)),
                h('td', { className: 'dsh-usage-num' }, formatTokens(tokenTotal(entry.tokens))),
                h('td', { className: 'dsh-usage-num' }, formatTime(entry.lastActivityAt)),
              ),
            )
          return h(
            'section',
            { className: 'dsh-usage-section' },
            h('div', { className: 'dsh-usage-section-head' }, h('div', { className: 'dsh-usage-section-title' }, translate('sessions.title'))),
            rows.length === 0
              ? h('div', { className: 'dsh-usage-status' }, translate('sessions.empty'))
              : h(
                  'div',
                  { className: 'dsh-usage-scroll' },
                  h(
                    'table',
                    { className: 'dsh-usage-table' },
                    h(
                      'thead',
                      null,
                      h(
                        'tr',
                        null,
                        h('th', null, translate('column.session')),
                        h('th', { className: 'dsh-usage-num' }, translate('column.requests')),
                        h('th', { className: 'dsh-usage-num' }, translate('column.input')),
                        h('th', { className: 'dsh-usage-num' }, translate('column.output')),
                        h('th', { className: 'dsh-usage-num' }, translate('column.cacheRead')),
                        h('th', { className: 'dsh-usage-num' }, translate('column.total')),
                        h('th', { className: 'dsh-usage-num' }, translate('column.activity')),
                      ),
                    ),
                    h('tbody', null, rows),
                  ),
                ),
          )
        }

        ctx.effect(() =>
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: PANEL_ID,
                order: 20,
                label: () => t('nav.label'),
              },
              UsageIcon,
            ),
          ),
        )

        ctx.effect(() =>
          ctx.slots.inject('main', () =>
            ctx.slots.register(
              {
                name: 'main',
                key: PANEL_ID,
              },
              UsagePanel,
            ),
          ),
        )
      },
    }
  },
})
