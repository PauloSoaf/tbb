import { describe, expect, it, vi } from "vitest";
import { scheduledOpenFinanceSync } from "../../../../scripts/sync-open-finance.mjs";

const secret="synthetic-scheduler-secret-long-enough";
const run=(status:number,results:unknown[])=>scheduledOpenFinanceSync({secret,request:vi.fn(async()=>new Response(JSON.stringify({connections:results.length,results}),{status}))});
describe("local scheduled runner",()=>{
  it("does not mistake HTTP 207 or an HTTP 200 failed run for success",async()=>{
    for(const status of [200,207,503])expect(await run(status,[{status:"ERROR",errorCode:"NETWORK_TIMEOUT",privateValue:"never recorded"}])).toMatchObject({succeeded:false,httpStatus:status});
  });
  it("accepts a successful run and a run with nothing due",async()=>{
    expect(await run(200,[{status:"SUCCESS"}])).toMatchObject({succeeded:true});
    expect(await run(200,[])).toMatchObject({succeeded:true});
  });
  it("keeps provider bodies and identifiers out of its diagnostic",async()=>{
    const result=await run(503,[{status:"ERROR",errorCode:"confidential-bank-data",privateValue:"confidential-bank-data"}]);
    expect(JSON.stringify(result)).not.toContain("confidential-bank-data");
    expect(result).not.toHaveProperty("results");
  });
  it("records only recognized provider failure codes",async()=>{
    expect(await run(503,[{status:"ERROR",errorCode:"NETWORK_TIMEOUT"}])).toMatchObject({succeeded:false,errorCode:"NETWORK_TIMEOUT"});
  });
  it("rejects an HTML or malformed response and distinguishes a local timeout",async()=>{
    expect(await scheduledOpenFinanceSync({secret,request:vi.fn(async()=>new Response("<html>login</html>"))})).toMatchObject({succeeded:false,errorCode:"UNEXPECTED_RESPONSE"});
    expect(await scheduledOpenFinanceSync({secret,request:vi.fn(async()=>{throw Object.assign(new Error("private URL"),{name:"TimeoutError"});})})).toMatchObject({succeeded:false,errorCode:"LOCAL_APP_TIMEOUT"});
  });
});
