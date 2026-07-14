# CONTEXTO DO PROJETO — STYLLO MOTORS / DYAD / N8N / SUPABASE

Data do contexto: 12/05/2026

## Objetivo do projeto

Estamos desenvolvendo um app/showroom da Styllo Motors usando Dyad, integrado com n8n, Supabase e uma API backend em Python.

O app possui um assistente virtual chamado Jarvis, que conversa com o cliente e busca veículos no estoque.

---

## Estrutura principal

Pasta do projeto no Windows:

C:\Users\Attard\dyad-apps\STYLLO_MOTORS

Backend/API:

sync-revendamais/main.py

Frontend principal:

src/pages/Showroom.tsx

Serviço que chama o n8n:

src/features/showroom/services/n8nService.ts

Filtro do showroom:

src/features/showroom/utils/filters.ts

---

## Docker / Backend

O backend roda via Docker Compose.

Comando para subir/rebuildar:

cd C:\Users\Attard\dyad-apps\STYLLO_MOTORS
docker compose up --build

Quando está rodando corretamente aparece:

Uvicorn running on http://0.0.0.0:8000

API local:

http://localhost:8000

Endpoint de busca:

/vehicles/search

A API exige header:

x-api-key: styllo-estoque-123

Teste direto funcionando:

curl -H "x-api-key: styllo-estoque-123" "http://localhost:8000/vehicles/search?q=quadriciclo"

Esse teste retornou corretamente:

quadriciclo shineray atv 200 2025

Então a API/backend encontra o quadriciclo corretamente quando recebe q=quadriciclo.

---

## n8n

O app chama o n8n neste arquivo:

src/features/showroom/services/n8nService.ts

Conteúdo importante:

const N8N_WEBHOOK_URL = "https://semidefensively-hymnological-elvia.ngrok-free.dev/webhook/chat";

Payload enviado ao n8n:

{
  "chatInput": textoUsuario,
  "sessionId": "sessao-marcos"
}

Workflow do n8n usado:

IA Teste-Pai

Estrutura do workflow:

Webhook → AI Agent → Respond to Webhook

Webhook:
- Method: POST
- Path: chat

O n8n está rodando via Docker/ngrok.

---

## Supabase / Revenda Mais

A tabela do Supabase é um espelho do XML da ferramenta Revenda Mais.

Fluxo dos dados:

Revenda Mais XML → Sync Python → Supabase → API → App/Jarvis

Arquivo XML original baixado:

revendamais-original.xml

Arquivo XML formatado:

revendamais-formatado.xml

Comando usado para baixar:

curl -L "https://app.revendamais.com.br/application/index.php/apiGeneratorXml/generator/sitedaloja/d65db85a75b33ed8c3438d73bc0103029628.xml" -o revendamais-original.xml

O XML foi formatado com PowerShell e ficou em:

revendamais-formatado.xml

---

## Descobertas importantes sobre o XML

### Quadriciclo

No XML:

<TITLE>quadriciclo shineray atv 200 2025</TITLE>
<CATEGORY>OUTROS</CATEGORY>
<MAKE>shineray</MAKE>
<MODEL>atv 200</MODEL>
<COLOR>verde</COLOR>
<PRICE>25900.00</PRICE>

Linha encontrada no XML formatado:

2066: <TITLE>quadriciclo shineray atv 200 2025</TITLE>

Conclusão:
O quadriciclo existe no XML e vem como CATEGORY = OUTROS.
Isso está correto.

### Honda CG

No XML:

<TITLE>honda cg 160 start 2022</TITLE>
<CATEGORY>motocicleta</CATEGORY>
<MAKE>honda</MAKE>
<MODEL>cg 160 start</MODEL>

Linha encontrada:

1408: <TITLE>honda cg 160 start 2022</TITLE>

Conclusão:
A Honda CG vem corretamente como motocicleta no XML.
O XML não parece ser o problema nesse caso.

---

## Problema original do quadriciclo

Usuário perguntou no chat:

vc tem quadriciclo?

O Jarvis respondeu que iria buscar quadriciclos, mas retornou veículos aleatórios.

Logs do backend mostraram que o frontend/API estava sendo chamado assim:

GET /vehicles/search?limit=5&offset=0

Ou seja, sem q=quadriciclo.

O correto seria:

GET /vehicles/search?q=quadriciclo&limit=5&offset=0

Teste direto provou que a API funciona:

GET /vehicles/search?q=quadriciclo

Retornou o quadriciclo corretamente.

