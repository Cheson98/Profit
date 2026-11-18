# Profit

Profit is een onofficiële oefenapp voor de Q8-sporttest, voor Android en voor iPhone/iPad. Je vult één keer je geslacht, leeftijd en gewicht in. De app zet daarna de normen klaar, loopt de hele test af met automatische timers en houdt je resultaten bij.

Dit is geen app van de politie en heeft geen politielogo; het embleem is een eigen, neutraal schildje.

## Downloaden en installeren (Android)

1. Open op je Android-telefoon de pagina [Releases](../../releases/latest) van deze repository.
2. Tik onder **Assets** op `Profit.apk`.
3. Open het gedownloade bestand. Android vraagt eenmalig of je installatie uit deze bron toestaat (Chrome of Bestanden). Sta dat toe en tik op **Installeer**.
4. Zet je bij **Instellingen** een herinnering aan, dan vraagt Android om toestemming voor meldingen. Die heb je nodig voor de herinneringen.
5. Zet het mediavolume van je telefoon hoog genoeg: de signalen komen via het mediavolume.

Een nieuwe versie installeer je gewoon over de oude heen. Je gegevens blijven dan bewaard.

## Installeren op iPhone of iPad

Op een iPhone is Profit een webapp die je op je beginscherm zet. Dat kost niets en je hebt er geen account voor nodig.

