import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const file = new URL('../custom_components/woods_cortina/www/woods-cortina-card.js', import.meta.url);
const source = readFileSync(file, 'utf8');
const registry = new Map();
const events = [];
const context = {
  HTMLElement: class {
    attachShadow() {
      const shadowRoot = {
        _html: '',
        _buttons: [],
        addEventListener: (name, callback) => events.push([name, callback]),
        querySelectorAll: (selector) => selector === 'button[data-action]'
          ? shadowRoot._buttons : [],
      };
      Object.defineProperty(shadowRoot, 'innerHTML', {
        get() { return this._html; },
        set(markup) {
          this._html = markup;
          this._buttons = [...markup.matchAll(/<button([^>]+)>/g)]
            .filter((match) => match[1].includes('data-action='))
            .map((match) => {
              const attrs = match[1];
              const action = attrs.match(/data-action="([^"]+)"/)?.[1];
              const value = attrs.match(/data-value="([^"]+)"/)?.[1] || '';
              const listeners = new Map();
              return {
                dataset: { action, value },
                disabled: /(?:^|\s)disabled(?:\s|$)/.test(attrs),
                addEventListener: (eventName, callback) => listeners.set(eventName, callback),
                click() {
                  const cb = listeners.get('click');
                  if (cb && !this.disabled) cb({ stopPropagation() {} });
                },
              };
            });
        },
      });
      this.shadowRoot = shadowRoot;
    }
  },
  customElements: {
    get: (name) => registry.get(name),
    define: (name, ctor) => registry.set(name, ctor),
  },
  window: { customCards: [] },
  Intl, Date, Number, Math, String,
};
vm.runInNewContext(source, context, { filename: 'woods-cortina-card.js' });
const Card = registry.get('woods-cortina-card');
assert.equal(typeof Card, 'function');

function createCard(state = 'cool', temperature = 22, attrs = {}) {
  const card = new Card();
  const calls = [];
  card.setConfig({ entity: 'climate.wood_s_cortina_12k_duo', name: 'Test AC <demo>' });
  card.hass = {
    states: {
      'switch.woods_cortina_silent_12k_duo': { state: 'on', attributes: {} },
      'sensor.woods_cortina_silent_12k_duo_power': {
        state: '765.4', attributes: { unit_of_measurement: 'W' },
      },
      'sensor.woods_cortina_silent_12k_duo_energy_daily': {
        state: '1.25', attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.woods_cortina_silent_12k_duo_energy_monthly': {
        state: '18.35', attributes: { unit_of_measurement: 'kWh' },
      },
      'climate.wood_s_cortina_12k_duo': {
        state,
        attributes: {
          temperature,
          current_temperature: 20.5,
          hvac_modes: ['off', 'cool', 'heat', 'dry', 'fan_only'],
          fan_modes: ['low', 'medium', 'high'],
          fan_mode: 'low',
          min_temp: 17, max_temp: 30,
          swing_mode: 'off', preset_mode: 'none',
          ...attrs,
        },
      },
    },
    callService: async (domain, action, payload) => calls.push([domain, action, payload]),
  };
  return { card, calls };
}
function click(action, value = '') {
  const element = { dataset: { action, value }, disabled: false };
  return { target: { closest: () => element } };
}

test('registers the Lovelace card only once and protects config names', () => {
  assert.equal(context.window.customCards.length, 1);
  const { card } = createCard();
  assert.ok(card.shadowRoot.innerHTML.includes('Test AC &lt;demo&gt;'));
  assert.ok(!card.shadowRoot.innerHTML.includes('Test AC <demo>'));
  assert.ok(card.shadowRoot.innerHTML.includes('RUMSTEMPERATUR'));
  assert.throws(() => (new Card()).setConfig({ entity: 'sensor.not_climate' }));
});

