import {CareerPage} from '@/features/career/CareerPage';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <CareerPage query={await searchParams}/>;}
