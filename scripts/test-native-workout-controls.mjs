import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [repository,widget,activity,timer,notification,receiver,manifest,smallLayout,mediumLayout,largeLayoutAlias,features]=await Promise.all([
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/NativeWorkoutControlRepository.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutTimerController.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlNotificationManager.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlReceiver.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/AndroidManifest.xml',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/res/layout/widget_workout_small.xml',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/res/layout/widget_workout_medium.xml',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/res/values/widget_layout_aliases.xml',import.meta.url),'utf8'),
  readFile(new URL('../workout-features.js',import.meta.url),'utf8')
]);

for(const contract of ['native_control_state_v1','native_mutation_queue_v1','MAX_MUTATIONS = 200','DOUBLE_TAP_WINDOW_MS','UUID.randomUUID','privateImportState','shareTargets','payload-too-large','commit()'])assert.ok(repository.includes(contract),`Falta contrato nativo: ${contract}`);
for(const contract of ['MAX_SHARE_TARGETS = 20','mutationShareTargets','mutationPrivacySnapshot','originSessionId','originSetId','privacySnapshot'])assert.ok(repository.includes(contract),`Falta destino nativo validado: ${contract}`);
for(const field of ['shareGymData','shareAggregateOnly','shareSetDetails','hideAbsoluteWeights','anonymousAlias','shareGeneralScore'])assert.ok(repository.includes(`put(output, "${field}"`),`Falta campo permitido de privacidad: ${field}`);
assert.doesNotMatch(repository,/put\(target, "privacySnapshot", cloneObject/);
assert.match(repository,/mutation\.toString\(\)\.getBytes\(StandardCharsets\.UTF_8\)\.length > MAX_PAYLOAD_BYTES/);
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
for(const contract of ['rest_countdown','stopwatch','timerStatus','startedAtElapsedRealtime','endsAtElapsedRealtime','startedAtEpochMs','endsAtEpochMs','bootEpochMs','elapsedBeforeStartMs','pausedRemainingMs','setAndAllowWhileIdle','ACTION_TIMER_ADD_15','ACTION_TIMER_SUBTRACT_15','restoreAfterBoot'])assert.ok(timer.includes(contract),`Falta contrato de timer: ${contract}`);
assert.doesNotMatch(timer,/setInterval|Thread\.sleep|startForeground/);
for(const contract of ['POST_NOTIFICATIONS','RECEIVE_BOOT_COMPLETED','BOOT_COMPLETED','MY_PACKAGE_REPLACED','WorkoutControlReceiver'])assert.ok(manifest.includes(contract),`Falta manifest nativo: ${contract}`);
for(const contract of ['setOngoing(true)','CATEGORY_STOPWATCH','VISIBILITY_SECRET','PendingIntent.FLAG_IMMUTABLE','showWeightOnLockScreen','showRecordOnLockScreen','Privado incorporado','Grupos '])assert.ok(notification.includes(contract),`Falta contrato de notificación: ${contract}`);
for(const contract of ['workout_controls_v2','channelEnabled(Context context)','public static JSONObject status','activeSession','activeTimer','Notification.VISIBILITY_PUBLIC'])assert.ok(notification.includes(contract),`Falta diagnóstico de notificación: ${contract}`);
assert.match(notification,/if \(!showWeight\) return ""/);
assert.match(receiver,/WorkoutTimerController\.handleAction/);
assert.match(receiver,/WorkoutTimerController\.restoreAfterBoot/);
for(const layout of [smallLayout,mediumLayout])for(const id of ['widgetTimerPanel','widgetTimerChronometer','widgetTimerButton'])assert.ok(layout.includes(id),`Falta ${id} en widget`);
assert.match(widget,/R\.layout\.widget_workout_large/);
assert.match(largeLayoutAlias,/name="widget_workout_large"[\s\S]+?@layout\/widget_workout_medium/);
assert.match(activity,/requestWorkoutNotificationPermission/);
assert.match(activity,/openWorkoutNotificationSettings/);
assert.match(activity,/workoutNotificationStatus/);
assert.match(activity,/refreshWorkoutNotification/);
assert.match(activity,/ACTION_CHANNEL_NOTIFICATION_SETTINGS/);
assert.match(activity,/KEY_NOTIFICATION_PERMISSION_REQUESTED/);
assert.match(activity,/handleNativeWorkoutTimerAction/);
assert.match(features,/nativeWorkoutSettings/);
for(const contract of ['gymNativeControlsEnabled','openNativeControlsSettingsBtn','gymNativeTimerMode','gymShowWorkoutLock','gymShowWeightLock','gymShowRecordLock','gymLockVisibility','requestWorkoutNotificationPermission','nativeNotificationStatus'])assert.ok(features.includes(contract),`Falta ajuste nativo contextual: ${contract}`);
assert.match(features,/nativeShareTargets/);
assert.match(features,/nativeSyncState/);
assert.match(features,/syncNativeTimerFromBridge/);
console.log('Controles nativos correctos: cola durable, timer monotónico, widget compartido, notificación privada y bridge acotado.');
