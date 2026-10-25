"""Wood's Cortina IR climate integration."""

from homeassistant.const import Platform

PLATFORMS = [Platform.CLIMATE]


async def async_setup_entry(hass, entry):
    """Set up the selected BroadLink remote backed climate entity."""
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass, entry):
    """Unload the climate entity."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
