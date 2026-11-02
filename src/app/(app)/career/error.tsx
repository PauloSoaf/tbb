"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="panel stack" role="alert"><h1>Não foi possível abrir sua área de carreira.</h1><p>Seus registros foram mantidos. Tente carregar novamente.</p><button type="button" className="button" onClick={reset}>Tentar novamente</button></section>;}
