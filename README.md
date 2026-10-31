# Q8 Oefentest (Android)

Onofficiële oefenapp voor de Q8-sporttest. Je vult één keer je geslacht, leeftijd en gewicht in. De app zet daarna de normen klaar, loopt de hele test af met automatische timers en houdt je resultaten bij.

Dit is geen app van de politie en heeft geen politielogo; het embleem is een eigen, neutraal schildje.

## Downloaden en installeren

1. Open op je Android-telefoon de pagina [Releases](../../releases/latest) van deze repository.
2. Tik onder **Assets** op `Q8-Oefentest.apk`.
3. Open het gedownloade bestand. Android vraagt eenmalig of je installatie uit deze bron toestaat (Chrome of Bestanden). Sta dat toe en tik op **Installeer**.
4. Bij het eerste gebruik vraagt de app toestemming voor meldingen. Die heb je nodig voor de herinneringen.

Een nieuwe versie installeer je gewoon over de oude heen. Je gegevens blijven dan bewaard.

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
- Het zijn echte Android-meldingen, ook als de app dicht is. Ze blijven werken na een herstart van je telefoon.
- Laat je telefoon de melding een paar minuten te laat sturen? Geef bij **Instellingen** toestemming voor een exact tijdstip.

## Goed om te weten

- Alles blijft op je telefoon. De app heeft geen internet nodig en maakt geen verbinding.
- Zet het scherm tijdens een test niet op slot. De timers lopen dan wel door, maar de signalen komen dan mogelijk niet door.
- Batterijbesparing van sommige merken kan meldingen uitstellen. Zet de app dan op "niet optimaliseren".

## Voor ontwikkelaars

- Techniek: een kleine Android-app (Java) die de schermen toont in een WebView (HTML/JS in `app/src/main/assets/www`), zonder externe bibliotheken. Java levert geluid, trilling, meldingen en opslag.
- GitHub Actions (`.github/workflows/build-apk.yml`) draait de tests, bouwt de APK en publiceert die bij elke wijziging op `main` als release.
- Lokaal bouwen: open de map in Android Studio, of `./gradlew assembleRelease` (JDK 17 en Android SDK 34).
- Tests: `node tests/js-tests.js` (normen, timers, resultaten) en de Java-test voor de herinneringen (zie de workflow).
- `app/debug.keystore` is bewust meegeleverd, zodat elke nieuwe versie over de vorige heen te installeren is. Het is een gewone debug-sleutel en geen geheim. Gebruik hem niet om apps in een store te zetten.
