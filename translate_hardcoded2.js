import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function translateStrings(texts) {
    if (texts.length === 0) return [];
    
    console.log(`Translating ${texts.length} strings to Turkish...`);
    
    const chunkSize = 200;
    const results = [];
    
    for (let i = 0; i < texts.length; i += chunkSize) {
        console.log(`Translating chunk ${i} to ${i + chunkSize}...`);
        const chunk = texts.slice(i, i + chunkSize);
        
        const prompt = `You are a translator. Translate the following Javascript string literals from English to Turkish. Keep the exact same quote type (single, double, or backticks). Preserve any JS template syntax like \${var} EXACTLY. Return a valid JSON array of strings in the exact same order.\n\n` + JSON.stringify(chunk, null, 2);
        
        let retries = 5;
        let success = false;
        
        while (retries > 0 && !success) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: prompt,
                });
                let text = response.text;
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const translatedChunk = JSON.parse(text);
                if (translatedChunk.length !== chunk.length) {
                    console.error("Mismatch in chunk length!", chunk.length, translatedChunk.length);
                }
                results.push(...translatedChunk);
                success = true;
            } catch (e) {
                console.error(`Translation error (retries left: ${retries - 1})`, e.message);
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, (6 - retries) * 3000));
                } else {
                    results.push(...chunk.map(x => x));
                }
            }
        }
        
        // Sleep to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    
    // We are matching the failed state: isEn ? "ENG" : language === "tr" ? "ENG" : "SRB"
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
                allMatches.push({
                    file,
                    fullMatch: m[0],
                    condition: m[1],
                    engQuote: m[2],
                    trQuoteFailed: m[3],
                    srQuote: m[4]
                });
            }
        }
    }
    
    console.log(`Found ${allMatches.length} strings to translate.`);
    
    const uniqueStrings = [...new Set(allMatches.map(m => m.engQuote))];
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
            
            const trQuote = transMap[engQuote] || engQuote;
            
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
