# ShopBlock 对话系统对比报告（ShopBlock vs RpgCombat LLM 模块）

> 位置：`D:\Project\ShopBlock\LLM-对比报告.md`
> 口径（用户已澄清）：气泡改造 = **去掉老板立绘下方的对话记录显示**，对话永久层搬进**右上角购物记录**（对标 RpgCombat 的战局记录），对话表现层改为**像 RPG 一样轮流在头像上弹出气泡**；ADD 当前阶段**关掉静默拦截，以功能跑通为第一优先**。
> 本报告只新增文档，不改任何现有代码；所有行号均为撰写时只读复核的实际行号。

---

## 1. 结论先行

最大差异一句话：两边形态同构（单文件 iframe 组件 + 酒馆正则取最后一个块 + 组件内轮询自取数据），但对话分工完全不同——RpgCombat 是“**气泡只管瞬时、战局记录管永久**”，ShopBlock 是“**立绘单例气泡 + 立绘下方常驻流水双写**”，永久层缺筛选、无编辑、无统一落盘格式。

关于 ADD 的真相必须先说清：**RpgCombat 全文没有 ADD 命令、也没有商店**（搜 ADD 零命中）。ADD 是 ShopBlock 自有协议（`commands:[{cmd:"add",...}]`），“LLM 的 add 不生效”只能在 ShopBlock 侧找原因，RpgCombat 没有现成答案可抄。RpgCombat 能抄的是气泡定位、记录弹窗、DEBUG 门、上下文取数、人设增量载入这些通用机制。

本次两个定调：

1. **气泡三件套**：去掉 `dialogueText` 立绘下方显示；对话永久层搬进右上购物记录；头像上轮流弹 body 级气泡。
2. **ADD 跑通优先**：`applyAddCommand` 现有 7 个 `return false` 全部静默，当前阶段只保留最小校验，其余加总开关旁路，失败转明示。

---

## 2. 架构对照

| 维度 | ShopBlock（`D:\Project\ShopBlock\index.html`，约 4563 行） | RpgCombat（`D:\Project\RpgCombat\index.html`，约 19737 行） |
|---|---|---|
| 文件形态 | 单文件 iframe 组件，唯一源码即根下 `index.html` | 同构，单文件楼层 iframe 组件，全部逻辑在一个 script 里 |
| 数据传入 | 酒馆正则取最后一个 `<Shop_block>`（`regex-商店Block.json` 16 行），不经 `$1` 传入，组件内 800ms 轮询自取 | 酒馆正则取最后一个 `<Combat_block>`（`regex-前端战斗v11_2.json`），同样不经 `$1`，组件内轮询自取 |
| LLM 通道 | 独立 OpenAI 兼容 `fetch /chat/completions`，配置存 `localStorage dd_llm_config`，`llmConfig{apiBase,apiKey,model,...}`（约 3600 行） | 同为独立通道 + 设置弹窗双 Tab（对话页/导演兜底页，约 2295 行），设置优先 `getVariables type:character` 降级 localStorage，有 5 预设槽 |
| 提示词组装 | `buildShopSystemPrompt`（2398）+ `buildSceneTrigger`（2421）+ `collectRecentStoryFloors(2)`（2374）+ `collectOptionalContext`（2436 风声+报纸） | `callLLMAPI`（19479）：system（全局人设+战场快照+格式要求+出战人设增量）+ contextPayload（0~N 层剥块）+ user（战况/玩家发言）+ 可选末尾注入 |
| 上下文楼层传入 | 最近 2 层，`getChatMessages + getLastMessageId`，剥四种块，无 generating 楼补偿 | 三级取数：原生 `SillyTavern.getContext().chat.slice()` 浅拷贝首选，备选 `getChatMessages`，再手动补 `getCurrentMessage()` 的 generating 楼；`0=仅从战局楼开始` 或 `N=最近 N 层` |
| 记录机制 | `sessionDialogLog` 纯内存数组（3210）+ 结算时取后 12 条拼 `<Shop_Record>`（3195）；账本弹窗只有交易表 | `battleHistory` append-only 数组（2672）+ 程序化摘要引擎（3024~3621）+ 战局弹窗富化/筛选/编辑回写 |
| 调用参数 | `temperature:0.7, max_tokens:400` 写死（2504），不读 `finish_reason` | `temperature 0.85`，`max_tokens` 默认 4096 可配，有 `finish_reason==='length'` 截断警告，有 `thinking:false` 开关 |

