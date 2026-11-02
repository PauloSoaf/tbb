import { notFound,redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
export default async function Page({params}:{params:Promise<{id:string}>}){
  const c=await requirePermission("READ"),{id}=await params;
  if(!await prisma.application.findFirst({where:{id,workspaceId:c.workspaceId},select:{id:true}}))notFound();
  redirect(`/career/applications?record=${encodeURIComponent(id)}`);
}
