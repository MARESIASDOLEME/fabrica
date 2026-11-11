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

## Onde roda (VPS com Docker)

Na VPS, a fábrica roda num projeto Docker: um serviço baixa a `main` deste repositório a cada reinício, e outro roda `agendador.sh`, que chama `node fabrica.js agenda` de hora em hora. A configuração do projeto (compose e `.env`) fica só na VPS, fora do repositório.

Consequência: uma mudança na `main` só entra em produção no próximo reinício, e **qualquer** reinício (inclusive queda ou manutenção da VPS) publica o que estiver na `main`. Trabalhe numa branch e só leve para a `main` o que já pode ir ao ar.

Na VPS, os comandos abaixo rodam dentro do contêiner da fábrica.

## Comandos

| Comando | O que faz |
|---|---|
| `node fabrica.js novo --canal rio-pov` | Escreve o roteiro e produz o vídeo |
| `node fabrica.js novo --canal rio-pov --quantidade 3` | Produz 3 em sequência |
| `node fabrica.js roteiro --canal rio-pov` | Só gera o roteiro (JSON) para revisar ou editar |
| `node fabrica.js produzir --canal rio-pov --episodio arquivo.json` | Produz um roteiro escrito ou editado à mão |
| `node fabrica.js agenda` | Roda o que estiver programado (é o que o `agendador.sh` chama a cada hora) |
| `node fabrica.js canais` | Lista canais, agenda e quantidade de episódios |

Teste sem gastar: `TTS_PROVIDER=nenhum node fabrica.js produzir ...` (fica sem voz, só com a legenda).

## Novo canal (guarda-chuva)

1. Copie `canais/rio-pov/` para `canais/<novo-id>/` e apague o `historico.json` da cópia.
2. Em `canal.json`, troque nome, bíblia, protagonista, personagens fixos e regras.
3. Se o nicho precisar de cenários que ainda não existem, eles têm de ser criados em `src/browser/sets.js` e descritos em `src/catalog.js`. O roteirista só usa o que está no catálogo.
4. Ligue a agenda: `"agenda": { "ativo": true, "por_dia": 1 }`.

Cada canal guarda o próprio `historico.json`, com data, título, resumo e gancho de cada episódio feito por `novo` ou pela agenda. O roteirista lê os últimos 15 para não se repetir e recebe o gancho do último para continuar a história. Episódios feitos com `produzir` não entram no histórico.

## Cenários disponíveis

calcadao (orla de Copacabana) · recepcao, quarto, refeitorio, bar e terraco (dentro do hostel) · ladeira (do hostel até a praia) · praia (ao pé da ladeira) · roda (roda de samba embaixo da pedra) · lapa (rua com arcos) · gavea (topo da trilha, com paredão de escalada) · desembarque (aeroporto/rodoviária). Horários: dia, tarde, noite e apagao (cidade sem luz). A descrição de cada um, com coordenadas, está em `src/catalog.js`.

As cores do hostel (verde-escuro com detalhes em amarelo) ficam em `VERDE_HOSTEL` e `AMARELO_HOSTEL`, no início dos cenários em `src/browser/sets.js`.

Poses das mãos: repouso, escondidas, empurrar, celular, acenar, mala, apontar.
Gestos do elenco: acenar, apontar, bracos, falar, pensar.

## Música

Ponha arquivos .mp3 com licença de uso comercial em `canais/<canal>/musicas/`. A fábrica escolhe um por episódio e toca baixo, embaixo das falas. Sem arquivo, fica só o som ambiente. Não use música comercial: o TikTok silencia o vídeo.

## Custos e tempo

- Render: cerca de 0,4 s por quadro em 2 vCPUs, ou seja, uns 12 min por vídeo de 60 s. Com 4 vCPUs cai mais ou menos pela metade.
- APIs: o vídeo usa um roteiro e de 8 a 14 falas por episódio. O Gemini cobra por token e por áudio gerado; o custo por vídeo fica em centavos. Mesmo assim, confira o painel do Google AI Studio na primeira semana.

## Obrigações na publicação

- Marque o vídeo como **conteúdo gerado por IA** no TikTok. A legenda padrão já leva o aviso.
- Não use marcas, pessoas reais nem o Cristo Redentor: a Arquidiocese do Rio reivindica direitos sobre a imagem dele. Essa regra já está no roteirista.
- Se um canal fizer publicidade dos hostels, a lei exige identificar como conteúdo publicitário.
