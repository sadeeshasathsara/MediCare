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

## MongoDB Setup
Set the MongoDB connection string before starting the service.

- Preferred: `SPRING_DATA_MONGODB_URI`
- Also supported: `MONGO_URI_AI`

## OpenAI Setup
Set your OpenAI key before starting the service.

PowerShell:
```powershell
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_MODEL="gpt-4o-mini"
```

## API Endpoint
When running through the gateway:

`POST /api/ai/symptom-check`

Direct service URL:

`POST http://localhost:3008/symptom-check`

Example request:
```json
{
	"symptoms": "Fever, sore throat, dry cough for 2 days",
	"age": 25,
	"gender": "male",
	"medicalHistory": "No chronic illnesses"
}
```

Example cURL:
```bash
curl -X POST http://localhost:3008/symptom-check \
	-H "Content-Type: application/json" \
	-d '{"symptoms":"Fever and cough for 2 days","age":25}'
```

The response contains AI-generated triage guidance and a medical disclaimer.

*Note: For the full platform, it is recommended to run this within the **Minikube** cluster:*
```bash
kubectl apply -f ../../k8s/ai-symptom-deployment.yaml
kubectl logs -f deployment/ai-symptom-service
```
*(Also available through the global gateway at `http://localhost:8080/api/ai/`)*
