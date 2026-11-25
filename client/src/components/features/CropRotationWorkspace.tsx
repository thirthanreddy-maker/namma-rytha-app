import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  RefreshCw, Leaf, ChevronDown, ChevronUp, Droplets, IndianRupee,
  CircleAlert, CheckCircle2, Sparkles
} from "lucide-react";

type RotationResult = {
  recommendations: Array<{
    rank: number;
    crop: string;
    reasoning: string;
    diseaseBreak: string;
    nutrientBenefit: string;
    waterRequirement: string;
    estimatedCostPerAcre: number;
    estimatedYieldQ: number;
    suitabilityScore: number;
  }>;
  rotationPrinciple: string;
  warnings: string[];
};

type Props = { onToast: (msg: string) => void };

const SOIL_TYPES = ["Red loam", "Clay loam", "Sandy loam", "Black cotton", "Loamy", "Alluvial"];
const IRRIGATION_LEVELS = ["Rainfed", "Assured irrigation", "Drip/Sprinkler", "Flood"];
const DISTRICTS = ["Kolar", "Chikkaballapur", "Bangalore Rural", "Tumkur", "Mysuru", "Mandya", "Hassan", "Davangere", "Belagavi", "Dharwad"];

export default function CropRotationWorkspace({ onToast }: Props) {
  const [form, setForm] = useState({
    previousCrop: "Tomato",
    soilType: "Red loam",
    soilPh: "6.5",
    irrigationLevel: "Drip/Sprinkler",
    diseaseHistory: "",
    district: "Kolar",
  });
  const [result, setResult] = useState<RotationResult | null>(null);
  const [expandedRank, setExpandedRank] = useState<number | null>(1);

  const recommendMut = trpc.cropRotation.recommend.useMutation({
    onSuccess: (data) => {
      setResult(data as RotationResult);
      setExpandedRank(1);
    },
    onError: (e) => onToast(e.message),
  });

  const submit = () => {
    recommendMut.mutate({
      previousCrop: form.previousCrop.trim(),
      soilType: form.soilType,
      soilPh: Number(form.soilPh),
      irrigationLevel: form.irrigationLevel,
      diseaseHistory: form.diseaseHistory.trim(),
      district: form.district,
    });
  };

  return (
    <div className="crop-rotation-workspace">
      <div className="panel cr-form-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">ROTATION INPUTS</span>
            <h3>Previous season details</h3>
          </div>
          <Leaf size={22} className="muted-icon" />
        </div>
        <div className="cr-form-grid">
          <label>Previous crop
            <input
              value={form.previousCrop}
              onChange={e => setForm(f => ({ ...f, previousCrop: e.target.value }))}
              placeholder="e.g. Tomato"
            />
          </label>
          <label>Soil type
            <select value={form.soilType} onChange={e => setForm(f => ({ ...f, soilType: e.target.value }))}>
              {SOIL_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Soil pH
            <input
              type="number" min="4" max="9" step="0.1"
              value={form.soilPh}
              onChange={e => setForm(f => ({ ...f, soilPh: e.target.value }))}
            />
          </label>
          <label>Irrigation level
            <select value={form.irrigationLevel} onChange={e => setForm(f => ({ ...f, irrigationLevel: e.target.value }))}>
              {IRRIGATION_LEVELS.map(i => <option key={i}>{i}</option>)}
            </select>
          </label>
          <label>District
            <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}>
              {DISTRICTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="cr-disease">Disease history (optional)
            <input
              value={form.diseaseHistory}
              onChange={e => setForm(f => ({ ...f, diseaseHistory: e.target.value }))}
              placeholder="e.g. Early blight last season"
            />
          </label>
        </div>
        <button
          className="primary-button"
          disabled={recommendMut.isPending}
          onClick={submit}
        >
          {recommendMut.isPending
            ? <><RefreshCw size={15} className="spin" /> Analyzing rotation…</>
            : <><Sparkles size={15} /> Get crop rotation recommendations</>
          }
        </button>
      </div>

      {result && (
        <div className="cr-results">
          <div className="cr-principle-banner">
            <Leaf size={16} />
            <span>{result.rotationPrinciple}</span>
          </div>

          {result.warnings.length > 0 && (
            <div className="cr-warnings">
              {result.warnings.map((w, i) => (
                <div key={i} className="cr-warning-item">
                  <CircleAlert size={14} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="cr-cards">
            {result.recommendations.map(rec => {
              const isOpen = expandedRank === rec.rank;
              return (
                <div key={rec.rank} className={`cr-card rank-${rec.rank}`}>
                  <div className="cr-card-header" onClick={() => setExpandedRank(isOpen ? null : rec.rank)}>
                    <div className="cr-rank-badge">#{rec.rank}</div>
                    <div className="cr-card-title">
                      <strong>{rec.crop}</strong>
                      <div className="cr-score-bar">
                        <div className="cr-score-fill" style={{ width: `${rec.suitabilityScore}%` }} />
                      </div>
                      <small>Suitability: {rec.suitabilityScore}/100</small>
                    </div>
                    <div className="cr-card-meta">
                      <span><Droplets size={12} />{rec.waterRequirement}</span>
                      <span><IndianRupee size={12} />₹{rec.estimatedCostPerAcre.toLocaleString("en-IN")}/acre</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  {isOpen && (
                    <div className="cr-card-detail">
                      <p className="cr-reasoning">{rec.reasoning}</p>
                      <div className="cr-benefits">
                        <div>
                          <span className="eyebrow">DISEASE BREAK</span>
                          <p><CheckCircle2 size={13} className="positive-icon" />{rec.diseaseBreak}</p>
                        </div>
                        <div>
                          <span className="eyebrow">NUTRIENT BENEFIT</span>
                          <p><CheckCircle2 size={13} className="positive-icon" />{rec.nutrientBenefit}</p>
                        </div>
                      </div>
                      <div className="cr-estimate">
                        <span>Estimated yield: <strong>{rec.estimatedYieldQ} q/acre</strong></span>
                        <span>Est. revenue: <strong>₹{(rec.estimatedYieldQ * 2200).toLocaleString("en-IN")}</strong> <small>(at benchmark price)</small></span>
                      </div>
                      <small className="data-source-note">Estimates based on CROP_CATALOG agronomic data. Actual results depend on field conditions.</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!result && !recommendMut.isPending && (
        <div className="feature-empty">
          <Leaf size={28} />
          <strong>Intelligent crop rotation recommendations</strong>
          <span>Fill in your previous season details above to get ranked crop suggestions that break disease cycles and improve soil health.</span>
        </div>
      )}
    </div>
  );
}
