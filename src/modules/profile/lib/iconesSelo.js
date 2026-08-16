// Os icones que o selo do perfil aceita. Zona [iso]: e lista de nomes, sem importar lucide.
//
// POR QUE UMA LISTA FECHADA, e por que ela mora aqui e nao no componente: o icone e
// desenhado pelo lucide, que so pinta o que foi REGISTRADO no bundle (src/main.js chama
// createIcons com um mapa explicito, para nao arrastar a biblioteca inteira). Se o comprador
// pudesse gravar um nome qualquer em badge_icon, o `<i data-lucide="...">` ficaria no HTML e
// simplesmente nao viraria desenho: um buraco no card de perfil, sem erro no console e sem
// nada que o dom-diff visse.
//
// Entao esta lista e a fonte unica de tres coisas que precisam concordar: o que o editor
// oferece, o que o render aceita, e o que o main.js registra. Acrescentar icone e mexer
// aqui e no mapa de import do main.js, e o teste scripts/testar-icones.mjs reprova se os
// dois divergirem.
//
// A chave e o nome kebab-case que vai no atributo data-lucide; o valor e o nome do export do
// pacote, que e PascalCase.
export const ICONES_SELO = {
  'code': 'Code',
  'chef-hat': 'ChefHat',
  'scale': 'Scale',
  'camera': 'Camera',
  'dumbbell': 'Dumbbell',
  'ruler': 'Ruler',
  'brain': 'Brain',
  'music': 'Music',
  'cake': 'Cake',
  'graduation-cap': 'GraduationCap',
  'pen-tool': 'PenTool',
  'briefcase': 'Briefcase',
  'sparkles': 'Sparkles',
  'heart': 'Heart',
  'star': 'Star',
  'palette': 'Palette',
  'mic': 'Mic',
  'scissors': 'Scissors',
  'wrench': 'Wrench',
  'leaf': 'Leaf',
};

// Nome seguro para o atributo, ou null. Null significa "selo sem icone", que e um estado
// valido e bonito: o selo continua sendo o rotulo. Nunca devolve nome nao registrado, porque
// isso seria um icone invisivel.
export const iconeSeloValido = (nome) =>
  (typeof nome === 'string' && Object.prototype.hasOwnProperty.call(ICONES_SELO, nome)) ? nome : null;
