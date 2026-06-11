# Manual Tecnico SONDACAD

Versao do manual: 2026-06-11  
Aplicacao: SONDACAD - plataforma CAD Sondamais para croquis de sondagem e perfil estratigrafico 3D

## 1. Objetivo

O SONDACAD foi criado para facilitar a producao de croquis de sondagem de solo, locacao de pontos SP, cotagem do terreno, criacao de ruas/passeios e visualizacao do perfil estratigrafico em 3D.

O foco da ferramenta e reduzir tarefas repetitivas de CAD em croquis de sondagem, mantendo comandos familiares para usuarios que ja usam AutoCAD.

## 2. Fluxo recomendado de trabalho

1. Abrir ou criar um croqui novo.
2. Ajustar a area de trabalho com os botoes `E`, `D`, `Faixa`, `Livre` e `Layout`.
3. Criar ou importar o terreno.
4. Inserir os pontos de sondagem `SP`.
5. Renomear os pontos em ordem cartesiana com `Renomear SP X/Y`, se necessario.
6. Inserir ruas, passeios, textos e observacoes.
7. Criar cotas manuais ou usar `Auto X/Y SP`.
8. Preencher profundidade, cota topografica e camadas dos SPs.
9. Abrir `Perfil 3D` e atualizar o perfil.
10. Importar ficha Sondamais PDF, quando houver.
11. Exportar o desenho em PDF, DXF, DWG/DXF, SVG, JSON, Modelo 2D, Modelo 3D ou 2D+3D.

## 3. Interface principal

### 3.1 Barra superior

A barra superior contem comandos de arquivo, layout, importacao e exportacao. As caixas dessa barra podem ser arrastadas para reorganizar a ordem dos comandos.

- `TB-` e `TB+`: diminuem ou aumentam o tamanho da barra de ferramentas.
- `E`: mostra ou oculta o painel esquerdo.
- `D`: mostra ou oculta o painel direito.
- `Faixa`: mostra ou oculta a faixa de comandos CAD.
- `Livre`: libera a maior area possivel para desenho.
- `Layout`: restaura o layout padrao.
- `Novo`: cria um novo croqui.
- `Apagar lote`: remove o lote/terreno atual.
- `Desfazer`: desfaz o ultimo comando.
- `Enquadrar`: centraliza o desenho na tela.
- `Importar`: importa arquivos de referencia.
- `PDF CAD`: tenta importar PDF vetorial como entidades CAD.
- `Exportar`: abre opcoes de exportacao PDF 2D e PDF 3D.

### 3.2 Faixa de comandos

A faixa e dividida em blocos:

- `Base`: selecionar, objeto, segmento, pan, terreno e SP.
- `Desenho`: linha, polilinha, retangulo, circulo, arco, rua e passeio.
- `Modificar`: move, copiar, rotacionar, espelhar, stretch, escala, matriz, trim, offset, fillet, curvas, join e explode.
- `Anotacao`: cota, cota continua, texto, RUA, PASSEIO e Auto X/Y SP.

Os blocos e os botoes podem ser arrastados para reorganizar a barra. A configuracao da barra superior, dos blocos e dos botoes fica salva no navegador.

### 3.3 Painel esquerdo

O painel esquerdo contem:

- Camadas visiveis do desenho.
- Biblioteca de elementos prontos.
- Lista de divisas.
- Estatisticas do modelo.

### 3.4 Painel direito

O painel direito contem:

- Dados do projeto.
- Propriedades do elemento selecionado.
- Distancias do SP ate o terreno.

## 4. Comandos basicos de desenho

### Selecionar

Use `Selecionar` ou tecla `V` para selecionar e mover elementos.

### Objeto

Use `Objeto` ou tecla `OB` para selecionar somente objetos CAD.

### Segmento

Use `Segmento` ou comando `SEG` para selecionar linhas, segmentos CAD e divisas do terreno.

### Pan

Use `Pan` ou tecla `P` para mover a vista do desenho.

### Terreno

Use `Terreno` ou tecla `G` para criar ou editar vertices do lote.

