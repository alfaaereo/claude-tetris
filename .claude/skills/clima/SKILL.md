---
name: clima
description: Consulta el clima actual y el pronóstico de los próximos días para la ubicación local del usuario (detectada por IP) o para una ciudad concreta. Úsala cuando el usuario pregunte por el clima, el tiempo, la temperatura, si va a llover, etc.
argument-hint: "[ciudad] [días]"
---

# Clima local

Obtén el clima ejecutando el script incluido, que usa la API gratuita de Open-Meteo (no necesita API key).

## Cómo ejecutarlo

Con la herramienta PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/obtener-clima.ps1" [-Ciudad "<ciudad>"] [-Dias <1-16>]
```

- Sin `-Ciudad`: detecta la ubicación aproximada por la IP pública (ipapi.co, con respaldo en ip-api.com).
- `-Ciudad "Medellín"`: busca la ciudad con el geocodificador de Open-Meteo (toma el resultado más relevante). Pasa solo el nombre de la ciudad, sin país; si el resultado cae en otro país del esperado, avísalo al usuario.
- `-Dias`: días de pronóstico (1–16, por defecto 3).

Interpreta los argumentos de la skill (`$ARGUMENTS`): un texto es la ciudad y un número es la cantidad de días. Si no hay argumentos, usa la ubicación local y 3 días.

## Salida

El script imprime JSON con `ubicacion`, `zona`, `actual` (estado, temperatura, sensación térmica, humedad, viento, precipitación) y `pronostico` (por día: estado, mínima/máxima, probabilidad de lluvia, precipitación, UV, amanecer/atardecer).

## Cómo presentarlo

Responde en español y de forma breve:

1. Una línea con la ubicación (ciudad, región, país) y aclara si se detectó por IP, ya que puede ser aproximada (la IP de un ISP o VPN puede ubicar en otra ciudad).
2. **Ahora**: estado, temperatura y sensación térmica en °C, humedad, viento en km/h.
3. **Pronóstico**: una tabla con fecha (día de la semana), estado, mín/máx, probabilidad de lluvia.
4. Si aplica, un consejo corto (paraguas si prob. de lluvia ≥ 50 %, protector solar si UV ≥ 6, abrigo si mín < 10 °C).

Si el script falla (sin conexión, API caída, ciudad no encontrada), informa el error tal cual y sugiere probar con otra ciudad o más tarde.
