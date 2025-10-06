# 🚀 **GIT PARA PRINCIPIANTES - CONTROL DE VERSIONES**

## 📖 **¿QUÉ ES GIT Y POR QUÉ LO NECESITAS?**

Git es como un **"historial de cambios"** para tu código. Imagina que es como tener un **"control de versiones"** donde puedes:

- ✅ **Guardar** cada cambio que haces
- ✅ **Volver** a cualquier versión anterior
- ✅ **Comparar** diferentes versiones
- ✅ **Trabajar** en equipo sin perder código
- ✅ **Tener backup** en la nube (GitHub)

---

## 🎯 **CONCEPTOS BÁSICOS QUE DEBES ENTENDER**

### **1. 📁 REPOSITORIO (REPO)**
- Es la **carpeta** de tu proyecto
- Contiene **todo tu código** y su historial
- Puede estar en tu PC (**local**) y en GitHub (**remoto**)

### **2. 📝 COMMIT**
- Es como **"guardar"** una versión de tu código
- Cada commit tiene un **mensaje** que describe qué cambió
- Es como tomar una **"foto"** de tu código en ese momento

### **3. 🌿 RAMA (BRANCH)**
- Es una **copia** de tu código donde puedes experimentar
- La rama principal se llama **"master"** o **"main"**
- Puedes crear **ramas separadas** para nuevas funciones

### **4. 🔄 PUSH/PULL**
- **Push:** Subir tus cambios a GitHub
- **Pull:** Bajar cambios de GitHub a tu PC

---

## 🛠️ **COMANDOS BÁSICOS QUE USARÁS**

### **📋 VER EL ESTADO ACTUAL**
```bash
& "C:\Program Files\Git\bin\git.exe" status
```
**¿Qué hace?** Te dice qué archivos has cambiado y cuáles están listos para guardar.

### **📝 GUARDAR CAMBIOS (COMMIT)**
```bash
# 1. Agregar archivos al área de preparación
& "C:\Program Files\Git\bin\git.exe" add .

# 2. Guardar los cambios con un mensaje
& "C:\Program Files\Git\bin\git.exe" commit -m "Descripción de lo que cambió"
```
**¿Qué hace?** Guarda una nueva versión de tu código.

### **📤 SUBIR A GITHUB (PUSH)**
```bash
& "C:\Program Files\Git\bin\git.exe" push
```
**¿Qué hace?** Sube tus cambios guardados a GitHub.

### **📥 BAJAR DE GITHUB (PULL)**
```bash
& "C:\Program Files\Git\bin\git.exe" pull
```
**¿Qué hace?** Baja los cambios más recientes de GitHub.

---

## 🔍 **CÓMO VER TU HISTORIAL DE CAMBIOS**

### **📜 VER TODOS LOS COMMITS**
```bash
& "C:\Program Files\Git\bin\git.exe" log --oneline
```
**Ejemplo de salida:**
```
cdab7e2 Primera versión: Componente PCF Timeline de Comentarios
a1b2c3d Agregué nueva funcionalidad
e4f5g6h Corregí error en el botón
```

### **📊 VER CAMBIOS DETALLADOS**
```bash
& "C:\Program Files\Git\bin\git.exe" log --oneline --graph
```
**¿Qué hace?** Muestra el historial con una línea de tiempo visual.

---

## ⏮️ **CÓMO VOLVER A VERSIONES ANTERIORES**

### **🔍 PASO 1: Identificar la versión**
```bash
& "C:\Program Files\Git\bin\git.exe" log --oneline
```
**Busca** el código del commit al que quieres volver (ejemplo: `cdab7e2`)

### **⏮️ PASO 2: Volver a esa versión**
```bash
& "C:\Program Files\Git\bin\git.exe" checkout [código-del-commit]
```
**Ejemplo:**
```bash
& "C:\Program Files\Git\bin\git.exe" checkout cdab7e2
```

### **🔄 PASO 3: Volver a la versión más reciente**
```bash
& "C:\Program Files\Git\bin\git.exe" checkout master
```

---

## 🚨 **SITUACIONES COMUNES Y CÓMO RESOLVERLAS**

### **❌ PROBLEMA: "No puedo hacer push"**
**Solución:**
```bash
# 1. Bajar cambios de GitHub primero
& "C:\Program Files\Git\bin\git.exe" pull

# 2. Luego hacer push
& "C:\Program Files\Git\bin\git.exe" push
```

### **❌ PROBLEMA: "Perdí cambios importantes"**
**Solución:**
```bash
# 1. Ver el historial
& "C:\Program Files\Git\bin\git.exe" log --oneline

# 2. Volver al commit donde estaban los cambios
& "C:\Program Files\Git\bin\git.exe" checkout [código-del-commit]
```

### **❌ PROBLEMA: "Quiero deshacer el último commit"**
**Solución:**
```bash
# Deshacer el último commit (mantiene los cambios)
& "C:\Program Files\Git\bin\git.exe" reset --soft HEAD~1

# Deshacer el último commit (elimina los cambios)
& "C:\Program Files\Git\bin\git.exe" reset --hard HEAD~1
```

