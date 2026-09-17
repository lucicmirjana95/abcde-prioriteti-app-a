# AI Logika i Arhitektura Modula: Brain Dump vs. Vizija

Ovaj dokument detaljno objašnjava AI logiku, prompt inženjering, klasifikaciju i međusobnu komunikaciju modula u aplikaciji **Daily Reset (Studio / App A)**.

---

## 1. Pregled i Međusobna Komunikacija Modula

Aplikacija se sastoji od 5 ključnih modula koji međusobno sarađuju bez konflikata i bez dupliranja podataka:

```
                      ┌──────────────────────┐
                      │      BRAIN DUMP      │
                      │  (Prirodni unos/AI)  │
                      └──────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       ┌───────────────────┐           ┌───────────────────┐
       │     DANAŠNJI      │           │      INBOKS       │
       │       PLAN        │◄─────────►│ (Sačuvano/Kasnije)│
       │   (Today Flow)    │           │                   │
       └─────────┬─────────┘           └─────────┬─────────┘
                 │                               │
                 │   ┌───────────────────────┐   │
                 └──►│        VIZIJA         │◄──┘
                     │ (Dugoročne strategije)│
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │       PROGRESS        │
                     │  (Istorijat i uvid)   │
                     └───────────────────────┘
```

### Tokovi podataka između modula:
1. **Brain Dump ➔ Današnji plan (Today Flow)**:
   - Korisnik unosi sirove misli, obaveze i beleške na prirodnom jeziku (kucanjem ili glasom).
   - AI analizira unos, procenjuje trajanje, energiju i hitnost, te predlaže raspored u tri bloka:
     - **Prvi fokus** (1 ključni prioritet sa koga se počinje dan)
     - **Kasnije danas** (realno izvodljivi zadaci u okviru raspoloživog vremena)
     - **Ako ostane kapaciteta** (opcioni zadaci koji ne stvaraju pritisak)
   - Pre definitivnog potvrđivanja plana, korisnik prolazi kroz **Plan Review** gde može slobodno menjati redosled, uređivati, prebacivati u Inboks ili **trajno izbrisati zadatke**.

2. **Today Plan ◄► Inboks**:
   - Stavke koje ne pripadaju današnjem danu AI automatski odvaja u Inboks (`deferred_this_week`, `deferred_later`, `non_action_note`).
   - Korisnik iz Inboksa jednim klikom može dodati stavku u današnji plan (`Dodaj u Danas`).
   - Iz plana (ili sa Today ekrana) zadatak se može vratiti u Inboks ili odložiti za sutra.
   - Nezavršeni zadaci od prethodnog dana (Rollover) nude korisniku jasan izbor: prebaci u Inboks, odloži, ili uključi u današnji plan uz reevaluaciju kapaciteta.

3. **Inboks / Brain Dump ◄► Vizija**:
   - Kada AI u Brain Dump-u prepozna da je uneta stavka zapravo dugoročna aspiracija, a ne dnevni zadatak (npr. *"Želim da promenim karijeru"* ili *"Nauči španski do leta"*), on **ne kreira zadatak**, već prikazuje predlog za Viziju (`VisionSuggestionCard`).
   - Korisnik ima punu kontrolu: može prihvatiti predlog, povezati sa postojećom vizijom ili odbaciti.
   - U Inboksu, svaka stavka ima akciju **"Razradi kao viziju"** koja prebacuje naslov u Vision Strategy Builder.
   - Iz same Vizije, prvi sledeći konkretan korak (`nextStep`) se jednim klikom može prebaciti direktno u današnji plan (`Dodaj u Danas`), uz zaštitu od dupliranja (`sourceItemIds`).

4. **Rutine ◄► Današnji plan ◄► Progress**:
   - Jutarnje i večernje rutine automatski prate status izvršenja.
   - Modul za progres agregira završene fokus zadatke, rutine i ostvarene minute, dajući čist i činjenični rezime ("Šta se promenilo") bez lažnih statistika.

---

## 2. AI Logika za Brain Dump (Dnevni Reset)

### Glavni cilj:
Smanjiti mentalno opterećenje korisnika i prevesti haotične misli u miran, dostižan i realan dnevni plan, **bez preopterećenja i bez lažnog pritiska produktivnosti**.

### Ključni principi i pravila:
1. **Zabrana "Buzzword" i pseudo-naučnih klišea**:
   - AI u promptovima ima strogu zabranu korišćenja termina kao što su *"Pareto"*, *"ABCDE metoda"*, *"80/20 pravilo"*, *"Pojedi tu žabu"*, *"Supercharge"*, *"Maksimalna produktivnost"*.
   - Ton je smiren, podržavajući, jasan i fokusiran na dobrobit i realan kapacitet.
2. **Konzervativna granica kapaciteta (Capacity Bounding)**:
   - AI nikada ne planira više od raspoloživog radnog vremena korisnika (npr. ako korisnik ima 240 minuta slobodno, plan ne sme sadržati 400 minuta obaveza).
   - Ako je lista unosa predugačka, AI automatski stavlja višak u `if_capacity_remains` ili predlaže odlaganje u Inboks (`deferredItems`).
