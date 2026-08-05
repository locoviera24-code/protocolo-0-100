import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const paths={
  repository:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/NativeWorkoutControlRepository.java',
  queue:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutMutationQueue.java',
  nativeContract:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutQuickActionContract.java',
  state:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutNativeRepository.java',
  reducer:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutQuickActionReducer.java',
  widget:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',
  activity:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',
  timer:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutTimerController.java',
  notification:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlNotificationManager.java',
  provider:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java',
  receiver:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlReceiver.java',
  picker:'../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutExercisePickerActivity.java',
  manifest:'../android-native-wrapper/app/src/main/AndroidManifest.xml',
  compact:'../android-native-wrapper/app/src/main/res/layout/widget_workout_compact.xml',
  standard:'../android-native-wrapper/app/src/main/res/layout/widget_workout_standard.xml',
  expanded:'../android-native-wrapper/app/src/main/res/layout/widget_workout_expanded.xml',
  notificationLayout:'../android-native-wrapper/app/src/main/res/layout/notification_workout_controls.xml',
  info:'../android-native-wrapper/app/src/main/res/xml/workout_widget_info.xml',
  features:'../workout-features.js',
  importer:'../gym/native-workout-importer.js',
  webContract:'../gym/workout-quick-actions.js'
};
const entries=await Promise.all(Object.entries(paths).map(async([name,path])=>[name,await readFile(new URL(path,import.meta.url),'utf8')]));
const source=Object.fromEntries(entries);

for(const contract of ['DOUBLE_TAP_WINDOW_MS = 650L','privateImportState','expectedRevision','revision-conflict'])assert.ok(source.repository.includes(contract),`Falta contrato nativo: ${contract}`);
assert.ok(source.state.includes('native_control_state_v1'),'Falta el estado de control nativo.');
for(const contract of ['native_mutation_queue_v1','pending','imported','rejected','undone','acknowledgeImported','MAX_MUTATIONS = 200','"action"','"transport"'])assert.ok(source.queue.includes(contract),`Falta contrato de cola: ${contract}`);
assert.match(source.queue,/!"pending"\.equals\(status\(record\)\)/,'Una confirmacion tardia no debe revivir una mutacion deshecha.');
for(const contract of ['SCHEMA_VERSION = 1','PAYLOAD_VERSION = 1','MAX_PAYLOAD_BYTES = 16 * 1024','UUID_V4','DANGEROUS_KEYS','adaptLegacy'])assert.ok(source.nativeContract.includes(contract),`Falta schema 1 nativo: ${contract}`);
assert.doesNotMatch(source.repository,/"save_set"|"undo_set"|"UNDO_LAST_SET"/,'Las mutaciones nuevas no deben usar tipos legacy.');
assert.match(source.repository,/WorkoutQuickActionContract\.SAVE_SET/);
assert.match(source.repository,/WorkoutQuickActionContract\.UNDO_SET/);
assert.match(source.state,/nativeRevision[^\n]+revision/,'La revision compacta debe aceptar el snapshot y el control nativo.');
for(const action of ['ADJUST_REPS','ADJUST_WEIGHT','SAVE_SET','UNDO_SET','REPEAT_LAST_SET','PREVIOUS_EXERCISE','NEXT_EXERCISE','COMPLETE_TIME_SET','COMPLETE_DISTANCE_SET'])assert.ok(source.reducer.includes(action),`Falta reducer ${action}`);
for(const command of ['COMMAND_SELECT_EXERCISE','COMMAND_TOGGLE_WEIGHT_STEP'])assert.ok(source.reducer.includes(command),`Falta comando local ${command}`);
assert.match(source.reducer,/claimDelivery/);
assert.match(source.provider,/handleWidgetAction\(context, intent, WorkoutQuickActionReducer\.SOURCE_WIDGET\)/);
assert.match(source.receiver,/handleWidgetAction\(context, intent, WorkoutQuickActionReducer\.SOURCE_NOTIFICATION\)/);
assert.match(source.widget,/OPTION_APPWIDGET_MIN_HEIGHT/);
assert.match(source.widget,/OPTION_APPWIDGET_MAX_HEIGHT/);
assert.match(source.widget,/state\.requiresEditor/);

