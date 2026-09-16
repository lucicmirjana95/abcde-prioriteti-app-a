# App A — Antigravity UI implementation handoff

## 0. Cilj i status odobrenja

Implementirati kompletan prezentacioni sloj App A prema odobrenim bitmap mockupima, bez menjanja poslovne logike. Vizuelni smer je odobren. Ime proizvoda još nije odabrano i u interfejsu mora ostati **App A**. Naziv **Takt** nije odobren i ne sme se koristiti.

Ovo nije novi prototip i nije dozvoljeno praviti paralelne demo ekrane. Novi dizajn mora biti povezan sa postojećim produkcionim React komponentama i njihovim stvarnim podacima, handlerima i stanjima.

## 1. Projekat koji treba menjati

Radna kopija projekta:

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export`

Pre izmena proveriti da ovaj direktorijum sadrži `package.json`, `src/app-a/`, `server/` i postojeći App A test runner. Ne menjati drugi projekat, originalnu aplikaciju ili nepovezane App B/App C module.

## 2. Apsolutne putanje vizuelnih izvora

### 2.1. Primarni, odobreni mockup Daily Reset ekrana

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/app-a-daily-reset-approved.png`

Ovo je glavni izvor istine za:

- odnos ilustracije i sadržaja;
- tipografsku hijerarhiju;
- toplu svetlu temu;
- translucent kartice;
- izgled brain-dump polja, mikrofona, brojača, skala i CTA dugmeta;
- mobilnu donju navigaciju.

Konceptualna slika prikazuje `0/500`, ali produkciona aplikacija mora zadržati postojeći limit i prikaz **`0/10000`**.

### 2.2. Odobreni glavni tok: Clarification, AI Loading, Plan Review, Today

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/app-a-core-flow-approved.png`

Izvor istine za četiri povezana stanja. Napomena: Plan Review na slici koristi sažete redove radi prezentacije. U stvarnoj aplikaciji blokovi moraju prikazivati svoj postojeći puni sadržaj u jednoj vertikalnoj stranici, bez tabova i bez obaveznog otvaranja reda.

### 2.3. Odobreni pomoćni ekrani: Inbox, Vision, Progress, Settings

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/app-a-supporting-screens-approved.png`

Izvor istine za izgled četiri modula, ali ne daje dozvolu za izmišljanje novih podataka ili funkcija. Prikazati samo podatke koje postojeći domen zaista isporučuje.

### 2.4. Odobrena večernja tema

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/app-a-evening-theme-approved.png`

Izvor istine za boje, kontrast i tretman ilustracije u ručno izabranoj tamnoj/večernjoj temi. Tema ne sme zavisiti od jezika.

### 2.5. Originalna akvarelna ilustracija bez UI-ja

Puna rezolucija:

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/takt-mobile-hero-reference.png`

