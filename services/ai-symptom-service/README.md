# AI Symptom Service

The algorithmic diagnostic microservice for the MediCare platform. 

## Responsibility
Takes parsed natural-language inputs from patients querying potential conditions. Provides a statistically-relevant triage analysis layer matching symptoms against medical databases.

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
kubectl apply -f ../../k8s/ai-symptom-deployment.yaml
kubectl logs -f deployment/ai-symptom-service
```
*(Also available through the global gateway at `http://localhost:8080/api/ai/`)*
