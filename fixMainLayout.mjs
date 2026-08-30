import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The line is: <main className={`flex-1 overflow-y-auto max-w-[1200px] w-full mx-auto p-4 sm:p-8 pb-24 md:pb-12 space-y-8 transition-all duration-300`}>
const originalMain = /<main className=\{`flex-1 overflow-y-auto max-w-\[1200px\] w-full mx-auto[^`]*`\}>/;

const dynamicMain = `<main className={\`flex-1 overflow-y-auto w-full mx-auto \${activeTab === 'settings' ? 'max-w-3xl p-0 md:p-4' : 'max-w-[1200px] p-4 sm:p-8 space-y-8'} pb-24 md:pb-12 transition-all duration-300\`}>`;

content = content.replace(originalMain, dynamicMain);

fs.writeFileSync('./src/App.tsx', content, 'utf8');
