import {CareerPage} from '@/features/career/CareerPage';
export default async function Page({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<Record<string,string|undefined>>}){return <CareerPage section={(await params).section} query={await searchParams}/>;}
