## 🚀 One-Click Setup (Recommended)
The easiest way to start the entire platform is to run the automated setup script:
```powershell
.\setup-medicare.ps1
```
You can run it from anywhere (it anchors itself to the repo root). It handles:

- Downloading/using `minikube` + `kubectl` (stored in `.bin/`)
- Starting Minikube (Docker driver)
- Creating/updating the `medicare-secrets` Secret from your `.env`
- Applying all manifests in `k8s/`
- Waiting for deployments to roll out

### Common options

```powershell
# Reset the cluster and redeploy
.\setup-medicare.ps1 -Reset

# Deploy without building/loading images (only secrets + manifests)
.\setup-medicare.ps1 -SkipBuild

# Build Docker images from services/* and load them into Minikube, then deploy
.\setup-medicare.ps1 -BuildImages

# Use a different env file or namespace
.\setup-medicare.ps1 -EnvFile .env -Namespace default

# Auto mode: detect changes (k8s/, services/, .env) and update accordingly
.\setup-medicare.ps1 -Auto
```

---

## ✅ Commands Cheat Sheet

> [!NOTE]
> **Only the API Gateway is public.** Microservices are internal-only (Docker network / Kubernetes ClusterIP).
> Clients should call the gateway URL and paths under `/api/*`.

### 1) First-time setup (Minikube)

Run these from the repo root:

```powershell
# Make sure kubectl points to Minikube
kubectl config use-context minikube

# One-click: starts Minikube, loads secrets from .env, applies k8s/, waits for rollouts
.\setup-medicare.ps1

# Confirm everything is running
kubectl get pods -n default

# Get the API Gateway URL
minikube service -n default api-gateway --url
```

### 2) After you change something (update Kubernetes)

Pick the section that matches what you changed.

If you just want **one command** that “does the right thing”, use:

```powershell
.\setup-medicare.ps1 -Auto
```

#### A) You changed Kubernetes YAML files in `k8s/`

```powershell
# One command: reapplies manifests, restarts deployments, waits for rollouts
.\setup-medicare.ps1 -SkipBuild
```

#### B) You changed a microservice code (Java) and want Kubernetes to use it

Example for `auth-service` (replace service name as needed):

```powershell
# One command: builds + loads + redeploys ONLY that service
.\setup-medicare.ps1 -BuildImages -Service auth-service
```

#### C) You changed `.env` values (JWT/Mongo URIs) and need to update the cluster secret

Update `medicare-secrets` from your current `.env` (recommended):

```powershell
.\setup-medicare.ps1 -SkipBuild
```

Advanced: if you want to apply without restarting pods (not recommended for env/image changes):

```powershell
.\setup-medicare.ps1 -SkipBuild -NoRestart
```

---

## 🏗️ Manual Cluster Management
If you prefer to run commands manually, use the following:

| Command                                         | Description                                                    |
| :---------------------------------------------- | :------------------------------------------------------------- |
| `minikube status`                               | Check the health of your local cluster.                        |
| `minikube dashboard`                            | Open a web UI to view and manage your resources visually.      |
| `minikube service -n default api-gateway --url` | Get the public URL for your API Gateway.                       |
| `minikube stop`                                 | Stop the cluster (saves resources).                            |
| `minikube start`                                | Start the cluster again (automatically resumes your services). |

---

## 🔍 Monitoring & Debugging

| Command                                        | Description                                                  |
| :--------------------------------------------- | :----------------------------------------------------------- |
| `kubectl get pods -n default`                  | List all running microservices and their status.             |
| `kubectl get services -n default`              | List all service endpoints and ports.                        |
| `kubectl logs -n default -f <pod-name>`        | Stream real-time logs from a specific microservice.          |
| `kubectl describe -n default pod <pod-name>`   | Deep dive into a pod's status (useful if it's not starting). |
| `kubectl exec -n default -it <pod-name> -- sh` | Open a terminal inside a running container.                  |

---

## 🛠️ Development Workflow (Updating Code)

When you make a change to your service code (e.g., in `auth-service`), you have two options.

### Option A (recommended): rerun the setup script

```powershell
.\setup-medicare.ps1 -BuildImages
```

### Option B: manual rebuild + reload + restart

Important: the Kubernetes manifests reference images as `ghcr.io/sadeeshasathsara/medicare/<service>:latest`.
So build/tag your local image with that exact name (or your cluster won’t find it).

