import test from 'node:test';
import assert from 'node:assert/strict';
import {kmkSummerHoliday,kmkArchiveDiagnostics,kmkArchiveYears,KMK_SUMMER_COUNT} from '../kmk-summer.mjs';
import {germanHistoricalYear} from '../historical-germany.mjs';
test('KMK summer records have enough source-linked dates across the 16 federal states',()=>{
 const summary=kmkArchiveDiagnostics();
 assert.ok(KMK_SUMMER_COUNT>600,JSON.stringify(summary));
 for(const code of ['BE','NW','BY','BW','HH','TH','SN'])assert.ok(summary.byState[code]>25,code);
 for(const state of ['DE-BW','DE-BY','DE-BE','DE-BB','DE-HH','DE-HE','DE-NW','DE-SN','DE-ST','DE-TH']){
  const r=kmkSummerHoliday({country:'DE',subdivision:state},2019,'REUNIFIED');
  assert.ok(r&&r.start.startsWith('2019')&&r.schoolKind==='summer',state);
 }
});
test('1970 West Berlin and 1986 NRW differ, 1986 East Berlin has no West Berlin school dates',()=>{
 const west=kmkSummerHoliday({country:'DE',subdivision:'DE-BE'},1970,'FRG');
 assert.deepEqual([west.start,west.end],['19700711','19700822']);
 const nw=kmkSummerHoliday({country:'DE',subdivision:'DE-NW'},1986,'FRG');
 assert.deepEqual([nw.start,nw.end],['19860724','19860906']);
 assert.equal(kmkSummerHoliday({country:'DE',subdivision:'DE-BE'},1986,'GDR'),null);
});
test('summer only is partial, never presented as full school holiday coverage',()=>{
 const r=germanHistoricalYear({country:'DE',subdivision:'DE-NW',name:'Essen'},1986,'FRG');
 assert.ok(r.events.some(e=>e.kind==='school'&&e.start==='19860724'));
 assert.ok(r.coverage.find(x=>x.kind==='school').status==='RÉSZLEGES');
 assert.ok(r.sources.some(x=>x.includes('kmk.org')));
});
test('1976 Hamburg source has visibly impossible reverse dates and is not fabricated',()=>{
 assert.equal(kmkSummerHoliday({country:'DE',subdivision:'DE-HH'},1976,'FRG'),null);
});
test('post-reunification 2017 summer applies to German federal-state calendar',()=>{
 const r=germanHistoricalYear({country:'DE',subdivision:'DE-BE',name:'Berlin'},2017);
 assert.ok(r.events.some(e=>e.kind==='school'&&e.start==='20170720'&&e.end==='20170901'));
 assert.equal(r.coverage.find(x=>x.kind==='school').status,'RÉSZLEGES');
});
