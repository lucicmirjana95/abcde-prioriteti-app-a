import type { AppALanguage } from "../types";
import { appAAuthHeaders } from "./authHeaders";

export interface NoteClarification { questions:string[]; suggestions:string[] }
export async function clarifyInboxNote(note:string, language:AppALanguage):Promise<NoteClarification>{
  const response=await fetch("/api/app-a/clarify-note",{method:"POST",headers:{"Content-Type":"application/json",...await appAAuthHeaders()},body:JSON.stringify({note,language})});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.success||!Array.isArray(body.questions)||!Array.isArray(body.suggestions))throw new Error("note_clarification_failed");
  return {questions:body.questions,suggestions:body.suggestions};
}
