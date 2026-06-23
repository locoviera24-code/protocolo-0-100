package com.protocolo.cien;

import android.app.Activity;
import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Locale;

public class MainActivity extends Activity {
    public static final String ACTION_OPEN_TODAY_WORKOUT = "com.protocolo.cien.ACTION_OPEN_TODAY_WORKOUT";
    public static final String ACTION_QUICK_LOG_SET = "com.protocolo.cien.ACTION_QUICK_LOG_SET";
    public static final String ACTION_COMPLETE_CURRENT_EXERCISE = "com.protocolo.cien.ACTION_COMPLETE_CURRENT_EXERCISE";
    public static final String ACTION_REFRESH_WORKOUT_WIDGET = "com.protocolo.cien.ACTION_REFRESH_WORKOUT_WIDGET";
    public static final String ACTION_WIDGET_REPS_DOWN = "com.protocolo.cien.ACTION_WIDGET_REPS_DOWN";
    public static final String ACTION_WIDGET_REPS_UP = "com.protocolo.cien.ACTION_WIDGET_REPS_UP";
    public static final String ACTION_WIDGET_WEIGHT_DOWN = "com.protocolo.cien.ACTION_WIDGET_WEIGHT_DOWN";
    public static final String ACTION_WIDGET_WEIGHT_UP = "com.protocolo.cien.ACTION_WIDGET_WEIGHT_UP";
    public static final String ACTION_WIDGET_SAVE_SET = "com.protocolo.cien.ACTION_WIDGET_SAVE_SET";
    public static final String ACTION_WIDGET_REPEAT_LAST = "com.protocolo.cien.ACTION_WIDGET_REPEAT_LAST";
    public static final String ACTION_WIDGET_PREVIOUS_EXERCISE = "com.protocolo.cien.ACTION_WIDGET_PREVIOUS_EXERCISE";
    public static final String ACTION_WIDGET_NEXT_EXERCISE = "com.protocolo.cien.ACTION_WIDGET_NEXT_EXERCISE";
    private static final int SPEECH_REQUEST_CODE = 4100;
    private WebView webView;
    private Intent pendingWidgetIntent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        pendingWidgetIntent = getIntent();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                dispatchWidgetIntentToWeb(pendingWidgetIntent);
                pendingWidgetIntent = null;
            }
        });
        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        webView.addJavascriptInterface(new AndroidUsageBridge(this), "AndroidUsageBridge");
        webView.addJavascriptInterface(new AndroidSpeechBridge(), "AndroidSpeechBridge");
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                    "if (typeof updatePhonePanel === 'function') updatePhonePanel();",
                    null
            ));
        }
        WorkoutWidgetUpdateService.updateAll(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchWidgetIntentToWeb(intent);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidUsageBridge");
            webView.removeJavascriptInterface("AndroidSpeechBridge");
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SPEECH_REQUEST_CODE || webView == null) return;
        if (resultCode == RESULT_OK && data != null) {
            ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (results != null && !results.isEmpty()) {
                String quoted = JSONObject.quote(results.get(0));
                webView.evaluateJavascript("window.onAndroidSpeechResult(" + quoted + ");", null);
                return;
            }
        }
        webView.evaluateJavascript("window.onAndroidSpeechError('No pude reconocer la voz. Intentá nuevamente o escribí la comida.');", null);
    }

    public class AndroidSpeechBridge {
        @JavascriptInterface
        public void startRecognition() {
            runOnUiThread(() -> {
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
                intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Decí qué comiste y la cantidad");
                try {
                    startActivityForResult(intent, SPEECH_REQUEST_CODE);
                } catch (Exception e) {
                    if (webView != null) {
                        webView.evaluateJavascript("window.onAndroidSpeechError('El reconocimiento de voz no está disponible en este teléfono.');", null);
                    }
                }
            });
        }
    }

    public class AndroidBridge {
        private final Activity activity;

        AndroidBridge(Activity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void saveWorkoutWidgetData(String json) {
            activity.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(WorkoutWidgetUpdateService.KEY_STATE_JSON, json == null ? "" : json)
                    .apply();
            WorkoutWidgetUpdateService.updateAll(activity);
        }

        @JavascriptInterface
        public String getWorkoutWidgetData() {
            SharedPreferences prefs = activity.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getString(WorkoutWidgetUpdateService.KEY_STATE_JSON, "");
        }

        @JavascriptInterface
        public void updateWorkoutWidget() {
            WorkoutWidgetUpdateService.updateAll(activity);
        }
    }

    private void dispatchWidgetIntentToWeb(Intent intent) {
        if (intent == null || webView == null) return;
        String action = intent.getAction();
        if (!isWorkoutAction(action)) return;
        String exerciseId = intent.getStringExtra("exerciseId");
        try {
            JSONObject payload = new JSONObject();
            payload.put("exerciseId", exerciseId == null ? "" : exerciseId);
            String js = "if (window.handleAndroidWidgetIntent) window.handleAndroidWidgetIntent("
                    + JSONObject.quote(action) + "," + payload.toString() + ");";
            webView.post(() -> webView.evaluateJavascript(js, null));
        } catch (Exception ignored) {
        }
    }

    private boolean isWorkoutAction(String action) {
        return ACTION_OPEN_TODAY_WORKOUT.equals(action)
                || ACTION_QUICK_LOG_SET.equals(action)
                || ACTION_COMPLETE_CURRENT_EXERCISE.equals(action)
                || ACTION_REFRESH_WORKOUT_WIDGET.equals(action);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public static class AndroidUsageBridge {
        private final Activity activity;
        private final Set<String> nonEssentialPackages = new HashSet<>();

        AndroidUsageBridge(Activity activity) {
            this.activity = activity;
            seedNonEssentialPackages();
        }

        private void seedNonEssentialPackages() {
            String[] packages = new String[]{
                "com.instagram.android", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill",
                "com.google.android.youtube", "com.google.android.apps.youtube.music",
                "com.facebook.katana", "com.facebook.orca", "com.whatsapp", "com.snapchat.android",
                "com.twitter.android", "com.x.android", "com.reddit.frontpage", "com.pinterest",
                "com.netflix.mediaclient", "com.spotify.music", "tv.twitch.android.app",
                "com.discord", "com.google.android.apps.photos"
            };
            for (String p : packages) nonEssentialPackages.add(p);
        }

        @JavascriptInterface
        public boolean hasUsageAccess() {
            try {
                AppOpsManager appOps = (AppOpsManager) activity.getSystemService(Context.APP_OPS_SERVICE);
                int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                        android.os.Process.myUid(), activity.getPackageName());
                return mode == AppOpsManager.MODE_ALLOWED;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void requestUsageAccess() {
            activity.runOnUiThread(() -> {
                Intent appSettings = new Intent(
                        Settings.ACTION_USAGE_ACCESS_SETTINGS,
                        Uri.parse("package:" + activity.getPackageName())
                );
                try {
                    activity.startActivity(appSettings);
                } catch (Exception ignored) {
                    activity.startActivity(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS));
                }
            });
        }

        @JavascriptInterface
        public String getTodayUsageJson() {
            Calendar start = Calendar.getInstance();
            start.set(Calendar.HOUR_OF_DAY, 0);
            start.set(Calendar.MINUTE, 0);
            start.set(Calendar.SECOND, 0);
            start.set(Calendar.MILLISECOND, 0);
            long begin = start.getTimeInMillis();
            long end = System.currentTimeMillis();
            return getUsageRangeJson(begin, end);
        }

        @JavascriptInterface
        public String getUsageRangeJson(long beginMillis, long endMillis) {
            JSONObject out = new JSONObject();
            try {
                if (!hasUsageAccess()) {
                    out.put("ok", false);
                    out.put("error", "Falta permiso de Uso de apps.");
                    return out.toString();
                }
                UsageStatsManager manager = (UsageStatsManager) activity.getSystemService(Context.USAGE_STATS_SERVICE);
                Map<String, UsageStats> statsMap = manager.queryAndAggregateUsageStats(beginMillis, endMillis);
                PackageManager pm = activity.getPackageManager();
                JSONArray apps = new JSONArray();
                long totalMs = 0;
                long nonEssentialMs = 0;

                List<UsageStats> stats = new ArrayList<>(statsMap.values());
                stats.sort((a, b) -> Long.compare(b.getTotalTimeInForeground(), a.getTotalTimeInForeground()));

                for (UsageStats s : stats) {
                    long ms = s.getTotalTimeInForeground();
                    if (ms <= 0) continue;
                    String pkg = s.getPackageName();
                    if (pkg.equals(activity.getPackageName())) continue;
                    totalMs += ms;
                    boolean nonEssential = nonEssentialPackages.contains(pkg);
                    if (nonEssential) nonEssentialMs += ms;

                    JSONObject row = new JSONObject();
                    row.put("packageName", pkg);
                    row.put("label", appLabel(pm, pkg));
                    row.put("minutes", Math.round(ms / 60000.0));
                    row.put("nonEssential", nonEssential);
                    apps.put(row);
                }
                out.put("ok", true);
                out.put("beginMillis", beginMillis);
                out.put("endMillis", endMillis);
                out.put("totalMinutes", Math.round(totalMs / 60000.0));
                out.put("nonEssentialMinutes", Math.round(nonEssentialMs / 60000.0));
                out.put("apps", apps);
                out.put("note", "Uso estimado por tiempo en primer plano de apps. El no esencial depende de clasificación por paquete.");
                return out.toString();
            } catch (Exception e) {
                try {
                    out.put("ok", false);
                    out.put("error", e.getMessage() == null ? e.toString() : e.getMessage());
                    return out.toString();
                } catch (Exception ignored) {
                    return "{\"ok\":false,\"error\":\"Error desconocido\"}";
                }
            }
        }

        private String appLabel(PackageManager pm, String packageName) {
            try {
                ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
                CharSequence label = pm.getApplicationLabel(info);
                return label == null ? packageName : label.toString();
            } catch (Exception e) {
                return packageName;
            }
        }
    }
}
