# Flujos (Power Automate) usados por CommentTimeline

Este documento describe paso a paso dos Power Automate Flows que se usan conjuntamente con el componente PCF:

* `Obtener comentarios` — recupera comentarios de un item de SharePoint
* `Crear comentarios SMA` — crea un nuevo comentario en un item de SharePoint

Ambos Flows usan el trigger "Power Apps (V2)" y devuelven su resultado directamente al host (Power Apps).

IMPORTANTE: en la documentación se usan ejemplos (SiteUrl y ListId). Sustituye `https://<your-tenant>.sharepoint.com/sites/<site>` y `LIST_GUID` por los valores de tu entorno.

---

## 1) Flow: Obtener comentarios

Propósito: recuperar los comentarios de un item concreto y devolver un array normalizado con campos mínimos: text, createdDate, authorName, authorEmail.

Trigger (Power Apps V2) - entradas esperadas:

* `SiteUrl` (texto) — URL raíz del site, por ejemplo: `https://<your-tenant>.sharepoint.com/sites/SMA_POC`
* `ItemId` (entero o texto) — ID del item en la lista
* `Top` (número, opcional) — cantidad máxima de comentarios a devolver

Pasos (resumen):

1. (Opcional) Obtener el List GUID: si conoces el GUID de la lista de comentarios puedes almacenarlo en una variable; si no, usa la acción `Send an HTTP request to SharePoint` para buscar la lista por título.

   Ejemplo (si ya conoces el GUID):

   * Variable `ListId` = `a8cad8ac-e45a-4f20-xxxx-b3fa45xxx7a7d7` (reemplaza por la tuya)

2. Acción: `Send an HTTP request to SharePoint`

   * Site Address: `SiteUrl` (usar el parámetro del trigger)
   * Method: `GET`
   * Uri: `/_api/web/lists(guid'<ListId>')/items(<ItemId>)/Comments?&$select=text,createdDate,author/email,author/name&$expand=author&$orderby=createdDate desc&$top=<Top>`

     * Nota: sustituir `<ListId>` y `<ItemId>` por los valores/variables apropiadas. Para el parámetro `$top` usa la variable `Top` o un valor por defecto (p.ej. 50).
   * Headers: `Accept: application/json;odata=nometadata`

<img width="610" height="418" alt="Captura de pantalla 2025-10-06 a las 10 47 39" src="https://github.com/user-attachments/assets/99f3c478-dc18-4d06-803b-14f399c3fa14" />

3. (Opcional) `Select` / `Parse` — adaptar la respuesta `value` a la forma que quiere el PCF. Mapear campos:

   * `text` -> `text`
   * `createdDate` -> `createdDate` (usar `coalesce()` o fallback para asegurarse de tener valor)
   * `authorName` -> `author.name`
   * `authorEmail` -> `author.email`

   Ejemplo simple de `Select` (en la acción Select):

   * From: `body('Send_an_HTTP_request_to_SharePoint')?['value']`
   * Map:

     * `text` => `item()?['text']`
     * `createdDate` => `coalesce(item()?['createdDate'], item()?['Modified'])` (ajusta según tus campos)
     * `authorName` => `item()?['author']?['name']`
     * `authorEmail` => `item()?['author']?['email']`

       <img width="616" height="606" alt="Captura de pantalla 2025-10-06 a las 10 48 06" src="https://github.com/user-attachments/assets/e6748db5-17f6-4154-b7cb-929a31a1a000" />

4. (Opcional) Filtrar/limpiar: usa `Filter array` para eliminar entradas nulas o `Select` adicional para limpiar strings (p. ej. `replace()` si vienen escapados).

5. `Set variable` o `Compose`: almacena el array resultante en `varResponsed` (u otro nombre)

6. `Respond to a Power App or flow` — devolver `varResponsed` como salida. Esto regresará a Power Apps el JSON con el array de comentarios.

## 2) Flow: Crear comentarios SMA

Propósito: crear un comentario en un item específico de SharePoint (lista de comentarios) y devolver el resultado al host.

Trigger (Power Apps V2) - entradas esperadas:

* `SiteUrl` (texto)
* `ItemId` (entero o texto)
* `Comment` (texto) — texto del nuevo comentario

