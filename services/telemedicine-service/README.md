# Telemedicine Service

The remote consultation microservice for the MediCare platform. 

## Responsibility
Coordinates video link sessions, webRTC signaling token dispensation, and remote prescription attachments during digital-first appointments.

## Stack
- Java 17
- Spring Boot 3
- Lombok

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```
*Note: For the full platform, it is recommended to run this within the **Minikube** cluster:*
```bash
kubectl apply -f ../../k8s/telemedicine-deployment.yaml
kubectl logs -f deployment/telemedicine-service
```
*(Also available through the global gateway at `http://localhost:8080/api/telemedicine/`)*
