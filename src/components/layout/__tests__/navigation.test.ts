import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRouteTrail, withKeptParams } from "../navigation-registry";
import { backTarget, recordVisit, type HistoryStorage } from "../nav-history";
import { navGroups } from "../navigation";
import { investmentSections } from "@/features/investments/investment-sections";

function storage(initial: Record<string,string> = {}): HistoryStorage {
  const entries=new Map(Object.entries(initial));
  return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>{entries.set(key,value);},removeItem:key=>{entries.delete(key);}};
}
function pages(directory: string): string[] {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?pages(join(directory,entry.name)):entry.name==="page.tsx"?[join(directory,entry.name)]:[]);
}

describe("route breadcrumbs",()=>{
  it.each(navGroups.flatMap(group=>group.items.map(item=>[item.href])))("resolves menu route %s with its translated label",href=>{
    const trail=resolveRouteTrail(href);
    expect(trail.crumbs.at(-1)?.label).toMatchObject({kind:"i18n"});
    expect(trail.crumbs.at(-1)?.href).toBe(href);
    expect(trail.parentHref).toBe(href==="/today"?null:href.startsWith("/finance/")?"/finance":href.startsWith("/career/")?"/career":"/today");
  });
  it.each(investmentSections.filter(section=>section.id!=="overview"))("resolves investment section $id while keeping scope",section=>{
    expect(resolveRouteTrail(section.href)).toMatchObject({parentHref:"/finance/investments",keepParams:["scope"]});
    expect(resolveRouteTrail(section.href).crumbs.at(-1)?.label).toEqual({kind:"investment",key:section.key});
  });
  it.each([["/habits/synthetic-id","/habits","crumb.habit"],["/career/applications/synthetic-id","/career/applications","crumb.application"]])("uses a friendly page title fallback for %s",(path,parent,key)=>{
    const trail=resolveRouteTrail(path);
    expect(trail.parentHref).toBe(parent);
    expect(trail.crumbs.at(-1)?.label).toEqual({kind:"page",fallbackKey:key});
    expect(JSON.stringify(trail.crumbs)).not.toContain("synthetic-id");
  });
  it("covers every authenticated page file, including admin and finance imports",()=>{
    const base=join(process.cwd(),"src/app/(app)");
    for(const page of pages(base)) {
      const pattern="/"+relative(base,page).replaceAll("\\","/").replace(/\/page\.tsx$/,"");
      const paths=pattern.includes("[section]")?(pattern.startsWith("/career")?["/career/companies","/career/interviews","/career/contacts","/career/documents","/career/applications"]:investmentSections.map(section=>section.href)):[pattern.replace(/\[[^/]+\]/g,"synthetic-id")];
      for(const path of paths) expect(resolveRouteTrail(path).crumbs.length,`missing trail: ${path}`).toBeGreaterThan(1);
    }
    expect(resolveRouteTrail("/admin").crumbs.at(-1)?.label).toEqual({kind:"i18n",key:"nav.admin"});
    expect(resolveRouteTrail("/finance/imports").crumbs.at(-1)?.label).toEqual({kind:"i18n",key:"crumb.investment_import"});
  });
  it("uses the nearest registered ancestor for unknown paths and normalizes trailing slash",()=>{
    expect(resolveRouteTrail("/finance/accounts/unknown/deeper").parentHref).toBe("/finance/accounts");
    expect(resolveRouteTrail("/unknown").parentHref).toBe("/today");
    expect(resolveRouteTrail("/finance/accounts///")).toEqual(resolveRouteTrail("/finance/accounts"));
  });
  it("preserves only declared parameters, including empty values, without losing target query",()=>{
    expect(withKeptParams("/finance/investments",new URLSearchParams("scope=together&private=x"),["scope"])).toBe("/finance/investments?scope=together");
    expect(withKeptParams("/finance/investments?tab=one",new URLSearchParams("scope=mine"),["scope"])).toBe("/finance/investments?tab=one&scope=mine");
    expect(withKeptParams("/finance",new URLSearchParams("scope="),["scope"])).toBe("/finance?scope=");
  });
});

describe("tab-local back navigation",()=>{
  it("falls back on a direct visit and does not duplicate refreshes",()=>{
    const tab=storage();recordVisit("/finance?filter=one",tab);recordVisit("/finance?filter=one",tab);
    expect(backTarget("/finance?filter=one",tab)).toBeNull();
    expect(JSON.parse(tab.getItem("tbb-nav-history")!)).toEqual(["/finance?filter=one"]);
  });
  it("returns preserved filters and consumes its back marker without making a loop",()=>{
    const tab=storage();recordVisit("/today",tab);recordVisit("/finance?filter=one",tab);recordVisit("/finance/accounts",tab);
    expect(backTarget("/finance/accounts",tab)).toBe("/finance?filter=one");recordVisit("/finance?filter=one",tab);
    expect(backTarget("/finance?filter=one",tab)).toBe("/today");recordVisit("/today",tab);
    expect(backTarget("/today",tab)).toBeNull();
  });
  it("bounds history to the most recent fifty visits",()=>{
    const tab=storage();for(let i=0;i<80;i++)recordVisit(`/tasks?filter=${i}`,tab);
    const stack=JSON.parse(tab.getItem("tbb-nav-history")!);expect(stack).toHaveLength(50);expect(stack[0]).toBe("/tasks?filter=30");
  });
  it.each(["invalid","{}",'42','[null,12,"https://example.test","//example.test","/\\\\example.test"]'])("recovers from malformed or unsafe storage %s",value=>{
    const tab=storage({"tbb-nav-history":value});recordVisit("/finance",tab);expect(backTarget("/finance",tab)).toBeNull();
  });
  it("ignores unsafe destinations supplied to recordVisit",()=>{
    const tab=storage();for(const url of ["https://example.test","//example.test","/\\example.test"])recordVisit(url,tab);
    recordVisit("/finance",tab);expect(backTarget("/finance",tab)).toBeNull();
  });
});
