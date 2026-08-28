// ==========================================================================
// MediaHub — Social Media Management Platform Logic
// Supports live Flask API + Automatic Local Sandbox fallback
// ==========================================================================

const API_BASE = "http://localhost:5000/api";

// State
let accounts = [];
let posts = [];
let currentStatusFilter = "";
let currentSearchQuery = "";
let isSandboxMode = false;

// Platform configuration & limits
const PLATFORM_CONFIG = {
  "Twitter/X": { limit: 280, icon: "twitter", color: "#1d9bf0" },
  "Instagram": { limit: 2200, icon: "instagram", color: "#e1306c" },
  "Facebook": { limit: 5000, icon: "facebook", color: "#1877f2" },
  "LinkedIn": { limit: 3000, icon: "linkedin", color: "#0a66c2" },
  "YouTube": { limit: 5000, icon: "youtube", color: "#ff0000" },
};

// Initial sample data for sandbox mode if empty
const INITIAL_SANDBOX_ACCOUNTS = [
  { id: 1, platform: "Twitter/X", username: "TechInnovator", created_at: new Date().toISOString() },
  { id: 2, platform: "LinkedIn", username: "AlexCarter_Exec", created_at: new Date().toISOString() },
  { id: 3, platform: "Instagram", username: "DesignSphere", created_at: new Date().toISOString() },
];

