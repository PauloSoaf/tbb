import type { Prisma } from "@prisma/client";
const MARKER="__TBB_UNASSIGNED__";
export async function ensureUnassignedAccount(tx:Prisma.TransactionClient,workspaceId:string){const existing=await tx.account.findFirst({where:{workspaceId,institution:MARKER,isArchived:false}});if(existing)return existing;return tx.account.create({data:{workspaceId,name:"Sem conta",institution:MARKER,type:"OTHER",currency:"BRL"}})}
export function isUnassignedAccount(account:{institution:string|null}){return account.institution===MARKER}