for(const method of ['getPendingWorkoutMutations','acknowledgeWorkoutMutations','getWorkoutQuickAccessCapabilities','getWorkoutWidgetStatus','requestPinWorkoutWidget','startWorkoutNotification','updateWorkoutNotification','stopWorkoutNotification','openWorkoutNotificationSettings'])assert.ok(source.activity.includes(method),`Falta bridge ${method}`);
assert.match(source.activity,/isRequestPinAppWidgetSupported/);
for(const contract of ['auditPackagedWebCache','getRegistrations','protocolo-0-100-pwa-','installedVersionCode','getLongVersionCode'])assert.ok(source.activity.includes(contract),`Falta limpieza segura de assets APK obsoletos: ${contract}`);
assert.doesNotMatch(source.activity,/WebStorage\.getInstance\(\)\.deleteAllData|localStorage\.clear/,'La actualizacion APK no debe borrar datos del usuario.');
for(const contract of ['BOOT_COMPLETED','MY_PACKAGE_REPLACED','DATE_CHANGED','TIMEZONE_CHANGED','POST_NOTIFICATIONS'])assert.ok(source.manifest.includes(contract),`Falta ciclo Android ${contract}`);
assert.match(source.info,/home_screen/);
assert.doesNotMatch(source.info,/keyguard/,'No se debe prometer un widget keyguard sin soporte probado.');

