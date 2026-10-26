import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({permission:vi.fn(),shared:vi.fn(),sync:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{}}));
vi.mock("@/lib/workspace",()=>({requirePermission:mocks.permission}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("../setup",()=>({syncEverything:mocks.sync}));
vi.mock("../pluggy-client",async importOriginal=>({...await importOriginal<typeof import("../pluggy-client")>(),sharedPluggyClient:mocks.shared}));
import { POST } from "@/app/api/open-finance/sync/route";
import { PluggyError } from "../pluggy-client";
const request=()=>new Request("http://localhost/api/open-finance/sync",{method:"POST",body:JSON.stringify({connectionId:"synthetic"})});
beforeEach(()=>{vi.clearAllMocks();mocks.permission.mockResolvedValue({workspaceId:"synthetic",role:"OWNER"});mocks.shared.mockReturnValue({});});
describe("sync HTTP errors",()=>{
  it("returns a safe timeout response rather than a not-found response",async()=>{
    mocks.sync.mockRejectedValue(new PluggyError("NETWORK_TIMEOUT"));
    const response=await POST(request());
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({code:"NETWORK_TIMEOUT",error:expect.stringContaining("não respondeu a tempo")});
  });
  it("keeps raw internal errors and private details out of the response",async()=>{
    mocks.sync.mockRejectedValue(new Error("confidential-bank-details"));
    const response=await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("confidential-bank-details");
  });
  it("reports a failed sync summary as an upstream error",async()=>{
    mocks.sync.mockResolvedValue({status:"ERROR",errorCode:"NETWORK_TIMEOUT",autoCreated:0,needsReview:0});
    expect((await POST(request())).status).toBe(504);
  });
  it("does not let a non-owner trigger provider access",async()=>{
    mocks.permission.mockResolvedValue({workspaceId:"synthetic",role:"MEMBER"});
    expect((await POST(request())).status).toBe(403);
    expect(mocks.shared).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
