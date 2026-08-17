# -*- coding: utf-8 -*-
# Gera o seed dos starter kits.
#
# O conteudo NAO foi inventado: ele sai dos dez portfolios de nicho construidos e publicados em
# 16/08/2026, e da lista de vocabulario que aqueles dez produziram. "Tecnicas da casa",
# "Meus pratos" e "pratos" e o que a pagina da chef publicou de verdade.
import io
import json

KITS = [
    ("chef", "Chef / Gastronomia", 10, "brasa", "brilho", ("Chef de cozinha", "chef-hat"),
     {"stacks": "Técnicas da casa", "projects": "Meus pratos", "cases": "pratos",
      "experience": "Onde eu cozinhei", "challenge": "A ideia", "solution": "Como eu faço",
      "features": "O que vai no prato", "stackLabel": "Ingredientes", "visit": "Ver o menu"},
     ["Cozinha autoral", "Menu degustação", "Fermentação", "Peixes e frutos do mar"],
     "Conte em três linhas onde você aprendeu a cozinhar, o que você faz hoje e o que não abre mão no prato.",
     [("exemplo-prato", "Menu degustação de sete tempos", "Menu autoral",
       "Troque por um trabalho seu: uma foto, o nome do prato e uma frase."),
      ("exemplo-jantar", "Jantar fechado para vinte", "Evento",
       "Um segundo exemplo, para você ver como a grade fica com dois.")],
     [("exemplo-cozinha", "Restaurante Exemplo", "work", "Chef de cozinha", "2022")]),

    ("advocacia", "Advocacia / Direito", 20, "ouro", "grid", ("Advogada", "scale"),
     {"stacks": "Áreas de atuação", "projects": "Casos e atuações", "cases": "casos",
      "experience": "Trajetória", "challenge": "A situação", "solution": "A tese e a estratégia",
      "features": "O que foi feito", "stackLabel": "Matérias envolvidas", "visit": "Ler mais"},
     ["Direito do trabalho", "Contencioso", "Consultivo", "Negociação coletiva"],
     "Diga a sua área, há quanto tempo atua e como você trabalha. Lembre do número da OAB.",
     [("exemplo-caso", "Reclamatória trabalhista", "Contencioso",
       "Descreva o caso sem identificar o cliente. Nem todo trabalho tem imagem, e tudo bem.")],
     [("exemplo-formacao", "Universidade Exemplo", "education", "Bacharelado em Direito", "2014")]),

    ("fotografia", "Fotografia", 30, "prata", "grao", ("Fotógrafo", "camera"),
     {"stacks": "Equipamento e processo", "projects": "Ensaios", "cases": "ensaios",
      "experience": "Trajetória", "challenge": "O contexto", "solution": "O olhar",
      "features": "O que está incluso", "stackLabel": "Equipamento", "visit": "Ver a galeria"},
     ["Retrato", "Documental", "Luz natural", "Edição própria"],
     "Fotógrafo fala pouco e mostra muito. Duas ou três linhas bastam.",
     [("exemplo-ensaio", "Ensaio na rua", "Documental",
       "Cada trabalho aceita até oito fotos: elas aparecem quando alguém clica no card.")],
     [("exemplo-estudio", "Estúdio Exemplo", "work", "Fotógrafo", "2019")]),

    ("personal", "Personal trainer / Saúde", 40, "limao", "mesh", ("Personal trainer", "dumbbell"),
     {"stacks": "Especialidades", "projects": "Programas e resultados", "cases": "programas",
      "experience": "Formação e certificações", "challenge": "O ponto de partida",
      "solution": "O plano", "features": "O que está incluso", "stackLabel": "Métodos",
      "visit": "Quero treinar"},
     ["Hipertrofia", "Emagrecimento", "Treino online", "Avaliação de movimento"],
     "Diga para quem você treina, como acompanha e o que te diferencia.",
     [("exemplo-programa", "Programa de doze semanas", "Consultoria online",
       "Vídeo vertical funciona: cole o link de um Short e ele aparece na proporção certa.")],
     [("exemplo-formacao", "Faculdade Exemplo", "education", "Bacharelado em Educação Física", "2018")]),

    ("arquitetura", "Arquitetura / Interiores", 50, "terra", "vinheta", ("Arquiteta", "ruler"),
     {"stacks": "Serviços", "projects": "Projetos", "cases": "projetos", "experience": "Trajetória",
      "challenge": "O programa", "solution": "O partido", "features": "Escopo entregue",
      "stackLabel": "Ferramentas", "visit": "Ver o projeto"},
     ["Residencial", "Reforma", "Interiores", "Projeto executivo"],
     "Fale do seu partido, do tipo de obra que você assina e de como é trabalhar com você.",
     [("exemplo-residencia", "Residência de 120 m2", "Residencial",
       "Use a galeria para planta, maquete e os ângulos da obra pronta.")],
     [("exemplo-escritorio", "Escritório Exemplo", "work", "Arquiteta", "2020")]),

    ("psicologia", "Psicologia / Terapia", 60, "lavanda", "mesh", ("Psicóloga", "brain"),
     {"stacks": "Abordagens e público", "projects": "Trabalhos", "cases": "trabalhos",
      "experience": "Formação", "challenge": "O contexto", "solution": "Como trabalho",
      "features": "O que está incluso", "stackLabel": "Abordagens", "visit": "Saiba mais"},
     ["Terapia cognitivo-comportamental", "Adultos", "Atendimento online", "Ansiedade"],
     "Escreva de forma acolhedora: quem você atende, como é a sessão e como marcar. Lembre do número do CRP.",
     [],
     [("exemplo-formacao", "Universidade Exemplo", "education", "Graduação em Psicologia", "2015"),
      ("exemplo-especializacao", "Instituto Exemplo", "education", "Especialização em TCC", "2018")]),

    ("musica", "Música / Áudio", 70, "magenta", "mesh", ("Produtora musical", "music"),
     {"stacks": "O que eu faço", "projects": "Discografia", "cases": "faixas",
      "experience": "Trajetória", "challenge": "O briefing", "solution": "A produção",
      "features": "O que entreguei", "stackLabel": "Estúdio e equipamento", "visit": "Ouvir"},
     ["Produção musical", "Mixagem", "Trilha", "Gravação"],
     "Diga que som você faz, com quem já trabalhou e como é o seu processo.",
     [("exemplo-faixa", "Single produzido", "Produção",
       "Hoje o campo de mídia aceita vídeo do YouTube. Um vídeo com a faixa resolve enquanto isso.")],
     [("exemplo-estudio", "Estúdio Exemplo", "work", "Produtora musical", "2017")]),

    ("confeitaria", "Confeitaria / Food", 80, "rosa", "dots", ("Confeiteira", "cake"),
     {"stacks": "Minhas especialidades", "projects": "Meus doces", "cases": "encomendas",
      "experience": "Cursos e formação", "challenge": "A festa", "solution": "O que eu fiz",
      "features": "O que vai junto", "stackLabel": "Sabores", "visit": "Encomendar"},
     ["Bolo de casamento", "Mesa de doces", "Brigadeiro gourmet", "Kit festa"],
     "Escreva do seu jeito: o que você faz, para que tipo de festa e como as pessoas encomendam.",
     [("exemplo-bolo", "Bolo de casamento de três andares", "Encomenda",
       "Ponha o preço a partir de quanto e o prazo de encomenda aqui na frase.")],
     [("exemplo-curso", "Escola Exemplo", "education", "Curso de confeitaria", "2021")]),

    ("educacao", "Professor / Educação", 90, "oceano", "grid", ("Professor", "graduation-cap"),
     {"stacks": "Disciplinas", "projects": "Cursos e materiais", "cases": "cursos",
      "experience": "Titulação e aprovações", "challenge": "A dificuldade",
      "solution": "Como eu ensino", "features": "O que o aluno recebe", "stackLabel": "Conteúdo",
      "visit": "Ver o curso"},
     ["Direito constitucional", "Preparatório", "Aula ao vivo", "Material próprio"],
     "Fale da sua titulação, de quantos alunos já passaram por você e de como é a sua aula.",
     [("exemplo-curso", "Curso preparatório completo", "Curso",
       "Anexe o certificado nas suas formações: ele aparece como botão no card.")],
     [("exemplo-mestrado", "Universidade Exemplo", "education", "Mestrado", "2016"),
      ("exemplo-cursinho", "Cursinho Exemplo", "work", "Professor", "2019")]),

    ("tatuagem", "Tatuagem / Arte", 100, "sangue", "vinheta", ("Tatuador", "pen-tool"),
     {"stacks": "Estilos", "projects": "Trabalhos", "cases": "tattoos", "experience": "Trajetória",
      "challenge": "A ideia do cliente", "solution": "Como ficou", "features": "O que está incluso",
      "stackLabel": "Técnica", "visit": "Ver no Instagram"},
     ["Blackwork", "Fineline", "Pontilhismo", "Desenho autoral"],
     "Curto e no seu tom: o que você tatua, como agenda e o que não faz.",
     [("exemplo-tattoo", "Fechamento de braço", "Blackwork",
       "Foto vertical funciona: escolha preencher o card e ajuste o enquadramento.")],
     [("exemplo-estudio", "Estúdio Exemplo", "work", "Tatuador", "2020")]),
]


def lit(s):
    return "'" + str(s).replace("'", "''") + "'"


linhas = []
for kit, label, ordem, preset, fundo, badge, ui, stacks, bio, projs, exps in KITS:
    definicao = {
        "theme_preset": preset,
        "background_kind": fundo,
        "badge": {"label": badge[0], "icon": badge[1]},
        "ui_labels": {k: {"pt": v} for k, v in ui.items()},
        "stacks": stacks,
        "bio": bio,
        "projects": [{"slug": s, "name": n, "category": c, "tagline": t} for s, n, c, t in projs],
        "experiences": [{"slug": s, "org": o, "kind": k, "role": r, "period_start": p}
                        for s, o, k, r, p in exps],
    }
    linhas.append(
        "insert into myportifolio.starter_kits (kit, label, ordem, definition) values ("
        + lit(kit) + ", " + lit(label) + ", " + str(ordem) + ", "
        + lit(json.dumps(definicao, ensure_ascii=False)) + "::jsonb) "
        "on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, "
        "definition = excluded.definition, ativo = true;"
    )

io.open("out/seed-kits.sql", "w", encoding="utf-8").write("\n".join(linhas) + "\n")
print(len(KITS), "kits gerados")