### SP

Use `SP`, `S` ou botao `SP` para inserir pontos de sondagem.

Cada ponto pode receber:

- Nome, como `SP-01`.
- Coordenadas X e Y.
- Cota topografica.
- Profundidade do furo.
- Comprimento de estaca.
- Informacao de rocha ou matacao.
- Camadas do solo.
- Observacoes.

## 5. Comandos de desenho CAD

### Linha

Atalho: `L`

Clique o ponto inicial e depois o ponto final. Para criar uma linha com distancia exata:

1. Acione `Linha`.
2. Clique o ponto inicial.
3. Digite a distancia, por exemplo `10`.
4. Aponte a direcao com o mouse.
5. Clique ou pressione `Enter`.

### Polilinha

Atalho: `PL`

Clique os vertices em sequencia. Pressione `Enter` para concluir. Pressione `C` para fechar a polilinha.

### Retangulo

Atalhos: `R` ou `REC`

Clique dois cantos opostos do retangulo.

### Circulo

Atalho: `C`

Clique o centro e depois informe o raio pelo mouse.

### Arco

Atalho: `A`

Clique centro, inicio e fim do arco.

### Rua

Atalhos: `RD` ou `RU`

Cria uma faixa de asfalto com largura padrao. A largura pode ser editada no painel direito.

### Passeio

Atalho: `PAS`

Cria passeio/guia com largura padrao de 2,5 m. A largura pode ser alterada no painel de propriedades.

## 6. Precisao: Snap, OSNAP e ORTHO

### Snap

O Snap aproxima o cursor da malha definida no campo `Snap`. Use quando quiser desenhar em incrementos fixos, como 0,5 m.

### OSNAP

Atalho: `F3`  
Comandos: `OSNAP`, `OS`, `OSNAPALL`, `OSNAPCLEAR`

O OSNAP captura pontos geometricos de objetos:

- Endpoint.
- Midpoint.
- Center.
- Node.
- Quadrant.
- Intersection.
- Extension.
- Perpendicular.
- Tangent.
- Parallel.
- Nearest.

Durante um comando ativo, pressione `Shift` para abrir a caixa de precisao e escolher os modos de captura.

### ORTHO

Atalho: `F5`

O ORTHO restringe o movimento a direcoes horizontais ou verticais. O acionamento pode ser configurado para:

- Shift.
- F5.
- Botao.
- Desligado.

## 7. Ferramentas de modificacao

### Move

Atalho: `M`

Move o objeto selecionado por deslocamento.

### Copiar

Atalhos: `CO` ou `CP`

Copia o objeto selecionado.

### Rotacionar

Atalho: `RO`

Rotaciona o objeto selecionado.

### Espelhar

Atalho: `MI`

Espelha o objeto selecionado.

### Stretch

Atalho: `ST`

Estica segmento, divisa ou vertice selecionado.

### Escala

Atalho: `SC`

Altera a escala do objeto selecionado.

### Matriz

Atalho: `AR`

Cria uma matriz retangular do objeto selecionado.

### Trim

Atalho: `TR`

Recorta linhas pelo limite do terreno.

### Offset

Atalhos: `O`, `OF`, `OFF` ou `OFFSET`

Cria uma copia paralela depois que voce informa a distancia e escolhe no desenho qual linha ou objeto sera deslocado. Funciona com linha, segmento, divisa do terreno, polilinha, rua, passeio, circulo e arco.

Fluxo recomendado:

1. Acione `Offset` ou digite `O`.
2. Informe a distancia em metros.
3. Clique na linha, divisa, segmento ou objeto que sera deslocado.
4. Escolha o lado `E` ou `D`. Valor negativo na distancia inverte o lado.

### Fillet

Atalho: `F`

Arredonda cantos de polilinhas, terreno, ruas e passeios.

### Curva terreno

Atalho: `CT`

Aplica arredondamento nos cantos do terreno.

### Curva calcada

Atalho: `CC`

Aplica arredondamento em calcada, rua ou polilinha selecionada.

