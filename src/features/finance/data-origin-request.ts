import { cookies } from "next/headers";
import { parseFinanceOrigin } from "./data-origin";

export async function currentFinanceOrigin() {
  return parseFinanceOrigin((await cookies()).get("tbb-finance-origin")?.value);
}
