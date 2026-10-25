/* Wood's Cortina card — bundled with the HACS integration. No external JS dependencies.
 * Climate values are requests, never confirmed IR feedback.
 * Copyright (c) 2026 Jocke1970. */
(() => {
  "use strict";
  const TAG = "woods-cortina-card";
  const VERSION = "0.1.0b2";
  const MODES = [
    { value: "cool", label: "Kyla", icon: "mdi:snowflake" },
    { value: "dry", label: "Avfuktning", icon: "mdi:water-percent" },
    { value: "fan_only", label: "Fläkt", icon: "mdi:fan" },
  ];
  const FAN_NAMES = { low: "Låg", medium: "Medel", high: "Hög" };
  const htmlEscape = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const fmt = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(n) : "—";
  };
  const CSS = `
    :host{display:block;color:var(--primary-text-color,#f4f7fa);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);box-sizing:border-box}
    *{box-sizing:border-box}
    ha-card{overflow:hidden;border-radius:22px;background:var(--ha-card-background,var(--card-background-color,#18212b));border:1px solid var(--divider-color,rgba(140,160,185,.19));box-shadow:0 12px 34px rgba(0,0,0,.12)}
    .shell{padding:20px;position:relative}
    .hero{position:relative;overflow:hidden;border-radius:17px;padding:20px 20px 17px;background:linear-gradient(130deg,#102a3d 0%,#103d5b 53%,#153f59 100%);color:#f7fcff}
    .hero:before{content:"";position:absolute;top:-85px;right:-78px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(75,198,255,.24),transparent 68%);pointer-events:none}
    .hero[data-mode="dry"]{background:linear-gradient(130deg,#173445,#195665)}
    .hero[data-mode="fan_only"]{background:linear-gradient(130deg,#213c42,#245962)}
    .hero[data-mode="off"]{background:linear-gradient(130deg,#333d48,#424950)}
    .head,.hero-main,.room,.section-title,.bottom,.bottom .stamp{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .head{position:relative;z-index:1;align-items:flex-start}
    .brand{min-width:0}
    .eyebrow{font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:#bbd6e6;font-weight:700}
    .name{margin:6px 0 0;font-size:19px;font-weight:700;letter-spacing:-.03em;overflow-wrap:anywhere}
    .status{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:50px;background:rgba(255,255,255,.12);color:#e7f5ff;font-size:11px;white-space:nowrap}
    .dot{width:7px;height:7px;border-radius:50%;background:#7cdbbe;box-shadow:0 0 0 3px rgba(124,219,190,.14)}
    .status.off .dot{background:#aeb5be;box-shadow:none}
    .hero-main{position:relative;z-index:1;margin-top:24px;align-items:flex-end}
    .setpoint-caption,.minor-caption{font-size:11px;color:#c8e3f1;letter-spacing:.04em}
    .setpoint-row{display:flex;align-items:baseline;gap:5px;margin-top:4px}
    .setpoint-value{font-size:64px;line-height:1;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.07em}
    .setpoint-unit{font-size:24px;font-weight:500;opacity:.88}
    .dim{opacity:.48}
    .stepper{display:flex;gap:8px;padding-bottom:4px}
    button{font:inherit;cursor:pointer}
    button:focus-visible,summary:focus-visible{outline:3px solid #69bfff;outline-offset:3px}
    button:disabled{opacity:.32;cursor:not-allowed;filter:grayscale(.7)}
    .step{display:grid;place-items:center;width:46px;height:46px;border-radius:13px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font-size:26px;font-weight:300}
    .step:not(:disabled):hover{background:rgba(255,255,255,.23)}
    .room{position:relative;z-index:1;margin-top:24px;padding-top:13px;border-top:1px solid rgba(255,255,255,.18)}
    .room strong{font-size:18px;font-weight:650}
    .room .muted{color:#c9e0eb;font-size:11px}
    .hint{font-size:11px;color:var(--secondary-text-color,#8d9da7);margin-top:11px}
    .section{margin-top:19px}
    .section-title{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--secondary-text-color,#9aa7b0);font-weight:700;margin-bottom:10px}
    .modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .mode{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;min-height:83px;border-radius:13px;border:1px solid var(--divider-color,rgba(145,165,190,.21));background:rgba(118,145,165,.065);color:var(--primary-text-color,#eef6ff);font-size:12px;font-weight:600}
    .mode ha-icon{--mdc-icon-size:24px;color:#8cabbc}
    .mode.active{background:rgba(57,166,216,.14);border-color:#49a7ce;color:var(--primary-text-color,#f6fcff)}
    .mode.active ha-icon{color:#35acd4}
    .mode:not(:disabled):hover{border-color:#79bcd6}
    .main-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px}
    .power{display:flex;align-items:center;justify-content:center;gap:9px;border-radius:12px;padding:12px 16px;flex:1;background:#277c9c;border:1px solid #277c9c;color:white;font-size:13px;font-weight:700}
    .power.off{background:rgba(128,149,165,.10);border-color:var(--divider-color,rgba(140,160,185,.22));color:var(--primary-text-color,#f0f6fa)}
    .power ha-icon{--mdc-icon-size:18px}
    details{margin-top:14px;border-top:1px solid var(--divider-color,rgba(140,160,185,.23));padding-top:8px}
    summary{list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px 3px;font-size:12px;font-weight:650;color:var(--secondary-text-color,#aab8c6)}
    summary::-webkit-details-marker{display:none}
    summary:after{content:"⌄";font-size:19px;line-height:1}
    details[open] summary:after{transform:rotate(180deg)}
    .advanced{padding:7px 0 4px}
    .chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .chip{border-radius:10px;border:1px solid var(--divider-color,rgba(140,160,185,.25));background:transparent;color:var(--primary-text-color,#f7fbfe);min-height:37px;font-size:12px}
    .chip.active{color:#1d98c0;border-color:#3a9fc4;background:rgba(49,160,202,.10);font-weight:700}
    .row-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .row-title{font-size:11px;color:var(--secondary-text-color,#96a6b7);margin:15px 0 8px}
    .fineprint{font-size:11px;color:var(--secondary-text-color,#9bacb9);line-height:1.5;padding:11px 2px 1px}
    .bottom{border-top:1px solid var(--divider-color,rgba(140,160,185,.23));padding-top:13px;margin-top:16px;color:var(--secondary-text-color,#90a0b0);font-size:10px;align-items:flex-start}
    .bottom .stamp{justify-content:flex-end;gap:5px;flex-wrap:wrap;text-align:right}
    .error{margin-top:12px;padding:11px 12px;background:rgba(205,53,74,.10);border:1px solid rgba(205,53,74,.45);border-radius:10px;color:var(--error-color,#e46363);font-size:12px;line-height:1.4}
    .unavailable{padding:18px;color:var(--secondary-text-color,#999)}
    @media(max-width:360px){.shell{padding:12px}.hero{padding:15px}.setpoint-value{font-size:52px}.step{width:39px;height:43px}.mode{min-height:77px}.name{font-size:17px}}
    @media(prefers-reduced-motion:no-preference){.mode,.chip,.step,.power{transition:background .15s,border-color .15s,opacity .15s}}
  `;

  class WoodsCortinaCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = null;
      this._hass = null;
      this._busy = false;
      this._error = "";
      this._advanced = false;
      this.shadowRoot.addEventListener("click", (event) => this._handleClick(event));
      this.shadowRoot.addEventListener("toggle", (event) => {
        if (event.target && event.target.tagName === "DETAILS") this._advanced = event.target.open;
      }, true);
    }

    static getStubConfig() {
      return { entity: "climate.wood_s_cortina_12k_duo", name: "Wood's Cortina" };
    }

    setConfig(config) {
      if (!config || typeof config.entity !== "string" || !config.entity.startsWith("climate.")) {
        throw new Error("Wood's Cortina: ange ett climate-entity-id i entity.");
      }
      this._config = { entity: config.entity, name: config.name || "Wood's Cortina" };
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    getCardSize() { return this._advanced ? 8 : 5; }
    getGridOptions() { return { columns: 6, min_columns: 3, rows: this._advanced ? 7 : 5 }; }

    _entity() {
      return this._hass && this._config ? this._hass.states[this._config.entity] : null;
    }

    _isActiveMode(entity) {
      return Boolean(entity && entity.state !== "off" && entity.state !== "unavailable" && entity.state !== "unknown");
    }

    _allowed(entity, mode) {
      return Array.isArray(entity?.attributes?.hvac_modes) && entity.attributes.hvac_modes.includes(mode);
    }

    _render() {
      if (!this._config || !this._hass) return;
      const entity = this._entity();
      if (!entity || entity.state === "unavailable" || entity.state === "unknown") {
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div class="unavailable">Wood's Cortina: klimatentiteten är inte tillgänglig (${htmlEscape(this._config.entity)}).</div></ha-card>`;
        return;
      }
      const attr = entity.attributes || {};
      const on = this._isActiveMode(entity);
      const cooling = on && entity.state === "cool";
      const adjustable = cooling && !this._busy;
      const value = Number(attr.temperature);
      const target = Number.isFinite(value) ? value : 22;
      const room = attr.current_temperature == null ? "—" : fmt(attr.current_temperature) + " °C";
      const fanAvailable = on && entity.state !== "dry" && !this._busy;
      const modeButtons = MODES.filter((m) => this._allowed(entity, m.value))
        .map((m) => `<button class="mode ${entity.state === m.value ? "active" : ""}" type="button"
          data-action="mode" data-value="${m.value}" aria-pressed="${entity.state === m.value}"
          ${this._busy ? "disabled" : ""}><ha-icon icon="${m.icon}"></ha-icon><span>${m.label}</span></button>`).join("");
      const fanButtons = ["low", "medium", "high"]
        .filter((fan) => !Array.isArray(attr.fan_modes) || attr.fan_modes.includes(fan))
        .map((fan) => `<button class="chip ${attr.fan_mode === fan ? "active" : ""}" type="button"
          data-action="fan" data-value="${fan}" aria-pressed="${attr.fan_mode === fan}"
          ${!fanAvailable ? "disabled" : ""}>${FAN_NAMES[fan]}</button>`).join("");
      const swingButtons = ["off", "on"].map((v) =>
        `<button class="chip ${attr.swing_mode === v ? "active" : ""}" type="button" data-action="swing"
        data-value="${v}" aria-pressed="${attr.swing_mode === v}" ${!on || this._busy ? "disabled" : ""}>${v === "on" ? "På" : "Av"}</button>`).join("");
      const saver = attr.preset_mode === "energy_saver";
      const lastSent = attr.last_ir_sent_at ? new Date(attr.last_ir_sent_at) : null;
      const time = lastSent && !Number.isNaN(lastSent.valueOf()) ? lastSent.toLocaleString("sv-SE") : "Aldrig";
      const heroMode = on ? entity.state : "off";
      const statusText = !on ? "Avstängd" : entity.state === "cool" ? "Kyla aktiv" :
        entity.state === "dry" ? "Avfuktning" : "Fläkt";
      const disabledText = entity.state === "fan_only" || entity.state === "dry"
        ? "Temperaturinställning används inte i detta driftläge."
        : !on ? "Slå på kyla för att ändra temperaturen." : "Temperaturen regleras av AC:ns egen termostat.";
      this.shadowRoot.innerHTML = `
        <style>${CSS}</style>
        <ha-card>
          <div class="shell">
            <div class="hero" data-mode="${htmlEscape(heroMode)}">
              <div class="head">
                <div class="brand"><div class="eyebrow">KLIMATKONTROLL · IR</div>
                  <div class="name">${htmlEscape(this._config.name)}</div></div>
                <span class="status ${on ? "" : "off"}"><span class="dot"></span>${statusText}</span>
              </div>
              <div class="hero-main">
                <div>
                  <div class="setpoint-caption">${cooling ? "BÖRTEMPERATUR" : "SENASTE KYLBÖRVÄRDE"}</div>
                  <div class="setpoint-row ${cooling ? "" : "dim"}">
                    <span class="setpoint-value">${fmt(target)}</span><span class="setpoint-unit">°C</span>
                  </div>
                </div>
                <div class="stepper">
                  <button class="step" type="button" data-action="temp" data-value="-1" aria-label="Sänk temperaturen"
                    ${!adjustable || target <= Number(attr.min_temp ?? 17) ? "disabled" : ""}>−</button>
                  <button class="step" type="button" data-action="temp" data-value="1" aria-label="Höj temperaturen"
                    ${!adjustable || target >= Number(attr.max_temp ?? 30) ? "disabled" : ""}>+</button>
                </div>
              </div>
              <div class="room">
                <div><div class="minor-caption">RUMSTEMPERATUR</div><strong>${room}</strong></div>
                <div class="muted">Begärda inställningar<br>ej bekräftad AC-status</div>
              </div>
            </div>
            <div class="hint">${htmlEscape(disabledText)}</div>
            <div class="section">
              <div class="section-title"><span>Driftläge</span><span>${saver && cooling ? "ENERGY SAVER" : ""}</span></div>
              <div class="modes">${modeButtons}</div>
            </div>
            <div class="main-actions">
              <button type="button" class="power ${on ? "" : "off"}" data-action="power"
                ${this._busy ? "disabled" : ""}>
                <ha-icon icon="mdi:power"></ha-icon>${on ? "Stäng av" : "Slå på"}
              </button>
            </div>
            <details ${this._advanced ? "open" : ""}>
              <summary>Fler inställningar</summary>
              <div class="advanced">
                <div class="row-title">Fläkthastighet</div>
                <div class="chips">${fanButtons}</div>
                ${entity.state === "dry" ? '<div class="fineprint">I DRY styr AC:n normalt fläkthastigheten själv.</div>' : ""}
                <div class="row-title">Swing</div>
                <div class="row-buttons">${swingButtons}</div>
                <div class="row-title">Energisparläge</div>
                <div class="row-buttons">
                  <button class="chip ${saver ? "active" : ""}" type="button" data-action="saver"
                    data-value="${saver ? "none" : "energy_saver"}" aria-pressed="${saver}"
                    ${!cooling || this._busy ? "disabled" : ""}>${saver ? "Avaktivera" : "Aktivera"} Energy Saver</button>
                </div>
                <div class="fineprint">HEAT, Auto Clean och timer är ännu inte aktiverade.
                  IR-kommandon är enkelriktade; kortet visar senast begärt tillstånd.</div>
              </div>
            </details>
            ${this._error ? `<div class="error" role="alert">${htmlEscape(this._error)}</div>` : ""}
            <div class="bottom">
              <span>RM4 Mini · ${htmlEscape(VERSION)}</span>
              <span class="stamp"><ha-icon icon="mdi:send" style="--mdc-icon-size:13px"></ha-icon> Senast skickat: ${htmlEscape(time)}</span>
            </div>
          </div>
        </ha-card>
      `;
    }

    async _handleClick(event) {
      const button = event.target.closest?.("button[data-action]") ||
        event.composedPath?.().find((node) => node?.dataset?.action);
      if (!button || button.disabled || this._busy) return;
      const entity = this._entity();
      if (!entity || !this._hass || entity.state === "unavailable" || entity.state === "unknown") return;
      const action = button.dataset.action;
      const value = button.dataset.value;
      const on = this._isActiveMode(entity);
      const attr = entity.attributes || {};
      let service = "";
      let data = {};
      if (action === "power") {
        service = on ? "turn_off" : "turn_on";
      } else if (action === "mode" && this._allowed(entity, value)) {
        if (value === entity.state) return;
        service = "set_hvac_mode";
        data = { hvac_mode: value };
      } else if (action === "temp" && entity.state === "cool") {
        const step = Number(value);
        const t = Number(attr.temperature);
        const next = t + step;
        if (!Number.isFinite(next) || ![-1, 1].includes(step) ||
            next < Number(attr.min_temp ?? 17) || next > Number(attr.max_temp ?? 30)) return;
        service = "set_temperature";
        data = { temperature: next };
      } else if (action === "fan" && on && entity.state !== "dry" && ["low", "medium", "high"].includes(value)) {
        service = "set_fan_mode";
        data = { fan_mode: value };
      } else if (action === "swing" && on && ["off", "on"].includes(value)) {
        service = "set_swing_mode";
        data = { swing_mode: value };
      } else if (action === "saver" && entity.state === "cool" &&
                 ["none", "energy_saver"].includes(value)) {
        service = "set_preset_mode";
        data = { preset_mode: value };
      }
      if (!service) return;
      this._busy = true;
      this._error = "";
      this._render();
      try {
        await this._hass.callService("climate", service, { entity_id: this._config.entity, ...data });
      } catch (err) {
        this._error = err?.message || "Kunde inte skicka kommandot.";
      } finally {
        this._busy = false;
        this._render();
      }
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, WoodsCortinaCard);
  if (typeof window !== "undefined") {
    window.customCards = window.customCards || [];
    if (!window.customCards.some((c) => c.type === TAG)) {
      window.customCards.push({
        type: TAG,
        name: "Wood's Cortina",
        description: "Klimatkontroll för Wood's Cortina IR via RM4 Mini.",
        preview: false,
      });
    }
  }
})();