Manja referentna kopija:

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/takt-mobile-hero-reference-small.png`

Postojeći akvarelni asset:

`/Users/mirjanalucic/Documents/Codex/2026-09-08/da-ostale-su-jo-tri-smislene/work/studio-export/public/app-a/growth-path-watercolor.png`

Originalni izvor iz Downloads, samo za poređenje:

`/Users/mirjanalucic/Downloads/takt-mobile-hero-original-style-1290x2796.png`

### 2.6. Originalni odobreni „Predah” stilski primer

`/var/folders/zm/vhrsy5d13xq0pd_hs7hgzf6m0000gn/T/codex-clipboard-e7b3bb03-9252-4c0f-9e4f-3438733f7766.png`

Privremena putanja može nestati. Zato je koristiti samo ako postoji. Četiri `app-a-*-approved.png` fajla u projektu imaju prednost i trajni su izvori.

## 3. Hijerarhija izvora istine

Ako se izvori razlikuju, koristiti ovaj redosled:

1. stvarna postojeća poslovna logika, ugovori i korisnička stanja;
2. ovaj handoff dokument;
3. četiri `app-a-*-approved.png` mockupa;
4. originalna akvarelna ilustracija;
5. postojeći UI, samo za funkcije/stanja koja mockup ne prikazuje.

Nikada ne žrtvovati funkciju da bi statična slika bila identična. Vizuelno prilagoditi stvarnu funkciju istom dizajnerskom sistemu.

## 4. Strogo zabranjene izmene

Ne menjati:

- AI sistemske ili korisničke promptove;
- API request/response ugovore i parsere;
- ABCDE i 80/20 semantiku;
- logiku First Focus, Later Today i If Capacity Remains;
- Firestore kolekcije, dokumente, identitete i indekse;
- persistence repozitorijume;
- `resetGuard` i Data Reset semantiku;
- rollover status, root identity, transakcije i deduplikaciju;
- routine/micro-habit frekvencije, completion i daily-load logiku;
- Vision–Today identitete, deduplikaciju ili revision zaštitu;
- dismiss/skip/mute semantiku Today Vision predloga;
- postojeće event handlere i callbacks;
- testove da bi se sakrio regresioni problem;
- Firebase konfiguraciju, GitHub povezivanje ili deployment;
- App B i App C;
- ime proizvoda.

Ne dodavati ljubimca, zen-baštu, XP, bedževe, kompetitivne streakove, konfete ili druge gamification funkcije u ovoj fazi.

## 5. Vizuelni identitet

### 5.1. Narativ ilustracije

Obavezni redosled vizuelnog motiva:

1. rasuti, organski apstraktni oblici;
2. tanka povezujuća putanja;
3. plavi kružni pejzaž/talas;
4. narandžasti krug sa biljkom;
5. lavanda krug sa balansiranim kamenjem;
6. miran horizont, voda, planine i izlazak sunca.

Biljka i kamenje su eksplicitno odobreni. Ne uklanjati ih, ne menjati generičkim tačkama i ne svoditi celu kompoziciju na tri male ikonice u gornjem desnom uglu.

Ilustracija treba da govori „od rasutih misli do jasnog pravca”. Ona nije logo, progress chart niti meditaciona funkcija.

### 5.2. Upotreba ilustracije

- Daily Reset: prepoznatljiva dijagonalna kompozicija u gornjoj trećini, dovoljno velika da nosi identitet, ali bez prekrivanja naslova i forme.
- Clarification: skraćena putanja koja vodi od rasutih oblika ka jednom jasnom pitanju.
- AI Loading: najveća i najpotpunija upotreba ilustracije; dozvoljena je samo mirna, spora animacija transformacije/lebdenja.
- Plan Review: mali kontekstualni medaljoni/fragmenti uz sekcije, plus diskretan horizont u zaglavlju.
- Today: horizont u zaglavlju i jedan odobreni medaljon u First Focus kartici.
- Inbox: rasuti oblici koji se vizuelno približavaju posudi/inbox metafori; bez nove poslovne funkcije.
- Vision: biljka, kamenje i putanja ka horizontu.
- Progress: putanja kao nenametljiv prikaz stvarnog napretka; ne koristiti je kao lažni procenat.
- Settings: samo diskretan horizont; najmanje ilustracije.
- Empty/success states: koristiti odgovarajući fragment, bez ponavljanja pune slike u svakoj kartici.

### 5.3. Asset strategija

Ne crtati ilustraciju ponovo kao grubi programski SVG ako time nestaje akvarelna tekstura. Preferirati optimizovane WebP/PNG assete izvedene iz odobrenog izvora.

Napraviti, ako je potrebno:

- mobile-light hero;
- desktop-light hero;
- mobile-evening hero;
- desktop-evening hero;
- transparentne ili pažljivo isečene fragmente: scattered, landscape, plant, stones, horizon.

Svaki asset mora biti optimizovan, bez velikog layout shift-a, sa eksplicitnim `width`/`height` ili `aspect-ratio`. Ne rastezati ga tako da izgubi proporcije. Dekorativne slike imaju prazan `alt`; ilustracija koja prenosi stanje dobija kratak lokalizovan opis.

## 6. Design tokeni

### Svetla tema

- canvas: `#F7F4EE`
- primarna surface: približno `#FFFDF9`, po potrebi sa blagom translucent obradom
- glavni tekst: `#172941`
- sekundarni tekst: `#647084`
- dusty-blue akcenat: `#527FA4`
- apricot wash: približno `#F8E4D1`
- dusty-blue wash: približno `#E5EFF5`
- sage wash: približno `#E7EEE3`
- lavender wash: približno `#EEEAF2`

### Večernja tema

