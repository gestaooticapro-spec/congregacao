const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Função simples para carregar .env.local
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('❌ Arquivo .env.local não encontrado!');
            return;
        }
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
        console.log('✅ Variáveis de ambiente carregadas.');
    } catch (e) {
        console.error('❌ Erro ao ler .env.local:', e);
    }
}

async function testGemini() {
    loadEnv();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
        return;
    }

    console.log(`🔑 Testando chave: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('🔍 Testando modelos solicitados...');

    const modelsToTry = [
        'gemini-2.5-pro', // Solicitado pelo usuário
        'gemini-2.0-flash-exp'
    ];

    for (const modelName of modelsToTry) {
        console.log(`\n🤖 Tentando modelo: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Responda com "OK"');
            const response = await result.response;
            console.log(`✅ ${modelName}: DISPONÍVEL (Resposta: ${response.text().trim()})`);
        } catch (e) {
            let errorMsg = e.message;
            if (errorMsg.includes('[404]')) errorMsg = '404 Not Found (Modelo não existe ou sem acesso)';
            else if (errorMsg.includes('[429]')) errorMsg = '429 Quota Exceeded (Limite atingido)';
            else if (errorMsg.includes('[403]')) errorMsg = '403 Forbidden (Chave inválida ou sem permissão)';

            console.log(`❌ ${modelName}: ERRO - ${errorMsg}`);
        }
    }
}

testGemini();
