const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { Storage } = require('@google-cloud/storage');
const { BigQuery } = require('@google-cloud/bigquery'); 
const { ExternalAccountClient } = require('google-auth-library');
const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = async function (context, myBlob) {
    const fileName = context.bindingData.name || "data.txt";
    const textToAnalyze = myBlob.toString();
    const insightFileName = `insight-${fileName.split('.')[0]}.json`;
    const insightPath = path.join(os.tmpdir(), insightFileName);

    context.log(`Factory processing: ${fileName}`);

    // --- 1. AI SUMMARY ---
    let aiSummary = "AI Summary failed.";
    try {
        const client = new OpenAIClient("https://vidhya-cleaner-ai.openai.azure.com/", new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY));
        const result = await client.getChatCompletions("gpt-4o", [
            { role: "system", content: "Summarize this in 2 sentences." },
            { role: "user", content: textToAnalyze.substring(0, 4000) }
        ]);
        aiSummary = result.choices[0].message.content;
        context.log("Stage 1 Success.");
    } catch (err) { context.log("AI Error: " + err.message); }

    // --- 2. GOOGLE AUTH ---
    const authConfig = {
        type: "external_account",
        audience: `//iam.googleapis.com/projects/100048857908/locations/global/workloadIdentityPools/azure-pool/providers/azure-provider`,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: "https://sts.googleapis.com/v1/token",
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/azure-to-gcp-connector@vidhya-ai-insights-factory.iam.gserviceaccount.com:generateAccessToken`,
        credential_source: {
            url: `${process.env.IDENTITY_ENDPOINT}?api-version=2019-08-01&resource=api://083e56e0-f653-455b-89af-8e5efad5372c`,
            headers: { "X-IDENTITY-HEADER": process.env.IDENTITY_HEADER },
            format: { type: "json", subject_token_field_name: "access_token" }
        }
    };
    const authClient = ExternalAccountClient.fromJSON(authConfig);

    // --- 3. BIGQUERY ---
    try {
        const bq = new BigQuery({ authClient, projectId: "vidhya-ai-insights-factory" });
        await bq.dataset('factory_archive').table('ai_insights').insert([{
            source_file: fileName, processed_at: bq.timestamp(new Date()), ai_summary: aiSummary, cloud_nodes: ["Azure", "AWS", "GCP"]
        }]);
        context.log("Stage 3 Success.");
    } catch (err) { context.log("BQ Error: " + err.message); }

    const insightPackage = JSON.stringify({ source_file: fileName, summary: aiSummary }, null, 2);
    fs.writeFileSync(insightPath, insightPackage);

    // --- 4. AWS S3 ---
    try {
        const s3 = new AWS.S3();
        await s3.upload({ Bucket: "vidhya-ai-factory-output", Key: insightFileName, Body: insightPackage }).promise();
        context.log("Stage 4 Success.");
    } catch (err) { context.log("AWS Error: " + err.message); }

    // --- 5. GCP GCS ---
    try {
        const storage = new Storage({ authClient, projectId: "vidhya-ai-insights-factory" });
        await storage.bucket("vidhya-factory-output-gcp").upload(insightPath, { destination: insightFileName });
        context.log("Stage 5 Success.");
    } catch (err) { context.log("GCS Error: " + err.message); }

// --- 6. GMAIL NOTIFICATION ---
    try {
        // Using the EXACT name you gave in Environment Variables
        const logicAppUrl = process.env.LOGIC_APP_GMAIL_URL_TEST;

        context.log(`Diagnostic: Variable found? ${!!logicAppUrl}`);

        if (logicAppUrl) {
            await axios.post(logicAppUrl, {
                filename: fileName,
                sentiment: aiSummary
            });
            context.log("Stage 6 Success: Gmail notification sent.");
        } else {
            context.log("Gmail Error: LOGIC_APP_GMAIL_URL_TEST is missing from Azure Settings.");
        }
    } catch (err) {
        context.log("Gmail Notification Error: " + err.message);
    }

    if (fs.existsSync(insightPath)) fs.unlinkSync(insightPath);
};
