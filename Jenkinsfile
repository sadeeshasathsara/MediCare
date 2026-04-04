pipeline {
    agent any

    environment {
        REGISTRY = 'ghcr.io/sadeeshasathsara/medicare'
        KUBECONFIG_CREDENTIAL = 'kubeconfig'
    }

    stages {
        stage('Detect Changes') {
            steps {
                script {
                    def changedFiles = sh(script: "git diff --name-only HEAD~1 HEAD", returnStdout: true).trim()
                    echo "Changed files: ${changedFiles}"

                    env.BUILD_AUTH = changedFiles.contains('services/auth-service') ? 'true' : 'false'
                    env.BUILD_PATIENT = changedFiles.contains('services/patient-service') ? 'true' : 'false'
                    env.BUILD_DOCTOR = changedFiles.contains('services/doctor-service') ? 'true' : 'false'
                    env.BUILD_APPOINTMENT = changedFiles.contains('services/appointment-service') ? 'true' : 'false'
                    env.BUILD_TELEMEDICINE = changedFiles.contains('services/telemedicine-service') ? 'true' : 'false'
                    env.BUILD_PAYMENT = changedFiles.contains('services/payment-service') ? 'true' : 'false'
                    env.BUILD_NOTIFICATION = changedFiles.contains('services/notification-service') ? 'true' : 'false'
                    env.BUILD_AI = changedFiles.contains('services/ai-symptom-service') ? 'true' : 'false'
                    env.BUILD_FRONTEND = changedFiles.contains('web-client') ? 'true' : 'false'
                }
            }
        }

        stage('Build & Push Services') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-credentials', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_TOKEN')]) {
                    script {
                        sh "echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USER --password-stdin"

                        def services = [
                            [name: 'auth-service', env: 'BUILD_AUTH'],
                            [name: 'patient-service', env: 'BUILD_PATIENT'],
                            [name: 'doctor-service', env: 'BUILD_DOCTOR'],
                            [name: 'appointment-service', env: 'BUILD_APPOINTMENT'],
                            [name: 'telemedicine-service', env: 'BUILD_TELEMEDICINE'],
                            [name: 'payment-service', env: 'BUILD_PAYMENT'],
                            [name: 'notification-service', env: 'BUILD_NOTIFICATION'],
                            [name: 'ai-symptom-service', env: 'BUILD_AI']
                        ]

                        services.each { svc ->
                            if (env."${svc.env}" == 'true') {
                                echo "Building ${svc.name}..."
                                sh """
                                    docker build -t ${REGISTRY}/${svc.name}:latest services/${svc.name}
                                    docker push ${REGISTRY}/${svc.name}:latest
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Build Frontend') {
            when { expression { env.BUILD_FRONTEND == 'true' } }
            steps {
                sh """
                    cd web-client
                    npm install
                    npm run build
                    sudo cp -r dist/* /var/www/medicarelk/
                """
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    script {
                        def services = [
                            [name: 'auth-service', env: 'BUILD_AUTH'],
                            [name: 'patient-service', env: 'BUILD_PATIENT'],
                            [name: 'doctor-service', env: 'BUILD_DOCTOR'],
                            [name: 'appointment-service', env: 'BUILD_APPOINTMENT'],
                            [name: 'telemedicine-service', env: 'BUILD_TELEMEDICINE'],
                            [name: 'payment-service', env: 'BUILD_PAYMENT'],
                            [name: 'notification-service', env: 'BUILD_NOTIFICATION'],
                            [name: 'ai-symptom-service', env: 'BUILD_AI']
                        ]

                        services.each { svc ->
                            if (env."${svc.env}" == 'true') {
                                sh "kubectl rollout restart deployment/${svc.name}"
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        success { echo 'Pipeline completed successfully!' }
        failure { echo 'Pipeline failed!' }
    }
}
