
import { describe, expect, it } from "vitest";
import { dither } from "../ui/Dither";
describe("Dither", () => {
  it("0", () => { let c=0; for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(dither(x,y,0))c++; expect(c).toBe(0); });
  it("1", () => { let c=0; for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(dither(x,y,1))c++; expect(c).toBe(16); });
  it("0.5", () => { let c=0; for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(dither(x,y,0.5))c++; expect(c).toBe(8); });
});
