export type Primitive = { op: 'INC' | 'DEC'; register: string; source: string } | { op: 'TST'; register: string; zero: string; nonZero: string; source: string }
export type Program = { instructions: Primitive[]; labels: Map<string, number>; source: string[] }
export type Snapshot = { ip: number; cycles: number; registers: Map<string, bigint>; last?: string }

let sequence = 0
const tag = (prefix: string) => `${prefix}_${sequence++}`
const zero = (r: string, end = tag('Z_END'), loop = tag('Z_LOOP')) => `${loop}: TST ${r} ${end} ${loop}_DEC\n${loop}_DEC: DEC ${r}\nTST ${r} ${end} ${loop}_DEC\n${end}:`
const add = (a: string, b: string, c: string) => { const l=tag('ADD'), w=tag('ADD_WORK'), r=tag('ADD_RESTORE'), rw=tag('ADD_RESTORE_WORK'), e=tag('ADD_END'); return `${l}: TST ${b} ${r} ${w}\n${w}: DEC ${b}\nINC ${a}\nINC ${c}\nTST ${b} ${r} ${w}\n${r}: TST ${c} ${e} ${rw}\n${rw}: DEC ${c}\nINC ${b}\nTST ${c} ${e} ${rw}\n${e}:` }
const sub = (a: string, b: string) => { const l=tag('SUB'), d=tag('SUB_DEC'), e=tag('SUB_END'); return `${l}: TST ${b} ${e} ${d}\n${d}: DEC ${b}\nTST ${a} ${e} ${d}_A\n${d}_A: DEC ${a}\nTST ${b} ${e} ${d}\n${e}:` }
const mul = (c:string,a:string,b:string) => { const outer=tag('MUL_OUTER'), takeA=tag('MUL_TAKE_A'), inner=tag('MUL_INNER'), takeB=tag('MUL_TAKE_B'), restoreB=tag('MUL_RESTORE_B'), rb=tag('MUL_RB'), restoreA=tag('MUL_RESTORE_A'), ra=tag('MUL_RA'), end=tag('MUL_END'); return `${zero(c)}\n${zero('D')}\n${zero('E')}\n${outer}: TST ${a} ${restoreA} ${takeA}\n${takeA}: DEC ${a}\nINC D\n${inner}: TST ${b} ${restoreB} ${takeB}\n${takeB}: DEC ${b}\nINC E\nINC ${c}\nTST ${b} ${restoreB} ${takeB}\n${restoreB}: TST E ${outer} ${rb}\n${rb}: DEC E\nINC ${b}\nTST E ${outer} ${rb}\n${restoreA}: TST D ${end} ${ra}\n${ra}: DEC D\nINC ${a}\nTST D ${end} ${ra}\n${end}:` }
const div = (q:string,a:string,b:string,r:string) => {
  const copy=tag('COPY'), take=tag('COPY_TAKE'), back=tag('COPY_BACK'), restore=tag('COPY_RESTORE')
  const loop=tag('DIV_LOOP'), checkR=tag('DIV_CHECK_R'), move=tag('DIV_MOVE'), success=tag('DIV_SUCCESS'), incQ=tag('DIV_INC_Q'), restoreB=tag('DIV_RESTORE_B'), rb=tag('DIV_RB'), clearF=tag('DIV_CLEAR_F'), clearFW=tag('DIV_CLEAR_F_WORK'), fail=tag('DIV_FAIL'), restoreR=tag('DIV_RESTORE_R'), restoreBFail=tag('DIV_RESTORE_B_FAIL'), rbf=tag('DIV_RBF'), end=tag('DIV_END')
  return `${zero(q)}\n${zero(r)}\n${zero('D')}\n${zero('E')}\n${zero('F')}\n${copy}: TST ${a} ${back} ${take}\n${take}: DEC ${a}\nINC ${r}\nINC D\nTST ${a} ${back} ${take}\n${back}: TST D ${loop} ${restore}\n${restore}: DEC D\nINC ${a}\nTST D ${loop} ${restore}\n${loop}: TST ${b} ${success} ${checkR}\n${checkR}: TST ${r} ${fail} ${move}\n${move}: DEC ${b}\nINC E\nDEC ${r}\nINC F\nTST ${b} ${success} ${checkR}\n${success}: TST E ${restoreB} ${incQ}\n${incQ}: INC ${q}\nTST E ${restoreB} ${restoreB}\n${restoreB}: TST E ${clearF} ${rb}\n${rb}: DEC E\nINC ${b}\nTST E ${clearF} ${rb}\n${clearF}: TST F ${loop} ${clearFW}\n${clearFW}: DEC F\nTST F ${loop} ${clearFW}\n${fail}: TST F ${restoreBFail} ${restoreR}\n${restoreR}: DEC F\nINC ${r}\nTST F ${restoreBFail} ${restoreR}\n${restoreBFail}: TST E ${end} ${rbf}\n${rbf}: DEC E\nINC ${b}\nTST E ${end} ${rbf}\n${end}:`
}

