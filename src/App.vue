<script setup lang="ts">
import { computed, ref } from 'vue'
import { compile, Machine, type Program } from './mrn'

const samples = {
  'TC-01 · Soma preservativa': { source: 'A := A + B COM C', registers: 'A=5, B=3, C=0' },
  'TC-02 · Subtração monótona': { source: 'A := A .- B', registers: 'A=3, B=5' },
  'TC-03 · Multiplicação': { source: 'C := A * B', registers: 'A=4, B=3, C=0' },
  'TC-04 · Divisão e resto': { source: 'Q := A div B, R := A mod B', registers: 'A=14, B=3' },
  'Primitivas · demonstração': { source: '; Rótulos e instruções primitivas\nINICIO: TST A FIM DEC_A\nDEC_A: DEC A\nINC B\nTST A FIM DEC_A\nFIM:', registers: 'A=3, B=0' }
} as const
const selected = ref<keyof typeof samples>('TC-01 · Soma preservativa')
const source = ref<string>(samples[selected.value].source), registerText = ref<string>(samples[selected.value].registers)
const limit = ref(100000), machine = ref<Machine | null>(null), program = ref<Program | null>(null), message = ref('Pronto para compilar e executar.'), halted = ref(false), history = ref<string[]>([]), compileMs = ref<number | null>(null)
const programName = ref('principal.nrm'), macroSearch = ref(''), showScenarios = ref(true), showMacros = ref(true), activeBottom = ref<'output'|'history'>('history'), modal = ref<'help'|'preferences'|null>(null), editorFontSize = ref(13)
const macros = [
  { name: 'ZER(R)', description: 'Zera o registo R', snippet: 'ZER R' },
  { name: 'ADD(A, B)', description: 'Soma B a A e preserva B', snippet: 'A := A + B COM C' },
  { name: 'SUB(A, B)', description: 'Subtração limitada em N', snippet: 'A := A .- B' },
  { name: 'MUL(C, A, B)', description: 'Calcula A × B em C', snippet: 'C := A * B' },
  { name: 'DIV(Q, A, B, R)', description: 'Calcula quociente e resto', snippet: 'Q := A div B, R := A mod B' }
]
const filteredMacros = computed(() => macros.filter((macro) => `${macro.name} ${macro.description}`.toLocaleLowerCase().includes(macroSearch.value.toLocaleLowerCase())))
const parseRegisters = () => Object.fromEntries(registerText.value.split(',').filter(Boolean).map(part => { const [name,value] = part.trim().split('='); if(!/^[A-Z]$/i.test(name||'') || !/^\d+$/.test(value||'')) throw new Error('Use valores naturais: A=5, B=3.'); return [name.toUpperCase(),BigInt(value)] })) as Record<string,bigint>
const boot = () => {
  const initial = parseRegisters()
  const division = source.value.match(/:=\s*[A-Z]\s+div\s+([A-Z])/i)
  if (division && (initial[division[1].toUpperCase()] ?? 0n) === 0n) throw new Error(`Divisão por zero: o registrador ${division[1].toUpperCase()} deve ser maior que zero.`)
  const started = performance.now()
  program.value=compile(source.value); machine.value=new Machine(program.value,initial); compileMs.value=performance.now()-started; halted.value=false; history.value=[]; message.value=`Compilação concluída: ${program.value.instructions.length} instruções primitivas.`
}
const step = () => { try { if(!machine.value) boot(); const m=machine.value!; if(halted.value) return; const result=m.step(); history.value.unshift(`${m.state.cycles.toString().padStart(4,'0')} · IP ${m.state.ip} · ${m.state.last}`); halted.value=result==='halted'; message.value=halted.value?'Programa encerrado normalmente.':'Uma instrução foi executada.' } catch(e) { message.value=(e as Error).message } }
const run = () => { try { if(!machine.value) boot(); const m=machine.value!; while(m.state.cycles<limit.value && !halted.value){ const result=m.step(); history.value.unshift(`${m.state.cycles.toString().padStart(4,'0')} · IP ${m.state.ip} · ${m.state.last}`); halted.value=result==='halted' } if(history.value.length>500) history.value.length=500; message.value=halted.value?'Programa encerrado normalmente.':`Execução interrompida pelo limite de ${limit.value} ciclos.` } catch(e) { message.value=(e as Error).message } }
const reset = () => { machine.value=null; program.value=null; compileMs.value=null; halted.value=false; history.value=[]; message.value='Estado reiniciado.' }
const registers = computed(() => [...(machine.value?.state.registers ?? new Map())].sort(([a],[b])=>a.localeCompare(b)))
const displayRegisters = computed(() => {
  let initial: Record<string, bigint> = {}
  try { initial = parseRegisters() } catch { /* tabela vazia até a correção */ }
  const values = machine.value?.state.registers ?? new Map(Object.entries(initial))
  return ['A', 'B', 'C', 'Q', 'R'].map((name) => [name, values.get(name) ?? 0n] as const)
})
const codeLines = computed(() => Math.max(source.value.split(/\r?\n/).length, 18))
const ip = computed(()=>machine.value?.state.ip ?? 0)
const cycles = computed(()=>machine.value?.state.cycles ?? 0)
const onSample=()=>{ const s=samples[selected.value]; source.value=s.source; registerText.value=s.registers; reset() }
const loadSample = (name: keyof typeof samples) => { selected.value = name; onSample(); programName.value = 'principal.nrm' }
const newProgram = () => { source.value = '; Escreva o seu programa Norma aqui\n'; registerText.value = 'A=0, B=0, C=0'; programName.value = 'sem-nome.nrm'; reset(); message.value = 'Novo programa criado. Defina o código e os valores iniciais.' }
const insertMacro = (snippet: string) => { source.value = `${source.value.trimEnd()}${source.value.trim() ? '\n' : ''}${snippet}\n`; message.value = `Macro ${snippet} inserida no editor.` }
const importFile=(event:Event)=>{ const file=(event.target as HTMLInputElement).files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ source.value=String(reader.result); programName.value=file.name; reset(); message.value=`Arquivo ${file.name} carregado.` }; reader.readAsText(file) }
</script>

