package com.q8trainer.app;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/** Losse test voor ReminderMath (geen Android nodig). Draai: zie .github/workflows/build-apk.yml */
public class ReminderMathTest {
    private static final ZoneId NL = ZoneId.of("Europe/Amsterdam");
    private static int failures = 0;
    private static int checks = 0;

    private static long at(int y, int m, int d, int h, int min) {
        return ZonedDateTime.of(y, m, d, h, min, 0, 0, NL).toInstant().toEpochMilli();
    }

    private static long epochDay(int y, int m, int d) {
        return LocalDate.of(y, m, d).toEpochDay();
    }

    private static void eq(String name, long expected, long actual) {
        checks++;
        if (expected != actual) {
            failures++;
            System.out.println("FOUT " + name + ": verwacht " + expected + " maar kreeg " + actual);
        }
    }

    public static void main(String[] args) {
        // zaterdag 31 oktober 2026, 00:51
        long now = at(2026, 10, 31, 0, 51);

        // --- vaste dagen: ma, wo, vr om 18:00 -> eerstvolgende is maandag 2 november
        eq("weekdagen ma/wo/vr", at(2026, 11, 2, 18, 0),
                ReminderMath.nextTrigger(true, new int[]{1, 3, 5}, 0, 0, 18, 0, NL, now));

        // vandaag is zaterdag (6) en 18:00 komt nog
        eq("vandaag nog te komen", at(2026, 10, 31, 18, 0),
                ReminderMath.nextTrigger(true, new int[]{6}, 0, 0, 18, 0, NL, now));

        // vandaag is zaterdag maar het tijdstip is al voorbij -> volgende week
        eq("vandaag al voorbij", at(2026, 11, 7, 18, 0),
                ReminderMath.nextTrigger(true, new int[]{6}, 0, 0, 18, 0, NL, at(2026, 10, 31, 19, 0)));

        // exact op het tijdstip: strikt erna
        eq("strikt na peiltijd", at(2026, 11, 7, 18, 0),
                ReminderMath.nextTrigger(true, new int[]{6}, 0, 0, 18, 0, NL, at(2026, 10, 31, 18, 0)));

        // zondag, over de wisseling naar wintertijd heen (25 okt 2026)
        eq("wintertijd", at(2026, 10, 25, 8, 0),
                ReminderMath.nextTrigger(true, new int[]{7}, 0, 0, 8, 0, NL, at(2026, 10, 24, 21, 0)));

        // geen dagen gekozen
        eq("geen dagen", -1, ReminderMath.nextTrigger(true, new int[]{}, 0, 0, 18, 0, NL, now));

        // --- om de X dagen
        // om de 2 dagen, eerste training vandaag, 18:00 komt nog
        eq("interval 2, vandaag", at(2026, 10, 31, 18, 0),
                ReminderMath.nextTrigger(false, null, 2, epochDay(2026, 10, 31), 18, 0, NL, now));

        // om de 2 dagen, vandaag al voorbij -> overmorgen
        eq("interval 2, voorbij", at(2026, 11, 2, 18, 0),
                ReminderMath.nextTrigger(false, null, 2, epochDay(2026, 10, 31), 18, 0, NL, at(2026, 10, 31, 19, 0)));

        // om de 2 dagen, begonnen op 29 okt -> 29, 31, 2 ...: vandaag (31) 18:00
        eq("interval 2, eerder begonnen", at(2026, 10, 31, 18, 0),
                ReminderMath.nextTrigger(false, null, 2, epochDay(2026, 10, 29), 18, 0, NL, now));

        // om de 4 dagen, begonnen op 20 okt -> 20, 24, 28, 1 nov
        eq("interval 4", at(2026, 11, 1, 18, 0),
                ReminderMath.nextTrigger(false, null, 4, epochDay(2026, 10, 20), 18, 0, NL, now));

        // eens per week (7), begonnen op 24 okt -> 24, 31 (vandaag, 18:00 komt nog)
        eq("interval 7", at(2026, 10, 31, 18, 0),
                ReminderMath.nextTrigger(false, null, 7, epochDay(2026, 10, 24), 18, 0, NL, now));

        // eerste trainingsdag ligt in de toekomst
        eq("startdatum in de toekomst", at(2026, 11, 10, 7, 30),
                ReminderMath.nextTrigger(false, null, 3, epochDay(2026, 11, 10), 7, 30, NL, now));

        // ongeldig interval wordt 1 dag
        eq("interval 0 = elke dag", at(2026, 10, 31, 18, 0),
                ReminderMath.nextTrigger(false, null, 0, epochDay(2026, 10, 1), 18, 0, NL, now));

        if (failures == 0) {
            System.out.println("ReminderMathTest OK (" + checks + " controles)");
        } else {
            System.out.println(failures + " van " + checks + " controles mislukt");
            System.exit(1);
        }
    }
}