- canvas: `#101B2D`
- surface: `#192C45`
- glavni tekst: `#FBF7EF`
- sekundarni tekst: `#B5C0D0`
- akcenat: `#82B7E3`
- wash površine: zatamnjene, desaturisane izvedenice istih semantičkih boja
- nikada `#000000` kao glavni canvas
- bez neonskog sjaja i sci-fi dashboard estetike

### Pravilo teme

Poštovati postojeću eksplicitnu korisničku postavku. Jezik i tema su nezavisni. Engleski jezik ne znači tamnu temu. Ako postojeća aplikacija već ima `light/dark/system`, ne menjati ugovor; samo sprečiti neplanirano povezivanje jezika i teme.

### Geometrija

- kartice: 24–28 px radius, u skladu sa mockupom;
- manja polja i dugmad: 14–20 px radius;
- border: tanak, hladan i niskog kontrasta;
- senka: vrlo difuzna i diskretna;
- touch target: najmanje 44 × 44 px;
- editable input font najmanje 16 px na mobilnom;
- bez horizontalnog skrola na 320–430 px.

## 7. Tipografija i hijerarhija

Koristiti sistemsku Apple/SF Pro kompatibilnu familiju. Ne uvoditi eksterni font ako nije već deo projekta.

- eyebrow: uppercase, širok tracking, dusty blue;
- H1: snažan deep navy, kompaktan leading, bez prelamanja slovo po slovo;
- H2/H3: jasni, semibold;
- body: miran, dovoljno visok leading;
- secondary/meta: plavo-siv, ali WCAG čitljiv;
- maksimalno dva reda za kompaktne naslove kada je to domenski predviđeno;
- koristiti `overflow-wrap`/`break-word`, nikada lomljenje svake pojedinačne grafeme.

## 8. Ekrani — detaljna implementacija

### Faza 1 — zajednički temelj

Prvo uraditi samo:

1. centralne CSS tokene;
2. reusable App A card/surface primitive ili postojeće klase;
3. `GrowthPathArt`/`FlowHeader` vizuelni sistem;
4. mobile/desktop shell i safe-area pravila;
5. zajedničke button/input/focus stilove.

Ne menjati još sve ekrane odjednom. Posle faze pokrenuti typecheck i prikazati Daily Reset na 390 px.

### Faza 2 — Daily Reset unos

Postojeći produkcioni ekran mora zadržati realni state i submit tok.

Hijerarhija:

- eyebrow: `DNEVNI PLAN` / `DAILY PLAN` / odgovarajući tr prevod;
- naslov: `Novi dnevni plan`;
- helper: kratko objašnjenje realnog plana;
- originalna putanja rasta u gornjoj zoni;
- kartica sa labelom `Izbaci sve iz glave.`;
- pravi multiline textarea;
- postojeći brojač `0/10000`;
- VoiceInput dugme unutar donjeg desnog ugla textarea omotača;
- Energija 1–5;
- Prijatnost/Raspoloženje 1–5 u skladu sa postojećim domenom i prevodima;
- opciona realna tekstualna napomena o stanju;
- primarno dugme `Napravi predlog plana`;
- nema inputa za dostupno vreme.

Skale moraju ostati stvarni radio/segmented controls, ne ukrasne kružnice bez semantike. Keyboard i screen-reader labeli moraju ostati.

### Faza 3 — Clarification i AI Loading

Clarification:

- jedno ili postojeći broj pitanja prema stvarnom toku, bez izmišljanja;
- eyebrow `Još jedno pitanje`;
- multiline odgovor;
- mikrofon unutar polja;
- akcije `Ne znam`, `Vrati se na unos`, `Nastavi`;
- `Ne znam` ne sme izmišljati sadržajan odgovor ako postojeća logika koristi posebnu vrednost.

AI Loading:

- nema lažnog procenta;
- nema tvrdnje da je korak završen pre odgovora servera;
- puna akvarelna putanja kao centralni vizuelni trenutak;
- animacija samo transform/opacity na dekorativnim slojevima, spora i smirujuća;
- obavezno `prefers-reduced-motion` stanje bez animacije;
- postojeći error/retry/cancel tokovi ostaju dostupni.

### Faza 4 — Plan Review

Prikazati sve sekcije vertikalno, bez tabova:

