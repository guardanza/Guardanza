import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Info, CheckCircle2, AlertTriangle, Plus, Trash2, Building2 } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ContactStatusBadge } from "@/components/contact-status-badge";
import { RoleBadge } from "@/components/role-badge";
import { RoleChip } from "@/components/role-chip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RutInput } from "@/components/rut-input";
import { PhoneInput } from "@/components/phone-input";
import { PasswordInput } from "@/components/password-input";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { ContactCard } from "@/components/contact-card";
import { CandidateCard } from "@/components/candidate-card";
import { PropertyCard } from "@/components/property-card";
import { GreenChip, GreenEmptyState } from "@/components/ui/green-card";
import { GreenInfoBox, GreenInfoRow } from "@/components/ui/green-info-box";
import { TokenSwatch, TypeSample, BottomSheetDemo } from "./interactive";
import { noopAction } from "./noop-action";

// Página de referencia de marca — NO es parte del producto (nadie llega
// acá desde la navegación normal). Vive fuera del index de buscadores
// (robots abajo) pero adentro del alcance del gate del sitio: proxy.ts
// no la excluye como sí excluye /terminos y /privacidad, así que si
// GATE_PASSWORD se reactiva alguna vez, /estilos queda protegida
// automáticamente junto con el resto — no hace falta una sesión de
// usuario aparte para eso. Ver la sección "Acerca de esta página", más
// abajo, para el detalle de esta decisión.
export const metadata: Metadata = {
  title: "Sistema de diseño — Guardanza",
  description: "Referencia interna de marca: paleta, tipografía y componentes de Guardanza. Página no indexada, de uso interno.",
  robots: { index: false, follow: false, nocache: true },
};

const TOC = [
  { href: "#logo", label: "Logo" },
  { href: "#colores", label: "Colores" },
  { href: "#tipografia", label: "Tipografía" },
  { href: "#chips", label: "Chips y badges" },
  { href: "#botones", label: "Botones" },
  { href: "#tarjetas", label: "Tarjetas" },
  { href: "#otros", label: "Otros componentes" },
  { href: "#seo", label: "SEO en páginas reales" },
  { href: "#acerca", label: "Acerca de esta página" },
];

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4 border-t border-border pt-10 first:border-0 first:pt-0">
      <div className="space-y-1">
        <h2 className="text-2xl">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base">{title}</h3>
      {children}
    </div>
  );
}

