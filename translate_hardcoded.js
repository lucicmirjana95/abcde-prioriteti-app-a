import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function translateStrings(texts) {
    if (texts.length === 0) return [];
    
    console.log(`Translating ${texts.length} strings to Turkish...`);
    
    const chunkSize = 30;
    const results = [];
    
    for (let i = 0; i < texts.length; i += chunkSize) {
        console.log(`Translating chunk ${i} to ${i + chunkSize}...`);
        const chunk = texts.slice(i, i + chunkSize);
        
        const prompt = `You are a translator. Translate the following Javascript string literals from English to Turkish. Keep the exact same quote type (single, double, or backticks). Preserve any JS template syntax like \${var} EXACTLY. Return a valid JSON array of strings in the exact same order.\n\n` + JSON.stringify(chunk, null, 2);
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            let text = response.text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const translatedChunk = JSON.parse(text);
            if (translatedChunk.length !== chunk.length) {
                console.error("Mismatch in chunk length!", chunk.length, translatedChunk.length);
            }
            results.push(...translatedChunk);
        } catch (e) {
            console.error("Translation error", e);
            results.push(...chunk.map(x => x));
        }
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
    
    const regex1 = /(isEn)\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
    const regex2 = /(language\s*===\s*['"]en['"])\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

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
                    srQuote: m[3]
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
            const srQuote = m[3];
            
            const trQuote = transMap[engQuote] || engQuote;
            
            // Reconstruct the logic: isEn ? Eng : language === 'tr' ? Tr : Sr
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