Conclusão:
O problema do quadriciclo não é Supabase nem backend.
O problema está na ponte Chat/Jarvis/frontend/n8n para montar a busca.

---

## Problema atual — carro branco retorna moto

Usuário perguntou:

vc tem carro branco?

Jarvis respondeu:

Vou buscar carros brancos para você.

Mas retornou uma moto:

honda nxr160 bros esdd

Isso indica que provavelmente o sistema está filtrando apenas pela cor branca, por exemplo:

/vehicles/search?color=branco&limit=5&offset=0

Mas não está enviando categoria carro:

/vehicles/search?category=carro&color=branco&limit=5&offset=0

Conclusão provável:
O frontend Showroom.tsx atualmente envia filtros como q, color, gear, fuel, year, plate_final, mas pode não estar enviando category para a API.

Antes de corrigir, confirmar nos logs do backend qual URL aparece após pedir "carro branco".

Se aparecer sem category=carro, o próximo ajuste seguro é adicionar envio de category no Showroom.tsx.

---

## Arquivos de backup criados

Foram criados backups antes de alterações:

src/features/showroom/utils/filters.backup.ts
src/pages/Showroom.backup.tsx

Depois de tentativas de alteração, os arquivos foram restaurados com:

copy /Y src\features\showroom\utils\filters.backup.ts src\features\showroom\utils\filters.ts
copy /Y src\pages\Showroom.backup.tsx src\pages\Showroom.tsx

Status:
Os arquivos foram restaurados para o estado seguro anterior.

---

## Cuidado importante

Não fazer alterações grandes no código de busca sem antes:
1. Ver o log exato do backend.
2. Confirmar qual URL o app está chamando.
3. Fazer backup dos arquivos.
4. Alterar apenas um ponto por vez.
5. Rebuildar/testar depois.

---

## Próximo passo recomendado

Investigar o problema "carro branco retorna moto".

Teste recomendado:

1. Perguntar no chat:
vc tem carro branco?

2. Olhar o log do backend Docker.

3. Procurar a linha GET /vehicles/search.

Se vier:

/vehicles/search?color=branco&limit=5&offset=0

então falta enviar category=carro.

Correção provável e pequena no Showroom.tsx:

Adicionar algo equivalente a:

const categoryValue = normalizarValorFiltro(f?.categoria || f?.category || f?.tipo);
if (categoryValue) params.append('category', categoryValue);

Mas precisa mapear:
- carro, carros → carro
- moto, motos, motocicleta, motocicletas → motocicleta
- outros, outro → outros

Também é necessário garantir que o n8n/Jarvis devolva filtro estruturado, por exemplo:

{
  "acao": "BUSCAR_ESTOQUE",
  "filtro": {
    "categoria": "carro",
    "cor": "branco"
  },
  "texto": "Vou buscar carros brancos para você."
}

Para quadriciclo:

{
  "acao": "BUSCAR_ESTOQUE",
  "filtro": {
    "termo": "quadriciclo"
  },
  "texto": "Vou buscar as opções de quadriciclo disponíveis."
}

---

## Estado mental do projeto

O app estava funcionando bem antes.
Não quebrar o que já funciona por causa de um ajuste pequeno.
Sempre fazer um passo por vez.


---

## Atualização final — correção do filtro por categoria e cor

Foi corrigido o problema em que o cliente pedia "carro branco" e o app retornava também uma moto branca.

### Problema encontrado

Quando o usuário perguntava:

vc tem carro branco?

O backend mostrava que o app chamava a API assim:

/vehicles/search?color=branco&limit=5&offset=0

Ou seja, estava filtrando apenas por cor, sem enviar categoria.

Por isso retornava qualquer veículo branco, incluindo motocicleta branca.

### Teste direto na API

Foi testado manualmente:

curl -H "x-api-key: styllo-estoque-123" "http://localhost:8000/vehicles/search?category=carro&color=branco&limit=10"

Resultado:
A API retornou somente carros brancos.
A moto Honda NXR não apareceu.

Conclusão:
A API/backend estava correta.
O problema era o frontend/chat não enviar category=carro.

---

## Correção aplicada no Showroom.tsx

Arquivo alterado:

src/pages/Showroom.tsx

Foi adicionado envio do parâmetro category para a API.

Trecho importante:

const categoryValue = normalizarValorFiltro(f?.categoria || f?.category || f?.tipo);
if (categoryValue) params.append('category', categoryValue);

Também foram adicionadas normalizações para categorias:

