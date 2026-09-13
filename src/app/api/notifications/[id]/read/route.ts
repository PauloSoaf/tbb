import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const context=await getWorkspaceContext();const {id}=await params;await prisma.notification.updateMany({where:{id,workspaceId:context.workspaceId,OR:[{userId:null},{userId:context.userId}]},data:{readAt:new Date()}});return NextResponse.json({ok:true})}
