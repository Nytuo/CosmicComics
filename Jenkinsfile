node {
  stage('SCM') {
    checkout scm
  }
  stage('SonarQube Analysis') {
    steps{
      nodejs(nodeJSInstallationName: 'nodejs'){
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
