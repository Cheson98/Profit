package com.q8trainer.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Plant de herinnering opnieuw na een herstart, app-update of andere tijdzone. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ReminderScheduler.rescheduleFromPrefs(context, System.currentTimeMillis());
    }
}