<template>
  <main class="workbench">
    <header class="topbar"><div class="brand"><span>{N}</span><strong>Norma Lab</strong><i></i><small>Simulador da Máquina de Registos Norma (MRN)</small></div><nav><button @click="modal='help'">ⓘ Ajuda</button><button @click="modal='preferences'">⚙ Preferências</button></nav></header>
    <section class="commandbar"><label>Cenário:<select v-model="selected" @change="onSample"><option v-for="(_, name) in samples" :key="name">{{ name }}</option></select></label><label class="open-file">Abrir arquivo<input type="file" accept=".norma,.txt,text/plain" @change="importFile"></label><button class="run" @click="run">▶ Executar</button><button @click="step">▷ Passo</button><button @click="reset">⟳ Reiniciar</button><i></i><label>Limite de ciclos:<input v-model.number="limit" type="number" min="1" step="1000"></label><span class="ready"><b></b>{{ halted ? 'Encerrado' : 'Pronto' }}</span></section>
    <section class="main-grid">
      <aside class="program-tree panel"><div class="panel-title"><h2>Programa</h2></div><button class="file-active">▧ &nbsp; {{ programName }}</button><button class="tree-action" @click="newProgram">＋ &nbsp; Novo programa...</button><button class="tree-heading" @click="showScenarios=!showScenarios">▱ &nbsp; Cenários (exemplos) <span>{{ showScenarios ? '⌃' : '⌄' }}</span></button><ul v-show="showScenarios"><li v-for="(_, name) in samples" :key="name" @click="loadSample(name)">▧ &nbsp; {{ name }}</li></ul><button class="macro-head" @click="showMacros=!showMacros">Biblioteca de macros <span>{{ showMacros ? '⌃' : '⌄' }}</span></button><template v-if="showMacros"><label class="search">⌕<input v-model="macroSearch" placeholder="Pesquisar macro..."></label><dl><template v-for="macro in filteredMacros" :key="macro.name"><dt @click="insertMacro(macro.snippet)">{{ macro.name }}</dt><dd @click="insertMacro(macro.snippet)">{{ macro.description }}</dd></template><dd v-if="!filteredMacros.length" class="no-results">Nenhuma macro encontrada.</dd></dl></template><p class="side-note">ⓘ &nbsp; Clique em uma macro para inseri-la no editor.</p></aside>
      <section class="editor panel"><div class="panel-title"><h1>Código Norma</h1><span>{{ programName }}</span></div><div class="code-zone"><ol class="line-numbers"><li v-for="line in codeLines" :key="line" :class="{active: line - 1 === ip}">{{ line }}</li></ol><textarea v-model="source" :style="{fontSize: `${editorFontSize}px`}" spellcheck="false" aria-label="Código fonte Norma"></textarea></div></section>
      <aside class="machine panel"><div class="panel-title"><h2>Estado da máquina</h2></div><div class="execution"><b>▶ &nbsp;{{ halted ? 'Encerrado' : machine ? 'Em execução' : 'Pronto' }}</b><span>Ciclos: {{ cycles }}</span></div><p class="ip">IP (próxima instrução): <strong>{{ ip }}</strong> <code>{{ machine?.state.last ? `(${machine.state.last})` : '—' }}</code></p><h3>Registos ativos</h3><table><thead><tr><th>Registo</th><th>Valor (inteiro, ≥ 0)</th></tr></thead><tbody><tr v-for="[name,value] in displayRegisters" :key="name"><td>{{ name }}</td><td>{{ value }}</td></tr></tbody></table><section class="information"><h3>Informações</h3><p>ⓘ &nbsp; Instrução atual: &nbsp;{{ machine?.state.last ?? '—' }}</p><p>ⓘ &nbsp; Última executada: &nbsp;{{ history[0] ?? '—' }}</p><p>⚑ &nbsp; Limite de ciclos: &nbsp;{{ limit }}</p></section></aside>
    </section>
    <section class="bottom panel"><div class="bottom-tabs"><button :class="{selected:activeBottom==='output'}" @click="activeBottom='output'">◉ &nbsp; Saída de compilação</button><button :class="{selected:activeBottom==='history'}" @click="activeBottom='history'">☷ &nbsp; Histórico</button></div><div class="bottom-content"><div v-if="activeBottom==='output'" class="compile-output wide"><p :class="{success: !!program}">◉ &nbsp; {{ program ? 'Compilação concluída com sucesso.' : message }}</p><p>Instruções: &nbsp;{{ program?.instructions.length ?? 0 }} (rótulos: {{ program?.labels.size ?? 0 }})</p><p>Macros expandidas: &nbsp;{{ (source.match(/:=|^\s*ZER\s+/gim) ?? []).length }}</p><p>Tempo: &nbsp;{{ compileMs === null ? '—' : `${compileMs.toFixed(2)} ms` }}</p></div><div v-else class="history-table wide"><table><thead><tr><th>#</th><th>IP</th><th>Instrução</th><th>A</th><th>B</th><th>C</th><th>Q</th><th>R</th></tr></thead><tbody><tr v-if="!history.length"><td colspan="8">O rastreio será preenchido ao executar o programa.</td></tr><tr v-for="(item,index) in history.slice(0,7)" :key="item"><td>{{ index + 1 }}</td><td>{{ ip }}</td><td>{{ item }}</td><td v-for="[name,value] in displayRegisters" :key="name">{{ value }}</td></tr></tbody></table></div></div></section>
    <div v-if="modal" class="modal-backdrop" @click.self="modal=null"><section class="modal"><button class="close" @click="modal=null">×</button><template v-if="modal==='help'"><h2>Ajuda rápida</h2><p>Use os cenários para carregar os quatro casos oficiais. Escreva primitivas <code>INC</code>, <code>DEC</code> e <code>TST</code>, ou clique numa macro para inseri-la.</p><ol><li>Defina os valores iniciais, por exemplo: <code>A=5, B=3, C=0</code>.</li><li>Use <b>Passo</b> para depurar ou <b>Executar</b> para concluir.</li><li>Acompanhe IP, registradores e histórico.</li></ol></template><template v-else><h2>Preferências</h2><label>Tamanho do texto no editor <input v-model.number="editorFontSize" type="range" min="11" max="18"><b>{{ editorFontSize }} px</b></label><p>Esta opção é aplicada imediatamente e fica ativa enquanto a página estiver aberta.</p></template></section></div>
  </main>
</template>
