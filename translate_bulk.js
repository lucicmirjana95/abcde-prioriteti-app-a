import fs from 'fs';
import path from 'path';

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
        // Join with a unique delimiter that translate won't mess up too much
        // using " ||| "
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
            
            // split back
            const split = translatedText.split(/\s*\|\|\|\s*/);
            
            if (split.length === chunk.length) {
                results.push(...split);
            } else {
                console.error(`Mismatch length in chunk ${i}. Expected ${chunk.length}, got ${split.length}`);
                // fallback for this chunk
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

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

async function run() {
    const files = walk("./src");
    let allMatches = [];
    
    const regex1 = /(isEn)\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*language\s*===\s*['"]tr['"]\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
    const regex2 = /(language\s*===\s*['"]en['"])\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*language\s*===\s*['"]tr['"]\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

    const fileMatches = {};

    for (const file of files) {
        if (file.includes("translations.ts")) continue;
        
        let content = fs.readFileSync(file, 'utf8');
        
        const matches1 = [...content.matchAll(regex1)];
        const matches2 = [...content.matchAll(regex2)];
        
        const fileMatchList = [...matches1, ...matches2];
        if (fileMatchList.length > 0) {
            fileMatches[file] = fileMatchList;
            for (const m of fileMatchList) {
                const engQuote = m[2];
                let engStr = engQuote.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
                
                allMatches.push({
                    file,
                    fullMatch: m[0],
                    condition: m[1],
                    engQuote: m[2],
                    srQuote: m[4],
                    engStr: engStr
                });
            }
        }
    }
    
    console.log(`Found ${allMatches.length} strings to translate.`);
    
    const uniqueStrings = [...new Set(allMatches.map(m => m.engStr))];
    const translatedUnique = await translateStringsFast(uniqueStrings);
    
    const transMap = {};
    for (let i=0; i<uniqueStrings.length; i++) {
        transMap[uniqueStrings[i]] = translatedUnique[i] || uniqueStrings[i];
    }
    
    let modifiedFiles = 0;
    for (const file of Object.keys(fileMatches)) {
        let content = fs.readFileSync(file, 'utf8');
        let fileChanged = false;
        
        const matches = fileMatches[file];
        for (const m of matches) {
            const condition = m[1];
            const engQuote = m[2];
            const srQuote = m[4];
            
            let engStr = engQuote.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
            let trStr = transMap[engStr] || engStr;
            
            // Re-escape depending on quote type
            let trQuote;
            if (engQuote[0] === '`') {
                trQuote = '`' + trStr.replace(/`/g, '\\`') + '`';
            } else if (engQuote[0] === "'") {
                trQuote = "'" + trStr.replace(/'/g, "\\'") + "'";
            } else {
                trQuote = JSON.stringify(trStr);
            }
            
            const replacement = `${condition} ? ${engQuote} : language === "tr" ? ${trQuote} : ${srQuote}`;
            content = content.replace(m[0], replacement);
            fileChanged = true;
        }
        
        if (fileChanged) {
            fs.writeFileSync(file, content, 'utf8');
            modifiedFiles++;
            console.log(`Updated ${file}`);
        }
    }
    
    console.log(`Finished. Updated ${modifiedFiles} files.`);
}

run().catch(console.error);