---

## 3. ShopBlock 现状（含行号）

### 3.1 提示词与调用

- `buildShopSystemPrompt`（2398~2418）：三层人设为块内 `店主性格` + 立绘 `PORTRAIT_TONE` + 设置页自定义补充；好感四档态度；白名单禁代玩家；强制纯 JSON schema `dialogue/affection/commands`。ADD 相关只有两句：2413 行“commands 仅在玩家问到店里没有的常规补给品时用 add 上架（你不是许愿机……必须拒绝）”与 `add 的 name 必须带 emoji 前缀`，以及 `buildSceneTrigger` chat 分支 2430 行的“可在 commands 中用 add 上架”。约束是软约束，且偏向拒绝，LLM 不发 commands 时程序侧无从补救。
- `buildSceneTrigger`（2421~2433）：公共头为在场名单 + 店内商品清单；四分支 enter（无 affection）、buy（附购买明细）、chat（附 `activeSpeaker.name` 与玩家原文）、bargain（透传分支指令）。
- `collectRecentStoryFloors`（2374）：回溯取 N 层非 `is_system`，剥四种块，标玩家/AI 前缀。缺原生浅拷贝首选与 generating 楼补偿。
- `collectOptionalContext`（2436）：风声读 chat 变量 `$ad_world.winds` 前 5 条，报纸回溯 10 楼找 `<Newday>`。双 try/catch 降级为空。
- `callShopLLM`（2484~2512）：组装 system + 最近 2 层 + 可选上下文 + 场景触发器，`max_tokens:400`（2504），`!response.ok` 抛错，取 `choices[0].message.content` 交 `extractJsonLoose`（2331，剥围栏+括号配对切片，失败返回 null）。调用方统一重试至多 2 次。`handleRegroup`（2539）同样 400。
- `applyLLMResult`（2616~2654）：白名单过滤（店主 + 在场固定角色 − 当前玩家），dialogue 截 80 字取前 4 条；店主行走 `showKeeperDialogue` 立绘气泡，全部行走 `dialogueText` 流水并 `logSessionDialog`；全被滤掉则欲言又止警告；`affection` 非零整数落地；`commands` 逐条交 `applyAddCommand`，返回值直接丢弃（2649~2653）。

### 3.2 ADD 链与 7 个静默拦截

全链：`handleSendMessage`（4328）→ `callShopLLM('chat')`（2484）→ `extractJsonLoose`（2331）→ `applyLLMResult`（2616）→ `applyAddCommand`（2685）→ `renderCabinet/updateCartUI`。计数器只在 `onShopDataReceived`（3223）进店时重置。

`applyAddCommand`（2685~2749）注释写“四重限制”，实际有 7 个 `return false`，全部静默（只 `console.info`，酒馆 iframe 内用户看不见），成功也无上架提示：

| 编号 | 行号 | 条件 | 说明 |
|---|---|---|---|
| 0 | 2686 | 非 add / 无商店 | 直接吞 |
| 1 | 2691 | 无名或无类目 | 无日志；依赖 `getCleanNameAndEmoji`（2100）与 `parsePriceString`（2092） |
| 2 | 2693~2696 | 锚点越界 | `PORTRAIT_ANCHOR`（2669~2680，如铁匠只认武器/弹药/工具/五金/防具/器械/修理），`includes` 双向模糊匹配；LLM 自造类目名极易越界 |
| 3 | 2698~2699 | 私藏 | 连 `console.info` 都没有，最沉默的一条 |
| 4 | 2701~2702 | 每会话 ≥1 条 | 同会话第 2 条必死；同名更新（2712）同样 `addLandedThisSession++`，会吃掉唯一配额 |
| 5 | 2704~2716 | 同名命中 | 走更新不新增，但同样占配额 |
| 6 | 2719 | 价格非正/NaN | `parsePriceString` 只取第一个数字，无数字即 NaN |
| 7 | 2721~2723 | 低于同类均价 5% | 此处用 `===` 精确匹配类目，与锚点的 `includes` 模糊不一致；新类目无均价反而通过，老类目低价被杀 |

