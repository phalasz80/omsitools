import test from 'node:test';
import assert from 'node:assert/strict';
import {convertHof,convertHofBytes,readHofZip} from '../hof-fokgyem.mjs';
import {makeZip} from '../engine.mjs';
const header='[name]\r\nTest\r\nstringcount_terminus\r\n2\r\nstringcount_busstop\r\n1\r\n';
const trip='[infosystem_trip]\r\n63901\r\nA-B\r\n16\r\n639\r\n[infosystem_busstop_list]\r\n2\r\nStart\r\nBoltenberg\r\n';
const sample=header+'[addterminus]\r\n16\r\nBoltenberg\r\nBoltenberg\r\n\r\n....\r\n[addbusstop_list]\r\nStart\tStart\r\n[end]\r\n'+trip;
test('legacy conversion, route preservation and idempotence',()=>{
 const r=convertHof(sample);assert.deepEqual(r.counts,[41,30]);assert.equal(r.routes,1);assert.equal(r.added,1);assert.ok(r.text.includes(trip));assert.ok(r.text.includes('Test - FOK-GYEM 1.1'));
 const a=r.text.split('\r\n'),i=a.indexOf('[addterminus]');assert.equal(a[i+3+34],'Boltenberg');assert.equal(a[i+3+40],'Boltenberg');assert.equal(convertHof(r.text).text,r.text);
});
test('tabular terminus retains existing custom values',()=>{
 const v=Array(41).fill('');v[34]='CUSTOM';v[35]='LINE 2';v[40]='SINGLE';
 const x=convertHof(header.replace('terminus\r\n2','terminus\r\n41')+'[addterminus_list]\r\n{ALLEX}\t16\tBoltenberg\t'+v.join('\t')+'\r\n[end]\r\n'+trip,{repair:false});
 assert.ok(x.text.includes('CUSTOM\tLINE 2'));assert.ok(x.text.includes('SINGLE'));assert.equal(x.added,0);
});
test('ANSI round trip and filename',()=>{
 const b=Uint8Array.from(sample.replaceAll('Boltenberg','Böltenberg'),x=>x.charCodeAt(0));const r=convertHofBytes('Test.hof',b);assert.equal(r.filename,'Test_FOKGYEM_1.1.hof');assert.ok(r.bytes.includes(246));
});
test('ZIP stored entries',async()=>{
 const bytes=new TextEncoder().encode(sample),z=makeZip([{path:'folder/Test.hof',bytes},{path:'readme.txt',bytes}]);const out=await readHofZip(z);assert.equal(out.length,1);assert.equal(out[0].name,'Test.hof');assert.deepEqual(out[0].bytes,bytes);
});
test('malformed or unknown header fails explicitly',()=>assert.throws(()=>convertHof('[name]\nBad'),/Hiányzó fejléc/));
