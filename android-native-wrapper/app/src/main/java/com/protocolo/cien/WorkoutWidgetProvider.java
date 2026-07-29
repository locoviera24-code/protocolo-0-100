package com.protocolo.cien;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

public class WorkoutWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WorkoutWidgetUpdateService.updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent != null && WorkoutWidgetUpdateService.handleWidgetAction(context, intent, WorkoutQuickActionReducer.SOURCE_WIDGET)) {
            return;
        }
        if (intent != null && MainActivity.ACTION_WIDGET_PINNED.equals(intent.getAction())) {
            WorkoutWidgetUpdateService.updateAll(context);
            return;
        }
        if (intent != null && MainActivity.ACTION_REFRESH_WORKOUT_WIDGET.equals(intent.getAction())) {
            WorkoutWidgetUpdateService.updateAll(context);
        }
    }
}
