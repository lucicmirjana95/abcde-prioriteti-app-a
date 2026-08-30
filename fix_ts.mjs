import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// 1. Add feedsCount
content = content.replace(
  /const \[coins, setCoins\] = useState\(120\);/,
  `const [coins, setCoins] = useState(120);\n  const [feedsCount, setFeedsCount] = useState(0);`
);

// Also increment feedsCount in handleFeed
content = content.replace(
  /const handleFeed = \(\) => \{/,
  `const handleFeed = () => {\n    setFeedsCount(prev => prev + 1);`
);

// 2. Fix empty string assignments
content = content.replace(/setBioloTab\(""\)/g, `setBioloTab("status")`);
content = content.replace(/setShopTab\(""\)/g, `setShopTab("items")`);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("TS fixes applied");
