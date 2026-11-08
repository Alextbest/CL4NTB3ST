const designs = {
  veterano: ["#f5c542","#9b6500",'<path d="M50 18 59 38 81 40 64 55 69 77 50 65 31 77 36 55 19 40 41 38Z" fill="currentColor" stroke="#fff1a8" stroke-width="2"/>'],
  activo: ["#58c8ff","#1748bd",'<path d="M50 18 59 38 81 40 64 55 69 77 50 65 31 77 36 55 19 40 41 38Z" fill="currentColor" stroke="#d8f6ff" stroke-width="2"/>'],
  francotirador: ["#ff354d","#710d20",'<circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" stroke-width="5"/><path d="M50 13v20m0 34v20M13 50h20m34 0h20" stroke="currentColor" stroke-width="5"/><path d="M37 42 50 35 63 42 68 56 50 72 32 56Z" fill="#e8e8e8" stroke="#fff" stroke-width="2"/><circle cx="43" cy="51" r="3" fill="#111"/><circle cx="57" cy="51" r="3" fill="#111"/><path d="m46 60 4 4 4-4" stroke="#111" stroke-width="3" fill="none"/>'],
  imparable: ["#ffca35","#a64b00",'<path d="M50 15 58 32 76 22 72 43 91 49 73 59 80 80 59 72 50 91 41 72 20 80 27 59 9 49 28 43 24 22 42 32Z" fill="currentColor" stroke="#fff0a0" stroke-width="3"/><path d="m30 42 20 13 20-13M39 43l11 13 11-13" stroke="#6b3500" stroke-width="3" fill="none"/>'],
  leal: ["#ff4655","#8c1427",'<path d="m20 40 18-15 12 12 12-12 18 15-13 15-17 19-17-19Z" fill="currentColor" stroke="#ffb0b8" stroke-width="3"/><path d="m31 46 12 12 8-8 8 8 12-12M40 38l10 10 10-10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>'],
  companerismo: ["#ff4fc3","#85115f",'<path d="M50 78 19 49C-1 24 28 10 50 33 72 10 101 24 81 49Z" fill="currentColor" stroke="#ffc5ec" stroke-width="3"/><path d="M28 47h15l7 8 7-8h15M38 58l12 9 12-9" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>'],
  desde: ["#c45bff","#5420a5",'<path d="M50 84c-22-15-28-35-10-55-2 17 9 17 10 0 17 17 27 31 10 55 2-17-2-24-10-31-8 7-12 14-10 31Z" fill="currentColor" stroke="#f0c5ff" stroke-width="3"/><path d="M50 81c-9-13-4-22 0-28 8 10 10 18 0 28Z" fill="#fff"/>'],
  diamante: ["#48d8ff","#0755b8",'<path d="M50 12 86 38 50 88 14 38Z" fill="currentColor" stroke="#d8fbff" stroke-width="3"/><path d="M14 38h72M50 12 38 38l12 50 12-50Z" fill="none" stroke="#fff" stroke-width="3"/><path d="m50 12 12 26H38Z" fill="#fff" opacity=".5"/>'],
  maestro: ["#ffc83e","#9b6200",'<path d="M50 14 58 34 80 25 72 46 91 57 68 64 68 87 50 72 32 87 32 64 9 57 28 46 20 25 42 34Z" fill="currentColor" stroke="#fff0a0" stroke-width="3"/><path d="m24 45-13 7m65-7 13 7M24 63l-9 17m61-17 9 17" stroke="#ffe38b" stroke-width="5"/>'],
  leyenda: ["#ff5540","#9f1714",'<path d="M50 14 60 35 83 29 72 50 88 66 64 68 50 90 36 68 12 66 28 50 17 29 40 35Z" fill="currentColor" stroke="#ffd07a" stroke-width="3"/><path d="M29 46 50 58 71 46M38 34l12 24 12-24" stroke="#fff2c0" stroke-width="3" fill="none"/>'],
  elite: ["#bd7aff","#4c1c9b",'<path d="M50 12 83 28 77 66 50 89 23 66 17 28Z" fill="currentColor" stroke="#eedaff" stroke-width="3"/><path d="m50 27 19 12-19 31-19-31Z" fill="none" stroke="#fff" stroke-width="4"/><path d="m50 27 0 43" stroke="#fff" stroke-width="3"/>'],
  rey: ["#f5c43d","#a36b08",'<path d="m15 65 8-30 17 13 10-28 10 28 17-13 8 30Z" fill="currentColor" stroke="#fff0a0" stroke-width="3"/><path d="M20 72h60M28 80h44M15 55c-8 10-4 24 9 28m61-28c8 10 4 24-9 28" stroke="#ffe28b" stroke-width="4" fill="none"/>']
};
const aliases = {
  veterano:"veterano", activo:"activo", francotirador:"francotirador", imparable:"imparable",
  leal:"leal", companerismo:"companerismo", "desde-las-cenizas":"desde", diamante:"diamante",
  maestro:"maestro", leyenda:"leyenda", elite:"elite", "rey-del-clan":"rey",
  "campeon-torneo":"rey", exclusiva:"diamante", fundador:"rey", "guerrero-1v1":"elite",
  honor:"leal", "jugador-mvp":"maestro", "leyenda-tb3st":"leyenda", "mente-estrategica":"maestro",
  mvp:"maestro", participante:"activo", "primera-mision":"veterano"
};
export function badgeIconMarkup(slug, rarity="common", size=64) {
  const key=aliases[String(slug||"").toLowerCase()]||"veterano";
  const [light,dark,art]=designs[key];
  return '<svg class="clan-badge-art rarity-'+String(rarity).replace(/[^a-z]/g,"")+'" viewBox="0 0 100 100" width="'+size+'" height="'+size+'" role="img" aria-label="Insignia '+key+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg-'+key+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient><filter id="glow-'+key+'"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M50 4 91 25 84 73 50 96 16 73 9 25Z" fill="#080a12" stroke="url(#bg-'+key+')" stroke-width="5"/><path d="M50 10 84 28 78 69 50 89 22 69 16 28Z" fill="url(#bg-'+key+')" opacity=".24" stroke="'+light+'" stroke-width="2"/><g color="'+light+'" filter="url(#glow-'+key+')">'+art+'</g></svg>';
}