1. `Zašto ovako` — lavender wash;
2. `Prvi fokus` — apricot wash, vizuelno najvažniji;
3. `Kasnije danas` — dusty-blue wash;
4. `Ako ostane kapaciteta` — sage wash;
5. postojeće deferred/outside-plan sekcije, ako ih stvarni draft ima.

Svaki postojeći row mora zadržati:

- status;
- duration;
- ABCDE/80-20 objašnjenje ako ga produkcija prikazuje;
- edit;
- manual reorder;
- move-to-block;
- D/E potvrde;
- AI reevaluation diff;
- manual override conflicts;
- fixed/waiting-for ograničenja.

Sticky potvrda plana ne sme prekrivati poslednji red. Akcije `Vrati se na unos` i `Potvrdi plan` moraju biti dostupne na 320 px.

### Faza 5 — Today Execution

Redosled:

1. zaglavlje sa diskretnim horizontom;
2. First Focus kartica;
3. sledeći zadaci/planski blokovi;
4. rutine/micro-habits;
5. opcione intervencije;
6. Actions from Vision;
7. quick add i ostale postojeće kontrole.

Ne menjati funkcije:

- complete/uncomplete;
- focus timer;
- predah;
- reevaluation;
- manual priority;
- intervention dismiss;
- Vision candidate: zatvori sekciju, preskoči samo kandidat, pokaži sledeći eksplicitno, mute viziju za danas;
- routines completion.

Opcione intervencije moraju imati postojeći `×`/`Ne sada` dismissal. Donja navigacija ne sme prekrivati dugmad.

### Faza 6 — Inbox

Primeni vizuelni sistem na:

- listu stvarnih inbox stavki;
- add flow;
- clarification;
- due/scheduled/this-week filtere koji već postoje;
- empty/error/loading stanja.

Ne pretvarati svaku stavku u ogromnu karticu. Koristiti čiste, prozračne redove. Sačuvati sve postojeće identitete i mutation tokove.

### Faza 7 — Vision

Zadržati prethodno dogovorenu strukturu:

- unos nove vizije;
- kompaktan `Trenutni fokus`;
- `Sve vizije` biblioteka;
- direktna strategija odabrane vizije bez duplog renderovanja aktivne vizije;
- `Zamisli`;
- `Sledeći konkretan korak`;
- `Razradi uz AI` i dekompozicija uz pregled/potvrdu;
- dodavanje u Today bez automatskog završavanja;
- putanja/milestones;
- rizici i pretpostavke;
- archive/delete potvrde.

Naslovi moraju imati punu širinu. Overflow kontrole ne smeju lomiti naslov. AI predlozi ne pišu u bazu pre potvrde.

### Faza 8 — Progress

Koristiti isključivo stvarne postojeće metrike i istoriju. Vizuelni cilj je „napredak bez pritiska”. Dozvoljeno:

- završeni važni koraci;
- odnos planirano/završeno ako već postoji;
- uvidi iz stvarnih podataka;
- rutine i Vision napredak ako već postoji domen.

Zabranjeno:

- izmišljeni skor;
- XP;
- kazneni streak;
- lažna nedeljna statistika;
- dekorativan grafikon bez podataka.

### Faza 9 — Settings

Uskladiti postojeće grupe:

- izgled/tema;
- jezik;
- obaveštenja;
- rutine;
- privatnost/podaci;
- informacije/podrška;
- Data Reset.

Data Reset mora ostati vizuelno odvojen destruktivni tok sa postojećim potvrdama, retry i resetGuard ponašanjem. Ne menjati njegove kolekcije ili semantiku.

### Faza 10 — večernja tema i lokalizacija

Proveriti svaki ekran u light i evening/dark stanju. Ilustracije u tamnoj temi ne smeju biti svetli pravougaonici nalepljeni na navy pozadinu; koristiti odgovarajući evening asset ili blend koji čuva akvarel.

Proveriti sr, en i tr. Ne hardkodovati srpske tekstove u JSX ako projekat koristi prevode. Dugi prevodi ne smeju lomiti layout.

## 9. Responsive kriterijumi

Obavezno proveriti:

- 320 px;
- 375/390 px;
- 430 px;
- tablet širinu;
- desktop.

Za mobilni:

