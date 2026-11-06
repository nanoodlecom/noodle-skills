// Exercise the real rig CLI with deterministic codecs: no image-generation calls,
// native codec dependency or visual-quality claim. Fake encoders retain RGBA bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,readdir,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const exec=promisify(execFile),rig=resolve('skills/character-sprites/scripts/rig.mjs');
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'noodle-rig-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const bin=join(dir,'bin');await mkdir(bin);
 await writeFile(join(bin,'ffprobe'),`#!${process.execPath}\nconsole.log(JSON.stringify({streams:[{width:64,height:64}]}));\n`,{mode:0o755});
 await writeFile(join(bin,'ffmpeg'),`#!${process.execPath}
import {writeFileSync} from 'node:fs';
const target=process.argv.at(-1);
if(target==='pipe:1'){
 const p=Buffer.alloc(64*64*4);
 for(let i=0;i<p.length;i+=4){p[i]=255;p[i+2]=255;p[i+3]=255;}
 for(const [x,y,w,h] of [[10,5,10,22],[44,7,6,18],[10,40,6,16],[44,40,6,16]])
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*64+xx)*4;p[i]=40;p[i+1]=100;p[i+2]=150;}
 process.stdout.write(p);
}else{
 for await(const chunk of process.stdin){}
 if(process.env.FAIL_ATLAS&&target.endsWith('/atlas.png')){console.error('injected encoder failure');process.exit(1);}
 writeFileSync(target,'encoded fixture');
}
`,{mode:0o755});
 const source=join(dir,'sheet.png');await writeFile(source,'source fixture');
 const summary=join(dir,'run.json');await writeFile(summary,JSON.stringify({errors:[],outputs:{'Rig parts':source,Reference:source},costUsd:.02,remainingBalance:999,apiKey:'never copy'}));
 return {dir,summary,dest:join(dir,'pack'),env:{...process.env,PATH:bin+':'+process.env.PATH}};
}
function run(f,extra={}){return exec(process.execPath,[rig,f.summary,f.dest],{env:{...f.env,...extra},timeout:120000});}
test('failed rig build publishes no partial pack and can retry from saved sources',async t=>{
 const f=await fixture(t);
 await assert.rejects(run(f,{FAIL_ATLAS:'1'}),/injected encoder failure/);
 assert.ok(!(await readdir(f.dir)).includes('pack'),'failed output must remain absent');
 assert.ok(!(await readdir(f.dir)).some(n=>n.startsWith('.pack-')),'temporary build must be removed');
 const {stdout}=await run(f);assert.equal(JSON.parse(stdout).frames,32);
 const manifest=JSON.parse(await readFile(join(f.dest,'atlas.json')));
 assert.equal(Object.keys(manifest.frames).length,32);
 assert.equal((await readdir(join(f.dest,'frames'))).length,32);
 const saved=JSON.parse(await readFile(join(f.dest,'sources/run.json')));
 assert.equal(saved.remainingBalance,undefined);assert.equal(saved.apiKey,undefined);
 const before=await readFile(join(f.dest,'atlas.json'),'utf8');
 await assert.rejects(run(f),/already exists/);
 assert.equal(await readFile(join(f.dest,'atlas.json'),'utf8'),before);
});
test('rig rejects even an empty existing destination without writing into it',async t=>{
 const f=await fixture(t);await mkdir(f.dest);await assert.rejects(run(f),/already exists/);
 assert.deepEqual(await readdir(f.dest),[]);
});
test('simultaneous builds to one destination publish exactly one complete pack',async t=>{
 const f=await fixture(t);const results=await Promise.allSettled([run(f),run(f)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(Object.keys(JSON.parse(await readFile(join(f.dest,'atlas.json'))).frames).length,32);
 assert.ok(!(await readdir(f.dir)).some(n=>n.startsWith('.pack-')));
});
