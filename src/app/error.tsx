"use client";
export default function ErrorPage({reset}:{reset:()=>void}) {return <main className="empty-state"><h1>Não foi possível carregar esta página</h1><p className="muted">Verifique sua conexão e tente novamente.</p><button className="button" onClick={reset}>Tentar novamente</button></main>;}