### Join

Atalho: `J`

Junta linhas conectadas em uma polilinha ou poligono.

### Explode

Atalho: `X`

Explode retangulos, polilinhas, rua ou passeio em linhas individuais.

## 8. Cotas e anotacoes

### Cota

Atalho: `D`

Cria cotas entre dois pontos, SPs ou segmentos. A cota pode ser selecionada e arrastada para afastar do objeto mantendo linhas auxiliares retas.

### Cota continua

Atalho: `DC`

Cria cotas sequenciais. Clique o primeiro ponto e depois continue clicando nos proximos pontos.

### Auto X/Y SP

Atalho: `AXY`

Cria cotas automaticas entre pontos de sondagem e limites do terreno, separando referencias horizontais e verticais.

### Texto

Atalho: `T`

Insere texto livre.

### RUA e PASSEIO

Inserem textos padronizados no croqui.

## 9. Perfil 3D e estratigrafia

Abra a aba `Perfil 3D`.

### Informacoes usadas no perfil

O perfil 3D usa:

- Coordenadas X/Y dos SPs.
- Cota topografica, quando informada.
- Profundidade do furo.
- Comprimento de estaca, quando informado.
- Camadas do solo.
- Observacao de rocha ou matacao.

### Navegacao 3D

- Scroll: aproximar ou afastar.
- Scroll pressionado: pan.
- Shift + scroll: rotacionar.
- Shift + scroll pressionado: orbita livre.
- ViewCube: muda vista para TOP, ISO, N, S, E ou W.
- `NAVVCUBE ON/OFF`: mostra ou oculta o cubo.
- `NAVBAR ON/OFF`: mostra ou oculta a barra de navegacao.

### Modelos de estratigrafia

No painel `Perfil estratigrafico`, escolha um modelo:

- Camadas dos SPs.
- Residual tropical.
- Sedimentar arenoso.
- Aluvial saturado.
- Rocha alterada.

Depois clique `Aplicar perfil`.

### Importar ficha Sondamais PDF

Use `Ficha Sondamais PDF` para importar relatorio padrao Sondamais. A ferramenta tenta reconhecer:

- Nome do SP.
- Profundidade final.
- Camadas e espessuras.
- Tipos de solo, como argila, areia, silte, aterro e solo residual.
- Impenetravel, rocha ou matacao.

Se o PDF for escaneado ou protegido, a leitura pode falhar. Nesse caso, gere um PDF pesquisavel ou exporte o texto/CSV do relatorio.

### Rocha e matacao

Quando o relatorio ou o ponto indicar impenetravel em rocha ou matacao, o perfil 3D desenha um bloco abaixo do ponto de sondagem.

## 10. Importacao

### Importar JSON

Use para reabrir projetos salvos do SONDACAD.

### Importar DXF

Use para trazer referencias CAD convertidas de DWG.

### Importar DWG

O navegador registra o arquivo DWG como referencia, mas DWG e proprietario. Para extrair geometria de forma confiavel, converta para DXF com AutoCAD, BricsCAD, ODA File Converter ou ferramenta equivalente.

### Importar PDF CAD

Funciona melhor com PDF vetorial. PDF escaneado nao vira CAD editavel.

## 11. Exportacao

- `JSON`: salva o projeto editavel.
- `SVG`: exporta desenho vetorial para visualizacao.
- `DXF`: exporta CAD 2D.
- `PDF`: exporta prancha 2D.
- `DWG`: gera arquivo CAD compativel para conversao/salvamento como DWG.
- `Modelo 2D`: exporta modelo 2D em DXF.
- `Modelo 3D`: exporta modelo 3D em glTF.
- `2D+3D`: exporta modelo 2D e 3D juntos em ZIP.
- `Exportar > PDF desenho 2D`: gera PDF do croqui 2D.
- `Exportar > PDF perfil 3D`: gera PDF da visualizacao 3D.

## 12. Abas de modelo

Na parte inferior, use `+` para criar novas abas de modelo. Use `x` para fechar uma aba. Cada aba permite trabalhar em um croqui/modelo diferente.

