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

export async function login(credentials: any) {
  return fetchApi("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function signup(credentials: any) {
  return fetchApi("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function generateVideoStoryboard(params: {
  selected_post: string;
  brand_memory?: any;
  preferences?: {
    aspect_ratio?: string;
    target_duration?: string;
    visual_style?: string;
    voice_tone?: string;
  };
}) {
  return fetchApi("/api/v1/video/storyboard", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function renderVideo(params: {
  campaign_id?: string;
  provider_name: string;
  storyboard: any;
}) {
  return fetchApi("/api/v1/video/render", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
