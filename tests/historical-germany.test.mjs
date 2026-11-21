import test from 'node:test';
import assert from 'node:assert/strict';
import {germanHistoricalPublic,germanHistoricRegime,germanHistoricalSchool,germanHistoricalYear} from '../historical-germany.mjs';
import {openHolidayEvents} from '../calendar-sources.mjs';
import {timezoneText} from '../engine.mjs';
const byDate=(xs,date)=>xs.find(x=>x.start===date);
test('GDR 1970 no Easter Monday, Ascension or 17 June, but October 7',()=>{
 const e=germanHistoricalPublic(1970,'GDR','DE-SN');
 assert.equal(e.length,9);
 assert.ok(byDate(e,'19701007'));
 assert.ok(!byDate(e,'19700617'));
 assert.ok(!e.some(x=>x.name==='Ostermontag'||x.name==='Christi Himmelfahrt'));
});
test('GDR exceptional 1975 May 9 and 1985 May 8 only',()=>{
 assert.ok(byDate(germanHistoricalPublic(1975,'GDR','DE-MV'),'19750509'));
 assert.ok(byDate(germanHistoricalPublic(1985,'GDR','DE-MV'),'19850508'));
 assert.ok(!byDate(germanHistoricalPublic(1986,'GDR','DE-MV'),'19860508'));
});
test('FRG 1970 has 17 June, and the Rhine regional holidays',()=>{
 const e=germanHistoricalPublic(1970,'FRG','DE-NW');
 assert.ok(byDate(e,'19700617'));
 assert.ok(e.some(x=>x.name==='Fronleichnam'));
 assert.ok(byDate(e,'19701101'));
 assert.ok(e.some(x=>x.name==='Buß- und Bettag'));
 assert.ok(!byDate(e,'19701007'));
});
test('1990: October 3 and not October 7',()=>{
 const e=germanHistoricalPublic(1990,'GDR','DE-BE');
 assert.ok(byDate(e,'19901003'));
 assert.ok(!byDate(e,'19901007'));
 assert.ok(e.some(x=>x.name==='Christi Himmelfahrt'));
});
test('historic Berlin must explicitly select West/East and mismatches are rejected',()=>{
 assert.throws(()=>germanHistoricRegime({country:'DE',subdivision:'DE-BE'},'auto'),/Berlin/);
 assert.equal(germanHistoricRegime({country:'DE',subdivision:'DE-BE'},'GDR'),'GDR');
 assert.equal(germanHistoricRegime({country:'DE',subdivision:'DE-BY'},'auto'),'FRG');
 assert.throws(()=>germanHistoricRegime({country:'DE',subdivision:'DE-BY'},'GDR'),/nyugatnémet/);
});
test('1970 GDR school dates are sourced and no other years fabricated',()=>{
 const arr=germanHistoricalSchool(1970,'GDR');
 assert.ok(arr.some(x=>x.start==='19700704'&&x.end==='19700831'));
 assert.equal(germanHistoricalSchool(1971,'GDR').length,0);
});
test('historical German years avoid OpenHolidays and record missing schools',async()=>{
 const p={country:'DE',subdivision:'DE-SN',name:'Dresden'};
 const r=await openHolidayEvents(p,1970,1971,{fetcher:()=>{throw Error('Must not fetch historical data')}});
 assert.ok(byDate(r.events,'19701007'));
 assert.ok(r.coverage.some(x=>x.year===1971&&x.kind==='school'&&x.status==='HIÁNYZIK'));
 assert.equal(r.incomplete,true);
});
test('2020+ remains API-backed and 1970–2027 timezone composes',()=>{
 const p={id:'de-berlin',name:'Berlin',country:'DE',subdivision:'DE-BE',zone:'Europe/Berlin',lat:52.52,lon:13.405};
 const t=timezoneText(p,1970,2027);
 assert.equal(t.count,48);
 assert.match(t.text,/19800406/);
 assert.doesNotMatch(t.text,/19750406/);
});
