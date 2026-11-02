import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { profileContentSchema } from "@/features/career/schemas";
import { buildResumePdf } from "@/features/career/resume-pdf";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const c=await requirePermission("READ"),{id}=await params,version=await prisma.resumeVersion.findFirst({where:{id,workspaceId:c.workspaceId}});if(!version)return Response.json({error:"Versão não encontrada."},{status:404});const settings=version.settings as {language:string;template:string;spacing:string};const {pdf}=buildResumePdf(profileContentSchema.parse(version.content),settings);return new Response(new Uint8Array(pdf.output("arraybuffer")),{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=curriculo.pdf","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
