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
| (本次) | M9：build-regex.cjs + regex-商店Block.json 产物（围栏断言抓到 3 处裸 ``` 已转义、& 实体免疫 881 处、管线模拟+产物运行验证全绿） |

### 关键技术决策备查

- **`let` 顶层变量不挂 window**：跨 iframe 测试必须用 `iframe.eval`（duo-harness 的 shopEval 模式）。
- **IAB 不可见环境 img.onerror 不派发**：立绘加载用 new Image() 预探测 + 超时兜底。
- **围栏纪律**：源码内正则/注释的 ``` 一律 `\u0060` 转义，build-regex 断言 0 裸围栏。
- **据点≠载具**：载具判定需排除含"现金"字段的模块（MMS 据点有名称+杂物+现金）。
- **MMS 刷新契约**：eventEmit('mms:status-updated', {message_id}) 的 id 必须等于 MMS 自身 floorId 才触发 refreshFromVars。