3. **Inteligentna klasifikacija zadataka**:
   - **Akcioni zadatak (Task)**: Jasna radnja sa vidljivim završetkom. Dodeljuje mu se procena vremena (15–60 min) i nivo energije (1–5).
   - **Beleška / Informacija (Note)**: Misao bez direktne akcije. Odvaja se kao beleška kako se ne bi izmišljale veštačke obaveze.
   - **Dugoročni cilj (Vision candidate)**: Prepoznaje se aspiracija i nudi se prelazak u modul Vizije.
4. **Interaktivna pojašnjenja (Clarification Rounds)**:
   - Ako je unos nejasan ili nedostaje ključni kontekst, sistem pokreće najviše 2–3 kratka pitanja po rundi (maksimalno 3 runde).
   - Sistem vodi evidenciju odgovora i na kraju prikazuje rezime: *"Šta sam razumeo"*.
   - Korisnik uvek ima dugme **"Preskoči na plan"** kako ne bi bio zarobljen u dijalogu.
5. **Human-in-the-loop (Nema skrivenog upisa)**:
   - AI generiše samo **nacrt (draft)**. Ništa se ne upisuje u bazu dok korisnik na ekranu za pregled ne klikne **"Potvrdi plan"**.

---

## 3. AI Logika za Viziju (Vision Strategy)

### Glavni cilj:
Prevesti veliku, apstraktnu životnu ili poslovnu viziju u **izvodljivu mapu puta sa jasnim prvim korakom**, uz sprečavanje nerealnih očekivanja i sagorevanja.

### Arhitektura sa 5 specijalizovanih AI režima:

#### 1. Filter izvodljivosti (`mode: "feasibility"`)
- **Čuvar realizma**: Pre nego što se strategija generiše, AI proverava da li je cilj realan u odnosu na navedeni vremenski okvir.
- Razlikuje **ambiciozan cilj** od **nerealnog cilja** (npr. postati kardiohirurg za 3 meseca).
- **Bezbednosni filter (Safety sensitive)**: Ako se u unosu prepoznaju rizične medicinske radnje, samopovređivanje ili pravno opasne radnje, sistem neutralno objašnjava zašto strategija nije napravljena i upućuje na stručnjake.
- Ako je cilj ostvariv uz prilagođavanje, AI nudi `adjustedGoal` i `adjustedTimeframe` koje korisnik može prihvatiti.

#### 2. Generisanje kompletne strategije (`mode: "strategy"`)
Razlaže viziju na strukturu:
- **Ishod (`outcome` / Zamisli)**: Živopisan, jasan opis stanja kada je vizija ostvarena.
- **Značaj (`importance` / Zašto)**: Duboka motivacija i suština zašto je ovo važno korisniku.
- **Horizonti (`milestones`)**: 3–5 faza na putu ka cilju.
- **Sledeći konkretan korak (`nextStep`)**: Jedna neposredna, vidljiva radnja koju korisnik može uraditi odmah (15–45 min).
- **Prepreke i ublažavanja (`obstacles`)**: Realne prepreke koje se mogu javiti i plan kako ih prevazići.

#### 3. Dekompozicija koraka (`mode: "decompose"`)
- Konzervativni mehanizam dekompozicije.
- Ako je korak već konkretan i jasan, AI postavlja `shouldDecompose: false`.
- Ako je korak preširok (npr. *"Napravi sajt"*), razlaže ga na 2–4 logična potkoraka bez administrativnog viška (bez koraka poput *"otvori laptop"*, *"razmisli malo"* ili *"proslavi"*).

#### 4. Fino podešavanje koraka (`mode: "refine_step"`)
- Specijalizovani modalitet koji pomaže korisniku kada se zaglavi na nekom koraku.
- Generiše:
  - `smallerFirstMove`: Mikro-akcija od 10–20 minuta koja uklanja trenje i omogućava početak bez stresa.
  - `neededResources`: Spisak potrebnih informacija ili alata.
  - `alignmentReason`: Zašto je baš ovaj korak ključan za celu viziju.

#### 5. Dijalog razrade sa istorijatom (`visionElaborationController`)
- Omogućava do 3 runde pitanja i odgovora gde AI precizira kontekst vizije.
- Svi odgovori se čuvaju u `qaHistory` i ulaze u finalni kontekst.
- Korisnik može u svakom trenutku prekinuti dijalog i zatražiti sažetak.

---

## 4. Očuvanje stabilnosti i integriteta podataka

| Funkcionalnost | Garantovani mehanizam |
|---|---|
| **Brisanje zadataka** | Omogućeno i u toku planiranja (`DailyPlanReview`) i u toku izvršavanja (`TodayExecutionScreen`), kao i u Inboksu. |
| **Prevencija duplog unosa** | Idempotentni ključevi i `provenanceItemIds` sprečavaju višestruki upis iste vizije ili istog zadatka. |
| **Lokalni fallback (Guest/Demo mod)** | Ako korisnik nije ulogovan ili Firebase odbije dozvolu, celokupna perzistencija nesmetano radi preko `localStorage`. |
| **Pristupačnost (A11y)** | Svi interaktivni elementi imaju minimalnu površinu dodira od 44x44px (`min-h-[44px]`), jasne ARIA atribute i podršku za tastaturu. |
| **Konzistentnost vizuelnog stila** | Uklonjene sve generičke AI zvezdice (`Sparkles`). Koriste se autentične akvarel ilustracije i medaljoni brenda (`growth-path-medallion`, `/app-a/illustrations/`). |
