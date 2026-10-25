"""A deliberately optimistic Wood's IR climate entity."""

from __future__ import annotations

import logging
import math
from dataclasses import replace
from datetime import datetime, timezone

from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE, STATE_UNAVAILABLE, STATE_UNKNOWN, UnitOfTemperature
from homeassistant.core import callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.restore_state import RestoreEntity

from .const import CONF_REMOTE_ENTITY, CONF_TEMPERATURE_ENTITY, DEFAULT_NAME, MAX_TEMP, MIN_TEMP
from .ir_codec import IRState, broadlink_command

_LOGGER = logging.getLogger(__name__)

MODE_TO_HVAC = {0: HVACMode.COOL, 1: HVACMode.DRY, 2: HVACMode.FAN_ONLY, 3: HVACMode.COOL}
HVAC_TO_MODE = {HVACMode.COOL: 0, HVACMode.DRY: 1, HVACMode.FAN_ONLY: 2}
FAN_NAMES = ("low", "medium", "high")


async def async_setup_entry(hass, entry, async_add_entities):
    """Create the Wood's climate device."""
    async_add_entities([WoodsCortinaClimate(entry)])


class WoodsCortinaClimate(ClimateEntity, RestoreEntity):
    """Requested settings and optional room temperature; never claim IR feedback."""

    _attr_name = DEFAULT_NAME
    _attr_has_entity_name = False
    _attr_assumed_state = True
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_min_temp = MIN_TEMP
    _attr_max_temp = MAX_TEMP
    _attr_target_temperature_step = 1
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.COOL, HVACMode.DRY, HVACMode.FAN_ONLY]
    _attr_fan_modes = list(FAN_NAMES)
    _attr_swing_modes = ["off", "on"]
    _attr_preset_modes = ["none", "energy_saver"]
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.FAN_MODE
        | ClimateEntityFeature.SWING_MODE
        | ClimateEntityFeature.PRESET_MODE
        | ClimateEntityFeature.TURN_ON
        | ClimateEntityFeature.TURN_OFF
    )

    def __init__(self, entry):
        self._attr_unique_id = f"{entry.entry_id}_climate"
        self._remote = entry.data[CONF_REMOTE_ENTITY]
        self._sensor = entry.data.get(CONF_TEMPERATURE_ENTITY)
        self._state = IRState()
        self._last_send = None
        self._attr_current_temperature = None

    @property
    def hvac_mode(self):
        return MODE_TO_HVAC[self._state.mode] if self._state.power else HVACMode.OFF

    @property
    def target_temperature(self):
        return self._state.temperature

    @property
    def fan_mode(self):
        return FAN_NAMES[self._state.fan]

    @property
    def swing_mode(self):
        return "on" if self._state.swing else "off"

    @property
    def preset_mode(self):
        return "energy_saver" if self._state.mode == 3 else "none"

    @property
    def extra_state_attributes(self):
        return {
            "ir_feedback": "none",
            "status_source": "assumed_last_command",
            "requested_power": self._state.power,
            "requested_mode_code": self._state.mode,
            "last_ir_sent_at": self._last_send,
            "broadlink_remote": self._remote,
        }

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        previous = await self.async_get_last_state()
        if previous:
            attrs = previous.attributes
            try:
                mode = int(attrs.get("requested_mode_code", 0))
                temp = int(attrs.get("temperature", 22))
                fan = FAN_NAMES.index(attrs.get("fan_mode", "low"))
                if 0 <= mode <= 3 and 17 <= temp <= 30:
                    self._state = IRState(
                        power=attrs.get("requested_power") is True,
                        mode=mode,
                        temperature=temp,
                        fan=fan,
                        swing=attrs.get("swing_mode") == "on",
                    )
                    self._last_send = attrs.get("last_ir_sent_at")
            except (ValueError, TypeError):
                _LOGGER.debug("Could not restore prior requested IR state")
        if self._sensor:
            self._refresh_room_temp()
            self.async_on_remove(async_track_state_change_event(
                self.hass, [self._sensor], self._room_temp_changed
            ))

    def _refresh_room_temp(self):
        raw = self.hass.states.get(self._sensor) if self._sensor else None
        value = None
        if raw and raw.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            try:
                number = float(raw.state)
                unit = raw.attributes.get("unit_of_measurement")
                if unit == UnitOfTemperature.FAHRENHEIT:
                    number = (number - 32) * 5 / 9
                if unit in (UnitOfTemperature.CELSIUS, UnitOfTemperature.FAHRENHEIT) and math.isfinite(number):
                    value = round(number, 1)
            except (TypeError, ValueError):
                pass
        self._attr_current_temperature = value

    @callback
    def _room_temp_changed(self, event):
        self._refresh_room_temp()
        self.async_write_ha_state()

    async def _apply(self, new_state: IRState, *, power_command=False):
        """Send first, publish assumed state only after HA reports send success."""
        if new_state == self._state and not power_command:
            return
        if not new_state.power and not power_command:
            # Store settings while off; do not send an unknown off-state frame.
            self._state = new_state
            self.async_write_ha_state()
            return
        remote = self.hass.states.get(self._remote)
        if remote is None or remote.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            raise HomeAssistantError("BroadLink remote is unavailable")
        command = broadlink_command(new_state, power_command=power_command)
        try:
            await self.hass.services.async_call(
                "remote",
                "send_command",
                {"entity_id": self._remote, "command": command, "num_repeats": 1},
                blocking=True,
            )
        except Exception as err:
            _LOGGER.warning("Wood's IR transmission request failed: %s", err)
            raise HomeAssistantError("Could not request Wood's IR transmission") from err
        self._state = new_state
        self._last_send = datetime.now(timezone.utc).isoformat()
        self.async_write_ha_state()

    async def async_set_hvac_mode(self, hvac_mode):
        if hvac_mode == HVACMode.OFF:
            if self._state.power:
                await self._apply(replace(self._state, power=False), power_command=True)
            return
        if hvac_mode not in HVAC_TO_MODE:
            raise HomeAssistantError("Unsupported HVAC mode; heating is not implemented")
        new_state = replace(self._state, power=True, mode=HVAC_TO_MODE[hvac_mode])
        await self._apply(new_state, power_command=not self._state.power)

    async def async_turn_on(self):
        await self._apply(replace(self._state, power=True), power_command=not self._state.power)

    async def async_turn_off(self):
        await self.async_set_hvac_mode(HVACMode.OFF)

    async def async_set_temperature(self, **kwargs):
        value = kwargs.get(ATTR_TEMPERATURE)
        if value is None or not math.isfinite(float(value)):
            raise HomeAssistantError("Invalid target temperature")
        temp = int(round(float(value)))
        if not MIN_TEMP <= temp <= MAX_TEMP:
            raise HomeAssistantError("Target temperature outside 17..30°C")
        await self._apply(replace(self._state, temperature=temp))

    async def async_set_fan_mode(self, fan_mode):
        if fan_mode not in FAN_NAMES:
            raise HomeAssistantError("Unsupported fan speed")
        await self._apply(replace(self._state, fan=FAN_NAMES.index(fan_mode)))

    async def async_set_swing_mode(self, swing_mode):
        if swing_mode not in ("off", "on"):
            raise HomeAssistantError("Unsupported swing mode")
        await self._apply(replace(self._state, swing=swing_mode == "on"))

    async def async_set_preset_mode(self, preset_mode):
        if preset_mode not in ("none", "energy_saver"):
            raise HomeAssistantError("Unsupported preset")
        mode = 3 if preset_mode == "energy_saver" else (0 if self._state.mode == 3 else self._state.mode)
        await self._apply(replace(self._state, mode=mode))