另有截断风险：`commands` 在 JSON 尾部，`dialogue 1~4 条`先占 token，`max_tokens:400` 超限时 commands 被截断；全代码未读 `finish_reason/usage`；`extractJsonLoose` 配对失败返回 null 后重试 2 次即走旧关键词回退，截断与正常失败无法区分，add 永久丢失。

### 3.3 气泡与立绘下方流水双写（本次要改的核心）

- DOM（1609~1638）：左侧展台三件套为 `bossSpeechBubble`（1616，`absolute` 单例，`.show` 为唯一显隐开关）+ `portrait-wrapper/blacksmithImg`（1629）+ `dialogueText`（1637，立绘下方常驻流水，`min-height:54px;max-height:130px;overflow-y:auto`，空态占位“与店主交谈，对话将显示在这里”）。
- `showKeeperDialogue`（2657）：写气泡标题与正文，加 `.show`，6 秒收起。
- `popBossSpeechBubble`（3845~3861）：商品加车专用气泡，5.5 秒收起，且 3855 行同步写 `dialogueText`。
- `applyLLMResult`（2630~2639）：店主走气泡 + 流水，队友只走流水。
- 其他 `dialogueText` 写点共 11 处：进店占位（2583）、买/砍价回退、LLM 配置保存提示（4276）、无发言人守卫（4331）、砍价周旋（4350）、沉吟（4364）、无 Key 关键词回退（4401~4403）。去掉 `dialogueText` 时这些写点要一并收口，否则切记录后仍有残留引用报错。
- `logSessionDialog`（3210~3213）：纯内存，不写 UI；新会话在 3224 清空；消费在 `buildShopRecord`（3195~3198）取后 12 条拼 `<Shop_Record>`。这是“对话进购物记录”最省的复用源，无需新埋点。

### 3.4 购物记录账本现状

- 入口 `btnHistory`（1587，`top-pill-group` 内 📜购物记录）→ `historyModal`（1947，宽 580px，滚动区 320px）内只有交易表 `ledgerTableBody`（1971），无对话容器、无筛选、无编辑回写。
- `renderLedgerTable`（4217~4240）：空态占位行；非空按 `tx.id / tx.name / tx.buyer / tx.price / tx.time` 渲染。
- 数据缺口：`purchaseHistory`（3595）唯一写入在 `checkoutCart`（3125~3129），只有 `name/qty/price/owner`，渲染读的 `id/buyer/time` 必显示 `undefined`。把对话并入此弹窗时必须统一 schema，建议新增 `kind:'buy'|'dialog'|'cart'|'add'` 或另加对话区 DOM，不要混进五列表。
- 结算链（3029~3138）：校验分配与现金 → 直写最新 AI 楼 `stat_data` 并广播 MMS 刷新 → 写 `$shop_deal_result` 含硬锁清单与幂等 `$shop_sync` → 购物好感 `floor(total/5)` → 组 `<Shop_Record>` 注入输入框 → `triggerBuyReaction` 用明细触发购买回应。

### 3.5 底栏头像

- `party-deck`（1691）：左侧头像卡，只有 `.active::before“说话中”` 角标，无气泡槽；`bossSpeechBubble` 是展台单例绝对定位，不可直接复用做多人轮流气泡。
- 头像解析链（3397~3497）：MMS 共享句柄权威订阅 → 只读导出键 → 旧快照 → 名册字段 → 文件名拼 `avatarBase` → 本地兜底 → 首字 emoji 占位。零匹配时底栏置空，`handleSendMessage` 与砍价入口守卫关闭。
- 发言人使用点：`buildSpeakerWhitelist`（2361）排除 `activeSpeaker` 不让 LLM 代言玩家；`buildSceneTrigger` chat（2430）注入玩家原文；砍价预填与 `dealBy` 归属。

---

## 4. RpgCombat 机制详解（可抄的部分）

