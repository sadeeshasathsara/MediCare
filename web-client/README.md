# MediCare Dashboard Frontend

The **Web Client** is the core interactive frontend visualization layer for the MediCare Healthcare Platform. It uses modern frameworks and styling libraries to present dynamic dashboard visualizations, scheduling modules, and patient management components.

## Tech Stack
* Environment: **React** powered by [Vite](https://vitejs.dev/)
* Styling: Native CSS combined with the [Tailwind CSS v4](https://tailwindcss.com/) compiler.
* Routing: **React Router DOM**
* Layout/Icons: Lucide React

## Local Development

Ensure the top-level NGINX API Gateway is running via `docker-compose` first so that API requests can successfully be routed.

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