"carro": "carro"
"carros": "carro"
"moto": "motocicleta"
"motos": "motocicleta"
"motocicleta": "motocicleta"
"motocicletas": "motocicleta"
"outro": "outros"
"outros": "outros"

---

## Correção do problema "moto branca"

Depois da primeira correção, ao perguntar:

vc tem moto branca?

O app chamou a API assim:

/vehicles/search?q=motocicleta&color=branco&category=motocicleta&limit=5&offset=0

Isso estava errado porque "motocicleta" já estava sendo usado como category e não deveria ir também como q.

A API manual funcionava corretamente com:

/vehicles/search?category=motocicleta&color=branco&limit=10

Esse teste retornou:

honda nxr160 bros esdd 2016

### Correção aplicada

No Showroom.tsx, foi alterado o trecho de envio do q.

Agora termos genéricos de categoria não são enviados em q:

const termosQueNaoDevemIrNoQ = [
  "carro",
  "carros",
  "moto",
  "motos",
  "motocicleta",
  "motocicletas",
  "outro",
  "outros"
];

if (qValue && !termosQueNaoDevemIrNoQ.includes(qValue)) {
  params.append('q', qValue);
}

Com isso, "moto branca" passou a chamar corretamente:

/vehicles/search?color=branco&category=motocicleta&limit=5&offset=0

E o chat encontrou corretamente a moto branca.

---

## Logs confirmando funcionamento

### Carro branco

Log correto:

GET /vehicles/search?color=branco&category=carro&limit=5&offset=0

Resultado:
Retornou somente carros brancos.
Não retornou moto.

### Moto branca

Log correto:

GET /vehicles/search?color=branco&category=motocicleta&limit=5&offset=0

Resultado:
Retornou a Honda NXR160 Bros branca.

---

## Estado atual do filtro

Funcionando:

- "vc tem carro branco?"
  - envia category=carro
  - envia color=branco
  - não retorna moto

- "vc tem moto branca?"
  - envia category=motocicleta
  - envia color=branco
  - retorna moto branca corretamente

- API direta continua funcionando:
  - category=carro&color=branco
  - category=motocicleta&color=branco
  - q=quadriciclo

---

## Backup recomendado criado

Foi recomendado criar backup do estado bom:

copy /Y src\pages\Showroom.tsx src\pages\Showroom.funcionando-filtro-categoria.tsx

Esse backup representa o estado em que:
- carro branco funciona;
- moto branca funciona;
- category é enviado corretamente;
- q não recebe termos genéricos como motocicleta ou carro.


---

## Atualização da conversa — economia, backups e automações

Nesta etapa, além da correção do filtro, foram criados arquivos auxiliares para economizar tempo, reduzir uso de IA e evitar retrabalho.

### Estratégia definida para economizar

Como o desenvolvimento usando IA pode consumir bastante crédito, foi definido um modo de trabalho mais econômico:

1. Trabalhar sempre um passo por vez.
2. Usar o modelo/IA principalmente para decisões, análise de erro e planejamento.
3. Usar terminal para tarefas repetitivas, como:
   - testar API;
   - procurar texto nos arquivos;
   - fazer backup;
   - restaurar arquivo;
   - rodar Docker;
   - confirmar logs.
4. Evitar pedir ao Dyad para "corrigir tudo".
5. Sempre fazer backup antes de alteração importante.
6. Usar comandos prontos para evitar gastar tokens com tarefas repetidas.
7. Começar pedidos futuros com "MODO ECONÔMICO" quando quiser respostas curtas e objetivas.

Modelo recomendado para pedir ajuda:

MODO ECONÔMICO
Problema:
O que pedi:
O que veio:
Log do Docker:
O que quero:
Me dê só o próximo passo.

---

## Arquivo de comandos rápidos criado

Foi criado no Desktop:

C:\Users\Attard\Desktop\COMANDOS_RAPIDOS_STYLLO.txt

Esse arquivo contém comandos úteis para:
- entrar na pasta do projeto;
- subir/reiniciar Docker;
- testar API de quadriciclo;
- testar carro branco;
- testar moto branca;
- testar estoque geral;
- procurar chamada vehicles/search no frontend;
- verificar categoryValue no Showroom.tsx;
- verificar termosQueNaoDevemIrNoQ;
- abrir contexto;
- abrir Showroom.tsx;
- fazer backup e restauração manual.

Esse arquivo deve ser usado para economizar tempo e evitar pedir comandos repetidos à IA.

---

## Script automático de teste criado

Foi criado no Desktop:

C:\Users\Attard\Desktop\testar-filtros-styllo.bat