function verifyTouchTargets(xml,name){
  assert.doesNotMatch(xml,/android:layout_(?:width|height)="1dp"/,`${name} conserva controles funcionales de 1 dp.`);
  const buttons=xml.match(/<Button\b[\s\S]*?\/>/g)||[];
  assert.ok(buttons.length>0,`${name} no tiene acciones.`);
  buttons.forEach(button=>{
    assert.match(button,/android:layout_height="48dp"/,`${name} contiene un boton menor a 48 dp.`);
    assert.match(button,/android:contentDescription=/,`${name} contiene un boton sin nombre accesible.`);
  });
}
verifyTouchTargets(source.compact,'compacto');
verifyTouchTargets(source.standard,'estandar');
verifyTouchTargets(source.expanded,'expandido');
verifyTouchTargets(source.notificationLayout,'notificacion expandida');
for(const layout of ['compact','standard','expanded']){
  for(const id of ['widgetCurrentExercise','widgetWeightMinusButton','widgetWeightPlusButton','widgetWeightFastMinusButton','widgetWeightFastPlusButton','widgetSaveSetButton']){
    assert.ok(source[layout].includes(id),`${layout} no ofrece ${id}.`);
  }
}
for(const id of ['widgetRepsMinusButton','widgetRepsPlusButton'])assert.ok(source.standard.includes(id),`El estandar no permite corregir ${id}.`);
assert.doesNotMatch(source.expanded,/widgetPreviousButton|widgetNextButton|widgetOpenButton|widgetQuickButton/,'El selector directo reemplaza la navegacion secuencial del widget.');
assert.doesNotMatch(source.compact,/widgetQuickButton/,'El compacto no debe abrir una segunda fila de acciones.');
assert.match(source.widget,/widgetWeightMinusButton, widgetActionIntent\(context, MainActivity\.ACTION_WIDGET_WEIGHT_DOWN/);
assert.match(source.widget,/widgetWeightPlusButton, widgetActionIntent\(context, MainActivity\.ACTION_WIDGET_WEIGHT_UP/);
assert.match(source.widget,/widgetWeightFastMinusButton, widgetActionIntent\(context, MainActivity\.ACTION_WIDGET_WEIGHT_FAST_DOWN/);
assert.match(source.widget,/widgetWeightFastPlusButton, widgetActionIntent\(context, MainActivity\.ACTION_WIDGET_WEIGHT_FAST_UP/);
assert.match(source.widget,/adjustQuick\(state, "weight", -WEIGHT_STEP\)/,'El ajuste fino debe restar 0,5 de forma directa.');
assert.match(source.widget,/adjustQuick\(state, "weight", WEIGHT_FAST_STEP\)/,'El ajuste rapido debe sumar 5 de forma directa.');
assert.match(source.widget,/exercisePickerIntent/,'El widget debe abrir un selector directo de ejercicio.');
assert.match(source.picker,/setSingleChoiceItems/);
assert.match(source.picker,/ACTION_WIDGET_SELECT_EXERCISE/);
assert.match(source.features,/exerciseLoadGuidance/,'Cada ejercicio debe publicar su ultima carga y record comparables.');
assert.match(source.widget,/int width = minWidth > 0 \? minWidth : maxWidth/,'El layout debe usar el tamaño actual, no el máximo de otra orientación.');
assert.doesNotMatch(source.widget,/Math\.max\(minWidth, maxWidth\)/,'El tamaño máximo causaba saltos de layout tras un toque.');

for(const contract of ['setOngoing(true)','VISIBILITY_PRIVATE','setPublicVersion(publicVersion(context))','Entrenamiento en curso','IMPORTANCE_DEFAULT','workout_controls_v5','setCustomBigContentView','notification_workout_controls'])assert.ok(source.notification.includes(contract),`Falta privacidad o visibilidad de notificacion: ${contract}`);
for(const id of ['notificationExerciseButton','notificationWeightMinusButton','notificationWeightPlusButton','notificationWeightFastMinusButton','notificationWeightFastPlusButton','notificationSaveSetButton'])assert.ok(source.notificationLayout.includes(id),`La notificacion expandida no ofrece ${id}.`);
assert.match(source.notification,/getActiveNotifications/,'El estado debe distinguir permiso concedido de notificacion realmente publicada.');
assert.doesNotMatch(source.notification,/setFullScreenIntent/);
for(const contract of ['endsAtElapsedRealtime','startedAtElapsedRealtime','restoreAfterBoot','setAndAllowWhileIdle'])assert.ok(source.timer.includes(contract),`Falta timer durable: ${contract}`);
assert.doesNotMatch(source.timer,/Thread\.sleep|setInterval|startForeground/);
for(const text of ['workoutQuickAccessTitle','Agregar widget','Controles mediante','No disponible en la versi'])assert.ok(source.features.includes(text),`Falta UX de descubrimiento: ${text}`);
assert.doesNotMatch(source.features,/puente Android|widget interno\/nativo|Actualizar widget manualmente/i);

const sandbox={window:{APP_VERSION_INFO:{version:'2.7.0',build:94}},TextEncoder,Uint8Array,Date,Math,Number,String,Object,Array,Set,JSON,encodeURIComponent};
vm.runInNewContext(source.webContract,sandbox,{filename:'workout-quick-actions.js'});
vm.runInNewContext(source.importer,sandbox,{filename:'native-workout-importer.js'});
const importer=sandbox.window.NATIVE_WORKOUT_IMPORTER;
const mutation={schemaVersion:1,payloadVersion:1,actionType:'SAVE_SET',mutationId:'11111111-1111-4111-8111-111111111111',source:'android-widget',sessionId:'session-1',exerciseId:'bench',createdAt:'2026-07-29T10:00:00.000Z',clientVersion:'2.7.0+94',expectedRevision:0,payload:{setId:'set-1',date:'2026-07-29',dayKey:'wednesday',weekday:'Miercoles',startedAt:'2026-07-29T10:00:00.000Z',exercise:{id:'bench',exerciseId:'bench',name:'Press de banca'},values:{id:'set-1',reps:8,weightKg:60,setType:'working'}}};
const first=importer.apply([],mutation);
assert.equal(first.status,'applied');
assert.equal(first.sessions[0].exercises[0].sets.length,1);
const redelivery=importer.apply(first.sessions,mutation);
assert.equal(redelivery.status,'duplicate');
assert.equal(redelivery.sessions[0].exercises[0].sets.length,1,'Una reentrega no debe duplicar la serie.');
const undo={schemaVersion:1,payloadVersion:1,actionType:'UNDO_SET',mutationId:'22222222-2222-4222-8222-222222222222',source:'android-widget',sessionId:'session-1',exerciseId:'bench',createdAt:'2026-07-29T10:01:00.000Z',clientVersion:'2.7.0+94',expectedRevision:1,payload:{setId:'set-1'}};
const undone=importer.apply(redelivery.sessions,undo);
assert.equal(undone.status,'applied');
assert.equal(undone.sessions[0].exercises[0].sets.length,0);
const repeatedUndo=importer.apply(undone.sessions,undo);
assert.equal(repeatedUndo.status,'duplicate','Deshacer repetido debe ser idempotente.');

console.log('Acceso rapido Android correcto: reducer compartido, cola durable, layouts accesibles, notificacion privada e importacion idempotente con Deshacer.');
