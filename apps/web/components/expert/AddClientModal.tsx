"use client";

import { useState, useEffect } from "react";
import type { Platform, PlanType } from "@bia-ops/shared";
import { Icon } from "@/components/shared/Icon";

interface ClientFormData {
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  country: string;
  plan_type: PlanType;
  plan_price: number;
  business_type: string;
  category: string;
  active_platforms: Platform[];
  meta_ad_account_id: string;
  additional_notes: string;
}

const PLAN_PRICES: Record<PlanType, number> = {
  sprint: 280,
  escalado: 650,
  enterprise: 0
};

const COUNTRIES = ["Colombia", "Ecuador", "Mexico", "Peru", "Chile", "USA", "Otro"];
const BUSINESS_TYPES = ["E-commerce", "Servicios", "Info producto", "Otro"];

interface Props {
  onClose: () => void;
  onCreated: (name: string) => void;
}

const EMPTY_FORM: ClientFormData = {
  business_name: "",
  contact_name: "",
  email: "",
  whatsapp: "",
  country: "Colombia",
  plan_type: "sprint",
  plan_price: 280,
  business_type: "E-commerce",
  category: "",
  active_platforms: [],
  meta_ad_account_id: "",
  additional_notes: ""
};

export function AddClientModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setStep(1);
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError(null);
  }, []);

  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);

  function set<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handlePlanChange(plan: PlanType) {
    setForm((prev) => ({ ...prev, plan_type: plan, plan_price: PLAN_PRICES[plan] }));
  }

  function togglePlatform(platform: Platform) {
    setForm((prev) => ({
      ...prev,
      active_platforms: prev.active_platforms.includes(platform)
        ? prev.active_platforms.filter((p) => p !== platform)
        : [...prev.active_platforms, platform]
    }));
  }

  function validateStep1(): boolean {
    const next: typeof errors = {};
    if (!form.business_name.trim()) next.business_name = "Obligatorio";
    if (!form.contact_name.trim()) next.contact_name = "Obligatorio";
    if (!form.email.trim()) next.email = "Obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Email invalido";
    if (form.plan_type === "enterprise" && !form.plan_price) next.plan_price = "Ingresa el precio";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (validateStep1()) setStep(2);
  }

  async function handleSubmit(event: React.FormEvent | React.MouseEvent) {
    event.preventDefault();
    setLoading(true);
    setServerError(null);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = (await response.json()) as { ok: boolean; error?: string; client?: { business_name: string } };
      if (data.ok && data.client) {
        onCreated(data.client.business_name);
        onClose();
      } else {
        setServerError(data.error ?? "Error al crear cliente");
      }
    } catch {
      setServerError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "#111111",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "32px 32px 28px"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#8930D6", marginBottom: 6, textTransform: "uppercase" }}>
              Paso {step} de 2
            </div>
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontStyle: "italic",
                fontWeight: 900,
                textTransform: "uppercase",
                fontSize: 22,
                margin: 0,
                color: "#fff",
                letterSpacing: 1
              }}
            >
              {step === 1 ? "Agregar cliente" : "Contexto del negocio"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4, marginTop: -2 }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 4,
                background: step >= s ? "#8930D6" : "#2a2a2a",
                transition: "background 0.2s"
              }}
            />
          ))}
        </div>

        <div>
          {step === 1 ? (
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Nombre del negocio *" error={errors.business_name}>
                <input
                  className="input"
                  placeholder="Ej: FitAndGo Colombia"
                  value={form.business_name}
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </Field>

              <Field label="Nombre del contacto *" error={errors.contact_name}>
                <input
                  className="input"
                  placeholder="Ej: Valentina Rojas"
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </Field>

              <Field label="Email *" error={errors.email}>
                <input
                  className="input"
                  type="email"
                  placeholder="cliente@empresa.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>

              <Field label="WhatsApp (con codigo de pais)" error={errors.whatsapp}>
                <input
                  className="input"
                  placeholder="+57 300 000 0000"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                />
              </Field>

              <Field label="Pais" error={undefined}>
                <select
                  className="select"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  style={{ width: "100%" }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Plan" error={undefined}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(["sprint", "escalado", "enterprise"] as PlanType[]).map((plan) => (
                    <label
                      key={plan}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: `1px solid ${form.plan_type === plan ? "#8930D6" : "#2a2a2a"}`,
                        background: form.plan_type === plan ? "#1a0a2e" : "transparent",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan}
                        checked={form.plan_type === plan}
                        onChange={() => handlePlanChange(plan)}
                        style={{ accentColor: "#8930D6" }}
                      />
                      {plan === "sprint" ? "Sprint $280" : plan === "escalado" ? "Escalado $650" : "Enterprise"}
                    </label>
                  ))}
                </div>
              </Field>

              {form.plan_type === "enterprise" ? (
                <Field label="Precio del plan *" error={errors.plan_price}>
                  <input
                    className="input"
                    type="number"
                    placeholder="Precio personalizado"
                    value={form.plan_price || ""}
                    onChange={(e) => set("plan_price", Number(e.target.value))}
                  />
                </Field>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Tipo de negocio" error={undefined}>
                <select
                  className="select"
                  value={form.business_type}
                  onChange={(e) => set("business_type", e.target.value)}
                  style={{ width: "100%" }}
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <Field label="Categoria / nicho" error={undefined}>
                <input
                  className="input"
                  placeholder="Ej: Suplementos deportivos, Agencia de viajes..."
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                />
              </Field>

              <Field label="Plataformas activas" error={undefined}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 4 }}>
                  {(["meta", "google", "tiktok"] as Platform[]).map((platform) => (
                    <label
                      key={platform}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        color: "#ccc",
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.active_platforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        style={{ accentColor: "#8930D6", width: 16, height: 16 }}
                      />
                      {platform === "meta" ? "Meta Ads" : platform === "google" ? "Google Ads" : "TikTok Ads"}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Meta Ad Account ID (opcional)" error={undefined}>
                <input
                  className="input"
                  placeholder="act_XXXXXXXXXXXXXXXXX"
                  value={form.meta_ad_account_id}
                  onChange={(e) => set("meta_ad_account_id", e.target.value)}
                />
              </Field>

              <Field label="Notas adicionales" error={undefined}>
                <textarea
                  className="textarea"
                  placeholder="Contexto adicional sobre el cliente o la cuenta..."
                  value={form.additional_notes}
                  onChange={(e) => set("additional_notes", e.target.value)}
                  rows={4}
                />
              </Field>
            </div>
          )}

          {serverError ? (
            <div style={{ background: "#2a0a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginTop: 8 }}>
              {serverError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 28 }}>
            <button
              type="button"
              className="ghost-button"
              onClick={step === 1 ? onClose : () => setStep(1)}
              disabled={loading}
            >
              {step === 1 ? "Cancelar" : "← Atras"}
            </button>
            {step === 1 ? (
              <button
                type="button"
                className="button"
                onClick={handleNext}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                className="button"
                disabled={loading}
                onClick={(e) => { void handleSubmit(e); }}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <Icon name="refresh" size={16} className="spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Icon name="person_add" size={16} />
                    Crear cliente
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#aaa", letterSpacing: 0.5 }}>{label}</label>
      {children}
      {error ? <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span> : null}
    </div>
  );
}
