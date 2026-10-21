# scroll-scroll

Cajón de sastre de Natalia y Daniel. Una web pública con una sola caja: escribes o pegas algo, pulsas Enter y ya está arriba. Frases, enlaces que se embeben solos (YouTube, Vimeo, TikTok, Instagram, Spotify, Giphy), gifs, imágenes, vídeos cortos y audios. Para subir hace falta una contraseña compartida; para mirar, nada.

## Qué hay dentro

```
public/          la web (index.html, style.css, app.js)
api/             funciones que corren en Vercel
  feed.js        devuelve lo subido, de 30 en 30
  post.js        guarda una entrada (comprueba la contraseña)
  upload-url.js  prepara la subida de un archivo
  delete.js      borra una entrada y su archivo
  ping.js        se llama solo cada día para que Supabase no pause el proyecto
lib/common.js    conexión a Supabase y comprobación de contraseña
supabase/schema.sql   la tabla y el bucket, listos para pegar
vercel.json      la tarea diaria de ping
```

Coste: cero. Vercel Hobby y Supabase Free. El plan gratuito de Supabase da 1 GB para archivos y admite archivos de hasta 50 MB. Los vídeos largos, mejor como enlace.

## Puesta en marcha (una vez, unos 20 minutos)

### 1. Supabase

1. Entra en https://supabase.com, crea una cuenta gratuita (vale con Google o GitHub) y crea un proyecto nuevo. Nombre: `scroll-scroll`. Región: la más cercana (Frankfurt o París). Apunta la contraseña de la base de datos aunque no la vas a usar.
2. Cuando el proyecto esté listo, abre **SQL Editor** en el menú de la izquierda, pulsa **New query**, pega entero el contenido de `supabase/schema.sql` y pulsa **Run**. Debería decir "Success".
3. Ve a **Project Settings** (la rueda de abajo a la izquierda) y copia dos cosas:
   - En **Data API**: el **Project URL** (algo como `https://abcdefgh.supabase.co`).
   - En **API Keys**: la clave **service_role**. Es secreta; no la pegues en ningún sitio público.

### 2. Vercel

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado). Si prefieres no usar GitHub, en el paso siguiente usa `vercel` desde la terminal; también funciona.
2. En https://vercel.com, **Add New > Project**, importa el repositorio. Framework Preset: **Other**. No toques nada más.
3. Antes de darle a Deploy, despliega **Environment Variables** y añade estas tres:

   | Nombre | Valor |
   |---|---|
   | `SUPABASE_URL` | el Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clave service_role |
   | `SCROLL_PASSWORD` | la contraseña que vais a compartir Daniel y tú para subir |

4. **Deploy**. En un minuto tendrás una URL tipo `scroll-scroll.vercel.app`. Ábrela, elige quién eres abajo, escribe algo, pulsa Enter, mete la contraseña. Si aparece arriba, todo funciona.

### 3. El dominio (lo hace Daniel)

1. En Vercel, dentro del proyecto: **Settings > Domains > Add Domain**. Escribe el dominio sin `www` y acepta cuando ofrezca añadir también la versión con `www`.
2. Vercel muestra en pantalla los registros DNS que hay que crear. Son dos, y los valores exactos los da Vercel para este proyecto, así que hay que copiarlos de ahí y no de otro sitio:
   - Un registro **A** para el dominio raíz (nombre `@`) con la IP que indica Vercel.
   - Un registro **CNAME** para `www` con el valor que indica Vercel (termina en `vercel-dns-XXX.com`).
3. Daniel entra en el panel del sitio donde tiene registrado el dominio, busca la gestión de DNS, crea esos dos registros y borra cualquier A o CNAME anterior que apunte a otra cosa para el mismo nombre. Si el dominio ya tenía registros de correo (MX), no se tocan.
4. En unos minutos (a veces unas horas) Vercel marca el dominio como configurado y activa el certificado solo.

## Uso diario

- Escribir o pegar en la caja de abajo y **Enter**. Shift+Enter hace salto de línea.
- Pegar un enlace solo: se embebe si es de YouTube, Vimeo, TikTok, Instagram, Spotify o Giphy, o si es un gif, imagen o mp4 directo. Si no, aparece como tarjeta con el enlace.
- Archivos: el clip, arrastrar sobre la página o pegar una imagen del portapapeles. Se puede añadir un texto debajo antes de subir.
- La contraseña se pide la primera vez en cada navegador y se queda guardada. "Quién sube" también.
- Para borrar algo: pasar el ratón por la entrada (o en móvil, está siempre visible en gris) y pulsar "borrar".
- La frase que se repite en los márgenes se cambia en `public/app.js`, en la constante `TAGLINE`, al principio del archivo.
- Si alguien pega la contraseña donde no debe: cambiad `SCROLL_PASSWORD` en Vercel y haced **Redeploy**.

## Si algo falla

- "no se ha podido cargar": casi seguro que a Supabase le falta la tabla (paso 1.2) o la URL/clave están mal puestas en Vercel. En Vercel > Deployments > el último > **Logs** sale el error exacto.
- La web va pero las imágenes subidas no se ven: el bucket `media` no es público. En Supabase > Storage > media > Edit bucket > Public.
- Supabase ha pausado el proyecto (pasa si no entra nadie en una semana y el ping falla): en el panel de Supabase sale un botón **Restore project**. El `vercel.json` incluye una tarea diaria que lo evita; comprueba en Vercel > Settings > Cron Jobs que está activa.

## Segunda vuelta (si apetece)

- Bot de Telegram: mandar cosas al bot desde el móvil y que aparezcan en la web sin abrir nada. Es la forma más cómoda de subir desde el teléfono y se puede añadir sin tocar lo que hay.
- Página de cada entrada con su propia URL para compartir una cosa suelta.
- Búsqueda.
