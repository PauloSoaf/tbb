import {describe,expect,it} from 'vitest';
import {calculateFixedExpenses} from '../fixed-expenses';
const posted=(amountCents:number)=>({description:'Alimentação',merchant:null,amountCents});
describe('planned fixed commitments',()=>{
  it('reserves monthly expenses before any purchase is posted',()=>{expect(calculateFixedExpenses([],[],[{name:'Alimentação',amountCents:8000}])).toMatchObject({amountCents:8000,postedCents:0});});
  it('does not add the same paid expense on top of the prediction',()=>{expect(calculateFixedExpenses([posted(3000),posted(4000)],[],[{name:'Alimentação',amountCents:8000}])).toMatchObject({amountCents:8000,postedCents:7000});});
  it('uses actual spending once it exceeds the planned budget',()=>{expect(calculateFixedExpenses([posted(9000)],[],[{name:'Alimentação',amountCents:8000}]).amountCents).toBe(9000);});
  it('nets duplicate planned names before matching paid spending',()=>{expect(calculateFixedExpenses([posted(9000)],[],[{name:'Alimentação',amountCents:3000},{name:'ALIMENTACAO',amountCents:4000}]).amountCents).toBe(9000);});
  it('does not duplicate a subscription that is also planned or already posted',()=>{
    const subscription={name:'Alimentação',merchant:null,amountCents:8000,billingCycle:'MONTHLY',customDays:null};
    expect(calculateFixedExpenses([], [subscription], [{name:'Alimentação',amountCents:8000}]).amountCents).toBe(8000);
    expect(calculateFixedExpenses([posted(8000)], [subscription]).amountCents).toBe(8000);
  });
});
