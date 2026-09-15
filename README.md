<div align="center">

# 📊 Crypto Portfolio Tracker

**Seguimiento profesional de tu cartera de criptomonedas — sin servidores, sin registro, sin ceder tus datos.**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deployed-222222?logo=github)
![License](https://img.shields.io/github/license/caldeix/-crypto_portfolio)
![Last Commit](https://img.shields.io/github/last-commit/caldeix/-crypto_portfolio)

<br/>

> Diseñado mobile-first. Funciona desde el navegador. Tus datos nunca salen de tu dispositivo.

**[→ Abrir la aplicación](https://caldeix.github.io/-crypto_portfolio/)**

</div>

---

## Tabla de contenidos

1. [¿Qué es esto?](#-qué-es-esto)
2. [Filosofía: autocustodia total](#-filosofía-autocustodia-total)
3. [Dashboard — Tu resumen global](#-dashboard--tu-resumen-global)
4. [Cards de moneda — Vistazo rápido](#-cards-de-moneda--vistazo-rápido)
5. [Detalle de moneda — Análisis completo](#-detalle-de-moneda--análisis-completo)
6. [Ciclos y posiciones cerradas](#-ciclos-y-posiciones-cerradas)
7. [Transacciones — El motor del portfolio](#-transacciones--el-motor-del-portfolio)
8. [Historial de transacciones](#-historial-de-transacciones)
9. [Estadísticas — Compara y analiza](#-estadísticas--compara-y-analiza)
10. [Búsqueda global de criptos](#-búsqueda-global-de-criptos)
11. [Privacidad: modo ocultar valores](#-privacidad-modo-ocultar-valores)
12. [Importar y Exportar — Tu JSON, tu tesoro](#-importar-y-exportar--tu-json-tu-tesoro)
13. [Configuración y API Key](#-configuración-y-api-key)
14. [Preguntas frecuentes](#-preguntas-frecuentes)

---

## 🔭 ¿Qué es esto?

**Crypto Portfolio Tracker** es una aplicación web progresiva que te permite llevar un seguimiento preciso y en tiempo real de tus inversiones en criptomonedas. Registras cada compra y venta, y la app calcula automáticamente tu rentabilidad real, el precio medio de entrada, el P&L (profit & loss) de cada posición y el estado global de tu cartera.

### ¿Para quién es?

- Inversores que quieren **saber exactamente cuánto están ganando o perdiendo** en cada activo
- Personas que operan en **múltiples exchanges** y necesitan una vista unificada
- Quienes valoran su **privacidad** y no quieren dar sus datos a ninguna plataforma

### ¿Qué NO es?

- No es un exchange ni una wallet — no mueve fondos
- No requiere conectar ninguna wallet ni API de exchange
- No almacena nada en la nube — absolutamente nada

---

## 🔐 Filosofía: autocustodia total

Esta aplicación sigue el mismo principio que las cold wallets: **tus datos son tuyos**.

### Cómo funciona el almacenamiento

Todo se guarda en el **`localStorage` de tu navegador** — la misma tecnología que usan los sitios web para recordar preferencias. No existe ningún servidor, base de datos ni cuenta de usuario. La app funciona completamente en tu dispositivo.

```
Tu navegador
└── localStorage
    ├── cp_transactions    ← Todas tus compras y ventas
    ├── cp_cgMeta          ← Cache de datos de CoinGecko (precios históricos, descripciones, contratos)
    ├── cp_archived        ← Monedas archivadas
    ├── cp_categories      ← Categorías personalizadas
    ├── cp_customBars      ← Configuración de barras en Estadísticas
    ├── cp_chartType       ← Si prefieres la gráfica en línea o en velas
    └── cp_cgApiKey        ← API Key (codificada en base64)
```

### El sistema de exportación JSON

La verdadera autocustodia viene del sistema de **exportación e importación**. En cualquier momento puedes descargar un archivo `.json` con toda tu información:

```json
{
  "version": 4,
  "exportedAt": "2025-05-16T12:00:00.000Z",
  "transactions": [...],
  "customCategories": [...],
  "archivedSymbols": [...],
  "customBars": [...],
  "cgMeta": { "bitcoin": { "thumb": "...", "homepage": "..." } }
}
```

Cada transacción del export lleva además un campo **`realized`**: `true` si pertenece
a una posición que ya se cerró, `false` si forma parte de la que tienes abierta. Ese
flag se calcula al vuelo y se vuelca al exportar para que puedas leerlo abriendo el
JSON; al importar se ignora y se recalcula, así que nunca puede quedarse desfasado.

Este archivo **es tu cartera**. Guárdalo donde quieras: disco duro, USB, Dropbox, Google Drive. Si un día cambias de navegador, de dispositivo o simplemente limpias el historial, importas ese JSON y recuperas todo al instante.

> ⚠️ **Importante**: Si borras los datos del navegador sin haber exportado, perderás tu historial. Exporta con regularidad como harías un backup.

---

## 📈 Dashboard — Tu resumen global

El Dashboard es la pantalla principal. Muestra el estado agregado de toda tu cartera activa de un vistazo.

### Resumen superior

```
$124,350.82           👁️
Invertido $89,200.00   Liquidez $4,500.00
24h  +$1,823.50 (+1.49%)
rent +$35,150.82 (+39.40%)
real  +$8,420.15 (12 cerradas)
```

| Campo | Qué significa |
|-------|--------------|
| **Valor total** | Suma del valor actual de todos tus activos (cantidad × precio actual) |
| **Invertido** | Capital que tienes ahora mismo en riesgo. Cuenta **solo las posiciones abiertas**: lo que pusiste en monedas que ya cerraste no aparece aquí |
| **Liquidez** | Suma de todas las transacciones de tipo LIQUIDEZ registradas |
| **24h** | Variación en dólares y porcentaje de las últimas 24 horas sobre el valor total |
| **rent** | Beneficio o pérdida de tus **posiciones abiertas**, en USD y en % |
| **real** | P&L ya materializado en posiciones que cerraste por completo. Solo aparece si tienes alguna. Sumado a **rent** te da el resultado de toda tu vida como inversor |

> **Por qué dos líneas y no una**: mezclar una moneda que cerraste hace un año con
> la que compraste ayer hace que el porcentaje no signifique gran cosa. Separando
> el libro abierto del cerrado, **rent** te dice cómo va lo que tienes ahora y
> **real** lo que ya te llevaste. Ver [Ciclos y posiciones cerradas](#-ciclos-y-posiciones-cerradas).

### Ordenación de tarjetas

Justo debajo del resumen tienes tres botones de ordenación. Pulsa una vez para ordenar descendente, pulsa de nuevo para ascendente:

- **Valor** — Ordena por valor actual de la posición (útil para ver tus mayores apuestas)
- **Rent.** — Ordena por porcentaje de rentabilidad (útil para ver qué ha rendido mejor)
- **P&L** — Ordena por beneficio/pérdida en dólares absolutos

### Monedas archivadas

Las monedas que quieres quitar de la vista principal pero conservar pueden archivarse
con el botón **🗄️**. Aparecen en un desplegable al final del Dashboard, separadas de
las activas.

> **Sí cuentan en el resumen global.** Archivar es solo una decisión visual tuya: si
> una moneda archivada todavía tiene saldo, su valor sigue sumando al total y su P&L
> sigue contando. Es lo que quieres cuando archivas un token que se fue a cero pero
> prefieres no borrarlo.

Archivar es independiente de que una posición esté cerrada: puedes tener archivada una
moneda que aún conservas (un token sin valor que guardas de recuerdo) y una cerrada sin
archivar.

---

## 🃏 Cards de moneda — Vistazo rápido

Cada moneda activa aparece como una tarjeta con toda la información relevante condensada.

```
[Logo] BTC  Bitcoin          $42,350.00  🔗 🗄️
                              ▲ 2.34% 24h

Cantidad        Avg Compra      Precio act.
0.85 BTC        $38,200.00      $49,823.53

Invertido       Avg Venta       Vendido
$32,470.00      —               —

P&L total       P&L posición    vs Avg
+$9,880.00      +$9,880.00      +30.42%

                                Rent.
                                +30.42%
```

### Explicación de cada métrica

| Métrica | Fórmula | Para qué sirve |
|---------|---------|----------------|
| **Cantidad** | Suma de compras − suma de ventas | Cuánto tienes ahora mismo |
| **Avg Compra** | Coste total pagado ÷ unidades totales compradas | Tu precio medio de entrada real |
| **Precio act.** | Precio en tiempo real de CoinGecko | Precio de mercado ahora |
| **Invertido** | Capital aportado en el **ciclo abierto** | Cuánto tienes "en riesgo" en esta moneda ahora |
| **Avg Venta** | Ingresos totales por ventas ÷ unidades vendidas | A qué precio medio has salido |
| **Vendido** | Total en USD que has recuperado vendiendo | Liquidez ya materializada |
| **P&L total** | Valor actual + vendido − invertido, **del ciclo abierto** | Beneficio o pérdida de tu posición actual |
| **P&L posición** | (Precio actual − Avg Compra) × cantidad actual | Cuánto ganarías/perderías si vendieras hoy |
| **vs Avg** | (Precio actual − Avg Compra) ÷ Avg Compra | En qué % estás por encima/debajo de tu entrada |
| **Rent.** | P&L total ÷ invertido en el ciclo abierto | Rentabilidad de la posición que tienes ahora |

> Las tres últimas métricas se calculan **sobre el ciclo abierto**, no sobre todo tu
> histórico con esa moneda. Si vendiste una moneda entera y meses después volviste a
> comprarla, la app no arrastra el precio medio ni las ganancias de la etapa anterior:
> empieza de cero, como si fuera tu primera compra. Lo anterior no se pierde, se guarda
> aparte — ver [Ciclos y posiciones cerradas](#-ciclos-y-posiciones-cerradas).

### Tarjeta de una posición cerrada

Cuando una moneda llega a cero, su tarjeta cambia: no tiene sentido enseñar "Avg Compra
—" e "Invertido $0.00". En su lugar muestra tres datos y la etiqueta **cerrada** donde
iría la variación de 24h:

```
[Logo] IOTA  IOTA                    $0.00  🔗 📤
                                    cerrada

Realizado       Rent. realiz.   Cerrada
-$973.54        -39.49%         mar 26
```

### Botones de acción en la tarjeta

- **🔗** — Reasignar la moneda a otra entrada de CoinGecko (útil si la detección automática fue incorrecta)
- **🗄️** — Archivar la moneda (o 📤 para desarchivar si ya está archivada)

### Colores

- **Verde** — Valores positivos (ganancia, subida)
- **Rojo** — Valores negativos (pérdida, bajada)

---

## 🔍 Detalle de moneda — Análisis completo

Pulsa cualquier tarjeta para abrir el panel de detalle completo de esa moneda.

### Gráfica de precio

Una gráfica SVG interactiva del precio histórico, dibujada a mano sin librerías externas.
Puedes seleccionar el rango temporal:

| Rango | Descripción | Velas que dibuja |
|-------|-------------|------------------|
| **1D** | Últimas 24 horas, máximo detalle | ~48 (media hora cada una) |
| **7D** | Última semana | ~42 (4 horas) |
| **1M** | Último mes | ~60 (12 horas) |
| **3M** | Últimos 3 meses | ~23 (4 días) |

Pasa el dedo (o el cursor) por encima para ver el dato exacto en cada momento.

#### Línea o velas japonesas

El botón de la derecha de los rangos alterna entre las dos vistas, y **recuerda tu
elección** para la próxima vez que abras cualquier moneda:

- **📈 Línea** — La evolución del precio con área degradada. Al pasar por encima verás
  precio y fecha. Va bien cuando lo que quieres es la tendencia de un vistazo.
- **📊 Velas** — Velas japonesas clásicas: verde si cerró por encima de donde abrió,
  rojo si por debajo, con sus mechas marcando el máximo y el mínimo. El tooltip muestra
  **apertura, máximo, mínimo y cierre**, con el cierre coloreado según la dirección.

> **Sobre el número de velas**: CoinGecko decide la granularidad según el rango y en el
> plan gratuito no se puede elegir. El rango de 1 mes llega con unas 180 velas, que en
> la pantalla de un móvil serían menos de dos píxeles cada una — ilegible. La app las
> agrupa (apertura de la primera, máximo mayor, mínimo menor, cierre de la última) para
> que ningún rango dibuje más de 70.

Si una moneda no tiene datos de velas disponibles, la app vuelve sola a la vista de
línea y te lo dice con un aviso, en lugar de dejarte un hueco vacío.

### Datos de mercado

Métricas globales del activo obtenidas de CoinGecko y cacheadas durante 24 horas:

| Dato | Descripción |
|------|-------------|
| **Ranking** | Posición por capitalización de mercado global |
| **Cap. mercado** | Valor total de todas las monedas en circulación |
| **Volumen 24h** | Volumen de trading en las últimas 24 horas |
| **Máx / Mín 24h** | Precio más alto y más bajo del día |
| **7D%** | Variación de precio en los últimos 7 días |
| **ATH** | All Time High — precio más alto histórico |
| **vs ATH** | Cuánto está el precio actual por debajo del ATH |
| **ATL** | All Time Low — precio más bajo histórico |

### Tu posición

Aparece si todavía conservas esa moneda. Muestra valor actual, capital invertido, P&L,
rentabilidad, cantidad y precio medio de entrada — todo referido al **ciclo abierto**.

Si la posición está cerrada, esta sección se sustituye por **Posición cerrada**, con lo
que te llevaste: realizado, rentabilidad realizada y número de ciclos.

### Transacciones de esta moneda

Debajo de tu posición aparecen las operaciones que has hecho en esa moneda concreta, de
la más reciente a la más antigua, sin tener que ir al Historial y filtrar. Se muestran
las 8 últimas y un botón **Ver todas (N)** despliega el resto.

Cada fila es pulsable: se abre el mismo formulario de edición que en el Historial, con
su botón de eliminar. Lo que cambies se refleja **al instante** en "Tu posición", sin
salir de la pantalla.

Aquí solo salen las transacciones de la posición **abierta**. Las de posiciones que ya
cerraste están justo debajo, en el histórico.

### Histórico · posiciones cerradas

Un desplegable, plegado por defecto, con cada ciclo que cerraste en esa moneda:

```
▾ Histórico · posiciones cerradas (1)

  #1 · 01 ago 2024 → 04 dic 2024              +$400.13 (+71.68%)
  Invertido $558.19   Vendido $958.31   Avg $1.53   4 tx

     ↑ BUY   01 ago 24                              $558.19
     ↓ SELL  02 oct 24                              $327.99
     ↓ SELL  13 nov 24                              $297.96
     ↓ SELL  04 dic 24                              $332.36
```

Las operaciones aparecen atenuadas, para distinguirlas de un vistazo de las de tu
posición actual. Siguen siendo editables.

### Info (web y contrato)

Si la moneda tiene datos disponibles en CoinGecko:

- **🌐 Web oficial** — Enlace directo al sitio web del proyecto, no a CoinGecko
- **📋 Dirección de contrato** — La dirección del smart contract en blockchain (disponible para tokens ERC-20, SPL de Solana, etc.). Pulsa para copiar al portapapeles al instante

> **Nota sobre el contrato**: Las monedas nativas como Bitcoin, Ethereum o Solana no tienen dirección de contrato (no son tokens sobre otra cadena), así que este campo no aparece para ellas. Solo lo verás en tokens como USDT, PEPE, JUP, BONK, etc.

### Acerca de

Descripción del proyecto extraída de CoinGecko, con opción de expandir si el texto es largo.

### Caché inteligente de datos

Los datos de detalle (market cap, ATH, descripción, web, contrato) se guardan automáticamente en tu dispositivo. La próxima vez que abras esa moneda, la información aparece **al instante**, sin esperar ninguna carga. Solo se refresca automáticamente cuando el caché supera las 24 horas de antigüedad.

---

## 🔄 Ciclos y posiciones cerradas

Esta es la idea que hace que los números de la app signifiquen algo.

### El problema

Imagina que en agosto de 2024 compraste 366 SUI a $1.53, y que para diciembre los habías
vendido todos, ganando **+$400**. Un año y medio después vuelves a entrar: compras 206
SUI a $0.72.

Una app que sume todo tu histórico te dirá que tu precio medio es $1.24 y que llevas
invertidos $708. Ninguna de las dos cifras te sirve para nada: ni pagaste $1.24 por las
monedas que tienes, ni tienes $708 en riesgo. Y tu rentabilidad aparecerá inflada por
una ganancia que ya te gastaste hace un año.

### Cómo lo resuelve

La app recorre tus operaciones de cada moneda **por orden de fecha** llevando la cuenta
de cuánto tienes. En el momento en que la cantidad vuelve a cero, **cierra el ciclo**:
esas transacciones pasan a estar *realizadas* y el contador arranca de cero. Si más
adelante vuelves a comprar, es como tu primera compra.

Con el ejemplo de arriba:

| | Sumando todo el histórico | Por ciclos |
|---|---|---|
| Invertido | $708.12 | **$149.93** |
| Avg compra | $1.2362 | **$0.7250** |
| Rentabilidad | contaminada con los +$400 de 2024 | solo la posición actual |

Y los +$400.13 no se pierden: están en el histórico de SUI y suman a la línea **real**
del Dashboard.

### Qué cuenta como "llegar a cero"

Casi nunca se llega a cero exacto: quedan restos de polvo de las comisiones o del
redondeo del exchange. La app da por cerrado un ciclo cuando lo que queda es menos del
**0,01% de lo que compraste** en él. Con restos reales como 0,002 de 933 unidades, o
0,01 de 79.655, un criterio estricto no cerraría nunca esas posiciones.

Ese resto de polvo sale de los cálculos de coste, pero **no desaparece de tu cantidad**:
si te quedan 0,002 tokens, la app sigue diciendo que los tienes.

### Casos que quizá te suenen

- **Vendiste todo y volviste a comprar** → dos ciclos. El actual limpio, el anterior en
  el histórico.
- **Un token que se fue a cero y nunca vendiste** → si registraste la salida a precio 0,
  cuenta como ciclo cerrado con pérdida del 100%. Queda visible como recordatorio.
- **Un token sin valor que aún tienes en la wallet** → no cierra, porque sigues
  teniéndolo. Archívalo si no quieres verlo en la lista principal.
- **Vendiste solo una parte** → el ciclo sigue abierto, y esa venta parcial ya está
  contada en el P&L de la posición.

---

## 💸 Transacciones — El motor del portfolio

Todo el sistema se basa en las transacciones que registres. Pulsa el botón **＋** flotante en el menú inferior para añadir una nueva.

### Tipos de transacción

| Tipo | Para qué se usa |
|------|----------------|
| **BUY** | Registra una compra. Aumenta tu posición y el capital invertido |
| **SELL** | Registra una venta. Reduce tu posición y suma al capital recuperado |
| **LIQUIDEZ** | Dinero que tienes disponible para invertir (efectivo en exchange, stablecoins, etc.) |
| **Categorías personalizadas** | Puedes crear las tuyas propias para airdrop, staking, regalo, etc. |

### Campos de una transacción

| Campo | Descripción |
|-------|-------------|
| **Moneda** | La crypto que compras/vendes. Búscala por nombre o ticker |
| **Fecha** | Fecha de la operación (afecta a los cálculos históricos) |
| **Tipo** | BUY, SELL, LIQUIDEZ o categoría personalizada |
| **Cantidad** | Número de unidades (0.00034 BTC, 150 SOL, etc.) |
| **Precio unitario** | Precio al que compraste/vendiste cada unidad en USD |
| **Total** | Se calcula automáticamente: cantidad × precio. También puedes escribir el total y se calcula el precio |

### Asignación a CoinGecko

Cuando añades una moneda por primera vez, la app intenta encontrarla automáticamente en CoinGecko para obtener su precio en tiempo real. Si la detección no es correcta (por ejemplo, hay varios tokens con el mismo ticker), puedes corregirla con el botón **🔗** en la tarjeta.

---

## 📋 Historial de transacciones

La pestaña **Historial** muestra todas tus transacciones ordenadas cronológicamente. Puedes:

- **Ver** el detalle de cada operación
- **Editar** cualquier transacción (precio, cantidad, fecha, tipo)
- **Eliminar** transacciones con confirmación previa
- **Filtrar** por moneda o tipo de transacción

Todas las ediciones se reflejan inmediatamente en el Dashboard y en los cálculos de rentabilidad.

---

## 📊 Estadísticas — Compara y analiza

La pestaña **Stats** ofrece una visión comparativa de tu cartera mediante barras proporcionales personalizables.

### Barras dinámicas

Puedes crear comparativas visuales entre cualquier combinación de activos. Cada barra representa la proporción de un valor entre las monedas seleccionadas.

**Configuración de una barra:**

1. **Lado izquierdo (multiselect)** — Selecciona una o varias monedas. La barra muestra la suma de ese grupo
2. **Lado derecho** — Selecciona otra moneda, o **Resto** para comparar contra todo lo demás

La comparación es siempre por **valor actual** de las posiciones abiertas, que es lo que
responde a la pregunta habitual:

- *¿Cuánto representa BTC + ETH respecto al resto de mi cartera?*
- *¿Qué peso tiene mi posición en SOL frente a la de BTC?*

Además de tus barras, la pantalla muestra dos fijas: **Distribución de capital**
(portfolio frente a liquidez) y **Rendimiento** (invertido frente a valor actual).

### Ocultar barras

El botón **Filtrar** despliega la lista de barras y te deja esconder las que no quieras
ver en ese momento. Es solo visual y no se guarda: al volver a entrar aparecen todas.

> Tus barras personalizadas **viajan en el export** desde la versión 4 del archivo. Antes
> se perdían al importar en otro dispositivo.

---

## 🔎 Búsqueda global de criptos

El **icono de lupa** en la barra de ordenación del Dashboard abre la pantalla de búsqueda global.

Aquí puedes buscar cualquier criptomoneda del mundo (más de 10.000 activos de CoinGecko) para consultar su detalle aunque **no esté en tu portfolio**: precio, gráfica, market cap, ATH, descripción, etc.

Úsala para investigar una moneda antes de invertir, sin necesidad de añadir ninguna transacción.

---

## 👁️ Privacidad: modo ocultar valores

El botón **👁️** en la esquina superior derecha del Dashboard activa el **modo privado**: todos los importes y porcentajes se sustituyen por `••••`.

Útil cuando usas la app en público o cuando compartes pantalla y no quieres que se vean tus números. El modo se activa y desactiva con un solo toque y no afecta a ningún cálculo.

Además, el importe de **Liquidez** tiene su propio toggle independiente — pulsa sobre el texto "Liquidez" para ocultarlo por separado sin activar el modo privado completo.

---

## 💾 Importar y Exportar — Tu JSON, tu tesoro

Disponible desde el menú **⚙️ Configuración** en el footer.

### Exportar

Genera un archivo `.json` con todo tu historial:

```
crypto-portfolio-2025-05-16.json
```

El archivo incluye:
- Todas tus transacciones (fecha, moneda, tipo, cantidad, precio) con su flag `realized`
- Categorías personalizadas creadas
- Lista de monedas archivadas
- Tus barras personalizadas de Estadísticas
- Los logos, webs y direcciones de contrato ya descargados, para que el otro dispositivo
  no tenga que volver a pedirlos uno a uno
- Opcionalmente, tu API Key de CoinGecko (codificada en base64)

**Guarda este archivo como si fuera tu cartera.** Es la única copia de tus datos.

### Importar

Carga un `.json` exportado previamente para restaurar todo tu portfolio. Útil cuando:

- Cambias de dispositivo o navegador
- Has borrado los datos del navegador accidentalmente
- Quieres sincronizar manualmente entre varios dispositivos
- Haces un backup periódico y quieres restaurar un estado anterior

> ⚠️ **La importación reemplaza todos los datos actuales**. Si quieres conservar lo que tienes, exporta primero.

Al terminar, la app te dice exactamente qué ha entrado — *"229 transacciones · 3 barras
personalizadas · v4"* — para que puedas comprobar de un vistazo que la sincronización
salió bien.

**Compatibilidad con archivos antiguos**: un export de la versión 3 no lleva barras
personalizadas. En ese caso la app **conserva las que ya tenga ese dispositivo** en vez
de borrarlas. Y si el archivo viene de una versión más nueva que la app que estás usando
(algo normal si actualizas la tablet antes que el móvil), importa igual y te avisa.

### Estrategia de backup recomendada

```
Cada semana  →  Exportar JSON → guardar en carpeta "Portfolio Backups"
Cada mes     →  Copiar la carpeta a un segundo lugar (nube, USB, email)
```

---

## ⚙️ Configuración y API Key

Accede desde el icono **⚙️** en el menú inferior.

### API Key de CoinGecko (opcional)

La app funciona perfectamente sin API Key usando el tier gratuito de CoinGecko. Sin embargo, el tier gratuito tiene límites de velocidad que pueden hacer que los precios se actualicen más lentamente si tienes muchas monedas.

Con una **API Key de CoinGecko Demo** (gratuita):
- Los precios se actualizan cada **2 minutos** en lugar de cada 5
- Menos posibilidad de errores por rate limiting
- El caché de detalles de monedas se rellena más rápido

**Cómo obtener una API Key gratuita:**
1. Regístrate en [coingecko.com](https://www.coingecko.com)
2. Ve a *Developer Dashboard* → *API Keys*
3. Copia la key Demo y pégala en Configuración

La key se guarda **codificada en base64** en tu localStorage. Que quede claro: base64 es codificación, no cifrado — cualquiera con acceso a tu navegador puede revertirla trivialmente. Nunca se envía a ningún servidor nuestro: va directamente a la API de CoinGecko en cada petición.

### Categorías personalizadas

Desde Configuración puedes crear, renombrar y eliminar categorías de transacción adicionales a las tres por defecto (BUY, SELL, LIQUIDEZ). Ejemplos útiles: `Airdrop`, `Staking`, `Regalo`, `Fee`, `Bridge`.

---

## ❓ Preguntas frecuentes

**¿Por qué no se ve el contrato de Bitcoin o Ethereum?**
Bitcoin y Ethereum son activos nativos de su propia blockchain — no son tokens desplegados sobre otra cadena, por lo que no tienen dirección de contrato. Solo los tokens (ERC-20, SPL de Solana, BEP-20, etc.) tienen contrato.

**¿Los precios son en tiempo real?**
Se actualizan automáticamente cada 5 minutos (o cada 2 minutos con API Key). No son tick a tick como un exchange, pero son suficientes para seguimiento de portfolio.

**¿Qué pasa si cierro el navegador?**
Tus datos están en localStorage y persisten entre sesiones. Al volver a abrir la app, todo está exactamente igual. Solo se pierden si borras manualmente los datos del sitio en el navegador.

**¿Puedo usar la app en el móvil?**
Sí, está diseñada mobile-first y es lo que mejor funciona. Puedes añadirla a la pantalla de inicio en iOS (Safari → Compartir → Añadir a pantalla de inicio) o Android (Chrome → Menú → Añadir a pantalla principal) para abrirla de un toque. Ojo: es un acceso directo, no una app instalada — **necesita conexión para arrancar** y no aparece en el cajón de aplicaciones.

**¿Y en tablet u ordenador?**
También. A partir de 1000px de ancho (tablet en horizontal) las monedas pasan a 4 columnas, y desde 1400px a 6, aprovechando el ancho en vez de dejar la pantalla medio vacía. En el móvil, en cualquier orientación, todo se ve exactamente igual que siempre.

**¿Por qué a veces tarda en cargar la información de una moneda?**
La app hace una petición a CoinGecko por cada moneda que no tiene en caché. Si tienes muchas monedas nuevas o el caché expiró (>24h), puede tardar unos segundos. Una vez cacheado, todo aparece al instante.

**¿Puedo tener la misma moneda con diferentes precios de entrada?**
Sí. Añade tantas transacciones BUY como quieras. El precio medio de entrada es la media ponderada de todas las compras **de tu posición actual**.

**Vendí una moneda entera y meses después volví a comprarla. ¿Qué pasa?**
La app lo trata como empezar de cero: el precio medio y el invertido son solo los de la nueva compra, sin arrastrar la etapa anterior. Aquello queda guardado como posición cerrada y su resultado suma a la línea **real** del Dashboard. Ver [Ciclos y posiciones cerradas](#-ciclos-y-posiciones-cerradas).

**¿Las ventas parciales afectan al cálculo?**
Sí. Mientras no llegues a cero la posición sigue abierta, y esa venta parcial ya está contada en su P&L. El capital "invertido" no baja al vender: sigue siendo lo que aportaste en el ciclo, que es lo que te permite medir contra qué comparas.

**¿Qué es el P&L posición vs el P&L total?**
- **P&L total**: valor actual + lo vendido − lo invertido, todo dentro de tu posición actual
- **P&L posición**: cuánto ganarías o perderías si vendieras *hoy* lo que tienes, ignorando las ventas parciales que ya hiciste

**¿Puedo ver la gráfica en velas japonesas?**
Sí, con el botón a la derecha de los selectores de rango. Recuerda tu elección para todas las monedas. El tooltip da apertura, máximo, mínimo y cierre de cada vela.

---

<div align="center">

Hecho con ☕ y demasiadas horas mirando gráficas de velas

**[@caldeix](https://github.com/caldeix)**

</div>
