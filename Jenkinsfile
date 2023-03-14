pipeline  {
  agent none
  tools{
    nodejs 'nodejs18'
  }
  stages{
    stage('SCM') {
      steps{
    checkout scm
      }
  }
    stage('SonarQube Analysis') {
    steps{
script {
          def scannerHome = tool 'SonarScanner';
          withSonarQubeEnv('sonarqube') {
            sh "${tool("sonarscan ")}/bin/sonar-scanner"
          }
        }
    }
  }
  }

  
}
