# ShopBlock 施工日志

> 按 Coding rule：README 记现状、SPEC 记目标契约、LOG 记历史。禁止全量读 LOG 回溯，按日期查。

## 2026-09-15 · 全量施工 M1-M9

| 提交 | 内容 |
|---|---|
| f8d3173 | SPEC.md 定稿：Shop_block YAML / 独立LLM JSON / $shops 持久化 / MMS 直连契约 / 讲价投骰 / 立绘 10 类枚举 |
| d31b4b3 | README 定稿：最终交互逻辑（7 段玩家旅程）+ MVP 九步计划 |
| 21eadc7 | add 命令反许愿机四重限制（渠道/锚点/频率/价格） |
| 54760a9 | 讲价重构（按钮+拉条+LLM 四分支）+ 好感度三来源算法 |
| 045302b | 购物好感 $5+1 不设上限、结算框多选归属、Shop_Record 记录模块 |
| 23e40c6 | 结算二次扣除锁（$shop_sync 幂等 + lock 硬锁清单 + 锁窗口） |
| 41a2fa7 | 砍价成功自动回写商品柜折后价（会话内存态） |
| 58e25ad | M1：Shop_block 解析器 + 解析驱动渲染 + 手动导入框（单测 25/25；修 dialogueText 空元素遗留 bug） |
| f62ac3e | M2：立绘枚举接本地服务器（portraitBase 可配置、new Image 预探测+回退兜底；IAB 10 张全载） |
| 741caa5 | 调查员头像接 my_assets 服务器（avatarUrl/avatarBase、切换跟随；修 suoen 文件名） |
| 7dd02fb | 可选数据源降级原则入 SPEC（与副导演弱耦合，读不到为空） |
| 7c6359e | M4：独立 LLM 通道（extractJsonLoose 容错/代言白名单/最近2层正文/四场景 prompt/affection 落地；单测 21/21） |
| e5c1125 | M5：讲价与好感（砍价模式/拉条/斜体宣言/resolveBargain 纯函数/两次限制/折后价回写/effPrice 贯通；单测 15/15） |
| 02c8dbe | M6：MMS 直连结算闭环（stat_data 回溯读取/mesId 校验/多选归属 UI/checkoutCart/$shop_deal_result+lock/$shop_sync/购物好感/Shop_Record/事件广播） |
| 6132882 | style：回退头像卡为纵向布局，仅缩小文字底框 |
| 0b4d0c8 | style：头像卡彻底去除文字底框（纯头像+title 悬浮） |
| 8b2c0ea | M7：add 四重限制落地 + buy 场景 + 重排 regroup（确认框可撤销） |
| 2a2ad15 | 双组件联动 harness：MMS×ShopBlock 同环境 25 断言全绿 |
| 3366df7 | M8：私藏好感门（<100 隐藏/跃迁解锁+开柜演出）+ 风声/报纸可选上下文（降级为空） |
| c7f0cd0 | M9：build-regex.cjs + regex-商店Block.json 产物（围栏断言抓到 3 处裸 ``` 已转义、& 实体免疫 881 处、管线模拟+产物运行验证全绿） |

### 关键技术决策备查

- **`let` 顶层变量不挂 window**：跨 iframe 测试必须用 `iframe.eval`（duo-harness 的 shopEval 模式）。
- **IAB 不可见环境 img.onerror 不派发**：立绘加载用 new Image() 预探测 + 超时兜底。
- **围栏纪律**：源码内正则/注释的 ``` 一律 `\u0060` 转义，build-regex 断言 0 裸围栏。
- **据点≠载具**：载具判定需排除含"现金"字段的模块（MMS 据点有名称+杂物+现金）。
- **MMS 刷新契约**：eventEmit('mms:status-updated', {message_id}) 的 id 必须等于 MMS 自身 floorId 才触发 refreshFromVars。

## 2026-09-16 · M10 窄屏适配（手机竖屏 / 酒馆侧栏挤压）

