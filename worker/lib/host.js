import { RESERVADOS } from './reservados.js';

// Resolve o que um hostname significa. E a primeira decisao de toda requisicao.
//
// Tres respostas possiveis:
//   { tipo: 'apex' }                 vitrine, checkout, login e editor
//   { tipo: 'tenant', slug: 'x' }    portfolio de um comprador
//   { tipo: 'reservado', slug: 'x' } subdominio que a plataforma usa, nunca de cliente
//
// POR QUE `www` E APEX E NAO TENANT: www e um subdominio como qualquer outro para o DNS, e
// a rota curinga do Worker pega ele. Sem tratar aqui, `www.myportifolio.com.br` viraria uma
// busca pelo tenant de slug "www", que nao existe, e o site principal responderia "endereco
// livre" no seu proprio dominio.

// Rotulo DNS valido. Esta regra e GEMEA da funcao slug_dns_valido do banco, e as duas
// precisam concordar: o banco decide o que pode ser gravado, e isto decide o que e aceito
// na URL. Divergir significa slug que existe no banco e nunca e alcancavel, ou o contrario.
// Universal SSL cobre o apex e UM nivel de subdominio, entao ponto nunca pode ser aceito.
const RE_ROTULO = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

export function ehRotuloDnsValido(s) {
  return typeof s === 'string' && s.length >= 3 && s.length <= 63 && RE_ROTULO.test(s) && !s.includes('--');
}

export function resolverHost(hostname, apexHost) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  const apex = String(apexHost || '').toLowerCase();

  if (!apex) return { tipo: 'apex' };
  if (host === apex || host === `www.${apex}`) return { tipo: 'apex' };

  if (!host.endsWith(`.${apex}`)) return { tipo: 'apex' };

  const rotulo = host.slice(0, -(apex.length + 1));

  // Subdominio de mais de um nivel (a.b.dominio) nao e coberto pelo Universal SSL e nao e
  // formato valido de slug. Tratar como reservado evita servir algo por um hostname cujo
  // certificado nao cobre.
  if (rotulo.includes('.')) return { tipo: 'reservado', slug: rotulo };

  if (!ehRotuloDnsValido(rotulo)) return { tipo: 'reservado', slug: rotulo };
  if (RESERVADOS.has(rotulo)) return { tipo: 'reservado', slug: rotulo };

  return { tipo: 'tenant', slug: rotulo };
}
