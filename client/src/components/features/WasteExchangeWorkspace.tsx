import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, MapPin, MessageSquare, PackagePlus, Phone, Recycle, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Props = {
  onToast: (message: string) => void;
};

const CATEGORIES = [
  { id: "all", label: "All categories" },
  { id: "organic_waste", label: "Organic waste" },
  { id: "crop_residue", label: "Crop residues" },
  { id: "compost", label: "Compost" },
  { id: "manure", label: "Manure" },
  { id: "by_product", label: "Agri by-products" },
] as const;

export default function WasteExchangeWorkspace({ onToast }: Props) {
  const { t } = useTranslation(["farm", "common"]);
  const { user } = useAuth();
  const [category, setCategory] = useState("all");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [newCat, setNewCat] = useState<"organic_waste" | "crop_residue" | "compost" | "manure" | "by_product">("compost");
  const [description, setDescription] = useState("");
  const [quantityKg, setQuantityKg] = useState("500");
  const [pricePerKg, setPricePerKg] = useState("5");
  const [isFree, setIsFree] = useState(false);
  const [location, setLocation] = useState("Hegganahalli");
  const [newDistrict, setNewDistrict] = useState("Kolar");
  const [contactPhone, setContactPhone] = useState("+919845001122");

  const [contactListingId, setContactListingId] = useState<number | null>(null);
  const [buyerPhone, setBuyerPhone] = useState("+919845009988");
  const [buyerMsg, setBuyerMsg] = useState("");

  const queryInput = useMemo(() => ({ category, district: district.trim() || undefined, search: search.trim() || undefined }), [category, district, search]);
  const listQuery = trpc.wasteExchange.list.useQuery(queryInput, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const createMutation = trpc.wasteExchange.create.useMutation({
    onSuccess: () => {
      void utils.wasteExchange.list.invalidate();
      setShowCreate(false);
      setTitle("");
      setDescription("");
      onToast("Your listing is live on the Farm Waste Exchange.");
    },
    onError: (err) => onToast(err.message),
  });

  const inquireMutation = trpc.wasteExchange.inquire.useMutation({
    onSuccess: () => {
      void utils.wasteExchange.list.invalidate();
      setContactListingId(null);
      setBuyerMsg("");
      onToast("Inquiry sent to the seller.");
    },
    onError: (err) => onToast(err.message),
  });

  const statusMutation = trpc.wasteExchange.setStatus.useMutation({
    onSuccess: () => {
      void utils.wasteExchange.list.invalidate();
      onToast("Listing status updated.");
    },
    onError: (err) => onToast(err.message),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      category: newCat,
      title: title.trim(),
      description: description.trim(),
      quantityKg: Math.max(10, Number(quantityKg) || 100),
      pricePerKg: isFree ? 0 : Math.max(0, Number(pricePerKg) || 0),
      isFree,
      location: location.trim(),
      district: newDistrict.trim(),
      contactPhone: contactPhone.trim(),
    });
  };

  const listings = listQuery.data ?? [];

  return (
    <div className="rytha-module-stack">
      <div className="waste-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search manure, compost, straw, husk…" />
        </div>
        <div className="search-box" style={{ maxWidth: 210 }}>
          <MapPin size={16} />
          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Filter district (e.g. Kolar)" />
        </div>
        <button className="primary-button" onClick={() => setShowCreate((v) => !v)}>
          <PackagePlus size={15} /> List farm by-product
        </button>
      </div>

      <div className="preset-pill-row">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`tiny-pill ${category === c.id ? "active" : ""}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {showCreate && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">CIRCULAR ECONOMY LISTING</span>
              <h3>Offer organic waste, compost, or residues</h3>
            </div>
            <button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={16} /></button>
          </div>

          <form className="announcement-form-grid" style={{ marginTop: 14 }} onSubmit={handleCreate}>
            <label>
              Listing title
              <input required minLength={4} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sun-dried Maize Stover 1,500 kg" />
            </label>
            <label>
              Category
              <select value={newCat} onChange={(e) => setNewCat(e.target.value as typeof newCat)}>
                <option value="compost">Compost</option>
                <option value="manure">Manure</option>
                <option value="crop_residue">Crop residues</option>
                <option value="organic_waste">Organic waste</option>
                <option value="by_product">Agricultural by-products</option>
              </select>
            </label>
            <label>
              Quantity available (kg)
              <input type="number" min={10} required value={quantityKg} onChange={(e) => setQuantityKg(e.target.value)} />
            </label>
            <label>
              Price per kg (₹)
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" min={0} disabled={isFree} value={isFree ? "0" : pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} />
                <label className="announcement-checkbox" style={{ whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} /> Free pickup
                </label>
              </div>
            </label>
            <label>
              Village / Area
              <input required value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label>
              District
              <input required value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)} />
            </label>
            <label>
              Contact phone
              <input required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>
            <label className="announcement-form-wide">
              Quality & pickup notes
              <textarea required minLength={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mention moisture level, bagging, loading access…" />
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button className="primary-button" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Publishing…" : "Publish listing"}
              </button>
            </div>
          </form>
        </section>
      )}

      {listQuery.isLoading ? (
        <div className="community-empty"><Recycle size={22} /><strong>Loading circular exchange listings…</strong></div>
      ) : listings.length === 0 ? (
        <div className="community-empty"><Recycle size={24} /><strong>No matching listings found</strong><span>Adjust filters or list your own farm compost/residue above.</span></div>
      ) : (
        <div className="waste-grid">
          {listings.map((item) => {
            const isOwner = user && item.userId === user.id;
            return (
              <article key={item.id} className="panel waste-card">
                <div className="waste-card-top">
                  <span className="status-pill green">{item.category.replace("_", " ")}</span>
                  <span className={`status-pill ${item.status === "active" ? "blue" : "amber"}`}>{item.status}</span>
                </div>
                <h3>{item.title}</h3>
                <p className="waste-desc">{item.description}</p>
                <div className="waste-specs">
                  <div><small>QUANTITY</small><b>{item.quantityKg.toLocaleString("en-IN")} kg</b></div>
                  <div><small>PRICE</small><b>{item.isFree || item.pricePerKg === 0 ? "Free Pickup" : `₹${item.pricePerKg}/kg`}</b></div>
                  <div><small>LOCATION</small><b>{item.location}, {item.district}</b></div>
                </div>
                <div className="waste-card-footer">
                  <small>Seller: {item.sellerName} · {item.inquiriesCount} inquiries</small>
                  <div className="waste-actions">
                    {isOwner && item.status === "active" && (
                      <button className="secondary-button" onClick={() => statusMutation.mutate({ id: item.id, status: "claimed" })}>
                        <CheckCircle2 size={13} /> Mark claimed
                      </button>
                    )}
                    <button className="primary-button" onClick={() => setContactListingId(contactListingId === item.id ? null : item.id)}>
                      <MessageSquare size={13} /> Contact seller
                    </button>
                  </div>
                </div>
                {contactListingId === item.id && (
                  <div className="waste-inquiry-box">
                    <div className="waste-phone-row"><Phone size={13} /> Seller phone: <strong>{item.contactPhone}</strong></div>
                    <input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Your phone number" />
                    <textarea rows={2} value={buyerMsg} onChange={(e) => setBuyerMsg(e.target.value)} placeholder="Quantity needed and pickup date…" />
                    <button
                      className="primary-button full-width"
                      disabled={inquireMutation.isPending || buyerMsg.trim().length < 4}
                      onClick={() => inquireMutation.mutate({ listingId: item.id, buyerPhone, message: buyerMsg })}
                    >
                      Send inquiry
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
