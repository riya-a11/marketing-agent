const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function postInterviewMessage(message: string, sessionId = "default-session") {
  return fetchApi("/api/v1/interview/message", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

export async function generateContent(params: { brand_profile_id: string; content_type: string; platform: string }) {
  return fetchApi("/api/v1/content/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getCampaigns() {
  return fetchApi("/api/v1/campaigns");
}
