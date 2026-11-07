# _legacy_pos/print-order.ps1 - Neutralized legacy spooler
# Hardware printing is handled exclusively by pos-daemon (port 5001) to eliminate duplicate bill printing.
param(
    [string]$OrderJson = "",
    [string]$OrderFile = "",
    [string]$PrinterName = "POS-80"
)

Write-Output "Legacy print spooler disabled: pos-daemon handles all live printing."
exit 0
