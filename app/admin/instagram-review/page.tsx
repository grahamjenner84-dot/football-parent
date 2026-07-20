"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type PostFormat = "carousel" | "reel";

interface PostSlide {
  id: string;
  slide_order: number;
  image_url: string | null;
  video_url: string | null;
  alt_text: string | null;
  text_content: string | null;
  duration_sec: number | string | null;
}

interface Post {
  id: string;
  format: PostFormat;
  caption: string | null;
  hook_text: string | null;
  scheduled_time: string | null;
  status: string;
  created_at: string;
  post_slides: PostSlide[];
}

interface ScheduleSettings {
  postingTime: string;
  cadenceDays: number;
  timezone: string;
}

interface ScheduleResult {
  postId: string;
  scheduledTime: string;
}

function resolveCaption(post: Post): string {
  return post.caption ?? post.hook_text ?? "";
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fallback for browsers/contexts without Clipboard API permission -
    // still real newline characters, not <br> tags, so paste formatting
    // survives exactly the same way.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function InstagramReviewPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<PostFormat>("carousel");

  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<ScheduleSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<Record<string, "auto" | "manual">>({});
  const [manualTime, setManualTime] = useState<Record<string, string>>({});
  const [scheduleResults, setScheduleResults] = useState<{ caption: string; scheduledTime: string }[] | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [markPostedId, setMarkPostedId] = useState<string | null>(null);
  const [permalinkInput, setPermalinkInput] = useState("");
  const [markPostedError, setMarkPostedError] = useState("");
  const [markPostedBusy, setMarkPostedBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function loadQueue() {
    fetch("/api/instagram/queue")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load queue");
        }
        return res.json();
      })
      .then((data: { posts: Post[] }) => setPosts(data.posts))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load queue"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadQueue();
    fetch("/api/instagram/schedule-settings")
      .then((r) => r.json())
      .then((s: ScheduleSettings) => {
        setSettings(s);
        setSettingsDraft(s);
      })
      .catch(() => {});
  }, []);

  const carousels = useMemo(() => (posts ?? []).filter((p) => p.format === "carousel"), [posts]);
  const reels = useMemo(() => (posts ?? []).filter((p) => p.format === "reel"), [posts]);
  const selectedIds = carousels.filter((p) => selected[p.id]).map((p) => p.id);

  async function submitApproval(postIds: string[]) {
    if (!postIds.length) return;
    setApproving(true);
    setApproveError("");
    setScheduleResults(null);
    const captionByPostId = new Map((posts ?? []).map((p) => [p.id, resolveCaption(p)]));
    try {
      const items = postIds.map((id) => {
        const m = mode[id] ?? "auto";
        return {
          postId: id,
          mode: m,
          manualTime: m === "manual" && manualTime[id] ? new Date(manualTime[id]).toISOString() : undefined,
        };
      });
      const res = await fetch("/api/instagram/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Approve failed");
      const results: ScheduleResult[] = body.results;
      setScheduleResults(
        results
          .map((r) => ({ caption: captionByPostId.get(r.postId) ?? "(untitled)", scheduledTime: r.scheduledTime }))
          .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      );
      setSelected({});
      loadQueue();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  }

  async function submitReject(postId: string) {
    try {
      const res = await fetch("/api/instagram/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason: rejectReason.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Reject failed");
      setRejectingId(null);
      setRejectReason("");
      loadQueue();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  async function handleCopyCaption(post: Post) {
    await copyToClipboard(resolveCaption(post));
    setCopiedId(post.id);
    setTimeout(() => setCopiedId((id) => (id === post.id ? null : id)), 2000);
  }

  async function handleSaveVideo(post: Post) {
    const videoUrl = post.post_slides[0]?.video_url;
    if (!videoUrl) return;
    try {
      const resp = await fetch(videoUrl);
      const blob = await resp.blob();
      const file = new File([blob], `reel-${post.id}.mp4`, { type: blob.type || "video/mp4" });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file] } as ShareData);
        return;
      }
    } catch {
      // fall through to link fallback
    }
    window.open(videoUrl, "_blank");
  }

  async function handleMarkPosted(postId: string, skipMatch: boolean) {
    setMarkPostedBusy(true);
    setMarkPostedError("");
    try {
      const res = await fetch("/api/instagram/mark-posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, permalink: permalinkInput.trim(), skipMatch }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to mark as posted");
      setMarkPostedId(null);
      setPermalinkInput("");
      loadQueue();
    } catch (err) {
      setMarkPostedError(err instanceof Error ? err.message : "Failed to mark as posted");
    } finally {
      setMarkPostedBusy(false);
    }
  }

  async function saveSettings() {
    if (!settingsDraft) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/instagram/schedule-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsDraft),
      });
      const body = await res.json();
      if (res.ok) {
        setSettings(body);
        setSettingsOpen(false);
      }
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Review & schedule</h1>
          {settings && (
            <p style={styles.subtitle}>
              Every {settings.cadenceDays}d at {settings.postingTime}
            </p>
          )}
        </div>
        <button style={styles.gearButton} onClick={() => setSettingsOpen((v) => !v)}>
          {settingsOpen ? "Close" : "Cadence"}
        </button>
      </header>

      {settingsOpen && settingsDraft && (
        <div style={styles.settingsPanel}>
          <label style={styles.settingsLabel}>
            Posting time
            <input
              type="time"
              value={settingsDraft.postingTime}
              onChange={(e) => setSettingsDraft({ ...settingsDraft, postingTime: e.target.value })}
              style={styles.input}
            />
          </label>
          <label style={styles.settingsLabel}>
            Cadence (days between posts)
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={settingsDraft.cadenceDays}
              onChange={(e) => setSettingsDraft({ ...settingsDraft, cadenceDays: Number(e.target.value) })}
              style={styles.input}
            />
          </label>
          <p style={styles.muted}>Timezone: {settingsDraft.timezone}</p>
          <button style={styles.primaryButton} onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save cadence"}
          </button>
        </div>
      )}

      <nav style={styles.tabBar}>
        <button style={{ ...styles.tabButton, ...(tab === "carousel" ? styles.tabButtonActive : {}) }} onClick={() => setTab("carousel")}>
          Carousels <span style={styles.tabCount}>{carousels.length}</span>
        </button>
        <button style={{ ...styles.tabButton, ...(tab === "reel" ? styles.tabButtonActive : {}) }} onClick={() => setTab("reel")}>
          Reels <span style={styles.tabCount}>{reels.length}</span>
        </button>
      </nav>

      <main style={styles.content}>
        {loading && <p style={styles.muted}>Loading...</p>}
        {loadError && <p style={styles.error}>{loadError}</p>}

        {approveError && <p style={styles.error}>{approveError}</p>}

        {scheduleResults && (
          <div style={styles.resultPanel}>
            <p style={styles.resultTitle}>Scheduled:</p>
            {scheduleResults.map((r, i) => (
              <div key={i} style={styles.resultRow}>
                <span style={styles.resultCaption}>{r.caption.slice(0, 60)}</span>
                <span style={styles.resultTime}>{formatWhen(r.scheduledTime)}</span>
              </div>
            ))}
            <button style={styles.ghostButton} onClick={() => setScheduleResults(null)}>
              Dismiss
            </button>
          </div>
        )}

        {!loading && !loadError && tab === "carousel" && (
          <div style={styles.list}>
            {carousels.length === 0 && <p style={styles.muted}>Nothing waiting for review right now.</p>}
            {carousels.map((post) => (
              <div key={post.id} style={styles.card}>
                <div style={styles.slideTrack}>
                  {post.post_slides.map((slide) => (
                    <img key={slide.id} src={slide.image_url ?? undefined} alt={slide.alt_text ?? ""} style={styles.slideImg} />
                  ))}
                </div>
                <p style={styles.caption}>{resolveCaption(post)}</p>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!selected[post.id]}
                    onChange={(e) => setSelected({ ...selected, [post.id]: e.target.checked })}
                    style={styles.checkbox}
                  />
                  Select for batch approve
                </label>

                <div style={styles.chipRow}>
                  <button
                    style={{ ...styles.chip, ...((mode[post.id] ?? "auto") === "auto" ? styles.chipActive : {}) }}
                    onClick={() => setMode({ ...mode, [post.id]: "auto" })}
                  >
                    Auto-cadence
                  </button>
                  <button
                    style={{ ...styles.chip, ...(mode[post.id] === "manual" ? styles.chipActive : {}) }}
                    onClick={() => setMode({ ...mode, [post.id]: "manual" })}
                  >
                    Pick date/time
                  </button>
                </div>

                {mode[post.id] === "manual" && (
                  <input
                    type="datetime-local"
                    value={manualTime[post.id] ?? ""}
                    onChange={(e) => setManualTime({ ...manualTime, [post.id]: e.target.value })}
                    style={styles.input}
                  />
                )}

                <div style={styles.actionRow}>
                  <button style={styles.primaryButton} disabled={approving} onClick={() => submitApproval([post.id])}>
                    Approve & schedule
                  </button>
                  <button style={styles.dangerButton} onClick={() => setRejectingId(rejectingId === post.id ? null : post.id)}>
                    Reject
                  </button>
                </div>

                {rejectingId === post.id && (
                  <div style={styles.rejectBox}>
                    <textarea
                      placeholder="Reason (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={styles.textarea}
                    />
                    <div style={styles.actionRow}>
                      <button style={styles.dangerButton} onClick={() => submitReject(post.id)}>
                        Confirm reject
                      </button>
                      <button style={styles.ghostButton} onClick={() => setRejectingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {selectedIds.length > 0 && (
              <div style={styles.stickyBar}>
                <button style={styles.primaryButtonBig} disabled={approving} onClick={() => submitApproval(selectedIds)}>
                  {approving ? "Scheduling..." : `Approve ${selectedIds.length} selected`}
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !loadError && tab === "reel" && (
          <div style={styles.list}>
            {reels.length === 0 && <p style={styles.muted}>Nothing waiting for review right now.</p>}
            {reels.map((post) => {
              const videoUrl = post.post_slides[0]?.video_url ?? undefined;
              const captionText = resolveCaption(post);
              return (
                <div key={post.id} style={styles.card}>
                  {videoUrl && <video controls playsInline style={styles.video} src={videoUrl} />}

                  <button style={styles.primaryButtonBig} onClick={() => handleSaveVideo(post)}>
                    Save video to phone
                  </button>

                  <pre style={styles.captionBlock}>{captionText}</pre>
                  <button style={styles.primaryButtonBig} onClick={() => handleCopyCaption(post)}>
                    {copiedId === post.id ? "Copied!" : "Copy caption + hashtags"}
                  </button>

                  {markPostedId !== post.id && rejectingId !== post.id && (
                    <div style={styles.actionRow}>
                      <button style={styles.ghostButtonBig} onClick={() => setMarkPostedId(post.id)}>
                        Mark as posted
                      </button>
                      <button style={styles.dangerButton} onClick={() => setRejectingId(post.id)}>
                        Reject
                      </button>
                    </div>
                  )}

                  {rejectingId === post.id && (
                    <div style={styles.rejectBox}>
                      <textarea
                        placeholder="Reason (optional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={styles.textarea}
                      />
                      <div style={styles.actionRow}>
                        <button style={styles.dangerButton} onClick={() => submitReject(post.id)}>
                          Confirm reject
                        </button>
                        <button style={styles.ghostButton} onClick={() => setRejectingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {markPostedId === post.id && (
                    <div style={styles.rejectBox}>
                      <p style={styles.muted}>Paste the Instagram post URL to link metrics tracking:</p>
                      <input
                        type="text"
                        placeholder="https://www.instagram.com/reel/..."
                        value={permalinkInput}
                        onChange={(e) => setPermalinkInput(e.target.value)}
                        style={styles.input}
                      />
                      {markPostedError && <p style={styles.error}>{markPostedError}</p>}
                      <div style={styles.actionRow}>
                        <button style={styles.primaryButton} disabled={markPostedBusy || !permalinkInput.trim()} onClick={() => handleMarkPosted(post.id, false)}>
                          {markPostedBusy ? "Checking..." : "Confirm"}
                        </button>
                        <button style={styles.ghostButton} onClick={() => setMarkPostedId(null)}>
                          Cancel
                        </button>
                      </div>
                      <button style={styles.ghostButton} disabled={markPostedBusy} onClick={() => handleMarkPosted(post.id, true)}>
                        Skip insights, just mark as posted
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1a1410",
    color: "#f0e6d2",
    fontFamily: "system-ui, sans-serif",
    paddingBottom: 100,
  },
  header: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #3a2c1d",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: 19,
    color: "#e8b04b",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#9c8a72",
  },
  gearButton: {
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#c9b896",
    fontSize: 14,
    minHeight: 44,
  },
  settingsPanel: {
    padding: 16,
    borderBottom: "1px solid #3a2c1d",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#211810",
  },
  settingsLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    color: "#9c8a72",
  },
  tabBar: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid #3a2c1d",
  },
  tabButton: {
    flex: 1,
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 999,
    padding: "10px 14px",
    color: "#c9b896",
    fontSize: 14,
    minHeight: 44,
  },
  tabButtonActive: {
    background: "#e8b04b",
    color: "#1a1410",
    borderColor: "#e8b04b",
    fontWeight: 600,
  },
  tabCount: {
    fontSize: 12,
    opacity: 0.8,
    marginLeft: 4,
  },
  content: {
    padding: 16,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  slideTrack: {
    display: "flex",
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    gap: 8,
    borderRadius: 8,
  },
  slideImg: {
    scrollSnapAlign: "start",
    flex: "0 0 85%",
    width: "85%",
    borderRadius: 8,
    background: "#000",
  },
  video: {
    width: "100%",
    borderRadius: 8,
    background: "#000",
    maxHeight: "70vh",
  },
  caption: {
    margin: 0,
    fontSize: 14,
    color: "#f0e6d2",
    whiteSpace: "pre-wrap",
  },
  captionBlock: {
    margin: 0,
    fontSize: 14,
    color: "#f0e6d2",
    whiteSpace: "pre-wrap",
    fontFamily: "system-ui, sans-serif",
    background: "#1a1410",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    overflowY: "auto",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#c9b896",
  },
  checkbox: {
    width: 20,
    height: 20,
  },
  chipRow: {
    display: "flex",
    gap: 8,
  },
  chip: {
    flex: 1,
    background: "#1a1410",
    border: "1px solid #3a2c1d",
    borderRadius: 999,
    padding: "10px 12px",
    color: "#c9b896",
    fontSize: 13,
    minHeight: 40,
  },
  chipActive: {
    background: "#e8b04b",
    color: "#1a1410",
    borderColor: "#e8b04b",
    fontWeight: 600,
  },
  input: {
    background: "#1a1410",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#f0e6d2",
    fontSize: 16,
    minHeight: 44,
    width: "100%",
    boxSizing: "border-box",
  },
  textarea: {
    background: "#1a1410",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#f0e6d2",
    fontSize: 16,
    width: "100%",
    boxSizing: "border-box",
    minHeight: 60,
  },
  actionRow: {
    display: "flex",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    background: "#e8b04b",
    color: "#1a1410",
    border: "none",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 600,
    minHeight: 48,
  },
  primaryButtonBig: {
    width: "100%",
    background: "#e8b04b",
    color: "#1a1410",
    border: "none",
    borderRadius: 8,
    padding: "14px 16px",
    fontSize: 15,
    fontWeight: 600,
    minHeight: 52,
  },
  ghostButton: {
    flex: 1,
    background: "transparent",
    color: "#c9b896",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 14,
    minHeight: 48,
  },
  ghostButtonBig: {
    width: "100%",
    background: "transparent",
    color: "#c9b896",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "14px 16px",
    fontSize: 15,
    minHeight: 52,
  },
  dangerButton: {
    flex: 1,
    background: "transparent",
    color: "#e07856",
    border: "1px solid #e07856",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 600,
    minHeight: 48,
  },
  rejectBox: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#1a1410",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: 12,
  },
  stickyBar: {
    position: "sticky",
    bottom: 0,
    background: "#1a1410",
    borderTop: "1px solid #3a2c1d",
    padding: "12px 0",
    marginTop: 8,
  },
  resultPanel: {
    background: "#241b14",
    border: "1px solid #e8b04b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resultTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: "#e8b04b",
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 13,
    color: "#c9b896",
    borderTop: "1px solid #3a2c1d",
    paddingTop: 6,
  },
  resultCaption: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  resultTime: {
    flexShrink: 0,
    color: "#e8b04b",
  },
  muted: {
    color: "#9c8a72",
    fontSize: 14,
  },
  error: {
    color: "#e07856",
    fontSize: 14,
  },
};
