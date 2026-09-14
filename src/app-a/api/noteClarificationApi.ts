import type { AppALanguage } from "../types";
import { appAAuthHeaders } from "./authHeaders";

export interface NoteClarification { questions:string[]; suggestions:string[] }
export async function clarifyInboxNote(note:string, language:AppALanguage, options:{fetchImpl?:typeof fetch;timeoutMs?:number}={}):Promise<NoteClarification>{
  const controller=new AbortController();
  const timeout=globalThis.setTimeout(()=>controller.abort(),options.timeoutMs??30_000);
  try{
    const response=await (options.fetchImpl||fetch)("/api/app-a/clarify-note",{method:"POST",headers:{"Content-Type":"application/json",...await appAAuthHeaders()},body:JSON.stringify({note,language}),signal:controller.signal});
    const body=await response.json().catch(()=>null);
    const validList=(value:unknown)=>Array.isArray(value)&&value.length<=3&&value.every(entry=>typeof entry==="string"&&entry.trim().length>0&&entry.length<=240);
    if(!response.ok||!body?.success||!validList(body.questions)||!validList(body.suggestions))throw new Error("note_clarification_failed");
    return {questions:body.questions.map((value:string)=>value.trim()),suggestions:body.suggestions.map((value:string)=>value.trim())};
  }finally{
    globalThis.clearTimeout(timeout);
  }
}
