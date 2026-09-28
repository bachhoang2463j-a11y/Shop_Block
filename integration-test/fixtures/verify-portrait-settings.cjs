#!/usr/bin/env node
/** 立绘外链与设置项清理定向断言验证
 *  用法：node integration-test/fixtures/verify-portrait-settings.cjs
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HTML_PATH = path.join(__dirname, '..', '..', 'index.html');
const JSON_PATH = path.join(__dirname, '..', '..', 'regex-商店Block.json');
const RES_TXT_PATH = path.join(__dirname, '..', '..', 'shop_resources', 'imgur_resources.txt');
const MAP_TXT_PATH = path.join(__dirname, '..', '..', 'shop_resources', '资源对照表.txt');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const jsonStr = fs.readFileSync(JSON_PATH, 'utf8');
const resTxt = fs.readFileSync(RES_TXT_PATH, 'utf8');
const mapTxt = fs.readFileSync(MAP_TXT_PATH, 'utf8');

let pass = 0, fail = 0;
function test(name, fn) {
    try {
        fn();
        pass++;
        console.log(`  ✓ ${name}`);
    } catch (e) {
        fail++;
        console.error(`  ✗ ${name}: ${e.message}`);
    }
}

console.log('== 1. 资源文档完整性断言 ==');
const EXPECTED_PORTRAITS = {
    '铁匠机械师': 'https://imgur.la/images/2026/09/29/Blacksmith_Machinist.png',
    '黑市贩子': 'https://imgur.la/images/2026/09/29/black_market.png',
    '古籍书商': 'https://imgur.la/images/2026/09/29/book.png',
    '酒馆老板': 'https://imgur.la/images/2026/09/29/food.png',
    '荒野猎人': 'https://imgur.la/images/2026/09/29/hunter.png',
    '奢品商人': 'https://imgur.la/images/2026/09/29/luxury.png',
    '秘石商人': 'https://imgur.la/images/2026/09/29/magic.png',
    '药剂修女': 'https://imgur.la/images/2026/09/29/medical.png',
    '布道神父': 'https://imgur.la/images/2026/09/29/religion.png',
    '占卜商妇': 'https://imgur.la/images/2026/09/29/shop.png'
};

test('imgur_resources.txt 包含全部10个外链', () => {
    for (const [k, url] of Object.entries(EXPECTED_PORTRAITS)) {
        assert(resTxt.includes(url), `缺少外链: ${k} -> ${url}`);
    }
});

test('资源对照表.txt 包含全部10个外链', () => {
    for (const [k, url] of Object.entries(EXPECTED_PORTRAITS)) {
        assert(mapTxt.includes(url), `缺少外链: ${k} -> ${url}`);
    }
});

console.log('== 2. index.html DOM 结构断言 ==');
test('HTML中不再包含 <summary>资源地址</summary>', () => {
    assert(!html.includes('资源地址'), '仍残留「资源地址」字样');
});
test('HTML中不再包含 id="llmPortraitBase"', () => {
    assert(!html.includes('id="llmPortraitBase"'), '仍残留 llmPortraitBase 输入框');
});
test('HTML中不再包含 id="llmAvatarBase"', () => {
    assert(!html.includes('id="llmAvatarBase"'), '仍残留 llmAvatarBase 输入框');
});

console.log('== 3. JavaScript 逻辑求值断言 ==');
// 提取主脚本
const scripts = [];
html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, code) => {
    if (code.trim()) scripts.push(code);
    return m;
});

test('脚本语法校验全部通过', () => {
    assert(scripts.length >= 2, '脚本块数量异常');
    scripts.forEach((code, idx) => {
        new Function(code);
    });
});

test('PORTRAIT_ENUM 包含正确的10个外链且 portraitUrl() 行为正确', () => {
    const mainScript = scripts[scripts.length - 1];
    // 提取 PORTRAIT_ENUM 和 portraitUrl
    const enumMatch = mainScript.match(/const PORTRAIT_ENUM\s*=\s*\{[\s\S]*?\};/);
    assert(enumMatch, '未找到 PORTRAIT_ENUM 定义');
    const funcMatch = mainScript.match(/function portraitUrl\s*\([^)]*\)\s*\{[\s\S]*?\}/);
    assert(funcMatch, '未找到 portraitUrl 函数定义');

    const sandbox = new Function(`
        ${enumMatch[0]}
        ${funcMatch[0]}
        return { PORTRAIT_ENUM, portraitUrl };
    `)();

    for (const [k, url] of Object.entries(EXPECTED_PORTRAITS)) {
        assert.strictEqual(sandbox.PORTRAIT_ENUM[k], url, `${k} 映射不正确`);
        assert.strictEqual(sandbox.portraitUrl(k), url, `${k} 的 portraitUrl 返回不正确`);
    }

    // 验证非法店主名及空值回退到占卜商妇
    assert.strictEqual(sandbox.portraitUrl('未知店主'), EXPECTED_PORTRAITS['占卜商妇'], '非法店主名未回退到占卜商妇');
    assert.strictEqual(sandbox.portraitUrl(''), EXPECTED_PORTRAITS['占卜商妇'], '空字符串立绘名未回退到占卜商妇');
    assert.strictEqual(sandbox.portraitUrl(null), EXPECTED_PORTRAITS['占卜商妇'], 'null 立绘名未回退到占卜商妇');
    assert.strictEqual(sandbox.portraitUrl(undefined), EXPECTED_PORTRAITS['占卜商妇'], 'undefined 立绘名未回退到占卜商妇');
});

test('JS 源码中无遗留的 llmPortraitBase / portraitBase', () => {
    assert(!html.includes('llmPortraitBase'), '仍残留 llmPortraitBase 符号');
    assert(!html.includes('portraitBase'), '仍残留 portraitBase 符号');
});

console.log('== 4. 正则产物 regex-商店Block.json 断言 ==');
test('regex-商店Block.json 是合法 JSON 且包含 10 个外链且无废弃设置项', () => {
    const json = JSON.parse(jsonStr);
    assert(json.replaceString, '缺少 replaceString');
    for (const [k, url] of Object.entries(EXPECTED_PORTRAITS)) {
        assert(json.replaceString.includes(url), `产物未包含外链: ${url}`);
    }
    assert(!json.replaceString.includes('资源地址'), '产物中仍残留「资源地址」');
    assert(!json.replaceString.includes('llmPortraitBase'), '产物中仍残留 llmPortraitBase');
    assert(!json.replaceString.includes('llmAvatarBase'), '产物中仍残留 llmAvatarBase');
});

console.log('----------------------------------------');
console.log(`断言结果: 通过 ${pass} 项, 失败 ${fail} 项`);
if (fail > 0) process.exit(1);
