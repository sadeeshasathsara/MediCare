# MediCare Dashboard Frontend

The **Web Client** is the core interactive frontend visualization layer for the MediCare Healthcare Platform. It uses modern frameworks and styling libraries to present dynamic dashboard visualizations, scheduling modules, and patient management components.

## Tech Stack
* Environment: **React** powered by [Vite](https://vitejs.dev/)
* Styling: Native CSS combined with the [Tailwind CSS v4](https://tailwindcss.com/) compiler.
* Routing: **React Router DOM**
* Layout/Icons: Lucide React

## Local Development

Ensure the top-level NGINX API Gateway is running via `docker-compose` first so that API requests can successfully be routed.

If you are running the backend on **Minikube**, make sure the gateway is reachable from your host:
- Recommended (works reliably on Windows + Minikube Docker driver): `kubectl port-forward -n default svc/api-gateway 8080:8080`
- Alternative: `minikube service -n default api-gateway --url` (keep that terminal open)

By default the frontend calls `http://localhost:8080/api`. You can override the gateway base URL via:
- `VITE_API_BASE_URL` (example: `http://localhost:8080/api`)

1. Install project dependencies:
   ```bash
   npm install
   ```
2. Start the hot-reloading development server:
   ```bash
   npm run dev
   ```

## Production Building

To compile the application into a statically deliverable bundle:
```bash
npm run build
```
Once generated correctly into `/dist`, these artifacts can be independently served through a dedicated edge network or CDN.