## 13. Atalhos principais

| Atalho | Funcao |
| --- | --- |
| `V` | Selecionar |
| `OB` | Objeto |
| `SEG` | Segmento |
| `P` | Pan |
| `G` | Terreno |
| `S` ou `SP` | Ponto de sondagem |
| `L` | Linha |
| `PL` | Polilinha |
| `R` ou `REC` | Retangulo |
| `C` | Circulo |
| `A` | Arco |
| `RD` ou `RU` | Rua |
| `PAS` | Passeio |
| `M` | Move |
| `CO` ou `CP` | Copiar |
| `RO` | Rotacionar |
| `MI` | Espelhar |
| `ST` | Stretch |
| `SC` | Escala |
| `AR` | Matriz |
| `TR` | Trim |
| `O` | Offset |
| `F` | Fillet |
| `CT` | Curva terreno |
| `CC` | Curva calcada |
| `J` | Join |
| `X` | Explode |
| `D` | Cota |
| `DC` | Cota continua |
| `AXY` | Auto X/Y SP |
| `T` | Texto |
| `F3` | OSNAP |
| `F5` | ORTHO |
| `U` | Desfazer |
| `Z` | Enquadrar |
| `2D` | Croqui 2D |
| `3D` | Perfil 3D |
| `AP3D` | Atualizar perfil 3D |
| `Z3D` | Enquadrar 3D |
| `PDFSPT` | Importar ficha Sondamais PDF |
| `RSPT` | Remover relatorio Sondamais |
| `PE` | Mostrar/ocultar painel esquerdo |
| `PD` | Mostrar/ocultar painel direito |
| `FX` | Mostrar/ocultar faixa |
| `LIVRE` | Liberar area de desenho |
| `LAY` | Restaurar layout |

## 14. Boas praticas

- Sempre salve uma copia em `JSON` para manter o projeto editavel.
- Use `DXF` para fluxo CAD externo.
- Use `PDF` para envio ao cliente.
- Confira escala, coordenadas e cotas antes de exportar.
- Preencha profundidade e camadas dos SPs antes de gerar o perfil 3D.
- Use OSNAP para evitar pequenos erros de alinhamento.
- Use ORTHO para linhas horizontais e verticais.
- Ao importar PDF Sondamais, confira se o PDF e pesquisavel.

## 15. Problemas comuns

### O PDF Sondamais nao importou

Possiveis causas:

- PDF escaneado.
- PDF protegido.
- Relatorio fora do padrao Sondamais.
- Texto sem identificacao SP-01, SP01 etc.

Solucoes:

- Exportar novamente o relatorio como PDF pesquisavel.
- Converter para texto, CSV ou JSON.
- Preencher manualmente as camadas no painel do SP.

### O DWG nao virou desenho editavel

DWG e formato proprietario. Converta para DXF antes de importar.

### A cota ficou fora da posicao

Selecione a cota e arraste para afastar ou aproximar. Use OSNAP/ORTHO para maior precisao.

### O perfil 3D ficou sem camadas

Preencha `Camadas do solo` no SP ou importe a ficha Sondamais PDF.

### A barra ficou grande ou pequena

Use `TB-` e `TB+`, ou os botoes `-` e `+` no topo.

### Sumiram paineis ou ferramentas

Clique `Layout` para restaurar a tela padrao.

## 16. Limites atuais

- PDF escaneado nao e convertido em CAD nem interpretado como texto sem OCR.
- DWG precisa ser convertido para DXF para leitura geometrica completa.
- A interpolacao 3D e uma representacao tecnica auxiliar e deve ser conferida por responsavel tecnico.
- O modelo 3D depende da quantidade e qualidade dos SPs informados.

## 17. Responsabilidade tecnica

O SONDACAD auxilia a montagem de croquis, cotas e visualizacao estratigrafica. A interpretacao geotecnica, validacao de camadas, profundidades, impenetravel e conclusoes tecnicas devem ser conferidas por profissional habilitado.
