import fs from 'fs';

let content = fs.readFileSync('src/components/MindsetCoach.tsx', 'utf8');

const targetStr = `      content:
        language === "sr"
          ? "Dobrodošli u tihu dvoranu. Tu sam da vam pomognem da harmonizujete svoje misli, podignete nivo svesti i oslobodite kreativnu snagu kroz Protocol principe. Koji kognitivni izazov ili sumnju želite da istražimo danas?"
          : "Welcome to your inner realignment chamber. I am here to help you harmonize your patterns, elevate your awareness, and unlock your inner power using Protocol's principles. What challenge or doubt would you like to explore today?",`;

const replaceStr = `      content:
        language === "sr"
          ? "Dobrodošli u tihu dvoranu. Tu sam da vam pomognem da harmonizujete svoje misli, podignete nivo svesti i oslobodite kreativnu snagu kroz Protocol principe. Koji kognitivni izazov ili sumnju želite da istražimo danas?"
          : language === "tr"
          ? "İçsel yeniden hizalama odanıza hoş geldiniz. Protokol ilkelerini kullanarak kalıplarınızı uyumlaştırmanıza, farkındalığınızı artırmanıza ve içsel gücünüzü ortaya çıkarmanıza yardımcı olmak için buradayım. Bugün hangi zorluğu veya şüpheyi keşfetmek istersiniz?"
          : "Welcome to your inner realignment chamber. I am here to help you harmonize your patterns, elevate your awareness, and unlock your inner power using Protocol's principles. What challenge or doubt would you like to explore today?",`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/components/MindsetCoach.tsx', content);
