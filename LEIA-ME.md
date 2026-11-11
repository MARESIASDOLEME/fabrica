# Fábrica de vídeos POV

Gera vídeos verticais (1080×1920) no formato POV: o espectador é o protagonista, vê as próprias mãos e os personagens falam com ele. Animação 3D estilo cartoon com contorno preto e lente olho de peixe, vozes por IA, legendas coloridas por personagem e texto "POV:" no topo.

## Como funciona

```
canal.json (bíblia do canal)
  → roteiro (IA: Gemini ou Claude) → episódio em JSON, validado contra o catálogo
  → vozes (Gemini TTS, com cache) → tempos de cada fala + movimento da boca
  → render (Three.js no Chrome sem tela) + áudio (falas + ambiente + música) + legendas
  → saida/<canal>/<data>_<titulo>/  video.mp4 · capa.jpg · legenda.txt · episodio.json
  → aviso por webhook (n8n) → você revisa e posta no TikTok
```

Nada é postado sozinho: a fábrica entrega o vídeo pronto e você aprova.

## Instalação (VPS com Docker)

`bash instalar.sh` constrói a imagem `fabrica-pov` e cria a agenda no cron. Na VPS, todo comando abaixo roda com `./rodar.sh` no lugar de `node fabrica.js` (ex.: `./rodar.sh novo --canal rio-pov`). O contêiner fica limitado a 1,5 CPU e 2 GB de memória; para mudar, defina FABRICA_CPUS e FABRICA_MEM.

## Comandos

| Comando | O que faz |
|---|---|
| `node fabrica.js novo --canal rio-pov` | Escreve o roteiro e produz o vídeo |
| `node fabrica.js novo --canal rio-pov --quantidade 3` | Produz 3 em sequência |
| `node fabrica.js roteiro --canal rio-pov` | Só gera o roteiro (JSON) para revisar ou editar |
| `node fabrica.js produzir --canal rio-pov --episodio arquivo.json` | Produz um roteiro escrito ou editado à mão |
| `node fabrica.js agenda` | Roda o que estiver programado (é o que o cron chama) |
| `node fabrica.js canais` | Lista canais, agenda e quantidade de episódios |

Teste sem gastar: `TTS_PROVIDER=nenhum node fabrica.js produzir ...` (fica sem voz, só com a legenda).

## Novo canal (guarda-chuva)

1. Copie `canais/rio-pov/` para `canais/<novo-id>/` e apague o `historico.json` da cópia.
2. Em `canal.json`, troque nome, bíblia, protagonista, personagens fixos e regras.
3. Se o nicho precisar de cenários que ainda não existem, eles têm de ser criados em `src/browser/sets.js` e descritos em `src/catalog.js`. O roteirista só usa o que está no catálogo.
4. Ligue a agenda: `"agenda": { "ativo": true, "por_dia": 1 }`.

Cada canal guarda o próprio `historico.json`. O roteirista lê os últimos 15 episódios para não se repetir e para continuar a história.

## Cenários disponíveis

calcadao (orla de Copacabana) · recepcao (hostel) · quarto (dormitório com beliches) · lapa (rua com arcos) · desembarque (aeroporto/rodoviária). Cada um aceita os horários dia, tarde ou noite.

Poses das mãos: repouso, escondidas, empurrar, celular, acenar, mala, apontar.
Gestos do elenco: acenar, apontar, bracos, falar, pensar.

## Música

Ponha arquivos .mp3 com licença de uso comercial em `canais/<canal>/musicas/`. A fábrica escolhe um por episódio e toca baixo, embaixo das falas. Sem arquivo, fica só o som ambiente. Não use música comercial: o TikTok silencia o vídeo.

## Custos e tempo

- Render: cerca de 0,4 s por quadro em 2 vCPUs, ou seja, uns 12 min por vídeo de 60 s. Com 4 vCPUs cai mais ou menos pela metade.
- APIs: o vídeo usa um roteiro e de 8 a 14 falas por episódio. O Gemini cobra por token e por áudio gerado; o custo por vídeo fica em centavos. Mesmo assim, confira o painel do Google AI Studio na primeira semana.

## Obrigações na publicação

- Marque o vídeo como **conteúdo gerado por IA** no TikTok. A legenda padrão já leva o aviso.
- Não use marcas, pessoas reais nem o Cristo Redentor: a imagem dele tem direitos controlados pela Arquidiocese do Rio. Essa regra já está no roteirista.
- Se um canal fizer publicidade dos hostels, a lei exige identificar como conteúdo publicitário.
