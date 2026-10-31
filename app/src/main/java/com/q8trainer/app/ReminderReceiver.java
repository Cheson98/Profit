package com.q8trainer.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Wordt door de AlarmManager aangeroepen op het herinneringsmoment. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ReminderScheduler.notifyNow(
                context,
                context.getString(R.string.notif_title),
                context.getString(R.string.notif_text));
        // volgende herinnering plannen; een minuut marge zodat dezelfde niet nogmaals afgaat
        ReminderScheduler.rescheduleFromPrefs(context, System.currentTimeMillis() + 60_000L);
    }
}
