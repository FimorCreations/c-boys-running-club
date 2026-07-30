(function (global) {
  const LOCAL_KEY = "cboys-site-data";
  const BLOB_KEY = "cboys-blob-id";
  const BLOB_API = "https://jsonblob.com/api/jsonBlob";

  const defaultData = {
    weekPlan: {},
    community: [],
    stats: { members: 0, kmMonth: 0, sessionsWeek: 4 },
    updatedAt: null
  };

  function getConfig() {
    return global.CBOYS_CONFIG || { adminPassword: "cboys-admin", blobId: "" };
  }

  function getBlobId() {
    return getConfig().blobId || localStorage.getItem(BLOB_KEY) || "";
  }

  function setBlobId(id) {
    if (!id) return;
    localStorage.setItem(BLOB_KEY, id);
    if (global.CBOYS_CONFIG) global.CBOYS_CONFIG.blobId = id;
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  async function loadSeed() {
    try {
      const res = await fetch("./data/site-data.json", { cache: "no-store" });
      if (!res.ok) throw new Error("seed missing");
      return await res.json();
    } catch {
      return clone(defaultData);
    }
  }

  async function fetchBlob(id) {
    const res = await fetch(`${BLOB_API}/${id}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error("blob fetch failed");
    return await res.json();
  }

  async function createBlob(data) {
    const res = await fetch(BLOB_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("blob create failed");
    const loc = res.headers.get("Location") || "";
    const id = loc.split("/").pop();
    if (!id) throw new Error("blob id missing");
    setBlobId(id);
    return id;
  }

  async function updateBlob(id, data) {
    const res = await fetch(`${BLOB_API}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("blob update failed");
    return true;
  }

  async function loadData() {
    const seed = await loadSeed();
    const blobId = getBlobId();

    if (blobId) {
      try {
        const live = await fetchBlob(blobId);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(live));
        return live;
      } catch (err) {
        console.warn("Live data unavailable, falling back", err);
      }
    }

    const local = localStorage.getItem(LOCAL_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        /* ignore */
      }
    }

    return seed;
  }

  async function saveData(data, { publish = false } = {}) {
    const next = clone(data);
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));

    if (!publish) return { data: next, blobId: getBlobId(), published: false };

    let blobId = getBlobId();
    if (!blobId) {
      blobId = await createBlob(next);
    } else {
      try {
        await updateBlob(blobId, next);
      } catch {
        blobId = await createBlob(next);
      }
    }

    return { data: next, blobId, published: true };
  }

  async function addCommunityPost({ name, message }) {
    const data = await loadData();
    const post = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: String(name || "").trim().slice(0, 60),
      message: String(message || "").trim().slice(0, 280),
      createdAt: new Date().toISOString(),
      approved: true
    };
    if (!post.name || !post.message) throw new Error("Name and message are required");

    data.community = Array.isArray(data.community) ? data.community : [];
    data.community.unshift(post);
    data.stats = data.stats || { members: 0, kmMonth: 0, sessionsWeek: 4 };
    data.stats.members = Math.max(Number(data.stats.members) || 0, data.community.length);

    // Always try to publish so the wall is shared for all visitors
    const result = await saveData(data, { publish: true });
    return { post, ...result };
  }

  async function deleteCommunityPost(id) {
    const data = await loadData();
    data.community = (data.community || []).filter((p) => p.id !== id);
    return saveData(data, { publish: Boolean(getBlobId()) });
  }

  function checkAdminPassword(password) {
    return String(password || "") === String(getConfig().adminPassword || "");
  }

  global.CboysStore = {
    loadData,
    saveData,
    addCommunityPost,
    deleteCommunityPost,
    checkAdminPassword,
    getBlobId,
    setBlobId,
    LOCAL_KEY,
    BLOB_KEY
  };
})(window);