Esse script roda testes automáticos na API local:

1. Quadriciclo:
   /vehicles/search?q=quadriciclo

2. Carro branco:
   /vehicles/search?category=carro&color=branco&limit=10

3. Moto branca:
   /vehicles/search?category=motocicleta&color=branco&limit=10

4. Estoque geral:
   /vehicles/search?limit=5&offset=0

5. Fox:
   /vehicles/search?q=fox

6. NMAX:
   /vehicles/search?q=nmax

Ao executar, ele salva o resultado em:

C:\Users\Attard\Desktop\resultado-testes-styllo.txt

Uso:
Dar dois cliques em testar-filtros-styllo.bat.
Depois abrir resultado-testes-styllo.txt e analisar ou enviar ao assistente se algo falhar.

O teste foi executado e funcionou, mostrando:

Testes finalizados.
Resultado salvo em:
C:\Users\Attard\Desktop\resultado-testes-styllo.txt

---

## Script automático de backup criado

Foi criado no Desktop:

C:\Users\Attard\Desktop\backup-styllo.bat

Esse script cria backup dos arquivos principais em uma pasta com data/hora dentro de:

C:\Users\Attard\Desktop\BACKUPS_STYLLO

Exemplo de pasta criada:

C:\Users\Attard\Desktop\BACKUPS_STYLLO\backup_2026-05-12_20-06-56

Arquivos copiados no backup:
- src\pages\Showroom.tsx
- src\features\showroom\utils\filters.ts
- src\features\showroom\services\n8nService.ts
- CONTEXTO_PROJETO_STYLLO.md

O script foi testado e funcionou, retornando:

1 arquivo(s) copiado(s).
1 arquivo(s) copiado(s).
1 arquivo(s) copiado(s).
1 arquivo(s) copiado(s).

Backup finalizado.

O script fica aguardando "Pressione qualquer tecla para continuar" por causa do comando pause.
Isso é proposital e recomendado, pois permite conferir se o backup foi feito corretamente.

Antes de qualquer alteração importante no projeto, rodar:

backup-styllo.bat

---

## Estado final do dia

O filtro por categoria e cor foi corrigido e testado.

Funcionando:

### Carro branco

Pergunta no chat:

vc tem carro branco?

Log correto:

GET /vehicles/search?color=branco&category=carro&limit=5&offset=0

Resultado:
Retornou somente carros brancos, sem motos.

### Moto branca

Pergunta no chat:

vc tem moto branca?

Log correto:

GET /vehicles/search?color=branco&category=motocicleta&limit=5&offset=0

Resultado:
Retornou a moto branca corretamente.

### Problema q=motocicleta corrigido

Antes, para moto branca, estava indo:

/vehicles/search?q=motocicleta&color=branco&category=motocicleta&limit=5&offset=0

Isso não retornava a Honda NXR, pois "motocicleta" estava sendo usado indevidamente como q.

Foi corrigido em Showroom.tsx para não enviar q quando qValue for termo genérico de categoria:

- carro
- carros
- moto
- motos
- motocicleta
- motocicletas
- outro
- outros

Agora "motocicleta" fica apenas em category, não em q.

---

## Arquivos importantes no Desktop

1. Contexto:
C:\Users\Attard\Desktop\CONTEXTO_PROJETO_STYLLO.md

2. Comandos rápidos:
C:\Users\Attard\Desktop\COMANDOS_RAPIDOS_STYLLO.txt

3. Teste automático:
C:\Users\Attard\Desktop\testar-filtros-styllo.bat

4. Resultado dos testes:
C:\Users\Attard\Desktop\resultado-testes-styllo.txt

5. Backup automático:
C:\Users\Attard\Desktop\backup-styllo.bat

6. Pasta dos backups:
C:\Users\Attard\Desktop\BACKUPS_STYLLO

---

## Recomendação para continuar amanhã

Ao iniciar amanhã:

1. Subir o Docker se necessário:

cd C:\Users\Attard\dyad-apps\STYLLO_MOTORS
docker compose up --build

2. Rodar o teste automático:

C:\Users\Attard\Desktop\testar-filtros-styllo.bat

3. Se algo falhar, abrir:

C:\Users\Attard\Desktop\resultado-testes-styllo.txt

4. Pedir ajuda em modo econômico:

MODO ECONÔMICO
Projeto Styllo Motors.
Contexto salvo em CONTEXTO_PROJETO_STYLLO.md.
Problema:
Log:
Me dê só o próximo passo.