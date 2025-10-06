# Flujos (Power Automate) usados por CommentTimeline

Este documento describe paso a paso dos Power Automate Flows que se usan conjuntamente con el componente PCF:

- `Obtener comentarios` — recupera comentarios de un item de SharePoint
- `Crear comentarios SMA` — crea un nuevo comentario en un item de SharePoint

Ambos Flows usan el trigger "Power Apps (V2)" y devuelven su resultado directamente al host (Power Apps). La aplicación Power Apps es responsable de construir el objeto `FlowReturnIn` que el PCF espera (ver sección "Wiring con PCF").

IMPORTANTE: en la documentación se usan ejemplos (SiteUrl y ListId). Sustituye `https://<your-tenant>.sharepoint.com/sites/<site>` y `LIST_GUID` por los valores de tu entorno.

---

## 1) Flow: Obtener comentarios

Propósito: recuperar los comentarios de un item concreto y devolver un array normalizado con campos mínimos: text, createdDate, authorName, authorEmail.

Trigger (Power Apps V2) - entradas esperadas:
- `SiteUrl` (texto) — URL raíz del site, por ejemplo: `https://<your-tenant>.sharepoint.com/sites/SMA_POC`
- `ItemId` (entero o texto) — ID del item en la lista
- `Top` (número, opcional) — cantidad máxima de comentarios a devolver

Pasos (resumen):

1. (Opcional) Obtener el List GUID: si conoces el GUID de la lista de comentarios puedes almacenarlo en una variable; si no, usa la acción `Send an HTTP request to SharePoint` para buscar la lista por título.

   Ejemplo (si ya conoces el GUID):
   - Variable `ListId` = `a8cad8ac-e45a-4f20-a525-b3fa4527a7d7` (reemplaza por la tuya)

2. Acción: `Send an HTTP request to SharePoint`
   - Site Address: `SiteUrl` (usar el parámetro del trigger)
   - Method: `GET`
   - Uri: `/_api/web/lists(guid'<ListId>')/items(<ItemId>)/Comments?&$select=text,createdDate,author/email,author/name&$expand=author&$orderby=createdDate desc&$top=<Top>`
     - Nota: sustituir `<ListId>` y `<ItemId>` por los valores/variables apropiadas. Para el parámetro `$top` usa la variable `Top` o un valor por defecto (p.ej. 50).
   - Headers: `Accept: application/json;odata=nometadata`

3. (Opcional) `Select` / `Parse` — adaptar la respuesta `value` a la forma que quiere el PCF. Mapear campos:
   - `text` -> `text`
   - `createdDate` -> `createdDate` (usar `coalesce()` o fallback para asegurarse de tener valor)
   - `authorName` -> `author.name`
   - `authorEmail` -> `author.email`

   Ejemplo simple de `Select` (en la acción Select):
   - From: `body('Send_an_HTTP_request_to_SharePoint')?['value']`
   - Map:
     - `text` => `item()?['text']`
     - `createdDate` => `coalesce(item()?['createdDate'], item()?['Modified'])` (ajusta según tus campos)
     - `authorName` => `item()?['author']?['name']`
     - `authorEmail` => `item()?['author']?['email']`

4. (Opcional) Filtrar/limpiar: usa `Filter array` para eliminar entradas nulas o `Select` adicional para limpiar strings (p. ej. `replace()` si vienen escapados).

5. `Set variable` o `Compose`: almacena el array resultante en `varResponsed` (u otro nombre)

6. `Respond to a Power App or flow` — devolver `varResponsed` como salida. Esto regresará a Power Apps el JSON con el array de comentarios.

Ejemplo de salida esperada (payload):

```json
[
  {
    "text": "Comentario ejemplo",
    "createdDate": "2025-10-06T10:00:00Z",
    "authorName": "Juan Perez",
    "authorEmail": "juan@empresa.com"
  }
]
```

---

## 2) Flow: Crear comentarios SMA

Propósito: crear un comentario en un item específico de SharePoint (lista de comentarios) y devolver el resultado al host.

Trigger (Power Apps V2) - entradas esperadas:
- `SiteUrl` (texto)
- `ItemId` (entero o texto)
- `Comment` (texto) — texto del nuevo comentario

Pasos (resumen):

1. (Opcional) Obtener `ListId` o usar GUID conocido (igual que en el Flow anterior).

2. Acción: `Send an HTTP request to SharePoint`
   - Site Address: `SiteUrl`
   - Method: `POST`
   - Uri: `/_api/web/lists(guid'<ListId>')/items(<ItemId>)/Comments`
   - Headers: `Accept: application/json;odata=nometadata` (el conector SharePoint maneja autenticación)
   - Body (raw JSON):

```json
{
  "text": "<Comment>"
}
```

3. `Respond to a Power App or flow` — devuelve la respuesta del POST (por ejemplo el objeto creado) como `Response`.

Ejemplo de respuesta (payload):

```json
{
  "id": 12345,
  "text": "Comentario creado",
  "createdDate": "2025-10-06T10:05:00Z",
  "author": { "name": "Usuario Actual", "email": "usuario@empresa.com" }
}
```

---

## Wiring con Power Apps y PCF (cómo usar estos Flows desde la app host)

Flujo típico:

1. El componente PCF (CommentTimeline) emite `NewCommentTrigger` y `NewCommentText`.
2. En Power Apps detectas que `NewCommentTrigger` cambió y ejecutas el Flow `Crear comentarios SMA`, pasando `SiteUrl`, `RecordId` (ItemId) y `NewCommentText`.
3. El Flow responde a Power Apps con su `payload` (JSON). En Power Apps debes normalizar esa respuesta a texto (p. ej. con `JSON(...)`) y construir el objeto `FlowReturnIn` que espera el PCF:

```json
{
  "operationId": "<OperationIdOut>",
  "error": false,
  "payload": "<texto JSON devuelto por el Flow>"
}
```

- `operationId` debe ser exactamente el valor emitido por el componente PCF (propiedad `OperationIdOut`).
- `error` = `true` si el Flow falló y quieres que el PCF haga rollback.
- `payload` es la respuesta (texto JSON) del Flow.

4. Entrega el `FlowReturnIn` al PCF (por ejemplo asignando una variable enlazada a la propiedad `FlowReturnIn` del control). El PCF hará el merge optimista y el rollback si detecta `error: true` o `payload` inválido.

---

## Consejos y notas

- No incluyas GUIDs ni URLs de tenant en commits públicos; en esta guía se usan ejemplos que debes adaptar.
- Si usas el conector de SharePoint, el conector maneja autenticación; evita llamadas HTTP crudas que requieran X-RequestDigest si puedes usar la acción dedicada.
- Añade manejo de errores en los Flows: envía `error: true` cuando la operación falle o la validación no pase.
- Prueba los Flows desde Power Apps con datos de ejemplo antes de integrarlos con el PCF para verificar formatos.

---

Si quieres, puedo:
- Generar plantillas de export para importar estos Flows (si me das los exports actuales).
- Añadir capturas de pantalla paso a paso dentro de esta guía si me subes las imágenes.
