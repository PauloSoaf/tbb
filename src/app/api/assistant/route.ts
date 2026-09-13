import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { getAssistantProvider } from "@/lib/assistant/provider";
const requestSchema=z.object({prompt:z.string().trim().min(1).max(1_000),route:z.string().max(300).default("/today")});
export async function POST(request:Request){const context=await getWorkspaceContext();const parsed=requestSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Pergunta inválida."},{status:400});const answer=await getAssistantProvider().reply(parsed.data.prompt,{workspaceId:context.workspaceId,userId:context.userId,route:parsed.data.route});const encoder=new TextEncoder();const words=answer.match(/\S+\s*/g)||[answer];const stream=new ReadableStream({async start(controller){for(const word of words){controller.enqueue(encoder.encode(word));await new Promise(resolve=>setTimeout(resolve,8))}controller.close()}});return new Response(stream,{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}})}
