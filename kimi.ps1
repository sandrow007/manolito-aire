# Configura tu clave y el destino de Kimi
$ApiKey = "TU_API_KEY_AQUI"
$Url = "https://moonshot.ai"

# Escribe aquí tu pregunta o el código que quieres incluir
$Pregunta = "Hola Kimi, salúdame y dime si me escuchas."

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

Write-Host "Pensando..." -ForegroundColor Cyan

# Hacemos la petición y la guardamos como texto limpio de forma directa
$RawResponse = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body ([System.Text.Encoding]::UTF8.GetBytes($Body))

Write-Host "`nRespuesta de Kimi:" -ForegroundColor Green

# Esta línea va a buscar el texto directamente dentro de la respuesta
Write-Host $RawResponse.choices.message.content
