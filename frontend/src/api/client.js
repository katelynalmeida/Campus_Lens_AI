// API Service Client for CampusLens AI

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001';

export const ISSUE_CATEGORIES = [
  "Electrical issue or broken light",
  "Water leakage or plumbing",
  "Damaged classroom furniture",
  "Garbage or litter",
  "Damaged wall, ceiling, door, or window",
  "Broken fan or campus equipment",
  "Washroom sanitation or fixture problem",
  "Other or uncertain issue"
];

export const PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const STATUSES = ["Pending", "In Progress", "Resolved"];

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // Keep default error text
    }
    throw new Error(errorDetail);
  }
  return await response.json();
}

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function checkBackendHealth() {
  const res = await fetch(`${BACKEND_URL}/api/health`);
  return handleResponse(res);
}

export async function fetchVisionStatus() {
  const res = await fetch(`${BACKEND_URL}/api/vision-status`);
  return handleResponse(res);
}

export async function fetchDashboardData() {
  const res = await fetch(`${BACKEND_URL}/api/dashboard`);
  return handleResponse(res);
}

export async function fetchIssues({ status, category, priority, search, sortBy } = {}) {
  const query = new URLSearchParams();
  if (status && status !== 'All') query.append('status', status);
  if (category && category !== 'All') query.append('category', category);
  if (priority && priority !== 'All') query.append('priority', priority);
  if (search) query.append('search', search);
  if (sortBy) query.append('sort_by', sortBy);

  const url = `${BACKEND_URL}/api/issues${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function fetchIssueById(id) {
  const res = await fetch(`${BACKEND_URL}/api/issues/${id}`);
  return handleResponse(res);
}

export async function createIssue(issueData) {
  const res = await fetch(`${BACKEND_URL}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issueData)
  });
  return handleResponse(res);
}

export async function updateIssue(id, updateData) {
  const res = await fetch(`${BACKEND_URL}/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  return handleResponse(res);
}

export async function detectImageWithAI(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BACKEND_URL}/api/detect-image`, {
    method: 'POST',
    body: formData
  });
  return handleResponse(res);
}

export async function askAssistant(message) {
  const res = await fetch(`${BACKEND_URL}/api/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  return handleResponse(res);
}

export async function fetchFacilities() {
  const res = await fetch(`${BACKEND_URL}/api/facilities`);
  return handleResponse(res);
}

export async function fetchFacilityById(id) {
  const res = await fetch(`${BACKEND_URL}/api/facilities/${id}`);
  return handleResponse(res);
}

export async function resetDemoData() {
  const res = await fetch(`${BACKEND_URL}/api/reset-demo-data`, {
    method: 'POST'
  });
  return handleResponse(res);
}