- **诊断**：用户截图"窄屏乱码"实为 360-420px 视口布局崩坏——顶栏单行 flex 被 `body{overflow-x:hidden}` 切边（齿轮钮剩半、现钞剩 `.00`）、货柜 5 列每列仅 ~60px、party-card 4×90px 溢出、输入栏 nowrap 按钮挤扁输入框；层叠"商店数据"文字实为组件外聊天原文与塌陷 iframe 的视觉混杂，非组件 UI。
- **方案**（移植 RpgCombat 三原则）：单断点 `@media (max-width:640px)` 纯 CSS 追加覆盖；零 JS 宽度检测（iframe 内媒体查询按 iframe 视口自动响应，酒馆侧栏挤压自动生效）；不做整体 scale（点击错位）。`renderCabinet` 无空托盘补位等 JS 几何假设，改列数纯 CSS 即可。
- **覆盖明细**：顶栏 wrap/字号压缩；main padding 24→8；立绘展台 min-height 400→280、立绘 380→230；cabinet-header wrap + 隐藏"单件直入"提示；货柜 5列→3列、行高 114→104、可视高 496→456（保持柜内滚动）；party-card 90×96→72×80；隐藏购物车提示文字；输入栏动作按钮只留图标（btnNarratorToggle/btnBargain 补 title 悬停语义）；parchment-card 补 `max-height:86vh + overflow-y:auto` 纵向兜底（横向 92vw 已有）。
- **narrow-harness**：`integration-test/narrow-harness.html`，375×740 手机视口 srcdoc 加载组件，15 断言。首跑 14/15——唯一失败为 harness 基线断言写死 375px，实际纵向滚动条占 15px（clientWidth=360），放宽为窄屏区间断言后 15/15。
- **验证**：narrow-harness 15/15；duo-harness 回归 25/25（桌面 780px 零回归）；子代理目视截图确认顶栏换行合理、3 列卡无重叠、无横向溢出（立绘展台空白为 harness 无立绘数据的预期回退）。
- **IAB 经验**：降级态 rAF 节流使 playwright click 的 actionability 检查永久挂起（count()=1 仍 click 超时）→ 改 `evaluate` 页面内 `btn.click()` 直接派发；宿主会随机重置 IAB 标签到 about:blank，reload 即可。

| 提交 | 内容 |
|---|---|
| b221e73 | M10：640px 窄屏断点 ~70 行 CSS 覆盖 + narrow-harness 15 断言全绿（duo 回归 25/25） |

## 2026-09-16 · M11 修复"酒馆真机按钮无反应"（正则管线 $ 吞噬事故）

- **症状**：用户在酒馆里点商店组件任何按钮都无反应；同时现钞显示 ".00" 而非 "$280.00"。
- **根因**：IAB 进酒馆 live iframe 取证——主脚本（113KB）语法错误 `Invalid or unexpected token`，整块脚本零执行（监听器全没挂载）；`shelf-cell` 0 渲染。
- **机理**（读 `D:\SillyTavern\...\extensions\regex\engine.js:364-389` 确认）：酒馆正则引擎的替换是手写的 `replaceString.replaceAll(/\$(\d+)|\$<([^>]+)>/g, (…,num)=>{match=args[Number(num)]…})`，而非标准 `$` 模式解析。后果：
  1. `$数字`：无论正则有几个捕获组——findRegex 只有 1 个，所以 `$280`→`args[280]`→undefined→**空串**（`$280.00`→`.00` 之谜）；`$0`→`args[0]`=**整个 Shop_block 匹配文本**，产物里 `cartModalTotal.textContent = "$0.00"` 被注入多行 YAML → 主脚本语法错误 → 按钮全死。
  2. 产物共 10 处：HTML 区 7 处静态占位（$280.00/$0.00 等）、SCRIPT 区 3 处（其中 1 致命在 JS 字符串内，2 在注释内无害但顺带修）。
  3. `$$`/`$'`/`$<`/`{{` 在该引擎实现下安全（标准 $ 模式不解析，`{{match}}`→`$0` 后被同一正则的 `$0` 分支消费为空串——本产物 findRegex 无命名组但有 1 捕获组，`{{match}}` 产物内无残留故无影响）。
