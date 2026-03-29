## 🚀 One-Click Setup (Recommended)
The easiest way to start the entire platform is to run the automated setup script from the root of the project:
```powershell
.\setup-medicare.ps1
```
This script handles dependency checks, binary downloads, environment configuration, and cluster initialization in one go.

---

## 🏗️ Manual Cluster Management
If you prefer to run commands manually, use the following:

| Command | Description |
| :--- | :--- |
| `minikube status` | Check the health of your local cluster. |
| `minikube dashboard` | Open a web UI to view and manage your resources visually. |
| `minikube service api-gateway --url` | Get the public URL for your API Gateway. |
| `minikube stop` | Stop the cluster (saves resources). |
| `minikube start` | Start the cluster again (automatically resumes your services). |

---

## 🔍 Monitoring & Debugging

| Command | Description |
| :--- | :--- |
| `kubectl get pods` | List all running microservices and their status. |
| `kubectl get services` | List all service endpoints and ports. |
| `kubectl logs -f <pod-name>` | Stream real-time logs from a specific microservice. |
| `kubectl describe pod <pod-name>` | Deep dive into a pod's status (useful if it's not starting). |
| `kubectl exec -it <pod-name> -- sh` | Open a terminal inside a running container. |

---

## 🛠️ Development Workflow (Updating Code)

When you make a change to your service code (e.g., in `auth-service`), follow these steps:

1. **Rebuild the Docker Image:**
   ```bash
   docker build -t auth-service:latest ./services/auth-service
   ```

2. **Load the New Image into Minikube:**
   ```bash
   .\minikube.exe image load auth-service:latest
   ```

3. **Restart the Service in Kubernetes:**
   ```bash
   kubectl rollout restart deployment auth-service
   ```

---

## 🏗️ Managing Manifests

| Command | Description |
| :--- | :--- |
| `kubectl apply -f k8s/` | Apply all changes in your `k8s` folder. |
| `kubectl get secrets` | List your encrypted environment variables. |
| `kubectl get configmaps` | List your configuration files (like nginx.conf). |

> [!TIP]
> **Pro Tip:** If you want to see all your pods, services, and deployments in one view, use:
> `kubectl get all`

---

## 🚀 CI/CD Integration

Your project is now fully integrated with **GitHub Actions**.

- **Image Registry:** Images are automatically built and pushed to `ghcr.io/sadeeshasathsara/medicare/`.
- **Manifest Validation:** Every time you push to the `main` branch, a new job verifies that your Kubernetes manifests in `k8s/` are valid.

### Updating Local Minikube from CI/CD:
If you want to pull the latest images from the GitHub Registry into your local Minikube:
1. Ensure you are logged into GHCR on your local machine.
2. Run: `.\minikube.exe image load ghcr.io/sadeeshasathsara/medicare/<service-name>:latest`

> [!TIP]
> Your manifests are now "portable." You can take the `k8s/` folder and deploy it to any Kubernetes cluster in the cloud (GKE, EKS, Azure) without changing any code!
