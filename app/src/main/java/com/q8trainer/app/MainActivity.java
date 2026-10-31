package com.q8trainer.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Toont de app (HTML/JS in assets/www) in een WebView en biedt een kleine brug ("Android")
 * voor wat een webpagina zelf niet kan: opslag, geluid, trillen, scherm aan en meldingen.
 */
public class MainActivity extends Activity {
    private static final String START_URL = "file:///android_asset/www/index.html";

    private WebView webView;
    private ToneGenerator tone;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ReminderScheduler.ensureChannel(this);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0E1A2B"));
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new Bridge(), "Android");
        // de brug mag alleen bereikbaar zijn voor de eigen pagina's
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(START_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.evaluateJavascript("if (window.__onResume) window.__onResume();", null);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        // eerst de app zelf laten bepalen (scherm sluiten, bevestiging tonen); anders naar de achtergrond
        webView.evaluateJavascript("(window.__onBack ? window.__onBack() : false)", value -> {
            if (!"true".equals(value)) {
                moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (tone != null) {
            tone.release();
            tone = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE);
    }

    // ---- geluid en trillen -------------------------------------------------------------

    private void toneAt(int toneType, int durationMs, long delayMs) {
        handler.postDelayed(() -> {
            try {
                if (tone == null) {
                    tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 100);
                }
                tone.startTone(toneType, durationMs);
            } catch (RuntimeException e) {
                tone = null;
            }
        }, delayMs);
    }

    private void playSignal(String kind) {
        if ("start".equals(kind)) {
            // een lange, hoge piep: nu beginnen
            toneAt(ToneGenerator.TONE_DTMF_D, 700, 0);
        } else if ("stop".equals(kind)) {
            // drie korte, lage pieptonen: stoppen
            toneAt(ToneGenerator.TONE_DTMF_1, 220, 0);
            toneAt(ToneGenerator.TONE_DTMF_1, 220, 420);
            toneAt(ToneGenerator.TONE_DTMF_1, 220, 840);
        } else {
            toneAt(ToneGenerator.TONE_PROP_BEEP, 90, 0);
        }
    }

    private void vibrateSignal(String kind) {
        Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) {
            return;
        }
        long[] pattern;
        if ("start".equals(kind)) {
            pattern = new long[]{0, 700};
        } else if ("stop".equals(kind)) {
            pattern = new long[]{0, 220, 200, 220, 200, 220};
        } else {
            pattern = new long[]{0, 60};
        }
        v.vibrate(VibrationEffect.createWaveform(pattern, -1));
    }

    // ---- brug naar de webpagina --------------------------------------------------------

    private class Bridge {
        @JavascriptInterface
        public String loadState() {
            return prefs().getString("state", "");
        }

        @JavascriptInterface
        public void saveState(String json) {
            prefs().edit().putString("state", json).apply();
        }

        @JavascriptInterface
        public void beep(String kind, boolean sound, boolean vibrate) {
            if (sound) {
                playSignal(kind);
            }
            if (vibrate) {
                vibrateSignal(kind);
            }
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(() -> {
                if (on) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        @JavascriptInterface
        public boolean notificationsAllowed() {
            return getSystemService(NotificationManager.class).areNotificationsEnabled();
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33
                        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
                }
            });
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    i.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                    startActivity(i);
                } catch (RuntimeException ignored) {
                    // instellingenscherm niet beschikbaar op dit toestel
                }
            });
        }

        @JavascriptInterface
        public boolean canExactAlarms() {
            if (Build.VERSION.SDK_INT < 31) {
                return true;
            }
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            return am.canScheduleExactAlarms();
        }

        @JavascriptInterface
        public void openExactAlarmSettings() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 31) {
                    try {
                        startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                                Uri.parse("package:" + getPackageName())));
                    } catch (RuntimeException ignored) {
                        // instellingenscherm niet beschikbaar op dit toestel
                    }
                }
            });
        }

        @JavascriptInterface
        public void setReminder(String json) {
            ReminderScheduler.save(MainActivity.this, json);
            ReminderScheduler.rescheduleFromPrefs(MainActivity.this, System.currentTimeMillis());
        }

        /** Tijdstip van de volgende herinnering in ms (als tekst), of "-1". */
        @JavascriptInterface
        public String nextReminderAt() {
            String json = ReminderScheduler.load(MainActivity.this);
            return String.valueOf(ReminderScheduler.nextAt(json, System.currentTimeMillis()));
        }

        @JavascriptInterface
        public void testNotification() {
            ReminderScheduler.notifyNow(
                    MainActivity.this,
                    getString(R.string.notif_test_title),
                    getString(R.string.notif_test_text));
        }
    }
}
