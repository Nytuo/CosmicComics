node {
  agent any
  stages{
    
  stage('SCM') {
    checkout scm
  }
  stage('SonarQube Analysis') {
    steps{
      nodejs(nodeJSInstallationName: 'nodejs18'){
        sh "node -v"
        sh "npm install"
        withSonarQubeEnv('SonarScanner'){
        sh "npm install sonar-scanner"
          sh "npm run sonar"
        }
      }
    }
  }
  }
}
