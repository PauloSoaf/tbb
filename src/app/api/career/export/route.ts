import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { applicationOrder,searchableApplicationWhere,careerFiltersSchema } from "@/features/career/queries";
import { careerCsv } from "@/features/career/transfer";
import { dayKey } from "@/lib/dates";
export async function GET(request:Request){const c=await requirePermission("READ"),filters=careerFiltersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));const rows=await prisma.application.findMany({where:await searchableApplicationWhere(prisma,c.workspaceId,filters,dayKey(new Date(),c.workspace.timezone)),orderBy:applicationOrder(filters),include:{company:true},take:10001});if(rows.length>10000)return Response.json({error:"Filtre a exportação para até 10.000 vagas."},{status:422});return new Response(careerCsv(rows.map(a=>({...a,companyName:a.company.name,careersUrl:a.company.careersUrl,appliedOn:a.appliedAt?.toISOString().slice(0,10)??""}))),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=carreira-vagas.csv","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