- **修复**：build-regex.cjs 新增分区免疫——SCRIPT 区 `$数字`→`\u0024`（JS 转义，语义逐字节等价，已断言 `"\u00240.00"==="$0.00"`）；SCRIPT 外 `$数字`→`&#36;`（浏览器实体解码还原）。HTML 区源码自带实体（`&#10;`/`&times;` 等）打包成 `&amp;#10;…`→解码还原一致，无副作用。
- **断言升级**（以往管线模拟只做"本组件豁免"，本次改为复刻引擎真实现）：用 `tavernReplace()` 复刻 engine.js 的 `{{match}}` 预处理 + `$数字/$<名>` 展开语义，对攻击型楼层（含引号换行的 Shop_block 前后文）做替换 → 剥围栏 → 全局实体解码（`&amp;→&`、`&#36;→$`；真机证据证明脚本内 `&amp;` 也被解码：live iframe 里 js-yaml new Function 校验 OK）→ 逐脚本块 new Function + `$280.00` 锚点 + 产物内 `$数字/$</{{` 零残留断言。
- **验证**：新增 `integration-test/product-harness.html`（产物 JSON → 酒馆语义替换 → 解码 → 375px mock boot → 点击），10/10 全绿：产物语法 OK、20 件渲染、现钞 `$280.00`、窄屏 3 列、点击入车 + 介绍气泡弹出。debug 中遇到 IAB 降级态 evaluate 长轮询超时——拆小步分次 evaluate 解决。
- **经验**：组件源码里**任何 `$` 后跟数字的字面**（静态 HTML 里的 `$280.00` 占位、JS 字符串 `"$0.00"`、注释里的 `$5`）都会被酒馆引擎吞噬/注入；构建链是最终防线，不要在源码里试图绕开。

| 提交 | 内容 |
|---|---|
| c235e8c | M11：build-regex `$数字` 分区免疫 + 酒馆管线真实现复刻断言 + product-harness 产物端到端 10/10 |

## 2026-09-16 · M12 楼层块自动捕获 + MMS 降级不再静默

- **缘起**：用户核对「ShopBlock 是否像 RpgCombat 一样在同层轮询抓块」。查证结论——**从来没有**：`setInterval` 在全部 27 个提交中零命中，`eventOn/eventSource` 零命中，`onShopDataReceived` 全文件只有「手动导入弹窗」一个生产调用点，首版（58e25ad）就写着"手动导入框"。这是 M1 设计阶段就漏掉的取数层（原始意图见 README M1"解析失败时显示手动粘贴回退框"——回退成了唯一入口），非中途删除。RpgCombat 的正则产物同样丢弃 `$1`，它的自动抓块完全靠 iframe 内 `startSTPolling()`（index.html:9767）。
- **方案**：iframe 内加 `startFloorPolling()`（RpgCombat 同构但更严）——首 tick 立即扫 + 800ms `setInterval`；读 `getChatMessages(getCurrentMessageId())` 本层正文（字段兼容同 `collectRecentStoryFloors`，跳过 `is_system`），退化 `getCurrentMessage()`；命中即 `clearInterval`；`appliedFloorBlockText` 去重防重复应用清空购物车/砍价会话态；`floorPollBusy` 防并发重入；5s 未扫到给提示、30s 硬上限；**钉住启动时的当前楼层不向前回溯**（宁可不显示，也不把别的楼的店显示到这一楼）。非酒馆环境不建定时器（纯 IAB/harness 零副作用，product/narrow 两个既有 harness 行为不变）。
- **手动导入优先**：`onShopDataReceived` 成功后一律 `stopFloorPolling()`，粘过的块不会被随后的轮询覆盖。
- **顺带修掉的两处既有缺陷**（都是本轮才暴露）：
  1. `updateUI()` 第 2 行写 `sanityText`/`sanityBar`，而商店 UI **根本没有这两个元素**（RpgCombat 状态栏的残留），函数从来就是抛异常退出——初始化尾部 `updateCartUI()` 一直没执行过，从 MMS 链调用它更会把 `syncPartyFromMms` 从中途炸断（现象：粘贴块后底栏仍是 demo 4 人）。改为 `if (el)` 守卫。
  2. 初始化时 `syncPartyFromMms()`（那时还没有块）与轮询载入后的同步并发，旧结果可能后落地把底栏覆盖回去。加 `partySyncSeq` 序号守卫：过期同步直接丢弃；`mmsDataState` 的赋值随之移到守卫之后。
