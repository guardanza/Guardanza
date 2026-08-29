import type { Metadata } from "next";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidad — Guardanza",
  description: "Política de Privacidad de Guardanza: qué información recopilamos, para qué la usamos y cómo la protegemos.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad de Guardanza" updatedAt="29 de agosto de 2026">
      <p>
        Esta Política de Privacidad describe cómo Guardanza (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la plataforma&quot;)
        recopila, usa, almacena y protege la información personal de las personas que utilizan nuestros servicios (&quot;usuarios&quot;,
        &quot;tú&quot;). Al usar Guardanza, aceptas las prácticas descritas en esta política.
      </p>
      <p>
        Guardanza es operado por Guardanza SpA, RUT 76.000.000-0, con domicilio en Arlegui 263, Viña del Mar, Chile. Para cualquier
        consulta sobre esta política o sobre tus datos personales, puedes escribirnos a{" "}
        <a href="mailto:contacto@guardanza.app" className="text-foreground underline underline-offset-4 hover:text-primary">
          contacto@guardanza.app
        </a>
        .
      </p>

      <LegalSection id="que-informacion-recopilamos" title="1. Qué información recopilamos">
        <p>Recopilamos la siguiente información para prestar nuestros servicios:</p>
        <p className="font-semibold">Información que nos entregas directamente:</p>
        <LegalList>
          <li>Datos de identificación: nombre completo, RUT, correo electrónico y número de teléfono.</li>
          <li>Rol declarado en la plataforma (arrendador, arrendatario o corredor).</li>
          <li>Fotografía de perfil, si decides cargarla.</li>
          <li>Información sobre propiedades: dirección, valores de arriendo, plazos y montos de garantía.</li>
          <li>Información de contactos que agregas a tu libreta.</li>
        </LegalList>
        <p className="font-semibold">Información que se genera al usar la plataforma:</p>
        <LegalList>
          <li>Contratos de arriendo y su estado.</li>
          <li>Registros de garantías en custodia y su estado.</li>
          <li>Historial de acciones dentro de la plataforma (creación de propiedades, candidaturas, adjudicaciones, firmas).</li>
        </LegalList>
        <p className="font-semibold">Información técnica:</p>
        <LegalList>
          <li>Datos de acceso y autenticación (incluyendo el inicio de sesión mediante Google, si lo usas).</li>
          <li>Información básica de uso necesaria para el funcionamiento y la seguridad del servicio.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="para-que-usamos-tu-informacion" title="2. Para qué usamos tu información">
        <p>Usamos tu información para:</p>
        <LegalList>
          <li>Crear y administrar tu cuenta.</li>
          <li>Permitir la creación y gestión de propiedades, contactos, candidaturas y contratos de arriendo.</li>
          <li>Gestionar la custodia de las garantías de arriendo.</li>
          <li>
            Enviarte comunicaciones necesarias para el servicio (invitaciones, confirmaciones de cuenta, notificaciones sobre contratos
            y garantías, recuperación de contraseña).
          </li>
          <li>Verificar identidades y prevenir fraudes.</li>
          <li>Cumplir con obligaciones legales aplicables.</li>
          <li>Mejorar y mantener la seguridad de la plataforma.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="base-legal-y-consentimiento" title="3. Base legal y consentimiento">
        <p>
          Tratamos tus datos personales conforme a la Ley N° 19.628 sobre Protección de la Vida Privada de Chile y demás normativa
          aplicable. El tratamiento se basa en tu consentimiento al registrarte y usar la plataforma, en la necesidad de ejecutar los
          servicios que solicitas, y en el cumplimiento de obligaciones legales.
        </p>
      </LegalSection>

      <LegalSection id="con-quien-compartimos-tu-informacion" title="4. Con quién compartimos tu información">
        <p>No vendemos tu información personal. Compartimos datos solo en los siguientes casos:</p>
        <LegalList>
          <li>
            <strong>Con otros usuarios de la plataforma</strong> con quienes te relacionas legítimamente: por ejemplo, cuando un
            corredor te agrega como contacto y aceptas, o cuando eres parte de un contrato, la contraparte y el corredor pueden ver la
            información necesaria para esa relación (nombre, correo, RUT, foto de perfil y datos del contrato correspondiente).
          </li>
          <li>
            <strong>Con proveedores de servicios</strong> que nos permiten operar, bajo obligaciones de confidencialidad: proveedores de
            infraestructura y base de datos, envío de correos, y —cuando corresponda— proveedores de firma electrónica y de
            verificación de antecedentes. Estos proveedores solo acceden a los datos necesarios para prestar su servicio.
          </li>
          <li>
            <strong>Cuando lo exija la ley</strong> o una autoridad competente, o para proteger derechos, seguridad o prevenir fraude.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="donde-se-almacenan-tus-datos" title="5. Dónde se almacenan tus datos">
        <p>
          Tus datos se almacenan en servidores de nuestros proveedores de infraestructura, que pueden estar ubicados fuera de Chile.
          Adoptamos medidas para que dichos proveedores mantengan estándares adecuados de seguridad y confidencialidad.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" title="6. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas para proteger tu información, incluyendo control de acceso, reglas de visibilidad
          de datos entre usuarios, y cifrado en tránsito. Ningún sistema es completamente infalible, pero trabajamos para proteger tu
          información de accesos no autorizados, pérdida o alteración.
        </p>
      </LegalSection>

      <LegalSection id="tus-derechos" title="7. Tus derechos">
        <p>
          Conforme a la ley chilena, tienes derecho a acceder a tus datos personales, solicitar su rectificación cuando sean inexactos,
          solicitar su eliminación cuando corresponda, y oponerte a ciertos tratamientos. Para ejercer estos derechos, escríbenos a{" "}
          <a href="mailto:contacto@guardanza.app" className="text-foreground underline underline-offset-4 hover:text-primary">
            contacto@guardanza.app
          </a>
          .
        </p>
        <p>
          Ten presente que algunos datos deben conservarse mientras exista una relación contractual activa (por ejemplo, un contrato de
          arriendo con garantía en custodia) o mientras la ley lo exija.
        </p>
      </LegalSection>

      <LegalSection id="conservacion-de-datos" title="8. Conservación de datos">
        <p>
          Conservamos tu información mientras tu cuenta esté activa y durante el tiempo necesario para cumplir con las finalidades
          descritas, resolver disputas y cumplir obligaciones legales.
        </p>
      </LegalSection>

      <LegalSection id="datos-de-terceros-que-ingresas" title="9. Datos de terceros que ingresas">
        <p>
          Si ingresas datos de otras personas (por ejemplo, al invitar a un contacto), declaras que cuentas con la autorización o el
          motivo legítimo para hacerlo. Esas personas podrán ejercer sus derechos sobre sus datos de la misma forma descrita aquí.
        </p>
      </LegalSection>

      <LegalSection id="menores-de-edad" title="10. Menores de edad">
        <p>Guardanza está dirigido a personas mayores de 18 años. No recopilamos intencionalmente datos de menores de edad.</p>
      </LegalSection>

      <LegalSection id="cambios-a-esta-politica" title="11. Cambios a esta política">
        <p>
          Podemos actualizar esta política. Cuando lo hagamos, publicaremos la versión actualizada en esta página y modificaremos la
          fecha de &quot;última actualización&quot;. Los cambios relevantes podrán comunicarse adicionalmente por otros medios.
        </p>
      </LegalSection>

      <LegalSection id="contacto" title="12. Contacto">
        <p>
          Para cualquier duda sobre esta Política de Privacidad o sobre el tratamiento de tus datos personales, contáctanos en{" "}
          <a href="mailto:contacto@guardanza.app" className="text-foreground underline underline-offset-4 hover:text-primary">
            contacto@guardanza.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
