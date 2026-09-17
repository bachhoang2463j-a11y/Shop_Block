#!/usr/bin/env node
/** 正则产物构建（含产物压缩）——从 index.html 生成酒馆正则 JSON 的 replaceString。
 *  用法：node build-regex.cjs
 *  流程：① 源码断言（``` 序列数 == 0，组件内部严禁裸围栏；逐内联 script 语法校验）
 *        ② 产物压缩（源码 index.html 保持可读，只压嵌入正则的副本；RpgCombat 同款管线）：
 *           - 每个内联 <script> 过 terser@5（--compress evaluate=false 防常量折叠；
 *             --mangle reserved=['$'] 禁 $ 单字符名，防拼出 $&/$N 替换序列）
 *           - 围栏加固：3+ 连反引号改写为 \u0060 转义（字符串/正则语义等价）
 *           - html-minifier-terser 压 HTML 空白/注释与 CSS（不碰已压缩脚本）
 *        ③ 生成 ```html 围栏包压缩产物的 replaceString
 *        ④ & 实体免疫 + $数字免疫（酒馆正则引擎会把 $数字 当组引用吞噬，见 ⑥）
 *        ⑤ 更新 regex-商店Block.json（id 等字段原样保留；findRegex 强制写回非捕获组版本）
 *        ⑥ 酒馆正则管线模拟断言（复刻 engine.js runRegexScript 的 $ 展开行为）
 *  依赖：npx（首次运行下载 terser@5 / html-minifier-terser@7）。 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const HTML = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'regex-商店Block.json');
const TMP = path.join(ROOT, '.tmp-minify');

function fail(msg) { console.error('[build-regex] 失败：' + msg); process.exit(1); }

// ---------- 产物压缩 ----------
function buildMinifiedHtml(src) {
    fs.mkdirSync(TMP, { recursive: true });
    try {
        // 1) 抽出有内容的内联 <script>（跳过外链与空块），占位待回填
        const slots = [];
        let out = src.replace(
            /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,
            (m, code) => {
                if (!code.trim()) return m;
                slots.push(code);
                return '<!--__MINIFY_SLOT_' + (slots.length - 1) + '__-->';
            }
        );

        // 2) 逐块 terser + 围栏加固
        for (let i = 0; i < slots.length; i++) {
            const inFile = path.join(TMP, 'in-' + i + '.js');
            const outFile = path.join(TMP, 'out-' + i + '.js');
            fs.writeFileSync(inFile, slots[i]);
            // evaluate=false：防特意拼写的标记字符串被常量折叠成第二处可匹配文本；
            // reserved=['$']：压缩器生成的 $ 标识符与 &&/数字邻接会拼出 $&/$N 捕获组替换序列
            // （酒馆正则引擎用 String.replace 应用 replaceString 时会顶替为捕获组内容）
            execSync(
                'npx -y terser@5 "' + inFile + '" --compress evaluate=false --mangle reserved=[\'$\'] --comments "/@license/" -o "' + outFile + '"',
                { cwd: ROOT, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }
            );
            const min = fs.readFileSync(outFile, 'utf8');
            // 围栏加固：3+ 连反引号会破坏组件自围栏配对（污染同楼层其他组件），
            // 改回 \u0060 转义形式（字符串/正则字面量里语义完全等价）
            const fencedIn = min.replace(/`{3,}/g, (m) => '\\u0060'.repeat(m.length));
            if (/`{3,}/.test(fencedIn)) fail('脚本块 #' + i + ' 围栏加固后仍残留 3+ 连反引号');
            try { new Function(fencedIn); } // 语法级断言
            catch (e) { fail('脚本块 #' + i + ' 压缩后语法错误：' + e.message); }
            if (fencedIn.includes('</scr' + 'ipt')) fail('脚本块 #' + i + ' 含 </script，会截断内联脚本');
            // 回填用函数形式替换，避免 $ 序列被 String.replace 特殊解释
            out = out.replace('<!--__MINIFY_SLOT_' + i + '__-->', () => '<script>' + fencedIn.trim() + '</script>');
        }

        // 3) HTML 空白/注释 + CSS 压缩（不碰脚本内容）
        const inHtml = path.join(TMP, 'in.html');
        fs.writeFileSync(inHtml, out);
        const minified = execSync(
            'npx -y html-minifier-terser@7 "' + inHtml + '" --collapse-whitespace --remove-comments --minify-css',
            { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
        ).toString('utf8');

        // 4) 产物断言
        if (!/<\/html>/i.test(minified)) fail('压缩产物缺少 </html>');
        if (minified.includes('```')) fail('压缩产物含裸三反引号，违反围栏纪律');
        const sentinel = 'id="woodenCabinet"'; // 结构哨兵：压缩/转义意外破坏的探测点
        if (!minified.includes(sentinel)) fail('压缩产物缺少结构哨兵 ' + sentinel);
        return minified;
    } finally {
        fs.rmSync(TMP, { recursive: true, force: true });
    }
}

// ---------- ① 源码断言 ----------
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

// 产物压缩（源码保持可读，只压进正则的副本）
const srcLen = html.length;
const minified = buildMinifiedHtml(html);
console.log('[build-regex] 产物压缩：' + srcLen + ' -> ' + minified.length + ' 字符（-' +
    Math.round((1 - minified.length / srcLen) * 100) + '%）');

// ③ & 实体免疫（酒馆管线实体解码还原）
const escaped = minified.replace(/&/g, '&amp;');
if (/&(?!amp;)/.test(escaped)) fail('全量 & 转义后仍存在非 &amp; 形式的 & 序列');
if (escaped.replace(/&amp;/g, '&') !== minified) fail('&amp; 还原一致性校验失败');
// ③' $数字免疫：酒馆正则引擎（extensions/regex/engine.js runRegexScript）用
//    replaceAll(/\$(\d+)|\$<([^>]+)>/g, ...) 展开组引用——无效组号一律替换为空串，
//    $0 展开为整个匹配文本。产物内任何 "$+数字" 都会被吞/注入。
//    分区免疫：script 区用 JS 转义 \u0024（语义不变），script 外用实体 &#36;（浏览器解码还原）。
//    "$"+非数字（$$ / $' / $shops / ${）不被该引擎处理，保持原样。
const IMMUNE_RE = /\$(?=\d)/g;
const dollarEscaped = escaped.replace(/(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (m, openTag, code, closeTag) => {
        if (!code.trim()) return m;
        return openTag + code.replace(IMMUNE_RE, '\\u0024') + closeTag;
    });
const replaceString = '```html\n' + dollarEscaped.replace(IMMUNE_RE, '&#36;') + '\n```';

// ---------- ⑤ 产物 JSON ----------
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
// 与 MMS/RpgCombat 同款语义：取最后一个 <Shop_block>（大小写不敏感）。
// 全程非捕获组并强制写回（迁移旧产物字段）：findRegex 一旦含捕获组，产物里的 $&/$1 等
// 替换记号会被酒馆引擎展开为捕获内容注入正文（MMS 实测炸机案例），非捕获组根因断绝。
const FIND_REGEX = '/<Shop_block>(?![\\s\\S]*?<Shop_block>)\\s*(?:[\\s\\S]*?)\\s*<\\/Shop_block>/i';
{
    const bare = FIND_REGEX.replace(/\\\(/g, '').replace(/\(\??[:=!<]/g, '');
    if (/\(/.test(bare)) fail('findRegex 含捕获组：产物中的 $&/$1 等替换记号会被展开注入，请改用非捕获组 (?:...)');
}
entry.findRegex = FIND_REGEX;
entry.replaceString = replaceString;

// 产物断言：围栏配对（头尾各一）、无残留裸 ``` 于内部
const rs = entry.replaceString;
const rsFences = (rs.match(/```/g) || []).length;
if (rsFences !== 2) fail(`产物围栏数 ${rsFences} != 2（仅头尾自围栏）`);
const inner = rs.slice(rs.indexOf('\n') + 1, rs.lastIndexOf('```'));
if (inner.includes('```')) fail('产物内部残留裸三反引号');

// ---------- ⑥ 酒馆正则管线模拟（复刻 engine.js runRegexScript 的 $ 展开） ----------
// 真实现：rawString.replace(findRegex, function(match){ ... replaceString.replaceAll(/\$(\d+)|\$<([^>]+)>/g, ...) })
// 其中 $n → args[n]（无效组号 undefined → 空串），$0 → 整个匹配文本；trimStrings 为空数组。
function tavernReplace(rawString, findRegexStr, replaceStr) {
    const fm = findRegexStr.match(/^\/([\s\S]*)\/([a-z]*)$/);
    const re = new RegExp(fm[1], fm[2]);
    return rawString.replace(re, function (match) {
        const args = [...arguments];
        let cur = match; // 复刻实现中 match 被 $n 逐个覆盖的语义
        const out = replaceStr.replace(/{{match}}/gi, '$0').replace(/\$(\d+)|\$<([^>]+)>/g, (_, num) => {
            if (num) cur = args[Number(num)] != null ? args[Number(num)] : undefined;
            if (!cur) return '';
            return cur;
        });
        return out;
    });
}
// 模拟楼层：前文 + 含引号换行的 Shop_block + 后文（后文用于暴露 $0 注入类破坏）
const fakeFloor = '楼层前文广告。\n' +
    '<Shop_block>\n商店数据:\n  店名: "出征杂货铺"\n  店主: "老萨姆"\n</Shop_block>\n' +
    '楼层后文第一行(带"引号")。\n后文第二行。\n';
const replaced = tavernReplace(fakeFloor, entry.findRegex, entry.replaceString);
// 剥围栏取产物体，script 块外做浏览器实体解码（script 内容不解析实体）
const body5 = replaced.slice(replaced.indexOf('```html\n') + 8, replaced.lastIndexOf('\n```'));
if (!body5.includes(sentinel)) fail('管线模拟后结构哨兵丢失');
// 全局实体解码（复刻酒馆管线：消息文本层面 &amp; 先被解回 &，script 内也不例外——
// 真机证据：live iframe 里 js-yaml 脚本 new Function 校验 OK，若脚本内 &amp; 未被解码它早挂了）。
// script 区的 \u0024 不受实体解码影响（JS 自行解析），HTML 区的 &#36; 此刻还原为 $。
const decoded = body5.replace(/&amp;/g, '&').replace(/&#36;/g, '$');
// 断言 A：解码后所有脚本块语法 OK（= 酒馆真管线下组件可执行）
const pipeScripts = [];
decoded.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, code) => {
    if (code.trim()) pipeScripts.push(code);
    return m;
});
pipeScripts.forEach((code, i) => {
    try { new Function(code); }
    catch (e) { fail(`管线模拟后脚本块 #${i} 语法错误（酒馆管线会破坏组件）：${e.message}`); }
});
if (pipeScripts.length < 2) fail('管线模拟后脚本块数量异常');
// 断言 B：静态价格占位幸存。HTML 区 &#36; 还原为 $，SCRIPT 区 \u0024 是 JS 等价语义（字面保留）。
// terser 可能改写引号与空白，textContent 锚点用宽松形态匹配。
if (!decoded.includes('>$280.00<')) fail('管线模拟后 cashDisplay 静态占位 $280.00 丢失（$数字免疫失效）');
if (!/textContent\s*=\s*["']\\u00240\.00["']/.test(decoded)) fail('管线模拟后 textContent="$0.00" 的 \\u0024 免疫丢失');
// 断言 C：产物体内无残留 "$+数字" 与 "$<"（酒馆展开模式零命中）与 "{{"（宏管线零命中）。
// 注意不引入 RpgCombat 的宽域 $[$&`'\d<] 断言：本源码模板字面量合法存在 "$${"（29 处），
// 且引擎仅展开 $数字/$<（见 ③' 注释），$$/$'/$shops/${ 不在展开面。
if (/\$(?=\d)/.test(inner)) fail('产物内残留 $数字 序列（将被酒馆引擎吞噬）');
if (/\$</.test(inner)) fail('产物内残留 $< 序列（可能触发命名组展开）');
if (/\{\{/.test(inner)) fail('产物内残留 {{ 序列（将进入酒馆宏替换管线）');
console.log(`[build-regex] 酒馆管线模拟通过：${pipeScripts.length} 脚本块语法 OK，$数字/$</{{ 零残留，锚点 $280.00 与 "$0.00" 幸存`);

fs.writeFileSync(OUT, JSON.stringify(entry, null, 4), 'utf8');
const sizeKB = Math.round(fs.statSync(OUT).size / 1024);
console.log(`[build-regex] 完成：${OUT}（${sizeKB} KB，replaceString ${Math.round(replaceString.length / 1024)} KB）`);