### 4.1 楼层传入两套上下文

- 对话页上下文（`callLLMAPI` 内 19479~19630）：开关 `sendContext` + 数量 `contextLimit`；`0=仅从战局楼开始`（从后往前找含 `<Combat_block>` 的楼，`startIdx-1` 起切），`N=传入最近 N 层`。取数三级：原生 `window.parent.SillyTavern.getContext().chat.slice()` 浅拷贝首选（注释明确旧深拷贝长对话白付几十 MB），备选 `getChatMessages`，再补 `getCurrentMessage()` 的 generating 楼。剥块后空文本丢弃，`raw_content||content||message||mes` 取最干净文本。
- 导演兜底上下文（18634~18671）：`stripDirectorNoise` 剥战斗/状态块与标记点；`getDirectorStoryFragment` 按 `contextFloors`（1~10，默认 2）取开战楼全量 + 铺垫楼只数 AI 楼、每层尾部 1000 字。

### 4.2 记录传入提示词：battleHistory + 摘要引擎

- 写侧 `addHistory`（2671）：纯 `push`，`battleHistory` append-only，有 `_pipelineFrozen` 冻结窗口。
- 读侧二选一（19489~19502）：`digestBattle!=false` 且有记录则 `getOngoingDigestCached()` 程序化摘要，否则 `battleHistory.slice(-histLimit)` 原始日志。`historyLimit` 空/0 = 无限，小于 10 钳 10。
- 摘要引擎（3024~3621）：`DIGEST_RULES` 每条带覆盖率断言，`buildBattleDigest` 全量给结算，`buildOngoingDigest` 截掉关键术式后给对话中，以 `length+末行` 为 key 缓存。设计不变量：事件无损、禁生成式改写。

### 4.3 用户角色人设预置

- 全局扮演 `#llm-system-prompt`（2351），空时回退武侠默认。
- 单角色预置（18347~18396 + 19512）：仅出战角色增量载入，读 `presets[activePreset].characterPrompts`，按 `readRoster()`（`rpg_combat_roster`）精确匹配才拼 `【出战角色补充人设】`，余者按全局自由发挥，随预设槽持久化。ShopBlock 对应物是 `PORTRAIT_TONE`（2058）+ 三层人设（2398），缺的是按在场名单的队友人设增量表。

### 4.4 提示词 DEBUG 门

- `LLM_DEBUG`（17779~17784）：启动时一次读 `localStorage rpg_llm_debug==='1'`，`llmLog` 包裹；原 12 处日志两处全量 stringify，改为门控后热路径零开销。排查时控制台 `localStorage.setItem('rpg_llm_debug','1')` 后刷新。
- 门控点：`requestLLMResponse`（19213/19220/19224）、`callLLMAPI`（19555/19587/19592/19636/19658），全量消息与响应体只在门控下打印；非门控 `console.warn` 保留截断与解析失败提示。

### 4.5 气泡定位与轮流（本次照抄核心）

- 样式（1132~1194）：`.chat-bubble` fixed、z-index 200、宽 180~200px、`pointer-events:none`、`bubble-in/bubble-out` 动画；三态配色 player 蓝 / ally 灰 / enemy 红；`::after` 小三角；`bubble-name` 小尾巴。
- `showChatBubble`（19063~19108）：空文本返回；按 `hero-card-*` 或 `e*-sprite` 找锚点，找不到放弃；`getBoundingClientRect()` 取矩形；`left = rect.left + rect.width/2 - 180/2` 再 clamp 防出屏；`top = max(8, rect.top - 80)`；宽 180px，`position:fixed` 挂 body；玩家 5 秒、NPC 6 秒后 `bubble-out` 350ms 移除。气泡是临时 DOM，不进持久数组。
- `showThinkingBubble`（19263~19280）：同锚点略低（`top=rect.top-60`），三个跳动点；请求前挂、拿到结果删（19216/19221/19255），防残留。
- `requestLLMResponse + parseLLMResponse`（19210~19260，19692~19703）：按 `^(.+?)[：:]\s*[「]?(.+?)[」]?$` 拆行；四级回退找说话人（目标集内同名未用实例 → 全局同名存活 → 目标集内任意未用 → 取模兜底）；`sleep(600)` 逐条间隔（首条 0ms）；每弹必 `addHistory([对话] 名：「话」)`；解析失败整段截 80 字挂首目标同样写历史。
- 自动发言触发器（全部先判 apiUrl/apiKey + `isRequesting` 互斥）：玩家发言（19111）、友方行动非 1 号位（19143）、敌方回合开始每敌每回合一次（19283 + Set 去重）、倒下（19155）、保命（19169）、治疗合并（19178）、看破（19196）、高阶合并（19291）、敌方低血一次性（19388）、敌方死亡由存活者说（19395）。开关默认 false（17764），底部输入条切换（19026~19060）。

