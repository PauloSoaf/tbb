import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@visx/responsive",()=>({ParentSize:({children}:{children:(size:{width:number;height:number})=>unknown})=>children({width:800,height:400})}));
import { BarChart } from "../bar-chart";
import { Bar } from "../bar";

describe("stacked bar plot bounds",()=>{
  it("scales to the combined monthly amount instead of the largest individual segment",()=>{
    const html=renderToStaticMarkup(createElement(BarChart,{data:[{month:"2032-01",open:1800,future:2200,forecast:600}],xDataKey:"month",stacked:true,margin:{top:20,right:20,bottom:40,left:20}},
      createElement(Bar,{dataKey:"open",fill:"#aabb11",animate:false}),createElement(Bar,{dataKey:"future",fill:"#aabb22",animate:false}),createElement(Bar,{dataKey:"forecast",fill:"#aabb33",animate:false})));
    const bars=[...html.matchAll(/<rect\b[^>]*fill="#aabb(?:11|22|33)"[^>]*>/g)].map(([tag])=>({y:Number(/\by="([^"]+)"/.exec(tag)?.[1]),height:Number(/\bheight="([^"]+)"/.exec(tag)?.[1])}));
    expect(bars).toHaveLength(3);
    for(const bar of bars){expect(bar.y).toBeGreaterThanOrEqual(0);expect(bar.height).toBeGreaterThan(0);expect(bar.y+bar.height).toBeLessThanOrEqual(340.01);}
  });
});
