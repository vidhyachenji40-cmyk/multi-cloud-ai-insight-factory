# Multi-Cloud AI Insight Factory 🚀

A robust, serverless data pipeline that bridges the "Big Three" cloud providers (Azure, AWS, and GCP) to process data using AI and archive insights across a distributed architecture.

## 🏗️ Architecture
This project demonstrates a seamless integration of multiple cloud ecosystems:

* **Azure (The Core):** * **Functions:** Orchestrates the entire flow using a Node.js serverless trigger.
    * **OpenAI (GPT-4o):** Generates intelligent summaries and sentiment analysis from raw data.
* **Google Cloud Platform (The Data Warehouse):** * **BigQuery:** Stores structured AI insights for long-term analytics.
    * **Cloud Storage (GCS):** Archives a JSON "insight package" for GCP-native workflows.
    * **Workload Identity Federation:** Secure, keyless authentication between Azure and GCP.
* **AWS (The Backup):** * **S3:** Provides a redundant storage layer for cross-cloud durability.
* **Logic Apps (The Communication):** * Triggers an automated **Gmail notification** once the processing factory completes its run.

## 🛠️ Tech Stack
- **Runtime:** Node.js (Azure Functions)
- **AI:** Azure OpenAI Service (GPT-4o)
- **Cloud Providers:** Microsoft Azure, Amazon Web Services (AWS), Google Cloud Platform (GCP)
- **Messaging:** Azure Logic Apps & Gmail API
- **Auth:** OAuth 2.0 / Workload Identity Federation

## 🚀 Environment Setup
To run this project, you will need to configure the following Environment Variables in your Azure Function App:

| Variable | Description |
| :--- | :--- |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API Key |
| `LOGIC_APP_GMAIL_URL` | The HTTP POST URL from your Logic App trigger |
| `IDENTITY_ENDPOINT` | Automatically managed by Azure Managed Identity |
| `AWS_ACCESS_KEY_ID` | Your AWS IAM User Key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS IAM Secret |

## 📝 How it Works
1. A file is uploaded to the Azure Blob Storage trigger.
2. Azure Function extracts the text and sends it to **GPT-4o** for summarization.
3. The summary is inserted into a **Google BigQuery** table via Workload Identity.
4. An "Insight Package" is uploaded simultaneously to **AWS S3** and **GCP GCS**.
5. A **Logic App** is pinged via a secure webhook to send a confirmation email to the user.