- jedna kolona;
- content padding približno 16–20 px;
- nema horizontalnog skrola;
- tekst i ilustracija se ne preklapaju;
- minimum 44 px touch zona;
- textarea i forme ne ulaze ispod navigacije;
- sticky CTA je iznad donjeg tab bara i safe-area inset-a;
- poslednji sadržaj može potpuno da se skroluje iznad navigacije;
- overflow meniji ostaju unutar viewporta.

Za desktop:

- uredna bočna navigacija;
- sadržaj ne sme biti nepotrebno rastegnut;
- maksimalna čitljiva širina glavne kolone;
- ilustracija može imati širi, horizontalni kadar;
- izbegavati mobilni ekran centriran u ogromnoj praznini kao jedini desktop layout.

## 10. Pristupačnost

- semantički `button`, `input`, `textarea`, radio i switch elementi;
- fokus vidljiv tastaturom;
- screen-reader label za icon-only kontrole;
- pravilno povezani label/input parovi;
- statusi čuvanja i AI loading koriste odgovarajući `aria-live` bez preteranog ponavljanja;
- destructive akcije nisu samo crvene bez teksta;
- kontrast proveriti u obe teme;
- motion reduction poštovati;
- ne uklanjati Escape/outside-click ponašanje postojećih menija i modala.

## 11. Implementaciona disciplina

Raditi u malim fazama. Posle svake faze:

1. navesti promenjene fajlove;
2. navesti zašto je svaki promenjen;
3. pokazati `git diff --stat` i relevantan diff;
4. pokrenuti typecheck;
5. pokrenuti najbliže relevantne testove;
6. napraviti screenshot stvarnog Previewa na 390 px;
7. označiti šta je PASS, FAIL ili UNVERIFIED.

Ne prelaziti automatski na sledeću veliku fazu ako postoji vizuelni ili funkcionalni FAIL. Ne popravljati nepovezane probleme bez eksplicitnog odobrenja.

## 12. Obavezna završna verifikacija

Ne tvrditi da je projekat završen samo zato što se kompajlira.

Obavezno izvršiti stvarne komande koje postoje u projektu, najmanje:

- TypeScript/lint komandu iz `package.json`;
- App A test runner iz `package.json`;
- production build komandu iz `package.json`.

Ne navoditi broj testova iz starog izveštaja; navesti samo stvarni izlaz trenutnog pokretanja.

Vizuelno proveriti:

- svih 9 ekrana/modula;
- light i evening temu;
- sr/en/tr;
- 320/390/430 px;
- mobile bottom nav;
- sticky CTA;
- dugačke naslove;
- empty/loading/error/success stanja koja se mogu bezbedno izazvati;
- da ilustracija nije svedena na tri male ikonice;
- da nema horizontalnog skrola ili preklapanja.

Ako određeno stanje nije moguće otvoriti bez promene stvarnih podataka, označiti ga kao **UNVERIFIED**. Ne izmišljati potvrdu.

## 13. Završni izveštaj

Završni izveštaj mora sadržati:

1. punu listu promenjenih production fajlova;
2. punu listu novih/izmenjenih asseta;
3. odvojeno test fajlove, ako su legitimno dodati;
4. potvrdu da poslovni ugovori nisu menjani, potkrepljenu diff-om;
5. tačne komande i exit kodove;
6. tabelu ekran × tema × širina × jezik sa PASS/FAIL/UNVERIFIED;
7. screenshotove stvarnog UI-ja, ne samo mockupove;
8. otvorene probleme i upozorenja;
9. eksplicitnu potvrdu da ništa nije pushovano, objavljeno ili povezano sa Firebase/GitHub-om bez posebnog zahteva.

## 14. Prvi zadatak za Antigravity

Nemoj odmah implementirati sve faze. Prvo:

1. pročitaj ovaj dokument;
2. inventariši postojeće App A UI komponente i temu;
3. uradi READ-ONLY mapiranje: postojeći fajl → ciljna faza;
4. identifikuj gde se tema stvarno čuva i kako se bira jezik;
5. proveri da li postojeći ilustrativni asseti imaju transparentnu pozadinu i dovoljan kvalitet;
6. vrati plan izmene po fajlovima;
7. ne menjaj kod dok plan nije pregledan.

