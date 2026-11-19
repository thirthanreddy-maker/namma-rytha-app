import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, MapPin, Sprout } from "lucide-react";

type Plot = { id: number; name: string; crop: string };
type Draft = { plotId: string; crop: string; sowingDate: string; expectedHarvestDate: string };

type Props = {
  plots: Plot[];
  draft: Draft;
  isPending: boolean;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const steps = [
  { label: "Field", detail: "Choose plot" },
  { label: "Season", detail: "Set dates" },
  { label: "Review", detail: "Confirm" },
];

export default function CropCycleWizard({ plots, draft, isPending, onChange, onCancel, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    if (!draft.plotId) result.plotId = "Choose the plot this crop cycle belongs to.";
    if (!draft.crop.trim()) result.crop = "Enter a crop name.";
    if (!draft.sowingDate) result.sowingDate = "Choose a sowing date.";
    if (!draft.expectedHarvestDate) result.expectedHarvestDate = "Choose an expected harvest date.";
    if (draft.sowingDate && draft.expectedHarvestDate && draft.expectedHarvestDate <= draft.sowingDate) result.expectedHarvestDate = "Harvest date must be after sowing date.";
    return result;
  }, [draft]);
  const selectedPlot = plots.find((plot) => String(plot.id) === draft.plotId);
  const stepHasErrors = step === 0 ? Boolean(errors.plotId || errors.crop) : step === 1 ? Boolean(errors.sowingDate || errors.expectedHarvestDate) : Object.keys(errors).length > 0;
  const next = () => {
    setAttempted(true);
    if (stepHasErrors) return;
    setStep((current) => Math.min(2, current + 1));
    setAttempted(false);
  };
  const back = () => { setAttempted(false); setStep((current) => Math.max(0, current - 1)); };

  return <div className="cycle-wizard" aria-label="Create crop cycle">
    <div className="cycle-wizard-header"><div><span className="eyebrow">NEW CROP CYCLE</span><h4>Plan a season in three steps</h4><p>We’ll use these dates for your calendar and irrigation reminders.</p></div><button className="cycle-wizard-close" onClick={onCancel} aria-label="Close crop cycle form">×</button></div>
    <div className="cycle-progress" role="list" aria-label="Crop cycle progress">{steps.map((item, index) => <div className={`cycle-progress-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`} key={item.label} role="listitem"><span>{index < step ? <Check size={13} /> : index + 1}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></div>)}</div>
    {step === 0 && <div className="cycle-wizard-body"><div className="wizard-section-icon"><MapPin size={17} /></div><div><h5>Where is this cycle growing?</h5><p>Select a saved plot so the season stays linked to your sensor readings.</p></div><label>Plot<select value={draft.plotId} onChange={(event) => onChange({ ...draft, plotId: event.target.value })}><option value="">Choose a plot</option>{plots.map((plot) => <option value={plot.id} key={plot.id}>{plot.name} · {plot.crop}</option>)}</select>{attempted && errors.plotId && <small className="field-error">{errors.plotId}</small>}</label><label>Crop name<input value={draft.crop} onChange={(event) => onChange({ ...draft, crop: event.target.value })} placeholder="e.g. Tomato" />{attempted && errors.crop && <small className="field-error">{errors.crop}</small>}</label></div>}
    {step === 1 && <div className="cycle-wizard-body"><div className="wizard-section-icon"><CalendarDays size={17} /></div><div><h5>Set the season timeline</h5><p>Use your best estimate; you can adjust the plan later.</p></div><label>Sowing date<input type="date" max={draft.expectedHarvestDate || undefined} value={draft.sowingDate} onChange={(event) => onChange({ ...draft, sowingDate: event.target.value })} />{attempted && errors.sowingDate && <small className="field-error">{errors.sowingDate}</small>}</label><label>Expected harvest date<input type="date" min={draft.sowingDate || today} value={draft.expectedHarvestDate} onChange={(event) => onChange({ ...draft, expectedHarvestDate: event.target.value })} />{attempted && errors.expectedHarvestDate && <small className="field-error">{errors.expectedHarvestDate}</small>}</label></div>}
    {step === 2 && <div className="cycle-wizard-body cycle-review"><div className="wizard-section-icon"><Sprout size={17} /></div><div><h5>Ready to save this cycle?</h5><p>Review the details before adding them to your farm calendar.</p></div><div className="cycle-review-grid"><span>Plot<strong>{selectedPlot?.name ?? "Not selected"}</strong></span><span>Crop<strong>{draft.crop || "Not set"}</strong></span><span>Sowing<strong>{draft.sowingDate ? new Date(`${draft.sowingDate}T00:00:00`).toLocaleDateString("en-IN") : "Not set"}</strong></span><span>Harvest<strong>{draft.expectedHarvestDate ? new Date(`${draft.expectedHarvestDate}T00:00:00`).toLocaleDateString("en-IN") : "Not set"}</strong></span></div>{attempted && stepHasErrors && <small className="field-error">Please go back and complete the highlighted fields.</small>}</div>}
    <div className="cycle-wizard-actions"><button className="secondary-button" onClick={step === 0 ? onCancel : back}>{step === 0 ? "Cancel" : <><ChevronLeft size={15} /> Back</>}</button>{step < 2 ? <button className="primary-button" onClick={next}>Continue <ChevronRight size={15} /></button> : <button className="primary-button" onClick={() => { setAttempted(true); if (!stepHasErrors) onSubmit(); }} disabled={isPending}>{isPending ? "Saving cycle…" : <>Save crop cycle <Check size={15} /></>}</button>}</div>
  </div>;
}
