#!/usr/bin/env node
/** 奇物定价内核定向验证（不改产物，只从 index.html 切片求值）。
 *  用法：node integration-test/fixtures/verify-pricing.cjs
 *  切片区间：RELIC_TIERS 定义 → 讲价段之前（即整段定价内核）。
 *  校准锚点来自 SPEC 第九节：奇异海螺=常规·每场1次、芭斯特的猫眼石=高阶·每场2次。 */
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', '..', 'index.html');
const src = fs.readFileSync(HTML, 'utf8');

const START = 'const RELIC_TIERS = {';
// 定价内核落在讲价段的 effPrice 之后，故结束锚点取紧随其后的投骰判定段
const END = '// 投骰判定纯函数';
const s = src.indexOf(START);
const e = src.indexOf(END);
if (s < 0 || e < 0 || e <= s) {
    console.error('切片锚点未命中：定价内核可能已被移动或改名');
    process.exit(1);
}
const kernel = src.slice(s, e);

// effPrice 依赖的两个外部函数用桩替代（本测试不覆盖好感涨价与砍价，只覆盖奇物底价保护）
const stubs = `
function getBasePrice(item) { return Number(item && item.price) || 0; }
function isPriceHiked() { return false; }
`;

let K;
try {
    K = new Function(stubs + kernel + `
        return { RELIC_TIERS, parseBattleItemLine, slotNum, relicEffectFactor, relicFormOf,
                 guessRelicTier, relicValuationOf, buildRelicVal: relicValuationOf,
                 sellPriceOfBase, normalizeShopType, shopCanSellTier, shopCanSellItem,
                 isRelicItem, baseValuation, sellUnitPrice, effPrice, relicPriceFloor,
                 roundMoney, RELIC_FORM_M, SHOP_TYPES, RELIC_TIER_ALIAS, RELIC_FORM_ALIAS };
    `)();
} catch (err) {
    console.error('内核求值失败：', err.message);
    process.exit(1);
}

// buildRelicRecord 在目录段（切片之外），这里按同一口径重建一个最小版用于验证公式链
function buildRelic(line, tierDecl, formDecl, children) {
    const parsed = K.parseBattleItemLine(line);
    if (!parsed) return null;
    const kids = (children || []).map(K.parseBattleItemLine).filter(Boolean);
    const form = (formDecl && K.RELIC_FORM_ALIAS[formDecl]) || K.relicFormOf(parsed.category);
    if (!form) return null;
    const tier = (tierDecl && K.RELIC_TIER_ALIAS[tierDecl]) || K.guessRelicTier({ name: parsed.name, slots: parsed.slots });
    const E = K.relicEffectFactor({ slots: parsed.slots, children: kids.map(c => ({ slots: c.slots })) });
    if (E == null) return null;
    const uses = form === 'reusable' ? Math.max(1, parsed.uses || 1) : 0;
    const val = K.relicValuationOf(tier, form, E, uses);
    return { tier, form, uses, E, val, parsed };
}

function relicItem(line, tierDecl, formDecl, children) {
    const r = buildRelic(line, tierDecl, formDecl, children);
    if (!r) return null;
    return { name: r.parsed.name, price: 0.5, relic: { tier: r.tier, form: r.form, uses: r.uses, E: r.E, price: r.val.price, floor: r.val.floor }, dealPrice: null };
}

let pass = 0;
const fails = [];
function eq(label, got, want) {
    if (got === want) { pass++; return; }
    fails.push(`${label}：期望 ${want}，实得 ${got}`);
}
function ok(label, cond) {
    if (cond) { pass++; return; }
    fails.push(`${label}：断言不成立`);
}

// ---------- 1. 校准锚点：海螺（常规·每场1次）与猫眼石（高阶·每场2次） ----------
const conch = buildRelic('【奇异海螺】[群盲;power:20][Aim:120][Turns:5][MP:5][道具][次数:1]', '常规');
ok('海螺被识别为奇物', !!conch);
eq('海螺档位', conch && conch.tier, 'common');
eq('海螺形态', conch && conch.form, 'reusable');
eq('海螺每场次数', conch && conch.uses, 1);
eq('海螺效果系数 E', conch && conch.E, 1.0);
eq('海螺基准价（锚点 $500）', conch && conch.val.price, 500);
eq('海螺购买底价 $200', conch && conch.val.floor, 200);

const catsEye = buildRelic('【芭斯特的猫眼石】[单回蓝;power:5][单回;power:50][道具][次数:2][他人][高阶]', '高阶');
ok('猫眼石被识别为奇物', !!catsEye);
eq('猫眼石档位', catsEye && catsEye.tier, 'high');
eq('猫眼石每场次数', catsEye && catsEye.uses, 2);
eq('猫眼石次数系数 U=1.25', catsEye && catsEye.val.U, 1.25);
eq('猫眼石效果系数 E', catsEye && catsEye.E, 1.0);
eq('猫眼石基准价（锚点 $5,000）', catsEye && catsEye.val.price, 5000);