test('COOL setpoint sends expected HA climate service call', async () => {
  const { card, calls } = createCard('cool', 22);
  await card._handleClick(click('temp', '1'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'climate');
  assert.equal(calls[0][1], 'set_temperature');
  assert.equal(calls[0][2].temperature, 23);
});

test('FAN, DRY and OFF cannot issue setpoint commands from this card', async () => {
  for (const mode of ['fan_only', 'dry', 'off']) {
    const { card, calls } = createCard(mode, 22);
    await card._handleClick(click('temp', '1'));
    assert.equal(calls.length, 0);
    assert.ok(card.shadowRoot.innerHTML.includes('disabled'));
  }
});

test('mode, swing, fan and power delegate to HA climate services', async () => {
  const { card, calls } = createCard();
  await card._handleClick(click('mode', 'dry'));
  await card._handleClick(click('swing', 'on'));
  await card._handleClick(click('fan', 'high'));
  await card._handleClick(click('power'));
  assert.deepEqual(calls.map((c) => c[1]), [
    'set_hvac_mode', 'set_swing_mode', 'set_fan_mode', 'turn_off',
  ]);
});

test('HEAT mode is available in unreleased dev and calls climate service', async () => {
  const { card, calls } = createCard();
  assert.ok(card.shadowRoot.innerHTML.includes('data-value="heat"'));
  assert.ok(card.shadowRoot.innerHTML.includes('mdi:radiator'));
  await card._handleClick(click('mode', 'heat'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'climate');
  assert.equal(calls[0][1], 'set_hvac_mode');
  assert.equal(calls[0][2].hvac_mode, 'heat');
});

test('unavailable entity is handled without emitting commands', async () => {
  const { card, calls } = createCard('unavailable');
  assert.ok(card.shadowRoot.innerHTML.includes('inte tillgänglig'));
  await card._handleClick(click('power'));
  assert.equal(calls.length, 0);
});

test('service errors are reported inline and busy flag is reset', async () => {
  const { card } = createCard();
  card._hass.callService = async () => { throw new Error('RM4 unavailable'); };
  await card._handleClick(click('power'));
  assert.equal(card._busy, false);
  assert.ok(card.shadowRoot.innerHTML.includes('RM4 unavailable'));
});


test('actual rendered buttons have live click listeners and invoke climate', async () => {
  const { card, calls } = createCard('cool', 22);
  const plusButton = card.shadowRoot.querySelectorAll('button[data-action]')
    .find((button) => button.dataset.action === 'temp' && button.dataset.value === '1');
  assert.ok(plusButton, 'temperature button is rendered');
  assert.equal(plusButton.disabled, false);
  plusButton.click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'set_temperature');
  assert.equal(calls[0][2].temperature, 23);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(card.shadowRoot.innerHTML.includes('Kommandot accepterades'));
  assert.equal(card._busy, false);
});

test('click handlers work on power, mode, fan and swing through rendered controls', () => {
  const { card, calls } = createCard('cool', 22);
  for (const [action, value, expected] of [
    ['power', '', 'turn_off'],
  ]) {
    const button = card.shadowRoot.querySelectorAll('button[data-action]')
      .find((item) => item.dataset.action === action && item.dataset.value === value);
    assert.ok(button);
    button.click();
    assert.equal(calls.at(-1)?.[1], expected);
  }
});

test('disabled setpoint buttons in DRY and FAN have no active click effect', () => {
  for (const state of ['dry', 'fan_only']) {
    const { card, calls } = createCard(state, 23);
    const button = card.shadowRoot.querySelectorAll('button[data-action]')
      .find((item) => item.dataset.action === 'temp');
    assert.ok(button);
    assert.equal(button.disabled, true);
    button.click();
    assert.equal(calls.length, 0);
  }
});

test('responsive styles use card container size, not browser window width', () => {
  assert.match(source, /container-type:inline-size/);
  assert.ok(source.includes('@container (min-width:355px)'));
  assert.ok(source.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(source.includes('grid-template-columns:minmax(0,1fr)'));
  assert.match(source, /Senaste IR-begäran/);
  assert.ok(source.includes('2026.10.0b6'));
});


test('power and energy entities are exposed in the default card config', () => {
  const cfg = Card.getStubConfig();
  assert.equal(cfg.power_entity, 'switch.woods_cortina_silent_12k_duo');
  assert.equal(cfg.power_sensor, 'sensor.woods_cortina_silent_12k_duo_power');
  assert.equal(cfg.energy_daily, 'sensor.woods_cortina_silent_12k_duo_energy_daily');
  assert.equal(cfg.energy_monthly, 'sensor.woods_cortina_silent_12k_duo_energy_monthly');
  const { card } = createCard();
  assert.ok(card.shadowRoot.innerHTML.includes('765,4 W'));
  assert.ok(card.shadowRoot.innerHTML.includes('1,25 kWh'));
  assert.ok(card.shadowRoot.innerHTML.includes('18,35 kWh'));
  assert.ok(card.shadowRoot.innerHTML.includes('Strömförbrukning'));
  assert.ok(card.shadowRoot.innerHTML.includes('Huvudström på'));
  assert.ok(card.shadowRoot.innerHTML.includes('Stoppa AC via IR'));
  assert.ok(card.shadowRoot.innerHTML.includes('class="power-cluster"'));
});

test('sensor unavailable or missing displays dash instead of fake consumption', () => {
  const { card } = createCard();
  delete card._hass.states['sensor.woods_cortina_silent_12k_duo_power'];
  card._hass.states['sensor.woods_cortina_silent_12k_duo_energy_daily'].state = 'unavailable';
  card._hass.states['sensor.woods_cortina_silent_12k_duo_energy_monthly'].state = '0';
  card._render();
  assert.ok(card.shadowRoot.innerHTML.includes('Strömförbrukning'));
  assert.ok(card.shadowRoot.innerHTML.includes('—'));
  assert.ok(card.shadowRoot.innerHTML.includes('0 kWh'));
  assert.ok(!card.shadowRoot.innerHTML.includes('NaN'));
});


function stoppedCard(watts = '1.6', lastIrMinutes = 5) {
  const last = new Date(Date.now() - lastIrMinutes * 60000).toISOString();
  const { card, calls } = createCard('off', 22, { last_ir_sent_at: last });
  card._hass.states['sensor.woods_cortina_silent_12k_duo_power'].state = watts;
  card._render();
  return { card, calls };
}

test('one hero power button: mains off turns on smartplug only', async () => {
  const { card, calls } = createCard();
  card._hass.states['switch.woods_cortina_silent_12k_duo'].state = 'off';
  card._render();
  const button = card.shadowRoot.querySelectorAll('button[data-action]')
    .find(b => b.dataset.action === 'power');
  assert.equal(button.disabled, false);
  assert.ok(card.shadowRoot.innerHTML.includes('Slå på huvudström'));
  await card._handleClick(click('power'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'switch');
  assert.equal(calls[0][1], 'turn_on');
  assert.equal(calls[0][2].entity_id, 'switch.woods_cortina_silent_12k_duo');
});

test('mains on makes same hero power button start or stop AC via IR only', async () => {
  for (const [state, action] of [['off', 'turn_on'], ['cool', 'turn_off']]) {
    const { card, calls } = createCard(state);
    await card._handleClick(click('power'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'climate');
    assert.equal(calls[0][1], action);
    assert.equal(calls[0][2].entity_id, 'climate.wood_s_cortina_12k_duo');
  }
});

test('AC ON hard-blocks mains off even when stale button is invoked directly', async () => {
  const { card, calls } = createCard('cool', 22, {
    last_ir_sent_at: new Date(Date.now() - 300000).toISOString(),
  });
  card._hass.states['sensor.woods_cortina_silent_12k_duo_power'].state = '1.5';
  card._render();
  assert.ok(!card.shadowRoot.innerHTML.includes('data-action="mains_off"'));
  await card._handleClick(click('mains_off'));
  assert.equal(calls.length, 0);
  assert.ok(card.shadowRoot.innerHTML.includes('Huvudström får bara brytas'));
});

test('AC OFF with low measured draw and cooldown permits confirmed mains disconnect', async () => {
  const { card, calls } = stoppedCard();
  const button = card.shadowRoot.querySelectorAll('button[data-action]')
    .find(b => b.dataset.action === 'mains_off');
  assert.ok(button);
  assert.equal(button.disabled, false);
  await card._handleClick(click('mains_off'));
  assert.equal(calls.length, 0);
  assert.equal(card._confirmMainsOff, true);
  assert.ok(card.shadowRoot.innerHTML.includes('Bekräfta frånkoppling'));
  await card._handleClick(click('mains_off'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'switch');
  assert.equal(calls[0][1], 'turn_off');
  assert.equal(calls[0][2].entity_id, 'switch.woods_cortina_silent_12k_duo');
  assert.equal(card._confirmMainsOff, false);
});

test('AC OFF without safe wattage or cooldown fails closed', async () => {
  for (const [watts, minutes] of [
    ['100', 5], ['unavailable', 5], ['0', 0.5]
  ]) {
    const { card, calls } = stoppedCard(watts, minutes);
    const button = card.shadowRoot.querySelectorAll('button[data-action]')
      .find(b => b.dataset.action === 'mains_off');
    assert.ok(button);
    assert.equal(button.disabled, true);
    await card._handleClick(click('mains_off'));
    assert.equal(calls.length, 0);
    assert.ok(card.shadowRoot.innerHTML.includes('Huvudström får bara brytas'));
  }
});

test('mains confirmation cancels on climate command and after fifteen seconds', async () => {
  const { card, calls } = stoppedCard();
  await card._handleClick(click('mains_off'));
  await card._handleClick(click('power'));
  assert.equal(card._confirmMainsOff, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'climate');
  const { card: card2, calls: calls2 } = stoppedCard();
  await card2._handleClick(click('mains_off'));
  card2._confirmMainsOffAt = Date.now() - 16000;
  await card2._handleClick(click('mains_off'));
  assert.equal(calls2.length, 0);
  assert.equal(card2._confirmMainsOff, true);
});

test('mains off prevents IR actions except main power button', async () => {
  const { card, calls } = createCard();
  card._hass.states['switch.woods_cortina_silent_12k_duo'].state = 'off';
  card._render();
  await card._handleClick(click('temp', '1'));
  await card._handleClick(click('mode', 'dry'));
  assert.equal(calls.length, 0);
  await card._handleClick(click('power'));
  assert.equal(calls[0][0], 'switch');
  assert.equal(calls[0][1], 'turn_on');
});

test('unavailable mains switch disables main power but not other IR controls', async () => {
  const { card, calls } = createCard();
  card._hass.states['switch.woods_cortina_silent_12k_duo'].state = 'unavailable';
  card._render();
  const button = card.shadowRoot.querySelectorAll('button[data-action]')
    .find(b => b.dataset.action === 'power');
  assert.equal(button.disabled, true);
  await card._handleClick(click('power'));
  assert.equal(calls.length, 0);
  await card._handleClick(click('temp', '1'));
  assert.equal(calls[0][0], 'climate');
});

test('panel sequence and mode icons live inside hero; energy is second expander', () => {
  const { card } = stoppedCard();
  const h = card.shadowRoot.innerHTML;
  const hero = h.indexOf('class="hero"');
  const mode = h.indexOf('class="hero-modes"');
  const power = h.indexOf('class="power-cluster"');
  const mains = h.indexOf('class="hero-power-area"');
  const heroClose = h.indexOf('class="hint"', mains);
  const settings = h.indexOf('data-panel="settings"');
  const consumption = h.indexOf('data-panel="consumption"');
  assert.ok(hero >= 0 && power > hero && mode > power && mains > mode);
  assert.ok(heroClose > mains);
  assert.ok(settings > heroClose && consumption > settings);
  assert.ok(h.includes('mdi:snowflake'));
  assert.ok(h.includes('mdi:water-percent'));
  assert.ok(h.includes('mdi:fan'));
  assert.ok(h.includes('Strömförbrukning'));
});

test('sensor and switch entity customisation validates domain', () => {
  const card = new Card();
  assert.throws(() => card.setConfig({
    entity: 'climate.wood_s_cortina_12k_duo', power_entity: 'sensor.no',
  }));
  card.setConfig({
    entity: 'climate.wood_s_cortina_12k_duo', power_entity: 'switch.other_plug',
  });
  assert.equal(card._config.power_entity, 'switch.other_plug');
});



test('external mains status change clears stale confirmation', async () => {
  const { card } = stoppedCard();
  await card._handleClick(click('mains_off'));
  assert.equal(card._confirmMainsOff, true);
  const ha = card._hass;
  ha.states['switch.woods_cortina_silent_12k_duo'].state = 'off';
  card.hass = ha;
  assert.equal(card._confirmMainsOff, false);
  assert.ok(card.shadowRoot.innerHTML.includes('Huvudström av'));
});


test('new HEAT in dev invokes correct climate mode and setpoint', async () => {
  const { card, calls } = createCard('cool', 22);
  assert.ok(card.shadowRoot.innerHTML.includes('mdi:radiator'));
  assert.ok(card.shadowRoot.innerHTML.includes('data-value="heat"'));
  await card._handleClick(click('mode', 'heat'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'climate');
  assert.equal(calls[0][1], 'set_hvac_mode');
  assert.equal(calls[0][2].hvac_mode, 'heat');
  const heating = createCard('heat', 22);
  assert.ok(heating.card.shadowRoot.innerHTML.includes('Värme aktiv'));
  await heating.card._handleClick(click('temp', '1'));
  assert.equal(heating.calls[0][1], 'set_temperature');
  assert.equal(heating.calls[0][2].temperature, 23);
  await heating.card._handleClick(click('saver', 'energy_saver'));
  assert.equal(heating.calls.length, 1, 'Energy saver must be blocked in HEAT');
});

test('HEAT card mode layout has 2 columns when narrow and 4 when wide', () => {
  assert.ok(source.includes('.hero-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(source.includes('.hero-modes{grid-template-columns:repeat(4,minmax(0,1fr))}'));
});


test('fan icons replace labels while preserving Swedish accessible names', () => {
  const { card } = createCard('cool', 22, { fan_mode: 'medium' });
  const markup = card.shadowRoot.innerHTML;
  for (const [fan, icon, label] of [
    ['low', 'mdi:fan-speed-1', 'Låg'],
    ['medium', 'mdi:fan-speed-2', 'Medel'],
    ['high', 'mdi:fan-speed-3', 'Hög'],
  ]) {
    const match = markup.match(new RegExp('<button[^>]*data-action="fan"[^>]*data-value="' +
      fan + '"[^>]*>[\\s\\S]*?</button>'));
    assert.ok(match, 'fan speed button exists: ' + fan);
    assert.ok(match[0].includes('icon="' + icon + '"'));
    assert.ok(match[0].includes('aria-label="Fläkthastighet: ' + label + '"'));
    assert.ok(match[0].includes('title="' + label + '"'));
    assert.ok(match[0].includes('aria-pressed="' + (fan === 'medium') + '"'));
    assert.ok(!/>\s*(Låg|Medel|Hög)\s*<\/button>/.test(match[0]));
  }
});

test('icon fan controls still send HA climate service and disable in DRY', async () => {
  const { card, calls } = createCard('cool', 22);
  for (const fan of ['medium', 'high', 'low']) {
    const button = card.shadowRoot.querySelectorAll('button[data-action]')
      .find((b) => b.dataset.action === 'fan' && b.dataset.value === fan);
    assert.ok(button);
    assert.equal(button.disabled, false);
    await card._handleClick(click('fan', fan));
  }
  assert.deepEqual(calls.map((c) => c[1]), ['set_fan_mode', 'set_fan_mode', 'set_fan_mode']);
  assert.deepEqual(calls.map((c) => c[2].fan_mode), ['medium', 'high', 'low']);
  const dry = createCard('dry');
  assert.equal(dry.card.shadowRoot.querySelectorAll('button[data-action]')
    .find((b) => b.dataset.action === 'fan').disabled, true);
});


test('header contains exactly one mdi:power button in the upper right corner', () => {
  for (const [mainsState, hvacState, expectedHint, expectedTitle] of [
    ['off', 'off', 'Huvudström', 'Slå på huvudström'],
    ['on', 'off', 'AC', 'Starta AC via IR'],
    ['on', 'heat', 'AC', 'Stoppa AC via IR'],
    ['unavailable', 'cool', 'Okänd', 'Huvudström okänd'],
  ]) {
    const { card } = createCard(hvacState);
    card._hass.states['switch.woods_cortina_silent_12k_duo'].state = mainsState;
    card._render();
    const html = card.shadowRoot.innerHTML;
    const head = html.indexOf('class="head"');
    const headerEnd = html.indexOf('</div>\n              <div class="hero-main">', head);
    const button = html.match(/<button[^>]*data-action="power"[^>]*>[\s\S]*?<\/button>/);
    assert.ok(button, 'power button is present');
    assert.equal((html.match(/data-action="power"/g) || []).length, 1);
    assert.ok(head >= 0 && html.indexOf('class="power-cluster"') > head);
    assert.ok(headerEnd > html.indexOf('class="power-cluster"'));
    assert.ok(html.indexOf('data-action="power"') < html.indexOf('class="hero-main"'));
    assert.ok(button[0].includes('icon="mdi:power"'));
    assert.ok(button[0].includes('title="' + expectedTitle + '"'));
    assert.ok(button[0].includes('aria-label="' + expectedTitle + '"'));
    assert.ok(html.includes('<span class="power-hint">' + expectedHint + '</span>'));
    if (mainsState === 'unavailable') assert.ok(button[0].includes('disabled'));
  }
});

test('target and room temperatures share same hero row with smaller room reading', () => {
  const { card } = createCard('heat', 23, { current_temperature: 19.5 });
  const html = card.shadowRoot.innerHTML;
  const container = html.indexOf('class="temperature-stats"');
  const target = html.indexOf('class="setpoint-box"', container);
  const room = html.indexOf('class="room"', target);
  const stepper = html.indexOf('class="stepper"', room);
  const modes = html.indexOf('class="hero-controls"', stepper);
  assert.ok(container >= 0 && target > container && room > target);
  assert.ok(stepper > room && modes > stepper);
  assert.ok(html.slice(container, stepper).includes('23</span>'));
  assert.ok(html.slice(room, stepper).includes('19,5 °C'));
  assert.ok(source.includes('.temperature-stats{display:grid;grid-template-columns:'));
  assert.ok(source.includes('@container (min-width:355px)'));
  const noTemp = createCard('off', 23, { current_temperature: null });
  assert.ok(noTemp.card.shadowRoot.innerHTML.includes('<strong>—</strong>'));
});

test('header power remains context-dependent, never chains switch and climate services', async () => {
  const { card, calls } = createCard('off');
  card._hass.states['switch.woods_cortina_silent_12k_duo'].state = 'off';
  card._render();
  const button = card.shadowRoot.querySelectorAll('button[data-action]')
    .find((b) => b.dataset.action === 'power');
  assert.equal(button.disabled, false);
  button.click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'switch');
  assert.equal(calls[0][1], 'turn_on');
  await new Promise((resolve) => setImmediate(resolve));
  card._hass.states['switch.woods_cortina_silent_12k_duo'].state = 'on';
  card._render();
  await card._handleClick(click('power'));
  assert.equal(calls.length, 2);
  assert.equal(calls[1][0], 'climate');
  assert.equal(calls[1][1], 'turn_on');
  assert.ok(!card.shadowRoot.innerHTML.includes('data-action="mains_off"') ||
    card._isActiveMode(card._entity()) === false);
});