Pasos (resumen):

1. (Opcional) Obtener `ListId` o usar GUID conocido (igual que en el Flow anterior).

2. Acción: `Send an HTTP request to SharePoint`

   * Site Address: `SiteUrl`
   * Method: `POST`
   * Uri: `/_api/web/lists(guid'<ListId>')/items(<ItemId>)/Comments`
   * Headers: `Accept: application/json;odata=nometadata` (el conector SharePoint maneja autenticación)
   * Body (raw JSON):

```json
{
  "text": "<Comment>"
}
```

* <img width="616" height="393" alt="Captura de pantalla 2025-10-06 a las 10 44 37" src="https://github.com/user-attachments/assets/6ff5f65b-c07d-46da-b326-9f84174a4a0b" />

3. `Respond to a Power App or flow` — devuelve la respuesta del POST (por ejemplo el objeto creado) como `Response`.

## Wiring con Power Apps y PCF (cómo usar estos Flows desde la app host)

Flujo típico:
Cargar comentarios con botón (propiedad OnSelect de un botón o accion que muestre el PCF)

```powerfx
UpdateContext({
    commentMode: !commentMode,
    selectedRecord: If(!commentMode, RecordsGallery1.Selected, Blank())
});

UpdateContext({ commentLoading: true });

// Si commentMode = true → llamo al Flow
//   - Si la respuesta es {"value":[]} → Blank()
//   - Si no, guardo la respuesta
// Si commentMode = false → Blank()
If(
    commentMode,
    With(
        {
            _resp: 'Button->Obtenerlistas,Inicializarvariable'.Run(
                "https://you.sharepoint.com/sites/yousite",
                RecordsGallery1.Selected.ID,
                500 //para 500 comentarios
            )
        },
        Set(
            _commentval,
            If(
                _resp.response = "{""value"":[]}",
                Blank(),
                _resp
            )
        )
    ),
    Set(_commentval, Blank())
);

UpdateContext({ commentLoading: false });

// Limpieza de auxiliares
Set(_tempJson, Blank());
Set(_oldJson, Blank())
```

Propiedad del PCF: `IsLoading = commentLoading`
Propiedad del PCF: `CommentsJSON = _commentval.response`
Propiedad del PCF: `IsLoading = commentLoading`

Publicar comentario (propiedad OnChange del PCF)

