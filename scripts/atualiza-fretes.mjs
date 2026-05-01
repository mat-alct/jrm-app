import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();

// Lista enviada pela loja: [nome, frete em reais]
const FRETES = [
  ['Japuíba', 10],
  ['Areal', 10],
  ['Promorar', 10],
  ['Ribeira', 10],
  ['Belém', 10],
  ['Gamboa do Belém', 10],
  ['Nova Angra', 10],
  ['Centro', 15],
  ['Balneário', 15],
  ['Enseada', 15],
  ['Retiro', 15],
  ['Banqueta', 15],
  ['Campo Belo', 15],
  ['Morro da Cruz', 15],
  ['Vila Velha', 20],
  ['Morro da Gloria 1 e 2', 20],
  ['Morro do Perez', 20],
  ['Morro da Fortaleza', 20],
  ['Morro do Tatu', 20],
  ['Morro do Carmo', 20],
  ["Morro da Caixa D'água", 20],
  ['Morro Santo Antônio', 20],
  ['Morro da Carioca', 20],
  ['Morro do Abel', 20],
  ['Sapinhatuba 1, 2 e 3', 20],
  ['Praia Grande', 20],
  ['Bracuhi', 20],
  ['Gamboa do Bracuhi', 15],
  ['Pontal', 20],
  ['Vila nova *Tararaca', 20],
  ['Camorim Grande e Pequeno', 20],
  ['Santa Rita', 20],
  ['Praia do Machado', 20],
  ['Verolme', 20],
  ['Mombaça', 20],
  ['Praia brava', 20],
  ['Vila Histórica', 20],
  ['Tanema', 30],
  ['Caleira', 30],
  ['Piraquara', 30],
  ['Morro do Moreno', 30],
  ['Biscaia', 30],
  ['Morro da Lambicada', 30],
  ['Ponta Leste', 30],
  ['Monsuaba', 30],
  ['Perequê', 30],
  ["Serra d'água", 50],
  ['Zungu', 50],
  ['Ariró', 50],
  ['Caputera', 50],
  ['Canta galo', 50],
  ['Porto galo', 50],
  ['Água Santa', 50],
  ['Macieis', 50],
  ['Caiteis', 50],
  ['Garatucaia', 50],
  ['Conceiçao de Jacareí', 50],
  ['Paraty', 70],
];

// lowercase + sem acentos + sem aspas + espaços normalizados
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (acentos)
    .replace(/['‘’`]/g, '') // remove ' ' ' `
    .replace(/\s+/g, ' ')
    .trim();

// Aliases manuais: entrada (normalizada) → nome canônico no seed
const ALIASES = {
  tanema: 'Itanema',
  caleira: 'Caieira',
  caiteis: 'Caetés',
  'porto galo': 'Portogalo',
  'canta galo': 'Cantagalo',
  'vila nova *tararaca': 'Vila Nova',
  'morro santo antonio': 'Morro do Santo Antônio',
  bracuhi: 'Bracuhy',
  'gamboa do bracuhi': 'Gamboa do Bracuí',
};

// Expansões: 1 entrada do usuário → N bairros do seed
const EXPANSIONS = {
  'morro da gloria 1 e 2': ['Morro da Gloria', 'Morro da Gloria II'],
  'sapinhatuba 1, 2 e 3': [
    'Sapinhatuba I',
    'Sapinhatuba II',
    'Sapinhatuba III',
  ],
  'camorim grande e pequeno': ['Camorim Grande', 'Camorim Pequeno'],
  caputera: ['Caputera I', 'Caputera II'],
};

const AREAS_DOC_PATH = 'config/areas';

async function main() {
  const ref = db.doc(AREAS_DOC_PATH);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(
      '❌ Documento /config/areas não existe. Abra a tela de bairros uma vez no app para inicializar o seed.',
    );
    process.exit(1);
  }
  const data = snap.data();
  const list = Array.isArray(data?.list) ? data.list.map(a => ({ ...a })) : [];
  if (list.length === 0) {
    console.error('❌ Lista de bairros vazia em /config/areas.');
    process.exit(1);
  }

  const byNormalized = new Map();
  list.forEach((a, i) => byNormalized.set(normalize(a.name), i));

  const matched = []; // [input, freight, [seedNames]]
  const unmatched = []; // [input, freight, motivo]
  const updatedNames = new Set();

  for (const [inputName, freight] of FRETES) {
    const norm = normalize(inputName);

    // 1. Expansão (prioridade)
    if (EXPANSIONS[norm]) {
      const targets = EXPANSIONS[norm];
      const found = [];
      const missing = [];
      for (const target of targets) {
        const idx = byNormalized.get(normalize(target));
        if (idx !== undefined) {
          list[idx].freight = freight;
          updatedNames.add(list[idx].name);
          found.push(list[idx].name);
        } else {
          missing.push(target);
        }
      }
      if (found.length > 0) matched.push([inputName, freight, found]);
      if (missing.length > 0) {
        unmatched.push([
          inputName,
          freight,
          `expansão sem destino: ${missing.join(', ')}`,
        ]);
      }
      continue;
    }

    // 2. Alias manual
    if (ALIASES[norm]) {
      const target = ALIASES[norm];
      const idx = byNormalized.get(normalize(target));
      if (idx !== undefined) {
        list[idx].freight = freight;
        updatedNames.add(list[idx].name);
        matched.push([inputName, freight, [list[idx].name]]);
      } else {
        unmatched.push([
          inputName,
          freight,
          `alias '${target}' não encontrado no seed`,
        ]);
      }
      continue;
    }

    // 3. Match direto normalizado
    const idx = byNormalized.get(norm);
    if (idx !== undefined) {
      list[idx].freight = freight;
      updatedNames.add(list[idx].name);
      matched.push([inputName, freight, [list[idx].name]]);
      continue;
    }

    unmatched.push([inputName, freight, 'sem correspondência no seed']);
  }

  // Relatórios
  console.log(`\n✓ MATCHED (${matched.length}):`);
  for (const [input, freight, targets] of matched) {
    const same =
      targets.length === 1 &&
      normalize(targets[0]) === normalize(input);
    if (same) {
      console.log(`  ${input.padEnd(34)} R$ ${freight}`);
    } else {
      console.log(
        `  ${input.padEnd(34)} R$ ${freight}  →  ${targets.join(', ')}`,
      );
    }
  }

  if (unmatched.length > 0) {
    console.log(`\n⚠ UNMATCHED (${unmatched.length}) — revise manualmente:`);
    for (const [input, freight, why] of unmatched) {
      console.log(`  ${input.padEnd(34)} R$ ${freight}  (${why})`);
    }
  }

  const untouched = list.filter(a => !updatedNames.has(a.name));
  if (untouched.length > 0) {
    console.log(
      `\nℹ Bairros do seed que NÃO receberam frete (${untouched.length}):`,
    );
    for (const a of untouched) {
      console.log(`  ${a.name.padEnd(34)} R$ ${a.freight}`);
    }
  }

  if (process.argv.includes('--dry-run')) {
    console.log(
      '\n[dry-run] Nenhuma escrita realizada. Rode sem --dry-run para gravar.',
    );
    process.exit(0);
  }

  console.log(`\n→ Gravando ${updatedNames.size} atualizações em /config/areas...`);
  list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  await ref.set({ list, updatedAt: Timestamp.now() });
  console.log('✅ Concluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