const INITIAL_SANDBOX_POSTS = [
  {
    id: 1,
    account_id: 1,
    username: "TechInnovator",
    platform: "Twitter/X",
    content: "🚀 Excited to announce our next-gen social operations suite! Smarter analytics, cleaner previews, and frictionless scheduling. #launch #tech #growth",
    scheduled_time: new Date(Date.now() + 3600000 * 4).toISOString(),
    status: "scheduled",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    account_id: 2,
    username: "AlexCarter_Exec",
    platform: "LinkedIn",
    content: "Building high-performance creative workflows is all about removing friction. What tools have leveled up your team's productivity this quarter? #leadership #marketing",
    scheduled_time: null,
    status: "draft",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 3,
    account_id: 3,
    username: "DesignSphere",
    platform: "Instagram",
    content: "Behind the scenes of our brand overhaul. Minimalist layouts, accessible contrast ratios, and thoughtful micro-interactions. ✨ #design #updates",
    scheduled_time: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: "published",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

// ---------- Platform SVG Icon Helper ----------

function getPlatformIconSVG(platform, size = 16) {
  switch (platform) {
    case "Twitter/X":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    case "Instagram":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`;
    case "Facebook":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`;
    case "LinkedIn":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`;
    case "YouTube":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
}

function getPlatformClass(platform) {
  if (!platform) return "twitter";
  const p = platform.toLowerCase();
  if (p.includes("twitter") || p.includes("x")) return "twitter";
  if (p.includes("instagram")) return "instagram";
  if (p.includes("facebook")) return "facebook";
  if (p.includes("linkedin")) return "linkedin";
  if (p.includes("youtube")) return "youtube";
  return "twitter";
}

// ---------- Toast Notification System ----------

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ---------- Confirmation Modal System ----------

function showConfirmModal(title, message, confirmBtnText = "Delete") {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const msgEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmBtnText;

    modal.classList.add("active");

    const cleanup = () => {
      modal.classList.remove("active");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

// ---------- API Helpers (With Sandbox Fallback) ----------

async function checkApiConnection() {
  try {
    const res = await fetch(`${API_BASE}/summary`, { signal: AbortSignal.timeout(1800) });
    if (res.ok) {
      isSandboxMode = false;
      updateConnectionStatus(true);
      return true;
    }
  } catch (err) {
    // API is offline -> switch to sandbox
  }
  isSandboxMode = true;
  updateConnectionStatus(false);
  return false;
}

function updateConnectionStatus(isLive) {
  const pill = document.getElementById("connection-pill");
  const text = document.getElementById("connection-status-text");
  if (!pill || !text) return;

  if (isLive) {
    pill.classList.remove("offline");
    pill.title = "Backend API connected: http://localhost:5000";
    text.textContent = "Live Backend";
  } else {
    pill.classList.add("offline");
    pill.title = "Backend offline — Interactive Sandbox Active";
    text.textContent = "Demo Sandbox";
  }
}

async function api(path, options = {}) {
  if (isSandboxMode) {
    return handleSandboxApi(path, options);
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    if (!isSandboxMode && err.name === "TypeError") {
      console.warn("Backend unavailable, activating local sandbox mode.");
      isSandboxMode = true;
      updateConnectionStatus(false);
      return handleSandboxApi(path, options);
    }
    throw err;
  }
}

// Sandbox local storage handler
function getStoredSandboxData() {
  const storedAccounts = localStorage.getItem("mediahub_sandbox_accounts");
  const storedPosts = localStorage.getItem("mediahub_sandbox_posts");

  let localAccounts = storedAccounts ? JSON.parse(storedAccounts) : [...INITIAL_SANDBOX_ACCOUNTS];
  let localPosts = storedPosts ? JSON.parse(storedPosts) : [...INITIAL_SANDBOX_POSTS];
  return { localAccounts, localPosts };
}

function saveSandboxData(localAccounts, localPosts) {
  localStorage.setItem("mediahub_sandbox_accounts", JSON.stringify(localAccounts));
  localStorage.setItem("mediahub_sandbox_posts", JSON.stringify(localPosts));
}

function handleSandboxApi(path, options) {
  let { localAccounts, localPosts } = getStoredSandboxData();
  const method = (options.method || "GET").toUpperCase();

  // Accounts
  if (path === "/accounts" && method === "GET") {
    return localAccounts;
  }
  if (path === "/accounts" && method === "POST") {
    const data = JSON.parse(options.body || "{}");
    const newAcc = {
      id: Date.now(),
      platform: data.platform,
      username: data.username,
      created_at: new Date().toISOString(),
    };
    localAccounts.unshift(newAcc);
    saveSandboxData(localAccounts, localPosts);
    return newAcc;
  }
  if (path.startsWith("/accounts/") && method === "DELETE") {
    const id = parseInt(path.split("/")[2], 10);
    localAccounts = localAccounts.filter((a) => a.id !== id);
    localPosts = localPosts.filter((p) => p.account_id !== id);
    saveSandboxData(localAccounts, localPosts);
    return null;
  }

  // Posts
  if (path.startsWith("/posts") && method === "GET") {
    const urlParams = new URLSearchParams(path.split("?")[1] || "");
    const status = urlParams.get("status");
    let result = [...localPosts];
    if (status) {
      result = result.filter((p) => p.status === status);
    }
    result.sort((a, b) => new Date(a.scheduled_time || a.created_at) - new Date(b.scheduled_time || b.created_at));
    return result;
  }
  if (path === "/posts" && method === "POST") {
    const data = JSON.parse(options.body || "{}");
    const acc = localAccounts.find((a) => a.id == data.account_id) || localAccounts[0];
    const newPost = {
      id: Date.now(),
      account_id: data.account_id,
      platform: acc ? acc.platform : "Twitter/X",
      username: acc ? acc.username : "User",
      content: data.content,
      scheduled_time: data.scheduled_time,
      status: data.status || "draft",
      created_at: new Date().toISOString(),
    };
    localPosts.unshift(newPost);
    saveSandboxData(localAccounts, localPosts);
    return newPost;
  }
  if (path.includes("/publish") && method === "POST") {
    const id = parseInt(path.split("/")[2], 10);
    const post = localPosts.find((p) => p.id === id);
    if (post) {
      post.status = "published";
      saveSandboxData(localAccounts, localPosts);
      return post;
    }
  }
  if (path.startsWith("/posts/") && method === "DELETE") {
    const id = parseInt(path.split("/")[2], 10);
    localPosts = localPosts.filter((p) => p.id !== id);
    saveSandboxData(localAccounts, localPosts);
    return null;
  }

  // Summary
  if (path === "/summary") {
    const draft = localPosts.filter((p) => p.status === "draft").length;
    const scheduled = localPosts.filter((p) => p.status === "scheduled").length;
    const published = localPosts.filter((p) => p.status === "published").length;
    return { accounts: localAccounts.length, draft, scheduled, published };
  }

  return {};
}

// ---------- Formatting Helpers ----------

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return `Today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPostContentHtml(text) {
  if (!text) return "";
  // Escape HTML
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight Hashtags and Mentions
  return escaped
    .replace(/#([\w\u0590-\u05ff]+)/g, '<span class="hashtag">#$1</span>')
    .replace(/@([\w_]+)/g, '<span class="hashtag">@$1</span>');
}

// ---------- Accounts Management ----------

async function loadAccounts() {
  accounts = await api("/accounts");
  renderAccountList();
  renderAccountSelect();
  updateAccountBadge();
}

function updateAccountBadge() {
  const badge = document.getElementById("account-count-badge");
  if (badge) {
    badge.textContent = `${accounts.length} connected`;
  }
}

function renderAccountList() {
  const list = document.getElementById("account-list");
  if (!list) return;
  list.innerHTML = "";

  if (accounts.length === 0) {
    list.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="empty-title">No Channels Connected</div>
        <div class="empty-desc">Connect your Twitter/X, Instagram, or LinkedIn accounts to start publishing.</div>
      </div>
    `;
    return;
  }

  accounts.forEach((acc) => {
    const li = document.createElement("li");
    li.className = "account-item";
    const platformClass = getPlatformClass(acc.platform);
    const platformIcon = getPlatformIconSVG(acc.platform, 18);

    li.innerHTML = `
      <div class="account-profile">
        <div class="platform-avatar ${platformClass}" title="${acc.platform}">
          ${platformIcon}
        </div>
        <div class="account-meta">
          <div class="account-username">@${acc.username.replace(/^@/, '')}</div>
          <div class="account-platform-label">
            <span>${acc.platform}</span>
          </div>
        </div>
      </div>
      <button class="btn btn-danger-ghost" data-remove-account="${acc.id}" title="Disconnect account">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    list.appendChild(li);
  });
}

function renderAccountSelect() {
  const select = document.getElementById("post-account");
  if (!select) return;
  const current = select.value;

  select.innerHTML = `<option value="" disabled selected>Choose a connected account...</option>`;
  accounts.forEach((acc) => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = `@${acc.username.replace(/^@/, '')} — ${acc.platform}`;
    select.appendChild(opt);
  });

  if (current && accounts.some((a) => a.id == current)) {
    select.value = current;
  } else if (accounts.length > 0) {
    select.value = accounts[0].id;
  }
  updateLivePreview();
}

// Add Account Form
document.getElementById("account-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const platform = document.getElementById("account-platform").value;
  const rawUsername = document.getElementById("account-username").value.trim();
  const username = rawUsername.replace(/^@/, "");

  if (!platform || !username) {
    showToast("Please fill in both platform and username", "error");
    return;
  }

  try {
    await api("/accounts", {
      method: "POST",
      body: JSON.stringify({ platform, username }),
    });
    e.target.reset();
    showToast(`Successfully connected @${username} on ${platform}`, "success");
    await loadAccounts();
    await loadSummary();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Remove Account Event Delegation
document.getElementById("account-list")?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-remove-account]");
  if (!btn) return;
  const id = btn.getAttribute("data-remove-account");
  if (!id) return;

  const confirmed = await showConfirmModal(
    "Disconnect Account?",
    "Are you sure you want to remove this channel? Associated scheduled posts will also be deleted."
  );
  if (!confirmed) return;

  try {
    await api(`/accounts/${id}`, { method: "DELETE" });
    showToast("Account removed successfully", "info");
    await loadAccounts();
    await loadPosts();
    await loadSummary();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---------- Posts Management & Feed ----------

async function loadPosts() {
  const query = currentStatusFilter ? `?status=${currentStatusFilter}` : "";
  posts = await api(`/posts${query}`);
  renderPostList(posts);
  updateTabCounts();
}

function updateTabCounts() {
  const allPosts = posts; // or fetch all count
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  const cAll = document.getElementById("count-all");
  const cDraft = document.getElementById("count-draft");
  const cSched = document.getElementById("count-scheduled");
  const cPub = document.getElementById("count-published");

  if (cAll) cAll.textContent = allPosts.length;
  if (cDraft) cDraft.textContent = draftCount;
  if (cSched) cSched.textContent = scheduledCount;
  if (cPub) cPub.textContent = publishedCount;
}

function renderPostList(itemsToRender) {
  const list = document.getElementById("post-list");
  if (!list) return;
  list.innerHTML = "";

  // Apply search query filter if active
  let filtered = itemsToRender;
  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.platform && p.platform.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="empty-title">No Posts Found</div>
        <div class="empty-desc">
          ${currentSearchQuery ? `No posts matched your query "${currentSearchQuery}".` : `No posts in this category yet. Compose your first update above!`}
        </div>
      </div>
    `;
    return;
  }

  filtered.forEach((post) => {
    const li = document.createElement("li");
    li.className = "post-card";
    const platformClass = getPlatformClass(post.platform);
    const platformIcon = getPlatformIconSVG(post.platform, 14);

    let timeBadgeText = "";
    if (post.status === "scheduled") {
      timeBadgeText = `Scheduled: ${formatDate(post.scheduled_time)}`;
    } else if (post.status === "published") {
      timeBadgeText = `Published: ${formatDate(post.scheduled_time || post.created_at)}`;
    } else {
      timeBadgeText = `Drafted: ${formatDate(post.created_at)}`;
    }

    li.innerHTML = `
      <div class="post-header">
        <div class="post-author-info">
          <div class="platform-avatar ${platformClass}" style="width: 28px; height: 28px; font-size: 0.75rem;">
            ${platformIcon}
          </div>
          <div class="author-badge">
            <span class="author-name">@${post.username ? post.username.replace(/^@/, '') : 'user'}</span>
            <span class="post-platform-tag">${post.platform || 'Social'}</span>
          </div>
        </div>
        <div class="post-time-meta">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${timeBadgeText}
        </div>
      </div>

      <div class="post-body">
        ${formatPostContentHtml(post.content)}
      </div>

      <div class="post-footer">
        <span class="badge ${post.status}">
          <span class="status-dot" style="width: 6px; height: 6px; box-shadow: none; animation: none;"></span>
          ${post.status}
        </span>

        <div class="post-actions">
          ${post.status !== "published" ? `
            <button class="btn btn-publish" data-publish="${post.id}" title="Publish post immediately">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Publish Now
            </button>
          ` : ""}
          <button class="btn btn-danger-ghost" data-delete-post="${post.id}" title="Delete post">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });
}

// Post Actions (Publish / Delete)
document.getElementById("post-list")?.addEventListener("click", async (e) => {
  const publishBtn = e.target.closest("[data-publish]");
  const deleteBtn = e.target.closest("[data-delete-post]");

  if (publishBtn) {
    const id = publishBtn.getAttribute("data-publish");
    try {
      await api(`/posts/${id}/publish`, { method: "POST" });
      showToast("Post marked as published!", "success");
      await loadPosts();
      await loadSummary();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (deleteBtn) {
    const id = deleteBtn.getAttribute("data-delete-post");
    const confirmed = await showConfirmModal("Delete Post?", "Are you sure you want to permanently delete this post?");
    if (!confirmed) return;

    try {
      await api(`/posts/${id}`, { method: "DELETE" });
      showToast("Post deleted", "info");
      await loadPosts();
      await loadSummary();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
});

// ---------- Compose Studio & Live Preview ----------

function updateLivePreview() {
  const accountSelect = document.getElementById("post-account");
  const contentInput = document.getElementById("post-content");
  const charCountEl = document.getElementById("char-count");
  const charLimitEl = document.getElementById("char-limit");
  const charCounterWrap = document.getElementById("char-counter");
  const previewPlatformIndicator = document.getElementById("preview-platform-indicator");

  const mockAvatar = document.getElementById("mock-avatar");
  const mockAuthorName = document.getElementById("mock-author-name");
  const mockAuthorHandle = document.getElementById("mock-author-handle");
  const mockContent = document.getElementById("mock-content");

  const selectedAccountId = accountSelect ? accountSelect.value : null;
  const currentAcc = accounts.find((a) => a.id == selectedAccountId) || accounts[0];

  const content = contentInput ? contentInput.value : "";
  const platform = currentAcc ? currentAcc.platform : "Twitter/X";
  const username = currentAcc ? `@${currentAcc.username.replace(/^@/, '')}` : "@your_brand";
  const config = PLATFORM_CONFIG[platform] || { limit: 280, color: "#6366f1" };

  // Update Character Counter
  if (charCountEl && charLimitEl && charCounterWrap) {
    const length = content.length;
    charCountEl.textContent = length;
    charLimitEl.textContent = config.limit;

    charCounterWrap.classList.remove("warning", "danger");
    if (length > config.limit) {
      charCounterWrap.classList.add("danger");
    } else if (length > config.limit * 0.85) {
      charCounterWrap.classList.add("warning");
    }
  }

  // Update Preview Elements
  if (previewPlatformIndicator) {
    previewPlatformIndicator.textContent = platform;
    previewPlatformIndicator.style.color = config.color;
  }

  if (mockAvatar) {
    mockAvatar.textContent = username.replace(/^@/, '').charAt(0).toUpperCase() || "M";
    mockAvatar.style.background = config.color;
  }
  if (mockAuthorName) {
    mockAuthorName.textContent = username.replace(/^@/, '');
  }
  if (mockAuthorHandle) {
    mockAuthorHandle.textContent = `${username} · ${platform}`;
  }
  if (mockContent) {
    if (!content.trim()) {
      mockContent.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">Your post content will appear here in real-time...</span>`;
    } else {
      mockContent.innerHTML = formatPostContentHtml(content);
    }
  }
}

// Textarea listeners
const postContentInput = document.getElementById("post-content");
if (postContentInput) {
  postContentInput.addEventListener("input", updateLivePreview);
}

const postAccountSelect = document.getElementById("post-account");
if (postAccountSelect) {
  postAccountSelect.addEventListener("change", updateLivePreview);
}

// Quick Hashtag Chips
document.getElementById("quick-hashtags")?.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const tag = chip.dataset.tag;
  if (!tag || !postContentInput) return;

  const current = postContentInput.value;
  postContentInput.value = current ? `${current.trim()} ${tag} ` : `${tag} `;
  postContentInput.focus();
  updateLivePreview();
});

// Scheduling Presets
const schedulePresets = document.getElementById("schedule-presets");
const customTimeContainer = document.getElementById("custom-time-container");
const postTimeInput = document.getElementById("post-time");

if (schedulePresets) {
  schedulePresets.addEventListener("click", (e) => {
    const chip = e.target.closest(".preset-chip");
    if (!chip) return;

    document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    const preset = chip.dataset.preset;
    const now = new Date();

    if (preset === "draft") {
      if (customTimeContainer) customTimeContainer.style.display = "none";
      if (postTimeInput) postTimeInput.value = "";
    } else if (preset === "1h") {
      if (customTimeContainer) customTimeContainer.style.display = "none";
      const target = new Date(now.getTime() + 60 * 60 * 1000);
      setDateTimeInput(target);
    } else if (preset === "tomorrow") {
      if (customTimeContainer) customTimeContainer.style.display = "none";
      const target = new Date(now);
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
      setDateTimeInput(target);
    } else if (preset === "custom") {
      if (customTimeContainer) customTimeContainer.style.display = "block";
      if (postTimeInput) postTimeInput.focus();
    }
  });
}

function setDateTimeInput(date) {
  if (!postTimeInput) return;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  postTimeInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
}

// Clear Composer
document.getElementById("clear-composer-btn")?.addEventListener("click", () => {
  document.getElementById("post-form")?.reset();
  document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
  document.querySelector('.preset-chip[data-preset="draft"]')?.classList.add("active");
  if (customTimeContainer) customTimeContainer.style.display = "none";
  updateLivePreview();
});

// Submit Post
document.getElementById("post-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const account_id = document.getElementById("post-account").value;
  const content = document.getElementById("post-content").value.trim();
  const scheduledTimeRaw = document.getElementById("post-time")?.value;

  if (!account_id) {
    showToast("Please select a target account first", "error");
    return;
  }
  if (!content) {
    showToast("Post content cannot be empty", "error");
    return;
  }

  const scheduled_time = scheduledTimeRaw ? new Date(scheduledTimeRaw).toISOString() : null;
  const status = scheduled_time ? "scheduled" : "draft";

  try {
    await api("/posts", {
      method: "POST",
      body: JSON.stringify({ account_id, content, scheduled_time, status }),
    });

    e.target.reset();
    document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    document.querySelector('.preset-chip[data-preset="draft"]')?.classList.add("active");
    if (customTimeContainer) customTimeContainer.style.display = "none";

    showToast(status === "scheduled" ? "Post scheduled successfully! 🚀" : "Draft saved to queue", "success");
    await loadPosts();
    await loadSummary();
    updateLivePreview();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---------- Filter Tabs & Search ----------

document.getElementById("tabs")?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;

  document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  currentStatusFilter = btn.dataset.status;
  await loadPosts();
});

// Search input
document.getElementById("post-search")?.addEventListener("input", (e) => {
  currentSearchQuery = e.target.value.trim();
  renderPostList(posts);
});

// ---------- Dashboard Summary Cards ----------

async function loadSummary() {
  const s = await api("/summary");
  const statAccounts = document.getElementById("stat-accounts");
  const statDraft = document.getElementById("stat-draft");
  const statScheduled = document.getElementById("stat-scheduled");
  const statPublished = document.getElementById("stat-published");

  if (statAccounts) statAccounts.textContent = s.accounts ?? 0;
  if (statDraft) statDraft.textContent = s.draft ?? 0;
  if (statScheduled) statScheduled.textContent = s.scheduled ?? 0;
  if (statPublished) statPublished.textContent = s.published ?? 0;
}

// ---------- Theme Toggle (Dark / Light) ----------

function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle");
  const moonIcon = document.getElementById("theme-icon-moon");
  const sunIcon = document.getElementById("theme-icon-sun");

  const savedTheme = localStorage.getItem("mediahub_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const updateIcons = (theme) => {
    if (theme === "light") {
      if (moonIcon) moonIcon.style.display = "none";
      if (sunIcon) sunIcon.style.display = "block";
    } else {
      if (moonIcon) moonIcon.style.display = "block";
      if (sunIcon) sunIcon.style.display = "none";
    }
  };

  updateIcons(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const nextTheme = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("mediahub_theme", nextTheme);
      updateIcons(nextTheme);
    });
  }
}

// ---------- Keyboard Shortcuts ----------

window.addEventListener("keydown", (e) => {
  // Focus Search with Ctrl+K or /
  if ((e.ctrlKey && e.key === "k") || (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA")) {
    e.preventDefault();
    document.getElementById("post-search")?.focus();
  }
});

// ---------- Initialization ----------

async function init() {
  initTheme();
  await checkApiConnection();

  try {
    await loadAccounts();
    await loadPosts();
    await loadSummary();
  } catch (err) {
    console.error("Initialization error:", err);
    showToast("Running in offline sandbox mode", "info");
  }
}

init();
