"""Configuration UI for Wood's Cortina IR."""

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers import selector

from .const import CONF_REMOTE_ENTITY, CONF_TEMPERATURE_ENTITY, DOMAIN


class WoodsCortinaConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Select an existing HA BroadLink remote; optionally use an external sensor."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Present the initial configuration form."""
        if user_input is not None:
            return self.async_create_entry(
                title="Wood's Cortina IR", data=user_input
            )

        schema = vol.Schema(
            {
                vol.Required(CONF_REMOTE_ENTITY): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="remote")
                ),
                vol.Optional(CONF_TEMPERATURE_ENTITY): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="sensor")
                ),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema)
