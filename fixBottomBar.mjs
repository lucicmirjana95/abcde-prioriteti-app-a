import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\] font-bold tracking-wide/g, 'text-[10px] font-medium tracking-normal text-inherit');
content = content.replace(/<LayoutGrid className="w-6 h-6 mb-1" \/>/g, '<LayoutGrid className="w-[22px] h-[22px] mb-0.5" strokeWidth={activeTab === \'home\' ? 2.5 : 2} />');
content = content.replace(/<CheckSquare className="w-6 h-6 mb-1" \/>/g, '<CheckSquare className="w-[22px] h-[22px] mb-0.5" strokeWidth={[\'braindump_inbox\', \'board\'].includes(activeTab) ? 2.5 : 2} />');
content = content.replace(/<Globe className="w-6 h-6 mb-1" \/>/g, '<Globe className="w-[22px] h-[22px] mb-0.5" strokeWidth={activeTab === \'wheel\' ? 2.5 : 2} />');

// also simplify the logic for text color. We will set text-inherit, and handle the color in the container
content = content.replace(/<span className={`text-\[10px\] font-medium tracking-normal text-inherit \${activeTab === 'home' \? 'font-semibold' : ''}`}>\s*\{language === 'en' \? 'Hub' : 'Home'\}\s*<\/span>/g, '<span className="text-[10px] font-medium tracking-normal text-inherit">{language === \'en\' ? \'Hub\' : \'Home\'}</span>');

fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Updated tab bar font size.");
