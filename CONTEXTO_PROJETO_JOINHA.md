# CONTEXTO DO PROJETO — JOINHA VEÍCULOS / DYAD / N8N / SUPABASE

Data do contexto: 12/05/2026

## Objetivo do projeto

Estamos desenvolvendo um app/showroom da Joinha Veículos usando Dyad, integrado com n8n, Supabase e uma API backend em Python.

O app possui um assistente virtual chamado Jarvis, que conversa com o cliente e busca veículos no estoque.

---

## Estrutura principal

Pasta do projeto no Windows:

C:\Users\Attard\dyad-apps\JOINHA

Frontend principal:

src/pages/Showroom.tsx

Serviço que chama o n8n:

src/features/showroom/services/n8nService.ts

Filtro do showroom:

src/features/showroom/utils/filters.ts

Tela de gerenciamento:

src/pages/Gerentes.tsx

---

## Docker / Backend

O backend roda via Docker Compose.

Comando para subir/rebuildar:

cd C:\Users\Attard\dyad-apps\JOINHA
docker compose up --build

Quando está rodando corretamente aparece:

Uvicorn running on http://0.0.0.0:8000

API local:

http://localhost:8000

Endpoint de busca:

/vehicles/search

A API exige header com a chave configurada no backend.

Exemplo de teste direto:

curl -H "x-api-key: SUA_CHAVE_AQUI" "http://localhost:8000/vehicles/search?q=quadriciclo"

---

## n8n

O app chama o n8n neste arquivo:

src/features/showroom/services/n8nService.ts

Conteúdo importante:

const N8N_WEBHOOK_URL = "SUA_URL_DO_WEBHOOK_AQUI";

Payload enviado ao n8n:

{
  "chatInput": textoUsuario,
  "sessionId": "sessao-padrao"
}

Workflow do n8n usado:

Webhook → AI Agent → Respond to Webhook

---

## Supabase

A tabela do Supabase é usada para armazenar e consultar os veículos do estoque.

Fluxo dos dados:

Cadastro/integração → Supabase → API → App/Jarvis

O estoque pode ser alimentado de forma manual pelo card de cadastro de veículos, quando o dono quiser.

---

## Busca de veículos

A busca precisa combinar corretamente:
- categoria
- cor
- termo livre

Exemplo esperado:

/vehicles/search?category=carro&color=branco

ou

/vehicles/search?q=quadriciclo

### Regras de categoria

- carro, carros → categoria `carro`
- moto, motos, motocicleta, motocicletas → categoria `motocicleta`
- outro, outros → categoria `outros`

---

## Cuidado importante

Não fazer alterações grandes no código de busca sem antes:
1. Ver o log exato do backend.
2. Confirmar qual URL o app está chamando.
3. Fazer backup dos arquivos.
4. Alterar apenas um ponto por vez.
5. Rebuildar/testar depois.

---

## Estado do projeto

O app deve permanecer simples e estável.

A regra é:
- não quebrar o que já funciona
- fazer um passo por vez
- manter o histórico útil no contexto
- evitar nomes antigos do projeto anterior

---

## Arquivos importantes no Desktop

1. Contexto:
C:\Users\Attard\Desktop\CONTEXTO_PROJETO_JOINHA.md

2. Comandos rápidos:
C:\Users\Attard\Desktop\COMANDOS_RAPIDOS_JOINHA.txt

3. Teste automático:
C:\Users\Attard\Desktop\testar-filtros-joinha.bat

4. Resultado dos testes:
C:\Users\Attard\Desktop\resultado-testes-joinha.txt

5. Backup automático:
C:\Users\Attard\Desktop\backup-joinha.bat

6. Pasta dos backups:
C:\Users\Attard\Desktop\BACKUPS_JOINHA

---

## Recomendação para continuar depois

Ao iniciar novamente:

1. Subir o Docker se necessário:

cd C:\Users\Attard\dyad-apps\JOINHA
docker compose up --build

2. Rodar o teste automático:
C:\Users\Attard\Desktop\testar-filtros-joinha.bat

3. Se algo falhar, abrir:
C:\Users\Attard\Desktop\resultado-testes-joinha.txt

4. Pedir ajuda em modo econômico:

MODO ECONÔMICO
Projeto Joinha Veículos.
Contexto salvo em CONTEXTO_PROJETO_JOINHA.md.
Problema:
Log:
Me dê só o próximo passo.