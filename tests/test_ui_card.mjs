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
                disabled: /(?:^| )disabled(?: |$)/.test(attrs),
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
      'climate.wood_s_cortina_12k_duo': {
        state,
        attributes: {
          temperature,
          current_temperature: 20.5,
          hvac_modes: ['off', 'cool', 'dry', 'fan_only'],
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

test('HEAT actions are never exposed or sent by this beta', async () => {
  const { card, calls } = createCard();
  await card._handleClick(click('mode', 'heat'));
  assert.equal(calls.length, 0);
  assert.ok(!card.shadowRoot.innerHTML.includes('data-value="heat"'));
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
  assert.ok(source.includes('2026.10.0b3'));
});
