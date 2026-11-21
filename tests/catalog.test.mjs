import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogCounts,catalogItems,recommendCatalog,scoreCatalog} from '../catalog-core.mjs';
test('complete user-owned original inventories are present',()=>{
 assert.deepEqual(catalogCounts(),{ai:2727,park:1090});
 assert.equal(catalogItems('ai').length,2727);
 assert.equal(catalogItems('park').length,1090);
 assert.ok(catalogItems('ai').some(x=>x.path.includes('Trabant_DDR.ovh')));
 assert.ok(catalogItems('park').some(x=>x.path.toLowerCase().includes('trabant_parked.sco')));
});
test('Berlin East 1986 selects period-suitable eastern vehicles',()=>{
 const {records,ai,warnings}=recommendCatalog({country:'DE',region:'DE-BE',year:1986,eastWest:'east',maxAI:30,maxPark:20});
 assert.ok(ai.some(x=>/Trabant|Wartburg/i.test(x.label)),ai.map(x=>x.label).join(', '));
 assert.ok(records.every(x=>!x.aiPath||!/_LOD\.ovh$/i.test(x.aiPath)));
 assert.ok(records.every(x=>!x.aiPath||!/_Car_H(?:_2022)?\.ovh$/i.test(x.aiPath)));
 assert.ok(!records.some(x=>/W212|F56|ID.4|Golf_5/i.test(x.aiPath||'')));
});
test('Berlin West 1986 does not make Trabants the main fleet',()=>{
 const east=recommendCatalog({country:'DE',region:'DE-BE',year:1986,eastWest:'east',maxAI:45,maxPark:5});
 const west=recommendCatalog({country:'DE',region:'DE-BE',year:1986,eastWest:'west',maxAI:45,maxPark:5});
 const e=east.ai.filter(x=>x.origin==='east').length;
 const w=west.ai.filter(x=>x.origin==='east').length;
 assert.ok(e>w);
});
test('S3D Polish and UK plate variants do not leak into Germany',()=>{
 const {ai}=recommendCatalog({country:'DE',region:'DE-BY',year:2016,maxAI:90,maxPark:20});
 assert.ok(ai.every(x=>!x.s3d||x.plateCountry==='DE'));
 assert.ok(ai.every(x=>!x.modelStart||x.modelStart<=2016));
});
test('Hungary 2023 uses Hungary national variants not new 2022 in 2015',()=>{
 const n=recommendCatalog({country:'HU',region:'HU-BU',year:2023,maxAI:150,maxPark:8});
 const o=recommendCatalog({country:'HU',region:'HU-BU',year:2015,maxAI:150,maxPark:8});
 assert.ok(n.ai.filter(x=>x.s3d).every(x=>x.plateCountry==='HU'));
 assert.ok(o.ai.filter(x=>x.s3d).every(x=>x.plateType!=='2022'));
});
test('park selections contain only real .sco paths with no LOD by default',()=>{
 const r=recommendCatalog({country:'GB',region:'GB-EAW',year:2015,maxAI:50,maxPark:30});
 assert.ok(r.park.length>0);
 assert.ok(r.park.every(x=>x.path.toLowerCase().endsWith('.sco')));
 assert.ok(r.park.every(x=>!x.lod));
 assert.ok(r.records.every(x=>x.status==='proposed'));
});
test('unknown generation excluded until explicitly requested',()=>{
 const r=recommendCatalog({country:'DE',region:'DE-NW',year:1975,maxAI:100,maxPark:100,uncertain:false});
 assert.ok(r.ai.every(x=>x.known));
 assert.ok(r.park.every(x=>x.known));
});
