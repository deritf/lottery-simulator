# Lottery Simulator

Aplicación web de simulación educativa de juegos de lotería.  
El proyecto permite analizar, de forma clara y visual, el impacto económico de participar de manera continuada en distintos sorteos, mostrando resultados detallados, estadísticas acumuladas y comparativas a largo plazo.

Este simulador **no predice resultados reales** ni fomenta el juego. Su finalidad es exclusivamente informativa y divulgativa.

---

## Juegos incluidos

La aplicación simula los principales juegos de lotería habituales en España, respetando sus reglas, combinaciones y frecuencia de sorteo:

- **La Primitiva** (con opción de Joker)
- **Bonoloto**
- **Euromillones** (con opción de El Millón)
- **EuroDreams**
- **El Gordo de la Primitiva**
- **Lotería Nacional**
  - Sorteo de Navidad
  - Sorteo del Niño
  - Sorteos ordinarios (jueves y sábado)
- **La Quiniela** (incluye Pleno al 15)
- **Lototurf** (incluye selección de caballo)

Cada juego se gestiona de forma independiente, con su propia lógica de sorteo, costes y premios.

---

## Funcionamiento general

1. El usuario selecciona un juego desde el menú principal.
2. Define su apuesta:
   - Selección manual, o
   - Elección automática.
3. El sistema valida que la apuesta cumple las reglas del juego.
4. Al iniciar la simulación:
   - Se generan sorteos consecutivos respetando el calendario real.
   - Se calcula el resultado del jugador en cada sorteo.
5. La simulación puede ampliarse en el tiempo sin perder el histórico acumulado.

---

## Información mostrada

### Resumen financiero global

Tras ejecutar la simulación, la aplicación muestra un resumen con:

- Total de sorteos simulados
- Tiempo simulado (años y fechas)
- Total gastado en apuestas
- Total ganado en premios
- Balance neto (ganancias o pérdidas)
- Rendimiento por euro invertido

Además, se destaca:

- El mayor premio obtenido
- El sorteo y la fecha en que ocurrió

---

### Registro de sorteos

Se mantiene un historial completo de todos los sorteos simulados, con información detallada de cada uno:

- Fecha del sorteo
- Apuesta del jugador
- Combinación ganadora
- Categoría de premio alcanzada
- Premio obtenido
- Extras aplicados (Joker, El Millón, etc.)

El registro puede filtrarse para mostrar:

- Todos los sorteos
- Solo sorteos con premio
- Solo botes
- Solo premios de extras

---

### Desglose económico por sorteo

Para cada sorteo individual se muestra:

- Coste real de la apuesta
- Premio principal
- Premio por extras (si aplica)
- Premio total
- Balance del sorteo (premio menos coste)

En los juegos correspondientes, también se incluyen datos de bote y reparto de premios por categorías.

---

## Comparativa con inversión alternativa

El proyecto incluye una sección de **inversión alternativa educativa**:

- El mismo dinero gastado en lotería se invierte de forma simulada, mes a mes.
- Se utilizan datos históricos de distintos índices bursátiles.
- Se genera una gráfica comparativa que muestra la evolución del capital en cada escenario.

Esta comparativa tiene un fin informativo y no constituye asesoramiento financiero.

---

## Idiomas y accesibilidad

- Interfaz disponible en **español** e **inglés**.
- Cambio de idioma dinámico en toda la aplicación.
- Uso de etiquetas semánticas y atributos ARIA para mejorar la accesibilidad.
- Navegación adaptada a escritorio y dispositivos móviles.

---

## Autor y créditos

Proyecto creado por **Derimán Tejera Fumero**.

Agradecimientos:

- Iconos proporcionados por **iconmonstr**
- Iconos proporcionados por **Icons8**

---

## Finalidad y aviso legal

Este proyecto es una **simulación educativa**:

- No está afiliado a Loterías y Apuestas del Estado ni a operadores oficiales.
- Los resultados son simulados y pueden no coincidir con sorteos reales.
- No fomenta el juego ni ofrece recomendaciones de participación.
- No constituye asesoramiento financiero.

El objetivo principal es ayudar a comprender las probabilidades, los costes reales y el impacto económico del juego a largo plazo.

---

---

# Lottery Simulator (English)

Educational web application for lottery draw simulation.  
The project allows users to clearly and visually analyze the economic impact of participating in lottery games over long periods of time, showing detailed results, accumulated statistics, and long-term comparisons.

This simulator **does not predict real results** and does not encourage gambling. Its purpose is strictly educational and informational.

---

## Supported games

The application simulates the most common lottery games in Spain, respecting their official rules, combinations, and draw frequency:

- **La Primitiva** (with Joker option)
- **Bonoloto**
- **Euromillones** (with El Millón option)
- **EuroDreams**
- **El Gordo de la Primitiva**
- **Spanish National Lottery**
  - Christmas Draw
  - El Niño Draw
  - Regular draws (Thursday and Saturday)
- **La Quiniela** (including Match 15)
- **Lototurf** (including horse selection)

Each game is handled independently, with its own draw logic, costs, and prize structure.

---

## How it works

1. The user selects a game from the main menu.
2. Defines a bet:
   - Manual selection, or
   - Automatic pick.
3. The system validates that the bet follows the game rules.
4. When starting the simulation:
   - Consecutive draws are generated following the real draw schedule.
   - The player result is calculated for each draw.
5. The simulation can be extended over time without losing previous results.

---

## Displayed information

### Global financial summary

After running the simulation, the application shows:

- Total simulated draws
- Simulated time span (years and dates)
- Total money spent
- Total winnings
- Net balance (profit or loss)
- Return per euro invested

Additionally:

- The highest prize obtained
- The draw number and date when it occurred

---

### Draw log

A complete draw history is maintained, showing detailed information for each simulated draw:

- Draw date
- Player bet
- Winning combination
- Prize category reached
- Prize amount
- Applied extras (Joker, El Millón, etc.)

The log can be filtered to display:

- All draws
- Only winning draws
- Only jackpots
- Only extra prizes

---

### Per-draw economic breakdown

For each individual draw, the application displays:

- Real cost of the bet
- Main prize
- Extra prizes (if applicable)
- Total prize
- Draw balance (prize minus cost)

For applicable games, jackpot and prize distribution data are also shown.

---

## Alternative investment comparison

The project includes an **educational alternative investment comparison**:

- The same money spent on lottery draws is simulated as a monthly investment.
- Historical data from different market indices is used.
- A comparative chart shows how the capital would have evolved in each scenario.

This comparison is purely informational and does not constitute financial advice.

---

## Languages and accessibility

- Interface available in **Spanish** and **English**.
- Instant language switching across the entire application.
- Semantic HTML and ARIA attributes for improved accessibility.
- Layout adapted for desktop and mobile devices.

---

## Author and credits

Project created by **Derimán Tejera Fumero**.

Credits:

- Icons by **iconmonstr**
- Icons by **Icons8**

---

## Disclaimer

This project is an **educational simulation**:

- It is not affiliated with official lottery operators.
- Results are simulated and may differ from real draws.
- It does not promote gambling or betting.
- It is not financial advice.

The main goal is to help users understand probabilities, real costs, and the long-term economic impact of lottery games.
