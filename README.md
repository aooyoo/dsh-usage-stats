# dsh-usage-stats

> 非官方社区插件 · Token usage statistics for [DeepSeek Harness](https://github.com/deepseek-ai)

在左侧栏加一个入口，把本机所有会话日志里的 Token 用量汇总成**每日 / 按模型 / 按会话**三个视角。

An unofficial community plugin that puts a sidebar entry in DeepSeek Harness and folds token usage out of every local session log.

---

## 功能 · Features

- **左侧栏入口**：位于「插件」「定时任务」之后的图标，点开即主面板
- **总览卡片**：总 Token、输入、输出、缓存命中、请求次数、会话数；可切换近 7 / 30 / 90 天 / 全部
- **每日用量柱状图**：悬停看当天的 Token 与请求数
- **按模型明细**：请求数、输入、输出、缓存读、合计
- **按会话明细**：会话标题、工作目录、请求数、四个分量、合计、最近活动时间，运行中的会话带标记
- **跟随宿主**：中英文跟随界面语言，明暗主题跟随，只用宿主主题变量着色
- **零依赖**：不需要 npm 依赖、不需要构建步骤，纯 ESM + 页面自带 React

## 安装 · Install

装完后**刷新页面**，左侧栏就会出现新图标。插件行 id 是 `usage-stats`。

1. 在 DSH 的 **Settings → Plugins** 里安装这个 bundle。
2. 两种入口：
   - **本地目录（已验证）**：把本仓库 clone 到本地，安装时指向仓库根目录。
   - **包名**：如果你的 DSH 版本支持按 npm spec 安装，直接填 `dsh-usage-stats`。

> 首次打开面板要读全部会话日志，本机 214 个会话实测约 5–15 秒（显示「正在读取会话日志…」）。之后 30 秒内复用缓存，是毫秒级。

## 配置 · Configuration

行配置写在 `cordis.patch.yml`（或你 profile 的补丁层）里：

```yaml
- insert:
    - id: usage-stats
      name: dsh-usage-stats
      config:
        cacheMs: 30000
        maxSessions: 400
        allowPlainRoute: false
        diagnostics: true
```

| 字段 | 默认 | 含义 |
|---|---|---|
| `cacheMs` | `30000` | 整份快照的缓存时长；面板「刷新」会强制重算 |
| `maxSessions` | `400` | 参与统计的会话上限，按最近活动取 |
| `allowPlainRoute` | `false` | 是否允许在认证路由不可用时，额外注册一条未认证的普通 Web 路由 `/usage-stats.json`（见「隐私」） |
| `diagnostics` | `true` | 激活失败时是否在系统临时目录写诊断文件 |

## 数字是怎么来的 · How the numbers are computed

- **数据源**：本机会话日志中 `assistant/message` 事件里 provider 上报的 `usage`。
- **四个分量**：输入、输出、缓存读、缓存写；**合计 = 四者之和**。provider 自己也把 `totalTokens` 报成这个和，所以混合上报的日志口径一致。
- **只统计上报了 usage 的请求**：没有 usage 的步骤（例如被取消的步骤）不计数，因此这里不是「模型调用次数」。
- **归属**：一次请求计入它所在会话的那一天（本机时区）。
- **不做价格估算**：单价随模型、套餐、地区变化，插件只报 Token，不猜钱。

## 隐私 · Privacy

- 只读取本机 DSH 会话日志，**不发任何网络请求**：无遥测、无上报、无外链。
- 面板数据走 DSH 自己的本地 HTTP 通道，默认走**需要登录 cookie 的认证路由** `/api/usage.stats`。
- 未认证的兜底路由默认**关闭**。只有你把 `allowPlainRoute` 设为 `true` 时才会注册 `/usage-stats.json`，此时同一份数据会在本机回环地址上以普通路由提供——除非确实遇到认证路由注册失败，否则不建议打开。
- 激活失败时会在系统临时目录写 `dsh-usage-stats-activation.json`（含阶段、错误、堆栈），用于排查问题；设 `diagnostics: false` 可关闭。

## 缓存与性能 · Performance

- 单会话结果按会话的最近更新时间增量复用，只有变动过的会话会重新读。
- 整份快照按 `cacheMs` 缓存；并发请求共享同一次折叠。
- 读取并发上限 4，避免一次性把日志全读进内存。

## 兼容性 · Compatibility

- 面向 **DeepSeek Harness `0.2.1-rc.5`** 开发与验证，`package.json` 声明 `engines.dsh: >=0.2.1-rc.5`，不满足的版本会被插件管理器拦下。
- 用到的扩展点（Connection 的 exact Fetch 路由、`slots` 的 `sidebar.panellist` / `main`、`sessionQuery`）属于 DSH 的内部接口，**升级后可能变动**。如果某次升级后面板取不到数，先看插件行是否激活成功；必要时把 `allowPlainRoute` 打开作为过渡，并来这里提 issue。

## 已知限制 · Known limitations

- 只统计 provider 上报过 usage 的请求。
- 会话很多时首次打开偏慢（之后走缓存）。
- 没有按工作区筛选、没有费用估算、没有导出。
- 面向 DSH 的浏览器 Web GUI。如果页面以 `file://` 加载（部分桌面壳形态），相对路径路由可能不可达——这一点未验证。

## 开发 · Development

仓库根目录**就是**插件包本身：

```bash
npm pack --dry-run   # 查看真正会被打包的文件清单
```

宿主半边是 `index.js`（读日志、折叠、出数据），浏览器半边是 `client.js`（注册侧栏图标与主面板）。两者之间只通过一条本地 HTTP 路由通信，没有别的耦合。

## 许可 · License

[MIT](./LICENSE)

本项目与 DeepSeek 官方无关，未获官方背书；"DeepSeek"、"DeepSeek Harness" 等名称归其权利人所有。