### 4.6 战局记录弹窗（本次照抄核心）

- 入口右上按钮（2086）→ `#battle-history-modal`（2237，全屏遮罩，`max-w-3xl max-h-[88vh]`）：头部标题 + 编辑解锁键；筛选条全部/对话/攻防/要闻；双视口 visual 富文本 + raw textarea；底部关闭 + 发送到酒馆。
- `showHistoryOnly`（14395）：每次用 `join('\n')` 重建缓存，强制回只读态，重置筛选为 all，即时重渲染。
- 筛选（3624 + 2913）：`setHistoryFilter` 切高亮 + 重渲染；渲染循环里非目标类型 `continue`，回合头永远保留。
- `toggleHistoryEdit`（14436）：进编辑藏 visual 现 raw、筛选置灰；锁定回写 `battleHistory=split('\n')`（保留空行语义，解析器 trim 容错），立刻重渲染。编辑产物供本次发送并回写内存。
- `endBattleAndSendToTavern`（14475）：纯文本 `join('\n')` 经 `injectTextToTavern` 注入酒馆输入框，不终止循环，可反悔。
- 管线：存储 `addHistory` → 解析 `parseCombatLog`（2805，按行识别回合/场地/对话优先于 action）→ 头像 `buildLiveAvatarMap/getLiveAvatar/renderLiveAvatar`（英雄走 img、敌人强制 emoji）→ 渲染 `renderHistorySchemeA`（对话左右分栏、攻防卡、要闻条、回合折叠仅最新 open）→ 刷新 `refreshHistoryView`（2964）。清空点只在开新战/重置/读档。
- 分工一句话：气泡负责“看得见谁在说”，记录负责“事后查说了什么 + 改完发酒馆”。

### 4.7 结算双轨

- `showBattleResult`（14491）组存活/伤势/物品摘要 + `exportCombatResultToStatus` 写 `$rpg_combat_result`；直连 ok 发 `<战报摘要>digest</战报摘要>` + `无需改写数值`，回退发 `<战局记录>history</战局记录>` + 全数值 + `确认并应用数值`。`sendResultToTavern`（14622）经 `injectTextToTavern`（14601）填酒馆输入框。ShopBlock 的 `$shop_deal_result/lock + $shop_sync` 与此思想一致，落地时照此切直连 ok 发摘要、off 发全量。

---

## 5. 待办逐项映射

### 5.1 参考 RPG 商店样式改为对话气泡（三件套，按顺序做）

**第 1 件：去掉老板立绘下方的对话记录显示。**
删 `dialogueText`（1637）及样式（346~365）与绑定（3669），收口 11 处写入点（2583/2611/2843/4276/4331/4350/4364/4401~4403 等）。注意 `showKeeperDialogue/popBossSpeechBubble` 的 6 秒/5.5 秒单例收起后将无回看，所以必须先把永久层切到购物记录再删流水，否则删完即失明。`bubbleTimer` 单例也要随单例气泡一起退役，被 body 级多气泡替代。

**第 2 件：对话永久层搬进右上购物记录（对标战局）。**
复用 `sessionDialogLog`（3210）最省，写入点已覆盖进店/购买/砍价/自由对话。抄 `showHistoryOnly/toggleHistoryEdit/refreshHistoryView/parseCombatLog/DIGEST_RULES` 五件：右上 `historyModal`（1947）内在交易表之外加对话区（分区或 Tab，不要混进五列表）；所有对话统一 `[对话] 名：「话」` 前缀落盘供解析识别；加全部/对话/购买/讲价筛选；加 visual/raw 双视口 + 解锁编辑回写（`textarea↔split('\n')`）；发送走纯文本注入。先修 `id/buyer/time` 的 undefined 字段缺口，统一 schema 后再并对话。

