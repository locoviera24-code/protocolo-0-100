import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [repository,widget,activity]=await Promise.all([
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/NativeWorkoutControlRepository.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',import.meta.url),'utf8'),
  readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8')
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
console.log('Repositorio nativo correcto: cola durable, IDs estables, deduplicación, límites y bridge acotado.');
