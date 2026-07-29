import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [repository,widget,activity,timer,notification,receiver,manifest,smallLayout,mediumLayout,features]=await Promise.all([
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/NativeWorkoutControlRepository.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutTimerController.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlNotificationManager.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlReceiver.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/AndroidManifest.xml',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/res/layout/widget_workout_small.xml',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/res/layout/widget_workout_medium.xml',import.meta.url),'utf8'),
  readFile(new URL('../workout-features.js',import.meta.url),'utf8')
]);

for(const contract of ['native_control_state_v1','native_mutation_queue_v1','MAX_MUTATIONS = 200','DOUBLE_TAP_WINDOW_MS','UUID.randomUUID','privateImportState','shareTargets','payload-too-large','commit()'])assert.ok(repository.includes(contract),`Falta contrato nativo: ${contract}`);
assert.match(repository,/public static synchronized EnqueueResult enqueueSaveSet/);
assert.match(repository,/public static synchronized boolean acknowledge/);
assert.match(repository,/NativeWorkoutMutation model = new NativeWorkoutMutation\([\s\S]+?"save_set"/);
assert.ok(repository.includes('String fingerprint = sessionId + "|" + exerciseId + "|" + reps + "|" + canonicalWeight;'));
assert.doesNotMatch(repository,/fingerprint = sessionId[^;]+setNumber/);
assert.match(widget,/NativeWorkoutControlRepository\.enqueueSaveSet/);
assert.match(widget,/nativeResult\.duplicate/);
assert.match(activity,/getNativeWorkoutControlData/);
assert.match(activity,/acknowledgeNativeWorkoutMutation/);
assert.match(activity,/json\.length\(\) > 512 \* 1024/);
for(const contract of ['rest_countdown','timerStatus','startedAtElapsedRealtime','endsAtElapsedRealtime','pausedRemainingMs','setAndAllowWhileIdle','ACTION_TIMER_ADD_15','ACTION_TIMER_SUBTRACT_15'])assert.ok(timer.includes(contract),`Falta contrato de timer: ${contract}`);
assert.doesNotMatch(timer,/setInterval|Thread\.sleep|startForeground/);
for(const contract of ['POST_NOTIFICATIONS','WorkoutControlReceiver'])assert.ok(manifest.includes(contract),`Falta manifest nativo: ${contract}`);
for(const contract of ['setOngoing(true)','CATEGORY_STOPWATCH','VISIBILITY_SECRET','PendingIntent.FLAG_IMMUTABLE','showWeightOnLockScreen','showRecordOnLockScreen'])assert.ok(notification.includes(contract),`Falta contrato de notificación: ${contract}`);
assert.match(receiver,/WorkoutTimerController\.handleAction/);
for(const layout of [smallLayout,mediumLayout])for(const id of ['widgetTimerPanel','widgetTimerChronometer','widgetTimerButton'])assert.ok(layout.includes(id),`Falta ${id} en widget`);
assert.match(activity,/requestWorkoutNotificationPermission/);
assert.match(activity,/handleNativeWorkoutTimerAction/);
assert.match(features,/nativeWorkoutSettings/);
assert.match(features,/syncNativeTimerFromBridge/);
console.log('Controles nativos correctos: cola durable, timer monotónico, widget compartido, notificación privada y bridge acotado.');
