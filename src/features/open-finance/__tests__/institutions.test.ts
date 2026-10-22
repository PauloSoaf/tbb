import { describe, expect, it } from "vitest";
import { connectionInstitution } from "../institutions";

describe("institution labels", () => {
  it("recognises Itaú and PicPay spelling variants without depending on an account number", () => {
    expect(connectionInstitution(["MeuPluggy", "ITAÚ UNIBANCO"])?.id).toBe("itau");
    expect(connectionInstitution([null, "Itaucard Platinum"])?.id).toBe("itau");
    expect(connectionInstitution(["Conta Pic Pay"])?.id).toBe("picpay");
    expect(connectionInstitution(["NU PAGAMENTOS"])?.id).toBe("nubank");
  });
  it("does not attribute unknown or conflicting labels to a bank", () => {
    expect(connectionInstitution(["MeuPluggy", "Conta corrente"])).toBeNull();
    expect(connectionInstitution(["Nubank", "Cartão Itaú"])).toBeNull();
    expect(connectionInstitution(["Cooperativa Itaúna"])).toBeNull();
  });
});