---

## 📋 **FLUJO DE TRABAJO DIARIO RECOMENDADO**

### **🌅 AL INICIAR EL DÍA:**
```bash
# 1. Bajar cambios de GitHub
& "C:\Program Files\Git\bin\git.exe" pull

# 2. Ver el estado actual
& "C:\Program Files\Git\bin\git.exe" status
```

### **💻 MIENTRAS TRABAJAS:**
```bash
# Cada vez que hagas cambios importantes:
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "Descripción clara de los cambios"
```

### **🌆 AL TERMINAR EL DÍA:**
```bash
# 1. Ver qué has cambiado
& "C:\Program Files\Git\bin\git.exe" status

# 2. Guardar cambios pendientes
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "Cambios del día"

# 3. Subir a GitHub
& "C:\Program Files\Git\bin\git.exe" push
```

---

## 🎯 **EJEMPLOS PRÁCTICOS PARA TU PROYECTO**

### **📝 EJEMPLO 1: Agregar nueva funcionalidad**
```bash
# 1. Hacer cambios en tu código
# 2. Guardar los cambios
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "Agregué botón de refrescar comentarios"

# 3. Subir a GitHub
& "C:\Program Files\Git\bin\git.exe" push
```

### **🔧 EJEMPLO 2: Corregir un error**
```bash
# 1. Corregir el error en tu código
# 2. Guardar la corrección
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "Corregí error en el header del componente"

# 3. Subir la corrección
& "C:\Program Files\Git\bin\git.exe" push
```

### **⏮️ EJEMPLO 3: Volver a versión anterior**
```bash
# 1. Ver el historial
& "C:\Program Files\Git\bin\git.exe" log --oneline

# 2. Volver a la versión que funcionaba
& "C:\Program Files\Git\bin\git.exe" checkout cdab7e2

# 3. Volver a la versión más reciente
& "C:\Program Files\Git\bin\git.exe" checkout master
```

---

## 🚀 **COMANDOS AVANZADOS (CUANDO TE SIENTAS CÓMODO)**

### **🌿 CREAR UNA RAMA PARA EXPERIMENTAR**
```bash
# Crear nueva rama
& "C:\Program Files\Git\bin\git.exe" branch nueva-funcionalidad

# Cambiar a esa rama
& "C:\Program Files\Git\bin\git.exe" checkout nueva-funcionalidad

# Volver a la rama principal
& "C:\Program Files\Git\bin\git.exe" checkout master
```

### **🔀 FUSIONAR CAMBIOS**
```bash
# Fusionar cambios de otra rama
& "C:\Program Files\Git\bin\git.exe" merge nueva-funcionalidad
```

### **🗑️ ELIMINAR RAMA**
```bash
# Eliminar rama local
& "C:\Program Files\Git\bin\git.exe" branch -d nueva-funcionalidad
```

---

## 💡 **CONSEJOS IMPORTANTES PARA PRINCIPIANTES**

### **✅ HAZ ESTO:**
- **Commit frecuente:** Guarda cambios cada vez que algo funcione
- **Mensajes claros:** Describe exactamente qué cambió
- **Pull antes de push:** Siempre baja cambios antes de subir
- **Prueba antes de commit:** Asegúrate de que tu código funciona

### **❌ NO HAGAS ESTO:**
- **Commit sin probar:** Nunca guardes código que no funciona
- **Mensajes vagos:** Evita "cambios" o "arreglos"
- **Ignorar conflictos:** Resuelve conflictos antes de continuar
- **Perder el token:** Guarda tu token de GitHub en lugar seguro

---

## 🔧 **CONFIGURACIÓN INICIAL (YA HECHA)**

Tu proyecto ya está configurado con:
- ✅ **Git inicializado** en tu carpeta
- ✅ **Usuario configurado:** kemador1
- ✅ **Email configurado:** yoanybermudez@me.com
- ✅ **Repositorio remoto:** Conectado a GitHub
- ✅ **Primer commit:** Código inicial subido

---

## 📚 **RECURSOS ADICIONALES**

### **🌐 ENLACES ÚTILES:**
- **Git oficial:** https://git-scm.com/
- **GitHub:** https://github.com/
- **Tu repositorio:** https://github.com/kemador1/Componente-PCF-Timeline-de-Comentarios-para-Power-Apps

### **📖 LIBROS RECOMENDADOS:**
- "Pro Git" (gratis online)
- "Git for Humans"

---

## 🎉 **¡FELICITACIONES!**

Ya tienes **control total** sobre las versiones de tu proyecto. Ahora puedes:

- ✅ **Experimentar** sin miedo a perder código
- ✅ **Volver** a cualquier versión anterior
- ✅ **Trabajar** de forma profesional
- ✅ **Colaborar** con otros desarrolladores
- ✅ **Tener backup** automático en la nube

**¡Recuerda: La práctica hace al maestro!** Usa Git todos los días y pronto será tu segunda naturaleza.

---

*Documento creado para: **kemador1** - Proyecto PCF Timeline de Comentarios*
*Última actualización: Enero 2025*

