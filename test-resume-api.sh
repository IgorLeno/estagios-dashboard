#!/bin/bash

curl -X POST http://localhost:3000/api/ai/generate-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Estágio em Engenharia Química na Saipem. Requisitos: Engenharia Química, conhecimento em processos industriais, Python, análise de dados. Responsabilidades: Suporte em projetos de QHSE, monitoramento de indicadores, análise de dados.",
    "language": "pt"
  }' | jq '.metadata'
