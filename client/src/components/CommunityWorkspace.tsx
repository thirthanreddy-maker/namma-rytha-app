import { useState } from "react";
import { Heart, ImagePlus, MessageCircle, Play, Plus, Send, Sparkles, Video, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

type FeedFilter = "all" | "post" | "reel";
type Props = { onToast: (message: string) => void };

function timeAgo(value: Date | string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function CommunityWorkspace({ onToast }: Props) {
  const { t } = useTranslation(["community", "validation", "common"]);
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
      onToast(t("community:community.publish"));
    },
    onError: (error) => onToast(error.message || t("validation:networkError")),
  });
  const likeMutation = trpc.community.like.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error) => onToast(error.message) });
  const commentMutation = trpc.community.comment.useMutation({
    onSuccess: async () => { await Promise.all([utils.community.feed.invalidate(), utils.community.comments.invalidate()]); setCommentText(""); },
    onError: (error) => onToast(error.message || t("validation:networkError")),
  });

  const handleMedia = (file?: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const allowed = isVideo ? ["video/mp4", "video/webm", "video/quicktime"] : ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) { onToast(t("validation:invalidImageType")); return; }
    if (file.size > 12_000_000) { onToast(t("validation:mediaTooLarge")); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") { setMediaDataUrl(reader.result); setMediaName(file.name); setMediaType(isVideo ? "video" : "image"); setKind(isVideo ? "reel" : "post"); } };
    reader.onerror = () => onToast(t("validation:readFileError"));
    reader.readAsDataURL(file);
  };

  const publish = () => {
    if (!mediaDataUrl) { onToast(t("validation:required")); return; }
    createMutation.mutate({ kind, mediaType, mediaDataUrl, caption: caption.trim() || undefined });
  };

  return <div className="community-workspace">
    <section className="community-hero"><div><span className="eyebrow">{t("community:community.heroEyebrow")}</span><h2>{t("community:community.heroTitle")}</h2><p>{t("community:community.heroSub")}</p></div><div className="community-hero-mark"><Sparkles size={26} /></div></section>
    <div className="community-toolbar"><div className="community-tabs" role="tablist" aria-label={t("community:community.pageEyebrow")}><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>{t("community:community.forYou")}</button><button className={filter === "post" ? "active" : ""} onClick={() => setFilter("post")}>{t("community:community.photos")}</button><button className={filter === "reel" ? "active" : ""} onClick={() => setFilter("reel")}><Play size={13} /> {t("community:community.reels")}</button></div><button className="primary-button community-create" onClick={() => setComposerOpen((open) => !open)}><Plus size={16} /> {t("community:community.createStory")}</button></div>
    {composerOpen && <section className="panel community-composer"><div className="panel-title"><div><span className="eyebrow">{t("community:community.composerEyebrow")}</span><h3>{t("community:community.composerTitle")}</h3><p>{t("community:community.composerSub")}</p></div><button className="icon-button" onClick={() => setComposerOpen(false)} aria-label={t("common:close")}><X size={17} /></button></div><div className="community-kind-toggle"><button className={kind === "post" ? "active" : ""} onClick={() => { setKind("post"); setMediaDataUrl(""); setMediaName(""); }}><ImagePlus size={16} /> {t("community:community.photoPost")}</button><button className={kind === "reel" ? "active" : ""} onClick={() => { setKind("reel"); setMediaDataUrl(""); setMediaName(""); }}><Video size={16} /> {t("community:community.reelPost")}</button></div><label className="community-upload"><input type="file" accept={kind === "reel" ? "video/mp4,video/webm,video/quicktime" : "image/png,image/jpeg,image/webp"} onChange={(event) => handleMedia(event.target.files?.[0])} /><span className="community-upload-icon">{kind === "reel" ? <Video size={23} /> : <ImagePlus size={23} />}</span><strong>{mediaName || (kind === "reel" ? t("community:community.chooseVideo") : t("community:community.choosePhoto"))}</strong><small>{kind === "reel" ? t("community:community.videoLimit") : t("community:community.photoLimit")}</small></label>{mediaDataUrl && <div className="community-media-preview">{mediaType === "video" ? <video src={mediaDataUrl} controls playsInline /> : <img src={mediaDataUrl} alt="" />}</div>}<label className="community-caption">{t("community:community.caption")}<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} placeholder={kind === "reel" ? t("community:community.captionPlaceholderReel") : t("community:community.captionPlaceholderPhoto")} /><small>{caption.length}/1000</small></label><button className="primary-button full-width" onClick={publish} disabled={createMutation.isPending || !mediaDataUrl}>{createMutation.isPending ? t("community:community.publishing") : t("community:community.publish")} <Send size={15} /></button></section>}
    {feedQuery.isLoading ? <div className="community-empty"><Sparkles size={20} /><strong>{t("community:community.loadingStories")}</strong></div> : feedQuery.data?.length ? <div className="community-feed">{feedQuery.data.map((item) => <article className={`community-card ${item.kind === "reel" ? "reel-card" : ""}`} key={item.id}><div className="community-card-head"><div className="community-author-avatar">{item.authorAvatarUrl ? <img src={item.authorAvatarUrl} alt="" /> : item.authorName.slice(0, 1).toUpperCase()}</div><div><strong>{item.authorName}</strong><small>{item.kind === "reel" ? t("community:community.reelLabel") : t("community:community.postLabel")} · {timeAgo(item.createdAt)}</small></div><button className="community-more" aria-label={t("common:actions")}>···</button></div><div className="community-media">{item.mediaType === "video" ? <><video src={item.mediaUrl} controls playsInline loop /><span className="reel-badge"><Play size={12} /> REEL</span></> : <img src={item.mediaUrl} alt={item.caption || ""} />}</div><div className="community-card-actions"><button className={item.likedByMe ? "liked" : ""} onClick={() => likeMutation.mutate({ postId: item.id })} aria-label={t("common:actions")}><Heart size={19} fill={item.likedByMe ? "currentColor" : "none"} /></button><button onClick={() => setActiveComments(activeComments === item.id ? null : item.id)} aria-label={t("common:actions")}><MessageCircle size={19} /></button><span>{t("community:community.likesComments", { likes: item.likeCount, comments: item.commentCount })}</span></div>{item.caption && <p className="community-caption-text"><strong>{item.authorName}</strong> {item.caption}</p>}{activeComments === item.id && <div className="community-comments">{commentsQuery.isLoading ? <small>{t("community:community.loadingComments")}</small> : commentsQuery.data?.length ? commentsQuery.data.map((comment) => <div className="community-comment" key={comment.id}><strong>{comment.authorName || t("common:farmer")}</strong><span>{comment.body}</span></div>) : <small>{t("community:community.firstComment")}</small>}<div className="community-comment-form"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && commentText.trim()) commentMutation.mutate({ postId: item.id, body: commentText.trim() }); }} placeholder={t("community:community.addComment")} maxLength={500} /><button onClick={() => commentText.trim() && commentMutation.mutate({ postId: item.id, body: commentText.trim() })} disabled={commentMutation.isPending || !commentText.trim()} aria-label={t("common:submit")}><Send size={15} /></button></div></div>}</article>)}</div> : <div className="community-empty"><ImagePlus size={24} /><strong>{t("community:community.emptyTitle")}</strong><span>{t("community:community.emptySub")}</span><button className="secondary-button" onClick={() => setComposerOpen(true)}>{t("community:community.createFirst")}</button></div>}
  </div>;
}

export type { Props as CommunityWorkspaceProps };
