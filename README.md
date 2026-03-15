# Multi-Cloud AI Insight Factory 🚀

A robust, serverless data pipeline that orchestrates a workflow across the "Big Three" cloud providers (**Azure, AWS, and GCP**). This project leverages AI to extract insights from raw data and archives them across a distributed cloud architecture.

---

## 🏗️ Architecture

This project demonstrates a seamless integration of multiple cloud ecosystems:

### Azure (The Core)
* **Functions:** Orchestrates the entire flow using a Node.js serverless trigger.
* **OpenAI (GPT-4o):** Generates intelligent summaries and sentiment analysis from raw data.

### Google Cloud Platform (The Data Warehouse)
* **BigQuery:** Stores structured AI insights for long-term analytics.
* **Cloud Storage (GCS):** Archives a JSON "insight package" for GCP-native workflows.
* **Workload Identity Federation:** Secure, keyless authentication between Azure and GCP.

### AWS (The Backup)
* **S3:** Provides a redundant storage layer for cross-cloud durability.

### Logic Apps (The Communication)
* **Gmail Integration:** Triggers an automated notification once the processing factory completes its run.

---

## 📊 Analytics & Dashboards

The data processed by the factory is visualized for business intelligence using **Looker Studio**:

* **Real-time Monitoring:** Tracking processing volume and file counts.
* **AI Sentiment Trends:** Visualizing the core insights extracted by GPT-4o.
* **Cross-Cloud Tracking:** Verifying successful uploads across Azure, AWS, and GCP.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (Azure Functions)
* **AI:** Azure OpenAI Service (GPT-4o)
* **Cloud Providers:** Microsoft Azure, Amazon Web Services (AWS), Google Cloud Platform (GCP)
* **Messaging:** Azure Logic Apps & Gmail API
* **Auth:** OAuth 2.0 / Workload Identity Federation

---

## 🚀 Environment Setup

To replicate this environment, configure the following Application Settings in your Azure Function:

| Variable | Description |
| :--- | :--- |
| `AZURE_OPENAI_API_KEY` | Secret key for Azure OpenAI Service |
| `LOGIC_APP_GMAIL_URL` | The HTTP POST URL from your Logic App trigger |
| `AWS_ACCESS_KEY_ID` | IAM User Access Key for S3 access |
| `AWS_SECRET_ACCESS_KEY` | IAM User Secret Key |
| `GCP_PROJECT_ID` | Your Google Cloud Project ID |
