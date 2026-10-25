/* Wood's Cortina card — bundled with the HACS integration. No external JS dependencies.
 * Climate values are requests, never confirmed IR feedback.
 * Copyright (c) 2026 Jocke1970. */
(() => {
  "use strict";
  const TAG = "woods-cortina-card";
  const VERSION = "2026.10.0b4";
  const MODES = [
    { value: "cool", label: "Kyla", icon: "mdi:snowflake" },
    { value: "dry", label: "Avfuktning", icon: "mdi:water-percent" },
    { value: "fan_only", label: "Fläkt", icon: "mdi:fan" },
  ];
  const FAN_NAMES = { low: "Låg", medium: "Medel", high: "Hög" };
  const DEFAULT_SENSORS = Object.freeze({
    power_entity: "switch.woods_cortina_silent_12k_duo",
    power_sensor: "sensor.woods_cortina_silent_12k_duo_power",
    energy_daily: "sensor.woods_cortina_silent_12k_duo_energy_daily",
    energy_monthly: "sensor.woods_cortina_silent_12k_duo_energy_monthly",
  });
  const formatReading = (entity, maxDigits = 1) => {
    if (!entity || ["unknown", "unavailable", ""].includes(entity.state)) return "—";
    const number = Number(entity.state);
    if (!Number.isFinite(number)) return "—";
    const value = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: maxDigits }).format(number);
    const unit = entity.attributes?.unit_of_measurement;
    return value + (typeof unit === "string" && unit ? " " + unit : "");
  };
  const htmlEscape = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const fmt = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(n) : "—";
  };
  const CSS = `
    :host{display:block;container-type:inline-size;color:var(--primary-text-color,#f4f7fa);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);box-sizing:border-box;min-width:0}
    *{box-sizing:border-box;min-width:0}
    ha-card{display:block;overflow:hidden;width:100%;border-radius:20px;background:var(--ha-card-background,var(--card-background-color,#18212b));border:1px solid var(--divider-color,rgba(140,160,185,.19));box-shadow:0 12px 34px rgba(0,0,0,.12)}
    .shell{padding:clamp(10px,4cqi,20px);width:100%;min-width:0}
    .hero{position:relative;overflow:hidden;isolation:isolate;border-radius:16px;padding:clamp(13px,4.5cqi,20px);background:linear-gradient(130deg,#102a3d 0%,#103d5b 53%,#153f59 100%);color:#f7fcff}
    .hero:before{content:"";position:absolute;top:-85px;right:-78px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(75,198,255,.24),transparent 68%);pointer-events:none;z-index:-1}
    .hero[data-mode="dry"]{background:linear-gradient(130deg,#173445,#195665)}
    .hero[data-mode="fan_only"]{background:linear-gradient(130deg,#213c42,#245962)}
    .hero[data-mode="off"]{background:linear-gradient(130deg,#333d48,#424950)}
    .head{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
    .brand{min-width:0;max-width:100%}
    .eyebrow{font-size:10px;letter-spacing:.10em;text-transform:uppercase;color:#bbd6e6;font-weight:700;overflow-wrap:anywhere}
    .name{margin:5px 0 0;font-size:clamp(16px,5.4cqi,20px);font-weight:700;letter-spacing:-.03em;overflow-wrap:anywhere;line-height:1.24}
    .status{display:inline-flex;max-width:100%;align-items:center;gap:6px;padding:5px 10px;border-radius:50px;background:rgba(255,255,255,.12);color:#e7f5ff;font-size:10.5px;white-space:nowrap}
    .dot{width:7px;height:7px;flex:none;border-radius:50%;background:#7cdbbe;box-shadow:0 0 0 3px rgba(124,219,190,.14)}
    .status.off .dot{background:#aeb5be;box-shadow:none}
    .hero-main{position:relative;margin-top:19px;display:grid;grid-template-columns:minmax(0,1fr);gap:13px}
    .setpoint-caption,.minor-caption{font-size:10px;color:#c8e3f1;letter-spacing:.06em}
    .setpoint-row{display:flex;align-items:baseline;gap:4px;margin-top:4px;white-space:nowrap}
    .setpoint-value{font-size:clamp(44px,16cqi,64px);line-height:1;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.07em}
    .setpoint-unit{font-size:22px;font-weight:500;opacity:.88}
    .dim{opacity:.48}
    .stepper{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;width:100%;align-self:end}
    button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    button:focus-visible,summary:focus-visible{outline:3px solid #69bfff;outline-offset:3px}
    button:disabled{opacity:.32;cursor:not-allowed;filter:grayscale(.7)}
    .step{display:grid;place-items:center;min-height:42px;width:100%;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font-size:26px;font-weight:300}
    .step:not(:disabled):hover{background:rgba(255,255,255,.23)}
    .room{position:relative;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:20px;padding-top:12px;border-top:1px solid rgba(255,255,255,.18)}
    .room strong{display:block;margin-top:3px;font-size:18px;font-weight:650}
    .room .muted{color:#c9e0eb;font-size:10px;line-height:1.35;overflow-wrap:anywhere}
    .hint{font-size:11px;color:var(--secondary-text-color,#8d9da7);margin-top:10px;line-height:1.45}
    .section{margin-top:18px}
    .section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--secondary-text-color,#9aa7b0);font-weight:700;margin-bottom:10px}
    .modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .mode{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;min-width:0;min-height:75px;padding:6px 2px;border-radius:11px;border:1px solid var(--divider-color,rgba(145,165,190,.21));background:rgba(118,145,165,.065);color:var(--primary-text-color,#eef6ff);font-size:clamp(10px,3.3cqi,12px);font-weight:600;overflow-wrap:anywhere}
    .mode span{max-width:100%;text-align:center}
    .mode ha-icon{--mdc-icon-size:22px;color:#8cabbc}
    .mode.active{background:rgba(57,166,216,.14);border-color:#49a7ce;color:var(--primary-text-color,#f6fcff)}
    .mode.active ha-icon{color:#35acd4}
    .mode:not(:disabled):hover{border-color:#79bcd6}
    .main-actions{display:flex;gap:10px;margin-top:15px}
    .supply{margin-top:15px;padding:12px;border:1px solid var(--divider-color,rgba(140,160,185,.22));border-radius:14px;background:rgba(103,139,161,.06)}
    .supply-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
    .supply-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.03em}
    .supply-label ha-icon{--mdc-icon-size:17px;color:var(--secondary-text-color,#8fabb5)}
    .supply-state{font-size:10px;color:var(--secondary-text-color,#a4b1bd)}
    .supply-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center}
    .watts-label,.energy-label{font-size:10px;color:var(--secondary-text-color,#8ba1af);line-height:1.35}
    .watts-value{font-size:clamp(20px,8cqi,29px);line-height:1.25;font-weight:750;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
    .mains-button{min-height:42px;border:1px solid rgba(50,145,171,.45);background:rgba(39,124,156,.12);color:var(--primary-text-color,#fff);border-radius:11px;padding:8px 9px;display:flex;justify-content:center;align-items:center;gap:5px;font-size:11px;font-weight:700}
    .mains-button ha-icon{--mdc-icon-size:18px}
    .mains-button.is-on{border-color:rgba(214,127,93,.43);background:rgba(180,96,68,.09)}
    .mains-button.confirm{background:rgba(201,111,67,.18);border-color:#db8550}
    .energy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}
    .energy-cell{padding:9px 8px;background:rgba(128,159,178,.07);border:1px solid var(--divider-color,rgba(128,159,178,.14));border-radius:10px;min-width:0}
    .energy-value{font-size:13px;font-weight:700;margin-top:3px;line-height:1.35;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
    .supply-warning{margin-top:9px;font-size:10px;color:var(--secondary-text-color,#a4b0b8);line-height:1.45}
    .supply-warning.urgent{color:var(--error-color,#db876b);font-weight:600}
    .power{display:flex;align-items:center;justify-content:center;gap:9px;min-height:44px;border-radius:12px;padding:10px 13px;flex:1;background:#277c9c;border:1px solid #277c9c;color:white;font-size:12px;font-weight:700}
    .power.off{background:rgba(128,149,165,.10);border-color:var(--divider-color,rgba(140,160,185,.22));color:var(--primary-text-color,#f0f6fa)}
    .power ha-icon{--mdc-icon-size:18px}
    details{margin-top:13px;border-top:1px solid var(--divider-color,rgba(140,160,185,.23));padding-top:7px}
    summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:10px 2px;font-size:12px;font-weight:650;color:var(--secondary-text-color,#aab8c6)}
    summary::-webkit-details-marker{display:none}
    summary:after{content:"⌄";font-size:19px;line-height:1;flex:none}
    details[open] summary:after{transform:rotate(180deg)}
    .advanced{padding:7px 0 4px}
    .chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .chip{min-width:0;border-radius:10px;border:1px solid var(--divider-color,rgba(140,160,185,.25));background:transparent;color:var(--primary-text-color,#f7fbfe);min-height:37px;padding:6px 4px;font-size:11px;overflow-wrap:anywhere}
    .chip.active{color:#1d98c0;border-color:#3a9fc4;background:rgba(49,160,202,.10);font-weight:700}
    .row-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .row-title{font-size:11px;color:var(--secondary-text-color,#96a6b7);margin:15px 0 8px}
    .fineprint{font-size:10.5px;color:var(--secondary-text-color,#9bacb9);line-height:1.5;padding:11px 2px 1px}
    .bottom{display:flex;flex-direction:column;gap:5px;border-top:1px solid var(--divider-color,rgba(140,160,185,.23));padding-top:12px;margin-top:14px;color:var(--secondary-text-color,#90a0b0);font-size:10px;overflow-wrap:anywhere}
    .bottom .stamp{display:flex;align-items:center;gap:5px;flex-wrap:wrap;line-height:1.3}
    .notice{margin-top:11px;padding:9px 11px;background:rgba(39,124,156,.11);border:1px solid rgba(39,124,156,.30);border-radius:10px;color:var(--primary-text-color,#dde9ef);font-size:11px;line-height:1.4}
    .error{margin-top:11px;padding:9px 11px;background:rgba(205,53,74,.10);border:1px solid rgba(205,53,74,.45);border-radius:10px;color:var(--error-color,#e46363);font-size:11px;line-height:1.4}
    .unavailable{padding:18px;color:var(--secondary-text-color,#999)}
    @container (min-width:355px){
      .head{flex-direction:row;align-items:flex-start}
      .status{margin-top:2px}
      .hero-main{grid-template-columns:minmax(0,1fr) auto;align-items:end}
      .stepper{width:auto;grid-template-columns:repeat(2,43px)}
      .room{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}
      .room .muted{text-align:right}
      .bottom{flex-direction:row;justify-content:space-between}
      .bottom .stamp{justify-content:flex-end}
      .mode{min-height:81px}
    }
    @container (max-width:210px){
      .setpoint-value{font-size:42px}
      .modes{gap:4px}
      .mode{font-size:9.5px}
    }
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
      this._notice = "";
      this._confirmMainsOff = false;
      this._advanced = false;
      this.shadowRoot.addEventListener("toggle", (event) => {
        if (event.target && event.target.tagName === "DETAILS") this._advanced = event.target.open;
      }, true);
    }

    static getStubConfig() {
      return { entity: "climate.wood_s_cortina_12k_duo", name: "Wood's Cortina", ...DEFAULT_SENSORS };
    }

    setConfig(config) {
      if (!config || typeof config.entity !== "string" || !config.entity.startsWith("climate.")) {
        throw new Error("Wood's Cortina: ange ett climate-entity-id i entity.");
      }
      const extras = {};
      for (const [key, fallback] of Object.entries(DEFAULT_SENSORS)) {
        const value = config[key] === undefined ? fallback : config[key];
        const prefix = key === "power_entity" ? "switch." : "sensor.";
        if (typeof value !== "string" || !value.startsWith(prefix)) {
          throw new Error("Wood's Cortina: ogiltig entitet för " + key);
        }
        extras[key] = value;
      }
      this._config = { entity: config.entity, name: config.name || "Wood's Cortina", ...extras };
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    getCardSize() { return this._advanced ? 10 : 7; }
    getGridOptions() { return { columns: 6, min_columns: 3, rows: this._advanced ? 9 : 7 }; }

    _entity() {
      return this._hass && this._config ? this._hass.states[this._config.entity] : null;
    }

    _mainsEntity() {
      return this._hass && this._config ? this._hass.states[this._config.power_entity] : null;
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
      const mains = this._mainsEntity();
      const mainsOnline = mains && (mains.state === "on" || mains.state === "off");
      const mainsOff = mains?.state === "off";
      const mainsOn = mains?.state === "on";
      const watts = formatReading(this._hass.states[this._config.power_sensor], 1);
      const daily = formatReading(this._hass.states[this._config.energy_daily], 2);
      const monthly = formatReading(this._hass.states[this._config.energy_monthly], 2);
      const on = this._isActiveMode(entity);
      const cooling = on && entity.state === "cool";
      const adjustable = cooling && !this._busy && !mainsOff;
      const value = Number(attr.temperature);
      const target = Number.isFinite(value) ? value : 22;
      const room = attr.current_temperature == null ? "—" : fmt(attr.current_temperature) + " °C";
      const fanAvailable = on && entity.state !== "dry" && !this._busy && !mainsOff;
      const modeButtons = MODES.filter((m) => this._allowed(entity, m.value))
        .map((m) => `<button class="mode ${entity.state === m.value ? "active" : ""}" type="button"
          data-action="mode" data-value="${m.value}" aria-pressed="${entity.state === m.value}"
          ${this._busy || mainsOff ? "disabled" : ""}><ha-icon icon="${m.icon}"></ha-icon><span>${m.label}</span></button>`).join("");
      const fanButtons = ["low", "medium", "high"]
        .filter((fan) => !Array.isArray(attr.fan_modes) || attr.fan_modes.includes(fan))
        .map((fan) => `<button class="chip ${attr.fan_mode === fan ? "active" : ""}" type="button"
          data-action="fan" data-value="${fan}" aria-pressed="${attr.fan_mode === fan}"
          ${!fanAvailable ? "disabled" : ""}>${FAN_NAMES[fan]}</button>`).join("");
      const swingButtons = ["off", "on"].map((v) =>
        `<button class="chip ${attr.swing_mode === v ? "active" : ""}" type="button" data-action="swing"
        data-value="${v}" aria-pressed="${attr.swing_mode === v}" ${!on || this._busy || mainsOff ? "disabled" : ""}>${v === "on" ? "På" : "Av"}</button>`).join("");
      const saver = attr.preset_mode === "energy_saver";
      const lastSent = attr.last_ir_sent_at ? new Date(attr.last_ir_sent_at) : null;
      const time = lastSent && !Number.isNaN(lastSent.valueOf())
        ? lastSent.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "Aldrig";
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
            ${!cooling ? `<div class="hint">${htmlEscape(disabledText)}</div>` : ""}
            <div class="supply">
              <div class="supply-head">
                <span class="supply-label"><ha-icon icon="mdi:power-plug"></ha-icon> Strömförsörjning</span>
                <span class="supply-state">${mainsOn ? "Ström på" : mainsOff ? "Ström av" : "Okänd status"}</span>
              </div>
              <div class="supply-top">
                <div><div class="watts-label">Aktuell effekt</div><div class="watts-value">${htmlEscape(watts)}</div></div>
                <button type="button" class="mains-button ${mainsOn ? "is-on" : ""} ${this._confirmMainsOff ? "confirm" : ""}"
                  data-action="mains" aria-label="Smartplugg: ${mainsOn ? "bryt ström" : "slå på ström"}"
                  ${!mainsOnline || this._busy ? "disabled" : ""}>
                  <ha-icon icon="mdi:power-socket-eu"></ha-icon>
                  ${this._confirmMainsOff ? "Bekräfta av" : mainsOn ? "Bryt ström" : "Slå på ström"}
                </button>
              </div>
              <div class="energy-grid">
                <div class="energy-cell"><div class="energy-label">Idag</div><div class="energy-value">${htmlEscape(daily)}</div></div>
                <div class="energy-cell"><div class="energy-label">Denna månad</div><div class="energy-value">${htmlEscape(monthly)}</div></div>
              </div>
              <div class="supply-warning ${this._confirmMainsOff ? "urgent" : ""}">
                ${this._confirmMainsOff
                  ? "VARNING: Bryt inte ström medan AC:n arbetar. Stoppa via IR och låt apparaten stanna först. Tryck igen endast om du är säker."
                  : "Strömknappen styr smartpluggen, inte AC:ns IR-läge."}
              </div>
            </div>
            <div class="section">
              <div class="section-title"><span>Driftläge</span><span>${saver && cooling ? "ENERGY SAVER" : ""}</span></div>
              <div class="modes">${modeButtons}</div>
            </div>
            <div class="main-actions">
              <button type="button" class="power ${on ? "" : "off"}" data-action="power"
                ${this._busy || mainsOff ? "disabled" : ""}>
                <ha-icon icon="mdi:power"></ha-icon>${on ? "Stoppa AC via IR" : "Starta AC via IR"}
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
                    ${!cooling || this._busy || mainsOff ? "disabled" : ""}>${saver ? "Avaktivera" : "Aktivera"} Energy Saver</button>
                </div>
                <div class="fineprint">HEAT, Auto Clean och timer är ännu inte aktiverade.
                  IR-kommandon är enkelriktade; kortet visar senast begärt tillstånd.</div>
              </div>
            </details>
            ${this._notice ? `<div class="notice" role="status" aria-live="polite">${htmlEscape(this._notice)}</div>` : ""}
            ${this._error ? `<div class="error" role="alert">${htmlEscape(this._error)}</div>` : ""}
            <div class="bottom">
              <span>RM4 Mini · ${htmlEscape(VERSION)}</span>
              <span class="stamp" title="${htmlEscape(lastSent ? lastSent.toLocaleString("sv-SE") : "Aldrig")}"><ha-icon icon="mdi:send" style="--mdc-icon-size:13px"></ha-icon> Senaste IR-begäran: ${htmlEscape(time)}</span>
            </div>
          </div>
        </ha-card>
      `;
      // Bind the current, real DOM buttons after every render. The previous
      // root-delegated handler was insufficiently observable in HA cards.
      // Rebinding is safe because every render replaces these button nodes.
      this.shadowRoot.querySelectorAll("button[data-action]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          void this._handleClick({ currentTarget: button, target: button });
        });
      });
    }

    async _handleClick(event) {
      const button = event.currentTarget?.dataset?.action ? event.currentTarget
        : event.target?.closest?.("button[data-action]") ||
          event.composedPath?.().find((node) => node?.dataset?.action);
      if (!button || button.disabled || this._busy) return;
      const entity = this._entity();
      if (!entity || !this._hass || entity.state === "unavailable" || entity.state === "unknown") return;
      const action = button.dataset.action;
      const value = button.dataset.value;
      const mains = this._mainsEntity();
      if (action !== "mains" && mains?.state === "off") {
        this._error = "Smartpluggen är avstängd. Slå på strömmen innan IR-styrning.";
        this._notice = "";
        this._render();
        return;
      }
      const on = this._isActiveMode(entity);
      const attr = entity.attributes || {};
      let domain = "climate";
      let service = "";
      let targetId = this._config.entity;
      let data = {};
      if (action === "mains") {
        if (!mains || !["on", "off"].includes(mains.state)) return;
        if (mains.state === "on" && !this._confirmMainsOff) {
          this._confirmMainsOff = true;
          this._error = "";
          this._notice = "Bekräfta endast om AC:n har stoppats via IR och fått stanna.";
          this._render();
          return;
        }
        domain = "switch";
        targetId = this._config.power_entity;
        service = mains.state === "on" ? "turn_off" : "turn_on";
      } else {
        this._confirmMainsOff = false;
      }
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
      this._confirmMainsOff = false;
      this._busy = true;
      this._error = "";
      this._notice = "Skickar begäran till Home Assistant…";
      this._render();
      try {
        await this._hass.callService(domain, service, { entity_id: targetId, ...data });
        this._notice = domain === "switch"
          ? "Strömkommando skickat till smartpluggen (väntar på status från HA)."
          : "Kommandot accepterades av Home Assistant (ingen IR-kvittens).";
      } catch (err) {
        this._notice = "";
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