// Division and copy are built explicitly below to keep emitted code limited to the MRN primitives.
function expandLine(line: string): string {
  const clean=line.trim(); let m: RegExpMatchArray | null
  if ((m=clean.match(/^ZER\s+([A-Z])$/i))) return zero(m[1].toUpperCase())
  if ((m=clean.match(/^([A-Z])\s*:=\s*\1\s*\+\s*([A-Z])(?:\s+COM\s+([A-Z]))?$/i))) return add(m[1].toUpperCase(),m[2].toUpperCase(),(m[3]||'C').toUpperCase())
  if ((m=clean.match(/^([A-Z])\s*:=\s*\1\s*\.\-\s*([A-Z])$/i))) return sub(m[1].toUpperCase(),m[2].toUpperCase())
  if ((m=clean.match(/^([A-Z])\s*:=\s*([A-Z])\s*\*\s*([A-Z])$/i))) return mul(m[1].toUpperCase(),m[2].toUpperCase(),m[3].toUpperCase())
  if ((m=clean.match(/^([A-Z])\s*:=\s*([A-Z])\s+div\s+([A-Z])\s*,\s*([A-Z])\s*:=\s*\2\s+mod\s+\3$/i))) return div(m[1].toUpperCase(),m[2].toUpperCase(),m[3].toUpperCase(),m[4].toUpperCase())
  return clean
}

export function compile(source: string): Program {
  sequence=0
  const expanded = source
    .split(/\r?\n/)
    .map((line) => line.replace(/[;#].*$/, '').trim())
    .filter(Boolean)
    .flatMap((line) => expandLine(line).split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean)
  const labels = new Map<string,number>(); const raw: string[]=[]
  for (const line of expanded) { const found=line.match(/^([A-Za-z][\w]*):\s*(.*)$/); if(found){ labels.set(found[1].toUpperCase(), raw.length); if(found[2]) raw.push(found[2]) } else raw.push(line) }
  const instructions: Primitive[] = raw.map((line) => { const p=line.trim().split(/\s+/); const op=p[0]?.toUpperCase(); if((op==='INC'||op==='DEC') && /^[A-Z]$/i.test(p[1]||'')) return {op,register:p[1].toUpperCase(),source:line}; if(op==='TST'&& /^[A-Z]$/i.test(p[1]||'')&&p[2]&&p[3]) return {op,register:p[1].toUpperCase(),zero:p[2].toUpperCase(),nonZero:p[3].toUpperCase(),source:line}; throw new Error(`Instrução inválida: “${line}”. Use INC R, DEC R ou TST R L_ZERO L_NÃO_ZERO.`) })
  for (const instruction of instructions) {
    if (instruction.op === 'TST' && (!labels.has(instruction.zero) || !labels.has(instruction.nonZero))) {
      throw new Error(`Rótulo não encontrado em: ${instruction.source}`)
    }
  }
  return {instructions,labels,source:raw}
}

export class Machine {
  state: Snapshot
  constructor(public program: Program, initial: Record<string,bigint>={}) { this.state={ip:0,cycles:0,registers:new Map(Object.entries(initial).map(([k,v])=>[k.toUpperCase(),v]))} }
  value(r:string) { return this.state.registers.get(r) ?? 0n }
  step(): 'running'|'halted' {
    const instruction = this.program.instructions[this.state.ip]
    if (!instruction) return 'halted'
    if (instruction.op === 'TST') {
      this.state.ip = this.program.labels.get(this.value(instruction.register) === 0n ? instruction.zero : instruction.nonZero)!
    } else if (instruction.op === 'INC') {
      this.state.registers.set(instruction.register, this.value(instruction.register) + 1n)
      this.state.ip++
    } else {
      if (this.value(instruction.register) > 0n) this.state.registers.set(instruction.register, this.value(instruction.register) - 1n)
      this.state.ip++
    }
    this.state.cycles++
    this.state.last = instruction.source
    return this.state.ip >= this.program.instructions.length ? 'halted' : 'running'
  }
  run(limit:number) { while(this.state.cycles<limit && this.step()==='running'){} return this.state.ip>=this.program.instructions.length ? 'halted' : 'limit' }
}
