const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.test.ts', 'utf-8');
code = code.replace(/test\("Parcijalni izbor override konflikta - invalid", \(\) => {/, "function runParcijalniTest() {");
code = code.replace(/}\);\n$/, "}\nrunParcijalniTest();\n");
fs.writeFileSync('src/app-a/screens/planReview.test.ts', code);
