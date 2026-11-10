import type { LegalSection } from './privacyContent.js';

export const TERMS_CONTENT: { title: string; updatedAt: string; description: string; sections: LegalSection[] } = {
  title: 'Términos y Condiciones',
  updatedAt: 'Última actualización: noviembre de 2026',
  description: 'Términos y Condiciones de uso de la red social Oomfy: cuentas, contenido generado por usuarios, normas de convivencia y moderación.',
  sections: [
    {
      heading: '1. Aceptación de los términos',
      paragraphs: [
        'Al registrarte, iniciar sesión o continuar utilizando Oomfy (https://oomfy.online), aceptas estos Términos y Condiciones y nuestra Política de Privacidad. Si no estás de acuerdo con cualquiera de sus disposiciones, debes dejar de utilizar la plataforma y cerrar tu sesión.',
      ],
    },
    {
      heading: '2. Registro, cuenta y seguridad',
      paragraphs: [
        'Para abrir una cuenta debes proporcionar un correo electrónico válido que deberá ser verificado, elegir un nombre de usuario (@username) único y establecer una contraseña segura de al menos 8 caracteres.',
        'Eres responsable de la actividad realizada desde tu cuenta y de custodiar tus dispositivos. Te recomendamos revisar periódicamente tus sesiones abiertas en Configuración > Sesiones y cerrar aquellas que no reconozcas.',
      ],
    },
    {
      heading: '3. Contenido generado por el usuario (UGC)',
      paragraphs: [
        'Conservas todos los derechos sobre los textos, imágenes, GIFs y enlaces que publiques en Oomfy. Garantizas que cuentas con los derechos o permisos necesarios sobre dicho material.',
        'Al publicar contenido en espacios públicos de Oomfy, nos otorgas una licencia mundial, no exclusiva y gratuita para alojarlo, procesarlo, mostrarlo en feeds, perfiles, respuestas, tarjetas Open Graph y sitemaps públicos mientras dicho contenido permanezca activo en la plataforma.',
      ],
    },
    {
      heading: '4. Normas de conducta y usos prohibidos',
      paragraphs: [
        'Queda estrictamente prohibido utilizar publicaciones, perfiles, respuestas o chats privados para difundir material ilegal, acoso, amenazas, discurso de odio, suplantación de identidad, spam automatizado, publicación maliciosa de información privada (doxxing), phishing o enlaces maliciosos.',
        'Asimismo, está prohibido intentar eludir controles de acceso, suplantar tokens de sesión, sobrecargar la API o realizar ingeniería inversa sobre mecanismos de seguridad de la plataforma.',
      ],
    },
    {
      heading: '5. Reportes, moderación y suspensión',
      paragraphs: [
        'Los usuarios disponen de herramientas de reporte para señalar publicaciones, perfiles o mensajes de chat que incumplan estas normas. El equipo de moderación y administración evaluará los reportes y podrá eliminar contenido infractor o suspender cuentas de forma temporal o definitiva.',
        'Oomfy podrá habilitar temporalmente medidas de mantenimiento técnico que limiten registros, edición de perfiles o nuevas publicaciones cuando sea necesario para proteger la estabilidad del servicio.',
      ],
    },
    {
      heading: '6. Disponibilidad y modificaciones',
      paragraphs: [
        'Oomfy se ofrece "tal cual" y "según disponibilidad", sin garantía de funcionamiento ininterrumpido sobre servicios de terceros (alojamiento multimedia externo, notificaciones push en navegadores móviles o embeds de terceros).',
        'Podemos actualizar estos términos o la Política de Privacidad para reflejar mejoras técnicas o requisitos legales. Cuando se realicen cambios relevantes, notificaremos a los usuarios registrados para recabar su aceptación al continuar usando la aplicación.',
      ],
    },
  ],
};

