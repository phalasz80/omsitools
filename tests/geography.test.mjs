import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES,REGIONS,CITIES,apiSubdivisionOptions,matchRemoteRegion,codepageFor,countryMeta} from '../geography.mjs';
import {openHolidayUrl,openHolidayEvents,officialUKEvents,nagerUKEvents,ukHolidayEvents,builtinCityEvents} from '../calendar-sources.mjs';
import {timezoneText,omsiEncode,holidayText,mergeEvents} from '../engine.mjs';
const by=(country,name)=>CITIES.find(x=>x.country===country&&x.name===name);
test('All requested 8 countries and all 16 German Bundesländer exist',()=>{
 assert.deepEqual(COUNTRIES.map(x=>x.code),['DE','AT','CH','FR','HU','CZ','SK','GB']);
 assert.equal(REGIONS.DE.length,16);
 assert.ok(CITIES.length>200);
 for(const country of COUNTRIES)assert.ok(CITIES.some(x=>x.country===country.code));
});
test('Regional presets are nested by country and all cities have valid coordinates',()=>{
 for(const city of CITIES){assert.ok(REGIONS[city.country].some(x=>x.code===city.subdivision),city.name+' '+city.subdivision);assert.ok(Number.isFinite(city.lat)&&Math.abs(city.lat)<=90);assert.ok(Number.isFinite(city.lon)&&Math.abs(city.lon)<=180);}
 const out=apiSubdivisionOptions([{code:'FR-ZC',name:[{language:'EN',text:'Zone C'}],children:[{code:'FR-75',name:[{language:'EN',text:'Paris'}],children:[]}]}]);
 assert.equal(out.length,2);
 assert.equal(matchRemoteRegion(by('FR','Paris'),out),'FR-75');
 assert.equal(matchRemoteRegion(by('DE','Augsburg'),[{code:'DE-BY',name:'Bavaria'}]),'DE-BY');
 assert.equal(matchRemoteRegion(by('AT','Graz'),[{code:'AT-ST',name:'Styria'}]),'AT-ST');
});
test('CZ SK HU have Windows-1250 and UK timezone is Greenwich',()=>{
 for(const c of ['HU','CZ','SK'])assert.equal(codepageFor(c),'1250');
 assert.equal(codepageFor('GB'),'1252');
 assert.equal(omsiEncode('č ř Ž š ť ő ű','1250').length,13);
 const tz=timezoneText({...by('GB','London'),zone:'Europe/London'},2026,2026).text;
 assert.match(tz,/\[timezone\]\r\n0/);assert.match(tz,/20260329\r\n20261025/);
});
test('OpenHolidays request includes ISO region and school group only for SchoolHolidays',()=>{
 const place={country:'DE',subdivision:'DE-MV',language:'DE'};
 assert.match(openHolidayUrl('SchoolHolidays',place,2026,'DE-MV-BS'),/groupCode=DE-MV-BS/);
 assert.doesNotMatch(openHolidayUrl('PublicHolidays',place,2026,'DE-MV-BS'),/groupCode=/);
});
test('OpenHolidays validates both school and public years',async()=>{
 const place={country:'DE',subdivision:'DE-BE',language:'DE',name:'Berlin'};
 const fake=async url=>({ok:true,json:async()=>[{type:url.includes('SchoolHolidays')?'School':'Public',startDate:'2026-04-02',endDate:'2026-04-02',name:[{language:'DE',text:'Test'}]}]});
 const res=await openHolidayEvents(place,2026,2026,{fetcher:fake});assert.equal(res.events.length,2);
 await assert.rejects(()=>openHolidayEvents(place,2026,2026,{fetcher:async()=>({ok:true,json:async()=>[]})}),/nicht|nem adott/);
});
test('UK bank holidays parsed by official region and Nager fallback',async()=>{
 const gov={'england-and-wales':{events:[{date:'2026-01-01',title:"New Year's Day"}]},scotland:{events:[{date:'2026-01-02',title:'2nd January'}]},'northern-ireland':{events:[{date:'2026-03-17',title:"St Patrick's Day"}]}};
 assert.equal(officialUKEvents(gov,'GB-SCT',2026,2026)[0].start,'20260102');
 assert.equal(officialUKEvents(gov,'GB-NIR',2026,2026)[0].start,'20260317');
 const records=[{date:'2026-01-01',name:'New Year',nationalHoliday:true,subdivisionCodes:null,holidayTypes:['Public']},{date:'2026-03-17',name:'St Patricks',nationalHoliday:false,subdivisionCodes:['GB-NIR'],holidayTypes:['Bank']}];
 assert.equal(nagerUKEvents(records,'GB-EAW',2026).length,1);
 assert.equal(nagerUKEvents(records,'GB-NIR',2026).length,2);
 const response=await ukHolidayEvents({country:'GB',subdivision:'GB-NIR',name:'Belfast'},2026,2026,{fetcher:async()=>({ok:true,json:async()=>gov})});
 assert.equal(response.events.length,1);assert.ok(response.notes.some(x=>x.includes('iskolaszünet')));
});
test('Augsburg city holiday is not automatically attached to entire Bavaria',()=>{
 const city={...by('DE','Augsburg'),citySelected:true};
 assert.equal(builtinCityEvents(city,2026,2027).length,2);
 assert.equal(builtinCityEvents({...city,citySelected:false},2026,2027).length,0);
 assert.match(holidayText(mergeEvents([],builtinCityEvents(city,2026,2026),[],2026,2026),2026,2026),/20260808/);
});
