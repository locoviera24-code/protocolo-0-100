package com.protocolo.cien;

import android.app.Activity;
import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
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

public class MainActivity extends Activity {
    private WebView webView;

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

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new AndroidUsageBridge(this), "AndroidUsageBridge");
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
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidUsageBridge");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
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
