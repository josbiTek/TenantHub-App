#!/bin/bash
# Update system
yum update -y

# Install Docker
yum install -y docker

# Start Docker service
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Pull and run the application
# REPLACE 'YOUR_DOCKERHUB_USERNAME' with your actual Docker Hub username
docker pull josbitek/tenanthub-app-api:latest
docker run -d -p 3000:3000 -e PORT=3000 --name tenanthub-app-api --restart unless-stopped josbitek/tenanthub-app-api:latest
