# Configura tu clave y el destino de Kimi
$ApiKey = "TU_API_KEY_AQUI"
$Url = "https://moonshot.ai"

# Escribe aquí tu pregunta o el código que quieres incluir
$Pregunta = "Hola, dime si me estás escuchando bien y salúdame."

# Preparación de los datos para enviar a Kimi
$Headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type"  = "application/json"
}

$Body = @{
    model = "kimi-k3"
    messages = @(
        @{ role = "user"; content = $Pregunta }
    )
} | ConvertTo-Json -Depth 10

# Envío de la petición y visualización de la respuesta
Write-Host "Pensando..." -ForegroundColor Cyan

# Forzamos la petición de forma segura
$RawResponse = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body ([System.Text.Encoding]::UTF8.GetBytes($Body))

# Convertimos la respuesta para leerla sin errores
$Response = $RawResponse | ConvertTo-Json -Depth 10 | ConvertFrom-Json

Write-Host "`nRespuesta de Kimi:" -ForegroundColor Green
$Response.choices.message.content
