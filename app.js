// ===== Dados =====
const CANDIDATOS = {
    "14": {nome: "Chaves", partido: "PDB - Partido do Barril", emoji: "🛢️"},
    "88": {nome: "Seu Madruga", partido: "PDA - Partido da Dívida do Aluguel", emoji: "🎩"},
    "71": {nome: "Dona Clotilde", partido: "PBB - Partido das Bruxas do 71", emoji: "🧙‍♀️"},
    "55": {nome: "Kiko", partido: "PBQ - Partido da Bola Quadrada", emoji: "⚽"},
    "22": {nome: "Professor Girafales", partido: "PML - Partido do Metre Linguiça", emoji: "📚"},
    "30": {nome: "Seu Barriga", partido: "PBF - Partido do Barril sem Fundo", emoji: "💰"},
    "45": {nome: "Chiquinha", partido: "PBC - Partido ds Boneca Chiquinha", emoji: "🎀"}
};

const KEY_ELEITORES = "urna_eleitores";
const KEY_VOTOS = "urna_votos";
 
// ===== Persistência (localStorage) =====
function lerJSON(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) || padrao; }
  catch { return padrao; }
}
const getEleitores = () => lerJSON(KEY_ELEITORES, []);
const getVotos = () => lerJSON(KEY_VOTOS, {});
function salvarVoto(eleitor, escolha) {
  const eleitores = getEleitores();
  eleitores.push({ nome: eleitor.nome, titulo: eleitor.titulo, data: new Date().toISOString() });
  const votos = getVotos();
  votos[escolha] = (votos[escolha] || 0) + 1;
  localStorage.setItem(KEY_ELEITORES, JSON.stringify(eleitores));
  localStorage.setItem(KEY_VOTOS, JSON.stringify(votos));
}
 
// ===== Som (Web Audio API) =====
let audioCtx;
function bipe(freq, duracao) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    ganho.gain.setValueAtTime(0.15, audioCtx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracao);
    osc.connect(ganho).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch (e) { /* navegador sem suporte a áudio: segue sem som */ }
}
const somTecla = () => bipe(1000, 0.08);
function somConfirma() {            // sequência de bipes curtos + um bipe longo final
  bipe(900, 0.12);
  setTimeout(() => bipe(900, 0.12), 160);
  setTimeout(() => bipe(900, 0.9), 320);
}
 
// ===== Elementos e estado =====
const $ = (id) => document.getElementById(id);
const telas = ["tela-registro", "tela-urna", "tela-fim", "tela-apuracao"];
let eleitorAtual = null;
let digitos = "";
let votoBranco = false;
 
function mostrarTela(id) {
  telas.forEach((t) => { $(t).hidden = t !== id; });
}
 
// ===== Tela 1: registro =====
$("form-registro").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = $("nome").value.trim().replace(/\s+/g, " ");
  const titulo = $("titulo").value.replace(/\D/g, "");
  const erro = (msg) => { $("erro-registro").textContent = msg; };
 
  if (!nome || !titulo) return erro("Preencha o nome e o título de eleitor (ou CPF).");
  if (nome.length < 3) return erro("Digite o nome completo.");
  if (titulo.length !== 11 && titulo.length !== 12) return erro("O número deve ter 11 ou 12 dígitos.");
  if (getEleitores().some((v) => v.titulo === titulo)) return erro("Este eleitor já votou. Cada número só vota uma vez.");
 
  erro("");
  eleitorAtual = { nome, titulo };
  $("eleitor-nome").textContent = "Eleitor: " + nome;
  reiniciarVoto();
  mostrarTela("tela-urna");
});
 
// ===== Tela 2: urna =====
function atualizarVisor() {
  $("d0").textContent = digitos[0] || "";
  $("d1").textContent = digitos[1] || "";
  const cand = $("candidato"), aviso = $("aviso");
  cand.hidden = true;
  aviso.hidden = true;
 
  if (votoBranco) {
    aviso.textContent = "VOTO EM BRANCO";
    aviso.hidden = false;
  } else if (digitos.length === 2) {
    const c = CANDIDATOS[digitos];
    if (c) {
      $("cand-nome").textContent = c.nome;
      $("cand-partido").textContent = c.partido;
      const foto = $("foto");
      foto.textContent = "";
      const img = new Image();
      img.alt = c.nome;
      img.src = "img/" + digitos + ".png";           // foto opcional
      img.onload = () => foto.replaceChildren(img);
      img.onerror = () => { foto.textContent = c.emoji; }; // sem foto: usa emoji
      foto.textContent = c.emoji;
      cand.hidden = false;
    } else {
      aviso.textContent = "NÚMERO ERRADO – VOTO NULO";
      aviso.hidden = false;
    }
  }
}
 
function reiniciarVoto() {
  digitos = "";
  votoBranco = false;
  atualizarVisor();
}
 
document.querySelectorAll(".tecla[data-n]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (votoBranco || digitos.length >= 2) return;
    digitos += btn.dataset.n;
    somTecla();
    atualizarVisor();
  });
});
 
$("btn-branco").addEventListener("click", () => {
  digitos = "";
  votoBranco = true;
  somTecla();
  atualizarVisor();
});
 
$("btn-corrige").addEventListener("click", () => {
  somTecla();
  reiniciarVoto();
});
 
$("btn-confirma").addEventListener("click", () => {
  if (!votoBranco && digitos.length < 2) return;     // voto incompleto: ignora
  const escolha = votoBranco ? "branco" : (CANDIDATOS[digitos] ? digitos : "nulo");
  salvarVoto(eleitorAtual, escolha);
  somConfirma();
  eleitorAtual = null;
  mostrarTela("tela-fim");
});
 
// ===== Tela 3: fim =====
$("btn-novo").addEventListener("click", () => {
  $("form-registro").reset();
  mostrarTela("tela-registro");
  $("nome").focus();
});
 
// ===== Apuração =====
function renderApuracao() {
  const votos = getVotos();
  const linhas = Object.entries(CANDIDATOS).map(([num, c]) => [c.nome, num, votos[num] || 0]);
  linhas.push(["Branco", "—", votos.branco || 0], ["Nulo", "—", votos.nulo || 0]);
  const total = linhas.reduce((soma, l) => soma + l[2], 0);
  $("total-votos").textContent = total + (total === 1 ? " voto registrado" : " votos registrados");
  $("tabela-votos").innerHTML = linhas
    .map((l) => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td></tr>`)
    .join("");
}
 
$("btn-apuracao").addEventListener("click", () => { renderApuracao(); mostrarTela("tela-apuracao"); });
$("btn-voltar").addEventListener("click", () => mostrarTela("tela-registro"));
$("btn-zerar").addEventListener("click", () => {
  if (confirm("Apagar todos os eleitores e votos desta urna?")) {
    localStorage.removeItem(KEY_ELEITORES);
    localStorage.removeItem(KEY_VOTOS);
    renderApuracao();
  }
});
 
