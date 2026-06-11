# SONDACAD

Protótipo local Sondamais de plataforma CAD para croquis de sondagem de solo.

## O que já está funcionando

- Desenho e edição de terreno por vértices.
- Ribbon estilo CAD com grupos Base, Desenho, Modificar e Anotação.
- Caixas da barra superior, grupos de comandos e botoes da faixa podem ser arrastados e ficam salvos no navegador.
- Botão `Objeto` para selecionar somente entidades CAD no desenho.
- Botão `Segmento` para selecionar linhas/divisas do polígono do terreno e segmentos CAD.
- Comandos de desenho: linha, polilinha, retângulo, círculo e arco.
- Comandos de modificação: Move, copiar, rotacionar, espelhar, Stretch, escala, matriz, Trim, Offset e Fillet.
- Botão `Apagar lote` no topo e na biblioteca para remover o terreno/lote padrão e suas cotas automáticas.
- Barra de comandos com atalhos parecidos com CAD.
- OSNAP de precisão com `F3`, comando `OSNAP` e modos Endpoint, Midpoint, Center, Node, Quadrant, Intersection e Nearest.
- ORTHO com acionamento configurável; padrão por `Shift`, opção por `F8`, botão ou comando.
- Clique direito rápido no canvas repete o último comando, como no AutoCAD.
- Clique direito segurado abre menu de contexto.
- Desfazer comando pelo botão `Desfazer`, por `Ctrl+Z` ou pelo comando `U`.
- Inserção de pontos de sondagem `SP-01`, `SP-02`, etc., com renomeacao pelo painel de propriedades.
- Botao `Renomear SP X/Y` para renumerar os pontos por ordem cartesiana, com `X` crescente e depois `Y` crescente.
- Cota topografica opcional por SP; quando preenchida, aparece no croqui e nas exportacoes PDF/SVG/DXF.
- Cotas automáticas do SP até as divisas mais próximas do terreno.
- Cotas manuais entre dois pontos e cota direta de segmento/aresta quando clicar sobre uma linha com a ferramenta `Cota`.
- Cotas selecionaveis e moveis: clique na cota e arraste para afastar do objeto; o afastamento fica perpendicular ao segmento para manter as linhas auxiliares retas.
- Grade métrica, snap, pan e zoom.
- Propriedades do ponto: nome do SP, coordenadas, cota topografica, profundidade e observação.
- Propriedades do objeto CAD: centro X/Y, largura e altura reais do objeto selecionado.
- Cálculo de área, perímetro, quantidade de SPs e cotas.
- Importação de referência em `DXF`, `SVG`, `JSON` e tentativa de `PDF CAD`.
- Importação também aceita `DWG` como referência registrada; para extração de geometria/cotas no navegador, use `DXF` ou `PDF CAD` vetorial.
- Tela `Perfil 3D` com superfície interpolada por IDW, furos por profundidade perfurada, camadas do solo por SP e cotas projetadas do croqui.
- Navegação no `Perfil 3D`: scroll aproxima/afasta, scroll pressionado movimenta em pan, `Shift + scroll` rotaciona e `Shift + scroll pressionado` permite órbita livre.
- Classificação inicial de DXF: maior polilinha fechada vira terreno; textos `SP-01` próximos de círculos viram pontos de sondagem.
- Exportação em `JSON`, `SVG`, `DXF`, `PDF` e opção `DWG`.

## Comandos rápidos

- `L` ou `LINE`: linha.
- `OB`, `OBJ` ou `SO`: selecionar objeto CAD.
- `SEG`, `DIVISA` ou `LINHA`: selecionar linha/divisa/segmento.
- `OSNAP` ou `OS`: ligar/desligar captura de objetos.
- `F3`: alternar OSNAP ligado/desligado.
- `OSNAPALL`: ligar todos os modos OSNAP.
- `OSNAPCLEAR`: limpar todos os modos OSNAP.
- `ORTHO` ou `OR`: ligar/desligar ORTHO.
- `ORTHOON` / `ORTHOOFF`: controlar ORTHO por comando.
- `3D` ou `PERFIL3D`: abrir tela de perfil 3D.
- `2D` ou `CROQUI2D`: voltar ao croqui 2D.
- `PULL3D` ou `CAD3D`: classificar importado e puxar dados para Perfil 3D.
- `PE3D`, `ESTRAT` ou `ESTRATIGRAFIA`: aplicar o perfil estratigrafico selecionado.
- `ESTRAT TROPICAL`, `ESTRAT SEDIMENTAR`, `ESTRAT ALUVIAL` ou `ESTRAT ROCHA`: selecionar e aplicar um modelo de camadas.
- `REPEAT` ou `ENTER`: repetir último comando.
- `PL`: polilinha; `Enter` conclui e `C` fecha.
- `REC`: retângulo.
- `C`: círculo.
- `A`: arco.
- `SP`: ponto de sondagem.
- `RENSP`, `RENSPXY` ou `SPXY`: renomear todos os pontos SP por ordem cartesiana X/Y.
- `D` ou `DIM`: cota.
- `T`: texto.
- `CO`: copiar selecionado.
- `M` ou `MOVE`: mover selecionado por deslocamento X/Y.
- `RO`: rotacionar selecionado.
- `MI`: espelhar selecionado.
- `ST`: Stretch em divisa, segmento ou vértice.
- `SC`: escala selecionado.
- `AR`: matriz retangular.
- `TR`: trim de linha pelo terreno.
- `O`, `OF`, `OFF` ou `OFFSET`: informe a distancia e depois clique na linha, segmento, divisa, polilinha, rua, passeio, circulo ou arco para criar a copia paralela.
- `F`: Fillet em polilinha CAD ou terreno.
- `U`: desfazer último comando.
- `PDF`: exportar PDF vetorial.
- `DWG`: exportar arquivo CAD pronto para conversão/salvamento em DWG.
- `M2D` ou `MODELO2D`: exportar o modelo 2D em DXF.
- `M3D` ou `MODELO3D`: exportar o modelo 3D em glTF.
- `2D3D` ou `MODELOS`: exportar os modelos 2D e 3D juntos em um ZIP.
- `PDFCAD`: importar PDF vetorial como linhas CAD quando reconhecível.
- `E` ou `DEL`: apagar selecionado.
- `Z`: enquadrar desenho.

