/* Wood's Cortina card — bundled with the HACS integration. No external JS dependencies.
 * Climate values are requests, never confirmed IR feedback.
 * Copyright (c) 2026 Jocke1970. */
(() => {
  "use strict";
  const TAG = "woods-cortina-card";
  const VERSION = "2026.10.0b8";
  const MODES = [
    { value: "cool", label: "Kyla", icon: "mdi:snowflake" },
    { value: "heat", label: "Värme", icon: "mdi:radiator" },
    { value: "dry", label: "Avfuktning", icon: "mdi:water-percent" },
    { value: "fan_only", label: "Fläkt", icon: "mdi:fan" },
  ];
  const FAN_NAMES = { low: "Låg", medium: "Medel", high: "Hög" };
  const FAN_ICONS = {
    low: "mdi:fan-speed-1",
    medium: "mdi:fan-speed-2",
    high: "mdi:fan-speed-3",
  };
  // Secondary guard only: physical compressor feedback is not available via IR.
  const MAINS_OFF_MAX_WATTS = 15;
  const MAINS_OFF_COOLDOWN_MS = 60000;
  const wattsReading = (entity) => {
    if (!entity || ["unavailable", "unknown", ""].includes(entity.state)) return null;
    const n = Number(entity.state);
    const unit = entity.attributes?.unit_of_measurement;
    if (!Number.isFinite(n) || n < 0) return null;
    if (unit === "W") return n;
    if (unit === "kW") return n * 1000;
    return null;
  };
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
    .hero[data-mode="heat"]{background:linear-gradient(130deg,#542b20,#88441e)}
    .hero[data-mode="dry"]{background:linear-gradient(130deg,#173445,#195665)}
    .hero[data-mode="fan_only"]{background:linear-gradient(130deg,#213c42,#245962)}
    .hero[data-mode="off"]{background:linear-gradient(130deg,#333d48,#424950)}
    /* Compact standby: the upper tile is the complete visible card. */
    .hero.compact{padding:clamp(12px,4cqi,17px)}
    .hero.compact .hero-main,.hero.compact .hero-controls,.hero.compact .telemetry-note{display:none}
    ha-card.compact .off-hide{display:none}
    .hero.compact .head{align-items:center}
    .hero.compact .name{margin-top:0}
    .confirm-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,.24)}
    .confirm-strip .confirm-label{grid-column:1/-1;color:#fff0dc;font-size:11px;line-height:1.35}
    .confirm-action,.confirm-cancel{min-height:36px;border-radius:9px;padding:6px;font-size:11px;font-weight:700;color:#fff}
    .confirm-action{background:#b75b42;border:1px solid #ffb28d}
    .confirm-cancel{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.3)}
    .power-note{color:#d2e9f5;font-size:9px;line-height:1.25;text-align:center}

    .head{position:relative;display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;gap:10px}
    .brand{min-width:0;flex:1;max-width:100%}
    .eyebrow{font-size:10px;letter-spacing:.10em;text-transform:uppercase;color:#bbd6e6;font-weight:700;overflow-wrap:anywhere}
    .name{margin:5px 0 0;font-size:clamp(16px,5.4cqi,20px);font-weight:700;letter-spacing:-.03em;overflow-wrap:anywhere;line-height:1.24}
    .status{display:inline-flex;max-width:100%;align-items:center;gap:6px;margin-top:10px;padding:5px 10px;border-radius:50px;background:rgba(255,255,255,.12);color:#e7f5ff;font-size:10.5px;white-space:nowrap}
    .power-cluster{flex:none;display:flex;flex-direction:column;align-items:center;gap:5px;width:72px;max-width:34%;min-width:0}
    .power-hint{font-size:10px;line-height:1.25;color:#c7deeb;letter-spacing:.03em;text-align:center;overflow-wrap:anywhere}
    .dot{width:7px;height:7px;flex:none;border-radius:50%;background:#7cdbbe;box-shadow:0 0 0 3px rgba(124,219,190,.14)}
    .status.off .dot{background:#aeb5be;box-shadow:none}
    .hero-main{position:relative;margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr);gap:13px}
    .temperature-stats{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.82fr);align-items:end;gap:clamp(7px,3cqi,15px);min-width:0}
    .setpoint-box{min-width:0}
    .setpoint-caption,.minor-caption{font-size:10px;color:#c8e3f1;letter-spacing:.06em}
    .setpoint-row{display:flex;align-items:baseline;gap:4px;margin-top:4px;white-space:nowrap}
    .setpoint-value{font-size:clamp(38px,13.5cqi,62px);line-height:1;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.07em}
    .setpoint-unit{font-size:clamp(16px,4.8cqi,22px);font-weight:500;opacity:.88}
    .dim{opacity:.48}
    .stepper{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;width:100%;align-self:end}
    button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    button:focus-visible,summary:focus-visible{outline:3px solid #69bfff;outline-offset:3px}
    button:disabled{opacity:.32;cursor:not-allowed;filter:grayscale(.7)}
    .step{display:grid;place-items:center;min-height:42px;width:100%;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font-size:26px;font-weight:300}
    .step:not(:disabled):hover{background:rgba(255,255,255,.23)}
    .room{min-width:0;padding-left:clamp(7px,2.3cqi,13px);border-left:1px solid rgba(255,255,255,.25);align-self:center;padding-bottom:0;text-align:right}
    .room strong{display:block;margin-top:5px;font-size:clamp(15px,4.8cqi,19px);line-height:1.1;font-weight:650;white-space:nowrap;font-variant-numeric:tabular-nums}
    .telemetry-note{font-size:10px;line-height:1.4;color:#b8d7e7;margin-top:11px}
    .hint{font-size:11px;color:var(--secondary-text-color,#8d9da7);margin-top:10px;line-height:1.45}
    .hero-controls{position:relative;z-index:1;margin-top:19px;padding-top:15px;border-top:1px solid rgba(255,255,255,.19)}
    .hero-label{font-size:10px;letter-spacing:.12em;font-weight:700;color:#b9d7e8;margin-bottom:9px}
    .hero-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .mode{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;min-width:0;min-height:74px;padding:9px 3px;border-radius:11px;border:1px solid rgba(188,224,240,.25);background:rgba(255,255,255,.07);color:#d6e9f4;font-size:clamp(10px,3.2cqi,12px);font-weight:650;overflow-wrap:anywhere}
    .mode span{max-width:100%;text-align:center}
    .mode ha-icon{--mdc-icon-size:23px;color:#b6d4e6}
    .mode[data-value="cool"] ha-icon{color:#82d8ff}
    .mode[data-value="heat"] ha-icon{color:#ffb274}
    .mode[data-value="dry"] ha-icon{color:#6cdddf}
    .mode[data-value="fan_only"] ha-icon{color:#c1dbff}
    .mode.active{background:rgba(69,186,237,.23);border-color:#74d2ff;box-shadow:inset 0 0 0 1px rgba(100,211,255,.2);color:#fff}
    .mode:not(:disabled):hover{background:rgba(255,255,255,.15)}
    .power{display:grid;place-items:center;width:48px;height:48px;min-height:48px;border-radius:14px;padding:0;background:#28a0c0;border:1px solid rgba(141,235,255,.7);color:#fff}
    .power.off{background:rgba(236,248,255,.11);border-color:rgba(236,248,255,.28)}
    .power ha-icon{--mdc-icon-size:25px}
    .hero-power-area{margin-top:13px}
    .supply-indicator{margin-top:7px;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;color:#c5dfec}
    .supply-indicator ha-icon{--mdc-icon-size:14px}
    .mains-off-link{background:transparent;border:1px solid rgba(204,231,244,.36);border-radius:9px;color:#ebf8ff;font-size:10px;padding:5px 8px;min-height:28px;line-height:1.2}
    .mains-off-link.confirm{background:rgba(237,122,72,.24);border-color:#e7a075}
    .mains-warning{margin-top:8px;font-size:10px;color:#ffcfb2;line-height:1.45}
    .panel{margin-top:12px;border-top:1px solid var(--divider-color,rgba(140,160,185,.23));padding-top:5px}
    .panel summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:12px 2px;font-size:12px;font-weight:700;color:var(--secondary-text-color,#aab8c6)}
    .panel summary::-webkit-details-marker{display:none}
    .panel summary:after{content:"⌄";font-size:19px;line-height:1;flex:none}
    .panel[open] summary:after{transform:rotate(180deg)}
    .summary-value{font-size:12px;font-weight:700;color:var(--primary-text-color,#fff);margin-left:auto;font-variant-numeric:tabular-nums}
    .advanced{padding:7px 0 4px}
    .chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .chip{min-width:0;border-radius:10px;border:1px solid var(--divider-color,rgba(140,160,185,.25));background:transparent;color:var(--primary-text-color,#f7fbfe);min-height:37px;padding:6px 4px;font-size:11px;overflow-wrap:anywhere}
    .chip.active{color:#1d98c0;border-color:#3a9fc4;background:rgba(49,160,202,.10);font-weight:700}
    .fan-chip{display:flex;align-items:center;justify-content:center;min-height:43px}
    .fan-chip ha-icon{--mdc-icon-size:25px}
    .row-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .row-title{font-size:11px;color:var(--secondary-text-color,#96a6b7);margin:15px 0 8px}
    .fineprint{font-size:10.5px;color:var(--secondary-text-color,#9bacb9);line-height:1.5;padding:11px 2px 1px}
    .energy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:3px}
    .energy-cell{padding:10px 8px;background:rgba(128,159,178,.07);border:1px solid var(--divider-color,rgba(128,159,178,.14));border-radius:10px}
    .energy-label{font-size:10px;color:var(--secondary-text-color,#90a3af)}
    .energy-value{font-size:13px;font-weight:700;margin-top:4px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
    .bottom{display:flex;flex-direction:column;gap:5px;border-top:1px solid var(--divider-color,rgba(140,160,185,.23));padding-top:12px;margin-top:14px;color:var(--secondary-text-color,#90a0b0);font-size:10px;overflow-wrap:anywhere}
    .bottom .stamp{display:flex;align-items:center;gap:5px;flex-wrap:wrap;line-height:1.3}
    .notice{margin-top:11px;padding:9px 11px;background:rgba(39,124,156,.11);border:1px solid rgba(39,124,156,.30);border-radius:10px;color:var(--primary-text-color,#dde9ef);font-size:11px;line-height:1.4}
    .error{margin-top:11px;padding:9px 11px;background:rgba(205,53,74,.10);border:1px solid rgba(205,53,74,.45);border-radius:10px;color:var(--error-color,#e46363);font-size:11px;line-height:1.4}
    .unavailable{padding:18px;color:var(--secondary-text-color,#999)}
    @container (min-width:355px){
      .head{align-items:flex-start}
      .hero-main{grid-template-columns:minmax(0,1fr) auto;align-items:end}
      .stepper{width:auto;grid-template-columns:repeat(2,43px)}

      .bottom{flex-direction:row;justify-content:space-between}
      .bottom .stamp{justify-content:flex-end}
      .mode{min-height:81px}
      .hero-modes{grid-template-columns:repeat(4,minmax(0,1fr))}
    }
    @container (max-width:210px){
      .setpoint-value{font-size:34px}
      .setpoint-unit{font-size:15px}
      .room strong{font-size:14px}
      .room .minor-caption{font-size:9px}
      .power-cluster{width:54px}
      .power{width:43px;height:43px;min-height:43px}
      .power-hint{font-size:9px}
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
      this._confirmMainsOffAt = 0;
      this._powerPressStartedAt = 0;
      this._suppressPowerClickUntil = 0;
      this._advanced = false;
      this._consumption = false;
      this.shadowRoot.addEventListener("toggle", (event) => {
        if (event.target && event.target.tagName === "DETAILS") {
          if (event.target.dataset?.panel === "settings") this._advanced = event.target.open;
          if (event.target.dataset?.panel === "consumption") this._consumption = event.target.open;
        }
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
      if (this._confirmMainsOff &&
          (this._mainsEntity()?.state !== "on" || Date.now() - this._confirmMainsOffAt > 15000)) {
        this._confirmMainsOff = false;
        this._confirmMainsOffAt = 0;
      }
      this._render();
    }

    getCardSize() { return !this._isActiveMode(this._entity()) || this._mainsEntity()?.state === "off" ? 2 : 7 + (this._advanced ? 2 : 0) + (this._consumption ? 2 : 0); }
    getGridOptions() { return { columns: 6, min_columns: 3, rows: this.getCardSize() }; }

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
      const physicalWatts = wattsReading(this._hass.states[this._config.power_sensor]);
      const on = this._isActiveMode(entity);
      const compact = !on || mainsOff;
      const cooling = on && entity.state === "cool";
      const heating = on && entity.state === "heat";
      const adjustable = (cooling || heating) && !this._busy && !mainsOff;
      const value = Number(attr.temperature);
      const target = Number.isFinite(value) ? value : 22;
      const room = attr.current_temperature == null ? "—" : fmt(attr.current_temperature) + " °C";
      const fanAvailable = on && entity.state !== "dry" && !this._busy && !mainsOff;
      const lastIrTime = Date.parse(attr.last_ir_sent_at || "");
      const cooledDown = Number.isFinite(lastIrTime) &&
        (Date.now() - lastIrTime >= MAINS_OFF_COOLDOWN_MS);
      const mainsOffAllowed = mainsOn && !on && !this._busy &&
        physicalWatts !== null && physicalWatts <= MAINS_OFF_MAX_WATTS && cooledDown;
      if (this._confirmMainsOff && !mainsOffAllowed) {
        this._confirmMainsOff = false;
        this._confirmMainsOffAt = 0;
      }
      const mainsReason = on ? "Stoppa AC:n via IR först." :
        physicalWatts === null ? "Effektmätning saknas – huvudström kan inte brytas säkert." :
        physicalWatts > MAINS_OFF_MAX_WATTS ? "AC:n drar fortfarande effekt – avvakta." :
        !cooledDown ? "Vänta minst 60 sekunder efter senaste IR-kommando." : "";
      const modeButtons = MODES.filter((m) => this._allowed(entity, m.value))
        .map((m) => `<button class="mode ${entity.state === m.value ? "active" : ""}" type="button"
          data-action="mode" data-value="${m.value}" aria-pressed="${entity.state === m.value}"
          ${this._busy || mainsOff ? "disabled" : ""}><ha-icon icon="${m.icon}"></ha-icon><span>${m.label}</span></button>`).join("");
      const fanButtons = ["low", "medium", "high"]
        .filter((fan) => !Array.isArray(attr.fan_modes) || attr.fan_modes.includes(fan))
        .map((fan) => `<button class="chip fan-chip ${attr.fan_mode === fan ? "active" : ""}" type="button"
          data-action="fan" data-value="${fan}" aria-pressed="${attr.fan_mode === fan}"
          aria-label="Fläkthastighet: ${FAN_NAMES[fan]}" title="${FAN_NAMES[fan]}"
          ${!fanAvailable ? "disabled" : ""}><ha-icon icon="${FAN_ICONS[fan]}"></ha-icon></button>`).join("");
      const swingButtons = ["off", "on"].map((v) =>
        `<button class="chip ${attr.swing_mode === v ? "active" : ""}" type="button" data-action="swing"
        data-value="${v}" aria-pressed="${attr.swing_mode === v}" ${!on || this._busy || mainsOff ? "disabled" : ""}>${v === "on" ? "På" : "Av"}</button>`).join("");
      const saver = attr.preset_mode === "energy_saver";
      const lastSent = attr.last_ir_sent_at ? new Date(attr.last_ir_sent_at) : null;
      const time = lastSent && !Number.isNaN(lastSent.valueOf())
        ? lastSent.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "Aldrig";
      const heroMode = mainsOff ? "off" : on ? entity.state : "off";
      const powerDescription = mainsOff ? "Slå på huvudström" : mainsOn ?
        (on ? "Stoppa AC via IR" : "Starta AC via IR") : "Huvudström okänd";
      const powerAreaLabel = mainsOff ? "Huvudström" : mainsOn ? "AC" : "Okänd";
      const powerHint = mainsOn && !on ? "Håll: huvudström" : "";
      const statusText = mainsOff ? "Ström av" : !on ? "Avstängd" : entity.state === "cool" ? "Kyla aktiv" :
        entity.state === "heat" ? "Värme aktiv" : entity.state === "dry" ? "Avfuktning" : "Fläkt";
      const disabledText = entity.state === "fan_only" || entity.state === "dry"
        ? "Temperaturinställning används inte i detta driftläge."
        : !on ? "Starta kyla eller värme för att ändra temperaturen." : "Temperaturen regleras av AC:ns egen termostat.";
      this.shadowRoot.innerHTML = `
        <style>${CSS}</style>
        <ha-card class="${compact ? "compact" : ""}">
          <div class="shell">
            <div class="hero ${compact ? "compact" : ""}" data-mode="${htmlEscape(heroMode)}">
              <div class="head">
                <div class="brand">
                  <div class="name">${htmlEscape(this._config.name)}</div>
                  <span class="status ${on && !mainsOff ? "" : "off"}"><span class="dot"></span>${statusText}</span>
                </div>
                <div class="power-cluster">
                  <button type="button" class="power ${on && mainsOn ? "" : "off"}"
                    data-action="power" aria-label="${htmlEscape(powerDescription)}"
                    title="${htmlEscape(powerDescription)}${mainsOn && !on ? " · Håll 1 sekund för huvudström" : ""}"
                    ${this._busy || !mainsOnline ? "disabled" : ""}>
                    <ha-icon icon="mdi:power"></ha-icon>
                  </button>
                  <span class="power-hint">${powerAreaLabel}</span>
                  ${powerHint ? `<span class="power-note">${powerHint}</span>` : ""}
                </div>
              </div>
              <div class="hero-main">
                <div class="temperature-stats">
                  <div class="setpoint-box">
                    <div class="setpoint-caption">${cooling || heating ? "BÖRTEMPERATUR" : "SENASTE BÖRVÄRDE"}</div>
                    <div class="setpoint-row ${cooling || heating ? "" : "dim"}">
                      <span class="setpoint-value">${fmt(target)}</span><span class="setpoint-unit">°C</span>
                    </div>
                  </div>
                  <div class="room">
                    <div class="minor-caption" title="Rumstemperatur">RUM</div>
                    <strong>${room}</strong>
                  </div>
                </div>
                <div class="stepper">
                  <button class="step" type="button" data-action="temp" data-value="-1" aria-label="Sänk temperaturen"
                    ${!adjustable || target <= Number(attr.min_temp ?? 17) ? "disabled" : ""}>−</button>
                  <button class="step" type="button" data-action="temp" data-value="1" aria-label="Höj temperaturen"
                    ${!adjustable || target >= Number(attr.max_temp ?? 30) ? "disabled" : ""}>+</button>
                </div>
              </div>
              <div class="telemetry-note">Inställningar via IR · Ingen kvittens från AC:n</div>
              <div class="hero-controls">
                <div class="hero-label">DRIFTLÄGE</div>
                <div class="hero-modes">${modeButtons}</div>
                <div class="hero-power-area">
                  <div class="supply-indicator">
                    <span><ha-icon icon="mdi:power-plug"></ha-icon>
                      ${mainsOn ? "Huvudström på" : mainsOff ? "Huvudström av" : "Ingen status från smartplugg"}</span>
                    ${mainsOn && !on ? `<button type="button" class="mains-off-link ${this._confirmMainsOff ? "confirm" : ""}"
                      data-action="mains_off" ${!mainsOffAllowed ? "disabled" : ""}
                      aria-label="Bryt huvudström när AC:n är stoppad">
                      ${this._confirmMainsOff ? "Bekräfta frånkoppling" : "Bryt huvudström"}
                    </button>` : ""}
                  </div>
                  ${mainsOn && !on && !mainsOffAllowed ? `<div class="mains-warning">${htmlEscape(mainsReason)}</div>` : ""}
                  ${this._confirmMainsOff ? '<div class="mains-warning">Kontrollera att AC:n verkligen har stannat. Tryck igen för att bryta huvudströmmen.</div>' : ""}
                </div>
              </div>
              ${this._confirmMainsOff && compact ? `
                <div class="confirm-strip" role="group" aria-label="Bekräfta avstängning av huvudström">
                  <span class="confirm-label">AC:n måste vara helt stoppad. Bryt huvudströmmen?</span>
                  <button type="button" class="confirm-action" data-action="mains_off">Bekräfta</button>
                  <button type="button" class="confirm-cancel" data-action="mains_cancel">Avbryt</button>
                </div>` : ""}
            </div>
            <div class="off-hide">
            ${!(cooling || heating) ? `<div class="hint">${htmlEscape(disabledText)}</div>` : ""}
            <details class="panel" data-panel="settings" ${this._advanced ? "open" : ""}>
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
                <div class="fineprint">Kyla, värme, avfuktning och fläkt har provats på AC:n. Auto Clean, Sleep och timer är ännu inte aktiverade.
                  IR-kommandon är enkelriktade; kortet visar senast begärt tillstånd.</div>
              </div>
            </details>
            <details class="panel" data-panel="consumption" ${this._consumption ? "open" : ""}>
              <summary><span><ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size:17px"></ha-icon> Strömförbrukning</span>
                <span class="summary-value">${htmlEscape(watts)}</span></summary>
              <div class="advanced">
                <div class="energy-grid">
                  <div class="energy-cell"><div class="energy-label">Just nu</div><div class="energy-value">${htmlEscape(watts)}</div></div>
                  <div class="energy-cell"><div class="energy-label">Huvudström</div><div class="energy-value">${mainsOn ? "På" : mainsOff ? "Av" : "Okänd"}</div></div>
                  <div class="energy-cell"><div class="energy-label">Idag</div><div class="energy-value">${htmlEscape(daily)}</div></div>
                  <div class="energy-cell"><div class="energy-label">Denna månad</div><div class="energy-value">${htmlEscape(monthly)}</div></div>
                </div>
                <div class="fineprint">Effekt och energi mäts av smartpluggen. AC:ns driftläge kommer från IR-kommandon utan återkoppling.</div>
              </div>
            </details>
            </div>
            ${this._notice ? `<div class="notice" role="status" aria-live="polite">${htmlEscape(this._notice)}</div>` : ""}
            ${this._error ? `<div class="error" role="alert">${htmlEscape(this._error)}</div>` : ""}
            <div class="bottom off-hide">
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
        if (button.dataset.action !== "power") return;
        // A 900 ms hold arms the protected mains-off confirmation.
        // Pointer and keyboard activation are treated equivalently.
        button.addEventListener("pointerdown", (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          this._powerPressStartedAt = Date.now();
        });
        button.addEventListener("pointerup", (event) => {
          if (this._powerPressStartedAt &&
              Date.now() - this._powerPressStartedAt >= 900) {
            this._suppressPowerClickUntil = Date.now() + 800;
            event.preventDefault?.();
            void this._handlePowerHold();
          }
          this._powerPressStartedAt = 0;
        });
        button.addEventListener("pointercancel", () => { this._powerPressStartedAt = 0; });
        button.addEventListener("pointerleave", () => { this._powerPressStartedAt = 0; });
        button.addEventListener("contextmenu", (event) => event.preventDefault?.());
        button.addEventListener("keydown", (event) => {
          if (!["Enter", " "].includes(event.key)) return;
          event.preventDefault?.();
          if (!event.repeat && !this._powerPressStartedAt) this._powerPressStartedAt = Date.now();
        });
        button.addEventListener("keyup", (event) => {
          if (!["Enter", " "].includes(event.key)) return;
          event.preventDefault?.();
          const held = this._powerPressStartedAt && Date.now() - this._powerPressStartedAt >= 900;
          this._powerPressStartedAt = 0;
          if (held) void this._handlePowerHold();
          else void this._handleClick({ currentTarget: button, target: button });
          this._suppressPowerClickUntil = Date.now() + 800;
        });
      });
    }

    async _handlePowerHold() {
      if (this._busy || this._confirmMainsOff) return;
      // This always ARMS a confirmation; a long hold alone can never
      // send switch.turn_off or skip the existing power/cooldown guards.
      const target = { dataset: { action: "mains_off" }, disabled: false };
      await this._handleClick({ currentTarget: target, target });
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
      if (action === "power" && Date.now() < this._suppressPowerClickUntil) return;
      if (action === "mains_cancel") {
        this._confirmMainsOff = false;
        this._confirmMainsOffAt = 0;
        this._error = "";
        this._notice = "";
        this._render();
        return;
      }
      const mains = this._mainsEntity();
      const mainsOff = mains?.state === "off";
      const mainsOn = mains?.state === "on";
      const on = this._isActiveMode(entity);
      const attr = entity.attributes || {};
      if (action !== "power" && action !== "mains_off" && mainsOff) {
        this._error = "Huvudströmmen är avstängd. Slå på den innan IR-styrning.";
        this._notice = "";
        this._render();
        return;
      }
      let domain = "climate";
      let service = "";
      let targetId = this._config.entity;
      let data = {};
      if (action === "mains_off") {
        // Fail closed. Home Assistant's optimistic climate state alone
        // cannot prove the real compressor has stopped.
        const physicalWatts = wattsReading(this._hass.states[this._config.power_sensor]);
        const lastIrTime = Date.parse(attr.last_ir_sent_at || "");
        const cooldown = Number.isFinite(lastIrTime) &&
          (Date.now() - lastIrTime >= MAINS_OFF_COOLDOWN_MS);
        if (!mainsOn || on || physicalWatts === null ||
            physicalWatts > MAINS_OFF_MAX_WATTS || !cooldown) {
          this._confirmMainsOff = false;
          this._confirmMainsOffAt = 0;
          this._error = "Huvudström får bara brytas när AC:n är stoppad, effekten är låg och efter väntetid.";
          this._notice = "";
          this._render();
          return;
        }
        if (Date.now() - this._confirmMainsOffAt > 15000) this._confirmMainsOff = false;
        if (!this._confirmMainsOff) {
          this._confirmMainsOff = true;
          this._confirmMainsOffAt = Date.now();
          this._notice = "Bekräfta endast när den fysiska AC:n verkligen har stannat.";
          this._error = "";
          this._render();
          return;
        }
        domain = "switch";
        targetId = this._config.power_entity;
        service = "turn_off";
      } else {
        this._confirmMainsOff = false;
        this._confirmMainsOffAt = 0;
      }
      if (action === "power") {
        if (mainsOff) {
          domain = "switch";
          targetId = this._config.power_entity;
          service = "turn_on";
        } else if (mainsOn) {
          service = on ? "turn_off" : "turn_on";
        } else {
          this._error = "Huvudströmmens status är okänd – powerknappen är spärrad.";
          this._notice = "";
          this._render();
          return;
        }
      } else if (action === "mode" && this._allowed(entity, value)) {
        if (value === entity.state) return;
        service = "set_hvac_mode";
        data = { hvac_mode: value };
      } else if (action === "temp" && ["cool", "heat"].includes(entity.state)) {
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
      this._confirmMainsOffAt = 0;
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
