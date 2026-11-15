import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { fetchAiAds, getAdImageUrl } from '@/lib/adGenerator';
import {
  createScheduledPost,
  deleteScheduledPost,
  fetchScheduledPosts,
  updateScheduledPost,
} from '@/lib/calendar';
import { publishToInstagram } from '@/lib/instagram';
import type { AiAdCreative } from '@/types/ai';
import type { ScheduledPost } from '@/types/marketing';

export function CalendarPage() {
  const { notify } = useToast();
  const location = useLocation();

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [ads, setAds] = useState<AiAdCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Schedule modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedCreativeUrl, setSelectedCreativeUrl] = useState('');
  const [scheduleCaption, setScheduleCaption] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [savingPost, setSavingPost] = useState(false);

  // Edit/Reschedule modal
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [updatingPost, setUpdatingPost] = useState(false);

  // View post preview modal
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);

  // Delete dialog
  const [deletingPost, setDeletingPost] = useState<ScheduledPost | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Instant publishing from calendar
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduled, adList] = await Promise.all([
        fetchScheduledPosts(),
        fetchAiAds(),
      ]);
      setPosts(scheduled);
      setAds(adList);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load calendar data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if routed from Ad Generator with pre-selected creative
  useEffect(() => {
    const state = location.state as {
      scheduleCreative?: {
        imageUrl: string;
        caption?: string;
        creativeType?: 'ad' | 'model';
        productId?: string;
      };
    } | null;

    if (state?.scheduleCreative) {
      setSelectedCreativeUrl(state.scheduleCreative.imageUrl);
      setScheduleCaption(state.scheduleCreative.caption || '');
      // Default to tomorrow 6pm
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduleDate(tomorrow.toISOString().split('T')[0]);
      setScheduleModalOpen(true);
    }
  }, [location.state]);

  const handleCreateSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCreativeUrl || !scheduleDate) {
      notify('Please select a creative and schedule date.', 'error');
      return;
    }

    setSavingPost(true);
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime || '12:00'}:00`).toISOString();

    try {
      const newPost = await createScheduledPost({
        imageUrl: selectedCreativeUrl,
        caption: scheduleCaption,
        scheduledFor: scheduledDateTime,
        status: 'scheduled',
      });
      setPosts((prev) => [...prev, newPost].sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()));
      notify('Post scheduled in content calendar!');
      setScheduleModalOpen(false);
      setSelectedCreativeUrl('');
      setScheduleCaption('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not schedule post.', 'error');
    } finally {
      setSavingPost(false);
    }
  };

  const handleUpdateSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPost || !rescheduleDate) return;

    setUpdatingPost(true);
    try {
      const updated = await updateScheduledPost(editingPost.id, {
        caption: editCaption,
        scheduled_for: new Date(rescheduleDate).toISOString(),
        status: 'scheduled',
      });
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      notify('Post rescheduled.');
      setEditingPost(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update post.', 'error');
    } finally {
      setUpdatingPost(false);
    }
  };

  const handlePublishDirectly = async (post: ScheduledPost) => {
    setPublishingId(post.id);
    try {
      const res = await publishToInstagram(post.image_url, post.caption, post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, status: 'published', published_at: new Date().toISOString(), instagram_media_id: res.mediaId }
            : p
        )
      );
      notify(res.message || 'Published to Instagram!');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Publishing failed.', 'error');
      // Mark as failed locally
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: 'failed' } : p))
      );
    } finally {
      setPublishingId(null);
    }
  };

  const confirmDeletePost = async () => {
    if (!deletingPost) return;
    setDeleteLoading(true);
    try {
      await deleteScheduledPost(deletingPost.id);
      setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));
      notify('Post removed from calendar.');
      setDeletingPost(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete scheduled post.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Publishing"
        title="Content Calendar"
        description="Plan, schedule and monitor your jewellery advertisements and stories across the calendar."
        action={
          <button
            type="button"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setScheduleDate(tomorrow.toISOString().split('T')[0]);
              setScheduleModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> Schedule post
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-4">
        {[
          { id: 'all', label: 'All Content' },
          { id: 'scheduled', label: 'Scheduled' },
          { id: 'published', label: 'Published' },
          { id: 'failed', label: 'Needs Attention' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterStatus(tab.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              filterStatus === tab.id
                ? 'border border-champagne/60 bg-champagne/15 text-champagne'
                : 'border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass flex aspect-video flex-col items-center justify-center p-8 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-slate-600" />
          <h3 className="font-serif text-2xl text-white">No posts scheduled</h3>
          <p className="mt-2 max-w-sm text-xs text-slate-400">
            Generate luxury advertisements or model shots and schedule them to keep your Instagram feed active.
          </p>
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Schedule a post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const dateObj = new Date(post.scheduled_for);
            const isPublished = post.status === 'published';
            const isFailed = post.status === 'failed';
            const isPublishingThis = publishingId === post.id;

            return (
              <div
                key={post.id}
                className="glass flex flex-col gap-5 p-5 transition-all hover:border-emerald-500/30 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left Thumbnail & Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={post.image_url}
                    alt="Creative"
                    className="h-20 w-20 shrink-0 rounded-xl object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          isPublished
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isFailed
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-champagne/20 text-champagne'
                        }`}
                      >
                        {post.status}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dateObj.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs text-slate-200">
                      {post.caption || 'No caption provided.'}
                    </p>

                    {post.error_message && (
                      <p className="mt-1 text-[11px] text-red-400">
                        Error: {post.error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex shrink-0 items-center gap-2 sm:self-center">
                  <button
                    type="button"
                    onClick={() => setPreviewPost(post)}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
                    title="View creative & caption"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {!isPublished && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost(post);
                          setRescheduleDate(post.scheduled_for.slice(0, 16));
                          setEditCaption(post.caption);
                        }}
                        className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
                        title="Reschedule post"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePublishDirectly(post)}
                        disabled={isPublishingThis}
                        className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5"
                      >
                        {isPublishingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Publish Now
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeletingPost(post)}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                    title="Delete scheduled post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Post Modal */}
      <Modal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule Content">
        <form onSubmit={handleCreateSchedule} className="space-y-5">
          {/* Pick Creative */}
          <div>
            <label className="label-text">Select Creative</label>
            {ads.length === 0 ? (
              <p className="text-xs text-slate-400">No generated ads found. Please generate an advertisement creative first.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ads.map((ad) => {
                  const url = getAdImageUrl(ad.image_path);
                  const isSelected = selectedCreativeUrl === url;
                  return (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => {
                        setSelectedCreativeUrl(url);
                        if (!scheduleCaption) {
                          setScheduleCaption(`${ad.caption}\n\n${ad.hashtags}`.trim());
                        }
                      }}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border ${
                        isSelected ? 'border-champagne ring-2 ring-champagne' : 'border-white/10 opacity-70'
                      }`}
                    >
                      <img src={url} alt="Ad" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="schedDate" className="label-text">Publish Date</label>
              <input
                id="schedDate"
                type="date"
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="schedTime" className="label-text">Publish Time</label>
              <input
                id="schedTime"
                type="time"
                required
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="schedCaption" className="label-text">Post Caption</label>
            <textarea
              id="schedCaption"
              rows={4}
              value={scheduleCaption}
              onChange={(e) => setScheduleCaption(e.target.value)}
              className="input-base text-xs"
              placeholder="Instagram caption and hashtags..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setScheduleModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPost || !selectedCreativeUrl || !scheduleDate}
              className="btn-primary"
            >
              {savingPost && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal open={editingPost !== null} onClose={() => setEditingPost(null)} title="Reschedule Post">
        <form onSubmit={handleUpdateSchedule} className="space-y-4">
          <div>
            <label htmlFor="reschedDate" className="label-text">New Date & Time</label>
            <input
              id="reschedDate"
              type="datetime-local"
              required
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="input-base"
            />
          </div>

          <div>
            <label htmlFor="reschedCaption" className="label-text">Caption</label>
            <textarea
              id="reschedCaption"
              rows={4}
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditingPost(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={updatingPost} className="btn-primary">
              {updatingPost && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal open={previewPost !== null} onClose={() => setPreviewPost(null)} title="Post Preview">
        {previewPost && (
          <div className="space-y-4">
            <img
              src={previewPost.image_url}
              alt="Preview"
              className="aspect-square w-full rounded-xl object-cover border border-champagne/30"
            />
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="whitespace-pre-wrap text-xs text-slate-200">{previewPost.caption}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletingPost !== null}
        title="Remove scheduled post?"
        description="This scheduled publication will be removed from your calendar."
        confirmLabel="Remove"
        loading={deleteLoading}
        onConfirm={confirmDeletePost}
        onCancel={() => setDeletingPost(null)}
      />
    </div>
  );
}
