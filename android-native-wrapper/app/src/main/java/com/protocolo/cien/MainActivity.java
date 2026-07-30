package com.protocolo.cien;

import android.Manifest;
import android.app.Activity;
import android.app.AppOpsManager;
import android.app.PendingIntent;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
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
    public static final String ACTION_WIDGET_WEIGHT_FAST_DOWN = "com.protocolo.cien.ACTION_WIDGET_WEIGHT_FAST_DOWN";
    public static final String ACTION_WIDGET_WEIGHT_FAST_UP = "com.protocolo.cien.ACTION_WIDGET_WEIGHT_FAST_UP";
    public static final String ACTION_WIDGET_TOGGLE_WEIGHT_STEP = "com.protocolo.cien.ACTION_WIDGET_TOGGLE_WEIGHT_STEP";
    public static final String ACTION_WIDGET_SELECT_EXERCISE = "com.protocolo.cien.ACTION_WIDGET_SELECT_EXERCISE";
    public static final String ACTION_WIDGET_SAVE_SET = "com.protocolo.cien.ACTION_WIDGET_SAVE_SET";
    public static final String ACTION_WIDGET_REPEAT_LAST = "com.protocolo.cien.ACTION_WIDGET_REPEAT_LAST";
    public static final String ACTION_WIDGET_PREVIOUS_EXERCISE = "com.protocolo.cien.ACTION_WIDGET_PREVIOUS_EXERCISE";
    public static final String ACTION_WIDGET_NEXT_EXERCISE = "com.protocolo.cien.ACTION_WIDGET_NEXT_EXERCISE";
    public static final String ACTION_WIDGET_UNDO_LAST_SET = "com.protocolo.cien.ACTION_WIDGET_UNDO_LAST_SET";
    public static final String ACTION_WIDGET_COMPLETE_TIME_SET = "com.protocolo.cien.ACTION_WIDGET_COMPLETE_TIME_SET";
    public static final String ACTION_WIDGET_COMPLETE_DISTANCE_SET = "com.protocolo.cien.ACTION_WIDGET_COMPLETE_DISTANCE_SET";
    public static final String ACTION_WIDGET_PINNED = "com.protocolo.cien.ACTION_WIDGET_PINNED";
    private static final int SPEECH_REQUEST_CODE = 4100;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 4101;
    private static final String KEY_NOTIFICATION_PERMISSION_REQUESTED = "workout_notification_permission_requested_v1";
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://" + APP_HOST + "/assets/index.html";
    private WebView webView;
    private Intent pendingWidgetIntent;
    private boolean packagedWebCacheAudited;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        pendingWidgetIntent = getIntent();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return resolveWebResource(assetLoader, request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return resolveWebResource(assetLoader, Uri.parse(url));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl(), request.isForMainFrame());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url), true);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!isTrustedAppUrl(Uri.parse(url))) return;
                auditPackagedWebCache(view);
            }
        });
        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        webView.addJavascriptInterface(new AndroidUsageBridge(this), "AndroidUsageBridge");
        webView.addJavascriptInterface(new AndroidSpeechBridge(), "AndroidSpeechBridge");
        webView.loadUrl(APP_URL);
    }

    private void auditPackagedWebCache(WebView view) {
        if (packagedWebCacheAudited) {
            dispatchPendingWidgetIntent();
            return;
        }
        packagedWebCacheAudited = true;
        String cleanup = "(async()=>{try{"
                + "const registrations=navigator.serviceWorker&&navigator.serviceWorker.getRegistrations?await navigator.serviceWorker.getRegistrations():[];"
                + "const keys=window.caches&&caches.keys?await caches.keys():[];"
                + "const stale=keys.filter(key=>key.indexOf('protocolo-0-100-pwa-')===0);"
                + "if(!registrations.length&&!stale.length)return 'clean';"
                + "await Promise.all(registrations.map(registration=>registration.unregister()));"
                + "await Promise.all(stale.map(key=>caches.delete(key)));"
                + "return 'cleaned';}catch(error){return 'cleanup-failed';}})()";
        view.evaluateJavascript(cleanup, result -> runOnUiThread(() -> {
            if (result != null && result.contains("cleaned")) {
                // The APK is already offline-capable; stale PWA caches can only
                // mask newly packaged assets. User databases are not touched.
                view.clearCache(true);
                view.loadUrl(APP_URL + "?apkBuild=" + installedVersionCode());
                return;
            }
            dispatchPendingWidgetIntent();
        }));
    }

    @SuppressWarnings("deprecation")
    private long installedVersionCode() {
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? packageInfo.getLongVersionCode()
                    : packageInfo.versionCode;
        } catch (PackageManager.NameNotFoundException error) {
            return 0L;
        }
    }

    private void dispatchPendingWidgetIntent() {
        dispatchWidgetIntentToWeb(pendingWidgetIntent);
        pendingWidgetIntent = null;
    }

    private boolean isTrustedAppUrl(Uri uri) {
        return uri != null
                && "https".equalsIgnoreCase(uri.getScheme())
                && APP_HOST.equalsIgnoreCase(uri.getHost());
    }

    private boolean isAllowedRemoteResource(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if ("blob".equals(scheme) || "data".equals(scheme) || "about".equals(scheme)) return true;
        if (!"https".equals(scheme)) return false;
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        return APP_HOST.equals(host)
                || "www.gstatic.com".equals(host)
                || "api.nal.usda.gov".equals(host)
                || host.endsWith(".googleapis.com")
                || host.endsWith(".firebaseapp.com");
    }

    private WebResourceResponse resolveWebResource(WebViewAssetLoader loader, Uri uri) {
        WebResourceResponse local = loader.shouldInterceptRequest(uri);
        if (local != null || isAllowedRemoteResource(uri)) return local;
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                403,
                "Blocked by app policy",
                Collections.emptyMap(),
                new ByteArrayInputStream(new byte[0])
        );
    }

    private boolean handleNavigation(Uri uri, boolean mainFrame) {
        if (!mainFrame || isTrustedAppUrl(uri)) return false;
        if (uri == null) return true;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if ("blob".equals(scheme) && uri.toString().startsWith("blob:https://" + APP_HOST + "/")) return false;
        if ("https".equals(scheme) || "http".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception ignored) {
            }
        }
        return true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                    "if (typeof updatePhonePanel === 'function') updatePhonePanel();"
                            + "window.dispatchEvent(new Event('native-workout-notification-permission'));",
                    null
            ));
        }
        WorkoutWidgetUpdateService.updateAll(this);
        WorkoutControlNotificationManager.update(this);
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
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit().putBoolean(KEY_NOTIFICATION_PERMISSION_REQUESTED, true).apply();
            WorkoutControlNotificationManager.update(this);
            if (webView != null) {
                boolean granted = WorkoutControlNotificationManager.hasPermission(this);
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-workout-notification-permission',{detail:{granted:" + granted + "}}));", null);
            }
        }
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
            if (json != null && json.length() > 512 * 1024) return;
            activity.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(WorkoutWidgetUpdateService.KEY_STATE_JSON, json == null ? "" : json)
                    .apply();
            try { NativeWorkoutControlRepository.syncFromWidgetState(activity, new JSONObject(json == null ? "{}" : json)); }
            catch (Exception ignored) {}
            WorkoutWidgetUpdateService.updateAll(activity);
            WorkoutControlNotificationManager.update(activity);
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

        @JavascriptInterface
        public String getNativeWorkoutControlData() {
            return NativeWorkoutControlRepository.bridgePayload(activity);
        }

        @JavascriptInterface
        public String getPendingWorkoutMutations() {
            JSONObject output = new JSONObject();
            try {
                output.put("schemaVersion", 1);
                output.put("mutations", WorkoutMutationQueue.pending(activity));
                output.put("queue", WorkoutMutationQueue.summary(activity));
            } catch (Exception ignored) {
            }
            return output.toString();
        }

        @JavascriptInterface
        public String acknowledgeWorkoutMutations(String jsonIds) {
            JSONObject output = new JSONObject();
            try {
                if (jsonIds == null || jsonIds.length() > 64 * 1024) throw new IllegalArgumentException("payload-too-large");
                JSONArray ids = new JSONArray(jsonIds);
                boolean ok = WorkoutMutationQueue.acknowledgeImported(activity, ids);
                output.put("ok", ok);
                output.put("code", ok ? "acknowledged" : "no-mutations-acknowledged");
                output.put("queue", WorkoutMutationQueue.summary(activity));
                NativeWorkoutControlRepository.syncPendingSummary(activity);
                WorkoutWidgetUpdateService.updateAll(activity);
                WorkoutControlNotificationManager.update(activity);
            } catch (Exception error) {
                try { output.put("ok", false); output.put("code", "invalid-id-list"); } catch (Exception ignored) {}
            }
            return output.toString();
        }

        @JavascriptInterface
        public String getWorkoutQuickAccessCapabilities() {
            JSONObject output = new JSONObject();
            try {
                AppWidgetManager manager = AppWidgetManager.getInstance(activity);
                ComponentName provider = new ComponentName(activity, WorkoutWidgetProvider.class);
                int[] ids = manager.getAppWidgetIds(provider);
                output.put("schemaVersion", 1);
                output.put("platform", "android-apk");
                output.put("sdkInt", Build.VERSION.SDK_INT);
                output.put("widgetInstances", ids == null ? 0 : ids.length);
                output.put("widgetAdded", ids != null && ids.length > 0);
                output.put("pinWidgetSupported", Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported());
                output.put("notificationPermission", workoutNotificationPermissionState());
                output.put("notificationChannelEnabled", WorkoutControlNotificationManager.isChannelEnabled(activity));
                output.put("lockScreenNotificationSupported", true);
                output.put("keyguardWidgetSupported", false);
                output.put("directMutationQueue", true);
                output.put("undoWindowSeconds", 10);
            } catch (Exception error) {
                try { output.put("code", "capabilities-unavailable"); } catch (Exception ignored) {}
            }
            return output.toString();
        }

        @JavascriptInterface
        public String getWorkoutWidgetStatus() {
            JSONObject output = new JSONObject();
            try {
                AppWidgetManager manager = AppWidgetManager.getInstance(activity);
                int[] ids = manager.getAppWidgetIds(new ComponentName(activity, WorkoutWidgetProvider.class));
                JSONObject control = NativeWorkoutControlRepository.readControlState(activity);
                JSONObject nativeSettings = NativeWorkoutControlRepository.nativeSettings(activity);
                boolean sessionActive = "en progreso".equals(control.optString("sessionStatus", ""));
                boolean notificationEnabled = NativeWorkoutControlRepository.featureEnabled(activity, "lockScreenWorkoutControls")
                        && nativeSettings.optBoolean("showWorkoutOnLockScreen", true);
                boolean notificationPermission = WorkoutControlNotificationManager.hasPermission(activity);
                boolean notificationPosted = sessionActive && notificationPermission
                        && WorkoutControlNotificationManager.isPosted(activity);
                String notificationCode = !notificationEnabled ? "disabled"
                        : !notificationPermission ? "permission-required"
                        : !sessionActive ? "waiting-for-session"
                        : notificationPosted ? "active" : "not-posted";
                output.put("code", ids != null && ids.length > 0 ? "widget-added" : "widget-not-added");
                output.put("instances", ids == null ? 0 : ids.length);
                output.put("queue", WorkoutMutationQueue.summary(activity));
                output.put("notificationCode", notificationCode);
                output.put("sessionActive", sessionActive);
                output.put("notificationPosted", notificationPosted);
                output.put("notificationChannelEnabled", WorkoutControlNotificationManager.isChannelEnabled(activity));
            } catch (Exception error) {
                try { output.put("code", "status-unavailable"); output.put("instances", 0); } catch (Exception ignored) {}
            }
            return output.toString();
        }

        @JavascriptInterface
        public String requestPinWorkoutWidget() {
            JSONObject output = new JSONObject();
            try {
                if (Build.VERSION.SDK_INT < 26) {
                    output.put("ok", false); output.put("code", "manual-install-required");
                    return output.toString();
                }
                AppWidgetManager manager = AppWidgetManager.getInstance(activity);
                if (!manager.isRequestPinAppWidgetSupported()) {
                    output.put("ok", false); output.put("code", "manual-install-required");
                    return output.toString();
                }
                Intent callbackIntent = new Intent(activity, WorkoutWidgetProvider.class).setAction(ACTION_WIDGET_PINNED);
                PendingIntent callback = PendingIntent.getBroadcast(activity, 7401, callbackIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                boolean requested = manager.requestPinAppWidget(new ComponentName(activity, WorkoutWidgetProvider.class), null, callback);
                output.put("ok", requested);
                output.put("code", requested ? "pin-requested" : "pin-request-rejected");
            } catch (Exception error) {
                try { output.put("ok", false); output.put("code", "pin-request-failed"); } catch (Exception ignored) {}
            }
            return output.toString();
        }

        @JavascriptInterface
        public String startWorkoutNotification(String jsonState) {
            return updateNotificationFromBridge(jsonState, true);
        }

        @JavascriptInterface
        public String updateWorkoutNotification(String jsonState) {
            return updateNotificationFromBridge(jsonState, false);
        }

        @JavascriptInterface
        public String stopWorkoutNotification() {
            WorkoutControlNotificationManager.cancel(activity);
            JSONObject output = new JSONObject();
            try { output.put("ok", true); output.put("code", "notification-stopped"); } catch (Exception ignored) {}
            return output.toString();
        }

        private String updateNotificationFromBridge(String jsonState, boolean start) {
            JSONObject output = new JSONObject();
            try {
                if (jsonState != null && !jsonState.trim().isEmpty()) {
                    if (jsonState.length() > 512 * 1024) throw new IllegalArgumentException("payload-too-large");
                    JSONObject state = new JSONObject(jsonState);
                    WorkoutNativeRepository.writeWidgetSnapshot(activity, state);
                    NativeWorkoutControlRepository.syncFromWidgetState(activity, state);
                }
                WorkoutControlNotificationManager.update(activity);
                output.put("ok", true);
                output.put("code", start ? "notification-start-requested" : "notification-updated");
            } catch (Exception error) {
                try { output.put("ok", false); output.put("code", "invalid-workout-state"); } catch (Exception ignored) {}
            }
            return output.toString();
        }

        @JavascriptInterface
        public boolean acknowledgeNativeWorkoutMutation(String mutationId, String importState, String error) {
            if (mutationId == null || mutationId.length() > 160 || error != null && error.length() > 500) return false;
            return NativeWorkoutControlRepository.acknowledge(activity, mutationId, importState, error);
        }

        @JavascriptInterface
        public String workoutNotificationPermissionState() {
            if (Build.VERSION.SDK_INT < 33) return WorkoutControlNotificationManager.hasPermission(activity) ? "granted" : "blocked";
            if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return "granted";
            boolean requested = activity.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                    .getBoolean(KEY_NOTIFICATION_PERMISSION_REQUESTED, false);
            return requested ? "denied" : "prompt";
        }

        @JavascriptInterface
        public String requestWorkoutNotificationPermission() {
            if (Build.VERSION.SDK_INT < 33) return WorkoutControlNotificationManager.hasPermission(activity) ? "granted" : "blocked";
            if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return "granted";
            boolean requested = activity.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                    .getBoolean(KEY_NOTIFICATION_PERMISSION_REQUESTED, false);
            if (requested) {
                Intent settings = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
                activity.startActivity(settings);
                return "settings-opened";
            }
            activity.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit().putBoolean(KEY_NOTIFICATION_PERMISSION_REQUESTED, true).apply();
            activity.runOnUiThread(() -> activity.requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST_CODE));
            return "requested";
        }

        @JavascriptInterface
        public String openWorkoutNotificationSettings() {
            JSONObject output = new JSONObject();
            try {
                WorkoutControlNotificationManager.ensureChannel(activity);
                Intent settings;
                if (Build.VERSION.SDK_INT >= 26) {
                    settings = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                            .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName())
                            .putExtra(Settings.EXTRA_CHANNEL_ID, WorkoutControlNotificationManager.CHANNEL_ID);
                } else {
                    settings = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                            .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
                }
                activity.startActivity(settings);
                output.put("ok", true);
                output.put("code", "notification-settings-opened");
            } catch (Exception error) {
                try { output.put("ok", false); output.put("code", "notification-settings-unavailable"); }
                catch (Exception ignored) {}
            }
            return output.toString();
        }

        @JavascriptInterface
        public boolean handleNativeWorkoutTimerAction(String action) {
            if (action == null || action.length() > 120) return false;
            return WorkoutTimerController.handleAction(activity, action);
        }

        @JavascriptInterface
        public String getAppInfo() {
            JSONObject out = new JSONObject();
            try {
                android.content.pm.PackageInfo info = activity.getPackageManager()
                        .getPackageInfo(activity.getPackageName(), 0);
                long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                        ? info.getLongVersionCode()
                        : info.versionCode;
                out.put("versionName", info.versionName == null ? "" : info.versionName);
                out.put("versionCode", versionCode);
                out.put("packageName", activity.getPackageName());
            } catch (Exception error) {
                try {
                    out.put("versionName", "");
                    out.put("versionCode", 0);
                } catch (Exception ignored) {
                }
            }
            return out.toString();
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
