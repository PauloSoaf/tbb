"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useFinanceCopy } from "./finance-copy";

const sections=[
  {id:"resumo",key:"overview"},
  {id:"analises",key:"analysis"},
  {id:"transacoes",key:"transactions"},
  {id:"contas",key:"accounts"},
  {id:"captura",key:"addByText"},
] as const;

export function FinanceSectionNav(){
  const t=useFinanceCopy();
  const [active,setActive]=useState<(typeof sections)[number]["id"]>("resumo");

  useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const marker=window.scrollY+170;
      let current:typeof active="resumo";
      for(const section of sections){
        const element=document.getElementById(section.id);
        if(element&&element.offsetTop<=marker)current=section.id;
      }
      if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-12)current="contas";
      setActive(current);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    update();
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule);
    return()=>{window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);if(frame)cancelAnimationFrame(frame);};
  },[]);

  function goTo(id:typeof active){
    const element=document.getElementById(id);
    if(!element)return;
    setActive(id);
    const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"});
    window.history.replaceState(null,"",`#${id}`);
  }

  return <div className="finance-section-nav-wrap">
    <nav className="finance-section-nav" aria-label="Seções de finanças">
      {sections.map(section=><a key={section.id} href={`#${section.id}`} aria-current={active===section.id?"location":undefined} onClick={event=>{event.preventDefault();goTo(section.id)}}>
        {active===section.id&&<motion.span className="finance-tab-active" layoutId="finance-section-active" transition={{type:"spring",stiffness:430,damping:34}}/>}
        <span>{t(section.key)}</span>
      </a>)}
    </nav>
  </div>;
}