```powerfx
// ======================================================================
// PUBLICACIÓN DE COMENTARIOS CON UI OPTIMISTA
// ======================================================================
// ---------- 0) Comentario optimista ----------
Set(
    _tempJson,// Variable temporal para el JSON del comentario
    JSON(// Convierte objeto a formato JSON
        {
            // Objeto con datos del comentario
authorName: User().FullName,
            // Nombre completo del usuario
authorEmail: User().Email,
            // Email del usuario
createdDate: Now(),
            // Fecha y hora actual
text: CommentTimeline2.NewCommentText// Texto del comentario
        },
        JSONFormat.Compact// Formato compacto (sin espacios)
    )
);
// Separador de comandos Power FX
// ---------- 1) Snapshot + base array ----------
Set(
    _oldJson,
    Coalesce(
        _commentval.response,
        ""
    )
);
// Copia de seguridad del JSON actual
// Si está vacío, usa "" como respaldo
Set(
    _baseJson,// Variable para el array base
    If(
        // CONDICIÓN: ¿Está vacío o no empieza con "["?
        IsBlank(Trim(_oldJson)) || Left(
            Trim(_oldJson),
            1
        ) <> "[",
        "[]",// Si es verdadero: array vacío
        _oldJson// Si es falso: JSON actual
    )
);
// Trim() quita espacios, Left() toma primer carácter
// ---------- 2) Insertar optimista ----------
Set(
    _mergedJson,// JSON final con el nuevo comentario
    If(
        _baseJson = "[]",// CONDICIÓN: ¿Es array vacío?
        Concatenate(
            "[",
            _tempJson,
            "]"
        ),// Si es verdadero: crear array con un elemento
        Substitute(
            _baseJson,
            "[",
            Concatenate(
                "[",
                _tempJson,
                ","
            ),
            1
        )// Si es falso: insertar al principio
    )
);
// Substitute reemplaza "[" por "[nuevoComentario,"
Set(
    _commentval,
    Patch(
        _commentval,
        {response: _mergedJson}
    )
);
// ACTUALIZA la variable inmediatamente
// Patch modifica el campo 'response'
// ---------- 3) Ejecutar Flow (CORREGIDO) ----------
Set(
    _flowRaw,
    Blank()
);
// Inicializa variable para respuesta del Flow
Set(
    _flowResult,// Variable para capturar resultado completo del Flow
    CrearcomentariosSMA.Run(// Ejecuta el Flow de Power Automate
        "https://you.sharepoint.com/sites/yousite",// URL del site
        selectedRecord.ID,// ID del registro
        CommentTimeline2.NewCommentText // Texto del comentario
    )
);
// Flow se ejecuta en segundo plano
// ---------- 4) Verificar si hubo error REAL ----------
If(
    // CONDICIÓN: ¿El Flow falló o devolvió respuesta vacía?
    IsBlank(_flowResult) || IsBlank(_flowResult.response),
    // SI ES VERDADERO (ERROR): Hacer rollback
    With(
        {
            // Variable temporal para el rollback
            _rollback: Set(
                _commentval,
                Patch(
                    _commentval,
                    {response: _oldJson}
                )
            )
        },
        // Notificar al usuario que falló
        Notify(
            "No se pudo publicar el comentario. Se ha deshecho en el timeline.",
            NotificationType.Error
        )
    ),
    // SI ES FALSO (ÉXITO): Capturar la respuesta
    Set(
        _flowRaw,
        _flowResult.response
    )// Guarda respuesta oficial del servidor
);
// ---------- 5) Normalizar respuesta ----------
If(
    !IsBlank(_flowRaw),// CONDICIÓN: ¿Hay respuesta del Flow para procesar?
    With(// Si es verdadero: procesar la respuesta
        {
            // Variables temporales para el procesamiento
            raw: Trim(_flowRaw),
            // Respuesta sin espacios
            // Extraer array si viene en formato {"value": [...]}
arrFromValue: With(
                {
                    // Buscar posición del primer "[" y "]"
                    start: IfError(
                        Find(
                            "[",
                            Trim(_flowRaw),
                            1
                        ),
                        0
                    ),
                    end: IfError(
                        Find(
                            "]",
                            Trim(_flowRaw),
                            IfError(
                                Find(
                                    "[",
                                    Trim(_flowRaw),
                                    1
                                ),
                                1
                            )
                        ),
                        0
                    )
                },
                If(
                    And(
                        start > 0,
                        end > start
                    ),// ¿Se encontraron ambos caracteres?
                    Mid(
                        Trim(_flowRaw),
                        start,
                        end - start + 1
                    ),// Extraer solo el array
                    Blank()// Si no, devolver vacío
                )
            )
        },
        // ACTUALIZAR la variable con la respuesta oficial
        Set(
            _commentval,
            Patch(
                _commentval,
                {
                    response: If(
                        Left(
                            raw,
                            1
                        ) = "[",// ¿Empieza con "["?
                        raw,// Si es verdadero: usar respuesta tal como viene
                        StartsWith(
                            raw,
                            "{"
                        ) && !IsBlank(arrFromValue),// ¿Es {"value": [...]}?
                        arrFromValue,// Si es verdadero: usar solo el array extraído
                        StartsWith(
                            raw,
                            "{"
                        ),// ¿Es un objeto suelto?
                        Substitute(
                            _commentval.response,
                            _tempJson,
                            raw,
                            1
                        ),// Si es verdadero: reemplazar comentario optimista
                        _commentval.response// Por defecto: mantener el actual
                    )
                }
            )
        )
    )
)
```

---

## Consejos y notas

* No incluyas GUIDs ni URLs de tenant en commits públicos; en esta guía se usan ejemplos que debes adaptar.
* Si usas el conector de SharePoint, el conector maneja autenticación; evita llamadas HTTP crudas que requieran X-RequestDigest si puedes usar la acción dedicada.
* Añade manejo de errores en los Flows: envía `error: true` cuando la operación falle o la validación no pase.
* Prueba los Flows desde Power Apps con datos de ejemplo antes de integrarlos con el PCF para verificar formatos.