**第 3 件：头像上轮流弹气泡（像 RPG 一样）。**
不要复用展台单例 `bossSpeechBubble`，抄 `showChatBubble`（19063）：`document.body.appendChild` 的 `position:fixed` 气泡，锚点取头像卡/`party-card[data-name]` 的 `getBoundingClientRect()`，`top=rect.top-80`、`left` 居中 clamp 防出屏，`z-index` 高于场景，`pointer-events:none`，三配色区分店主/队友/玩家，5~6 秒加收起动画后 `remove`。轮播抄 `requestLLMResponse`（19210）：LLM 返回按 `名：「话」` 拆行，`sleep(600)` 逐个弹，四级回退找人（目标集未用 → 全局同名 → 任意未用 → 取模兜底，同名怪不堆头），思考中抄 `showThinkingBubble`（19263）请求前挂拿到删。轮播钩子已有：`applyLLMResult`（2632）循环处店主弹立绘锚点、队友按名找 card；玩家行因白名单排除不回气泡，需单独触发玩家头像气泡。触发器按需抄：进店/购买/砍价/治疗沿用现有调用点即可，自动发言开关默认关，需要再开。

### 5.2 购物记录实时显示众人对话、购物车变动、ADD 新增

三类事件都要进记录，每类落盘格式固定一条：

1. **对话**：沿用 `logSessionDialog`，落盘统一 `[对话] 名：「话」` 前缀，与 RpgCombat 三处落盘格式对齐，渲染侧按 dialogue 分支识别，富化区左右分栏 + 头像。
2. **购物车变动**：现状无记录。建议在入车三路（砍价弹窗/数量弹窗/单件直入，约 3818）、步进器/删除（约 4084）、分配归属（约 2954）与结算（3029）处各加一条 `[购物车] 谁把 X×N 放入/移出/分配给 Y`，与对话同数组或同弹窗不同分区，保证打开记录即见最新。
3. **ADD 新增**：`applyAddCommand` 成功处（2726~2748）加一条 `[上架] 店主翻出 X（类目·价格）`，失败见 5.3 转明示。`renderCabinet/updateCartUI` 重渲染后记录视图若开着要即时重渲染（抄 `refreshHistoryView` 每次开弹窗/切筛选/锁定编辑都重走一遍）。

### 5.3 LLM 的 add 命令不生效（当前阶段：关掉静默拦截，跑通优先）

根因三块，按命中率排序：**程序侧 7 个静默拦截** > **400 token 截断** > **提示词过弱偏拒绝**。对话照常显示、add 无任何提示是三块叠加的结果。

跑通期放开策略（只保留最小校验，其余加总开关旁路）：

1. 最小校验保留：2686（`cmd==='add` 且有 shopState）+ 2691（有名有类目）+ 2719（`price>0`）。其余全部旁路，建议加总开关如 `const ADD_PERMISSIVE=true` 包住 2693~2724。
2. 锚点（2693~2696）：注释掉，或 `console.warn` 后继续执行；跑通后再收紧类目表。
3. 私藏（2698~2699）：调试期允许写入或转入可见待审区，不要直接 return。
4. 频率（2701~2702、2712、2745）：调试期注释掉，或每次 `handleSendMessage` 前重置；至少把同名更新 2712 的 `addLandedThisSession++` 去掉，更新不应占配额。
5. 均价（2721~2723）：注释掉，只留 `price>0`；这是误杀重灾区（新类目无均价反而通过，老类目低价被杀）。
6. 失败转明示：`applyAddCommand` 改返回 `{ok,reason}`，`applyLLMResult`（2649~2653）收集后向记录追加一条红色 `add 未上架：原因`，`console.info` 全部升级 `console.warn`。当前调用方直接丢弃返回值是“不生效”体感的一半来源。
7. 截断：`max_tokens 400→800/1000`（2504），检查 `finish_reason==='length'`，截断时自动发一次“只补 commands JSON”的续问；`extractJsonLoose` 返回 null 时同样明示“LLM 返回被截断，已重试”。
8. 提示词跑通期改法：删掉 2413“常规补给/不是许愿机必须拒绝”，改为“用户点名要就发 add，不要拒绝”，先让链路走通再加约束。`SPEC.md` 第三节四重限制同步标注为跑通期旁路，收紧时再恢复。

