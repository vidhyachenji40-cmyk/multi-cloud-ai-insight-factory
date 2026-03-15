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
        const client = new OpenAIClient(
            process.env.AZURE_OPENAI_ENDPOINT, 
            new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY)
        );
        const result = await client.getChatCompletions("gpt-4o", [
            { role: "system", content: "Summarize this in 2 sentences." },
            { role: "user", content: textToAnalyze.substring(0, 4000) }
        ]);
        aiSummary = result.choices[0].message.content;
        context.log("Stage 1 Success: AI Summary generated.");
    } catch (err) { 
        context.log("AI Error: " + err.message); 
    }

    // --- 2. GOOGLE AUTH ---
    const authConfig = {
        type: "external_account",
        audience: process.env.GCP_AUDIENCE,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: "https://sts.googleapis.com/v1/token",
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${process.env.GCP_SERVICE_ACCOUNT}:generateAccessToken`,
        credential_source: {
            url: `${process.env.IDENTITY_ENDPOINT}?api-version=2019-08-01&resource=api://083e56e0-f653-455b-89af-8e5efad5372c`,
            headers: { "X-IDENTITY-HEADER": process.env.IDENTITY_HEADER },
            format: { type: "json", subject_token_field_name: "access_token" }
        }
    };
    const authClient = ExternalAccountClient.fromJSON(authConfig);

    // --- 3. BIGQUERY ---
    try {
        const bq = new BigQuery({ authClient, projectId: process.env.GCP_PROJECT_ID });
        await bq.dataset('factory_archive').table('ai_insights').insert([{
            source_file: fileName, 
            processed_at: bq.timestamp(new Date()), 
            ai_summary: aiSummary, 
            cloud_nodes: ["Azure", "AWS", "GCP"]
        }]);
        context.log("Stage 3 Success: BigQuery updated.");
    } catch (err) { 
        context.log("BQ Error: " + err.message); 
    }

    const insightPackage = JSON.stringify({ source_file: fileName, summary: aiSummary }, null, 2);
    fs.writeFileSync(insightPath, insightPackage);

    // --- 4. AWS S3 ---
    try {
        const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
        await s3.upload({ 
            Bucket: process.env.AWS_S3_BUCKET_NAME, 
            Key: insightFileName, 
            Body: insightPackage 
        }).promise();
        context.log("Stage 4 Success: Uploaded to S3.");
    } catch (err) { 
        context.log("AWS Error: " + err.message); 
    }

    // --- 5. GCP STORAGE ---
    try {
        const storage = new Storage({ authClient, projectId: process.env.GCP_PROJECT_ID });
        await storage.bucket(process.env.GCP_STORAGE_BUCKET_NAME).upload(insightPath, { 
            destination: insightFileName 
        });
        context.log("Stage 5 Success: Uploaded to GCS.");
    } catch (err) { 
        context.log("GCS Error: " + err.message); 
    }

    // --- 6. GMAIL NOTIFICATION ---
    try {
        const logicAppUrl = process.env.LOGIC_APP_GMAIL_URL;
        if (logicAppUrl) {
            await axios.post(logicAppUrl, {
                filename: fileName,
                sentiment: aiSummary
            });
            context.log("Stage 6 Success: Gmail notification sent.");
        }
    } catch (err) { 
        context.log("Gmail Error: " + err.message); 
    }

    // --- CLEANUP ---
    if (fs.existsSync(insightPath)) {
        fs.unlinkSync(insightPath);
    }