- **MMS 降级不再静默**（用户诉求："mms 不在，粘贴不提示，显示默认 4 个 demo 角色有些奇怪"）：新增顶栏提示条 `#envNotice`（fixed 定位零布局位移、`width:max-content`+92vw 上限）。`mmsDataState = ok / unavailable / mismatch` 三态：`unavailable` → 常驻提示「未检测到 MMS 状态栏数据：底栏为示例角色、现钞为示例金额，结算不会写入状态栏」；`mismatch`（块「在场成员」与名册零匹配）→ 底栏置空 + 占位说明 + 常驻提示，`handleSendMessage`/砍价按钮加空发言人守卫，未分配结算的 alert 附带根因。手动导入成功文案同时回显该状态。
- **现金回显**：`playerState.cash` 全文从未被赋值，顶栏现钞恒为 demo $280（MMS 在跑也一样，与 README 已知边界矛盾）。改为 `syncPartyFromMms` 读到 `ctx.cash` 即回显 + `updateUI()`，结算写回 `stat_data` 成功后同步扣减，店内金额与状态栏一致。
- **验证**：新增 `integration-test/poll-harness.html`（产物管线 → 375px mock boot，四场景 A 自动捕获 / B MMS 缺失 / C 零匹配 / D 无酒馆 API，35 断言全绿）；回归 product-harness 10/10、duo-harness 25/25、narrow-harness 15/15。IAB 截图管道在降级态不可用（`screenshot activity capture failed for guest`），提示条几何用断言覆盖（375px 下 353×42 居中、文档横向溢出 0），目视确认留给真机。
- **测试踩坑备查**：① harness 里点 `.shelf-cell` 遇到"数量>1"商品会走数量弹窗、不入车——断言入车要走「点格 → 填 `qtyNumberInput` → 点 `qtyConfirmBtn`」完整链路；② duo-harness 用 `../../MiniMapStatus/...` 跨项目取文件，静态服务器必须以 `D:\Project` 为根，否则 404 成 "nf" 导致两 iframe 全白（表现为借探测超时，极易误判为代码回归）；③ boot 首 tick 是异步的，"就绪"不等于"已应用"，harness 需 `waitFor('appliedFloorBlockText !== null')` 再断言。

| 提交 | 内容 |
|---|---|
| cd72b60 | M12：楼层块自动捕获（RpgCombat startSTPolling 同构）+ MMS 三态提示（缺失/零匹配不再静默）+ 现钞回显 + updateUI/同步竞态双修（poll-harness 35/35，product 10/10、duo 25/25、narrow 15/15 回归全绿） |

## 2026-09-17 · M15 世界观/出场人设 + 初次会面信号

- **原因**：设置页存量「老布莱克伍德军械店老板」文本曾被误当自定义注入；system prompt 也没有区分“世界观”与“店主模板”，进店只说“小队刚进店”，LLM 容易默认成老主顾。另有一个一次性的“少‘你’字”出厂文本差异已修复。
- **改造**：设置页文本框改为「世界观提示词」（默认 1926 禁酒令 + 克苏鲁氛围，始终注入）；店主人设由块内「店主性格」+ 立绘语气锚演绎，旧固定老板文本读取时自动迁移。新增设置页「出场角色人设」文本区，按当前底栏出场名单裁剪注入，最多 8 条。进店触发器按好感度区分初次会面/旧交情。
- **验证**：llm-history 25/25；product 10/10、poll 35/35、midwide 78/78、narrow 15/15。

- **布局根因与修复**：M13 只解决 150% 缩放误入单栏，`body` 仍只有 `min-height:100vh`，`main` 按内容高度把底栏推出固定 iframe。新增 `min-width:641px && max-height:900px` 的视高容器：`body:100dvh`、顶栏/底栏不收缩、`main` 内部纵向滚动；`≤720/560px` 再分级压展台、立绘、货柜和底栏尺寸。保持 641–880 双栏和 ≤640 单栏契约不变。
- **ADD 跑通优先**：新增 `ADD_PERMISSIVE=true`，只保留命令类型/商店、名称/类目、正价格校验；旧锚点/私藏/频率/均价规则保留但旁路。`applyAddCommand` 统一返回 `{ok,reason}`，成功/失败均进购物记录；主请求 `max_tokens 400→900`，读取 `finish_reason`，`length` 或截断时只补问一次 commands。
- **对话三件套**：删除立绘下方 `dialogueText` 节点、样式及全部写点；右上购物记录增加全部/对话/购物/上架筛选，统一记录对话、购物车、购买和 ADD；LLM 多人台词改为 body 级 fixed 头像气泡，店主锚定立绘、队友锚定 `party-card[data-name]`，左右夹紧、600ms 轮播、超时移除。商品介绍继续使用原商品气泡。
- **稳定化**：加入 `shopblock_llm_debug` 门控日志、共享 LLM 请求锁、原生 chat 浅拷贝→楼层 API→generating 楼补偿的上下文链；统一 `purchaseHistory` 的 id/buyer/time/qty schema；修正 `readAllShops` 漏调用残留与 `$shop_sync` 键比对。
- **验证**：`llm-history-harness` 14/14，midwide 78/78，narrow 15/15，product 10/10，poll 35/35，duo 25/25，avatar 27/27；`build-regex.cjs` 源码脚本与酒馆替换管线全通过。

