"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
export async function saveProfile(fd:FormData){try{const c=await requirePermission("WRITE");const name=z.string().trim().min(2).max(100).parse(String(fd.get("name")||""));await prisma.user.update({where:{id:c.userId},data:{name}});revalidatePath("/","layout");return{success:"Perfil atualizado."};}catch{return{error:"Confira o nome informado."};}}
export async function saveWorkspaceSettings(fd:FormData){try{const c=await requirePermission("workspace.manage");const data=z.object({name:z.string().trim().min(2).max(100),locale:z.enum(["pt-BR","en-US","es-ES"]),timezone:z.string().min(1).max(100)}).parse(Object.fromEntries(fd));try{new Intl.DateTimeFormat("pt-BR",{timeZone:data.timezone}).format();}catch{throw new Error("timezone");}await prisma.workspace.update({where:{id:c.workspaceId},data:{...data,currency:"BRL"}});revalidatePath("/","layout");return{success:"Workspace atualizado."};}catch{return{error:"Confira nome, idioma e fuso horário. Esta ação exige gestão do workspace."};}}
