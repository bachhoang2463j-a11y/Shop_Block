#!/usr/bin/env node
/** 正则产物构建——从 index.html 生成酒馆正则 JSON 的 replaceString。
 *  用法：node build-regex.cjs
 *  流程：① 源码围栏断言（``` 序列数 == 2，仅头尾自围栏；组件源码纪律见 SPEC）
 *        ② 生成 ```html 围栏包整份 index.html 的 replaceString
 *        ③ & 实体免疫：产物内所有 & 改写为 &amp;（酒馆管线实体解码后逐字节还原）
 *        ④ 更新 regex-商店Block.json（id/findRegex 等字段原样保留，首跑生成）
 *  与 RpgCombat build-regex.cjs 同构的简化版（无 terser 压缩，源码即产物）。 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HTML = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'regex-商店Block.json');

function fail(msg) { console.error('[build-regex] 失败：' + msg); process.exit(1); }

// ---------- ① 源码围栏断言 ----------
const html = fs.readFileSync(HTML, 'utf8');
const fenceCount = (html.match(/```/g) || []).length;
if (fenceCount !== 0) {
    // 源码内部允许 0 个围栏（ShopBlock 的 YAML 示例全部写在 SPEC/README，不内嵌源码）；
    // 若未来内嵌提示词示例，必须 \u0060 转义，此断言兜底
    fail(`源码含 ${fenceCount} 个裸三反引号（要求 0：组件内部严禁裸围栏，防同楼层其他组件被引号美化污染）`);
}
// 脚本语法级断言：抽全部内联 script 逐块 new Function
const scriptBlocks = [];
html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, code) => {
    if (code.trim()) scriptBlocks.push(code);
    return m;
});
scriptBlocks.forEach((code, i) => {
    try { new Function(code); }
    catch (e) { fail(`脚本块 #${i} 语法错误：${e.message}`); }
});
if (scriptBlocks.length < 2) fail('脚本块数量异常（应含 js-yaml 内联 + 主脚本）');
console.log(`[build-regex] 源码断言通过：0 裸围栏，${scriptBlocks.length} 个脚本块语法 OK`);

// ---------- ② 组装 replaceString ----------
if (!/<\/html>/i.test(html)) fail('源码缺少 </html>');
const sentinel = 'id="woodenCabinet"'; // 结构哨兵：压缩/转义意外破坏的探测点
if (!html.includes(sentinel)) fail('源码缺少结构哨兵 ' + sentinel);

// ③ & 实体免疫（酒馆管线实体解码还原）
const escaped = html.replace(/&/g, '&amp;');
const replaceString = '```html\n' + escaped + '\n```';

// ---------- ④ 产物 JSON ----------
let entry = null;
if (fs.existsSync(OUT)) {
    entry = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    console.log('[build-regex] 更新现有产物：' + OUT);
} else {
    entry = {
        id: require('crypto').randomUUID(),
        scriptName: '商店Block',
        disabled: false,
        runOnEdit: true,
        // 与 MMS/RpgCombat 同款语义：取最后一个 <Shop_block>（大小写不敏感）
        findRegex: '/<Shop_block>(?![\\s\\S]*?<Shop_block>)\\s*([\\s\\S]*?)\\s*<\\/Shop_block>/i',
        trimStrings: [],
        replaceString: '',
        placement: [2],
        substituteRegex: 0,
        minDepth: null,
        maxDepth: null,
        markdownOnly: true,
        promptOnly: false
    };
    console.log('[build-regex] 首次生成产物：' + OUT);
}
entry.replaceString = replaceString;

// 产物断言：围栏配对（头尾各一）、无残留裸 ``` 于内部
const rs = entry.replaceString;
const rsFences = (rs.match(/```/g) || []).length;
if (rsFences !== 2) fail(`产物围栏数 ${rsFences} != 2（仅头尾自围栏）`);
const inner = rs.slice(rs.indexOf('\n') + 1, rs.lastIndexOf('```'));
if (inner.includes('```')) fail('产物内部残留裸三反引号');

fs.writeFileSync(OUT, JSON.stringify(entry, null, 4), 'utf8');
const sizeKB = Math.round(fs.statSync(OUT).size / 1024);
console.log(`[build-regex] 完成：${OUT}（${sizeKB} KB，replaceString ${Math.round(replaceString.length / 1024)} KB）`);
