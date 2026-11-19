import { useState } from "react";
import { Heart, ImagePlus, MessageCircle, Play, Plus, Send, Sparkles, Video, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type FeedFilter = "all" | "post" | "reel";
type Props = { onToast: (message: string) => void };

function timeAgo(value: Date | string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function CommunityWorkspace({ onToast }: Props) {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [kind, setKind] = useState<"post" | "reel">("post");
  const [caption, setCaption] = useState("");
  const [mediaDataUrl, setMediaDataUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaName, setMediaName] = useState("");
  const [activeComments, setActiveComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();
  const feedQuery = trpc.community.feed.useQuery(filter === "all" ? undefined : { kind: filter }, { refetchOnWindowFocus: false });
  const commentsQuery = trpc.community.comments.useQuery({ postId: activeComments ?? 0 }, { enabled: activeComments !== null, refetchOnWindowFocus: false });
  const createMutation = trpc.community.create.useMutation({
    onSuccess: async () => {
      await utils.community.feed.invalidate();
      setComposerOpen(false); setCaption(""); setMediaDataUrl(""); setMediaName(""); setKind("post"); setMediaType("image");
      onToast("Your story is live in the farmer community.");
    },
    onError: (error) => onToast(error.message || "We could not publish that story."),
  });
  const likeMutation = trpc.community.like.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error) => onToast(error.message) });
  const commentMutation = trpc.community.comment.useMutation({
    onSuccess: async () => { await Promise.all([utils.community.feed.invalidate(), utils.community.comments.invalidate()]); setCommentText(""); },
    onError: (error) => onToast(error.message || "We could not add your comment."),
  });

  const handleMedia = (file?: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const allowed = isVideo ? ["video/mp4", "video/webm", "video/quicktime"] : ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) { onToast(isVideo ? "Choose an MP4, WebM, or MOV reel." : "Choose a PNG, JPEG, or WebP photo."); return; }
    if (file.size > 12_000_000) { onToast("Keep community media under 12 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") { setMediaDataUrl(reader.result); setMediaName(file.name); setMediaType(isVideo ? "video" : "image"); setKind(isVideo ? "reel" : "post"); } };
    reader.onerror = () => onToast("We could not read that file. Please try again.");
    reader.readAsDataURL(file);
  };

  const publish = () => {
    if (!mediaDataUrl) { onToast("Add a photo or reel before publishing."); return; }
    createMutation.mutate({ kind, mediaType, mediaDataUrl, caption: caption.trim() || undefined });
  };

  return <div className="community-workspace">
    <section className="community-hero"><div><span className="eyebrow">NAMMA RYTHA COMMUNITY</span><h2>Share what is growing.</h2><p>Learn from nearby farmers, celebrate small wins, and swap field-tested ideas through photos and reels.</p></div><div className="community-hero-mark"><Sparkles size={26} /></div></section>
    <div className="community-toolbar"><div className="community-tabs" role="tablist" aria-label="Community feed filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>For you</button><button className={filter === "post" ? "active" : ""} onClick={() => setFilter("post")}>Photos</button><button className={filter === "reel" ? "active" : ""} onClick={() => setFilter("reel")}><Play size={13} /> Reels</button></div><button className="primary-button community-create" onClick={() => setComposerOpen((open) => !open)}><Plus size={16} /> Create story</button></div>
    {composerOpen && <section className="panel community-composer"><div className="panel-title"><div><span className="eyebrow">CREATE STORY</span><h3>Post a field moment</h3><p>Share a practical tip, crop update, or short reel with the community.</p></div><button className="icon-button" onClick={() => setComposerOpen(false)} aria-label="Close composer"><X size={17} /></button></div><div className="community-kind-toggle"><button className={kind === "post" ? "active" : ""} onClick={() => { setKind("post"); setMediaDataUrl(""); setMediaName(""); }}><ImagePlus size={16} /> Photo post</button><button className={kind === "reel" ? "active" : ""} onClick={() => { setKind("reel"); setMediaDataUrl(""); setMediaName(""); }}><Video size={16} /> Reel</button></div><label className="community-upload"><input type="file" accept={kind === "reel" ? "video/mp4,video/webm,video/quicktime" : "image/png,image/jpeg,image/webp"} onChange={(event) => handleMedia(event.target.files?.[0])} /><span className="community-upload-icon">{kind === "reel" ? <Video size={23} /> : <ImagePlus size={23} />}</span><strong>{mediaName || `Choose a ${kind === "reel" ? "short video" : "photo"}`}</strong><small>{kind === "reel" ? "MP4, WebM, or MOV · up to 12 MB" : "PNG, JPEG, or WebP · up to 12 MB"}</small></label>{mediaDataUrl && <div className="community-media-preview">{mediaType === "video" ? <video src={mediaDataUrl} controls playsInline /> : <img src={mediaDataUrl} alt="Selected community preview" />}</div>}<label className="community-caption">Caption<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} placeholder={kind === "reel" ? "Tell farmers what this reel shows…" : "Share a tip from your field…"} /><small>{caption.length}/1000</small></label><button className="primary-button full-width" onClick={publish} disabled={createMutation.isPending || !mediaDataUrl}>{createMutation.isPending ? "Publishing…" : "Publish to community"} <Send size={15} /></button></section>}
    {feedQuery.isLoading ? <div className="community-empty"><Sparkles size={20} /><strong>Loading farmer stories…</strong></div> : feedQuery.data?.length ? <div className="community-feed">{feedQuery.data.map((item) => <article className={`community-card ${item.kind === "reel" ? "reel-card" : ""}`} key={item.id}><div className="community-card-head"><div className="community-author-avatar">{item.authorAvatarUrl ? <img src={item.authorAvatarUrl} alt="" /> : item.authorName.slice(0, 1).toUpperCase()}</div><div><strong>{item.authorName}</strong><small>{item.kind === "reel" ? "Reel" : "Field post"} · {timeAgo(item.createdAt)}</small></div><button className="community-more" aria-label="More post actions">···</button></div><div className="community-media">{item.mediaType === "video" ? <><video src={item.mediaUrl} controls playsInline loop /><span className="reel-badge"><Play size={12} /> REEL</span></> : <img src={item.mediaUrl} alt={item.caption || "Community field post"} />}</div><div className="community-card-actions"><button className={item.likedByMe ? "liked" : ""} onClick={() => likeMutation.mutate({ postId: item.id })} aria-label={item.likedByMe ? "Unlike post" : "Like post"}><Heart size={19} fill={item.likedByMe ? "currentColor" : "none"} /></button><button onClick={() => setActiveComments(activeComments === item.id ? null : item.id)} aria-label="Show comments"><MessageCircle size={19} /></button><span>{item.likeCount} likes · {item.commentCount} comments</span></div>{item.caption && <p className="community-caption-text"><strong>{item.authorName}</strong> {item.caption}</p>}{activeComments === item.id && <div className="community-comments">{commentsQuery.isLoading ? <small>Loading comments…</small> : commentsQuery.data?.length ? commentsQuery.data.map((comment) => <div className="community-comment" key={comment.id}><strong>{comment.authorName || "Farmer"}</strong><span>{comment.body}</span></div>) : <small>Be the first to add a helpful comment.</small>}<div className="community-comment-form"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && commentText.trim()) commentMutation.mutate({ postId: item.id, body: commentText.trim() }); }} placeholder="Add a comment…" maxLength={500} /><button onClick={() => commentText.trim() && commentMutation.mutate({ postId: item.id, body: commentText.trim() })} disabled={commentMutation.isPending || !commentText.trim()} aria-label="Post comment"><Send size={15} /></button></div></div>}</article>)}</div> : <div className="community-empty"><ImagePlus size={24} /><strong>No stories yet</strong><span>Be the first farmer to share a field update or reel.</span><button className="secondary-button" onClick={() => setComposerOpen(true)}>Create the first story</button></div>}
  </div>;
}

export type { Props as CommunityWorkspaceProps };
