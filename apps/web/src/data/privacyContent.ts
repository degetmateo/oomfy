export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_CONTENT: { title: string; updatedAt: string; description: string; sections: LegalSection[] } = {
  title: 'Política de Privacidad',
  updatedAt: 'Última actualización: noviembre de 2026',
  description: 'Conoce cómo Oomfy recopila, utiliza y protege tus datos de cuenta, publicaciones, chats, sesiones y notificaciones push.',
  sections: [
    {
      heading: '1. Información que recopilamos',
      paragraphs: [
        'Al crear una cuenta en Oomfy (https://oomfy.online) almacenamos tu identificador único, nombre para mostrar, nombre de usuario (@username), correo electrónico, estado de cuenta, aceptación de términos y contraseña cifrada de forma irreversible mediante hashing (bcrypt).',
        'También guardamos la información pública de tu perfil (biografía, ubicación, enlace, avatar y portada), tus publicaciones, respuestas, citas, compartidos, "Me gusta", relaciones de seguimiento, notificaciones internas, reportes enviados y tus mensajes directos en chats.',
      ],
    },
    {
      heading: '2. Sesiones, cookies y almacenamiento local (PWA)',
      paragraphs: [
        'Para mantener tu sesión iniciada de manera segura utilizamos un access token de corta duración (15 minutos) y un refresh token rotativo (hasta 30 días de inactividad) asociado al registro de sesión en nuestra base de datos, junto con tu dirección IP aproximada y tipo de dispositivo o plataforma.',
        'Las credenciales de renovación viajan mediante cookies HttpOnly, Secure (en HTTPS) y SameSite=Lax, complementadas con almacenamiento local en el navegador para el funcionamiento sin fricciones de la PWA. Puedes consultar o revocar cualquier sesión activa desde Configuración > Sesiones.',
      ],
    },
    {
      heading: '3. Notificaciones Push y permisos del dispositivo',
      paragraphs: [
        'Si autorizas las notificaciones push, almacenamos el endpoint y las claves criptográficas de suscripción de tu navegador junto con tus preferencias por categoría (mensajes, respuestas, citas, menciones, me gusta, compartidos, seguidores y avisos). Al cerrar sesión, la suscripción queda desactivada para ese dispositivo.',
        'Oomfy no accede ni solicita permisos de cámara, micrófono ni geolocalización mediante APIs del navegador (restringidos explícitamente mediante Permissions-Policy).',
      ],
    },
    {
      heading: '4. Servicios de terceros y enlaces externos',
      paragraphs: [
        'Para funciones específicas nos integramos con proveedores técnicos: ImgBB para alojar imágenes/GIFs subidos en perfiles, publicaciones y chats; Klipy para búsqueda de GIFs; Resend para correos transaccionales de verificación y recuperación de cuenta (enmascarando direcciones en logs); y vistas previas/embeds de medios (como Spotify, YouTube o TikTok).',
        'No vendemos ni alquilamos tus datos personales. Todos los enlaces externos compartidos por usuarios se muestran con advertencia de salida (/external) y atributos rel="ugc nofollow noopener noreferrer".',
      ],
    },
    {
      heading: '5. Visibilidad pública, seguridad y derechos del usuario',
      paragraphs: [
        'Las publicaciones, perfiles públicos y etiquetas temáticas son accesibles al público y buscadores web; en cambio, tus chats privados, notificaciones, ajustes y reportes permanecen restringidos exclusivamente a usuarios autenticados y bloqueados para rastreadores.',
        'Puedes editar tus datos de perfil, eliminar tus publicaciones o mensajes propios, gestionar preferencias push o revocar tus sesiones directamente desde la aplicación.',
      ],
    },
  ],
};

