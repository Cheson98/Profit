package com.q8trainer.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.ZoneId;

/** Plant de trainingsherinneringen met de AlarmManager en toont de melding. */
final class ReminderScheduler {
    static final String CHANNEL_ID = "q8_reminders";
    static final String PREFS = "q8_native";
    static final String KEY_REMINDER = "reminder_json";

    private static final int REQ_ALARM = 1001;
    private static final int REQ_OPEN = 2001;
    private static final int NOTIFICATION_ID = 1;

    private ReminderScheduler() {
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, c.getString(R.string.notif_channel), NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(c.getString(R.string.notif_channel_desc));
        nm.createNotificationChannel(ch);
    }

    static void save(Context c, String json) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_REMINDER, json).apply();
    }

    static String load(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_REMINDER, null);
    }

    /** Plant de eerstvolgende herinnering uit de opgeslagen instellingen (of annuleert ze). */
    static void rescheduleFromPrefs(Context c, long baseMillis) {
        apply(c, load(c), baseMillis);
    }

    static void apply(Context c, String json, long baseMillis) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = alarmIntent(c);
        am.cancel(pi);

        long at = nextAt(json, baseMillis);
        if (at <= 0) {
            return;
        }
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        try {
            if (exact) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    /** Tijdstip (ms) van de volgende herinnering, of -1 als die uit staat. */
    static long nextAt(String json, long baseMillis) {
        if (json == null || json.isEmpty()) {
            return -1;
        }
        try {
            JSONObject o = new JSONObject(json);
            if (!o.optBoolean("enabled", false)) {
                return -1;
            }
            boolean weekly = !"interval".equals(o.optString("mode", "weekdays"));

            JSONArray arr = o.optJSONArray("days");
            int[] days = new int[arr == null ? 0 : arr.length()];
            for (int i = 0; i < days.length; i++) {
                days[i] = arr.optInt(i);
            }

            ZoneId zone = ZoneId.systemDefault();
            long anchor;
            try {
                anchor = LocalDate.parse(o.optString("anchor", "")).toEpochDay();
            } catch (Exception e) {
                anchor = LocalDate.now(zone).toEpochDay();
            }

            return ReminderMath.nextTrigger(weekly, days, o.optInt("interval", 2), anchor,
                    o.optInt("hour", 18), o.optInt("minute", 0), zone, baseMillis);
        } catch (Exception e) {
            return -1;
        }
    }

    static void notifyNow(Context c, String title, String text) {
        ensureChannel(c);
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                c, REQ_OPEN, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new Notification.Builder(c, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_q8)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        c.getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, n);
    }

    private static PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, ReminderReceiver.class);
        return PendingIntent.getBroadcast(
                c, REQ_ALARM, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
