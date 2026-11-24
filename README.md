# Norma Lab

Aplicação Vue + TypeScript, sem backend, para compilar e simular programas da Máquina de Registradores Norma (MRN). O projeto é estático e pode ser publicado diretamente na Vercel.

## Executar localmente

```bash
npm install
npm run dev
```

Para validar o projeto:

```bash
npm test
npm run build
```

## Linguagem

As instruções primitivas aceitas são:

```text
INC A
DEC A
TST A ROTULO_ZERO ROTULO_NAO_ZERO
ROTULO: INC A
```

O compilador aceita ainda as macros `ZER R`, `A := A + B COM C`, `A := A .- B`, `C := A * B` e `Q := A div B, R := A mod B`. As macros são expandidas para primitivas antes de a máquina iniciar. Os valores iniciais usam a forma `A=5, B=3` e são tratados como naturais de precisão arbitrária.

`B` deve ser maior que zero em `Q := A div B, R := A mod B`. A interface recusa a execução quando essa pré-condição não é atendida.

## Roteiro de demonstração

1. Escolha um dos quatro cenários TC-01 a TC-04.
2. Confira os valores iniciais no rodapé do editor.
3. Use **Passo** para acompanhar IP, instrução e registradores, ou **Executar** para finalizar.
4. Para demonstrar a proteção, execute `DEC A` com `A=0`.
5. Reduza o limite de ciclos para mostrar a interrupção defensiva em um laço proposital.

## Relatório

O modelo preenchido do relatório técnico está em `output/relatorio-tecnico-norma-lab.docx`. Antes da entrega, complete os nomes, RAs e a data na capa.

## Publicação na Vercel

Importe o repositório e mantenha os padrões: comando de build `npm run build` e diretório de saída `dist`. Não há variáveis de ambiente nem serviços externos.
