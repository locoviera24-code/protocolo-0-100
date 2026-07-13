import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={},context=vm.createContext({window,Intl,Number,String,Math,Object,RegExp});
vm.runInContext(fs.readFileSync('app/numbers.js','utf8'),context);
const numbers=window.APP_NUMBERS;

assert.equal(numbers.parse('7,5'),7.5);
assert.equal(numbers.parse('7.5'),7.5);
assert.equal(numbers.parse('1.000,5'),1000.5);
assert.equal(numbers.parse('1,000.5'),1000.5);
assert.equal(numbers.parse('1.000'),1000);
assert.equal(numbers.parse('0,500'),0.5);
assert.equal(numbers.parse('-2,5'),-2.5);
assert.equal(numbers.parse('12 kg'),null);
assert.equal(numbers.parse(''),null);
assert.equal(numbers.parseOr('dato invalido',9),9);
assert.equal(numbers.neutral('1.000,5'),'1000.5');
assert.equal(numbers.format(1000.5,{minimumFractionDigits:1}),'1.000,5');
console.log('Numeros localizados correctos: coma, punto, miles, formato es-PY y valores invalidos.');
