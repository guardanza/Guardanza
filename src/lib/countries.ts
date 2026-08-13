// Lista de países para el selector de teléfono — código ISO 3166-1
// alpha-2, nombre en español y código de llamada E.164. La bandera se
// computa en tiempo de ejecución a partir del código ISO (ver
// flagEmoji) en vez de guardar el emoji de cada país acá: son símbolos
// indicadores regionales Unicode, dos por bandera, calculables desde las
// dos letras del código — no hace falta mantenerlos a mano.
export type Country = {
  iso2: string;
  name: string;
  dial: string;
};

// U+1F1E6 ('🇦') es el indicador regional de "A" — el resto de las letras
// siguen en orden, así que restar el código de 'A' y sumar el offset de
// U+1F1E6 convierte cualquier letra A-Z a su indicador regional.
export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const COUNTRIES: Country[] = [
  { iso2: "CL", name: "Chile", dial: "+56" },
  { iso2: "AR", name: "Argentina", dial: "+54" },
  { iso2: "PE", name: "Perú", dial: "+51" },
  { iso2: "BO", name: "Bolivia", dial: "+591" },
  { iso2: "BR", name: "Brasil", dial: "+55" },
  { iso2: "CO", name: "Colombia", dial: "+57" },
  { iso2: "EC", name: "Ecuador", dial: "+593" },
  { iso2: "PY", name: "Paraguay", dial: "+595" },
  { iso2: "UY", name: "Uruguay", dial: "+598" },
  { iso2: "VE", name: "Venezuela", dial: "+58" },
  { iso2: "MX", name: "México", dial: "+52" },
  { iso2: "US", name: "Estados Unidos", dial: "+1" },
  { iso2: "CA", name: "Canadá", dial: "+1" },
  { iso2: "GT", name: "Guatemala", dial: "+502" },
  { iso2: "HN", name: "Honduras", dial: "+504" },
  { iso2: "SV", name: "El Salvador", dial: "+503" },
  { iso2: "NI", name: "Nicaragua", dial: "+505" },
  { iso2: "CR", name: "Costa Rica", dial: "+506" },
  { iso2: "PA", name: "Panamá", dial: "+507" },
  { iso2: "CU", name: "Cuba", dial: "+53" },
  { iso2: "DO", name: "República Dominicana", dial: "+1" },
  { iso2: "PR", name: "Puerto Rico", dial: "+1" },
  { iso2: "ES", name: "España", dial: "+34" },
  { iso2: "PT", name: "Portugal", dial: "+351" },
  { iso2: "FR", name: "Francia", dial: "+33" },
  { iso2: "IT", name: "Italia", dial: "+39" },
  { iso2: "DE", name: "Alemania", dial: "+49" },
  { iso2: "GB", name: "Reino Unido", dial: "+44" },
  { iso2: "IE", name: "Irlanda", dial: "+353" },
  { iso2: "NL", name: "Países Bajos", dial: "+31" },
  { iso2: "BE", name: "Bélgica", dial: "+32" },
  { iso2: "CH", name: "Suiza", dial: "+41" },
  { iso2: "AT", name: "Austria", dial: "+43" },
  { iso2: "SE", name: "Suecia", dial: "+46" },
  { iso2: "NO", name: "Noruega", dial: "+47" },
  { iso2: "DK", name: "Dinamarca", dial: "+45" },
  { iso2: "FI", name: "Finlandia", dial: "+358" },
  { iso2: "PL", name: "Polonia", dial: "+48" },
  { iso2: "GR", name: "Grecia", dial: "+30" },
  { iso2: "RU", name: "Rusia", dial: "+7" },
  { iso2: "UA", name: "Ucrania", dial: "+380" },
  { iso2: "TR", name: "Turquía", dial: "+90" },
  { iso2: "IL", name: "Israel", dial: "+972" },
  { iso2: "AE", name: "Emiratos Árabes Unidos", dial: "+971" },
  { iso2: "SA", name: "Arabia Saudita", dial: "+966" },
  { iso2: "ZA", name: "Sudáfrica", dial: "+27" },
  { iso2: "EG", name: "Egipto", dial: "+20" },
  { iso2: "NG", name: "Nigeria", dial: "+234" },
  { iso2: "MA", name: "Marruecos", dial: "+212" },
  { iso2: "IN", name: "India", dial: "+91" },
  { iso2: "CN", name: "China", dial: "+86" },
  { iso2: "JP", name: "Japón", dial: "+81" },
  { iso2: "KR", name: "Corea del Sur", dial: "+82" },
  { iso2: "PH", name: "Filipinas", dial: "+63" },
  { iso2: "ID", name: "Indonesia", dial: "+62" },
  { iso2: "TH", name: "Tailandia", dial: "+66" },
  { iso2: "VN", name: "Vietnam", dial: "+84" },
  { iso2: "SG", name: "Singapur", dial: "+65" },
  { iso2: "MY", name: "Malasia", dial: "+60" },
  { iso2: "AU", name: "Australia", dial: "+61" },
  { iso2: "NZ", name: "Nueva Zelanda", dial: "+64" },
];

export const DEFAULT_COUNTRY_ISO2 = "CL";

export function findCountry(iso2: string): Country {
  return COUNTRIES.find((c) => c.iso2 === iso2) ?? COUNTRIES[0];
}