- **症状**：用户 PC 在 100% 缩放点全屏是横屏双栏，150% 下全屏变成单栏竖排；前一轮把断点 1200→880 后，125% 横屏了，150% 仍竖屏。
- **根因两条**：
  1. 布局判定是纯宽度媒体查询（零 JS 尺寸判断）：视口 CSS 宽被 150% 缩放压小，一旦撞上单栏断点就竖排。`:root:fullscreen` 兜底只在原生全屏伪类命中时改列定义，不参与宽度判定，救不了。
  2. **产物过期是前一轮没生效的真正原因**：`regex-商店Block.json` 停在 13:32 的旧版（`max-width: 1200px`、0 条 `:root:fullscreen`），而 index.html 的两次修复在 13:46/13:51——产物从未重建。酒馆里实际跑的是产物，所以用户在酒馆里一直看到的是旧的 1200px 单栏行为。
- **方案**（只动 CSS，不碰 JS、不碰全屏按钮）：`@media (max-width:880px)` 单栏判定改为 `@media (min-width:641px) and (max-width:880px)` 紧凑双栏——左栏收窄 200–280（minmax 夹紧）、立绘 380→300 / 展台 520→420、货柜 5→4 列（行高 114→108、可视高 496→464，保持柜内滚动）、底栏保持左右横排（头像卡 90×96→80×88、购物车提示文字隐藏让位）、顶栏/分类头允许换行防 700px 下沿横向溢出；纯单栏只剩 ≤640px 一档（原先从 880 块继承的 `main{1fr}` 与 `console-upper-row{1fr}` 补进 640 块，防止 ≤640px 掉回 430px 双栏溢出）。
- **代价**：641–880px（窄平板竖屏、酒馆侧栏挤压在此宽度）以前是单栏，现在是紧凑双栏——这是 150% 横屏的必要代价。若用户 150% 下 CSS 宽低于 641px（即 100% 基线 <962px）本方案覆盖不到，但按"125% 横、150% 竖"反推，用户 150% 宽落在 733–880 或 1000–1200，两种情况都在覆盖范围内。
- **交付事故教训**：`build-regex.cjs` 重建产物 + 酒馆重新导入是修复的必要环节，不做这步酒馆里看到的永远是旧断点。本轮已重建产物并验证含 `min-width:641/max-width:880` 新断点；用户仍需在酒馆正则扩展里重新导入该产物。
- **验证**：新增 `integration-test/midwide-harness.html`（853 用户场景 / 700 下沿 / 920 基线三档，40/40 全绿；853 目视确认双栏 4 列无挤压）；回归 narrow-harness 15/15、product-harness 10/10（产物端到端）。duo-harness 780px 宽落在新档位（紧凑双栏 + 货柜 4 列），其 25 条断言全是数据链路不含布局几何，不受影响。

| 提交 | 内容 |
|---|---|
| 88e567f | M13：中屏 641–880 紧凑双栏（150% 全屏保持横屏）+ midwide-harness 40 断言 + 产物重建（narrow 15/15、product 10/10 回归全绿） |

## 2026-09-17 · 四件套：等待气泡/问候开关/匿名约束/人设独立窗口

- **① 等待省略号气泡**：新增 `.llm-thinking-dot` 三点闪烁 CSS + `showKeeperThinking/hideKeeperThinking`，仅锚定老板立绘（复用店主分支定位）；钩子统一包 `callShopLLM`（入口显示、finally 移除），`applyLLMResult` 首行兜底。
- **② 开场问候开关**：新增 `llmConfig.greetEnabled`（默认 true，持久化），设置页复选框；OFF 时 `triggerEnterReaction` 跳过 LLM 直接内置迎宾，零 token；ON 时 enter 指令追加逐一点名欢迎。
- **③ 熟络前匿名**：第五节名单追加“<80 时 text 以‘这位客人’称呼、speaker 仍用真名”，第四节呼应“80 以下初识不知名”，enter 初次句追加相称；称谓用中性（无性别源）。
- **④ 人设独立窗口**：照搬 RpgCombat 单配置版——`partyPersonas` string→`[{name,prompt}]` 数组（启动迁移旧串），设置页 textarea→details 行列表（input 名+textarea 人设可换行+删除/新增），解析改精确匹配（删 120 字截断/8条上限/双向 includes）。旁白 OFF 真正停演：拼装只演店主+名单仅店主+场景去插话+落地丢弃非店主行。
- **token 上限**：四处（主请求默认/显式、补单、重排）900/500/400→8192。
- **验证**：沙盒 14/14；`llm-history-harness` 36/36（含新增 6 条）；IAB 设置页目检正常；`build-regex.cjs` 构建通过。

