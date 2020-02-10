# concurrent-video

Watch videos together, at the same time, remotely, not in the same place, but at the same place in the video.

## Deployment

1. Get a Google API key, and save it as the contents of server/.key.
2. Start a DigitalOcean [Caddy droplet](https://marketplace.digitalocean.com/apps/caddy), and set up SSH access.
3. Create DNS records pointing to your server (example.com and api.example.com A records, both pointing to the server).
4. Update the server address in the Caddyfile and the `$REMOTE` variable in `deploy.sh`.
5. Run `deploy.sh`.
