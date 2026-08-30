import fs from 'fs';
import path from 'path';

async function translateText(text) {
    if (!text) return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const json = await res.json();
        // Google translate returns an array of translated segments in json[0]
        const translatedText = json[0].map(segment => segment[0]).join('');
        return translatedText;
    } catch (e) {
        console.error("Translation error for text:", text, e);
        return text;
    }
}

async function translateStrings(texts) {
    console.log(`Translating ${texts.length} strings to Turkish using Google Translate API...`);
    const results = [];
    
    // Process in batches of 10 to be polite
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const promises = batch.map(t => translateText(t));
        const translatedBatch = await Promise.all(promises);
        results.push(...translatedBatch);
        if (i % 100 === 0) console.log(`Processed ${i} strings...`);
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
                let engStr = engQuote.slice(1, -1);
                
                // unescape quotes
                engStr = engStr.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
                
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
    const translatedUnique = await translateStrings(uniqueStrings);
    
    const transMap = {};
    for (let i=0; i<uniqueStrings.length; i++) {
        transMap[uniqueStrings[i]] = translatedUnique[i];
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
            
            const quoteChar = engQuote[0];
            let engStr = engQuote.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
            let trStr = transMap[engStr] || engStr;
            
            let trQuote;
            if (trStr.includes('\n')) {
                trQuote = '`' + trStr.replace(/`/g, '\\`') + '`';
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
