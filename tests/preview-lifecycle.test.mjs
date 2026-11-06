// Run the shipped inline preview script with a small DOM/canvas adapter. Events and
// animation clocks are real script behavior; no browser or image generation required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
async function preview(){
 const ctx=new Proxy({},{get:()=>()=>{}});
 const element=()=>({children:[],dataset:{},value:'dark',checked:true,textContent:'',attrs:{},getContext:()=>ctx,setAttribute(k,v){this.attrs[k]=v},replaceChildren(){this.children=[]},append(...v){this.children.push(...v)}});
 const nodes=new Map();const $=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)};
 const buttons=['idle','walk','attack','jump'].map(action=>({...element(),dataset:{action}}));
 const listeners={},visibility={};let tick;
 const data={meta:{image:'atlas.png'},frames:{},animations:{}};
 for(const action of ['idle','walk','attack','jump']){
  const frames=Array.from({length:8},(_,i)=>`${action}_${i}.png`);
  data.animations[action]={frames,durations:Array(8).fill(100),repeat:['attack','jump'].includes(action)?0:-1};
  for(const key of frames)data.frames[key]={frame:{x:0,y:0,w:256,h:256},sourceSize:{w:256,h:256}};
 }
 const document={hidden:false,querySelector:$,querySelectorAll:()=>buttons,createElement:element,addEventListener(k,f){visibility[k]=f}};
 const code=readFileSync('skills/character-sprites/assets/preview.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 await vm.runInNewContext(`(async()=>{${code}})()`,{document,window:{addEventListener(k,f){listeners[k]=f}},fetch:async()=>({ok:true,json:async()=>data}),Image:class{async decode(){}},performance:{now:()=>0},requestAnimationFrame:f=>{tick=f}});
 let now=0;
 return {nodes,buttons,document,frame(){tick(now+=100)},key(type,key,tagName='CANVAS'){listeners[type]({key,repeat:false,target:{tagName},preventDefault(){}})},blur(){listeners.blur()},hide(){document.hidden=true;visibility.visibilitychange?.()}};
}
test('lost focus or hidden tab releases movement and returns walking to idle',async()=>{
 for(const loseFocus of ['blur','hide']){
  const p=await preview();p.key('keydown','ArrowRight');p.frame();assert.match(p.nodes.get('#status').textContent,/WALK/);
  p[loseFocus]();p.frame();assert.match(p.nodes.get('#status').textContent,/IDLE/);
 }
});
test('attack completes into walking only while a movement key is still held',async()=>{
 const p=await preview();p.key('keydown','ArrowRight');p.key('keydown',' ');
 for(let i=0;i<8;i++)p.frame();assert.match(p.nodes.get('#status').textContent,/WALK/);
 p.key('keyup','ArrowRight');p.key('keydown',' ');
 for(let i=0;i<8;i++)p.frame();assert.match(p.nodes.get('#status').textContent,/IDLE/);
});
test('pause and frame scrubbing hold the selected frame until playback resumes',async()=>{
 const p=await preview();p.nodes.get('#frames').children[4].onclick();
 for(let i=0;i<10;i++)p.frame();assert.match(p.nodes.get('#status').textContent,/frame 5/);
 p.nodes.get('#pause').onclick();p.frame();assert.match(p.nodes.get('#status').textContent,/frame 6/);
});
