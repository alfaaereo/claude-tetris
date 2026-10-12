# Obtiene el clima actual y el pronostico usando Open-Meteo (sin API key).
# Si no se pasa -Ciudad, detecta la ubicacion aproximada por IP.
# Salida: JSON en stdout.
param(
    [string]$Ciudad,
    [ValidateRange(1, 16)][int]$Dias = 3
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$codigos = @{
    0 = 'Despejado'; 1 = 'Mayormente despejado'; 2 = 'Parcialmente nublado'; 3 = 'Nublado'
    45 = 'Niebla'; 48 = 'Niebla con escarcha'
    51 = 'Llovizna ligera'; 53 = 'Llovizna moderada'; 55 = 'Llovizna intensa'
    56 = 'Llovizna helada ligera'; 57 = 'Llovizna helada intensa'
    61 = 'Lluvia ligera'; 63 = 'Lluvia moderada'; 65 = 'Lluvia intensa'
    66 = 'Lluvia helada ligera'; 67 = 'Lluvia helada intensa'
    71 = 'Nevada ligera'; 73 = 'Nevada moderada'; 75 = 'Nevada intensa'; 77 = 'Granos de nieve'
    80 = 'Chubascos ligeros'; 81 = 'Chubascos moderados'; 82 = 'Chubascos violentos'
    85 = 'Chubascos de nieve ligeros'; 86 = 'Chubascos de nieve intensos'
    95 = 'Tormenta'; 96 = 'Tormenta con granizo ligero'; 99 = 'Tormenta con granizo intenso'
}
function Describir([int]$c) { if ($codigos.ContainsKey($c)) { $codigos[$c] } else { "Codigo $c" } }

# 1. Ubicacion
if ($Ciudad) {
    $q = [uri]::EscapeDataString($Ciudad)
    $geo = Invoke-RestMethod "https://geocoding-api.open-meteo.com/v1/search?name=$q&count=1&language=es&format=json"
    if (-not $geo.results) { throw "No se encontro la ciudad '$Ciudad'." }
    $r = $geo.results[0]
    $ubic = [ordered]@{ ciudad = $r.name; region = $r.admin1; pais = $r.country; lat = $r.latitude; lon = $r.longitude; fuente = 'geocoding' }
} else {
    try {
        $ip = Invoke-RestMethod 'https://ipapi.co/json/' -TimeoutSec 10
        $ubic = [ordered]@{ ciudad = $ip.city; region = $ip.region; pais = $ip.country_name; lat = $ip.latitude; lon = $ip.longitude; fuente = 'ip (ipapi.co)' }
    } catch {
        $ip = Invoke-RestMethod 'http://ip-api.com/json/?lang=es' -TimeoutSec 10
        $ubic = [ordered]@{ ciudad = $ip.city; region = $ip.regionName; pais = $ip.country; lat = $ip.lat; lon = $ip.lon; fuente = 'ip (ip-api.com)' }
    }
}

# 2. Pronostico
$lat = ([string]$ubic.lat).Replace(',', '.')
$lon = ([string]$ubic.lon).Replace(',', '.')
$url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon" +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset' +
    "&timezone=auto&forecast_days=$Dias"
$w = Invoke-RestMethod $url

$c = $w.current
$actual = [ordered]@{
    hora             = $c.time
    estado           = Describir $c.weather_code
    temperatura_c    = $c.temperature_2m
    sensacion_c      = $c.apparent_temperature
    humedad_pct      = $c.relative_humidity_2m
    precipitacion_mm = $c.precipitation
    viento_kmh       = $c.wind_speed_10m
    es_de_dia        = [bool]$c.is_day
}

$d = $w.daily
$pronostico = for ($i = 0; $i -lt $d.time.Count; $i++) {
    [ordered]@{
        fecha              = $d.time[$i]
        estado             = Describir $d.weather_code[$i]
        min_c              = $d.temperature_2m_min[$i]
        max_c              = $d.temperature_2m_max[$i]
        prob_lluvia_pct    = $d.precipitation_probability_max[$i]
        precipitacion_mm   = $d.precipitation_sum[$i]
        uv_max             = $d.uv_index_max[$i]
        amanecer           = $d.sunrise[$i]
        atardecer          = $d.sunset[$i]
    }
}

[ordered]@{
    ubicacion  = $ubic
    zona       = $w.timezone
    actual     = $actual
    pronostico = @($pronostico)
} | ConvertTo-Json -Depth 5
