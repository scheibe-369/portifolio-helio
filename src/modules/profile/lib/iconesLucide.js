import {
  ArrowRight, ArrowUpRight,
  Code, ChefHat, Scale, Camera, Dumbbell, Ruler, Brain, Music, Cake, GraduationCap,
  PenTool, Briefcase, Sparkles, Heart, Star, Palette, Mic, Scissors, Wrench, Leaf,
} from 'lucide';

// O mapa que o lucide recebe em createIcons. Zona [browser]: e o unico lugar que importa a
// biblioteca, e por isso ele mora fora do main.js.
//
// POR QUE OS NOMES SAO ESCRITOS UM A UM em vez de `import * as lucide`: o import estrela
// desliga o tree-shaking e arrasta a biblioteca inteira para dentro do bundle publico, que e
// servido em toda pagina de todo comprador. Escrever a lista custa uma linha por icone e o
// scripts/testar-icones.mjs reprova se ela divergir de ICONES_SELO.
//
// ARROW_RIGHT e ARROW_UP_RIGHT nao sao icones de selo: sao do chrome da pagina (a seta da
// secao de projetos e a do canto do card). Ficam aqui porque quem chama createIcons e um so.
export const ICONES_LUCIDE = {
  ArrowRight, ArrowUpRight,
  Code, ChefHat, Scale, Camera, Dumbbell, Ruler, Brain, Music, Cake, GraduationCap,
  PenTool, Briefcase, Sparkles, Heart, Star, Palette, Mic, Scissors, Wrench, Leaf,
};
