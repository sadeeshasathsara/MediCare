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
        success {
            emailext(
                to: 'sadeeshasathsara99@gmail.com, ericdevon2003@gmail.com, chathushuni@gmail.com, nipun20011216@gmail.com',
                subject: "[SUCCESS] Medicare Pipeline #${env.BUILD_NUMBER}",
                mimeType: 'text/html',
                body: """
                    <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #28a745;">✅ Build Successful</h2>
                        <table style="border-collapse: collapse; width: 100%;">
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Job</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${env.JOB_NAME}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Build</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">#${env.BUILD_NUMBER}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Duration</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${currentBuild.durationString}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Branch</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${env.GIT_BRANCH}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Commit</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${env.GIT_COMMIT?.take(7)}</td>
                            </tr>
                        </table>
                        <br>
                        <a href="${env.BUILD_URL}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Build</a>
                    </body>
                    </html>
                """
            )
        }
        failure {
            emailext(
                to: 'sadeeshasathsara99@gmail.com, ericdevon2003@gmail.com, chathushuni@gmail.com, nipun20011216@gmail.com',
                subject: "[FAILED] Medicare Pipeline #${env.BUILD_NUMBER}",
                mimeType: 'text/html',
                body: """
                    <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #dc3545;">❌ Build Failed</h2>
                        <table style="border-collapse: collapse; width: 100%;">
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Job</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${env.JOB_NAME}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Build</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">#${env.BUILD_NUMBER}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Duration</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${currentBuild.durationString}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Branch</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${env.GIT_BRANCH}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><b>Commit</b></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${env.GIT_COMMIT?.take(7)}</td>
                            </tr>
                        </table>
                        <br>
                        <a href="${env.BUILD_URL}console" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Console Log</a>
                    </body>
                    </html>
                """
            )
        }
    }
}