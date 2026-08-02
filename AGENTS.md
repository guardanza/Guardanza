<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Idioma del copy: español neutro de Chile, NUNCA voseo argentino

Todo texto visible al usuario — componentes, páginas, mensajes de error,
placeholders, labels, correos, notificaciones, toasts, alerts — se
escribe en español neutro de Chile, con **tú**, nunca con voseo
("vos"). Esto ya se coló dos veces en producción; la tercera vez que
pase es un bug de proceso, no un despiste puntual.

**Prohibido — conjugación voseo (segunda persona singular con "vos"):**
| Voseo (prohibido) | Correcto |
|---|---|
| vos | tú |
| tenés | tienes |
| podés | puedes |
| querés | quieres |
| sabés | sabes |
| sos | eres |
| ingresá | ingresa |
| hacé | haz |
| guardá | guarda |
| revisá | revisa |
| buscá | busca |
| probá | prueba |
| compartís | compartes |
| trabajás | trabajas |

El patrón general: cualquier verbo en 2da persona singular con acento en
la última sílaba ("-**ás**", "-**és**", "-**ís**" en presente; "-**á**",
"-**é**", "-**í**" en imperativo) es voseo. La forma correcta con tú no
lleva ese acento ("ingresa", no "ingresá"; "tienes", no "tenés").

Esto aplica a **todo** el copy nuevo, sin excepción: código de
producto, comentarios que describan lo que ve el usuario, commits y
PRs que citen texto de UI, correos, notificaciones. Antes de escribir
cualquier string visible al usuario, revisar la conjugación contra esta
tabla — no asumir que "suena bien" alcanza, porque así fue como se coló
las dos veces anteriores.

Si encontrás una duda real de vocabulario (no de conjugación — por
ejemplo "acá" vs "aquí", ambas aceptables en Chile), no hace falta
preguntar; la regla es solo sobre voseo. Si aparece una palabra o
modismo específicamente argentino que no es voseo (che, boludo, laburo,
quilombo, etc.), tratarlo igual: nunca en copy de producto.
