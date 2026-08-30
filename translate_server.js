import fs from 'fs';

async function translateStringsFast(texts) {
    if (texts.length === 0) return [];
    
    console.log(`Translating ${texts.length} strings using joined chunks...`);
    const results = [];
    
    // Chunking by char length
    let currentChunk = [];
    let currentLen = 0;
    const chunks = [];
    
    for (const text of texts) {
        if (currentLen + text.length > 2000) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentLen = 0;
        }
        currentChunk.push(text);
        currentLen += text.length + 10;
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    
    console.log(`Split into ${chunks.length} chunks.`);
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const joined = chunk.join(" ||| ");
        
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(joined)}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error("HTTP error", res.status);
                results.push(...chunk);
                continue;
            }
            const json = await res.json();
            const translatedText = json[0].map(segment => segment[0]).join('');
            
            const split = translatedText.split(/\s*\|\|\|\s*/);
            
            if (split.length === chunk.length) {
                results.push(...split);
            } else {
                console.error(`Mismatch length in chunk ${i}. Expected ${chunk.length}, got ${split.length}`);
                results.push(...chunk);
            }
        } catch (e) {
            console.error("Translation error:", e);
            results.push(...chunk);
        }
        await new Promise(r => setTimeout(r, 500));
    }
    
    return results;
}

async function run() {
    const file = "./server.ts";
    let content = fs.readFileSync(file, 'utf8');
    
    const regex = /(isEn)\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

    const matches = [...content.matchAll(regex)];
    
    let allMatches = [];
    if (matches.length > 0) {
        for (const m of matches) {
            const engQuote = m[2];
            let engStr = engQuote.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
            
            allMatches.push({
                fullMatch: m[0],
                condition: m[1],
                engQuote: m[2],
                srQuote: m[3],
                engStr: engStr
            });
        }
    }
    
    console.log(`Found ${allMatches.length} strings to translate.`);
    
    const uniqueStrings = [...new Set(allMatches.map(m => m.engStr))];
    const translatedUnique = await translateStringsFast(uniqueStrings);
    
    const transMap = {};
    for (let i=0; i<uniqueStrings.length; i++) {
        transMap[uniqueStrings[i]] = translatedUnique[i] || uniqueStrings[i];
    }
    
    let fileChanged = false;
    for (const m of allMatches) {
        const condition = m.condition;
        const engQuote = m.engQuote;
        const srQuote = m.srQuote;
        
        let engStr = engQuote.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
        let trStr = transMap[engStr] || engStr;
        
        let trQuote;
        if (engQuote[0] === '`') {
            trQuote = '`' + trStr.replace(/`/g, '\\`') + '`';
        } else if (engQuote[0] === "'") {
            trQuote = "'" + trStr.replace(/'/g, "\\'") + "'";
        } else {
            trQuote = JSON.stringify(trStr);
        }
        
        const replacement = `${condition} ? ${engQuote} : language === "tr" ? ${trQuote} : ${srQuote}`;
        content = content.replace(m.fullMatch, replacement);
        fileChanged = true;
    }
    
    if (fileChanged) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}

run().catch(console.error);
