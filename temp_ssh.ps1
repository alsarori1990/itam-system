# Temporary SSH script to restart PM2
$password = "Bnm773375662@@"
$commands = @(
    "pm2 status",
    "pm2 restart itam-backend",
    "pm2 logs --lines 5"
)

foreach($cmd in $commands) {
    Write-Host "Executing: $cmd"
    # We'll need to do this interactively
}