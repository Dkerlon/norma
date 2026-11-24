from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

OUT = Path('output')
OUT.mkdir(exist_ok=True)
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(.7); section.bottom_margin = Inches(.7)
section.left_margin = Inches(.8); section.right_margin = Inches(.8)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(10.5)
for style in ['Heading 1', 'Heading 2']:
    styles[style].font.name = 'Aptos Display'; styles[style].font.color.rgb = RGBColor(0,0,0)

def shade(cell, color='173B53'):
    tcPr = cell._tc.get_or_add_tcPr(); shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), color); tcPr.append(shd)
def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers)); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.style = 'Table Grid'
    for cell, text in zip(t.rows[0].cells, headers):
        cell.text=text; shade(cell); cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        for run in cell.paragraphs[0].runs: run.font.color.rgb=RGBColor(255,255,255); run.font.bold=True
    for row in rows:
        cells=t.add_row().cells
        for cell,text in zip(cells,row): cell.text=str(text); cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    doc.add_paragraph()
def para(text, bold=None):
    p=doc.add_paragraph(); r=p.add_run(text); r.bold=bool(bold); p.paragraph_format.space_after=Pt(7); return p
def page(): doc.add_page_break()

p=doc.add_paragraph(); p.style='Title'; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Relatório técnico de engenharia do Norma Lab')
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Simulador e compilador da Máquina de Registradores Norma')
doc.add_paragraph('\n')
table(['Identificação','Preenchimento'],[
 ['Disciplina','Análise de Computabilidade e Complexidade de Algoritmos'],['Professor','Cláudio Filgueira'],['Curso','Ciência da Computação / Engenharia de Software'],['Integrantes e RAs','PREENCHER ANTES DA ENTREGA'],['Data','PREENCHER ANTES DA ENTREGA']])
para('Este relatório descreve a implementação, a validação e o roteiro de demonstração do simulador Norma Lab. A aplicação executa as primitivas INC, DEC e TST, expande macros em instruções primitivas e disponibiliza execução contínua ou passo a passo.')
page()

doc.add_heading('1 Objetivo e escopo',1)
para('O objetivo do projeto é simular a Máquina de Registradores Norma preservando o domínio dos números naturais e permitindo que programas sejam testados em uma interface gráfica. O simulador oferece registradores de precisão arbitrária, rótulos, execução por ciclos e limite defensivo contra loops.')
doc.add_heading('2 Arquitetura do software',1)
para('A interface Vue recebe o código-fonte e os valores iniciais. O compilador reconhece macros e produz uma lista de instruções primitivas. O interpretador mantém o ponteiro de instrução, a tabela de rótulos, os registradores e o contador de ciclos. A interface recebe o estado atualizado após cada passo.')
table(['Camada','Responsabilidade'],[['Interface Vue','Edição, importação, execução, inspeção e histórico'],['Compilador','Expansão de macros e validação de rótulos'],['Máquina MRN','Execução de INC, DEC e TST'],['Testes','Verificação de primitivas, macros, erros e limite de ciclos']])
doc.add_heading('3 Instruções primitivas',1)
table(['Instrução','Efeito'],[['INC R','Incrementa R e avança o IP'],['DEC R','Decrementa R somente quando R é maior que zero'],['TST R L0 L1','Desvia para L0 se R é zero; caso contrário, para L1']])
page()

doc.add_heading('4 Mapeamento de registradores',1)
table(['Registro','Uso'],[['A, B','Operandos de entrada'],['C','Auxiliar da soma preservativa e acumulador do produto'],['Q','Quociente da divisão inteira'],['R','Resto da divisão inteira'],['D, E, F','Temporários internos de multiplicação e divisão']])
doc.add_heading('5 Fluxo da soma preservativa',1)
para('Enquanto B for diferente de zero, o algoritmo decrementa B, incrementa A e registra a transferência em C. Depois, enquanto C for diferente de zero, o algoritmo decrementa C e incrementa B. Dessa forma, A recebe a soma e B retorna ao valor inicial.')
table(['Etapa','Operações'],[['Transferência','DEC B; INC A; INC C'],['Restauração','DEC C; INC B'],['Condição de parada','TST B e TST C']])
doc.add_heading('6 Fluxo da divisão inteira',1)
para('A divisão copia A para R preservando A. Em seguida, tenta subtrair B de R por transferências controladas para os temporários E e F. Cada subtração completa incrementa Q e restaura B. Quando a subtração não pode ser concluída, R contém o resto. A interface valida B maior que zero antes de iniciar a divisão.')
page()

doc.add_heading('7 Validação empírica',1)
para('A bateria automatizada executou as primitivas, decremento protegido, salto condicional, ZER, interrupção por limite de ciclos, diagnóstico de código inválido e os quatro casos obrigatórios.')
table(['Caso','Entrada','Resultado observado','Situação'],[['TC-01','A=5, B=3, C=0','A=8, B=3, C=0','Aprovado'],['TC-02','A=3, B=5','A=0','Aprovado'],['TC-03','A=4, B=3, C=0','A=4, B=3, C=12','Aprovado'],['TC-04','A=14, B=3','Q=4, R=2','Aprovado']])
doc.add_heading('8 Segurança e diagnósticos',1)
para('DEC protege o domínio dos naturais ao manter zero. A máquina encerra por defesa quando alcança o limite configurado. A interface rejeita divisão por zero antes da execução e mostra a mensagem correspondente. O compilador informa instruções inválidas e rótulos inexistentes.')
doc.add_heading('9 Roteiro de defesa oral',1)
para('Demonstre TC-01 passo a passo, destacando a restauração de B. Execute TC-02 para evidenciar a saturação em zero. Em seguida, rode TC-03 e TC-04, abrindo a aba de histórico. Por fim, apresente um laço proposital com limite pequeno e a validação de divisão por zero.')
page()

doc.add_heading('10 Conclusão',1)
para('O Norma Lab atende às primitivas da MRN, expande as macros solicitadas e fornece recursos de depuração para demonstração. A validação automatizada confirmou os quatro cenários obrigatórios e as proteções centrais do interpretador.')
doc.add_heading('Anexo A Preparação da entrega',1)
table(['Item','Conferência'],[['Código-fonte e README','Incluídos no repositório'],['Relatório','Preencher integrantes, RAs e data'],['Demonstração','Ensaiar a divisão dos módulos entre integrantes'],['Vercel','Build command: npm run build; output: dist']])
doc.save(OUT/'relatorio-tecnico-norma-lab.docx')
