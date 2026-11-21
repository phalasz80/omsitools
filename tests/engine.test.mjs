import test from 'node:test';
import assert from 'node:assert/strict';
import {PLACES,parseOmSi,normalizeApi,parseOverrides,overridesFor,mergeEvents,holidayText,timezoneText,omsiEncode,makeZip} from '../engine.mjs';
import {validateVehicle,parseAilist,parseParklist,buildTrafficFiles,researchPlan} from '../traffic.mjs';

test('calendar block parse, school and public',()=>{
 const data=parseOmSi('[holidays]\n20261223\n20270106\nWeihnachtsferien\n\n[holiday]\n20261225\nChristmas\n');
 assert.equal(data.length,2);assert.equal(data[0].end,'20270106');assert.equal(data[1].kind,'public');
});
test('API naming and filtering',()=>{
 const items=[{type:'Public',startDate:'2026-05-01',endDate:'2026-05-01',name:[{language:'DE',text:'Tag der Arbeit'}]}];
 assert.equal(normalizeApi(items,'public',PLACES[0])[0].name,'Tag der Arbeit');
 assert.equal(normalizeApi(items,'school',PLACES[0]).length,0);
});
test('Berlin 2026 clock change',()=>{
 const tz=timezoneText(PLACES.find(x=>x.id==='berlin'),2026,2026).text;
 assert.match(tz,/\[DST\]\r\n20260329\r\n20261025\r\n2\r\n3\r\n1/);
});
test('override recurring and events text',()=>{
 const place=PLACES.find(x=>x.id==='augsburg');
 const rows=parseOverrides('place_id;kind;start;end;name;action\naugsburg;public;08-08;08-08;Friedensfest;add');
 const patch=overridesFor(place,2026,2027,rows);
 const result=mergeEvents([],patch.added,patch.removed,2026,2027);
 assert.equal(result.length,2);assert.match(holidayText(result,2026,2027),/20270808/);
});
test('single byte encoding and ZIP archive',()=>{
 const bytes=omsiEncode('Düsseldorf, ő, ű','1250');assert.equal(bytes[0],68);
 const archive=makeZip([{path:'test/file.txt',bytes}]);assert.equal(archive[0],0x50);assert.equal(archive[1],0x4b);
});
const record=(overrides={})=>({name:'Testbus',mode:'random',status:'verified',from:'1985',to:'1990',aiPath:'Vehicles\\Test\\Demo.bus',group:'NormalCars',weight:'3',parkPath:'Vehicles\\Test\\Parked.sco',parkWeight:'2',...overrides});
test('vehicle input validation prevents broken extensions',()=>{
 assert.deepEqual(validateVehicle(record()),[]);
 assert.ok(validateVehicle(record({parkPath:'Vehicles\\Test\\Thing.ovh'})).length);
});
test('traffic generator preserves explicit weights',()=>{
 const out=buildTrafficFiles([record()],1986,1988);
 assert.match(out.ailist,/\[aigroup_2\]\r\nNormalCars\r\nVehicles\\Test\\Demo.bus\t3/);
 assert.equal(out.parklist.match(/Parked.sco/g).length,2);
});
test('depot records generated without fictitious model data',()=>{
 const v=record({mode:'depot',depot:'Hof test',hof:'Test 1989',fleet:'1234',reg:'B-XY 123',repaint:'Standard',validFrom:'19860101',validTo:'19891231',parkPath:''});
 const out=buildTrafficFiles([v],1986,1989);
 assert.match(out.ailist,/\[aigroup_depot\]\r\nHof test\r\nTest 1989/);
 assert.match(out.ailist,/1234\tB-XY 123\tStandard\t19860101\t19891231/);
});
test('AI list audit keeps duplicates and recognizes depot',()=>{
 const data='[aigroup_2]\nNormalCars\nVehicles\\X\\x.ovh\t4\nVehicles\\X\\x.ovh\t4\n[end]\n[aigroup_depot]\nBusses\nHof\n[aigroup_depot_typgroup_2]\nVehicles\\BUS\\bus.bus\n1234\tB-1234\tDefault\n[end]\n';
 const parsed=parseAilist(data);assert.equal(parsed.counts.random,2);assert.equal(parsed.counts.scheduled,1);assert.ok(parsed.warnings.some(w=>w.includes('ismételt')));
});
test('Parklist duplicates intentionally remain',()=>{
 const parsed=parseParklist('Vehicles\\X\\a.sco\nVehicles\\X\\a.sco\n');assert.equal(parsed.paths.length,2);assert.equal(parsed.repeats.length,1);
});
test('research creates questions not vehicle assertions',()=>{
 const p=researchPlan({place:'Berlin',area:'Kreuzberg',start:1986,end:1988,topics:['taxi','parking'],where:'BVG Archiv',what:'taxik'});
 assert.ok(p.searches.length===4);assert.match(p.markdown,/Kreuzberg/);
});