1. **Rebuild the Docker Image:**
   ```powershell
   docker build -t ghcr.io/sadeeshasathsara/medicare/auth-service:latest .\services\auth-service
   ```

2. **Load the New Image into Minikube:**
   ```powershell
   minikube image load ghcr.io/sadeeshasathsara/medicare/auth-service:latest
   ```

3. **Restart the Service in Kubernetes:**
   ```powershell
   kubectl rollout restart -n default deployment/auth-service
   kubectl rollout status -n default deployment/auth-service --timeout=180s
   ```

---

## 🏗️ Managing Manifests

| Command                             | Description                                      |
| :---------------------------------- | :----------------------------------------------- |
| `kubectl apply -n default -f k8s/`  | Apply all changes in your `k8s` folder.          |
| `kubectl get secrets -n default`    | List your encrypted environment variables.       |
| `kubectl get configmaps -n default` | List your configuration files (like nginx.conf). |

> [!TIP]
> **Pro Tip:** If you want to see all your pods, services, and deployments in one view, use:
> `kubectl get all -n default`

---

## 🔐 Required Secrets (all services)

All services expect MongoDB URIs via the `medicare-secrets` Kubernetes Secret. Your root `.env` is the source of truth.

Required keys (used by `k8s/*.yaml`):

- `JWT_SECRET`
- `MONGO_URI_AUTH`
- `MONGO_URI_PATIENT`
- `MONGO_URI_DOCTOR`
- `MONGO_URI_APPOINTMENT`
- `MONGO_URI_TELEMEDICINE`
- `MONGO_URI_PAYMENT`
- `MONGO_URI_NOTIFICATION`
- `MONGO_URI_AI`

The one-click script creates/updates `medicare-secrets` automatically from your `.env`.
If you want to do it manually, example (edit values before running):

```powershell
kubectl create secret generic medicare-secrets `
   -n default `
   --from-literal=JWT_SECRET="change_me_to_a_long_random_secret_at_least_32_chars" `
   --from-literal=MONGO_URI_AUTH="mongodb+srv://<user>:<pass>@<cluster>/auth-service" `
   --from-literal=MONGO_URI_PATIENT="mongodb+srv://<user>:<pass>@<cluster>/patient-service" `
   --from-literal=MONGO_URI_DOCTOR="mongodb+srv://<user>:<pass>@<cluster>/doctor-service" `
   --from-literal=MONGO_URI_APPOINTMENT="mongodb+srv://<user>:<pass>@<cluster>/appointment-service" `
   --from-literal=MONGO_URI_TELEMEDICINE="mongodb+srv://<user>:<pass>@<cluster>/telemedicine-service" `
   --from-literal=MONGO_URI_PAYMENT="mongodb+srv://<user>:<pass>@<cluster>/payment-service" `
   --from-literal=MONGO_URI_NOTIFICATION="mongodb+srv://<user>:<pass>@<cluster>/notification-service" `
   --from-literal=MONGO_URI_AI="mongodb+srv://<user>:<pass>@<cluster>/ai-symptom-service" `
   --dry-run=client -o yaml | kubectl apply -f -
```

> [!IMPORTANT]
> Your `.env` contains secrets (JWT + DB URIs). Do not commit it.

Optional (first-time admin): enable bootstrap by editing the env values in [k8s/auth-deployment.yaml](k8s/auth-deployment.yaml) OR by setting env vars on the deployment:

```powershell
kubectl set env -n default deployment/auth-service ADMIN_BOOTSTRAP_ENABLED=true
kubectl rollout restart -n default deployment/auth-service
```

---

## 🚀 CI/CD Integration

- **Image Registry:** Images are automatically built and pushed to `ghcr.io/sadeeshasathsara/medicare/`.
- **Manifest Validation:** Every time you push to the `main` branch, a new job verifies that your Kubernetes manifests in `k8s/` are valid.

### Updating Local Minikube from CI/CD:
If you want to pull the latest images from the GitHub Registry into your local Minikube:
1. Ensure you are logged into GHCR on your local machine.
2. Run: `minikube image load ghcr.io/sadeeshasathsara/medicare/<service-name>:latest`

If you’re not using GHCR pulls (private repo / no imagePullSecret), prefer the local flow:

- Build locally (`docker build -t ghcr.io/...:latest ...`)
- Load into Minikube (`minikube image load ghcr.io/...:latest`)

> [!TIP]
> Your manifests are now "portable." You can take the `k8s/` folder and deploy it to any Kubernetes cluster in the cloud (GKE, EKS, Azure) without changing any code!
