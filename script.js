"use strict";

const ARTISTAS = [
  { nombre: "2Pac",                foto: "images/2pac foto.jpg", youtube: "https://www.youtube.com/watch?v=0VGjV8Suyvg&list=RD0VGjV8Suyvg&start_radio=1" },
  { nombre: "The Notorious B.I.G.", foto: "images/biggie foto.jpg", youtube: "https://www.youtube.com/watch?v=phaJXp_zMYM&list=RDphaJXp_zMYM&start_radio=1" },
  { nombre: "Snoop Dogg",          foto: "images/snoop foto.jpg", youtube: "https://youtu.be/GtUVQei3nX4?si=MJgXEvP9Li-qFNHR" },
  { nombre: "Eminem",              foto: "images/eminem foto.jpg", youtube: "https://youtu.be/eJO5HU_7_1w?si=EC-ndRTG-TSEItNx" },
  { nombre: "Kendrick Lamar",      foto: "images/kendrick foto.jpg", youtube: "https://youtu.be/zI383uEwA6Q?si=Uwx-13-5wu6zK_fv" },
  { nombre: "50 Cent",             foto: "images/50cent foto.jpg", youtube: "https://youtu.be/5qm8PH4xAss?si=S7sz2Q9-5V4CjDX6" },
  { nombre: "Nas",                 foto: "images/nas foto.jpg", youtube: "https://youtu.be/mlp-IIG9ApU?si=so_Xm-fKgq5JYHoJ" },
  { nombre: "Ice Cube",            foto: "images/ice cube foto.jpg", youtube: "https://youtu.be/rzRqEWJYwX4?si=NuoequMpezcilZqt" },
  { nombre: "Tyler, the Creator",  foto: "images/tyler foto.jpg", youtube: "https://youtu.be/TGgcC5xg9YI?si=VC5xChJbjb9E8qjL" },
  { nombre: "Crudo Means Raw",     foto: "images/crudo.jpg", youtube: "https://youtu.be/xETRzD3nYTk?si=O3E7gM5Q0PH3zK8E" },
];

const EFECTOS = { scratch: "sound/click.mp3", corte: "sound/para.mp3", coincidencia: "sound/sisi.mp3" };

const NOMBRES_PARTES = ["Cabeza", "Torso", "Piernas"];
const TIEMPOS_PARADA = [900, 1600, 2300];      // milisegundos: la cabeza se detiene primero
const TONOS_PROVISIONALES = ["#733F37", "#87917C", "#C0A36B", "#3b3f38", "#5a4a3c"];
const estado = { mezclas: 0, mezclando: false, sonido: false, seleccion: [0, 0, 0] };
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const obtener = (identificador) => document.getElementById(identificador);

function elegirIndiceUniforme(total) {
  const limite = Math.floor(4294967296 / total) * total;   // descarta valores que sesgarían el resultado
  const numero = new Uint32Array(1);
  do { crypto.getRandomValues(numero); } while (numero[0] >= limite);
  return numero[0] % total;
}
function precargarFotografias() {
  ARTISTAS.forEach((artista) => {
    artista.imagen = null;
    if (!artista.foto) return;
    const imagen = new Image();
    imagen.onload = () => { artista.imagen = imagen; pintarTodas(); };
    imagen.onerror = () => { console.warn("No se encontró la fotografía de " + artista.nombre + ": " + artista.foto); };
    imagen.src = artista.foto;
  });
}
function pintarFranja(posicion, indiceArtista) {
  const artista = ARTISTAS[indiceArtista];
  const franja = document.querySelector('.franja[data-franja="' + posicion + '"]');
  const fotograma = franja.querySelector(".fotograma");
  if (artista.imagen) {
    fotograma.style.backgroundImage = 'url("' + artista.foto + '")';
  } else {
    const tono = TONOS_PROVISIONALES[indiceArtista % TONOS_PROVISIONALES.length];
    fotograma.style.backgroundImage = "linear-gradient(160deg, " + tono + ", #171916 85%)";
  }
  const numero = String(indiceArtista + 1).padStart(2, "0");
  franja.querySelector(".franja__etiqueta").textContent = artista.imagen
    ? numero + " · " + artista.nombre
    : numero + " · " + artista.nombre + " · foto pendiente";
  obtener("nombreFragmento" + posicion).textContent = artista.nombre;
}
function pintarTodas() { estado.seleccion.forEach((indice, posicion) => pintarFranja(posicion, indice)); }

function reproducirEfecto(nombre) {
  if (!estado.sonido || !EFECTOS[nombre]) return;
  new Audio(EFECTOS[nombre]).play().catch(() => {});
}
function alternarSonido() {
  estado.sonido = !estado.sonido;
  const boton = obtener("botonSonido");
  boton.textContent = "Efectos de sonido: " + (estado.sonido ? "sí" : "no");
  boton.setAttribute("aria-pressed", String(estado.sonido));
}