### 5.4 提示词 DEBUG 模式（实时查看）

抄 `LLM_DEBUG`（17779~17784）整套：启动时一次读 `localStorage shopblock_llm_debug==='1'`，`llmLog` 包裹；门控全量 system/user prompt 与响应体（对标 19555/19587/19592/19636/19658），高频热路径零开销；排查时控制台一条 `setItem` 后刷新。ShopBlock 现 `console.warn` 常开，高频调用刷屏，应全部收进门控，非门控只留截断与解析失败两行。实时查看建议做两层：控制台门控日志（先做）+ 设置弹窗内只读文本区回显最近一次 prompt（后做）。

### 5.5 老板楼层传入、记录传入提示词、用户角色人设预置

- **老板楼层传入**：抄三级取数 + 浅拷贝（对标 19539~19568）到 `collectRecentStoryFloors`（2374）：首选原生 `SillyTavern.getContext().chat.slice()` 浅拷贝，加 `getCurrentMessage` 补 generating 楼，`raw_content` 优先，空块过滤。长对话深拷贝风险与丢当前楼问题与 RpgCombat 修前一致。
- **记录传入提示词**：ShopBlock 现只有 `sessionDialogLog` 后 12 条拼 `<Shop_Record>`（3195）。抄读侧二选一（19489~19502）：记录短时发原始后 N 条，记录长时发程序化摘要；摘要引擎抄 `DIGEST_RULES` 思想（事件无损、禁改写），购物场景即按类目/金额/归属/讲价结果压缩。`historyLimit` 语义一并抄（空/0 无限，小于 10 钳 10）。
- **用户角色人设预置**：抄出战增量载入（19512~19529 + `readRoster`）到 `buildShopSystemPrompt`（2398）：加按在场名单精确匹配的队友人设表，未出战不发，临时队友按全局自由发挥，防提示词膨胀。ShopBlock 现是块内性格 + 立绘 + 全局三层，缺的就是这张按名单裁剪的队友表，随设置持久化。

---

## 6. 其他优化与健壮性（P0/P1/P2）

**P0（跑通阻塞，必须做）：**

- 截断告警：读 `finish_reason`，`length` 时明示并续问补 commands；`extractJsonLoose` null 与正常失败区分提示。
- `isRequesting` 互斥：抄 19210，`handleSendMessage` 请求中防重入已有雏形（空文本返回/防重入），要覆盖砍价与购买触发全入口，防并发刷屏与配额 double-spend。
- ADD 失败说辞：所有旁路/拦截失败都经店主一句话回吐（如“这个我真弄不到”），对齐 RpgCombat 失败回落跳过绝不死锁；各分支要有独立说辞，方便定位是哪条拦的。
- `purchaseHistory` schema 统一：补 `id/buyer/time` 三字段写入，或渲染侧改读现有字段；否则记录弹窗长期显示 undefined。
- 类目 `===` 与 `includes` 两套匹配统一：锚点模糊、均价精确，同名类目两边结论打架，先统一再收紧。

**P1（体验，跑通后做）：**

- 气泡 600ms 间隔 + 思考气泡 + 四级回退找人，保证多人同屏不重叠、同名怪不堆头。
- 记录筛选（全部/对话/购买/讲价/上架）+ 回合/会话折叠仅最新展开 + 双视口编辑回写。
- `max_tokens` 可配 + `temperature` 按场景区分（进店/购买 0.7，归类 0.3 已有，讲价可单独给）。
- 头像解析链加 generating 楼与 MMS 缺失三态提示已部分有，继续收敛到记录弹窗内可见。
- 好感三来源（对话/购物/砍价惩罚）在记录内可审计，方便调数值。

