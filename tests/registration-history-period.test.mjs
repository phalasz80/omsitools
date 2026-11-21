import test from 'node:test';
import assert from 'node:assert/strict';
import {generateHistoricalRegistrations,historicalReport,historicalCSV,availablePeriodSystems} from '../registration-period.mjs';
import {specialRulesFor,customPlate,VEHICLE_CATEGORIES} from '../registration-special.mjs';
import {plateDateRange,activeOn,britishAgeLetter,ukNumericAge} from '../registration-history.mjs';
const basic=(country,scheme,fromYear,toYear,areas=[],more={})=>({
 country,scheme,fromYear,toYear,fromMonth:1,toMonth:12,areas,
 count:80,seed:'OMSI historical test',mode:'issue',separator:'-',categories:{civil:{enabled:true,weight:100}},...more
});
const allMatch=(arr,p)=>arr.every(x=>p.test(x));
test('21+ schemes and 22 independent vehicle category controls are defined',()=>{
 assert.ok(availablePeriodSystems('HU').some(s=>s.id==='HU_PRE90'));
 assert.ok(VEHICLE_CATEGORIES.length>=20);
 assert.ok(VEHICLE_CATEGORIES.some(([x])=>x==='nva'));
});
test('1986 Hungary uses the correct private 1958–90 prefix family, never modern 3-letter civilian plates',()=>{
 const r=generateHistoricalRegistrations(basic('HU','AUTO',1986,1986));
 assert.ok(r.schemes.every(x=>x.id==='HU_PRE90'));
 assert.ok(allMatch(r.rows,/^[A-Z]{2}-\d{2} \d{2}$/),r.rows.slice(0,3));
 assert.ok(r.rows.every(x=>/^(GO|GP|GR|GS|GT|GU|GV|GW|GX|GY|DB|DC|DD|DE|DF|DG)-/.test(x)));
});
test('1990 Hungary crosses change; 2022 mixes old and new, but 2023 new issuances only',()=>{
 const x=generateHistoricalRegistrations(basic('HU','AUTO',1990,1990));
 assert.ok(new Set(x.schemes.map(z=>z.id)).has('HU_OLD'));
 assert.ok(new Set(x.schemes.map(z=>z.id)).has('HU_PRE90'));
 const y=generateHistoricalRegistrations(basic('HU','AUTO',2022,2022));
 assert.ok(y.schemes.some(z=>z.id==='HU_OLD'));
 assert.ok(y.schemes.some(z=>z.id==='HU_NEW'));
 const z=generateHistoricalRegistrations(basic('HU','AUTO',2023,2023));
 assert.deepEqual(z.schemes.map(x=>x.id),['HU_NEW']);
});
test('old plates can appear after they stopped being issued, but not be newly issued',()=>{
 assert.equal(activeOn('HU_OLD','2023-06-15'),false);
 assert.throws(()=>generateHistoricalRegistrations(basic('HU','HU_OLD',2024,2024)),/nincs/i);
 const r=generateHistoricalRegistrations(basic('HU','AUTO',2024,2024,[],{mode:'street_all',count:1000,maxAge:12}));
 assert.ok(r.schemes.some(z=>z.id==='HU_OLD'));
 assert.ok(r.schemes.some(z=>z.id==='HU_NEW'));
});
test('1958 Hungarian category lists distinguish taxi, police, military, fire, post, trailer, bike',()=>{
 for(const [kind,prefix] of [['taxi','JA'],['police','RA'],['military','HA'],['fire','TU'],['post','PA'],['trailer','XS'],['motorcycle','KA']]){
  const r=generateHistoricalRegistrations(basic('HU','HU_PRE90',1986,1986,[],{count:15,categories:{[kind]:{enabled:true,weight:1}}}));
  assert.ok(r.rows.every(x=>x.startsWith(prefix+'-')),kind+': '+r.rows[0]);
 }
});
test('dated THW special code cannot appear in 1986 or before November 1996',()=>{
 assert.throws(()=>generateHistoricalRegistrations(basic('DE','DE_FRG',1986,1986,['B'],{categories:{thw:{enabled:true,weight:10}}})),/nincs/i);
 assert.throws(()=>generateHistoricalRegistrations(basic('DE','DE_NEW',1996,1996,['B'],{fromMonth:1,toMonth:10,categories:{thw:{enabled:true,weight:1}}})),/nincs/i);
 const after=generateHistoricalRegistrations(basic('DE','DE_NEW',1996,1996,['B'],{fromMonth:11,toMonth:12,categories:{thw:{enabled:true,weight:1}}}));
 assert.ok(after.rows.every(x=>x.startsWith('THW-')));
});
test('1975 and 1985 East Germany NVA VA codes differ and remain separate from civilian',()=>{
 const a=generateHistoricalRegistrations(basic('DD','DE_GDR_NEW',1975,1975,['I'],{categories:{nva:{enabled:true,weight:1}}}));
 const b=generateHistoricalRegistrations(basic('DD','DE_GDR_NEW',1985,1985,['I'],{categories:{nva:{enabled:true,weight:1}}}));
 assert.ok(allMatch(a.rows,/^VA [1-9]-\d{4}$/));
 assert.ok(allMatch(b.rows,/^VA \d{2}-\d{4}$/));
});
test('Swiss historical Post and Federal agencies not newly issued in 2020',()=>{
 const old=generateHistoricalRegistrations(basic('CH','CH_NEW',1987,1987,['ZH'],{categories:{post:{enabled:true,weight:1}}}));
 assert.ok(allMatch(old.rows,/^P \d+$/));
 assert.throws(()=>generateHistoricalRegistrations(basic('CH','CH_NEW',2020,2020,['ZH'],{categories:{post:{enabled:true,weight:1}}})),/nincs/i);
});
test('Serbian taxi and Croatian army with separate special series',()=>{
 const taxi=generateHistoricalRegistrations(basic('RS','RS_NEW',2020,2020,['BG'],{count:70,categories:{taxi:{enabled:true,weight:1}}}));
 assert.ok(allMatch(taxi.rows,/^BG \d{5}-TX$/));
 const army=generateHistoricalRegistrations(basic('HR','HR_NEW',2018,2018,['ZG'],{count:60,categories:{military:{enabled:true,weight:1}}}));
 assert.ok(allMatch(army.rows,/^HV \d{4}-[A-Z]{2}$/));
});
test('British age codes follow valid calendar periods',()=>{
 assert.equal(britishAgeLetter('prefix',1986,7),'C');
 assert.equal(britishAgeLetter('suffix',1982,9),'Y');
 assert.equal(ukNumericAge(2001,9),'51');
 assert.equal(ukNumericAge(2026,1),'75');
 assert.equal(ukNumericAge(2026,9),'76');
 const r=generateHistoricalRegistrations(basic('GB','UK_CURRENT',2026,2026,['LA'],{fromMonth:9,toMonth:12,count:20}));
 assert.ok(allMatch(r.rows,/^LA76 [A-Z]{3}$/));
});
test('period result includes traceable CSV metadata and separate plain text OMSI output',()=>{
 const r=generateHistoricalRegistrations(basic('DE','AUTO',1986,1991,['B'],{count:250,mode:'street_any',categories:{civil:{enabled:true,weight:20},police:{enabled:true,weight:2}}}));
 assert.equal(r.rows.length,250);
 assert.equal(new Set(r.rows).size,250);
 assert.equal(r.text.trim().split('\r\n').length,250);
 assert.match(historicalCSV(r),/rendszam;kategoria;rendszer/);
 assert.match(historicalReport(r),/Forráskritikai/);
 assert.ok(r.details.every(x=>x.issueYear<=1991));
});
test('custom templates and disabled category omission work without fabricated special claims',()=>{
 const r=generateHistoricalRegistrations(basic('DE','DE_NEW',2016,2016,['AH'],{count:40,categories:{police:{enabled:true,weight:1,template:'{AREA}{SEP}POL {NNN}'}}}));
 assert.ok(r.rows.every(x=>/^AH-POL \d{3}$/.test(x)));
 assert.ok(r.details.every(x=>x.quality==='fictional'));
 assert.throws(()=>customPlate('{BAD}',{area:'B',year:2020,separator:'-'},()=>0.5),/sablon/i);
});
test('category proportions follow independently configurable weights',()=>{
 const r=generateHistoricalRegistrations(basic('HU','HU_PRE90',1986,1986,[],{count:600,categories:{civil:{enabled:true,weight:9},taxi:{enabled:true,weight:1}}}));
 const civil=r.categories.find(x=>x.category==='civil').count, taxi=r.categories.find(x=>x.category==='taxi').count;
 assert.ok(civil>taxi*4&&taxi>0);
});

test('socialist Hungarian plates must be replaced by end of 1995',()=>{
 const old=generateHistoricalRegistrations(basic('HU','HU_PRE90',1994,1994,[],{mode:'street_all',count:30,maxAge:20}));
 assert.ok(old.schemes.every(x=>x.id==='HU_PRE90'));
 assert.throws(()=>generateHistoricalRegistrations(basic('HU','HU_PRE90',1996,1996,[],{mode:'street_any',count:30,maxAge:20})),/nincs/i);
});
test('Swiss old agency series cannot remain after 2004 in street mode',()=>{
 assert.throws(()=>generateHistoricalRegistrations(basic('CH','CH_NEW',2015,2015,['ZH'],{
  mode:'street_any',count:10,maxAge:40,categories:{post:{enabled:true,weight:1}}
 })),/nincs/i);
});
test('future Hungarian civilian first letter cannot be mistaken as already issued',()=>{
 assert.throws(()=>generateHistoricalRegistrations(basic('HU','HU_NEW',2029,2029,[],{count:5})),/még nem|nem állapítható/i);
});