function mezclarFragmentos() {
  if (estado.mezclando) return;
  estado.mezclando = true;
  cerrarCoincidencia();
  obtener("botonMezclar").disabled = true;
  obtener("mensajeEstado").textContent = "Cortando cinta…";
  reproducirEfecto("scratch");

  const coincidenciaForzada = elegirIndiceUniforme(100) < 29;
const finales = coincidenciaForzada ? Array(3).fill(elegirIndiceUniforme(ARTISTAS.length)) : [0, 1, 2].map(() => elegirIndiceUniforme(ARTISTAS.length));
  const tiempos = reducirMovimiento ? [0, 150, 300] : TIEMPOS_PARADA;
  const franjas = document.querySelectorAll(".franja");
  const temporizadores = [];

  franjas.forEach((franja, posicion) => {
    franja.classList.remove("detenida");
    if (!reducirMovimiento) {
      franja.classList.add("girando");
      temporizadores[posicion] = setInterval(() => pintarFranja(posicion, Math.floor(Math.random() * ARTISTAS.length)), 80);
    }
    setTimeout(() => {
      clearInterval(temporizadores[posicion]);
      estado.seleccion[posicion] = finales[posicion];
      pintarFranja(posicion, finales[posicion]);
      franja.classList.remove("girando");
      franja.classList.add("detenida");
      reproducirEfecto("corte");
      if (posicion === 2) terminarMezcla();
    }, tiempos[posicion]);
  });
}
function terminarMezcla() {
  estado.mezclas++;
  obtener("contadorMezclas").textContent = String(estado.mezclas).padStart(3, "0");
  estado.mezclando = false;
  obtener("botonMezclar").disabled = false;
  const [a, b, c] = estado.seleccion;
  if (a === b && b === c) {
    obtener("mensajeEstado").textContent = "";
    setTimeout(() => mostrarCoincidencia(a), 700);
  } else {
    obtener("mensajeEstado").textContent = "Identidad híbrida N.º " + String(estado.mezclas).padStart(3, "0") + ".";
  }
}
function mostrarCoincidencia(indiceArtista) {
  estado.artistaCoincidente = indiceArtista;
  obtener("mensajeCoincidencia").textContent = "";
  obtener("contenedorVideo").innerHTML = "";
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    dibujarPortada(ARTISTAS[indiceArtista], indiceArtista);
    obtener("coincidencia").hidden = false;
    reproducirEfecto("coincidencia");
  });
}
function cerrarCoincidencia() {
  obtener("coincidencia").hidden = true;
  obtener("contenedorVideo").innerHTML = "";
}

function dibujarPortada(artista, indice) {
  const lienzo = obtener("lienzoPortada"), t = lienzo.width, x = lienzo.getContext("2d");
  x.fillStyle = "#171916"; x.fillRect(0, 0, t, t);
  if (artista.imagen) {                                   // fotografía recortada para cubrir el cuadrado, alineada arriba
    const im = artista.imagen, escala = Math.max(t / im.width, t / im.height);
    x.save(); x.filter = "grayscale(1) contrast(1.1)";
    x.drawImage(im, (t - im.width * escala) / 2, 0, im.width * escala, im.height * escala);
    x.restore();
  } else {
    const degradado = x.createLinearGradient(0, 0, t, t);
    degradado.addColorStop(0, TONOS_PROVISIONALES[indice % TONOS_PROVISIONALES.length]); degradado.addColorStop(1, "#171916");
    x.fillStyle = degradado; x.fillRect(0, 0, t, t);
  }
  const velo = x.createLinearGradient(0, t * 0.35, 0, t);
  velo.addColorStop(0, "rgba(23,25,22,0)"); velo.addColorStop(1, "rgba(23,25,22,.94)");
  x.fillStyle = velo; x.fillRect(0, 0, t, t);
  x.fillStyle = "rgba(115,63,55,.85)"; x.fillRect(60, 60, 14, 300);               // franja vino editorial
  x.strokeStyle = "#C0A36B"; x.lineWidth = 2; x.strokeRect(36, 36, t - 72, t - 72);  // marco dorado fino
  x.fillStyle = "#E9E4D8"; x.font = "26px 'IBM Plex Mono', monospace"; x.textBaseline = "alphabetic";
  x.fillText("SAMPLE — UN ESTUDIO EN FRAGMENTOS", 100, 100);
  x.fillStyle = "#C0A36B"; x.fillText("N.º " + String(indice + 1).padStart(2, "0") + " / MEZCLA " + String(estado.mezclas).padStart(3, "0"), 100, 140);
  let tamano = 230;                                        // el nombre se reduce hasta caber en el ancho
  do { x.font = tamano + "px Anton, Impact, sans-serif"; tamano -= 6; } while (x.measureText(artista.nombre.toUpperCase()).width > t - 200 && tamano > 40);
  x.fillStyle = "#E9E4D8"; x.fillText(artista.nombre.toUpperCase(), 100, t - 190);
  x.fillStyle = "#87917C"; x.font = "italic 38px 'Cormorant Garamond', Georgia, serif";
  x.fillText("Cada identidad es un remix.", 100, t - 120);
  x.fillStyle = "#C0A36B"; x.font = "22px 'IBM Plex Mono', monospace";
  x.fillText(artista.imagen ? "COLECCIÓN / EDICIÓN 01" : "FOTOGRAFÍA PENDIENTE", 100, t - 80);
}


function escucharMusica() {
  window.open(ARTISTAS[estado.artistaCoincidente].youtube, "_blank");
}
/* ===== 11. ENTRADA Y EVENTOS ===== */
function entrarAlLaboratorio() {
  const portada = obtener("portada");
  portada.classList.add("saliendo");
  setTimeout(() => {
    portada.hidden = true;
    obtener("laboratorio").hidden = false;
    pintarTodas();
    mezclarFragmentos();
  }, reducirMovimiento ? 0 : 700);
}

precargarFotografias();
pintarTodas();
obtener("botonEntrar").addEventListener("click", entrarAlLaboratorio);
obtener("botonMezclar").addEventListener("click", mezclarFragmentos);
obtener("botonRemezclar").addEventListener("click", mezclarFragmentos);
obtener("botonSonido").addEventListener("click", alternarSonido);
obtener("botonEscuchar").addEventListener("click", escucharMusica);
obtener("botonCerrar").addEventListener("click", cerrarCoincidencia);
document.addEventListener("keydown", (evento) => { if (evento.key === "Escape") cerrarCoincidencia(); });
