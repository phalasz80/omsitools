import test from 'node:test';
import assert from 'node:assert/strict';
import {PLATE_SYSTEMS,AREA_OPTIONS,generateRegistrations,readAreas,summarizeReferenceBerlin} from '../registrations.mjs';
import {FLEET_PROFILES,brandOf,parseFleetCSV,applyFleetProfile,fleetShares} from '../fleet-evidence.mjs';
test('every supported plate scheme yields exactly 250 unique CRLF-terminated lines',()=>{
 for(const s of PLATE_SYSTEMS){
  const areas=s.area?[AREA_OPTIONS[s.id]?.[0]?.[0]||'AH']:undefined;
  const year=Math.min(Math.max(s.start,1986),s.end);
  const r=generateRegistrations({scheme:s.id,count:250,areas,year,seed:'fixture-1',separator:'-'});
  assert.equal(r.rows.length,250,s.id);
  assert.equal(new Set(r.rows).size,250,s.id);
  assert.ok(r.text.endsWith('\r\n'),s.id);
  assert.equal(r.text.split('\r\n').filter(Boolean).length,250,s.id);
 }
});
test('same inputs generate exactly identical files',()=>{
 const p={scheme:'DE_WB',count:671,areas:'B',year:1986,seed:'berlin',separator:'-'};
 const a=generateRegistrations(p),b=generateRegistrations(p);
 assert.equal(a.text,b.text);
 assert.ok(a.rows.every(x=>/^B-[A-Z]{2} [1-9][0-9]{3}$/.test(x)));
});
test('old and new Hungarian styles agree with custom OMSI separator',()=>{
 const a=generateRegistrations({scheme:'HU_OLD',count:300,year:2001,separator:'-',seed:33});
 const b=generateRegistrations({scheme:'HU_NEW',count:300,year:2025,separator:'-',seed:33});
 assert.ok(a.rows.every(x=>/^[A-Z]{3}-[1-9][0-9]{2}$/.test(x)));
 assert.ok(b.rows.every(x=>/^[A-Z]{2}-[A-Z]{2} [1-9][0-9]{2}$/.test(x)));
});
test('weighted multiple fictional German codes generate expected prefix types',()=>{
 const a=generateRegistrations({scheme:'DE_NEW',count:400,year:2024,areas:'AH:4,TH:2,HER:1,WIN:1',separator:'-',seed:'fiktiv'});
 const prefixes=new Set(a.rows.map(x=>x.split('-')[0]));
 assert.deepEqual([...prefixes].sort(),['AH','HER','TH','WIN']);
 assert.ok(a.occurrences.find(x=>x.code==='AH').count>a.occurrences.find(x=>x.code==='HER').count);
 assert.throws(()=>generateRegistrations({scheme:'DE_NEW',count:1,year:2024,areas:'INVALIDCODE',separator:'-'}));
});
test('period and count validation',()=>{
 assert.throws(()=>generateRegistrations({scheme:'SK_NEW',count:100,year:2010,separator:'-'}),/év/);
 assert.throws(()=>generateRegistrations({scheme:'HU_OLD',count:100001,year:2001,separator:'-'}),/100 000/);
 assert.throws(()=>generateRegistrations({scheme:'CZ_NEW',count:100,year:2018,separator:'-',areas:'AA'}),/területkód/);
});
test('GDR 1970 2 letters and 1984 three letters',()=>{
 const old=generateRegistrations({scheme:'DE_GDR_OLD',count:30,areas:'I,R',year:1972,separator:'-',seed:'dd'});
 const neu=generateRegistrations({scheme:'DE_GDR_NEW',count:30,areas:'I,R',year:1984,separator:'-',seed:'dd'});
 assert.ok(old.rows.every(x=>/^[IR][A-Z] [1-9][0-9]-[1-9][0-9]$/.test(x)));
 assert.ok(neu.rows.every(x=>/^[IR][A-Z]{2} [1-9]-[1-9][0-9]$/.test(x)));
});
test('French/Czech/Slovak area formats and British styles are separate',()=>{
 const spec=[
 ['FR_FNI','75',2006,/^[1-9]\d{0,3} [A-Z]{2} 75$/],
 ['CZ_NEW','A',2010,/^[1-9]A\d \d{4}$/],
 ['SK_OLD','BA',2010,/^BA-\d{3}[A-Z]{2}$/],
 ['UK_CURRENT','LA',2021,/^LA21 [A-Z]{3}$/],
 ['RS_NEW','BG',2020,/^BG \d{3}-[A-Z]{2}$/],
 ['HR_NEW','ZG',2020,/^ZG \d{4}-[A-Z]{2}$/]
 ];
 for(const [scheme,code,year,pattern] of spec){
  const r=generateRegistrations({scheme,count:10,year,areas:code,separator:'-',seed:42});
  assert.ok(r.rows.every(x=>pattern.test(x)),scheme+': '+r.rows[0]);
 }
});
test('reference Berlin sample summary',()=>{
 const summary=summarizeReferenceBerlin('B-KL 7093\r\nB-BD 312\r\n');
 assert.deepEqual(summary,{total:2,valid:2,unique:2,fourDigit:1,threeDigit:1});
});
test('historical city stock profile is distinguishable from national new registrations',()=>{
 const mun=FLEET_PROFILES[0],frg=FLEET_PROFILES[1],ber=FLEET_PROFILES[2];
 assert.equal(mun.total,471998);
 assert.equal(mun.counts.Volkswagen,106134);
 assert.equal(frg.kind,'selected_new_registrations');
 assert.equal(ber.counts.Volkswagen,undefined);
 assert.equal(ber.total,612309);
});
test('record brand matching and reproducible fleet weights',()=>{
 const records=[
 {mode:'random',name:'VW Golf II',aiPath:'Vehicles\\VW_Golf_2\\Golf.ovh',weight:1},
 {mode:'random',name:'Opel Corsa',aiPath:'Vehicles\\Opel_Corsa\\Corsa.ovh',weight:1},
 {mode:'random',name:'Ford Fiesta',aiPath:'Vehicles\\Ford_Fiesta\\Fiesta.ovh',weight:1},
 {mode:'random',name:'unknown coupe',aiPath:'Vehicles\\xx\\zz.ovh',weight:1},
 {mode:'park',name:'VW park',parkPath:'Vehicles\\VW_Golf_2\\parked.sco',weight:1}
 ];
 assert.equal(brandOf(records[0]),'Volkswagen');
 const result=applyFleetProfile(records,FLEET_PROFILES[0]);
 assert.equal(result.changed,3);
 assert.equal(result.records[3].weight,1);
 assert.equal(result.records[4].weight,1);
 assert.ok(result.records[0].weight>result.records[1].weight);
 assert.ok(result.records[1].weight>result.records[2].weight);
});
test('custom CSV can replace a proxy and gives provenance warning',()=>{
 const p=parseFleetCSV('marka;darab\nOpel;50\nVolkswagen;100\n',{year:1986,place:'Berlin-West',source:'user source'});
 assert.equal(p.counts.Volkswagen,100);
 assert.equal(fleetShares(p)[0].percent,66.67);
 assert.equal(p.grade,'unverified');
 assert.throws(()=>parseFleetCSV('x;y\nx;y'),/fejléc/);
});