## 2026-09-17 · M16 结算注入酒馆输入框 + Shop_Record 全量 + 已有商店一览

- **① 结算注入错位（症状：点击结算，记录注入到 iframe 自己的输入栏而非酒馆）**：`checkoutCart` 调用的 `injectToSillyTavernInput` 全仓库只有调用无定义，恒走 else 分支 `chatInput.value = record`（iframe 内部单行 `<input>`）。RpgCombat 只抄了读侧（parent.SillyTavern.getContext），没抄写侧。修复：新增 `injectTextToTavernInput(record)` 三路回退——`parent#send_textarea` 追加（保留草稿 `\n\n` 分隔 + 派发 input 事件）→ TavernHelper `/setinput`（**只填不发送**；酒馆本体 `/setinput` 已核实 slash-commands.js:2098/3200；不用 RpgCombat 的 `/send|/trigger`——那会直接发出，违反"玩家检查后发送"契约；参数引号/反斜杠转义防管道解析）→ 剪贴板 + 控制台；绝不写 iframe 自身输入框，提示不谎报成功。
- **② Shop_Record 不分行 + 开头截断**：不分行根因是记录被填进单行 `input[type=text]`（value 清洗剥换行、横向溢出只见尾部像"开头被截"）；截头根因是 `sessionDialogLog.slice(-12)` + `applyLLMResult` 入库 `slice(0,80)`/每轮限 4 条。8192 上限只改 LLM 出参、与记录无关（排除）。修复：`buildShopRecord` 全量遍历对话日志；`applyLLMResult` 分层——记录层全量入库（白名单/旁白过滤后不裁剪），气泡显示层限 4 条防排队过久；`checkoutCart` 时序调整——`await triggerBuyReaction` 先落日志再组装记录（原为 fire-and-forget，购买回应必然缺失）；余额公式 `ctx.cash - (-cashDelta)*-1`（实为 cash+total）修正为 `ctx.cash + payload.cashDelta`。
- **③ 已有商店一览（原「导入商店块」按钮，debug 合并）**：顶栏按钮改名「已有商店一览」（id 保留）；弹窗顶部为 `$shops` 持久化店铺手风琴（原生 `<details>`，摘要=店名/店主/立绘/好感/件数/人设锁定标记），展开=店主立绘只读 + 店主人设 textarea + 好感 number（0-100 钳制）+ 商品只读（按类目列名/价格/数量）+ 保存修改/恢复块内人设/删除店铺；原导入 textarea + 解析载入 + 恢复示例商店整体下移到弹窗底部折叠「导入商店块（debug）」区。**人设手动优先**（用户确认）：`$meta.personaOverride` 锁定 + `$meta.blockPersona` 快照，`mergeShopIntoAll` 合并同名新块时锁定则持久层与运行态 `shopState.keeperPersona` 均用手动值（新块人设仅记快照），「恢复块内人设」写回快照并解除锁定；老数据无字段视为新块优先。删除复用 `deleteShop`（replaceVariables 整体替换），删当前店不强行清空运行态。新增 `escapeHtml`（实体 `\u0026` 拼写防解码歧义——首版实体被工具解码写坏成无操作，已发现即修）。
- **不做**：载入此店（从 `$shops` 反向构造运行态，范围外）；商品单条删除/编辑（用户明确不要）。
- **验证**：新增 `integration-test/shops-manager-harness.html`（mock 酒馆 API + parent 页 `#send_textarea`，34 断言）：注入链路 5 条（追加/草稿保留/input 事件/自身输入框不覆盖）、Shop_Record 组装 7 条（开头/最早对话/超 80 字全量/分行/余额 4816.40-26.75=4789.65）、applyLLMResult 全量入库 5 条、一览管理 17 条（好感钳制/锁定/同步/快照/恢复/删店）、debug 导入 2 条——**34/34 全绿**。回归：product-harness 10/10、llm-history-harness 36/36、poll-harness 35/35、duo-harness 25/25。IAB 目检：管理弹窗桌面 1280px 与窄屏 375px 手风琴/编辑区/按钮渲染正常、卡片 86vh 内滚动。`build-regex.cjs` 重建产物通过（0 裸围栏、脚本语法 OK、$数字免疫、管线模拟全绿）。真机（酒馆 `/setinput` 回退与 live iframe 行为）待用户导入验证。
