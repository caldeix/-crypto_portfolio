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
6. [Transacciones — El motor del portfolio](#-transacciones--el-motor-del-portfolio)
7. [Historial de transacciones](#-historial-de-transacciones)
8. [Estadísticas — Compara y analiza](#-estadísticas--compara-y-analiza)
9. [Búsqueda global de criptos](#-búsqueda-global-de-criptos)
10. [Privacidad: modo ocultar valores](#-privacidad-modo-ocultar-valores)
11. [Importar y Exportar — Tu JSON, tu tesoro](#-importar-y-exportar--tu-json-tu-tesoro)
12. [Configuración y API Key](#-configuración-y-api-key)
13. [Preguntas frecuentes](#-preguntas-frecuentes)

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
    └── cp_cgApiKey        ← API Key (cifrada en base64)
```

### El sistema de exportación JSON

La verdadera autocustodia viene del sistema de **exportación e importación**. En cualquier momento puedes descargar un archivo `.json` con toda tu información:

```json
{
  "version": 3,
  "exportedAt": "2025-05-16T12:00:00.000Z",
  "transactions": [...],
  "customCategories": [...],
  "archivedSymbols": [...]
}
```

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
```

| Campo | Qué significa |
|-------|--------------|
| **Valor total** | Suma del valor actual de todos tus activos (cantidad × precio actual) |
| **Invertido** | Capital neto que has puesto, descontando lo que ya has recuperado con ventas |
| **Liquidez** | Suma de todas las transacciones de tipo LIQUIDEZ registradas |
| **24h** | Variación en dólares y porcentaje de las últimas 24 horas sobre el valor total |
| **rent** | Tu beneficio o pérdida total desde el primer día, en USD y en % |

### Ordenación de tarjetas

Justo debajo del resumen tienes tres botones de ordenación. Pulsa una vez para ordenar descendente, pulsa de nuevo para ascendente:

- **Valor** — Ordena por valor actual de la posición (útil para ver tus mayores apuestas)
- **Rent.** — Ordena por porcentaje de rentabilidad (útil para ver qué ha rendido mejor)
- **P&L** — Ordena por beneficio/pérdida en dólares absolutos

### Monedas archivadas

Las monedas en las que ya no tienes posición pero quieres conservar el historial pueden archivarse. Aparecen en un desplegable al final del Dashboard, separadas de las activas, y no cuentan en el resumen global.

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
| **Invertido** | Capital total aportado − recuperado en ventas | Cuánto tienes "en riesgo" |
| **Avg Venta** | Ingresos totales por ventas ÷ unidades vendidas | A qué precio medio has salido |
| **Vendido** | Total en USD que has recuperado vendiendo | Liquidez ya materializada |
| **P&L total** | Valor actual + vendido − invertido total | Beneficio o pérdida total de la moneda |
| **P&L posición** | (Precio actual − Avg Compra) × cantidad actual | Cuánto ganarías/perderías si vendieras hoy |
| **vs Avg** | (Precio actual − Avg Compra) ÷ Avg Compra | En qué % estás por encima/debajo de tu entrada |
| **Rent.** | P&L total ÷ capital invertido total | Rentabilidad real sobre lo que pusiste |

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

Una gráfica de velas SVG interactiva del precio histórico. Puedes seleccionar el rango temporal:

| Rango | Descripción |
|-------|-------------|
| **1D** | Últimas 24 horas, máximo detalle |
| **7D** | Última semana |
| **1M** | Último mes |
| **3M** | Últimos 3 meses |

Pasa el dedo (o el cursor) por encima de la gráfica para ver el precio exacto en cada momento.

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

Esta sección solo aparece si tienes transacciones registradas para esta moneda. Muestra un resumen rápido de tu posición personal: valor actual, capital invertido, P&L y rentabilidad.

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
2. **Lado derecho** — Selecciona otra moneda o el resto del portfolio como referencia
3. **Métrica** — Elige qué quieres comparar: valor, P&L, rentabilidad, capital invertido...

Esto te permite responder preguntas como:
- *¿Cuánto representa BTC + ETH respecto al resto de mi cartera?*
- *¿Qué peso tiene mi posición en SOL sobre el total invertido?*

### Filtros de período

El botón de filtro te permite acotar las transacciones que se usan para los cálculos, útil para analizar rentabilidades en rangos temporales específicos.

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
- Todas tus transacciones (fecha, moneda, tipo, cantidad, precio)
- Categorías personalizadas creadas
- Lista de monedas archivadas
- Opcionalmente, tu API Key de CoinGecko (cifrada)

**Guarda este archivo como si fuera tu cartera.** Es la única copia de tus datos.

### Importar

Carga un `.json` exportado previamente para restaurar todo tu portfolio. Útil cuando:

- Cambias de dispositivo o navegador
- Has borrado los datos del navegador accidentalmente
- Quieres sincronizar manualmente entre varios dispositivos
- Haces un backup periódico y quieres restaurar un estado anterior

> ⚠️ **La importación reemplaza todos los datos actuales**. Si quieres conservar lo que tienes, exporta primero.

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

La key se guarda **cifrada en base64** en tu localStorage. Nunca se envía a ningún servidor nuestro — va directamente a la API de CoinGecko en cada petición.

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
Sí, está diseñada mobile-first. Puedes añadirla a la pantalla de inicio en iOS (Safari → Compartir → Añadir a pantalla de inicio) o Android (Chrome → Menú → Instalar app) para usarla como si fuera una app nativa.

**¿Por qué a veces tarda en cargar la información de una moneda?**
La app hace una petición a CoinGecko por cada moneda que no tiene en caché. Si tienes muchas monedas nuevas o el caché expiró (>24h), puede tardar unos segundos. Una vez cacheado, todo aparece al instante.

**¿Puedo tener la misma moneda con diferentes precios de entrada?**
Sí. Añade tantas transacciones BUY como quieras. El precio medio de entrada se calcula automáticamente como la media ponderada de todas tus compras.

**¿Las ventas parciales afectan al cálculo?**
Sí. El capital "invertido" se recalcula correctamente cuando hay ventas parciales. El P&L total siempre refleja el resultado real de toda la operativa en esa moneda.

**¿Qué es el P&L posición vs el P&L total?**
- **P&L total**: resultado global incluyendo todo lo vendido y lo que tienes ahora
- **P&L posición**: cuánto ganarías o perderías si vendieras *hoy* lo que tienes, ignorando operaciones pasadas

---

<div align="center">

Hecho con ☕ y demasiadas horas mirando gráficas de velas

**[@caldeix](https://github.com/caldeix)**

</div>
