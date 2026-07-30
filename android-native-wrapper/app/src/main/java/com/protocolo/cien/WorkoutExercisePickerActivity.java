package com.protocolo.cien;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Lightweight exercise chooser opened from the home-screen widget. */
public final class WorkoutExercisePickerActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showPicker();
    }

    private void showPicker() {
        JSONObject state = WorkoutWidgetUpdateService.readStateJson(this);
        JSONObject session = state.optJSONObject("workoutSession");
        JSONArray exercises = session == null ? state.optJSONArray("exercises") : session.optJSONArray("exercises");
        if (exercises == null || exercises.length() == 0) {
            Toast.makeText(this, "No hay ejercicios disponibles para hoy.", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        List<String> ids = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        String selectedId = state.optString("currentExerciseId", "");
        int selectedIndex = 0;
        for (int index = 0; index < exercises.length(); index++) {
            JSONObject exercise = exercises.optJSONObject(index);
            if (exercise == null) continue;
            String id = WorkoutWidgetUpdateService.exerciseIdOfPublic(exercise);
            if (id.isEmpty()) continue;
            ids.add(id);
            int sets = exercise.optJSONArray("sets") == null
                    ? exercise.optInt("setsLogged", 0) : exercise.optJSONArray("sets").length();
            labels.add(exercise.optString("name", "Ejercicio") + (sets > 0 ? "  ·  " + sets + " series" : ""));
            if (id.equals(selectedId)) selectedIndex = ids.size() - 1;
        }
        if (ids.isEmpty()) {
            finish();
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Elegir ejercicio")
                .setSingleChoiceItems(labels.toArray(new String[0]), selectedIndex, (dialog, which) -> {
                    String exerciseId = ids.get(which);
                    String deliveryId = "android-widget:select-exercise:" + UUID.randomUUID();
                    WorkoutQuickActionReducer.Result result = WorkoutQuickActionReducer.dispatch(
                            this,
                            MainActivity.ACTION_WIDGET_SELECT_EXERCISE,
                            WorkoutQuickActionReducer.SOURCE_WIDGET,
                            deliveryId,
                            exerciseId
                    );
                    if (!result.handled || result.code.startsWith("missing")) {
                        Toast.makeText(this, "No se pudo cambiar el ejercicio.", Toast.LENGTH_SHORT).show();
                    }
                    dialog.dismiss();
                })
                .setNegativeButton("Cancelar", null)
                .setOnDismissListener(dialog -> finish())
                .show();
    }
}
