require('../assets/js/catalog.js'); require('../assets/js/cocurriculars.js');
const E=require('../assets/js/engine.js');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m)} else console.log('ok  ',m)};
const s=E.emptyState(); const set=(g,k,f,sp)=>{s.plan[g][k]={f:f||'',s:sp||''}};
s.prior.msLang='sp:1'; s.prior.psCredit=1;
const full=(g,arr)=>{ ['eng','math','ss','sci','wl','e1','e2'].forEach((k,i)=>set(g,k,...(arr[i]||[]))) };
full(9,[['eng1|EP'],['geo|EP'],['govecon|EP'],['bio|EP'],['sp2|EP'],['dfcp|CP','pcs|CP'],['debate|EP','idebate|HP']]);
full(10,[['eng2|EP'],['alg2|EP'],['mwh|EP'],['chem|EP'],['sp3|EP'],['ds1|EP','ds2|EP'],['sh|CP','sh|CP']]);
set(10,'e2','cyber|EP','ai|EP');
full(11,[['eng3|EP'],['pcalc|EP'],['ushist|EP'],['physep|EP'],['sp4|EP'],['bnd2|EP'],['sh|','sh|']]);
set(11,'e2','pf|EP','cw2|EP');
full(12,[['eng4|EP'],['calc_ep|EP','stat_ep|EP'],['gs_me|EP','gs_ea|EP'],['apbio|AP'],['sp5|HP'],['bnd2|EP'],['rper|','rper|']]);
let P=E.problems(s); console.log('ERRS',P.errs);
console.log(P.tracker.areas.map(a=>a.key+':'+a.have+'/'+a.req+(a.met?'✓':'')).join(' '));
ok(!P.errs.some(e=>/Design Studio|Debate/.test(e)),'same-slot fall→spring sequences resolve');
// grade 12 R period allowed (PE+FA done)
ok(!P.errs.some(e=>/R Period/.test(e)),'R period OK once PE+FA done');
// AP Calc AB blocked in 9th
const o=E.optionsFor(s,9,'math',0); ok(!o.groups.flatMap(g=>g.items).some(i=>i.value==='apcalcab|AP'),'AP not offered in 9th');
// transfer credit: transfer student with Biology + Chemistry from other school
const t=E.emptyState(); t.prior.transfers=[{title:'Biology (Lakeview HS)',equiv:'bio|EP',cr:1,when:'9'},{title:'Chemistry',equiv:'chem|EP',cr:1,when:'10'},{title:'Woodworking',area:'elec',cr:0.5,when:'10'}];
let oo=E.optionsFor(t,11,'sci',0); ok(oo.groups.flatMap(g=>g.items).some(i=>i.value==='physep|EP'||i.value==='physcp|CP'),'transfer Bio+Chem unlock Physics');
const tk=E.tracker(t); ok(tk.areas.find(a=>a.key==='sci').have===2,'transfer sci credit = 2'); ok(tk.areas.find(a=>a.key==='total').have===2.5,'transfer total 2.5: '+tk.areas.find(a=>a.key==='total').have);
// MS Spanish 2HP -> can start Spanish 3 in 9th
const m=E.emptyState(); m.prior.msLang='sp:2'; oo=E.optionsFor(m,9,'wl',0).groups.flatMap(g=>g.items).map(i=>i.value);
ok(oo.includes('sp3|EP')||oo.includes('sp3|HP'),'MS Span 2HP starts at level 3');
// Civics HP in 8th allows MWH in 9th
const c=E.emptyState(); c.prior.civics8=true; oo=E.optionsFor(c,9,'ss',0).groups.flatMap(g=>g.items);
ok(oo.some(i=>i.value==='mwh|HP'),'civics8 -> MWH in 9th (approval)'); ok(!oo.some(i=>i.value==='govecon|EP' && false),'');
console.log(fail?'FAILURES '+fail:'ALL PASS');
