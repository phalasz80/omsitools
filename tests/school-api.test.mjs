import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFerienApi,parseSchulferienApi,parseSchulferienDaten,extraGermanSchoolHolidays,FERIEN_API} from '../school-api.mjs';
import {openHolidayEvents} from '../calendar-sources.mjs';
test('ferien-api German-local midnight offsets and exclusive end are normalized correctly',()=>{
 const data=[{start:'2017-04-09T22:00',end:'2017-04-21T22:00',year:2017,stateCode:'BW',name:'osterferien'},
 {start:'2017-01-29T23:00',end:'2017-01-31T23:00',year:2017,stateCode:'BW',name:'winterferien'}];
 const dates=parseFerienApi(data,'BW',2017);
 assert.deepEqual(dates.map(x=>[x.start,x.end]).sort(),[['20170130','20170131'],['20170410','20170421']]);
});
test('inclusive German school API periods and independent school data endpoint parsing',()=>{
 const v=parseSchulferienApi([{start:'2026-08-03T00:00Z',end:'2026-09-14T23:59Z',name_cp:'Sommerferien',stateCode:'BY'}],'BY',2026);
 assert.equal(v[0].end,'20260914');
 const p=parseSchulferienDaten([{start:'2027-07-01',ende:'2027-08-31',name:'Sommerferien',bundesland:'BE'}],'BE',2027);
 assert.deepEqual([p[0].start,p[0].end],['20270701','20270831']);
});
test('2017 Berlin historical calendar keeps official KMK summer and adds autumn school holiday via openly documented API',async()=>{
 const place={country:'DE',subdivision:'DE-BE',name:'Berlin'};
 const api=[{start:'2017-07-19T22:00',end:'2017-09-01T22:00',name:'sommerferien',stateCode:'BE'},
 {start:'2017-10-20T22:00',end:'2017-11-04T23:00',name:'herbstferien',stateCode:'BE'}];
 const res=await openHolidayEvents(place,2017,2017,{fetcher:async url=>({ok:true,json:async()=>api}),germanRegime:'auto'});
 const summer=res.events.filter(x=>x.kind==='school'&&/Sommerferien/.test(x.name));
 assert.equal(summer.length,1);
 assert.equal(summer[0].source.includes('kmk.org'),true);
 assert.ok(res.events.some(x=>x.kind==='school'&&/Herbstferien/.test(x.name)));
 assert.ok(!res.notes.some(x=>x.includes('ELTÉRÉS')));
 assert.equal(res.coverage.find(x=>x.kind==='school').status,'RÉSZLEGES');
});
test('2017 API outage falls back to KMK official summer dates without inventing other breaks',async()=>{
 const p={country:'DE',subdivision:'DE-NW',name:'Essen'};
 const r=await openHolidayEvents(p,2017,2017,{fetcher:async()=>{throw Error('CORS');}});
 assert.ok(r.events.some(x=>x.kind==='school'&&x.start==='20170717'&&x.end==='20170829'));
 assert.equal(r.events.filter(x=>x.kind==='school').length,1);
 assert.ok(r.notes.some(x=>x.includes('CORS')));
 assert.equal(r.incomplete,true);
});
test('2016-1986 records cannot be wrongly fetched from API; summer only remains marked partial',async()=>{
 const p={country:'DE',subdivision:'DE-BE',name:'Berlin'};
 const r=await openHolidayEvents(p,1986,1986,{fetcher:()=>{throw Error('Must not call API');},germanRegime:'FRG'});
 assert.equal(r.events.filter(x=>x.kind==='school').length,1);
 assert.ok(r.events.some(x=>x.start==='19860703'&&x.kind==='school'));
});
test('modern 2026 school holiday provider fallback after OpenHolidays returns empty',async()=>{
 const p={country:'DE',subdivision:'DE-BY',language:'DE',name:'München'};
 const fx=async url=>({ok:true,json:async()=>url.includes('PublicHolidays')?
 [{startDate:'2026-01-01',endDate:'2026-01-01',name:[{language:'DE',text:'Neujahr'}]}]:
 url.includes('SchoolHolidays')?[]:
 url.includes('ferien-api.de')?[{stateCode:'BY',name:'winterferien',start:'2026-02-15T23:00',end:'2026-02-21T23:00'}]:[]});
 const r=await openHolidayEvents(p,2026,2026,{fetcher:fx});
 assert.ok(r.events.some(x=>x.kind==='school'&&x.start==='20260216'));
 assert.ok(r.coverage.some(x=>x.kind==='school'&&x.status==='KÜLSŐ API - ELLENŐRIZENDŐ'));
});
test('third party failure never mutates official event dates and exposes the error',async()=>{
 const p={country:'DE',subdivision:'DE-BW',name:'Freiburg'};
 const r=await openHolidayEvents(p,2018,2018,{fetcher:async()=>({ok:false,status:429,json:async()=>({})})});
 assert.ok(r.events.some(x=>x.kind==='school'&&x.start==='20180726'));
 assert.ok(r.notes.join(' ').includes('429'));
});

test('KMK summer conflicts do not override the archival date and are explicitly logged',async()=>{
 const p={country:'DE',subdivision:'DE-BE',name:'Berlin'};
 const api=[{stateCode:'BE',name:'sommerferien',start:'2017-07-20T22:00',end:'2017-09-01T22:00'}];
 const r=await openHolidayEvents(p,2017,2017,{fetcher:async()=>({ok:true,json:async()=>api})});
 assert.ok(r.notes.some(x=>x.includes('ELTÉRÉS')));
 assert.equal(r.events.find(x=>x.kind==='school'&&/Sommerferien/.test(x.name)).start,'20170720');
});
