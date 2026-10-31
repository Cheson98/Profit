package com.q8trainer.app;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Berekent het volgende herinneringsmoment.
 * Bevat bewust geen Android-code, zodat dit los van Android te testen is.
 */
final class ReminderMath {
    private ReminderMath() {
    }

    /**
     * @param weekly         true = vaste weekdagen, false = om de {@code intervalDays} dagen
     * @param weekdays       weekdagen, 1 = maandag ... 7 = zondag (alleen bij weekly)
     * @param intervalDays   aantal dagen tussen twee trainingen (alleen bij interval)
     * @param anchorEpochDay eerste trainingsdag als epoch-dag (alleen bij interval)
     * @param nowMillis      peiltijdstip; het resultaat ligt altijd er strikt na
     * @return tijdstip in milliseconden (epoch), of -1 als er niets te plannen valt
     */
    static long nextTrigger(boolean weekly, int[] weekdays, int intervalDays, long anchorEpochDay,
                            int hour, int minute, ZoneId zone, long nowMillis) {
        LocalDate today = java.time.Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate();

        if (weekly) {
            if (weekdays == null || weekdays.length == 0) {
                return -1;
            }
            for (int i = 0; i <= 7; i++) {
                LocalDate d = today.plusDays(i);
                if (contains(weekdays, d.getDayOfWeek().getValue())) {
                    long t = millisAt(d, hour, minute, zone);
                    if (t > nowMillis) {
                        return t;
                    }
                }
            }
            return -1;
        }

        long n = Math.max(1, intervalDays);
        long diff = today.toEpochDay() - anchorEpochDay;
        // eerste trainingsdag die vandaag of later valt
        long k = diff <= 0 ? 0 : (diff + n - 1) / n;
        for (int i = 0; i < 3; i++) {
            LocalDate d = LocalDate.ofEpochDay(anchorEpochDay + (k + i) * n);
            long t = millisAt(d, hour, minute, zone);
            if (t > nowMillis) {
                return t;
            }
        }
        return -1;
    }

    private static boolean contains(int[] values, int v) {
        for (int x : values) {
            if (x == v) {
                return true;
            }
        }
        return false;
    }

    private static long millisAt(LocalDate d, int hour, int minute, ZoneId zone) {
        return d.atTime(hour, minute).atZone(zone).toInstant().toEpochMilli();
    }
}
