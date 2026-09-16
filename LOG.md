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
