import assert from "node:assert/strict";
import { clarifyInboxNote } from "./noteClarificationApi";

const response=(body:unknown,ok=true)=>({ok,json:async()=>body}) as Response;

const valid=await clarifyInboxNote("I am unsure what to do", "en", {fetchImpl:async()=>response({success:true,questions:["What outcome do you want?"],suggestions:["Write down the outcome I want"]})});
assert.deepEqual(valid,{questions:["What outcome do you want?"],suggestions:["Write down the outcome I want"]});

await assert.rejects(()=>clarifyInboxNote("I am unsure what to do", "en", {fetchImpl:async()=>response({success:true,questions:[],suggestions:["", "x"]})}),/note_clarification_failed/);

let aborted=false;
await assert.rejects(()=>clarifyInboxNote("I am unsure what to do", "en", {timeoutMs:5,fetchImpl:async(_url,init)=>new Promise<Response>((_resolve,reject)=>{
  init?.signal?.addEventListener("abort",()=>{aborted=true;reject(Object.assign(new Error("aborted"),{name:"AbortError"}));},{once:true});
})}),/aborted/);
assert.equal(aborted,true);

console.log("Note clarification API tests passed.");