**P2（收紧约束，稳定后做）：**

- ADD 四重限制逐条恢复：先恢复价格与私藏，再恢复锚点，最后恢复频率与均价；每恢复一条配一条失败说辞与记录红字。
- 提示词恢复“不是许愿机”约束，违禁/神话/大宗军火拒绝话术进回归断言。
- 摘要引擎覆盖率断言（抄 `DIGEST_RULES` 的 `srcLine` 断言）与 harness 回归页补对话/ADD 用例。
- `endInjection` 与 `thinking:false` 开关、5 预设槽（抄 2338~2349/17786/18398/18445），多店多风格时再开。

---

## 7. 落地优先级（只建议，不动手）

| 优先级 | 内容 | 对应报告节 |
|---|---|---|
| P0-1 | ADD 放开：总开关旁路非最小校验 + 失败转明示 + `max_tokens` 放大 + 截断续问 | 5.3 |
| P0-2 | DEBUG 门控日志：`shopblock_llm_debug` 开关 + 全量 prompt/response | 5.4 |
| P0-3 | 记录 schema 修复 + 三类事件（对话/购物车/上架）落盘 | 5.2 |
| P1-1 | 气泡三件套：删立绘下方流水 → 记录承接永久 → 头像轮流气泡 | 5.1 |
| P1-2 | 上下文三级取数 + generating 楼 + 浅拷贝 | 5.5 |
| P1-3 | 出战人设增量表 + `isRequesting` 全入口互斥 | 5.5、6 |
| P2 | ADD 约束逐条恢复 + 拒绝话术回归 + 摘要覆盖率断言 | 6 |

---

## 8. 附录：关键文件行号索引

ShopBlock（`D:\Project\ShopBlock\index.html`）：展台三件套 1609~1638；`dialogueText` 1637；右上记录 `btnHistory` 1587、`historyModal` 1947、`ledgerTableBody` 1971；底栏 `partyDeck` 1691；`buildSpeakerWhitelist` 2361；`collectRecentStoryFloors` 2374；`buildShopSystemPrompt` 2398（ADD 提示词 2413~2414）；`buildSceneTrigger` 2421（chat 分支 2430）；`collectOptionalContext` 2436；`callShopLLM` 2484（`max_tokens` 2504）；`handleRegroup` 2517（400 在 2539）；`applyLLMResult` 2616；`showKeeperDialogue` 2657；`PORTRAIT_ANCHOR` 2669；`addLandedThisSession` 2682/3223；`applyAddCommand` 2685（7 个 return：2686/2691/2696/2699/2702/2719/2723）；`buildShopRecord/sessionDialogLog` 3191~3213；`onShopDataReceived` 3216；购物车 3590/3818/4035/4084/2954；结算 `checkoutCart` 3029；`renderLedgerTable` 4217；`handleSendMessage` 4328。

RpgCombat（`D:\Project\RpgCombat\index.html`）：气泡样式 1132~1194；战局弹窗 DOM 2237~2277；设置弹窗 2295~2434；输入条 2437~2448；`addHistory` 2671；头像映射 2691~2801；`parseCombatLog` 2805；`renderHistorySchemeA` 约 2900~2951；`refreshHistoryView` 2964；`setHistoryFilter` 3624；`showHistoryOnly` 14395；`toggleHistoryEdit` 14437；结算 14491~14622；`LLM_DEBUG` 17779~17784；`llmState` 17757；预设槽 17786/18398/18445；角色人设 18347~18396/19512；`showChatBubble` 19063；`sendPlayerChat` 19111；自动触发器 19143~19413；`requestLLMResponse` 19210；`showThinkingBubble` 19263；`callLLMAPI` 19479；楼层轮询 `startSTPolling` 9767。

RpgCombat 无 ADD、无商店：全文搜 ADD 零命中（`SPEC.md` 命中的只是 `addHistory/addParticle`）；所谓 ADD 是 ShopBlock `SPEC.md` 第三节自有协议。备份目录（`RpgCombat备份`、`备份（无需阅读）`、`修仙备份`）无需阅读。
