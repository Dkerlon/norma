import { describe, expect, it } from 'vitest'
import { compile, Machine } from './mrn'
const execute=(source:string, regs:Record<string,bigint>, limit=10000)=>{ const m=new Machine(compile(source),regs); expect(m.run(limit)).toBe('halted'); return m }
describe('MRN primitives',()=>{
 it('protects zero from underflow',()=>{ const m=execute('DEC A',{A:0n}); expect(m.value('A')).toBe(0n) })
 it('branches through TST labels',()=>{ const m=execute('TST A ZERO NZ\nZERO: INC B\nNZ: INC C',{A:0n}); expect(m.value('B')).toBe(1n); expect(m.value('C')).toBe(1n) })
 it('expands ZER using primitives',()=>{ const m=execute('ZER A',{A:91n}); expect(m.value('A')).toBe(0n) })
 it('interrupts a non-terminating program at the clock limit',()=>{ const m=new Machine(compile('LOOP: TST A LOOP LOOP'),{A:0n}); expect(m.run(25)).toBe('limit'); expect(m.state.cycles).toBe(25) })
 it('rejects invalid source and missing labels',()=>{ expect(()=>compile('INC AA')).toThrow('Instrução inválida'); expect(()=>compile('TST A X Y')).toThrow('Rótulo não encontrado') })
})
describe('required scenarios',()=>{
 it('TC-01 preserves B while adding',()=>{ const m=execute('A := A + B COM C',{A:5n,B:3n,C:0n}); expect([m.value('A'),m.value('B'),m.value('C')]).toEqual([8n,3n,0n]) })
 it('TC-02 saturates subtraction',()=>{ const m=execute('A := A .- B',{A:3n,B:5n}); expect(m.value('A')).toBe(0n) })
 it('TC-03 multiplies',()=>{ const m=execute('C := A * B',{A:4n,B:3n,C:0n}); expect(m.value('C')).toBe(12n) })
 it('TC-04 divides and keeps the remainder',()=>{ const m=execute('Q := A div B, R := A mod B',{A:14n,B:3n}); expect([m.value('Q'),m.value('R')]).toEqual([4n,2n]) })
 it('handles zero operands in multiplication and division',()=>{ expect(execute('C := A * B',{A:0n,B:9n,C:4n}).value('C')).toBe(0n); const m=execute('Q := A div B, R := A mod B',{A:0n,B:3n}); expect([m.value('Q'),m.value('R')]).toEqual([0n,0n]) })
})
