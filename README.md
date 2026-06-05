# Invoice Reader

A React + Vite web UI for the [Invoice Extractor API][backend]. Drag in an invoice,
get the extracted data as a clean table, and export it as JSON or CSV.

**Live demo:** [your-demo-url] · **Backend repo:** [link-to-backend-repo]

## Features

- Drag-and-drop or click to upload an invoice (image or PDF)
- Calls the extraction API and renders vendor, date, line items, and totals
- Download the result as JSON or CSV
- Clear loading and error states; layout collapses cleanly on mobile

## Stack

- **React** + **Vite**
- Plain CSS — no UI framework

## Run locally

This is the front end only — it needs the [backend API][backend] running, either
locally or deployed.

```bash
git clone [this-repo]
cd [repo-folder]
npm install
echo "VITE_API_URL=http://127.0.0.1:8000" > .env   # point at your backend
npm run dev
```

## Configuration

| Variable       | Description                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the Invoice Extractor API. Baked in at build time — set it before building, and redeploy after any change. |

## Deployment

Deployed on Vercel. Set `VITE_API_URL` in the project's environment variables to the
deployed backend URL.

[backend]: [link-to-backend-repo]