import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeReferenceBerlin} from '../registrations.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
test('user-facing controls referenced in app have real HTML elements',()=>{
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const referenced=[...new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]))];
 const missing=referenced.filter(id=>!ids.has(id));
 assert.deepEqual(missing,[]);
});
test('new tabs and modules are visible and version is coherent',()=>{
 for(const id of ['registrations','fleetratios'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-tab="registrations"/);
 assert.match(html,/data-tab="fleetratios"/);
 assert.match(html,/v1\.5\.0/);
 assert.match(html,/v1\.4\.0/);
 assert.match(app,/registrations\.mjs/);
 assert.match(app,/fleet-evidence\.mjs/);
});
test('berlin reference unchanged and all rows distinct',()=>{
 const raw=readFileSync(new URL('../references/berlin_registrations_671.txt',import.meta.url),'utf8');
 assert.deepEqual(summarizeReferenceBerlin(raw),{total:671,valid:671,unique:671,fourDigit:670,threeDigit:1});
});