1. Open in **Safari** (niet in een andere browser) [cheson98.github.io/Profit](https://cheson98.github.io/Profit/).
2. Tik op **Deel** (het vierkantje met een pijl), kies **Zet op beginscherm** en tik op **Voeg toe**.
3. Open Profit voortaan via het icoon op je beginscherm. De eerste keer is internet nodig; daarna werkt de app ook zonder.

Een nieuwe versie komt vanzelf binnen zodra je de app met internet opent. Je gegevens blijven dan bewaard.

**Wat anders is dan op Android**
- **Gegevens**: de app op je beginscherm heeft zijn eigen opslag, los van Safari. Gebruik daarom alleen het icoon. Verwijder je het icoon, dan zijn je resultaten weg. Maak dus af en toe een back-up (zie hieronder).
- **Signalen**: de pieptonen werken alleen terwijl de app open is en het scherm aan staat. Trillen kan een webapp op een iPhone niet. Zet het volume hoog; hoor je niets, zet dan de stilteschakelaar uit.
- **Scherm aan**: vanaf iOS 18.4 houdt de app het scherm zelf aan tijdens de test. Op een oudere versie zie je op het startscherm een tip: zet dan Automatisch vergrendelen tijdelijk op Nooit (Instellingen, Scherm en helderheid).
- **Herinneringen**: een webapp kan geen melding sturen als hij dicht is. Daarom heeft **Instellingen** de knop **Zet in Agenda**: die maakt een terugkerende afspraak met een melding op het ingestelde tijdstip. Op trainingsdagen toont de app bovenaan ook "Vandaag staat er een training gepland".
- **Back-up**: **Back-up maken** opent het deelmenu (bewaar het bestand in Bestanden of iCloud Drive). Lukt dat niet, gebruik dan **Kopieer als tekst** en plak de tekst in een notitie. Terugzetten kan met een bestand of met **Plak als tekst**.

## Wat de app doet

**Normen**
- Je kiest man of vrouw en vult leeftijd en gewicht in. Dat wordt onthouden en automatisch gebruikt bij elke test.
- Roeien (500 m): de normtijd is geschaald op gewicht, leeftijd en geslacht (de tabellen "Geschaalde roeinormen"). Vanaf 55 jaar geldt "zo snel mogelijk".
- Squats, push-ups, sit-ups, burpees, pull-ups en 1600 m: de Q8-doelstellingen voor heren of dames per leeftijdsklasse.

**De test, met automatische timers**
- Optioneel aftellen voor het roeien (instelbaar, ook uit). Daarna start de roeitimer vanzelf.
- Na het roeien 7 minuten rust, daarna elk onderdeel 1 minuut met 3 minuten rust ertussen.
- Na het laatste onderdeel 9 minuten rust, daarna het hardlopen.
- Alle timers lopen vanzelf door. Elke timer geeft een lange piep (en trilling) bij beginnen en drie korte pieptonen bij stoppen. Optioneel piept de app ook in de laatste 3 seconden.
- Pull-ups mogen op elk moment tussen roeien en hardlopen. Bij **Instellingen** kies je als welk onderdeel (1 tot 5) je ze doet.
- Alle tijden zijn aan te passen bij **Instellingen**.
- Tijdens de test blijft het scherm aan. Met **Pauze** zet je de klok stil, met **Klaar** rond je een onderdeel eerder af (bij roeien en hardlopen wordt je tijd vastgelegd).

**Gehaald of niet**
- Na elk onderdeel vraagt de app tijdens de rust: gehaald, ja of nee? Bij nee geef je aan hoeveel herhalingen (of meters) je wel deed.
- Heb je het niet ingevuld, dan blijft het onderdeel op "nog invullen" staan. Dat vul je achteraf in bij **Resultaten**, en je kunt het later nog aanpassen.

**Resultaten en voortgang**
- Op het startscherm zie je de resultaten van de vorige keer. Bij **Resultaten** staan alle tests.
- Bij **Voortgang** zie je per onderdeel een grafiek met hoe je resultaten groeien of dalen.

**Herinneringen**
- Op vaste dagen (bijvoorbeeld ma, wo, vr) of om de zoveel dagen (om de 2, 3 of 4 dagen, eens per week, of een eigen aantal). Je kiest ook het tijdstip.
- Op Android zijn het echte meldingen, ook als de app dicht is. Ze blijven werken na een herstart van je telefoon.
- Laat je telefoon de melding een paar minuten te laat sturen? Geef bij **Instellingen** toestemming voor een exact tijdstip.
- Op iPhone gaat dit via je Agenda (zie hierboven).

**Back-up**
- Bij **Instellingen** maak je met **Back-up maken** een bestand met al je resultaten, gegevens, tijden en herinnering. Je kiest zelf waar het komt, bijvoorbeeld in Google Drive of Downloads (iPhone: Bestanden of iCloud Drive).
- Zo kun je ook van Android naar iPhone verhuizen, of andersom.
- Met **Back-up terugzetten** kies je zo'n bestand weer. De app controleert het bestand en vraagt eerst om bevestiging. Tests die je al op de telefoon hebt blijven staan; de tests uit het bestand worden toegevoegd.

## Goed om te weten

- Alles blijft op je telefoon. De app heeft geen internet nodig en stuurt geen gegevens naar anderen.
- Zet het scherm tijdens een test niet op slot. De timers lopen dan wel door, maar de signalen komen dan mogelijk niet door.
- Batterijbesparing van sommige merken kan meldingen uitstellen. Zet de app dan op "niet optimaliseren".

## Voor ontwikkelaars

- Techniek: de schermen zijn gewone HTML/JS (`app/src/main/assets/www`), zonder externe bibliotheken. Op Android toont een kleine Java-app ze in een WebView en levert geluid, trilling, meldingen, opslag en het kiezen van back-upbestanden. Op iPhone draait dezelfde code als webapp: `js/web.js` doet het geluid (met `audioSession`, en een stille audiolus als vangnet voor de stilteschakelaar), houdt het scherm aan (Wake Lock) en bewaart bestanden via het deelmenu; `sw.js` zorgt dat de app offline werkt; `js/reminders.js` maakt het agenda-bestand.
- GitHub Pages: `.github/workflows/publiceer-webapp.yml` draait de tests en zet de map `www` online, met een versienummer in `sw.js` en `version.js`. **Eenmalig instellen**: Settings, Pages, Build and deployment, Source: **GitHub Actions**. Daarna publiceert elke wijziging op de standaardbranch automatisch.
- GitHub Actions (`.github/workflows/build-apk.yml`) draait de tests, bouwt de APK en publiceert die bij elke wijziging op `main` als release, met een oplopend versienummer.
- Lokaal bouwen: open de map in Android Studio, of `./gradlew assembleRelease` (JDK 17 en Android SDK 34).
- Tests: `node tests/js-tests.js` (normen, timers, resultaten, back-up), `node tests/web-tests.js` (herinneringen, agenda-bestand, offline-opslag) en de Java-test voor de herinneringen (zie de workflow).
- De technische app-id blijft `com.q8trainer.app`, zodat een nieuwe versie over een eerdere installatie heen werkt.
- `app/debug.keystore` is bewust meegeleverd, zodat elke nieuwe versie over de vorige heen te installeren is. Het is een gewone debug-sleutel en geen geheim. Gebruik hem niet om apps in een store te zetten.