// ---------- 2. 传说一次性：高效果系数 + 形态 0.25 ----------
const sehkmet = buildRelic('【塞赫美特之愠】[穿透;power:500][必中][消耗品][数量:1][MP:10][HP:10][延迟:3][传奇]', '传说');
ok('塞赫美特之愠被识别为奇物', !!sehkmet);
eq('传说档位', sehkmet && sehkmet.tier, 'legendary');
eq('一次性形态', sehkmet && sehkmet.form, 'consumable');
eq('强效果封顶 E=1.5', sehkmet && sehkmet.E, 1.5);
eq('传说一次性基准价（$20,000×1.5 夹带后 ×0.25）', sehkmet && sehkmet.val.price, 7500);
eq('传说一次性底价（$10,000×0.25）', sehkmet && sehkmet.val.floor, 2500);

// ---------- 3. 组合道具：父行无效果槽，效果全在子技能 ----------
const tuningFork = buildRelic(
    '【安魂曲音叉】[道具][次数:3][高阶]', '高阶', null,
    ['【谐律之庇】[群驱散:2][法术]', '【静默之域】[群滞;power:20][Aim:120][法术]', '【碎裂之响】[群降;power:20][Aim:120][暴击:5%][法术]']
);
ok('组合道具被识别（父行无效果槽）', !!tuningFork);
eq('组合道具每场次数按父道具计（不是 3 个子技能各算）', tuningFork && tuningFork.uses, 3);
eq('组合道具次数系数 U=1.5', tuningFork && tuningFork.val.U, 1.5);
eq('组合道具效果系数 E=1.25（三个群系效果）', tuningFork && tuningFork.E, 1.25);
eq('组合道具基准价', tuningFork && tuningFork.val.price, 7500);

// ---------- 4. 不进奇物体系的情形 ----------
eq('弹药永不入奇物体系', buildRelic('【.32子弹】[弹药][数量:45][绑定:萨维奇三连发*3]'), null);
eq('无类别标签的行不入奇物体系', buildRelic('【碎骨连打】[单体;power:80][Aim:140]'), null);

// ---------- 5. 档位自动判定保守性：普通武器不因招式带传奇被抬档 ----------
eq('工业消耗品无神秘词 → 常规档', K.guessRelicTier({ name: '精华秘酿', slots: K.parseBattleItemLine('【精华秘酿】[单回蓝;power:10][消耗品][数量:6]').slots }), 'common');
eq('名称含"圣物" → 高阶档', K.guessRelicTier({ name: '银质圣物匣' }), 'high');
eq('物品行 [传奇] 标签 → 传说档', K.guessRelicTier({ name: '某物', slots: K.parseBattleItemLine('【某物】[单回;power:50][道具][次数:1][传奇]').slots }), 'legendary');

// ---------- 6. 售卖权限：传说永不入货架，高阶仅奢侈品店 ----------
eq('普通店不卖高阶', K.shopCanSellTier('普通', 'high'), false);
eq('普通店不卖传说', K.shopCanSellTier('普通', 'legendary'), false);
eq('普通店卖常规', K.shopCanSellTier('普通', 'common'), true);
eq('奢侈品店卖高阶', K.shopCanSellTier('奢侈', 'high'), true);
eq('奢侈品店也不卖传说', K.shopCanSellTier('奢侈', 'legendary'), false);
eq('普通商品在任何店都可售', K.shopCanSellItem('普通', { price: 35 }), true);
eq('立绘奢品商人 → 奢侈店', K.normalizeShopType('', '奢品商人'), '奢侈');
eq('立绘铁匠机械师 → 普通店', K.normalizeShopType('', '铁匠机械师'), '普通');
eq('显式声明优先于立绘', K.normalizeShopType('奢侈', '铁匠机械师'), '奢侈');

// ---------- 7. 买价底价保护与回收价 ----------
const conchItem = relicItem('【奇异海螺】[群盲;power:20][Aim:120][Turns:5][MP:5][道具][次数:1]', '常规');
conchItem.dealPrice = 10;
eq('砍价到 $10 仍被底价 $200 托住', K.effPrice(conchItem), 200);
eq('奇物底价可读', K.relicPriceFloor(conchItem), 200);
eq('普通商品无底价', K.relicPriceFloor({ price: 35 }), null);
eq('普通商品不受底价影响', K.effPrice({ price: 35, dealPrice: 12 }), 12);
eq('回收价 = 基准估值四成（$5,000 → $2,000）', K.sellPriceOfBase(5000), 2000);
eq('传说一次性回收价（$7,500 → $3,000）', K.sellPriceOfBase(7500), 3000);

// ---------- 8. 基准估值：奇物取公式价，普通商品取正文报价 ----------
eq('奇物基准估值取公式价', K.baseValuation(conchItem), 500);
eq('普通商品基准估值取报价', K.baseValuation({ price: 25 }), 25);
eq('奇物回收单价', K.sellUnitPrice(conchItem), 200);

// ---------- 9. 金额取整 ----------
eq('金额取整到分', K.roundMoney(1234.5678), 1234.57);
eq('零值不产生 NaN', K.roundMoney(undefined), 0);

// ---------- 10. 装备/招式标签不外溢成商品档位 ----------
// 用户的「皇家猎象枪」等属于技能行的 [高阶]/[传奇]，商品侧没有奇物声明时不得被抬档
eq('无声明无神秘词的普通武器保持普通商品', K.isRelicItem({ price: 240 }), false);
eq('普通武器无奇物底价', K.relicPriceFloor({ price: 240 }), null);

console.log(`通过 ${pass} 项，失败 ${fails.length} 项`);
if (fails.length) {
    fails.forEach(f => console.log('  ✗ ' + f));
    process.exit(1);
}
console.log('定价内核校准与权限规则全部通过');
