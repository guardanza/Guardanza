import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Términos de Servicio — Guardanza",
  description: "Términos de Servicio de Guardanza: condiciones de uso de la plataforma de custodia de garantías de arriendo.",
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de Servicio de Guardanza" updatedAt="29 de agosto de 2026">
      <p>
        Estos Términos de Servicio (&quot;Términos&quot;) regulan el uso de la plataforma Guardanza (&quot;la plataforma&quot;, &quot;el
        servicio&quot;, &quot;nosotros&quot;). Al registrarte o usar Guardanza, aceptas estos Términos. Si no estás de acuerdo, no debes
        usar el servicio.
      </p>
      <p>
        Guardanza es operado por Guardanza SpA, RUT 76.000.000-0, con domicilio en Arlegui 263, Viña del Mar, Chile (&quot;nosotros&quot;).
      </p>

      <LegalSection id="que-es-guardanza" title="1. Qué es Guardanza">
        <p>
          Guardanza es una plataforma digital que facilita la gestión de arriendos residenciales y la custodia de las garantías de
          arriendo entre las partes de un contrato (arrendadores, arrendatarios y corredores de propiedades). La plataforma permite
          crear y administrar propiedades, contactos, candidaturas y contratos, y gestionar el estado de las garantías asociadas.
        </p>
        <p>
          Guardanza actúa como facilitador tecnológico de la relación entre las partes y como responsable de la gestión de la custodia
          de la garantía de arriendo. Los fondos correspondientes a las garantías se mantienen en instrumentos de inversión custodiados
          por entidades financieras fiscalizadas por la Comisión para el Mercado Financiero (CMF). Guardanza SpA es el responsable legal
          frente a los usuarios respecto de dicha custodia, en los términos descritos en la{" "}
          <a href="#custodia-de-la-garantia" className="text-foreground underline underline-offset-4 hover:text-primary">
            sección 5
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="quien-puede-usar-guardanza" title="2. Quién puede usar Guardanza">
        <p>
          Para usar Guardanza debes ser mayor de 18 años y tener capacidad legal para celebrar contratos. Al registrarte, declaras que la
          información que entregas es veraz y que estás autorizado a usar el correo y los datos que ingresas.
        </p>
        <p>
          Cada cuenta corresponde a una persona con un rol declarado (arrendador, arrendatario o corredor). Eres responsable de mantener
          la confidencialidad de tus credenciales de acceso y de toda la actividad que ocurra en tu cuenta.
        </p>
      </LegalSection>

      <LegalSection id="uso-de-la-plataforma" title="3. Uso de la plataforma">
        <p>Te comprometes a usar Guardanza de buena fe y conforme a la ley. En particular, te comprometes a no:</p>
        <LegalList>
          <li>Ingresar información falsa, engañosa o de terceros sin autorización.</li>
          <li>Suplantar la identidad de otra persona.</li>
          <li>Usar la plataforma para fines fraudulentos o ilícitos.</li>
          <li>Intentar vulnerar la seguridad de la plataforma o acceder a datos de otros usuarios sin autorización.</li>
        </LegalList>
        <p>Nos reservamos el derecho de suspender o cerrar cuentas que incumplan estos Términos.</p>
      </LegalSection>

      <LegalSection id="contratos-y-garantias" title="4. Contratos y garantías">
        <p>
          Los contratos de arriendo se generan entre las partes (arrendador y arrendatario), con la eventual participación de un
          corredor. Guardanza facilita su creación, firma y el registro del estado de la garantía asociada.
        </p>
        <p>
          Las partes son responsables del contenido, la veracidad y el cumplimiento de sus contratos. Guardanza no es parte del contrato
          de arriendo entre arrendador y arrendatario; su rol se limita a facilitar la gestión del contrato y a la custodia de la
          garantía descrita en la{" "}
          <a href="#custodia-de-la-garantia" className="text-foreground underline underline-offset-4 hover:text-primary">
            sección 5
          </a>
          .
        </p>
        <p>
          La firma electrónica y, cuando corresponda, la autorización notarial de los contratos, se realizan a través de proveedores
          externos habilitados. El valor legal de dichas firmas se rige por la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection id="custodia-de-la-garantia" title="5. Custodia de la garantía">
        <p>
          La custodia de la garantía de arriendo se gestiona conforme al procedimiento descrito en la plataforma y a lo acordado entre
          las partes.
        </p>
        <p>
          Los fondos de las garantías se mantienen en instrumentos de inversión custodiados por entidades financieras fiscalizadas por
          la Comisión para el Mercado Financiero (CMF). Guardanza SpA es el responsable legal frente a los usuarios respecto de la
          custodia de dichos fondos.
        </p>
        <p>
          La garantía se mantiene en custodia durante la vigencia del contrato de arriendo. Su liberación se realiza al término del
          contrato conforme a lo acordado entre las partes y al procedimiento establecido en la plataforma. En caso de disputa entre las
          partes sobre la liberación de la garantía, se aplicará el procedimiento de resolución previsto en la plataforma.
        </p>
      </LegalSection>

      <LegalSection id="pagos-y-tarifas" title="6. Pagos y tarifas">
        <p>
          Guardanza es un servicio por suscripción y uso (SaaS). El uso de la plataforma puede estar afecto a tarifas, las que se
          informarán de manera previa y transparente a los usuarios antes de su cobro. Las condiciones específicas de las tarifas,
          incluyendo su monto, la parte responsable del pago y la forma de cobro, se comunicarán dentro de la plataforma. Cuando se
          habiliten medios de pago para las garantías, las condiciones aplicables se informarán en ese momento.
        </p>
      </LegalSection>

      <LegalSection id="disponibilidad-del-servicio" title="7. Disponibilidad del servicio">
        <p>
          Trabajamos para mantener la plataforma disponible y funcionando correctamente, pero no garantizamos que el servicio esté
          libre de interrupciones o errores. Podemos realizar mantenciones, cambios o mejoras que afecten temporalmente la
          disponibilidad.
        </p>
      </LegalSection>

      <LegalSection id="limitacion-de-responsabilidad" title="8. Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley, Guardanza no será responsable por daños indirectos derivados del uso o la imposibilidad de
          uso de la plataforma. Guardanza no garantiza el cumplimiento de las obligaciones que las partes asuman entre sí en sus
          contratos de arriendo.
        </p>
        <p>
          Nada en estos Términos excluye responsabilidades que no puedan limitarse conforme a la ley chilena, especialmente en materia
          de protección al consumidor.
        </p>
      </LegalSection>

      <LegalSection id="propiedad-intelectual" title="9. Propiedad intelectual">
        <p>
          La plataforma, su marca, logo, diseño y contenido son propiedad de Guardanza o de sus licenciantes. No puedes copiarlos,
          reproducirlos ni usarlos sin autorización.
        </p>
      </LegalSection>

      <LegalSection id="proteccion-de-datos" title="10. Protección de datos">
        <p>
          El tratamiento de tus datos personales se rige por nuestra{" "}
          <Link href="/privacidad" className="text-foreground underline underline-offset-4 hover:text-primary">
            Política de Privacidad
          </Link>
          , que forma parte de estos Términos.
        </p>
      </LegalSection>

      <LegalSection id="modificaciones" title="11. Modificaciones">
        <p>
          Podemos modificar estos Términos. Publicaremos la versión actualizada en esta página y actualizaremos la fecha. Si continúas
          usando la plataforma después de un cambio, se entiende que aceptas los Términos actualizados.
        </p>
      </LegalSection>

      <LegalSection id="terminacion" title="12. Terminación">
        <p>
          Puedes dejar de usar Guardanza y solicitar el cierre de tu cuenta en cualquier momento. Podemos suspender o terminar tu acceso
          si incumples estos Términos. La terminación no afecta las obligaciones ya generadas, especialmente respecto de contratos y
          garantías vigentes.
        </p>
      </LegalSection>

      <LegalSection id="ley-aplicable-y-jurisdiccion" title="13. Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales
          competentes de Santiago, Chile, sin perjuicio de los derechos que la ley reconozca a los consumidores.
        </p>
      </LegalSection>

      <LegalSection id="contacto" title="14. Contacto">
        <p>
          Para cualquier duda sobre estos Términos, contáctanos en{" "}
          <a href="mailto:contacto@guardanza.app" className="text-foreground underline underline-offset-4 hover:text-primary">
            contacto@guardanza.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