## Como abrir

**Pagina inicial:** abra `index.html` no navegador ou acesse a URL do site.

**Ferramenta CAD:** acesse `app.html` (ou `/app` no Render).

Para testar localmente:

```bash
npm run preview
```

Depois acesse `http://localhost:4173` para a landing page e `http://localhost:4173/app.html` para a ferramenta.

## Publicar no Render

1. Envie este repositório para o GitHub.
2. No [Render Dashboard](https://dashboard.render.com/), clique em **New > Blueprint**.
3. Conecte o repositório; o arquivo `render.yaml` na raiz configura o site estático automaticamente.
4. Alternativa manual: **New > Static Site**, aponte para a raiz do repo, deixe **Build Command** vazio (ou `echo ok`) e **Publish Directory** como `.` (ponto).

O site publica a landing em `index.html`, a ferramenta em `app.html`, o manual em `manual-tecnico-sondacad.html` e os assets em `assets/`.

## Limite importante sobre DWG

O arquivo `CROQUI SONDAGEM DE SOLO.dwg` foi localizado, mas DWG é proprietário e não havia conversor AutoCAD/ODA/libredwg disponível no ambiente. Por isso o MVP lê `DXF`, que é o caminho técnico mais seguro para o núcleo web.

A opção `DWG` da plataforma exporta um arquivo CAD `DXF` pronto para abrir no AutoCAD, BricsCAD, DraftSight ou ODA File Converter e salvar como `.dwg`. Para gerar `.dwg` nativo automaticamente, a próxima etapa é conectar um conversor local ou serviço de backend licenciado.

## Rua, passeio e acesso

- Botao `Rua` / `Rua asfalto`: cria uma faixa de asfalto em dois cliques, com largura padrao de 7 m, eixo tracejado e largura editavel no painel do objeto.
- Botoes `RUA` e `PASSEIO`: inserem textos prontos no ponto clicado no croqui.
- Comandos rapidos: `ROAD`, `ASFALTO` ou `RUAASFALTO` para rua/asfalto; `RUA` e `PASSEIO` para textos prontos.

## Atalhos de teclado no canvas

- `L`: linha.
- `RO`: rotacionar selecionado.
- `C`: circulo.
- `V`: selecionar.
- `P`: pan.
- `F5`: ORTHO.
- `F3`: OSNAP.
- `CO` ou `CP`: copiar selecionado.
- `M`: mover selecionado.
- `MI`: espelhar.
- `SC`: escala.
- `ST`: Stretch.
- `TR`: Trim.
- `O`: Offset.
- `F`: Fillet.
- `D`: cota.
- `T`: texto.
- `OB`: selecionar objeto CAD.
- `S` ou `SP`: inserir ponto de sondagem.
- `A`: arco.
- `R` ou `REC`: retangulo.
- `RD` ou `RU`: rua/asfalto.
- `E` ou `Del`: apagar selecionado.
- `Z`: enquadrar desenho.
- `U`: desfazer.

## Entrada direta de distancia

- Com `Linha` acionado: clique o ponto inicial, digite `10`, aponte a direcao com o mouse e clique ou pressione `Enter`.
- Com `Move` ou `Copiar`: selecione o objeto, acione o comando, digite a distancia, aponte a direcao e clique ou pressione `Enter`.
- Use `Backspace` para corrigir a distancia digitada e `Esc` para cancelar.

## Importar PDF CAD

A opção `PDF CAD` tenta recuperar linhas vetoriais de PDFs simples. Ela funciona melhor com PDFs exportados pelo próprio SONDACAD, porque o PDF inclui metadado de escala para voltar a metros.

Limites:

- PDF escaneado vira imagem, não CAD editável.
- PDF vetorial comprimido por AutoCAD/plotter pode exigir conversão externa para `DXF`.
- Quando as linhas são reconhecidas, elas entram como entidades CAD editáveis.

Fluxo recomendado:

1. Converter DWG para DXF em lote com AutoCAD, ODA File Converter, BricsCAD ou serviço interno.
2. Importar os DXFs na plataforma.
3. Rodar `Classificar importado`.
4. Conferir terreno, pontos SP, textos e escala.
5. Salvar como JSON do SONDACAD e exportar SVG/DXF para entrega.

## Pipeline para Google Drive da SondaMais/Sondamais

Quando houver link ou credencial de acesso:

1. Ler pastas do Google Drive por obra/data/modelo.
2. Baixar amostra controlada de DWGs.
3. Converter DWG para DXF.
4. Extrair padrões de layers, blocos, textos, carimbos, norte, terreno, pontos SP e cotas.
5. Criar uma biblioteca de templates de croqui.
6. Treinar regras de normalização para transformar croquis antigos em dados estruturados.
7. Usar esses padrões para sugerir automaticamente layout, legenda, layers e cotas em novos croquis.

## Próximas evoluções

- Conector Google Drive com OAuth.
- Conversor DWG para DXF automatizado.
- Detecção de escala por cota conhecida.
- Biblioteca de blocos de norte, legenda, carimbo, SP e divisas.
- Exportação PDF com prancha A4/A3.
- Mapa base por coordenadas reais e integração Google Maps/Street View.
- Multiusuário com histórico de versões e aprovação técnica.
