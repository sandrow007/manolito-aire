# Configura tu clave y el destino de Kimi
$ApiKey = "sk-MJ2qYO2fTtEA4Ny1pxojUIOfIdf3yo5aslEBBeJn17TNo3Pb"
$Url = "https://moonshot.ai"

# Escribe aquí tu pregunta o el código que quieres incluir
$Pregunta = "Quiero que revises este código y me digas si tiene fallos: [Pega aquí tu código]"

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
$Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body ([System.Text.Encoding]::UTF8.GetBytes($Body))
Write-Host "`nRespuesta de Kimi:" -ForegroundColor Green
$Response.choices[0].message.content