export default function EstilosPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 md:px-6 md:py-12">
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Volver a la app
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">Sistema de diseño</h1>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">No indexada · uso interno</span>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Referencia visual de la marca Guardanza: logo, paleta, tipografía y componentes — todo renderizado en vivo con los mismos
          componentes y tokens que usa el resto de la app (no valores copiados a mano). Si algo cambia en <code className="font-mono text-xs">globals.css</code>{" "}
          o en un componente, esta página lo refleja sola.
        </p>
        <nav aria-label="Contenido de la página" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {TOC.map((item) => (
            <a key={item.href} href={item.href} className="text-primary hover:underline">
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <Section id="logo" title="Logo" description="Escudo bicolor con muesca en V, SVG inline (src/components/logo.tsx) — no un PNG, así se ve nítido a cualquier tamaño.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6">
            <LogoMark size={40} />
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">{"<LogoMark />"}</code> — solo el escudo, tamaño ajustable por prop.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6">
            <Logo />
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">{"<Logo />"}</code> — escudo + wordmark, el uso normal (header, sidebar, gate).
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-brand-forest p-6">
            <LogoMark size={40} invert />
            <p className="text-center text-xs text-brand-forest-foreground/80">
              <code className="font-mono">{"<LogoMark invert />"}</code> — para fondo oscuro/verde. Ningún lugar de la app lo usa hoy; queda listo.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="colores"
        title="Colores"
        description="Cada bloque lee su propio color ya resuelto por el navegador (no un hex tipeado a mano) — el nombre técnico es la clase de Tailwind / variable CSS real."
      >
        <SubSection title="Colores de marca">
          <div className="grid gap-3 sm:grid-cols-2">
            <TokenSwatch name="Primary" cssVar="--primary · bg-primary" swatchClassName="bg-primary text-primary-foreground" usage="Botones y acciones principales, acentos de marca." />
            <TokenSwatch
              name="Brand forest"
              cssVar="--brand-forest · text-brand-forest"
              swatchClassName="bg-brand-forest text-brand-forest-foreground"
              usage="Texto de títulos (h1–h6) y el wordmark del logo. Se invierte en modo oscuro — nunca se usa como fondo de tarjeta."
            />
            <TokenSwatch
              name="Green card (75%)"
              cssVar="--brand-green-card · bg-brand-green-card"
              swatchClassName="bg-brand-green-card text-brand-green-card-foreground"
              usage="Fondo de las tarjetas de Contactos y Candidatos 'en evaluación'. Fijo en todos los temas — ver contraste verificado más abajo."
            />
            <TokenSwatch
              name="Green card deep"
              cssVar="--brand-green-card-deep"
              swatchClassName="bg-brand-green-card-deep text-white"
              usage="Variante oscura: candidato con documentos completos, círculo de iniciales."
            />
            <TokenSwatch name="Brand gold" cssVar="--brand-gold" swatchClassName="bg-brand-gold text-brand-gold-foreground" usage="Detalle de acento (línea dorada en botón primario), aviso suave de invitar/agregar contacto." />
            <TokenSwatch name="Brand sand" cssVar="--brand-sand" swatchClassName="bg-brand-sand text-brand-sand-foreground" usage="Botón variant='outline'." />
          </div>
        </SubSection>

        <SubSection title="Colores funcionales (significado, no marca)">
          <div className="grid gap-3 sm:grid-cols-2">
            <TokenSwatch name="Destructive" cssVar="--destructive" swatchClassName="bg-destructive text-white" usage="Peligro / eliminar — botón destructive, ícono de descartar." />
            <TokenSwatch
              name="Success"
              cssVar="--success"
              swatchClassName="bg-success text-success-foreground"
              usage="Estado positivo: confirmado, activo, pagado. Mismo verde que Primary, unificado a propósito."
            />
            <TokenSwatch name="Info" cssVar="--info" swatchClassName="bg-info text-info-foreground" usage="Algo sobre la mesa (ej. propuesta de término de contrato) — ni éxito ni alarma." />
            <TokenSwatch name="Muted" cssVar="--muted" swatchClassName="bg-muted text-muted-foreground" usage="Neutro en espera: pendiente, cancelado, sin asignar. Nunca rojo." />
            <TokenSwatch name="Secondary" cssVar="--secondary" swatchClassName="bg-secondary text-secondary-foreground" usage="Superficies secundarias, pestañas inactivas alternativas." />
            <TokenSwatch name="Accent" cssVar="--accent" swatchClassName="bg-accent text-accent-foreground" usage="Estados 'pendiente de acción': firma pendiente, evaluación en curso." />
            <TokenSwatch name="Border" cssVar="--border" swatchClassName="bg-border text-foreground" usage="Bordes y separadores de toda la app." />
            <TokenSwatch name="Surface muted" cssVar="--surface-muted" swatchClassName="bg-surface-muted text-foreground" usage="Superficie en reposo, un punto más clara que Muted (pestañas inactivas de Contactos)." />
          </div>
        </SubSection>
      </Section>

      <Section
        id="tipografia"
        title="Tipografía"
        description="Montserrat en toda la app. La escala es la de Tailwind con dos ajustes deliberados en globals.css — cada tamaño mide su propio font-size ya calculado por el navegador."
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <TypeSample twClass="text-xs" note="chips y labels cortos — no usar en cuerpo de texto" sample="Texto en tamaño xs." />
          <TypeSample twClass="text-sm" note="cuerpo real de la app — piso de legibilidad pedido (13px), nunca por debajo" sample="Texto en tamaño sm — el más usado en toda la interfaz." />
          <TypeSample twClass="text-base" note="cuerpo secundario e inputs" sample="Texto en tamaño base." />
          <TypeSample twClass="text-lg" note="destacados — ej. nombre en la tarjeta de Candidatos" sample="Texto en tamaño lg." />
          <TypeSample twClass="text-xl" note="título de página (h1) en mobile" sample="Título en tamaño xl." />
          <TypeSample twClass="text-2xl" note="título de página (h1) en desktop" sample="Título en tamaño 2xl." />
          <TypeSample twClass="text-3xl" note="hero de marketing" sample="Título en tamaño 3xl." />
          <TypeSample twClass="text-4xl" note="hero de marketing, grande" sample="Título 4xl." />
        </div>
        <div className="rounded-xl border border-brand-gold/40 bg-brand-gold/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Piso de accesibilidad:</strong> 13px (<code className="font-mono">text-sm</code>) es el tamaño mínimo para cuerpo de
          texto en esta app — pensado para un corredor de más edad. <code className="font-mono">text-xs</code> (12px) queda un poco por debajo a propósito, pero
          reservado solo para chips y etiquetas muy cortas, nunca para texto que alguien tenga que leer con atención.
        </div>
        <div className="space-y-1 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Los títulos reales (h1–h6) heredan peso y color desde el layer base de <code className="font-mono">globals.css</code> — el tamaño se agrega por
            contexto con una clase de tamaño:
          </p>
          <h1 className="text-2xl">Título h1</h1>
          <h2 className="text-xl">Título h2</h2>
          <h3 className="text-lg">Título h3</h3>
        </div>
      </Section>

      <Section id="chips" title="Chips y badges" description="Todos los estados posibles, agrupados por estilo real (varios nombres de estado comparten exactamente el mismo color).">
        <SubSection title="Badge (primitivo base)">
          <div className="flex flex-wrap gap-2">
            <Badge>default</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">outline</Badge>
            <Badge variant="ghost">ghost</Badge>
            <Badge variant="link">link</Badge>
          </div>
        </SubSection>

        <SubSection title="StatusBadge — contratos, garantías, disputas">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="pendiente" />
              <span className="text-xs text-muted-foreground">pendiente</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="en_evaluacion" />
              <span className="text-xs text-muted-foreground">en_evaluacion, en_progreso, pendiente_firma_arrendador(a), pendiente_deposito, pagada, expirada</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="activo" />
              <span className="text-xs text-muted-foreground">activo, en_custodia, confirmado, acordada, liquidada, finalizado, aceptada, aprobada</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="propuesta_termino" />
              <span className="text-xs text-muted-foreground">propuesta_termino</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="en_disputa" />
              <span className="text-xs text-muted-foreground">en_disputa, escalada — con pulso (solo estados que necesitan atención ahora)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="rechazada" />
              <span className="text-xs text-muted-foreground">rechazada, rol_distinto, abierta, negociando, en_liquidacion</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="cancelado" />
              <span className="text-xs text-muted-foreground">cancelado, no_seleccionado</span>
            </div>
          </div>
        </SubSection>

        <SubSection title="ContactStatusBadge — cuenta de la persona en Guardanza">
          <div className="flex flex-wrap gap-2">
            <ContactStatusBadge status="confirmado" />
            <ContactStatusBadge status="pendiente" />
            <ContactStatusBadge status="invitacion_rechazada" />
          </div>
        </SubSection>

        <SubSection title="RoleBadge / RoleChip">
          <div className="flex flex-wrap gap-2">
            <RoleBadge label="Corredor(a)" value="Juan Pérez" emptyText="Sin asignar" />
            <RoleBadge label="Arrendador(a)" value={null} emptyText="Sin asignar" />
          </div>
          <div className="flex flex-wrap gap-2">
            <RoleChip label="Corredor(a)" />
            <RoleChip label="Arrendador(a)" />
            <RoleChip label="Arrendatario(a)" />
            <RoleChip label="Administrador de plataforma" />
          </div>
        </SubSection>

        <SubSection title="GreenChip — chips sobre el sistema verde">
          <p className="text-xs text-muted-foreground">
            Los tres tonos que usan las tarjetas verdes (Contactos, Candidatos, Propiedades…) — <code className="font-mono">solid</code> y{" "}
            <code className="font-mono">translucent</code> llevan texto verde oscuro (contraste verificado, nunca texto claro sobre translúcido);{" "}
            <code className="font-mono">deep</code> es el verde sólido más oscuro con texto blanco, para una etiqueta persistente.
          </p>
          <div
            className="flex flex-wrap gap-2 rounded-xl border border-brand-green-card-border bg-brand-green-card p-3"
          >
            <GreenChip tone="solid">solid</GreenChip>
            <GreenChip tone="translucent">translucent</GreenChip>
            <GreenChip tone="deep">deep</GreenChip>
          </div>
        </SubSection>
      </Section>

      <Section id="botones" title="Botones">
        <SubSection title="Variantes">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </SubSection>
        <SubSection title="Tamaños">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="default">default</Button>
            <Button size="lg">lg</Button>
            <Button size="xl">xl</Button>
            <Button size="icon" aria-label="Agregar">
              <Plus />
            </Button>
            <Button size="icon" variant="outline" aria-label="Eliminar">
              <Trash2 />
            </Button>
          </div>
        </SubSection>
      </Section>

      <Section id="tarjetas" title="Tarjetas">
        <SubSection title="Card base">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Título de tarjeta</CardTitle>
              <CardDescription>Descripción breve de apoyo.</CardDescription>
              <CardAction>
                <Button size="sm" variant="ghost">
                  Acción
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Contenido de la tarjeta — el primitivo que usan la mayoría de las pantallas blancas de la app.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                Continuar
              </Button>
            </CardFooter>
          </Card>
        </SubSection>

        <SubSection title="Tarjeta de propiedad">
          <p className="text-xs text-muted-foreground">
            Sistema verde nivelado en toda la app (no solo Contactos/Candidatos) — ver <code className="font-mono">src/components/ui/green-card.tsx</code>. Foto arriba a
            todo el ancho, chip persistente de rol (<code className="font-mono">tone=&quot;deep&quot;</code>) más el chip de estado dinámico.
          </p>
          <div className="max-w-sm">
            <PropertyCard
              href="#"
              photoUrl={null}
              address="Los Aromos 1234, depto 502, Ñuñoa"
              location="Ñuñoa, Región Metropolitana"
              badges={
                <>
                  <GreenChip tone="deep">Arrendador</GreenChip>
                  <GreenChip tone="solid">Arrendatario</GreenChip>
                </>
              }
            />
          </div>
        </SubSection>

        <SubSection title="Caja de información">
          <p className="text-xs text-muted-foreground">
            Título + filas rótulo/valor sobre el mismo verde — para fichas de detalle (propiedad, contrato…). Rótulo y valor van los dos en blanco pleno; la jerarquía
            es de peso, no de color (un valor vacío va en regular, nunca atenuado — ver la fila &quot;Corredor&quot;).
          </p>
          <div className="grid max-w-sm gap-3">
            <GreenInfoBox title="Participantes">
              <GreenInfoRow label="Arrendador" value="Juan Pérez" />
              <GreenInfoRow label="Corredor" value="Sin corredor" valueClassName="font-normal" />
              <GreenInfoRow label="Arrendatario" value="Ana Torres" />
            </GreenInfoBox>
          </div>
        </SubSection>

        <SubSection title="Estado vacío">
          <div className="max-w-sm">
            <GreenEmptyState icon={Building2} message="Sin propiedades todavía." />
          </div>
        </SubSection>

        <SubSection title="Tarjeta de contacto">
          <div className="grid max-w-lg gap-2">
            <ContactCard role="arrendatario" contactKey="demo-1" fullName="Ana Torres" email="ana.torres@gmail.com" rut={null} avatarUrl={null} displayStatus="confirmado" showRoleChip={false} />
            <ContactCard role="arrendatario" contactKey="demo-2" fullName="Bruno Sáez" email="bruno.saez@gmail.com" rut={null} avatarUrl={null} displayStatus="pendiente" showRoleChip={false} />
          </div>
        </SubSection>

        <SubSection title="Tarjeta de candidato">
          <p className="text-xs text-muted-foreground">Los tres botones de acción están conectados a una acción de servidor que no hace nada — es solo esta página de referencia.</p>
          <div className="grid max-w-lg gap-2">
            <CandidateCard
              propertyCandidateId="demo-1"
              propertyId="demo-property"
              status="en_evaluacion"
              fullName="Camila Reyes"
              email="camila.reyes@gmail.com"
              avatarUrl={null}
              contactStatus="pendiente"
              evaluationStatus={null}
              progress={null}
              hasLandlord
              detailHref="#"
              sendEvaluationAction={noopAction}
              discardAction={noopAction}
              reactivateAction={noopAction}
            />
            <CandidateCard
              propertyCandidateId="demo-2"
              propertyId="demo-property"
              status="en_evaluacion"
              fullName="Diego Farías"
              email="diego.farias@gmail.com"
              avatarUrl={null}
              contactStatus="confirmado"
              evaluationStatus="en_progreso"
              progress={{ uploaded: 2, total: 5 }}
              hasLandlord
              detailHref="#"
              sendEvaluationAction={noopAction}
              discardAction={noopAction}
              reactivateAction={noopAction}
            />
            <CandidateCard
              propertyCandidateId="demo-3"
              propertyId="demo-property"
              status="en_evaluacion"
              fullName="Elena Poblete"
              email="elena.poblete@gmail.com"
              avatarUrl={null}
              contactStatus="confirmado"
              evaluationStatus="en_progreso"
              progress={{ uploaded: 5, total: 5 }}
              hasLandlord
              detailHref="#"
              sendEvaluationAction={noopAction}
              discardAction={noopAction}
              reactivateAction={noopAction}
            />
            <CandidateCard
              propertyCandidateId="demo-4"
              propertyId="demo-property"
              status="no_seleccionado"
              fullName="Felipe Rojas"
              email="felipe.rojas@gmail.com"
              avatarUrl={null}
              contactStatus="confirmado"
              evaluationStatus="en_progreso"
              progress={{ uploaded: 1, total: 5 }}
              hasLandlord
              detailHref="#"
              sendEvaluationAction={noopAction}
              discardAction={noopAction}
              reactivateAction={noopAction}
            />
          </div>
        </SubSection>
      </Section>

      <Section id="otros" title="Otros componentes">
        <SubSection title="Alertas">
          <div className="grid gap-2">
            <Alert>
              <Info />
              <AlertTitle>Aviso informativo</AlertTitle>
              <AlertDescription>Texto de apoyo, tono neutro.</AlertDescription>
            </Alert>
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>Acción completada</AlertTitle>
              <AlertDescription>Texto de apoyo, tono positivo.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Algo salió mal</AlertTitle>
              <AlertDescription>Texto de apoyo, tono de error.</AlertDescription>
            </Alert>
          </div>
        </SubSection>

        <SubSection title="Bottom sheet">
          <BottomSheetDemo />
        </SubSection>

        <SubSection title="Campos de formulario">
          <div className="grid max-w-md gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="estilos-input">Texto simple</Label>
              <Input id="estilos-input" placeholder="Ej: Ana Arrendataria" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estilos-textarea">Texto largo</Label>
              <Textarea id="estilos-textarea" placeholder="Detalle de la observación…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estilos-rut">RUT (autoformato)</Label>
              <RutInput id="estilos-rut" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <PhoneInput name="phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estilos-money">Monto</Label>
              <MoneyAmountInput amountName="estilos-amount" currencyName="estilos-currency" defaultAmount={450000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estilos-password">Contraseña</Label>
              <PasswordInput id="estilos-password" placeholder="••••••••" />
            </div>
          </div>
        </SubSection>
      </Section>

      <Section
        id="seo"
        title="SEO en páginas reales"
        description="Esta página está deliberadamente fuera del índice — pero las prácticas de abajo sí aplican a las páginas públicas reales de Guardanza (home, /corredores, /arrendadores, /arrendatarios, /terminos, /privacidad)."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Un solo h1 por página</h3>
            <p className="text-xs text-muted-foreground">
              Cada página pública tiene exactamente un <code className="font-mono">&lt;h1&gt;</code>, y el resto de los títulos baja en orden (h2, h3…) sin
              saltarse niveles — esta misma página lo hace: un h1 arriba, un h2 por sección, h3 para subsecciones.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Metadata por página, no genérica</h3>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">title</code> y <code className="font-mono">description</code> propios en cada ruta pública (ver{" "}
              <code className="font-mono">terminos/page.tsx</code>, <code className="font-mono">privacidad/page.tsx</code>) — nunca heredar solo el título
              genérico del layout raíz.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Alt text con criterio, no decorativo</h3>
            <p className="text-xs text-muted-foreground">
              Fotos con información real (propiedad, avatar) llevan alt descriptivo cuando comunican algo que el texto de al lado no dice; los íconos y
              logos puramente decorativos van con <code className="font-mono">alt=&quot;&quot;</code> o <code className="font-mono">aria-hidden</code> —
              nunca un alt vacío en una foto que sí importa.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Semántica antes que solo estilo</h3>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">&lt;nav&gt;</code>, <code className="font-mono">&lt;main&gt;</code>,{" "}
              <code className="font-mono">&lt;button&gt;</code> vs. <code className="font-mono">&lt;a&gt;</code> según si la acción navega o no — un
              buscador (y un lector de pantalla) entienden la página mejor cuando la etiqueta dice lo que es, no solo cómo se ve.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Páginas privadas, fuera del índice</h3>
            <p className="text-xs text-muted-foreground">
              Todo lo que vive detrás de sesión (propiedades, contactos, contratos…) no debería indexarse — hoy eso lo resuelve, de hecho, el gate del
              sitio (redirige antes de que la página real se sirva). <code className="font-mono">/estilos</code> no está detrás de sesión, así que necesita
              su propio <code className="font-mono">robots: {"{"} index: false {"}"}</code> explícito — ver la sección siguiente.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Legal siempre accesible</h3>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">/terminos</code> y <code className="font-mono">/privacidad</code> están explícitamente afuera del gate del sitio
              (ver <code className="font-mono">proxy.ts</code>) — tienen que ser legibles sin clave y sin sesión, tanto para cualquier persona como para la
              verificación OAuth de Google.
            </p>
          </div>
        </div>
      </Section>

      <Section id="acerca" title="Acerca de esta página">
        <div className="max-w-2xl space-y-3 text-sm text-muted-foreground">
          <p>
            <code className="font-mono text-xs">/estilos</code> es pública (no exige sesión de usuario) y no está enlazada desde ningún menú de la app. Su
            única protección contra buscadores es la etiqueta <code className="font-mono text-xs">robots: noindex</code> de arriba.
          </p>
          <p>
            No tiene un guardián de sesión propio a propósito: no muestra ningún dato real (todo el contenido de esta página es de ejemplo, sin conectarse
            a la base de datos), así que no hay nada que proteger más allá de que un buscador la indexe — y eso ya lo resuelve el noindex. Si algún día se
            reactiva la clave compartida del sitio (<code className="font-mono text-xs">GATE_PASSWORD</code>, hoy desactivada en producción), esta página
            queda protegida junto con el resto automáticamente, porque no está en la lista de excepciones de <code className="font-mono text-xs">proxy.ts</code>{" "}
            (a diferencia de <code className="font-mono text-xs">/terminos</code> y <code className="font-mono text-xs">/privacidad</code>, que sí necesitan
            quedar afuera). Agregar además una sesión de usuario propia solo sumaría fricción para compartir el link con alguien de diseño o un contratista
            sin cuenta, sin ganar nada real a cambio.
          </p>
        </div>
      </Section>
    </div>
  );
}
