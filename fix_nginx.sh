#!/bin/bash
# Add client_max_body_size to nginx config
if ! grep -q "client_max_body_size" /etc/nginx/sites-available/default; then
    sed -i '/location \/ {/i \    client_max_body_size 20M;' /etc/nginx/sites-available/default
    echo "Added client_max_body_size"
else
    echo "client_max_body_size already exists"
fi

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

echo "Nginx updated and reloaded successfully"
